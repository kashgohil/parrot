use anyhow::Result;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};

pub struct AudioRecorder {
    samples: Arc<Mutex<Vec<f32>>>,
    stream: Option<cpal::Stream>,
    sample_rate: u32,
    channels: u16,
    is_recording: Arc<Mutex<bool>>,
}

unsafe impl Send for AudioRecorder {}
unsafe impl Sync for AudioRecorder {}

impl AudioRecorder {
    pub fn new() -> Result<Self> {
        Ok(Self {
            samples: Arc::new(Mutex::new(Vec::new())),
            stream: None,
            sample_rate: 16000,
            channels: 1,
            is_recording: Arc::new(Mutex::new(false)),
        })
    }

    pub fn start(&mut self) -> Result<()> {
        // Drop the previous session's audio up-front, before any fallible cpal
        // call. If `default_input_config` or `build_input_stream` errors out
        // (e.g. Microphone permission missing), a later `stop()` would
        // otherwise re-encode whatever was left from the prior recording —
        // surfacing as "it transcribed my last dictation again."
        self.samples.lock().unwrap().clear();
        *self.is_recording.lock().unwrap() = false;

        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or_else(|| anyhow::anyhow!("No input device available"))?;

        let config = device.default_input_config()?;
        self.sample_rate = config.sample_rate().0;
        self.channels = config.channels();

        let samples = self.samples.clone();
        let is_recording = self.is_recording.clone();

        *is_recording.lock().unwrap() = true;

        let channels = self.channels as usize;
        let stream = device.build_input_stream(
            &config.into(),
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if !*is_recording.lock().unwrap() {
                    return;
                }
                let mut buf = samples.lock().unwrap();
                // Mix down to mono if multi-channel
                if channels > 1 {
                    for chunk in data.chunks(channels) {
                        let sum: f32 = chunk.iter().sum();
                        buf.push(sum / channels as f32);
                    }
                } else {
                    buf.extend_from_slice(data);
                }
            },
            |err| eprintln!("Audio input error: {}", err),
            None,
        )?;

        stream.play()?;
        self.stream = Some(stream);
        Ok(())
    }

    /// Stop recording and return raw mono `f32` samples plus the device
    /// sample rate. Callers that need WAV (cloud upload, save-audio) should
    /// encode via [`encode_wav`]; local whisper takes the floats directly so
    /// we avoid an f32 → i16 → f32 round trip on the hot path.
    pub fn stop(&mut self) -> Result<RecordedSamples> {
        *self.is_recording.lock().unwrap() = false;
        self.stream = None;

        let mut samples = self.samples.lock().unwrap();
        let out = RecordedSamples {
            samples: std::mem::take(&mut *samples),
            sample_rate: self.sample_rate,
        };
        Ok(out)
    }

    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }
}

/// Mono float samples captured from the mic, still at the device sample rate.
#[derive(Clone)]
pub struct RecordedSamples {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
}

impl RecordedSamples {
    pub fn encode_wav(&self) -> Result<Vec<u8>> {
        encode_wav(&self.samples, self.sample_rate)
    }
}

pub fn encode_wav(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>> {
    let mut buf = std::io::Cursor::new(Vec::new());
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::new(&mut buf, spec)?;
    for &sample in samples {
        let s = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
        writer.write_sample(s)?;
    }
    writer.finalize()?;
    Ok(buf.into_inner())
}
