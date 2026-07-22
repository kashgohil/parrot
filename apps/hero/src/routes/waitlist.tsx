import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route from the pre-launch waitlist — permanently moved to /download.
export const Route = createFileRoute("/waitlist")({
	beforeLoad: () => {
		throw redirect({ to: "/download", statusCode: 301 });
	},
});
