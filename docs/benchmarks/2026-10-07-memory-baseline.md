# Parrot memory baseline — 2026-10-07

Parakeet retains about **9.7–9.8 GiB** after a two-minute import and one minute
of idle. Its complete-process peak reaches **10.7–11.1 GiB**. Whisper uses much
less memory, but fails the long-recording repetition-retention check. These
results establish separate memory and content-preservation problems; they do
not establish a supported minimum-RAM device yet.

## Reproduction and evidence

Follow [the benchmark workflow](../memory-benchmarks.md). Full metrics,
transcripts, model hashes, source-fixture hashes, PID attribution, and proposed
comparison inputs are in [baseline.json](2026-10-07-memory/baseline.json).
The four adjacent `.jsonl.gz` archives preserve timestamped samples, events,
system counters and native `footprint` category reports. Each archive's SHA-256
is recorded in the JSON. The source audio is synthetic and committed in
`apps/desktop/src-tauri/tests/fixtures/transcription/`.

- Hardware: Apple M4 Pro, Mac16,7, arm64, **24 GiB unified RAM**.
- OS: macOS 26.6.2, build 25G83; SDK 26.2.
- Toolchain: rustc/Cargo 1.96.1; optimized release builds with
  `memory-bench,tauri/custom-protocol`, compiled frontend assets, and a release
  cleanup sidecar. Native workload source: `ebf36d0`.
- Primary pairs: Whisper large-v3-turbo Q5_0 or Parakeet v3 INT8 ONNX,
  each with Qwen2.5 0.5B Instruct Q4_K_M cleanup.
- Alternate loaded pair: the other STT engine plus Qwen2.5 1.5B Q4_K_M;
  restored to the original pair before the import. Switching measures model
  loading; alternate-model inference is not included.
- Two fresh-process runs per primary pair; 10 warm dictations per run,
  alternating English/French. Auto language, Neutral blocking cleanup, no
  custom vocabulary/context/style, no saved dictation audio.
- About 11 seconds of synthetic capture replay plus a 2-second hold; 120-second
  varied English file-path import with cleanup off; 60-second final idle.
- Each run includes the main app, cleanup sidecar, and **four attributed WebKit
  helpers**. The native launcher verifies that the app owns its XPC helpers.

OS file caches were uncontrolled and warmed by reading model hashes. Startup
latency below measures engine readiness from Tauri setup, after window
creation; trace startup memory also includes the earlier process initialization.
The installed Parrot app and other applications remained open. A separate
Ollama daemon had no resident models and was excluded from built-in totals.
These are development-machine measurements, not isolated-device benchmarks.

An initial shell-launched run omitted WebKit helpers due to inherited process
responsibility. It was stopped and excluded. A corrected short smoke run
verified ownership, preview events, isolated history/attachments, and quality
checks before the four full runs. The first two full runs were re-evaluated
with the stricter repetition check; the underlying samples were preserved.

## Memory results

All figures are GiB (2^30 bytes), using the sum of simultaneous current
physical-footprint ledgers. Each cell gives the range across the two runs.
Idle values are per-phase medians; active values are sampled peaks.

| Scenario | Whisper + Qwen 0.5B | Parakeet + Qwen 0.5B |
| --- | ---: | ---: |
| Ready idle | 0.78 | 1.94 |
| Capture/previews peak | 1.00–1.01 | 4.66–5.50 |
| Long-import inference peak | 1.15–1.19 | 10.53–11.13 |
| First 10 seconds after import, median | 0.92–0.95 | 9.85–10.24 |
| Following 60 seconds idle, median | 0.81–0.91 | 9.74–9.84 |
| Largest primary-pair peak, including short dictations | 1.21–1.23 | 10.70–11.13 |
| Largest whole-trace peak, including alternate-model loading | 1.80–2.01 | 10.70–11.13 |

Whisper's whole-trace peak occurs while the alternate Parakeet/1.5B pair is
loaded. It is not the peak of Whisper inference. Parakeet's first run reaches
its whole-trace peak just after the import returns; its second reaches it during
inference. The distinction is preserved in the per-phase data.

Both model handles remain loaded at the end of every idle period. The first
Parakeet post-idle native snapshot attributes about 7.34 billion bytes to
`MALLOC_LARGE` and 2.72 billion bytes to `MALLOC_SMALL` in the main process.
Heap allocations dominate the retained memory. These categories do not prove
which allocator/session owns the allocations or establish a leak.

After warm dictations 1 through 10, median idle footprint changes by:

| Pair | Run 1 | Run 2 |
| --- | ---: | ---: |
| Whisper | −0.1 MiB | +23.9 MiB |
| Parakeet | −1306.9 MiB | +136.9 MiB |

Preview work can still finish after capture stops, and native allocators may
retain high-water allocations. The two Parakeet short-dictation traces differ
substantially. Ten repetitions do not establish a steady leak rate. The
reproducible, much larger problem is retention after the long import.

The requested sampling interval was 100 ms. Actual p95 gaps were about
109–112 ms; maximum gaps were 142–390 ms. Per-process kernel lifetime peaks
are preserved separately and never summed. Short simultaneous spikes can
still be missed. `footprint` snapshots preserve clean/mapped/reclaimable
categories; RSS and model sizes are not added to physical footprint.

For comparison, a read-only observation of the already-installed, long-running
0.2.5 app showed 2.10 GiB tree footprint versus about 65 MiB summed RSS. Its main
process had a 12.9 GiB historical peak. That observation has unknown workload
history and is not one of the four controlled baselines.

## Latency and quality

| Measurement | Whisper + Qwen 0.5B | Parakeet + Qwen 0.5B |
| --- | ---: | ---: |
| Load-ready latency from setup | 0.20–0.51 s | 3.77–4.07 s |
| First dictation, including cleanup | 1.06–1.19 s | 0.81–0.96 s |
| Warm dictation median | 0.94–1.02 s | 0.32–0.33 s |
| Warm dictation p95 | 0.99–1.13 s | 0.35–0.36 s |
| First preview from replay start | 2.25–2.26 s | 1.62–1.63 s |
| 120-second import | 4.36–4.41 s | 14.07–14.35 s |

All **44 short dictations** preserved the checked English/French source words
through STT and cleanup. All four runs emitted previews: six per Whisper run,
nine per Parakeet run. The short source text is already well formed; unchanged
cleanup is recorded and does not demonstrate successful removal of disfluency.

Both Parakeet imports pass keyword-occurrence retention. Both Whisper imports
contain every topic at least once but lose repetitions. The 120-second source
contains two complete 50.568-second references plus a partial tail, so each
checked topic must appear at least twice. In Whisper run 1, `bicycle`,
`telescope`, `Saturday`, `atlas`, and `suitcase` appear only once. The second run
also fails the occurrence gate. This is a recognition/output-preservation
failure in these workloads; the memory results must not hide it. Its cause
has not been isolated. Keyword checks are not WER/CER or semantic evaluation.
The broader evaluation and diagnosis belong to ISSUE-1050.

System memory pressure reached warning level during Parakeet runs. Swap was
already in use: run 1 changed from roughly 3.7 GiB to 10.8 GiB used; run 2 from
9.6 GiB to 11.1 GiB. These are system-wide counters affected by other apps,
not private Parrot swap totals. Background pressure and OS caches limit latency
comparisons, particularly across runs.

## Proposed device targets and acceptance gates

These are engineering proposals derived from the measured ranges, **not tested
device-support claims or achieved savings**. Validate them on actual 8/16 GiB
machines before documenting a minimum RAM requirement.

| Candidate mode | Target device | Proposed complete-tree limits | Evidence and current result |
| --- | --- | --- | --- |
| Low-memory multilingual | 8 GiB Apple Silicon | Ready/post-idle medians ≤1.25 GiB; primary-pair inference peak ≤2 GiB | Whisper measured 0.78–0.95 GiB idle and ≤1.23 GiB primary-pair peak. Memory fits the proposed envelope; long-import quality fails. Parakeet switching is outside this mode. |
| Parakeet | 16 GiB Apple Silicon | Ready/post-idle medians ≤2.25 GiB; primary-pair inference peak ≤6 GiB | Ready idle is 1.94 GiB and preview peak reaches 5.50 GiB. Current long import and post-idle residency both exceed the proposed envelope. |

The proposals leave device memory for clean mapped pages, the OS, and other
apps. Physical footprint is not all system-used RAM. Target-device validation
must also maintain normal memory pressure, inspect swap growth, preserve the
same content, and record the cold-load latency introduced by demand loading.
The present 24 GiB host itself experienced pressure with Parakeet; these data
do not justify recommending the current Parakeet path on a smaller device.

For same-host regression comparisons before optimizing:

- Keep the model pair, quantization, language, fixtures, build flags, durations,
  and scenarios fixed. Use at least three runs for a release decision.
- Propose a memory regression flag above 110% of the largest recorded baseline
  for that phase and configuration. Use idle medians and simultaneous active
  peaks separately. The 10% allowance is a proposed comparison tolerance.
- Propose a warm-latency flag above 115% of that pair's largest baseline p95;
  report added cold-load cost separately for demand-loading changes.
- Propose a retained-growth flag above +256 MiB across warm idle 1–10. This
  rounds upward from the observed +136.9 MiB maximum; it is a screening gate,
  not proof of leak freedom. Compare post-import retention separately.
- Every short-content, preview-coverage, and complete-reference occurrence
  check must pass. Existing Whisper occurrence failures remain an explicit
  blocker for qualifying a low-memory default, even if memory improves.

## Implementation implications

Use this baseline to validate cleanup lifecycle work in ISSUE-1052, then
coordinate speech demand loading/idle release in ISSUE-1053. **Speech-model
retention is the largest measured idle target**. Verify that native allocations
actually fall after the last active inference releases its engine handle.
Clearing a shared slot is not enough evidence of release.

Idle release alone does not fix Parakeet's active 11 GiB import peak. Evaluate
preview serialization/priority (ISSUE-1055), import chunking and native session
allocation behavior (ISSUE-1056 and related follow-up work), using the same
content and latency gates. Keep the Whisper long-import loss visible in
ISSUE-1050 before selecting it as the low-memory default in ISSUE-1058.
