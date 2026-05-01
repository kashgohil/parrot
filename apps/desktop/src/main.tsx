import { RouterProvider, createRouter } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React from "react";
import ReactDOM from "react-dom/client";
import { HudOrb } from "./components/hud-orb";
import { AuthProvider } from "./lib/auth";
import { initTelemetry } from "./lib/telemetry";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

initTelemetry();

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// The HUD orb runs in a dedicated Tauri window labeled "hud". Branching here
// (instead of routing) keeps the HUD entirely outside the main router/auth
// tree, and avoids the SPA-fallback fragility of TanStack Router's path
// history when loading a non-root URL in production.
const isHudWindow = getCurrentWindow().label === "hud";

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);

if (isHudWindow) {
	// The global body/root styles paint an opaque cream background, which
	// would defeat the transparent NSWindow. Tag the document so the HUD
	// scoped styles in styles.css can null those out.
	document.documentElement.classList.add("hud-window");
	root.render(
		<React.StrictMode>
			<HudOrb />
		</React.StrictMode>,
	);
} else {
	root.render(
		<React.StrictMode>
			<AuthProvider>
				<RouterProvider router={router} />
			</AuthProvider>
		</React.StrictMode>,
	);
}
