# Multilingual Whisper tier evaluation

ISSUE-1045 compares multilingual base Q5_1, small Q5_1 and turbo Q5_0.
The existing Compact multilingual option uses **small-q5_1**, not **small.en**.
Base is an evaluation candidate; this config does not add it to Settings.

Use the [speech-only example](../apps/desktop/scripts/speech-tier-comparison.example.json)
with absolute paths to downloaded GGML artifacts. Build the worker as described
in [quality-evaluation.md](quality-evaluation.md), then run both unchanged corpora:

```sh
python3 apps/desktop/scripts/quality-evaluation.py run \
  --config /path/to/speech-models.json --output /path/to/new-seed-results \
  --manifest apps/desktop/src-tauri/tests/fixtures/quality/manifest.json --repeats 2
python3 apps/desktop/scripts/quality-evaluation.py run \
  --config /path/to/speech-models.json --output /path/to/new-hindi-results \
  --manifest apps/desktop/src-tauri/tests/fixtures/quality/hindi-recognition/manifest.json \
  --repeats 2
```

Keep Auto and explicit language results separate. The explicit mode for a mixed
case uses its first declared language, Hindi. Use the default recognition prompt
for all tiers: the optional Hindi–English style hint is qualified separately
for turbo and is unavailable on compact. Never use an evaluated reference as a
prompt. Preserve model, waveform and worker hashes, errors, fact flags and
pending human review queues.

The corpora use synthetic voices, including artificial voice transitions for
some mixed speech. Repeats measure reproducibility, not independent speakers.
English, Hindi and Hindi–English are release priorities; French, Spanish,
Chinese and Japanese are regression coverage. Language-token support does not
establish recognition quality. Native-speaker and real-speaker review remains
ISSUE-1077.

Measure resources separately after compilation and quality runs finish. Start
one fresh owned speech worker at a time, repeat the same short request to report
first and warm inference, include long input, and reverse tier order on the
second pass. Retain actual macOS physical ledgers and RSS with failed samples
counted and excluded. Record file-cache uncertainty. Download size is storage,
not runtime memory; headless worker measurements exclude the GUI, cleanup,
microphone and other applications. Actual 8/16 GiB device validation remains
ISSUE-1072. Do not infer those device requirements from a 24 GiB development Mac.
