#!/usr/bin/env python3
"""Sample Parrot's macOS memory ledgers. No third-party Python packages needed."""

import argparse
import ctypes
import datetime
import hashlib
import json
import os
from pathlib import Path
import platform
import signal
import statistics
import subprocess
import sys
import time
import wave


# Stable SDK layout from sys/resource.h, RUSAGE_INFO_V4 (macOS 10.15+).
class RusageV4(ctypes.Structure):
    _fields_ = [("uuid", ctypes.c_uint8 * 16)] + [
        (name, ctypes.c_uint64) for name in (
            "user_time system_time pkg_idle_wkups interrupt_wkups pageins wired_size "
            "resident_size phys_footprint proc_start_abstime proc_exit_abstime "
            "child_user_time child_system_time child_pkg_idle_wkups "
            "child_interrupt_wkups child_pageins child_elapsed_abstime "
            "diskio_bytesread diskio_byteswritten cpu_time_qos_default "
            "cpu_time_qos_maintenance cpu_time_qos_background cpu_time_qos_utility "
            "cpu_time_qos_legacy cpu_time_qos_user_initiated cpu_time_qos_user_interactive "
            "billed_system_time serviced_system_time logical_writes "
            "lifetime_max_phys_footprint instructions cycles billed_energy "
            "serviced_energy interval_max_phys_footprint runnable_time"
        ).split()
    ]


def command(*args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=15)
    return result.stdout.strip() if result.returncode == 0 else result.stderr.strip()


class MacMemory:
    def __init__(self):
        self.lib = ctypes.CDLL("/usr/lib/libSystem.B.dylib", use_errno=True)
        self.lib.proc_pid_rusage.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_void_p]
        self.lib.proc_pid_rusage.restype = ctypes.c_int
        # XPC WebKit helpers have launchd as parent. This private OS API is
        # optional; absence is reported, never replaced with all WebKit PIDs.
        self.responsible = getattr(self.lib, "responsibility_get_pid_responsible_for_pid", None)
        if self.responsible:
            self.responsible.argtypes = [ctypes.c_int]
            self.responsible.restype = ctypes.c_int

    def usage(self, pid):
        data = RusageV4()
        if self.lib.proc_pid_rusage(pid, 4, ctypes.byref(data)) != 0:
            return {"error": os.strerror(ctypes.get_errno())}
        return {key: getattr(data, key) for key in (
            "resident_size", "phys_footprint", "lifetime_max_phys_footprint",
            "proc_start_abstime", "pageins",
        )}


class BenchmarkProcess:
    """posix_spawn with macOS responsibility detached from the shell/agent.

    This is the same optional private spawn attribute used by LLDB. Require it
    for automated runs: silently inheriting responsibility loses WebKit XPCs.
    """
    def __init__(self, memory, executable, env, log):
        lib = memory.lib
        disclaim = getattr(lib, "responsibility_spawnattrs_setdisclaim", None)
        if disclaim is None or memory.responsible is None:
            raise RuntimeError("XPC attribution APIs unavailable; use --pid on a normally launched app.")
        ptr = ctypes.POINTER(ctypes.c_void_p)
        for name in ("posix_spawnattr_init", "posix_spawnattr_destroy",
                     "posix_spawn_file_actions_init", "posix_spawn_file_actions_destroy"):
            getattr(lib, name).argtypes = [ptr]
            getattr(lib, name).restype = ctypes.c_int
        disclaim.argtypes = [ptr, ctypes.c_bool]
        disclaim.restype = ctypes.c_int
        lib.posix_spawnattr_setflags.argtypes = [ptr, ctypes.c_short]
        lib.posix_spawnattr_setpgroup.argtypes = [ptr, ctypes.c_int]
        lib.posix_spawn_file_actions_adddup2.argtypes = [ptr, ctypes.c_int, ctypes.c_int]
        lib.posix_spawn.argtypes = [ctypes.POINTER(ctypes.c_int), ctypes.c_char_p,
            ptr, ptr, ctypes.POINTER(ctypes.c_char_p), ctypes.POINTER(ctypes.c_char_p)]
        lib.posix_spawn.restype = ctypes.c_int

        def check(status):
            if status:
                raise OSError(status, os.strerror(status))

        attr, actions = ctypes.c_void_p(), ctypes.c_void_p()
        check(lib.posix_spawnattr_init(ctypes.byref(attr)))
        try:
            check(lib.posix_spawn_file_actions_init(ctypes.byref(actions)))
            try:
                check(disclaim(ctypes.byref(attr), True))
                check(lib.posix_spawnattr_setflags(ctypes.byref(attr), 0x0002))  # SETPGROUP
                check(lib.posix_spawnattr_setpgroup(ctypes.byref(attr), 0))
                check(lib.posix_spawn_file_actions_adddup2(ctypes.byref(actions), log.fileno(), 1))
                check(lib.posix_spawn_file_actions_adddup2(ctypes.byref(actions), log.fileno(), 2))
                argv = (ctypes.c_char_p * 2)(os.fsencode(executable), None)
                envp = (ctypes.c_char_p * (len(env) + 1))(
                    *(os.fsencode(f"{key}={value}") for key, value in env.items()), None)
                pid = ctypes.c_int()
                check(lib.posix_spawn(ctypes.byref(pid), os.fsencode(executable),
                    ctypes.byref(actions), ctypes.byref(attr), argv, envp))
                self.pid, self.returncode = pid.value, None
            finally:
                lib.posix_spawn_file_actions_destroy(ctypes.byref(actions))
        finally:
            lib.posix_spawnattr_destroy(ctypes.byref(attr))

    def poll(self):
        if self.returncode is None:
            pid, status = os.waitpid(self.pid, os.WNOHANG)
            if pid:
                self.returncode = os.waitstatus_to_exitcode(status)
        return self.returncode

    def wait(self, timeout):
        deadline = time.monotonic() + timeout
        while self.poll() is None:
            if time.monotonic() >= deadline:
                raise subprocess.TimeoutExpired("parrot", timeout)
            time.sleep(0.02)
        return self.returncode


def process_table():
    table = {}
    for line in command("ps", "-axo", "pid=,ppid=,comm=").splitlines():
        parts = line.strip().split(None, 2)
        if len(parts) == 3:
            table[int(parts[0])] = {"ppid": int(parts[1]), "command": parts[2]}
    return table


def select_processes(table, roots, responsible):
    """Include descendants and attributed XPC helpers, once per PID."""
    selected = {pid for pid in roots if pid in table}
    if responsible:
        selected.update(pid for pid, proc in table.items()
                        if "com.apple.WebKit." in proc["command"]
                        and responsible(pid) in roots)
    while True:
        children = {pid for pid, proc in table.items() if proc["ppid"] in selected}
        if children <= selected:
            return selected
        selected |= children


def events_at(path):
    events = []
    if path.exists():
        for line in path.read_text().splitlines():
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                pass  # A concurrent writer may not have finished its last line.
    return events


def long_import_quality(events, reference_seconds):
    results = [e for e in events if e.get("kind") == "result" and e.get("scenario") == "long_import"]
    ends = [e for e in events if e.get("kind") == "end" and e.get("scenario") == "long_import"]
    if not results or not ends or not reference_seconds:
        return []
    result = results[-1]
    # Ignore the partially repeated tail; every complete reference occurrence
    # must remain. This catches a result retaining only the first whole cycle.
    required = max(1, int(ends[-1]["details"]["audio_seconds"] / reference_seconds))
    text = result["raw_text"].lower()
    counts = {word: text.count(word) for word in result["expected_words"]}
    return [{"kind": "quality_check", "scenario": "long_import_occurrences",
             "quality_ok": all(count >= required for count in counts.values()),
             "minimum_occurrences": required, "observed_occurrences": counts}]


def summarize(samples, events, reference_seconds=None):
    phases = {}
    for sample in samples:
        phases.setdefault(sample["scenario"], []).append(sample)
    summary = {}
    for phase, rows in phases.items():
        complete = [row for row in rows if row["complete"]]
        values = [row["footprint_bytes"] for row in complete]
        roles = {}
        for role in ("app", "cleanup", "webview", "extra"):
            role_values = [sum(p["phys_footprint"] for p in row["processes"]
                               if p["role"] == role and "phys_footprint" in p)
                           for row in complete]
            roles[role] = max(role_values, default=None)
        summary[phase] = {
            "samples": len(rows), "complete_samples": len(complete),
            "median_footprint_bytes": statistics.median(values) if values else None,
            "peak_footprint_bytes": max(values, default=None),
            "peak_rss_bytes": max((row["rss_bytes"] for row in complete), default=None),
            "role_peak_footprint_bytes": roles,
        }
    gaps = sorted(b["elapsed_seconds"] - a["elapsed_seconds"]
                  for a, b in zip(samples, samples[1:])
                  if "elapsed_seconds" in a and "elapsed_seconds" in b)
    historical_peaks = {}
    for row in samples:
        for process in row["processes"]:
            if "lifetime_max_phys_footprint" in process:
                identity = f'{process["pid"]}:{process["proc_start_abstime"]}'
                historical_peaks[identity] = max(historical_peaks.get(identity, 0),
                    process["lifetime_max_phys_footprint"])
    quality_checks = long_import_quality(events, reference_seconds)
    return {
        "phases": summary,
        # Max of simultaneous sums, NOT sum of each process's historical peak.
        "peak_footprint_bytes": max((s["footprint_bytes"] for s in samples
                                      if s["complete"]), default=None),
        "per_process_lifetime_peaks_bytes_do_not_sum": historical_peaks,
        "max_sample_gap_seconds": max(gaps, default=None),
        "p95_sample_gap_seconds": gaps[int(0.95 * (len(gaps) - 1))] if gaps else None,
        "webview_pids_seen": sorted({p["pid"] for s in samples for p in s["processes"]
                                     if p["role"] == "webview"}),
        "events": events,
        "quality_checks": quality_checks,
        "quality_failures": [e for e in [*events, *quality_checks] if e.get("quality_ok") is False],
        "completed": any(e.get("scenario") == "complete" and e.get("kind") == "end"
                         for e in events),
    }


def model_metadata(config):
    models = {}
    for key, value in config.items():
        if not key.endswith("_model") or not value:
            continue
        path = Path(value)
        if path.is_file():
            digest = hashlib.sha256()
            with path.open("rb") as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(chunk)
            models[key] = {"name": path.name, "bytes": path.stat().st_size,
                           "sha256": digest.hexdigest()}
        elif path.is_dir():
            models[key] = {"name": path.name, "files": {
                str(p.relative_to(path)): {"bytes": p.stat().st_size,
                    "sha256": file_digest(p)}
                for p in sorted(path.rglob("*")) if p.is_file()}}
    return models


def file_digest(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fixture_metadata():
    directory = Path(__file__).resolve().parents[1] / "src-tauri/tests/fixtures/transcription"
    fixtures = {}
    for path in sorted(directory.glob("*.wav")):
        with wave.open(str(path)) as audio:
            duration = audio.getnframes() / audio.getframerate()
        fixtures[path.name] = {"bytes": path.stat().st_size,
                               "sha256": file_digest(path), "seconds": duration}
    return fixtures


def run(args):
    if sys.platform != "darwin":
        raise SystemExit("This sampler requires macOS (proc_pid_rusage).")
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=False)
    memory = MacMemory()
    config = json.loads(Path(args.config).read_text()) if args.config else {}
    event_file = out / "events.jsonl"
    config["events_path"] = str(event_file)
    metadata = {
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "os": command("sw_vers"), "machine": platform.machine(),
        "hardware": command("sysctl", "-n", "hw.model", "machdep.cpu.brand_string"),
        "ram_bytes": int(command("sysctl", "-n", "hw.memsize")),
        "git_commit": command("git", "rev-parse", "HEAD"),
        "git_status": command("git", "status", "--short"),
        "interval_seconds": args.interval, "build_label": args.build_label,
        "xpc_attribution_available": memory.responsible is not None,
        "extra_pids": args.extra_pid, "config": config,
        "models": model_metadata(config),
        "fixtures": fixture_metadata(),
        "cache_state": "new process, OS file cache uncontrolled (model hashes read before launch)",
    }
    (out / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    (out / "config.json").write_text(json.dumps(config, indent=2) + "\n")
    logs = []
    child = None
    diagnostics = []
    try:
        if args.app:
            env = dict(os.environ, PARROT_MEMORY_BENCHMARK_CONFIG=str(out / "config.json"))
            if args.sidecar:
                env["PARROT_CLEANUP_SIDECAR"] = str(Path(args.sidecar).resolve())
            log = (out / "app.log").open("w")
            logs.append(log)
            child = BenchmarkProcess(memory, str(Path(args.app).resolve()), env, log)
            root = child.pid
        else:
            root = args.pid
        metadata["root_pid"] = root
        metadata["responsible_pid"] = memory.responsible(root) if memory.responsible else None
        if args.app and metadata["responsible_pid"] != root:
            raise RuntimeError("benchmark process did not acquire its own XPC responsibility")
        metadata["root_identity"] = memory.usage(root)
        (out / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
        roots = {root, *args.extra_pid}
        samples = []
        diagnosed = set()
        started = time.monotonic()
        next_system = 0
        with (out / "samples.jsonl").open("w") as stream, (out / "system.jsonl").open("w") as system:
            while time.monotonic() - started < args.duration:
                tick = time.monotonic()
                table = process_table()
                if root not in table or (child and child.poll() is not None):
                    break
                events = events_at(event_file)
                begins = [e for e in events if e.get("kind") == "begin"]
                phase = begins[-1]["scenario"] if begins else args.label
                processes = []
                for pid in sorted(select_processes(table, roots, memory.responsible)):
                    proc = table[pid]
                    name = proc["command"]
                    role = ("app" if pid == root else "cleanup" if "cleanup-sidecar" in name
                            else "webview" if "com.apple.WebKit." in name else "extra")
                    processes.append({"pid": pid, "ppid": proc["ppid"], "name": Path(name).name,
                                      "role": role, **memory.usage(pid)})
                complete = bool(processes) and all("error" not in p for p in processes)
                row = {"time_ms": time.time_ns() // 1_000_000,
                       "elapsed_seconds": time.monotonic() - started, "scenario": phase,
                       "complete": complete, "processes": processes,
                       "footprint_bytes": sum(p.get("phys_footprint", 0) for p in processes) if complete else None,
                       "rss_bytes": sum(p.get("resident_size", 0) for p in processes) if complete else None}
                stream.write(json.dumps(row) + "\n")
                stream.flush()
                samples.append(row)
                if tick >= next_system:
                    system.write(json.dumps({"time_ms": row["time_ms"],
                        "vm_stat": command("vm_stat"),
                        "swap": command("sysctl", "vm.swapusage"),
                        "pressure_level": command("sysctl", "kern.memorystatus_vm_pressure_level")}) + "\n")
                    system.flush()
                    next_system = tick + 1
                if phase.endswith("idle") and phase not in diagnosed and complete:
                    diagnosed.add(phase)
                    log = (out / f"{phase}-footprint.txt").open("w")
                    logs.append(log)
                    diagnostics.append(subprocess.Popen(
                        ["/usr/bin/footprint", "-f", "bytes", *map(str, [p["pid"] for p in processes])],
                        stdout=log, stderr=subprocess.STDOUT))
                time.sleep(max(0, args.interval - (time.monotonic() - tick)))
    finally:
        if child and child.poll() is None:
            # Terminate only this launched process group, including sidecars.
            # Never terminate --pid / --extra-pid processes supplied by a user.
            try:
                os.killpg(child.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                child.wait()
        for diagnostic in diagnostics:
            try:
                diagnostic.wait(timeout=10)
            except subprocess.TimeoutExpired:
                diagnostic.kill()
                diagnostic.wait()
        for log in logs:
            log.close()
    summary = summarize(samples, events_at(event_file),
                        metadata["fixtures"]["long-import.wav"]["seconds"])
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(f"Results: {out}")
    for phase, values in summary["phases"].items():
        peak = values["peak_footprint_bytes"]
        print(f"{phase}: peak {peak / 2**20:.1f} MiB" if peak is not None else f"{phase}: unavailable")
    if args.app and (not summary["completed"] or summary["quality_failures"]
                     or child.returncode != 0 or not summary["webview_pids_seen"]):
        raise SystemExit("Benchmark incomplete or quality checks failed; inspect events.jsonl and app.log.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--pid", type=int, help="attach without changing the running app")
    target.add_argument("--app", help="launch a Parrot binary built with memory-bench")
    target.add_argument("--summarize", metavar="RUN_DIR", help="re-evaluate saved samples/events without launching anything")
    parser.add_argument("--config", help="workload JSON for --app")
    parser.add_argument("--sidecar", help="cleanup-sidecar executable for --app")
    parser.add_argument("--out", help="new directory for raw logs and summary")
    parser.add_argument("--duration", type=float, default=1800, help="maximum seconds to observe")
    parser.add_argument("--interval", type=float, default=0.1)
    parser.add_argument("--extra-pid", type=int, action="append", default=[], help="explicit shared Ollama daemon/runner root")
    parser.add_argument("--label", default="startup", help="scenario for manual attachment")
    parser.add_argument("--build-label", default="unknown")
    args = parser.parse_args()
    if args.summarize:
        directory = Path(args.summarize)
        metadata = json.loads((directory / "metadata.json").read_text())
        fixtures = metadata.get("fixtures", fixture_metadata())
        samples = [json.loads(line) for line in (directory / "samples.jsonl").read_text().splitlines()]
        summary = summarize(samples, events_at(directory / "events.jsonl"),
                            fixtures["long-import.wav"]["seconds"])
        (directory / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
        print(f'Re-evaluated {directory}: {len(summary["quality_failures"])} quality failures')
        return
    if not args.out:
        parser.error("--pid and --app require --out")
    if args.interval <= 0 or args.duration <= 0:
        parser.error("interval and duration must be positive")
    if args.app and not args.config:
        parser.error("--app requires --config")
    run(args)


if __name__ == "__main__":
    main()
