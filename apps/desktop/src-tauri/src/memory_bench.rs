//! Opt-in workloads in the real Tauri app. Never compiled into ordinary builds.
//! Synthetic audio, separate database/attachments, no microphone/hotkey/paste.

use crate::{
    db, local_setup, streaming, transcription, Database, RecorderState, SharedCleanupEngine,
    SharedLocalEngine,
};
use anyhow::{Context, Result};
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Listener, Manager};

#[derive(Clone, Deserialize)]
pub(crate) struct Config {
    pub events_path: PathBuf,
    pub stt_engine: String,
    pub stt_model: PathBuf,
    pub cleanup_model: PathBuf,
    pub switch_stt_engine: Option<String>,
    pub switch_stt_model: Option<PathBuf>,
    pub switch_cleanup_model: Option<PathBuf>,
    pub repeats: usize,
    pub idle_seconds: u64,
    pub post_idle_seconds: u64,
    pub long_import_seconds: u32,
    #[serde(default)]
    pub cleanup_lifecycle_checks: bool,
    #[serde(default)]
    pub speech_lifecycle_checks: bool,
    #[serde(default)]
    pub stt_release_before_cleanup: bool,
    /// Diagnostic-only provider override, applied before any model is loaded.
    #[serde(default)]
    pub parakeet_accelerator: Option<String>,
}

pub(crate) fn is_active() -> bool {
    std::env::var_os("PARROT_MEMORY_BENCHMARK_CONFIG").is_some()
}

pub(crate) fn data_dir() -> Option<PathBuf> {
    std::env::var_os("PARROT_MEMORY_BENCHMARK_CONFIG").map(|p| {
        PathBuf::from(p)
            .parent()
            .expect("benchmark config must have a parent")
            .join("app-data")
    })
}

impl Config {
    pub fn from_env() -> Result<Option<Self>> {
        let Some(path) = std::env::var_os("PARROT_MEMORY_BENCHMARK_CONFIG") else {
            return Ok(None);
        };
        let config: Self = serde_json::from_slice(&std::fs::read(path)?)?;
        anyhow::ensure!(
            (1..=100).contains(&config.repeats),
            "repeats must be 1..100"
        );
        anyhow::ensure!(
            (1..=300).contains(&config.idle_seconds),
            "idle_seconds must be 1..300"
        );
        anyhow::ensure!(
            (1..=600).contains(&config.post_idle_seconds),
            "post_idle_seconds must be 1..600"
        );
        anyhow::ensure!(
            (30..=600).contains(&config.long_import_seconds),
            "long_import_seconds must be 30..600"
        );
        for path in [
            Some(&config.stt_model),
            Some(&config.cleanup_model),
            config.switch_stt_model.as_ref(),
            config.switch_cleanup_model.as_ref(),
        ]
        .into_iter()
        .flatten()
        {
            anyhow::ensure!(path.exists(), "model does not exist: {}", path.display());
        }
        anyhow::ensure!(
            matches!(config.stt_engine.as_str(), "whisper" | "parakeet"),
            "invalid stt_engine"
        );
        anyhow::ensure!(
            matches!(
                config.parakeet_accelerator.as_deref(),
                None | Some("auto" | "cpu")
            ),
            "parakeet_accelerator must be auto or cpu"
        );
        if config.switch_stt_model.is_some() {
            anyhow::ensure!(
                matches!(
                    config.switch_stt_engine.as_deref(),
                    Some("whisper" | "parakeet")
                ),
                "switch_stt_model needs switch_stt_engine"
            );
        }
        if config.speech_lifecycle_checks {
            anyhow::ensure!(
                config.idle_seconds + config.post_idle_seconds >= 65,
                "speech lifecycle checks need at least 65 seconds of combined post-import idle"
            );
        }
        Ok(Some(config))
    }

    pub fn prepare_database(&self, db: &Database) -> Result<()> {
        db.set_local_user(&db::LocalUser {
            name: "Memory benchmark".into(),
            email: String::new(),
            onboarding_completed: true,
        })?;
        db.set_setting("stt_engine", &self.stt_engine)?;
        db.set_setting(
            "stt_model",
            &self.stt_model.file_name().unwrap().to_string_lossy(),
        )?;
        db.set_setting("parakeet_model_path", &self.stt_model.to_string_lossy())?;
        db.set_setting("stt_language", "auto")?;
        db.set_setting("cleanup_backend", "builtin")?;
        db.set_setting("cleanup_model_path", &self.cleanup_model.to_string_lossy())?;
        db.set_setting("cleanup_mode", "blocking")?;
        db.set_setting("stt_idle_seconds", "60")?;
        db.set_setting(
            "stt_release_before_cleanup",
            if self.stt_release_before_cleanup {
                "true"
            } else {
                "false"
            },
        )?;
        db.set_setting("save_audio", "false")?;
        db.set_local_setup_config(&local_setup::LocalSetupConfig {
            whisper_model_path: self.stt_model.to_string_lossy().into_owned(),
            ollama_server_port: 11434,
            ollama_model: self
                .cleanup_model
                .file_name()
                .unwrap()
                .to_string_lossy()
                .into_owned(),
            setup_completed: true,
            setup_version: local_setup::CURRENT_SETUP_VERSION.into(),
        })?;
        Ok(())
    }
}

#[derive(Clone)]
struct Events(Arc<Mutex<File>>);

impl Events {
    fn write(&self, kind: &str, scenario: &str, details: Value) {
        let event = json!({"kind": kind, "scenario": scenario,
            "time_ms": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis(),
            "details": details});
        let mut file = self.0.lock().unwrap();
        writeln!(file, "{event}").expect("write benchmark event");
        file.flush().expect("flush benchmark event");
    }

    fn result(&self, scenario: &str, start: Instant, raw: &str, cleaned: &str, expected: &[&str]) {
        let output = if cleaned.is_empty() { raw } else { cleaned };
        let quality_ok = expected
            .iter()
            .all(|w| raw.to_lowercase().contains(w) && output.to_lowercase().contains(w));
        let event = json!({"kind": "result", "scenario": scenario,
            "time_ms": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis(),
            "latency_ms": start.elapsed().as_secs_f64() * 1000.0,
            "quality_ok": quality_ok, "expected_words": expected,
            "raw_text": raw, "cleaned_text": cleaned,
            "cleanup_unchanged": raw.trim() == output.trim()});
        let mut file = self.0.lock().unwrap();
        writeln!(file, "{event}").unwrap();
        file.flush().unwrap();
    }

    async fn idle(&self, scenario: &str, seconds: u64, app: &AppHandle) {
        self.write("begin", scenario, json!({"seconds": seconds}));
        tokio::time::sleep(Duration::from_secs(seconds)).await;
        self.write(
            "end",
            scenario,
            json!({
                "stt_loaded": app.state::<SharedLocalEngine>().models.is_loaded(),
                "speech_lifecycle": app.state::<SharedLocalEngine>().models.status(),
                "cleanup_loaded": app.state::<SharedCleanupEngine>().is_loaded(),
            "cleanup_lifecycle": app.state::<SharedCleanupEngine>().status(),
            }),
        );
    }
}

static PARAKEET_ACCELERATOR: OnceLock<transcribe_rs::OrtAccelerator> = OnceLock::new();

pub(crate) fn parakeet_accelerator_override() -> Option<transcribe_rs::OrtAccelerator> {
    PARAKEET_ACCELERATOR.get().copied()
}

pub(crate) fn start(app: AppHandle, config: Config) {
    if let Some(accelerator) = &config.parakeet_accelerator {
        PARAKEET_ACCELERATOR
            .set(accelerator.parse().expect("validated accelerator"))
            .expect("one benchmark per process");
    }
    let events = Events(Arc::new(Mutex::new(
        File::create(&config.events_path).expect("create events"),
    )));
    tauri::async_runtime::spawn(async move {
        let result = workload(&app, &config, &events).await;
        if let Err(error) = &result {
            events.write("error", "failed", json!({"error": format!("{error:#}")}));
            eprintln!("Memory benchmark failed: {error:#}");
        }
        // Reap the sidecar before exit, including errors. Release the STT Arc.
        app.state::<SharedCleanupEngine>().configure(None, None);
        app.state::<SharedLocalEngine>()
            .models
            .configure(None, None);
        app.exit(if result.is_ok() { 0 } else { 1 });
    });
}

fn fixture(french: bool) -> (Vec<f32>, u32, &'static [&'static str]) {
    let (wav, words): (&[u8], &[&str]) = if french {
        (
            include_bytes!("../tests/fixtures/transcription/french.wav"),
            &["bonjour", "réserver", "table", "demain", "soir"],
        )
    } else {
        (
            include_bytes!("../tests/fixtures/transcription/english.wav"),
            &["blue", "notebook", "kitchen", "table"],
        )
    };
    let (pcm, rate) = transcription::decode_audio_bytes(wav).unwrap();
    (pcm, rate, words)
}

async fn dictation(app: &AppHandle, events: &Events, scenario: &str, french: bool) -> Result<()> {
    let (samples, rate, expected) = fixture(french);
    let recorder = app.state::<RecorderState>();
    let duration_ms = (samples.len() as u64 * 1000) / rate as u64;
    recorder.last_audio.store(crate::RecordedSamples { samples, sample_rate: rate }, duration_ms);
    let start = Instant::now();
    events.write(
        "begin",
        scenario,
        json!({"language": if french {"fr"} else {"en"}}),
    );
    let result = crate::transcribe_last(app.state(), app.state(), app.state(), app.clone())
        .await
        .map_err(anyhow::Error::msg)?;
    events.result(
        scenario,
        start,
        &result.raw_text,
        &result.cleaned_text,
        expected,
    );
    if app
        .state::<Database>()
        .get_setting("stt_release_before_cleanup")?
        .as_deref()
        == Some("true")
        && app
            .state::<Database>()
            .get_setting("cleanup_mode")?
            .as_deref()
            == Some("blocking")
    {
        anyhow::ensure!(
            !app.state::<SharedLocalEngine>().models.is_loaded()
                && !app.state::<SharedCleanupEngine>().is_loaded(),
            "sequential dictation retained a model after cleanup"
        );
    }
    events.write(
        "end",
        scenario,
        json!({"latency_ms": start.elapsed().as_secs_f64() * 1000.0,
            "stt_loaded": app.state::<SharedLocalEngine>().models.is_loaded(),
            "cleanup_loaded": app.state::<SharedCleanupEngine>().is_loaded()}),
    );
    Ok(())
}

async fn switch_models(
    app: &AppHandle,
    engine: &str,
    stt: &Path,
    cleanup_model: &Path,
) -> Result<()> {
    let db = app.state::<Database>();
    db.set_setting("stt_engine", engine)?;
    db.set_setting("stt_model", &stt.file_name().unwrap().to_string_lossy())?;
    if engine == "parakeet" {
        db.set_setting("parakeet_model_path", &stt.to_string_lossy())?;
    } else {
        let mut config = db.get_local_setup_config()?;
        config.whisper_model_path = stt.to_string_lossy().into_owned();
        db.set_local_setup_config(&config)?;
    }
    crate::configure_speech(&db, app.state::<SharedLocalEngine>().inner());
    app.state::<Database>()
        .set_setting("cleanup_model_path", &cleanup_model.to_string_lossy())?;
    crate::configure_cleanup(
        &app.state::<Database>(),
        app.state::<SharedCleanupEngine>().inner(),
    );
    Ok(())
}

async fn workload(app: &AppHandle, config: &Config, events: &Events) -> Result<()> {
    let started = Instant::now();
    events.write(
        "begin",
        "startup",
        json!({"build": if cfg!(debug_assertions) {"debug"} else {"release"},
            "cleanup_loading": "on_demand", "cleanup_idle_seconds": 60, "speech_loading": "on_demand", "speech_idle_seconds": 60,
            "cleanup_lifecycle_checks": config.cleanup_lifecycle_checks,
            "speech_lifecycle_checks": config.speech_lifecycle_checks,
            "parakeet_accelerator": transcription::parakeet_accelerator().to_string(),
            "stt_release_before_cleanup": config.stt_release_before_cleanup}),
    );
    let db = app.state::<Database>();
    crate::configure_speech(&db, app.state::<SharedLocalEngine>().inner());
    crate::configure_cleanup(&db, app.state::<SharedCleanupEngine>().inner());
    events.write(
        "end",
        "startup",
        json!({"configuration_latency_ms": started.elapsed().as_secs_f64() * 1000.0}),
    );
    events.idle("ready_idle", config.idle_seconds, app).await;
    anyhow::ensure!(
        !app.state::<SharedCleanupEngine>().is_loaded(),
        "startup must leave cleanup unloaded"
    );
    anyhow::ensure!(
        !app.state::<SharedLocalEngine>().models.is_loaded(),
        "startup must leave speech unloaded"
    );
    if config.cleanup_lifecycle_checks {
        db.set_setting("cleanup_mode", "off")?;
        crate::configure_cleanup(&db, app.state::<SharedCleanupEngine>().inner());
        events.idle("disabled_idle", config.idle_seconds, app).await;
        dictation(app, events, "disabled_dictation", false).await?;
        anyhow::ensure!(
            !app.state::<SharedCleanupEngine>().is_loaded(),
            "disabled cleanup loaded a sidecar"
        );
        db.set_setting("cleanup_mode", "blocking")?;
        crate::configure_cleanup(&db, app.state::<SharedCleanupEngine>().inner());
    }

    // Instrument the production dictation stages, keeping the entire pipeline.
    let phase = Arc::new(Mutex::new(String::from("cold")));
    for (event, suffix) in [
        ("transcription-started", "stt"),
        ("cleanup-started", "cleanup"),
    ] {
        let events = events.clone();
        let phase = phase.clone();
        app.listen(event, move |_| {
            events.write(
                "begin",
                &format!("{}_{}", phase.lock().unwrap(), suffix),
                json!({}),
            );
        });
    }

    dictation(app, events, "cold_dictation", false).await?;
    events
        .idle("after_cold_idle", config.idle_seconds, app)
        .await;

    events.write(
        "begin",
        "capture_previews",
        json!({"source": "synthetic English PCM, real-time replay"}),
    );
    let preview_count = Arc::new(Mutex::new(0usize));
    let count = preview_count.clone();
    let preview_events = events.clone();
    let preview_start = Instant::now();
    let listener = app.listen("streaming-partial", move |event| {
        *count.lock().unwrap() += 1;
        preview_events.write(
            "preview",
            "capture_previews",
            json!({
                "elapsed_ms": preview_start.elapsed().as_secs_f64() * 1000.0,
                "payload": serde_json::from_str::<Value>(event.payload()).ok(),
            }),
        );
    });
    let (samples, rate, _) = fixture(false);
    app.state::<RecorderState>()
        .recorder
        .lock()
        .unwrap()
        .begin_fixture(rate);
    let generation = app
        .state::<Arc<streaming::StreamingCoordinator>>()
        .next_generation();
    streaming::start_partial_loop(app.clone(), generation);
    // A longer hold gives warmed engines time to emit multiple real previews.
    let capture_samples = samples.repeat(4);
    for chunk in capture_samples.chunks(rate as usize / 10) {
        app.state::<RecorderState>()
            .recorder
            .lock()
            .unwrap()
            .push_fixture(chunk);
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    tokio::time::sleep(Duration::from_secs(2)).await;
    app.state::<Arc<streaming::StreamingCoordinator>>()
        .next_generation();
    app.state::<RecorderState>()
        .recorder
        .lock()
        .unwrap()
        .stop()?;
    app.unlisten(listener);
    events.write(
        "end",
        "capture_previews",
        json!({"previews": *preview_count.lock().unwrap()}),
    );
    // A workload with no emitted preview must not silently pass as coverage.
    events.result(
        "preview_coverage",
        preview_start,
        if *preview_count.lock().unwrap() > 0 {
            "preview"
        } else {
            ""
        },
        "",
        &["preview"],
    );

    for i in 1..=config.repeats {
        *phase.lock().unwrap() = format!("warm_{i:02}");
        dictation(app, events, &format!("warm_{i:02}_dictation"), i % 2 == 0).await?;
        events.idle(&format!("warm_{i:02}_idle"), 1, app).await;
    }
    events
        .idle("after_repeats_idle", config.idle_seconds, app)
        .await;

    if config.cleanup_lifecycle_checks {
        // Use the production default timeout. Measure a warm sidecar and its
        // absence in the same app process, then verify a fresh demand load.
        events.idle("cleanup_release_wait", 65, app).await;
        anyhow::ensure!(
            !app.state::<SharedCleanupEngine>().is_loaded(),
            "cleanup did not release after idle"
        );
        events
            .idle("cleanup_released_idle", config.idle_seconds, app)
            .await;
        *phase.lock().unwrap() = "reload".into();
        dictation(app, events, "reload_dictation", true).await?;
        anyhow::ensure!(
            app.state::<SharedCleanupEngine>().is_loaded(),
            "first cleanup after idle did not load"
        );
        events
            .idle("cleanup_reloaded_idle", config.idle_seconds, app)
            .await;

        // A failed load must return a usable original transcript promptly.
        db.set_setting(
            "cleanup_model_path",
            "/nonexistent/parrot-invalid-cleanup-model.gguf",
        )?;
        crate::configure_cleanup(&db, app.state::<SharedCleanupEngine>().inner());
        *phase.lock().unwrap() = "failure".into();
        dictation(app, events, "failed_load_dictation", false).await?;
        anyhow::ensure!(
            app.state::<SharedCleanupEngine>().status().state == "failed",
            "load failure was not reported"
        );
        db.set_setting(
            "cleanup_model_path",
            &config.cleanup_model.to_string_lossy(),
        )?;
        crate::configure_cleanup(&db, app.state::<SharedCleanupEngine>().inner());
        *phase.lock().unwrap() = "recovery".into();
        dictation(app, events, "recovered_dictation", false).await?;
    }

    if config.switch_stt_model.is_some() || config.switch_cleanup_model.is_some() {
        events.write("begin", "model_switch", json!({}));
        let start = Instant::now();
        switch_models(
            app,
            config
                .switch_stt_engine
                .as_deref()
                .unwrap_or(&config.stt_engine),
            config
                .switch_stt_model
                .as_deref()
                .unwrap_or(&config.stt_model),
            config
                .switch_cleanup_model
                .as_deref()
                .unwrap_or(&config.cleanup_model),
        )
        .await?;
        events.write(
            "end",
            "model_switch",
            json!({"latency_ms": start.elapsed().as_secs_f64() * 1000.0}),
        );
        events.idle("switched_idle", config.idle_seconds, app).await;
        // Return to the baseline pair before the long import.
        events.write("begin", "model_restore", json!({}));
        switch_models(
            app,
            &config.stt_engine,
            &config.stt_model,
            &config.cleanup_model,
        )
        .await?;
        events.write("end", "model_restore", json!({}));
    }

    // Exercise the production file decoder, full-file buffers, STT, history,
    // and attachment copy. Long-file cleanup is off to isolate STT residency;
    // short dictations above measure cleanup separately with quality checks.
    *phase.lock().unwrap() = "long_import".into();
    db.set_setting("cleanup_mode", "off")?;
    crate::configure_cleanup(&db, app.state::<SharedCleanupEngine>().inner());
    events.write(
        "begin",
        "long_import",
        json!({"seconds": config.long_import_seconds, "cleanup": "off"}),
    );
    let start = Instant::now();
    let (pcm, rate) = transcription::decode_audio_bytes(include_bytes!(
        "../tests/fixtures/transcription/long-import.wav"
    ))?;
    let expected: &[&str] = &[
        "notebook",
        "garden",
        "umbrella",
        "ticket",
        "museum",
        "bicycle",
        "telescope",
        "saturday",
        "atlas",
        "camera",
        "suitcase",
        "waterfall",
    ];
    let repeats = (config.long_import_seconds as usize * rate as usize).div_ceil(pcm.len());
    let mut samples = pcm.repeat(repeats);
    // Always include the whole reference once. Longer runs repeat and trim it.
    samples.truncate((config.long_import_seconds as usize * rate as usize).max(pcm.len()));
    let audio_seconds = samples.len() as f64 / rate as f64;
    let audio = crate::RecordedSamples {
        samples,
        sample_rate: rate,
    };
    let wav = audio.encode_wav()?;
    drop(audio);
    let path = data_dir()
        .context("benchmark data directory")?
        .join("long-import.wav");
    std::fs::write(&path, &wav)?;
    drop(wav);
    let result = crate::transcribe_audio_file_path(
        path.to_string_lossy().into_owned(),
        app.state(),
        app.state(),
        app.clone(),
    )
    .await
    .map_err(anyhow::Error::msg)?;
    events.result(
        "long_import",
        start,
        &result.raw_text,
        &result.cleaned_text,
        expected,
    );
    events.write("end", "long_import", json!({"repetitions": repeats,
        "audio_seconds": audio_seconds,
        "recognized_notebook_occurrences": result.raw_text.to_lowercase().matches("notebook").count()}));
    // Results/encoded buffers should be gone during post-idle measurements.
    drop(result);
    db.set_setting("cleanup_mode", "blocking")?;
    crate::configure_cleanup(&db, app.state::<SharedCleanupEngine>().inner());
    *phase.lock().unwrap() = "after_import".into();
    events
        .idle("post_import_idle", config.idle_seconds, app)
        .await;
    events
        .idle("post_idle", config.post_idle_seconds, app)
        .await;
    if config.speech_lifecycle_checks {
        anyhow::ensure!(
            !app.state::<SharedLocalEngine>().models.is_loaded(),
            "speech model did not release after post-import idle"
        );
        events
            .idle("speech_released_idle", config.idle_seconds, app)
            .await;
        *phase.lock().unwrap() = "speech_reload".into();
        dictation(app, events, "speech_reload_dictation", true).await?;
        events
            .idle("speech_reloaded_idle", config.idle_seconds, app)
            .await;
    }
    events.write("begin", "complete", json!({}));
    events.write(
        "end",
        "complete",
        json!({"total_ms": started.elapsed().as_secs_f64() * 1000.0}),
    );
    Ok(())
}
