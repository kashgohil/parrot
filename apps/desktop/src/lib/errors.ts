import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

interface ErrorPattern {
	match: RegExp;
	message: string;
}

const KNOWN_PATTERNS: ErrorPattern[] = [
	{
		match: /accessibility|not.*trusted|not.*authorized/i,
		message:
			"Parrot needs Accessibility permission to paste your dictation. Open System Settings → Privacy & Security → Accessibility and enable Parrot.",
	},
	{
		match: /clipboard/i,
		message:
			"Couldn't copy your dictation to the clipboard. Try again, and if it keeps happening, restart Parrot.",
	},
	{
		match: /whisper.*(server|exit|bind|listening)/i,
		message:
			"The local transcription server isn't responding. Open Settings to restart local servers.",
	},
	{
		match: /ollama.*(server|exit|bind|daemon)/i,
		message:
			"The local cleanup model server isn't running. Open Settings to restart local servers.",
	},
	{
		match: /(connection refused|failed to connect|network|timed out|timeout)/i,
		message:
			"Couldn't reach the network. Check your internet connection and try again.",
	},
	{
		match: /session token|unauthor|401|403/i,
		message: "Your session expired. Please sign in again.",
	},
	{
		match: /no audio|recording.*empty|no microphone/i,
		message:
			"Parrot didn't capture any audio. Check your microphone and that Parrot has microphone permission.",
	},
	{
		match: /disk space|no space left/i,
		message: "Your Mac is out of disk space. Free some up and try again.",
	},
	{
		match: /model.*(download|not found|missing)/i,
		message:
			"The local model isn't ready yet. Open Settings → Local Setup to finish downloading it.",
	},
	{
		match: /homebrew/i,
		message:
			"Homebrew is required for local setup. Install it from brew.sh, then retry.",
	},
];

const GENERIC_MESSAGE = "Something went wrong.";

export function describeError(error: unknown): {
	userMessage: string;
	technical: string;
} {
	const technical = serializeError(error);

	for (const pattern of KNOWN_PATTERNS) {
		if (pattern.match.test(technical)) {
			return { userMessage: pattern.message, technical };
		}
	}

	return { userMessage: GENERIC_MESSAGE, technical };
}

function serializeError(error: unknown): string {
	if (error instanceof Error) {
		return error.stack || `${error.name}: ${error.message}`;
	}
	if (typeof error === "string") return error;
	if (error == null) return "(no error details)";
	try {
		return JSON.stringify(error, null, 2);
	} catch {
		return String(error);
	}
}

interface ShowErrorOptions {
	/** A short verb phrase like "transcribing your dictation" — used in the generic message. */
	context?: string;
}

export function showError(error: unknown, options: ShowErrorOptions = {}): void {
	const { userMessage, technical } = describeError(error);
	const finalMessage =
		userMessage === GENERIC_MESSAGE && options.context
			? `Something went wrong while ${options.context}.`
			: userMessage;

	const detailsForCopy = options.context
		? `Context: ${options.context}\n\n${technical}`
		: technical;

	toast.error(finalMessage, {
		duration: 8000,
		action: {
			label: "Copy details",
			onClick: () => {
				navigator.clipboard.writeText(detailsForCopy).then(
					() => toast.success("Error details copied", { duration: 2000 }),
					() => toast.error("Couldn't copy to clipboard", { duration: 2000 }),
				);
			},
		},
	});

	console.error("[parrot]", options.context ?? "error", error);
}

/**
 * Show a toast specifically for "Parrot can't paste because Accessibility
 * permission is missing." Includes a one-click "Open Settings" action that
 * jumps straight to the right macOS pane.
 */
export function showAccessibilityPermissionToast(details?: string): void {
	toast.error(
		"Parrot needs Accessibility permission to paste your dictation. Enable it in System Settings, then try again.",
		{
			id: "accessibility-permission",
			duration: Infinity,
			action: {
				label: "Open Settings",
				onClick: () => {
					invoke("open_system_settings", { pane: "accessibility" }).catch(
						(e) => showError(e, { context: "opening System Settings" }),
					);
				},
			},
			cancel: details
				? {
						label: "Copy details",
						onClick: () => {
							navigator.clipboard.writeText(details).then(
								() => toast.success("Error details copied", { duration: 2000 }),
								() =>
									toast.error("Couldn't copy to clipboard", { duration: 2000 }),
							);
						},
					}
				: undefined,
		},
	);
}

/** Install global handlers so unhandled rejections / errors still surface a toast. */
export function installGlobalErrorHandlers(): void {
	if (typeof window === "undefined") return;
	if ((window as unknown as { __parrotErrorHandlersInstalled?: boolean }).__parrotErrorHandlersInstalled) {
		return;
	}
	(window as unknown as { __parrotErrorHandlersInstalled: boolean }).__parrotErrorHandlersInstalled = true;

	window.addEventListener("unhandledrejection", (event) => {
		showError(event.reason);
	});

	window.addEventListener("error", (event) => {
		showError(event.error ?? event.message);
	});
}
