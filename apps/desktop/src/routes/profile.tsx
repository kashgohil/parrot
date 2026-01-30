import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface Profile {
	custom_words: string;
	context_prompt: string;
	writing_style: string;
}

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const [words, setWords] = useState<string[]>([]);
	const [newWord, setNewWord] = useState("");
	const [contextPrompt, setContextPrompt] = useState("");
	const [writingStyle, setWritingStyle] = useState("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		loadProfile();
	}, []);

	async function loadProfile() {
		try {
			const profile = await invoke<Profile>("get_profile");
			try {
				setWords(JSON.parse(profile.custom_words));
			} catch {
				setWords([]);
			}
			setContextPrompt(profile.context_prompt);
			setWritingStyle(profile.writing_style);
		} catch (e) {
			console.error("Failed to load profile:", e);
		}
	}

	async function saveProfile() {
		try {
			await invoke("update_profile", {
				customWords: JSON.stringify(words),
				contextPrompt,
				writingStyle,
			});
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} catch (e) {
			console.error("Failed to save profile:", e);
		}
	}

	function addWord() {
		const w = newWord.trim();
		if (w && !words.includes(w)) {
			setWords([...words, w]);
			setNewWord("");
		}
	}

	function removeWord(word: string) {
		setWords(words.filter((w) => w !== word));
	}

	return (
		<div>
			<h2 className="text-[22px] font-semibold mb-4">Profile</h2>

			<div className="flex flex-col gap-5 max-w-[480px]">
				<div className="flex flex-col gap-1.5">
					<Label>Custom Vocabulary</Label>
					<span className="text-xs text-muted-foreground">
						Words and names the transcriber should recognize (brand names,
						jargon, people).
					</span>
					<div className="flex gap-2">
						<Input
							className="flex-1"
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
						<Button
							variant="outline"
							size="sm"
							onClick={addWord}
							className="shrink-0"
						>
							Add
						</Button>
					</div>
					{words.length > 0 && (
						<div className="flex flex-wrap gap-1.5 mt-1">
							{words.map((w) => (
								<Badge key={w} variant="secondary" className="gap-1">
									{w}
									<button
										className="bg-transparent border-none text-muted-foreground cursor-pointer text-xs p-0 px-0.5 leading-none hover:text-destructive"
										onClick={() => removeWord(w)}
									>
										x
									</button>
								</Badge>
							))}
						</div>
					)}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="contextPrompt">Context / Instructions</Label>
					<Textarea
						id="contextPrompt"
						value={contextPrompt}
						onChange={(e) => setContextPrompt(e.target.value)}
						placeholder="e.g. I'm a software engineer writing technical docs. Use American English."
						rows={4}
					/>
					<span className="text-xs text-muted-foreground">
						Tell the LLM about yourself so it can better clean up your
						dictations.
					</span>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="writingStyle">Writing Style</Label>
					<Textarea
						id="writingStyle"
						value={writingStyle}
						onChange={(e) => setWritingStyle(e.target.value)}
						placeholder="e.g. Concise and direct. No fluff. Use lowercase for casual messages."
						rows={3}
					/>
					<span className="text-xs text-muted-foreground">
						How should the cleaned text sound?
					</span>
				</div>

				<Button className="self-start" onClick={saveProfile}>
					{saved ? "Saved!" : "Save Profile"}
				</Button>
			</div>
		</div>
	);
}
