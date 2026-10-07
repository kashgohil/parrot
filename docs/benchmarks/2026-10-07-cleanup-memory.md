# Cleanup demand loading and idle release — ISSUE-1052

Two fresh release-app runs reduced simultaneous process-tree physical footprint
by **112.6 and 112.9 MiB** after cleanup idle release. Startup and cleanup Off
had no cleanup sidecar. Warm requests reused one process; requests after idle
loaded a new PID. Failed model loading preserved the original transcript, and
the next request after restoring the model succeeded.

## Reproduction

Use the [benchmark workflow](../memory-benchmarks.md) with the
[cleanup lifecycle checks](../cleanup-memory-policy.md):

```json
{
  "stt_engine": "whisper",
  "stt_model": "/absolute/path/to/ggml-large-v3-turbo-q5_0.bin",
  "cleanup_model": "/absolute/path/to/qwen2.5-0.5b-instruct-q4_k_m.gguf",
  "switch_cleanup_model": "/absolute/path/to/qwen2.5-1.5b-instruct-q4_k_m.gguf",
  "repeats": 10,
  "idle_seconds": 5,
  "post_idle_seconds": 5,
  "long_import_seconds": 30,
  "cleanup_lifecycle_checks": true
}
```

Measured native source: `4db5201`, release build with
`memory-bench,tauri/custom-protocol`, release cleanup sidecar, compiled frontend.
The final policy validation changes in `f577c5f` add invalid-setting handling and
selected-model availability checks; the default measured lifecycle is unchanged.
Run 2's working tree also contained documentation and formatting edits that were
not in the running executable. A final release smoke test checks the final build.

Hardware and toolchain match the [ISSUE-1057 baseline](2026-10-07-memory-baseline.md):
Apple M4 Pro, Mac16,7, 24 GiB unified RAM; macOS 26.6.2/25G83; rustc/Cargo 1.96.1,
SDK 26.2. Auto language, Neutral blocking cleanup, no custom words or style.
Other apps, including the installed Parrot, remained open. No other benchmark
or model inference ran concurrently. OS file caches were uncontrolled and model
hashing warmed them. Host pressure stayed normal, but pre-existing global used
swap was about 7.7–8.4 GiB. Those counters do not attribute swap to Parrot.

The scenario adds a disabled dictation before the first eligible cleanup,
10 warm English/French dictations, 65 seconds for the default idle policy,
a post-release idle snapshot, reload, intentional load failure, and recovery.
Selecting the 1.5B cleanup model and restoring 0.5B now leaves both unloaded
until needed. The requested 30-second import uses one complete 50.568-second
source reference, which is the harness minimum. Cleanup is Off for the import.

## Memory and latency

Memory values are MiB (2^20 bytes). Tree values are medians of simultaneous
physical-footprint sums; role medians are calculated separately from those same
samples. They must not be added as independent peaks.

| Measurement | Run 1 | Run 2 |
| --- | ---: | ---: |
| Ready idle, cleanup unloaded | 716.1 | 711.1 |
| Warm idle after 10 dictations | 918.9 | 890.5 |
| Idle after cleanup release | 806.3 | 777.6 |
| Tree reduction after release | **112.6** | **112.9** |
| Cleanup role before release | 116.0 | 104.4 |
| Cleanup role after release | **0** | **0** |
| Idle after demand reload | 918.9 | 889.0 |
| Main app before / after release | 661.6 / 662.0 | 648.6 / 648.6 |

The cleanup process disappears, and the main app's footprint is almost unchanged.
WebKit changes account for the difference between the sidecar's footprint and
net tree reduction. These are ownership and process-release savings, rather
than a claim that the model's entire on-disk size equals resident memory.

| Latency, seconds | Run 1 | Run 2 |
| --- | ---: | ---: |
| First eligible cleanup dictation, total | 7.289 | 1.318 |
| Its cleanup phase, including load and inference | 6.476 | 0.394 |
| Warm dictation median | 0.938 | 0.944 |
| Warm dictation p95, nearest rank | 0.977 | 0.988 |
| Dictation after idle reload, total | 1.513 | 1.283 |
| Its cleanup phase, including load and inference | 0.553 | 0.392 |
| Failed-load dictation, returning original | 0.840 | 0.868 |
| Successful recovery dictation | 1.176 | 1.215 |

The first cold cleanup varied substantially. These traces do not isolate model
loading from inference, shader setup, or host effects, so the cause of the slow
first run is not established. Idle release trades memory for a future cold
cleanup; Settings offers **Keep warm after first use** when that latency matters.
Demand loading also avoids paying cleanup load cost at startup or when unused.

## Evidence and limits

[results.json](2026-10-07-cleanup-memory/results.json) contains configuration,
model/fixture hashes, per-role medians, full phase summaries, transcripts,
latency stages, quality flags, and archive hashes. The two adjacent `.jsonl.gz`
files preserve timestamped samples, events, system counters and native footprint
reports, with local home/run paths sanitized. They contain 1,552 and 1,460 samples,
zero incomplete samples, and four attributed WebKit PIDs per run. The sampler
verified the app's responsibility ownership. Sampling p95 was 108–109 ms; the
largest gap was 144 ms.

All 32 transcript results and both preview coverage checks passed the source-word
gates. All 26 successful cleanup outputs were unchanged grammatical fixture
text. That verifies preservation, not improved polishing. The shorter import
passed its single-reference count gate; it does **not** resolve the earlier
120-second Whisper repetition-loss finding tracked in ISSUE-1050.

Validation also passed 27 regular Rust tests under default and benchmark
features, real-sidecar lifecycle tests with both 0.5B and 1.5B models, frontend
TypeScript/build checks, and the final release build/smoke. Startup-error tests
verify child exit/reaping. Coordinator tests cover concurrent load sharing,
active ownership, cancellation, stale model loads, failure/retry and keep-warm.
Settings polling and selection controls were build-checked, without a manual
GUI interaction test.

These runs measure cleanup release on this 24 GiB development machine. They
establish no 8/16 GiB support claim, Parakeet heap improvement, or active
speech-inference peak reduction. ISSUE-1053 remains the next memory priority:
the baseline retained roughly 9.7–9.8 GiB after a Parakeet long import.
