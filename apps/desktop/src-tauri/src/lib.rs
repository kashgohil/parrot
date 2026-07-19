mod audio;
mod cleanup;
mod cleanup_engine;
mod db;
mod hotkey;
mod local_setup;
mod streaming;
mod transcription;
mod vocab;

use audio::{AudioRecorder, RecordedSamples};
use db::Database;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{Emitter, Manager};
use tokio::sync::RwLock;
use cleanup_engine::{load_cleanup_engine, SharedCleanupEngine};
use transcription::{LocalEngine, TranscribeOpts};

/// Shared handle to the in-process local STT engine (Whisper or Parakeet).
/// `None` until the model finishes loading — falls through to a friendly
/// error if a dictation arrives before then.
pub type SharedLocalEngine = Arc<RwLock<Option<Arc<LocalEngine>>>>;

/// Back-compat alias used during the Phase 2 rename.
pub type SharedWhisperProvider = SharedLocalEngine;

pub struct RecorderState {
    recorder: Mutex<AudioRecorder>,
    recording_start: Mutex<Option<Instant>>,
    /// Raw f32 samples from the last capture. Encoded to WAV only when
    /// needed for save-audio, never for the local STT path.
    last_audio: Mutex<Option<RecordedSamples>>,
    last_duration_ms: Mutex<u64>,
}

/// Most recent background-cleanup result that differs from the raw paste.
/// Surfaced in the HUD as "⌘⇧C to polish"; applied by `apply_pending_cleanup`.
pub struct PendingCleanup {
    text: Mutex<Option<String>>,
    dictation_id: Mutex<Option<String>>,
}

impl PendingCleanup {
    fn new() -> Self {
        Self {
            text: Mutex::new(None),
            dictation_id: Mutex::new(None),
        }
    }

    fn set(&self, id: String, text: String) {
        *self.dictation_id.lock().unwrap() = Some(id);
        *self.text.lock().unwrap() = Some(text);
    }

    fn take(&self) -> Option<(String, String)> {
        let id = self.dictation_id.lock().unwrap().take()?;
        let text = self.text.lock().unwrap().take()?;
        Some((id, text))
    }

    fn clear(&self) {
        *self.dictation_id.lock().unwrap() = None;
        *self.text.lock().unwrap() = None;
    }
}

/// Utterances shorter than this are already well-formed by Whisper
/// (punctuation + casing) — skip the LLM cleanup round-trip.
const SHORT_UTTERANCE_WORD_LIMIT: usize = 15;

fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

#[tauri::command]
fn start_recording(app: tauri::AppHandle) -> Result<(), String> {
    hotkey::begin_recording(&app);
    Ok(())
}

#[tauri::command]
fn stop_recording(
    state: tauri::State<'_, RecorderState>,
    app: tauri::AppHandle,
) -> Result<Vec<u8>, String> {
    hotkey::end_recording(&app);
    // Return last capture as WAV for any legacy UI callers.
    let audio = state
        .last_audio
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "Not recording".to_string())?;
    audio.encode_wav().map_err(|e| e.to_string())
}

#[tauri::command]
fn is_recording(state: tauri::State<'_, RecorderState>) -> bool {
    state.recorder.lock().unwrap().is_recording()
}

/// Toggle recording from the floating HUD orb. Mirrors the hotkey
/// press/release contract by routing through the same begin/end helpers, so
/// downstream behavior (events, transcribe_last, paste) is identical.
#[tauri::command]
fn toggle_recording(app: tauri::AppHandle) {
    let state = app.state::<RecorderState>();
    let is_rec = state.recorder.lock().unwrap().is_recording();
    drop(state);
    if is_rec {
        hotkey::end_recording(&app);
    } else {
        hotkey::begin_recording(&app);
    }
}

#[derive(serde::Serialize, Clone)]
struct DictationResult {
    raw_text: String,
    cleaned_text: String,
    pasted: bool,
}

#[tauri::command]
async fn transcribe_last(
    recorder_state: tauri::State<'_, RecorderState>,
    db: tauri::State<'_, Database>,
    engine_state: tauri::State<'_, SharedLocalEngine>,
    app: tauri::AppHandle,
) -> Result<DictationResult, String> {
    let audio = recorder_state
        .last_audio
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "No audio data available".to_string())?;
    let duration_ms = *recorder_state.last_duration_ms.lock().unwrap();

    // Step 1: Transcribe (local-only)
    let _ = app.emit("transcription-started", ());
    let pipeline_start = Instant::now();
    let local_engine =
        wait_for_local_engine(engine_state.inner(), std::time::Duration::from_secs(30)).await;

    // Bias Whisper toward the user's vocabulary. Parakeet ignores the prompt.
    let initial_prompt = match db.get_profile() {
        Ok(profile) => {
            let entries = vocab::parse(&profile.custom_words);
            vocab::whisper_initial_prompt(&entries)
        }
        Err(_) => None,
    };
    let language = db
        .get_setting("stt_language")
        .map_err(|e| e.to_string())?
        .filter(|s| !s.trim().is_empty());

    // Local STT feeds f32 samples straight into the engine.
    let transcription_start = Instant::now();
    let raw_text = transcription::transcribe_audio(
        &audio.samples,
        audio.sample_rate,
        local_engine.as_deref(),
        TranscribeOpts {
            language,
            initial_prompt,
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    // Deterministic dictionary pass before cleanup — fixes proper-noun
    // near-misses Whisper never learns on its own.
    let raw_text = {
        let entries = match db.get_profile() {
            Ok(p) => vocab::parse(&p.custom_words),
            Err(_) => Vec::new(),
        };
        vocab::apply_dictionary_pass(&raw_text, &entries)
    };

    let transcription_ms = transcription_start.elapsed().as_millis() as i64;
    let engine_name = local_engine
        .as_ref()
        .map(|e| e.engine_id())
        .unwrap_or("local");
    let model_name = local_engine.as_ref().map(|e| e.model_label());

    // Skip empty transcriptions (e.g. silence / accidental hotkey tap) — don't
    // save, clean up, or paste.
    if raw_text.trim().is_empty() {
        let result = DictationResult {
            raw_text: String::new(),
            cleaned_text: String::new(),
            pasted: false,
        };
        let _ = app.emit("dictation-complete", result.clone());
        return Ok(result);
    }

    // Save initial entry
    let id = uuid::Uuid::new_v4().to_string();
    db.insert_dictation(&id, &raw_text, "", "local", duration_ms as i64)
        .map_err(|e| e.to_string())?;

    // Save audio if enabled
    let save_audio = db
        .get_setting("save_audio")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "false".to_string());

    if save_audio == "true" {
        let wav_bytes = audio.encode_wav().map_err(|e| e.to_string())?;
        let audio_dir = Database::audio_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&audio_dir).map_err(|e| e.to_string())?;
        let audio_path = audio_dir.join(format!("{}.wav", id));
        std::fs::write(&audio_path, &wav_bytes).map_err(|e| e.to_string())?;
        let _ = db.update_dictation_audio_path(&id, &audio_path.to_string_lossy());
    }

    // Per-app profile (bundle ID at paste time — same as focused app).
    #[cfg(target_os = "macos")]
    let frontmost = frontmost_bundle_id();
    #[cfg(not(target_os = "macos"))]
    let frontmost: Option<String> = None;
    let effective = db
        .effective_profile_for_app(frontmost.as_deref())
        .map_err(|e| e.to_string())?;

    // Step 2: Cleanup mode — off | background | blocking (default).
    // Blocking waits for polish before paste so the focused field gets
    // cleaned text. Background pastes raw first (latency-oriented).
    let cleanup_mode = db
        .get_setting("cleanup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "blocking".to_string());
    let skip_cleanup = cleanup_mode == "off"
        || !effective.cleanup_enabled
        || word_count(&raw_text) < SHORT_UTTERANCE_WORD_LIMIT;

    // Clear any previous polish affordance so a new dictation doesn't
    // accidentally apply a stale cleanup.
    app.state::<PendingCleanup>().clear();

    if skip_cleanup {
        let paste_start = Instant::now();
        let pasted = copy_and_paste_safely(&app, raw_text.clone()).await;
        let paste_ms = paste_start.elapsed().as_millis() as i64;
        let _ = db.update_dictation_timings(
            &id,
            Some(transcription_ms),
            None,
            Some(paste_ms),
            Some(engine_name),
            model_name.as_deref(),
        );
        eprintln!(
            "dictation timings id={} audio={}ms transcription={}ms paste={}ms total={}ms (cleanup skipped)",
            id,
            duration_ms,
            transcription_ms,
            paste_ms,
            pipeline_start.elapsed().as_millis()
        );
        let result = DictationResult {
            raw_text: raw_text.clone(),
            cleaned_text: String::new(),
            pasted,
        };
        let _ = app.emit("dictation-complete", result.clone());
        return Ok(result);
    }

    if cleanup_mode == "blocking" {
        let _ = app.emit("cleanup-started", ());
        let cleanup_start = Instant::now();
        let builtin = cleanup::peek_builtin(app.state::<SharedCleanupEngine>().inner());
        let cleaned_text = run_cleanup(&db, &raw_text, builtin, &effective).await;
        let cleanup_ms = cleanup_start.elapsed().as_millis() as i64;
        if !cleaned_text.is_empty() && cleaned_text != raw_text {
            let _ = db.update_dictation_cleaned(&id, &cleaned_text);
        }
        let output_text = if cleaned_text.is_empty() {
            raw_text.clone()
        } else {
            cleaned_text.clone()
        };
        let paste_start = Instant::now();
        let pasted = copy_and_paste_safely(&app, output_text).await;
        let paste_ms = paste_start.elapsed().as_millis() as i64;
        let _ = db.update_dictation_timings(
            &id,
            Some(transcription_ms),
            Some(cleanup_ms),
            Some(paste_ms),
            Some(engine_name),
            model_name.as_deref(),
        );
        eprintln!(
            "dictation timings id={} audio={}ms transcription={}ms cleanup={}ms paste={}ms total={}ms (blocking)",
            id,
            duration_ms,
            transcription_ms,
            cleanup_ms,
            paste_ms,
            pipeline_start.elapsed().as_millis()
        );
        let result = DictationResult {
            raw_text: raw_text.clone(),
            cleaned_text,
            pasted,
        };
        let _ = app.emit("dictation-complete", result.clone());
        return Ok(result);
    }

    // Background cleanup: paste raw first so time-to-field ≈ transcription
    // only, then polish off the hot path (opt-in via cleanup_mode).
    let paste_start = Instant::now();
    let pasted = copy_and_paste_safely(&app, raw_text.clone()).await;
    let paste_ms = paste_start.elapsed().as_millis() as i64;
    let _ = db.update_dictation_timings(
        &id,
        Some(transcription_ms),
        None,
        Some(paste_ms),
        Some(engine_name),
        model_name.as_deref(),
    );
    eprintln!(
        "dictation timings id={} audio={}ms transcription={}ms paste={}ms time_to_paste={}ms (background cleanup)",
        id,
        duration_ms,
        transcription_ms,
        paste_ms,
        pipeline_start.elapsed().as_millis()
    );
    let result = DictationResult {
        raw_text: raw_text.clone(),
        cleaned_text: String::new(),
        pasted,
    };
    let _ = app.emit("dictation-complete", result.clone());

    let app_handle = app.clone();
    let id_bg = id.clone();
    let raw_bg = raw_text.clone();
    let effective_bg = effective.clone();
    tokio::spawn(async move {
        let db = app_handle.state::<Database>();
        let builtin = cleanup::peek_builtin(app_handle.state::<SharedCleanupEngine>().inner());
        let cleanup_start = Instant::now();
        let cleaned = run_cleanup(&db, &raw_bg, builtin, &effective_bg).await;
        let cleanup_ms = cleanup_start.elapsed().as_millis() as i64;
        let _ = db.update_dictation_timings(&id_bg, None, Some(cleanup_ms), None, None, None);
        eprintln!(
            "dictation cleanup timings id={} cleanup={}ms",
            id_bg, cleanup_ms
        );
        if cleaned.is_empty() || cleaned.trim() == raw_bg.trim() {
            return;
        }
        if let Err(e) = db.update_dictation_cleaned(&id_bg, &cleaned) {
            eprintln!("Failed to save cleaned text: {}", e);
        }
        app_handle
            .state::<PendingCleanup>()
            .set(id_bg.clone(), cleaned.clone());
        let _ = app_handle.emit(
            "cleanup-ready",
            serde_json::json!({
                "id": id_bg,
                "cleaned_text": cleaned,
            }),
        );
    });

    Ok(result)
}

/// Run local LLM cleanup. Returns empty string on failure so callers can fall
/// back to the raw transcript.
async fn run_cleanup(
    db: &Database,
    raw_text: &str,
    builtin: Option<std::sync::Arc<cleanup_engine::BuiltinCleanupEngine>>,
    profile: &db::EffectiveProfile,
) -> String {
    let cleanup_backend = resolve_cleanup_backend(db);
    let llm_model = db.get_setting("llm_model").ok().flatten();
    match cleanup::cleanup_text(
        raw_text,
        llm_model.as_deref(),
        &profile.custom_words,
        &profile.context_prompt,
        &profile.writing_style,
        &cleanup_backend,
        builtin,
    )
    .await
    {
        Ok(cleaned) => cleaned,
        Err(e) => {
            eprintln!("LLM cleanup failed: {}", e);
            String::new()
        }
    }
}

/// Transcribe a user-supplied audio file (WAV bytes from the frontend file
/// picker / drag-drop). Saves to history, runs cleanup, copies text to the
/// clipboard — does **not** synthesize Cmd+V (there is no target field).
#[tauri::command]
async fn transcribe_audio_file(
    data: Vec<u8>,
    filename: Option<String>,
    db: tauri::State<'_, Database>,
    engine_state: tauri::State<'_, SharedLocalEngine>,
    app: tauri::AppHandle,
) -> Result<DictationResult, String> {
    if data.is_empty() {
        return Err("Empty audio file".into());
    }
    let name = filename.unwrap_or_else(|| "audio.wav".into());
    let lower = name.to_lowercase();
    if !lower.ends_with(".wav") {
        return Err(
            "Only WAV files are supported right now. Export or convert to WAV and try again."
                .into(),
        );
    }

    let (samples, sample_rate) =
        transcription::load_wav_samples(&data).map_err(|e| e.to_string())?;
    if samples.is_empty() {
        return Err("Audio file has no samples".into());
    }
    let duration_ms = (samples.len() as f64 / sample_rate as f64 * 1000.0) as u64;

    let _ = app.emit("transcription-started", ());
    let local_engine =
        wait_for_local_engine(engine_state.inner(), std::time::Duration::from_secs(60)).await;

    let initial_prompt = match db.get_profile() {
        Ok(profile) => {
            let entries = vocab::parse(&profile.custom_words);
            vocab::whisper_initial_prompt(&entries)
        }
        Err(_) => None,
    };
    let language = db
        .get_setting("stt_language")
        .map_err(|e| e.to_string())?
        .filter(|s| !s.trim().is_empty());

    let transcription_start = Instant::now();
    let raw_text = transcription::transcribe_audio(
        &samples,
        sample_rate,
        local_engine.as_deref(),
        TranscribeOpts {
            language,
            initial_prompt,
        },
    )
    .await
    .map_err(|e| e.to_string())?;
    let transcription_ms = transcription_start.elapsed().as_millis() as i64;

    let raw_text = {
        let entries = match db.get_profile() {
            Ok(p) => vocab::parse(&p.custom_words),
            Err(_) => Vec::new(),
        };
        vocab::apply_dictionary_pass(&raw_text, &entries)
    };

    if raw_text.trim().is_empty() {
        let result = DictationResult {
            raw_text: String::new(),
            cleaned_text: String::new(),
            pasted: false,
        };
        let _ = app.emit("dictation-complete", result.clone());
        return Ok(result);
    }

    let id = uuid::Uuid::new_v4().to_string();
    db.insert_dictation(&id, &raw_text, "", "local-file", duration_ms as i64)
        .map_err(|e| e.to_string())?;

    let engine_name = local_engine
        .as_ref()
        .map(|e| e.engine_id())
        .unwrap_or("local");
    let model_name = local_engine.as_ref().map(|e| e.model_label());
    let _ = db.update_dictation_timings(
        &id,
        Some(transcription_ms),
        None,
        None,
        Some(engine_name),
        model_name.as_deref(),
    );

    let effective = db
        .effective_profile_for_app(None)
        .map_err(|e| e.to_string())?;
    let cleanup_mode = db
        .get_setting("cleanup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "blocking".to_string());
    let skip_cleanup = cleanup_mode == "off"
        || !effective.cleanup_enabled
        || word_count(&raw_text) < SHORT_UTTERANCE_WORD_LIMIT;

    let cleaned_text = if skip_cleanup {
        String::new()
    } else if cleanup_mode == "blocking" || cleanup_mode != "background" {
        // Default / blocking: wait for polish. Only explicit "background"
        // uses the fire-and-forget path below.
        let builtin = cleanup::peek_builtin(app.state::<SharedCleanupEngine>().inner());
        let cleaned = run_cleanup(&db, &raw_text, builtin, &effective).await;
        if !cleaned.is_empty() && cleaned != raw_text {
            let _ = db.update_dictation_cleaned(&id, &cleaned);
        }
        cleaned
    } else {
        // Background cleanup — return raw immediately.
        let app_handle = app.clone();
        let id_bg = id.clone();
        let raw_bg = raw_text.clone();
        let effective_bg = effective.clone();
        tokio::spawn(async move {
            let db = app_handle.state::<Database>();
            let builtin = cleanup::peek_builtin(app_handle.state::<SharedCleanupEngine>().inner());
            let cleaned = run_cleanup(&db, &raw_bg, builtin, &effective_bg).await;
            if !cleaned.is_empty() && cleaned.trim() != raw_bg.trim() {
                let _ = db.update_dictation_cleaned(&id_bg, &cleaned);
                let _ = app_handle.emit(
                    "cleanup-ready",
                    serde_json::json!({ "id": id_bg, "cleaned_text": cleaned }),
                );
            }
            let _ = app_handle.emit("dictation-complete", ());
        });
        String::new()
    };

    let output = if cleaned_text.is_empty() {
        raw_text.clone()
    } else {
        cleaned_text.clone()
    };

    // Copy only — no synthetic paste for file transcription.
    {
        use tauri_plugin_clipboard_manager::ClipboardExt;
        let _ = app.clipboard().write_text(output);
    }

    let result = DictationResult {
        raw_text: raw_text.clone(),
        cleaned_text,
        pasted: false,
    };
    let _ = app.emit("dictation-complete", result.clone());
    eprintln!(
        "file transcription complete name={} duration={}ms transcription={}ms",
        name, duration_ms, transcription_ms
    );
    Ok(result)
}

/// Paste the most recent background-cleanup result (bound to ⌘⇧C).
#[tauri::command]
async fn apply_pending_cleanup(
    pending: tauri::State<'_, PendingCleanup>,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    let Some((_id, cleaned)) = pending.take() else {
        return Ok(false);
    };
    let pasted = copy_and_paste_safely(&app, cleaned).await;
    let _ = app.emit("cleanup-applied", ());
    Ok(pasted)
}

/// Deliver `text` into the focused app.
///
/// Path: clipboard + synthetic Cmd+V. Typing via
/// `CGEventKeyboardSetUnicodeString` is only a fallback for when the Cmd+V
/// keystroke can't be constructed or the clipboard write fails.
///
/// We deliberately do **not** verify the paste by re-reading the focused
/// element's AXValue and re-typing on mismatch: many apps (terminals such as
/// Ghostty, Electron apps, browser contenteditables) never reflect pasted text
/// in AXValue, so that check false-negatived and delivered the text twice. A
/// dispatched Cmd+V is trusted; a rare missed paste is recoverable because the
/// text stays on the clipboard.
///
/// After a successful paste, the previous pasteboard contents are restored ~1s
/// later so dictation doesn't permanently clobber the clipboard.
async fn copy_and_paste_safely(app: &tauri::AppHandle, text: String) -> bool {
    if text.is_empty() {
        return false;
    }

    #[cfg(target_os = "macos")]
    {
        if !is_accessibility_trusted() {
            let _ = app.emit(
                "paste-permission-needed",
                serde_json::json!({
                    "details": "Accessibility permission required to paste",
                }),
            );
            return false;
        }

        // Snapshot prior clipboard so we can restore it after paste.
        use tauri_plugin_clipboard_manager::ClipboardExt;
        let previous = app.clipboard().read_text().ok();

        if let Err(e) = app.clipboard().write_text(text.clone()) {
            eprintln!("Failed to set clipboard text: {}", e);
            return type_text_macos_async(text).await;
        }

        wait_for_clipboard_text(app, &text, std::time::Duration::from_millis(100)).await;

        let paste_ok = {
            let result = tauri::async_runtime::spawn_blocking(|| {
                std::panic::catch_unwind(post_cmd_v_macos)
            })
            .await;
            match result {
                Ok(Ok(true)) => true,
                Ok(Ok(false)) => {
                    eprintln!("CGEvent paste: failed to construct keystroke");
                    false
                }
                Ok(Err(_)) => {
                    eprintln!("CGEvent paste panicked");
                    false
                }
                Err(e) => {
                    eprintln!("CGEvent paste task join error: {}", e);
                    false
                }
            }
        };

        if paste_ok {
            // Cmd+V was dispatched into the focused app — trust it. We used to
            // read the focused element's AXValue before/after and re-type the
            // text when it looked unchanged, but that check is a false negative
            // in every app whose AXValue doesn't mirror inserted text (terminals
            // like Ghostty, Electron apps, browser contenteditables), so it
            // delivered the text twice. A missed paste is recoverable — the text
            // is still on the clipboard — so we never re-type after a successful
            // dispatch. Restore the prior clipboard ~1s later so dictation
            // doesn't permanently clobber it.
            if let Some(prev) = previous {
                if prev != text {
                    let app_restore = app.clone();
                    tokio::spawn(async move {
                        tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
                        use tauri_plugin_clipboard_manager::ClipboardExt;
                        let still_ours = app_restore
                            .clipboard()
                            .read_text()
                            .ok()
                            .as_deref()
                            == Some(text.as_str());
                        if still_ours {
                            let _ = app_restore.clipboard().write_text(prev);
                        }
                    });
                }
            }
            return true;
        }

        // Cmd+V keystroke couldn't be constructed — fall back to typing.
        // Restore clipboard first so we don't leave the transcript stuck.
        if let Some(prev) = previous {
            let _ = app.clipboard().write_text(prev);
        }

        type_text_macos_async(text).await
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, text);
        false
    }
}

/// Type `text` via CGEvent unicode injection (no clipboard).
#[cfg(target_os = "macos")]
async fn type_text_macos_async(text: String) -> bool {
    let result =
        tauri::async_runtime::spawn_blocking(move || std::panic::catch_unwind(|| type_text_macos(&text)))
            .await;
    match result {
        Ok(Ok(ok)) => ok,
        Ok(Err(_)) => {
            eprintln!("CGEvent type panicked");
            false
        }
        Err(e) => {
            eprintln!("CGEvent type task join error: {}", e);
            false
        }
    }
}

/// Insert unicode text with `CGEventKeyboardSetUnicodeString` in ≤20-char
/// chunks (API limit). Used when Cmd+V cannot be constructed.
///
/// Important: keycode `0` is ANSI **A**. We must clear modifier flags so this
/// never becomes Cmd+A (select all). Only post key-down with the string set
/// (same pattern as enigo) — key-up with set_string double-fires in some apps.
#[cfg(target_os = "macos")]
fn type_text_macos(text: &str) -> bool {
    use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    let Ok(source) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) else {
        return false;
    };

    let mut ok = true;
    let mut buf = String::new();

    let flush = |source: &core_graphics::event_source::CGEventSource,
                 buf: &mut String,
                 ok: &mut bool| {
        if buf.is_empty() {
            return;
        }
        let s = std::mem::take(buf);
        for chunk in s.chars().collect::<Vec<_>>().chunks(20) {
            let piece: String = chunk.iter().collect();
            // keycode 0 == 'A' — flags must be empty or this is Cmd+A.
            let Ok(down) = CGEvent::new_keyboard_event(source.clone(), 0, true) else {
                *ok = false;
                continue;
            };
            down.set_flags(CGEventFlags::empty());
            down.set_string(&piece);
            down.post(CGEventTapLocation::HID);
        }
    };

    for ch in text.chars() {
        match ch {
            '\t' => {
                flush(&source, &mut buf, &mut ok);
                if !post_key_macos(48) {
                    ok = false;
                }
            }
            '\n' | '\r' => {
                flush(&source, &mut buf, &mut ok);
                if !post_key_macos(36) {
                    ok = false;
                }
            }
            _ => buf.push(ch),
        }
    }
    flush(&source, &mut buf, &mut ok);
    ok
}

#[cfg(target_os = "macos")]
fn post_key_macos(keycode: u16) -> bool {
    use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    let Ok(source) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) else {
        return false;
    };
    let Ok(down) = CGEvent::new_keyboard_event(source.clone(), keycode, true) else {
        return false;
    };
    down.set_flags(CGEventFlags::empty());
    down.post(CGEventTapLocation::HID);
    let Ok(up) = CGEvent::new_keyboard_event(source, keycode, false) else {
        return false;
    };
    up.set_flags(CGEventFlags::empty());
    up.post(CGEventTapLocation::HID);
    true
}

/// Frontmost app bundle id via NSWorkspace (AppKit).
#[cfg(target_os = "macos")]
fn frontmost_bundle_id() -> Option<String> {
    use std::ffi::{c_char, c_void, CStr};

    type Id = *mut c_void;
    type Sel = *mut c_void;
    type Class = *mut c_void;

    #[link(name = "objc")]
    extern "C" {
        fn objc_getClass(name: *const c_char) -> Class;
        fn sel_registerName(name: *const c_char) -> Sel;
        fn objc_msgSend();
    }
    #[link(name = "AppKit", kind = "framework")]
    extern "C" {}
    #[link(name = "Foundation", kind = "framework")]
    extern "C" {}

    unsafe {
        let ns_workspace = objc_getClass(c"NSWorkspace".as_ptr() as *const c_char);
        if ns_workspace.is_null() {
            return None;
        }
        let shared_sel = sel_registerName(c"sharedWorkspace".as_ptr() as *const c_char);
        let frontmost_sel = sel_registerName(c"frontmostApplication".as_ptr() as *const c_char);
        let bundle_sel = sel_registerName(c"bundleIdentifier".as_ptr() as *const c_char);
        let utf8_sel = sel_registerName(c"UTF8String".as_ptr() as *const c_char);

        // objc_msgSend is variadic; cast per call.
        let msg_id: unsafe extern "C" fn(Id, Sel) -> Id =
            std::mem::transmute(objc_msgSend as *const ());
        let msg_cstr: unsafe extern "C" fn(Id, Sel) -> *const c_char =
            std::mem::transmute(objc_msgSend as *const ());

        let workspace = msg_id(ns_workspace as Id, shared_sel);
        if workspace.is_null() {
            return None;
        }
        let app = msg_id(workspace, frontmost_sel);
        if app.is_null() {
            return None;
        }
        let ns_string = msg_id(app, bundle_sel);
        if ns_string.is_null() {
            return None;
        }
        let c_str = msg_cstr(ns_string, utf8_sel);
        if c_str.is_null() {
            return None;
        }
        Some(CStr::from_ptr(c_str).to_string_lossy().into_owned())
    }
}

/// Poll the pasteboard until `text` is present or `cap` elapses.
async fn wait_for_clipboard_text(app: &tauri::AppHandle, text: &str, cap: std::time::Duration) {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let deadline = std::time::Instant::now() + cap;
    loop {
        if app.clipboard().read_text().ok().as_deref() == Some(text) {
            return;
        }
        if std::time::Instant::now() >= deadline {
            return;
        }
        tokio::time::sleep(std::time::Duration::from_millis(4)).await;
    }
}

#[cfg(target_os = "macos")]
fn post_cmd_v_macos() -> bool {
    use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation, CGKeyCode};
    use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

    // V on the ANSI keyboard layout. Cmd+V dispatches by virtual keycode,
    // independent of the user's input layout.
    const KEY_V: CGKeyCode = 9;

    let Ok(source) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) else {
        return false;
    };

    let Ok(down) = CGEvent::new_keyboard_event(source.clone(), KEY_V, true) else {
        return false;
    };
    // Only Command — never inherit other modifiers from HID state.
    down.set_flags(CGEventFlags::CGEventFlagCommand);
    down.post(CGEventTapLocation::HID);

    let Ok(up) = CGEvent::new_keyboard_event(source, KEY_V, false) else {
        return false;
    };
    up.set_flags(CGEventFlags::CGEventFlagCommand);
    up.post(CGEventTapLocation::HID);

    true
}

#[cfg(target_os = "macos")]
fn is_accessibility_trusted() -> bool {
    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
    }
    unsafe { AXIsProcessTrusted() }
}

/// Open a specific pane in macOS System Settings.
///
/// Accepts a logical key (e.g. `"accessibility"`, `"microphone"`) and routes to
/// the right `x-apple.systempreferences:` URL. Any failure is reported as a
/// human-readable string so the frontend can surface it.
#[tauri::command]
fn open_system_settings(pane: String) -> Result<(), String> {
    let url = match pane.as_str() {
        "accessibility" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        }
        "microphone" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
        }
        "automation" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"
        }
        other => return Err(format!("Unknown system settings pane: {}", other)),
    };

    std::process::Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| format!("Failed to open System Settings: {}", e))?;

    Ok(())
}

/// Whether the OS has granted Parrot Accessibility permission.
///
/// On macOS, both the `osascript` paste step and the `fn` key tap require it.
/// We probe via `AXIsProcessTrusted` (no prompt). On other OSes there's no
/// equivalent gate, so this always returns true.
#[tauri::command]
fn check_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        is_accessibility_trusted()
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

/// Microphone permission status. On macOS we query AVCaptureDevice via objc
/// (no prompt). Returns one of `granted`, `denied`, `restricted`,
/// `notDetermined`. Non-macOS platforms always report `granted`.
#[tauri::command]
fn check_microphone_permission() -> String {
    #[cfg(target_os = "macos")]
    {
        macos_mic_authorization_status().to_string()
    }
    #[cfg(not(target_os = "macos"))]
    {
        "granted".to_string()
    }
}

/// Trigger the macOS Microphone permission prompt by attempting to open a
/// brief CoreAudio input stream. cpal's `build_input_stream` calls into
/// AudioUnitInitialize, which is what TCC gates — so the prompt appears the
/// first time we hit it. Returns the post-attempt permission state.
#[tauri::command]
fn request_microphone_permission() -> String {
    #[cfg(target_os = "macos")]
    {
        use cpal::traits::{DeviceTrait, HostTrait};
        let host = cpal::default_host();
        if let Some(device) = host.default_input_device() {
            if let Ok(config) = device.default_input_config() {
                // Build and immediately drop — the act of building triggers
                // the macOS TCC prompt the first time around.
                let _ = device.build_input_stream(
                    &config.into(),
                    move |_data: &[f32], _: &cpal::InputCallbackInfo| {},
                    move |_err| {},
                    None,
                );
            }
        }
        macos_mic_authorization_status().to_string()
    }
    #[cfg(not(target_os = "macos"))]
    {
        "granted".to_string()
    }
}

#[cfg(target_os = "macos")]
fn macos_mic_authorization_status() -> &'static str {
    use std::ffi::c_void;
    use std::os::raw::c_char;

    type Id = *mut c_void;
    type Class = *mut c_void;
    type Sel = *mut c_void;

    #[link(name = "objc")]
    extern "C" {
        fn objc_getClass(name: *const c_char) -> Class;
        fn sel_registerName(name: *const c_char) -> Sel;
    }

    // Force-link AVFoundation so AVCaptureDevice is registered with the objc runtime.
    #[link(name = "AVFoundation", kind = "framework")]
    extern "C" {}

    // objc_msgSend has a variadic ABI; we cast to a typed function pointer per call.
    extern "C" {
        fn objc_msgSend();
    }

    unsafe {
        let ns_string_cls = objc_getClass(b"NSString\0".as_ptr() as *const c_char);
        if ns_string_cls.is_null() {
            return "unknown";
        }
        let av_capture_cls = objc_getClass(b"AVCaptureDevice\0".as_ptr() as *const c_char);
        if av_capture_cls.is_null() {
            return "unknown";
        }

        // [NSString stringWithUTF8String:"soun"] — AVMediaTypeAudio is the FourCC "soun".
        let sel_with_utf8 =
            sel_registerName(b"stringWithUTF8String:\0".as_ptr() as *const c_char);
        let msg_string_with_utf8: extern "C" fn(Class, Sel, *const c_char) -> Id =
            std::mem::transmute(objc_msgSend as *const ());
        let media_type =
            msg_string_with_utf8(ns_string_cls, sel_with_utf8, b"soun\0".as_ptr() as *const c_char);
        if media_type.is_null() {
            return "unknown";
        }

        // [AVCaptureDevice authorizationStatusForMediaType:media_type]
        let sel_auth = sel_registerName(
            b"authorizationStatusForMediaType:\0".as_ptr() as *const c_char,
        );
        let msg_auth: extern "C" fn(Class, Sel, Id) -> i64 =
            std::mem::transmute(objc_msgSend as *const ());
        let status = msg_auth(av_capture_cls, sel_auth, media_type);

        match status {
            0 => "notDetermined",
            1 => "restricted",
            2 => "denied",
            3 => "granted",
            _ => "unknown",
        }
    }
}

/// Returns the platform's default dictation hotkey + the OS family, so the
/// settings UI can render appropriate controls (e.g. only show the "fn key"
/// option on macOS).
#[tauri::command]
fn get_default_dictation_hotkey() -> serde_json::Value {
    serde_json::json!({
        "default": hotkey::default_for_platform(),
        "platform": std::env::consts::OS,
    })
}

/// Local latency aggregates for the debug timing panel (no network telemetry).
#[tauri::command]
fn get_timing_stats(db: tauri::State<'_, Database>) -> Result<db::TimingStats, String> {
    db.timing_stats().map_err(|e| e.to_string())
}

/// Current STT engine + model tier for Settings / upgrade banners.
#[tauri::command]
fn get_stt_status(db: tauri::State<'_, Database>) -> Result<serde_json::Value, String> {
    let config = db.get_local_setup_config().map_err(|e| e.to_string())?;
    let (engine, path, model_id) = resolve_stt_load_target(&db, &config);
    Ok(serde_json::json!({
        "engine": engine,
        "model_id": model_id,
        "model_path": path,
        "language": db.get_setting("stt_language").ok().flatten().unwrap_or_else(|| "auto".into()),
        "can_upgrade_to_parakeet": engine != "parakeet",
    }))
}

/// Cleanup backend status for Settings (builtin vs Ollama).
#[tauri::command]
fn get_cleanup_status(
    db: tauri::State<'_, Database>,
    cleanup_engine: tauri::State<'_, SharedCleanupEngine>,
) -> Result<serde_json::Value, String> {
    let backend = resolve_cleanup_backend(&db);
    let gguf_path = db
        .get_setting("cleanup_model_path")
        .ok()
        .flatten()
        .filter(|p| !p.is_empty())
        .or_else(|| {
            local_setup::get_cleanup_model_path(local_setup::CLEANUP_QWEN25_05B)
                .ok()
                .map(|p| p.to_string_lossy().into_owned())
        });
    let gguf_on_disk = gguf_path
        .as_ref()
        .map(|p| std::path::Path::new(p).exists())
        .unwrap_or(false);
    let loaded = cleanup::peek_builtin(cleanup_engine.inner()).is_some();
    Ok(serde_json::json!({
        "backend": backend,
        "can_upgrade_to_builtin": backend == "ollama",
        "builtin_model_id": local_setup::CLEANUP_QWEN25_05B,
        "builtin_model_path": gguf_path,
        "builtin_on_disk": gguf_on_disk,
        "builtin_loaded": loaded,
    }))
}

/// Download the Qwen cleanup GGUF (if needed) and switch off Ollama.
#[tauri::command]
async fn upgrade_cleanup_to_builtin(
    app: tauri::AppHandle,
    db: tauri::State<'_, Database>,
    cleanup_engine: tauri::State<'_, SharedCleanupEngine>,
) -> Result<serde_json::Value, String> {
    let model_id = local_setup::CLEANUP_QWEN25_05B.to_string();
    let app_for_progress = app.clone();
    let path = local_setup::download_cleanup_model(&model_id, move |msg, progress| {
        let _ = app_for_progress.emit(
            "cleanup-model-download-progress",
            serde_json::json!({
                "model": local_setup::CLEANUP_QWEN25_05B,
                "message": msg,
                "progress": progress,
            }),
        );
    })
    .await
    .map_err(|e| e.to_string())?;

    let path_str = path.to_string_lossy().to_string();
    let _ = db.set_setting("cleanup_backend", "builtin");
    let _ = db.set_setting("cleanup_model_path", &path_str);

    // Drop any previous engine and load the new GGUF.
    {
        let mut slot = cleanup_engine
            .write()
            .map_err(|e| format!("cleanup engine lock: {e}"))?;
        *slot = None;
    }
    load_cleanup_engine(cleanup_engine.inner().clone(), path_str.clone());

    // Wait briefly for load so Settings can show ready state.
    let ready = {
        let deadline = Instant::now() + std::time::Duration::from_secs(120);
        loop {
            if cleanup::peek_builtin(cleanup_engine.inner()).is_some() {
                break true;
            }
            if Instant::now() >= deadline {
                break false;
            }
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    };

    // Stop Ollama if we started it (best-effort).
    {
        let servers = app.state::<SharedServerProcesses>();
        let mut guard = servers.write().await;
        guard.stop_all().await;
    }

    Ok(serde_json::json!({
        "backend": "builtin",
        "model_path": path_str,
        "ready": ready,
    }))
}

/// Download (if needed) and switch to a new STT model tier. Used for the
/// Parakeet upgrade path and model picker in Settings.
#[tauri::command]
async fn switch_stt_model(
    model_id: String,
    app: tauri::AppHandle,
    db: tauri::State<'_, Database>,
    engine_state: tauri::State<'_, SharedLocalEngine>,
) -> Result<serde_json::Value, String> {
    let app_for_progress = app.clone();
    let model_for_cb = model_id.clone();
    let path = local_setup::download_stt_model(&model_id, move |msg, progress| {
        let _ = app_for_progress.emit(
            "stt-model-download-progress",
            serde_json::json!({
                "model": model_for_cb,
                "message": msg,
                "progress": progress,
            }),
        );
    })
    .await
    .map_err(|e| e.to_string())?;

    let engine = local_setup::stt_engine_for_model(&model_id);
    let path_str = path.to_string_lossy().to_string();
    let _ = db.set_setting("stt_engine", engine);
    let _ = db.set_setting("stt_model", &model_id);
    if engine == "parakeet" {
        let _ = db.set_setting("parakeet_model_path", &path_str);
    } else {
        // Keep local_setup.whisper_model_path in sync for Whisper tiers.
        if let Ok(mut config) = db.get_local_setup_config() {
            config.whisper_model_path = path_str.clone();
            let _ = db.set_local_setup_config(&config);
        }
    }

    // Clear and reload engine.
    {
        let mut slot = engine_state.write().await;
        *slot = None;
    }
    load_local_engine(
        engine_state.inner().clone(),
        engine.to_string(),
        path_str.clone(),
        model_id.clone(),
    );

    // Wait briefly so the UI can show "ready".
    let ready = wait_for_local_engine(engine_state.inner(), std::time::Duration::from_secs(120))
        .await
        .is_some();

    Ok(serde_json::json!({
        "engine": engine,
        "model_id": model_id,
        "model_path": path_str,
        "ready": ready,
    }))
}

/// Dictation history entry returned to the frontend.
#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct DictationEntry {
    id: String,
    raw_text: String,
    cleaned_text: String,
    provider: String,
    duration_ms: i64,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    audio_path: Option<String>,
}

#[tauri::command]
async fn get_history(db: tauri::State<'_, Database>) -> Result<Vec<DictationEntry>, String> {
    let entries = db.get_history().map_err(|e| e.to_string())?;
    Ok(entries
        .into_iter()
        .map(|e| DictationEntry {
            id: e.id,
            raw_text: e.raw_text,
            cleaned_text: e.cleaned_text,
            provider: e.provider,
            duration_ms: e.duration_ms,
            created_at: e.created_at,
            audio_path: e.audio_path,
        })
        .collect())
}

#[tauri::command]
async fn search_history(
    query: &str,
    db: tauri::State<'_, Database>,
) -> Result<Vec<DictationEntry>, String> {
    let entries = db.search_history(query).map_err(|e| e.to_string())?;
    Ok(entries
        .into_iter()
        .map(|e| DictationEntry {
            id: e.id,
            raw_text: e.raw_text,
            cleaned_text: e.cleaned_text,
            provider: e.provider,
            duration_ms: e.duration_ms,
            created_at: e.created_at,
            audio_path: e.audio_path,
        })
        .collect())
}

#[tauri::command]
async fn delete_dictation(
    id: String,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    let audio_path = db.delete_dictation(&id).map_err(|e| e.to_string())?;
    if let Some(path) = audio_path {
        let _ = std::fs::remove_file(&path);
    }
    Ok(())
}

#[tauri::command]
fn get_setting(key: &str, state: tauri::State<'_, Database>) -> Result<Option<String>, String> {
    state.get_setting(key).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_setting(key: &str, value: &str, state: tauri::State<'_, Database>) -> Result<(), String> {
    state.set_setting(key, value).map_err(|e| e.to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct ProfileData {
    custom_words: String,
    context_prompt: String,
    writing_style: String,
}

#[tauri::command]
async fn get_profile(db: tauri::State<'_, Database>) -> Result<ProfileData, String> {
    let p = db.get_profile().map_err(|e| e.to_string())?;
    Ok(ProfileData {
        custom_words: p.custom_words,
        context_prompt: p.context_prompt,
        writing_style: p.writing_style,
    })
}

/// Suggest dictionary terms mined from raw→cleaned history pairs.
#[tauri::command]
fn suggest_vocab_from_history(
    db: tauri::State<'_, Database>,
) -> Result<Vec<vocab::VocabSuggestion>, String> {
    let history = db.get_history().map_err(|e| e.to_string())?;
    let pairs: Vec<(String, String)> = history
        .into_iter()
        .filter(|e| !e.cleaned_text.trim().is_empty())
        .map(|e| (e.raw_text, e.cleaned_text))
        .collect();
    let existing = match db.get_profile() {
        Ok(p) => vocab::parse(&p.custom_words),
        Err(_) => Vec::new(),
    };
    Ok(vocab::mine_vocab_suggestions(&pairs, &existing, 2))
}

#[tauri::command]
fn list_app_profiles(db: tauri::State<'_, Database>) -> Result<Vec<db::AppProfile>, String> {
    db.list_app_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
fn upsert_app_profile(
    profile: db::AppProfile,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    if profile.bundle_id.trim().is_empty() {
        return Err("bundle_id is required".into());
    }
    db.upsert_app_profile(&profile).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_app_profile(bundle_id: String, db: tauri::State<'_, Database>) -> Result<(), String> {
    db.delete_app_profile(&bundle_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_frontmost_app() -> Result<serde_json::Value, String> {
    #[cfg(target_os = "macos")]
    {
        let bundle_id = frontmost_bundle_id();
        Ok(serde_json::json!({
            "bundle_id": bundle_id,
            "app_name": bundle_id.as_ref().map(|b| app_name_for_bundle(b)),
        }))
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(serde_json::json!({ "bundle_id": null, "app_name": null }))
    }
}

/// Human-ish name from a bundle id (`com.apple.Terminal` → `Terminal`).
#[cfg(target_os = "macos")]
fn app_name_for_bundle(bundle_id: &str) -> String {
    bundle_id
        .rsplit('.')
        .next()
        .unwrap_or(bundle_id)
        .to_string()
}

#[tauri::command]
async fn update_profile(
    custom_words: &str,
    context_prompt: &str,
    writing_style: &str,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    db.update_profile(custom_words, context_prompt, writing_style)
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct LocalUserData {
    name: String,
    email: String,
    onboarding_completed: bool,
}

#[tauri::command]
fn get_local_user(db: tauri::State<'_, Database>) -> Result<LocalUserData, String> {
    let user = db.get_local_user().map_err(|e| e.to_string())?;
    Ok(LocalUserData {
        name: user.name,
        email: user.email,
        onboarding_completed: user.onboarding_completed,
    })
}

#[tauri::command]
fn set_local_user(
    name: String,
    email: String,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    let user = db::LocalUser {
        name,
        email,
        onboarding_completed: false,
    };
    db.set_local_user(&user).map_err(|e| e.to_string())
}

#[tauri::command]
fn complete_local_onboarding(db: tauri::State<'_, Database>) -> Result<(), String> {
    let mut user = db.get_local_user().map_err(|e| e.to_string())?;
    user.onboarding_completed = true;
    db.set_local_user(&user).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_audio_url(
    id: &str,
    db: tauri::State<'_, Database>,
) -> Result<Option<String>, String> {
    db.get_audio_path(id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_command_exists(name: String) -> bool {
    local_setup::command_exists(&name).await
}

#[tauri::command]
async fn install_tool(name: String) -> Result<String, String> {
    match name.as_str() {
        "ollama" => {
            // Delegate to local_setup so both the onboarding wizard and any
            // ad-hoc install path use the same osascript-elevated installer.
            local_setup::install_ollama(|_msg, _pct| {})
                .await
                .map(|_| "ollama installed successfully".to_string())
                .map_err(|e| format!("Installation failed: {}", e))
        }
        _ => Err(format!("Unknown tool: {}", name)),
    }
}

// Local setup commands
use local_setup::{SetupProgress, ServerProcesses, SharedServerProcesses};

#[tauri::command]
async fn check_local_setup_status(
    db: tauri::State<'_, Database>,
) -> Result<serde_json::Value, String> {
    let config = db
        .get_local_setup_config()
        .map_err(|e| format!("Failed to get setup config: {}", e))?;
    
    // Check if tools are installed
    let whisper_installed = local_setup::command_exists("whisper-cli").await;
    let ollama_installed = local_setup::command_exists("ollama").await;
    
    Ok(serde_json::json!({
        "setup_completed": config.setup_completed,
        "whisper_installed": whisper_installed,
        "ollama_installed": ollama_installed,
        "config": config,
    }))
}

#[tauri::command]
async fn check_system_requirements() -> Result<local_setup::SystemRequirements, String> {
    local_setup::check_system_requirements()
        .await
        .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSetupRequest {
    pub whisper_model: String,
    pub ollama_model: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckModelDownloadStatusRequest {
    pub whisper_models: Vec<String>,
    pub ollama_models: Vec<String>,
}

#[tauri::command]
async fn check_model_download_status(
    request: CheckModelDownloadStatusRequest,
) -> Result<serde_json::Value, String> {
    let mut downloaded_whisper = Vec::new();
    let mut downloaded_ollama = Vec::new();

    for model in &request.whisper_models {
        if local_setup::is_stt_model_downloaded(model)
            .await
            .map_err(|e| format!("Failed to check STT model {}: {}", model, e))?
        {
            downloaded_whisper.push(model.clone());
        }
    }

    for model in &request.ollama_models {
        // Phase 3: "ollama_models" field also carries builtin cleanup GGUF ids.
        let ready = if model.contains("qwen") || model.ends_with(".gguf") {
            local_setup::is_cleanup_model_downloaded(model)
                .await
                .map_err(|e| format!("Failed to check cleanup model {}: {}", model, e))?
        } else {
            local_setup::is_ollama_model_downloaded(model)
                .await
                .unwrap_or(false)
        };
        if ready {
            downloaded_ollama.push(model.clone());
        }
    }

    Ok(serde_json::json!({
        "whisper": downloaded_whisper,
        "ollama": downloaded_ollama,
    }))
}

#[tauri::command]
async fn start_local_setup(
    request: StartSetupRequest,
    app: tauri::AppHandle,
    servers: tauri::State<'_, SharedServerProcesses>,
    _db: tauri::State<'_, Database>,
) -> Result<(), String> {
    let whisper_model = request.whisper_model;
    let ollama_model = request.ollama_model;
    let servers = servers.inner().clone();

    tokio::spawn(async move {
        let app_clone = app.clone();
        let stt_model_id = whisper_model.clone();

        let result = local_setup::run_setup(
            whisper_model,
            ollama_model,
            servers,
            move |progress: SetupProgress| {
                let app = app_clone.clone();
                tokio::spawn(async move {
                    let _ = app.emit("setup-progress", progress);
                });
            },
        ).await;

        match result {
            Ok(config) => {
                // Save config to database
                let db = app.state::<Database>();
                if let Err(e) = db.set_local_setup_config(&config) {
                    let _ = app.emit("setup-complete", serde_json::json!({
                        "success": false,
                        "error": format!("Failed to save config: {}", e),
                    }));
                } else {
                    // Persist engine id so restarts load Parakeet vs Whisper
                    // correctly. The setup request's model field is the tier id.
                    let engine = local_setup::stt_engine_for_model(&stt_model_id);
                    let _ = db.set_setting("stt_engine", engine);
                    let _ = db.set_setting("stt_model", &stt_model_id);
                    let _ = db.set_setting("cleanup_backend", "builtin");
                    let cleanup_id = config.ollama_model.clone();
                    if let Ok(path) = local_setup::get_cleanup_model_path(&cleanup_id) {
                        let path_str = path.to_string_lossy().to_string();
                        let _ = db.set_setting("cleanup_model_path", &path_str);
                        load_cleanup_engine(
                            app.state::<SharedCleanupEngine>().inner().clone(),
                            path_str,
                        );
                    }
                    if engine == "parakeet" {
                        let _ = db.set_setting(
                            "parakeet_model_path",
                            &config.whisper_model_path,
                        );
                    }
                    let engine_state = app.state::<SharedLocalEngine>();
                    load_local_engine(
                        engine_state.inner().clone(),
                        engine.to_string(),
                        config.whisper_model_path.clone(),
                        stt_model_id.clone(),
                    );
                    let _ = app.emit("setup-complete", serde_json::json!({
                        "success": true,
                        "config": config,
                    }));
                }
            }
            Err(e) => {
                let error_msg = e.to_string();
                if error_msg.contains("Manual intervention required") {
                    // This is handled by the progress events
                } else {
                    let _ = app.emit("setup-complete", serde_json::json!({
                        "success": false,
                        "error": error_msg,
                    }));
                }
            }
        }
    });
    
    Ok(())
}

#[tauri::command]
async fn continue_local_setup(
    _db: tauri::State<'_, Database>,
) -> Result<(), String> {
    // This is called after manual intervention to continue the setup
    // In a full implementation, we'd resume from where we left off
    // For now, we just acknowledge the continuation
    Ok(())
}

#[tauri::command]
async fn start_local_servers(
    db: tauri::State<'_, Database>,
    servers: tauri::State<'_, SharedServerProcesses>,
    whisper: tauri::State<'_, SharedWhisperProvider>,
) -> Result<serde_json::Value, String> {
    let config = db
        .get_local_setup_config()
        .map_err(|e| format!("Failed to get setup config: {}", e))?;

    if !config.setup_completed {
        return Err("Local setup not completed".to_string());
    }

    // Local STT runs in-process — kick off the (eager-async) model load if
    // it hasn't been loaded yet. Errors surface via toast on next dictation.
    if whisper.read().await.is_none() {
        kick_off_engine_load(&db, whisper.inner().clone(), &config);
    }

    // If we've already established a port for Ollama (either by spawning it
    // or by adopting an existing daemon), short-circuit. The presence of a
    // port — not a child — is the source of truth.
    {
        let guard = servers.read().await;
        if let Some(op) = guard.ollama_port {
            return Ok(serde_json::json!({
                "ollama_port": op,
                "status": "running",
            }));
        }
    }

    let (ollama_child, ollama_port) =
        local_setup::start_ollama_server(config.ollama_server_port)
            .await
            .map_err(|e| format!("Failed to start Ollama server: {}", e))?;

    {
        let mut guard = servers.write().await;
        guard.ollama = ollama_child;
        guard.ollama_port = Some(ollama_port);
    }

    Ok(serde_json::json!({
        "ollama_port": ollama_port,
        "status": "running",
    }))
}

/// Wait briefly for the local STT engine to finish loading. Returns the
/// engine as soon as it's available, or `None` after `timeout` so the caller
/// surfaces a friendly error rather than blocking forever.
async fn wait_for_local_engine(
    state: &SharedLocalEngine,
    timeout: std::time::Duration,
) -> Option<Arc<LocalEngine>> {
    if let Some(p) = state.read().await.clone() {
        return Some(p);
    }
    let start = std::time::Instant::now();
    while start.elapsed() < timeout {
        tokio::time::sleep(std::time::Duration::from_millis(150)).await;
        if let Some(p) = state.read().await.clone() {
            return Some(p);
        }
    }
    None
}

/// Load the configured local STT engine (Whisper or Parakeet) in the background.
fn load_local_engine(state: SharedLocalEngine, engine: String, model_path: String, model_id: String) {
    tauri::async_runtime::spawn(async move {
        let path = std::path::PathBuf::from(model_path);
        let engine_id = engine.clone();
        let mid = model_id.clone();
        let result = tokio::task::spawn_blocking(move || load_engine_blocking(&engine_id, &path, &mid))
            .await;
        match result {
            Ok(Ok(engine)) => {
                let label = engine.model_label();
                let kind = engine.engine_id();
                let mut slot = state.write().await;
                *slot = Some(Arc::new(engine));
                println!("Local STT engine loaded: {} ({})", kind, label);
            }
            Ok(Err(e)) => {
                eprintln!("Failed to load local STT engine: {}", e);
            }
            Err(e) => {
                eprintln!("STT engine load task join error: {}", e);
            }
        }
    });
}

/// Resolve engine + path from settings / local_setup config, then load.
fn kick_off_engine_load(db: &Database, state: SharedLocalEngine, config: &local_setup::LocalSetupConfig) {
    let (engine, path, model_id) = resolve_stt_load_target(db, config);
    if path.is_empty() {
        eprintln!("No STT model path configured — skip engine load");
        return;
    }
    load_local_engine(state, engine, path, model_id);
}

fn resolve_cleanup_backend(db: &Database) -> String {
    if let Some(b) = db.get_setting("cleanup_backend").ok().flatten() {
        if !b.is_empty() {
            return b;
        }
    }
    // Migration defaults for installs that predate cleanup_backend:
    if db
        .get_setting("cleanup_model_path")
        .ok()
        .flatten()
        .filter(|p| !p.is_empty())
        .is_some()
    {
        return "builtin".into();
    }
    if let Ok(config) = db.get_local_setup_config() {
        if config.ollama_model.contains("qwen") || config.ollama_model.ends_with(".gguf") {
            return "builtin".into();
        }
        if !config.ollama_model.is_empty() {
            // e.g. llama3.2 — keep Ollama path working.
            return "ollama".into();
        }
    }
    "builtin".into()
}

fn kick_off_cleanup_load(
    db: &Database,
    state: SharedCleanupEngine,
    config: &local_setup::LocalSetupConfig,
) {
    let backend = resolve_cleanup_backend(db);

    if backend != "builtin" {
        return;
    }

    let path = db
        .get_setting("cleanup_model_path")
        .ok()
        .flatten()
        .filter(|p| !p.is_empty())
        .or_else(|| {
            local_setup::get_cleanup_model_path(&config.ollama_model)
                .ok()
                .filter(|p| p.exists())
                .map(|p| p.to_string_lossy().into_owned())
        })
        .or_else(|| {
            local_setup::get_cleanup_model_path(local_setup::CLEANUP_QWEN25_05B)
                .ok()
                .filter(|p| p.exists())
                .map(|p| p.to_string_lossy().into_owned())
        });

    if let Some(path) = path {
        load_cleanup_engine(state, path);
    } else {
        eprintln!("No cleanup GGUF found — download via setup or Settings");
    }
}

fn resolve_stt_load_target(
    db: &Database,
    config: &local_setup::LocalSetupConfig,
) -> (String, String, String) {
    let model_id = db
        .get_setting("stt_model")
        .ok()
        .flatten()
        .unwrap_or_default();
    let engine = db
        .get_setting("stt_engine")
        .ok()
        .flatten()
        .unwrap_or_else(|| {
            // Migration: existing installs only have a whisper path.
            if !config.whisper_model_path.is_empty() {
                "whisper".into()
            } else {
                "parakeet".into()
            }
        });

    let path = if engine == "parakeet" {
        db.get_setting("parakeet_model_path")
            .ok()
            .flatten()
            .filter(|p| !p.is_empty())
            .or_else(|| {
                if config.whisper_model_path.contains("parakeet") {
                    Some(config.whisper_model_path.clone())
                } else {
                    local_setup::get_parakeet_model_dir(local_setup::STT_PARAKEET_V3)
                        .ok()
                        .map(|p| p.to_string_lossy().into_owned())
                }
            })
            .unwrap_or_default()
    } else {
        config.whisper_model_path.clone()
    };

    (engine, path, model_id)
}

fn load_engine_blocking(
    engine: &str,
    path: &std::path::Path,
    model_id: &str,
) -> anyhow::Result<LocalEngine> {
    match engine {
        "parakeet" => {
            let label = if model_id.is_empty() {
                path.file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_else(|| "parakeet".into())
            } else {
                model_id.to_string()
            };
            let provider = transcription::ParakeetProvider::load(path, &label)?;
            Ok(LocalEngine::Parakeet(Arc::new(provider)))
        }
        _ => {
            let provider = transcription::LocalWhisperProvider::load(path)?;
            Ok(LocalEngine::Whisper(Arc::new(provider)))
        }
    }
}

#[tauri::command]
async fn stop_local_servers(
    servers: tauri::State<'_, SharedServerProcesses>,
) -> Result<(), String> {
    let mut guard = servers.write().await;
    guard.stop_all().await;
    Ok(())
}

#[tauri::command]
async fn validate_local_servers(
    db: tauri::State<'_, Database>,
    servers: tauri::State<'_, SharedServerProcesses>,
    whisper: tauri::State<'_, SharedWhisperProvider>,
    cleanup_engine: tauri::State<'_, SharedCleanupEngine>,
) -> Result<serde_json::Value, String> {
    let config = db
        .get_local_setup_config()
        .map_err(|e| format!("Failed to get setup config: {}", e))?;

    let ollama_port = {
        let guard = servers.read().await;
        guard.ollama_port.unwrap_or(config.ollama_server_port)
    };

    // Transcription validation: local STT engine loaded in-process.
    let transcription_ok = {
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(60);
        loop {
            if whisper.read().await.is_some() {
                break true;
            }
            if std::time::Instant::now() >= deadline {
                break false;
            }
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
        }
    };

    let backend = db
        .get_setting("cleanup_backend")
        .ok()
        .flatten()
        .unwrap_or_else(|| "builtin".into());
    let cleanup_ok = if backend == "ollama" {
        local_setup::test_cleanup(ollama_port, &config.ollama_model)
            .await
            .is_ok()
    } else {
        // Builtin: model loaded, or path exists (load may still be in flight).
        if cleanup::peek_builtin(cleanup_engine.inner()).is_some() {
            true
        } else {
            local_setup::get_cleanup_model_path(&config.ollama_model)
                .map(|p| p.exists())
                .unwrap_or(false)
                || local_setup::get_cleanup_model_path(local_setup::CLEANUP_QWEN25_05B)
                    .map(|p| p.exists())
                    .unwrap_or(false)
        }
    };

    Ok(serde_json::json!({
        "transcription": transcription_ok,
        "cleanup": cleanup_ok,
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Database::new().expect("Failed to initialize database");
    let recorder = AudioRecorder::new().expect("Failed to initialize audio recorder");
    let recorder_state = RecorderState {
        recorder: Mutex::new(recorder),
        recording_start: Mutex::new(None),
        last_audio: Mutex::new(None),
        last_duration_ms: Mutex::new(0),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(db)
        .manage(recorder_state)
        .manage(PendingCleanup::new())
        .manage::<SharedServerProcesses>(Arc::new(RwLock::new(ServerProcesses::new())))
        .manage::<SharedWhisperProvider>(Arc::new(RwLock::new(None)))
        .manage::<SharedCleanupEngine>(Arc::new(std::sync::RwLock::new(None)))
        .manage(Arc::new(streaming::StreamingCoordinator::new()))
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            is_recording,
            toggle_recording,
            transcribe_last,
            transcribe_audio_file,
            apply_pending_cleanup,
            get_timing_stats,
            get_stt_status,
            get_cleanup_status,
            upgrade_cleanup_to_builtin,
            switch_stt_model,
            get_history,
            search_history,
            delete_dictation,
            get_setting,
            set_setting,
            get_profile,
            update_profile,
            list_app_profiles,
            upsert_app_profile,
            delete_app_profile,
            get_frontmost_app,
            suggest_vocab_from_history,
            get_local_user,
            set_local_user,
            complete_local_onboarding,
            get_audio_url,
            check_command_exists,
            install_tool,
            check_local_setup_status,
            check_model_download_status,
            check_system_requirements,
            start_local_setup,
            continue_local_setup,
            start_local_servers,
            stop_local_servers,
            validate_local_servers,
            open_system_settings,
            get_default_dictation_hotkey,
            check_accessibility_permission,
            check_microphone_permission,
            request_microphone_permission,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;
            setup_hud_window(app.handle())?;

            // Hide window on close instead of quitting
            let window = app.get_webview_window("main").unwrap();
            let w = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = w.hide();
                }
            });

            // Register the dictation hotkey from saved settings, falling back
            // to the platform default. Hotkey changes apply on app restart.
            {
                let db = app.state::<Database>();
                let saved = db.get_setting("hotkey").ok().flatten();
                let binding = saved
                    .as_deref()
                    .filter(|s| !s.trim().is_empty())
                    .unwrap_or_else(|| hotkey::default_for_platform());
                if let Err(e) = hotkey::register(app.handle(), binding) {
                    eprintln!("Failed to register dictation hotkey '{}': {}", binding, e);
                }
            }

            // ⌘⇧C applies the latest background cleanup when it differs from
            // the raw paste (see paste-then-refine flow in transcribe_last).
            {
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
                let apply_binding = "CmdOrCtrl+Shift+C";
                if let Err(e) = app.global_shortcut().on_shortcut(
                    apply_binding,
                    |app, _shortcut, event| {
                        if event.state() != ShortcutState::Pressed {
                            return;
                        }
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let pending = app.state::<PendingCleanup>();
                            let Some((_id, cleaned)) = pending.take() else {
                                return;
                            };
                            let _ = copy_and_paste_safely(&app, cleaned).await;
                            let _ = app.emit("cleanup-applied", ());
                        });
                    },
                ) {
                    eprintln!(
                        "Failed to register cleanup-apply hotkey '{}': {}",
                        apply_binding, e
                    );
                }
            }

            // Local-only: force setup_mode to local if it was cloud (or other).
            let db = app.state::<Database>();
            if let Ok(Some(mode)) = db.get_setting("setup_mode") {
                if mode != "local" {
                    let _ = db.set_setting("setup_mode", "local");
                    println!("Forced setup_mode from '{}' to 'local'", mode);
                }
            }

            // Always start local engines when setup is complete (regardless of
            // any prior setup_mode value that may have been "cloud" or missing).
            let config = db.get_local_setup_config();
            if let Ok(config) = config {
                if config.setup_completed {
                    // 1. Load the local STT engine in-process (eager async).
                    let engine_state = app.state::<SharedLocalEngine>();
                    kick_off_engine_load(&db, engine_state.inner().clone(), &config);

                    // 2. Load in-process cleanup GGUF (or warm Ollama if
                    //    the user still uses the legacy backend).
                    kick_off_cleanup_load(
                        &db,
                        app.state::<SharedCleanupEngine>().inner().clone(),
                        &config,
                    );

                    // 3. Pre-open the mic stream only for Bluetooth inputs
                    //    so codec negotiation is paid before the first press
                    //    (built-in / USB mics skip this to avoid a permanent
                    //    orange "mic in use" indicator while idle).
                    {
                        let state = app.state::<RecorderState>();
                        let warm_result = state.recorder.lock().map(|mut rec| rec.warm_up());
                        match warm_result {
                            Ok(Ok(())) => println!("Mic warm-up checked (BT-only)"),
                            Ok(Err(e)) => eprintln!("Mic warm-up skipped: {}", e),
                            Err(e) => eprintln!("Mic warm-up lock error: {}", e),
                        }
                    }

                    // Persist resolved backend so upgrades don't flip-flop
                    // between ollama/builtin on every launch.
                    let resolved_backend = resolve_cleanup_backend(&db);
                    let _ = db.set_setting("cleanup_backend", &resolved_backend);

                    let app_handle = app.handle().clone();
                    let ollama_model = config.ollama_model.clone();
                    tauri::async_runtime::spawn(async move {
                        // Must use the same migration-aware resolver as cleanup
                        // itself — a bare default of "builtin" skipped Ollama
                        // start for legacy installs and broke cleanup on update.
                        let backend = {
                            let db = app_handle.state::<Database>();
                            resolve_cleanup_backend(&db)
                        };
                        if backend != "ollama" {
                            println!("Using builtin cleanup (no Ollama daemon)");
                            return;
                        }
                        match start_local_servers(
                            app_handle.state::<Database>(),
                            app_handle.state::<SharedServerProcesses>(),
                            app_handle.state::<SharedWhisperProvider>(),
                        )
                        .await
                        {
                            Ok(_) => {
                                println!("Local services started (Ollama compat)");
                                let port = {
                                    let servers = app_handle.state::<SharedServerProcesses>();
                                    let guard = servers.read().await;
                                    guard.ollama_port
                                };
                                if let Some(port) = port {
                                    // Prefer the configured Ollama model; ignore
                                    // qwen/gguf ids that may have been written later.
                                    let model = if ollama_model.is_empty()
                                        || ollama_model.contains("qwen")
                                        || ollama_model.ends_with(".gguf")
                                    {
                                        "llama3.2".to_string()
                                    } else {
                                        ollama_model
                                    };
                                    local_setup::warm_up_ollama(port, &model).await;
                                }
                            }
                            Err(e) => eprintln!("Failed to auto-start local services: {}", e),
                        }
                    });
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            // Reap spawned child processes (Ollama daemon, etc.) before the
            // process tears down. Without this, repeated dev launches and
            // crashes leave a pile of zombie `ollama serve` processes that
            // hold the preferred port and break the next session.
            if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
                {
                    let state = app.state::<RecorderState>();
                    let _ = state.recorder.lock().map(|mut rec| rec.shutdown());
                }
                let servers = app.state::<SharedServerProcesses>().inner().clone();
                tauri::async_runtime::block_on(async move {
                    let mut guard = servers.write().await;
                    guard.stop_all().await;
                });
            }
        });
}

fn setup_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::TrayIconBuilder;

    let open = MenuItemBuilder::with_id("open", "Open Parrot").build(app)?;
    let toggle = MenuItemBuilder::with_id("toggle", "Start Recording").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&open, &toggle, &quit])
        .build()?;

    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?;

    TrayIconBuilder::new()
        .icon(icon)
        .icon_as_template(false)
        .menu(&menu)
        .tooltip("Parrot - Voice Dictation")
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "open" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "toggle" => {
                let state = app.state::<RecorderState>();
                let is_rec = state.recorder.lock().unwrap().is_recording();
                drop(state);
                if is_rec {
                    hotkey::end_recording(app);
                } else {
                    hotkey::begin_recording(app);
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// Create the floating status orb window: always-on-top, transparent,
/// frameless, non-focus-stealing. The React side at `/hud` resizes and
/// repositions the window when the dictation status changes; here we just
/// create it at idle size in the bottom-left of the primary monitor.
fn setup_hud_window(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::{LogicalSize, WebviewUrl, WebviewWindowBuilder};

    // Idle orb size; the React side will resize when status changes.
    const IDLE_SIZE: f64 = 56.0;
    const MARGIN: f64 = 24.0;

    // Same entry HTML as the main window — main.tsx branches on
    // `getCurrentWindow().label === "hud"` and renders the orb instead of the
    // router. Keeps prod loading robust without extra SPA-fallback config.
    let hud = WebviewWindowBuilder::new(app, "hud", WebviewUrl::App("index.html".into()))
        .title("Parrot")
        .inner_size(IDLE_SIZE, IDLE_SIZE)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .visible(false)
        .shadow(false)
        .accept_first_mouse(true)
        .build()?;

    // Anchor to bottom-left of the primary monitor. The React side will keep
    // this anchor when it resizes the window.
    if let Ok(Some(monitor)) = hud.primary_monitor() {
        let scale = monitor.scale_factor();
        let mpos = monitor.position();
        let msize = monitor.size();
        // Convert margin + idle size from logical to physical to position the
        // physical window correctly on hi-dpi displays.
        let m_px = (MARGIN * scale).round() as i32;
        let s_px = (IDLE_SIZE * scale).round() as i32;
        let x = mpos.x + m_px;
        let y = mpos.y + (msize.height as i32) - s_px - m_px;
        let _ = hud.set_position(tauri::PhysicalPosition::new(x, y));
    }

    // Belt and braces: ensure the logical size matches what we asked for after
    // any platform fudging during build().
    let _ = hud.set_size(LogicalSize::new(IDLE_SIZE, IDLE_SIZE));

    #[cfg(target_os = "macos")]
    {
        let _ = hud.set_visible_on_all_workspaces(true);
    }

    let _ = hud.show();
    Ok(())
}
