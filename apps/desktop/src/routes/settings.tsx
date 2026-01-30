import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const [hotkey, setHotkey] = useState("CmdOrCtrl+Shift+Space");
	const [apiKey, setApiKey] = useState("");
	const [llmApiKey, setLlmApiKey] = useState("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		loadSettings();
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
		} catch (e) {
			console.error("Failed to load settings:", e);
		}
	}

	async function saveSettings() {
		try {
			await invoke("set_setting", { key: "hotkey", value: hotkey });
			await invoke("set_setting", { key: "api_key", value: apiKey });
			await invoke("set_setting", { key: "llm_api_key", value: llmApiKey });
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} catch (e) {
			console.error("Failed to save settings:", e);
		}
	}

	return (
		<div>
			<h2 className="text-[22px] font-semibold mb-4">Settings</h2>

			<div className="flex flex-col gap-5 max-w-[480px]">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="hotkey">Hotkey</Label>
					<Input
						id="hotkey"
						value={hotkey}
						onChange={(e) => setHotkey(e.target.value)}
						placeholder="CmdOrCtrl+Shift+Space"
					/>
					<span className="text-xs text-muted-foreground">
						Accelerator format, e.g. CmdOrCtrl+Shift+Space
					</span>
				</div>

	<div className="flex flex-col gap-1.5">
					<Label htmlFor="apiKey">Transcription API Key</Label>
					<Input
						id="apiKey"
						type="password"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						placeholder="API key for transcription provider"
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="llmApiKey">LLM API Key (OpenAI)</Label>
					<Input
						id="llmApiKey"
						type="password"
						value={llmApiKey}
						onChange={(e) => setLlmApiKey(e.target.value)}
						placeholder="For text cleanup with GPT-4o-mini"
					/>
					<span className="text-xs text-muted-foreground">
						Optional. Without this, raw transcription is used as-is.
					</span>
				</div>

				<Button className="self-start" onClick={saveSettings}>
					{saved ? "Saved!" : "Save Settings"}
				</Button>
			</div>
		</div>
	);
}
