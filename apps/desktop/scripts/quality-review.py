#!/usr/bin/env python3
"""Prepare and import local human reviews without inference or network access."""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
from datetime import datetime

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('quality', HERE / 'quality-evaluation.py')
quality = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quality)
CHECKS = ('meaning', 'names', 'amounts', 'polarity', 'uncertainty', 'language_script', 'mixing', 'omissions_additions', 'usefulness')


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def private_destination(path):
    return quality.private_destination(path)


def load_runs(values):
    runs = {}
    for value in values:
        label, separator, folder = value.partition('=')
        if not separator or not re.fullmatch(r'[a-z0-9-]+', label) or label in runs:
            raise ValueError('Each run needs a unique lowercase label=/path/to/results')
        path = Path(folder).resolve() / 'results.json'
        metadata = json.loads(path.read_text(encoding='utf-8'))
        if not metadata.get('complete') or metadata.get('schema_version') != 1:
            raise ValueError(f'{label}: a complete schema-version-1 evaluation is required')
        runs[label] = (path, metadata)
    return runs


def packet(runs, languages):
    fixtures, outputs = {}, {}
    for label, (path, metadata) in runs.items():
        cases = {c['id']: c for c in metadata['manifest']['cases']}
        audio = {a['id']: a for a in metadata.get('audio', [])}
        for row in metadata['rows']:
            case = cases[row['case']]
            if not set(case['languages']) & set(languages):
                continue
            sound = audio.get(case['id'])
            if row['stage'] == 'asr' and not sound:
                raise ValueError('Recognition review requires evaluated waveform metadata')
            if not metadata.get('models', {}).get(row['variant'], {}).get('files'):
                raise ValueError('Review requires evaluated model fingerprints')
            fixture_id = digest(dict(reference=case['reference'], languages=case['languages'],
                                     audio=sound['files'] if sound else None, source=case.get('source'),
                                     provenance=case.get('provenance')))
            if fixture_id not in fixtures:
                fixtures[fixture_id] = dict(id=fixture_id, case_ids=[], reference=case['reference'], languages=case['languages'],
                                           audio=sound, source=case.get('source'), provenance=case.get('provenance', ''), tags=case.get('tags', []))
            if case['id'] not in fixtures[fixture_id]['case_ids']:
                fixtures[fixture_id]['case_ids'].append(case['id'])
            subject = quality.review_subject(metadata, row)
            if subject not in outputs:
                outputs[subject] = dict(id=subject, fixture=fixture_id, variant=row['variant'], stage=row['stage'],
                                        tone=row.get('tone'), language=row.get('language'), prompt_style=row.get('prompt_style'),
                                        input=row.get('input'), output=row.get('text'), candidate=row.get('candidate'),
                                        error=row.get('error'), complete=row.get('complete'), fallback=row.get('fallback'),
                                        checks=quality.properties(case, row['text'], row.get('input')) if not row.get('error') else {},
                                        output_sha256=hashlib.sha256(row.get('text', '').encode()).hexdigest(), occurrences=[])
            outputs[subject]['occurrences'].append(dict(run=label, key=row['key'], repeat=row['repeat']))
    if not fixtures:
        raise ValueError('No cases match the requested languages')
    result = dict(schema_version=1, semantic_release_qualified=False, languages=languages,
                  runs={label: dict(path=str(path), sha256=quality.sha256(path)) for label, (path, _) in runs.items()},
                  fixtures=list(fixtures.values()), outputs=list(outputs.values()), checks=list(CHECKS))
    result['packet_sha256'] = digest(result)
    return result


def prepare(args):
    output = private_destination(args.output)
    data = packet(load_runs(args.run), args.languages)
    media = {}
    for fixture in data['fixtures']:
        sound = fixture['audio']
        if sound:
            path = Path(sound['path'])
            if len(sound['files']) != 1 or quality.sha256(path) != sound['files'][0]['sha256']:
                raise ValueError('Recording differs from evaluated waveform; prepare a new evaluation')
            media[fixture['id']] = 'data:audio/wav;base64,' + base64.b64encode(path.read_bytes()).decode()
    payload = json.dumps(dict(packet=data, media=media), ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    template = (HERE / 'quality-review.html').read_text(encoding='utf-8')
    output.mkdir(parents=True, exist_ok=False)
    quality.write_json(output / 'review-packet.json', data)
    (output / 'index.html').write_text(template.replace('__PAYLOAD__', payload), encoding='utf-8')
    print(f"Prepared {len(data['fixtures'])} references and {len(data['outputs'])} distinct review subjects in {output / 'index.html'}")


def validate_review(data, reviews):
    if reviews.get('schema_version') != 1 or reviews.get('packet_sha256') != data['packet_sha256']:
        raise ValueError('Review belongs to a different packet')
    reviewer = reviews.get('reviewer')
    if not isinstance(reviewer, str) or not reviewer.strip():
        raise ValueError('Enter the reviewer name or handle')
    if type(reviews.get('native_hindi_speaker')) is not bool:
        raise ValueError('Record the reviewer native-Hindi attestation explicitly')
    stamp = reviews.get('reviewed_at', '')
    parsed = datetime.fromisoformat(stamp.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Review timestamp needs a timezone')
    fixtures = {f['id']: f for f in data['fixtures']}
    subjects = {s['id']: s for s in data['outputs']}
    if set(reviews.get('fixtures', {})) - fixtures.keys() or set(reviews.get('outputs', {})) - subjects.keys():
        raise ValueError('Unknown fixture or output in review')
    for key, decision in reviews.get('fixtures', {}).items():
        for field in ['reference_decision', 'pronunciation_decision']:
            if decision.get(field) not in (None, 'approve', 'needs-correction'):
                raise ValueError('Fixture decision must be pending, approve or needs-correction')
        if 'hi' in fixtures[key]['languages'] and (decision.get('reference_decision') or decision.get('pronunciation_decision')) and reviews['native_hindi_speaker'] is not True:
            raise ValueError('Hindi reference/pronunciation judgments require a native Hindi reviewer; keep them pending otherwise')
        if not fixtures[key]['audio'] and decision.get('pronunciation_decision') is not None:
            raise ValueError('Text-only references cannot receive pronunciation approval')
        if (decision.get('reference_decision') or decision.get('pronunciation_decision')) and (not isinstance(decision.get('notes'), str) or not decision['notes'].strip()):
            raise ValueError('Fixture decisions need review notes')
        if fixtures[key]['audio'] and (decision.get('reference_decision') or decision.get('pronunciation_decision')) and decision.get('listened') is not True:
            raise ValueError('An audio-reference judgment requires listening confirmation')
    for key, decision in reviews.get('outputs', {}).items():
        if decision.get('decision') not in (None, 'approve', 'reject'):
            raise ValueError('Output decision must be pending, approve or reject')
        if decision.get('decision') is None:
            continue
        subject = subjects[key]
        fixture = fixtures[subject['fixture']]
        judged = reviews.get('fixtures', {}).get(subject['fixture'], {})
        if subject['error'] or judged.get('reference_decision') != 'approve' or (fixture['audio'] and (judged.get('pronunciation_decision') != 'approve' or judged.get('listened') is not True)):
            raise ValueError('Judge a successful output only after validating its reference and audio')
        checks = decision.get('checks', {})
        if set(checks) != set(CHECKS) or any(v not in ('pass', 'fail', 'uncertain', 'not-applicable') for v in checks.values()):
            raise ValueError('Record every semantic check explicitly')
        if checks['meaning'] == 'not-applicable' or checks['polarity'] == 'not-applicable' or checks['language_script'] == 'not-applicable' or checks['omissions_additions'] == 'not-applicable':
            raise ValueError('Meaning, polarity, language/script and omissions/additions always need a judgment')
        if decision['decision'] == 'approve' and any(v in ('fail', 'uncertain') for v in checks.values()):
            raise ValueError('Failed or uncertain checks cannot approve an output')
        if decision['decision'] == 'reject' and not any(v in ('fail', 'uncertain') for v in checks.values()):
            raise ValueError('A rejected output needs a failed or uncertain check')
        if not isinstance(decision.get('notes'), str) or not decision['notes'].strip():
            raise ValueError('Output decisions need review notes')


def import_reviews(args):
    data = json.loads(args.packet.read_text(encoding='utf-8'))
    runs = load_runs([f"{label}={Path(value['path']).parent}" for label, value in data['runs'].items()])
    current = packet(runs, data['languages'])
    if current != data:
        raise ValueError('Packet or evaluated results changed; prepare a new packet')
    # Check waveform bytes again, including a recording changed at the same path.
    for fixture in data['fixtures']:
        sound = fixture['audio']
        if sound and quality.sha256(sound['path']) != sound['files'][0]['sha256']:
            raise ValueError('Recording changed since evaluation')
    reviews = json.loads(args.reviews.read_text(encoding='utf-8'))
    validate_review(data, reviews)
    destination = private_destination(args.output)
    exported = {label: {} for label in runs}
    count = 0
    for subject in data['outputs']:
        decision = reviews.get('outputs', {}).get(subject['id'], {})
        if not decision.get('decision'):
            continue
        count += 1
        for occurrence in subject['occurrences']:
            exported[occurrence['run']][occurrence['key']] = dict(decision, output_sha256=subject['output_sha256'],
                                                                subject_sha256=subject['id'], reviewer=reviews['reviewer'], reviewed_at=reviews['reviewed_at'])
    destination.mkdir(parents=True, exist_ok=False)
    quality.write_json(destination / 'fixture-reviews.json', reviews)
    for label, entries in exported.items():
        if not entries:
            continue
        # Re-score a private copy; keep all original benchmark evidence intact.
        folder = destination / label
        folder.mkdir()
        shutil.copy2(runs[label][0], folder / 'results.json')
        quality.write_json(folder / 'reviews.json', entries)
        quality.score(folder, folder / 'reviews.json')
    quality.write_json(destination / 'summary.json', dict(semantic_release_qualified=False, reviewed_subjects=count,
                       pending_subjects=len(data['outputs']) - count, rows_with_decisions=sum(len(v) for v in exported.values()),
                       reviewer=reviews['reviewer'], packet_sha256=data['packet_sha256']))
    print(f'Imported {count} judgments; all other subjects remain pending. No semantic release qualification granted.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('prepare')
    p.add_argument('--run', action='append', required=True)
    p.add_argument('--languages', nargs='+', default=['en', 'hi'])
    p.add_argument('--output', type=Path, required=True)
    p = sub.add_parser('import')
    for name in ['packet', 'reviews', 'output']:
        p.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    try:
        {'prepare': prepare, 'import': import_reviews}[args.command](args)
    except (ValueError, KeyError, OSError, TypeError) as error:
        parser.exit(1, f'Review failed: {error}\n')


if __name__ == '__main__':
    main()
