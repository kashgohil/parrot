import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";
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

	return (
		<div>
			<p className="text-sm text-muted-foreground mb-4">
				Words and names the transcriber should recognize (brand names, jargon,
				people).
			</p>

			<div className="flex gap-2">
				<Input
					className="flex-1 h-10 text-[15px]"
					value={newWord}
					onChange={(e) => setNewWord(e.target.value)}
					placeholder="Add a word..."
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							addWord();
						}
					}}
				/>
				<Button variant="outline" onClick={addWord} className="shrink-0 h-10">
					Add
				</Button>
			</div>

			{words.length > 0 && (
				<div className="mt-3 rounded-lg border border-border divide-y divide-border">
					{words.map((w) => (
						<div
							key={w}
							className="flex items-center justify-between px-4 py-2.5 group"
						>
							<span className="text-[15px] font-medium">{w}</span>
							<button
								className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded"
								onClick={() => removeWord(w)}
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					))}
				</div>
			)}

			<Button className="self-start mt-5" onClick={saveWords}>
				{saved ? "Saved!" : "Save"}
			</Button>
		</div>
	);
}
