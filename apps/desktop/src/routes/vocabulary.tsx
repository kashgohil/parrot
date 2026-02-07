import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { X, Plus, BookA, Search, Sparkles, Save, Check } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/vocabulary")({
	component: VocabularyPage,
});

interface Profile {
	custom_words: string;
	context_prompt: string;
	writing_style: string;
}

function VocabularyPage() {
	const [words, setWords] = useState<string[]>([]);
	const [newWord, setNewWord] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		loadWords();
	}, []);

	async function loadWords() {
		try {
			const profile = await invoke<Profile>("get_profile");
			try {
				setWords(JSON.parse(profile.custom_words));
			} catch {
				setWords([]);
			}
		} catch (e) {
			console.error("Failed to load vocabulary:", e);
		}
	}

	async function saveWords() {
		try {
			const profile = await invoke<Profile>("get_profile");
			await invoke("update_profile", {
				customWords: JSON.stringify(words),
				contextPrompt: profile.context_prompt,
				writingStyle: profile.writing_style,
			});
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} catch (e) {
			console.error("Failed to save vocabulary:", e);
		}
	}

	function addWord() {
		const w = newWord.trim();
		if (w && !words.includes(w)) {
			setWords([w, ...words]);
			setNewWord("");
		}
	}

	function removeWord(word: string) {
		setWords(words.filter((w) => w !== word));
	}

	const filteredWords = words.filter(w => 
		w.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const suggestions = [
		"Proper nouns (names, places)",
		"Technical jargon",
		"Medical terms",
		"Company names",
		"Product names",
		"Acronyms",
	];

	return (
		<div className="space-y-6">
			{/* Page header */}
			<div>
				<h1 className="text-2xl font-bold text-foreground tracking-tight">
					Vocabulary
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Teach Parrot words it should recognize
				</p>
			</div>

			{/* Info card */}
			<div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
				<Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
				<div>
					<p className="text-sm text-foreground">
						Add words that Parrot should recognize correctly — names, jargon, technical terms, etc.
					</p>
				</div>
			</div>

			{/* Add word section */}
			<div className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-4">
					<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
						<Plus className="w-5 h-5 text-primary" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-foreground">Add Words</h2>
						<p className="text-sm text-muted-foreground">
							Enter a word and press Enter or click Add
						</p>
					</div>
				</div>

				<div className="flex gap-3">
					<Input
						className="flex-1 h-12 text-base"
						value={newWord}
						onChange={(e) => setNewWord(e.target.value)}
						placeholder="e.g. Kubernetes, HIPAA, McDonald's..."
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addWord();
							}
						}}
					/>
					<Button 
						onClick={addWord} 
						className="h-12 px-6"
						disabled={!newWord.trim()}
					>
						<Plus className="w-4 h-4 mr-2" />
						Add
					</Button>
				</div>

				{/* Suggestions */}
				<div className="mt-4">
					<p className="text-xs font-medium text-muted-foreground mb-2">Examples:</p>
					<div className="flex flex-wrap gap-2">
						{suggestions.map((suggestion) => (
							<button
								key={suggestion}
								onClick={() => setNewWord(suggestion)}
								className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
							>
								{suggestion}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Words list section */}
			{words.length > 0 && (
				<div className="bg-card rounded-2xl border border-border p-5">
					<div className="flex items-start gap-4 mb-4">
						<div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
							<BookA className="w-5 h-5 text-purple-500" />
						</div>
						<div className="flex-1">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-base font-semibold text-foreground">Your Words</h2>
									<p className="text-sm text-muted-foreground">
										{words.length} word{words.length !== 1 ? "s" : ""} saved
									</p>
								</div>
								{words.length > 5 && (
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

					<div className="flex flex-wrap gap-2">
						{filteredWords.map((word) => (
							<div
								key={word}
								className="group flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl border border-transparent hover:border-primary/30 transition-all"
							>
								<span className="text-sm font-medium text-foreground">{word}</span>
								<button
									onClick={() => removeWord(word)}
									className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>
						))}
					</div>

					{filteredWords.length === 0 && searchQuery && (
						<p className="text-sm text-muted-foreground text-center py-4">
							No words match "{searchQuery}"
						</p>
					)}
				</div>
			)}

			{/* Empty state */}
			{words.length === 0 && (
				<div className="text-center py-12 px-4">
					<div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
						<BookA className="w-8 h-8 text-muted-foreground/50" />
					</div>
					<h3 className="text-lg font-semibold text-foreground mb-1">
						No words yet
					</h3>
					<p className="text-sm text-muted-foreground max-w-xs mx-auto">
						Add words above to help Parrot recognize names, jargon, and technical terms correctly
					</p>
				</div>
			)}

			{/* Save button */}
			<div className="pt-4">
				<Button 
					onClick={saveWords}
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
