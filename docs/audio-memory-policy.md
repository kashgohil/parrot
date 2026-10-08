# Audio buffer memory policy

Recordings retain one shared mono capture at the device rate for transcription,
retry, and optional saving. An inference job owns its capture until native work
finishes, even when its async caller is cancelled. A successful dictation clears
its cached capture. A failed or cancelled request remains retryable until a new
recording starts or that capture succeeds. Clearing an older request cannot clear
a newer capture; duration and samples are stored together.

Optional saved recording audio is encoded directly into a buffered WAV file.
The legacy `stop_recording` command still returns WAV bytes when requested.
That response requires a WAV byte vector; ordinary hotkey/HUD dictation does not.
Original imported files remain history attachments. File sources are copied to
attachments without loading their encoded contents into a vector. Legacy byte
imports share their existing encoded vector between decoding and attachment
saving; the vector is released after saving. Prefer the native file picker or
path drop for large inputs so encoded bytes do not cross JSON IPC.

Imports decode through Symphonia with the existing supported codecs and track
selection. The decoder downmixes packet data in blocks of at most 4,096 frames.
Linear resampling keeps a global sample position across packets and uses the same
rounding/interpolation as the previous whole-buffer conversion. Inference receives
blocks of at most 4,096 mono samples at 16 kHz, rather than a full decoded file.
Codec packet storage and container metadata are separate allocations; container
indexes and transcript text can still grow with file duration.

Parakeet keeps its 30-second target, three-second energy-search window, and 250 ms
leading/trailing chunk padding. Files of at most 30 seconds keep the direct path
and its original leading-padding behavior. Whisper import chunks target 25
seconds with a three-second search window, keeping each batch below the 30-second
model window. Files of at most 28 seconds keep the direct path. Source-language
and vocabulary preferences remain applied to every Whisper chunk. Translation
stays disabled. Chunks partition the source sequentially without audio overlap
or heuristic text deduplication.

Recorded dictations use the same bounded resampling and chunk policies. Native
16 kHz short recordings are borrowed directly by the owned inference job.
Other device rates resample incrementally; long recordings never construct a
second full prepared-PCM buffer or feed the whole capture into a chunker at once.
The shared original capture remains available until success for retry and saving.

The speech scheduler holds one final-job permit and model lease through decoding
and inference. Preview work cannot overlap an import. A decode or inference error
returns before saving partial transcript/history; corrupt-packet handling and
unsupported-codec errors retain the previous decoder policy. Optional cleanup
runs after transcription and is governed by its existing lifecycle setting.

Full microphone capture still grows with recording length. The 20-second preview
copy is a separate bound; see the [speech policy](speech-memory-policy.md). Bounded
import audio does not bound native model, allocator, WebKit, or transcript memory,
and does not establish support for an 8/16 GiB Mac. Physical microphone, Bluetooth,
and target-device checks remain in ISSUE-1058. Broader accuracy evaluation remains
ISSUE-1050.
