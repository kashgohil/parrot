# Unicode-aware cleanup eligibility — ISSUE-1046

Microphone dictation and file imports now use the same
[documented eligibility policy](../cleanup-eligibility.md). The old rule counted
whitespace-separated words; substantive Chinese/Japanese/Thai sentences could
therefore bypass cleanup. The new rule uses Unicode words and grapheme clusters,
while global Off and resolved per-app disabling still take precedence.

Three Unicode words outside the scripts commonly written without spaces qualify.
Text containing Han, Hiragana, Katakana, Thai, Lao, Khmer or Myanmar qualifies at
eight letter/number graphemes, including mixed-script content. This is a content
length heuristic. Short substantive phrases can still bypass; thresholds and
examples are explicit in the policy. It does not modify the input or replace
ISSUE-1047's actual model-token budgeting.

## Repeated native checks

The checked-in synthetic eligibility fixture contains 34 cases: 17 qualify and
17 bypass. Coverage includes English punctuation/contractions/Unicode spaces,
Hindi, Hindi–English mixing, Chinese, Japanese, Thai, Lao, Khmer, Myanmar,
combining marks, mixed scripts, punctuation/emoji, empty input and disabled
settings. Three Qwen2.5 Q4_K_M tiers ran two sequential passes each: **204 result
rows**, comprising **102 native cleanup requests and 102 bypasses**. The second
pass reverses tier order. Requests use Neutral tone and the production pipeline
policy, prompt construction, sidecar and finalizer.

| Tier | Rows | Bypasses | Completed native generations | Finalizer/limit fallbacks | Exact input retained |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0.5B | 68 | 34 | 32 / 34 | 14 | 64 |
| 1.5B | 68 | 34 | 34 / 34 | 10 | 60 |
| 3B | 68 | 34 | 34 / 34 | 6 | 66 |

All decisions matched the fixture expectations. All bypasses retained the exact
input, including whitespace, and recorded no native segments or model completion
status. All qualifying requests reached native inference. The 0.5B Lao request
hit its 103-token output allowance in both passes; each returned the exact source
with empty usable model output. There were no transport/native error rows.

Final normalized letter/mark/number sequences matched the inputs for all 204
rows. Normalization is NFKC plus case folding; this comparison permits punctuation
and whitespace edits and is not semantic or punctuation-quality validation.
190 final texts matched the exact original string. All per-tier repeated texts,
bypass decisions and completion statuses matched. Source fallbacks remain visible;
they do not count as successful model cleanup. The sidecar context stays at 2,048
tokens and every observed prompt plus output reservation fits that limit.

## Verification and evidence

- Ordinary Rust library: **69 passed**, 13 opt-in tests ignored.
- Quality-enabled Rust library: **72 passed**, 13 opt-in tests ignored.
- Python quality runner: **27 passed**.
- Ordinary app and quality-worker release builds passed.
- An in-memory database test covers enabled/disabled app profiles and import
  inheritance. No saved settings or user database were opened.
- The headless bypass test uses an invalid model file and a missing worker path;
  every skipped request succeeds with exact text. This proves no model acquisition
  is required for these requests, not that an already warm app unloads its model.

[Summary](2026-10-09-cleanup-eligibility/summary.json),
[requests, outputs, diagnostics, runner and validation logs](2026-10-09-cleanup-eligibility/native-validation.tar.gz),
and [archive checksums](2026-10-09-cleanup-eligibility/SHA256SUMS) are checked in.
The archive also contains individual file hashes. No models or binaries are
included. `evaluate.py` inside the archive reproduces the assertions using the
explicit local paths; adapt its paths/model config for another machine.

Native source: `0a95c46c7b2c1641b6d77bba2b59f465e8bc0cc5`.

| Artifact | SHA-256 |
| --- | --- |
| Quality worker | `75bacd441e0fc76899448192e9081ea6d8f9fb10771a210226600801b8a4d196` |
| Unchanged ISSUE-1047 sidecar | `2b8797d22cad981145849f39f4a8259da347b40b74b521dc928b0c46c3cfab3a` |
| Eligibility fixture | `437e78c8a292cd0ea30e3c36f9b88a098f0ddd3d239834b228979594c707febb` |

Model hashes are in the summary. Hardware: Apple M4 Pro, 24 GiB unified memory.
These checks use synthetic text and headless workers; they do not exercise live
microphone/paste UI or prove lower-RAM performance, native-speaker accuracy or
useful cleanup for every qualifying phrase. There is no memory/latency improvement
claim. Native-speaker qualification remains ISSUE-1077 and physical device
validation remains ISSUE-1072. Nothing was installed or pushed.
