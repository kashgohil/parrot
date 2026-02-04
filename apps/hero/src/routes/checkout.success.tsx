import Footer from "@/components/Footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/checkout/success")({
	component: CheckoutSuccessPage,
	head: () => ({
		meta: [{ title: "Welcome to Parrot - subscription active" }],
	}),
});

function CheckoutSuccessPage() {
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
						Your subscription is active. Download Parrot and sign in with the
						same email to unlock your plan.
					</p>

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
