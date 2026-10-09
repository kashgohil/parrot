# Cleanup tier comparison — ISSUE-1051

Compare the existing Qwen2.5 0.5B, 1.5B and 3B Q4_K_M tiers using the same
production prompt, source guards and token budgets. Keep the current default and
saved selections until measured evidence justifies a change. English, Hindi and
Hindi–English mixing are release priorities; other seed languages are regressions.

Build both release workers as documented in [quality evaluation](quality-evaluation.md).
Use a local copy of `quality-evaluation.example.json` containing all three tiers.
For ASR-to-cleanup, include available speech models, set `pipeline: true`, and use
the unchanged seed manifest. The published run uses Whisper Turbo Auto with the
opt-in Hindi–English hint and Parakeet Auto. Both speech and cleanup run sequentially;
the evaluation never loads both native engines into one process.

Run the quality runner twice on the seed, `cleanup-faithfulness.json` and
`cleanup-fillers.json`. Each run retains candidates, returned text, factual/script
checks, timing, completion limits and hash-bound pending review. Synthetic checks
cannot rank meaning or useful formatting; raw fallbacks must stay visible.

Measure all three tiers with the same seed inputs and two extra identical short
requests, reversing tier order on the second pass:

```sh
python3 apps/desktop/scripts/cleanup-tier-memory.py \
  --config /path/to/local-models.json \
  --manifest apps/desktop/src-tauri/tests/fixtures/quality/manifest.json \
  --binary apps/desktop/src-tauri/target/release/parrot-quality-eval \
  --sidecar apps/desktop/src-tauri/target/release/cleanup-sidecar \
  --output /path/to/fresh-resource-directory --repeats 2
```

The macOS sampler includes only each new worker and its descendants. It records
load time, first/warm short-request timings, every process ledger and sampled
summed peaks. A missing ledger is excluded from peak calculations and counted
explicitly. Physical footprint and RSS remain separate; model file size is disk
storage. None is a whole-app RAM requirement. Fresh processes do not imply cold
filesystem caches. Physical 8/16 GB device and energy qualification remains
ISSUE-1072; native-speaker and semantic review remains ISSUE-1077.
