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
