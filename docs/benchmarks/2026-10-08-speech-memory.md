# Speech demand loading and idle release — ISSUE-1053

Speech idle release frees **7.39–7.60 GiB** after a two-minute Parakeet import in the
normal warm policy. Released idle still retains roughly 3 GiB, and active
imports still reach roughly 12 GiB. The remaining native allocation problem is
tracked in [ISSUE-1070](https://rezee.app/kash/plan/1070).

Sequential speech/cleanup residency lowers memory between repeated dictations,
but makes them substantially slower. It is optional; the default is demand
loading with a 60-second speech idle timeout and warm reuse between requests.

## Reproduction and evidence

Use the [benchmark workflow](../memory-benchmarks.md) and
[speech memory policy](../speech-memory-policy.md). Two fresh release-app
processes ran per policy, sequentially on the same development machine:

- Apple M4 Pro, Mac16,7, 24 GiB unified RAM; macOS 26.6.2 / 25G83, SDK 26.2;
  rustc/Cargo 1.96.1. Measurements crossed midnight in Asia/Kolkata on October 7–8;
  raw timestamps are UTC/Unix milliseconds.
- Optimized release app with `memory-bench,tauri/custom-protocol`, compiled
  frontend and release cleanup sidecar. Measured native source: `f1b8c75`.
  Later source changes bound model-load waiting, add tests and clarify UI/docs;
  they do not change the successful measured inference policy. Final-source
  native tests and release smoke at `bdfc949` are checked separately.
- Parakeet v3 INT8 ONNX + Qwen2.5 0.5B Instruct Q4_K_M. Auto language,
  Neutral blocking cleanup, no custom vocabulary/style, no saved dictation audio.
- Original baseline workloads: English first dictation, about 11 seconds of
  real-time preview replay plus a two-second hold, 10 alternating English/French
  dictations, model selection/restore, 120-second varied English file import,
  and 10 + 60 seconds of post-import idle. The lifecycle check adds 10 seconds
  of fully released idle and a French reload dictation, followed by 10 seconds idle.
- Model selection changes to local Whisper Turbo Q5_0 + Qwen 1.5B then restores
  Parakeet + Qwen 0.5B. Selection now releases old models and configures paths;
  it does not force loading or inference on the alternate pair.
- Config: `speech_lifecycle_checks=true`; `stt_release_before_cleanup=false`
  or `true`; `cleanup_lifecycle_checks=false`; `repeats=10`, `idle_seconds=10`,
  `post_idle_seconds=60`, `long_import_seconds=120`. Both idle policies use 60 seconds.
  Cleanup is Off during the long import in both policies.

Other applications, including the installed Parrot, remained open. File caches
were uncontrolled and warmed by model hashing. No other model inference or
build ran during these measurements. Host pressure/swap are archived as global
counters, not attributed to Parrot. These are development-machine observations,
not lower-RAM device validation.

The [results JSON](2026-10-08-speech-memory/results.json) contains exact config,
model and fixture hashes, phase summaries, per-role medians, transcripts,
quality flags, latency stages, peak samples and archive hashes. Four adjacent
`.jsonl.gz` archives preserve timestamped samples, events, system counters and
native footprint reports. Home/run paths are sanitized. The launcher verifies
responsibility ownership, and every run includes four attributed WebKit helpers.

## Memory

All values below are GiB (2^30 bytes), with ranges across the two runs per policy.
Idle values are medians of simultaneous current physical-footprint sums.
Whole-trace peaks are the maximum simultaneous sum; independent process lifetime
peaks are never added together.

| Measurement | Warm reuse + idle release | Sequential speech/cleanup |
| --- | ---: | ---: |
| Startup idle, both models unloaded | 0.14–0.15 | 0.15 |
| Idle after 10 warm dictations | 4.03–4.68 | 0.91–1.46 |
| Immediately after 120-second import | 10.61–10.67 | 10.39–10.81 |
| Released idle, 70–80 seconds after import | 3.06–3.22 | 2.99–3.08 |
| Memory freed at idle release | 7.39–7.60 | 7.40–7.73 |
| Idle after the reload dictation | 4.80–4.87 | 3.32–3.40 |
| Whole-trace sampled peak | 11.05–11.82 | 11.33–11.94 |

The post-idle phase straddles the 60-second release deadline. The separate
released-idle phase starts 70 seconds after the import returns, so its median
measures the released state. Event checks show speech and cleanup unloaded;
process samples show no cleanup sidecar. Sequential dictations also assert that
both models are unloaded before returning. Real-model tests verify that a weak
managed-engine handle no longer upgrades after release.

The earlier [ISSUE-1057 baseline](2026-10-07-memory-baseline.md) kept models loaded:
Parakeet retained 9.74–9.84 GiB after idle, with peaks of 10.70–11.13 GiB. The
new runs verify a large reduction in retained footprint, but do **not** show
an active import peak improvement. Ready idle and model-switch behavior differ
from the eager-loaded baseline and must not be treated as identical workloads.

Residual memory is material. In normal run 1, the released main-process native
report still charges 2,815,705,088 bytes to MALLOC_SMALL and 449,904,640 bytes to
MALLOC_LARGE. The owning allocations, allocator fragmentation/cache behavior,
and ONNX/CoreML retention are not yet isolated. Those categories do not prove
a leak. Two-minute PCM is only a few MiB and cannot explain the multi-GiB peak
or residual heap. ISSUE-1070 investigates these separately from buffer streaming.

## Latency and content

Values below are seconds. First/final dictation timings include cold loading
when necessary. In sequential mode, cleanup timing also includes speech release;
these phase measurements do not isolate native model-load cost alone.
Timings start with fixture PCM already available; they exclude speaking and
microphone startup. Recording prewarm can overlap loading with capture in normal
use. Actual microphone-release-to-paste latency was not measured.

| Measurement | Warm reuse + idle release | Sequential speech/cleanup |
| --- | ---: | ---: |
| First dictation, including cold loads | 4.503–4.731 | 4.730–4.895 |
| Warm dictation median | 0.314–0.323 | 4.736–4.847 |
| Warm dictation p95, nearest rank | 0.366–0.370 | 4.831–4.985 |
| Dictation after idle reload | 4.793–5.106 | 5.138–5.372 |
| 120-second import, including demand load | 11.454–13.543 | 14.467–14.580 |

Loading begins during recording, so a sufficiently long utterance can hide some
cold-load cost. Imports and short dictations can still wait several seconds.
Sequential residency reloads speech on every eligible cleanup dictation, which
explains its much higher repeated-request latency. Keeping models warm trades
resident memory for speed; the sequential control remains opt-in.

All 52 transcript results, including all four 120-second imports, passed
source-word and full-reference occurrence checks. All four preview coverage
checks passed. Cleanup returned unchanged grammatical text in 48 of 48 short-fixture
results. Unchanged output verifies preservation rather than improved polishing. These checks
cover synthetic English/French and are not WER, semantic equivalence, or a full
multilingual evaluation. The separate Whisper 120-second repetition-loss finding
in ISSUE-1050 remains unresolved; real Whisper lifecycle tests use short English
and French audio.

## Validation and limits

- 34 regular Rust tests pass with default and benchmark features. They cover
  shared loads, stale selections, active ownership, cancellation, final priority,
  obsolete-preview rejection, timeout/retry behavior, sequential release and settings.
- Real Whisper and Parakeet tests pass shared loading, English/French content,
  protected handles, idle release, cold reload and explicit missing-model errors.
  The cleanup real-sidecar test also passes after the shared lifecycle refactor.
- All three Python sampler accounting/content-check tests pass.
- Frontend TypeScript/build and final release build/smoke pass. Settings controls
  are build-checked; no manual GUI or physical-microphone interaction test was run.
- The four traces contain 7,739 samples; 8 incomplete samples are excluded from
  footprint summaries. The largest observed sampling gap is 0.413 seconds.
  Native lifetime peaks and raw intervals remain available for auditing.
- No 8/16 GiB support claim is made. The active import peak and post-release
  residual heap still exceed proposed smaller-device targets. Actual-device
  validation, native allocation work, and broader content evaluation remain required.
