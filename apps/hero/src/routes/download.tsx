import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/download")({
	beforeLoad: () => {
		throw redirect({ to: "/waitlist" });
	},
	component: () => null,
});
