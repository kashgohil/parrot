import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Check, Download, ExternalLink, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_onboarding/local-setup")({
	component: LocalSetupPage,
});

interface ToolStatus {
	name: string;
	displayName: string;
	description: string;
	installed: boolean | null;
	installing: boolean;
	installError: string | null;
	manualUrl: string;
}

function LocalSetupPage() {
	const navigate = useNavigate();
	const [tools, setTools] = useState<ToolStatus[]>([
		{
			name: "whisper-cpp",
			displayName: "Whisper.cpp",
			description: "Local speech-to-text engine",
			installed: null,
			installing: false,
			installError: null,
			manualUrl: "https://github.com/ggerganov/whisper.cpp",
		},
		{
			name: "ollama",
			displayName: "Ollama",
			description: "Local LLM for text cleanup",
			installed: null,
			installing: false,
			installError: null,
			manualUrl: "https://ollama.ai",
		},
	]);
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		checkTools();
	}, []);

	const checkTools = async () => {
		setChecking(true);
		const updatedTools = await Promise.all(
			tools.map(async (tool) => {
				try {
					const installed = await invoke<boolean>("check_command_exists", {
						name: tool.name === "whisper-cpp" ? "whisper-cli" : tool.name,
					});
					return { ...tool, installed };
				} catch {
					return { ...tool, installed: false };
				}
			}),
		);
		setTools(updatedTools);
		setChecking(false);
	};

	const installTool = async (toolName: string) => {
		setTools((prev) =>
			prev.map((t) =>
				t.name === toolName
					? { ...t, installing: true, installError: null }
					: t,
			),
		);

		try {
			await invoke<string>("install_tool", { name: toolName });
			setTools((prev) =>
				prev.map((t) =>
					t.name === toolName
						? { ...t, installed: true, installing: false }
						: t,
				),
			);
		} catch (err) {
			setTools((prev) =>
				prev.map((t) =>
					t.name === toolName
						? { ...t, installing: false, installError: String(err) }
						: t,
				),
			);
		}
	};

	const allInstalled = tools.every((t) => t.installed);
	const anyInstalling = tools.some((t) => t.installing);

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-foreground mb-2">Local Setup</h2>
				<p className="text-muted-foreground">
					Install the required tools for local voice processing
				</p>
			</div>

			<div className="space-y-4">
				{tools.map((tool) => (
					<Card key={tool.name}>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<StatusIcon
										installed={tool.installed}
										installing={tool.installing}
										checking={checking}
									/>
									<div>
										<CardTitle className="text-base">
											{tool.displayName}
										</CardTitle>
										<CardDescription>{tool.description}</CardDescription>
									</div>
								</div>

								<div className="flex items-center gap-2">
									{tool.installed === false && !tool.installing && (
										<>
											<Button
												size="sm"
												onClick={() => installTool(tool.name)}
												disabled={anyInstalling}
											>
												<Download className="w-4 h-4 mr-1" />
												Install
											</Button>
											<Button size="sm" variant="ghost" asChild>
												<a
													href={tool.manualUrl}
													target="_blank"
													rel="noopener noreferrer"
												>
													<ExternalLink className="w-4 h-4" />
												</a>
											</Button>
										</>
									)}
									{tool.installed && (
										<span className="text-sm text-green-600 font-medium">
											Installed
										</span>
									)}
								</div>
							</div>
						</CardHeader>

						{tool.installing && (
							<CardContent className="pt-0">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="w-4 h-4 animate-spin" />
									Installing... This may take a few minutes.
								</div>
							</CardContent>
						)}

						{tool.installError && (
							<CardContent className="pt-0">
								<div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
									<p className="font-medium">Installation failed</p>
									<p className="text-red-500 mt-1">{tool.installError}</p>
									<a
										href={tool.manualUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 mt-2 text-primary hover:underline"
									>
										Install manually <ExternalLink className="w-3 h-3" />
									</a>
								</div>
							</CardContent>
						)}
					</Card>
				))}
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
					<Button
						onClick={() => navigate({ to: "/tour" })}
						disabled={!allInstalled && anyInstalling}
					>
						{allInstalled ? "Continue" : "Continue anyway"}
					</Button>
				</div>
			</div>
		</div>
	);
}

function StatusIcon({
	installed,
	installing,
	checking,
}: {
	installed: boolean | null;
	installing: boolean;
	checking: boolean;
}) {
	if (checking || installed === null) {
		return (
			<div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
				<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (installing) {
		return (
			<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
				<Loader2 className="w-4 h-4 animate-spin text-blue-600" />
			</div>
		);
	}

	if (installed) {
		return (
			<div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
				<Check className="w-4 h-4 text-green-600" />
			</div>
		);
	}

	return (
		<div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
			<X className="w-4 h-4 text-orange-600" />
		</div>
	);
}
