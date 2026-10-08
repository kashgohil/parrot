# Streaming audio buffers — ISSUE-1056

Imports now decode, downmix, resample, and feed inference incrementally. Path
imports no longer read/copy the entire encoded file or construct full decoded
and prepared PCM vectors. Legacy byte imports share one encoded vector through
decoding and attachment saving. Recorded dictations share their original capture,
resample in bounded blocks, and release the cached capture after success. Failed
or cancelled requests remain retryable; successful older jobs cannot clear a
newer recording. Optional recording WAVs write directly to disk.

The isolated 20-minute import test reduces native-process sampled peak footprint
from **828.52–828.74 MiB** to **18.86–24.73 MiB**. This measures audio-buffer code
without speech models or WebKit. It is not a whole-app RAM requirement.

Implementation: `722457c`, `bdac579`, `227ac7c`, `29e8a10`.
[Results, fixture hashes and archive checksums](2026-10-08-audio-streaming/results.json)
accompany 12 compressed evidence archives: ten app runs, one native-buffer
archive, and one validation-log archive. Home paths and output directories are
sanitized. See the [audio memory policy](../audio-memory-policy.md) for ownership,
retry, codec, and chunk behavior.

## Isolated allocation and source conservation

Two fresh release Rust test processes run per path/file, reversing order for
the second repetition. The input files are 120-second and 1,200-second synthetic
varied English WAVs, 48 kHz stereo PCM16. They are generated from the committed
long reference with ffmpeg; hashes and the ffmpeg version are retained. Hashing
warms uncontrolled file caches. No other build/inference runs during sampling.

The legacy branch reproduces path read, byte-cursor copy, whole native-rate mono
accumulation, whole-file resampling, and feeding all PCM into the existing
Parakeet energy chunker. The new branch uses the production streaming path with
the same chunk settings. A model stand-in fingerprints source float samples,
counts them, and reports ordered chunk tags. It retains no audio. Its first call
holds for 500 ms in both paths to expose live inference-stage buffers; elapsed
native-test timings include this artificial hold and are not STT latency.

| Source duration | Legacy sampled peak | Streaming sampled peak | Output samples per run | Chunks per run |
| --- | ---: | ---: | ---: | ---: |
| 2 minutes | 95.33–95.38 MiB | 20.66–22.38 MiB | 1,920,000 | 4 |
| 20 minutes | 828.52–828.74 MiB | 18.86–24.73 MiB | 19,200,000 | 41 |

Sample counts, sample fingerprints, chunk counts, and ordered chunk tags match
across all eight runs. Unit tests also compare source sample vectors exactly
across short/direct, threshold, multi-chunk, and final-remainder cases.

Streaming maximum observed decoded packet capacity is 1,152 frames, resampler
pending input is 1,152 mono samples, and output blocks are at most 4,096 samples
for both durations. Inference staging is bounded by the backend's chunk window,
not total file duration. The old 20-minute native mono capacity is 301,989,888
bytes and prepared PCM capacity is 76,800,000 bytes, before the chunker's own
full-input copy. Process peaks also include allocator high-water effects; they
are not a sum of live vector capacities or evidence of a leak.

The sampler targets 25 ms. Every native sample is complete; observed native
lifetime peaks are retained alongside sampled peaks. Codec packet allocations,
container indexes, encoded byte inputs, transcript text, and native models have
separate costs. The measurements establish removal of full-file PCM scaling;
they do not promise a fixed total app peak for arbitrary files or formats.

## Codec and boundary checks

Generated stereo 44.1 kHz French fixtures exercise WAV, MP3, M4A, MP4, MOV, AAC,
FLAC, OGG, OGA, AIFF, AIF, and CAF. For every extension, both file and shared-byte
sources produce exactly the same downmixed/resampled PCM as the old batch path.
These are representative supported codecs in each container, not a claim that
every codec in those containers is supported. Opus retains its explicit
unsupported error; video-only MP4 retains its no-audio-track error.

Incremental interpolation matches the old global sample positions and final
rounding at 8, 16, 44.1, 48, and 96 kHz, including one-sample packets and EOF.
Native-rate recorded blocks borrow the original samples. Consumer failures
propagate and release the reader's shared encoded bytes.

Parakeet retains its 30-second target, three-second energy search, and 250 ms
chunk-edge padding. Short inputs keep its direct path. Whisper uses a 25-second
target with three-second search, keeping batches within 28 seconds; short inputs
keep the direct path. The same policy applies to recorded dictations and files.
Chunks partition the source once in order; no overlap or text-deduplication
heuristic removes repetitions. Language and vocabulary options remain applied
on every Whisper batch. Silence/accidental-tap behavior remains covered.

On final source `29e8a10`, real Parakeet and Whisper tests preserve short English
and French, then all twelve source topics in order for each of two complete
reference cycles in a 120-second, 48 kHz stereo file. Each engine's transcript
from the equivalent recorded mono capture matches its streamed-file transcript
exactly. Sample conservation does not prove perfect recognition at every word;
broader multilingual/WER evaluation remains ISSUE-1050.

## App comparison and latency tradeoff

Hardware: M4 Pro Mac16,7, 24 GiB RAM, macOS 26.6.2. Other applications, including
installed Parrot, remain open. No other model inference, build, or evidence
compression runs during collection. Model/file/driver caches are uncontrolled;
model hashing reads files before launch. Host pressure/swap counters are retained
as context, not app-attributed memory.

Two fresh processes per version run for each engine in before-1, after-1,
after-2, before-2 order. The retained baseline binary's production code matches
`9b6c238`; comparison app source is `227ac7c`. Final-source recording resampling
and chunk sharing are separately validated on `29e8a10`; import behavior and
short requests in the comparison workload are unchanged by that final step.
Exact executable hashes are recorded. Sampler checkout revisions can differ
from a retained baseline executable's source; use the explicit source notes.

Settings: Parakeet v3 INT8 on CPU or Whisper large-v3-turbo Q5 on Metal;
Qwen2.5 0.5B Instruct Q4_K_M; Auto language; Neutral blocking cleanup; 60-second
model idle policies; sequential residency off. Each comparison includes startup,
cold English dictation, about 11 seconds of real-time preview replay plus a
hold, warm English/French dictations, a 120-second varied English file import
with cleanup Off, and short idle phases. Fixture generation is part of the
import workload. The source file is 16 kHz mono, so these whole-app traces do
not establish the 20-minute stereo buffer savings measured separately above.

| Measurement | Before | After |
| --- | ---: | ---: |
| Parakeet whole-workload peak footprint | 2.759–2.949 GiB | 2.924–2.942 GiB |
| Whisper whole-workload peak footprint | 1.194–1.202 GiB | 1.108–1.197 GiB |
| Parakeet 120-second import | 2.681–2.723 s | 2.652–2.808 s |
| Whisper 120-second import | 4.247–4.462 s | 7.750–8.104 s |
| Parakeet first preview | 1.507–1.513 s | 1.511–1.520 s |
| Whisper first preview | 2.256–2.281 s | 2.257–2.258 s |

Whisper's baseline is faster because it loses/repeats source content: both
baseline runs fail the complete-reference count/order gate. Both streaming runs
pass. This is a correctness/latency tradeoff, not an equivalent-quality speed
comparison. Its first baseline cold request takes 9.459 seconds; later cold
requests take about 1.3–1.4 seconds with uncontrolled caches. Do not attribute
that difference to this source change.

All 24 matched short raw/cleaned transcripts are identical across versions.
Parakeet long-import text also matches across all four runs. Preview coverage
passes throughout. The grammatical short fixtures remain unchanged by cleanup;
this is preservation evidence, not an accuracy improvement for cleanup.
No reliable total-app peak reduction is established for the short Parakeet
workload, which remains dominated by the model. These two-run ranges are initial
comparisons, not release performance thresholds or target-device support claims.

## Final-source validation and evidence

Two additional final-source release-app runs, one per engine, enable
`recording_lifecycle_checks`. They verify missing-model failure retains the same
recording Arc for retry; recovery transcribes that recording; a saved WAV matches
the legacy encoding; successful completion releases the final PCM owner; a
malformed import saves no partial history; and a French byte import retains its
original encoded attachment and source content. Both pass all quality checks.
These smoke runs include one complete 50.568-second import reference, rather
than the 120-second comparison workload. Buffer diagnostic events include both
file and byte imports in these runs; inspect their timestamps/counts separately.

The ten archived app traces contain 2,695 complete samples, no incomplete samples,
a maximum gap of 0.182 seconds, and four attributed WebKit helpers in every run.
App peaks are maximum simultaneous physical-footprint sums, not sums of
independent lifetime peaks. RSS, events, full transcripts, native footprint
snapshots, app logs, and host counters are preserved. The two expected baseline
Whisper quality failures remain in the evidence; they are not reported as passes.

Final default, benchmark-feature, and release Rust suites: 42 passed, 11 opt-in
tests ignored. Explicit format and both real-engine file/recording tests pass.
The release app builds successfully; four accounting/quality regression tests
pass. No frontend code changed. See the [reproduction commands](../memory-benchmarks.md#streaming-import-and-recording-checks).

Physical microphone/Bluetooth behavior and actual 8/16 GiB target-device
validation remain separately tracked in ISSUE-1058. Full original microphone
capture still grows with recording duration for retry/save requirements; decoded
import and prepared recording PCM no longer require full-length extra copies.
