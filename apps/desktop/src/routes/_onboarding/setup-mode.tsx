import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_onboarding/setup-mode")({
	component: SetupModePage,
});

const PRO_TIER = {
	id: "managed" as const,
	name: "Pro",
	tagline: "Cloud-powered accuracy. Sync everywhere.",
	price: "$8",
	priceSub: "/ month",
	annualPrice: "$6",
	annualPriceSub: "/ month, billed annually",
	description:
		"Higher accuracy transcription, AI cleanup, cross-device sync, and cloud history backup.",
	icon: Sparkles,
	accent: "border-violet-500/30 bg-violet-50/50",
	accentSelected: "border-violet-500 bg-violet-50 ring-2 ring-violet-500/20",
	iconBg: "bg-violet-100 text-violet-700",
	iconBgSelected: "bg-violet-500 text-white",
	features: [
		"120 minutes / month of cloud transcription",
		"Unlimited AI cleanup requests",
		"Cloud sync for history & settings",
		"Cross-device vocabulary sync",
		"Bring your own API keys for unlimited usage",
		"Email support",
	],
	requiresSubscription: true,
	polarProductId: import.meta.env.VITE_POLAR_PRODUCT_PRO,
};

function SetupModePage() {
	const navigate = useNavigate();
	const { updateOnboarding } = useAuth();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleContinue = async () => {
		setIsSubmitting(true);
		try {
			// Redirect to Polar checkout for Pro tier
			if (PRO_TIER.polarProductId) {
				const successUrl = encodeURIComponent(
					"https://tryparrot.app/checkout/success",
				);
				const checkoutUrl = `https://polar.sh/checkout?productId=${PRO_TIER.polarProductId}&successUrl=${successUrl}`;
				await openUrl(checkoutUrl);
				// User will complete checkout in browser, then return to app
				setIsSubmitting(false);
				return;
			}

			// Fallback: save cloud tier selection
			await invoke("set_setting", {
				key: "subscription_tier",
				value: PRO_TIER.id,
			});
			await updateOnboarding(false, "cloud");

			navigate({ to: "/cloud-setup" });
		} catch (err) {
			console.error("Failed to save setup mode:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const Icon = PRO_TIER.icon;

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-foreground mb-2">Parrot Pro</h2>
				<p className="text-muted-foreground">{PRO_TIER.tagline}</p>
			</div>

			<div
				className={`relative rounded-xl border p-5 ${PRO_TIER.accentSelected}`}
			>
				<div className="flex gap-4">
					<div
						className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${PRO_TIER.iconBgSelected}`}
					>
						<Icon className="w-5 h-5" />
					</div>

					<div className="flex-1 min-w-0">
						<div className="flex items-baseline justify-between mb-1">
							<h3 className="font-semibold text-foreground">{PRO_TIER.name}</h3>
							<div className="flex items-baseline gap-1">
								<span className="text-lg font-bold text-foreground">
									{PRO_TIER.price}
								</span>
								<span className="text-xs text-muted-foreground">
									{PRO_TIER.priceSub}
								</span>
							</div>
						</div>

						<p className="text-sm text-muted-foreground mb-3">
							{PRO_TIER.description}
						</p>

						<ul className="grid grid-cols-1 gap-1.5">
							{PRO_TIER.features.map((f, i) => (
								<li
									key={i}
									className="flex items-center gap-2 text-xs text-foreground/80"
								>
									<Check
										className="w-3.5 h-3.5 text-primary shrink-0"
										strokeWidth={2.5}
									/>
									{f}
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>

			<div className="flex justify-center pt-2">
				<Button
					size="lg"
					onClick={handleContinue}
					disabled={isSubmitting}
					className="px-8"
				>
					{isSubmitting ? "Loading..." : "Continue to checkout"}
				</Button>
			</div>

			<p className="text-center text-xs text-muted-foreground">
				You can change your plan anytime in Settings.
			</p>
		</div>
	);
}
