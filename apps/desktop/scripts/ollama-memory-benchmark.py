#!/usr/bin/env python3
"""Measure legacy cleanup on an owned Ollama daemon and temporary model store.

Requires existing local weights and the opt-in Rust test binary. No downloads,
GUI, microphone, application database or requests to a user daemon.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import shutil
import socket
import statistics
import subprocess
import threading
import time
import urllib.request


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def get(base, endpoint):
    with urllib.request.urlopen(f"{base}/api/{endpoint}", timeout=5) as response:
        return json.load(response)


def descendants(root):
    rows = subprocess.check_output(["ps", "-axo", "pid=,ppid="], text=True, timeout=5).splitlines()
    parents = {int(pid): int(ppid) for pid, ppid in (row.split() for row in rows)}
    selected = {root}
    while True:
        more = {pid for pid, parent in parents.items() if parent in selected}
        if more <= selected:
            return sorted(selected)
        selected |= more


def stop(process):
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ollama", type=Path, required=True)
    parser.add_argument("--test-binary", type=Path, required=True)
    parser.add_argument("--existing-models", type=Path, required=True)
    parser.add_argument("--unrelated-gguf", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--idle-seconds", nargs="+", type=int, default=[2, 2, 60])
    args = parser.parse_args()
    if platform.system() != "Darwin":
        parser.error("macOS process footprint ledgers are required")
    if any(not 1 <= seconds <= 86400 for seconds in args.idle_seconds):
        parser.error("idle seconds must be from 1 through 86400")
    args.output.mkdir(parents=True, exist_ok=False)
    spec = importlib.util.spec_from_file_location("memory", Path(__file__).with_name("memory-benchmark.py"))
    memory_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(memory_module)
    memory = memory_module.MacMemory()
    manifest = args.existing_models / "manifests/registry.ollama.ai/library/llama3.2/latest"
    source_manifest = json.loads(manifest.read_text())
    metadata = {
        "platform": platform.platform(), "machine": platform.machine(),
        "hardware": subprocess.check_output(["sysctl", "-n", "hw.model"], text=True).strip(),
        "ram_bytes": int(subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True)),
        "git_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
        "binary_sha256": sha(args.test_binary), "ollama_sha256": sha(args.ollama),
        "llama_manifest_sha256": sha(manifest), "llama_manifest": source_manifest,
        "unrelated_gguf_sha256": sha(args.unrelated_gguf),
        "sampling_seconds": 0.1, "idle_seconds": args.idle_seconds,
    }
    # Refer to existing blobs read-only. All newly imported blobs/manifests live
    # in the disposable store; never register models in the user's Ollama store.
    store = args.output / "temporary-models"
    destination = store / "manifests/registry.ollama.ai/library/llama3.2/latest"
    destination.parent.mkdir(parents=True)
    shutil.copyfile(manifest, destination)
    (store / "blobs").mkdir()
    for entry in [source_manifest["config"], *source_manifest["layers"]]:
        filename = entry["digest"].replace(":", "-")
        source = (args.existing_models / "blobs" / filename).resolve()
        assert sha(source) == entry["digest"].split(":")[1]
        (store / "blobs" / filename).symlink_to(source)
    # A free, separately owned port prevents interference with installed apps.
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    assert port != 11434
    base = f"http://127.0.0.1:{port}"
    env = {key: os.environ[key] for key in ("HOME", "PATH", "TMPDIR") if key in os.environ}
    env.update(OLLAMA_HOST=base, OLLAMA_MODELS=str(store.resolve()), OLLAMA_NO_CLOUD="1",
               OLLAMA_CONTEXT_LENGTH="4096", OLLAMA_NUM_PARALLEL="1", OLLAMA_MAX_LOADED_MODELS="3")
    metadata["daemon_environment"] = {key: env[key] for key in env if key.startswith("OLLAMA_")}
    results = []
    for index, idle in enumerate(args.idle_seconds):
        run_dir = args.output / f"run-{index + 1}"
        run_dir.mkdir()
        daemon = worker = None
        finished = threading.Event()
        phase = ["startup"]
        events, samples = [], []
        started = time.monotonic()
        with (run_dir / "daemon.log").open("w") as daemon_log:
            try:
                daemon = subprocess.Popen([str(args.ollama), "serve"], env=env,
                                          stdin=subprocess.DEVNULL, stdout=daemon_log, stderr=daemon_log)
                for _ in range(100):
                    assert daemon.poll() is None, "Owned daemon exited"
                    try:
                        metadata["ollama_version"] = get(base, "version")
                        break
                    except OSError:
                        time.sleep(0.1)
                else:
                    raise RuntimeError("Owned daemon did not bind")
                # Build a second distinct runner entirely in the temporary store.
                link = args.output / "unrelated.gguf"
                if not link.exists():
                    link.symlink_to(args.unrelated_gguf.resolve())
                modelfile = args.output / "Modelfile"
                modelfile.write_text(f'FROM "{link.resolve()}"\n')
                with (run_dir / "create.log").open("w") as log:
                    subprocess.run([str(args.ollama), "create", "parrot-unrelated:latest", "-f", str(modelfile)],
                                   env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=log, timeout=90, check=True)
                assert get(base, "ps")["models"] == []
                test_env = env | {"PARROT_TEST_OLLAMA_PORT": str(port), "PARROT_TEST_OLLAMA_MODEL": "llama3.2:latest",
                                  "PARROT_TEST_OLLAMA_UNRELATED_MODEL": "parrot-unrelated:latest",
                                  "PARROT_TEST_OLLAMA_IDLE_SECONDS": str(idle)}
                worker = subprocess.Popen([str(args.test_binary), "ollama_cleanup::tests::real_ollama_demand_idle_keep_warm_and_targeted_release",
                                           "--exact", "--ignored", "--nocapture"], env=test_env,
                                          stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

                def sample():
                    while not finished.is_set():
                        processes = [{"pid": pid, **memory.usage(pid)} for pid in descendants(daemon.pid)]
                        complete = all("phys_footprint" in process for process in processes)
                        samples.append({"elapsed_seconds": time.monotonic() - started, "phase": phase[0],
                                        "complete": complete, "processes": processes,
                                        "footprint_bytes": sum(p.get("phys_footprint", 0) for p in processes),
                                        "rss_bytes": sum(p.get("resident_size", 0) for p in processes)})
                        if time.monotonic() - started > idle + 240:
                            worker.kill()
                            return
                        finished.wait(0.1)

                sampler = threading.Thread(target=sample)
                sampler.start()
                try:
                    with (run_dir / "worker.log").open("w") as log:
                        for line in worker.stdout:
                            log.write(line)
                            log.flush()
                            if line.startswith("OLLAMA_EVENT "):
                                event = json.loads(line.removeprefix("OLLAMA_EVENT "))
                                event["elapsed_seconds"] = time.monotonic() - started
                                events.append(event)
                                phase[0] = event["phase"]
                                print(json.dumps({"run": index + 1, "phase": phase[0], "latency_ms": event["latency_ms"]}), flush=True)
                    code = worker.wait(timeout=10)
                finally:
                    finished.set()
                    sampler.join(timeout=10)
                (run_dir / "events.json").write_text(json.dumps(events, indent=2) + "\n")
                (run_dir / "samples.jsonl").write_text("".join(json.dumps(row) + "\n" for row in samples))
                assert code == 0 and events[-1]["phase"] == "complete", "Native validation failed; inspect worker.log"
                phases = {}
                for name in sorted({row["phase"] for row in samples}):
                    rows = [row for row in samples if row["phase"] == name and row["complete"]]
                    values = [row["footprint_bytes"] for row in rows]
                    phases[name] = {"complete_samples": len(rows), "median_footprint_bytes": statistics.median(values) if values else None,
                                    "peak_footprint_bytes": max(values, default=None), "peak_rss_bytes": max((row["rss_bytes"] for row in rows), default=None)}
                gaps = [b["elapsed_seconds"] - a["elapsed_seconds"] for a, b in zip(samples, samples[1:])]
                results.append({"run": index + 1, "idle_seconds": idle, "exit_code": code,
                                "max_sample_gap_seconds": max(gaps, default=None),
                                "incomplete_samples": sum(not row["complete"] for row in samples),
                                "phases": phases, "events": events})
            finally:
                finished.set()
                stop(worker)
                # Terminate only this server and its runners (no ollama stop/killall).
                children = {} if daemon is None or daemon.poll() is not None else {
                    pid: memory.usage(pid).get("proc_start_abstime")
                    for pid in descendants(daemon.pid) if pid != daemon.pid}
                stop(daemon)
                for pid, identity in children.items():
                    if identity is not None and memory.usage(pid).get("proc_start_abstime") == identity:
                        try:
                            os.kill(pid, 15)
                        except ProcessLookupError:
                            pass
                deadline = time.monotonic() + 5
                while any(identity is not None and memory.usage(pid).get("proc_start_abstime") == identity
                          for pid, identity in children.items()):
                    assert time.monotonic() < deadline, "Owned runner did not exit"
                    time.sleep(0.1)
    assert sha(manifest) == metadata["llama_manifest_sha256"]
    for entry in [source_manifest["config"], *source_manifest["layers"]]:
        assert sha(args.existing_models / "blobs" / entry["digest"].replace(":", "-")) == entry["digest"].split(":")[1]
    metadata["source_blobs_verified_after"] = True
    (args.output / "summary.json").write_text(json.dumps({"metadata": metadata, "runs": results}, indent=2) + "\n")
    # Evidence contains no model weights or mutable links into the user's store.
    shutil.rmtree(store)
    (args.output / "unrelated.gguf").unlink()
    print(json.dumps({"complete": True, "runs": len(results)}), flush=True)


if __name__ == "__main__":
    main()
