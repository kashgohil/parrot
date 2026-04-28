<p align="center">
  <img src="apps/hero/public/parrot-transparent.png" alt="Parrot" width="128" height="128" />
</p>

<h1 align="center">Parrot</h1>

<p align="center">
  <strong>Open-source voice dictation. Speak naturally, get clean text — anywhere on your computer.</strong>
</p>

<p align="center">
  <a href="https://tryparrot.app">Website</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#download">Download</a> &middot;
  <a href="#build-from-source">Build from source</a> &middot;
  <a href="#tech-stack">Tech stack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS_·_Windows_·_Linux-000000?style=flat" alt="Platforms" />
  <img src="https://img.shields.io/badge/built_with-Tauri_2-24C8D8?style=flat&logo=tauri&logoColor=white" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/runtime-Bun-f9f1e1?style=flat&logo=bun&logoColor=000" alt="Bun" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="MIT License" />
</p>

---

## Why Parrot

Speaking is [3× faster than typing](https://dl.acm.org/doi/10.1145/3025453.3025580) (Stanford, 2017). But every voice dictation tool either ships your audio to the cloud, butchers technical terms, or hands you a raw transcript full of "um"s.

Parrot is different:

- **Local-first.** Your audio doesn't have to leave your machine. Whisper runs in-process, no server, no network.
- **Actually usable output.** An LLM cleans up filler words, fixes grammar, and matches your writing style — text is ready to send.
- **Works in any app.** Hold a key, talk, release. Parrot pastes into whatever has focus — no plugins, no integrations.
- **Knows your vocabulary.** Custom words so "Kubernetes" doesn't become "Cooper Netties" and your coworkers' names are spelled right.
- **Open source. MIT licensed.**

---

## Features

### Push-to-talk hotkey

Hold the dictation hotkey from anywhere, talk, release. The clean transcript is pasted at your cursor.

| Platform | Default | Configurable |
|---|---|---|
| macOS | `fn` (single key) | Yes — any combo, or stay with `fn` |
| Windows | `Ctrl + Space` | Yes |
| Linux | `Ctrl + Space` | Yes |

### AI cleanup

Raw dictation goes in, polished text comes out. Parrot strips filler words, fixes grammar, applies your tone.

| Before (raw dictation) | After (cleaned) |
|---|---|
| "so um I wanted to check if we can uh move the meeting to like Thursday instead of Wednesday if that works for you" | "Can we move the meeting to Thursday instead of Wednesday?" |
| "the patient presents with uh elevated BP around 140 over 90 and reports intermittent chest pain for the past um two weeks" | "The patient presents with elevated BP (~140/90) and reports intermittent chest pain over the past two weeks." |

### Custom vocabulary

Add names, acronyms, brand terms, medical / technical jargon. Parrot feeds these directly to the transcription engine so it gets your words right the first time.

### Writing style

Set your context ("I'm a software engineer writing Slack messages") and tone ("concise and direct"). The cleanup matches how you actually write.

### Local or cloud — your choice

| | Local mode | Cloud mode |
|---|---|---|
| Transcription | Whisper.cpp (in-process via `whisper-rs`) | OpenAI Whisper, Deepgram, or ElevenLabs |
| AI cleanup | Ollama (on-device) | GPT-4o-mini |
| Privacy | Zero data leaves your machine | Audio sent to your chosen provider |
| Internet | Not required | Required |
| Setup | One-time ~2–5 GB model download | API key or Parrot account |

Switch between modes anytime in settings. No data migration, no lock-in.

### Searchable history

Every dictation is saved with the raw transcript, cleaned text, provider, duration, and timestamp. Full-text search across your entire history.

### Quiet auto-updates

The app silently downloads new releases in the background. When ready, a small "Restart to update" prompt appears in the sidebar. Same pattern as Chrome / VS Code / Linear.

---

## Download

> **Pre-built binaries coming soon.** The first signed releases will land on the [Releases page](https://github.com/kashgo/parrot/releases) once code-signing is set up. Until then, build from source — see below.

When releases are out:

| OS | Download | Install |
|---|---|---|
| macOS (Apple Silicon / Intel) | `Parrot_<version>.dmg` | Open the DMG, drag Parrot to Applications |
| Windows | `Parrot_<version>_x64-setup.exe` | Run the installer |
| Linux (Debian/Ubuntu) | `parrot_<version>_amd64.deb` | `sudo dpkg -i parrot_*.deb` |
| Linux (Fedora/RHEL) | `parrot-<version>.x86_64.rpm` | `sudo rpm -i parrot-*.rpm` |
| Linux (any) | `parrot_<version>_amd64.AppImage` | `chmod +x parrot-*.AppImage && ./parrot-*.AppImage` |

Homebrew Cask formula will follow — `brew install --cask parrot`.

---

## Build from source

Parrot is a Bun monorepo with three apps: a Tauri 2 desktop app, a Hono API server (only needed for cloud mode), and a marketing site. For most contributors, only the desktop app matters.

### 1. Install toolchain

You need these once on each machine, regardless of OS:

- **[Bun](https://bun.sh)** — package manager + JS runtime.
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **[Rust](https://rustup.rs)** — for the Tauri backend.
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

### 2. Install OS-specific build dependencies

Whisper runs in-process via `whisper-rs`, which compiles `whisper.cpp` from source. That requires `cmake` and a C/C++ toolchain. The exact prerequisites:

#### macOS

```bash
xcode-select --install              # Xcode Command Line Tools
brew install cmake                  # whisper-rs build dependency
```

Minimum: macOS 12 (Monterey).

#### Windows

Install in this order:

1. **[Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/?q=build+tools)** — select the *Desktop development with C++* workload.
2. **[CMake](https://cmake.org/download/)** — add to PATH during install.
3. **[LLVM / Clang](https://github.com/llvm/llvm-project/releases)** — `whisper-rs` uses bindgen, which needs `libclang.dll`. Set `LIBCLANG_PATH` env var to your LLVM `bin` directory.
4. **[WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/)** — already installed on Windows 11; required on Windows 10.

#### Linux (Debian / Ubuntu)

```bash
sudo apt update
sudo apt install -y \
  build-essential cmake clang pkg-config \
  libssl-dev libgtk-3-dev libayatana-appindicator3-dev \
  libwebkit2gtk-4.1-dev librsvg2-dev libasound2-dev
```

#### Linux (Fedora / RHEL)

```bash
sudo dnf install -y \
  gcc gcc-c++ make cmake clang-devel pkgconf-pkg-config \
  openssl-devel gtk3-devel libappindicator-gtk3-devel \
  webkit2gtk4.1-devel librsvg2-devel alsa-lib-devel
```

#### Linux (Arch)

```bash
sudo pacman -S --needed \
  base-devel cmake clang \
  webkit2gtk-4.1 libappindicator-gtk3 librsvg alsa-lib
```

### 3. Clone and install

```bash
git clone https://github.com/kashgo/parrot.git
cd parrot
bun install
```

### 4. Run in dev mode

```bash
# Just the desktop app (most common)
bun run dev:desktop

# Or everything (desktop + API + marketing site)
bun run dev
```

The first build compiles `whisper.cpp` from source, which takes ~30–60 seconds. Subsequent builds are cached and incremental.

### 5. Build a release binary

```bash
bun run build:desktop
```

Outputs land in `apps/desktop/src-tauri/target/release/bundle/`:

| OS | Artifact | Path |
|---|---|---|
| macOS | `.app` and `.dmg` | `bundle/macos/Parrot.app`, `bundle/dmg/Parrot_<ver>_<arch>.dmg` |
| Windows | `.msi` and `.exe` installer | `bundle/msi/`, `bundle/nsis/` |
| Linux | `.deb`, `.rpm`, `.AppImage` | `bundle/deb/`, `bundle/rpm/`, `bundle/appimage/` |

Tauri builds for the **host OS only** — building macOS bundles requires running on macOS, Windows on Windows, etc. For multi-OS releases, use a CI matrix (GitHub Actions, etc.).

### 6. Install your local build (macOS)

```bash
cp -R apps/desktop/src-tauri/target/release/bundle/macos/Parrot.app /Applications/
xattr -dr com.apple.quarantine /Applications/Parrot.app   # bypass Gatekeeper for unsigned builds
open -a Parrot
```

> Unsigned local builds will show a "Parrot can't be opened because Apple cannot check it for malicious software" warning on first launch. The `xattr` command above tells Gatekeeper to trust the binary you just built. Production releases will be properly signed and notarized — this step is only for local development.

---

## First-time setup

When you first launch Parrot in **local mode**, the onboarding wizard handles everything:

1. **System check** — verifies OS version, architecture, free disk space.
2. **Accessibility permission** *(macOS only)* — Parrot needs this to listen for the global hotkey and paste into other apps. The wizard opens the right System Settings pane and detects the moment you flip the switch.
3. **Whisper model** — downloads your chosen model (`tiny.en` / `base.en` / `small.en` — 75 MB to 500 MB) into Parrot's data directory. Loaded in-process, no separate server.
4. **Ollama** — installs Ollama (via its official installer) if not already present.
5. **Cleanup model** — pulls a 1–3 GB LLM (Llama 3.2 / Phi-4 / Qwen) for text cleanup.
6. **Validation** — quick end-to-end smoke test.

No manual configuration needed. **Cloud mode** skips all of the above — just paste an API key or sign in.

### Permissions

| OS | Permission | Used for |
|---|---|---|
| macOS | Microphone | Recording your dictation |
| macOS | Accessibility | Capturing the global hotkey + pasting into other apps |
| Windows | Microphone | Recording your dictation |
| Linux | Microphone (PulseAudio / PipeWire) | Recording your dictation |

Parrot only requests what it needs. No screen recording, no contacts, no calendar.

---

## Tech stack

### Architecture

```
parrot/
├── apps/
│   ├── desktop/          # Tauri 2 (Rust) + React 19 desktop app
│   ├── api/              # Hono 4 API server on Bun (cloud mode only)
│   └── hero/             # Marketing site (tryparrot.app)
└── package.json          # Bun monorepo root
```

### Desktop app

Native cross-platform app built with Tauri 2 (Rust backend) and React 19 (frontend).

**Rust backend** — handles audio capture, transcription, text cleanup, hotkeys, and OS integration:

| Library | Purpose |
|---|---|
| [Tauri 2](https://tauri.app) | App framework, window management, system tray, OTA updater |
| [whisper-rs](https://github.com/tazz4843/whisper-rs) | In-process Whisper.cpp bindings (with Metal acceleration on macOS) |
| [cpal](https://github.com/RustAudio/cpal) | Cross-platform audio capture |
| [hound](https://github.com/ruuda/hound) | WAV encoding/decoding |
| [core-graphics](https://crates.io/crates/core-graphics) | macOS `CGEventTap` for the `fn`-key hotkey |
| [rusqlite](https://github.com/rusqlite/rusqlite) | Local SQLite database |
| [reqwest](https://github.com/seanmonstar/reqwest) | HTTP client (cloud mode + Ollama API) |
| [tokio](https://tokio.rs) | Async runtime |
| [Sentry](https://sentry.io) | Optional error reporting |

**React frontend** — settings, history, profile, onboarding wizard:

| Library | Purpose |
|---|---|
| [React 19](https://react.dev) | UI framework |
| [TanStack Router](https://tanstack.com/router) | File-based routing |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |
| [Radix UI](https://www.radix-ui.com) | Accessible primitives |
| [Lucide](https://lucide.dev) | Icons |
| [Motion](https://motion.dev) | Animations |
| [Sonner](https://sonner.emilkowal.ski) | Toasts |

### API server (cloud mode only)

Backend for cloud mode — auth, transcription proxying, history sync, subscription billing. Not required for local-mode users; not bundled into the desktop binary.

| Library | Purpose |
|---|---|
| [Hono 4](https://hono.dev) | Web framework |
| [Bun](https://bun.sh) | Runtime |
| [Drizzle ORM](https://orm.drizzle.team) | Database ORM + migrations |
| [PostgreSQL](https://www.postgresql.org) | Database |
| [Polar.sh](https://polar.sh) | Subscription billing |
| [MinIO](https://min.io) | S3-compatible audio storage |

---

## Transcription providers

| Provider | Mode | Model |
|---|---|---|
| [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) (in-process) | Local | `ggml-tiny.en` / `ggml-base.en` / `ggml-small.en` |
| [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text) | Cloud | `whisper-1` |
| [Deepgram](https://deepgram.com) | Cloud | `nova-2` |
| [ElevenLabs](https://elevenlabs.io) | Cloud | `scribe_v1` |

**Cleanup models:**
- **Local:** Ollama with `llama3.2`, `phi4`, or `qwen2.5-coder`
- **Cloud:** GPT-4o-mini

---

## Privacy

- **Local mode** — audio is captured, transcribed, and cleaned entirely on your device. Zero bytes sent anywhere.
- **Cloud mode** — audio goes directly to your chosen provider (OpenAI / Deepgram / ElevenLabs). Parrot itself does not store your recordings server-side beyond the response cycle.
- **BYOK** — bring your own API keys. Your keys, your provider, your data.
- **Sentry** — optional, off by default. Only crash diagnostics, never audio or transcript content.

---

## How it works

```
                        ┌──────────────┐
        Hotkey held →   │  Mic capture │
                        └──────┬───────┘
                               │ WAV audio
                    ┌──────────┴──────────┐
                    │                     │
              Local mode             Cloud mode
                    │                     │
            ┌───────┴───────┐    ┌────────┴─────────┐
            │  whisper-rs   │    │  OpenAI/Deepgram │
            │  (in-process) │    │   /ElevenLabs    │
            └───────┬───────┘    └────────┬─────────┘
                    │                     │
                    └──────────┬──────────┘
                               │ raw text
                        ┌──────┴───────┐
                        │  AI cleanup  │
                        │  (LLM pass)  │
                        └──────┬───────┘
                               │ clean text
                    ┌──────────┴──────────┐
                    │  Clipboard + paste  │
                    │  at cursor position │
                    └──────────┬──────────┘
                               │
                        ┌──────┴───────┐
                        │  History DB  │
                        └──────────────┘
```

---

## Project structure

```
apps/
├── desktop/                       # Tauri 2 desktop app
│   ├── src/                       # React frontend
│   │   ├── routes/                # File-based routes (TanStack Router)
│   │   │   ├── index.tsx          # Dictation history
│   │   │   ├── settings.tsx       # Hotkey, provider, API keys
│   │   │   ├── profile.tsx        # Custom vocabulary, context, style
│   │   │   ├── _auth/             # Login / signup
│   │   │   └── _onboarding/       # Setup wizard
│   │   ├── lib/                   # Shared utilities
│   │   │   ├── errors.ts          # User-friendly error toasts
│   │   │   └── updater.ts         # OTA update hook
│   │   └── components/            # Shared UI components
│   └── src-tauri/
│       └── src/
│           ├── lib.rs             # Tauri commands, app entrypoint
│           ├── audio.rs           # Audio capture (cpal) + WAV encoding
│           ├── hotkey.rs          # Cross-platform hotkey, macOS fn-key tap
│           ├── transcription.rs   # whisper-rs + cloud HTTP providers
│           ├── cleanup.rs         # LLM text cleanup (Ollama / GPT-4o-mini)
│           ├── local_setup.rs     # Onboarding wizard backend
│           └── db.rs              # Local SQLite database
│
├── api/                           # Hono API server (cloud mode only)
│   └── src/
│       ├── routes/                # API endpoints
│       └── db/schema/             # Drizzle ORM schema
│
└── hero/                          # Marketing site (tryparrot.app)
    └── src/routes/                # Pages (landing, pricing, about, blog)
```

---

## Comparison

| Feature | Parrot | Wispr Flow | macOS Dictation |
|---|---|---|---|
| Local-only mode | Yes | No | No |
| Cloud mode | Yes | Yes | No |
| Custom vocabulary | Yes | Yes | No |
| AI cleanup | Yes | Yes | No |
| Offline support | Yes | No | Yes |
| Privacy (no data sent) | Yes | No | Partial |
| Cross-platform | macOS, Windows, Linux | macOS, Windows | macOS only |
| Open source | Yes | No | No |

---

## Contributing

Parrot is open source and we welcome contributions.

1. Fork the repo and clone your fork.
2. Install [prerequisites](#build-from-source) for your OS.
3. Create a feature branch: `git checkout -b feat/my-thing`.
4. `bun run dev:desktop` to verify your changes locally.
5. Open a pull request — describe the change, link any related issue.

For larger changes, please open an issue first to discuss the approach.

### Reporting bugs

When the app shows a "Something went wrong" toast, click **Copy details** — that copies the full error trace to your clipboard. Paste it into a new issue along with what you were doing when it happened.

### Roadmap / known limitations

- Pre-built binaries: in progress (see [Download](#download)).
- Code signing: macOS Developer ID + Windows Authenticode pending.
- Linux Wayland clipboard auto-paste: works on most compositors via `wtype`/`ydotool`; some require additional setup.
- Whisper-rs requires `cmake` + `clang` to build — there's no pre-built crate yet.

---

## Acknowledgements

Parrot stands on the shoulders of fantastic open-source projects:

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) — Georgi Gerganov's blazing-fast Whisper port.
- [Ollama](https://ollama.com) — frictionless local LLM runtime.
- [Tauri](https://tauri.app) — small, fast, secure desktop apps with web frontends.
- [whisper-rs](https://github.com/tazz4843/whisper-rs) — Rust bindings to whisper.cpp.

---

## License

[MIT](LICENSE)
