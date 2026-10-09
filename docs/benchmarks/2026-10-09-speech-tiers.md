# Smaller multilingual Whisper tiers

ISSUE-1045 retains **Compact multilingual (small Q5_1)** as an explicit smaller
option and updates Settings with observed recognition tradeoffs and download
sizes. Quantized base Q5_1 stays outside the catalog: its memory savings come
with Hindi script/amount errors and a failed long-input fact/order check in the
current production decoder. Saved choices, defaults and language preferences
remain unchanged; low-memory mode does not select or download a model.

On this 24 GiB M4 Pro, compact speech workers peak at **522–525 MiB**, versus
**835–855 MiB** for turbo, roughly 37–39% lower across these runs. This is a
headless speech measurement, not total app memory or an 8/16 GiB requirement.
Native-speaker and consented real-speaker review remains **ISSUE-1077**; physical
low-RAM devices remain **ISSUE-1072**, as requested by the user.

## Method and evidence

The unchanged 16-case seed contributes 15 audio cases; the focused Hindi corpus
contributes ten, including two reused seed waveforms. There are **23 distinct
waveform hashes**, all synthetic and already checked in. Some mixed cases use
artificial voice transitions. This does not estimate population accuracy.
English, Hindi and Hindi–English are priorities; French, Spanish, Chinese and
Japanese remain regressions.

Three models, Auto/explicit language and two passes produce **300 scored rows**.
All 150 text pairs repeat identically, with no inference errors or unsupported
skips. All **120 compact/turbo seed transcripts** match the prior final default
ISSUE-1074 run exactly, with matching model and manifest hashes. Every scored
row remains pending human review. Fact/script/order flags are unwaived screening
results, not automatic semantic judgments.

All tiers use the existing production context/chunking policy and default
recognition prompt. Explicit mixed-speech requests pin Hindi. The optional
Hindi–English style hint is a separate turbo-only experiment, reported in the
[recognition diagnosis](2026-10-09-hindi-recognition.md); compact cannot use it.
These comparisons change both model architecture and quantization; they do not
isolate quantization loss against unquantized weights. Base is rejected under
this app policy and corpus, not every possible decoder configuration.

Upstream artifact metadata was checked on 2026-10-09 at revision
`5359861c739e955e79d9a303bcbc70fb988958b1` of the
[whisper.cpp model repository](https://huggingface.co/ggerganov/whisper.cpp/tree/5359861c739e955e79d9a303bcbc70fb988958b1).
Base was downloaded only to scratch; existing compact/turbo files were reused.
Every actual model SHA matches the upstream LFS SHA. Small Q5_1 is distinct from
English-only small.en; its URL and reload filename are checked. Header and
loaded-model checks establish 99 languages for base/small and 100 for turbo,
with Cantonese exclusive to turbo among these three. This coverage is not an
accuracy guarantee.

| Model | Artifact bytes | SHA-256 |
| --- | ---: | --- |
| Base Q5_1 | 59,707,625 | `422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898` |
| Small Q5_1 | 190,085,487 | `ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb` |
| Turbo Q5_0 | 574,041,195 | `394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2` |

## Recognition tradeoffs

Micro error rates count normalized primary reference units across repeats.
Hindi, mixed speech and CJK use CER; other languages use WER. English is heavily
weighted by the long recording. A lower rate does not establish correct facts,
negation or script. Two repeats are not two independent speakers.

| Original seed, Auto | Base Q5_1 | Compact Q5_1 | Turbo Q5_0 |
| --- | ---: | ---: | ---: |
| English WER | 3.1% | 4.2% | 2.8% |
| Hindi CER | 96.8% | 19.4% | 9.7% |
| Hindi–English CER | 61.8% | 58.8% | 61.8% |
| French WER | 15.8% | 5.3% | 5.3% |
| Spanish WER | 0.0% | 25.0% | 0.0% |
| Chinese CER | 8.3% | 8.3% | 0.0% |
| Japanese CER | 0.0% | 0.0% | 0.0% |

| Focused corpus | Base Q5_1 | Compact Q5_1 | Turbo Q5_0 |
| --- | ---: | ---: | ---: |
| Hindi, Auto CER | 98.4% | 21.3% | 4.9% |
| Hindi, explicit Hindi CER | 98.4% | 21.3% | 4.9% |
| Hindi–English, Auto CER | 79.8% | 65.4% | 53.5% |
| Hindi–English, explicit Hindi CER | 83.5% | 54.7% | 51.0% |
| English negative control, Auto/explicit WER | 0.0% | 0.0% | 0.0% |

For the original mixed seed, explicit Hindi CER is 61.8% base, 44.1% compact
and 64.7% turbo. All retain fact/script flags. The broader original seed has
32/28/20 fact-flagged rows for base/compact/turbo respectively out of 60 each;
the focused corpus has 36/36/28 out of 40 each. Raw scripts and failed marker IDs
remain in the archived scores; spelling/transliteration differences can also
trip a literal marker. No flags are waived.

Base's Hindi payment reference `प्रिया ने 25 रुपये का भुगतान नहीं किया।` becomes
`پریا نے 55 رپے کا بھوطان نہیں کیا` in both Auto and explicit Hindi. Native logs
record language token 17 (Hindi) for both requests, but the output uses
Perso-Arabic script and changes the amount. A token hint does not guarantee
output script or correct transcription. Compact still misspells this sentence;
turbo has spelling errors too. All need the separately tracked review.

Base's two-minute English result changes the second required `atlas` to
`address`, failing the strict repeated-fact/order contract in all four rows.
The output still reaches the final waterfall sentence twice; this is a
recognition substitution, not an observed truncated tail. Compact/turbo pass
these occurrence/order checks. All tiers return empty text on silence and short
accidental input, in every mode and repeat. Compact also loses the Spanish
name/negation in the seed; it should not be presented as equivalent to turbo.

## Quiet worker memory and latency

Six fresh owned workers run sequentially after compilation and quality runs,
with tier order reversed for the second pass. Each has 27 Auto requests: first
and warm copies of the same English sentence, 15 original seed audio cases and
ten focused cases. This produces **162 additional resource result rows**, all
matching the corresponding quality transcripts. No GUI, cleanup, capture or
other benchmarking process overlaps these runs.

The sampler targets 50 ms and retains all **1,203 complete process-tree ledger
samples**, with zero failed ledgers. The maximum actual sample gap is 162.0 ms.
Sampled physical footprint/RSS are summed only over complete owned-process
samples; lifetime worker footprint is also retained. Their footprint ranges
agree to rounding. RSS can omit other physical-ledger charges, so it must not
replace the physical footprint. File caches and OS activity are uncontrolled;
load times are fresh-process timings, not guaranteed cold-disk loads.

| Model | Sampled peak footprint MiB | Peak RSS MiB | Load ms | First / warm short ms | 120-second import s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Base | 300.8–302.0 | 219.7–220.9 | 47.8–52.7 | 100.5–112.9 / 93.6–98.6 | 1.294–1.379 |
| Compact | 522.4–524.5 | 441.2–443.4 | 68.1–78.5 | 230.2–241.8 / 225.3–236.0 | 2.984–3.087 |
| Turbo | 834.8–854.7 | 753.5–773.3 | 144.9–259.4 | 883.2–1,010.9 / 964.8–1,263.6 | 9.307–10.188 |

A warm request means the model stays loaded; it does not guarantee a faster
measurement. These runs include long-input buffers and differ from the shorter
ISSUE-1074 resource corpus. Do not treat different-corpus peaks as a memory
regression or infer a fixed speedup, unique GPU memory, energy cost, whole-app
limit or low-RAM device support. The earlier
[actual-app compact validation](2026-10-08-low-memory-mode.md) separately covers
installation, recording/import, retry/save/idle/recovery and memory policies.

## Validation and reproduction

The quality/resource worker SHA is
`364eef05e9063610f7da41e57999a4f9b5365f6d81c6055322e0e50ccb197c34`,
built from `024e2da` during ISSUE-1082. Execution starts at `2c0cc31` with the
same inference source; the later ISSUE-1045 native edit changes catalog wording
and adds a reload-path assertion only. Execution checkout metadata does not
attest a rebuilt binary; the actual hash identifies what ran.

- 89 quality-feature Rust tests pass; 14 native/manual tests are ignored by default.
- Four separately enabled actual-model tests pass: loaded capabilities and
  recording/import checks on base, compact and turbo, plus compact English and
  French Auto/explicit decoding, silence and short-input checks.
- Frontend TypeScript/Vite builds pass. A browser check with the newly exported
  native catalog and mocked IPC verifies download/accuracy labels, explicit
  compact selection, language and low-memory persistence, language/model incompatibilities,
  reloads, failed switch recovery and onboarding. It does not exercise a real
  installer, microphone or installed GUI. Existing frontend chunk-size warnings
  remain unrelated to this change.

Reproduce quality runs with [speech-tier-comparison.md](../speech-tier-comparison.md).
The [raw evidence](2026-10-09-speech-tiers/) retains requests, model and waveform
fingerprints, native outputs/logs, full results/scores and pending review queues,
six memory ledgers, the prior 120-row default comparison, source snapshots,
sampler/verification scripts and validation logs. The summary and archive have
outer SHA-256 lists; the archive also has an internal list. No model weights,
user database or private audio are included. Nothing was pushed or installed.
