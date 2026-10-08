# Low-memory mode

Enable **Low-memory mode** in Settings → Speech model, then save. The preference
is stored in the local SQLite database and applies after restart.

The mode uses these runtime policies without overwriting normal preferences:

| Behavior | Mode off | Mode on |
| --- | --- | --- |
| Live previews | Enabled | Disabled |
| Speech prewarm | When recording starts | Disabled; loads when transcription needs it |
| Speech idle timeout | Saved preference; default 60 s | 30 s |
| Built-in cleanup idle timeout | Saved preference; default 60 s | 30 s |
| Speech and built-in cleanup | Saved sequential preference; default simultaneous residency | Sequential residency |
| Legacy Ollama cleanup | Existing backend | Skipped; raw transcript remains available |
| Selected speech model, cleanup model, language | Saved selections | Same selections |

Sequential residency releases speech before built-in cleanup loads and releases
cleanup when its job finishes. The next dictation may reload both models.
Cleanup-off, short-utterance, failed-cleanup and legacy-Ollama paths retain raw
text; a speech model used without cleanup releases after idle. Audio capture,
streaming imports, saved attachments and retry ownership use the existing
[bounded audio policy](audio-memory-policy.md) in both modes.

Enabling the mode does not download or switch models. **Compact multilingual
(Whisper small)** is an explicit download/switch option (~181 MiB, Q5_1), with
multilingual coverage. **Basic** is the smallest built-in cleanup option.
Smaller models can change transcription and cleanup quality. Keep Whisper turbo
or a larger cleanup model when its quality matters more than memory. The
English-only `small.en` tier remains explicitly labeled and selectable.

Model provenance: [whisper.cpp model repository](https://huggingface.co/ggerganov/whisper.cpp)
and [upstream model documentation](https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md).
Model names containing `.en` are English only. Model coverage does not establish
accuracy in every language; the broader corpus remains ISSUE-1050.

Mode changes update timeouts and scheduling without changing model targets or
invalidating active native loads and inference. Existing leases keep active jobs
alive. In-flight previews finish safely but their output is suppressed while the
mode is enabled. After a disabled preview loop exits, previews resume on the
next recording. Turning the mode off restores normal preferences.

An external Ollama app can still consume memory. This mode skips new Ollama
cleanup requests and does not kill another app or change the saved backend.
Select a built-in cleanup tier explicitly to enable cleanup under this mode.
All dictation processing remains local; model downloads use the existing setup
flow only when requested by the user.

Measurements and quality/latency limits are recorded in [the ISSUE-1058 benchmark
report](benchmarks/2026-10-08-low-memory-mode.md). Actual 8/16 GiB Macs, older chips, physical microphone/Bluetooth capture,
and energy use require separate device validation before claiming a supported
RAM tier. The 24 GiB development Mac does not establish that support.
