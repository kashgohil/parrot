# Hindi / Hindi–English recognition diagnosis

Ten local synthetic cases isolate the original recognition failures. They do
not qualify Hindi, Hinglish, a prompt or a model for release. No user dictation
is included. Native-speaker pronunciation/reference and semantic review remain
pending; the result review queue records each decision separately.

- `hi-facts` and `hi-en-mix` reuse the original seed audio without changing it.
- The same negative mixed sentence is voiced by Lekha alone, by separate
  Lekha/Samantha segments with the original 100 ms gaps, and with zero gaps.
  The zero-gap version has identical voiced PCM to the original; only two
  1,600-frame zero blocks differ. This separates gap effects from voice changes.
- Positive/negative pairs test whether recognition invents or loses negation.
  The positive cases must also be reviewed for *added* negation; fact-presence
  screening alone cannot establish polarity preservation.
- Additional samples cover Hindi/English monolingual controls, uncertainty,
  another name, an amount, English technical terms and a prohibition.

The single-voice Hindi TTS and artificial voice changes are both proxies.
Successful recognition of an alternate proxy does not fix a failing original
recording. Review pronunciation (especially English words in Lekha's voice),
reference alignment, script, names, numbers, uncertainty and polarity before
adding real-speaker conclusions. Consented real-speaker cases stay local and
need their own manifest/provenance; they must not be represented as synthetic.

Regenerate from the repository root only when changing this corpus intentionally:

```sh
python3 apps/desktop/scripts/generate-quality-fixtures.py \
  --manifest apps/desktop/src-tauri/tests/fixtures/quality/hindi-recognition/manifest.json
```

`segment_gap_ms` defaults to 100 and accepts an integer from 0 through 1,000.
The checked-in provenance records actual waveform hashes, duration, voices,
text and rates. Regeneration on another macOS/voice version may produce different
waveforms; compare hashes before comparing scores. Preserve the original seed
and run English/French/Spanish/Chinese/Japanese regression cases separately.
