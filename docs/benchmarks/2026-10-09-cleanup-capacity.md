# Token budgeting and complete cleanup — ISSUE-1047

Cleanup now measures the full chat template with the loaded model's tokenizer,
reserves output before decoding, and processes long transcripts in bounded
segments. Token, context and byte stops are explicit incomplete results. The app
retains the exact original on those stops, including sections already processed.
The native context remains **2,048 tokens**.

This report archives **1,152 headless result rows**: 1,128 scored before/after
requests and 24 results from 12 separate memory runs. Inputs are public synthetic
text. It does not qualify semantic correctness, real-speaker performance, UI or
microphone behavior, or an 8/16 GB device. Native-speaker review remains
ISSUE-1077; physical-device validation remains ISSUE-1072.

## Results

| Suite | Requests per phase | Before | After |
|---|---:|---|---|
| Original seed | 288 | No inference errors | All 288 final texts exactly unchanged |
| Faithfulness cases | 216 | No inference errors | All 216 final texts exactly unchanged |
| Capacity cases and raw hint control | 54 | 24 inference errors | No inference errors; 8 explicit token-limit fallbacks |
| Applied oversized hints | 6 | All 6 inference errors | No inference errors; all 6 requests report bounded hints |

Each suite covers Qwen 0.5B, 1.5B and 3B Instruct Q4_K_M with two repeats. Seed
and faithfulness cases use Casual, Neutral and Formal; capacity/hint cases use
Neutral. All four regression comparisons pass. All repeated text/status pairs
match. Existing faithfulness flags for intentionally corrected-away numbers
remain unchanged (18 source-property flags); they are not waived.

The 48 long-input results include numbered English, Hindi and Hindi–English
records, unspaced Chinese/Japanese, repeated sentences and text without sentence
boundaries. All 54 capacity outputs and all 6 applied-hint outputs retain the
complete normalized letter/number/mark sequence and numeral order of their
inputs. They introduce no fact/script/number/order flags. This is automatic
preservation screening, not evidence that model cleanup was useful in every
section. Content guards still reject shortened or rewritten model responses.

Eight capacity requests hit the token limit: four with 0.5B, two with 1.5B and
two with 3B. Their final output is the exact original input, `complete=false`,
`fallback=true`, and their usable model output is empty. Those cases count as
safe fallbacks, never completed model cleanups. All 564 candidate review entries
remain pending human review.

**Hint-test configuration:** the full capacity suite was launched with the
historical runner from `3618c10`, which supplied variant-level hints. Its case
named `optional-hint-overflow` therefore served as a short control with empty
hints, not an oversized-hint test. The separate `hints-before/after` runs use
`4274ac7`, which supports fixture overrides. Their archived requests contain the
actual large vocabulary/context/style strings. This avoids repeating unaffected
long-input inference and makes the effective configuration explicit.

## Memory

The separate sampler runs a short warm-up followed by the 60-record Hindi input
in a fresh headless worker, samples its owned process tree every 50 ms, and
reverses condition/model order on the second pass. It includes model load and
cleanup, with no parallel benchmark inference or builds during measurement.
The machine is an **Apple M4 Pro with 24 GiB RAM**.

| Model | Before footprint (MiB) | After footprint (MiB) | Before RSS (MiB) | After RSS (MiB) |
|---|---:|---:|---:|---:|
| qwen-0-5b | 206.2–232.3 | 186.7–187.9 | 668.3–709.1 | 593.8–602.2 |
| qwen-1-5b | 290.9–290.9 | 223.8–227.4 | 1723.5–1988.4 | 1234.6–1238.2 |
| qwen-3b | 308.1–308.9 | 244.0–245.7 | 3825.1–4360.6 | 2194.3–2196.1 |

These are sampled peaks of the sum of per-process ledgers. Physical footprint
and RSS measure different things: RSS includes resident file-backed model pages.
Do not interpret the smaller footprint figure as total app RAM requirements, or
add it to RSS. Per-process lifetime peaks and raw samples are archived separately.
Sampling can miss short peaks; filesystem/kernel caches and other system work
were not controlled.

The old long-input request fails prompt decoding and restarts the sidecar while
its previous model is still owned. The new request fits bounded segments and
does not restart for limits. This removes that observed overlap in this workload;
it does not shrink model weights or establish memory savings for every request.
All six candidate memory runs finish without native errors. UI, microphone, ASR,
the already-installed app and energy are excluded from attribution. Long cleanup
still costs additional inference time; the memory bound is not a latency promise.

## Implementation and checks

The sidecar plans at most 4,096 input bytes at a time and reserves
`max(96, input_tokens + ceil(input_tokens/2) + 64)` output tokens. Every complete
segment has `prompt_tokens + output_budget <= context_tokens == 2048` in the
archived responses. Sentence/newline boundaries are preferred, then whitespace,
then a UTF-8 boundary. There is no transcript clipping. Per-segment and global
content checks preserve order and safely retain sections the model alters.

Vocabulary/context/style hints share 256 tokens and a 4,096-byte preparation
cap. They do not consume the base preservation contract or truncate transcript
characters. Excess hints are logged and returned as `hints_truncated`; saved
preferences stay unchanged. The byte safety stop is 8,000 per generation segment.
EOS is required; an additional content token after the reserved budget is an
incomplete result. Protocol version 2, ordered byte coverage and token reservations
are checked by the app. Missing/malformed metadata fails immediately. Limit
responses reuse the worker; transport failures retain the existing one-retry policy.

Validation passed:

- Rust app: 65 tests with quality-eval; 63 in ordinary configuration (13 ignored
  local-model tests in each).
- Sidecar: 3 regular tests; both enabled real-model tests pass.
- Three enabled app/sidecar integration tests pass, including unchanged PID after
  truncation, recovery, idle release/reload, and request correlation.
- Python: 26 tests; all declared fixture references satisfy fact/order contracts.
- Release sidecar, quality worker and ordinary app build; packaged arm64 sidecar
  matches the tested release binary. No app was installed or launched.

The native boundary checks cover below/at/above reserved context, reject an
overflow before cache mutation, force token and byte stops, and recover on the
same warm session. A Chinese input receives a measured 370-token reservation
instead of the old whitespace-based allowance of about 98. UTF-8 token-byte
reconstruction tests also pass.

The legacy Ollama path now requires an explicit normal completion; its live
server and model residency are not exercised by these headless tests. The
existing whitespace-based **cleanup eligibility** rule remains ISSUE-1046:
budgeting is fixed here, but some unspaced inputs can still be skipped before
the cleanup worker is called. Hindi fixture wording and real-speaker suitability
remain subject to the separately tracked review.

## Evidence and reproduction

The adjacent directory contains eight scored-run archives, `resources.tar.gz`,
`validation.tar.gz`, `summary.json` and outer `SHA256SUMS`. Every tar contains
internal hashes, original requests/results, logs and review queues; no models,
executables, user dictation or app database are included.

| Binary | Source | SHA-256 |
|---|---|---|
| Before quality worker | `3b29bee` | `59738bf97388a56997857a21c9799c7a0ae838fa00af46b07c05408e91f4c8bf` |
| Before sidecar | Pre-1047 implementation | `e9495b0779058acba150ce3266fe1cd2836780292ced581cb6e6f76beebb4c32` |
| After quality worker | `3618c10` | `d7429cc59c66cfef39f6ab750775dbf56ff1788b00e752d649e945ae3e0b7fd1` |
| After sidecar | `3618c10` | `2b8797d22cad981145849f39f4a8259da347b40b74b521dc928b0c46c3cfab3a` |

Execution checkout IDs in result metadata do not attest which source built a
frozen binary. The binary hashes above are authoritative. Scored archives include
the actual historical/current runner source. All phases use matching model bytes.
The before sidecar already has the repaired UTF-8 token-byte decoding from
ISSUE-1043; no stale sidecar is used.

Build both workers from `apps/desktop/src-tauri`:

```sh
cargo build --locked --release -p parrot-cleanup-sidecar
cargo build --locked --release --features quality-eval --bin parrot-quality-eval
```

Run the quality runner with explicit local models, `--repeats 2`, and the original
seed/faithfulness/capacity manifests; archive requests are the exact effective
configuration. To reproduce the targeted applied-hint suite with the current
runner, extract `optional-hint-overflow` from the committed capacity manifest into
a single-case manifest; `hints-after.tar.gz` includes that exact manifest. Replay
historical capacity requests as stored if reproducing its empty-hint control.
Use `resources.tar.gz/measure.py` with the arguments declared in its help for the
owned process-tree measurement. Device and native-speaker qualification remain
outside this implementation report.
