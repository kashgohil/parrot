//! Incremental file decoding and globally phased linear resampling.
use anyhow::{Context, Result};
use std::{path::PathBuf, sync::Arc};
use symphonia::core::{
    audio::SampleBuffer,
    codecs::{DecoderOptions, CODEC_TYPE_NULL, CODEC_TYPE_OPUS},
    errors::Error,
    formats::FormatOptions,
    io::{MediaSource, MediaSourceStream},
    meta::MetadataOptions,
    probe::Hint,
};

pub const BLOCK_SAMPLES: usize = 4096;

#[derive(Clone)]
pub enum AudioSource {
    File(PathBuf),
    Bytes(Arc<Vec<u8>>),
}

// Cursor needs AsRef<[u8]>; wrapping an Arc<Vec<u8>> shares its existing storage.
struct SharedBytes(Arc<Vec<u8>>);
impl AsRef<[u8]> for SharedBytes {
    fn as_ref(&self) -> &[u8] {
        self.0.as_slice()
    }
}

impl AudioSource {
    fn open(&self) -> Result<Box<dyn MediaSource>> {
        Ok(match self {
            Self::File(path) => Box::new(
                std::fs::File::open(path)
                    .with_context(|| format!("Failed to read {}", path.display()))?,
            ),
            Self::Bytes(bytes) => Box::new(std::io::Cursor::new(SharedBytes(bytes.clone()))),
        })
    }
}

#[derive(Debug, Default, serde::Serialize)]
pub struct DecodeStats {
    pub input_frames: u64,
    pub sample_rate: u32,
    pub output_samples: u64,
    pub max_decoder_frames: usize,
    pub max_resampler_pending_samples: usize,
    pub max_output_samples: usize,
}
impl DecodeStats {
    pub fn duration_ms(&self) -> u64 {
        self.input_frames * 1000 / self.sample_rate.max(1) as u64
    }
}

/// Same global sample positions and final rounding as the batch interpolator.
/// Retain only input needed for the next interpolation and one output block.
struct LinearResampler {
    ratio: f64,
    total_input: usize,
    input_offset: usize,
    next_output: usize,
    pending: Vec<f32>,
    output: Vec<f32>,
    max_pending: usize,
    max_output: usize,
}
impl LinearResampler {
    fn new(from: u32, to: u32) -> Result<Self> {
        anyhow::ensure!(from > 0 && to > 0, "Audio sample rate must be positive");
        Ok(Self {
            ratio: from as f64 / to as f64,
            total_input: 0,
            input_offset: 0,
            next_output: 0,
            pending: Vec::new(),
            output: Vec::with_capacity(BLOCK_SAMPLES),
            max_pending: 0,
            max_output: 0,
        })
    }
    fn push(
        &mut self,
        input: &[f32],
        final_block: bool,
        emit: &mut impl FnMut(&[f32]) -> Result<()>,
    ) -> Result<()> {
        self.pending.extend_from_slice(input);
        self.total_input += input.len();
        self.max_pending = self.max_pending.max(self.pending.len());
        let out_len = (self.total_input as f64 / self.ratio).round() as usize;
        while self.next_output < out_len {
            let pos = self.next_output as f64 * self.ratio;
            let index = pos.floor() as usize;
            if !final_block && index + 1 >= self.total_input {
                break;
            }
            let a = self.pending[index.min(self.total_input - 1) - self.input_offset];
            let b = self.pending[(index + 1).min(self.total_input - 1) - self.input_offset];
            self.output.push(a + (b - a) * (pos - index as f64) as f32);
            self.next_output += 1;
            if self.output.len() == BLOCK_SAMPLES {
                self.flush(emit)?;
            }
        }
        let keep_from =
            ((self.next_output as f64 * self.ratio).floor() as usize).min(self.total_input);
        self.pending.drain(..keep_from - self.input_offset);
        self.input_offset = keep_from;
        if final_block {
            self.flush(emit)?;
        }
        Ok(())
    }
    fn flush(&mut self, emit: &mut impl FnMut(&[f32]) -> Result<()>) -> Result<()> {
        if !self.output.is_empty() {
            self.max_output = self.max_output.max(self.output.len());
            emit(&self.output)?;
            self.output.clear();
        }
        Ok(())
    }
}

pub fn stream_audio(
    source: &AudioSource,
    target_rate: u32,
    mut emit: impl FnMut(&[f32]) -> Result<()>,
) -> Result<DecodeStats> {
    let stream = MediaSourceStream::new(source.open()?, Default::default());
    let mut format = symphonia::default::get_probe()
        .format(&Hint::new(), stream, &FormatOptions::default(), &MetadataOptions::default())
        .context("Unrecognised audio format. Supported: WAV, MP3, M4A, MP4, MOV, AAC, FLAC, OGG, AIFF, CAF.")?.format;
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL && t.codec_params.sample_rate.is_some())
        .context("No audio track found in this file. Video-only files can't be transcribed.")?;
    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap();
    if track.codec_params.codec == CODEC_TYPE_OPUS {
        anyhow::bail!("This file uses the Opus codec, which Parrot doesn't support yet. Convert it to MP3, M4A, or WAV and try again.");
    }
    let mut decoder = symphonia::default::get_codecs().make(&track.codec_params, &DecoderOptions::default())
        .map_err(|_| anyhow::anyhow!("This file uses an audio codec Parrot doesn't support yet. Convert it to WAV, MP3, M4A, or FLAC and try again."))?;
    let mut resampler = LinearResampler::new(sample_rate, target_rate)?;
    let mut stats = DecodeStats {
        sample_rate,
        ..Default::default()
    };
    let mut mono = Vec::with_capacity(BLOCK_SAMPLES);
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(Error::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(e) => return Err(e).context("Failed while reading audio data"),
        };
        if packet.track_id() != track_id {
            continue;
        }
        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            Err(Error::DecodeError(_)) => continue, // Preserve corrupt-packet policy.
            Err(e) => return Err(e).context("Failed to decode audio"),
        };
        let spec = *decoded.spec();
        anyhow::ensure!(
            spec.rate == sample_rate,
            "Audio sample rate changed within the file"
        );
        let channels = spec.channels.count();
        anyhow::ensure!(channels > 0, "Audio file has no channels");
        stats.max_decoder_frames = stats.max_decoder_frames.max(decoded.capacity());
        let mut interleaved = SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
        interleaved.copy_interleaved_ref(decoded);
        for block in interleaved.samples().chunks(BLOCK_SAMPLES * channels) {
            mono.clear();
            mono.extend(
                block
                    .chunks(channels)
                    .map(|frame| frame.iter().sum::<f32>() / frame.len() as f32),
            );
            stats.input_frames += mono.len() as u64;
            resampler.push(&mono, false, &mut emit)?;
        }
    }
    resampler.push(&[], true, &mut emit)?;
    stats.output_samples = resampler.next_output as u64;
    stats.max_resampler_pending_samples = resampler.max_pending;
    stats.max_output_samples = resampler.max_output;
    Ok(stats)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "needs PARROT_TEST_IMPORT_DIR generated by generate-import-fixtures.py"]
    fn supported_formats_match_batch_decode_and_resampling() {
        let dir = PathBuf::from(std::env::var("PARROT_TEST_IMPORT_DIR").unwrap());
        for ext in [
            "wav", "mp3", "m4a", "mp4", "mov", "aac", "flac", "ogg", "oga", "aiff", "aif", "caf",
        ] {
            let path = dir.join(format!("french.{ext}"));
            let bytes = std::fs::read(&path).unwrap();
            let (mono, rate) = crate::transcription::decode_audio_bytes(&bytes).unwrap();
            let expected = crate::transcription::resample_linear(&mono, rate, 16_000);
            for source in [
                AudioSource::File(path.clone()),
                AudioSource::Bytes(Arc::new(bytes.clone())),
            ] {
                let mut actual = Vec::new();
                let stats = stream_audio(&source, 16_000, |b| {
                    actual.extend_from_slice(b);
                    Ok(())
                })
                .unwrap();
                assert_eq!(actual, expected, "{ext}: changed decoded PCM");
                assert!(stats.input_frames > 0);
                assert!(stats.max_output_samples <= BLOCK_SAMPLES);
            }
            eprintln!("{ext}: file and byte-source PCM match batch output");
        }
        let error = stream_audio(
            &AudioSource::File(dir.join("unsupported-opus.ogg")),
            16_000,
            |_| Ok(()),
        )
        .unwrap_err();
        assert!(error.to_string().contains("Opus"));
        let error = stream_audio(
            &AudioSource::File(dir.join("video-only.mp4")),
            16_000,
            |_| Ok(()),
        )
        .unwrap_err();
        assert!(error.to_string().contains("No audio track"));
    }

    #[test]
    fn incremental_resampling_matches_global_positions_at_every_packet_boundary() {
        for (from, to) in [
            (16_000, 16_000),
            (44_100, 16_000),
            (48_000, 16_000),
            (96_000, 16_000),
            (8_000, 16_000),
        ] {
            for len in [0, 1, 2, 3, 31, 4097, 19_013] {
                let input: Vec<f32> = (0..len).map(|i| (i as f32 * 0.037).sin()).collect();
                let expected = crate::transcription::resample_linear(&input, from, to);
                for packet in [1, 7, 1152, 4096] {
                    let mut resampler = LinearResampler::new(from, to).unwrap();
                    let mut actual = Vec::new();
                    let mut emit = |samples: &[f32]| {
                        actual.extend_from_slice(samples);
                        Ok(())
                    };
                    for chunk in input.chunks(packet) {
                        resampler.push(chunk, false, &mut emit).unwrap();
                    }
                    resampler.push(&[], true, &mut emit).unwrap();
                    assert_eq!(actual, expected, "from={from}, len={len}, packet={packet}");
                    assert!(
                        resampler.max_pending
                            <= packet + (from as f64 / to as f64).ceil() as usize + 1
                    );
                }
            }
        }
    }

    #[test]
    fn streaming_decode_preserves_native_pcm_and_propagates_consumer_errors() {
        let data = include_bytes!("../tests/fixtures/transcription/french.wav");
        let (expected, rate) = crate::transcription::decode_audio_bytes(data).unwrap();
        let bytes = Arc::new(data.to_vec());
        let source = AudioSource::Bytes(bytes.clone());
        let mut actual = Vec::new();
        let stats = stream_audio(&source, rate, |block| {
            actual.extend_from_slice(block);
            Ok(())
        })
        .unwrap();
        assert_eq!(actual, expected);
        assert_eq!(stats.input_frames as usize, expected.len());
        assert!(stats.max_output_samples <= BLOCK_SAMPLES);
        assert!(stats.max_resampler_pending_samples <= BLOCK_SAMPLES + 1);
        let error = stream_audio(&source, rate, |_| anyhow::bail!("consumer failed")).unwrap_err();
        assert!(error.to_string().contains("consumer failed"));
        assert_eq!(Arc::strong_count(&bytes), 2); // Reader released its shared bytes on failure.
        assert!(stream_audio(
            &AudioSource::Bytes(Arc::new(b"garbage".to_vec())),
            rate,
            |_| Ok(())
        )
        .is_err());
    }
}
