"""Accounting regressions; these tests do not start Parrot or load models."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("benchmark", Path(__file__).with_name("memory-benchmark.py"))
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


class MemoryAccountingTests(unittest.TestCase):
    def test_xpc_helpers_are_attributed_without_other_apps_or_duplicate_pids(self):
        table = {
            10: {"ppid": 1, "command": "parrot"},
            11: {"ppid": 10, "command": "cleanup-sidecar"},
            12: {"ppid": 1, "command": "com.apple.WebKit.WebContent"},
            13: {"ppid": 1, "command": "com.apple.WebKit.WebContent"},
            20: {"ppid": 1, "command": "ollama"},
            21: {"ppid": 20, "command": "ollama runner"},
        }
        responsible = lambda pid: {12: 10, 13: 99}.get(pid, pid)
        self.assertEqual(benchmark.select_processes(table, {10, 11}, responsible), {10, 11, 12})
        self.assertEqual(benchmark.select_processes(table, {10, 20}, responsible), {10, 11, 12, 20, 21})
        self.assertEqual(benchmark.select_processes(table, {10}, None), {10, 11})

    def test_peak_is_a_simultaneous_sum_and_incomplete_samples_are_excluded(self):
        def sample(main, sidecar, complete=True):
            return {"scenario": "idle", "complete": complete,
                    "footprint_bytes": main + sidecar, "rss_bytes": 1,
                    "processes": [{"role": "app", "phys_footprint": main},
                                  {"role": "cleanup", "phys_footprint": sidecar}]}
        result = benchmark.summarize([sample(100, 10), sample(10, 100), sample(500, 500, False)], [])
        self.assertEqual(result["peak_footprint_bytes"], 110)
        self.assertEqual(result["phases"]["idle"]["complete_samples"], 2)
        self.assertFalse(result["completed"])

    def test_long_import_requires_all_complete_reference_repetitions(self):
        events = [
            {"kind": "result", "scenario": "long_import", "raw_text": "bicycle museum museum",
             "expected_words": ["bicycle", "museum"]},
            {"kind": "end", "scenario": "long_import", "details": {"audio_seconds": 25}},
        ]
        check = benchmark.long_import_quality(events, 10)[0]
        self.assertEqual(check["minimum_occurrences"], 2)
        self.assertFalse(check["quality_ok"])
        events[0]["raw_text"] = "bicycle museum bicycle museum"
        self.assertTrue(benchmark.long_import_quality(events, 10)[0]["quality_ok"])

    def test_long_import_rejects_reordered_chunks_with_complete_word_counts(self):
        events = [
            {"kind": "result", "scenario": "long_import", "raw_text": "bicycle museum museum bicycle",
             "expected_words": ["bicycle", "museum"]},
            {"kind": "end", "scenario": "long_import", "details": {"audio_seconds": 25}},
        ]
        check = benchmark.long_import_quality(events, 10)[0]
        self.assertEqual(check["observed_occurrences"], {"bicycle": 2, "museum": 2})
        self.assertFalse(check["source_topic_order_ok"])
        self.assertFalse(check["quality_ok"])


if __name__ == "__main__":
    unittest.main()
