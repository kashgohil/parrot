import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	HardDrive,
	Key,
	Sparkles,
	Users,
	Building2,
} from "lucide-react";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/pricing")({
	component: PricingPage,
	head: () => ({
		meta: [
			{ title: "Pricing — Parrot voice dictation" },
			{
				name: "description",
				content:
					"Free local mode or cloud plans starting at $5/mo. Choose the plan that fits your workflow.",
			},
			{ property: "og:title", content: "Pricing — Parrot voice dictation" },
			{
				property: "og:description",
				content:
					"Free local mode or cloud plans starting at $5/mo. Choose the plan that fits your workflow.",
			},
			{ property: "og:url", content: "https://tryparrot.app/pricing" },
			{ name: "twitter:title", content: "Pricing — Parrot voice dictation" },
			{
				name: "twitter:description",
				content:
					"Free local mode or cloud plans starting at $5/mo. Choose the plan that fits your workflow.",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/pricing" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "Product",
					name: "Parrot",
					description: "Voice dictation for Mac with AI cleanup and custom vocabulary.",
					offers: [
						{ "@type": "Offer", name: "Local", price: "0", priceCurrency: "USD" },
						{ "@type": "Offer", name: "Cloud — Bring Your Key", price: "5", priceCurrency: "USD", billingIncrement: "P1M" },
						{ "@type": "Offer", name: "Cloud — Managed", price: "15", priceCurrency: "USD", billingIncrement: "P1M" },
						{ "@type": "Offer", name: "Teams", price: "10", priceCurrency: "USD", billingIncrement: "P1M", unitText: "per user" },
					],
				}),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "FAQPage",
					mainEntity: [
						{
							"@type": "Question",
							name: "Can I switch between tiers?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Yes, anytime. Upgrading is instant. Downgrading takes effect at the end of your billing cycle. Your data always stays with you — we never hold it hostage.",
							},
						},
						{
							"@type": "Question",
							name: "What happens if I exceed the managed plan's minutes?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "We'll notify you at 80% and 100%. After the limit, dictation falls back to local mode (Whisper.cpp) so you're never stuck. Or you can buy additional minutes at $0.006/min.",
							},
						},
						{
							"@type": "Question",
							name: "Do I lose my data if I go from cloud to local?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "No. Everything syncs down to your local SQLite database. Going local just means future data stays on-device only. Nothing is deleted.",
							},
						},
						{
							"@type": "Question",
							name: "What providers does BYOK support?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Transcription: OpenAI Whisper, Deepgram, ElevenLabs. AI cleanup: GPT-4o-mini via OpenAI. We're adding more providers based on demand.",
							},
						},
						{
							"@type": "Question",
							name: "How does team billing work?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "One bill per team. The admin manages seats. Minutes are pooled across the team. Individual members don't need to worry about billing at all.",
							},
						},
					],
				}),
			},
		],
	}),
});

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TIERS = [
	{
		id: "local",
		step: "01",
		name: "Local",
		tagline: "Your Mac does everything.",
		price: "Free",
		priceSub: "forever",
		description:
			"Whisper.cpp transcription and Ollama AI cleanup running entirely on your device. No network, no keys, no account. Download and go.",
		icon: HardDrive,
		accent: "border-emerald-500/30 bg-emerald-500/[0.04]",
		accentDot: "bg-emerald-500",
		accentTag: "text-emerald-700 bg-emerald-50 border-emerald-200/60",
		features: [
			"On-device transcription (Whisper.cpp)",
			"On-device AI cleanup (Ollama)",
			"Custom vocabulary & writing style",
			"Full dictation history with search",
			"Configurable global hotkey",
			"Works completely offline",
		],
		cta: "Download for free",
		ctaStyle:
			"bg-foreground text-background hover:bg-foreground/85",
		ctaLink: "/download",
	},
	{
		id: "byok",
		step: "02",
		name: "Cloud — Bring Your Key",
		tagline: "Your keys. Our infrastructure.",
		price: "$5",
		priceSub: "/ month",
		description:
			"Use your own API keys for transcription and AI cleanup. We handle syncing your history, settings, and vocabulary across devices. You control the provider relationship — we handle everything else.",
		icon: Key,
		accent: "border-sky-500/30 bg-sky-500/[0.04]",
		accentDot: "bg-sky-500",
		accentTag: "text-sky-700 bg-sky-50 border-sky-200/60",
		features: [
			"Everything in Local, plus:",
			"Cloud sync for history & settings",
			"Your own OpenAI / Deepgram / ElevenLabs keys",
			"Provider costs passed through at their rates",
			"Cross-device vocabulary sync",
			"Priority support",
		],
		providerCosts: [
			{ name: "OpenAI Whisper", cost: "~$0.006/min" },
			{ name: "Deepgram", cost: "~$0.004/min" },
			{ name: "GPT-4o-mini cleanup", cost: "~$0.0001/req" },
		],
		cta: "Start with your keys",
		ctaStyle:
			"bg-sky-600 text-white hover:bg-sky-700",
		ctaLink: "/download",
	},
	{
		id: "managed",
		step: "03",
		name: "Cloud — Managed",
		tagline: "We handle the keys. You just talk.",
		price: "$15",
		priceSub: "/ month",
		description:
			"No API keys to manage. We provision and pay for transcription and AI cleanup on your behalf. Includes generous usage limits and the fastest available models.",
		icon: Sparkles,
		accent: "border-violet-500/30 bg-violet-500/[0.04]",
		accentDot: "bg-violet-500",
		accentTag: "text-violet-700 bg-violet-50 border-violet-200/60",
		features: [
			"Everything in BYOK, plus:",
			"No API keys needed — we handle providers",
			"2,000 minutes / month transcription included",
			"Unlimited AI cleanup requests",
			"Automatic model upgrades",
			"Usage dashboard",
		],
		cta: "Get started",
		ctaStyle:
			"bg-violet-600 text-white hover:bg-violet-700",
		ctaLink: "/download",
		popular: true,
	},
	{
		id: "teams",
		step: "04",
		name: "Teams",
		tagline: "Dictation for the whole crew.",
		price: "$10",
		priceSub: "/ user / month",
		description:
			"Everything in Managed, built for teams. Shared vocabulary, centralized billing, admin controls, and usage analytics across your organization.",
		icon: Users,
		accent: "border-amber-500/30 bg-amber-500/[0.04]",
		accentDot: "bg-amber-500",
		accentTag: "text-amber-700 bg-amber-50 border-amber-200/60",
		features: [
			"Everything in Managed, plus:",
			"Shared team vocabulary & style guides",
			"Centralized billing & seat management",
			"Usage analytics per member",
			"Admin controls & permissions",
			"5,000 minutes / month pool (expandable)",
		],
		cta: "Start a team",
		ctaStyle:
			"bg-amber-600 text-white hover:bg-amber-700",
		ctaLink: "/download",
	},
	{
		id: "enterprise",
		step: "05",
		name: "Enterprise",
		tagline: "Custom pricing. Custom everything.",
		price: "Custom",
		priceSub: "",
		description:
			"For organizations with specific compliance, security, or deployment needs. On-premise options, SSO, custom SLAs, dedicated support, volume discounts, and integration with your existing tools.",
		icon: Building2,
		accent: "border-foreground/20 bg-foreground/[0.03]",
		accentDot: "bg-foreground",
		accentTag: "text-foreground bg-muted border-border",
		features: [
			"Everything in Teams, plus:",
			"SSO / SAML authentication",
			"On-premise or private cloud deployment",
			"Custom data retention policies",
			"Dedicated account manager & SLA",
			"Volume discounts at scale",
			"Custom integrations & API access",
		],
		cta: "Talk to us",
		ctaStyle:
			"bg-foreground text-background hover:bg-foreground/85",
		ctaLink: "mailto:hello@parrot.dev",
	},
];

const FAQ = [
	{
		q: "Can I switch between tiers?",
		a: "Yes, anytime. Upgrading is instant. Downgrading takes effect at the end of your billing cycle. Your data always stays with you — we never hold it hostage.",
	},
	{
		q: "What happens if I exceed the managed plan's minutes?",
		a: "We'll notify you at 80% and 100%. After the limit, dictation falls back to local mode (Whisper.cpp) so you're never stuck. Or you can buy additional minutes at $0.006/min.",
	},
	{
		q: "Do I lose my data if I go from cloud to local?",
		a: "No. Everything syncs down to your local SQLite database. Going local just means future data stays on-device only. Nothing is deleted.",
	},
	{
		q: "What providers does BYOK support?",
		a: "Transcription: OpenAI Whisper, Deepgram, ElevenLabs. AI cleanup: GPT-4o-mini via OpenAI. We're adding more providers based on demand.",
	},
	{
		q: "How does team billing work?",
		a: "One bill per team. The admin manages seats. Minutes are pooled across the team. Individual members don't need to worry about billing at all.",
	},
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function PricingPage() {
	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Pricing
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						Pay for what you
						<br />
						don't want to do.
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
						Want full control? It's free. Want us to handle the
						infrastructure? That's where pricing starts. The more we
						manage, the more it costs — but never more than it should.
					</p>
				</div>
			</section>

			{/* ── The spectrum: a single sentence ── */}
			<section className="px-6 pb-6">
				<div className="max-w-4xl mx-auto">
					<div className="flex items-center gap-3 text-xs text-muted-foreground">
						<span className="font-bold uppercase tracking-wider text-foreground">
							You do everything
						</span>
						<div className="flex-1 h-px bg-gradient-to-r from-emerald-300 via-violet-300 to-amber-300 opacity-50" />
						<span className="font-bold uppercase tracking-wider text-foreground">
							We do everything
						</span>
					</div>
				</div>
			</section>

			{/* ── Tiers as horizontal story blocks ── */}
			<section className="px-6 pb-20 md:pb-28">
				<div className="max-w-4xl mx-auto">
					<div className="relative">
						{/* Vertical thread */}
						<div className="absolute left-[19px] top-8 bottom-8 w-px bg-border hidden md:block" />

						<div className="space-y-6">
							{TIERS.map((tier) => {
								const Icon = tier.icon;
								return (
									<div key={tier.id} className="relative">
										{/* Dot on the vertical thread */}
										<div
											className={`absolute left-[11px] top-8 w-[18px] h-[18px] rounded-full border-[3px] border-background z-10 hidden md:block ${tier.accentDot}`}
										/>

										<div
											className={`md:ml-12 border rounded-2xl p-6 md:p-8 transition-colors ${tier.accent} ${
												tier.popular ? "ring-2 ring-violet-400/30" : ""
											}`}
										>
											{tier.popular && (
												<div className="absolute -top-3 right-6 md:right-auto md:left-20">
													<span className="px-3 py-1 bg-violet-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-lg">
														Most popular
													</span>
												</div>
											)}

											<div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10">
												{/* Left: identity */}
												<div className="lg:w-[340px] shrink-0">
													<div className="flex items-center gap-3 mb-3">
														<div className="w-9 h-9 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
															<Icon size={18} className="text-foreground/70" />
														</div>
														<div>
															<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
																{tier.step}
															</span>
															<h2 className="text-lg font-bold text-foreground tracking-tight leading-tight">
																{tier.name}
															</h2>
														</div>
													</div>

													<p className="text-xl md:text-2xl font-black text-foreground tracking-tight mb-1">
														{tier.tagline}
													</p>

													<div className="flex items-baseline gap-1.5 mb-3">
														<span className="text-3xl font-black text-foreground">
															{tier.price}
														</span>
														<span className="text-sm text-muted-foreground">
															{tier.priceSub}
														</span>
													</div>

													<p className="text-sm text-muted-foreground leading-relaxed">
														{tier.description}
													</p>

													{/* Provider cost hints for BYOK */}
													{tier.providerCosts && (
														<div className="mt-4 space-y-1.5">
															<p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
																Provider costs (you pay directly)
															</p>
															{tier.providerCosts.map((p) => (
																<div
																	key={p.name}
																	className="flex items-center justify-between text-xs"
																>
																	<span className="text-muted-foreground">
																		{p.name}
																	</span>
																	<span className="font-semibold text-foreground tabular-nums">
																		{p.cost}
																	</span>
																</div>
															))}
														</div>
													)}

													{tier.ctaLink.startsWith("mailto:") ? (
														<a
															href={tier.ctaLink}
															className={`inline-flex items-center gap-2 px-6 py-2.5 font-semibold rounded-xl transition-colors no-underline text-sm mt-6 ${tier.ctaStyle}`}
														>
															{tier.cta}
															<ArrowRight
																size={14}
																strokeWidth={2.5}
															/>
														</a>
													) : (
														<Link
															to={tier.ctaLink}
															className={`inline-flex items-center gap-2 px-6 py-2.5 font-semibold rounded-xl transition-colors no-underline text-sm mt-6 ${tier.ctaStyle}`}
														>
															{tier.cta}
															<ArrowRight
																size={14}
																strokeWidth={2.5}
															/>
														</Link>
													)}
												</div>

												{/* Right: features as check list */}
												<div className="flex-1 min-w-0">
													<p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
														What's included
													</p>
													<ul className="space-y-2.5">
														{tier.features.map((f, i) => (
															<li
																key={i}
																className="flex items-start gap-2.5 text-[14px] text-foreground/80"
															>
																<Check
																	size={15}
																	strokeWidth={2.5}
																	className="text-primary mt-0.5 shrink-0"
																/>
																{f}
															</li>
														))}
													</ul>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</section>

			{/* ── At a glance comparison ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-4xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						At a glance
					</h2>

					<div className="overflow-x-auto -mx-6 px-6">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border">
									<th className="text-left py-3 pr-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-[200px]">
										&nbsp;
									</th>
									<th className="text-center py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
										Local
									</th>
									<th className="text-center py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
										BYOK
									</th>
									<th className="text-center py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
										Managed
									</th>
									<th className="text-center py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
										Teams
									</th>
									<th className="text-center py-3 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
										Enterprise
									</th>
								</tr>
							</thead>
							<tbody>
								{[
									{
										feature: "Price",
										values: [
											"Free",
											"$5/mo",
											"$15/mo",
											"$10/user/mo",
											"Custom",
										],
									},
									{
										feature: "Transcription",
										values: [
											"Whisper.cpp",
											"Your API key",
											"Included",
											"Included",
											"Included",
										],
									},
									{
										feature: "AI cleanup",
										values: [
											"Ollama",
											"Your API key",
											"Included",
											"Included",
											"Included",
										],
									},
									{
										feature: "Cloud sync",
										values: ["—", "✓", "✓", "✓", "✓"],
									},
									{
										feature: "API keys required",
										values: ["None", "Yours", "None", "None", "None"],
									},
									{
										feature: "Shared vocabulary",
										values: ["—", "—", "—", "✓", "✓"],
									},
									{
										feature: "Admin controls",
										values: ["—", "—", "—", "✓", "✓"],
									},
									{
										feature: "Usage analytics",
										values: ["—", "—", "✓", "✓", "✓"],
									},
									{
										feature: "Priority support",
										values: ["—", "✓", "✓", "✓", "✓"],
									},
									{
										feature: "SSO / SAML",
										values: ["—", "—", "—", "—", "✓"],
									},
									{
										feature: "On-premise deploy",
										values: ["—", "—", "—", "—", "✓"],
									},
									{
										feature: "Custom SLA",
										values: ["—", "—", "—", "—", "✓"],
									},
								].map((row, i) => (
									<tr
										key={i}
										className="border-b border-border/50 last:border-0"
									>
										<td className="py-3 pr-4 text-foreground font-medium">
											{row.feature}
										</td>
										{row.values.map((val, j) => (
											<td
												key={j}
												className={`py-3 px-3 text-center ${
													val === "✓"
														? "text-primary font-bold"
														: val === "—"
															? "text-muted-foreground/40"
															: "text-muted-foreground"
												}`}
											>
												{val}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* ── Related links ── */}
			<section className="px-6 py-14">
				<div className="max-w-4xl mx-auto">
					<div className="flex flex-wrap items-center justify-center gap-6 text-sm">
						<Link
							to="/download"
							className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
						>
							Download Parrot &rarr;
						</Link>
						<Link
							to="/about"
							className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
						>
							How Parrot works &rarr;
						</Link>
						<Link
							to="/privacy"
							className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
						>
							Privacy policy &rarr;
						</Link>
						<Link
							to="/changelog"
							className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
						>
							What's new &rarr;
						</Link>
					</div>
				</div>
			</section>

			{/* ── FAQ ── */}
			<section className="px-6 py-20 md:py-28">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						Common questions
					</h2>
					<Accordion type="single" collapsible className="space-y-3">
						{FAQ.map((item, i) => (
							<AccordionItem
								key={i}
								value={`faq-${i}`}
								className="border border-border bg-card rounded-2xl px-5 data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.03] transition-colors"
							>
								<AccordionTrigger className="font-semibold text-foreground text-[15px] hover:no-underline py-5">
									{item.q}
								</AccordionTrigger>
								<AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
									{item.a}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="px-6 py-20 md:py-28 bg-foreground">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-black text-background tracking-tight mb-4">
						Start free. Scale when ready.
					</h2>
					<p className="text-background/50 mb-8 text-[15px]">
						Every plan starts with a free local install. Upgrade only
						when you need cloud features.
					</p>
					<Link
						to="/download"
						className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 transition-colors no-underline shadow-[0_4px_20px_rgba(124,179,66,0.3)]"
					>
						Download for Mac
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

