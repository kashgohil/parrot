import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export type PermissionState = "granted" | "denied" | "restricted" | "notDetermined" | "unknown";

export interface PermissionsStatus {
	accessibility: PermissionState;
	microphone: PermissionState;
}

async function fetchStatus(): Promise<PermissionsStatus> {
	const [ax, mic] = await Promise.all([
		invoke<boolean>("check_accessibility_permission").catch(() => true),
		invoke<string>("check_microphone_permission").catch(() => "unknown"),
	]);
	return {
		accessibility: ax ? "granted" : "denied",
		microphone: (mic as PermissionState) ?? "unknown",
	};
}

// Hook that polls permission status. Polls every 2s while the document is
// visible — TCC changes are user-initiated in System Settings, so a slow poll
// is sufficient and we pause when the window is hidden.
export function usePermissions(): PermissionsStatus {
	const [status, setStatus] = useState<PermissionsStatus>({
		accessibility: "granted",
		microphone: "granted",
	});

	useEffect(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setInterval> | null = null;

		const tick = () => {
			fetchStatus().then((s) => {
				if (!cancelled) setStatus(s);
			});
		};

		const start = () => {
			if (timer) return;
			tick();
			timer = setInterval(tick, 2000);
		};
		const stop = () => {
			if (timer) {
				clearInterval(timer);
				timer = null;
			}
		};
		const onVisibility = () => {
			if (document.visibilityState === "visible") start();
			else stop();
		};

		if (document.visibilityState === "visible") start();
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("focus", start);

		return () => {
			cancelled = true;
			stop();
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("focus", start);
		};
	}, []);

	return status;
}

export function isMissing(state: PermissionState): boolean {
	return state === "denied" || state === "restricted" || state === "notDetermined";
}

export async function openPermissionSettings(pane: "accessibility" | "microphone"): Promise<void> {
	await invoke("open_system_settings", { pane });
}
