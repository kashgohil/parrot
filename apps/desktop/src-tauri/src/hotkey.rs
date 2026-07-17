//! Cross-platform dictation hotkey registration.
//!
//! Two paths:
//! - **Standard combos** (Ctrl+Space, Cmd+Shift+Space, etc.) go through
//!   `tauri-plugin-global-shortcut`. Works on macOS, Windows, Linux.
//! - **`fn` alone on macOS** can't be registered through Apple's
//!   `RegisterEventHotKey` API — it's reserved by the OS. We instead install
//!   a `CGEventTap` that watches for the `Fn` modifier flag toggling on/off
//!   and translates that into press/release events.
//!
//! Both paths call the same `start_recording` / `stop_recording` hooks, so
//! downstream behavior is identical regardless of which input mechanism the
//! user picked.

use crate::audio::AudioRecorder;
use crate::RecorderState;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// Logical default hotkey for this OS. Stored as a string for parity with the
/// `tauri-plugin-global-shortcut` accelerator format, with `"fn"` as a special
/// macOS-only sentinel.
pub fn default_for_platform() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "fn"
    }
    #[cfg(target_os = "windows")]
    {
        "Ctrl+Space"
    }
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        "Ctrl+Space"
    }
}

/// Register the requested hotkey. Called once at app startup; changes require
/// an app restart to take effect (standard pattern).
pub fn register(app: &AppHandle, binding: &str) -> Result<(), String> {
    let trimmed = binding.trim();

    if trimmed.eq_ignore_ascii_case("fn") {
        #[cfg(target_os = "macos")]
        {
            return mac_fn::start_fn_tap(app.clone());
        }
        #[cfg(not(target_os = "macos"))]
        {
            return Err(
                "The fn-key shortcut is only supported on macOS. Choose a key combination instead."
                    .to_string(),
            );
        }
    }

    register_plugin_shortcut(app, trimmed)
}

fn register_plugin_shortcut(app: &AppHandle, binding: &str) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(binding, move |app, _shortcut, event| {
            match event.state() {
                ShortcutState::Pressed => begin_recording(app),
                ShortcutState::Released => end_recording(app),
            }
        })
        .map_err(|e| format!("Failed to register hotkey '{}': {}", binding, e))
}

/// Start recording — invoked from any hotkey path. Idempotent.
pub fn begin_recording(app: &AppHandle) {
    let state = app.state::<RecorderState>();
    let mut recorder: std::sync::MutexGuard<'_, AudioRecorder> =
        state.recorder.lock().unwrap();
    if recorder.is_recording() {
        return;
    }
    if let Err(e) = recorder.start() {
        eprintln!("Failed to start recording: {}", e);
        return;
    }
    *state.recording_start.lock().unwrap() = Some(Instant::now());
    drop(recorder);

    // Phase 5 interim streaming: re-transcribe the growing buffer while held.
    let gen = app
        .state::<std::sync::Arc<crate::streaming::StreamingCoordinator>>()
        .next_generation();
    crate::streaming::start_partial_loop(app.clone(), gen);

    let _ = app.emit("recording-started", ());
}

/// Stop recording — invoked from any hotkey path. Idempotent.
pub fn end_recording(app: &AppHandle) {
    // Invalidate in-flight streaming partials before we stop capture.
    let _ = app
        .state::<std::sync::Arc<crate::streaming::StreamingCoordinator>>()
        .next_generation();

    let state = app.state::<RecorderState>();
    let mut recorder = state.recorder.lock().unwrap();
    if !recorder.is_recording() {
        return;
    }
    let duration_ms = state
        .recording_start
        .lock()
        .unwrap()
        .map(|s: Instant| s.elapsed().as_millis() as u64)
        .unwrap_or(0);
    match recorder.stop() {
        Ok(audio) => {
            *state.last_duration_ms.lock().unwrap() = duration_ms;
            *state.last_audio.lock().unwrap() = Some(audio);
            let _ = app.emit("recording-stopped", duration_ms);
        }
        Err(e) => eprintln!("Failed to stop recording: {}", e),
    }
}

// Suppress unused-import warning on non-macOS.
#[allow(dead_code)]
fn _force_use(_: &Mutex<()>) {}

#[cfg(target_os = "macos")]
mod mac_fn {
    //! Watches the macOS `Fn` modifier flag via a `CGEventTap` and translates
    //! its state changes into start/stop calls. Runs on its own thread with a
    //! dedicated `CFRunLoop`. Requires Accessibility permission (already
    //! prompted elsewhere in the app).
    use super::{begin_recording, end_recording};
    use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
    use core_graphics::event::{
        CGEvent, CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions,
        CGEventTapPlacement, CGEventType,
    };
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use tauri::AppHandle;

    pub fn start_fn_tap(app: AppHandle) -> Result<(), String> {
        let down = Arc::new(AtomicBool::new(false));

        std::thread::Builder::new()
            .name("parrot-fn-tap".into())
            .spawn(move || {
                let down = down.clone();
                let app_for_tap = app.clone();

                let tap = CGEventTap::new(
                    CGEventTapLocation::HID,
                    CGEventTapPlacement::HeadInsertEventTap,
                    CGEventTapOptions::ListenOnly,
                    vec![CGEventType::FlagsChanged],
                    move |_proxy, _evt_type, event: &CGEvent| {
                        let flags = event.get_flags();
                        let fn_now = flags.contains(CGEventFlags::CGEventFlagSecondaryFn);
                        let was = down.swap(fn_now, Ordering::SeqCst);
                        if fn_now && !was {
                            begin_recording(&app_for_tap);
                        } else if !fn_now && was {
                            end_recording(&app_for_tap);
                        }
                        None
                    },
                );

                let tap = match tap {
                    Ok(t) => t,
                    Err(e) => {
                        eprintln!("Failed to create CGEventTap for fn key: {:?}", e);
                        return;
                    }
                };

                // Add the tap to the current thread's run loop and start it.
                let loop_source = match tap.mach_port.create_runloop_source(0) {
                    Ok(s) => s,
                    Err(e) => {
                        eprintln!("Failed to create CFRunLoop source for fn tap: {:?}", e);
                        return;
                    }
                };

                let current = CFRunLoop::get_current();
                unsafe {
                    current.add_source(&loop_source, kCFRunLoopCommonModes);
                }
                tap.enable();
                CFRunLoop::run_current();
            })
            .map_err(|e| format!("Failed to spawn fn-tap thread: {}", e))?;

        Ok(())
    }
}
