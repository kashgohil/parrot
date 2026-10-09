#!/usr/bin/env python3
"""Local ASR/cleanup evaluation. Uses only Python stdlib and an opt-in native worker."""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import signal
import statistics
import subprocess
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MANIFEST = ROOT / 'apps/desktop/src-tauri/tests/fixtures/quality/manifest.json'
NORMALIZATION = 'NFKC + casefold; curly apostrophes unified; words retain letters/numbers/marks and internal apostrophes; CER retains letters/numbers/marks, excludes whitespace/punctuation; no number-word or translation equivalence'


def normalized(text):
    return unicodedata.normalize('NFKC', text).casefold().replace('’', "'")


def word_tokens(text):
    words, current = [], []
    text = normalized(text)
    for index, char in enumerate(text):
        is_content = unicodedata.category(char)[0] in 'LNM'
        internal_quote = char == "'" and current and index + 1 < len(text) and unicodedata.category(text[index + 1])[0] in 'LNM'
        if is_content or internal_quote:
            current.append(char)
        elif current:
            words.append(''.join(current))
            current = []
    if current:
        words.append(''.join(current))
    return words


def char_tokens(text):
    return [char for char in normalized(text) if unicodedata.category(char)[0] in 'LNM']


def edit_counts(reference, hypothesis):
    # Unit-cost Levenshtein alignment. Deterministic ties prefer diagonal, deletion, insertion.
    reference_units, hypothesis_units = len(reference), len(hypothesis)
    prefix = 0
    while prefix < min(len(reference), len(hypothesis)) and reference[prefix] == hypothesis[prefix]:
        prefix += 1
    reference, hypothesis = reference[prefix:], hypothesis[prefix:]
    suffix = 0
    while suffix < min(len(reference), len(hypothesis)) and reference[-suffix - 1] == hypothesis[-suffix - 1]:
        suffix += 1
    if suffix:
        reference, hypothesis = reference[:-suffix], hypothesis[:-suffix]
    previous = [(index, 0, 0, index) for index in range(len(hypothesis) + 1)]
    for ri, ref in enumerate(reference, 1):
        current = [(ri, 0, ri, 0)]
        for hi, hyp in enumerate(hypothesis, 1):
            distance, substitutions, deletions, insertions = previous[hi - 1]
            diagonal = (distance + (ref != hyp), substitutions + (ref != hyp), deletions, insertions)
            distance, substitutions, deletions, insertions = previous[hi]
            deletion = (distance + 1, substitutions, deletions + 1, insertions)
            distance, substitutions, deletions, insertions = current[hi - 1]
            insertion = (distance + 1, substitutions, deletions, insertions + 1)
            current.append(min((diagonal, deletion, insertion), key=lambda item: item[0]))
        previous = current
    errors, substitutions, deletions, insertions = previous[-1]
    return {'reference_units': reference_units, 'hypothesis_units': hypothesis_units, 'substitutions': substitutions,
            'deletions': deletions, 'insertions': insertions, 'errors': errors,
            'rate': errors / reference_units if reference_units else None}


def metrics(reference, hypothesis):
    return {'wer': edit_counts(word_tokens(reference), word_tokens(hypothesis)),
            'cer': edit_counts(char_tokens(reference), char_tokens(hypothesis))}


def scripts(text):
    found = set()
    for char in text:
        if not char.isalpha():
            continue
        name = unicodedata.name(char, '')
        for prefix, script in [('LATIN', 'Latin'), ('DEVANAGARI', 'Devanagari'), ('CJK', 'Han'), ('HIRAGANA', 'Hiragana'),
                               ('KATAKANA', 'Katakana'), ('HANGUL', 'Hangul'), ('CYRILLIC', 'Cyrillic'), ('ARABIC', 'Arabic'), ('GREEK', 'Greek')]:
            if name.startswith(prefix):
                found.add(script)
                break
    return found


def occurrences(text, phrase):
    # Token boundaries prevent 'not' matching 'notebook'; CJK has no word boundaries.
    if re.fullmatch(r'\d+(?:[.,]\d+)*', normalized(phrase)):
        return re.findall(r'\d+(?:[.,]\d+)*', normalized(text)).count(normalized(phrase))
    if scripts(phrase) & {'Han', 'Hiragana', 'Katakana', 'Hangul'}:
        return ''.join(char_tokens(text)).count(''.join(char_tokens(phrase)))
    words, needle = word_tokens(text), word_tokens(phrase)
    return sum(words[index:index + len(needle)] == needle for index in range(len(words) - len(needle) + 1)) if needle else 0


def fact_counts(text, facts):
    return {fact['id']: sum(occurrences(text, phrase) for phrase in fact['any_of']) for fact in facts}


def ordered(text, terms):
    words = ' '.join(word_tokens(text))
    cursor = 0
    for term in terms:
        match = re.search(r'(?<!\w)' + re.escape(' '.join(word_tokens(term))) + r'(?!\w)', words[cursor:])
        if not match:
            return False
        cursor += match.end()
    return True


def properties(case, text, source=None):
    facts = case.get('facts', [])
    counts = fact_counts(text, facts)
    failed = [fact['id'] for fact in facts if counts[fact['id']] < fact.get('min_count', 1)]
    result = {'reference_facts_failed': failed, 'reference_scripts_missing': sorted(scripts(case['reference']) - scripts(text)),
              'reference_order_ok': ordered(text, case.get('ordered_terms', [])),
              'unexpected_speech': not char_tokens(case['reference']) and bool(char_tokens(text))}
    if source is not None:
        source_counts = fact_counts(source, facts)
        result['source_facts_lost'] = [fact['id'] for fact in facts if counts[fact['id']] < source_counts[fact['id']]]
        result['source_scripts_lost'] = sorted(scripts(source) - scripts(text))
        result['scripts_added'] = sorted(scripts(text) - scripts(source))
        number = lambda value: Counter(re.findall(r'\d+(?:[.,]\d+)*', normalized(value)))
        result['numbers_added'] = dict(number(text) - number(source))
        result['numbers_lost'] = dict(number(source) - number(text))
        result['source_order_lost'] = ordered(source, case.get('ordered_terms', [])) and not result['reference_order_ok']
        result['speech_added_to_empty_input'] = not char_tokens(source) and bool(char_tokens(text))
        result['introduced_regression'] = any(result[key] for key in ['source_facts_lost', 'source_scripts_lost', 'scripts_added',
                                                                      'numbers_added', 'numbers_lost', 'source_order_lost', 'speech_added_to_empty_input'])
    return result


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def fingerprint(path):
    path = Path(path).resolve()
    files = sorted(file for file in path.rglob('*') if file.is_file()) if path.is_dir() else [path]
    return {'path': str(path), 'files': [{'name': str(file.relative_to(path)) if path.is_dir() else file.name,
                                        'bytes': file.stat().st_size, 'sha256': sha256(file)} for file in files]}


def write_json(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def read_manifest(path):
    manifest = json.loads(path.read_text(encoding='utf-8'))
    if manifest.get('schema_version') != 1 or not manifest.get('cases'):
        raise ValueError('Unsupported or empty manifest')
    ids = set()
    for case in manifest['cases']:
        if not re.fullmatch(r'[a-z0-9-]+', case['id']) or case['id'] in ids:
            raise ValueError('Case IDs must be unique lowercase letters, digits and hyphens')
        ids.add(case['id'])
        if case['primary_metric'] not in ('wer', 'cer') or not case['languages']:
            raise ValueError('Case needs a primary metric and languages')
        for fact in case.get('facts', []):
            if not fact.get('any_of') or fact.get('min_count', 1) < 1:
                raise ValueError('Fact needs alternatives and a positive minimum count')
        for field in ['reference', 'cleanup_input']:
            if case.get(field) is not None:
                failed = properties(case, case[field])['reference_facts_failed']
                if failed:
                    raise ValueError(f'{case["id"]}: {field} does not satisfy facts: {failed}')
        if case.get('ordered_terms') and not ordered(case['reference'], case['ordered_terms']):
            raise ValueError('Reference does not satisfy its order contract')
    return manifest


def attach_cleanup_diagnostics(rows, stderr):
    """Correlate successful serial requests only when every native log is present."""
    pattern = (r'cleanup-sidecar: prompt_tok=(\d+) reused=(\d+) decoded=(\d+) '
               r'prefill=(\d+)ms gen_tok=(\d+) gen=(\d+)ms')
    values = re.findall(pattern, stderr)
    native = [row for row in rows if row['input'].strip()]
    if any(row.get('error') for row in rows) or len(values) != len(native):
        return False  # Missing/extra logs or retries must not silently misattribute timings.
    fields = ('prompt_tokens', 'reused_tokens', 'decoded_tokens', 'prefill_ms', 'generated_tokens', 'generation_ms')
    for row, value in zip(native, values):
        row['token_diagnostics'] = dict(zip(fields, map(int, value)))
    return True


def run_worker(binary, output, name, request, timeout):
    request_path = output / f'{name}.request.json'
    rows_path = output / f'{name}.jsonl'
    write_json(request_path, request)
    with (output / f'{name}.stderr.log').open('wb') as log:
        process = subprocess.Popen([str(binary), str(request_path), str(rows_path)], stdout=log, stderr=log,
                                   start_new_session=(os.name == 'posix'))
        try:
            code = process.wait(timeout=timeout)
        except BaseException:
            if os.name == 'posix':
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
            process.wait()
            raise
    if code:
        raise RuntimeError(f'Worker {name} failed with exit {code}; see its stderr log')
    rows = [json.loads(line) for line in rows_path.read_text(encoding='utf-8').splitlines()]
    expected = sum(len(case['tones']) if request['engine'] == 'cleanup' else 1 for case in request['cases'])
    results = [row for row in rows if row.get('kind') == 'result']
    if len(results) != expected:
        raise RuntimeError(f'Worker {name} returned {len(results)} results, expected {expected}')
    expected_keys = {(case['id'], tone) for case in request['cases'] for tone in (case['tones'] if request['engine'] == 'cleanup' else [None])}
    if {(row['id'], row.get('tone')) for row in results} != expected_keys:
        raise RuntimeError(f'Worker {name} returned duplicate or unexpected case/tone results')
    if request['engine'] == 'cleanup':
        if not attach_cleanup_diagnostics(results, (output / f'{name}.stderr.log').read_text(encoding='utf-8', errors='replace')):
            print(f'Worker {name}: native token diagnostics could not be correlated; retain stderr for review', file=sys.stderr)
    return results


def command_output(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL).strip()


def run(args):
    manifest = read_manifest(args.manifest.resolve())
    corpus_root = args.manifest.resolve().parent
    config = json.loads(args.config.read_text(encoding='utf-8'))
    if not 1 <= args.repeats <= 10:
        raise ValueError('Repeats must be 1..10')
    variants = config.get('speech', []) + config.get('cleanup', [])
    if not variants or len({variant['id'] for variant in variants}) != len(variants):
        raise ValueError('Provide models with unique variant IDs')
    for variant in variants:
        if not re.fullmatch(r'[a-z0-9-]+', variant['id']) or not Path(variant['model']).exists() or not variant.get('quantization'):
            raise ValueError('Variant needs a safe ID, existing local model and explicit quantization label')
    if config.get('cleanup') and (not args.sidecar or not args.sidecar.is_file()):
        raise ValueError('Cleanup requires an existing --sidecar binary')
    audio = []
    for case in manifest['cases']:
        if case.get('audio'):
            path = (corpus_root / case['audio']).resolve()
            if not path.is_file():
                raise ValueError(f'Missing audio: {path}; run generate-quality-fixtures.py')
            audio.append({'id': case['id'], **fingerprint(path)})
    args.output.mkdir(parents=True, exist_ok=False)
    output = args.output.resolve()
    metadata = {'schema_version': 1, 'started_at': datetime.now(timezone.utc).isoformat(), 'manifest': manifest,
                'manifest_sha256': sha256(args.manifest), 'config': config, 'repeats': args.repeats, 'normalization': NORMALIZATION,
                'unicode_version': unicodedata.unidata_version, 'python': platform.python_version(), 'hardware': platform.uname()._asdict(),
                'binary': fingerprint(args.binary), 'audio': audio, 'models': {variant['id']: fingerprint(variant['model']) for variant in variants},
                'rows': [], 'skipped': [], 'complete': False}
    if args.sidecar:
        metadata['sidecar'] = fingerprint(args.sidecar)
    try:
        metadata['git_commit'] = command_output(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'])
        metadata['git_diff_sha256'] = hashlib.sha256(command_output(['git', '-C', str(ROOT), 'diff', 'HEAD']).encode()).hexdigest()
    except subprocess.CalledProcessError:
        metadata['git_commit'] = None
    if sys.platform == 'darwin':
        metadata['hardware'].update({key: command_output(['sysctl', '-n', key]) for key in ['hw.model', 'hw.memsize', 'machdep.cpu.brand_string']})
    write_json(output / 'results.json', metadata)
    # Read native capabilities without loading weights. Never infer support from filename.
    capabilities = {variant['id']: json.loads(command_output([str(args.binary), '--capabilities', variant['engine'], variant['model']])) for variant in config.get('speech', [])}
    metadata['capabilities'] = capabilities
    for repeat in range(1, args.repeats + 1):
        asr_rows = []
        for variant in config.get('speech', []):
            cases, mapping = [], {}
            modes = variant.get('language_modes', ['auto', 'explicit'])
            if not modes or any(mode not in ('auto', 'explicit') for mode in modes):
                raise ValueError('Language modes must be auto or explicit')
            cap = capabilities[variant['id']]
            for case in manifest['cases']:
                if not case.get('audio'):
                    continue
                if cap['known'] and any(language not in cap['languages'] for language in case['languages']):
                    metadata['skipped'].append({'variant': variant['id'], 'case': case['id'], 'repeat': repeat, 'reason': 'language outside native model coverage'})
                    continue
                for mode in modes:
                    if mode == 'explicit' and not cap['explicit_language_hints']:
                        continue
                    key = f'{case["id"]}/{mode}'
                    cases.append({'id': key, 'audio': str((corpus_root / case['audio']).resolve()),
                                  'language': 'auto' if mode == 'auto' else case['languages'][0], 'initial_prompt': variant.get('initial_prompt')})
                    mapping[key] = case['id']
            if not cases:
                continue
            print(f'ASR {variant["id"]}, repeat {repeat}: {len(cases)} cases', flush=True)
            rows = run_worker(args.binary, output, f'{variant["id"]}-{repeat}', {'engine': variant['engine'], 'model': variant['model'], 'cases': cases}, args.timeout)
            for row in rows:
                row.update({'variant': variant['id'], 'case': mapping[row['id']], 'repeat': repeat,
                            'key': f'{variant["id"]}/{row["id"]}/asr/{repeat}'})
            metadata['rows'].extend(rows)
            asr_rows.extend(rows)
            write_json(output / 'results.json', metadata)
        for variant in config.get('cleanup', []):
            cases, mapping = [], {}
            for case in manifest['cases']:
                if case.get('cleanup_input') is not None:
                    key = case['id'] + '/isolated'
                    cases.append({'id': key, 'input': case['cleanup_input'], 'stage': 'cleanup_isolated', 'tones': variant.get('tones', ['casual', 'neutral', 'formal']),
                                  'custom_words': variant.get('custom_words', ''), 'context_prompt': variant.get('context_prompt', ''), 'writing_style': variant.get('writing_style', '')})
                    mapping[key] = (case['id'], None)
            if config.get('pipeline', True):
                for source in asr_rows:
                    if source.get('error') or source['language'] != 'auto':
                        continue
                    key = source['variant'] + '/' + source['case'] + '/pipeline'
                    cases.append({'id': key, 'input': source['text'], 'stage': 'cleanup_pipeline', 'tones': ['neutral'],
                                  'custom_words': variant.get('custom_words', ''), 'context_prompt': variant.get('context_prompt', ''), 'writing_style': variant.get('writing_style', '')})
                    mapping[key] = (source['case'], source['key'])
            print(f'Cleanup {variant["id"]}, repeat {repeat}: {sum(len(case["tones"]) for case in cases)} completions', flush=True)
            rows = run_worker(args.binary, output, f'{variant["id"]}-{repeat}', {'engine': 'cleanup', 'model': variant['model'], 'sidecar': str(args.sidecar.resolve()), 'cases': cases}, args.timeout)
            for row in rows:
                case, source = mapping[row['id']]
                row.update({'variant': variant['id'], 'case': case, 'repeat': repeat, 'source_key': source,
                            'key': f'{variant["id"]}/{row["id"]}/{row["tone"]}/{repeat}'})
                row['system_prompt_sha256'] = hashlib.sha256(row['system_prompt'].encode()).hexdigest()
            metadata['rows'].extend(rows)
            write_json(output / 'results.json', metadata)
    metadata['complete'] = True
    metadata['finished_at'] = datetime.now(timezone.utc).isoformat()
    write_json(output / 'results.json', metadata)
    score(output, None)


def score(output, reviews_path):
    metadata = json.loads((output / 'results.json').read_text(encoding='utf-8'))
    cases = {case['id']: case for case in metadata['manifest']['cases']}
    reviews = json.loads(reviews_path.read_text(encoding='utf-8')) if reviews_path else {}
    known_keys = {row['key'] for row in metadata['rows']}
    if set(reviews) - known_keys:
        raise ValueError('Review file contains unknown result keys')
    groups, scored, queue = defaultdict(list), [], {}
    for row in metadata['rows']:
        case = cases[row['case']]
        item = {'key': row['key'], 'case': row['case'], 'variant': row['variant'], 'stage': row['stage'], 'tone': row.get('tone'),
                'repeat': row['repeat'], 'language': row.get('language'), 'primary_metric': case['primary_metric'], 'latency_ms': row['latency_ms'], 'error': row.get('error')}
        if row.get('error'):
            scored.append(item)
            groups[(row['variant'], row['stage'], row.get('tone'), row.get('language'), '+'.join(case['languages']) if row['stage'] == 'asr' else 'all', (row.get('source_key') or '').split('/')[0])].append(item)
            continue
        source = row.get('input') if row['stage'] != 'asr' else None
        item['metrics'] = metrics(case['reference'], row['text'])
        item['properties'] = properties(case, row['text'], source)
        item['reference_languages'] = case['languages']
        if row['stage'] != 'asr':
            item['candidate_properties'] = properties(case, row['candidate'], source)
            item['fallback'] = row['fallback']
            item['unchanged'] = row['text'].strip() == source.strip()
            item['off_baseline'] = properties(case, source, source)
            item['fillers_removed'] = sum(occurrences(source, filler) - occurrences(row['text'], filler) for filler in case.get('fillers', []))
        review = reviews.get(row['key'], {})
        if review.get('decision') not in (None, 'approve', 'reject'):
            raise ValueError('Review decision must be approve, reject or null')
        output_hash = hashlib.sha256(row['text'].encode()).hexdigest()
        if review.get('decision') and review.get('output_sha256') != output_hash:
            raise ValueError('Review output hash does not match this result; use its current review queue')
        item['human_review'] = review
        queue[row['key']] = {'decision': review.get('decision'), 'notes': review.get('notes', ''), 'case': row['case'], 'stage': row['stage'],
                             'output_sha256': output_hash,
                             'source': source, 'reference': case['reference'], 'output': row['text'], 'model_output': row.get('model_output'),
                             'checks': item['properties'], 'criteria': 'Check meaning, language/script, names, amounts, negation, uncertainty, omissions, additions and useful cleanup. Flags are screening checks, not semantic proof.'}
        scored.append(item)
        groups[(row['variant'], row['stage'], row.get('tone'), row.get('language'), '+'.join(case['languages']) if row['stage'] == 'asr' else 'all', (row.get('source_key') or '').split('/')[0])].append(item)
    summaries = []
    for (variant, stage, tone, language, reference_language, upstream), rows in sorted(groups.items(), key=lambda entry: str(entry[0])):
        good = [row for row in rows if not row['error']]
        summary = {'variant': variant, 'stage': stage, 'tone': tone, 'language': language, 'reference_language': reference_language, 'upstream': upstream or None, 'count': len(rows), 'errors': len(rows) - len(good),
                   'reference_fact_failures': sum(bool(row['properties']['reference_facts_failed']) for row in good),
                   'reference_script_failures': sum(bool(row['properties']['reference_scripts_missing']) for row in good),
                   'unexpected_speech': sum(row['properties']['unexpected_speech'] for row in good),
                   'introduced_regressions': sum(row['properties'].get('introduced_regression', False) for row in good),
                   'fallbacks': sum(row.get('fallback', False) for row in good), 'unchanged': sum(row.get('unchanged', False) for row in good),
                   'human_pending': sum(not row['human_review'].get('decision') for row in good),
                   'human_rejected': sum(row['human_review'].get('decision') == 'reject' for row in good),
                   'median_ms': statistics.median(row['latency_ms'] for row in rows)}
        if stage == 'asr':
            for metric in ('wer', 'cer'):
                selected = [row['metrics'][metric] for row in good if row['primary_metric'] == metric and row['metrics'][metric]['reference_units']]
                denominator = sum(value['reference_units'] for value in selected)
                summary[metric] = {'errors': sum(value['errors'] for value in selected), 'reference_units': denominator,
                                   'micro_rate': sum(value['errors'] for value in selected) / denominator if denominator else None,
                                   'macro_rate': statistics.mean(value['rate'] for value in selected) if selected else None}
        summaries.append(summary)
    result = {'schema_version': 1, 'complete': metadata['complete'], 'normalization': metadata['normalization'],
              'results_sha256': sha256(output / 'results.json'), 'scorer_sha256': sha256(Path(__file__)),
              'skipped': metadata['skipped'], 'groups': summaries, 'rows': scored,
              'semantic_release_qualified': False, 'note': 'Synthetic seed only. Human review and real-speaker coverage are required before release qualification.'}
    write_json(output / 'scores.json', result)
    write_json(output / 'review-queue.json', queue)
    lines = ['# Local quality evaluation', '', f'Complete: {metadata["complete"]}. Pending human review: {sum(value["decision"] is None for value in queue.values())}.',
             '', '| Variant | Stage / upstream | Tone / language | Cases | Errors | Fact flags | New cleanup flags | Fallbacks | WER | CER | Median ms |',
             '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
    for group in summaries:
        rate = lambda metric: f'{group[metric]["micro_rate"]:.1%}' if group.get(metric, {}).get('micro_rate') is not None else '—'
        stage_label = group['stage'] + (' / ' + group['upstream'] if group['upstream'] else '')
        setting_label = group['tone'] or group['language'] or '—'
        if group['stage'] == 'asr':
            setting_label += ' / ' + group['reference_language']
        lines.append(f'| {group["variant"]} | {stage_label} | {setting_label} | {group["count"]} | {group["errors"]} | {group["reference_fact_failures"]} | {group["introduced_regressions"]} | {group["fallbacks"]} | {rate("wer")} | {rate("cer")} | {group["median_ms"]:.1f} |')
    lines.extend(['', 'WER and CER aggregates include only cases declaring that primary metric; empty references use absolute insertion counts.',
                  'Fact/script flags screen for regressions. Review source and output before judging meaning or cleanup usefulness.',
                  f'Skipped unsupported combinations: {len(metadata["skipped"])}. These are not passing evaluations.',
                  'This synthetic seed does not qualify any model or language for release.', ''])
    (output / 'summary.md').write_text('\n'.join(lines), encoding='utf-8')
    print(f'Wrote {output / "summary.md"}', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    run_parser = commands.add_parser('run')
    run_parser.add_argument('--manifest', type=Path, default=DEFAULT_MANIFEST)
    run_parser.add_argument('--config', type=Path, required=True)
    run_parser.add_argument('--output', type=Path, required=True)
    run_parser.add_argument('--binary', type=Path, default=ROOT / 'apps/desktop/src-tauri/target/release/parrot-quality-eval')
    run_parser.add_argument('--sidecar', type=Path)
    run_parser.add_argument('--repeats', type=int, default=2)
    run_parser.add_argument('--timeout', type=int, default=900)
    score_parser = commands.add_parser('score')
    score_parser.add_argument('--output', type=Path, required=True)
    score_parser.add_argument('--reviews', type=Path)
    compare_parser = commands.add_parser('compare')
    compare_parser.add_argument('--baseline', type=Path, required=True)
    compare_parser.add_argument('--candidate', type=Path, required=True)
    compare_parser.add_argument('--max-rate-increase', type=float, default=0.02)
    compare_parser.add_argument('--allow-model-changes', action='store_true')
    args = parser.parse_args()
    try:
        if args.command == 'run':
            run(args)
        elif args.command == 'score':
            score(args.output, args.reviews)
        else:
            result = compare(args.baseline, args.candidate, args.max_rate_increase, args.allow_model_changes)
            write_json(args.candidate / 'comparison.json', result)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            if not result['regression_check_pass']:
                raise RuntimeError('Candidate introduced a regression or changed evaluation coverage')
    except (ValueError, OSError, RuntimeError, subprocess.SubprocessError) as error:
        parser.exit(1, f'Evaluation failed: {error}\n')


def compare(baseline, candidate, max_rate_increase=0.02, allow_model_changes=False):
    if not 0 <= max_rate_increase <= 1:
        raise ValueError('Rate increase must be a fraction between 0 and 1')
    metadata = [json.loads((path / 'results.json').read_text(encoding='utf-8')) for path in (baseline, candidate)]
    for field in ['manifest_sha256', 'normalization', 'unicode_version']:
        if metadata[0][field] != metadata[1][field]:
            raise ValueError(f'Cannot compare different {field}; establish a new baseline')
    if not all(value['complete'] for value in metadata):
        raise ValueError('Cannot compare incomplete runs')
    model_hashes = lambda value: {key: [(file['name'], file['bytes'], file['sha256']) for file in model['files']]
                                  for key, model in value['models'].items()}
    if not allow_model_changes and model_hashes(metadata[0]) != model_hashes(metadata[1]):
        raise ValueError('Model bytes changed; use --allow-model-changes for an explicit model comparison')
    reports = [json.loads((path / 'scores.json').read_text(encoding='utf-8')) for path in (baseline, candidate)]
    if any(report.get('results_sha256') != sha256(path / 'results.json') for report, path in zip(reports, (baseline, candidate))):
        raise ValueError('Scores are stale; run score on each current results file before comparing')
    indexed = []
    for report in reports:
        by_key = defaultdict(list)
        for row in report['rows']:
            by_key[row['key'].rsplit('/', 1)[0]].append(row)
        indexed.append(by_key)
    before, after = indexed
    regressions = []
    if before.keys() != after.keys():
        regressions.append({'coverage_missing': sorted(before.keys() - after.keys()), 'coverage_added': sorted(after.keys() - before.keys())})
    for key in sorted(before.keys() & after.keys()):
        old, new = before[key], after[key]
        if any(row.get('error') for row in new):
            regressions.append({'key': key, 'reason': 'inference error'})
            continue
        if old[0]['stage'] == 'asr' and all(not row.get('error') for row in old):
            metric = new[0]['primary_metric']
            maximum = lambda rows: max(row['metrics'][metric]['rate'] or 0 for row in rows)
            if maximum(new) > maximum(old) + max_rate_increase + 1e-12:
                regressions.append({'key': key, 'reason': 'error rate increased', 'metric': metric, 'before': maximum(old), 'after': maximum(new)})
            if not new[0]['metrics'][metric]['reference_units'] and any(row['metrics'][metric]['insertions'] for row in new):
                regressions.append({'key': key, 'reason': 'speech on an empty reference'})
        flag_set = lambda rows: {(field, str(value)) for row in rows if not row.get('error') for field, values in row['properties'].items()
                                for value in (values.keys() if isinstance(values, dict) else values if isinstance(values, list) else [values] if values is True and field not in ('reference_order_ok',) else [])}
        new_flags = flag_set(new) - flag_set(old)
        if new_flags:
            regressions.append({'key': key, 'reason': 'new property flags require review', 'flags': sorted(new_flags)})
        if any(not row['properties']['reference_order_ok'] for row in new) and all(row.get('error') or row['properties']['reference_order_ok'] for row in old):
            regressions.append({'key': key, 'reason': 'reference topic order lost'})
    return {'regression_check_pass': not regressions, 'semantic_release_qualified': False, 'max_rate_increase': max_rate_increase,
            'regressions': regressions, 'note': 'Compares worst repeat per case. Existing baseline failures remain unresolved; passing this check does not qualify release quality.'}


if __name__ == '__main__':
    main()
