import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_onboarding/cloud-setup")({
	component: CloudSetupPage,
});

interface TestResult {
	success: boolean;
	error?: string;
}

function CloudSetupPage() {
	const navigate = useNavigate();
	const [transcriptionKey, setTranscriptionKey] = useState("");
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<TestResult | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		loadExistingSettings();
	}, []);

	const loadExistingSettings = async () => {
		try {
			const savedTranscriptionKey = await invoke<string | null>("get_setting", {
				key: "transcription_api_key",
			});
			if (savedTranscriptionKey) setTranscriptionKey(savedTranscriptionKey);
		} catch (err) {
			console.error("Failed to load settings:", err);
		}
	};

	const testConnection = async () => {
		setTesting(true);
		setTestResult(null);

		try {
			// Test by making a simple API call
			const response = await fetch("http://localhost:3001/health");
			if (response.ok) {
				setTestResult({ success: true });
			} else {
				setTestResult({ success: false, error: "API server not responding" });
			}
		} catch {
			setTestResult({ success: false, error: "Cannot connect to API server" });
		} finally {
			setTesting(false);
		}
	};

	const saveAndContinue = async () => {
		setSaving(true);

		try {
			await invoke("set_setting", {
				key: "transcription_api_key",
				value: transcriptionKey,
			});
			await invoke("set_setting", {
				key: "llm_api_key",
				value: transcriptionKey,
			});

			navigate({ to: "/tour" });
		} catch (err) {
			console.error("Failed to save settings:", err);
		} finally {
			setSaving(false);
		}
	};

	const canContinue = transcriptionKey.length > 0;

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-foreground mb-2">Cloud Setup</h2>
				<p className="text-muted-foreground">
					Configure your API keys for cloud-based processing
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">OpenAI API Key</CardTitle>
					<CardDescription>
						Used for transcription and text cleanup
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="transcription-key">API Key</Label>
						<Input
							id="transcription-key"
							type="password"
							placeholder="Your OpenAI API key"
							value={transcriptionKey}
							onChange={(e) => setTranscriptionKey(e.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							Get your key at platform.openai.com
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Test connection */}
			<div className="flex items-center gap-4">
				<Button
					variant="outline"
					onClick={testConnection}
					disabled={testing || !canContinue}
				>
					{testing ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Testing...
						</>
					) : (
						"Test Connection"
					)}
				</Button>

				{testResult && (
					<div
						className={`flex items-center gap-2 text-sm ${
							testResult.success ? "text-green-600" : "text-red-600"
						}`}
					>
						{testResult.success ? (
							<>
								<Check className="w-4 h-4" />
								Connection successful
							</>
						) : (
							<>
								<AlertCircle className="w-4 h-4" />
								{testResult.error}
							</>
						)}
					</div>
				)}
			</div>

			<div className="flex justify-between pt-4">
				<Button
					variant="outline"
					onClick={() => navigate({ to: "/setup-mode" })}
				>
					Back
				</Button>
				<div className="flex gap-2">
					<Button variant="ghost" onClick={() => navigate({ to: "/tour" })}>
						Skip for now
					</Button>
					<Button onClick={saveAndContinue} disabled={!canContinue || saving}>
						{saving ? "Saving..." : "Continue"}
					</Button>
				</div>
			</div>
		</div>
	);
}
