// import { CloudMigration } from "@/components/cloud-migration";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Save, Wand2, Database, Check } from "lucide-react";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

interface Profile {
	custom_words: string;
	context_prompt: string;
	writing_style: string;
}

function SettingsPage() {
	const [hotkey, setHotkey] = useState("");
	const [defaultHotkey, setDefaultHotkey] = useState("");
	const [platform, setPlatform] = useState<string>("");
	const [recording, setRecording] = useState(false);
	const [hotkeyDirty, setHotkeyDirty] = useState(false);
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
				const next = parts.join("+");
				setHotkey(next);
				setHotkeyDirty(true);
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
			const def = await invoke<{ default: string; platform: string }>(
				"get_default_dictation_hotkey",
			);
			setDefaultHotkey(def.default);
			setPlatform(def.platform);
			const hk = await invoke<string | null>("get_setting", { key: "hotkey" });
			setHotkey(hk && hk.trim() ? hk : def.default);
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

	function formatHotkey(hk: string): string {
		if (hk.toLowerCase() === "fn") return "fn";
		return hk
			.replace(/CmdOrCtrl/g, navigator.platform.includes("Mac") ? "⌘" : "Ctrl")
			.replace(/Shift/g, "⇧")
			.replace(/Alt/g, "⌥")
			.replace(/Space/g, "Space")
			.replace(/Plus/g, "+")
			.replace(/\+/g, " + ");
	}

	function setFnHotkey() {
		setHotkey("fn");
		setHotkeyDirty(true);
		setRecording(false);
	}

	function resetHotkey() {
		setHotkey(defaultHotkey);
		setHotkeyDirty(true);
	}

	return (
		<div className="space-y-8">
			{/* Page header */}
			<div>
				<h1 className="text-2xl font-bold text-foreground tracking-tight">
					Settings
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Customize how Parrot works for you
				</p>
			</div>

			{/* Hotkey Section */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-4">
					<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
						<Keyboard className="w-5 h-5 text-primary" />
					</div>
					<div className="flex-1">
						<h2 className="text-base font-semibold text-foreground">
							Dictation shortcut
						</h2>
						<p className="text-sm text-muted-foreground">
							Hold to record, release to transcribe.
						</p>
					</div>
				</div>

				<div className="space-y-3">
					{recording ? (
						<div
							ref={recorderRef}
							className="flex items-center justify-center h-14 rounded-xl border-2 border-primary bg-primary/5 text-base font-semibold text-primary animate-pulse"
						>
							Press your key combination...
						</div>
					) : (
						<div className="flex gap-3 items-center">
							<div className="flex-1 flex items-center justify-center h-14 rounded-xl border border-border bg-muted">
								<kbd className="text-lg font-mono font-semibold tracking-wider text-foreground">
									{formatHotkey(hotkey)}
								</kbd>
							</div>
							<Button
								variant="outline"
								onClick={startRecording}
								className="h-14 px-5"
							>
								Record
							</Button>
						</div>
					)}

					<div className="flex flex-wrap items-center gap-2 text-xs">
						{platform === "macos" && hotkey.toLowerCase() !== "fn" && (
							<button
								type="button"
								onClick={setFnHotkey}
								className="text-primary hover:underline"
							>
								Use fn key instead
							</button>
						)}
						{hotkey !== defaultHotkey && defaultHotkey && (
							<button
								type="button"
								onClick={resetHotkey}
								className="text-muted-foreground hover:text-foreground hover:underline"
							>
								Reset to default ({formatHotkey(defaultHotkey)})
							</button>
						)}
					</div>

					<p className="text-xs text-muted-foreground">
						{recording
							? "Press the key or combination you want to use, or click outside to cancel."
							: platform === "macos"
								? "Click Record to capture a custom combination, or use the fn key for one-press dictation."
								: "Click Record, then press your desired key combination."}
					</p>

					{hotkeyDirty && (
						<div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
							<span className="font-semibold">Restart required.</span>
							<span>
								Save your changes and restart Parrot for the new shortcut to
								take effect.
							</span>
						</div>
					)}
				</div>
			</section>

			{/* Writing Preferences Section */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-5">
					<div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
						<Wand2 className="w-5 h-5 text-purple-500" />
					</div>
					<div className="flex-1">
						<h2 className="text-base font-semibold text-foreground">Writing Preferences</h2>
						<p className="text-sm text-muted-foreground">
							Configure how the AI cleans up your dictations
						</p>
					</div>
				</div>

				<div className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="contextPrompt" className="text-sm font-medium">
							Context / Instructions
						</Label>
						<Textarea
							id="contextPrompt"
							value={contextPrompt}
							onChange={(e) => setContextPrompt(e.target.value)}
							placeholder="e.g. I'm a software engineer writing technical docs. Use American English."
							rows={3}
							className="resize-none"
						/>
						<p className="text-xs text-muted-foreground">
							Tell the AI about yourself so it can better clean up your dictations
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="writingStyle" className="text-sm font-medium">
							Writing Style
						</Label>
						<Textarea
							id="writingStyle"
							value={writingStyle}
							onChange={(e) => setWritingStyle(e.target.value)}
							placeholder="e.g. Concise and direct. No fluff. Use lowercase for casual messages."
							rows={3}
							className="resize-none"
						/>
						<p className="text-xs text-muted-foreground">
							How should the cleaned text sound?
						</p>
					</div>
				</div>
			</section>

			{/* Data Section */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-4">
					<div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
						<Database className="w-5 h-5 text-amber-500" />
					</div>
					<div className="flex-1">
						<h2 className="text-base font-semibold text-foreground">Data Storage</h2>
						<p className="text-sm text-muted-foreground">
							Control how your recordings are stored
						</p>
					</div>
				</div>

				<div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
					<div>
						<p className="text-sm font-medium text-foreground">Save audio recordings</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Keep WAV files after transcription on your device
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={saveAudio}
						onClick={() => setSaveAudio(!saveAudio)}
						className={`
							relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
							transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
							${saveAudio ? "bg-primary" : "bg-muted-foreground/30"}
						`}
					>
						<span
							className={`
								pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
								transition-transform duration-200 ease-in-out
								${saveAudio ? "translate-x-5" : "translate-x-0"}
							`}
						/>
					</button>
				</div>
			</section>

			{/* Cloud sync - hidden until cloud mode is available */}
			{/* <CloudMigration /> */}

			{/* Save button */}
			<div className="pt-4">
				<Button 
					onClick={saveAll}
					size="lg"
					className="w-full sm:w-auto px-8"
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
