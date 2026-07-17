//! Interim streaming display: re-transcribe the growing capture buffer while
//! the user is still holding the hotkey. Works with any batch engine
//! (Whisper / Parakeet). True streaming engines (Moonshine / Kyutai) can
//! replace this path later without changing the HUD event contract.

use crate::transcription::{LocalEngine, TranscribeOpts};
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
const MAX_PARTIAL_SECS: f32 = 20.0;
/// RMS energy gate — skip near-silent buffers.
const MIN_RMS: f32 = 0.008;

/// Start the partial-transcription loop for this recording generation.
pub fn start_partial_loop(app: AppHandle, generation: u64) {
    tauri::async_runtime::spawn(async move {
        let mut last_len: usize = 0;
        // First partial a bit sooner so short holds still get something.
        tokio::time::sleep(Duration::from_millis(550)).await;

        loop {
            let coord = app.state::<Arc<StreamingCoordinator>>();
            if coord.current() != generation {
                break;
            }

            let snapshot = {
                let state = app.state::<RecorderState>();
                let rec = state.recorder.lock().unwrap();
                if !rec.is_recording() {
                    break;
                }
                rec.snapshot()
            };

            let rate = snapshot.sample_rate.max(1) as f32;
            let min_samples = (MIN_PARTIAL_SECS * rate) as usize;
            let growth = (MIN_GROWTH_SECS * rate) as usize;
            let max_samples = (MAX_PARTIAL_SECS * rate) as usize;

            if snapshot.samples.len() >= min_samples
                && snapshot.samples.len().saturating_sub(last_len) >= growth
            {
                // Use the tail of long utterances for partial speed.
                let (samples, sample_rate) = if snapshot.samples.len() > max_samples {
                    let start = snapshot.samples.len() - max_samples;
                    (
                        snapshot.samples[start..].to_vec(),
                        snapshot.sample_rate,
                    )
                } else {
                    (snapshot.samples.clone(), snapshot.sample_rate)
                };

                if rms(&samples) >= MIN_RMS {
                    last_len = snapshot.samples.len();
                    let engine_slot = app.state::<SharedLocalEngine>();
                    let engine = engine_slot.read().await.clone();
                    if let Some(engine) = engine {
                        // Engines already run inference on blocking pools.
                        let text =
                            transcribe_partial(engine, samples, sample_rate).await;

                        if app.state::<Arc<StreamingCoordinator>>().current() != generation {
                            break;
                        }

                        match text {
                            Ok(t) if !t.trim().is_empty() => {
                                let _ = app.emit(
                                    "streaming-partial",
                                    serde_json::json!({
                                        "text": t,
                                        "generation": generation,
                                    }),
                                );
                            }
                            Err(e) => {
                                eprintln!("streaming partial failed: {e}");
                            }
                            _ => {}
                        }
                    }
                }
            }

            tokio::time::sleep(PARTIAL_INTERVAL).await;
        }
    });
}

async fn transcribe_partial(
    engine: Arc<LocalEngine>,
    samples: Vec<f32>,
    sample_rate: u32,
) -> anyhow::Result<String> {
    engine
        .transcribe_samples(
            &samples,
            sample_rate,
            TranscribeOpts {
                language: Some("en".into()),
                initial_prompt: None,
            },
        )
        .await
}

fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f32 = samples.iter().map(|s| s * s).sum();
    (sum / samples.len() as f32).sqrt()
}
