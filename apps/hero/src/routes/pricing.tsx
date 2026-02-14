import Footer from "@/components/Footer";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { WaitlistCTA } from "@/components/WaitlistCTA";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Building2,
	Check,
	Cloud,
	HardDrive,
	Mic,
	Shield,
	Sparkles,
	Users,
	Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export const Route = createFileRoute("/pricing")({
	component: PricingPage,
	head: () => ({
		meta: [
			{ title: "Pricing - Parrot voice dictation for Mac" },
			{
				name: "description",
				content:
					"Simple pricing for voice dictation. Free local mode forever, Pro from $8/mo. Works offline, gets better in the cloud.",
			},
			{
				property: "og:title",
				content: "Pricing - Parrot voice dictation for Mac",
			},
			{
				property: "og:description",
				content:
					"Simple pricing for voice dictation. Free local mode forever, Pro from $8/mo.",
			},
			{ property: "og:url", content: "https://tryparrot.app/pricing" },
			{
				name: "keywords",
				content:
					"voice dictation pricing, dictation app price, speech to text cost, Parrot pricing, free dictation app, voice typing subscription",
			},
			{
				name: "twitter:title",
				content: "Pricing - Parrot voice dictation for Mac",
			},
			{
				name: "twitter:description",
				content:
					"Simple pricing for voice dictation. Free local mode forever, Pro from $8/mo.",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/pricing" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "FAQPage",
					mainEntity: [
						{
							"@type": "Question",
							name: "Is there a free trial?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Yes. Every new account gets a 14-day Pro trial — no credit card required. You get full access to cloud transcription, AI cleanup, and sync. After the trial, you can upgrade to Pro or continue using local mode for free.",
							},
						},
						{
							"@type": "Question",
							name: "Can I use Parrot without paying?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Yes. Local mode is completely free, forever. It runs Whisper.cpp and Ollama on your Mac — no account, no subscription, no data leaves your device. Cloud mode adds higher accuracy, AI cleanup, and sync across devices.",
							},
						},
						{
							"@type": "Question",
							name: 'What does "Bring your own API keys" mean?',
							acceptedAnswer: {
								"@type": "Answer",
								text: "Pro and Teams users can plug in their own OpenAI, Deepgram, or ElevenLabs API keys. This gives you unlimited cloud transcription at your provider's rates, while still using Parrot for cleanup, vocabulary, sync, and history.",
							},
						},
						{
							"@type": "Question",
							name: "What happens if I hit my transcription limit?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "You'll get a warning at 80% usage. Once you reach 100%, cloud transcription pauses until next month. Local transcription always works. You can also add your own API keys for unlimited cloud usage.",
							},
						},
						{
							"@type": "Question",
							name: "How accurate is local vs. cloud transcription?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Local: Whisper.cpp — very good for general use. Cloud: Deepgram Nova-2 or OpenAI Whisper API — noticeably better for accents, technical terms, and noisy environments.",
							},
						},
						{
							"@type": "Question",
							name: "Can I switch between plans?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Yes, upgrade or downgrade anytime. Your local data is always yours. Cloud data syncs as long as you're on a paid plan.",
							},
						},
						{
							"@type": "Question",
							name: "Is there an annual discount?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Yes — 25% off when you pay annually. Pro drops from $8/mo to $6/mo, and Teams from $14/user/mo to $11/user/mo.",
							},
						},
					],
				}),
			},
		],
	}),
});

/* ─── Plan data ─── */

interface Plan {
	id: string;
	name: string;
	tagline: string;
	description: string;
	icon: typeof HardDrive;
	monthlyPrice: number | null;
	annualPrice: number | null;
	perUser?: boolean;
	features: string[];
	cta: string;
	ctaLink: string;
	highlighted: boolean;
}

const PLANS: Plan[] = [
	{
		id: "free",
		name: "Free",
		tagline: "Private by default",
		description: "Runs entirely on your Mac. No account needed.",
		icon: HardDrive,
		monthlyPrice: 0,
		annualPrice: 0,
		features: [
			"Unlimited local transcription",
			"Local AI cleanup via Ollama",
			"Custom vocabulary",
			"Dictation history (local)",
			"Global hotkey (Cmd+Shift+Space)",
			"Works 100% offline",
		],
		cta: "Download Free",
		ctaLink: "/download",
		highlighted: false,
	},
	{
		id: "pro",
		name: "Pro",
		tagline: "Cloud-powered accuracy",
		description: "Higher accuracy, AI cleanup, sync everywhere.",
		icon: Zap,
		monthlyPrice: 8,
		annualPrice: 6,
		features: [
			"120 min/month cloud transcription",
			"Unlimited AI cleanup (GPT-4o-mini)",
			"Cloud history & backup",
			"Cross-device sync",
			"Vocabulary sync across devices",
			"Bring your own API keys option",
			"Email support",
		],
		cta: "Start Free Trial",
		ctaLink: "/waitlist",
		highlighted: true,
	},
	{
		id: "teams",
		name: "Teams",
		tagline: "Shared vocabulary. Centralized billing.",
		description: "For teams that dictate together.",
		icon: Users,
		monthlyPrice: 14,
		annualPrice: 11,
		perUser: true,
		features: [
			"300 min/user/month transcription",
			"Unlimited AI cleanup",
			"Shared team vocabulary",
			"Team management & billing",
			"Cloud sync & backup",
			"Priority support",
		],
		cta: "Get Started",
		ctaLink: "/waitlist",
		highlighted: false,
	},
	{
		id: "enterprise",
		name: "Enterprise",
		tagline: "Compliance, SSO, and dedicated support",
		description: "For organizations with security needs.",
		icon: Building2,
		monthlyPrice: null,
		annualPrice: null,
		features: [
			"Unlimited transcription",
			"SSO / SAML",
			"Audit logs",
			"Custom retention policies",
			"Dedicated account manager",
			"SLA & priority support",
			"Custom model support",
		],
		cta: "Talk to Sales",
		ctaLink: "/contact",
		highlighted: false,
	},
];

/* ─── Comparison data ─── */

const COMPARISON_FEATURES = [
	{
		category: "Transcription",
		icon: Mic,
		features: [
			{
				name: "Local transcription (Whisper.cpp)",
				free: true,
				pro: true,
				teams: true,
				enterprise: true,
			},
			{
				name: "Cloud transcription (Deepgram, OpenAI, ElevenLabs)",
				free: false,
				pro: "120 min/mo",
				teams: "300 min/user/mo",
				enterprise: "Unlimited",
			},
			{
				name: "Bring your own API keys",
				free: false,
				pro: true,
				teams: true,
				enterprise: true,
			},
		],
	},
	{
		category: "AI Cleanup",
		icon: Sparkles,
		features: [
			{
				name: "Local cleanup (Ollama)",
				free: true,
				pro: true,
				teams: true,
				enterprise: true,
			},
			{
				name: "Cloud cleanup (GPT-4o-mini)",
				free: false,
				pro: "Unlimited",
				teams: "Unlimited",
				enterprise: "Unlimited",
			},
			{
				name: "Custom vocabulary & writing style",
				free: true,
				pro: true,
				teams: true,
				enterprise: true,
			},
		],
	},
	{
		category: "Sync & Storage",
		icon: Cloud,
		features: [
			{
				name: "Local history & search",
				free: true,
				pro: true,
				teams: true,
				enterprise: true,
			},
			{
				name: "Cloud history & backup",
				free: false,
				pro: true,
				teams: true,
				enterprise: true,
			},
			{
				name: "Cross-device sync",
				free: false,
				pro: true,
				teams: true,
				enterprise: true,
			},
			{
				name: "Audio storage",
				free: "Local only",
				pro: "Cloud backup",
				teams: "Cloud backup",
				enterprise: "Custom retention",
			},
		],
	},
	{
		category: "Team & Security",
		icon: Shield,
		features: [
			{
				name: "Team management",
				free: false,
				pro: false,
				teams: true,
				enterprise: true,
			},
			{
				name: "Shared team vocabulary",
				free: false,
				pro: false,
				teams: true,
				enterprise: true,
			},
			{
				name: "Centralized billing",
				free: false,
				pro: false,
				teams: true,
				enterprise: true,
			},
			{
				name: "SSO / SAML",
				free: false,
				pro: false,
				teams: false,
				enterprise: true,
			},
			{
				name: "Audit logs",
				free: false,
				pro: false,
				teams: false,
				enterprise: true,
			},
		],
	},
];

/* ─── FAQ data ─── */

const FAQ: { q: string; a: ReactNode }[] = [
	{
		q: "Is there a free trial?",
		a: (
			<>
				Yes. Every new account gets a <strong>14-day Pro trial</strong> — no
				credit card required. You get full access to cloud transcription, AI
				cleanup, and sync. After the trial, you can upgrade to Pro or continue
				using local mode for free.
			</>
		),
	},
	{
		q: "Can I use Parrot without paying?",
		a: (
			<>
				Yes. <strong>Local mode is completely free, forever.</strong> It runs
				Whisper.cpp and Ollama on your Mac — no account, no subscription, no
				data leaves your device. Cloud mode adds higher accuracy, AI cleanup,
				and sync across devices.
			</>
		),
	},
	{
		q: 'What does "Bring your own API keys" mean?',
		a: (
			<>
				Pro and Teams users can plug in their own OpenAI, Deepgram, or
				ElevenLabs API keys. This gives you <strong>unlimited</strong> cloud
				transcription at your provider's rates, while still using Parrot for
				cleanup, vocabulary, sync, and history.
			</>
		),
	},
	{
		q: "What happens if I hit my transcription limit?",
		a: (
			<>
				You'll get a warning at 80% usage. Once you reach 100%, cloud
				transcription pauses until next month.{" "}
				<strong>Local transcription always works.</strong> You can also add your
				own API keys for unlimited cloud usage.
			</>
		),
	},
	{
		q: "How accurate is local vs. cloud transcription?",
		a: (
			<>
				<strong>Local:</strong> Whisper.cpp — very good for general use.
				<br />
				<strong>Cloud:</strong> Deepgram Nova-2 or OpenAI Whisper API —
				noticeably better for accents, technical terms, and noisy environments.
			</>
		),
	},
	{
		q: "Can I switch between plans?",
		a: "Yes, upgrade or downgrade anytime. Your local data is always yours. Cloud data syncs as long as you're on a paid plan.",
	},
	{
		q: "Is there an annual discount?",
		a: (
			<>
				Yes — <strong>25% off</strong> when you pay annually. Pro drops from
				$8/mo to $6/mo, and Teams from $14/user/mo to $11/user/mo.
			</>
		),
	},
];

/* ─── Page ─── */

function PricingPage() {
	const [annual, setAnnual] = useState(true);

	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Pricing
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						Voice dictation pricing.
						<br />
						Free forever, Pro when ready.
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
						Free local mode forever. Try Pro for 14 days free — cloud-powered
						accuracy, AI cleanup, and sync.
					</p>

					{/* Billing toggle */}
					<div className="flex items-center gap-3 mt-8 animate-fade-in-up-delay-3">
						<span
							className={`text-sm font-semibold transition-colors ${!annual ? "text-foreground" : "text-muted-foreground"}`}
						>
							Monthly
						</span>
						<Switch checked={annual} onCheckedChange={setAnnual} />
						<span
							className={`text-sm font-semibold transition-colors ${annual ? "text-foreground" : "text-muted-foreground"}`}
						>
							Annual
						</span>
						{annual && (
							<span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
								Save 25%
							</span>
						)}
					</div>
				</div>
			</section>

			{/* ── Pricing cards ── */}
			<section className="px-6 pb-20 md:pb-28">
				<div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-5">
					{PLANS.map((plan) => {
						const Icon = plan.icon;
						const price = annual ? plan.annualPrice : plan.monthlyPrice;

						return (
							<div
								key={plan.id}
								className={`
									relative rounded-2xl border p-6 flex flex-col
									${
										plan.highlighted
											? "border-primary bg-primary/3 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
											: "border-border bg-card"
									}
								`}
							>
								{plan.highlighted && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<span className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full uppercase tracking-wider">
											Most Popular
										</span>
									</div>
								)}

								{/* Header */}
								<div className="mb-5">
									<div
										className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
											plan.highlighted
												? "bg-primary text-primary-foreground"
												: "bg-muted text-muted-foreground"
										}`}
									>
										<Icon className="w-5 h-5" />
									</div>
									<h3 className="text-lg font-bold text-foreground tracking-tight">
										{plan.name}
									</h3>
									<p className="text-xs text-muted-foreground mt-0.5">
										{plan.tagline}
									</p>
								</div>

								{/* Price */}
								<div className="mb-5">
									{price !== null ? (
										<div>
											<div className="flex items-baseline gap-1">
												<span className="text-3xl font-black text-foreground tracking-tight">
													${price}
												</span>
												{price > 0 && (
													<span className="text-sm text-muted-foreground">
														/{plan.perUser ? "user/" : ""}mo
													</span>
												)}
												{price === 0 && (
													<span className="text-sm text-muted-foreground">
														forever
													</span>
												)}
											</div>
											{annual && price > 0 && (
												<p className="text-xs text-muted-foreground/70 mt-1">
													${price * 12}
													{plan.perUser ? "/user" : ""} billed annually
												</p>
											)}
										</div>
									) : (
										<span className="text-xl font-bold text-foreground">
											Custom
										</span>
									)}
								</div>

								{/* Description */}
								<p className="text-sm text-muted-foreground mb-5 leading-relaxed">
									{plan.description}
								</p>

								{/* Features */}
								<ul className="space-y-2.5 mb-6 flex-1">
									{plan.features.map((feature, i) => (
										<li
											key={i}
											className="flex items-start gap-2.5 text-sm text-foreground/80"
										>
											<Check
												size={15}
												className="text-primary mt-0.5 shrink-0"
												strokeWidth={2.5}
											/>
											<span>{feature}</span>
										</li>
									))}
								</ul>

								{/* CTA */}
								<Link
									to={plan.ctaLink}
									className={`
										flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors no-underline
										${
											plan.highlighted
												? "bg-foreground text-background hover:bg-foreground/85"
												: "bg-muted text-foreground hover:bg-muted/80 border border-border"
										}
									`}
								>
									{plan.cta}
									<ArrowRight className="w-3.5 h-3.5" />
								</Link>
								{plan.highlighted && (
									<p className="text-center text-[11px] text-muted-foreground mt-2.5">
										14-day free trial &middot; No credit card required
									</p>
								)}
							</div>
						);
					})}
				</div>
			</section>

			{/* ── Compare plans ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-5xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Compare plans
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						Everything at a glance
					</h2>

					<div className="overflow-x-auto -mx-6 px-6">
						<table className="w-full text-sm min-w-[640px]">
							<thead>
								<tr className="border-b-2 border-border">
									<th className="text-left py-3 pr-4 font-semibold text-foreground w-[40%]">
										Feature
									</th>
									<th className="text-center py-3 px-3 font-semibold text-foreground w-[15%]">
										Free
									</th>
									<th className="text-center py-3 px-3 font-bold text-primary w-[15%]">
										Pro
									</th>
									<th className="text-center py-3 px-3 font-semibold text-foreground w-[15%]">
										Teams
									</th>
									<th className="text-center py-3 px-3 font-semibold text-foreground w-[15%]">
										Enterprise
									</th>
								</tr>
							</thead>
							<tbody>
								{COMPARISON_FEATURES.map((category) => {
									const CategoryIcon = category.icon;
									return [
										<tr key={`cat-${category.category}`}>
											<td colSpan={5} className="pt-8 pb-2">
												<div className="flex items-center gap-2">
													<CategoryIcon className="w-4 h-4 text-primary" />
													<span className="text-xs font-bold uppercase tracking-wider text-primary">
														{category.category}
													</span>
												</div>
											</td>
										</tr>,
										...category.features.map((feature, i) => (
											<tr
												key={`${category.category}-${i}`}
												className="border-b border-border/30"
											>
												<td className="py-3.5 pr-4 text-[15px] text-foreground/80">
													{feature.name}
												</td>
												{(["free", "pro", "teams", "enterprise"] as const).map(
													(tier) => (
														<td key={tier} className="py-3.5 px-3 text-center">
															{renderFeatureValue(feature[tier])}
														</td>
													),
												)}
											</tr>
										)),
									];
								})}
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* ── FAQ (Accordion) ── */}
			<section className="py-20 md:py-28 px-6">
				<div className="max-w-2xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						Questions
					</h2>
					<Accordion type="single" collapsible className="space-y-3">
						{FAQ.map((item, i) => (
							<AccordionItem
								key={i}
								value={`faq-${i}`}
								className="border border-border bg-card rounded-2xl px-5 data-[state=open]:border-primary/30 data-[state=open]:bg-primary/3 transition-colors"
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

			{/* ── Bottom CTA ── */}
			<WaitlistCTA
				heading="Start dictating in minutes"
				subheading="Download Parrot for free. Local mode works out of the box. Upgrade to Pro when you're ready."
				source="pricing"
			/>

			<Footer />
		</div>
	);
}

function renderFeatureValue(value: boolean | string) {
	if (value === true) {
		return (
			<Check size={16} className="text-primary mx-auto" strokeWidth={2.5} />
		);
	}
	if (value === false) {
		return <span className="text-border">&mdash;</span>;
	}
	return (
		<span className="text-xs font-medium text-foreground/70">{value}</span>
	);
}
