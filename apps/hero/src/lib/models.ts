/**
 * Local models Parrot ships with, as the marketing site describes them.
 *
 * Mirrors CLEANUP_TIERS in apps/desktop/src/routes/settings.tsx; models.test.ts
 * fails if an id or download size drifts from the app.
 */

export type CleanupTier = {
	id: string;
	name: "Basic" | "Standard" | "Large";
	model: string;
	size: string;
	recommended: boolean;
	/** Site copy, paraphrasing the app's description. */
	blurb: string;
};

export const CLEANUP_TIERS: readonly CleanupTier[] = [
	{
		id: "qwen2.5-0.5b-instruct-q4_k_m",
		name: "Basic",
		model: "Qwen2.5 0.5B Instruct",
		size: "491 MB",
		recommended: true,
		blurb: "Lowest memory use and the fastest cleanup in our local tests.",
	},
	{
		id: "qwen2.5-1.5b-instruct-q4_k_m",
		name: "Standard",
		model: "Qwen2.5 1.5B Instruct",
		size: "1.12 GB",
		recommended: false,
		blurb:
			"Passed more English punctuation and capitalization checks, at about twice Basic's cleanup time.",
	},
	{
		id: "qwen2.5-3b-instruct-q4_k_m",
		name: "Large",
		model: "Qwen2.5 3B Instruct",
		size: "2.10 GB",
		recommended: false,
		blurb:
			"Fewer rejected suggestions in our tests. Slowest, and uses the most memory.",
	},
];

/**
 * Speech models, mirroring `models()` in
 * apps/desktop/src-tauri/src/speech_capabilities.rs (checked by models.test.ts).
 */
export type SpeechModel = {
	id: string;
	model: string;
	/** Download size exactly as the app shows it. */
	size: string;
	recommended: boolean;
	blurb: string;
	experimental?: string;
};

export const SPEECH_MODELS: readonly SpeechModel[] = [
	{
		id: "parakeet-v3",
		model: "Parakeet TDT 0.6B v3",
		size: "~450 MB",
		recommended: true,
		blurb:
			"The fast default. Detects 25 European languages, including English, on its own.",
	},
	{
		id: "large-v3-turbo",
		model: "Whisper large-v3-turbo",
		size: "~600 MB",
		recommended: false,
		blurb: "100 languages, including Hindi and Cantonese, with language hints.",
		experimental: "Hindi–English mixing",
	},
	{
		id: "small-q5_1",
		model: "Whisper small",
		size: "~181 MiB",
		recommended: false,
		blurb: "99 languages with lower memory use than turbo.",
	},
	{
		id: "small.en",
		model: "Whisper small.en",
		size: "~500 MB",
		recommended: false,
		blurb: "English only.",
	},
];
