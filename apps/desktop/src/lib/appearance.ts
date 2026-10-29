import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Light / dark mode. "system" follows the macOS appearance.
 *
 * The saved choice lives in the settings table (`appearance`). A copy in
 * localStorage lets the inline script in index.html set the mode before the
 * first paint, and lets the HUD window follow changes made in the main window.
 */
export type Appearance = "system" | "light" | "dark";

const STORAGE_KEY = "parrot-appearance";
const SETTING_KEY = "appearance";
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function isAppearance(value: unknown): value is Appearance {
	return value === "system" || value === "light" || value === "dark";
}

export function cachedAppearance(): Appearance {
	try {
		const value = localStorage.getItem(STORAGE_KEY);
		return isAppearance(value) ? value : "system";
	} catch {
		return "system";
	}
}

function apply(pref: Appearance) {
	const dark = pref === "dark" || (pref === "system" && darkQuery().matches);
	const root = document.documentElement;
	// Both classes are set explicitly: `.dark` drives Tailwind's dark: variant,
	// `.light` stops the theme's prefers-color-scheme block from applying.
	root.classList.toggle("dark", dark);
	root.classList.toggle("light", !dark);
	// Native window chrome (traffic lights, vibrancy) follows the same choice.
	getCurrentWindow()
		.setTheme(pref === "system" ? null : pref)
		.catch(() => {});
}

/** Apply now, then keep following macOS, other windows and the saved setting. */
export function initAppearance() {
	let pref = cachedAppearance();
	apply(pref);

	darkQuery().addEventListener("change", () => {
		if (pref === "system") apply(pref);
	});
	// Fires in the other windows (e.g. the HUD) when Settings changes it.
	window.addEventListener("storage", (e) => {
		if (e.key === STORAGE_KEY && isAppearance(e.newValue)) {
			pref = e.newValue;
			apply(pref);
		}
	});

	invoke<string | null>("get_setting", { key: SETTING_KEY })
		.then((saved) => {
			if (isAppearance(saved) && saved !== pref) {
				pref = saved;
				try {
					localStorage.setItem(STORAGE_KEY, saved);
				} catch {}
				apply(pref);
			}
		})
		.catch(() => {});

	return {
		set(next: Appearance) {
			pref = next;
			try {
				localStorage.setItem(STORAGE_KEY, next);
			} catch {}
			apply(next);
			return invoke("set_setting", { key: SETTING_KEY, value: next });
		},
	};
}

let controller: ReturnType<typeof initAppearance> | null = null;

export function startAppearance() {
	controller ??= initAppearance();
	return controller;
}

export function setAppearance(next: Appearance) {
	return startAppearance().set(next);
}
