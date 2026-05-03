import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useEffect, useRef, useState } from "react";

export type UpdaterPhase =
	| "idle"
	| "checking"
	| "downloading"
	| "ready"
	| "installing"
	| "error";

export interface UpdaterState {
	phase: UpdaterPhase;
	availableVersion: string | null;
	currentVersion: string | null;
	notes: string | null;
	error: string | null;
}

const initialState: UpdaterState = {
	phase: "idle",
	availableVersion: null,
	currentVersion: null,
	notes: null,
	error: null,
};

/**
 * Silent-download updater.
 *
 * On mount: probes the endpoint, and if a newer version exists, starts
 * downloading it in the background — invisibly. The user only sees a sidebar
 * banner once the download is finished and the app is ready to apply the
 * update on relaunch ("Restart to update" pattern, à la Chrome / VS Code /
 * Linear / Cursor).
 *
 * Failures (no network, endpoint not reachable, signature mismatch) keep the
 * hook silent and log a warning.
 */
// Re-check cadence. 30 min is the steady-state interval (matches Chrome/VS
// Code), and we also re-check on window focus if it's been longer than the
// focus threshold since the last attempt.
const RECHECK_INTERVAL_MS = 30 * 60 * 1000;
const FOCUS_RECHECK_THRESHOLD_MS = 5 * 60 * 1000;

export function useUpdater(): UpdaterState & {
	apply: () => Promise<void>;
	dismiss: () => void;
} {
	const [state, setState] = useState<UpdaterState>(initialState);
	const updateRef = useRef<Update | null>(null);
	const inFlightRef = useRef(false);
	const lastCheckRef = useRef(0);
	const phaseRef = useRef<UpdaterPhase>("idle");

	useEffect(() => {
		phaseRef.current = state.phase;
	}, [state.phase]);

	useEffect(() => {
		// Skip in dev — the placeholder endpoint isn't real.
		if (import.meta.env.DEV) return;

		const runCheck = async () => {
			if (inFlightRef.current) return;
			// Don't re-check once we already have an update queued or applied.
			const phase = phaseRef.current;
			if (phase === "downloading" || phase === "ready" || phase === "installing") {
				return;
			}

			inFlightRef.current = true;
			lastCheckRef.current = Date.now();
			setState((s) => ({ ...s, phase: "checking" }));

			let update: Update | null = null;
			try {
				update = await check();
			} catch (e) {
				console.warn("[updater] check skipped:", e);
				setState((s) => ({ ...s, phase: "idle" }));
				inFlightRef.current = false;
				return;
			}

			if (!update) {
				setState((s) => ({ ...s, phase: "idle" }));
				inFlightRef.current = false;
				return;
			}

			updateRef.current = update;
			setState({
				phase: "downloading",
				availableVersion: update.version,
				currentVersion: update.currentVersion ?? null,
				notes: update.body?.split("\n")[0] ?? null,
				error: null,
			});

			try {
				await update.download();
				setState((s) => ({ ...s, phase: "ready" }));
			} catch (e) {
				console.warn("[updater] background download failed:", e);
				// Keep silent — we'll retry on next interval/focus. Reset to idle
				// so the sidebar stays clean.
				setState((s) => ({ ...s, phase: "idle" }));
			} finally {
				inFlightRef.current = false;
			}
		};

		runCheck();
		const interval = setInterval(runCheck, RECHECK_INTERVAL_MS);

		const onFocus = () => {
			if (Date.now() - lastCheckRef.current >= FOCUS_RECHECK_THRESHOLD_MS) {
				runCheck();
			}
		};
		window.addEventListener("focus", onFocus);

		return () => {
			clearInterval(interval);
			window.removeEventListener("focus", onFocus);
		};
	}, []);

	const apply = async () => {
		const update = updateRef.current;
		if (!update) return;

		setState((s) => ({ ...s, phase: "installing", error: null }));
		try {
			await update.install();
			await relaunch();
		} catch (e) {
			console.error("[updater] install failed", e);
			setState((s) => ({
				...s,
				phase: "error",
				error: e instanceof Error ? e.message : String(e),
			}));
		}
	};

	const dismiss = () => {
		setState(initialState);
		updateRef.current = null;
	};

	return { ...state, apply, dismiss };
}
