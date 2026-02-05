# Parrot

Voice dictation that actually works. Speak naturally, get clean text.

Parrot is a macOS app that transcribes your voice and cleans it up with AI - removing filler words, fixing grammar, and applying your writing style. Works locally with Whisper.cpp and Ollama, or with cloud providers like OpenAI, Deepgram, and ElevenLabs.

## Features

- **Global hotkey** - Press Cmd+Shift+Space from any app to start dictating
- **AI cleanup** - Removes "um", "uh", fixes grammar, adds punctuation
- **Custom vocabulary** - Add names, technical terms, and jargon so transcription gets them right
- **Writing style** - Tell the AI how you write (formal, casual, terse) and it matches your tone
- **Three modes**:
  - **Local** - Everything on-device with Whisper.cpp and Ollama. No internet, no API keys, no data leaving your Mac
  - **BYOK** - Bring your own API keys for OpenAI, Deepgram, or ElevenLabs
  - **Managed** - We handle everything, you just dictate

## Privacy

In local mode, your audio never leaves your machine. In cloud modes, audio goes directly to your chosen provider - Parrot doesn't store or process your recordings on our servers.

## Repository Structure

```
parrot/
├── apps/
│   ├── desktop/     # Tauri 2 + React desktop app
│   ├── api/         # Hono API server
│   └── hero/        # Marketing site (tryparrot.app)
└── package.json
```

## Development

```bash
# Install dependencies
bun install

# Run everything (API + desktop)
bun run dev

# Run individual apps
bun run dev:api        # API server on port 3001
bun run dev:desktop    # Desktop app
bun run dev:hero       # Marketing site on port 3002
```

## Tech Stack

| App | Stack |
|-----|-------|
| Desktop | Tauri 2 (Rust) + React 19 + TanStack Router + Tailwind CSS 4 |
| API | Hono 4 + Bun + SQLite + Drizzle ORM |
| Hero | TanStack Start + React 19 + Tailwind CSS 4 |

## License

MIT
