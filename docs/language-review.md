# Hindi and mixed-speech review

ISSUE-1077 requires human pronunciation/reference decisions, consented real
recordings and output judgments. Preparing a packet or passing automated checks
completes none of those requirements. The user will review the packet; no real
recordings are available yet. Device validation remains ISSUE-1072.

## Review the existing synthetic recordings

The first prepared local packet is in
`quality-results/issue-1077/recognition/index.html`. Open it in a browser. It
contains ten unchanged focused recordings and 70 distinct output contexts from
140 repeated ASR results: base/small/turbo Auto and explicit Hindi, plus turbo's
experimental mixed style hint. Model, prompt, reference and recording identity
remain part of each judgment. Matching repeats share a decision; different
contexts remain separate. This packet is the first review batch, not every
historical experiment or a real-speaker qualification.

The separate current cleanup packet is
`quality-results/issue-1077/cleanup-current/index.html`: 53 references and 549
distinct output contexts from 1,098 repeated results. It includes the priority
English/Hindi/mixed cases from the seed, faithfulness, filler and formatting
runs. Review it after recognition; retained upstream recognition errors can
appear in a cleanup result. Every decision starts pending in both packets.

1. Enter your name or reviewer handle and record your native-Hindi attestation.
   Attest only if true; Hindi judgments stay pending without a native reviewer.
   Play a recording and compare it with the
   exact displayed reference. Confirm you listened, judge pronunciation and
   alignment, and add notes. Review English words in Lekha's voice and the
   artificial Lekha/Samantha transitions carefully.
2. If pronunciation or alignment needs correction, record what differs in the
   notes. Leave output judgments pending. Corrected references require a new
   corpus/evaluation/packet; the importer does not silently replace them.
3. Once the reference is valid, inspect each recognition result independently
   of cleanup. Record meaning, names, amounts, polarity, uncertainty, language
   and script, intended mixing, omissions/additions, and cleanup usefulness
   where applicable. Positive statements need a polarity judgment too.
4. Mark the output approved, rejected, or pending, with notes. An approval needs
   explicit passing/not-applicable checks; meaning, polarity, language/script
   and omissions/additions cannot be marked not applicable. Rejection needs a
   failed or uncertain check. Literal fact flags remain visible and unwaived;
   explain harmless spelling/transliteration differences in your notes.
5. Download your JSON draft before closing the page. Use Open draft to resume.
   The page uses embedded audio, has no external dependencies and cannot send
   network requests. It does not autosave. Keep the HTML, JSON and recordings
   local; do not publish or commit them.

Recreate the first packet from the original local evaluation directories:

```sh
python3 apps/desktop/scripts/quality-review.py prepare \
  --run speech-tiers=/path/to/ISSUE-1045-focused-results \
  --run turbo-hint=/path/to/ISSUE-1074-final-hint-results \
  --output quality-results/issue-1077/new-recognition-packet
```

Use `--languages en hi` (the default) to select priority references. Other
languages can be included explicitly. The corresponding WAV files must still
match their evaluated hashes. Complete runs and actual model/recording
fingerprints are required; no inference is performed by packet preparation.

Import the downloaded judgments into a new private directory:

```sh
python3 apps/desktop/scripts/quality-review.py import \
  --packet quality-results/issue-1077/recognition/review-packet.json \
  --reviews /path/to/your-downloaded-review.json \
  --output quality-results/issue-1077/reviewed-recognition
```

Import validates packet/results/recording identity, named reviewer, timestamp,
listening confirmation, reference decisions, notes and semantic checks. It
expands a judgment only to the packet's identical subjects. Per-run reviews and
re-scored summaries are written alongside a copy of results; original benchmark
files remain intact. Pending decisions remain pending. No import grants release
qualification; reference corrections and failures require separate action.

Prepared packets retain byte-identical `runs/<label>/results.json` snapshots.
Review import uses those copies, so deleting an original temporary benchmark
folder does not lose the evidence. Keep the evaluated waveform files as well;
their bytes are checked again before import. The page embeds the same audio for
offline listening, but embedding it does not waive the recording identity check.

The original review scorer now requires `subject_sha256`, `output_sha256`, a
reviewer and notes for every decision. Old output-only decisions must be
re-recorded against a current queue; they cannot be silently carried forward.
Changes to audio, reference, source, model/prompt or native binary invalidate
subject identity. Repeat numbers, timings and absolute model paths do not.

## Collect real recordings locally

Use your own speech first. Obtain explicit permission for local evaluation from
any other speaker. Use a pseudonymous speaker ID; avoid real personal, financial
or confidential information. Copy the
[local intake template](../apps/desktop/scripts/real-speaker-intake.example.json)
into `quality-results/issue-1077/`. Its twelve drafted prompts cover English,
Hindi and mixing, with positive/negative controls, names, amounts, uncertainty,
technical terms and sentence boundaries. Consent is deliberately false and
paths/reviewer/timestamps are blank; the template cannot be evaluated as-is.
These Hindi prompts still need native-speaker review. They are not ground truth.

Record WAV files with your normal microphone and natural speaking style. Leave
short pauses before and after speech; do not synthesize, concatenate voices or
artificially switch speakers. Keep positive/negative pairs separate. Capture
both readings and at least two spontaneous, multi-sentence samples per priority
language using safe invented details. Include the natural failures you want to
fix; do not discard bad recognition. A small convenience sample still does not
establish population accuracy.

After listening, replace each proposed reference with **what was actually
spoken**, including negation, uncertainty and intentional English words. Record
names/numbers and the intended script explicitly. Add factual markers only after
checking the reference; do not infer the reference from a model's output. Add
case tags and provenance for spontaneous cases. The template has empty fact
lists so it cannot claim those classes are automatically screened.

For each recording, enter its actual path, speaker ID, `local_evaluation: true`,
the consent attester's handle and `attested_at` as an ISO timestamp with timezone.
Only attest consent you have obtained. Then create a private corpus:

```sh
python3 apps/desktop/scripts/quality-review.py create-corpus \
  --intake quality-results/issue-1077/intake.json \
  --output quality-results/issue-1077/real-corpus
```

This copies only the listed WAV files, records their hashes/consent, and marks
references pending. It does not open the microphone, synthesize speech, scan
folders or upload files. Review/corpus outputs must be outside the repository or
under its ignored `quality-results/` directory. The evaluation runner rejects
real-speaker cases without consent metadata or with changed recording hashes.

Run the existing [speech-only comparison](speech-tier-comparison.md) on the new
manifest. Keep raw ASR separate from cleanup. Compare default turbo with its
optional mixed hint on the same reviewed real recordings, and compact as the
explicit memory tradeoff. Base remains an excluded diagnostic, not a release
model recommendation. Add an ASR-to-cleanup run only after inspecting raw ASR.
Pin model/audio/prompt hashes and preserve every failure and pending decision.

```sh
python3 apps/desktop/scripts/quality-evaluation.py run \
  --manifest quality-results/issue-1077/real-corpus/manifest.json \
  --config /path/to/local-speech-models.json \
  --output quality-results/issue-1077/real-results --repeats 2
```

Prepare and review another packet from those results. Add the original seed and
current cleanup formatting/faithfulness/filler results as separate review
batches with the same prepare command. Existing hashes must match; automated
fidelity, formatting and safe fallback checks are not semantic approval.

## Complete the issue with evidence

Keep the fixture corrections and reviewer decisions tied to their hashes. Record
consented real-speaker coverage for all three priority groups and failure classes,
raw default/hint WER/CER and human-approved meaning retention. Summarize rejected
outputs and unresolved limitations rather than treating a lower error rate as a
fix. Evaluate prompt/model recommendations again on that reviewed corpus.

All ISSUE-1077 acceptance checkboxes stay open until the corresponding human and
real-speaker evidence exists. ISSUE-1072 owns physical low-RAM devices, whole-app
memory and energy. Nothing in this workflow installs, publishes or pushes code.
