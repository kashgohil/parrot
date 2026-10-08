# Local quality seed corpus

All 16 cases are synthetic. No user dictation or private text is included.
`manifest.json` owns references, independent cleanup inputs, factual markers,
primary metrics and source recipes. `provenance.json` records each WAV's SHA-256,
format, duration and synthesis recipe. English/French basic recordings reuse the
existing ISSUE-1041 fixtures.

The seed covers English, French, Spanish, Hindi, Hindi–English mixing, Chinese
and Japanese. Hindi/CJK/mixed cases use character error rate as the primary
metric; other speech uses word error rate. Both metrics remain diagnostic in
the result rows. Word normalization retains Indic combining marks and accents.
Number spellings remain distinct for error-rate scoring, while factual markers
can declare equivalent written/spoken forms.

Rishi and Karen provide **synthetic accent proxies**, not real-speaker accent
validation. Non-English references and pronunciation still need native-speaker
review. The Hindi–English case explicitly concatenates Hindi and English voice
segments with 100 ms gaps; it is a synthetic code-switching stress case.

The 120-second fixture contains two complete copies of the existing long English
reference, followed by silence. There is no partial reference tail. It checks
each topic twice in order. This strict completeness contract also flags cleanup
that deduplicates an entire repeated paragraph; deciding whether that removal
matches a real speaker's intent requires review. The old 120-second import
failure remains archived in `docs/benchmarks/2026-10-07-memory-baseline.md`; its
partial-tail recipe differs, so its WER must not be compared directly to this
fixture's WER.

Regenerate from the repository root with macOS `say` voices and `ffmpeg`:

```sh
python3 apps/desktop/scripts/generate-quality-fixtures.py --force
```

Voice implementations can change across macOS versions. Regeneration updates
the audio hashes and creates a new baseline; do not assume bit-identical audio.
The checked-in WAVs let other platforms evaluate the same bytes without TTS.

To add a consented failure, create a separate local manifest and WAVs, keep its
provenance/consent record locally, and pass `--manifest` to the evaluation runner.
Do not commit private recordings or evaluation outputs. The default local
`quality-results/` directory is ignored by Git.
