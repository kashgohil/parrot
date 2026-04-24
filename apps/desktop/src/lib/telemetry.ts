import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

export function initTelemetry() {
	const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
	if (sentryDsn) {
		Sentry.init({
			dsn: sentryDsn,
			environment: import.meta.env.MODE,
			tracesSampleRate: 0.1,
			initialScope: { tags: { app: "parrot-desktop" } },
		});
	}

	const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
	if (posthogKey) {
		posthog.init(posthogKey, {
			api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com",
			person_profiles: "identified_only",
			capture_pageview: false,
		});
	}
}

export { posthog };
