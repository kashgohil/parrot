# Completed cleanup formatting — ISSUE-1082

Parrot formats a completed, content-guarded result after model cleanup. Both
built-in cleanup and legacy Ollama use the same formatting rules. The
[measured comparison](benchmarks/2026-10-09-cleanup-formatting.md) records the
unchanged prompts, model candidates and content guards alongside returned text.

The pass changes only an initial ASCII letter's case and, for recognizable
clauses, adds one terminal mark. It does not translate, paraphrase, reorder words,
restore spelling or infer internal sentence boundaries. It retains internal
names, amounts, uncertainty, negation and decimal/version separators. Internal
name/day/acronym casing remains the model's responsibility.

At least three whitespace-separated tokens are required. An ASCII sentence start
can be capitalized when the text already has sentence punctuation or matches a
terminal rule; mixed-case first words such as `iPhone` stay intact. English
statement cues require an auxiliary with words before and after it. Auxiliary
inversion with a pronoun/determiner or a matching capitalized source name can
receive `?`. Unknown subjects, dependent-clause prefixes and unfinished predicates
abstain. Candidate capitalization cannot create source-name evidence.

Hindi and Hindi–English mixing can receive `।` after selected finite/copular
endings (`है`, `हैं`, `था`, `थी`, `थे`, `किया`, `गया`, `गई`, `गए`, `हुआ`, `हुई`,
`हुए`). Listed interrogatives and dependent-clause cues abstain, including
comma-marked words. These narrow cues cannot determine intonation or all Hindi
syntax. Latin scripts other than English receive no inferred terminal punctuation;
CJK punctuation remains model-generated.

Quotes, backticks, code/URL/email markers, brackets, multiline structure,
nonalphabetic starts and uncertain leading pause tokens veto the entire pass.
Existing punctuation is retained. Formatting runs once on the whole transcript,
never on sidecar token/byte segments. Short-input bypasses, disabled cleanup,
incomplete generations and invalid segment coverage retain the existing exact
source path.

A rejected model response can still yield a formatted, guarded source fallback.
The evaluation records `fallback` separately from `formatting_applied` and keeps
`unformatted_text`, `candidate` and `model_output` for attribution. Formatting
checks are separate from fidelity screening and human decisions. A fixture's
`format_check` declares allowed terminal characters and optional initial uppercase;
it does not grade internal capitalization, commas, grammar or meaning.

Reproduce quality runs with the existing runner and all three local tiers, using
two repeats on the unchanged seed, faithfulness, filler and formatting manifests.
Use `quality-evaluation.py compare` against the corresponding ISSUE-1051 runs;
new format checks do not replace source-content checks. Build both release
workers first, as described in [quality evaluation](quality-evaluation.md).
Run the [owned process-tree memory sampler](cleanup-tier-comparison.md) with the
seed corpus, two repeats and both the frozen baseline worker and current worker.
Keep compilation outside those measurements.

English, Hindi and Hindi–English mixing remain release priorities. Synthetic
surface checks cannot approve meaning or real-speaker performance; native-speaker
review remains ISSUE-1077. Whole-app 8/16 GB Mac validation remains ISSUE-1072.
The default tier and saved choices are unchanged.
