use anyhow::{Context, Result};
use reqwest::multipart;
use serde::Deserialize;
use std::path::Path;
use std::sync::Arc;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

const WHISPER_TARGET_SAMPLE_RATE: u32 = 16_000;

/// Response from the backend transcription API
#[derive(Deserialize)]
struct BackendTranscribeResponse {
    text: String,
}

/// Local in-process whisper transcription. Holds a loaded `WhisperContext`
/// behind an `Arc` so it can be shared as Tauri state. Transcription runs on
/// `spawn_blocking` because whisper.cpp's `full()` is CPU-bound and
/// synchronous.
pub struct LocalWhisperProvider {
    ctx: Arc<WhisperContext>,
}

impl LocalWhisperProvider {
    pub fn load(model_path: &Path) -> Result<Self> {
        let path_str = model_path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("Whisper model path is not valid UTF-8"))?;
        let ctx = WhisperContext::new_with_params(path_str, WhisperContextParameters::default())
            .with_context(|| format!("Failed to load whisper model at {}", path_str))?;
        Ok(Self { ctx: Arc::new(ctx) })
    }

    pub async fn transcribe(&self, wav_data: &[u8]) -> Result<String> {
        let pcm = decode_wav_to_mono_f32(wav_data, WHISPER_TARGET_SAMPLE_RATE)?;
        let ctx = self.ctx.clone();

        tokio::task::spawn_blocking(move || run_whisper(&ctx, &pcm))
            .await
            .context("Whisper task panicked")?
    }
}

fn run_whisper(ctx: &WhisperContext, pcm: &[f32]) -> Result<String> {
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

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_n_threads(num_cpus_default());
    params.set_translate(false);
    params.set_language(Some("en"));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);

    state
        .full(params, pcm)
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

/// Decode a WAV byte buffer into 16 kHz mono `f32` PCM, the format whisper
/// expects. Handles arbitrary input sample rates and channel counts via
/// linear-interpolation resampling and channel averaging — both adequate for
/// voice transcription.
fn decode_wav_to_mono_f32(wav_data: &[u8], target_rate: u32) -> Result<Vec<f32>> {
    let cursor = std::io::Cursor::new(wav_data);
    let mut reader = hound::WavReader::new(cursor).context("Failed to parse WAV header")?;
    let spec = reader.spec();
    let channels = spec.channels.max(1) as usize;

    let mut mono: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => {
            let samples: Vec<f32> = reader
                .samples::<f32>()
                .collect::<std::result::Result<_, _>>()
                .context("Failed to decode WAV float samples")?;
            average_channels(&samples, channels)
        }
        hound::SampleFormat::Int => {
            let max = i16::MAX as f32;
            let samples: Vec<i16> = reader
                .samples::<i16>()
                .collect::<std::result::Result<_, _>>()
                .context("Failed to decode WAV int samples")?;
            let floats: Vec<f32> = samples.into_iter().map(|s| s as f32 / max).collect();
            average_channels(&floats, channels)
        }
    };

    if spec.sample_rate != target_rate {
        mono = resample_linear(&mono, spec.sample_rate, target_rate);
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
/// Local mode requires a preloaded `LocalWhisperProvider` to be passed in
/// (initialized once at app startup). Cloud mode goes through the existing
/// HTTP backend and ignores `local`.
pub async fn transcribe_audio(
    wav_data: &[u8],
    mode: &str,
    local: Option<&LocalWhisperProvider>,
    session_token: Option<&str>,
    api_key: Option<&str>,
) -> Result<String> {
    match mode {
        "local" => {
            let provider = local.ok_or_else(|| {
                anyhow::anyhow!(
                    "Parrot is still warming up the local model. Try again in a moment."
                )
            })?;
            provider.transcribe(wav_data).await
        }
        "cloud" => transcribe_with_backend(wav_data, session_token, api_key).await,
        _ => anyhow::bail!("Unknown transcription mode: {}", mode),
    }
}

/// Use our backend API for transcription (proxies to OpenAI/Deepgram/ElevenLabs).
async fn transcribe_with_backend(
    wav_data: &[u8],
    session_token: Option<&str>,
    api_key: Option<&str>,
) -> Result<String> {
    let session_token = session_token
        .ok_or_else(|| anyhow::anyhow!("Session token required for cloud mode"))?;

    let part = multipart::Part::bytes(wav_data.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")?;
    let form = multipart::Form::new().part("file", part);

    let client = reqwest::Client::new();
    let mut req_builder = client
        .post("http://localhost:3001/api/transcribe")
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
