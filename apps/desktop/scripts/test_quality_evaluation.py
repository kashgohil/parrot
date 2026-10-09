import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('quality', Path(__file__).with_name('quality-evaluation.py'))
quality = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(quality)


class CleanupDiagnosticsTests(unittest.TestCase):
    def test_fixture_hints_override_model_defaults_without_changing_other_cases(self):
        variant = {'custom_words': '["Kubernetes"]', 'context_prompt': 'default context', 'writing_style': 'formal'}
        self.assertEqual(quality.cleanup_options(variant, {}), variant)
        result = quality.cleanup_options(variant, {'context_prompt': 'long context', 'writing_style': ''})
        self.assertEqual(result, dict(variant, context_prompt='long context', writing_style=''))
        with self.assertRaises(ValueError):
            quality.cleanup_options(variant, {'custom_words': ['invalid type']})

    def test_protocol_diagnostics_keep_segments_with_their_request(self):
        part = dict(prompt_tokens=300, reused_tokens=0, decoded_tokens=300, prefill_ms=14,
                    generated_tokens=10, generation_ms=80, context_tokens=2048, output_budget=100)
        rows = [{'input': 'two sentences', 'segments': [part, part]},
                {'input': '', 'segments': []},
                {'input': 'third', 'segments': [part], 'complete': False}]
        self.assertTrue(quality.attach_cleanup_diagnostics(rows, 'unrelated/retry logs'))
        self.assertEqual(rows[0]['token_diagnostics']['prompt_tokens'], 600)
        self.assertEqual(rows[0]['token_diagnostics']['segment_count'], 2)
        self.assertEqual(rows[1]['token_diagnostics']['generated_tokens'], 0)
        self.assertEqual(rows[2]['token_diagnostics']['output_budgets'], [100])

    def test_missing_protocol_diagnostics_cannot_fall_back_to_stderr_pairing(self):
        for rows in [[{'input': 'text', 'segments': [{}]}],
                     [{'input': 'text', 'segments': []}, {'input': 'second'}],
                     [{'input': 'text', 'segments': [], 'error': 'failed'}]]:
            self.assertFalse(quality.attach_cleanup_diagnostics(rows, ''))
            self.assertNotIn('token_diagnostics', rows[0])

    def test_empty_inputs_do_not_shift_native_token_counts(self):
        rows = [{'input': 'first'}, {'input': '  '}, {'input': 'second'}]
        log = ('cleanup-sidecar: prompt_tok=300 reused=0 decoded=300 prefill=14ms gen_tok=10 gen=80ms\n'
               'cleanup-sidecar: prompt_tok=310 reused=280 decoded=30 prefill=2ms gen_tok=11 gen=90ms\n')
        self.assertTrue(quality.attach_cleanup_diagnostics(rows, log))
        self.assertEqual(rows[0]['token_diagnostics']['prompt_tokens'], 300)
        self.assertNotIn('token_diagnostics', rows[1])
        self.assertEqual(rows[2]['token_diagnostics']['reused_tokens'], 280)

    def test_missing_extra_or_failed_requests_cannot_be_correlated(self):
        line = 'cleanup-sidecar: prompt_tok=300 reused=0 decoded=300 prefill=14ms gen_tok=10 gen=80ms\n'
        for rows, log in [([{'input': 'text'}], ''), ([{'input': 'text'}], line + line),
                          ([{'input': 'text', 'error': 'failed'}], line)]:
            self.assertFalse(quality.attach_cleanup_diagnostics(rows, log))
            self.assertNotIn('token_diagnostics', rows[0])


class MetricsTests(unittest.TestCase):
    def test_alignment_counts_all_edit_types(self):
        self.assertEqual(quality.edit_counts(['a', 'b', 'c'], ['a', 'x', 'c'])['substitutions'], 1)
        self.assertEqual(quality.edit_counts(['a', 'b', 'c'], ['a', 'c'])['deletions'], 1)
        self.assertEqual(quality.edit_counts(['a', 'c'], ['a', 'b', 'c'])['insertions'], 1)
        self.assertEqual(quality.edit_counts(['a'], ['x', 'y'])['rate'], 2)

    def test_silence_has_no_division_by_zero_and_counts_insertions(self):
        result = quality.metrics('', 'hallucinated speech')
        self.assertIsNone(result['wer']['rate'])
        self.assertEqual(result['wer']['insertions'], 2)
        self.assertEqual(quality.metrics('', '')['cer']['errors'], 0)

    def test_unchanged_prefix_and_suffix_keep_full_denominator(self):
        result = quality.edit_counts(['a', 'b', 'c', 'd'], ['a', 'b', 'x', 'c', 'd'])
        self.assertEqual(result['reference_units'], 4)
        self.assertEqual(result['hypothesis_units'], 5)
        self.assertEqual(result['insertions'], 1)
        self.assertEqual(result['rate'], 0.25)

    def test_normalization_retains_accents_and_indic_combining_marks(self):
        self.assertEqual(quality.metrics('CAFÉ', 'cafe\u0301')['wer']['errors'], 0)
        self.assertEqual(quality.word_tokens('प्रिया नहीं किया।'), ['प्रिया', 'नहीं', 'किया'])
        self.assertEqual(quality.metrics('नहीं', 'नही')['cer']['deletions'], 1)
        self.assertEqual(quality.word_tokens('don’t deploy'), ["don't", 'deploy'])

    def test_cer_handles_unspaced_cjk(self):
        result = quality.metrics('小王没有批准', '小王已经批准')
        self.assertEqual(result['cer']['substitutions'], 2)
        self.assertEqual(result['wer']['reference_units'], 1)  # Not an informative primary metric here.

    def test_number_words_are_not_silently_normalized(self):
        self.assertGreater(quality.metrics('25', 'twenty five')['wer']['errors'], 0)

    def test_english_fact_matching_has_word_boundaries(self):
        self.assertEqual(quality.occurrences('a notebook', 'not'), 0)
        self.assertEqual(quality.occurrences('Do not approve; NOT approved.', 'not'), 2)

    def test_han_fact_matching_has_no_word_boundary_requirement(self):
        self.assertEqual(quality.occurrences('小王没有批准付款', '没有'), 1)
        self.assertEqual(quality.occurrences('没有批准25元的付款', '25'), 1)
        self.assertEqual(quality.occurrences('125元和25.2元', '25'), 0)


class PropertyTests(unittest.TestCase):
    CASE = {'reference': 'Priya did not approve 25 euros', 'facts': [
        {'id': 'name', 'any_of': ['Priya']}, {'id': 'negation', 'any_of': ['not']},
        {'id': 'amount', 'any_of': ['25', 'twenty five']}]}

    def test_missing_asr_fact_is_not_attributed_to_cleanup(self):
        result = quality.properties(self.CASE, 'Priya approved 25 euros', 'Priya approved 25 euros')
        self.assertIn('negation', result['reference_facts_failed'])
        self.assertFalse(result['introduced_regression'])

    def test_cleanup_losing_negation_is_attributed_to_cleanup(self):
        result = quality.properties(self.CASE, 'Priya approved 25 euros', self.CASE['reference'])
        self.assertIn('negation', result['source_facts_lost'])
        self.assertTrue(result['introduced_regression'])

    def test_repeated_amounts_and_new_amounts_are_detected(self):
        result = quality.properties(self.CASE, '25 and 30', '25 and 25')
        self.assertEqual(result['numbers_lost'], {'25': 1})
        self.assertEqual(result['numbers_added'], {'30': 1})

    def test_script_loss_and_transliteration_are_detected(self):
        case = {'reference': 'प्रिया ने invoice नहीं किया', 'facts': []}
        result = quality.properties(case, 'Priya did not approve the invoice', case['reference'])
        self.assertIn('Devanagari', result['source_scripts_lost'])
        self.assertTrue(result['introduced_regression'])

    def test_repeated_order_contract_is_checked(self):
        case = {'reference': 'bicycle atlas bicycle atlas', 'facts': [], 'ordered_terms': ['bicycle', 'atlas'] * 2}
        self.assertTrue(quality.properties(case, case['reference'])['reference_order_ok'])
        self.assertFalse(quality.properties(case, 'bicycle bicycle atlas atlas')['reference_order_ok'])
        self.assertTrue(quality.properties(case, 'bicycle atlas', case['reference'])['source_order_lost'])

    def test_speech_added_to_empty_cleanup_is_failure(self):
        self.assertTrue(quality.properties({'reference': '', 'facts': []}, 'Thank you', '')['introduced_regression'])

    def test_seed_manifest_is_internally_consistent(self):
        manifest = quality.read_manifest(quality.DEFAULT_MANIFEST)
        self.assertEqual(len(manifest['cases']), 16)
        self.assertEqual(len({case['id'] for case in manifest['cases']}), 16)

    def test_seed_audio_hashes_and_long_reference_duration(self):
        import wave
        provenance = json.loads(quality.DEFAULT_MANIFEST.with_name('provenance.json').read_text(encoding='utf-8'))
        for record in provenance['records']:
            path = quality.DEFAULT_MANIFEST.parent / record['audio']
            self.assertEqual(quality.sha256(path), record['sha256'])
            with wave.open(str(path), 'rb') as audio:
                self.assertEqual((audio.getnchannels(), audio.getframerate(), audio.getsampwidth()), (1, 16000, 2))
                if record['id'] == 'long-120s':
                    self.assertEqual(audio.getnframes() / audio.getframerate(), 120)

    def test_pending_review_cannot_qualify_semantics(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)
            row = {'key': 'model/case/1', 'case': 'case', 'variant': 'model', 'stage': 'cleanup_isolated', 'tone': 'neutral',
                   'repeat': 1, 'latency_ms': 1, 'input': self.CASE['reference'], 'text': self.CASE['reference'],
                   'candidate': 'Priya approved 25 euros', 'model_output': 'Priya approved 25 euros', 'fallback': True}
            (path / 'results.json').write_text(json.dumps({'manifest': {'cases': [{'id': 'case', 'primary_metric': 'wer', 'languages':['en'], **self.CASE}]},
                                                         'complete': True, 'normalization': quality.NORMALIZATION, 'skipped': [], 'rows': [row]}))
            quality.score(path, None)
            report = json.loads((path / 'scores.json').read_text(encoding='utf-8'))
            self.assertFalse(report['semantic_release_qualified'])
            self.assertEqual(report['groups'][0]['human_pending'], 1)
            self.assertTrue(report['rows'][0]['candidate_properties']['introduced_regression'])
            self.assertFalse(report['rows'][0]['properties']['introduced_regression'])
            reviews = path / 'reviewed.json'
            reviews.write_text(json.dumps({row['key']: {'decision': 'reject', 'notes': 'No useful cleanup',
                                                       'output_sha256': quality.hashlib.sha256(row['text'].encode()).hexdigest()}}))
            quality.score(path, reviews)
            report = json.loads((path / 'scores.json').read_text(encoding='utf-8'))
            self.assertEqual(report['groups'][0]['human_rejected'], 1)
            self.assertFalse(report['semantic_release_qualified'])


class ComparisonTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.paths = [Path(self.temp.name) / name for name in ['baseline', 'candidate']]
        case = {'id': 'case', 'languages': ['en'], 'reference': 'Do not deploy', 'primary_metric': 'wer',
                'facts': [{'id': 'negation', 'any_of': ['not']}]}
        for path in self.paths:
            path.mkdir()
            row = {'key': 'model/case/auto/asr/1', 'case': 'case', 'variant': 'model', 'stage': 'asr',
                   'repeat': 1, 'language': 'auto', 'latency_ms': 1, 'text': case['reference']}
            quality.write_json(path / 'results.json', {'manifest': {'cases': [case]}, 'manifest_sha256': 'same',
                               'unicode_version': 'same', 'models': {}, 'normalization': quality.NORMALIZATION,
                               'complete': True, 'skipped': [], 'rows': [row]})
            quality.score(path, None)

    def test_identical_run_passes_regression_check_without_qualifying_release(self):
        result = quality.compare(*self.paths)
        self.assertTrue(result['regression_check_pass'])
        self.assertFalse(result['semantic_release_qualified'])

    def test_dropped_negation_fails_comparison(self):
        path = self.paths[1] / 'results.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        data['rows'][0]['text'] = 'Do deploy'
        quality.write_json(path, data)
        quality.score(self.paths[1], None)
        result = quality.compare(*self.paths)
        self.assertFalse(result['regression_check_pass'])
        self.assertTrue(any(flag.get('reason') == 'new property flags require review' for flag in result['regressions']))

    def test_missing_coverage_fails_comparison(self):
        path = self.paths[1] / 'scores.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        data['rows'] = []
        quality.write_json(path, data)
        self.assertFalse(quality.compare(*self.paths)['regression_check_pass'])

    def test_changed_corpus_or_incomplete_run_cannot_be_compared(self):
        path = self.paths[1] / 'results.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        data['manifest_sha256'] = 'changed'
        quality.write_json(path, data)
        with self.assertRaises(ValueError):
            quality.compare(*self.paths)
        data['manifest_sha256'] = 'same'
        data['complete'] = False
        quality.write_json(path, data)
        with self.assertRaises(ValueError):
            quality.compare(*self.paths)



if __name__ == '__main__':
    unittest.main()
