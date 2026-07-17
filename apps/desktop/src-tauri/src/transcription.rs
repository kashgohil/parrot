use anyhow::{Context, Result};
use reqwest::multipart;
use serde::Deserialize;
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

/// Response from the backend transcription API
#[derive(Deserialize)]
struct BackendTranscribeResponse {
    text: String,
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
        let pcm = prepare_pcm(samples, sample_rate, WHISPER_TARGET_SAMPLE_RATE);
        let ctx = self.ctx.clone();
        let language = opts.language.clone();
        let initial_prompt = opts.initial_prompt.clone();

        tokio::task::spawn_blocking(move || {
            run_whisper(
                &ctx,
                &pcm,
                language.as_deref(),
                initial_prompt.as_deref(),
            )
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

impl ParakeetProvider {
    pub fn load(model_dir: &Path, label: &str) -> Result<Self> {
        use transcribe_rs::onnx::parakeet::ParakeetModel;
        use transcribe_rs::onnx::Quantization;

        // Prefer CoreML on Apple Silicon when available; fall back to CPU.
        #[cfg(target_os = "macos")]
        {
            use transcribe_rs::{set_ort_accelerator, OrtAccelerator};
            set_ort_accelerator(OrtAccelerator::Auto);
        }

        let model = ParakeetModel::load(model_dir, &Quantization::Int8).map_err(|e| {
            anyhow::anyhow!("Failed to load Parakeet model at {}: {}", model_dir.display(), e)
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
        use transcribe_rs::SpeechModel;
        use transcribe_rs::TranscribeOptions;

        let pcm = prepare_pcm(samples, sample_rate, WHISPER_TARGET_SAMPLE_RATE);
        // Parakeet's mel preprocessor attenuates the start of audio — the
        // SpeechModel::transcribe default prepends ~250ms of silence.
        const MIN_SAMPLES_16K: usize = 16_000 / 4; // 0.25s
        if pcm.len() < MIN_SAMPLES_16K {
            return Ok(String::new());
        }

        // ParakeetModel needs &mut self. MutexGuard is !Send, so lock + infer
        // on the multi-thread runtime via block_in_place (no .await while held).
        tokio::task::block_in_place(|| {
            let mut guard = self
                .model
                .lock()
                .map_err(|_| anyhow::anyhow!("Parakeet model mutex poisoned"))?;
            let result = guard
                .transcribe(&pcm, &TranscribeOptions::default())
                .map_err(|e| anyhow::anyhow!("Parakeet transcription failed: {}", e))?;
            Ok(result.text.trim().to_string())
        })
    }
}

/// Resample mono f32 to the whisper/parakeet target rate when the device rate differs.
fn prepare_pcm(samples: &[f32], sample_rate: u32, target_rate: u32) -> Vec<f32> {
    if sample_rate == target_rate {
        samples.to_vec()
    } else {
        resample_linear(samples, sample_rate, target_rate)
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
    if pcm.len() < MIN_SAMPLES_16K {
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
    match lang {
        Some(code) => params.set_language(Some(code)),
        None => {
            params.set_language(None);
            params.set_detect_language(true);
        }
    }

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

/// Decode a WAV file into mono `f32` at the file's sample rate (no resample).
/// Used for file transcription; engines resample as needed.
pub fn load_wav_samples(wav_data: &[u8]) -> Result<(Vec<f32>, u32)> {
    let cursor = std::io::Cursor::new(wav_data);
    let mut reader = hound::WavReader::new(cursor).context(
        "Failed to parse audio file. Parrot currently supports WAV (16-bit or float PCM).",
    )?;
    let spec = reader.spec();
    let channels = spec.channels.max(1) as usize;
    let sample_rate = spec.sample_rate;

    let mono: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => {
            let samples: Vec<f32> = reader
                .samples::<f32>()
                .collect::<std::result::Result<_, _>>()
                .context("Failed to decode WAV float samples")?;
            average_channels(&samples, channels)
        }
        hound::SampleFormat::Int => {
            let bits = spec.bits_per_sample;
            let max = match bits {
                8 => i8::MAX as f32,
                16 => i16::MAX as f32,
                24 => (1i32 << 23) as f32,
                32 => i32::MAX as f32,
                _ => i16::MAX as f32,
            };
            // hound reads i16 for 16-bit; for other bit depths use i32 if available
            if bits <= 16 {
                let samples: Vec<i16> = reader
                    .samples::<i16>()
                    .collect::<std::result::Result<_, _>>()
                    .context("Failed to decode WAV int samples")?;
                let floats: Vec<f32> = samples.into_iter().map(|s| s as f32 / max).collect();
                average_channels(&floats, channels)
            } else {
                let samples: Vec<i32> = reader
                    .samples::<i32>()
                    .collect::<std::result::Result<_, _>>()
                    .context("Failed to decode WAV int samples")?;
                let floats: Vec<f32> = samples.into_iter().map(|s| s as f32 / max).collect();
                average_channels(&floats, channels)
            }
        }
    };

    Ok((mono, sample_rate))
}

/// Decode a WAV byte buffer into 16 kHz mono `f32` PCM, the format whisper
/// expects. Handles arbitrary input sample rates and channel counts via
/// linear-interpolation resampling and channel averaging — both adequate for
/// voice transcription.
#[allow(dead_code)]
fn decode_wav_to_mono_f32(wav_data: &[u8], target_rate: u32) -> Result<Vec<f32>> {
    let (mut mono, sample_rate) = load_wav_samples(wav_data)?;
    if sample_rate != target_rate {
        mono = resample_linear(&mono, sample_rate, target_rate);
    }
    Ok(mono)
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

/// Top-level dispatcher used by the Tauri command layer.
///
/// Local mode requires a preloaded `LocalEngine` and feeds it the raw f32
/// samples from the recorder. Cloud mode needs WAV bytes for the multipart
/// upload (`wav_data`).
pub async fn transcribe_audio(
    samples: &[f32],
    sample_rate: u32,
    wav_data: Option<&[u8]>,
    mode: &str,
    local: Option<&LocalEngine>,
    session_token: Option<&str>,
    api_key: Option<&str>,
    opts: TranscribeOpts,
) -> Result<String> {
    match mode {
        "local" => {
            let engine = local.ok_or_else(|| {
                anyhow::anyhow!(
                    "Parrot is still warming up the local model. Try again in a moment."
                )
            })?;
            engine.transcribe_samples(samples, sample_rate, opts).await
        }
        "cloud" => {
            let wav = wav_data.ok_or_else(|| {
                anyhow::anyhow!("WAV data required for cloud transcription")
            })?;
            transcribe_with_backend(wav, session_token, api_key, opts.initial_prompt.as_deref())
                .await
        }
        _ => anyhow::bail!("Unknown transcription mode: {}", mode),
    }
}

/// Use our backend API for transcription (proxies to OpenAI/Deepgram/ElevenLabs).
async fn transcribe_with_backend(
    wav_data: &[u8],
    session_token: Option<&str>,
    api_key: Option<&str>,
    initial_prompt: Option<&str>,
) -> Result<String> {
    let session_token = session_token
        .ok_or_else(|| anyhow::anyhow!("Session token required for cloud mode"))?;

    let part = multipart::Part::bytes(wav_data.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")?;
    let mut form = multipart::Form::new().part("file", part);
    if let Some(prompt) = initial_prompt.filter(|p| !p.is_empty()) {
        form = form.text("prompt", prompt.to_string());
    }

    let client = reqwest::Client::new();
    let mut req_builder = client
        .post("http://localhost:8030/api/transcribe")
        .header("Authorization", format!("Bearer {}", session_token))
        .multipart(form);

    if let Some(key) = api_key {
        req_builder = req_builder.header("X-API-Key", key);
    }

    let resp = req_builder.send().await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend transcribe API error {}: {}", status, body);
    }

    let result: BackendTranscribeResponse = resp.json().await?;
    Ok(result.text)
}
