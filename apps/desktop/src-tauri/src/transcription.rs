use anyhow::{Context, Result};
use std::borrow::Cow;
use std::path::Path;
use std::sync::{Arc, Mutex};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

const WHISPER_TARGET_SAMPLE_RATE: u32 = 16_000;

/// Options for a single local transcription call.
#[derive(Debug, Clone, Default)]
pub struct TranscribeOpts {
    /// Language code (`"en"`, `"de"`, …) or `"auto"` / empty for Whisper auto-detect.
    /// Parakeet v3 auto-detects; language hints are currently unused by the engine.
    pub language: Option<String>,
    /// Whisper-only initial prompt for custom vocabulary biasing.
    pub initial_prompt: Option<String>,
}

impl TranscribeOpts {
    /// Read the same current preferences for previews, dictation, and imports.
    /// Parakeet continues to ignore both hints and detect language automatically.
    pub fn from_database(db: &crate::db::Database) -> Result<Self> {
        let language = db
            .get_setting("stt_language")?
            .filter(|s| !s.trim().is_empty());
        // Vocabulary is optional. An unavailable or malformed profile must not
        // prevent transcription, matching the final-transcription behavior.
        let initial_prompt = db.get_profile().ok().and_then(|profile| {
            crate::vocab::whisper_initial_prompt(&crate::vocab::parse(&profile.custom_words))
        });
        Ok(Self {
            language,
            initial_prompt,
        })
    }
}

/// Local transcription engines available to the app.
///
/// Phase 2: Whisper (Metal) remains supported for multilingual / low-RAM;
/// Parakeet (ONNX) is the fast English-first default.
#[derive(Clone)]
pub enum LocalEngine {
    Whisper(Arc<LocalWhisperProvider>),
    Parakeet(Arc<ParakeetProvider>),
}

impl LocalEngine {
    pub fn engine_id(&self) -> &'static str {
        match self {
            LocalEngine::Whisper(_) => "whisper",
            LocalEngine::Parakeet(_) => "parakeet",
        }
    }

    pub fn model_label(&self) -> String {
        match self {
            LocalEngine::Whisper(p) => p.model_label.clone(),
            LocalEngine::Parakeet(p) => p.model_label.clone(),
        }
    }

    /// The owned blocking job can borrow prepared PCM from this recording,
    /// including when an async caller is cancelled during native inference.
    pub async fn transcribe_recording(
        &self,
        audio: Arc<crate::audio::RecordedSamples>,
        opts: TranscribeOpts,
    ) -> Result<String> {
        let engine = self.clone();
        tokio::task::spawn_blocking(move || {
            let pcm = prepare_pcm(
                &audio.samples,
                audio.sample_rate,
                WHISPER_TARGET_SAMPLE_RATE,
            );
            match engine {
                Self::Whisper(provider) => run_whisper(
                    &provider.ctx,
                    &pcm,
                    opts.language.as_deref(),
                    opts.initial_prompt.as_deref(),
                ),
                Self::Parakeet(provider) => provider.transcribe_pcm(&pcm),
            }
        })
        .await
        .context("Speech task panicked")?
    }

    pub async fn transcribe_samples(
        &self,
        samples: &[f32],
        sample_rate: u32,
        opts: TranscribeOpts,
    ) -> Result<String> {
        match self {
            LocalEngine::Whisper(p) => p.transcribe_samples(samples, sample_rate, opts).await,
            LocalEngine::Parakeet(p) => p.transcribe_samples(samples, sample_rate, opts).await,
        }
    }
}

/// Local in-process whisper transcription. Holds a loaded `WhisperContext`
/// behind an `Arc` so it can be shared as Tauri state. Transcription runs on
/// `spawn_blocking` because whisper.cpp's `full()` is CPU-bound and
/// synchronous.
pub struct LocalWhisperProvider {
    ctx: Arc<WhisperContext>,
    model_label: String,
}

impl LocalWhisperProvider {
    pub fn load(model_path: &Path) -> Result<Self> {
        let path_str = model_path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("Whisper model path is not valid UTF-8"))?;
        let label = model_path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| path_str.to_string());
        let ctx = WhisperContext::new_with_params(path_str, WhisperContextParameters::default())
            .with_context(|| format!("Failed to load whisper model at {}", path_str))?;
        Ok(Self {
            ctx: Arc::new(ctx),
            model_label: label,
        })
    }

    /// Transcribe mono `f32` samples at `sample_rate`. Resamples to 16 kHz
    /// when needed. Prefer this over the WAV path — avoids an f32→i16→f32
    /// round trip when the recorder already has floats.
    pub async fn transcribe_samples(
        &self,
        samples: &[f32],
        sample_rate: u32,
        opts: TranscribeOpts,
    ) -> Result<String> {
        let pcm = prepare_pcm(samples, sample_rate, WHISPER_TARGET_SAMPLE_RATE).into_owned();
        let ctx = self.ctx.clone();
        let language = opts.language.clone();
        let initial_prompt = opts.initial_prompt.clone();

        tokio::task::spawn_blocking(move || {
            run_whisper(&ctx, &pcm, language.as_deref(), initial_prompt.as_deref())
        })
        .await
        .context("Whisper task panicked")?
    }
}

/// NVIDIA Parakeet TDT via ONNX Runtime (`transcribe-rs`, same stack as Handy).
///
/// `ParakeetModel::transcribe` takes `&mut self`, so the model is behind a
/// Mutex — dictations are serial on a single engine instance anyway.
pub struct ParakeetProvider {
    model: Mutex<transcribe_rs::onnx::parakeet::ParakeetModel>,
    model_label: String,
}

pub(crate) fn parakeet_accelerator() -> transcribe_rs::OrtAccelerator {
    #[cfg(feature = "memory-bench")]
    if let Some(accelerator) = crate::memory_bench::parakeet_accelerator_override() {
        return accelerator;
    }
    // The INT8 model's CoreML partitions retain large Espresso plans for
    // dynamic audio shapes. CPU execution avoids those allocations and was
    // faster on the measured M4 Pro. Keep other platforms' existing policy.
    #[cfg(target_os = "macos")]
    return transcribe_rs::OrtAccelerator::CpuOnly;
    #[cfg(not(target_os = "macos"))]
    transcribe_rs::OrtAccelerator::Auto
}

impl ParakeetProvider {
    pub fn load(model_dir: &Path, label: &str) -> Result<Self> {
        use transcribe_rs::onnx::parakeet::ParakeetModel;
        use transcribe_rs::onnx::Quantization;

        transcribe_rs::set_ort_accelerator(parakeet_accelerator());
        let model = ParakeetModel::load(model_dir, &Quantization::Int8).map_err(|e| {
            anyhow::anyhow!(
                "Failed to load Parakeet model at {}: {}",
                model_dir.display(),
                e
            )
        })?;
        Ok(Self {
            model: Mutex::new(model),
            model_label: label.to_string(),
        })
    }

    pub async fn transcribe_samples(
        &self,
        samples: &[f32],
        sample_rate: u32,
        _opts: TranscribeOpts,
    ) -> Result<String> {
        let pcm = prepare_pcm(samples, sample_rate, WHISPER_TARGET_SAMPLE_RATE);
        tokio::task::block_in_place(|| self.transcribe_pcm(&pcm))
    }

    fn transcribe_pcm(&self, pcm: &[f32]) -> Result<String> {
        use transcribe_rs::{SpeechModel, TranscribeOptions};
        if pcm.len() < 16_000 / 4 {
            return Ok(String::new());
        }
        let mut guard = self
            .model
            .lock()
            .map_err(|_| anyhow::anyhow!("Parakeet model mutex poisoned"))?;

        // Long audio is transcribed in ~30s energy-split chunks. A single
        // encoder pass over multi-minute files balloons memory into the
        // tens of GB and macOS jetsam kills the app (exit 137/143).
        const CHUNK_ABOVE_SAMPLES: usize = 30 * WHISPER_TARGET_SAMPLE_RATE as usize;
        let result = if pcm.len() > CHUNK_ABOVE_SAMPLES {
            use transcribe_rs::transcriber::{
                EnergyAdaptiveChunked, EnergyAdaptiveConfig, Transcriber,
            };
            let config = EnergyAdaptiveConfig {
                target_chunk_secs: 30.0,
                search_window_secs: 3.0,
                // Same leading-silence guard the direct path gets, per chunk.
                padding_secs: 0.25,
                ..Default::default()
            };
            let mut chunker = EnergyAdaptiveChunked::new(config, TranscribeOptions::default());
            chunker
                .transcribe(&mut *guard, &pcm)
                .map_err(|e| anyhow::anyhow!("Parakeet transcription failed: {}", e))?
        } else {
            guard
                .transcribe(&pcm, &TranscribeOptions::default())
                .map_err(|e| anyhow::anyhow!("Parakeet transcription failed: {}", e))?
        };
        Ok(result.text.trim().to_string())
    }
}

/// Resample mono f32 to the whisper/parakeet target rate when the device rate differs.
fn prepare_pcm(samples: &[f32], sample_rate: u32, target_rate: u32) -> Cow<'_, [f32]> {
    if sample_rate == target_rate {
        Cow::Borrowed(samples)
    } else {
        Cow::Owned(resample_linear(samples, sample_rate, target_rate))
    }
}

fn run_whisper(
    ctx: &WhisperContext,
    pcm: &[f32],
    language: Option<&str>,
    initial_prompt: Option<&str>,
) -> Result<String> {
    // whisper.cpp needs at least ~1s of audio internally (it pads to 30s frames
    // from there). Calling `state.full()` with a near-empty buffer surfaces as
    // "Whisper inference failed" — treat sub-threshold input as empty
    // transcription instead so accidental hotkey taps don't show an error.
    const MIN_SAMPLES_16K: usize = 16_000 / 4; // 0.25s

    // Whisper can hallucinate words on digital silence. Only skip exact zero
    // samples here so quiet speech is not discarded by an amplitude threshold.
    if pcm.len() < MIN_SAMPLES_16K || pcm.iter().all(|&sample| sample == 0.0) {
        return Ok(String::new());
    }

    let mut state = ctx
        .create_state()
        .context("Failed to create whisper state")?;

    // Beam search (size 3) — Phase 2 accuracy budget from the faster engine.
    let mut params = FullParams::new(SamplingStrategy::BeamSearch {
        beam_size: 3,
        patience: 1.0,
    });
    params.set_n_threads(num_cpus_default());
    params.set_translate(false);

    // Language: "auto"/empty/None → auto-detect; otherwise pin to the code.
    let lang = language
        .map(str::trim)
        .filter(|s| !s.is_empty() && !s.eq_ignore_ascii_case("auto"));
    params.set_language(lang);
    // An unset language already triggers automatic detection. Detection-only
    // mode returns before decoding speech, leaving the transcript empty.
    params.set_detect_language(false);

    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    // Dictation is one continuous utterance — force a single segment so
    // whisper doesn't re-chunk short clips into multi-segment overhead.
    params.set_single_segment(true);
    // Drop non-speech tokens ([BLANK_AUDIO], [MUSIC], etc.) that show up on
    // silence edges and mic noise.
    params.set_suppress_nst(true);
    // Scale the encoder context to clip length so a 3s utterance doesn't
    // pay the full 30s-window cost. Mel hop is 10ms → 100 frames/s; pad ~1s
    // and clamp to the model's default range.
    let audio_secs = pcm.len() as f32 / WHISPER_TARGET_SAMPLE_RATE as f32;
    let audio_ctx = ((audio_secs * 100.0).ceil() as i32 + 100).clamp(150, 1500);
    // Metal requires the f16 cross-attention row stride (audio_ctx * 2 bytes)
    // to be divisible by 8. Round up so arbitrary clip lengths cannot abort.
    let audio_ctx = ((audio_ctx + 3) / 4) * 4;
    params.set_audio_ctx(audio_ctx);
    if let Some(prompt) = initial_prompt.filter(|p| !p.is_empty()) {
        params.set_initial_prompt(prompt);
    }

    state
        .full(params, pcm)
        .map_err(|e| {
            eprintln!(
                "whisper.full failed: {e:?} (pcm_len={}, ~{:.2}s @16kHz)",
                pcm.len(),
                pcm.len() as f32 / 16_000.0
            );
            e
        })
        .context("Whisper inference failed")?;

    let num_segments = state
        .full_n_segments()
        .context("Failed to read segment count")?;

    let mut transcript = String::new();
    for i in 0..num_segments {
        let segment = state
            .full_get_segment_text(i)
            .with_context(|| format!("Failed to read whisper segment {}", i))?;
        transcript.push_str(&segment);
    }
    Ok(transcript.trim().to_string())
}

fn num_cpus_default() -> std::os::raw::c_int {
    std::thread::available_parallelism()
        .map(|n| n.get().min(8) as std::os::raw::c_int)
        .unwrap_or(4)
}

/// Decode a user-supplied audio file into mono `f32` at the file's native
/// sample rate (no resample — the engines resample as needed). Symphonia
/// probes the container from the bytes, so this covers WAV, MP3, M4A/AAC,
/// FLAC, OGG/Vorbis, AIFF and CAF without relying on the file extension.
pub fn decode_audio_bytes(data: &[u8]) -> Result<(Vec<f32>, u32)> {
    use symphonia::core::audio::SampleBuffer;
    use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL, CODEC_TYPE_OPUS};
    use symphonia::core::errors::Error;
    use symphonia::core::formats::FormatOptions;
    use symphonia::core::io::{MediaSourceStream, MediaSourceStreamOptions};
    use symphonia::core::meta::MetadataOptions;
    use symphonia::core::probe::Hint;

    let cursor = std::io::Cursor::new(data.to_vec());
    let source = MediaSourceStream::new(Box::new(cursor), MediaSourceStreamOptions::default());
    let probed = symphonia::default::get_probe()
        .format(
            &Hint::new(),
            source,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .context(
            "Unrecognised audio format. Supported: WAV, MP3, M4A, MP4, MOV, AAC, FLAC, OGG, AIFF, CAF.",
        )?;

    let mut format = probed.format;
    // Pick the first decodable audio track. Containers like MP4/MOV can carry
    // video tracks too — isomp4 leaves their codec params empty (CODEC_TYPE_NULL,
    // no sample rate), so this skips them.
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL && t.codec_params.sample_rate.is_some())
        .context("No audio track found in this file. Video-only files can't be transcribed.")?;
    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap();
    let codec_params = track.codec_params.clone();

    // Name the gap explicitly — Opus (WhatsApp/Telegram voice notes, some
    // screen recordings) is the common unsupported case.
    if codec_params.codec == CODEC_TYPE_OPUS {
        return Err(anyhow::anyhow!(
            "This file uses the Opus codec, which Parrot doesn't support yet. Convert it to MP3, M4A, or WAV and try again."
        ));
    }
    let mut decoder = symphonia::default::get_codecs()
        .make(&codec_params, &DecoderOptions::default())
        .map_err(|_| {
            anyhow::anyhow!(
                "This file uses an audio codec Parrot doesn't support yet. Convert it to WAV, MP3, M4A, or FLAC and try again."
            )
        })?;

    let mut mono: Vec<f32> = Vec::new();
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(Error::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(e) => return Err(e).context("Failed while reading audio data"),
        };
        if packet.track_id() != track_id {
            continue;
        }
        match decoder.decode(&packet) {
            Ok(decoded) => {
                let spec = *decoded.spec();
                let channels = spec.channels.count();
                let mut buf = SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
                buf.copy_interleaved_ref(decoded);
                mono.extend(average_channels(buf.samples(), channels));
            }
            // Skip corrupt packets rather than failing the whole file.
            Err(Error::DecodeError(_)) => continue,
            Err(e) => return Err(e).context("Failed to decode audio"),
        }
    }

    Ok((mono, sample_rate))
}

fn average_channels(interleaved: &[f32], channels: usize) -> Vec<f32> {
    if channels <= 1 {
        return interleaved.to_vec();
    }
    interleaved
        .chunks(channels)
        .map(|frame| frame.iter().sum::<f32>() / frame.len() as f32)
        .collect()
}

fn resample_linear(input: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if input.is_empty() || from_rate == to_rate {
        return input.to_vec();
    }
    let ratio = from_rate as f64 / to_rate as f64;
    let out_len = ((input.len() as f64) / ratio).round() as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let src_pos = i as f64 * ratio;
        let idx = src_pos.floor() as usize;
        let frac = (src_pos - idx as f64) as f32;
        let a = input[idx.min(input.len() - 1)];
        let b = input[(idx + 1).min(input.len() - 1)];
        out.push(a + (b - a) * frac);
    }
    out
}

/// Top-level transcription entry used by the Tauri command layer.
///
/// Requires a preloaded `LocalEngine` and feeds it the raw f32 samples from
/// the recorder (or a decoded WAV file).
#[cfg(test)]
pub async fn transcribe_audio(
    samples: &[f32],
    sample_rate: u32,
    local: Option<&LocalEngine>,
    opts: TranscribeOpts,
) -> Result<String> {
    let engine = local.ok_or_else(|| {
        anyhow::anyhow!("Parrot is still warming up the local model. Try again in a moment.")
    })?;
    engine.transcribe_samples(samples, sample_rate, opts).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prepared_native_rate_pcm_borrows_the_recording() {
        let samples = vec![0.25; 16_000];
        let prepared = prepare_pcm(&samples, 16_000, 16_000);
        assert!(matches!(prepared, Cow::Borrowed(_)));
        assert_eq!(prepared.as_ptr(), samples.as_ptr());
        let converted = prepare_pcm(&samples, 48_000, 16_000);
        assert_eq!(
            converted.as_ref(),
            resample_linear(&samples, 48_000, 16_000)
        );
    }

    #[test]
    fn transcription_preferences_preserve_auto_and_explicit_languages() {
        let db = crate::db::Database::in_memory().unwrap();
        let opts = TranscribeOpts::from_database(&db).unwrap();
        assert!(opts.language.is_none());
        assert!(opts.initial_prompt.is_none());

        db.update_profile(
            r#"["réserver", {"term":"Parrot"}, {"term":"Acme", "context":"company name"}]"#,
            "",
            "",
        )
        .unwrap();
        // Re-read the same database after each Settings change, as previews do.
        for (setting, expected) in [
            ("", None),
            ("  ", None),
            ("auto", Some("auto")),
            (" AuTo ", Some(" AuTo ")),
            ("fr", Some("fr")),
            ("hi", Some("hi")),
            ("en", Some("en")),
        ] {
            db.set_setting("stt_language", setting).unwrap();
            let opts = TranscribeOpts::from_database(&db).unwrap();
            assert_eq!(opts.language.as_deref(), expected);
            assert_eq!(
                opts.initial_prompt.as_deref(),
                Some("Vocabulary hints: réserver, Parrot.")
            );
        }
    }

    #[test]
    fn transcription_preferences_tolerate_malformed_and_conditional_vocabulary() {
        let db = crate::db::Database::in_memory().unwrap();
        db.set_setting("stt_language", "fr").unwrap();
        for words in [
            "not valid JSON",
            "[]",
            r#"[{"term":"Acme", "context":"company name"}]"#,
        ] {
            db.update_profile(words, "", "").unwrap();
            let opts = TranscribeOpts::from_database(&db).unwrap();
            assert_eq!(opts.language.as_deref(), Some("fr"));
            assert!(opts.initial_prompt.is_none());
        }
    }

    fn make_wav_i16(channels: u16, sample_rate: u32, frames: &[i16]) -> Vec<u8> {
        let mut buf = std::io::Cursor::new(Vec::new());
        let spec = hound::WavSpec {
            channels,
            sample_rate,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        let mut writer = hound::WavWriter::new(&mut buf, spec).unwrap();
        for &s in frames {
            writer.write_sample(s).unwrap();
        }
        writer.finalize().unwrap();
        buf.into_inner()
    }

    #[test]
    fn decodes_mono_wav() {
        let wav = make_wav_i16(1, 16_000, &[0, 16_384, -16_384, 0]);
        let (samples, rate) = decode_audio_bytes(&wav).unwrap();
        assert_eq!(rate, 16_000);
        assert_eq!(samples.len(), 4);
        assert!((samples[1] - 0.5).abs() < 0.01);
        assert!((samples[2] + 0.5).abs() < 0.01);
    }

    #[test]
    fn downmixes_stereo_wav() {
        // Interleaved stereo: L=full, R=0 → mono should be ~0.5.
        let wav = make_wav_i16(2, 44_100, &[32_767, 0, 32_767, 0]);
        let (samples, rate) = decode_audio_bytes(&wav).unwrap();
        assert_eq!(rate, 44_100);
        assert_eq!(samples.len(), 2);
        assert!((samples[0] - 0.5).abs() < 0.01);
    }

    #[test]
    fn rejects_garbage_bytes() {
        assert!(decode_audio_bytes(b"not audio at all").is_err());
    }

    /// Run with a downloaded multilingual model (never fetched by the test):
    /// PARROT_TEST_WHISPER_MODEL=/path/to/ggml-large-v3-turbo-q5_0.bin \
    /// cargo test --locked -p parrot --lib whisper_multilingual_inference -- --ignored --nocapture
    #[tokio::test]
    #[ignore = "requires PARROT_TEST_WHISPER_MODEL pointing to a multilingual Whisper model"]
    async fn whisper_multilingual_inference() {
        let model_path = std::env::var_os("PARROT_TEST_WHISPER_MODEL")
            .expect("Set PARROT_TEST_WHISPER_MODEL to a multilingual Whisper model file");
        let provider = LocalWhisperProvider::load(Path::new(&model_path)).unwrap();
        assert!(
            provider.ctx.is_multilingual(),
            "Use a multilingual model, not an .en model"
        );
        let engine = LocalEngine::Whisper(Arc::new(provider));

        // Fixed synthetic recordings; see tests/fixtures/transcription/README.txt.
        let fixtures: &[(&str, &[u8], &[&str])] = &[
            (
                "en",
                include_bytes!("../tests/fixtures/transcription/english.wav"),
                &["blue", "notebook", "kitchen", "table"],
            ),
            (
                "fr",
                include_bytes!("../tests/fixtures/transcription/french.wav"),
                &["bonjour", "réserver", "table", "demain", "soir"],
            ),
        ];
        for &(code, wav, expected_words) in fixtures {
            let (samples, rate) = decode_audio_bytes(wav).unwrap();
            // Dictation and imports share this entry point. Exercise every Auto
            // spelling accepted by run_whisper, plus a pinned language hint.
            for language in [
                None,
                Some("auto"),
                Some(" AuTo "),
                Some(""),
                Some("  "),
                Some(code),
            ] {
                let transcript = transcribe_audio(
                    &samples,
                    rate,
                    Some(&engine),
                    TranscribeOpts {
                        language: language.map(str::to_owned),
                        initial_prompt: None,
                    },
                )
                .await
                .unwrap();
                eprintln!("{code}, language={language:?}: {transcript:?}");
                let normalized = transcript.to_lowercase();
                for word in expected_words {
                    assert!(
                        normalized
                            .split(|c: char| !c.is_alphabetic())
                            .any(|token| token == *word),
                        "{code}, language={language:?}: expected {word:?} in {transcript:?}"
                    );
                }
            }
        }

        for samples in [
            Vec::new(),
            vec![0.1; 3_999], // Non-silent accidental tap, below 0.25s.
            vec![0.0; 4_000], // Silence at the minimum inference length.
            vec![0.0; 32_000],
        ] {
            let transcript = transcribe_audio(
                &samples,
                WHISPER_TARGET_SAMPLE_RATE,
                Some(&engine),
                TranscribeOpts::default(),
            )
            .await
            .unwrap();
            assert!(
                transcript.is_empty(),
                "Silent or short input produced {transcript:?}"
            );
        }
    }
}
