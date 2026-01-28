mod audio;
mod cleanup;
mod cloud_api;
mod db;
mod transcription;

use audio::AudioRecorder;
use db::Database;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{Emitter, Manager};

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
    let raw_text = transcription::transcribe_audio(
        &wav_data,
        &setup_mode,
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
            let token = session_token.as_deref()
                .ok_or_else(|| "Session token required for cloud mode".to_string())?;
            cloud_api::insert_dictation(token, &id, &raw_text, "", "cloud", duration_ms as i64)
                .await
                .map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("Unknown setup mode: {}", setup_mode)),
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
            let token = session_token.as_deref()
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

    // Step 3: Copy to clipboard and paste
    let output_text = if cleaned_text.is_empty() {
        &raw_text
    } else {
        &cleaned_text
    };
    let pasted = copy_and_paste(output_text);

    let result = DictationResult {
        raw_text: raw_text.clone(),
        cleaned_text: cleaned_text.clone(),
        pasted,
    };
    let _ = app.emit("dictation-complete", result.clone());
    Ok(result)
}

fn copy_and_paste(text: &str) -> bool {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};

    // Copy to clipboard
    let mut clipboard = arboard::Clipboard::new();
    let Ok(ref mut cb) = clipboard else {
        eprintln!("Failed to access clipboard");
        return false;
    };
    if cb.set_text(text).is_err() {
        eprintln!("Failed to set clipboard text");
        return false;
    }

    // Small delay then Cmd+V to paste into focused field
    std::thread::sleep(std::time::Duration::from_millis(50));
    let Ok(mut enigo) = Enigo::new(&Settings::default()) else {
        return false;
    };
    let _ = enigo.key(Key::Meta, Direction::Press);
    let _ = enigo.key(Key::Unicode('v'), Direction::Click);
    let _ = enigo.key(Key::Meta, Direction::Release);
    true
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
                })
                .collect())
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
        "local" => {
            db.update_profile(custom_words, context_prompt, writing_style)
                .map_err(|e| e.to_string())
        }
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

#[tauri::command]
fn check_command_exists(name: String) -> bool {
    use std::process::Command;
    Command::new("which")
        .arg(&name)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[tauri::command]
async fn install_tool(name: String) -> Result<String, String> {
    use std::process::Command;

    let script = match name.as_str() {
        "whisper-cpp" => {
            // Install whisper.cpp via Homebrew
            "brew install whisper-cpp"
        }
        "ollama" => {
            // Install Ollama via the official installer
            "curl -fsSL https://ollama.ai/install.sh | sh"
        }
        _ => return Err(format!("Unknown tool: {}", name)),
    };

    let output = Command::new("sh")
        .arg("-c")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to run install command: {}", e))?;

    if output.status.success() {
        Ok(format!("{} installed successfully", name))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Installation failed: {}", stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut("CmdOrCtrl+Shift+Space")
                .expect("Failed to register default shortcut")
                .with_handler(|app, _shortcut, event| {
                    use tauri_plugin_global_shortcut::ShortcutState;
                    let state = app.state::<RecorderState>();
                    match event.state() {
                        ShortcutState::Pressed => {
                            let mut recorder = state.recorder.lock().unwrap();
                            if !recorder.is_recording() {
                                if let Err(e) = recorder.start() {
                                    eprintln!("Failed to start recording: {}", e);
                                    return;
                                }
                                *state.recording_start.lock().unwrap() = Some(Instant::now());
                                let _ = app.emit("recording-started", ());
                            }
                        }
                        ShortcutState::Released => {
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
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(db)
        .manage(recorder_state)
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            is_recording,
            transcribe_last,
            get_history,
            search_history,
            get_setting,
            set_setting,
            get_profile,
            update_profile,
            check_command_exists,
            install_tool,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;

            // Hide window on close instead of quitting
            let window = app.get_webview_window("main").unwrap();
            let w = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = w.hide();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
