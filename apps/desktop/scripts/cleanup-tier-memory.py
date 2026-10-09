#!/usr/bin/env python3
"""Measure fresh-process cleanup tiers on macOS without launching Parrot."""
import argparse
import hashlib
import importlib.util
import json
import os
import platform
import signal
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def summarize_samples(samples):
    # A failed ledger must never masquerade as a smaller memory measurement.
    complete = [s for s in samples if s['processes'] and
                all('phys_footprint' in p and 'resident_size' in p for p in s['processes'])]
    if not complete:
        raise ValueError('No complete process-tree samples')
    return dict(sample_count=len(samples), complete_samples=len(complete),
                incomplete_samples=len(samples) - len(complete),
                peak_footprint_bytes=max(sum(p['phys_footprint'] for p in s['processes']) for s in complete),
                peak_rss_bytes=max(sum(p['resident_size'] for p in s['processes']) for s in complete),
                max_sample_gap_ms=max((b['elapsed_ms'] - a['elapsed_ms'] for a, b in zip(samples, samples[1:])), default=0))


def measure(binary, request, output, name, timeout, memory, bench, quality):
    request_path = output / (name + '.request.json')
    rows_path = output / (name + '.jsonl')
    quality.write_json(request_path, request)
    samples = []
    started = time.monotonic()
    with (output / (name + '.stderr.log')).open('wb') as log:
        child = subprocess.Popen([str(binary), str(request_path), str(rows_path)],
                                 stdout=log, stderr=log, start_new_session=True)
        try:
            while child.poll() is None:
                if time.monotonic() - started > timeout:
                    raise TimeoutError(name)
                table = bench.process_table()
                pids = bench.select_processes(table, {child.pid}, None)
                samples.append(dict(elapsed_ms=(time.monotonic() - started) * 1000,
                                    processes=[dict(pid=pid, role='worker' if pid == child.pid else 'owned_child',
                                                    command=table[pid]['command'], **memory.usage(pid))
                                               for pid in sorted(pids)]))
                time.sleep(.05)
        finally:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
            quality.write_json(output / (name + '.samples.json'), samples)
    if child.returncode:
        raise RuntimeError(f'{name}: worker exit {child.returncode}')
    rows = [json.loads(line) for line in rows_path.read_text().splitlines()]
    loaded = [row for row in rows if row['kind'] == 'loaded']
    results = [row for row in rows if row['kind'] == 'result']
    expected = [(case['id'], tone) for case in request['cases'] for tone in case['tones']]
    if len(loaded) != 1 or [(row['id'], row['tone']) for row in results] != expected or any(row.get('error') for row in results):
        raise RuntimeError(f'{name}: incomplete, reordered or failed native results')
    return dict(**summarize_samples(samples), load_ms=loaded[0]['load_ms'],
                elapsed_ms=(time.monotonic() - started) * 1000,
                results=[{key: row.get(key) for key in ('id', 'latency_ms', 'complete', 'finish_reason', 'fallback', 'cleanup_skipped')} for row in results],
                request_sha256=quality.sha256(request_path), output_sha256=quality.sha256(rows_path))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('config', 'manifest', 'binary', 'sidecar', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--repeats', type=int, default=2)
    parser.add_argument('--timeout', type=int, default=600)
    args = parser.parse_args()
    if sys.platform != 'darwin' or not 1 <= args.repeats <= 10 or args.timeout < 1:
        parser.error('Requires macOS, 1..10 repeats and a positive timeout')
    quality = module('tier_quality', 'quality-evaluation.py')
    bench = module('tier_memory', 'memory-benchmark.py')
    manifest = quality.read_manifest(args.manifest.resolve())
    models = json.loads(args.config.read_text())['cleanup']
    if {m['id'] for m in models} != {'qwen-0-5b', 'qwen-1-5b', 'qwen-3b'} or len(models) != 3:
        parser.error('Config must contain exactly the three existing Qwen tier IDs')
    paths = [args.binary, args.sidecar] + [Path(m['model']) for m in models]
    if any(not path.is_file() for path in paths):
        parser.error('Every binary and model must already exist locally')
    # Repeat identical short input to separate first inference from a warm cache.
    cases = [dict(id='first-short', input='Priya did not approve invoice 25 on Friday.', stage='cleanup_pipeline', tones=['neutral']),
             dict(id='warm-short', input='Priya did not approve invoice 25 on Friday.', stage='cleanup_pipeline', tones=['neutral'])]
    cases += [dict(id=case['id'], input=case['cleanup_input'], stage='cleanup_pipeline', tones=['neutral'])
              for case in manifest['cases'] if case.get('cleanup_input') is not None]
    args.output.mkdir(parents=True, exist_ok=False)
    report = dict(schema_version=1, complete=False, scope='Fresh headless cleanup worker and owned descendants, including load; excludes GUI, ASR, microphone, installed app and energy.',
                  sample_interval_ms=50, file_cache_controlled=False, repeats=args.repeats,
                  hardware={**platform.uname()._asdict(), 'ram_bytes': bench.command('sysctl', '-n', 'hw.memsize'),
                            'chip': bench.command('sysctl', '-n', 'machdep.cpu.brand_string')},
                  git_commit=quality.command_output(['git', 'rev-parse', 'HEAD']),
                  git_diff_sha256=hashlib.sha256(quality.command_output(['git', 'diff', 'HEAD']).encode()).hexdigest(),
                  binary=quality.fingerprint(args.binary), sidecar=quality.fingerprint(args.sidecar),
                  models={m['id']: quality.fingerprint(m['model']) for m in models},
                  manifest_sha256=quality.sha256(args.manifest), runs=[])
    quality.write_json(args.output / 'report.json', report)
    memory = bench.MacMemory()
    for repeat in range(1, args.repeats + 1):
        for model in models if repeat % 2 else list(reversed(models)):
            name = f"{model['id']}-{repeat}"
            result = measure(args.binary.resolve(), dict(engine='cleanup', model=model['model'],
                             sidecar=str(args.sidecar.resolve()), cases=cases), args.output,
                             name, args.timeout, memory, bench, quality)
            report['runs'].append(dict(variant=model['id'], repeat=repeat, **result))
            quality.write_json(args.output / 'report.json', report)
            print(name, json.dumps(result), flush=True)
    report['complete'] = True
    quality.write_json(args.output / 'report.json', report)


if __name__ == '__main__':
    main()
