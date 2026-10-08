#!/usr/bin/env python3
"""Generate only declared synthetic fixtures; requires macOS say and ffmpeg for TTS."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import wave

DEFAULT = Path(__file__).resolve().parents[1] / 'src-tauri/tests/fixtures/quality/manifest.json'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=DEFAULT)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    root = args.manifest.resolve().parent
    manifest = json.loads(args.manifest.read_text())
    records = []
    for case in manifest['cases']:
        source = case['source']
        if not case['audio']:
            continue
        output = (root / case['audio']).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        if source['kind'] != 'existing' and (args.force or not output.exists()):
            pcm = bytearray()
            if source['kind'] == 'tts':
                with tempfile.TemporaryDirectory(prefix='parrot-quality-') as temp:
                    for index, segment in enumerate(source['segments']):
                        aiff = Path(temp) / f'{index}.aiff'
                        wav = Path(temp) / f'{index}.wav'
                        subprocess.run(['say', '-v', segment['voice'], '-r', str(source['rate']), '-o', str(aiff), segment['text']], check=True)
                        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(aiff), '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', str(wav)], check=True)
                        with wave.open(str(wav), 'rb') as audio:
                            pcm.extend(audio.readframes(audio.getnframes()))
                        if index + 1 < len(source['segments']):
                            pcm.extend(b'\0' * 3200)  # 100 ms between explicitly voiced language segments.
            elif source['kind'] == 'silence':
                pcm.extend(b'\0' * round(source['seconds'] * 32000))
            elif source['kind'] == 'repeat_with_silent_tail':
                with wave.open(str(root / source['path']), 'rb') as audio:
                    assert (audio.getnchannels(), audio.getframerate(), audio.getsampwidth()) == (1, 16000, 2)
                    pcm.extend(audio.readframes(audio.getnframes()) * source['cycles'])
                target = round(source['seconds'] * 32000)
                if len(pcm) > target:
                    raise ValueError('The requested duration would truncate a complete reference cycle')
                pcm.extend(b'\0' * (target - len(pcm)))
            else:
                raise ValueError(f'Unknown source kind: {source["kind"]}')
            with wave.open(str(output), 'wb') as audio:
                audio.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
                audio.writeframes(pcm)
        with wave.open(str(output), 'rb') as audio:
            records.append({'id': case['id'], 'audio': case['audio'], 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
                            'seconds': audio.getnframes() / audio.getframerate(), 'source': source,
                            'channels': audio.getnchannels(), 'sample_rate': audio.getframerate(), 'sample_width': audio.getsampwidth()})
        print(f'Prepared {case["id"]}', flush=True)
    (root / 'provenance.json').write_text(json.dumps({'generator': 'generate-quality-fixtures.py', 'records': records}, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
