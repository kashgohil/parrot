//! Speech model ownership and scheduling for previews, dictation and imports.
use crate::{
    cleanup_engine::SharedCleanupEngine,
    inference_scheduler::InferenceScheduler,
    model_lifecycle::ModelLifecycle,
    streaming::StreamingCoordinator,
    transcription::{LocalEngine, TranscribeOpts},
};
use anyhow::{Context, Result};
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};
use tokio::sync::OwnedSemaphorePermit;

#[derive(Clone, PartialEq)]
pub struct SpeechTarget {
    pub engine: String,
    pub path: PathBuf,
    pub label: String,
}

pub struct SpeechResult {
    pub text: String,
    pub engine: &'static str,
    pub model: String,
}

pub struct ImportedSpeech {
    pub speech: SpeechResult,
    pub decode: crate::audio_import::DecodeStats,
}

pub struct SpeechEngine {
    pub models: Arc<ModelLifecycle<LocalEngine, SpeechTarget>>,
    scheduler: Arc<InferenceScheduler>,
    cleanup: SharedCleanupEngine,
    sequential: AtomicBool,
}

impl SpeechEngine {
    pub fn new(cleanup: SharedCleanupEngine) -> Arc<Self> {
        Arc::new(Self {
            models: ModelLifecycle::new(|target: SpeechTarget| {
                crate::load_engine_blocking(&target.engine, &target.path, &target.label)
            }),
            scheduler: Arc::new(InferenceScheduler::new()),
            cleanup,
            sequential: AtomicBool::new(false),
        })
    }

    pub fn configure(
        &self,
        target: Option<SpeechTarget>,
        idle: Option<Duration>,
        sequential: bool,
    ) {
        self.sequential.store(sequential, Ordering::SeqCst);
        self.models.configure(target, idle);
    }

    async fn prepare_speech(&self) -> Result<()> {
        if self.sequential.load(Ordering::SeqCst) {
            let started = Instant::now();
            // A cleanup that began before a policy change can still own the
            // sidecar. Wait for it rather than breaking an active completion.
            loop {
                let cleanup = self.cleanup.clone();
                tokio::task::spawn_blocking(move || cleanup.release_unused()).await?;
                if !self.cleanup.is_loaded() && self.cleanup.status().state != "loading" {
                    break;
                }
                anyhow::ensure!(
                    started.elapsed() < Duration::from_secs(180),
                    "cleanup is still busy; speech loading was deferred"
                );
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
        }
        Ok(())
    }

    pub fn prewarm(self: &Arc<Self>, coordinator: Arc<StreamingCoordinator>, generation: u64) {
        let owner = self.clone();
        tauri::async_runtime::spawn(async move {
            let scheduler = owner.scheduler.clone();
            let result = scheduler
                .final_job(async move {
                    if coordinator.current() != generation {
                        return Ok(());
                    }
                    owner.prepare_speech().await?;
                    drop(
                        owner
                            .models
                            .acquire_with_timeout(Duration::from_secs(180))
                            .await?,
                    );
                    Ok(())
                })
                .await;
            if let Err(error) = result {
                eprintln!("Speech warm-up failed: {error:#}");
            }
        });
    }

    #[cfg(test)]
    pub async fn transcribe_final(
        self: &Arc<Self>,
        samples: Vec<f32>,
        rate: u32,
        opts: TranscribeOpts,
    ) -> Result<SpeechResult> {
        self.transcribe_recording(
            Arc::new(crate::audio::RecordedSamples {
                samples,
                sample_rate: rate,
            }),
            opts,
        )
        .await
    }

    pub async fn transcribe_recording(
        self: &Arc<Self>,
        audio: Arc<crate::audio::RecordedSamples>,
        opts: TranscribeOpts,
    ) -> Result<SpeechResult> {
        let owner = self.clone();
        self.scheduler
            .final_job(async move {
                owner.prepare_speech().await?;
                let lease = owner
                    .models
                    .acquire_with_timeout(Duration::from_secs(180))
                    .await?;
                let text = lease.client.transcribe_recording(audio, opts).await?;
                let result = SpeechResult {
                    text,
                    engine: lease.client.engine_id(),
                    model: lease.client.model_label(),
                };
                drop(lease); // No speech handle escapes into cleanup/history/paste.
                Ok(result)
            })
            .await
    }

    pub async fn transcribe_import(
        self: &Arc<Self>,
        source: crate::audio_import::AudioSource,
        opts: TranscribeOpts,
    ) -> Result<ImportedSpeech> {
        let owner = self.clone();
        self.scheduler
            .final_job(async move {
                owner.prepare_speech().await?;
                let lease = owner
                    .models
                    .acquire_with_timeout(Duration::from_secs(180))
                    .await?;
                let imported = lease.client.transcribe_import(source, opts).await?;
                let speech = SpeechResult {
                    text: imported.text,
                    engine: lease.client.engine_id(),
                    model: lease.client.model_label(),
                };
                drop(lease);
                Ok(ImportedSpeech {
                    speech,
                    decode: imported.decode,
                })
            })
            .await
    }

    pub async fn transcribe_preview(
        self: &Arc<Self>,
        samples: Vec<f32>,
        rate: u32,
        opts: TranscribeOpts,
        coordinator: Arc<StreamingCoordinator>,
        generation: u64,
    ) -> Result<Option<String>> {
        let owner = self.clone();
        let result = self
            .scheduler
            .preview_job(async move {
                if coordinator.current() != generation {
                    return Ok(None);
                }
                owner.prepare_speech().await?;
                let lease = owner
                    .models
                    .acquire_with_timeout(Duration::from_secs(180))
                    .await?;
                if coordinator.current() != generation {
                    return Ok(None);
                }
                let text = lease
                    .client
                    .transcribe_recording(
                        Arc::new(crate::audio::RecordedSamples {
                            samples,
                            sample_rate: rate,
                        }),
                        opts,
                    )
                    .await?;
                Ok((coordinator.current() == generation).then_some(text))
            })
            .await?;
        Ok(result.flatten())
    }

    /// Hold the speech scheduler through cleanup only in sequential mode.
    /// This also waits for an already-running preview to finish.
    pub async fn before_cleanup(&self) -> Result<Option<OwnedSemaphorePermit>> {
        if !self.sequential.load(Ordering::SeqCst) {
            return Ok(None);
        }
        let permit = self.scheduler.exclusive().await?;
        let models = self.models.clone();
        tokio::task::spawn_blocking(move || models.release_unused())
            .await
            .context("speech release task failed")?;
        anyhow::ensure!(
            !self.models.is_loaded() && self.models.status().state != "loading",
            "speech model is still in use; cleanup loading was deferred"
        );
        Ok(Some(permit))
    }

    pub async fn after_cleanup(
        &self,
        sequential_permit: &Option<OwnedSemaphorePermit>,
    ) -> Result<()> {
        if sequential_permit.is_some() {
            let cleanup = self.cleanup.clone();
            tokio::task::spawn_blocking(move || cleanup.release_unused()).await?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn obsolete_previews_do_not_load_a_model() {
        let owner = SpeechEngine::new(crate::cleanup_engine::new_cleanup_engine());
        owner.configure(
            Some(SpeechTarget {
                engine: "whisper".into(),
                path: "/nonexistent/obsolete-preview-model".into(),
                label: "test".into(),
            }),
            None,
            false,
        );
        let coordinator = Arc::new(StreamingCoordinator::new());
        let generation = coordinator.next_generation();
        coordinator.next_generation();
        assert!(owner
            .transcribe_preview(
                vec![0.1; 16000],
                16000,
                TranscribeOpts::default(),
                coordinator,
                generation
            )
            .await
            .unwrap()
            .is_none());
        assert_eq!(owner.models.status().state, "unloaded");
    }

    #[tokio::test]
    #[ignore = "needs PARROT_TEST_STT_MODEL pointing to Whisper or Parakeet"]
    async fn real_speech_demand_release_reload_and_failed_load() {
        let path = PathBuf::from(std::env::var("PARROT_TEST_STT_MODEL").unwrap());
        let target = SpeechTarget {
            engine: if path.is_dir() { "parakeet" } else { "whisper" }.into(),
            path,
            label: "lifecycle test".into(),
        };
        let owner = SpeechEngine::new(crate::cleanup_engine::new_cleanup_engine());
        owner.configure(Some(target.clone()), Some(Duration::from_secs(1)), false);
        assert_eq!(owner.models.status().state, "unloaded");
        let (a, b) = tokio::join!(owner.models.acquire(), owner.models.acquire());
        let a = a.unwrap();
        let b = b.unwrap();
        assert!(Arc::ptr_eq(&a.client, &b.client));
        let weak = Arc::downgrade(&a.client);
        assert!(!owner
            .models
            .release_if_idle(Instant::now() + Duration::from_secs(2)));
        drop(a);
        drop(b);
        for french in [false, true] {
            let bytes: &[u8] = if french {
                include_bytes!("../tests/fixtures/transcription/french.wav")
            } else {
                include_bytes!("../tests/fixtures/transcription/english.wav")
            };
            let (samples, rate) = crate::transcription::decode_audio_bytes(bytes).unwrap();
            let result = owner
                .transcribe_final(samples, rate, TranscribeOpts::default())
                .await
                .unwrap();
            let expected: &[&str] = if french {
                &["bonjour", "réserver", "table", "demain", "soir"]
            } else {
                &["blue", "notebook", "kitchen", "table"]
            };
            for word in expected {
                assert!(
                    result.text.to_lowercase().contains(word),
                    "missing {word}: {}",
                    result.text
                );
            }
            assert!(owner
                .models
                .release_if_idle(Instant::now() + Duration::from_secs(2)));
            assert!(weak.upgrade().is_none());
            assert_eq!(owner.models.status().state, "unloaded");
        }
        let mut invalid = target;
        invalid.path = "/nonexistent/parrot-stt-model".into();
        owner.configure(Some(invalid), None, false);
        assert!(owner
            .transcribe_final(vec![0.1; 16000], 16000, TranscribeOpts::default())
            .await
            .is_err());
        assert_eq!(owner.models.status().state, "failed");
    }
}
