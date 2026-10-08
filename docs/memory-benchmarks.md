# Memory benchmarks

Use these workloads before and after changing model loading, audio buffers,
preview scheduling, or inference. Measure the desktop app, cleanup sidecar,
and its WebKit processes together. Run one benchmark at a time.

## Run the automated macOS benchmark

Requirements: macOS 10.15+, Python 3, Bun, Rust, and already-downloaded STT and
cleanup models. No model downloads occur during a benchmark. The sampler uses
macOS's `proc_pid_rusage` V4 memory ledgers. Its optional responsibility APIs
must be available for automated WebKit attribution; otherwise use the manual
workflow below and document missing coverage.

From the repository root:

```sh
bun run --cwd apps/desktop build
cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --release -p parrot-cleanup-sidecar
cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --release -p parrot --features memory-bench,tauri/custom-protocol
cp apps/desktop/scripts/memory-benchmark.example.json /tmp/parrot-memory-config.json
```

Set the model paths in `/tmp/parrot-memory-config.json` to absolute local paths.
Remove the three `switch_*` entries if the alternate models are unavailable.
Keep the same configuration for comparisons, including fixture durations and
idle periods. The runner writes the event path into its copy of this config.

```sh
python3 apps/desktop/scripts/memory-benchmark.py \
  --app apps/desktop/src-tauri/target/release/parrot \
  --sidecar apps/desktop/src-tauri/target/release/cleanup-sidecar \
  --config /tmp/parrot-memory-config.json \
  --build-label release-memory-bench \
  --out /tmp/parrot-memory-before-1
```

Repeat with new output directories. Use at least two fresh-process runs per
model pair for initial comparisons; use three or more to establish release
thresholds. Do not run Cargo builds or other inference while recording.
Record background applications and system pressure; an otherwise quiet
machine gives a stronger comparison. Do not kill another app to improve a
result. Use an actual target device before claiming support for its RAM tier.

`memory-bench` is an opt-in Cargo feature. Ordinary builds contain none of the
workload hooks. In benchmark mode, the real app windows and native plugins run,
but microphone input, hotkey registration, and paste/clipboard writes are
skipped. Synthetic PCM enters the ordinary recorder buffer and preview loop.
The ordinary dictation and file-import commands run against a database and
attachment directory under the output directory's `app-data/`. The user's
database, profile, history, and audio files are not changed. WebKit may use
its normal caches. Do not use this feature for a shipped app.

The launcher uses the same private `responsibility_spawnattrs_setdisclaim`
attribute used by [LLDB](https://lldb.llvm.org/cpp_reference/PosixSpawnResponsible_8h_source.html)
so the launched app owns its WebKit helpers. It verifies that ownership and
fails automated runs with no attributed WebKit process. A shell launch without
this attribute can attribute XPCs to the terminal or agent instead. The sampler
never includes unrelated WebKit processes merely because their names match.
Private attribution APIs may change; an unavailable API is not zero memory.

## Fixed workload

| Scenario | Work performed | Comparison |
| --- | --- | --- |
| Startup | Real windows/plugins; configure demand-loaded speech and cleanup | Configuration latency; simultaneous tree peak |
| Ready idle | 10 seconds with speech and cleanup unloaded | Median/peak footprint before inference |
| Cold dictation | First inference on synthetic English audio; speech loading and blocking cleanup including cold loads | Total latency, STT/cleanup phase memory, source words retained |
| Capture/previews | About 11 seconds of real-time PCM replay plus a 2-second hold | Full recorder/preview allocation path; emitted text and first-preview latency |
| Warm dictations | 10 alternating English/French dictations; 1-second idle each | Latency, content checks, retained growth after each operation |
| After repeats | 10 seconds idle | Residency after allocations have warmed |
| Model switch | Select already-local alternate speech and cleanup paths without loading them | Selection latency, release peak, 10-second alternate idle |
| Model restore | Restore the original pair | Include allocations retained across switches |
| Long import | At least 120 seconds of varied synthetic English speech through the file-path command | Streaming decoder/chunk buffers, STT peak, source-topic coverage |
| Post import | 10 seconds idle after the import returns | Retained buffers and inference resources |
| Post idle | 60 seconds with production idle/off policy | Which models remain loaded; sustained footprint |

Long import disables cleanup and releases its cached sidecar so context/token limits cannot confound the
STT memory measurement. Short dictations measure blocking cleanup separately.

For speech idle release and reload checks, add `"speech_lifecycle_checks": true`
and keep at least 65 seconds of combined post-import idle. This adds a separate
released-idle snapshot and a final dictation that reloads speech. To compare
sequential residency, repeat with `"stt_release_before_cleanup": true`.
See the [speech memory policy](speech-memory-policy.md). Speech defaults to a
60-second idle timeout. First transcription includes model loading, and model
switches now select paths without eagerly loading them.

For cleanup release checks, add `"cleanup_lifecycle_checks": true` to the config.
This adds disabled dictation, 65-second idle release under the default policy,
a post-release idle phase, reload, failed model loading, and recovery. See the
[cleanup memory policy](cleanup-memory-policy.md). Historical ISSUE-1057 traces
used eager cleanup loading; their model-switch phases loaded both models.
The new policy changes residency and cold latency, so label comparisons clearly.
The full long reference is included even when a smoke configuration requests
less than its duration. The final event records the actual audio duration.
Switching uses the same path-selection and release operations as Settings,
without model downloads. Alternate models load only if inference needs them.

The first dictation includes demand loading and cold **inference**. OS file caches
are uncontrolled: model SHA-256 collection reads the files before launch.
These are not power-on cold-disk measurements. Capture hardware/codec startup,
Bluetooth warm-up, GPU driver caches, paste latency, updater activity, and
network downloads need separate manual measurements when relevant.

## Output and accounting

- `metadata.json`: revision, dirty working tree, hardware/RAM, OS, requested
  sample interval, build label, model sizes/hashes, config, PID and ownership.
- `samples.jsonl`: timestamps, per-process identity/start time, physical
  footprint, RSS, page-ins, and lifetime peak; simultaneous tree totals.
- `system.jsonl`: `vm_stat`, swap usage, and memory pressure level each second.
- `events.jsonl`: scenario boundaries, actual durations, source words,
  transcripts, cleanup output, preview text/timing, and quality flags.
- `summary.json`: per-phase median/peak, role peaks, observed sample gaps,
  attributed WebKit PIDs, quality failures, and completion status.
- `*-footprint.txt`: native category snapshots during idle phases, including
  dirty, clean, reclaimable, mapped, and graphics memory where available.
- `app.log` and `app-data/`: native inference logs and isolated test history.

The primary total is the **sum of current per-process physical-footprint
ledgers at one sample time**. Each PID is included once. Its peak is the maximum
of those simultaneous sums. Do not add independently observed process/role
peaks, or historical lifetime peaks, to produce an app peak.

[Apple's memory accounting explanation](https://developer.apple.com/videos/play/wwdc2022/10106/)
describes footprint as dirty memory plus compressed/swapped memory charged at
its uncompressed size, including accessed Metal resources on Apple Silicon.
Clean mapped files can be resident while excluded from footprint. Shared
regions are charged by the OS ledger to their owner; do not add model file
sizes, `vmmap` virtual region sizes, RSS, or another GPU estimate to the ledger
total. The total is an app accounting measure, not an exact change in all
system-used RAM. Keep native category snapshots and system pressure alongside
it because mapped model pages and system resources still affect performance.

RSS is reported separately and includes resident shared/clean pages; summing
RSS can double-count shared mappings and omits compressed/swapped pages. It is
diagnostic, not the budget metric. Incomplete samples are excluded from peaks
and counted explicitly. A 100 ms target interval can miss short simultaneous
peaks. Check actual sample gaps and each process's lifetime peak for evidence
of missed spikes; use Instruments/VM Tracker for finer attribution if needed.

Quality checks require distinctive source words to survive STT and cleanup;
long-import keywords span all 12 source sentences. Every complete repetition
of the long reference must retain each keyword; the partial tail is excluded
from the minimum count. Preview coverage fails if
no preview was emitted. The runner exits nonzero on quality failures,
incomplete workloads, or missing WebKit coverage, while retaining the data.
These checks detect major omissions and language/content changes; they are
not WER, a semantic evaluation, or proof that unchanged cleanup improved text.
Keep the broader multilingual evaluation in ISSUE-1050 as a separate gate.

To apply the current quality/accounting checks to saved raw data, without
running inference again:

```sh
python3 apps/desktop/scripts/memory-benchmark.py --summarize /tmp/parrot-memory-before-1
```

For retained growth, compare medians of `warm_01_idle` through `warm_10_idle`,
excluding startup/cold allocation growth. Report first/last, maximum, and
the trend rather than declaring every retained allocation a leak. Compare
post-import idle separately: its workload and allocator high-water marks differ.

## Manual capture and optional Ollama

For native allocation attribution, launch a separate diagnostic run with
`--allocation-phase post_import_idle --allocation-phase speech_released_idle`.
The second phase requires `speech_lifecycle_checks=true`. This enables macOS
`MallocStackLogging` in the launched app and saves `*-heap.txt` and
`*-allocations.txt` reports, in addition to footprint snapshots. The reports
identify live allocation sizes and native call stacks before/after release.
This option does not instrument an existing process. Stack logging and heap
inspection add overhead; use ordinary, uninstrumented repeated runs to compare
memory and latency. A missing or failed native report is not evidence of zero
allocations. Check report headers and retain complete raw diagnostic output.

To compare Parakeet execution providers, set `"parakeet_accelerator": "cpu"`
or `"auto"` in the benchmark config. The override is applied before the first
model load and reported in the startup event. It is available only in benchmark
builds. With no override, macOS uses the production CPU policy for INT8 Parakeet;
other platforms retain automatic provider selection.

Normally launch the app, find its main PID, and attach without changing it:

```sh
python3 apps/desktop/scripts/memory-benchmark.py \
  --pid 12345 --label capture_previews --duration 60 \
  --build-label release-0.2.5 --out /tmp/parrot-memory-manual-capture
```

Repeat for startup (launch while observing with Instruments), ready idle,
physical microphone capture, dictation, cleanup, switching, import and idle.
Use the same recordings and note exact action times/build/settings. Inspect
attributed WebKit PIDs; missing ownership means the run is incomplete.

For legacy Ollama, explicitly add its daemon PID with `--extra-pid 23456`.
The sampler includes its runner descendants and deduplicates overlapping
roots. It never auto-includes every Ollama instance on the machine. Query
`http://localhost:11434/api/ps` before/after and record the model, quantization,
context, residency, and latency. A shared daemon's other models must be listed
as a confounder, not silently charged to Parrot. These measurements do not
unload models belonging to another app. Ollama runs are a separate matrix from
built-in cleanup; do not compare their totals without stating the difference.

## Validate the tooling

```sh
python3 -m unittest discover -s apps/desktop/scripts -p 'test_memory_benchmark.py'
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked -p parrot --lib
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked -p parrot --lib --features memory-bench,tauri/custom-protocol
```

Accounting regressions cover launchd-parented XPC attribution, exclusion of
other apps, descendant discovery, duplicate roots, simultaneous peaks, and
incomplete samples. Actual release-app runs are required to validate native
ownership, engine loading, event stages, sidecar cleanup and quality checks.

## Isolate preview copies and capture-lock contention

Previews copy at most 20 seconds of mono audio at the device sample rate.
The snapshot reports total capture length separately; final transcription
still receives the full recording. At 48 kHz, the preview vector contains at
most 960,000 floats (3,840,000 bytes), independent of recording duration.
Prepared/resampled inference buffers and the full recording are separate.

The opt-in Rust test benchmark compares the old full-snapshot-plus-tail copies
with the bounded snapshot in fresh native processes. It fills 1-, 5-, and
10-minute captures, measures live vector capacities and macOS physical
footprint, and stresses the capture mutex with 10 ms appends and previews every
10 ms (production attempts previews every 900 ms). All appended samples must
survive `stop()`. Capture capacity is reserved up front to isolate preview
copies from recording-vector growth. No speech model is loaded.

```sh
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked \
  --release -p parrot --lib --no-run --message-format=json > /tmp/parrot-preview-tests.jsonl
python3 - <<'PY'
import json, subprocess
from pathlib import Path
records = [json.loads(line) for line in Path('/tmp/parrot-preview-tests.jsonl').read_text().splitlines()]
binary, = [r['executable'] for r in records if r.get('reason') == 'compiler-artifact'
           and r.get('profile', {}).get('test') and r.get('target', {}).get('name') == 'parrot_lib']
subprocess.run(['python3', 'apps/desktop/scripts/preview-buffer-benchmark.py',
                '--test-binary', binary, '--out', '/tmp/parrot-preview-copies'], check=True)
PY
```

The output includes native test logs, per-process footprint samples, copy and
callback timings, binary hash, hardware, and revision. This compares two paths
inside one test binary; it is not a whole-app before/after measurement. Timing
and footprint samples can miss short spikes. Use the regular app benchmark
to check preview events, final transcripts, and total app footprint. Synthetic
callback contention does not validate a physical microphone or Bluetooth codec.

For a copy-frequency comparison at the normal preview interval, pass
`--seconds 300 --interval-ms 900 --copies 10` to the Python runner, using a
different output directory. Allocator retention during the 10 ms stress run
can greatly exceed live vector capacity; do not present its process peak as
normal app memory savings.

## Streaming import and recording checks

The [audio policy](audio-memory-policy.md) describes shared capture ownership,
retry/release behavior, streaming WAV saving, and bounded import/recording PCM.
The [ISSUE-1056 report](benchmarks/2026-10-08-audio-streaming.md) includes codec
checks, repeated buffer measurements, app comparisons, and known baseline failures.

Generate synthetic test inputs with an installed ffmpeg (development only):

```sh
python3 apps/desktop/scripts/generate-import-fixtures.py \
  --out /tmp/parrot-import-fixtures --long-seconds 120 1200
PARROT_TEST_IMPORT_DIR=/tmp/parrot-import-fixtures \
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked -p parrot --lib \
  supported_formats_match_batch_decode_and_resampling -- --ignored --nocapture
PARROT_TEST_IMPORT_DIR=/tmp/parrot-import-fixtures \
PARROT_TEST_STT_MODEL=/absolute/path/to/Whisper.bin-or-Parakeet-directory \
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked -p parrot --lib \
  real_streamed_imports_preserve_languages_and_long_topic_order -- --ignored --nocapture
```

Build release Rust tests with `--no-run --message-format=json` as in the preview
copy instructions. Pass the `parrot_lib` test executable to:

```sh
python3 apps/desktop/scripts/import-buffer-benchmark.py \
  --test-binary /absolute/path/to/parrot_lib-test-executable \
  --files /tmp/parrot-import-fixtures/long-120s.wav /tmp/parrot-import-fixtures/long-1200s.wav \
  --out /tmp/parrot-import-buffers
```

This compares old/new audio-buffer paths in fresh native processes with no speech
model. Source fingerprints, counts, chunk tags, samples, and footprint peaks are
retained. Its artificial 500 ms inference-stage hold is not app latency. Use the
ordinary memory runner for total app/sidecar/WebKit measurements. Long Whisper
baseline omission/repetition must remain a failed quality gate in comparisons.

Add `"recording_lifecycle_checks": true` to a benchmark config for missing-model
failure/retry, completed PCM release, streaming saved-WAV equivalence, malformed
import recovery, and original byte attachment checks. Benchmark builds also emit
import buffer statistics. These are synthetic tests; they do not open a microphone
or establish target-hardware support. The normal dictation/import commands and
isolated history/attachment directories are used.

## Baseline and proposed targets

See the dated report in `docs/benchmarks/` for measured results, limitations,
and proposed thresholds. A proposed RAM tier is a device-validation target,
not an untested compatibility claim. Memory optimizations must retain source
content and be compared with the same model pair, build, scenarios, and cache
conditions; a smaller but truncated transcript is not a successful result.

## Low-memory mode checks

Build the ordinary `memory-bench,tauri/custom-protocol` app and set
`"low_memory_mode": true` in the isolated benchmark config. No models are
switched or downloaded automatically. Compare mode off/on using the same model
pair, fixture duration and idle periods, with two fresh processes per setting.
A 35-second post-import idle exposes the mode's 30-second timeout while the
normal 60-second policy still retains speech. Keep cleanup off during the long
import so short dictations measure the cleanup residency policy separately.

Low-memory runs require **zero** emitted previews and no recording prewarm;
ordinary runs still require real preview output. The report's preview coverage
result denotes the configured policy, so inspect `capture_previews` for the
actual count.

For a separate full regression run, enable `"low_memory_checks": true`,
`"speech_lifecycle_checks": true`, `"cleanup_lifecycle_checks": true` and
`"recording_lifecycle_checks": true`. Use at least 65 seconds of combined
post-import idle. This checks mode changes during native load/inference in both
directions, on-disk preference persistence, restored normal preferences,
Ollama raw-text fallback, failed built-in cleanup and recovery, idle speech
release/reload, completed PCM release, failed speech retry, saved WAV and original
byte attachments. Policy changes in this run intentionally change residency;
report it separately from fixed-mode memory comparisons.

See [low-memory mode](low-memory-mode.md) for behavior and device-validation limits.
