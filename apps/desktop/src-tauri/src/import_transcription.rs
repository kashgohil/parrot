//! Feed bounded decoded PCM into the same energy-based chunker used by Parakeet.
use crate::audio_import::{stream_audio, AudioSource, DecodeStats};
use anyhow::{Context, Result};
use transcribe_rs::{
    transcriber::{EnergyAdaptiveChunked, EnergyAdaptiveConfig, Transcriber},
    ModelCapabilities, SpeechModel, TranscribeError, TranscribeOptions, TranscriptionResult,
};

pub struct ImportedText {
    pub text: String,
    pub decode: DecodeStats,
}

pub fn transcribe_source(
    model: &mut dyn SpeechModel,
    source: &AudioSource,
    target_seconds: f32,
    padding_seconds: f32,
    direct_limit_seconds: usize,
) -> Result<ImportedText> {
    let config = EnergyAdaptiveConfig {
        target_chunk_secs: target_seconds,
        search_window_secs: 3.0,
        padding_secs: padding_seconds,
        ..Default::default()
    };
    let mut chunker = EnergyAdaptiveChunked::new(config, TranscribeOptions::default());
    let mut prefix = Vec::new();
    let mut chunked = false;
    let stats = stream_audio(source, 16_000, |samples| {
        if chunked {
            chunker
                .feed(model, samples)
                .context("Chunk inference failed")?;
        } else {
            prefix.extend_from_slice(samples);
            if prefix.len() > direct_limit_seconds * 16_000 {
                chunker
                    .feed(model, &prefix)
                    .context("Chunk inference failed")?;
                // Release initial staging before decoding the rest of the file.
                prefix = Vec::new();
                chunked = true;
            }
        }
        Ok(())
    })?;
    anyhow::ensure!(stats.input_frames > 0, "Audio file has no samples");
    let text = if chunked {
        chunker
            .finish(model)
            .context("Final chunk inference failed")?
            .text
    } else if prefix.len() < 16_000 / 4 {
        String::new()
    } else {
        model
            .transcribe(&prefix, &TranscribeOptions::default())
            .context("Speech inference failed")?
            .text
    };
    Ok(ImportedText {
        text: text.trim().to_owned(),
        decode: stats,
    })
}

/// Keep the app's language/vocabulary options and Whisper decoding parameters.
/// Its import chunks stay below 30s so one batch never spans multiple windows.
pub struct WhisperModel<'a> {
    pub ctx: &'a whisper_rs::WhisperContext,
    pub opts: crate::transcription::TranscribeOpts,
}
impl SpeechModel for WhisperModel<'_> {
    fn capabilities(&self) -> ModelCapabilities {
        ModelCapabilities {
            name: "Whisper import",
            engine_id: "whisper",
            sample_rate: 16_000,
            languages: &[],
            supports_timestamps: false,
            supports_translation: false,
            supports_streaming: false,
        }
    }
    fn transcribe_raw(
        &mut self,
        samples: &[f32],
        _: &TranscribeOptions,
    ) -> std::result::Result<TranscriptionResult, TranscribeError> {
        let text = crate::transcription::run_whisper(
            self.ctx,
            samples,
            self.opts.language.as_deref(),
            self.opts.initial_prompt.as_deref(),
        )
        .map_err(|e| TranscribeError::Inference(e.to_string()))?;
        Ok(TranscriptionResult {
            text,
            segments: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    struct SampleModel {
        captured: Vec<f32>,
        chunks: usize,
    }
    impl SpeechModel for SampleModel {
        fn capabilities(&self) -> ModelCapabilities {
            unimplemented!()
        }
        fn default_leading_silence_ms(&self) -> u32 {
            250
        }
        fn transcribe_raw(
            &mut self,
            samples: &[f32],
            _: &TranscribeOptions,
        ) -> std::result::Result<TranscriptionResult, TranscribeError> {
            let start = samples.iter().position(|s| *s != 0.0).unwrap();
            let end = samples.iter().rposition(|s| *s != 0.0).unwrap() + 1;
            self.captured.extend_from_slice(&samples[start..end]);
            self.chunks += 1;
            Ok(TranscriptionResult {
                text: format!("chunk{}", self.chunks),
                segments: None,
            })
        }
    }
    #[test]
    fn streaming_chunks_partition_every_sample_once_and_keep_transcript_order() {
        for seconds in [1, 30, 31, 33, 97] {
            let samples: Vec<f32> = (0..seconds * 16_000)
                .map(|i| 0.125 + (i % 10_000) as f32 / 20_000.0)
                .collect();
            let bytes = crate::audio::encode_wav(&samples, 16_000).unwrap();
            let (expected, _) = crate::transcription::decode_audio_bytes(&bytes).unwrap();
            let source = AudioSource::Bytes(Arc::new(bytes));
            let mut model = SampleModel {
                captured: Vec::new(),
                chunks: 0,
            };
            let result = transcribe_source(&mut model, &source, 30.0, 0.25, 30).unwrap();
            assert_eq!(
                model.captured, expected,
                "{seconds}s lost/repeated boundary samples"
            );
            let text = (1..=model.chunks)
                .map(|i| format!("chunk{i}"))
                .collect::<Vec<_>>()
                .join(" ");
            assert_eq!(result.text, text);
            assert_eq!(result.decode.duration_ms(), seconds as u64 * 1000);
            assert!(result.decode.max_output_samples <= 4096);
            if seconds <= 30 {
                assert_eq!(model.chunks, 1);
            }
        }
    }
}
