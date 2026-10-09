# Completed cleanup formatting — 2026-10-09 (ISSUE-1082)

Completed cleanup now applies conservative source-preserving capitalization and terminal punctuation after the existing content guard. **Basic remains the default; saved model and low-memory selections are unchanged.** Both built-in cleanup and Ollama share the pass. No app was installed or launched, and no user model store or database was modified.

The unchanged eight-case formatting corpus improves from **8/48 → 30/48** on Basic, **24/48 → 36/48** on Standard and **2/48 → 36/48** on Large. All **90/90 English, Hindi and Hindi–English surface checks** pass across three tiers, three tones and two repeats. This grades terminal punctuation and initial case only; it does not approve meaning, grammar, internal name/day/acronym capitalization or real-speaker accuracy.

## Behavior and attribution

English clauses with clear auxiliary cues can receive a terminal period or question mark. Selected Hindi finite/copular endings can receive `।`, including mixed-script statements. The first ASCII letter can be capitalized without rewriting subsequent words. Quotes/code, multiline structure, fragment/dependent/interrogative ambiguity and uncertain leading pauses abstain. Unknown languages receive no inferred terminal mark. The [rule contract](../cleanup-formatting.md) lists the scope and limits.

Formatting runs once after whole-transcript finalization, including a content-guarded fallback after a translated or damaged response. Incomplete generations and short-input bypasses retain exact input, as does invalid segment coverage. Evaluation keeps `model_output`, `candidate`, `unformatted_text`, `fallback` and `formatting_applied` distinct. Useful punctuation does not hide a rejected model response.

## Formatting results

Each tier has 48 results: eight unchanged inputs × three tones × two passes. Per-language contracts are explicit in `cleanup-formatting.json`; Hindi accepts `।` or `.`, Chinese/Japanese accept `。` or `.`, and the English question requires `?`. English/French also require an uppercase initial character.

| Tier | All cases before → after | Neutral before → after | Priority cases before → after |
| --- | --- | --- | --- |
| Basic 0.5B | 8/48 → 30/48 | 2/16 → 10/16 | 8/30 → 30/30 |
| Standard 1.5B | 24/48 → 36/48 | 8/16 → 12/16 | 18/30 → 30/30 |
| Large 3B | 2/48 → 36/48 | 0/16 → 12/16 | 2/30 → 30/30 |

Basic and Standard still reject translated/damaged Hindi model suggestions; the safe source now receives terminal punctuation. These fallbacks remain counted. A lowercase English response can gain initial case and punctuation without claiming that all internal names or weekdays were repaired. French remains unpunctuated on Basic/Standard when the model omits the terminal mark; the pass does not infer French grammar. The Chinese probe remains unpunctuated on all tiers; Japanese punctuation remains model-generated. The remaining failed probes stay visible and pending review.

## Unchanged fidelity and generation limits

The final comparison contains **1,432 scored rows per phase** (2,864 total), including 52 ASR and 1,380 cleanup rows per phase. The baseline is the hash-bound ISSUE-1051 result; the candidate is a fresh two-repeat run. Corpus, model bytes, prompts, inputs, raw model candidates, completion reasons and guard fallback decisions match exactly across phases. Every completed candidate's `unformatted_text` equals the prior returned output. ASR text is unchanged. All paired outputs also repeat exactly within each phase. Four worst-repeat regression comparisons pass.

| Corpus/stage | Results per tier | Fallbacks before = after (Basic / Standard / Large) | Incomplete before = after |
| --- | --- | --- | --- |
| seed/isolated | 96 | 32 / 52 / 12 | 0 / 0 / 0 |
| seed/pipeline | 52 | 24 / 20 / 16 | 0 / 0 / 0 |
| faithfulness/isolated | 72 | 24 / 28 / 16 | 0 / 0 / 0 |
| fillers/isolated | 192 | 120 / 144 / 114 | 6 / 4 / 0 |
| formatting/isolated | 48 | 18 / 22 / 2 | 0 / 0 / 0 |

No new source-content/fact flags appear. The **18 intended amount-correction screening flags remain unwaived** (six per tier); removing an explicit corrected amount is not silently treated as reviewer approval. Seed ASR-to-cleanup retains **20 reference-fact flags per tier** from upstream recognition, with zero new cleanup source flags. All 576 focused filler outputs retain their exact normalized content oracle, including meaningful `um`/`er`, quoted words and mixed-language tokens.

The existing **six Basic and four Standard filler token-limit results remain visible**, with byte-for-byte raw input; Large has none in that suite. No transcript, prompt or generation budget was shortened. All recorded segment prompt-plus-output reservations remain ≤2,048 tokens. Synthetic screening cannot prove semantic equivalence.

## Latency and owned process-tree memory

Quality timings exclude model load and include finalization. Each median includes native requests only; empty-input and eligibility bypasses are excluded. Hardware is an M4 Pro with 24 GiB unified memory. File/Metal caches are uncontrolled, so fresh processes do not imply cold disk or first-ever use.

| Corpus/stage | Basic median ms before → after | Standard | Large |
| --- | --- | --- | --- |
| seed/isolated | 73.5 → 74.1 | 139.5 → 119.3 | 279.2 → 229.1 |
| seed/pipeline | 70.6 → 68.6 | 127.2 → 117.1 | 264.3 → 202.3 |
| faithfulness/isolated | 82.4 → 72.4 | 156.3 → 124.5 | 279.6 → 222.1 |
| fillers/isolated | 44.7 → 42.9 | 86.6 → 78.1 | 162.9 → 144.3 |
| formatting/isolated | 72.9 → 70.1 | 130.5 → 122.5 | 247.7 → 218.5 |

A fresh, quiet resource comparison uses the frozen baseline worker and the final worker, each with all three tiers × two fresh-process passes. Tier order reverses on pass two. Each worker runs identical first/warm short text followed by the unchanged seed inputs. There is no overlapping compilation, GUI or ASR benchmark. Each sampled peak sums only the new worker and its owned sidecar; it excludes the installed app and existing Ollama service.

| Phase/tier | Load ms range | First request ms | Warm identical ms | Peak physical footprint MiB | Peak RSS MiB |
| --- | --- | --- | --- | --- | --- |
| before/Basic | 361.1–6809.4 | 94.4–113.0 | 51.8–52.1 | 186.0–194.5 | 593.1–601.6 |
| before/Standard | 190.5–357.1 | 211.7–215.2 | 82.6–83.2 | 220.6–221.1 | 1225.4–1231.3 |
| before/Large | 240.7–272.5 | 397.0–400.0 | 135.5–138.3 | 239.8–239.9 | 2190.9–2192.2 |
| after/Basic | 358.3–390.8 | 94.4–107.0 | 51.6–51.6 | 186.0–186.2 | 593.2–600.5 |
| after/Standard | 181.5–188.6 | 212.6–213.7 | 81.8–83.4 | 218.7–218.7 | 1229.4–1229.5 |
| after/Large | 225.8–231.6 | 394.4–399.2 | 135.9–138.1 | 239.6–239.9 | 2191.7–2192.0 |

Every per-process ledger, identity, sample timestamp and actual sampling gap is retained. Missing ledgers are excluded from peaks and counted, never treated as zero. Physical footprint and RSS are separate OS accounting measures; summed RSS can count shared resident pages more than once; download size is storage. These measurements cannot establish a whole-app RAM requirement, GPU residency, energy use or an 8/16 GB release claim. Timing variation is descriptive rather than a statistical performance guarantee. Warm-request and sampled memory ranges overlap the frozen baseline; no algorithmic speedup or memory saving is claimed. The first frozen Basic load took 6.81 s and remains included as a startup/load outlier with no assigned cause. It makes the load-time comparison unsuitable for a speedup claim.

- before: 372 complete samples; 1 incomplete samples excluded; maximum measured gap 95.8 ms.
- after: 278 complete samples; 2 incomplete samples excluded; maximum measured gap 85.8 ms.

## Validation, provenance and review

89 Rust library tests pass with `quality-eval` (14 native/manual tests ignored), and 86 pass in the ordinary build (14 ignored). All 37 Python tests pass, including separate formatting/fidelity checks. Release quality-worker and sidecar builds pass. Both backends have direct tests for completed formatting, rejected translations/negation loss, protected quotations and exact incomplete fallback; invalid segment coverage is tested independently. No frontend behavior or UI code changed.

The final worker was built from source `024e2da`; all final quality runs identify that clean tracked revision. The final worker SHA-256 is `364eef05e9063610f7da41e57999a4f9b5365f6d81c6055322e0e50ccb197c34`. Resource harness metadata identifies its current checkout in both phases; the frozen baseline binary fingerprint identifies the historical native code. The baseline worker is frozen from ISSUE-1051, SHA-256 `86d86e0f89c64ed0ccd1ae5ab2042827ca38e681ee5b05953e78759e92a0e6fc`. The sidecar remains byte-identical (`2b8797d22cad981145849f39f4a8259da347b40b74b521dc928b0c46c3cfab3a`). Native binary/model hashes, configurations, prompts, source snapshots, raw requests/responses, score files, review queues, memory ledgers and logs are retained in the adjacent archive.

An excluded prompt-only experiment failed to improve small-tier Hindi adequately; its production prompt was restored. An excluded initial formatter experiment preceded the source-name question and dependent-clause abstention fixes. Both raw experiments are archived separately and excluded from final counts and timings. Existing dead-code build warnings are retained.

All 1,432 final output decisions remain pending in hash-bound review queues. ISSUE-1077 retains native-speaker/reference/meaning review; ISSUE-1072 retains physical lower-RAM and whole-app validation. No synthetic result or body update grants those approvals.

Evidence: [summary](2026-10-09-cleanup-formatting/summary.json), [raw archive](2026-10-09-cleanup-formatting/native-validation.tar.gz), [checksums](2026-10-09-cleanup-formatting/SHA256SUMS). The archived `evidence.py` rechecks model/input/prompt/candidate identity, unchanged guard outputs, repeat determinism, incomplete exact source, filler content, comparison results and complete-ledger peaks before constructing the hash-verified archive.
