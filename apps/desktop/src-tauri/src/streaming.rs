//! Interim streaming display: re-transcribe the growing capture buffer while
//! the user is still holding the hotkey. Works with any batch engine
//! (Whisper / Parakeet). True streaming engines (Moonshine / Kyutai) can
//! replace this path later without changing the HUD event contract.

#[cfg(test)]
use crate::transcription::LocalEngine;
use crate::transcription::TranscribeOpts;
use crate::RecorderState;
use crate::SharedLocalEngine;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

/// Bumped on each recording end (and start) so in-flight partial jobs drop.
pub struct StreamingCoordinator {
    generation: AtomicU64,
}

impl StreamingCoordinator {
    pub fn new() -> Self {
        Self {
            generation: AtomicU64::new(0),
        }
    }

    pub fn next_generation(&self) -> u64 {
        self.generation.fetch_add(1, Ordering::SeqCst) + 1
    }

    pub fn current(&self) -> u64 {
        self.generation.load(Ordering::SeqCst)
    }
}

/// Minimum audio before we bother the STT engine (~0.6s @ 16 kHz-ish; we use
/// the device rate so scale accordingly).
const MIN_PARTIAL_SECS: f32 = 0.7;
/// How often to attempt a partial (wall clock).
const PARTIAL_INTERVAL: Duration = Duration::from_millis(900);
/// Don't re-run if the buffer grew by less than this many seconds.
const MIN_GROWTH_SECS: f32 = 0.35;
/// Cap audio sent for partials (keep latency bounded on long holds).
const MAX_PARTIAL_SECS: u32 = 20;
/// RMS energy gate — skip near-silent buffers.
const MIN_RMS: f32 = 0.008;

/// Start the partial-transcription loop for this recording generation.
pub fn start_partial_loop(app: AppHandle, generation: u64) {
    let speech = app.state::<SharedLocalEngine>();
    crate::configure_speech(&app.state::<crate::db::Database>(), speech.inner());
    // In low-memory mode, recording only captures audio. Load speech after
    // capture ends; enabling previews again takes effect on the next capture.
    if !speech.previews_enabled() {
        return;
    }
    speech.prewarm(
        app.state::<Arc<StreamingCoordinator>>().inner().clone(),
        generation,
    );
    tauri::async_runtime::spawn(async move {
        let mut last_len: usize = 0;
        // First partial a bit sooner so short holds still get something.
        tokio::time::sleep(Duration::from_millis(550)).await;

        loop {
            let coord = app.state::<Arc<StreamingCoordinator>>();
            if coord.current() != generation || !app.state::<SharedLocalEngine>().previews_enabled()
            {
                break;
            }

            let snapshot = {
                let state = app.state::<RecorderState>();
                let rec = state.recorder.lock().unwrap();
                if !rec.is_recording() {
                    break;
                }
                rec.snapshot_tail(MAX_PARTIAL_SECS)
            };

            let rate = snapshot.audio.sample_rate as f32;
            let min_samples = (MIN_PARTIAL_SECS * rate) as usize;
            let growth = (MIN_GROWTH_SECS * rate) as usize;

            if snapshot.total_samples >= min_samples
                && snapshot.total_samples.saturating_sub(last_len) >= growth
            {
                let crate::audio::RecordedSamples {
                    samples,
                    sample_rate,
                } = snapshot.audio;

                if rms(&samples) >= MIN_RMS {
                    last_len = snapshot.total_samples;
                    let opts =
                        match TranscribeOpts::from_database(&app.state::<crate::db::Database>()) {
                            Ok(opts) => opts,
                            Err(error) => {
                                eprintln!("Preview preferences unavailable: {error:#}");
                                continue;
                            }
                        };
                    let text = app
                        .state::<SharedLocalEngine>()
                        .transcribe_preview(
                            samples,
                            sample_rate,
                            opts,
                            app.state::<Arc<StreamingCoordinator>>().inner().clone(),
                            generation,
                        )
                        .await;
                    if app.state::<Arc<StreamingCoordinator>>().current() != generation
                        || !app.state::<SharedLocalEngine>().previews_enabled()
                    {
                        break;
                    }
                    match text {
                        Ok(Some(text)) if !text.trim().is_empty() => {
                            let _ = app.emit(
                                "streaming-partial",
                                serde_json::json!({"text": text, "generation": generation}),
                            );
                        }
                        Err(error) => eprintln!("streaming partial failed: {error:#}"),
                        _ => {}
                    }
                }
            }

            tokio::time::sleep(PARTIAL_INTERVAL).await;
        }
    });
}

#[cfg(test)]
async fn transcribe_partial(
    engine: Arc<LocalEngine>,
    samples: Vec<f32>,
    sample_rate: u32,
    db: &crate::db::Database,
) -> anyhow::Result<String> {
    engine
        .transcribe_samples(&samples, sample_rate, TranscribeOpts::from_database(db)?)
        .await
}

fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f32 = samples.iter().map(|s| s * s).sum();
    (sum / samples.len() as f32).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::transcription::{decode_audio_bytes, transcribe_audio, LocalWhisperProvider};

    #[test]
    fn new_generations_invalidate_ended_recording_previews() {
        let coordinator = StreamingCoordinator::new();
        let recording = coordinator.next_generation();
        assert_eq!(coordinator.current(), recording);
        coordinator.next_generation(); // End or cancel recording.
        assert_ne!(coordinator.current(), recording);
        let next_recording = coordinator.next_generation();
        assert_ne!(coordinator.current(), recording);
        assert_eq!(coordinator.current(), next_recording);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    #[ignore = "needs PARROT_TEST_STT_MODEL pointing to Whisper or Parakeet"]
    async fn bounded_previews_keep_recent_english_and_french_speech() {
        let path = std::path::PathBuf::from(std::env::var("PARROT_TEST_STT_MODEL").unwrap());
        let engine = Arc::new(
            crate::load_engine_blocking(
                if path.is_dir() { "parakeet" } else { "whisper" },
                &path,
                "bounded preview test",
            )
            .unwrap(),
        );
        let db = crate::db::Database::in_memory().unwrap();
        for (wav, expected) in [
            (
                include_bytes!("../tests/fixtures/transcription/english.wav").as_slice(),
                &["blue", "notebook", "kitchen", "table"][..],
            ),
            (
                include_bytes!("../tests/fixtures/transcription/french.wav").as_slice(),
                &["bonjour", "réserver", "table", "demain", "soir"][..],
            ),
        ] {
            let (samples, rate) = decode_audio_bytes(wav).unwrap();
            let mut recorder = crate::audio::AudioRecorder::new().unwrap();
            recorder.begin_fixture(rate);
            recorder.push_fixture(&vec![0.0; rate as usize * 120]);
            recorder.push_fixture(&samples);
            let preview = recorder.snapshot_tail(MAX_PARTIAL_SECS);
            assert_eq!(preview.total_samples, rate as usize * 120 + samples.len());
            assert_eq!(
                preview.audio.samples.len(),
                rate as usize * MAX_PARTIAL_SECS as usize
            );
            let text = transcribe_partial(
                engine.clone(),
                preview.audio.samples,
                preview.audio.sample_rate,
                &db,
            )
            .await
            .unwrap();
            eprintln!("bounded preview: {text}");
            for word in expected {
                assert!(text.to_lowercase().contains(word), "missing {word}: {text}");
            }
            let final_audio = recorder.stop().unwrap();
            assert_eq!(
                final_audio.samples.len(),
                rate as usize * 120 + samples.len()
            );
            assert_eq!(&final_audio.samples[rate as usize * 120..], samples);
        }
    }

    /// Run with PARROT_TEST_WHISPER_MODEL set to a multilingual Whisper model.
    #[tokio::test]
    #[ignore = "requires a local multilingual Whisper model"]
    async fn multilingual_preview_inference() {
        let model = std::env::var("PARROT_TEST_WHISPER_MODEL")
            .expect("set PARROT_TEST_WHISPER_MODEL to a multilingual Whisper model");
        assert!(!model.contains(".en."), "use a multilingual model");
        let engine = Arc::new(LocalEngine::Whisper(Arc::new(
            LocalWhisperProvider::load(std::path::Path::new(&model)).unwrap(),
        )));
        let (samples, rate) =
            decode_audio_bytes(include_bytes!("../tests/fixtures/transcription/french.wav"))
                .unwrap();
        let db = crate::db::Database::in_memory().unwrap();
        db.update_profile(
            r#"["réserver", {"term":"Acme", "context":"company name"}]"#,
            "",
            "",
        )
        .unwrap();
        for language in [
            None,
            Some("auto"),
            Some(" AuTo "),
            Some(""),
            Some("  "),
            Some("fr"),
        ] {
            if let Some(language) = language {
                db.set_setting("stt_language", language).unwrap();
            }
            let opts = TranscribeOpts::from_database(&db).unwrap();
            assert_eq!(
                opts.initial_prompt.as_deref(),
                Some("Vocabulary hints: réserver.")
            );
            let final_text = transcribe_audio(&samples, rate, Some(engine.as_ref()), opts)
                .await
                .unwrap();
            let preview = transcribe_partial(engine.clone(), samples.clone(), rate, &db)
                .await
                .unwrap();
            eprintln!("language={language:?}: French preview: {preview:?}; final: {final_text:?}");
            for (path, text) in [("preview", preview), ("final", final_text)] {
                let lower = text.to_lowercase();
                for word in ["bonjour", "voudrais", "réserver", "table", "demain", "soir"] {
                    assert!(
                        lower.contains(word),
                        "language={language:?}, {path} lost French word {word:?}: {text:?}"
                    );
                }
            }
        }
    }
}
