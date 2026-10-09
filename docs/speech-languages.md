# Speech languages and model capabilities

ISSUE-1044 makes Settings, onboarding and native decoding use the same model
capability contract. The backend owns the model catalog. Language names and
codes come from the bundled Whisper library, including Hindi and Cantonese.

| Model | Coverage | Language preference |
| --- | --- | --- |
| Parakeet v3 | 25 European languages, including English | Always auto-detects; a saved preference does not pin decoding |
| Whisper large-v3-turbo | 100 languages, including Hindi and Cantonese | Auto-detection or explicit hint |
| Whisper small-q5_1 | 99 languages, including Hindi; excludes Cantonese | Auto-detection or explicit hint |
| Whisper small.en | English only | Both Auto and English decode English |

Coverage describes the model's vocabulary. It does not establish accuracy for
every language, accent or recording that mixes languages. Mixed-language
evaluation remains pending in ISSUE-1050. Download sizes shown during setup
are not RAM requirements; device validation remains separate in ISSUE-1072.

## Selection and persistence

Settings lists Auto plus all 100 language codes. Unsupported choices are marked
as requiring another model. Selecting one only edits the language preference;
it does not download or switch a model. Settings offers compatible multilingual
models through explicit buttons, which download the selected model if needed.
Use **Save changes** to persist language edits. Model switches apply immediately
and preserve the language preference and memory settings.

A model switch that makes the saved language incompatible shows a warning.
Native preview, final recording and imported audio also reject the incompatible
combination before decoding, with a Settings action in the error. Select Auto
or a compatible model to continue. On Parakeet, an explicit supported preference
remains saved but cannot force that language during decoding.

The backend trims and lowercases language codes; missing or empty values mean
Auto. Unknown codes are rejected before calling native code. Existing unknown
saved values remain visible so the user can replace them.

## Existing and custom model files

For Whisper, status reads only the first eight bytes of the GGML file to obtain
the vocabulary size. It does not load model weights. Actual file metadata takes
precedence over the saved model ID, including renamed files. The active model
card and language picker both use that coverage. If an existing file has an
unrecognized header or vocabulary, Settings reports unknown coverage. Native
decoding validates against the loaded model's vocabulary; recognized language
codes with unknown custom vocabularies remain subject to native support.

If a catalog model has no local file yet, status uses its catalog capabilities.
An unknown custom model ID with no readable file retains unknown coverage.
Catalog-loading failures expose a Retry action and disable language selection
or setup until the catalog becomes available.

## Validation

Validated on an M4 Pro Mac with 24 GiB RAM and macOS 26.6.2. These checks do not
constitute validation on an 8 or 16 GiB Mac or with a physical microphone.

- Default and `memory-bench` feature suites: **48 passed, 12 opt-in tests ignored**
  in each suite.
- Production frontend build and release Rust binary build passed.
- `whisper_loaded_model_capabilities` passed with existing base.en,
  small-q5_1 and large-v3-turbo-q5_0 files. For each file, the header and loaded
  context agreed. Unsupported hints failed before inference on both recording
  and import paths. Missing, whitespace/case-normalized Auto and English hints
  produced matching recording/import transcripts. Base.en exercises the same
  English-only vocabulary contract as the catalog's small.en tier; small.en
  weights were not downloaded for this check.
- `whisper_multilingual_inference` passed with compact small and turbo, covering
  the existing English/French Auto and explicit-hint fixtures, silence and short
  input. These are focused regressions, not a broad accuracy evaluation.
- Browser checks used the built React app with mocked Tauri IPC and a catalog
  exported from the native test. Checks cover all 101 options, Parakeet's
  auto-detection copy, Hindi offers without automatic downloads, explicit
  switches, saved preferences, English-only Auto, the Cantonese boundary,
  failed-download recovery/listener cleanup and retained low-memory settings.
  Additional checks cover custom and stale model IDs, repairing a stale ID by
  explicitly selecting its catalog model, unknown saved language values,
  catalog failure/retry, and all four tiers during onboarding. Starting setup
  requires an explicit click and preserves the chosen compact model ID.

Run backend checks from `apps/desktop/src-tauri`:

```sh
cargo test --locked -p parrot --lib
cargo test --locked -p parrot --lib --features memory-bench
PARROT_TEST_WHISPER_MODEL=/path/to/ggml-model.bin cargo test --locked -p parrot --lib whisper_loaded_model_capabilities -- --ignored --nocapture
PARROT_TEST_WHISPER_MODEL=/path/to/ggml-multilingual-model.bin cargo test --locked -p parrot --lib whisper_multilingual_inference -- --ignored --nocapture
cargo build --locked --release -p parrot --bin parrot
```

From the repository root, run `bun run --cwd apps/desktop build` for the frontend.
Opt-in native tests use existing local model files and never download weights.

The optional browser harness is `apps/desktop/scripts/check-speech-settings.cjs`.
It requires Playwright with Chromium available in your development environment;
it adds no production dependency. Capture the native test's output in a log,
then serve the frontend with Vite preview and run the harness in another shell:

```sh
# From apps/desktop/src-tauri, with an existing local model:
PARROT_TEST_WHISPER_MODEL=/path/to/ggml-model.bin cargo test --locked -p parrot --lib whisper_loaded_model_capabilities -- --ignored --nocapture > /tmp/parrot-speech-capabilities.log 2>&1
# From the repository root, in a separate shell:
bun run --cwd apps/desktop preview --host 127.0.0.1 --port 4173
# From the repository root, while the preview is running:
PARROT_SPEECH_CATALOG=/tmp/parrot-speech-capabilities.log node apps/desktop/scripts/check-speech-settings.cjs
```

`PARROT_PLAYWRIGHT_MODULE` can point to an existing Playwright module outside the
repository. `PARROT_CHROMIUM_PATH` selects an existing Chromium executable;
`PARROT_UI_URL` overrides the default preview URL. The harness uses a fresh
browser context and mocks every Tauri call, including downloads and setup. It
does not access the user's Parrot database or start real downloads.

## Capability sources

- [NVIDIA Parakeet v3 model card](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3)
  documents its 25 languages and automatic language detection.
- [OpenAI Whisper tokenizer](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py)
  defines language codes, including Hindi and Cantonese.
- [OpenAI Whisper model](https://github.com/openai/whisper/blob/main/whisper/model.py)
  defines the vocabulary-based multilingual and language-count contract.
- The bundled [whisper.cpp implementation](https://github.com/ggml-org/whisper.cpp/blob/master/src/whisper.cpp)
  supplies the native language list and vocabulary behavior used by Parrot.

## Experimental Hindi–English recognition hint

Settings → Speech → Recognition hint offers an optional mixed writing example.
The default adds no style hint. Hindi–English is explicit, experimental and
requires a verified Whisper turbo model with Auto-detect or Hindi.
It leaves the language preference, model tier and memory policy unchanged.
Compact is excluded after observed English/French script regressions.
Saved incompatible hints remain visible and block native decoding until the
user chooses Default or compatible model/language settings. Parakeet, English-only
Whisper, compact and unknown custom coverage cannot be presented as compatible. The
Parakeet upgrade banner is suppressed while a nondefault hint is saved.

`stt_prompt_style=hindi-english` is read through the shared `TranscribeOpts` loader
for previews, final dictation and imports. The held-out mixed writing example is
prepended to existing unconditional vocabulary hints; conditional vocabulary
still belongs to cleanup. The quality worker can set `prompt_style` per case,
and the Python runner per speech variant; results record the exact resolved
prompt. No fixture answer, transcript or cleanup instruction is included.

The synthetic comparison supports trying this hint with turbo, but does not
establish real-speaker accuracy. Compact still has major recognition errors.
Names, spelling, amounts and English word forms can remain wrong; the hint
cannot guarantee negation retention. Reviewed audio and consented real-speaker
validation are tracked separately in ISSUE-1077. Physical-device qualification
remains ISSUE-1072. Full encoder context and native segmentation remain diagnostic
ablations, not new app defaults.

Hint availability is separate from language coverage and semantic qualification.
`hindi_english_hint` is true only for the turbo architecture (51,866 vocabulary,
32 audio layers, 4 text layers). Settings reads these values from the actual
GGML header; native decoding checks the loaded model. Stale model IDs, custom
filenames and an incomplete header cannot make compact/full-size/English-only
models appear eligible. This identifies the model family, not a guarantee for
every quantization or custom weight file; measured evidence uses Q5_0.
