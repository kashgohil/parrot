<p align="center">
  <img src="apps/hero/public/parrot-transparent.png" alt="Parrot" width="128" height="128" />
</p>

<h1 align="center">Parrot</h1>

<p align="center">
  <strong>Voice dictation for Mac. Speak naturally, get clean text.</strong>
</p>

<p align="center">
  <a href="https://tryparrot.app">Website</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS-000000?style=flat&logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/built_with-Tauri_2-24C8D8?style=flat&logo=tauri&logoColor=white" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/runtime-Bun-f9f1e1?style=flat&logo=bun&logoColor=000" alt="Bun" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="MIT License" />
</p>

---

## Why We Built Parrot

Speaking is [3x faster than typing](https://dl.acm.org/doi/10.1145/3025453.3025580) (Stanford, 2017). Yet every voice dictation tool on Mac is either locked to the cloud, butchers technical terms, or produces raw transcripts full of filler words you have to clean up yourself.

We wanted something different:

- **Local-first** -- your audio should never have to leave your machine if you don't want it to.
- **Actually usable output** -- AI cleanup that removes "um", "uh", fixes grammar, and matches your writing style so the text is ready to send.
- **Works everywhere** -- a global hotkey that pastes into whatever app you're using. No plugins, no integrations, no copy-paste.
- **Knows your vocabulary** -- custom words so "Kubernetes" doesn't become "Cooper Netties" and your coworkers' names are spelled right.

Parrot is the voice dictation app we wished existed. So we built it.

---

## Features

### Global Hotkey

Press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Space</kbd> from any app to start dictating. Release to stop. Your transcription is automatically pasted at your cursor.

### AI Cleanup

Raw dictation goes in, polished text comes out. Parrot removes filler words, fixes grammar and punctuation, and applies your writing style -- so you get text that sounds like you actually typed it.

| Before (raw dictation) | After (cleaned) |
|---|---|
| "so um I wanted to check if we can uh move the meeting to like Thursday instead of Wednesday if that works for you" | "Can we move the meeting to Thursday instead of Wednesday?" |
| "the patient presents with uh elevated BP around 140 over 90 and reports intermittent chest pain for the past um two weeks" | "The patient presents with elevated BP (~140/90) and reports intermittent chest pain over the past two weeks." |

### Custom Vocabulary

Add names, acronyms, brand terms, medical terminology, and technical jargon. Parrot feeds these directly to the transcription engine so it gets your words right the first time.

### Writing Style

Set your context ("I'm a software engineer writing Slack messages") and tone ("concise and direct"). The AI cleanup matches how you actually write.

### Local or Cloud -- Your Choice

| | Local Mode | Cloud Mode |
|---|---|---|
| Transcription | Whisper.cpp (on-device) | OpenAI Whisper, Deepgram, or ElevenLabs |
| AI Cleanup | Ollama (on-device) | GPT-4o-mini |
| Privacy | Zero data leaves your Mac | Audio sent to your chosen provider |
| Internet | Not required | Required |
| Setup | ~4 GB model download | API key or Parrot account |

Switch between modes anytime in settings. No data migration, no lock-in.

### Searchable History

Every dictation is saved with the raw transcript, cleaned text, provider, duration, and timestamp. Full-text search across your entire history.

### Works in Any App

Parrot pastes into whatever app has focus -- no plugins or integrations needed.

> Slack, VS Code, Gmail, Notion, Arc, Figma, Linear, Google Docs, Terminal, Obsidian, Bear, and anything else on your Mac.

---

## Getting Started

### Prerequisites

- **macOS 12+** (Monterey or later)
- **[Bun](https://bun.sh)** (package manager / runtime)
- **[Rust](https://rustup.rs)** (for the Tauri desktop app)
- **5 GB+ free disk space** (if using local mode for model downloads)

### Install Dependencies

```bash
bun install
```

### Development

```bash
# Run everything (API server + desktop app)
bun run dev

# Or run individual apps
bun run dev:api              # API server on port 3001
bun run dev:desktop          # Desktop app (Vite on 1420 + Tauri)
bun run dev:hero             # Marketing site on port 3002
```

### Build

```bash
# Build the desktop app (.dmg / .app)
bun run build:desktop

# Build the marketing site
bun run build:hero
```

### Database

```bash
bun run db:generate          # Generate Drizzle migrations
bun run db:migrate           # Apply migrations
bun run db:studio            # Open Drizzle Studio
```

### Local Mode Setup

When you first launch Parrot in local mode, the onboarding wizard handles everything:

1. Checks system requirements (macOS version, disk space, architecture)
2. Installs [whisper.cpp](https://github.com/ggerganov/whisper.cpp) via Homebrew
3. Downloads the Whisper model from HuggingFace (~1-4 GB depending on model size)
4. Installs [Ollama](https://ollama.ai) and pulls `llama3.2` for AI cleanup
5. Starts local servers with automatic port detection

No manual configuration needed.

---

## Tech Stack

### Architecture

```
parrot/
├── apps/
│   ├── desktop/          # Tauri 2 (Rust) + React 19 desktop app
│   ├── api/              # Hono 4 API server on Bun
│   └── hero/             # Marketing site (tryparrot.app)
├── package.json          # Bun monorepo root
└── docker-compose.observability.yml
```

### Desktop App

The core of Parrot. A native macOS app built with Tauri 2 (Rust backend) and React 19 (frontend).

**Rust backend** -- handles audio capture, transcription, text cleanup, clipboard, and system integration:

| Library | Purpose |
|---|---|
| [Tauri 2](https://tauri.app) | App framework, window management, system tray |
| [cpal](https://github.com/RustAudio/cpal) | Cross-platform audio capture |
| [hound](https://github.com/ruuda/hound) | WAV encoding |
| [enigo](https://github.com/enigo-rs/enigo) | Keyboard simulation (auto-paste) |
| [arboard](https://github.com/1Password/arboard) | Clipboard access |
| [rusqlite](https://github.com/rusqlite/rusqlite) | Local SQLite database |
| [reqwest](https://github.com/seanmonstar/reqwest) | HTTP client for API calls |
| [tokio](https://tokio.rs) | Async runtime |

**React frontend** -- settings, history, profile management:

| Library | Purpose |
|---|---|
| [React 19](https://react.dev) | UI framework |
| [TanStack Router](https://tanstack.com/router) | File-based routing |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |
| [Radix UI](https://www.radix-ui.com) | Accessible UI primitives |
| [Lucide](https://lucide.dev) | Icons |
| [Motion](https://motion.dev) | Animations |

### API Server

Backend for cloud mode -- authentication, transcription proxying, history sync, and subscription management.

| Library | Purpose |
|---|---|
| [Hono 4](https://hono.dev) | Web framework |
| [Bun](https://bun.sh) | Runtime |
| [Drizzle ORM](https://orm.drizzle.team) | Database ORM + migrations |
| [PostgreSQL](https://www.postgresql.org) | Database |
| [Polar.sh](https://polar.sh) | Subscription billing |
| [MinIO](https://min.io) | S3-compatible audio storage |
| [OpenTelemetry](https://opentelemetry.io) | Observability (traces + metrics) |

### Marketing Site

The public-facing website at [tryparrot.app](https://tryparrot.app).

| Library | Purpose |
|---|---|
| [TanStack Start](https://tanstack.com/start) | SSR framework |
| [React 19](https://react.dev) | UI framework |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |
| [Biome](https://biomejs.dev) | Linting + formatting |
| [Vitest](https://vitest.dev) | Testing |

---

## Transcription Providers

| Provider | Mode | Model |
|---|---|---|
| [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) | Local | ggml models (configurable) |
| [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text) | Cloud | `whisper-1` |
| [Deepgram](https://deepgram.com) | Cloud | `nova-2` |
| [ElevenLabs](https://elevenlabs.io) | Cloud | `scribe_v1` |

**AI Cleanup:**
- **Local:** Ollama with `llama3.2` (or any compatible model)
- **Cloud:** GPT-4o-mini via OpenAI API

---

## Privacy

- **Local mode** -- audio is captured, transcribed, and cleaned entirely on your Mac. Zero bytes sent anywhere.
- **Cloud mode** -- audio goes directly to your chosen provider (OpenAI, Deepgram, or ElevenLabs). Parrot does not store or process your recordings on our servers.
- **BYOK** -- bring your own API keys. Your keys, your provider, your data.

---

## How It Works

```
                        ┌──────────────┐
  Cmd+Shift+Space  -->  │  Mic Capture │
                        └──────┬───────┘
                               │ WAV audio
                    ┌──────────┴──────────┐
                    │                     │
              Local mode            Cloud mode
                    │                     │
            ┌───────┴───────┐    ┌────────┴────────┐
            │  Whisper.cpp  │    │  OpenAI/Deepgram │
            │  (on-device)  │    │   /ElevenLabs    │
            └───────┬───────┘    └────────┬─────────┘
                    │                     │
                    └──────────┬──────────┘
                               │ raw text
                        ┌──────┴───────┐
                        │  AI Cleanup  │
                        │  (LLM pass)  │
                        └──────┬───────┘
                               │ clean text
                    ┌──────────┴──────────┐
                    │   Clipboard + Paste  │
                    │  (auto-paste at      │
                    │   cursor position)   │
                    └──────────┬──────────┘
                               │
                        ┌──────┴───────┐
                        │   History DB  │
                        └──────────────┘
```

---

## Project Structure

```
apps/
├── desktop/                    # Tauri 2 desktop app
│   ├── src/                    # React frontend
│   │   ├── routes/             # File-based routes (TanStack Router)
│   │   │   ├── index.tsx       # Dictation history
│   │   │   ├── settings.tsx    # Provider config, hotkey, API keys
│   │   │   ├── profile.tsx     # Custom vocabulary, context, style
│   │   │   ├── _auth/          # Login / signup
│   │   │   └── _onboarding/    # Setup wizard
│   │   └── components/         # Shared UI components
│   └── src-tauri/
│       └── src/
│           ├── lib.rs          # Tauri commands, hotkey, event loop
│           ├── audio.rs        # Audio capture (cpal) + WAV encoding
│           ├── transcription.rs # Provider implementations
│           ├── cleanup.rs      # LLM text cleanup
│           └── db.rs           # Local SQLite database
│
├── api/                        # Hono API server
│   └── src/
│       ├── routes/             # API endpoints
│       │   ├── auth.ts         # Signup, login, Google OAuth
│       │   ├── transcribe.ts   # Audio transcription proxy
│       │   ├── cleanup.ts      # Text cleanup proxy
│       │   ├── history.ts      # Dictation history CRUD
│       │   ├── profile.ts      # User profile management
│       │   └── subscription.ts # Subscription management
│       └── db/
│           └── schema/         # Drizzle ORM schema
│
└── hero/                       # Marketing site (tryparrot.app)
    └── src/
        └── routes/             # Pages (landing, pricing, about, blog)
```

---

## Comparison

| Feature | Parrot | Wispr Flow | macOS Dictation |
|---|---|---|---|
| Local mode | Yes | No | No |
| Cloud mode | Yes | Yes | No |
| Custom vocabulary | Yes | Yes | No |
| AI cleanup | Yes | Yes | No |
| Offline support | Yes | No | Yes |
| Privacy (no data sent) | Yes | No | Partial |
| Open source | Yes | No | No |

---

## Contributing

Parrot is open source and we welcome contributions. To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run the desktop app locally (`bun run dev:desktop`) to verify
5. Open a pull request

---

## License

MIT
