import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	AlertCircle,
	Brain,
	Check,
	ChevronRight,
	Copy,
	Cpu,
	Loader2,
	Mic,
	Play,
	Server,
	Terminal,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const stepVariants = {
	initial: { opacity: 0, x: 24 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: -24 },
};
const stepTransition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

// Types matching the Rust backend
interface SystemRequirements {
	macos_version: string;
	macos_supported: boolean;
	free_space_gb: number;
	has_homebrew: boolean;
	homebrew_path?: string;
	architecture: string;
}

interface LocalSetupConfig {
	whisper_model_path: string;
	whisper_server_port: number;
	ollama_server_port: number;
	ollama_model: string;
	setup_completed: boolean;
	setup_version: string;
}

interface ManualStep {
	label: string;
	command?: string;
	explanation: string;
	skippable: boolean;
	skip_condition?: string;
}

interface ManualInstructions {
	title: string;
	description: string;
	steps: ManualStep[];
	verification_command?: string;
	verification_success?: string;
}

type SetupStep =
	| { type: "system_check" }
	| { type: "install_whisper_cpp" }
	| { type: "download_whisper_model"; model: string }
	| { type: "install_ollama" }
	| { type: "download_ollama_model"; model: string }
	| { type: "start_servers" }
	| { type: "validate_setup" };

type SetupStatus =
	| { type: "pending" }
	| { type: "in_progress"; message: string; progress: number }
	| { type: "completed" }
	| { type: "failed"; error: string; recoverable: boolean }
	| { type: "manual_intervention_required"; instructions: ManualInstructions };

interface SetupProgress {
	step: SetupStep;
	status: SetupStatus;
	overall_progress: number;
}

// Model options
const WHISPER_MODELS = [
	{
		id: "tiny.en",
		name: "Tiny",
		size: "75 MB",
		description: "Fast, basic accuracy",
		recommended: false,
	},
	{
		id: "base.en",
		name: "Base",
		size: "150 MB",
		description: "Balanced speed and accuracy",
		recommended: true,
	},
	{
		id: "small.en",
		name: "Small",
		size: "500 MB",
		description: "Slower, best accuracy",
		recommended: false,
	},
];

const OLLAMA_MODELS = [
	{
		id: "llama3.2",
		name: "Llama 3.2",
		size: "2 GB",
		description: "Great for general text cleanup",
		recommended: true,
	},
	{
		id: "phi4",
		name: "Phi-4",
		size: "2.5 GB",
		description: "Optimized for technical writing",
		recommended: false,
	},
	{
		id: "qwen2.5-coder:1.5b",
		name: "Qwen 2.5 Coder",
		size: "1 GB",
		description: "Better for code and documentation",
		recommended: false,
	},
];

// Wizard step components
function SystemCheckStep({
	requirements,
	onContinue,
}: {
	requirements: SystemRequirements | null;
	onContinue: () => void;
}) {
	const [isLoading, setIsLoading] = useState(true);
	const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

	useEffect(() => {
		if (requirements) {
			setIsLoading(false);
		} else {
			// Show timeout message after 5 seconds if still loading
			const timer = setTimeout(() => {
				setShowTimeoutMessage(true);
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [requirements]);

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-8 space-y-4">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Checking your system...</p>
				{showTimeoutMessage && (
					<div className="text-center max-w-sm">
						<p className="text-sm text-yellow-600 mb-2">
							Taking longer than expected...
						</p>
						<p className="text-xs text-muted-foreground">
							Check the browser console for errors (Cmd+Option+I)
						</p>
					</div>
				)}
			</div>
		);
	}

	// We know requirements is not null here because of the early return above
	const reqs = requirements!;

	const allGood =
		reqs.macos_supported && reqs.free_space_gb >= 5 && reqs.has_homebrew;

	return (
		<div className="space-y-4">
			<div className="space-y-3">
				<RequirementItem
					icon={<Cpu className="w-4 h-4" />}
					label="macOS Version"
					value={reqs.macos_version}
					status={reqs.macos_supported ? "success" : "error"}
					detail={
						!reqs.macos_supported ? "macOS 12 or later required" : undefined
					}
				/>
				<RequirementItem
					icon={<Server className="w-4 h-4" />}
					label="Free Disk Space"
					value={`${reqs.free_space_gb.toFixed(1)} GB`}
					status={reqs.free_space_gb >= 5 ? "success" : "error"}
					detail={reqs.free_space_gb < 5 ? "At least 5 GB required" : undefined}
				/>
				<RequirementItem
					icon={<Terminal className="w-4 h-4" />}
					label="Homebrew"
					value={reqs.has_homebrew ? "Installed" : "Not installed"}
					status={reqs.has_homebrew ? "success" : "warning"}
					detail={!reqs.has_homebrew ? "Will install during setup" : undefined}
				/>
			</div>

			{allGood ? (
				<div className="p-4 bg-pk-primary/10 border border-pk-primary/30 rounded-lg">
					<div className="flex items-center gap-2 text-[#5a8a2e]">
						<Check className="w-5 h-5" />
						<span className="font-medium">Everything looks good!</span>
					</div>
				</div>
			) : (
				<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<div className="flex items-start gap-2 text-yellow-700">
						<AlertCircle className="w-5 h-5 mt-0.5" />
						<div>
							<p className="font-medium">Some requirements need attention</p>
							<p className="text-sm mt-1">
								We'll guide you through fixing these during setup.
							</p>
						</div>
					</div>
				</div>
			)}

			<div className="flex justify-end pt-4">
				<Button onClick={onContinue}>
					Next Step
					<ChevronRight className="w-4 h-4 ml-1" />
				</Button>
			</div>
		</div>
	);
}

function RequirementItem({
	icon,
	label,
	value,
	status,
	detail,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	status: "success" | "warning" | "error";
	detail?: string;
}) {
	return (
			<div className="flex items-center justify-between p-3 bg-card rounded-lg border">
			<div className="flex items-center gap-3">
				<div className="text-muted-foreground">{icon}</div>
				<div>
					<div className="text-sm font-medium">{label}</div>
					<div className="text-sm text-muted-foreground">{value}</div>
					{detail && <div className="text-xs text-red-500 mt-1">{detail}</div>}
				</div>
			</div>
			<div
				className={`w-2 h-2 rounded-full ${
					status === "success"
						? "bg-pk-primary"
						: status === "warning"
							? "bg-yellow-500"
							: "bg-red-500"
				}`}
			/>
		</div>
	);
}

function ModelSelectionStep({
	selectedWhisper,
	selectedOllama,
	onSelectWhisper,
	onSelectOllama,
	onContinue,
}: {
	selectedWhisper: string;
	selectedOllama: string;
	onSelectWhisper: (id: string) => void;
	onSelectOllama: (id: string) => void;
	onContinue: () => void;
}) {
	const whisperModel = WHISPER_MODELS.find((m) => m.id === selectedWhisper);
	const ollamaModel = OLLAMA_MODELS.find((m) => m.id === selectedOllama);
	const [downloadedModels, setDownloadedModels] = useState<{
		whisper: string[];
		ollama: string[];
	}>({ whisper: [], ollama: [] });
	const [isCheckingModels, setIsCheckingModels] = useState(true);

	// Check which models are already downloaded
	useEffect(() => {
		const checkDownloadedModels = async () => {
			try {
				const downloaded = await invoke<{
					whisper: string[];
					ollama: string[];
				}>("check_model_download_status", {
					request: {
						whisperModels: WHISPER_MODELS.map((model) => model.id),
						ollamaModels: OLLAMA_MODELS.map((model) => model.id),
					},
				});

				setDownloadedModels(downloaded);
			} catch (error) {
				console.error("Failed to check downloaded models:", error);
			} finally {
				setIsCheckingModels(false);
			}
		};

		checkDownloadedModels();
	}, []);

	// Parse size strings like "150 MB" or "2 GB" and convert to GB
	const parseSizeToGB = (sizeStr: string): number => {
		const num = parseFloat(sizeStr);
		if (sizeStr.includes("GB")) {
			return num;
		} else if (sizeStr.includes("MB")) {
			return num / 1024; // Convert MB to GB
		}
		return num;
	};

	// Calculate total download size (only for models not yet downloaded)
	const calculateDownloadSize = (): number => {
		let total = 0;

		// Add whisper model size if not downloaded
		if (whisperModel && !downloadedModels.whisper.includes(whisperModel.id)) {
			total += parseSizeToGB(whisperModel.size);
		}

		// Add ollama model size if not downloaded
		if (ollamaModel && !downloadedModels.ollama.includes(ollamaModel.id)) {
			total += parseSizeToGB(ollamaModel.size);
		}

		return total;
	};

	const totalSizeGB = calculateDownloadSize();
	const hasDownloads = totalSizeGB > 0;

	return (
		<div className="space-y-6">
			{isCheckingModels && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="w-4 h-4 animate-spin" />
					Checking for existing models...
				</div>
			)}

			{/* Whisper Models */}
			<div>
				<div className="flex items-center gap-2 mb-3">
					<Mic className="w-5 h-5 text-primary" />
					<h3 className="font-medium">Speech-to-Text Model</h3>
				</div>
				<div className="grid gap-3">
					{WHISPER_MODELS.map((model) => (
						<ModelCard
							key={model.id}
							model={model}
							selected={selectedWhisper === model.id}
							isDownloaded={downloadedModels.whisper.includes(model.id)}
							onSelect={() => onSelectWhisper(model.id)}
						/>
					))}
				</div>
			</div>

			{/* Ollama Models */}
			<div>
				<div className="flex items-center gap-2 mb-3">
					<Brain className="w-5 h-5 text-primary" />
					<h3 className="font-medium">Text Cleanup Model</h3>
				</div>
				<div className="grid gap-3">
					{OLLAMA_MODELS.map((model) => (
						<ModelCard
							key={model.id}
							model={model}
							selected={selectedOllama === model.id}
							isDownloaded={downloadedModels.ollama.includes(model.id)}
							onSelect={() => onSelectOllama(model.id)}
						/>
					))}
				</div>
			</div>

			<div className="p-4 bg-muted rounded-lg">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						{hasDownloads ? "Download required:" : "All models ready!"}
					</span>
					<span className="font-medium">
						{hasDownloads
							? `~${totalSizeGB.toFixed(2)} GB`
							: "No download needed"}
					</span>
				</div>
			</div>

			<div className="flex justify-end pt-4">
				<Button onClick={onContinue}>
					{!isCheckingModels && !hasDownloads ? "Continue" : "Start Setup"}
					<Play className="w-4 h-4 ml-1" />
				</Button>
			</div>
		</div>
	);
}

function ModelCard({
	model,
	selected,
	isDownloaded,
	onSelect,
}: {
	model: (typeof WHISPER_MODELS)[0];
	selected: boolean;
	isDownloaded?: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			onClick={onSelect}
			className={`flex items-center justify-between gap-3 p-4 rounded-lg border text-left transition-all ${
				selected
					? "border-primary bg-primary/5"
					: "border-border hover:border-primary/50"
			}`}
		>
			<div className="flex items-center gap-3 min-w-0 flex-1">
				<div
					className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
						selected ? "border-primary" : "border-muted-foreground"
					}`}
				>
					{selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center flex-wrap gap-x-2 gap-y-1">
						<span className="font-medium whitespace-nowrap">{model.name}</span>
						{model.recommended && (
							<span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
								Recommended
							</span>
						)}
						{isDownloaded && (
							<span className="text-xs bg-pk-primary/10 text-pk-primary px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shrink-0">
								<Check className="w-3 h-3" />
								Downloaded
							</span>
						)}
					</div>
					<div className="text-sm text-muted-foreground">
						{model.description}
					</div>
				</div>
			</div>
			<span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
				{model.size}
			</span>
		</button>
	);
}

function InstallationProgressStep({
	progress,
	logMessages,
	onRetry,
}: {
	progress: SetupProgress | null;
	logMessages: string[];
	onRetry: () => void;
}) {
	if (!progress) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	const getStepName = (step: SetupStep): string => {
		switch (step.type) {
			case "system_check":
				return "System Check";
			case "install_whisper_cpp":
				return "Installing whisper.cpp";
			case "install_ollama":
				return "Installing Ollama";
			case "start_servers":
				return "Starting servers";
			case "validate_setup":
				return "Validating setup";
			case "download_whisper_model":
				return `Downloading ${step.model} model`;
			case "download_ollama_model":
				return `Downloading ${step.model} model`;
		}
	};

	const getStepIcon = (step: SetupStep) => {
		switch (step.type) {
			case "system_check":
				return <Cpu className="w-4 h-4" />;
			case "install_whisper_cpp":
				return <Mic className="w-4 h-4" />;
			case "install_ollama":
				return <Brain className="w-4 h-4" />;
			case "start_servers":
				return <Server className="w-4 h-4" />;
			case "validate_setup":
				return <Check className="w-4 h-4" />;
			default:
				return <DownloadIcon className="w-4 h-4" />;
		}
	};

	const status = progress.status;
	const logRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (logRef.current) {
			logRef.current.scrollTop = logRef.current.scrollHeight;
		}
	}, [logMessages]);

	return (
		<div className="space-y-6">
			{/* Overall progress */}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Overall progress</span>
					<span className="font-medium">
						{Math.round(progress.overall_progress * 100)}%
					</span>
				</div>
				<div className="h-2 bg-muted rounded-full overflow-hidden">
					<div
						className="h-full bg-primary transition-all duration-300"
						style={{ width: `${progress.overall_progress * 100}%` }}
					/>
				</div>
			</div>

			{/* Current step */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center gap-3">
						<div
							className={`w-10 h-10 rounded-full flex items-center justify-center ${
								status.type === "completed"
									? "bg-pk-primary/15 text-pk-primary"
									: status.type === "failed"
										? "bg-red-100 text-red-600"
										: "bg-primary/10 text-primary"
							}`}
						>
							{status.type === "in_progress" ? (
								<Loader2 className="w-5 h-5 animate-spin" />
							) : status.type === "completed" ? (
								<Check className="w-5 h-5" />
							) : status.type === "failed" ? (
								<X className="w-5 h-5" />
							) : (
								getStepIcon(progress.step)
							)}
						</div>
						<div className="flex-1">
							<CardTitle className="text-base">
								{getStepName(progress.step)}
							</CardTitle>
							{status.type === "in_progress" && (
								<CardDescription>{status.message}</CardDescription>
							)}
						</div>
					</div>
				</CardHeader>
				{status.type === "in_progress" && status.progress > 0 && (
					<CardContent className="pt-0">
						<div className="h-1.5 bg-muted rounded-full overflow-hidden">
							<div
								className="h-full bg-primary transition-all duration-300"
								style={{ width: `${status.progress}%` }}
							/>
						</div>
					</CardContent>
				)}
			</Card>

			{/* Log output */}
			<div className="border rounded-lg">
				<div className="px-4 py-2 bg-muted border-b">
					<div className="flex items-center gap-2 text-sm font-medium">
						<Terminal className="w-4 h-4" />
						Setup Log
					</div>
				</div>
				<div
					ref={logRef}
					className="p-4 h-48 overflow-y-auto font-mono text-xs space-y-1"
				>
					{logMessages.length === 0 ? (
						<div className="text-muted-foreground italic">
							Waiting to start...
						</div>
					) : (
						logMessages.map((msg, i) => (
							<div key={i} className="text-muted-foreground">
								<span className="text-primary">→</span> {msg}
							</div>
						))
					)}
				</div>
			</div>

			{/* Failure banner */}
			{status.type === "failed" && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-start gap-2">
						<X className="w-5 h-5 text-red-600 mt-0.5" />
						<div className="flex-1">
							<p className="font-medium text-red-900">Setup failed</p>
							<p className="text-sm text-red-700 mt-1 break-words">
								{status.error}
							</p>
							<Button
								variant="outline"
								size="sm"
								className="mt-3"
								onClick={onRetry}
							>
								Retry
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Educational tooltip */}
			<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<div className="flex items-start gap-2">
					<AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
					<div className="text-sm text-blue-700">
						{getEducationalTooltip(progress.step)}
					</div>
				</div>
			</div>
		</div>
	);
}

function DownloadIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
			/>
		</svg>
	);
}

function getEducationalTooltip(step: SetupStep): string {
	switch (step.type) {
		case "system_check":
			return "We're checking your Mac meets the requirements for running AI models locally.";
		case "install_whisper_cpp":
			return "whisper.cpp converts your speech to text using your Mac's Neural Engine. Your voice never leaves your computer.";
		case "install_ollama":
			return "Ollama runs AI models locally to clean up your dictation text (fix grammar, remove filler words).";
		case "start_servers":
			return "Starting the local servers that will handle your voice dictation and text cleanup.";
		case "validate_setup":
			return "Running quick tests to make sure everything is working correctly.";
		case "download_whisper_model":
			return "The speech recognition model is what converts your voice into text. Larger models are more accurate but use more memory.";
		case "download_ollama_model":
			return "The AI model cleans up your text (fixes grammar, punctuation, removes 'um' and 'uh'). It runs entirely on your Mac.";
	}
}

function ManualInterventionStep({
	instructions,
	onContinue,
}: {
	instructions: ManualInstructions;
	onContinue: () => void;
}) {
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

	const copyCommand = (command: string) => {
		navigator.clipboard.writeText(command);
	};

	return (
		<div className="space-y-6">
			<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
				<div className="flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
					<div>
						<h3 className="font-medium text-yellow-900">
							{instructions.title}
						</h3>
						<p className="text-sm text-yellow-700 mt-1">
							{instructions.description}
						</p>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				{instructions.steps.map((step, index) => (
					<div
						key={index}
						className={`p-4 border rounded-lg ${
							completedSteps.has(index)
								? "bg-pk-primary/10 border-pk-primary/30"
								: "bg-card"
						}`}
					>
						<div className="flex items-start gap-3">
							<div
								className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
									completedSteps.has(index)
										? "bg-pk-primary text-white"
										: "bg-muted text-muted-foreground"
								}`}
							>
								{completedSteps.has(index) ? (
									<Check className="w-4 h-4" />
								) : (
									index + 1
								)}
							</div>
							<div className="flex-1">
								<div className="font-medium">{step.label}</div>
								<div className="text-sm text-muted-foreground mt-1">
									{step.explanation}
								</div>

								{step.command && (
									<div className="mt-3">
										<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
											<span>Command</span>
											<button
												onClick={() => copyCommand(step.command!)}
												className="flex items-center gap-1 hover:text-foreground"
											>
												<Copy className="w-3 h-3" />
												Copy
											</button>
										</div>
										<div className="relative">
											<code className="block p-3 bg-muted rounded-lg font-mono text-xs break-all">
												{step.command}
											</code>
										</div>
									</div>
								)}

								{step.skippable && step.skip_condition && (
									<div className="mt-2 text-xs text-muted-foreground">
										Skip if: {step.skip_condition}
									</div>
								)}
							</div>

							{!completedSteps.has(index) && (
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setCompletedSteps((prev) => new Set([...prev, index]))
									}
								>
									Done
								</Button>
							)}
						</div>
					</div>
				))}
			</div>

			{instructions.verification_command && (
				<div className="p-4 bg-muted rounded-lg">
					<div className="text-sm font-medium mb-2">Verification</div>
					<div className="text-sm text-muted-foreground">
						{instructions.verification_success}
					</div>
				</div>
			)}

			<div className="flex justify-end pt-4">
				<Button onClick={onContinue}>
					Continue Setup
					<ChevronRight className="w-4 h-4 ml-1" />
				</Button>
			</div>
		</div>
	);
}

function CompletionStep({
	onFinish,
	testResults,
}: {
	onFinish: () => void;
	testResults: { transcription: boolean; cleanup: boolean } | null;
}) {
	const allTestsPassed = testResults?.transcription && testResults?.cleanup;

	return (
		<div className="space-y-6">
			<div className="text-center py-8">
				<div className="w-16 h-16 bg-pk-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
					<Check className="w-8 h-8 text-pk-primary" />
				</div>
				<h2 className="text-xl font-bold mb-2">Setup Complete!</h2>
				<p className="text-muted-foreground">
					Your local AI is ready to use. Both servers will start automatically
					when you open Parrot.
				</p>
			</div>

			<div className="space-y-3">
				<h3 className="font-medium">Test Results:</h3>
				<div
					className={`flex items-center gap-3 p-3 rounded-lg border ${
						testResults?.transcription
							? "bg-pk-primary/10 border-pk-primary/30"
							: "bg-red-50 border-red-200"
					}`}
				>
					{testResults?.transcription ? (
						<Check className="w-5 h-5 text-pk-primary" />
					) : (
						<X className="w-5 h-5 text-red-600" />
					)}
					<div>
						<div className="font-medium">Transcription Server</div>
						<div className="text-sm text-muted-foreground">
							{testResults?.transcription
								? "Responding correctly"
								: "Failed to respond"}
						</div>
					</div>
				</div>

				<div
					className={`flex items-center gap-3 p-3 rounded-lg border ${
						testResults?.cleanup
							? "bg-pk-primary/10 border-pk-primary/30"
							: "bg-red-50 border-red-200"
					}`}
				>
					{testResults?.cleanup ? (
						<Check className="w-5 h-5 text-pk-primary" />
					) : (
						<X className="w-5 h-5 text-red-600" />
					)}
					<div>
						<div className="font-medium">Text Cleanup Server</div>
						<div className="text-sm text-muted-foreground">
							{testResults?.cleanup
								? "Responding correctly"
								: "Failed to respond"}
						</div>
					</div>
				</div>
			</div>

			{!allTestsPassed && (
				<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<div className="flex items-start gap-2">
						<AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
						<div className="text-sm text-yellow-700">
							<p className="font-medium">Some tests failed</p>
							<p className="mt-1">
								You can still use Parrot, but some features may not work. Check
								the settings to troubleshoot.
							</p>
						</div>
					</div>
				</div>
			)}

			<div className="flex justify-end pt-4">
				<Button onClick={onFinish}>Start Using Parrot</Button>
			</div>
		</div>
	);
}

// Main wizard component
export function LocalSetupWizard({ onComplete }: { onComplete: () => void }) {
	const [currentStep, setCurrentStep] = useState<
		| "system-check"
		| "model-selection"
		| "installation"
		| "manual-intervention"
		| "completion"
	>("system-check");

	const [systemRequirements, setSystemRequirements] =
		useState<SystemRequirements | null>(null);
	const [selectedWhisperModel, setSelectedWhisperModel] = useState("base.en");
	const [selectedOllamaModel, setSelectedOllamaModel] = useState("llama3.2");
	const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(
		null,
	);
	const [logMessages, setLogMessages] = useState<string[]>([]);
	const [manualInstructions, setManualInstructions] =
		useState<ManualInstructions | null>(null);
	const [testResults, setTestResults] = useState<{
		transcription: boolean;
		cleanup: boolean;
	} | null>(null);

	// Load system requirements on mount
	useEffect(() => {
		const loadRequirements = async () => {
			try {
				console.log("Checking system requirements...");
				const result = await invoke<SystemRequirements>(
					"check_system_requirements",
				);
				console.log("System requirements:", result);
				setSystemRequirements(result);
			} catch (error) {
				console.error("Failed to check requirements:", error);
				// Show error in UI
				setLogMessages((prev) => [
					...prev,
					`Error checking requirements: ${error instanceof Error ? error.message : String(error)}`,
				]);
			}
		};
		loadRequirements();
	}, []);

	// Listen for setup progress events
	useEffect(() => {
		const unlisten = listen<SetupProgress>("setup-progress", (event) => {
			setSetupProgress(event.payload);

			// Add to log
			if (event.payload.status.type === "in_progress") {
				const status = event.payload.status;
				setLogMessages((prev) => [
					...prev,
					`${new Date().toLocaleTimeString()} - ${status.message}`,
				]);
			}

			// Handle manual intervention
			if (event.payload.status.type === "manual_intervention_required") {
				setManualInstructions(event.payload.status.instructions);
				setCurrentStep("manual-intervention");
			}
		});

		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	// Listen for setup completion
	useEffect(() => {
		const unlisten = listen<{
			success: boolean;
			config?: LocalSetupConfig;
			error?: string;
		}>("setup-complete", (event) => {
			if (event.payload.success) {
				// Run validation tests
				runValidationTests();
			} else {
				const err = event.payload.error ?? "Unknown error";
				setLogMessages((prev) => [
					...prev,
					`${new Date().toLocaleTimeString()} - Error: ${err}`,
				]);
				setSetupProgress((prev) =>
					prev
						? {
								...prev,
								status: { type: "failed", error: err, recoverable: false },
							}
						: prev,
				);
			}
		});

		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	const runValidationTests = async () => {
		try {
			const results = await invoke<{ transcription: boolean; cleanup: boolean }>(
				"validate_local_servers",
			);
			setTestResults(results);
		} catch (error) {
			console.error("Validation failed:", error);
			setTestResults({ transcription: false, cleanup: false });
		}
		setCurrentStep("completion");
	};

	const startInstallation = useCallback(async () => {
		setCurrentStep("installation");
		setLogMessages([]);

		try {
			await invoke("start_local_setup", {
				request: {
					whisperModel: selectedWhisperModel,
					ollamaModel: selectedOllamaModel,
				},
			});
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error("Failed to start setup:", error);
			setLogMessages((prev) => [
				...prev,
				`${new Date().toLocaleTimeString()} - Failed to start setup: ${msg}`,
			]);
			setSetupProgress({
				step: { type: "system_check" },
				status: { type: "failed", error: msg, recoverable: false },
				overall_progress: 0,
			});
		}
	}, [selectedWhisperModel, selectedOllamaModel]);

	const continueAfterManualIntervention = async () => {
		try {
			await invoke("continue_local_setup");
			// The setup will continue and emit more progress events
		} catch (error) {
			console.error("Failed to continue setup:", error);
		}
	};

	return (
		<div className="space-y-6">
			{/* Step content */}
			<div className="relative overflow-hidden">
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={currentStep}
						variants={stepVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						transition={stepTransition}
					>
						{currentStep === "system-check" && (
							<SystemCheckStep
								requirements={systemRequirements}
								onContinue={() => setCurrentStep("model-selection")}
							/>
						)}

						{currentStep === "model-selection" && (
							<ModelSelectionStep
								selectedWhisper={selectedWhisperModel}
								selectedOllama={selectedOllamaModel}
								onSelectWhisper={setSelectedWhisperModel}
								onSelectOllama={setSelectedOllamaModel}
								onContinue={startInstallation}
							/>
						)}

						{currentStep === "installation" && (
							<InstallationProgressStep
								progress={setupProgress}
								logMessages={logMessages}
								onRetry={startInstallation}
							/>
						)}

						{currentStep === "manual-intervention" && manualInstructions && (
							<ManualInterventionStep
								instructions={manualInstructions}
								onContinue={continueAfterManualIntervention}
							/>
						)}

						{currentStep === "completion" && (
							<CompletionStep onFinish={onComplete} testResults={testResults} />
						)}
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}
