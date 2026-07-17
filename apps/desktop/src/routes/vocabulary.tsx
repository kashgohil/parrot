import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { BookA, Check, Plus, Save, Search, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/vocabulary")({
	component: VocabularyPage,
});

interface Profile {
	custom_words: string;
	context_prompt: string;
	writing_style: string;
}

interface VocabEntry {
	term: string;
	context?: string;
}

// Parse stored JSON, accepting both legacy bare strings and the new
// { term, context? } object form. Anything malformed is dropped silently.
function parseEntries(json: string): VocabEntry[] {
	try {
		const raw = JSON.parse(json);
		if (!Array.isArray(raw)) return [];
		const out: VocabEntry[] = [];
		for (const item of raw) {
			if (typeof item === "string") {
				const t = item.trim();
				if (t) out.push({ term: t });
			} else if (item && typeof item === "object") {
				const term = typeof item.term === "string" ? item.term.trim() : "";
				const context =
					typeof item.context === "string" && item.context.trim()
						? item.context.trim()
						: undefined;
				if (term) out.push({ term, context });
			}
		}
		return out;
	} catch {
		return [];
	}
}

// Drop the `context` field when empty so legacy consumers still see plain
// strings… actually keep it as objects for consistency with the new schema —
// the Rust + API parsers both handle objects.
function serializeEntries(entries: VocabEntry[]): string {
	return JSON.stringify(
		entries.map((e) => (e.context ? { term: e.term, context: e.context } : { term: e.term })),
	);
}

interface VocabSuggestion {
	term: string;
	seen_as: string;
	count: number;
}

function VocabularyPage() {
	const [entries, setEntries] = useState<VocabEntry[]>([]);
	const [newTerm, setNewTerm] = useState("");
	const [newContext, setNewContext] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [saved, setSaved] = useState(false);
	const [suggestions, setSuggestions] = useState<VocabSuggestion[]>([]);

	useEffect(() => {
		loadEntries();
		loadSuggestions();
	}, []);

	async function loadEntries() {
		try {
			const profile = await invoke<Profile>("get_profile");
			setEntries(parseEntries(profile.custom_words));
		} catch (e) {
			console.error("Failed to load vocabulary:", e);
		}
	}

	async function loadSuggestions() {
		try {
			const s = await invoke<VocabSuggestion[]>("suggest_vocab_from_history");
			setSuggestions(s);
		} catch (e) {
			console.error("Failed to load vocab suggestions:", e);
		}
	}

	async function saveEntries() {
		try {
			const profile = await invoke<Profile>("get_profile");
			await invoke("update_profile", {
				customWords: serializeEntries(entries),
				contextPrompt: profile.context_prompt,
				writingStyle: profile.writing_style,
			});
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} catch (e) {
			console.error("Failed to save vocabulary:", e);
		}
	}

	function addEntry() {
		const term = newTerm.trim();
		if (!term) return;
		if (entries.some((e) => e.term.toLowerCase() === term.toLowerCase())) return;
		const context = newContext.trim() || undefined;
		setEntries([{ term, context }, ...entries]);
		setNewTerm("");
		setNewContext("");
	}

	function removeEntry(term: string) {
		setEntries(entries.filter((e) => e.term !== term));
	}

	const filtered = entries.filter(
		(e) =>
			e.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(e.context?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
	);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-foreground tracking-tight">
					Vocabulary
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Teach Parrot words it should recognize
				</p>
			</div>

			<div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
				<Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
				<div className="space-y-1">
					<p className="text-sm text-foreground">
						Add words Parrot should recognize correctly — names, jargon, technical
						terms.
					</p>
					<p className="text-xs text-muted-foreground">
						Optionally add a "use when" hint so Parrot only applies the spelling in
						the right context (e.g. "Tauri" when discussing software, leave "tory"
						alone when discussing politics). Near-misses are also fixed
						automatically before cleanup.
					</p>
				</div>
			</div>

			{suggestions.length > 0 && (
				<div className="bg-card rounded-2xl border border-border p-5 space-y-3">
					<div className="flex items-start gap-3">
						<div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
							<Sparkles className="w-5 h-5 text-amber-600" />
						</div>
						<div>
							<h2 className="text-base font-semibold text-foreground">
								Learned from your history
							</h2>
							<p className="text-sm text-muted-foreground">
								Words cleanup often corrects — add them so dictation gets them
								right the first time.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						{suggestions.map((s) => (
							<button
								key={s.term}
								type="button"
								onClick={() => {
									if (
										entries.some(
											(e) => e.term.toLowerCase() === s.term.toLowerCase(),
										)
									) {
										return;
									}
									setEntries([{ term: s.term }, ...entries]);
									setSuggestions(suggestions.filter((x) => x.term !== s.term));
								}}
								className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 text-sm transition-colors"
							>
								<span className="font-medium">{s.term}</span>
								<span className="text-xs text-muted-foreground">
									was &ldquo;{s.seen_as}&rdquo; ×{s.count}
								</span>
								<Plus className="w-3.5 h-3.5 text-primary" />
							</button>
						))}
					</div>
				</div>
			)}

			<div className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-4">
					<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
						<Plus className="w-5 h-5 text-primary" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-foreground">Add Word</h2>
						<p className="text-sm text-muted-foreground">
							Term is required. Context is optional.
						</p>
					</div>
				</div>

				<div className="space-y-3">
					<Input
						className="h-12 text-base"
						value={newTerm}
						onChange={(e) => setNewTerm(e.target.value)}
						placeholder="Term — e.g. Tauri, Gujarati, Kubernetes"
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								addEntry();
							}
						}}
					/>
					<Input
						className="h-12 text-base"
						value={newContext}
						onChange={(e) => setNewContext(e.target.value)}
						placeholder="Use when — e.g. software development (optional)"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addEntry();
							}
						}}
					/>
					<Button
						onClick={addEntry}
						className="h-12 px-6 w-full sm:w-auto"
						disabled={!newTerm.trim()}
					>
						<Plus className="w-4 h-4 mr-2" />
						Add
					</Button>
				</div>
			</div>

			{entries.length > 0 && (
				<div className="bg-card rounded-2xl border border-border p-5">
					<div className="flex items-start gap-4 mb-4">
						<div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
							<BookA className="w-5 h-5 text-purple-500" />
						</div>
						<div className="flex-1">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-base font-semibold text-foreground">
										Your Words
									</h2>
									<p className="text-sm text-muted-foreground">
										{entries.length} word{entries.length !== 1 ? "s" : ""} saved
									</p>
								</div>
								{entries.length > 5 && (
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
										<Input
											className="pl-9 h-9 w-40 text-sm"
											type="text"
											placeholder="Filter..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						{filtered.map((entry) => (
							<div
								key={entry.term}
								className="group flex items-center gap-3 px-4 py-2.5 bg-muted rounded-xl border border-transparent hover:border-primary/30 transition-all"
							>
								<span className="text-sm font-medium text-foreground">
									{entry.term}
								</span>
								{entry.context && (
									<span className="text-xs text-muted-foreground italic">
										when {entry.context}
									</span>
								)}
								<button
									type="button"
									onClick={() => removeEntry(entry.term)}
									className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						))}
					</div>

					{filtered.length === 0 && searchQuery && (
						<p className="text-sm text-muted-foreground text-center py-4">
							No words match "{searchQuery}"
						</p>
					)}
				</div>
			)}

			{entries.length === 0 && (
				<div className="text-center py-12 px-4">
					<div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
						<BookA className="w-8 h-8 text-muted-foreground/50" />
					</div>
					<h3 className="text-lg font-semibold text-foreground mb-1">
						No words yet
					</h3>
					<p className="text-sm text-muted-foreground max-w-xs mx-auto">
						Add words above to help Parrot recognize names, jargon, and technical
						terms correctly
					</p>
				</div>
			)}

			<div className="pt-4">
				<Button
					onClick={saveEntries}
					size="lg"
					className="w-full sm:w-auto px-8"
					disabled={saved}
				>
					{saved ? (
						<>
							<Check className="w-4 h-4 mr-2" />
							Saved!
						</>
					) : (
						<>
							<Save className="w-4 h-4 mr-2" />
							Save Changes
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
