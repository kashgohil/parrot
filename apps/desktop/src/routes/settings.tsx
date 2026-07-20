import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Keyboard,
	Save,
	Wand2,
	Database,
	Check,
	ShieldCheck,
	Mic,
	Accessibility,
	ExternalLink,
	AppWindow,
	Plus,
	Trash2,
} from "lucide-react";
import {
	isMissing,
	openPermissionSettings,
	usePermissions,
	type PermissionState,
} from "@/lib/permissions";

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
	const [cleanupMode, setCleanupMode] = useState<
		"off" | "background" | "blocking"
	>("blocking");
	const [formality, setFormality] = useState<"casual" | "neutral" | "formal">(
		"neutral",
	);
	const [sttEngine, setSttEngine] = useState("whisper");
	const [sttModel, setSttModel] = useState("");
	const [sttLanguage, setSttLanguage] = useState("auto");
	const [sttSwitching, setSttSwitching] = useState(false);
	const [sttProgress, setSttProgress] = useState<string | null>(null);
	const [cleanupBackend, setCleanupBackend] = useState<"builtin" | "ollama">(
		"builtin",
	);
	const [canUpgradeCleanup, setCanUpgradeCleanup] = useState(false);
	const [cleanupUpgrading, setCleanupUpgrading] = useState(false);
	const [cleanupProgress, setCleanupProgress] = useState<string | null>(null);
	const [cleanupModel, setCleanupModel] = useState(
		"qwen2.5-0.5b-instruct-q4_k_m",
	);

	const keysRef = useRef<Set<string>>(new Set());
	const recorderRef = useRef<HTMLDivElement>(null);

	const STT_TIERS = [
		{
			id: "parakeet-v3",
			name: "Fast (Parakeet)",
			desc: "Default. More accurate than models 10× its size. ~80–150ms.",
		},
		{
			id: "large-v3-turbo",
			name: "Multilingual (Whisper turbo)",
			desc: "99 languages. Quantized large-v3-turbo on Metal.",
		},
		{
			id: "small.en",
			name: "Low RAM (Whisper small.en)",
			desc: "Fallback for older machines with limited memory.",
		},
	] as const;

	const CLEANUP_TIERS = [
		{
			id: "qwen2.5-0.5b-instruct-q4_k_m",
			name: "Basic",
			desc: "Smallest & fastest. ~0.5 GB. Light touch-up only.",
		},
		{
			id: "qwen2.5-1.5b-instruct-q4_k_m",
			name: "Fast (recommended)",
			desc: "Much better punctuation, filler removal & tone. ~1 GB download.",
		},
		{
			id: "qwen2.5-3b-instruct-q4_k_m",
			name: "Best",
			desc: "Highest quality, including formal rewrites. ~2 GB, a bit slower.",
		},
	] as const;

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
			const cm = await invoke<string | null>("get_setting", {
				key: "cleanup_mode",
			});
			if (cm === "off" || cm === "background" || cm === "blocking") {
				setCleanupMode(cm);
			} else {
				setCleanupMode("blocking");
			}
			const fm = await invoke<string | null>("get_setting", {
				key: "cleanup_formality",
			});
			if (fm === "casual" || fm === "neutral" || fm === "formal") {
				setFormality(fm);
			} else {
				setFormality("neutral");
			}
			const stt = await invoke<{
				engine: string;
				model_id: string;
				language: string;
			}>("get_stt_status");
			setSttEngine(stt.engine || "whisper");
			setSttModel(stt.model_id || "");
			setSttLanguage(stt.language || "auto");
			const cleanup = await invoke<{
				backend: string;
				can_upgrade_to_builtin: boolean;
				active_model_id: string;
			}>("get_cleanup_status");
			setCleanupBackend(
				cleanup.backend === "ollama" ? "ollama" : "builtin",
			);
			setCanUpgradeCleanup(!!cleanup.can_upgrade_to_builtin);
			if (cleanup.active_model_id) setCleanupModel(cleanup.active_model_id);
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
			await invoke("set_setting", {
				key: "cleanup_mode",
				value: cleanupMode,
			});
			await invoke("set_setting", {
				key: "cleanup_formality",
				value: formality,
			});
			await invoke("set_setting", {
				key: "stt_language",
				value: sttLanguage,
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

			{/* Permissions Section */}
			<PermissionsSection />

			{/* Transcription engine */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-5">
					<div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
						<Mic className="w-5 h-5 text-sky-600" />
					</div>
					<div className="flex-1">
						<h2 className="text-base font-semibold text-foreground">
							Speech model
						</h2>
						<p className="text-sm text-muted-foreground">
							Local transcription engine. Parakeet is faster and more accurate
							for English; Whisper covers 99 languages.
						</p>
					</div>
				</div>

				<div className="space-y-3">
					{STT_TIERS.map((tier) => {
						const selected = sttModel === tier.id || (!sttModel && tier.id === "parakeet-v3" && sttEngine === "parakeet");
						const isLegacyWhisper =
							sttEngine === "whisper" &&
							!STT_TIERS.some((t) => t.id === sttModel) &&
							tier.id === "parakeet-v3";
						return (
							<button
								key={tier.id}
								type="button"
								disabled={sttSwitching}
								onClick={async () => {
									if (sttModel === tier.id || sttSwitching) return;
									setSttSwitching(true);
									setSttProgress("Starting download…");
									try {
										const { listen } = await import("@tauri-apps/api/event");
										const unsub = await listen<{
											message: string;
											progress: number;
										}>("stt-model-download-progress", (e) => {
											setSttProgress(
												`${e.payload.message} (${Math.round(e.payload.progress)}%)`,
											);
										});
										const res = await invoke<{
											engine: string;
											model_id: string;
											ready: boolean;
										}>("switch_stt_model", { modelId: tier.id });
										unsub();
										setSttEngine(res.engine);
										setSttModel(res.model_id);
										setSttProgress(
											res.ready ? "Ready" : "Loaded — warming up…",
										);
										setTimeout(() => setSttProgress(null), 2500);
									} catch (e) {
										console.error(e);
										setSttProgress(
											`Failed: ${e instanceof Error ? e.message : String(e)}`,
										);
									} finally {
										setSttSwitching(false);
									}
								}}
								className={`text-left p-3 rounded-xl border transition-colors w-full disabled:opacity-60 ${
									selected || isLegacyWhisper
										? "border-primary bg-primary/5"
										: "border-border bg-muted/30 hover:bg-muted/50"
								}`}
							>
								<p className="text-sm font-medium text-foreground flex items-center gap-2">
									{tier.name}
									{isLegacyWhisper && (
										<span className="text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
											Upgrade available
										</span>
									)}
									{selected && !isLegacyWhisper && (
										<span className="text-[10px] uppercase tracking-wide font-semibold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded">
											Active
										</span>
									)}
								</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									{tier.desc}
								</p>
							</button>
						);
					})}

					{sttEngine === "whisper" &&
						sttModel &&
						!STT_TIERS.some((t) => t.id === sttModel) && (
							<p className="text-xs text-muted-foreground">
								Currently using your existing Whisper model (
								<span className="font-mono">{sttModel || "custom"}</span>
								). Switch to Fast (Parakeet) for a large speed + accuracy jump.
							</p>
						)}

					{sttProgress && (
						<p className="text-xs text-primary font-medium">{sttProgress}</p>
					)}

					<div className="space-y-2 pt-2">
						<Label htmlFor="sttLanguage" className="text-sm font-medium">
							Language
						</Label>
						<Select value={sttLanguage} onValueChange={setSttLanguage}>
							<SelectTrigger
								id="sttLanguage"
								className="w-full h-10 rounded-xl border-border bg-muted/50"
							>
								<SelectValue placeholder="Select language" />
							</SelectTrigger>
							<SelectContent position="popper" className="rounded-xl">
								<SelectItem value="auto">Auto-detect</SelectItem>
								<SelectItem value="en">English</SelectItem>
								<SelectItem value="es">Spanish</SelectItem>
								<SelectItem value="fr">French</SelectItem>
								<SelectItem value="de">German</SelectItem>
								<SelectItem value="it">Italian</SelectItem>
								<SelectItem value="pt">Portuguese</SelectItem>
								<SelectItem value="nl">Dutch</SelectItem>
								<SelectItem value="pl">Polish</SelectItem>
								<SelectItem value="ru">Russian</SelectItem>
								<SelectItem value="ja">Japanese</SelectItem>
								<SelectItem value="zh">Chinese</SelectItem>
								<SelectItem value="ko">Korean</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Whisper uses this for decoding; Parakeet auto-detects. Prefer Auto
							unless you always dictate in one language.
						</p>
					</div>
				</div>
			</section>

			{/* Cleanup backend */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-4">
					<div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
						<Wand2 className="w-5 h-5 text-emerald-600" />
					</div>
					<div className="flex-1">
						<h2 className="text-base font-semibold text-foreground">
							Cleanup engine
						</h2>
						<p className="text-sm text-muted-foreground">
							How Parrot polishes grammar and filler words after dictation.
						</p>
					</div>
				</div>

				<div className="space-y-3">
					<div className="p-3 rounded-xl border border-border bg-muted/30">
						<p className="text-sm font-medium text-foreground">
							{cleanupBackend === "builtin"
								? "Built-in (on-device)"
								: "Ollama (legacy)"}
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							{cleanupBackend === "builtin"
								? "Runs a small model inside Parrot — no third-party apps or admin password."
								: "Uses the Ollama daemon you installed earlier. You can switch to the built-in engine and drop Ollama."}
						</p>
					</div>

					<div className="space-y-2">
						<Label className="text-sm font-medium">Cleanup quality</Label>
						<p className="text-xs text-muted-foreground">
							Bigger models punctuate, de-fill, and formalize better, at the cost
							of size and a little speed. Picking one downloads it and switches
							cleanup over{canUpgradeCleanup ? " (and drops Ollama)" : ""}.
						</p>
						{CLEANUP_TIERS.map((tier) => {
							const selected = cleanupModel === tier.id;
							return (
								<button
									key={tier.id}
									type="button"
									disabled={cleanupUpgrading}
									onClick={async () => {
										if (cleanupModel === tier.id || cleanupUpgrading) return;
										setCleanupUpgrading(true);
										setCleanupProgress("Starting download…");
										try {
											const { listen } = await import("@tauri-apps/api/event");
											const unsub = await listen<{
												message: string;
												progress: number;
											}>("cleanup-model-download-progress", (e) => {
												setCleanupProgress(
													`${e.payload.message} (${Math.round(e.payload.progress)}%)`,
												);
											});
											const res = await invoke<{
												model_id: string;
												ready: boolean;
											}>("switch_cleanup_model", { modelId: tier.id });
											unsub();
											setCleanupModel(res.model_id);
											setCleanupBackend("builtin");
											setCanUpgradeCleanup(false);
											setCleanupProgress(
												res.ready ? "Ready" : "Downloaded — loading model…",
											);
											setTimeout(() => setCleanupProgress(null), 3000);
										} catch (e) {
											console.error(e);
											setCleanupProgress(
												`Failed: ${e instanceof Error ? e.message : String(e)}`,
											);
										} finally {
											setCleanupUpgrading(false);
										}
									}}
									className={`text-left p-3 rounded-xl border transition-colors w-full disabled:opacity-60 ${
										selected
											? "border-primary bg-primary/5"
											: "border-border bg-muted/30 hover:bg-muted/50"
									}`}
								>
									<p className="text-sm font-medium text-foreground flex items-center gap-2">
										{tier.name}
										{selected && (
											<span className="text-[10px] uppercase tracking-wide font-semibold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded">
												Active
											</span>
										)}
									</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										{tier.desc}
									</p>
								</button>
							);
						})}
						{cleanupProgress && (
							<p className="text-xs text-primary font-medium">
								{cleanupProgress}
							</p>
						)}
					</div>
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
						<Label className="text-sm font-medium">Cleanup timing</Label>
						<div className="grid gap-2">
							{(
								[
									{
										value: "blocking" as const,
										title: "Wait for polish (recommended)",
										desc: "Always paste the cleaned text into the focused field. Slight wait after each dictation.",
									},
									{
										value: "background" as const,
										title: "Background",
										desc: "Paste immediately, polish in the background. Press ⌘⇧C if the cleaned version differs.",
									},
									{
										value: "off" as const,
										title: "Off",
										desc: "Paste the raw transcript only. No LLM cleanup.",
									},
								] as const
							).map((opt) => {
								const selected = cleanupMode === opt.value;
								return (
									<button
										key={opt.value}
										type="button"
										onClick={() => setCleanupMode(opt.value)}
										className={`text-left p-3 rounded-xl border transition-colors ${
											selected
												? "border-primary bg-primary/5"
												: "border-border bg-muted/30 hover:bg-muted/50"
										}`}
									>
										<p className="text-sm font-medium text-foreground">
											{opt.title}
										</p>
										<p className="text-xs text-muted-foreground mt-0.5">
											{opt.desc}
										</p>
									</button>
								);
							})}
						</div>
						<p className="text-xs text-muted-foreground">
							Only very short utterances (a word or two) skip cleanup; everything
							longer is punctuated and polished.
						</p>
					</div>

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
						<Label className="text-sm font-medium">Formality</Label>
						<div className="grid grid-cols-3 gap-2">
							{(
								[
									{
										value: "casual" as const,
										title: "Casual",
										desc: "Keep your voice",
									},
									{
										value: "neutral" as const,
										title: "Neutral",
										desc: "Clean & natural",
									},
									{
										value: "formal" as const,
										title: "Formal",
										desc: "Professional prose",
									},
								] as const
							).map((opt) => {
								const selected = formality === opt.value;
								return (
									<button
										key={opt.value}
										type="button"
										onClick={() => setFormality(opt.value)}
										className={`text-left p-3 rounded-xl border transition-colors ${
											selected
												? "border-primary bg-primary/5"
												: "border-border bg-muted/30 hover:bg-muted/50"
										}`}
									>
										<p className="text-sm font-medium text-foreground">
											{opt.title}
										</p>
										<p className="text-xs text-muted-foreground mt-0.5">
											{opt.desc}
										</p>
									</button>
								);
							})}
						</div>
						<p className="text-xs text-muted-foreground">
							How much should cleanup reshape your tone? Formal rewrites into
							polished, professional writing.
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
							Optional extra notes to fine-tune how the cleaned text sounds, on
							top of the formality preset.
						</p>
					</div>
				</div>
			</section>

			<AppProfilesSection />

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

function PermissionsSection() {
	const status = usePermissions();

	return (
		<section className="bg-card rounded-2xl border border-border p-5">
			<div className="flex items-start gap-4 mb-4">
				<div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
					<ShieldCheck className="w-5 h-5 text-emerald-600" />
				</div>
				<div className="flex-1">
					<h2 className="text-base font-semibold text-foreground">Permissions</h2>
					<p className="text-sm text-muted-foreground">
						Parrot needs these macOS permissions to record and paste your dictation.
					</p>
				</div>
			</div>

			<div className="space-y-2">
				<PermissionRow
					icon={Mic}
					label="Microphone"
					description="Required to capture your voice for transcription."
					state={status.microphone}
					pane="microphone"
				/>
				<PermissionRow
					icon={Accessibility}
					label="Accessibility"
					description="Required to paste dictated text into other apps and use the fn key."
					state={status.accessibility}
					pane="accessibility"
				/>
			</div>
		</section>
	);
}

interface AppProfileRow {
	bundle_id: string;
	app_name: string;
	context_prompt: string;
	writing_style: string;
	cleanup_enabled: boolean;
	enabled: boolean;
}

function AppProfilesSection() {
	const [profiles, setProfiles] = useState<AppProfileRow[]>([]);
	const [editing, setEditing] = useState<AppProfileRow | null>(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		try {
			const rows = await invoke<AppProfileRow[]>("list_app_profiles");
			setProfiles(rows);
		} catch (e) {
			console.error("Failed to load app profiles:", e);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	async function addFromFrontmost() {
		setBusy(true);
		try {
			const front = await invoke<{
				bundle_id: string | null;
				app_name: string | null;
			}>("get_frontmost_app");
			if (!front.bundle_id) {
				alert("Couldn't detect the frontmost app. Focus another app and try again.");
				return;
			}
			// Don't capture Parrot itself as a profile target.
			if (front.bundle_id.includes("parrot") || front.bundle_id.includes("kash.parrot")) {
				alert(
					"Parrot is frontmost. Switch to the app you want to profile, then click again.",
				);
				return;
			}
			setEditing({
				bundle_id: front.bundle_id,
				app_name: front.app_name || front.bundle_id,
				context_prompt: "",
				writing_style: "",
				cleanup_enabled: true,
				enabled: true,
			});
		} catch (e) {
			console.error(e);
		} finally {
			setBusy(false);
		}
	}

	async function saveEditing() {
		if (!editing) return;
		setBusy(true);
		try {
			await invoke("upsert_app_profile", { profile: editing });
			setEditing(null);
			await load();
		} catch (e) {
			console.error(e);
		} finally {
			setBusy(false);
		}
	}

	async function remove(bundleId: string) {
		setBusy(true);
		try {
			await invoke("delete_app_profile", { bundleId });
			await load();
		} catch (e) {
			console.error(e);
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="bg-card rounded-2xl border border-border p-5">
			<div className="flex items-start gap-4 mb-5">
				<div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
					<AppWindow className="w-5 h-5 text-indigo-600" />
				</div>
				<div className="flex-1">
					<h2 className="text-base font-semibold text-foreground">
						Per-app modes
					</h2>
					<p className="text-sm text-muted-foreground">
						Override writing style, context, or turn cleanup off for specific
						apps (by bundle ID — no screen capture).
					</p>
				</div>
			</div>

			<div className="space-y-3">
				{profiles.length === 0 && !editing && (
					<p className="text-sm text-muted-foreground">
						No app profiles yet. Focus Slack, Notes, Terminal, etc., then add
						the frontmost app.
					</p>
				)}

				{profiles.map((p) => (
					<div
						key={p.bundle_id}
						className="p-3 rounded-xl border border-border bg-muted/30 space-y-1"
					>
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="text-sm font-medium text-foreground">
									{p.app_name || p.bundle_id}
								</p>
								<p className="text-xs font-mono text-muted-foreground">
									{p.bundle_id}
								</p>
							</div>
							<div className="flex gap-1">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setEditing({ ...p })}
								>
									Edit
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => void remove(p.bundle_id)}
									disabled={busy}
								>
									<Trash2 className="w-3.5 h-3.5" />
								</Button>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							Cleanup: {p.cleanup_enabled ? "on" : "off"}
							{p.writing_style ? ` · style set` : ""}
							{p.context_prompt ? ` · context set` : ""}
						</p>
					</div>
				))}

				{editing && (
					<div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
						<div>
							<p className="text-sm font-medium">{editing.app_name}</p>
							<p className="text-xs font-mono text-muted-foreground">
								{editing.bundle_id}
							</p>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">Context override (empty = global)</Label>
							<Textarea
								value={editing.context_prompt}
								onChange={(e) =>
									setEditing({ ...editing, context_prompt: e.target.value })
								}
								rows={2}
								className="resize-none text-sm"
								placeholder="e.g. Writing a Slack message — casual, short"
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-xs">
								Writing style override (empty = global)
							</Label>
							<Textarea
								value={editing.writing_style}
								onChange={(e) =>
									setEditing({ ...editing, writing_style: e.target.value })
								}
								rows={2}
								className="resize-none text-sm"
								placeholder="e.g. Brief bullets, no fluff"
							/>
						</div>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={editing.cleanup_enabled}
								onChange={(e) =>
									setEditing({
										...editing,
										cleanup_enabled: e.target.checked,
									})
								}
							/>
							Run AI cleanup in this app
						</label>
						<div className="flex gap-2">
							<Button type="button" size="sm" onClick={() => void saveEditing()} disabled={busy}>
								Save profile
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setEditing(null)}
							>
								Cancel
							</Button>
						</div>
					</div>
				)}

				<Button
					type="button"
					variant="outline"
					onClick={() => void addFromFrontmost()}
					disabled={busy}
					className="w-full sm:w-auto"
				>
					<Plus className="w-4 h-4 mr-1" />
					Add frontmost app
				</Button>
				<p className="text-xs text-muted-foreground">
					Tip: click into the target app first so Parrot can read its bundle ID
					when you return.
				</p>
			</div>
		</section>
	);
}

function PermissionRow({
	icon: Icon,
	label,
	description,
	state,
	pane,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	description: string;
	state: PermissionState;
	pane: "accessibility" | "microphone";
}) {
	const granted = state === "granted";
	const statusLabel =
		state === "granted"
			? "Granted"
			: state === "denied"
				? "Denied"
				: state === "restricted"
					? "Restricted"
					: state === "notDetermined"
						? "Not requested"
						: "Unknown";

	return (
		<div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/50">
			<div className="flex items-start gap-3 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
					<Icon className="w-4 h-4 text-foreground" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<p className="text-sm font-medium text-foreground">{label}</p>
						<span
							className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
								granted
									? "bg-emerald-500/10 text-emerald-700"
									: "bg-amber-500/15 text-amber-800"
							}`}
						>
							{statusLabel}
						</span>
					</div>
					<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
				</div>
			</div>
			{isMissing(state) && (
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						openPermissionSettings(pane).catch((e) =>
							console.error("Failed to open System Settings:", e),
						);
					}}
					className="shrink-0"
				>
					Open Settings
					<ExternalLink className="w-3 h-3 ml-1.5" />
				</Button>
			)}
		</div>
	);
}
