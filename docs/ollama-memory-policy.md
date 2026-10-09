# Legacy Ollama cleanup memory policy

The optional Ollama backend uses the same **Release cleanup memory after**
preference as built-in cleanup: 60 seconds by default, or a saved timeout from
1 through 86400 seconds. **Keep warm after first use** (stored as 0) sends
`keep_alive: -1`. Invalid or missing settings use 60 seconds. Each native
`/api/chat` request includes this policy; neither cleanup nor startup requests
30 minutes of residency. These values follow the [Ollama keep-alive API](https://docs.ollama.com/faq#how-do-i-keep-a-model-loaded-in-memory-or-make-it-unload-immediately).

Startup can start or adopt the local service when legacy cleanup is enabled,
but never loads model weights. Off and low-memory mode skip automatic startup
and new cleanup requests. Re-enabling cleanup starts/adopts the service on
demand if needed. The explicit service-start command starts a daemon without
loading a model. Model validation uses `/api/show` rather than generation.
Short transcripts and profiles that disable cleanup retain their normal bypass.

Cleanup uses the port selected by service setup and the `llm_model` preference,
then the legacy setup model, then `llama3.2`. Built-in GGUF filenames in legacy
setup do not become Ollama model names. Configuration alone performs no loading.

Parrot records the model and port of each cleanup transaction. Ollama's own
timeout releases finite residency; a one-second Parrot monitor also releases
due or retired targets through `/api/generate` with `keep_alive: 0`. Switching
models/backend, turning cleanup Off, or enabling low-memory mode retires used
targets. Reducing a keep-warm policy to a finite timeout uses time since the last
completed request. Release failures retain the target and retry after five
seconds. Unload requests have a five-second timeout.

Cleanup requests and releases share a transaction gate. Queued work rechecks
enablement/model selection before sending. An owned task consumes the response
even if its caller is cancelled. Settings changes let an active request finish,
then release its model if disabled or switched. The HTTP request timeout is
180 seconds. Graceful app exit attempts release within a five-second budget;
abrupt exit or a long in-flight request can leave a keep-warm model resident.
Finite request timeouts still apply inside Ollama after Parrot exits.

Memory events and switching to built-in cleanup do not stop Ollama, modify its
global environment, remove model files, or unload models Parrot never requested.
Explicit **Stop local services** and normal exit still reap a daemon Parrot
itself spawned; an adopted user daemon is never killed. An external daemon can
continue to consume memory independently of Parrot.

Ollama residency belongs to the model runner, not to a client session. Another
app using the **same model** shares its timer and runner; Parrot cannot promise
independent residency for that app. Ollama can also evict other models under
memory pressure. This policy protects unrelated models from Parrot unload/stop
requests, but does not override Ollama's scheduler. Keep-warm means available
until release or eviction, not guaranteed permanent residency.

Tests cover saved/default/invalid settings, model resolution, demand loading,
targeted ports, idle/keep-warm behavior, disable and model switches, cancellation,
queued disabled work, failed-release retries and the production fidelity guard.
The opt-in real-daemon test requires a separately owned port and two distinct
models. It exercises production cleanup, native idle release, reload, keep warm,
Off, low-memory mode and a built-in switch while retaining an unrelated model.
Cold/warm latency and process memory must be reported separately from built-in
cleanup and from the whole app's speech/GUI memory.
