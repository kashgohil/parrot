# Low-memory mode: app measurements and regression checks

Measured 2026-10-08 on an Apple M4 Pro / Mac16,7 / **24 GiB RAM**, macOS 26.6.2.
Source: `66bc024` (runtime `b44b159`, Settings `b19cbfa`). Release app with
`memory-bench,tauri/custom-protocol`; existing isolated cleanup sidecar. No push.

The mode lowers idle residency, disables previews/prewarm, and reloads speech
and built-in cleanup sequentially. It preserves normal preferences, language,
and model selections. Compact multilingual Whisper small is a separate explicit
model selection. See [mode behavior](../low-memory-mode.md).

## Fixed-mode comparisons

Two fresh-process runs per row, Qwen2.5 **0.5B Q4_K_M** cleanup throughout.
For Parakeet and turbo, order is normal / low / low / normal (ABBA), same app,
models and workload. The compact row has two additional low-memory runs;
**its difference from turbo includes a model change**, not just the mode.

| Pair and policy | Whole-run peak GiB | Final idle median GiB | Cold dictation s | Subsequent dictation s | 120 s import s |
| --- | --- | --- | --- | --- | --- |
| Parakeet INT8, normal | 2.933–2.944 | 2.393–2.512 | 1.097–1.240 | 0.159–0.212 | 2.800–2.893 |
| Parakeet INT8, low-memory | 2.947–2.984 | 0.848–0.862 | 1.106–1.134 | 1.117–1.254 | 3.573–3.691 |
| Whisper turbo Q5_0, normal | 1.112–1.200 | 0.789–0.793 | 1.388–1.440 | 0.910–1.637 | 7.904–7.924 |
| Whisper turbo Q5_0, low-memory | 1.034–1.049 | 0.228–0.256 | 1.394–1.400 | 1.387–1.541 | 8.147–8.174 |
| Whisper small Q5_1, low-memory | 0.757–0.771 | 0.223–0.244 | 0.732–0.765 | 0.745–0.911 | 3.466–3.567 |

Idle is the median of complete samples in the **final three seconds** of a
35-second post-import idle, after a preceding one-second idle. The mode's
30-second timeout has elapsed; the normal 60-second timeout has not. Using the
whole 35-second median would mostly measure the still-loaded interval. Each
row retains 28–30 complete samples per final window (exact counts in JSON).
At the end, all low-memory runs report speech and cleanup unloaded; normal
runs retain speech. This compares shorter residency at this point in time,
not a guarantee of lower memory after both modes have reached their timeout.

Parakeet's whole-run peak **does not decrease** under the mode: long-import
native inference dominates. After repeated short dictations, sequential
release lowers idle residency, but retained allocator/runtime pages mean
unloaded state is not the startup footprint. No leak is inferred.
Whisper turbo's sampled whole-run peak decreases in these runs. Compact
multilingual plus low-memory mode reaches **0.757–0.771 GiB**; this is a measured
app workload, not a minimum-RAM support claim or a conversion from model size.

Direct ready-audio subsequent dictations include model reloads under the mode.
Parakeet rises from roughly 0.16–0.21 s to 1.12–1.25 s; turbo results also vary.
Recording-start prewarm can overlap normal-mode loading, while low-memory mode
waits for transcription. These are **not physical microphone release-to-paste
measurements**. Cold loads include inference and cleanup; disk/driver caches
are uncontrolled. The compact model is faster in this limited workload, which
does not establish an accuracy or speed advantage on other speech/hardware.

## Workload, accounting and quality

Each comparison includes unloaded startup, first English dictation with
blocking cleanup, ~11 seconds of real-time synthetic PCM capture plus a
2-second hold, two alternating English/French dictations, a 120-second varied
English path import with cleanup off, and idle release. The import retains
all full-reference keyword occurrences and source-topic order. Normal runs
emit real previews; all low-memory runs emit **zero**, with no capture prewarm.
The `preview_coverage` result in low-memory traces denotes successful policy
suppression, not a claimed transcript. Inspect `capture_previews` for counts.

All ten fixed-mode runs pass checked source-word retention and long-import
count/order gates. All 24 matched short raw and cleanup outputs are identical across same-model
normal/low runs. These checks
use committed synthetic English/French fixtures; they do not measure WER/CER,
real-world accents, Hindi/CJK recognition, code-switching or factual cleanup
accuracy. Those remain ISSUE-1050 and the language/cleanup issues. Model
coverage is not a claim of tested accuracy across all languages.

The sampler adds **current physical-footprint ledgers at each timestamp** for
this app, its cleanup sidecar, and attributed WebKit helpers. It excludes
unrelated applications; separate RSS/lifetime peaks are never added to this
number. All 12 runs have four attributed WebKit helpers. Across comparison
and regression traces: **9,266 samples**, **12 incomplete**, maximum observed
sampling gap **0.196 s**. The ~100 ms sampler can miss shorter spikes.

No builds, other owned inference, browser UI automation or evidence compression
ran during these measurements. Existing user applications stayed open,
including the installed Parrot app; background pressure/swap is recorded in
raw system snapshots and is not controlled. Model hashing warms file caches.
No user database/history, microphone, clipboard or paste was used. The isolated
benchmark database and audio attachments are under each output directory.

## Separate full regression runs

`parakeet-checks` and `compact-checks` additionally enable all four lifecycle /
low-memory check flags and use 65-second post-import idle. These are functional
checks with changing policies, **excluded from the fixed-mode table**. Their
sampled peaks are 2.706 GiB and 1.062 GiB respectively; the compact regression
peak must not be hidden by the smaller fixed-mode result.

Both pass:

- Native speech work continues when the mode is disabled and enabled while a
  model is loading or in use; checked English/French text remains available.
- The preference survives reopening the isolated on-disk database. Saved normal
  idle preferences remain intact. Browser checks separately cover restoring
  non-default preferences after turning the mode off.
- Speech unloads after idle and reloads on the next dictation. Sequential cleanup
  releases immediately after completion; its 30-second fallback timeout is
  configured but these sequential jobs do not retain a warm sidecar for it.
- Disabled and failed built-in cleanup preserve raw text; restored cleanup works.
  Legacy Ollama cleanup is skipped and the French raw transcript is usable.
- Failed speech requests retain the same captured PCM for retry. Successful retry
  releases completed PCM, saves the exact WAV, and preserves original imported
  bytes. Invalid imports add no partial history.

Ordinary Rust tests: **46 passed, 11 ignored**, both default and benchmark-feature
builds. Real compact-model tests pass the English/French Auto/explicit language
matrix, silence/short input, and long file/recording order/conservation checks.
Four Python accounting/quality regressions pass. Frontend type/build and release
Rust build pass. Vite reports its existing >500 kB chunk-size warning.
Browser Settings validation uses mocked Tauri IPC, distinct from native app
regressions; it checks persisted loading, effective disabled controls, restoring
keep-warm/5-minute preferences, preserving French, saving, and no automatic model
switch/download. It is not a physical GUI/microphone test.

## Evidence and reproduction

[results.json](2026-10-08-low-memory-mode/results.json) includes per-run metrics,
model/fixture identity in raw metadata, binary SHA-256, source-file hashes, all
archive hashes, latencies, model states and sampling coverage. Twelve adjacent
`.jsonl.gz` archives retain metadata, summaries, events, complete sample streams,
system readings and native idle footprint snapshots; regression archives also
include native app logs. `validation.jsonl.gz` retains check/build logs.

Archive text replaces the home directory with `~` and each run directory with
`<run-dir>`. Original source-file hashes precede that transformation; archive
hashes apply to committed gzip bytes. Compact weights were downloaded to a
scratch path from the existing upstream ggml repository, not installed into
the user's model selection. Exact model hashes/sizes are in the run metadata.

Reproduce with the commands in [memory benchmarks](../memory-benchmarks.md#low-memory-mode-checks).
Use the same pair/config for fixed-mode comparisons: `repeats: 2`,
`idle_seconds: 1`, `post_idle_seconds: 35`, `long_import_seconds: 120`;
set `low_memory_mode` false/true. For the separate full regression matrix,
set all four check flags true and `post_idle_seconds: 65`.

Actual **8/16 GiB target Macs, older-chip throughput, energy use, physical
microphone/Bluetooth capture and multi-minute holds remain [ISSUE-1072](https://rezee.app/kash/plan/1072)**,
tracked separately at the user's request. No supported RAM tier or target-device
threshold is established here.
