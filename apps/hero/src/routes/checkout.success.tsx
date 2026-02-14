import Footer from "@/components/Footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/checkout/success")({
	component: CheckoutSuccessPage,
	head: () => ({
		meta: [{ title: "Welcome to Parrot - subscription active" }],
	}),
});

const TIER_INFO: Record<
	string,
	{ name: string; icon: typeof Zap; features: string[] }
> = {
	pro: {
		name: "Pro",
		icon: Zap,
		features: [
			"120 min/month cloud transcription",
			"Unlimited AI cleanup",
			"Cloud sync & backup",
		],
	},
	teams: {
		name: "Teams",
		icon: Users,
		features: [
			"300 min/user/month transcription",
			"Shared team vocabulary",
			"Team management & billing",
		],
	},
};

function CheckoutSuccessPage() {
	const params = new URLSearchParams(window.location.search);
	const tierKey = params.get("tier") || "pro";
	const tier = TIER_INFO[tierKey] || TIER_INFO.pro;
	const TierIcon = tier.icon;

	return (
		<div className="min-h-screen">
			<section className="px-6 pt-24 pb-20">
				<div className="max-w-lg mx-auto text-center">
					<div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
						<Check size={32} strokeWidth={2.5} className="text-emerald-600" />
					</div>

					<h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-4">
						You're all set.
					</h1>
					<p className="text-muted-foreground text-lg mb-8 leading-relaxed">
						Your {tier.name} subscription is active. Download Parrot and sign in
						with the same email to unlock your plan.
					</p>

					{/* Plan summary */}
					<div className="bg-muted/50 rounded-xl border border-border p-5 mb-8 text-left">
						<div className="flex items-center gap-3 mb-3">
							<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<TierIcon className="w-4 h-4 text-primary" />
							</div>
							<span className="font-semibold text-foreground">
								Parrot {tier.name}
							</span>
						</div>
						<ul className="space-y-2">
							{tier.features.map((feature, i) => (
								<li
									key={i}
									className="flex items-center gap-2 text-sm text-foreground/80"
								>
									<Check
										className="w-3.5 h-3.5 text-primary shrink-0"
										strokeWidth={2.5}
									/>
									{feature}
								</li>
							))}
						</ul>
					</div>

					{/* Next steps */}
					<div className="bg-primary/5 rounded-xl border border-primary/10 p-5 mb-8 text-left">
						<p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
							Next steps
						</p>
						<ol className="space-y-2 text-sm text-foreground/80">
							<li className="flex items-start gap-2.5">
								<span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
									1
								</span>
								Download Parrot for Mac
							</li>
							<li className="flex items-start gap-2.5">
								<span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
									2
								</span>
								Sign in with the same email you used at checkout
							</li>
							<li className="flex items-start gap-2.5">
								<span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
									3
								</span>
								Choose Cloud Mode during setup — your plan activates
								automatically
							</li>
						</ol>
					</div>

					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Link
							to="/download"
							className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors no-underline"
						>
							Download Parrot
							<ArrowRight size={16} strokeWidth={2.5} />
						</Link>
						<a
							href="https://polar.sh/settings/subscriptions"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border bg-background text-foreground font-semibold rounded-xl hover:bg-muted transition-colors no-underline"
						>
							Manage subscription
						</a>
					</div>
				</div>
			</section>
			<Footer />
		</div>
	);
}
