# Initial transcription and cleanup quality baseline

ISSUE-1050 establishes an evaluation baseline, not a release-quality approval.
Two passes produced **498 result rows** with no inference errors and identical
text for all 249 case/configuration pairs across repeats. Release priorities are
**English, Hindi and Hindi–English mixing**. Other seed languages remain
regression coverage.

The important findings are a failed Hindi–English recognition stress case and
same-script translation by the 0.5B cleanup model. Both require follow-up before
release qualification. Human review is pending for all 498 rows; non-English
reference text and synthetic pronunciation need native-speaker review.

**ISSUE-1049 sidecar correction:** the original cleanup run used an existing
sidecar binary whose hash was `33ce7eb5de2e046887673362fa1e3dd3ea2af182d887c1ad87a579ea03ca1045`.
Rebuilding the current `parrot-cleanup-sidecar` package produced
`e9495b0779058acba150ce3266fe1cd2836780292ced581cb6e6f76beebb4c32`.
Identical pre-change worker/model/input replay showed missing Hindi marks with
the old binary and intact marks with the rebuilt binary. Do not attribute those
old cleanup mark losses to model quality. The original archive remains intact
as measured; ISSUE-1049 compares both prompts using the freshly rebuilt sidecar.
Its [comparison report](2026-10-09-faithful-cleanup.md) records the replacement
baseline, raw evidence and UTF-8 validation. ASR is a separate process and its
original measurements do not depend on this sidecar correction.

## Method and evidence

- Hardware: Apple M4 Pro, Mac16,7, 24 GiB RAM, macOS 26.6.2, arm64.
- Speech: Whisper large-v3-turbo Q5_0, Whisper small Q5_1 and Parakeet v3 INT8
  using its default CPU policy. No model downloads or user database changes.
- Cleanup: existing Qwen2.5 0.5B and 1.5B Q4_K_M files in the production sidecar.
- Corpus: 16 synthetic cases; 15 have audio. Repeated 120-second audio contains
  two complete varied English references followed by silence. Accent cases are
  synthetic Indian/Australian voice proxies, not real-speaker validation.
- ASR: Auto and explicit hints on both Whisper models, Auto on Parakeet. Native
  capabilities exclude four unsupported Hindi/CJK cases per Parakeet pass.
- Isolated cleanup: identical fixed transcripts across Casual/Neutral/Formal.
  Pipeline cleanup: each engine's actual Auto transcript, using Neutral tone.
- Native worker source: `f74a54c`; corpus: `8d6d493`; scorer/workflow: `31e308a` with UTF-8 portability `f53c42b`.
  Exact native binary, audio and model hashes are in `results.json.gz`.

The archived [summary](2026-10-09-quality/summary.md) includes per-language and
per-stage results. [SHA256SUMS](2026-10-09-quality/SHA256SUMS) verifies the raw
worker JSONL archives, full results, scores, pending review queue and proposed
gates. JSON archives use gzip; decompress `results.json.gz` to `results.json`
in a new local directory to re-score using the committed runner. No live model
is needed for scoring or review.

| Stage | Rows across two passes |
| --- | ---: |
| Raw ASR | 142 |
| Isolated cleanup | 192 |
| ASR-to-cleanup | 164 |
| Unsupported combinations skipped | 8 |

Skipped combinations are not passing evaluations. Empty-input checks are result
rows even when production guards bypass native inference. These measurements
do not include GUI overhead, whole-app RAM or physical microphone capture.

## ASR observations

Auto results below are normalized primary error rates on this seed only. Hindi,
Hindi–English and CJK use CER; the other rows use WER. English micro WER is heavily
weighted by the long recording. Each non-English language has only one or two
sentences per pass, so these values do not estimate population accuracy.

| Seed language | Whisper turbo | Whisper compact | Parakeet v3 |
| --- | ---: | ---: | ---: |
| English, WER | 2.8% | 4.2% | 3.1% |
| Hindi, CER | 9.7% | 19.4% | Skipped |
| Hindi–English, CER | 61.8% | 58.8% | Skipped |
| French, WER | 5.3% | 5.3% | 10.5% |
| Spanish, WER | 0.0% | 25.0% | 0.0% |
| Chinese, CER | 0.0% | 8.3% | Skipped |
| Japanese, CER | 0.0% | 0.0% | Skipped |

For the synthetic reference `शायद प्रिया ने invoice approve नहीं किया।`, turbo
Auto returned `Shayad Priya ne Invoice approved.` and compact Auto returned
`In voice approved.`. The required Hindi script and negative statement were
lost. An explicit Hindi hint did not consistently solve the case: turbo CER was
64.7%, compact CER 44.1%. The smaller numerical error rate does not establish
faithful meaning. Validate the synthetic audio with a native speaker and add
consented real Hindi/Hinglish failures before choosing a model or hint policy.

The compact Chinese output used traditional `沒有` in place of simplified
`没有`. The strict reference metric and marker flagged that difference. This is
an example of a flag that needs language review rather than an automatic claim
of meaning loss. Hindi spelling/name errors and English/French filler or name
boundaries also contribute to the seed's scores.

All speech variants returned empty text for silence and accidental short input.
Every long ASR result preserved the required topics twice in order, retaining
the completeness behavior established by ISSUE-1056. The old failed import
baseline remains archived in its original report; its partial-tail recipe
differs and is not a valid direct WER comparison.

## Cleanup observations

The 0.5B model translated turbo's raw French transcript
`E-Priya n'a pas approuvé le paiement de 25 euros.` into
`E-Priya has not approved the payment of 25 euros.` in both passes. Finalization
accepted the translation because both texts use Latin script. The 1.5B model
preserved French in this case. This is a concrete same-language failure for
ISSUE-1049, beyond the script guard added in ISSUE-1043.

On compact's Spanish case, ASR first returned `Mariano aprobó el pago de 25
euros.`, already losing the intended name/negation. The 0.5B cleanup then returned
`Mariano approved the payment of 25 euros.`. The evaluation attributes the
initial recognition error to ASR and the subsequent translation to cleanup.

| Cleanup model | Isolated rows / new flags | Pipeline rows / new flags | Finalizer fallbacks | Returned unchanged |
| --- | ---: | ---: | ---: | ---: |
| Qwen 0.5B | 96 / 6 | 82 / 4 | 22 / 178 | 116 / 178 |
| Qwen 1.5B | 96 / 6 | 82 / 0 | 32 / 178 | 116 / 178 |

All 12 isolated flags across the models concern the exact repeated long
paragraph: each tone returned one copy rather than two. This fails the corpus's
strict occurrence/order contract. The source is intentionally repetitive, so
product review must decide whether deduplication preserves the speaker's intent;
do not present this as proof of general long-text truncation. Pipeline long
inputs, with ASR's different formatting, retained the checked occurrences.

The four 0.5B pipeline flags are the French and Spanish translations across two
passes. Pending flags are screening results, not blanket semantic judgments.
Fallback/unchanged counts include empty-input checks and already-clean text;
they are not a measured cleanup failure rate. Inspect original model responses
to distinguish protection by fallback from useful editing.

These results do not justify changing the default cleanup model. ISSUE-1051
still needs the 3B tier, reviewed quality judgments and process-tree memory/load
tradeoffs. The current measurements preserve all user model selections.

## Proposed gates

The machine-readable [proposal](2026-10-09-quality/proposed-gates.json) records
observed per-case primary rates and these initial conditions. They are proposals,
not approved production thresholds:

1. No inference errors or speech on empty references.
2. No human-confirmed critical change to names, amounts, negation, uncertainty,
   language or intended substantive content. Resolve every property flag before
   qualifying a supported release configuration.
3. Preserve required long-input topic occurrences and order, subject to a reviewed
   contract for intentional repetition.
4. For the same corpus, normalization and model bytes, introduce no new property
   flags and keep each case's worst primary error rate within **two percentage
   points** of its pinned baseline. The two measured passes were text-identical;
   this small tolerance is a proposed regression screen. Short sentences can
   exceed it with a single new error, which should trigger review.
5. Qualify English, Hindi and Hindi–English separately with native-speaker review
   and consented real recordings. A passing English aggregate cannot qualify
   Hindi/Hinglish. Synthetic accent and code-switching cases are regression
   probes, not release evidence for real speakers.

The baseline itself does not satisfy release-quality gates. Passing a comparison
against it only means no newly detected regression; existing failures remain
open. Human review remains explicit, and `semantic_release_qualified` is false.
Low-RAM hardware and physical capture validation remain separate in ISSUE-1072.

## Validation

- Python metric/property/review/comparison suite: **21 tests passed**.
- Rust quality-eval feature suite: **49 passed, 12 opt-in tests ignored**.
- Ordinary Rust suite: **48 passed, 12 opt-in tests ignored**.
- Release quality worker and ordinary app binary builds passed.
- Full real-model matrix: **498 rows, zero inference errors**, two matching text
  passes. Self-comparison passes while explicitly retaining failed release
  qualification. Archive hashes and decompression/re-scoring were verified.

Follow-up: ISSUE-1049 tracks faithful cleanup and the same-script translation
failure; ISSUE-1074 tracks Hindi/Hinglish reference review and recognition
retention. ISSUE-1051 keeps the complete cleanup-tier/resource comparison open.

See [the local workflow](../quality-evaluation.md) for reproduction, privacy,
normalization, review and comparison instructions.
