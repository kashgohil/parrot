import copy
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
import wave

spec = importlib.util.spec_from_file_location('review', Path(__file__).with_name('quality-review.py'))
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.wav = self.root / 'fixture.wav'
        with wave.open(str(self.wav), 'wb') as audio:
            audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(16000)
            audio.writeframes(b'\x00\x00' * 4000)
        self.run = self.root / 'run'
        self.run.mkdir()
        case = dict(id='case', languages=['hi', 'en'], primary_metric='cer', reference='प्रिया ने invoice approve नहीं किया।', facts=[])
        row = dict(case='case', id='case/auto', variant='model', stage='asr', language='auto', text=case['reference'], latency_ms=1)
        self.metadata = dict(schema_version=1, complete=True, normalization=review.quality.NORMALIZATION, skipped=[],
                             manifest=dict(cases=[case]), models=dict(model=review.quality.fingerprint(self.wav)),
                             audio=[dict(id='case', **review.quality.fingerprint(self.wav))],
                             rows=[dict(row, key='model/case/auto/asr/1', repeat=1), dict(row, key='model/case/auto/asr/2', repeat=2)])
        review.quality.write_json(self.run / 'results.json', self.metadata)
        self.runs = review.load_runs(['test=' + str(self.run)])
        self.packet = review.packet(self.runs, ['hi'])

    def judgment(self):
        fixture = self.packet['fixtures'][0]['id']; output = self.packet['outputs'][0]['id']
        return dict(schema_version=1, packet_sha256=self.packet['packet_sha256'], reviewer='test reviewer', native_hindi_speaker=True, reviewed_at='2026-10-09T12:00:00Z',
                    fixtures={fixture: dict(listened=True, reference_decision='approve', pronunciation_decision='approve', notes='Synthetic test judgment')},
                    outputs={output: dict(decision='approve', notes='Test only; not a real review', checks={key: 'pass' for key in review.CHECKS})})

    def test_identical_repeats_share_judgment_but_changed_context_does_not(self):
        self.assertEqual(len(self.packet['outputs']), 1)
        self.assertEqual(len(self.packet['outputs'][0]['occurrences']), 2)
        altered = copy.deepcopy(self.metadata)
        altered['rows'][1]['initial_prompt'] = 'different prompt'
        result = review.packet({'test': (self.run / 'results.json', altered)}, ['hi'])
        self.assertEqual(len(result['outputs']), 2)

    def test_import_requires_listening_valid_reference_and_explicit_semantic_checks(self):
        good = self.judgment(); review.validate_review(self.packet, good)
        fixture = next(iter(good['fixtures'])); output = next(iter(good['outputs']))
        changes = [('fixtures', fixture, 'listened', False), ('fixtures', fixture, 'reference_decision', 'needs-correction'),
                   ('fixtures', fixture, 'pronunciation_decision', None), ('fixtures', fixture, 'notes', ''),
                   ('outputs', output, 'checks', {}), ('outputs', output, 'notes', '')]
        for group, key, field, value in changes:
            bad = copy.deepcopy(good); bad[group][key][field] = value
            with self.assertRaises(ValueError): review.validate_review(self.packet, bad)
        for field in ['meaning', 'polarity', 'language_script', 'omissions_additions']:
            for value in ['uncertain', 'fail', 'not-applicable']:
                bad = copy.deepcopy(good); bad['outputs'][output]['checks'][field] = value
                with self.assertRaises(ValueError): review.validate_review(self.packet, bad)
        bad = copy.deepcopy(good); bad['packet_sha256'] = 'different'
        with self.assertRaises(ValueError): review.validate_review(self.packet, bad)
        bad = copy.deepcopy(good); bad['native_hindi_speaker'] = False
        with self.assertRaisesRegex(ValueError, 'native Hindi'): review.validate_review(self.packet, bad)

    def test_import_expands_repeats_in_private_copy_without_qualifying_release(self):
        packet = self.root / 'packet.json'; reviews = self.root / 'reviews.json'; destination = self.root / 'imported'
        review.quality.write_json(packet, self.packet); review.quality.write_json(reviews, self.judgment())
        review.import_reviews(SimpleNamespace(packet=packet, reviews=reviews, output=destination))
        scored = json.loads((destination / 'test/scores.json').read_text())
        self.assertFalse(scored['semantic_release_qualified'])
        self.assertEqual(scored['groups'][0]['human_pending'], 0)
        self.assertEqual(len(json.loads((destination / 'test/reviews.json').read_text())), 2)
        self.assertFalse((self.run / 'scores.json').exists())
        self.wav.write_bytes(b'changed recording')
        with self.assertRaisesRegex(ValueError, 'Recording changed'):
            review.import_reviews(SimpleNamespace(packet=packet, reviews=reviews, output=self.root / 'stale'))

    def test_changed_results_or_packet_cannot_reuse_judgments(self):
        packet = self.root / 'packet.json'; reviews = self.root / 'reviews.json'
        review.quality.write_json(packet, self.packet); review.quality.write_json(reviews, self.judgment())
        self.metadata['manifest']['cases'][0]['reference'] = 'प्रिया ने invoice approve किया।'
        review.quality.write_json(self.run / 'results.json', self.metadata)
        with self.assertRaisesRegex(ValueError, 'changed'):
            review.import_reviews(SimpleNamespace(packet=packet, reviews=reviews, output=self.root / 'stale'))

    def test_local_recording_intake_rejects_missing_consent_and_keeps_pending_reference(self):
        entry = dict(id='real-case', audio=str(self.wav), languages=['hi', 'en'], reference='प्रिया ने invoice approve नहीं किया।',
                     facts=[], tags=['negative'], speaker_id='speaker-01', consent=dict(local_evaluation=False, attested_by='test', attested_at='2026-10-09T12:00:00Z'))
        intake = self.root / 'intake.json'; destination = self.root / 'corpus'
        review.quality.write_json(intake, dict(schema_version=1, cases=[entry]))
        args = SimpleNamespace(intake=intake, output=destination)
        with self.assertRaisesRegex(ValueError, 'consent'): review.create_corpus(args)
        self.assertFalse(destination.exists())
        entry['consent']['local_evaluation'] = True
        review.quality.write_json(intake, dict(schema_version=1, cases=[entry]))
        review.create_corpus(args)
        manifest = review.quality.read_manifest(destination / 'manifest.json')
        self.assertEqual(manifest['cases'][0]['source']['kind'], 'real-speaker')
        self.assertEqual(review.quality.sha256(destination / 'audio/real-case.wav'), review.quality.sha256(self.wav))
        self.assertIn('pending', manifest['cases'][0]['provenance'])
        self.assertNotIn('reference_review', manifest['cases'][0])
        model = self.root / 'model.bin'; model.write_bytes(b'fake model; never loaded')
        config = self.root / 'config.json'
        review.quality.write_json(config, dict(speech=[dict(id='model', engine='whisper', model=str(model), quantization='test')]))
        (destination / 'audio/real-case.wav').write_bytes(b'changed after intake')
        with self.assertRaisesRegex(ValueError, 'differs from consented intake'):
            review.quality.run(SimpleNamespace(manifest=destination / 'manifest.json', config=config, repeats=1,
                                              output=self.root / 'never-evaluated', sidecar=None))
        self.assertFalse((self.root / 'never-evaluated').exists())

    def test_private_outputs_cannot_land_in_tracked_repository_folders(self):
        with self.assertRaises(ValueError): review.private_destination(review.quality.ROOT / 'docs/review')
        self.assertEqual(review.private_destination(review.quality.ROOT / 'quality-results/private'), review.quality.ROOT / 'quality-results/private')

    def test_html_embeds_transcripts_as_data_not_executable_markup(self):
        self.metadata['rows'][0]['text'] = '</script><script>window.injected=true</script>'
        review.quality.write_json(self.run / 'results.json', self.metadata)
        dest = self.root / 'packet'
        review.prepare(SimpleNamespace(run=['test=' + str(self.run)], languages=['hi'], output=dest))
        html = (dest / 'index.html').read_text()
        self.assertNotIn('</script><script>window.injected', html)
        self.assertIn("connect-src 'none'", html)
        self.assertIn('\\u003c/script\\u003e', html)


if __name__ == '__main__': unittest.main()
