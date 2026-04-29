import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout/success")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
	component: () => null,
});
