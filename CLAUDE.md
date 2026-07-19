# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
bun install

# Development from repo root (loads apps/desktop/.env for Tauri)
bun run dev                  # Desktop Tauri
bun run dev:desktop          # Desktop only (same as default)
bun run dev:hero             # Marketing site (:3002)
bun run dev:all              # Desktop + hero

# Hero SEO assets (sitemap, rss, llms-full.txt)
bun run generate-seo

# Desktop local DB
bun run db:clean             # Wipe local SQLite history/settings

# Hero app commands (run from apps/hero/)
bun run test                 # Run tests with Vitest
bun run lint                 # Lint with Biome
bun run check                # Type check + lint with Biome
```

## Architecture Overview

Parrot is a **local-only voice dictation app** built as a Bun monorepo with two apps:

### Desktop App (`apps/desktop/`)
- **Frontend**: React 19 + TanStack Router (file-based) + Tailwind CSS 4
- **Backend**: Tauri 2 (Rust) handling audio capture, on-device transcription, cleanup, and system integration

**Key Rust modules** (`src-tauri/src/`):
- `lib.rs` - Tauri commands, global hotkey, event emission
- `audio.rs` - Audio capture via cpal
- `transcription.rs` - Local STT (Whisper / Parakeet)
- `cleanup.rs` / `cleanup_engine.rs` - On-device AI cleanup (builtin llama.cpp or Ollama)
- `db.rs` - Local SQLite for history, settings, profile
- `local_setup.rs` - Model download and local setup

**Frontend routes** (`src/routes/`):
- `/_onboarding/` - Local profile, model setup, tour
- `/index.tsx` - Dictation history
- `/settings.tsx` - Hotkey, STT model, cleanup, writing style
- `/vocabulary.tsx` - Custom vocabulary
- `/profile.tsx` - Local profile

### Hero/Marketing Site (`apps/hero/`)
- **Framework**: React 19 + TanStack Router (file-based) + Vite
- **Styling**: Tailwind CSS 4 + custom CSS animations
- **Components**: Radix UI primitives + shadcn/ui patterns

**Key pages** (`src/routes/`):
- `/index.tsx` - Landing page with interactive demos
- `/about.tsx`, `/download.tsx` - Marketing pages
- `/blog/` - Blog posts
- `/compare/` - Competitor comparisons
- `/privacy.tsx`, `/terms.tsx`, `/contact.tsx` - Legal/support pages

**Public SEO/LLM assets** (`public/`):
- `llms.txt`, `llms-full.txt` (generated), `sitemap.xml`, `rss.xml`, `robots.txt`

**Adding shadcn components** (from `apps/hero/`):
```bash
pnpm dlx shadcn@latest add <component>
```

## Data Flow

1. User presses global hotkey → Rust captures audio
2. Audio transcribed on-device (Whisper or Parakeet)
3. Optional: text cleaned on-device (builtin model or Ollama) with custom words/context
4. Result copied to clipboard and pasted via enigo
5. Saved to local SQLite history

## Key Configuration

- **Desktop DB**: `~/Library/Application Support/com.kash.parrot/parrot.db`
- **Tauri identifier**: `com.kash.parrot`
- **Vite dev server (desktop)**: port 1420 (HMR on 1421)
- **Vite dev server (hero)**: port 3002
