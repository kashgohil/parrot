# Parrot App Context for Landing Page

Context gathered from the desktop app (`apps/desktop/`) to inform the hero/landing site copy and structure. Local-only product — no cloud API.

---

## What Parrot Is

**Parrot** is a **voice dictation app** that turns speech into text and pastes it where you need it. You press a hotkey, talk, and your words are transcribed, optionally cleaned by AI, then copied to the clipboard and pasted at the cursor.

- **Platform**: Desktop app (Tauri 2 on Mac; Rust backend, React 19 frontend).
- **Optional backend**: API server (Hono on Bun) for auth, cloud transcription, cleanup, and history sync when using “cloud” mode.

---

## Core Value Props (from app copy)

1. **Speak → text**  
   Press a hotkey (e.g. Cmd+Shift+Space), talk, then stop. Parrot captures audio and turns it into text.

2. **Auto-paste**  
   Transcriptions are copied to the clipboard and pasted where your cursor is (no manual copy-paste).

3. **Custom vocabulary**  
   Add names, brand names, jargon, and technical terms so the transcriber spells them correctly.

4. **Writing style & context**  
   Set context (e.g. “I’m a software engineer writing technical docs”) and writing style (e.g. “Concise, no fluff”) so the AI cleanup matches how you write.

5. **Provider choice**  
   Transcription: **OpenAI Whisper**, **Deepgram**, or **ElevenLabs**. Cleanup: **GPT-4o-mini** (OpenAI). You can use your own API keys or (in cloud mode) Parrot’s.

6. **Local or cloud**  
   - **Local**: Process everything on device (Whisper.cpp, Ollama). Privacy, no API cost, works offline; needs ~4GB disk and one-time model download.  
   - **Cloud**: Use cloud APIs; instant setup, faster, minimal disk; requires API keys and internet.

7. **AI cleanup**  
   Optional pass that fixes grammar, punctuation, removes filler words (um, uh, like), and applies your vocabulary + context + writing style.

8. **History**  
   All dictations are saved. Search past transcriptions and copy them again from the History tab.

9. **Account (cloud mode)**  
   Sign up / log in (email+password or Google). Account ties to profile (vocabulary, context, writing style), subscription (coming soon), and privacy prefs (coming soon).

---

## User Flow (high level)

1. **Install** → Open app → **Login/Signup** (or use local-only).
2. **Onboarding**: Choose **Local** or **Cloud** setup.
   - Local: Install/check Whisper.cpp, Ollama.
   - Cloud: Optionally add API key, connect to Parrot API.
3. **Quick tour** (4 steps): Start recording (hotkey) → Auto-paste → View history → Personalize (vocabulary, style).
4. **Daily use**: Press hotkey → speak → release/press again to stop → text appears and is pasted; optional AI cleanup; entry saved to history.
5. **Ongoing**: Adjust **Settings** (hotkey, API keys, writing preferences), **Vocabulary** (custom words), **Profile** (account, context, writing style).

---

## App Structure (desktop)

- **Home**  
  Dictation history: searchable timeline, grouped by date; copy raw or cleaned text; “Tip of the day” with usage tips.

- **Vocabulary**  
  List of words/names the transcriber should recognize (brand names, jargon, people). Add/remove; saved to profile.

- **Settings**  
  Hotkey (customizable, e.g. Cmd+Shift+Space), “Use my own API keys” (transcription + optional cleanup/OpenAI), Writing preferences (context prompt, writing style), Save audio (keep WAVs).

- **Profile**  
  Account (name, email), Subscription (coming soon), Privacy (coming soon).

---

## Tips Used in the App (good for landing “how it works”)

- Press your hotkey to start recording — release or press again to stop.
- Add custom vocabulary so Parrot nails tricky names and jargon.
- Set your writing style in Settings for cleaner, more consistent transcriptions.
- Transcriptions are automatically copied to the clipboard after processing.
- Use your own API keys in Settings if you want full control over providers.
- Parrot cleans up dictations with AI — grammar, punctuation, and style.

---

## API Surface (for “powered by” / technical trust)

- **Auth**: Signup, login, logout, session validation, Google OAuth (30-day sessions, Argon2id).
- **Transcribe**: POST audio file; supports OpenAI, Deepgram, ElevenLabs (user or server API keys).
- **Cleanup**: POST text; returns cleaned text using profile (custom words, context, writing style) and GPT-4o-mini.
- **History**: GET (list/search), POST (insert dictation).
- **Profile**: GET/update profile (custom words, context, writing style).
- **Sync / Audio**: Sync and audio-related endpoints for cloud mode.

---

## Branding & Assets (desktop)

- **Name**: Parrot.
- **Tagline-style copy in app**: “Voice dictation that just works” (hero already uses this).
- **Assets in desktop `public/`**: `parrot-transparent.png`, `parrot.png`, `icon.png` (already copied to hero `public/`).
- **Nav items**: Home, Vocabulary, Settings, Profile.

---

## Suggested Landing Page Sections

1. **Hero**  
   Headline + “Voice dictation that just works” + short subline + primary CTA (e.g. Download for Mac).

2. **How it works**  
   Hotkey → speak → auto-paste; optional AI cleanup; history.

3. **Features**  
   Speak → text; Clipboard & paste; Custom vocabulary; Writing style & context; Provider choice (Whisper / Deepgram / ElevenLabs); Local or cloud; AI cleanup; History.

4. **Local vs cloud**  
   Two paths: “Local processing” (privacy, offline, no API cost) vs “Cloud processing” (instant setup, fast, minimal disk).

5. **Trust / technical**  
   Your data, your keys; optional account; session-based auth.

6. **CTA**  
   Download for Mac (and optionally “Sign up” or “Learn more” for cloud).

Use this file when writing or refining hero copy, feature lists, and section structure so the landing page stays aligned with the real product.
