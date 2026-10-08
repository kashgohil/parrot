# Bounded preview audio — ISSUE-1055

Live previews now copy only the most recent 20 seconds of mono capture and move
that vector into inference. Total capture length is returned separately, so
growth checks continue after the window fills. The recorder retains every
sample until `stop()` transfers the complete recording to final transcription.
The final-priority inference scheduler from ISSUE-1053 remains in use.

At 48 kHz, live preview copy capacity is **3,840,000 bytes (3.66 MiB)** regardless
of recording duration. Previously, the loop cloned the entire capture and then
copied the tail again, retaining both vectors during inference. Prepared PCM,
model allocations, and the full recording remain separate costs.

Implementation: `f0bf935`. Reproducible tooling and engine coverage: `dc80f6b`.
[Results and checksums](2026-10-08-preview-audio/results.json) accompany six raw
archives and the validation logs. Home paths in exported evidence are replaced
with `~`; output-directory paths are replaced with `<run-dir>`.

## Long-recording allocation and contention

Release Rust test processes compare the legacy full-clone-plus-tail path with
the production bounded snapshot. Two fresh processes run per path and duration,
reversing order on the second repetition. The capture is prefilled, not recorded
from a microphone. Capture capacity is reserved up front to exclude its own
growth. A concurrent producer appends 480 mono samples every 10 ms at 48 kHz.
Every initial and appended sample must survive the final `stop()`.

The stress workload makes 120 copies at 10 ms intervals, much more often than
production's 900 ms interval. Values are ranges across two runs per path.

| Prefilled capture | Previous live copy capacity | Bounded live copy capacity | Previous median copy time | Bounded median copy time |
| --- | ---: | ---: | ---: | ---: |
| 1 minute | 15.36 MB | 3.84 MB | 1.457–1.554 ms | 0.335–0.340 ms |
| 5 minutes | 61.44 MB | 3.84 MB | 2.613–3.366 ms | 0.337–0.349 ms |
| 10 minutes | 119.04 MB | 3.84 MB | 2.896–2.899 ms | 0.341–0.355 ms |

All 2,400 synthetic callback appends survive the 12 stress runs. Maximum
callback duration with bounded snapshots is 0.434 ms, below the synthetic
10 ms budget; legacy maximum reaches 12.776 ms. This verifies buffer ownership
and contention in this test, not physical microphone scheduling or codec input.

A separate five-minute comparison uses ten copies at the normal 900 ms interval
and 950 callback appends per process:

| Measurement | Previous copies | Bounded snapshot |
| --- | ---: | ---: |
| Live copy capacity | 61.44 MB | 3.84 MB |
| Median copy time | 3.410–10.232 ms | 0.066–0.080 ms |
| Maximum callback duration | 2.461–12.353 ms | 0.012–0.016 ms |
| Native test process sampled peak footprint | 621.58–621.61 MiB | 64.05–64.27 MiB |

All 3,800 appends survive these four runs. The native process peak includes
capture storage and allocator retention beyond live vectors; it does not measure
the app, WebKit, models, or cleanup. The 10 ms stress run amplifies allocator
high-water effects further (raw results retained). Neither measurement predicts
a fixed amount of whole-app memory savings. No allocator-purge or leak claim
is made. All native footprint samples are complete; the sampler targets 25 ms
and can miss brief peaks. Observed native lifetime peaks are also retained.

Reproduce using the [preview-buffer benchmark instructions](../memory-benchmarks.md#isolate-preview-copies-and-capture-lock-contention).
The initial stress binary predates the configurable interval/count arguments;
its default workload and copy paths are the same. Each archive records its
actual binary hash and working-tree state.

## Real-app behavior and memory

Four fresh release-app runs use Parakeet v3 INT8 on CPU and Qwen2.5 0.5B Instruct
Q4_K_M, Auto language, Neutral blocking cleanup, 60-second idle policies,
and sequential residency off. Run order is before-1, after-1, after-2, before-2.
The retained ISSUE-1070 final binary supplies the baseline; its production code
matches `2177aee`. The new app is built at `dc80f6b`. Sampler metadata records the
checkout revision, which differs from the retained baseline binary's source;
the exact before/after executable hashes are recorded separately in results.

Hardware: M4 Pro Mac16,7, 24 GiB RAM, macOS 26.6.2. Other applications, including
installed Parrot, remain open. No other inference, build, or evidence compression
runs during collection. Model-file hashing warms uncontrolled OS caches. Host
pressure and swap counters are included as context, not attributed app memory.

Each run includes unloaded startup; cold English dictation; about 11 seconds of
real-time English PCM replay plus a two-second hold; warm English and French
dictations; a 120-second varied English import with cleanup Off; and short idle
phases. This short app capture does **not** exercise the 20-second boundary or
prove multi-minute microphone behavior; the native buffer tests and engine
window tests cover those allocation/content cases separately.

| App measurement | Before | After |
| --- | ---: | ---: |
| First preview | 1.510–1.517 s | 1.519–1.558 s |
| Preview events per run | 10 | 10 |
| Warm English dictation including cleanup | 0.149–0.156 s | 0.142–0.148 s |
| Warm French dictation including cleanup | 0.202–0.211 s | 0.208–0.210 s |
| Preview phase sampled peak footprint | 2.275–2.303 GiB | 2.319–2.437 GiB |
| Whole-workload sampled peak footprint | 2.737–2.901 GiB | 2.946–2.964 GiB |

There is no measured whole-app peak reduction in this short workload: after
peaks are slightly higher, while the preview phase remains dominated by model
and process allocations. Copying fewer samples does not establish a total-app
peak guarantee. The isolated long-buffer measurements establish the allocation
improvement directly. Preview timing remains close in these initial comparisons;
two runs per version do not establish a release performance threshold.

All 16 final transcript results, four preview-coverage checks, and long-import
count/order checks pass. Matched raw and cleaned final transcripts are identical
across all four runs, including the long import. The last preview text is also
identical. Cleanup leaves the grammatical short fixtures unchanged; this is
preservation evidence, not improved cleanup quality or a broad WER evaluation.

The sampler includes four attributed WebKit helpers per run. It collected 959
samples, with one incomplete sample excluded and a maximum gap of 0.319 seconds.
Peaks are maximum simultaneous process-tree physical-footprint sums, not sums
of independently observed lifetime peaks. RSS and host counters remain in the
raw archives. These short runs do not retest the 60-second idle release policy.

## Validation and remaining device checks

- Default and benchmark-feature Rust suites: 36 passed, eight opt-in tests ignored.
- Release unit suite: 36 passed, eight ignored.
- Real Parakeet and Whisper tests: both pass English/French content checks on a
  bounded 20-second preview following a prefilled two-minute silent capture;
  final capture storage retains the full prefix and source samples.
- Capture boundary tests pass at 16, 44.1, 48, and 96 kHz. A five-minute capture
  with concurrent appends preserves every sample and continued growth metadata.
- Existing scheduler priority, cancellation ownership, and stale-generation
  tests pass. Release app build and all four app runs pass.

Physical microphone/Bluetooth dropouts, older-chip timing, and actual 8/16 GiB
hardware validation remain tracked in ISSUE-1058, consistent with the user's
request to keep device validation separate. Full final audio still grows with
recording duration; import streaming and prepared-PCM ownership remain ISSUE-1056.
