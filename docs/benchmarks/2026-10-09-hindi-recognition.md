# Hindi–English recognition diagnosis and optional hint

ISSUE-1074 adds an **explicit, experimental Hindi–English recognition hint for
verified Whisper turbo models**. It is off by default and available under
Settings → Speech → Recognition hint with Auto-detect or Hindi. Selecting it
changes the initial writing-style example, not the language preference, model,
encoder context, chunking, cleanup or memory policy. Existing unconditional
vocabulary is retained. Compact is excluded after observed regressions.

Native-speaker pronunciation/reference checks, consented real-speaker cases and
semantic release acceptance are explicitly separate in **ISSUE-1077**, at the
user's request. Physical capture, 8/16 GiB devices and energy remain ISSUE-1072.
Nothing here establishes population accuracy or supported RAM tiers.

## Evidence and comparison

M4 Pro, 24 GiB, macOS 26.6.2. Existing turbo Q5_0 and compact small Q5_1 models;
no download, installed-app setting change or user dictation access. The original
16-case seed remains unchanged. A separate ten-case synthetic corpus adds
positive/negative pairs, uncertainty, names, amounts, technical words and
controlled voice transitions. Every waveform and native binary/model is hashed.

[Raw evidence](2026-10-09-hindi-recognition/) contains twelve run/resource
archives, summaries, native chunk diagnostics, a gap-only waveform check and
outer/internal SHA-256 lists. **1,114 archived native result rows** comprise:

| Run | Rows | Scope |
| --- | ---: | --- |
| Pilot | 64 | Two original Hindi cases, two models, four context/segmentation profiles, Auto/Hindi, two passes |
| Focused matrix | 400 | Ten cases, two models, five context/segmentation/prompt variants, Auto/explicit, two passes |
| Exploratory app off / hint / hint + vocabulary | 120 | Forty rows each; prototype before compact was excluded |
| Frozen default / final default | 240 | 120 each; original seed, both models, Auto/explicit, two passes |
| Exploratory original seed with hint | 60 | Both models before the turbo restriction |
| Final turbo off / on | 40 | Twenty each; protected ten-case manifest, Auto, two passes |
| Final turbo original seed with hint | 30 | Original seed, Auto, two passes |
| Resource measurements | 160 | Sixteen fresh workers, ten requests each |

All archived inference runs completed without errors. Every repeated text pair
in the scored runs is identical. All **120 final default transcripts exactly
match the frozen pre-ISSUE-1074 worker**; its automated comparison passes. The
final turbo off/on comparison passes, with existing fact flags unresolved.
The exploratory compact off/on comparison fails with four new case flags.
These checks do not confer semantic release acceptance. All 954 scored rows
remain unreviewed; resource results are separate native JSONL, not approvals.

The final ten-case turbo comparison gives:

| Reference language | Default CER | Hint CER | Requests per condition |
| --- | ---: | ---: | ---: |
| Hindi–English (seven cases) | 53.5% | 5.3% | 14 |
| Hindi (two cases) | 4.9% | 4.9% | 4 |
| English negative control | WER 0% | WER 0% | 2 |

CER is a micro rate over letters, numbers and combining marks, with whitespace
and punctuation excluded. These are repeated synthetic samples, not independent
speakers. The default/hint mixed groups both retain **12 strict fact-screening
flags**: lower CER does not imply correct facts. For example, `invoice approve`
becomes `invoice approved`/`invoice approval`, and `रवि` becomes `रविवार`.
Do not waive those flags or infer real-speaker accuracy from the score.

Original voice-switch sample:

- Reference: `शायद प्रिया ने invoice approve नहीं किया।`
- Turbo Auto default: `Shayad Priya ne Invoice approved.`
- Turbo Auto with hint: `शायत प्रिया ने invoice approved नहीं किया।`

The hint restores Devanagari and negation on this sample but still misspells the
uncertainty word and changes the English word form. Compact changes from
`In voice approved.` to `शायत प्र्याने नहीं किया`: the English phrase is still
missing. The technical sample's turbo hint retains `API timeout`, `300`,
`release deploy` and `मत`, but outputs singular `millisecond` for `milliseconds`.
Positive controls have no observed literal negation additions in the recorded
screening; semantic polarity still needs review.

## Attribution and rejected alternatives

The original Auto decoder selects English (native language token 0), while the
single-Lekha negative sample selects Hindi (17) and already retains the mixed
sentence without the hint. Removing both 100 ms gaps from the original sample
leaves identical voiced PCM and still selects English/lossy default output.
This separates the explicit gaps from the artificial speaker/voice transition;
it does not reproduce natural single-speaker code-switching.

The style hint improves output while the original Auto language token remains
English. It biases decoder wording; it does not repair language detection or
add simultaneous language tokens. Explicit Hindi alone loses the English phrase.
Changing native segmentation alone gives the same texts in the focused matrix.
Full context fails to fix the original Auto sample and loses `मत` from another
turbo technical sample. Upstream also describes shortened context as an
[accuracy/speed tradeoff](https://github.com/ggml-org/whisper.cpp/discussions/297).
The app retains its existing context and bounded long-input completeness policy.

The hint is a held-out writing example, with no fixture answer or negation:
`आज meeting में project status पर discussion होगा।` The bare English vocabulary
experiment causes a turbo repetition loop on a positive sample. Adding the
existing-style `Vocabulary hints: Kubernetes.` to the bilingual hint worsens
some Hindi/script results, including repeating the Hindi payment sentence.
Vocabulary/style interactions remain a review requirement, and the UI states
that custom vocabulary can change the result.

The broader original seed shows compact hint regressions in English and French,
including Hindi-script output from Latin-script references. Final app gating
therefore requires the actual turbo architecture: vocabulary 51,866, 32 audio
layers, 4 text layers. Settings reads the GGML header; native decoding verifies
the loaded model. Stale IDs, custom filenames or incomplete headers cannot grant
eligibility. Language coverage and hint availability remain separate from
semantic qualification; `mixed_language_evaluated` stays false. Other turbo
quantizations/custom weights are not qualified by this Q5_0 experiment.

## Worker resource measurements

Sixteen sequential fresh workers sample macOS `proc_pid_rusage` physical ledgers
at 50 ms. Each processes the same ten requests. The second pass reverses
condition order. The archived sampler reuses the repository's existing memory
ledger implementation, records live and lifetime peak footprint, RSS, load and
inference timings, hashes inputs/outputs and owns only its launched process.
There are no sampling errors. Caches and system activity are uncontrolled.

| Turbo condition | Lifetime peak physical footprint (MiB) | Median inference per pass (ms) |
| --- | ---: | ---: |
| Default | 802.6–804.3 | 835.3–835.8 |
| Optional hint | 807.5–809.0 | 834.6–835.1 |
| Hint + held-out vocabulary | 809.5 | 829.8–835.8 |
| Full context diagnostic | 803.7–804.7 | 1,294.9–1,316.7 |

The hint adds a few MiB in these runs and has similar median inference latency;
it is **not a memory reduction**. Full context is slower and not a reliable
quality fix. Compact default workers peak at 488.6–509.3 MiB, but their recognition
errors prevent recommending them for Hindi–English accuracy. Compact hint
resource conditions use an explicit raw initial prompt for diagnosis; the final
app refuses that hint mode on compact. These are headless speech-worker peaks,
including model loading, not simultaneous whole-app peaks or device support.

## Validation and reproduction

- Rust: 58 passing quality-feature tests; 56 passing ordinary tests; 12 opt-in
  tests ignored in each ordinary suite. Two separately enabled actual-model
  capability tests pass on turbo and compact: recording/import use the hint on
  turbo and reject it on compact, and normal English transcription still works.
- Python evaluation tests: 23 pass. Frontend TypeScript/Vite and release app/worker
  builds pass. Browser harness passes with native-exported catalog and mocked
  Tauri IPC, including default-off/persistence, memory preferences, saved
  incompatibilities, compact refusal and existing language/model/onboarding checks.
- Fixture fact contracts, all audio provenance and archive hashes verify. GUI
  microphone/event delivery and physical-device performance are not exercised.

Build commands and runner are in [quality-evaluation.md](../quality-evaluation.md).
Use the protected `tests/fixtures/quality/hindi-recognition/manifest.json` with
speech variants `prompt_style: "default"` / `"hindi-english"`, the existing turbo
model and `language_modes: ["auto"]`, two passes and new output directories.
Use the original manifest separately for general-language/long-input regression.
Raw initial prompts and `whisper_decode_profile` remain opt-in diagnostics;
production compact cannot use the bilingual hint mode.

The frozen worker SHA is
`7e01d17e7ef1b2c5be0ca8077ed3f7523e5124c799b9b6fa6c04ddf6c3c5140d`;
final gated worker SHA is
`59738bf97388a56997857a21c9799c7a0ae838fa00af46b07c05408e91f4c8bf`.
The recorded execution checkout alone is not build attestation; actual binary
hashes identify the measured workers. Exploratory archives predate the gate;
final turbo/default archives use the gated worker. The two focused manifest
versions differ in provenance protection, not audio/reference content. Only
matching manifest hashes are used for automated off/on comparisons.

The resource archive includes `measure.py`. After extracting `app-before`, run
it with `--repo /path/to/parrot --baseline /path/to/extracted/app-before --out`
followed by a new directory. Adjust recorded local model/audio paths for another
checkout. Retain the model and waveform hashes and report changed conditions.
All work is local; nothing was pushed or installed into the running app.
