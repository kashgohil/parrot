# Speech model memory policy

Whisper and Parakeet now load when recording begins or a transcription request
needs them. Startup, setup completion, model selection, and availability checks
do not load a model. The first recording starts loading while audio is captured;
a short recording or an import can still wait for that load. Concurrent callers
share the same load. Load failures surface as transcription errors immediately,
with the captured audio available for retry, rather than polling an empty slot
for 30 or 60 seconds. A request stops waiting after 180 seconds; a native load
that cannot be cancelled can still finish in the background.

Settings → Speech → **Release speech memory after** offers 30 seconds,
1 minute (default), 5 minutes, or **Keep warm after first use**. Save Settings to
apply it. The stored `stt_idle_seconds` setting accepts 0..86400 whole seconds;
0 disables idle release. Missing or invalid stored values use 60 seconds.
Settings reports unloaded, loading, ready, transcribing, or failed state.
Downloaded and selected models remain on disk after release.

An inference job owns the model until native work finishes. The idle clock starts
after work completes, and a one-second monitor drops the cached handle only when
it is unused. This protection also applies when an async caller is cancelled but
its native work continues. Preview, final, and import jobs share one speech
scheduler. Previews never queue behind another job. Final requests announce their
demand before scheduling and take priority over new previews. Recording generation
checks reject obsolete previews before loading, before inference, and before
publishing output. An already-running native preview cannot be interrupted safely;
final transcription waits for that single operation, rather than a preview queue.

Preview snapshots copy at most the last 20 seconds of mono capture at the device
sample rate. That vector moves into inference without another tail copy. Growth
checks use the total capture length, and `stop()` still returns all recorded
audio for final transcription. At 48 kHz the preview copy is bounded to 3.84 MB;
the full recording, resampled PCM, and native model allocations are separate.
See the [preview measurements](benchmarks/2026-10-08-preview-audio.md) for long-buffer
allocation, capture-lock contention, real-engine content checks, and limitations.

Selecting a different model invalidates stale load results. An active job finishes
with its previous model; no previous-model handle escapes into cleanup, history,
or paste. Old and new models can briefly coexist during a model change while
active work finishes. The idle setting controls owning handles. Native libraries
or allocators can retain memory independently, so release must also be verified
with process-footprint measurements.

## Sequential residency

**Release speech memory before cleanup** is an optional setting, stored as
`stt_release_before_cleanup=true`. It applies to built-in cleanup and defaults
to false. It is a separate control ahead of the integrated low-memory mode in
ISSUE-1058. Ollama residency remains tracked in ISSUE-1054.

With this policy enabled, speech and built-in cleanup stages share an exclusive
scheduler. Cleanup waits for active speech to finish, then drops the unused speech
model before loading cleanup. Cleanup releases its sidecar after completion.
The next speech request also waits for any active cleanup and releases its cached
sidecar before loading speech. Thus no active job is killed to switch stages.
An async cleanup caller that is cancelled still protects its blocking inference;
new speech waits until that inference releases its handle.

Sequential residency trades memory between stages for more model reloads. Repeated
Parakeet dictations can become slower because each one loads speech again.
Keeping both models warm avoids reload cost. Idle release lowers retained memory;
it does not bound active inference allocations.

## Parakeet execution provider

The INT8 Parakeet model uses ONNX Runtime's CPU provider on macOS. Native
allocation captures attributed the previous CoreML path's multi-GiB long-import
allocations to Espresso plans rebuilt for changing audio shapes. CPU execution
avoids those CoreML plans while retaining the same model files, decoder, automatic
language detection, and approximately 30-second energy-based chunks. Other
platforms retain the library's automatic provider selection.

CoreML remains compiled in for controlled benchmark comparisons, using the
benchmark-only `parakeet_accelerator` override. Normal app builds use the macOS
CPU policy without an override. Whisper still uses its existing Metal backend.
The setup copy describes local processing without promising a particular chip.
See the [native memory investigation](benchmarks/2026-10-08-parakeet-native-memory.md)
for matched memory/content/latency results and hardware limitations.

## Verification

The real-model integration test checks shared loading, protected ownership,
English/French content, dropped handles, demand reload, and explicit load failure:

```sh
PARROT_TEST_STT_MODEL="/absolute/path/to/Whisper.bin-or-Parakeet-directory" \
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --lib \
  speech_engine::tests::real_speech_demand_release_reload_and_failed_load \
  -- --ignored --nocapture
```

The [memory benchmark](memory-benchmarks.md) accepts
`"speech_lifecycle_checks": true` with at least 65 seconds of combined
`idle_seconds + post_idle_seconds`. It verifies speech is unloaded at startup,
checks idle release after the import, measures a separate released-idle phase,
and transcribes again to exercise cold reload. Set
`"stt_release_before_cleanup": true` for a matching sequential-residency run;
it also checks that completed cleanup leaves both models unloaded. Use the
same 120-second import and source-count quality gates as the baseline.

Speech demand loading changes the benchmark: ready idle has no speech model,
model switching selects paths without loading them, and first transcription
includes speech load latency. Compare these scenarios explicitly with the
eager-loaded ISSUE-1057 baseline. Preserve source-language/content gates and
report cold reload costs before making lower-RAM device support claims.

The [original lifecycle report](benchmarks/2026-10-08-speech-memory.md) compares two
release-app runs per residency policy using the previous automatic/CoreML provider.
Its timings and footprints predate the CPU provider change in
[ISSUE-1070](https://rezee.app/kash/plan/1070).
