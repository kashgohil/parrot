import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Check, Key, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_onboarding/setup-mode")({
	component: SetupModePage,
});

const TIERS = [
	{
		id: "byok" as const,
		name: "Bring Your Key",
		tagline: "Your keys. Our infrastructure.",
		price: "$5",
		priceSub: "/ month",
		description:
			"Use your own API keys for transcription and AI cleanup. We handle syncing across devices.",
		icon: Key,
		accent: "border-sky-500/30 bg-sky-50/50",
		accentSelected: "border-sky-500 bg-sky-50 ring-2 ring-sky-500/20",
		iconBg: "bg-sky-100 text-sky-700",
		iconBgSelected: "bg-sky-500 text-white",
		features: [
			"Cloud sync for history & settings",
			"Your own OpenAI / Deepgram keys",
			"Cross-device vocabulary sync",
			"Priority support",
		],
		providerCosts: [
			{ name: "OpenAI Whisper", cost: "~$0.006/min" },
			{ name: "Deepgram", cost: "~$0.004/min" },
		],
		requiresSubscription: true,
		polarProductId: import.meta.env.VITE_POLAR_PRODUCT_BYOK,
	},
	{
		id: "managed" as const,
		name: "Managed",
		tagline: "You talk, we handle the rest.",
		price: "$15",
		priceSub: "/ month",
		description:
			"No API keys to manage. We provision and pay for transcription and AI on your behalf.",
		icon: Sparkles,
		accent: "border-violet-500/30 bg-violet-50/50",
		accentSelected: "border-violet-500 bg-violet-50 ring-2 ring-violet-500/20",
		iconBg: "bg-violet-100 text-violet-700",
		iconBgSelected: "bg-violet-500 text-white",
		features: [
			"No API keys needed",
			"2,000 minutes / month included",
			"Unlimited AI cleanup requests",
			"Automatic model upgrades",
			"Usage dashboard",
		],
		popular: true,
		requiresSubscription: true,
		polarProductId: import.meta.env.VITE_POLAR_PRODUCT_MANAGED,
	},
];

type TierId = (typeof TIERS)[number]["id"];

function SetupModePage() {
	const navigate = useNavigate();
	const { updateOnboarding } = useAuth();
	const [selected, setSelected] = useState<TierId | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleContinue = async () => {
		if (!selected) return;

		const tier = TIERS.find((t) => t.id === selected);
		if (!tier) return;

		setIsSubmitting(true);
		try {
			// For paid tiers, redirect to checkout
			if (tier.requiresSubscription && tier.polarProductId) {
				const successUrl = encodeURIComponent("https://tryparrot.app/checkout/success");
				const checkoutUrl = `https://polar.sh/checkout?productId=${tier.polarProductId}&successUrl=${successUrl}`;
				await openUrl(checkoutUrl);
				// User will complete checkout in browser, then return to app
				setIsSubmitting(false);
				return;
			}

			// Save cloud tier selection
			await invoke("set_setting", { key: "subscription_tier", value: selected });
			await updateOnboarding(false, "cloud");

			navigate({ to: "/cloud-setup" });
		} catch (err) {
			console.error("Failed to save setup mode:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const selectedTier = TIERS.find((t) => t.id === selected);

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-foreground mb-2">
					Choose Your Cloud Plan
				</h2>
				<p className="text-muted-foreground">
					Select how you want to handle transcription and AI cleanup in the cloud.
				</p>
			</div>

			<div className="space-y-3">
				{TIERS.map((tier) => {
					const Icon = tier.icon;
					const isSelected = selected === tier.id;

					return (
						<div
							key={tier.id}
							onClick={() => setSelected(tier.id)}
							className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
								isSelected ? tier.accentSelected : tier.accent
							} hover:border-opacity-60`}
						>
							{tier.popular && (
								<div className="absolute -top-2.5 right-4">
									<span className="px-2.5 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
										Popular
									</span>
								</div>
							)}

							<div className="flex gap-4">
								<div
									className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
										isSelected ? tier.iconBgSelected : tier.iconBg
									}`}
								>
									<Icon className="w-5 h-5" />
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-baseline justify-between mb-1">
										<h3 className="font-semibold text-foreground">
											{tier.name}
										</h3>
										<div className="flex items-baseline gap-1">
											<span className="text-lg font-bold text-foreground">
												{tier.price}
											</span>
											<span className="text-xs text-muted-foreground">
												{tier.priceSub}
											</span>
										</div>
									</div>

									<p className="text-sm text-muted-foreground mb-3">
										{tier.description}
									</p>

									<ul className="grid grid-cols-1 gap-1.5">
										{tier.features.slice(0, isSelected ? undefined : 3).map((f, i) => (
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

									{tier.providerCosts && isSelected && (
										<div className="mt-3 pt-3 border-t border-border/50">
											<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
												Provider costs (you pay directly)
											</p>
											<div className="flex gap-4">
												{tier.providerCosts.map((p) => (
													<div key={p.name} className="text-xs">
														<span className="text-muted-foreground">
															{p.name}:
														</span>{" "}
														<span className="font-medium text-foreground">
															{p.cost}
														</span>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex justify-center pt-2">
				<Button
					size="lg"
					onClick={handleContinue}
					disabled={!selected || isSubmitting}
					className="px-8"
				>
					{isSubmitting
						? "Loading..."
						: selectedTier?.requiresSubscription
						? `Continue to checkout`
						: "Continue"}
				</Button>
			</div>

			<p className="text-center text-xs text-muted-foreground">
				You can change your plan anytime in Settings.
			</p>
		</div>
	);
}
