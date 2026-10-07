# Parakeet native memory — ISSUE-1070

Using the CPU execution provider for Parakeet INT8 on macOS lowers the sampled
process-tree peak from **11.81–11.91 GiB** to
**2.69–2.90 GiB** in the matched workload. Released idle falls from
**3.07–3.16 GiB** to **0.18–0.23 GiB**.
The 120-second import is also faster on this M4 Pro. macOS now selects CPU for
Parakeet; other platforms keep automatic provider selection.

## Native allocation attribution

A separate release-app run with macOS stack logging identifies the dominant
allocations after the 120-second import:

| Native live allocation group | Bytes | Evidence |
| --- | ---: | --- |
| Espresso `kern_alloc_uninitialized` | 8,478,613,504 | 4,232 buffers in heap report |
| ONNX `IAllocator::MakeUniquePtr` | 1,304,576,000 | 225 buffers in heap report |
| ONNX tensor construction | 127,398,400 | 322 buffers in heap report |
| All live malloc blocks before release | 10,065,205,576 | Heap summary |
| All live malloc blocks after release | 30,447,688 | Heap summary |

The malloc-history stack traces the largest group through Espresso graph coloring
and plan preparation, CoreML `rebuildPlan` / `resetSizes` / prediction, then ONNX
Runtime's CoreML execution provider on its worker threads. This attributes the
large active allocations to CoreML plans rebuilt for dynamic audio shapes.
Wrapping just the outer Rust worker in an autorelease pool would not address
these allocations on ONNX's own threads.

After model destruction, those large live groups disappear. The instrumented
heap report still shows about 884.5 MiB physical footprint with only 30.4 MB of
live malloc blocks. Its footprint snapshot still charges 824,885,248 bytes to
MALLOC_SMALL/MALLOC_LARGE. Freed allocator pages and other non-malloc charges can
outlive live blocks. Stack logging changes allocator behavior, so this does not identify
every byte of the ordinary run's roughly 3 GiB residual. It is not proof of a
native leak. No allocator purge, arena change, dependency fork, or speech subprocess
is required for the measured CPU-provider improvement.

The pinned `transcribe-rs` 0.3.11 uses `ort` 2.0.0-rc.12. Its CPU provider already
disables the CPU arena by default; this change does not claim an arena optimization.
The [ONNX CoreML documentation](https://onnxruntime.ai/docs/execution-providers/CoreML-ExecutionProvider.html)
describes the provider configuration; the native stacks are the evidence for
this model's observed allocations. Full heap and malloc-history reports remain
in the local diagnostic run. Committed excerpts preserve the dominant owner
stacks and before/after live-block totals, with original report sizes and SHA-256
hashes in [results.json](2026-10-08-parakeet-native-memory/results.json).

## Matched workload and accounting

Two fresh release-app processes ran per provider, in order CPU-1, Auto-1, CPU-2,
Auto-2, using the same executable and the same Parakeet v3 INT8 + Qwen2.5 0.5B
Instruct Q4_K_M files. Only `parakeet_accelerator` differs. Auto uses the prior
CoreML-plus-CPU path; CPU selects ONNX's CPU execution provider.

Hardware: M4 Pro Mac16,7, 24 GiB unified RAM; macOS 26.6.2 / 25G83, SDK 26.2;
rustc/Cargo 1.96.1. Other apps, including installed Parrot, remained open. No
other model inference or Cargo/frontend build ran during collection. File caches
were uncontrolled and warmed by model hashing. Compression of the attribution
reports overlapped CPU-1 cold dictation by about 1.2 seconds, then finished before
previews, warm requests or the long import. CPU-1 cold latency has this additional
confound. Host pressure/swap are global counters, not Parrot-attributed memory.

The common native source is `281fc5c`; sampler source-count/order checks are from
`2aee997`. Later working-tree changes select the measured CPU policy as the normal
macOS default and update documentation/setup copy. They do not change model
inference. The comparison executable's SHA-256 is in results.json. Final-source validation
uses `104590a` and is recorded separately from the four comparison runs.

Each run includes unloaded startup; English cold dictation; about 11 seconds of
real-time PCM previews plus a two-second hold; ten alternating English/French
warm dictations; alternate model selection and restore without inference;
a 120-second varied English import with cleanup Off; 10 + 60 seconds of idle;
10 seconds of released idle; then French demand reload and 10 seconds idle.
Normal dictations use Auto language and Neutral blocking cleanup. Both model
idle policies are 60 seconds; sequential residency is off for this comparison.

Values below are GiB (2^30 bytes), with ranges across two runs per provider.
Idle values are medians of simultaneous process-tree physical-footprint sums.
Peaks are maximum simultaneous sums, never sums of independent lifetime peaks.
The released phase starts 70 seconds after import return, after the release
boundary; model-state assertions and process samples verify both models unloaded
and no cleanup sidecar. All runs include four attributed WebKit helpers.

| Measurement | Previous Auto/CoreML | CPU |
| --- | ---: | ---: |
| Startup idle, both models unloaded | 0.15 | 0.15 |
| Preview phase sampled peak | 6.36–6.52 | 2.30–2.32 |
| Idle after 10 warm dictations | 4.94–4.96 | 2.07–2.14 |
| 120-second import sampled peak | 11.81–11.91 | 2.56–2.77 |
| Immediately after 120-second import | 10.78–11.40 | 2.54–2.76 |
| Released idle, 70–80 seconds after import | 3.07–3.16 | 0.18–0.23 |
| Idle after reload dictation | 4.75–4.86 | 1.74–1.78 |
| Whole-trace sampled peak | 11.81–11.91 | 2.69–2.90 |

Raw evidence contains 6,566 samples; one incomplete sample is excluded
from footprint summaries. The largest observed sampling gap is 0.587 seconds.
The four adjacent `.jsonl.gz` archives contain sanitized metadata, process samples,
events, host counters and native footprint snapshots. Archive hashes, peak samples,
per-role medians, model/fixture hashes and full transcripts are in results.json.

## Latency and content

Values below are seconds. Timings start with fixture PCM already available;
they exclude speaking and microphone startup. Cold/reload/import timings include
model loading. Recording prewarm can overlap loading with real microphone capture;
actual microphone-release-to-paste latency was not measured.

| Measurement | Previous Auto/CoreML | CPU |
| --- | ---: | ---: |
| First dictation, including cold loads | 4.396–4.574 | 1.072–1.191 |
| Warm dictation median | 0.319–0.332 | 0.177–0.314 |
| Warm dictation p95, nearest rank | 0.344–0.388 | 0.202–0.448 |
| Dictation after idle reload | 5.184–5.678 | 0.965–0.975 |
| 120-second import, including demand load | 12.645–12.890 | 3.124–3.315 |

All 52 transcript results and four preview coverage checks pass.
All four long imports retain distinctive source words for each complete reference
repetition and preserve source-topic ordering. Counts alone previously allowed
reordered chunks; the sampler now checks order, with a regression covering
complete counts in the wrong order. The older four ISSUE-1053 traces also pass
the new ordering check.

Matched providers return identical raw short English/French transcripts in
24 of 24 comparisons. Long-import transcripts differ slightly in function
words/punctuation; the preserved topic/count checks do not establish full word
accuracy. Cleanup returns unchanged grammatical text in 48 of 48 short
results, verifying preservation rather than improved polishing. Broader language,
real-recording and WER evaluation stays in ISSUE-1050, including its separate
Whisper long-import omission finding.

## Validation and hardware limits

All 34 regular Rust tests pass with default and benchmark features (six optional
tests are ignored in those runs). The real Parakeet and Whisper shared-load,
ownership, idle-release, reload and failed-load tests pass separately. All four
Python accounting/content tests, frontend TypeScript/build, and the release
build pass. Vite retains its existing chunk-size warning.

A final 120-second release-app run selects CPU without a benchmark override,
passes content/order/release/reload checks, and captures native allocations using
the new sampler option. The CPU heap has 1,401,735,512 live malloc bytes after
the import and 29,058,856 after release; the large Espresso allocation group is
absent. The remaining loaded-model owner is mainly ONNX integer-matmul prepacked
weights: the native stack attributes about 1,087 MiB to `MatMulIntegerBase::PrePack`.
Any further weight-packing tradeoff needs separate throughput/content measurement.
A separate sequential-residency smoke run passes and verifies that dictation
leaves both models unloaded. Both final-source runs include four attributed
WebKit helpers; their archives and native excerpts are separate from the four
uninstrumented comparison runs. Settings/microphone interactions are not
manually tested.

The model files, language hints, decoder, approximately 30-second energy chunks,
preview scheduler and cleanup isolation are unchanged. The setup text now describes
local processing without promising Neural Engine execution. CoreML remains
compiled in for explicit diagnostic comparisons.

These are 24 GiB development-machine results. No 8/16 GiB support claim is made,
and neither older-chip throughput nor energy use was measured. Actual lower-RAM
hardware validation remains required before declaring a supported tier and is
tracked with [ISSUE-1058](https://rezee.app/kash/plan/1058), as requested by the user. Audio streaming, bounded preview buffers, and integrated
low-memory mode remain separate work.

Reproduce using the [memory benchmark](../memory-benchmarks.md) with the stored
configs, choosing `parakeet_accelerator=auto` or `cpu`. For separate attribution,
add `--allocation-phase post_import_idle --allocation-phase speech_released_idle`;
keep `speech_lifecycle_checks=true`. Do not use instrumented runs as ordinary
memory/latency comparison estimates.
