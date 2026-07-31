//! Cross-platform dictation hotkey registration.
//!
//! Two paths:
//! - **Standard combos** (Ctrl+Space, Cmd+Shift+Space, etc.) go through
//!   `tauri-plugin-global-shortcut`. Works on macOS, Windows, Linux.
//! - **`fn` alone on macOS** can't be registered through Apple's
//!   `RegisterEventHotKey` API — it's reserved by the OS. We instead install
//!   a listen-only `CGEventTap` (at the *session* level, so we never sit in
//!   the HID delivery path of other apps) that watches the `Fn` modifier flag
//!   toggling on/off and translates that into press/release events.
//!
//!   The tap callback does **no real work** — it only detects the `fn` edge
//!   (and whether `fn` was used as part of a key combo like fn+←) and forwards
//!   a command to a dedicated worker thread. All the potentially blocking audio
//!   work happens on that worker, never inside the tap, so we don't stall
//!   system-wide keyboard delivery or get the tap force-disabled by macOS.
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

/// Stop capturing and throw the audio away **without** transcribing. Used when
/// a held `fn` turns out to be part of a key combo (e.g. fn+←, fn+Delete)
/// rather than a dictation, so we back out cleanly. Idempotent.
#[allow(dead_code)] // only wired up on macOS (fn-tap path)
pub fn cancel_recording(app: &AppHandle) {
    // Invalidate any in-flight streaming partials before we stop capture.
    let _ = app
        .state::<std::sync::Arc<crate::streaming::StreamingCoordinator>>()
        .next_generation();

    let state = app.state::<RecorderState>();
    let mut recorder = state.recorder.lock().unwrap();
    if !recorder.is_recording() {
        return;
    }
    // Drop the buffer on the floor: do not store last_audio and do not emit
    // `recording-stopped` (which would kick off transcription).
    let _ = recorder.stop();
    *state.recording_start.lock().unwrap() = None;
    drop(recorder);
    let _ = app.emit("recording-cancelled", ());
}

// Suppress unused-import warning on non-macOS.
#[allow(dead_code)]
fn _force_use(_: &Mutex<()>) {}

#[cfg(target_os = "macos")]
mod mac_fn {
    //! Watches the macOS `Fn` modifier flag via a listen-only `CGEventTap` and
    //! translates its state changes into start/stop/cancel calls.
    //!
    //! Two threads:
    //! - **tap thread** owns the `CFRunLoop` + `CGEventTap`. Its callback is
    //!   deliberately trivial (read a flag, send a message) so it never stalls
    //!   the keyboard event stream that other apps depend on.
    //! - **worker thread** receives those messages and performs the actual
    //!   audio work (opening the mic can block for tens of ms), well away from
    //!   the tap callback.
    //!
    //! Requires Accessibility permission (already prompted elsewhere).
    use super::{begin_recording, cancel_recording, end_recording};
    use core_foundation::base::TCFType;
    use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
    use core_graphics::event::{
        CGEvent, CGEventFlags, CGEventTap, CGEventTapLocation, CGEventTapOptions,
        CGEventTapPlacement, CGEventType,
    };
    use std::ffi::c_void;
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
    use std::sync::mpsc::{channel, RecvTimeoutError, Sender};
    use std::sync::Arc;
    use std::time::Duration;
    use tauri::AppHandle;

    // `CGEventTapEnable` is a public CoreGraphics symbol; the `core-graphics`
    // crate only wraps it behind `CGEventTap::enable(&self)`, which we can't
    // reach from inside the callback. Declare it ourselves to re-arm a tap that
    // macOS disabled (e.g. `kCGEventTapDisabledByUserInput`).
    extern "C" {
        fn CGEventTapEnable(tap: *const c_void, enable: bool);
    }

    /// Commands from the tap callback to the worker thread.
    enum FnCmd {
        /// `fn` went down — arm a debounced start.
        Start,
        /// `fn` came back up cleanly — finish the dictation.
        Stop,
        /// `fn` was used as a modifier in a combo — back out, discard audio.
        Cancel,
    }

    /// How long to wait after `fn` goes down before actually opening the mic.
    /// A key combo (fn+←) resolves within a couple ms and cancels the pending
    /// start, so the mic never opens for combos. Genuine dictations (a held
    /// `fn`) only lose this sliver of leading silence — imperceptible.
    const START_DEBOUNCE: Duration = Duration::from_millis(60);

    pub fn start_fn_tap(app: AppHandle) -> Result<(), String> {
        let (tx, rx) = channel::<FnCmd>();

        // Worker: performs the (possibly blocking) audio work off the tap thread.
        std::thread::Builder::new()
            .name("parrot-fn-worker".into())
            .spawn(move || {
                let mut pending_start = false;
                let mut recording = false;
                loop {
                    let msg = if pending_start {
                        match rx.recv_timeout(START_DEBOUNCE) {
                            Ok(m) => m,
                            Err(RecvTimeoutError::Timeout) => {
                                // No combo interrupted us: this is a real hold.
                                pending_start = false;
                                begin_recording(&app);
                                recording = true;
                                continue;
                            }
                            Err(RecvTimeoutError::Disconnected) => return,
                        }
                    } else {
                        match rx.recv() {
                            Ok(m) => m,
                            Err(_) => return,
                        }
                    };
                    match msg {
                        FnCmd::Start => {
                            if !recording {
                                pending_start = true;
                            }
                        }
                        FnCmd::Stop => {
                            if pending_start {
                                // Released before the debounce elapsed — a tap
                                // too short to be dictation. Do nothing.
                                pending_start = false;
                            } else if recording {
                                end_recording(&app);
                                recording = false;
                            }
                        }
                        FnCmd::Cancel => {
                            if pending_start {
                                pending_start = false;
                            } else if recording {
                                cancel_recording(&app);
                                recording = false;
                            }
                        }
                    }
                }
            })
            .map_err(|e| format!("Failed to spawn fn-worker thread: {}", e))?;

        // Tap: owns the run loop; its callback only ever reads a flag and sends.
        std::thread::Builder::new()
            .name("parrot-fn-tap".into())
            .spawn(move || run_tap(tx))
            .map_err(|e| format!("Failed to spawn fn-tap thread: {}", e))?;

        Ok(())
    }

    fn run_tap(tx: Sender<FnCmd>) {
        let fn_down = Arc::new(AtomicBool::new(false));
        let combo = Arc::new(AtomicBool::new(false));
        // Raw `CFMachPortRef` (as usize) so the callback can re-enable the tap
        // without a borrow cycle. Populated right after the tap is created.
        let port = Arc::new(AtomicUsize::new(0));

        let cb_fn_down = fn_down.clone();
        let cb_combo = combo.clone();
        let cb_port = port.clone();

        let tap = CGEventTap::new(
            // Session level + tail placement: we observe, we don't sit at the
            // front of the HID stream, so we never delay other apps' input.
            CGEventTapLocation::Session,
            CGEventTapPlacement::TailAppendEventTap,
            CGEventTapOptions::ListenOnly,
            vec![CGEventType::FlagsChanged, CGEventType::KeyDown],
            move |_proxy, evt_type, event: &CGEvent| {
                match evt_type {
                    // macOS disabled us (slow callback once, or user input):
                    // re-arm so the hotkey doesn't silently die.
                    CGEventType::TapDisabledByTimeout
                    | CGEventType::TapDisabledByUserInput => {
                        let p = cb_port.load(Ordering::SeqCst);
                        if p != 0 {
                            unsafe { CGEventTapEnable(p as *const c_void, true) };
                        }
                    }
                    CGEventType::FlagsChanged => {
                        let now = event
                            .get_flags()
                            .contains(CGEventFlags::CGEventFlagSecondaryFn);
                        let was = cb_fn_down.swap(now, Ordering::SeqCst);
                        if now && !was {
                            cb_combo.store(false, Ordering::SeqCst);
                            let _ = tx.send(FnCmd::Start);
                        } else if !now && was {
                            // Only Stop if `fn` was *not* consumed by a combo.
                            if !cb_combo.swap(false, Ordering::SeqCst) {
                                let _ = tx.send(FnCmd::Stop);
                            }
                        }
                    }
                    CGEventType::KeyDown => {
                        // A real key pressed while `fn` is held → it's a combo
                        // (fn+←, fn+Delete, …), not dictation. Cancel once.
                        if cb_fn_down.load(Ordering::SeqCst)
                            && !cb_combo.swap(true, Ordering::SeqCst)
                        {
                            let _ = tx.send(FnCmd::Cancel);
                        }
                    }
                    _ => {}
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

        // Hand the callback a way to re-enable this exact tap.
        port.store(tap.mach_port.as_concrete_TypeRef() as usize, Ordering::SeqCst);

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
    }
}
