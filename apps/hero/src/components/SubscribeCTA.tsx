import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

interface SubscribeCTAProps {
	heading?: string;
	subheading?: string;
	source?: string;
	variant?: "dark" | "light" | "inline";
}

export function SubscribeCTA({
	heading = "Stay in the loop.",
	subheading = "Subscribe for product updates and changelog notes.",
	source = "website",
	variant = "dark",
}: SubscribeCTAProps) {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		setStatus("loading");
		try {
			const apiUrl = import.meta.env.VITE_API_URL || "https://api.tryparrot.app";
			const response = await fetch(`${apiUrl}/api/subscribe`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, source }),
			});

			if (!response.ok) throw new Error("Failed");
			setStatus("success");
		} catch {
			setStatus("error");
		}
	};

	if (variant === "inline") {
		return (
			<div>
				{status === "success" ? (
					<div className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl">
						<Check className="w-4 h-4 text-primary" />
						<span className="text-primary font-semibold text-sm">Subscribed!</span>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Enter your email"
							required
							className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
						/>
						<button
							type="submit"
							disabled={status === "loading"}
							className="px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
						>
							{status === "loading" ? (
								"Subscribing..."
							) : (
								<>
									Subscribe
									<ArrowRight size={16} strokeWidth={2.5} />
								</>
							)}
						</button>
					</form>
				)}
				{status === "error" && (
					<p className="text-sm text-red-500 mt-2">Something went wrong. Try again.</p>
				)}
			</div>
		);
	}

	if (variant === "dark") {
		return (
			<section className="px-6 py-20 md:py-28 bg-foreground">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-black text-background tracking-tight mb-4">
						{heading}
					</h2>
					<p className="text-background/50 mb-8 text-[15px]">{subheading}</p>

					{status === "success" ? (
						<div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/20 rounded-xl">
							<Check className="w-5 h-5 text-primary" />
							<span className="text-primary font-semibold">Subscribed!</span>
						</div>
					) : (
						<form
							onSubmit={handleSubmit}
							className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
						>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter your email"
								required
								className="flex-1 px-4 py-3 rounded-xl border-0 bg-background/10 text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
							/>
							<button
								type="submit"
								disabled={status === "loading"}
								className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(124,179,66,0.3)]"
							>
								{status === "loading" ? (
									"Subscribing..."
								) : (
									<>
										Subscribe
										<ArrowRight size={16} strokeWidth={2.5} />
									</>
								)}
							</button>
						</form>
					)}

					{status === "error" && (
						<p className="text-red-400 text-sm mt-3">Something went wrong. Try again.</p>
					)}
				</div>
			</section>
		);
	}

	return (
		<section className="px-6 py-20 md:py-28">
			<div className="max-w-2xl mx-auto text-center">
				<h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-4">
					{heading}
				</h2>
				<p className="text-muted-foreground mb-8 text-[15px]">{subheading}</p>

				{status === "success" ? (
					<div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/20 rounded-xl">
						<Check className="w-5 h-5 text-primary" />
						<span className="text-primary font-semibold">Subscribed!</span>
					</div>
				) : (
					<form
						onSubmit={handleSubmit}
						className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
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
							className="px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{status === "loading" ? (
								"Subscribing..."
							) : (
								<>
									Subscribe
									<ArrowRight size={16} strokeWidth={2.5} />
								</>
							)}
						</button>
					</form>
				)}

				{status === "error" && (
					<p className="text-red-500 text-sm mt-3">Something went wrong. Try again.</p>
				)}
			</div>
		</section>
	);
}
