import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

interface Profile {
	custom_words: string;
	context_prompt: string;
	writing_style: string;
}

function SettingsPage() {
	const [hotkey, setHotkey] = useState("CmdOrCtrl+Shift+Space");
	const [recording, setRecording] = useState(false);
	const [apiKey, setApiKey] = useState("");
	const [llmApiKey, setLlmApiKey] = useState("");
	const [useOwnKeys, setUseOwnKeys] = useState(false);
	const [saveAudio, setSaveAudio] = useState(false);
	const [saved, setSaved] = useState(false);
	const [contextPrompt, setContextPrompt] = useState("");
	const [writingStyle, setWritingStyle] = useState("");

	const keysRef = useRef<Set<string>>(new Set());
	const recorderRef = useRef<HTMLDivElement>(null);

	const startRecording = useCallback(() => {
		keysRef.current.clear();
		setRecording(true);
	}, []);

	useEffect(() => {
		if (!recording) return;

		const keyMap: Record<string, string> = {
			" ": "Space",
			ArrowUp: "Up",
			ArrowDown: "Down",
			ArrowLeft: "Left",
			ArrowRight: "Right",
			Escape: "Escape",
			Enter: "Enter",
			Backspace: "Backspace",
			Delete: "Delete",
			Tab: "Tab",
		};

		const modifierKeys = new Set(["Meta", "Control", "Alt", "Shift"]);

		function handleKeyDown(e: KeyboardEvent) {
			e.preventDefault();
			e.stopPropagation();
			keysRef.current.add(e.key);
		}

		function handleKeyUp(e: KeyboardEvent) {
			e.preventDefault();
			e.stopPropagation();

			const pressed = keysRef.current;
			if (pressed.size === 0) return;

			const parts: string[] = [];
			if (pressed.has("Meta") || pressed.has("Control"))
				parts.push("CmdOrCtrl");
			if (pressed.has("Alt")) parts.push("Alt");
			if (pressed.has("Shift")) parts.push("Shift");

			for (const k of pressed) {
				if (modifierKeys.has(k)) continue;
				parts.push(keyMap[k] || k.toUpperCase());
			}

			if (parts.length > 0) {
				setHotkey(parts.join("+"));
				setRecording(false);
			}

			keysRef.current.clear();
		}

		function handleClick(e: MouseEvent) {
			if (
				recorderRef.current &&
				!recorderRef.current.contains(e.target as Node)
			) {
				setRecording(false);
			}
		}

		window.addEventListener("keydown", handleKeyDown, true);
		window.addEventListener("keyup", handleKeyUp, true);
		const clickTimer = setTimeout(
			() => window.addEventListener("click", handleClick),
			0,
		);

		return () => {
			window.removeEventListener("keydown", handleKeyDown, true);
			window.removeEventListener("keyup", handleKeyUp, true);
			clearTimeout(clickTimer);
			window.removeEventListener("click", handleClick);
			keysRef.current.clear();
		};
	}, [recording]);

	useEffect(() => {
		loadSettings();
		loadProfile();
	}, []);

	async function loadSettings() {
		try {
			const hk = await invoke<string | null>("get_setting", { key: "hotkey" });
			if (hk) setHotkey(hk);
			const ak = await invoke<string | null>("get_setting", { key: "api_key" });
			if (ak) setApiKey(ak);
			const lk = await invoke<string | null>("get_setting", {
				key: "llm_api_key",
			});
			if (lk) setLlmApiKey(lk);
			if (ak || lk) setUseOwnKeys(true);
			const sa = await invoke<string | null>("get_setting", {
				key: "save_audio",
			});
			setSaveAudio(sa === "true");
		} catch (e) {
			console.error("Failed to load settings:", e);
		}
	}

	async function loadProfile() {
		try {
			const profile = await invoke<Profile>("get_profile");
			setContextPrompt(profile.context_prompt);
			setWritingStyle(profile.writing_style);
		} catch (e) {
			console.error("Failed to load profile:", e);
		}
	}

	async function saveAll() {
		try {
			await invoke("set_setting", { key: "hotkey", value: hotkey });
			await invoke("set_setting", { key: "api_key", value: apiKey });
			await invoke("set_setting", { key: "llm_api_key", value: llmApiKey });
			await invoke("set_setting", {
				key: "save_audio",
				value: saveAudio ? "true" : "false",
			});

			const profile = await invoke<Profile>("get_profile");
			await invoke("update_profile", {
				customWords: profile.custom_words,
				contextPrompt,
				writingStyle,
			});

			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} catch (e) {
			console.error("Failed to save:", e);
		}
	}

	return (
		<div>
			<div className="flex flex-col gap-5">
				{/* Hotkey */}
				<div className="flex flex-col gap-1.5">
					<Label>Hotkey</Label>
					{recording ? (
						<div
							ref={recorderRef}
							className="flex items-center justify-center h-10 rounded-md border-2 border-primary bg-primary/5 text-sm font-medium text-primary animate-pulse"
						>
							Press your key combination...
						</div>
					) : (
						<div className="flex gap-2 items-center">
							<kbd className="flex-1 flex items-center justify-center h-10 rounded-md border border-border bg-muted text-sm font-medium tracking-wide">
								{hotkey
									.replace(
										/CmdOrCtrl/g,
										navigator.platform.includes("Mac") ? "\u2318" : "Ctrl",
									)
									.replace(/Shift/g, "\u21E7")
									.replace(/Alt/g, "\u2325")
									.replace(/\+/g, " + ")}
							</kbd>
							<Button
								variant="outline"
								className="shrink-0 h-10"
								onClick={startRecording}
							>
								Record
							</Button>
						</div>
					)}
					<span className="text-xs text-muted-foreground">
						Click Record then press your desired key combination.
					</span>
				</div>

				<hr className="border-border" />

				{/* Writing Preferences */}
				<section>
					<h3 className="text-lg font-medium mb-1">Writing Preferences</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Configure how the LLM cleans up your dictations.
					</p>
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="contextPrompt" className="text-[15px]">
								Context / Instructions
							</Label>
							<Textarea
								id="contextPrompt"
								className="text-[15px]"
								value={contextPrompt}
								onChange={(e) => setContextPrompt(e.target.value)}
								placeholder="e.g. I'm a software engineer writing technical docs. Use American English."
								rows={4}
							/>
							<span className="text-sm text-muted-foreground">
								Tell the LLM about yourself so it can better clean up your
								dictations.
							</span>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="writingStyle" className="text-[15px]">
								Writing Style
							</Label>
							<Textarea
								id="writingStyle"
								className="text-[15px]"
								value={writingStyle}
								onChange={(e) => setWritingStyle(e.target.value)}
								placeholder="e.g. Concise and direct. No fluff. Use lowercase for casual messages."
								rows={3}
							/>
							<span className="text-sm text-muted-foreground">
								How should the cleaned text sound?
							</span>
						</div>
					</div>
				</section>

				<hr className="border-border" />

				{/* API Keys */}
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<div className="flex flex-col gap-0.5">
							<Label>Use my own API keys</Label>
							<span className="text-xs text-muted-foreground max-w-sm">
								By default, Parrot handles everything for you. Turn this on if
								you'd rather use your own API keys.
							</span>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={useOwnKeys}
							onClick={() => setUseOwnKeys(!useOwnKeys)}
							className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
								useOwnKeys ? "bg-primary" : "bg-muted"
							}`}
						>
							<span
								className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
									useOwnKeys ? "translate-x-5" : "translate-x-0"
								}`}
							/>
						</button>
					</div>

					{useOwnKeys && (
						<div className="flex flex-col gap-4 pt-1">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="apiKey">Transcription API Key</Label>
								<Input
									id="apiKey"
									type="password"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
									placeholder="Your transcription provider key"
								/>
								<span className="text-xs text-muted-foreground">
									The key used to turn your voice into text (e.g. OpenAI
									Whisper, Deepgram, ElevenLabs).
								</span>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="llmApiKey">Cleanup API Key (OpenAI)</Label>
								<Input
									id="llmApiKey"
									type="password"
									value={llmApiKey}
									onChange={(e) => setLlmApiKey(e.target.value)}
									placeholder="Your OpenAI key for text cleanup"
								/>
								<span className="text-xs text-muted-foreground">
									Optional — powers the AI that tidies up your transcriptions.
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Save Audio */}
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-0.5">
						<Label htmlFor="saveAudio">Save audio recordings</Label>
						<span className="text-xs text-muted-foreground">
							Keep WAV files after transcription
						</span>
					</div>
					<button
						id="saveAudio"
						type="button"
						role="switch"
						aria-checked={saveAudio}
						onClick={() => setSaveAudio(!saveAudio)}
						className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
							saveAudio ? "bg-primary" : "bg-muted"
						}`}
					>
						<span
							className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg transition-transform ${
								saveAudio ? "translate-x-5" : "translate-x-0"
							}`}
						/>
					</button>
				</div>

				<Button className="self-start" onClick={saveAll}>
					{saved ? "Saved!" : "Save"}
				</Button>
			</div>
		</div>
	);
}
