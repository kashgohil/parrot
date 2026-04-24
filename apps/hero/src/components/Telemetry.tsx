import posthog from "posthog-js";
import { useEffect } from "react";

let initialized = false;

function init() {
	if (initialized || typeof window === "undefined") return;
	initialized = true;

	const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
	if (posthogKey) {
		posthog.init(posthogKey, {
			api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com",
			person_profiles: "identified_only",
		});
	}
}

export function Telemetry() {
	useEffect(() => {
		init();
	}, []);
	return null;
}
