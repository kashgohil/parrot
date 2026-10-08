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

#[cfg(test)]
#[path = "preview_buffer_bench.rs"]
mod preview_buffer_bench;

impl AudioRecorder {
    /// Replay synthetic PCM through the ordinary capture buffer, without a mic.
    #[cfg(any(test, feature = "memory-bench"))]
    pub(crate) fn begin_fixture(&mut self, sample_rate: u32) {
        self.samples.lock().unwrap().clear();
        self.sample_rate = sample_rate;
        *self.is_recording.lock().unwrap() = true;
    }

    #[cfg(any(test, feature = "memory-bench"))]
    pub(crate) fn push_fixture(&mut self, samples: &[f32]) {
        self.samples.lock().unwrap().extend_from_slice(samples);
    }

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

        // Reuse a warm stream only while the default input is still Bluetooth.
        // Built-in / USB mics open fast enough that we prefer releasing the
        // device (and macOS orange mic indicator) between dictations.
        if self.stream.is_some() {
            if default_input_is_bluetooth() {
                *self.is_recording.lock().unwrap() = true;
                return Ok(());
            }
            self.stream = None;
        }

        *self.is_recording.lock().unwrap() = false;
        self.open_stream()?;
        *self.is_recording.lock().unwrap() = true;
        Ok(())
    }

    /// Pre-open the input stream only when the default mic is Bluetooth.
    /// Built-in / wired mics skip this so macOS does not show the permanent
    /// orange "mic in use" indicator while Parrot is idle.
    pub fn warm_up(&mut self) -> Result<()> {
        if !default_input_is_bluetooth() {
            // Drop any leftover stream if the user switched away from BT.
            self.stream = None;
            return Ok(());
        }
        if self.stream.is_some() {
            return Ok(());
        }
        self.open_stream()
    }

    fn open_stream(&mut self) -> Result<()> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or_else(|| anyhow::anyhow!("No input device available"))?;

        let config = device.default_input_config()?;
        self.sample_rate = config.sample_rate().0;
        self.channels = config.channels();

        let samples = self.samples.clone();
        let is_recording = self.is_recording.clone();

        let channels = self.channels as usize;
        let stream = device.build_input_stream(
            &config.into(),
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if !*is_recording.lock().unwrap() {
                    // Warm path: discard samples so the device stays open.
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

    /// Stop capturing and return raw mono `f32` samples plus the device
    /// sample rate. Keeps the input stream open **only for Bluetooth** so
    /// the next dictation does not re-pay codec negotiation. Built-in /
    /// USB mics release the stream so the orange mic indicator goes away.
    /// Callers that need WAV (save-audio) should encode via
    /// [`encode_wav`]; local whisper takes the floats directly so we avoid
    /// an f32 → i16 → f32 round trip on the hot path.
    pub fn stop(&mut self) -> Result<RecordedSamples> {
        *self.is_recording.lock().unwrap() = false;
        if !default_input_is_bluetooth() {
            self.stream = None;
        }

        let mut samples = self.samples.lock().unwrap();
        let out = RecordedSamples {
            samples: std::mem::take(&mut *samples),
            sample_rate: self.sample_rate,
        };
        Ok(out)
    }

    /// Fully tear down the input stream (app exit / device change).
    pub fn shutdown(&mut self) {
        *self.is_recording.lock().unwrap() = false;
        self.stream = None;
        self.samples.lock().unwrap().clear();
    }

    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }

    /// Copy only the recent mono audio needed for a preview. The full capture
    /// remains owned by the recorder until `stop` transfers it to the caller.
    pub fn snapshot_tail(&self, max_seconds: u32) -> CaptureSnapshot {
        let sample_rate = self.sample_rate.max(1);
        let max_samples = (sample_rate as usize).saturating_mul(max_seconds as usize);
        let capture = self.samples.lock().unwrap();
        let total_samples = capture.len();
        let start = total_samples.saturating_sub(max_samples);
        CaptureSnapshot {
            audio: RecordedSamples {
                samples: capture[start..].to_vec(),
                sample_rate,
            },
            total_samples,
        }
    }
}

/// Total length is independent of the bounded tail so growth checks continue
/// to work after the preview window fills.
pub struct CaptureSnapshot {
    pub audio: RecordedSamples,
    pub total_samples: usize,
}

/// Mono float samples captured from the mic, still at the device sample rate.
pub struct RecordedSamples {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
}

impl RecordedSamples {
    pub fn encode_wav(&self) -> Result<Vec<u8>> {
        encode_wav(&self.samples, self.sample_rate)
    }

    /// Write incrementally instead of constructing another full WAV in RAM.
    pub fn save_wav(&self, path: &std::path::Path) -> Result<()> {
        let file = std::io::BufWriter::new(std::fs::File::create(path)?);
        write_wav(file, &self.samples, self.sample_rate)
    }
}

pub fn encode_wav(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>> {
    let mut buf = std::io::Cursor::new(Vec::new());
    write_wav(&mut buf, samples, sample_rate)?;
    Ok(buf.into_inner())
}

fn write_wav<W: std::io::Write + std::io::Seek>(
    writer: W,
    samples: &[f32],
    sample_rate: u32,
) -> Result<()> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::new(writer, spec)?;
    for &sample in samples {
        let s = (sample * 32767.0).clamp(-32768.0, 32767.0) as i16;
        writer.write_sample(s)?;
    }
    writer.finalize()?;
    Ok(())
}

#[derive(Clone)]
pub struct CompletedRecording {
    pub audio: Arc<RecordedSamples>,
    pub duration_ms: u64,
}

/// Keep failed/cancelled requests retryable without copying PCM. A completed
/// request may only clear its own recording, never a newer capture.
#[derive(Default)]
pub struct RecordingCache(Mutex<Option<CompletedRecording>>);

impl RecordingCache {
    pub fn store(&self, audio: RecordedSamples, duration_ms: u64) {
        *self.0.lock().unwrap() = Some(CompletedRecording {
            audio: Arc::new(audio),
            duration_ms,
        });
    }

    pub fn get(&self) -> Option<CompletedRecording> {
        self.0.lock().unwrap().clone()
    }

    pub fn clear(&self) {
        self.0.lock().unwrap().take();
    }

    pub fn release_completed(&self, audio: &Arc<RecordedSamples>) {
        let mut current = self.0.lock().unwrap();
        if current
            .as_ref()
            .is_some_and(|r| Arc::ptr_eq(&r.audio, audio))
        {
            current.take();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn completed_recordings_share_pcm_and_only_release_their_own_cache_entry() {
        let cache = RecordingCache::default();
        cache.store(
            RecordedSamples {
                samples: vec![0.25; 100],
                sample_rate: 16_000,
            },
            6,
        );
        let first = cache.get().unwrap();
        let retry = cache.get().unwrap();
        assert!(Arc::ptr_eq(&first.audio, &retry.audio));
        assert_eq!(retry.duration_ms, 6);
        let weak = Arc::downgrade(&first.audio);
        cache.store(
            RecordedSamples {
                samples: vec![0.5; 200],
                sample_rate: 16_000,
            },
            12,
        );
        cache.release_completed(&first.audio);
        let newer = cache.get().unwrap();
        assert_eq!(newer.duration_ms, 12);
        assert_eq!(newer.audio.samples, vec![0.5; 200]);
        drop((first, retry));
        assert!(weak.upgrade().is_none());
        cache.release_completed(&newer.audio);
        assert!(cache.get().is_none());
        // Jobs already holding the Arc remain valid after release.
        assert_eq!(newer.audio.samples.len(), 200);
    }

    #[test]
    fn saved_wav_matches_legacy_encoded_bytes() {
        let audio = RecordedSamples {
            samples: vec![-1.1, -0.5, 0.0, 0.25, 1.1],
            sample_rate: 44_100,
        };
        let path = std::env::temp_dir().join(format!("parrot-wav-{}.wav", uuid::Uuid::new_v4()));
        audio.save_wav(&path).unwrap();
        let saved = std::fs::read(&path).unwrap();
        std::fs::remove_file(path).unwrap();
        assert_eq!(saved, audio.encode_wav().unwrap());
    }

    #[test]
    fn preview_tail_handles_window_boundaries_at_device_rates() {
        for rate in [16_000, 44_100, 48_000, 96_000] {
            let mut recorder = AudioRecorder::new().unwrap();
            recorder.begin_fixture(rate);
            assert!(recorder.snapshot_tail(20).audio.samples.is_empty());
            let window = rate as usize * 20;
            let source: Vec<f32> = (0..window + 1).map(|i| i as f32).collect();
            recorder.push_fixture(&source[..window - 1]);
            assert_eq!(
                recorder.snapshot_tail(20).audio.samples,
                source[..window - 1]
            );
            recorder.push_fixture(&source[window - 1..window]);
            assert_eq!(recorder.snapshot_tail(20).audio.samples, source[..window]);
            recorder.push_fixture(&source[window..]);
            let snapshot = recorder.snapshot_tail(20);
            assert_eq!(snapshot.audio.sample_rate, rate);
            assert_eq!(snapshot.total_samples, window + 1);
            assert_eq!(snapshot.audio.samples, source[1..]);
            assert!(recorder.snapshot_tail(0).audio.samples.is_empty());
            assert_eq!(recorder.stop().unwrap().samples, source);
        }
    }

    #[test]
    fn long_capture_keeps_growing_and_preserves_final_audio_during_previews() {
        let mut recorder = AudioRecorder::new().unwrap();
        let rate = 48_000;
        recorder.begin_fixture(rate);
        // Five minutes of distinguishable samples; snapshots must stay at 20s.
        let source: Vec<f32> = (0..rate as usize * 300).map(|i| i as f32).collect();
        recorder.push_fixture(&source);
        let first = recorder.snapshot_tail(20);
        assert_eq!(first.total_samples, source.len());
        assert_eq!(first.audio.samples.len(), rate as usize * 20);
        assert_eq!(first.audio.samples.capacity(), rate as usize * 20);
        assert_eq!(
            first.audio.samples,
            source[source.len() - rate as usize * 20..]
        );

        // The callback shares this exact mutex. Concurrent appends must not be
        // lost, and each snapshot must describe one consistent capture prefix.
        let capture = recorder.samples.clone();
        let initial_len = source.len();
        let producer = std::thread::spawn(move || {
            for i in 0..200 {
                let chunk: Vec<f32> = (initial_len + i * 480..initial_len + (i + 1) * 480)
                    .map(|j| j as f32)
                    .collect();
                capture.lock().unwrap().extend_from_slice(&chunk);
                std::thread::yield_now();
            }
        });
        for _ in 0..100 {
            let snapshot = recorder.snapshot_tail(20);
            assert_eq!(snapshot.audio.samples.len(), rate as usize * 20);
            let start = snapshot.total_samples - snapshot.audio.samples.len();
            assert!(snapshot
                .audio
                .samples
                .iter()
                .enumerate()
                .all(|(i, &s)| s == (start + i) as f32));
            std::thread::yield_now();
        }
        producer.join().unwrap();
        let last = recorder.snapshot_tail(20);
        assert_eq!(last.total_samples - first.total_samples, 200 * 480);
        let final_audio = recorder.stop().unwrap();
        assert_eq!(final_audio.samples.len(), source.len() + 200 * 480);
        assert_eq!(final_audio.samples[..source.len()], source);
        assert!(final_audio
            .samples
            .iter()
            .enumerate()
            .all(|(i, &s)| s == i as f32));
        assert!(recorder.snapshot_tail(20).audio.samples.is_empty());
    }
}

/// True when the system default input device uses a Bluetooth transport.
/// Used to decide whether to keep a warm mic stream (BT pays codec
/// negotiation on open; built-in / USB do not).
fn default_input_is_bluetooth() -> bool {
    #[cfg(target_os = "macos")]
    {
        macos_default_input_is_bluetooth()
    }
    #[cfg(not(target_os = "macos"))]
    {
        // No permanent warm on other platforms for now.
        false
    }
}

#[cfg(target_os = "macos")]
fn macos_default_input_is_bluetooth() -> bool {
    use std::os::raw::c_void;

    type AudioObjectID = u32;
    type OSStatus = i32;

    #[repr(C)]
    struct AudioObjectPropertyAddress {
        m_selector: u32,
        m_scope: u32,
        m_element: u32,
    }

    // FourCC helpers (big-endian packing of ASCII tags).
    const fn fourcc(a: u8, b: u8, c: u8, d: u8) -> u32 {
        ((a as u32) << 24) | ((b as u32) << 16) | ((c as u32) << 8) | (d as u32)
    }

    // kAudioObjectSystemObject
    const SYSTEM_OBJECT: AudioObjectID = 1;
    // kAudioObjectPropertyScopeGlobal / kAudioObjectPropertyElementMain
    const SCOPE_GLOBAL: u32 = fourcc(b'g', b'l', b'o', b'b');
    const ELEMENT_MAIN: u32 = 0;
    // kAudioHardwarePropertyDefaultInputDevice
    const DEFAULT_INPUT_DEVICE: u32 = fourcc(b'd', b'I', b'n', b' ');
    // kAudioDevicePropertyTransportType
    const TRANSPORT_TYPE: u32 = fourcc(b't', b'r', b'a', b'n');
    // kAudioDeviceTransportTypeBluetooth / BluetoothLE
    const TRANSPORT_BLUETOOTH: u32 = fourcc(b'b', b'l', b'u', b'e');
    const TRANSPORT_BLUETOOTH_LE: u32 = fourcc(b'b', b'l', b'l', b'e');

    #[link(name = "CoreAudio", kind = "framework")]
    extern "C" {
        fn AudioObjectGetPropertyData(
            in_object_id: AudioObjectID,
            in_address: *const AudioObjectPropertyAddress,
            in_qualifier_data_size: u32,
            in_qualifier_data: *const c_void,
            io_data_size: *mut u32,
            out_data: *mut c_void,
        ) -> OSStatus;
    }

    unsafe {
        let default_addr = AudioObjectPropertyAddress {
            m_selector: DEFAULT_INPUT_DEVICE,
            m_scope: SCOPE_GLOBAL,
            m_element: ELEMENT_MAIN,
        };
        let mut device_id: AudioObjectID = 0;
        let mut size = std::mem::size_of::<AudioObjectID>() as u32;
        let status = AudioObjectGetPropertyData(
            SYSTEM_OBJECT,
            &default_addr,
            0,
            std::ptr::null(),
            &mut size,
            &mut device_id as *mut _ as *mut c_void,
        );
        if status != 0 || device_id == 0 {
            return false;
        }

        let transport_addr = AudioObjectPropertyAddress {
            m_selector: TRANSPORT_TYPE,
            m_scope: SCOPE_GLOBAL,
            m_element: ELEMENT_MAIN,
        };
        let mut transport: u32 = 0;
        size = std::mem::size_of::<u32>() as u32;
        let status = AudioObjectGetPropertyData(
            device_id,
            &transport_addr,
            0,
            std::ptr::null(),
            &mut size,
            &mut transport as *mut _ as *mut c_void,
        );
        if status != 0 {
            return false;
        }

        transport == TRANSPORT_BLUETOOTH || transport == TRANSPORT_BLUETOOTH_LE
    }
}
