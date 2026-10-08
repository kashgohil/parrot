#!/usr/bin/env python3
"""Compare legacy and streaming import buffers in fresh native test processes."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--test-binary', type=Path, required=True)
parser.add_argument('--files', type=Path, nargs='+', required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--repeats', type=int, default=2)
args = parser.parse_args()
if platform.system() != 'Darwin' or not 1 <= args.repeats <= 10:
    parser.error('requires macOS; repeats must be 1..10')
binary = args.test_binary.resolve(strict=True)
files = [p.resolve(strict=True) for p in args.files]
args.out.mkdir(parents=True, exist_ok=False)
spec = importlib.util.spec_from_file_location('memory_benchmark',Path(__file__).with_name('memory-benchmark.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
memory = module.MacMemory()
def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as file:
        for chunk in iter(lambda:file.read(1024*1024),b''): digest.update(chunk)
    return digest.hexdigest()
metadata = {'binary_sha256':sha(binary),'revision':module.command('git','rev-parse','HEAD'),
            'working_tree':module.command('git','status','--short'),'hardware':module.command('sysctl','-n','hw.model'),
            'ram_bytes':module.command('sysctl','-n','hw.memsize'),'os':platform.platform(),
            'files':[{'name':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in files],
            'scope':'native buffer test process, no model inference, no WebKit', 'requested_interval_ms':25}
(args.out/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
results = []
for file in files:
    fingerprint = None
    for repeat in range(1,args.repeats+1):
        for mode in (['legacy','streaming'] if repeat%2 else ['streaming','legacy']):
            label = f'{file.stem}-{mode}-{repeat}'
            env = {**os.environ,'PARROT_IMPORT_BENCH_MODE':mode,'PARROT_IMPORT_BENCH_FILE':str(file)}
            samples = []
            with (args.out/f'{label}.log').open('w') as log:
                process = subprocess.Popen([str(binary),'--exact','import_transcription::buffer_bench::measure_import_buffers',
                                            '--ignored','--nocapture'],env=env,stdout=log,stderr=subprocess.STDOUT)
                start = time.monotonic()
                try:
                    while process.poll() is None:
                        samples.append({'elapsed_ms':(time.monotonic()-start)*1000,**memory.usage(process.pid)})
                        if time.monotonic()-start>180: raise RuntimeError(f'{label}: timed out')
                        time.sleep(0.025)
                finally:
                    if process.poll() is None: process.terminate()
                    process.wait(timeout=5)
                    (args.out/f'{label}-samples.json').write_text(json.dumps(samples)+'\n')
            assert process.returncode==0, f'{label}: see log'
            lines = (args.out/f'{label}.log').read_text().splitlines()
            event, = [json.loads(l.removeprefix('IMPORT_BENCH ')) for l in lines if l.startswith('IMPORT_BENCH ')]
            identity = (event['source_samples'],event['sample_fingerprint'],event['chunks'],event['text'])
            if fingerprint is None: fingerprint = identity
            assert identity==fingerprint, f'{label}: changed source samples, boundaries, or order'
            valid = [s for s in samples if 'error' not in s]
            assert valid, f'{label}: no valid memory samples'
            results.append({'label':label,'event':event,'sample_count':len(samples),'incomplete_samples':len(samples)-len(valid),
                            'sampled_peak_footprint_bytes':max(s['phys_footprint'] for s in valid),
                            'observed_lifetime_peak_footprint_bytes':max(s['lifetime_max_phys_footprint'] for s in valid)})
            (args.out/'results.json').write_text(json.dumps(results,indent=2)+'\n')
            print(label,'passed',flush=True)
