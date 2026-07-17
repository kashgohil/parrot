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

    /// Transcribe mono `f32` samples at `sample_rate`. Resamples to 16 kHz
    /// when needed. Prefer this over the WAV path — avoids an f32→i16→f32
    /// round trip when the recorder already has floats.
    pub async fn transcribe_samples(
        &self,
        samples: &[f32],
        sample_rate: u32,
        initial_prompt: Option<String>,
    ) -> Result<String> {
        let pcm = prepare_pcm(samples, sample_rate, WHISPER_TARGET_SAMPLE_RATE);
        let ctx = self.ctx.clone();

        tokio::task::spawn_blocking(move || run_whisper(&ctx, &pcm, initial_prompt.as_deref()))
            .await
            .context("Whisper task panicked")?
    }

    pub async fn transcribe(
        &self,
        wav_data: &[u8],
        initial_prompt: Option<String>,
    ) -> Result<String> {
        let pcm = decode_wav_to_mono_f32(wav_data, WHISPER_TARGET_SAMPLE_RATE)?;
        let ctx = self.ctx.clone();

        tokio::task::spawn_blocking(move || run_whisper(&ctx, &pcm, initial_prompt.as_deref()))
            .await
            .context("Whisper task panicked")?
    }
}

/// Resample mono f32 to the whisper target rate when the device rate differs.
fn prepare_pcm(samples: &[f32], sample_rate: u32, target_rate: u32) -> Vec<f32> {
    if sample_rate == target_rate {
        samples.to_vec()
    } else {
        resample_linear(samples, sample_rate, target_rate)
    }
}

fn run_whisper(ctx: &WhisperContext, pcm: &[f32], initial_prompt: Option<&str>) -> Result<String> {
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
/// Local mode requires a preloaded `LocalWhisperProvider` and feeds it the
/// raw f32 samples from the recorder. Cloud mode needs WAV bytes for the
/// multipart upload (`wav_data`).
pub async fn transcribe_audio(
    samples: &[f32],
    sample_rate: u32,
    wav_data: Option<&[u8]>,
    mode: &str,
    local: Option<&LocalWhisperProvider>,
    session_token: Option<&str>,
    api_key: Option<&str>,
    initial_prompt: Option<String>,
) -> Result<String> {
    match mode {
        "local" => {
            let provider = local.ok_or_else(|| {
                anyhow::anyhow!(
                    "Parrot is still warming up the local model. Try again in a moment."
                )
            })?;
            provider
                .transcribe_samples(samples, sample_rate, initial_prompt)
                .await
        }
        "cloud" => {
            let wav = wav_data.ok_or_else(|| {
                anyhow::anyhow!("WAV data required for cloud transcription")
            })?;
            transcribe_with_backend(wav, session_token, api_key, initial_prompt.as_deref()).await
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
