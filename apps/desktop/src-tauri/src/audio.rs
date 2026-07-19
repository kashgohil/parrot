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

    /// Clone of the in-flight capture buffer for streaming partials.
    /// Does not stop recording or clear samples.
    pub fn snapshot(&self) -> RecordedSamples {
        let samples = self.samples.lock().unwrap().clone();
        RecordedSamples {
            samples,
            sample_rate: self.sample_rate.max(1),
        }
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
