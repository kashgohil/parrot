/**
 * Release notes shown on /changelog. Newest first.
 * scripts/generate-seo.ts (run by `bun run build`) and changelog.test.ts fail
 * if the newest version differs from PARROT_FACTS.version.
 */
export type ChangeType = "added" | "improved" | "fixed" | "removed";

export type Release = {
	version: string;
	date: string;
	tag?: string;
	changes: { type: ChangeType; items: string[] }[];
};

export const RELEASES: Release[] = [
	{
		version: "v0.2.5",
		date: "August 4, 2026",
		tag: "Latest",
		changes: [
			{
				type: "added",
				items: [
					"Transcribe almost any audio file — drop or pick MP3, M4A, FLAC, OGG, MP4/MOV, and more on History; Parrot decodes and transcribes on device",
					"Transcription detail page — open any dictation or file transcription to read the full transcript, see metadata, and manage attached audio",
					"Tip of the day — dismissible quick tips in the sidebar to help you discover Parrot features",
				],
			},
			{
				type: "improved",
				items: [
					"History table shows live progress while file transcriptions run, attachment indicators, and clearer delete confirmation popovers",
					"Large audio files transcribe through Rust directly from disk instead of freezing the webview on big uploads",
				],
			},
			{
				type: "fixed",
				items: [
					"Long audio files no longer crash Parakeet transcription — files longer than 30 seconds are chunked automatically",
					"MP4 and MOV files pick the audio track instead of failing on video",
					"Clearer errors when you drop a format Parrot can’t decode (e.g. Opus voice notes from WhatsApp or Telegram)",
				],
			},
		],
	},
	{
		version: "v0.2.4",
		date: "July 31, 2026",
		changes: [
			{
				type: "fixed",
				items: [
					"The fn dictation hotkey no longer interferes with other apps — global shortcuts like ⌘S stopped getting dropped, and fn-based keys (fn+arrows, fn+delete) in Arc and other browsers now work normally instead of triggering dictation",
					"The ⌘⇧C “apply polish” shortcut is only active while a cleanup suggestion is on screen, so it no longer hijacks ⌘⇧C (Copy URL, Inspect Element) in your browser and other apps the rest of the time",
				],
			},
		],
	},
	{
		version: "v0.2.3",
		date: "July 20, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Cleanup quality tiers — pick a faster, lighter model or a higher-quality 1.5B / 3B tier so you can trade speed for polish",
					"Formality presets in cleanup settings — dial the tone of cleaned-up text to match how you write",
				],
			},
			{
				type: "improved",
				items: [
					"Faster on-device cleanup — warm model context, cached system prompt, and flash attention for lower latency",
					"Short dictations get cleaned too — brief utterances are no longer skipped by cleanup",
				],
			},
		],
	},
	{
		version: "v0.2.2",
		date: "July 19, 2026",
		changes: [
			{
				type: "improved",
				items: [
					"More stable AI cleanup — the cleanup model runs in its own isolated process, so it no longer conflicts with the transcription engine",
					"Better cleanup output — improved handling of filler words, disfluencies, and formatting",
					"Cleaner recording HUD — the chip shows only the listening timer while you’re recording",
				],
			},
			{
				type: "fixed",
				items: [
					"Cleanup no longer crashes — resolved a memory-corruption issue in the cleanup engine",
					"More reliable Bluetooth mic — the always-open input stream is scoped to Bluetooth devices only",
				],
			},
		],
	},
	{
		version: "v0.2.1",
		date: "July 19, 2026",
		changes: [
			{
				type: "improved",
				items: [
					"Parrot is fully local-only — no account, login, or cloud sync. Dictation, cleanup, and history stay on your Mac",
					"Simpler onboarding: set up a local profile and start dictating without cloud migration or subscription steps",
				],
			},
			{
				type: "fixed",
				items: [
					"More reliable paste into the focused app — Parrot pastes with ⌘V and falls back to typing if paste doesn’t land",
				],
			},
		],
	},
	{
		version: "v0.2.0",
		date: "July 18, 2026",
		changes: [
			{
				type: "improved",
				items: [
					"Dictation feels dramatically faster — text lands at your cursor with less wait after you release the hotkey",
					"Higher first-pass accuracy, especially on names, jargon, and technical terms",
					"Setup is simpler: download once in the app and start dictating — no extra tools to install",
				],
			},
			{
				type: "added",
				items: [
					"Live transcript in the floating HUD while you hold the hotkey — see your words form as you speak",
					"Smarter vocabulary that learns from how you write and suggests terms worth saving",
					"Per-app writing polish so Slack, docs, and code can each sound the way you want",
					"Drop an audio file onto History (or pick one) for a full transcript",
				],
			},
		],
	},
	{
		version: "v0.1.6",
		date: "May 7, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Custom vocabulary now biases the transcriber itself — Whisper, Deepgram, and ElevenLabs get hinted with your saved terms so words like “Tauri” or “Gujarati” come through correctly the first time",
					"Optional “Use when” context per vocabulary word — Parrot can spell “Tauri” in software contexts and leave “tory” alone in political ones",
					"Periodic update checks so you’re prompted when a new version ships",
					"macOS microphone permission status now surfaces in onboarding and settings, with a banner when access is missing",
				],
			},
			{
				type: "improved",
				items: [
					"The HUD chip now expands from the center of the orb, not from a corner, so it stays visually anchored to where the icon was",
				],
			},
			{
				type: "fixed",
				items: [
					"Empty dictations (silence, accidental hotkey taps) no longer create history entries or paste blanks",
					"Very short local-whisper inputs return an empty transcript instead of surfacing an error",
					"Hero site favicon now resolves (migrated from .ico to .png)",
				],
			},
		],
	},
	{
		version: "v0.1.5",
		date: "May 3, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Manual Ollama setup fallback — if the automatic install fails, the wizard now walks you through installing Ollama yourself and resumes from where it left off",
				],
			},
			{
				type: "fixed",
				items: [
					"Onboarding now persists setup mode before saving your profile, so local-setup and tour steps no longer lose track of the local user",
				],
			},
			{
				type: "improved",
				items: [
					"Cleaner onboarding transitions — dropped the route cross-fade in favor of stable layout heights and instant step changes",
				],
			},
		],
	},
	{
		version: "v0.1.4",
		date: "May 3, 2026",
		changes: [
			{
				type: "fixed",
				items: [
					"Local setup no longer hangs on “Installing Ollama…” — installer now elevates through a native macOS password prompt instead of a stuck sudo call",
					"Setup correctly detects an existing Ollama install — including users on Ollama.app who never ran “Install command line”",
				],
			},
			{
				type: "improved",
				items: [
					"Local mode no longer requires Homebrew — CMake (a build-from-source dependency) is the only prerequisite, and the official cmake.org installer works fine",
					"Default dictation hotkey shown as fn across the marketing site and download page",
					"Blog posts now render markdown tables properly",
				],
			},
		],
	},
	{
		version: "v0.1.3",
		date: "May 2, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Floating HUD orb shows dictation status and can be dragged anywhere on screen",
					"History table with grouping by date, one-click copy, and delete with confirmation",
					"Delete a dictation removes it from local storage and the cloud (including S3 audio)",
				],
			},
			{
				type: "improved",
				items: [
					"Local Ollama cleanup now respects your custom vocabulary",
					"Reuses an existing Ollama instance, warms up the model, and cleans up child processes on exit",
					"Tuned history group header contrast for readability",
				],
			},
			{
				type: "fixed",
				items: [
					"Paste now uses CGEvent for Cmd+V instead of osascript (more reliable)",
					"Audio buffer is cleared before each recording to prevent stale data",
					"Microphone permission prompt now appears correctly on macOS",
				],
			},
		],
	},
	{
		version: "v0.1.2",
		date: "April 30, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Competitor comparison pages and Compare link in the marketing site nav",
					"Four new blog posts",
					"Open Graph images and SEO metadata across marketing pages",
					"Enhanced download page with FAQ",
				],
			},
			{
				type: "improved",
				items: [
					"Subscribe flow replaces the old waitlist (new /subscribe route and component)",
					"API consolidated to PostgreSQL (SQLite support removed)",
				],
			},
			{
				type: "fixed",
				items: ["PATH resolution for GUI-launched apps on macOS"],
			},
			{
				type: "removed",
				items: ["Framer Motion animations from the setup wizard"],
			},
		],
	},
	{
		version: "v0.1.1",
		date: "April 29, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Download page dynamically fetches the latest release from GitHub",
				],
			},
			{
				type: "improved",
				items: [
					"CI now ships Apple Silicon-only builds; download page updated to match",
				],
			},
		],
	},
	{
		version: "v0.1.0",
		date: "April 29, 2026",
		tag: "Initial release",
		changes: [
			{
				type: "added",
				items: [
					"Native macOS menu bar app — press a hotkey, speak, and text appears at your cursor",
					"In-process Whisper transcription with Metal acceleration (whisper-rs)",
					"Customizable dictation hotkey with fn-key support",
					"Silent background auto-updater with sidebar banner",
					"Accessibility permission step in onboarding",
					"Centralized error handling with Sonner toast notifications",
					"GitHub Releases CI workflow for Tauri builds",
					"Marketing site, blog, and download page",
				],
			},
			{
				type: "improved",
				items: [
					"Local-first launch — free local mode for life, no account required",
					"Simplified onboarding with local-first default",
					"Friendlier model names in the setup wizard",
					"Safer copy-paste that handles missing accessibility permission",
					"Cleanup prompts hardened against instruction-following",
				],
			},
			{
				type: "removed",
				items: [
					"BYOK API keys section, cloud-setup route, and pricing page (cloud mode coming later)",
					"Standalone whisper.cpp server (replaced by in-process transcription)",
				],
			},
		],
	},
];
