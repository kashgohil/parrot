# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
bun install

# Development (runs API + desktop in parallel)
bun run dev

# Run individual apps
bun run dev:api              # API server on port 3001
bun run dev:desktop          # Desktop app (Vite on 1420, Tauri dev)

# Build desktop app
bun run build:desktop

# Database migrations (API)
bun run db:generate          # Generate Drizzle migrations
bun run db:migrate           # Apply migrations
```

## Architecture Overview

Parrot is a **voice dictation app** built as a Bun monorepo with two apps:

### Desktop App (`apps/desktop/`)
- **Frontend**: React 19 + TanStack Router (file-based) + Tailwind CSS 4
- **Backend**: Tauri 2 (Rust) handling audio capture, transcription, and system integration

**Key Rust modules** (`src-tauri/src/`):
- `lib.rs` - Tauri commands, global hotkey (Cmd+Shift+Space), event emission
- `audio.rs` - Audio capture via cpal, WAV encoding via hound
- `transcription.rs` - Trait-based providers (OpenAI Whisper, Deepgram, ElevenLabs)
- `cleanup.rs` - LLM text cleanup via GPT-4o-mini
- `db.rs` - Local SQLite for history, settings, profile

**Frontend routes** (`src/routes/`):
- `/_auth/` - Login/signup pages
- `/_onboarding/` - Setup wizard (local vs cloud)
- `/index.tsx` - Dictation history
- `/settings.tsx` - API keys, provider selection, hotkey
- `/profile.tsx` - Custom vocabulary, context, writing style

### API Server (`apps/api/`)
- **Framework**: Hono 4 on Bun runtime
- **Database**: SQLite with Drizzle ORM
- **Auth**: Session-based (30-day expiry) with password (Argon2id) and Google OAuth

**Routes** (`src/routes/`):
- `/api/auth/*` - Signup, login, logout, session validation, Google OAuth
- `/health` - Health check

## Data Flow

1. User presses global hotkey → Rust captures audio
2. Audio sent to transcription provider (OpenAI/Deepgram/ElevenLabs)
3. Optional: Text cleaned via GPT-4o-mini with user's custom words/context
4. Result copied to clipboard and pasted via enigo
5. Saved to local SQLite history

## Key Configuration

- **Desktop DB**: `~/Library/Application Support/com.kash.parrot/parrot.db`
- **API DB**: `./parrot.db` in API directory
- **Tauri identifier**: `com.kash.parrot`
- **Vite dev server**: port 1420 (HMR on 1421)
- **API server**: port 3001
