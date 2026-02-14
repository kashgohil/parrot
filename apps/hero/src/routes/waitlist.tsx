import Footer from "@/components/Footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/waitlist")({
	component: WaitlistPage,
	head: () => ({
		meta: [
			{ title: "Join the Waitlist - Parrot" },
			{
				name: "description",
				content:
					"Be the first to try Parrot. Voice dictation for Mac with cleanup, custom vocabulary, and local-first privacy.",
			},
			{ property: "og:title", content: "Join the Waitlist - Parrot" },
			{
				property: "og:description",
				content:
					"Be the first to try Parrot. Voice dictation for Mac with cleanup, custom vocabulary, and local-first privacy.",
			},
			{ property: "og:url", content: "https://tryparrot.app/waitlist" },
			{ name: "twitter:title", content: "Join the Waitlist - Parrot" },
			{
				name: "twitter:description",
				content:
					"Be the first to try Parrot. Voice dictation for Mac with cleanup, custom vocabulary, and local-first privacy.",
			},
			{
				name: "keywords",
				content:
					"Parrot waitlist, voice dictation app, mac dictation, speech to text, early access dictation",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/waitlist" }],
	}),
});

function WaitlistPage() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [errorMsg, setErrorMsg] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		setStatus("loading");
		try {
			const apiUrl =
				import.meta.env.VITE_API_URL || "https://api.tryparrot.app";
			const response = await fetch(`${apiUrl}/api/waitlist`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, source: "website" }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to join waitlist");
			}

			setStatus("success");
		} catch (err) {
			setStatus("error");
			setErrorMsg(
				err instanceof Error
					? err.message
					: "Something went wrong. Please try again.",
			);
		}
	};

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Coming soon
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						Be the first to try Parrot
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl mb-10 animate-fade-in-up-delay-2">
						Voice dictation for Mac. 3x faster than typing, with cleanup that
						removes filler words and fixes grammar. Runs locally or in the
						cloud.
					</p>

					{status === "success" ? (
						<div className="animate-fade-in-up bg-primary/10 border border-primary/20 rounded-2xl p-6 max-w-md">
							<div className="flex items-center gap-3 mb-2">
								<div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
									<Check className="w-5 h-5 text-primary" />
								</div>
								<p className="text-lg font-bold text-foreground">
									You're on the list!
								</p>
							</div>
							<p className="text-sm text-muted-foreground">
								We'll email you when Parrot is ready. Thanks for your interest.
							</p>
						</div>
					) : (
						<form
							onSubmit={handleSubmit}
							className="flex flex-col sm:flex-row gap-3 max-w-md animate-fade-in-up-delay-3"
						>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter your email"
								required
								className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
							/>
							<button
								type="submit"
								disabled={status === "loading"}
								className="px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{status === "loading" ? (
									"Joining..."
								) : (
									<>
										Join waitlist
										<ArrowRight size={16} strokeWidth={2.5} />
									</>
								)}
							</button>
						</form>
					)}

					{status === "error" && (
						<p className="text-sm text-red-500 mt-3">{errorMsg}</p>
					)}

					<p className="text-xs text-muted-foreground mt-6 animate-fade-in-up-delay-3">
						No spam. We'll only email you when Parrot launches.
					</p>
				</div>
			</section>

			{/* What you'll get */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						What you'll get
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						The voice dictation app you've been waiting for
					</h2>

					<div className="grid sm:grid-cols-2 gap-6">
						{[
							{
								title: "3x faster than typing",
								desc: "Average speaking speed is 150 wpm. Average typing is 40 wpm. You do the math.",
							},
							{
								title: "Cleanup built-in",
								desc: "Removes filler words, fixes grammar, and applies your writing style automatically.",
							},
							{
								title: "Custom vocabulary",
								desc: "Add names, acronyms, and jargon so they're transcribed correctly every time.",
							},
							{
								title: "Local or cloud - your choice",
								desc: "Run everything on-device for privacy, or use cloud APIs for speed. Switch anytime.",
							},
							{
								title: "Works in any app",
								desc: "Global hotkey + auto-paste. Parrot works wherever your cursor is.",
							},
							{
								title: "Native Mac app",
								desc: "Native app with minimal footprint. Light, fast, no bloat.",
							},
						].map((item, i) => (
							<div key={i} className="border-l-2 border-primary/25 pl-4">
								<h3 className="text-[15px] font-semibold text-foreground mb-1">
									{item.title}
								</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{item.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-6 py-20 md:py-28 bg-foreground">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-black text-background tracking-tight mb-4">
						Want to see more?
					</h2>
					<p className="text-background/50 mb-8 text-[15px]">
						Learn how Parrot works and what makes it different.
					</p>
					<Link
						to="/about"
						className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 transition-colors no-underline shadow-[0_4px_20px_rgba(124,179,66,0.3)]"
					>
						How it works
						<ArrowRight
							size={16}
							strokeWidth={2.5}
							className="transition-transform group-hover:translate-x-0.5"
						/>
					</Link>
				</div>
			</section>

			<Footer />
		</div>
	);
}
