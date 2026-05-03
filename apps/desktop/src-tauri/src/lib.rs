mod audio;
mod cleanup;
mod cloud_api;
mod db;
mod hotkey;
mod local_setup;
mod migration;
mod transcription;

use audio::AudioRecorder;
use db::Database;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{Emitter, Manager};
use tokio::sync::RwLock;
use transcription::LocalWhisperProvider;

/// Shared handle to the in-process whisper provider. `None` until the model
/// finishes loading (eager-async at startup) — falls through to a friendly
/// error if a dictation arrives before then.
pub type SharedWhisperProvider = Arc<RwLock<Option<Arc<LocalWhisperProvider>>>>;

pub struct RecorderState {
    recorder: Mutex<AudioRecorder>,
    recording_start: Mutex<Option<Instant>>,
    last_wav: Mutex<Option<Vec<u8>>>,
    last_duration_ms: Mutex<u64>,
}

#[tauri::command]
fn start_recording(
    state: tauri::State<'_, RecorderState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut recorder = state.recorder.lock().unwrap();
    if recorder.is_recording() {
        return Ok(());
    }
    recorder.start().map_err(|e| e.to_string())?;
    *state.recording_start.lock().unwrap() = Some(Instant::now());
    app.emit("recording-started", ())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn stop_recording(
    state: tauri::State<'_, RecorderState>,
    app: tauri::AppHandle,
) -> Result<Vec<u8>, String> {
    let mut recorder = state.recorder.lock().unwrap();
    if !recorder.is_recording() {
        return Err("Not recording".into());
    }
    let duration_ms = state
        .recording_start
        .lock()
        .unwrap()
        .map(|s| s.elapsed().as_millis() as u64)
        .unwrap_or(0);
    let wav_data = recorder.stop().map_err(|e| e.to_string())?;
    app.emit("recording-stopped", duration_ms)
        .map_err(|e| e.to_string())?;
    Ok(wav_data)
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
    whisper: tauri::State<'_, SharedWhisperProvider>,
    app: tauri::AppHandle,
) -> Result<DictationResult, String> {
    let wav_data = recorder_state
        .last_wav
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "No audio data available".to_string())?;
    let duration_ms = *recorder_state.last_duration_ms.lock().unwrap();

    let setup_mode = db
        .get_setting("setup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "local".to_string());
    let session_token = db.get_setting("session_token").map_err(|e| e.to_string())?;
    let api_key = db.get_setting("api_key").map_err(|e| e.to_string())?;

    // Step 1: Transcribe
    let _ = app.emit("transcription-started", ());
    let local_provider = if setup_mode == "local" {
        wait_for_whisper_provider(whisper.inner(), std::time::Duration::from_secs(30)).await
    } else {
        None
    };
    let raw_text = transcription::transcribe_audio(
        &wav_data,
        &setup_mode,
        local_provider.as_deref(),
        session_token.as_deref(),
        api_key.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())?;

    // Save initial entry
    let id = uuid::Uuid::new_v4().to_string();
    match setup_mode.as_str() {
        "local" => {
            db.insert_dictation(&id, &raw_text, "", "local", duration_ms as i64)
                .map_err(|e| e.to_string())?;
        }
        "cloud" => {
            let token = session_token
                .as_deref()
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            cloud_api::insert_dictation(token, &id, &raw_text, "", "cloud", duration_ms as i64)
                .await
                .map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("Unknown setup mode: {}", setup_mode)),
    }

    // Save audio if enabled
    let save_audio = db
        .get_setting("save_audio")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "false".to_string());

    if save_audio == "true" {
        match setup_mode.as_str() {
            "local" => {
                let audio_dir = Database::audio_dir().map_err(|e| e.to_string())?;
                std::fs::create_dir_all(&audio_dir).map_err(|e| e.to_string())?;
                let audio_path = audio_dir.join(format!("{}.wav", id));
                std::fs::write(&audio_path, &wav_data).map_err(|e| e.to_string())?;
                let _ = db.update_dictation_audio_path(&id, &audio_path.to_string_lossy());
            }
            "cloud" => {
                if let Some(token) = session_token.as_deref() {
                    let wav_clone = wav_data.clone();
                    let token_owned = token.to_string();
                    let id_clone = id.clone();
                    // Upload in background to not block transcription flow
                    tokio::spawn(async move {
                        if let Err(e) =
                            cloud_api::upload_audio(&token_owned, &id_clone, &wav_clone).await
                        {
                            eprintln!("Audio upload failed: {}", e);
                        }
                    });
                }
            }
            _ => {}
        }
    }

    // Step 2: LLM cleanup
    let _ = app.emit("cleanup-started", ());

    let cleaned_text = match setup_mode.as_str() {
        "local" => {
            let llm_model = db.get_setting("llm_model").map_err(|e| e.to_string())?;
            let profile = db.get_profile().map_err(|e| e.to_string())?;
            match cleanup::cleanup_text(
                &raw_text,
                "local",
                None,
                None,
                llm_model.as_deref(),
                &profile.custom_words,
                &profile.context_prompt,
                &profile.writing_style,
            )
            .await
            {
                Ok(cleaned) => {
                    let _ = db.update_dictation_cleaned(&id, &cleaned);
                    cleaned
                }
                Err(e) => {
                    eprintln!("LLM cleanup failed: {}", e);
                    raw_text.clone()
                }
            }
        }
        "cloud" => {
            let token = session_token
                .as_deref()
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            let llm_api_key = db.get_setting("llm_api_key").map_err(|e| e.to_string())?;
            match cleanup::cleanup_text(
                &raw_text,
                "cloud",
                Some(token),
                llm_api_key.as_deref(),
                None,
                "",
                "",
                "",
            )
            .await
            {
                Ok(cleaned) => {
                    let _ = cloud_api::update_dictation_cleaned(token, &id, &cleaned).await;
                    cleaned
                }
                Err(e) => {
                    eprintln!("LLM cleanup failed: {}", e);
                    raw_text.clone()
                }
            }
        }
        _ => raw_text.clone(),
    };

    // Step 3: Copy to clipboard and paste into the previously-focused field.
    let output_text = if cleaned_text.is_empty() {
        raw_text.clone()
    } else {
        cleaned_text.clone()
    };
    let pasted = copy_and_paste_safely(&app, output_text).await;

    let result = DictationResult {
        raw_text: raw_text.clone(),
        cleaned_text: cleaned_text.clone(),
        pasted,
    };
    let _ = app.emit("dictation-complete", result.clone());
    Ok(result)
}

/// Copy text to the clipboard via Tauri's clipboard plugin and paste it into
/// whatever app currently holds key focus.
///
/// On macOS we synthesize Cmd+V via `CGEventPost` rather than driving
/// `osascript` → System Events. The osascript path required the user to grant
/// *Automation → System Events* on top of Accessibility, and reported error
/// 1002 ("not allowed to send keystrokes") in confusing ways even when
/// Accessibility was granted. CGEvent only needs Accessibility.
async fn copy_and_paste_safely(app: &tauri::AppHandle, text: String) -> bool {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    if let Err(e) = app.clipboard().write_text(text.clone()) {
        eprintln!("Failed to set clipboard text: {}", e);
        return false;
    }

    // Give the system a beat to register the new pasteboard contents before
    // we synthesize Cmd+V into whatever app currently holds focus.
    tokio::time::sleep(std::time::Duration::from_millis(80)).await;

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

        let result =
            tauri::async_runtime::spawn_blocking(|| std::panic::catch_unwind(post_cmd_v_macos))
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
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        false
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

/// DictationEntry type used by both local and cloud modes in command responses
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
    let setup_mode = db
        .get_setting("setup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "local".to_string());

    match setup_mode.as_str() {
        "local" => {
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
        "cloud" => {
            let session_token = db
                .get_setting("session_token")
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            let entries = cloud_api::get_history(&session_token)
                .await
                .map_err(|e| e.to_string())?;
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
        _ => Err(format!("Unknown setup mode: {}", setup_mode)),
    }
}

#[tauri::command]
async fn search_history(
    query: &str,
    db: tauri::State<'_, Database>,
) -> Result<Vec<DictationEntry>, String> {
    let setup_mode = db
        .get_setting("setup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "local".to_string());

    match setup_mode.as_str() {
        "local" => {
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
        "cloud" => {
            let session_token = db
                .get_setting("session_token")
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            let entries = cloud_api::search_history(&session_token, query)
                .await
                .map_err(|e| e.to_string())?;
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
        _ => Err(format!("Unknown setup mode: {}", setup_mode)),
    }
}

#[tauri::command]
async fn delete_dictation(
    id: String,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    let setup_mode = db
        .get_setting("setup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "local".to_string());

    match setup_mode.as_str() {
        "local" => {
            let audio_path = db.delete_dictation(&id).map_err(|e| e.to_string())?;
            if let Some(path) = audio_path {
                let _ = std::fs::remove_file(&path);
            }
            Ok(())
        }
        "cloud" => {
            let session_token = db
                .get_setting("session_token")
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            cloud_api::delete_dictation(&session_token, &id)
                .await
                .map_err(|e| e.to_string())?;
            Ok(())
        }
        _ => Err(format!("Unknown setup mode: {}", setup_mode)),
    }
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
    let setup_mode = db
        .get_setting("setup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "local".to_string());

    match setup_mode.as_str() {
        "local" => {
            let p = db.get_profile().map_err(|e| e.to_string())?;
            Ok(ProfileData {
                custom_words: p.custom_words,
                context_prompt: p.context_prompt,
                writing_style: p.writing_style,
            })
        }
        "cloud" => {
            let session_token = db
                .get_setting("session_token")
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            let p = cloud_api::get_profile(&session_token)
                .await
                .map_err(|e| e.to_string())?;
            Ok(ProfileData {
                custom_words: p.custom_words,
                context_prompt: p.context_prompt,
                writing_style: p.writing_style,
            })
        }
        _ => Err(format!("Unknown setup mode: {}", setup_mode)),
    }
}

#[tauri::command]
async fn update_profile(
    custom_words: &str,
    context_prompt: &str,
    writing_style: &str,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    let setup_mode = db
        .get_setting("setup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "local".to_string());

    match setup_mode.as_str() {
        "local" => db
            .update_profile(custom_words, context_prompt, writing_style)
            .map_err(|e| e.to_string()),
        "cloud" => {
            let session_token = db
                .get_setting("session_token")
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            cloud_api::update_profile(&session_token, custom_words, context_prompt, writing_style)
                .await
                .map_err(|e| e.to_string())
        }
        _ => Err(format!("Unknown setup mode: {}", setup_mode)),
    }
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
    let setup_mode = db
        .get_setting("setup_mode")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "local".to_string());

    match setup_mode.as_str() {
        "local" => {
            let path = db.get_audio_path(id).map_err(|e| e.to_string())?;
            Ok(path)
        }
        "cloud" => {
            let session_token = db
                .get_setting("session_token")
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            match cloud_api::get_audio_url(&session_token, id).await {
                Ok(url) => Ok(Some(url)),
                Err(e) => {
                    eprintln!("Failed to get audio URL: {}", e);
                    Ok(None)
                }
            }
        }
        _ => Ok(None),
    }
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
        if local_setup::is_whisper_model_downloaded(model)
            .await
            .map_err(|e| format!("Failed to check Whisper model {}: {}", model, e))?
        {
            downloaded_whisper.push(model.clone());
        }
    }

    if local_setup::command_exists("ollama").await {
        for model in &request.ollama_models {
            if local_setup::is_ollama_model_downloaded(model)
                .await
                .map_err(|e| format!("Failed to check Ollama model {}: {}", model, e))?
            {
                downloaded_ollama.push(model.clone());
            }
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
                    // Kick off the in-process whisper model load now that the
                    // file is on disk. UI keeps moving; provider becomes
                    // available a beat later.
                    let whisper_state = app.state::<SharedWhisperProvider>();
                    load_whisper_provider(
                        whisper_state.inner().clone(),
                        config.whisper_model_path.clone(),
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

    // Whisper now runs in-process — kick off the (eager-async) model load if
    // it hasn't been loaded yet. Errors here are surfaced via the toast layer
    // when transcription is actually attempted.
    if whisper.read().await.is_none() && !config.whisper_model_path.is_empty() {
        load_whisper_provider(whisper.inner().clone(), config.whisper_model_path.clone());
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

/// Wait briefly for the whisper provider to finish loading. Returns the
/// provider as soon as it's available, or `None` after `timeout` so the caller
/// surfaces a friendly error rather than blocking forever.
async fn wait_for_whisper_provider(
    state: &SharedWhisperProvider,
    timeout: std::time::Duration,
) -> Option<Arc<transcription::LocalWhisperProvider>> {
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

/// Load the whisper model in the background. Stores the resulting provider in
/// shared state once ready; logs and discards errors (the user will see a
/// friendly toast on the next dictation attempt if loading failed).
fn load_whisper_provider(state: SharedWhisperProvider, model_path: String) {
    tauri::async_runtime::spawn(async move {
        let path = std::path::PathBuf::from(model_path);
        match tokio::task::spawn_blocking(move || LocalWhisperProvider::load(&path)).await {
            Ok(Ok(provider)) => {
                let mut slot = state.write().await;
                *slot = Some(Arc::new(provider));
                println!("Whisper model loaded");
            }
            Ok(Err(e)) => {
                eprintln!("Failed to load whisper model: {}", e);
            }
            Err(e) => {
                eprintln!("Whisper load task join error: {}", e);
            }
        }
    });
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
) -> Result<serde_json::Value, String> {
    let config = db
        .get_local_setup_config()
        .map_err(|e| format!("Failed to get setup config: {}", e))?;

    let ollama_port = {
        let guard = servers.read().await;
        guard.ollama_port.unwrap_or(config.ollama_server_port)
    };

    // Transcription "validation" is now just a check that the whisper model
    // loaded successfully — it lives in-process, no network probe needed.
    // The load is kicked off in a background task when setup finishes, so
    // poll briefly here to avoid racing the user to the completion screen.
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
    let cleanup_ok =
        local_setup::test_cleanup(ollama_port, &config.ollama_model)
            .await
            .is_ok();

    Ok(serde_json::json!({
        "transcription": transcription_ok,
        "cleanup": cleanup_ok,
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _sentry_guard = option_env!("SENTRY_DSN").map(|dsn| {
        let guard = sentry::init((
            dsn,
            sentry::ClientOptions {
                release: sentry::release_name!(),
                ..Default::default()
            },
        ));
        sentry::configure_scope(|scope| {
            scope.set_tag("app", "parrot-desktop-rust");
        });
        guard
    });

    let db = Database::new().expect("Failed to initialize database");
    let recorder = AudioRecorder::new().expect("Failed to initialize audio recorder");
    let recorder_state = RecorderState {
        recorder: Mutex::new(recorder),
        recording_start: Mutex::new(None),
        last_wav: Mutex::new(None),
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
        .manage::<SharedServerProcesses>(Arc::new(RwLock::new(ServerProcesses::new())))
        .manage::<SharedWhisperProvider>(Arc::new(RwLock::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            is_recording,
            toggle_recording,
            transcribe_last,
            get_history,
            search_history,
            delete_dictation,
            get_setting,
            set_setting,
            get_profile,
            update_profile,
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
            migration::get_migration_status,
            migration::get_migration_checkout_url,
            migration::get_migration_snapshot,
            migration::migrate_local_to_cloud,
            migration::retry_failed_audio,
            migration::revert_to_local,
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

            // Auto-start local services if in local mode.
            let db = app.state::<Database>();
            let setup_mode = db.get_setting("setup_mode").ok().flatten();
            if setup_mode == Some("local".to_string()) {
                let config = db.get_local_setup_config();
                if let Ok(config) = config {
                    if config.setup_completed {
                        // 1. Load the whisper model in-process (eager async).
                        let whisper_state = app.state::<SharedWhisperProvider>();
                        load_whisper_provider(
                            whisper_state.inner().clone(),
                            config.whisper_model_path.clone(),
                        );

                        // 2. Make sure the Ollama daemon is running, then
                        //    pre-warm the configured LLM in the background so
                        //    the first dictation doesn't pay the cold-load
                        //    tax. Both run in a detached task so the UI is
                        //    interactive immediately.
                        let app_handle = app.handle().clone();
                        let ollama_model = config.ollama_model.clone();
                        tauri::async_runtime::spawn(async move {
                            match start_local_servers(
                                app_handle.state::<Database>(),
                                app_handle.state::<SharedServerProcesses>(),
                                app_handle.state::<SharedWhisperProvider>(),
                            )
                            .await
                            {
                                Ok(_) => {
                                    println!("Local services started");
                                    let port = {
                                        let servers =
                                            app_handle.state::<SharedServerProcesses>();
                                        let guard = servers.read().await;
                                        guard.ollama_port
                                    };
                                    if let Some(port) = port {
                                        if !ollama_model.is_empty() {
                                            local_setup::warm_up_ollama(port, &ollama_model)
                                                .await;
                                        }
                                    }
                                }
                                Err(e) => eprintln!("Failed to auto-start local services: {}", e),
                            }
                        });
                    }
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
                let mut recorder = state.recorder.lock().unwrap();
                if recorder.is_recording() {
                    let duration_ms = state
                        .recording_start
                        .lock()
                        .unwrap()
                        .map(|s| s.elapsed().as_millis() as u64)
                        .unwrap_or(0);
                    match recorder.stop() {
                        Ok(wav_data) => {
                            *state.last_duration_ms.lock().unwrap() = duration_ms;
                            *state.last_wav.lock().unwrap() = Some(wav_data);
                            let _ = app.emit("recording-stopped", duration_ms);
                        }
                        Err(e) => eprintln!("Failed to stop recording: {}", e),
                    }
                } else {
                    if let Err(e) = recorder.start() {
                        eprintln!("Failed to start recording: {}", e);
                        return;
                    }
                    *state.recording_start.lock().unwrap() = Some(Instant::now());
                    let _ = app.emit("recording-started", ());
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
