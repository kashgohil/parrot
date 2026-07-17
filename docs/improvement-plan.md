# Parrot Improvement Plan

_Last updated: 2026-07-17_

Goal: make local-mode dictation feel instant (< 500ms perceived time-to-paste), raise
transcription accuracy to state-of-the-art local levels, and stake out the one market
position no competitor owns — **100% local, including AI cleanup** — while closing
table-stakes feature gaps against Wispr Flow, Superwhisper, VoiceInk, and Aqua Voice.

Current pipeline (local mode): hotkey release → whole-clip whisper.cpp (`base.en`, Metal)
→ SQLite insert → blocking Ollama (llama3.2-3B) cleanup → clipboard + Cmd+V paste.
Cleanup dominates latency (1–3s typical); `base.en` caps accuracy; Ollama install +
2GB model is the onboarding cliff.

---

## Phase 1 — Quick latency wins (days, no architecture change)

The perceived-latency halving. Ship as a fast-follow release.

### 1.1 Paste-then-refine
The single biggest perceived-latency fix: stop blocking the paste on LLM cleanup.

- [x] Paste the raw transcript immediately after transcription completes
      (`transcribe_last` in `apps/desktop/src-tauri/src/lib.rs`).
- [x] Run cleanup in a background task; update the history entry when done
      (`update_dictation_cleaned` already exists).
- [x] HUD affordance: when the cleaned version differs from raw, surface it in the
      orb/HUD ("press ⌘⇧C to apply cleanup" or auto-replace if the focused field is
      unchanged — start with the manual affordance; auto-replace is riskier).
- [x] Skip cleanup entirely for short utterances (< ~15 words) — raw Whisper output
      already has punctuation and casing.
- [x] Setting: `cleanup_mode = off | background (default) | blocking` for users who
      always want the polished text and accept the wait.

**Acceptance:** time from hotkey release to text-in-field ≈ transcription time only.
Cleanup no longer contributes to perceived latency.

### 1.2 Fix the Ollama keep-alive regression
`warm_up_ollama` (`local_setup.rs`) sets `keep_alive: "30m"`, but cleanup requests hit
the OpenAI-compat endpoint (`cleanup.rs`) with no `keep_alive`, so Ollama reverts to
its **5-minute default** after the first dictation. Any dictation after > 5 idle
minutes pays a 3–10s cold load.

- [x] Switch `cleanup_with_ollama` from `/v1/chat/completions` to Ollama's native
      `/api/chat` and pass `keep_alive: "30m"` on every request.
- [ ] Verify: dictate once, wait 10 minutes, dictate again — no cold-load stall
      (check `ollama ps` shows the model resident).

### 1.3 Small mechanical wins

- [x] Drop the f32 → i16 WAV → f32 round trip for local mode: pass `Vec<f32>` samples
      straight from `audio.rs` to the whisper provider; only encode WAV when saving
      audio or in cloud mode.
- [x] Replace the fixed 80ms pre-paste sleep (`copy_and_paste_safely`) with polling
      the pasteboard until the write lands (cap ~100ms).
- [x] whisper.cpp params for dictation-shaped input: `set_single_segment(true)`,
      suppress non-speech tokens, and set `audio_ctx` proportional to clip length so
      a 3s utterance doesn't pay the full 30s-window encoder cost.
- [ ] Enable the `coreml` feature in `whisper-rs` alongside `metal`
      (`src-tauri/Cargo.toml`) and download the `.mlmodelc` encoder companion during
      setup — ~2–3× encoder speedup on the Neural Engine.

### 1.4 Clipboard restore
Users notice clipboard clobbering fast; most local competitors restore it.

- [x] Save pasteboard contents before writing the transcript; restore ~1s after the
      synthetic Cmd+V lands.

---

## Phase 2 — Engine upgrade: Parakeet + better Whisper tiers (1–2 weeks)

The market default for local dictation is now **NVIDIA Parakeet TDT 0.6B on the
Neural Engine** (VoiceInk, Superwhisper, MacWhisper, Handy all adopted it):
~6.3% WER — better than Whisper *large*-v3 — at ~80–150ms mic-to-text, 66MB working
memory.

- [x] Add a `TranscriptionEngine` abstraction in `transcription.rs` (currently
      hardwired to `LocalWhisperProvider`).
      → Implemented as `LocalEngine { Whisper, Parakeet }` enum.
- [x] Integrate Parakeet TDT 0.6B via ONNX Runtime (`transcribe-rs` / `ort`).
      Reference implementation on our exact Rust/Tauri stack: **Handy**
      (github.com/cjpais/Handy, MIT). Ships v3 int8 (English + 25 EU languages)
      from `blob.handy.computer/parakeet-v3-int8.tar.gz`.
- [x] Add Parakeet v3 (25 European languages) as the multilingual-fast option.
      → v3 is the default Fast tier (covers EN + multi); separate Whisper turbo
      tier for full 99-language coverage.
- [x] Rework model tiers in `local-setup-wizard.tsx`:
      - **Fast (default):** Parakeet TDT 0.6B — "more accurate than models 10× its size"
      - **Multilingual:** whisper `large-v3-turbo` quantized (99 languages, Metal+CoreML)
      - Keep `small.en` as low-RAM fallback for old machines; retire `tiny.en`/`base.en`
        as defaults.
- [x] Remove the hardcoded `set_language(Some("en"))`; add a language setting
      (auto-detect for Whisper, language picker for Parakeet v3).
- [x] Beam search (beam size 2–5) for the Whisper path — the faster engine buys the
      accuracy budget back. (beam size 3)
- [x] Migration: existing users keep working with their downloaded Whisper model;
      settings page offers the Parakeet upgrade with a one-click download.

**Acceptance:** English dictation time-to-paste < 300ms on M1+; WER at or below
whisper `large-v3` on internal test clips; multilingual path works end-to-end.

---

## Phase 3 — Kill the Ollama dependency (1–2 weeks)

Owns the "100% local including AI cleanup" position and deletes the worst onboarding
step (install Ollama → admin password → 2GB download → daemon lifecycle management).

- [x] Embed llama.cpp in-process via `llama-cpp-2` (Metal on macOS) — same
      playbook as whisper-rs. No daemon, no port, no zombie processes.
- [x] Default cleanup model: Qwen2.5-0.5B-Instruct Q4_K_M GGUF (~490MB).
      Reuses the guardrail prompt from `cleanup.rs`. (Corpus benchmark still TODO.)
- [ ] Optional "macOS 26+" path: Apple Foundation Models for cleanup — zero download,
      ships with the OS. Feature-gate at runtime.
- [x] Simplify `local_setup.rs`: new installs download cleanup GGUF only; no Ollama
      install/admin password. Compat path: `cleanup_backend = builtin | ollama`
      (existing llama3.2 installs keep Ollama).
- [x] Setup wizard becomes: permissions → STT model + cleanup GGUF download → done.
      (No separate Ollama step for new users.)

**Acceptance:** fresh install to first successful dictation with cleanup in < 5
minutes with no admin password and no third-party installs; background cleanup of a
50-word transcript < 1.5s warm.

---

## Phase 4 — Table-stakes features (parallelizable, ~1 week each)

Ordered by value-for-effort:

- [x] **Per-app modes ("Profiles").** Read the frontmost app's bundle ID at paste
      time; key `writing_style` / `context_prompt` / cleanup on-off off a per-app
      profile table (the profile plumbing in `db.rs` already exists — make it keyed).
      Bundle-ID based only — no screenshots (the Wispr scandal made screen capture
      radioactive; if we ever add screen context it must be explicit opt-in and
      provably local).
- [x] **Typing fallback.** Where Cmd+V fails (terminals, secure fields, apps that
      remap paste), type the text directly via `CGEventKeyboardSetUnicodeString` —
      no clipboard involved. Auto-fallback when paste verification fails.
- [x] **Self-learning dictionary.** Mine local history (raw vs. cleaned pairs we
      already store) for words the user repeatedly corrects; suggest dictionary
      entries in the profile UI. Plus a deterministic post-STT pass: fuzzy-match
      transcript words against the dictionary and fix high-confidence near-misses
      before cleanup (fixes the proper-noun weakness all Whisper apps share).
- [x] **File transcription.** Drag-and-drop an audio file onto the app → transcript.
      The pipeline already exists; this is a file picker + progress UI. (WAV; history + clipboard.)
- [ ] **Voice command mode.** With text selected, hold a secondary hotkey and speak
      an instruction ("make this a bullet list"); read the selection via the
      accessibility API, route through the local LLM with an edit prompt, replace
      selection. Only cloud apps (Wispr/Aqua/Willow) do this today — doing it fully
      locally is itself a differentiator.
- [x] **Bluetooth mic handling.** Keep a warm input stream across dictations and
      pre-open at local-mode startup so BT codec negotiation is not paid on the
      first hotkey press. (Voice command mode still deferred.)

---

## Phase 5 — Spotlight feature: local streaming display (2–4 weeks, exploratory)

Words appearing **as you speak** is owned only by Aqua Voice (cloud) and Apple's
built-in dictation (no custom vocab). No polished local app does it. This is the
demo-able, screenshot-able headline feature.

- [ ] Prototype two engines and pick one:
      - **Moonshine** streaming variants (27–400M params, ~107ms latency, compute
        proportional to audio length — built for exactly this).
      - **Kyutai STT** (stt-1b, native streaming, built-in semantic VAD/end-of-speech).
- [ ] Interim milestone that works with *any* batch engine: VAD-chunked incremental
      transcription during recording (transcribe segments while the user is still
      speaking; only the final chunk remains on release). Ship this even if true
      streaming slips.
- [ ] UX: live text in the HUD orb first (low risk); direct-to-field streaming later
      (requires insert/correct via accessibility APIs — much harder, defer).

---

## Explicitly deferred

- **Windows/Linux port** — Handy proves the stack can, but focus beats breadth now.
- **iOS companion / meeting transcription / diarization** — different product surface.
- **Screen-content context awareness** — only after per-app modes ship, opt-in,
  provably local.
- **Cloud mode investment** — pricing reality: local apps monetize at $25–59 one-time
  (VoiceInk, BetterDictation, MacWhisper); subscriptions only survive where cloud adds
  ongoing value. Decide the business model before spending more on `cloud_api.rs`.

## Measurement

Add lightweight local timing (no telemetry — we're the privacy app) logged to the
history DB per dictation: audio duration, transcription ms, cleanup ms, paste ms,
engine + model used. Surface p50/p95 in a debug panel. Every phase above should move
one of these numbers; if it doesn't, revert it.

**Status:** timings are written to `dictation_history` and exposed via
`get_timing_stats` (p50/p95). Console logs time-to-paste per dictation. Debug
panel UI still TODO.

| Metric | Today (est.) | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| Time-to-paste, 50-word dictation (M-series, warm) | 2–4s | < 1s | < 300ms | < 300ms |
| Cleanup available (background) | blocking 1–3s | < 3s bg | < 3s bg | < 1.5s bg |
| Fresh-install → first dictation | ~15 min + admin pw | — | — | < 5 min, no admin |
| English WER | base.en (~10%+) | — | ≤ large-v3 (~7%) | — |
