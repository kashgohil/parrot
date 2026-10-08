//! Isolated legacy/streaming import allocation comparison, without speech models.
use super::*;
use std::{
    path::PathBuf,
    time::{Duration, Instant},
};

struct FingerprintModel {
    count: u64,
    hash: u64,
    chunks: usize,
}
impl SpeechModel for FingerprintModel {
    fn capabilities(&self) -> ModelCapabilities {
        unimplemented!()
    }
    fn default_leading_silence_ms(&self) -> u32 {
        250
    }
    fn transcribe_raw(
        &mut self,
        samples: &[f32],
        opts: &TranscribeOptions,
    ) -> std::result::Result<TranscriptionResult, TranscribeError> {
        let lead = opts.leading_silence_ms.unwrap_or(250) as usize * 16;
        let trail = opts.trailing_silence_ms.unwrap_or(0) as usize * 16;
        for sample in &samples[lead..samples.len() - trail] {
            self.hash = (self.hash ^ sample.to_bits() as u64).wrapping_mul(1099511628211);
            self.count += 1;
        }
        self.chunks += 1;
        if self.chunks == 1 {
            std::thread::sleep(Duration::from_millis(500));
        }
        Ok(TranscriptionResult {
            text: format!("chunk{}", self.chunks),
            segments: None,
        })
    }
}

#[test]
#[ignore = "run through import-buffer-benchmark.py; no microphone or speech model"]
fn measure_import_buffers() {
    let mode = std::env::var("PARROT_IMPORT_BENCH_MODE").unwrap();
    assert!(matches!(mode.as_str(), "legacy" | "streaming"));
    let path = PathBuf::from(std::env::var("PARROT_IMPORT_BENCH_FILE").unwrap());
    std::thread::sleep(Duration::from_millis(300));
    let start = Instant::now();
    let mut model = FingerprintModel {
        count: 0,
        hash: 14695981039346656037,
        chunks: 0,
    };
    let (text, stats) = if mode == "streaming" {
        let result =
            transcribe_source(&mut model, &AudioSource::File(path), 30.0, 0.25, 30).unwrap();
        (result.text, serde_json::to_value(result.decode).unwrap())
    } else {
        // Old path: path read + byte-cursor copy while decoding; native mono
        // survives through full resampling and batch-fed inference chunks.
        let (mono, rate) = {
            let bytes = std::fs::read(path).unwrap();
            crate::transcription::decode_audio_bytes(&bytes).unwrap()
        };
        let prepared = crate::transcription::resample_linear(&mono, rate, 16_000);
        let mut chunker = EnergyAdaptiveChunked::new(
            EnergyAdaptiveConfig {
                target_chunk_secs: 30.0,
                search_window_secs: 3.0,
                padding_secs: 0.25,
                ..Default::default()
            },
            TranscribeOptions::default(),
        );
        let text = chunker.transcribe(&mut model, &prepared).unwrap().text;
        std::hint::black_box((&mono, &prepared));
        (
            text,
            serde_json::json!({"native_mono_capacity_bytes":mono.capacity()*4,
            "prepared_pcm_capacity_bytes":prepared.capacity()*4,"sample_rate":rate}),
        )
    };
    println!(
        "IMPORT_BENCH {}",
        serde_json::json!({"mode":mode,"source_samples":model.count,
        "sample_fingerprint":format!("{:016x}",model.hash),"chunks":model.chunks,"text":text,
        "elapsed_ms_including_500ms_hold":start.elapsed().as_secs_f64()*1000.0,"buffers":stats})
    );
    std::thread::sleep(Duration::from_millis(100));
}
