#!/usr/bin/env python3
"""Generate synthetic format/long-import fixtures with an installed ffmpeg."""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--long-seconds', type=int, nargs='*', default=[])
args = parser.parse_args()
if any(not 30 <= s <= 3600 for s in args.long_seconds):
    parser.error('long-seconds must be 30..3600')
args.out.mkdir(parents=True, exist_ok=False)
source = Path(__file__).resolve().parents[1] / 'src-tauri/tests/fixtures/transcription'
encoders = subprocess.check_output(['ffmpeg','-v','error','-encoders'],text=True)
vorbis = 'libvorbis' if 'libvorbis' in encoders else 'vorbis'
codecs = {'wav':'pcm_s16le', 'mp3':'libmp3lame', 'm4a':'aac', 'mp4':'aac',
          'mov':'aac', 'aac':'aac', 'flac':'flac', 'ogg':vorbis,
          'oga':vorbis, 'aiff':'pcm_s16be', 'aif':'pcm_s16be', 'caf':'pcm_s16le'}
for ext, codec in codecs.items():
    subprocess.run(['ffmpeg','-v','error','-i',str(source/'french.wav'),
                    '-af','pan=stereo|c0=c0|c1=0.5*c0','-ar','44100',
                    '-strict','-2','-c:a',codec,str(args.out/f'french.{ext}')],check=True)
subprocess.run(['ffmpeg','-v','error','-i',str(source/'french.wav'),
                '-c:a','libopus',str(args.out/'unsupported-opus.ogg')],check=True)
subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=black:s=16x16:d=1',
                '-an','-c:v','mpeg4',str(args.out/'video-only.mp4')],check=True)
for seconds in args.long_seconds:
    subprocess.run(['ffmpeg','-v','error','-stream_loop','-1','-i',str(source/'long-import.wav'),
                    '-t',str(seconds),'-ar','48000','-ac','2','-c:a','pcm_s16le',
                    str(args.out/f'long-{seconds}s.wav')],check=True)
(args.out/'manifest.json').write_text(json.dumps({'source':'committed synthetic French/varied English fixtures',
    'formats':codecs,'long_seconds':args.long_seconds},indent=2)+'\n')
print(args.out)
