ISSUE-1041 inference regression fixtures

These synthetic recordings contain no user audio. Generated locally on macOS
using say at 150 words/minute, then converted with ffmpeg to mono 16 kHz PCM16 WAV.

english.wav (Samantha, en_US):
Please put the blue notebook on the kitchen table.

french.wav (Thomas, fr_FR):
Bonjour, je voudrais réserver une table pour demain soir.

Regenerate with:
say -v Samantha -r 150 -o /tmp/parrot-english.aiff 'Please put the blue notebook on the kitchen table.'
say -v Thomas -r 150 -o /tmp/parrot-french.aiff 'Bonjour, je voudrais réserver une table pour demain soir.'
ffmpeg -i /tmp/parrot-english.aiff -ac 1 -ar 16000 -c:a pcm_s16le english.wav
ffmpeg -i /tmp/parrot-french.aiff -ac 1 -ar 16000 -c:a pcm_s16le french.wav

Run from apps/desktop/src-tauri using an existing multilingual model:
PARROT_TEST_WHISPER_MODEL='/path/to/ggml-large-v3-turbo-q5_0.bin' cargo test --locked -p parrot --lib whisper_multilingual_inference -- --ignored --nocapture

The test checks distinctive words in their original language, all Auto setting
forms, explicit English/French hints, silence and accidental short recordings.
It is ignored by default because model files are large and machine-specific.
It does not download a model or launch the app/cleanup sidecar.
