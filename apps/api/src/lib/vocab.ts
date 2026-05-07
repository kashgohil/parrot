export interface VocabEntry {
	term: string;
	context?: string;
}

// Parse the profile.customWords JSON. Each element may be a bare string
// (legacy) or an object { term, context? }. Malformed input yields an empty
// list — vocab is a hint, not a hard requirement.
export function parseVocab(customWordsJson: string | null | undefined): VocabEntry[] {
	if (!customWordsJson) return [];
	const trimmed = customWordsJson.trim();
	if (!trimmed || trimmed === "[]") return [];
	let raw: unknown;
	try {
		raw = JSON.parse(trimmed);
	} catch {
		return [];
	}
	if (!Array.isArray(raw)) return [];
	const out: VocabEntry[] = [];
	for (const item of raw) {
		if (typeof item === "string") {
			const term = item.trim();
			if (term) out.push({ term });
		} else if (item && typeof item === "object") {
			const { term, context } = item as { term?: unknown; context?: unknown };
			if (typeof term === "string" && term.trim()) {
				const ctx = typeof context === "string" && context.trim() ? context.trim() : undefined;
				out.push({ term: term.trim(), context: ctx });
			}
		}
	}
	return out;
}

export function unconditionalTerms(entries: VocabEntry[]): string[] {
	return entries.filter((e) => !e.context).map((e) => e.term);
}

// Sentence-style prompt that biases Whisper / OpenAI's `prompt` param.
export function whisperInitialPrompt(entries: VocabEntry[]): string | null {
	const terms = unconditionalTerms(entries);
	if (terms.length === 0) return null;
	return `Vocabulary hints: ${terms.join(", ")}.`;
}

// Cleanup-prompt section. Unconditional terms become "always spell as X";
// contextual terms become conditional rewrite rules.
export function cleanupVocabularySection(entries: VocabEntry[]): string | null {
	if (entries.length === 0) return null;
	const lines = ["\n\nVocabulary rules:"];
	for (const e of entries) {
		if (e.context) {
			lines.push(
				`\n- Spell as "${e.term}" when the surrounding text is about: ${e.context}. ` +
					`In any other context, leave the user's wording unchanged.`,
			);
		} else {
			lines.push(`\n- Always spell as "${e.term}" when this term appears.`);
		}
	}
	return lines.join("");
}
