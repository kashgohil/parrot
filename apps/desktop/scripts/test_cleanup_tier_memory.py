import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('tiers', Path(__file__).with_name('cleanup-tier-memory.py'))
tiers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tiers)


class SampleTests(unittest.TestCase):
    def test_peak_sums_complete_tree_and_keeps_rss_separate(self):
        samples = [dict(elapsed_ms=0, processes=[dict(phys_footprint=10, resident_size=30), dict(phys_footprint=20, resident_size=40)]),
                   dict(elapsed_ms=85, processes=[dict(phys_footprint=100, resident_size=5)])]
        result = tiers.summarize_samples(samples)
        self.assertEqual((result['peak_footprint_bytes'], result['peak_rss_bytes']), (100, 70))
        self.assertEqual(result['max_sample_gap_ms'], 85)

    def test_partial_tree_is_counted_but_never_used_as_a_peak(self):
        samples = [dict(elapsed_ms=0, processes=[dict(phys_footprint=10, resident_size=30)]),
                   dict(elapsed_ms=50, processes=[dict(phys_footprint=100, resident_size=300), dict(error='exited')]),
                   dict(elapsed_ms=100, processes=[])]
        result = tiers.summarize_samples(samples)
        self.assertEqual(result['peak_footprint_bytes'], 10)
        self.assertEqual((result['complete_samples'], result['incomplete_samples']), (1, 2))

    def test_missing_ledgers_fail_instead_of_reporting_zero_memory(self):
        with self.assertRaises(ValueError):
            tiers.summarize_samples([dict(elapsed_ms=0, processes=[dict(error='permission')])])


if __name__ == '__main__':
    unittest.main()
