# ISSUE-1054 — Legacy Ollama residency

Three native runs pass on the 24 GiB M4 Pro development Mac. Legacy cleanup now
loads on demand, uses the saved idle timeout instead of a fixed 30 minutes,
retains a used model when Keep warm is selected, and releases its model after
Off, low-memory mode or a built-in backend switch. An unrelated model remains
resident and the Ollama service remains available through all nine transitions.
This measures the optional Ollama backend separately from built-in cleanup.

## Implementation and scope

Local commits `5ef4a90`, `69a4fc7` and `2f0d34c` implement the
[Ollama memory policy](../ollama-memory-policy.md). The same Settings timeout
selector now serves both backends. Missing/invalid values use 60 seconds; a
stored 0 means Keep warm after first use. Global Off and low-memory mode prevent
new legacy requests and retire models used by this session. Profile and short
transcript bypasses still apply. Configuration/startup and `/api/show` validation
load no model weights. The actual service port and selected legacy model are
used consistently. Switching to built-in cleanup no longer stops Ollama.

The residency owner serializes HTTP transactions and model releases, including
response consumption by a detached task if a caller is cancelled. Queued work
rechecks its model and enablement. Active work finishes before release. Failed
unloads retain their targets for delayed retry. No process-wide stop, global
Ollama setting or unrelated model unload is used for memory policy changes.

The request values follow [Ollama's documented keep-alive and model unload API](https://docs.ollama.com/faq#how-do-i-keep-a-model-loaded-in-memory-or-make-it-unload-immediately).
Ollama timers and runners are shared by all clients using the **same model**;
independent residency for those clients is not promised. Ollama can also evict
models under memory pressure. Graceful exit attempts release within five
seconds, but abrupt exit or long in-flight work can leave a Keep warm pin.
Existing explicit service-stop/owned-daemon exit behavior is unchanged; an
adopted user daemon is never killed.

## Native validation

Each run starts a separately owned daemon on port 50828 with a temporary model
store. Existing Llama blobs are referenced read-only, and the unrelated Qwen
GGUF is imported only into that temporary store. No downloads, GUI, app database,
microphone, private dictations or installed model selections are involved.
The native test invokes production cleanup and residency code, with an in-memory
settings database. It uses this fixed synthetic source:

> Priya did not approve the payment of 25 rupees today.

Six cleanup calls per run cover cold use, warm reuse, reload after idle,
Keep warm, reload after Off and reload after low-memory mode. All 18 returned
texts match the source after case folding and removing a terminal period.
This confirms retention on this test, not general cleanup accuracy or a
multilingual release qualification. Existing fidelity tests exercise destructive
outputs in the shared backend guard, including Hindi and mixed-script cases.

Two runs use a saved two-second timeout to repeat lifecycle checks quickly.
The third waits for the full default 60-second timeout. Keep warm is checked
beyond the prior two-second timeout in the first two runs, and briefly in the
default run; native status records show the negative keep-alive expiry. Each
run loads a distinct unrelated model, turns cleanup Off, restores it, enables
low-memory mode, restores it and switches to built-in cleanup. Every release
leaves that unrelated runner loaded and `/api/tags` responsive. The unrelated
runner remains after the cleanup owner's graceful shutdown.

Ollama acknowledges unloading before the runner disappears from `/api/ps`.
The first exploratory run asserted immediate removal and failed that assertion.
Its logs are retained as diagnostic evidence, excluded from the three passing
runs below. The check now polls actual runner removal with a ten-second bound.
Production releases already used the correct unload API; no workaround was
needed in the cleanup behavior. Observed disable/switch removal is 103–105 ms
with the test's 100 ms polling interval; this is not a precise scheduler latency.

## Cold/warm latency

Wall time surrounds production cleanup, including the HTTP request, model
loading, inference, response consumption and finalization. These are synthetic
short-input cleanup timings, not total dictation/ASR/UI latency.

| Run | Saved idle | Cold cleanup | Warm cleanup | Reload after idle | Observed idle removal |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 s | 990.7 ms | 216.6 ms | 1,208.6 ms | 2.052 s |
| 2 | 2 s | 975.3 ms | 224.7 ms | 927.3 ms | 2.058 s |
| 3 | 60 s | 956.8 ms | 209.2 ms | 990.6 ms | 60.045 s |

Cold means the model was absent from the owned daemon before the request.
Filesystem and Metal compilation caches were already warm. The exploratory
run's first load took 9,055.6 ms before the later polling assertion failed;
therefore the roughly one-second passing results must not be presented as a
first-ever startup guarantee. Keep-warm requests take 207.8–226.4 ms. Reloads
with the unrelated runner still loaded take 931.2–1,181.0 ms.

## Process memory

The sampler uses macOS `proc_pid_rusage` (RUSAGE_INFO_V4) every nominal 100 ms.
It sums the concurrently observed physical footprints of the **owned Ollama
daemon and its runner descendants**; it records RSS separately. It does not
include the Rust test worker, installed Parrot, its sidecar, speech, WebKit or
system-wide memory. It never sums per-process historical peaks. All samples in
the three passing runs contain complete process ledgers; the largest sample
gap is 162 ms. Sampled peaks can still miss brief allocations.

| Run | Before demand, median footprint | Resident idle, median footprint | After idle release, median footprint | Resident idle, peak RSS | After release, peak RSS |
| --- | --- | --- | --- | --- | --- |
| 1 | 31.4 MiB | 757.1 MiB | 85.7 MiB | 2,672.2 MiB | 145.9 MiB |
| 2 | 36.0 MiB | 722.5 MiB | 91.3 MiB | 2,678.3 MiB | 152.3 MiB |
| 3 | 32.8 MiB | 674.5 MiB | 87.0 MiB | 2,673.5 MiB | 147.8 MiB |

The process footprint drops by 587.5–671.4 MiB between the resident and released
medians. RSS is a different ledger and must not be treated as an equal physical
RAM saving. The daemon retains some allocation after unload; release does not
restore its startup footprint. Resident-phase length differs (2 versus 60 s),
so the median rows are lifecycle observations rather than an A/B speed or
allocation comparison. Keep-warm phase median footprints are 654.8–658.6 MiB.

After Off/low-memory/built-in switches, the daemon plus the deliberately retained
unrelated Qwen runner uses 250.0–286.2 MiB median footprint. This remaining memory
is expected and is not counted as a Parrot cleanup release failure. No whole-app
peak reduction, low-RAM support, energy improvement or superiority over built-in
cleanup is established here. Actual 8/16 GiB and older-chip validation remains
in ISSUE-1072; native-speaker release review remains in ISSUE-1077.

## Provenance and reproduction

- Source: `2f0d34c57969f218511e606dfbc18b831da7bb27`; default Rust test binary SHA-256 `6b8485d9a31fa763fe54fef68e02130e1271a0cdeeb6bd6ceb5157cc4c61ab06`.
- Hardware: Mac16,7, Apple M4 Pro, 25,769,803,776 bytes RAM; macOS 26.6.2 arm64.
- Ollama 0.22.1 binary SHA-256 `eea8a8a1841f95a39ab6001390ada9b5485db92d0afc81dca2087ecb3c4b8ca3`.
- Cleanup: Llama 3.2 3.2B Q4_K_M, manifest SHA-256 `a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`; weight layer 2,019,377,376 bytes, SHA-256 `dde5aa3fc5ffc17176b5e8bdc82f587b24b2678c6c66101bf7da77af9f7ccdff`.
- Unrelated runner: temporary `parrot-unrelated:latest`, existing Qwen2.5 0.5B Q4_K_M GGUF SHA-256 `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db`.
- Controlled daemon environment: context 4096, one parallel request per model, maximum three loaded models, cloud disabled. The app does not change a user daemon's environment or context policy. Results depend on these benchmark settings.
- All original Llama manifest/config/layer hashes were verified before and after. Temporary model registrations and copied Qwen weights were removed after the runs. The user-managed daemon PID 1354 remained available and unloaded; the installed Parrot sidecar PID 70513 remained running. All owned benchmark daemons/runners were terminated and checked for exit.

Build the ordinary library tests without starting the GUI, take the executable
path printed by Cargo, then run the separate owned-daemon harness:

```sh
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked \
  -p parrot --lib --no-run
python3 apps/desktop/scripts/ollama-memory-benchmark.py \
  --ollama /absolute/path/to/ollama \
  --test-binary /absolute/path/to/target/debug/deps/parrot_lib-HASH \
  --existing-models /absolute/path/to/existing/ollama/models \
  --unrelated-gguf /absolute/path/to/qwen2.5-0.5b-instruct-q4_k_m.gguf \
  --output /tmp/parrot-ollama-new-run
```

The existing store must contain `llama3.2:latest`; both weight files remain local.
Output must be a new directory. The harness owns its loopback port, temporary
store and server processes, verifies original blobs, samples only its process
tree and records all native status events. It never contacts port 11434.

Validation: ordinary Rust **81 pass / 14 ignored**, quality-feature Rust
**84 pass / 14 ignored**, existing Python tooling **31 pass**, three opt-in
native tests **3 pass**, frontend TypeScript/Vite build and ordinary/quality
release builds pass. The existing release dead-code and Vite chunk-size warnings
remain. No app was installed, no model selection changed and no commit was pushed.

Raw events, samples, server/worker/create logs, diagnostic failed-poll logs,
test/build logs, implementation snapshots, harness and sampler are retained in
[the hashed evidence archive](2026-10-09-ollama-memory/native-validation.tar.gz).
The [summary](2026-10-09-ollama-memory/summary.json) contains full per-phase
ledgers/timings/provenance; [checksums](2026-10-09-ollama-memory/SHA256SUMS) verify
the archive and summary. Model weights, binaries and private transcripts are
not included.
