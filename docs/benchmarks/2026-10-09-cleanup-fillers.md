# Source-aware filler preservation — ISSUE-1048

The previous global English filler list deleted valid words in other languages,
quoted words and names. The same list also excluded those words from preservation
checks, allowing a model to delete them without triggering fallback. Both layers
now use the [conservative source-context policy](../cleanup-fillers.md).

Only leading lowercase pauses before recognized English clauses can be removed.
All other words stay in the ordered content guard. Quotes, non-ASCII alphabetic
text and other scripts disable removal; later token-budget segments cannot gain
permission to delete interior words. Builtin and Ollama responses share the same
policy. Incomplete generations still retain the exact input.

## Repeated native comparison

The unchanged 12-case cleanup fidelity corpus and a new 32-case filler corpus
ran before and after the change with Qwen2.5 0.5B, 1.5B and 3B Q4_K_M, all three
tones, and two sequential passes: **1,584 native result rows**. The sidecar and
model bytes are identical in both phases. These are forced isolated cleanup
requests, so even short test inputs reach inference rather than application
eligibility bypass. No ASR inference or model-selection settings change.

The filler corpus targets German `er`/`um`, Hindi/Hinglish and Romanized Hindi,
German–English mixing, Chinese/Japanese controls, names, quotations/code words,
acknowledgments, interior pauses, punctuation/symbol lookalikes, meaningful
English words, and permitted English openings. Non-English references are
synthetic and have not received native-speaker approval.

| Focused corpus | Rows per phase | Source-content flags before → after | Fallbacks before → after | Token-limit fallbacks before → after |
| --- | ---: | ---: | ---: | ---: |
| 0.5B | 192 | 156 → 0 | 50 → 120 | 6 → 6 |
| 1.5B | 192 | 162 → 0 | 76 → 144 | 0 → 4 |
| 3B | 192 | 162 → 0 | 28 → 114 | 0 → 0 |
| Total | 576 | **480 → 0** | **154 → 378** | **6 → 10** |

All 576 final focused outputs match the fixture's permitted letter/mark/number
sequence after NFKC and case folding. This includes 486 context-preservation rows
and 90 rows with permitted leading-pause removal. All repeated final texts,
completion statuses and fallback decisions match. There are no inference error
rows; every recorded prompt plus output reservation fits its 2,048-token context.

Fallbacks increase because models still delete protected words. The 10 incomplete
generations retain exact input and empty usable model output: six 0.5B rows
(Hindi-leading Neutral/Formal and Hindi–English-interior Formal, both passes)
plus four 1.5B Hindi-leading Neutral/Formal rows. The extra four limits appeared
after the prompt/policy change and remain an unresolved generation limitation.
They are not successful model cleanup. This targeted corpus does not estimate
general language accuracy, punctuation quality or useful cleanup for real speech.

The existing fidelity corpus produces 216 rows per phase, with no inference
errors or incomplete generations. Its 18 source-content screening flags remain
unchanged, all on the explicit amount-correction case; they are not waived here.
Reference fact flags remain zero, and fallback counts change from 70 to 68.
Both corpus comparisons pass the existing worst-repeat regression check without
new property flags. All **792 candidate semantic/usefulness decisions remain
pending** under ISSUE-1077.

## Verification and reproducibility

- Ordinary Rust library: **74 passed**, 13 opt-in tests ignored.
- Quality-enabled Rust library: **77 passed**, 13 opt-in tests ignored.
- Python quality runner: **27 passed**.
- Ordinary app and quality-worker release builds passed.
- The 32-case fixture also tests echo and adversarial outputs under every tone,
  with and without an explicit writing style. Each actual backend finalizer
  receives 192 adversarial cases. Separate tests exercise whole-transcript quote
  context across segment boundaries and exact incomplete retention.

[Summary](2026-10-09-cleanup-fillers/summary.json),
[109 archived files](2026-10-09-cleanup-fillers/native-validation.tar.gz), and
[checksums](2026-10-09-cleanup-fillers/SHA256SUMS) include raw requests, outputs,
stderr, scores, hash-bound review queues, comparisons, fixtures, model config,
validation logs and `evidence.py`. Every internal file hash and both outer hashes
were verified. The archive is 583,521 bytes and contains no models or binaries.

Before worker: unchanged ISSUE-1046 production code, local revision `568939b`
(compiled code matches `0a95c46`). Some baseline metadata records a dirty working
tree while that saved binary ran; the saved worker's identical hash establishes
which executable was used. Candidate worker source: `7d4b93c`.

| Artifact | SHA-256 |
| --- | --- |
| Before quality worker | `75bacd441e0fc76899448192e9081ea6d8f9fb10771a210226600801b8a4d196` |
| Candidate quality worker | `2b2c3c440dcf2be3c0805ae535c727a98c1e30d45f39293a130c0d70298e9d60` |
| Unchanged sidecar | `2b8797d22cad981145849f39f4a8259da347b40b74b521dc928b0c46c3cfab3a` |

Model/fixture hashes and hardware are recorded in the summary. Development
hardware is Apple M4 Pro with 24 GiB unified memory. To repeat a phase, build the
worker at the chosen revision, adapt the archived `models.json` paths, and run
the following once per corpus with a fresh output directory:

```sh
python3 apps/desktop/scripts/quality-evaluation.py run \
  --manifest apps/desktop/src-tauri/tests/fixtures/quality/cleanup-fillers.json \
  --config /path/to/models.json --output /path/to/fresh-output \
  --binary /path/to/parrot-quality-eval --sidecar /path/to/cleanup-sidecar \
  --repeats 2
```

Use `cleanup-faithfulness.json` for the existing corpus. The archived evidence
script checks the four result directories and reconstructs the summary/archive;
adapt its directory paths and select a fresh destination when reusing it.

This policy deliberately retains actual fillers when context is uncertain.
Same-script switching and uncapitalized names remain contextual ambiguities,
documented in the policy. There is no new language detector/dependency and no
memory or latency improvement claim. Native-speaker and real-speaker qualification
remains ISSUE-1077; physical lower-RAM validation remains ISSUE-1072. No installed
app, saved settings, database, private dictation or microphone was accessed.
Nothing was installed or pushed.
