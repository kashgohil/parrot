# Local language review preparation

ISSUE-1077 is in progress. The user will review the prepared packet and has no
real-speaker recordings yet. No human judgment has been imported. All acceptance
checkboxes remain open. This report records preparation checks, not language or
release accuracy. Physical device validation remains ISSUE-1072.

## Prepared evidence

The ignored `quality-results/issue-1077/recognition/` packet contains ten unchanged
synthetic waveform references, 70 distinct review subjects and 140 repeated ASR
rows. It compares base/compact/turbo Auto and explicit Hindi with the final
optional turbo hint. Base remains an excluded diagnostic. Identical repeated
subjects share a decision; different model, prompt, source or reference contexts
do not. The packet SHA-256 is
`40680e63814acbe872fee272b0bce03daabafc6069af6c420e38703c2f0b7544`.

The separate ignored `quality-results/issue-1077/cleanup-current/` packet selects
English/Hindi/mixed cases from the final seed, faithfulness, filler and formatting
runs. It contains 53 references, 549 distinct subjects and 1,098 repeated rows.
Its packet SHA-256 is
`0eb799ed35cb39d380dd2f0ac2251c6b76aa02475999d2b65e8a2a359ff7571a`.
These batches do not cover every historical experiment. Both retain exact result
snapshots and embed the evaluated audio for offline listening. Original waveform
files must remain available for import identity checks.

The [review guide](../language-review.md) explains pronunciation/reference review,
explicit output checks, local JSON draft export/import and real recording intake.
The twelve-prompt intake template has false consent and blank paths/attestation;
its Hindi prompts require review before use. No real recordings were collected,
no microphone was opened and no new model inference was needed for preparation.

## Validation

All 46 Python tests passed: 32 quality-evaluation, seven memory-evaluation and
seven review tests. The review tests cover stale recording/result identity,
context-sensitive repeat grouping, native-review requirements, partial imports,
consent/hash validation before inference, private destination enforcement, safe
HTML payload embedding and exact snapshot preservation. Toy test recordings and
test reviewer decisions are test data, not human evidence.

A headless browser opened the actual recognition packet locally. It verified
ten references and 70 initially pending subjects, real embedded audio playback,
decision gates, withdrawal of reference approval, draft export/restore, mobile
layout and zero remote requests or page errors. Automated browser interactions
left every decision pending and native-speaker attestation false. They were not
imported as human review.

Both private packet paths are ignored by Git. Only tools, public templates and
documentation are committed. No review files, private audio, application install,
model/prompt changes or push are part of this preparation.

## Remaining work

Import the user's saved review JSON and address rejected or corrected references.
Collect consented real speech in English, Hindi and Hindi-English mixing, then
compare raw default/hint recognition and review cleanup independently. Report
names, amounts, polarity, uncertainty, intended mixing and unresolved failures.
Neither automated checks nor a brief visual acknowledgment establish those
judgments. Semantic release qualification remains false.
