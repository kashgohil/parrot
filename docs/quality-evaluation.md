# Local transcription and cleanup evaluation

ISSUE-1050 adds a repeatable local evaluation with separate ASR, isolated cleanup
and ASR-to-cleanup results. The checked-in synthetic seed has 16 cases covering
English, French, Spanish, Hindi, Hindi–English mixing, Chinese, Japanese, accent
proxies, silence, names, numbers, negation, uncertainty, technical vocabulary,
instructions spoken as content and long input.

Release priorities are **English, Hindi and Hindi–English mixing**, as confirmed
by the user. French, Spanish, Chinese and Japanese remain regression coverage.

The opt-in worker uses production transcription, prompts, token budgets and
cleanup finalization. It does not launch the app, open its database, access the
microphone or download models. Cleanup remains in the existing separate sidecar;
llama.cpp is never linked into the speech process. Python uses only its standard
library to orchestrate workers, score outputs and write local reports.

## Run

Build the worker from `apps/desktop/src-tauri`:

```sh
cargo build --locked --release -p parrot --features quality-eval --bin parrot-quality-eval
cargo build --locked --release -p parrot-cleanup-sidecar
```

Copy `apps/desktop/scripts/quality-evaluation.example.json` to a local config and
replace model paths with existing files. Remove variants you do not want to
evaluate. A speech-only config needs no sidecar; a cleanup-only config needs no
speech model. `quantization` is a caller-supplied label, while model SHA-256 hashes
identify the actual bytes. Speech variants can set `initial_prompt`; cleanup
variants can set `custom_words`, `context_prompt` and `writing_style`.

From the repository root:

```sh
python3 apps/desktop/scripts/quality-evaluation.py run \
  --config /path/to/local-models.json \
  --output quality-results/baseline \
  --sidecar apps/desktop/src-tauri/target/release/cleanup-sidecar \
  --repeats 2
```

Output must be a new directory. The default corpus is already checked in; use
`--manifest /path/to/private/manifest.json` for additional local fixtures. The
worker timeout defaults to 900 seconds per model batch and is configurable with
`--timeout`. On POSIX systems, an interrupted or timed-out worker's process group
is killed, including its cleanup sidecar. Partial runs retain `complete: false`.
Inference errors remain explicit result rows and are counted in the report.

The runner checks native model coverage without loading weights. Unsupported
language/model pairs are recorded as skipped, never passed. Parakeet runs Auto
only because supported explicit preferences cannot pin decoding. Whisper can
compare Auto with an explicit hint; a mixed-language case uses its first declared
language for that explicit hint. Each process loads one model at a time.

## Whisper recognition diagnosis

Speech variants may set `whisper_decode_profile` to `production` (the default),
`full-context`, `segmented` or `full-context-segmented`. These options exist only
in the opt-in quality worker. They independently compare the app's shortened
encoder context and single-segment decoding with the model's full context and
native segmentation. Invalid profiles and overrides on other engines fail
before inference. The app's saved preferences and model selection are untouched.
The same production import/chunking path remains in use for every profile.

Each ASR result records the profile and initial prompt. Native stderr records
actual sample count, effective audio context, language token ID and segmentation
for each nonempty native chunk. Long imports have multiple such lines; do not
associate them one-to-one with file results. Silence/short-input bypasses have
none. The language ID identifies the decoder's selected language, not every
language spoken in a mixed utterance or a confidence score.

Shortening the encoder context is a speed/accuracy tradeoff, as explained by the
[whisper.cpp maintainer](https://github.com/ggml-org/whisper.cpp/discussions/297).
Use the same hashed corpus, models and repeated conditions before proposing an
app policy. A full-context improvement on a synthetic sample is not proof of
real-speaker accuracy or a RAM/latency win. Initial prompts should use vocabulary
or held-out example style, never the evaluated reference sentence.

## Results and attribution

`results.json` contains references, raw ASR, fixed cleanup inputs, original model
responses, final text, finalizer fallback flags, full prompts, prompt hashes,
token limits, inference timings and configuration. It also records hardware,
Python/Unicode versions, native binary/model/audio hashes and native source
revision. Native JSONL files preserve model-load timings and result order;
stderr logs retain native diagnostics. Inference timings exclude model loading
and app UI work. Model-load timings use fresh processes with uncontrolled file
caches; they are not guaranteed cold-disk timings. Token limits are budgets.
Cleanup rows additionally contain `token_diagnostics` when serial native stderr
can be correlated without missing/extra messages or inference errors. These are
measured full prompt and generated token counts, cache reuse, prefill time and
generation time. Empty-input bypasses have no native token diagnostics;
uncorrelatable logs remain available for review.

Rebuild both packages before comparing source changes; an existing sidecar file
can predate the checked-out source. Record its hash for both runs. The sidecar's
`cleanup-sidecar: prompt_tok=...` stderr lines measure actual full chat-template
prompt tokens, reused/decoded tokens, prefill time and generated tokens/time.
These lines follow nonempty requests in worker order; empty-input bypasses have
no native inference line. They include system text, transcript and template,
not just the system prompt, and do not measure RAM or energy.

## Default cleanup contract

ISSUE-1049 makes Neutral and Casual conservative when Writing Style is empty.
The model may change case, punctuation and clear structure, but the returned
word sequence must match the source after narrowly specified corrections and
the existing vocal-filler removal. Translation, word substitution, lost names,
negation/uncertainty loss, reordered clauses and removed repeated sentences
cause a source fallback. This also protects same-script language changes. Hindi
marks remain part of the comparison. A fallback can preserve a question without
adding a question mark; punctuation quality still needs review.

The shared deterministic prepass resolves only immediate `I`/article stutters,
`to John no to Jane` with single capitalized ASCII names, and integer corrections
such as `25 no 35`. It preserves the rest of the message. Periods, paragraph
breaks, quoted text, decimal/version corrections, other-language cues and
ambiguous false starts are left intact. The corrected source is supplied to the
model and the finalizer, so correcting an amount does not trip the original
number-retention guard. Numeric-removal flags in evaluation remain visible for
review; an explicit `25 no 35` correction is an intended removal, not a lost fact.

Choosing Formal or supplying a nonempty Writing Style additionally permits a
small set of English tone equivalents, such as `I'm` / `I am`, `can't` / `cannot`
and `stay` / `remain`. These are canonicalized only for explicitly selected
style; pronouns, negation, order and the remaining words stay protected. Arbitrary
paraphrases still cause fallback in these modes. Currency, percentage, sign and
emoji changes are also rejected. Context alone does not opt into rewriting. Conservative cleanup can
keep awkward grammar, spelling or unresolved speech rather than risk changing
content. The deterministic filler list's language ambiguity remains ISSUE-1048;
actual context budgeting and truncation detection remain ISSUE-1047.

The separate text-only `tests/fixtures/quality/cleanup-faithfulness.json` corpus
adds questions, commands, explicit corrections, meaningful hedges, repeated
sentences and the observed French/Spanish pipeline inputs. Evaluate it with
`--manifest apps/desktop/src-tauri/tests/fixtures/quality/cleanup-faithfulness.json`
and a cleanup-only config to isolate prompt/output changes from ASR.

`scores.json` and `summary.md` distinguish:

- **ASR:** reference versus raw recognition, before cleanup.
- **Isolated cleanup:** a fixed synthetic transcript passed to every model/tone.
- **Pipeline cleanup:** each engine's actual Auto transcript, passed to cleanup
  in Neutral tone. An upstream error remains an ASR error. A new marker loss,
  script change or numeric change relative to that raw input is a cleanup flag.
- **Cleanup off:** each cleanup row includes its unchanged-input property baseline.

The report keeps both the model candidate and final returned text. A guard
fallback can preserve content while doing no useful cleanup; fallback and
unchanged counts therefore remain visible. Model errors are not replaced by
raw-text success rows in evaluation.

## Metrics and review

WER and CER use unit-cost Levenshtein substitutions, deletions and insertions,
divided by reference length. Scores can exceed 100%. Empty references have no
rate; their absolute insertions and unexpected speech are checked separately.
Normalization uses NFKC, case folding and unified curly apostrophes. Word units
retain Unicode letters, numbers and combining marks, including Devanagari vowel
signs. CER counts normalized code points in those categories and omits spaces
and punctuation; it does not count grapheme clusters. Accents remain distinct.
Number words are not silently equated with digits during WER/CER scoring.

Hindi, unspaced Chinese/Japanese and mixed-script cases declare CER primary;
other seed speech declares WER primary. Per-language summaries include only the
declared primary metric. Micro averages weight reference length; macro averages
in JSON weight cases equally. The long English case strongly affects micro WER.
Both metrics and edit counts remain available per result.

Factual marker alternatives and occurrence counts screen names, amounts,
negation, uncertainty and technical terms. Latin/Indic phrases use token
boundaries; CJK markers use character spans. Numbers can match immediately
beside CJK characters without matching a different amount. The long recording
also has an ordered topic contract. Script checks detect observable script
loss; they are not language identification. French-to-English translation can
retain Latin script, so language-specific markers and review remain necessary.
Traditional versus simplified Chinese, spelling variants, contractions and
valid paraphrases can cause flags without meaning loss.

`review-queue.json` contains source, reference, output, model response and checks.
Copy it, inspect each item, and set `decision` to `approve` or `reject` with notes.
Preserve its output hash; stale decisions for different text are rejected.
Re-score without running inference:

```sh
python3 apps/desktop/scripts/quality-evaluation.py score \
  --output quality-results/baseline --reviews /path/to/reviews.json
```

Automated flags and pending reviews never qualify semantic correctness. Native
speakers must review the non-English references and audio. Synthetic voice
accent proxies do not establish real-speaker performance. Consented real
failures can be added locally; none were available for the initial seed. The
ignored `quality-results/` directory is intended for private outputs. No text or
audio upload is required.

## Compare changes

```sh
python3 apps/desktop/scripts/quality-evaluation.py compare \
  --baseline quality-results/baseline --candidate quality-results/candidate \
  --max-rate-increase 0.02
```

Comparison checks the worst repeat for each case/configuration. It requires the
same corpus hash, normalization and Unicode version, complete runs, fresh scores
and matching coverage. Model bytes must match unless `--allow-model-changes` is
explicitly supplied. It exits nonzero for missing coverage, inference errors,
speech on empty references, newly lost topic order, new property flags or a
primary error-rate increase above the configured fraction. `0.02` means two
percentage points. Existing failures in a baseline remain unresolved; a passing
regression comparison does not qualify release quality.

The initial measured baseline and proposed review/release gates are documented
in `docs/benchmarks/2026-10-09-quality-baseline.md`. The old long-import failure
remains in its original memory report. Its partial-tail audio recipe differs
from this corpus's complete cycles plus silence, so do not compare their WER
directly.

## Checks

```sh
python3 -m unittest discover -s apps/desktop/scripts -p 'test_quality_evaluation.py'
# From apps/desktop/src-tauri:
cargo test --locked -p parrot --lib --features quality-eval
```

Metric definitions follow the error-counting approach in
[NIST's speech scoring toolkit](https://github.com/usnistgov/SCTK).
Normalization is explicitly specified rather than inferred; see
[Unicode normalization forms](https://www.unicode.org/reports/tr15/).
