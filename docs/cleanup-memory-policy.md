# Built-in cleanup memory policy

Built-in cleanup loads on the first eligible request. Startup, setup completion,
and choosing a model do not start a cleanup sidecar. Cleanup Off, a profile that
turns cleanup off, empty transcripts, and the current short-utterance rule skip
loading. Speech loading and release follow the [speech memory policy](speech-memory-policy.md).

Settings → Cleanup → **Release cleanup memory after** offers 30 seconds, 1 minute
(the default), 5 minutes, or **Keep warm after first use**. Save Settings to apply
the choice. The `cleanup_idle_seconds` setting also accepts whole seconds from
0 through 86400; 0 disables idle release. Missing or invalid stored values use
the 60-second default. Turning global cleanup Off releases the cached model
immediately; an active job finishes with its own handle.

Concurrent requests share one load. Warm requests reuse the same sidecar, which
serializes inference. The idle clock starts after job completion. A one-second
monitor releases the final cached handle, kills the sidecar, and waits for its
exit. Active and queued jobs retain ownership; even a blocking job whose async
caller was cancelled prevents idle release. Selecting another model invalidates
old loads. Existing jobs finish on their selected model, while obsolete load
results are discarded and reaped. Old and new jobs can briefly own two sidecars
when switching during work.

Settings shows unloaded, loading, ready, cleaning, and failed states. A model
that has downloaded is available on disk; it need not be resident. Built-in load
failure preserves the original transcript and does not silently try Ollama.
A later eligible request retries loading. Ollama remains an explicit legacy
backend; its [residency policy](ollama-memory-policy.md) uses the same saved
timeout, demand loading and targeted model release.

The first cleanup and the first cleanup after idle include model loading in
their latency. Background cleanup still returns raw text first. Keeping a model
warm saves that reload time but retains the sidecar's memory. Model files stay
on disk after release. The optional sequential speech policy can release cleanup
sooner than the idle timeout.

## Verification

Lifecycle tests exercise shared loads, cancellation, idle ownership, stale model
loads, disabled state, failure and retry. A real-sidecar integration test checks
French content preservation, process reuse, exit/reaping, and a new PID on reload:

```sh
PARROT_CLEANUP_SIDECAR="$PWD/apps/desktop/src-tauri/target/release/cleanup-sidecar" \
PARROT_TEST_CLEANUP_MODEL="/absolute/path/to/cleanup.gguf" \
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --lib \
  cleanup_engine::tests::real_sidecar_demand_idle_release_and_reload -- --ignored --nocapture
```

The [memory benchmark](memory-benchmarks.md) supports
`"cleanup_lifecycle_checks": true`. It checks enabled and disabled startup,
disabled dictation, a 65-second idle period under the default policy, demand
reload, a deliberately invalid model path, and successful recovery. It records
live state alongside process-tree memory. The default benchmark now follows
this demand-loading policy; the original ISSUE-1057 measurements used eager
cleanup loading. State that difference when comparing results.

The [measured release report](benchmarks/2026-10-07-cleanup-memory.md) records
repeatable idle savings and cold/warm latency.

This policy releases cleanup memory. The large Parakeet heap retained after
long imports remains a separate problem in ISSUE-1053 and related speech/audio
issues. An idle cleanup release does not lower the active speech-model peak.
