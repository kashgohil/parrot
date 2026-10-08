#!/usr/bin/env python3
"""Compare legacy/bounded preview copies in fresh native Rust test processes.

No microphone, inference, WebKit, or sidecar. This isolates copy allocation
and callback mutex contention; use memory-benchmark.py for whole-app results.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import queue
import subprocess
import threading
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test-binary", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--seconds", type=int, nargs="+", default=[60, 300, 600])
    parser.add_argument("--repeats", type=int, default=2)
    parser.add_argument("--interval-ms", type=int, default=10)
    parser.add_argument("--copies", type=int, default=120)
    args = parser.parse_args()
    if platform.system() != "Darwin":
        parser.error("requires macOS physical-footprint ledgers")
    if not 1 <= args.repeats <= 10 or any(not 20 <= s <= 600 for s in args.seconds):
        parser.error("repeats must be 1..10 and seconds 20..600")
    if not 10 <= args.interval_ms <= 900 or not 1 <= args.copies <= 120:
        parser.error("interval-ms must be 10..900 and copies 1..120")
    binary = args.test_binary.resolve(strict=True)
    args.out.mkdir(parents=True, exist_ok=False)
    spec = importlib.util.spec_from_file_location(
        "memory_benchmark", Path(__file__).with_name("memory-benchmark.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    memory = module.MacMemory()
    metadata = {"binary_sha256": hashlib.sha256(binary.read_bytes()).hexdigest(),
                "revision": module.command("git", "rev-parse", "HEAD"),
                "working_tree": module.command("git", "status", "--short"),
                "hardware": module.command("sysctl", "-n", "hw.model"),
                "ram_bytes": module.command("sysctl", "-n", "hw.memsize"),
                "os": platform.platform(), "seconds": args.seconds,
                "repeats": args.repeats, "copy_interval_ms": args.interval_ms,
                "copies": args.copies, "requested_sample_interval_ms": 25,
                "scope": "native test process only, no inference or microphone"}
    (args.out / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    results = []
    for seconds in args.seconds:
        for repeat in range(1, args.repeats + 1):
            modes = ["legacy", "bounded"] if repeat % 2 else ["bounded", "legacy"]
            for mode in modes:
                label = f"{seconds}s-{mode}-{repeat}"
                env = {**os.environ, "PARROT_PREVIEW_BENCH_MODE": mode,
                       "PARROT_PREVIEW_BENCH_SECONDS": str(seconds),
                       "PARROT_PREVIEW_BENCH_INTERVAL_MS": str(args.interval_ms),
                       "PARROT_PREVIEW_BENCH_COPIES": str(args.copies)}
                process = subprocess.Popen([str(binary), "--exact",
                    "audio::preview_buffer_bench::measure_preview_buffers",
                    "--ignored", "--nocapture"], env=env, stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT, text=True)
                lines, events, samples = [], [], []
                pending = queue.Queue()

                def read_output():
                    for line in process.stdout:
                        lines.append(line)
                        if line.startswith("PREVIEW_BENCH "):
                            pending.put(json.loads(line.removeprefix("PREVIEW_BENCH ")))

                reader = threading.Thread(target=read_output)
                reader.start()
                start, phase = time.monotonic(), "starting"
                try:
                    while process.poll() is None:
                        while not pending.empty():
                            event = pending.get_nowait()
                            events.append(event)
                            phase = event["phase"]
                        samples.append({"elapsed_ms": (time.monotonic() - start) * 1000,
                                        "phase": phase, **memory.usage(process.pid)})
                        if time.monotonic() - start > args.interval_ms * args.copies / 1000 + 30:
                            raise RuntimeError(f"{label}: timed out")
                        time.sleep(0.025)
                finally:
                    if process.poll() is None:
                        process.terminate()
                    process.wait(timeout=5)
                    reader.join(timeout=5)
                    process.stdout.close()
                    (args.out / f"{label}.log").write_text("".join(lines))
                    (args.out / f"{label}-samples.json").write_text(json.dumps(samples) + "\n")
                while not pending.empty():
                    events.append(pending.get_nowait())
                assert process.returncode == 0, f"{label} failed; inspect its log"
                assert events and events[-1]["phase"] == "complete", f"{label}: missing coverage"
                valid = [s for s in samples if "error" not in s]
                assert valid and any(s["phase"] == "snapshot_live" for s in valid)
                result = {"label": label, "events": events,
                          "sample_count": len(samples),
                          "incomplete_samples": len(samples) - len(valid),
                          "sampled_peak_footprint_bytes": max(s["phys_footprint"] for s in valid),
                          "observed_lifetime_peak_footprint_bytes": max(s["lifetime_max_phys_footprint"] for s in valid)}
                results.append(result)
                (args.out / "results.json").write_text(json.dumps(results, indent=2) + "\n")
                print(label, "complete", flush=True)


if __name__ == "__main__":
    main()
