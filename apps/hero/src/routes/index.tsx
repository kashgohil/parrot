import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";
import type { ReactNode } from "react";
import {
	AppleMessagesIcon,
	AppleNotesIcon,
	ArcIcon,
	BearIcon,
	CalendarIcon,
	ChromeIcon,
	ConfluenceIcon,
	DiscordIcon,
	ExcelIcon,
	FigmaIcon,
	FinderIcon,
	FirefoxIcon,
	GmailIcon,
	GoogleDocsIcon,
	InstagramIcon,
	JiraIcon,
	LinearIcon,
	NotionIcon,
	ObsidianIcon,
	OutlookIcon,
	SketchIcon,
	SlackIcon,
	SpotifyIcon,
	SuperhumanIcon,
	TeamsIcon,
	TelegramIcon,
	TerminalIcon,
	TrelloIcon,
	TwitterIcon,
	VSCodeIcon,
} from "@/components/app-icons";
import Footer from "@/components/Footer";
import { CleanupSection } from "@/components/home/cleanup-section";
import {
	CompareSection,
	DetailsSection,
} from "@/components/home/details-compare";
import { DictationDemo } from "@/components/home/dictation-demo";
import { Hero } from "@/components/home/hero";
import {
	VocabularySection,
	WritingStyleSection,
} from "@/components/home/personal-sections";
import {
	ModelsSection,
	PrivacySection,
} from "@/components/home/privacy-models";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { getCompetitor } from "@/lib/competitors";
import { PARROT_FACTS } from "@/lib/parrot-facts";

const wispr = getCompetitor("wispr-flow")!;
const superwhisper = getCompetitor("superwhisper")!;

export const Route = createFileRoute("/")({
	component: HomePage,
	head: () => ({
		meta: [
			{ title: "Parrot - Local-first Voice Dictation for Mac (Free)" },
			{
				name: "description",
				content:
					"Free, local-first voice dictation for Mac. About 3x faster than typing for prose (Stanford/Baidu 2016), with on-device AI cleanup, custom vocabulary, and full offline support. No subscription, no cloud, no API keys.",
			},
			{
				property: "og:title",
				content: "Parrot - Local-first Voice Dictation for Mac (Free)",
			},
			{
				property: "og:description",
				content:
					"Free, local-first voice dictation for Mac. About 3x faster than typing for prose, with on-device AI cleanup, custom vocabulary, and full offline support. No subscription, no cloud, no API keys.",
			},
			{ property: "og:url", content: "https://tryparrot.app/" },
			{
				name: "twitter:title",
				content: "Parrot - Local-first Voice Dictation for Mac (Free)",
			},
			{
				name: "twitter:description",
				content:
					"Free, local-first voice dictation for Mac. 3x faster than typing, with on-device AI cleanup, custom vocabulary, and full offline support. No subscription, no cloud, no API keys.",
			},
			{
				name: "keywords",
				content:
					"voice dictation, voice dictation mac, speech to text, dictation app, voice typing, mac dictation, AI transcription, local voice dictation",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "WebSite",
					name: "Parrot",
					url: "https://tryparrot.app",
					description:
						"Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.",
					publisher: {
						"@type": "Organization",
						name: "Parrot",
						url: "https://tryparrot.app",
						logo: {
							"@type": "ImageObject",
							url: "https://tryparrot.app/parrot-transparent.png",
						},
					},
				}),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "SoftwareApplication",
					name: PARROT_FACTS.name,
					alternateName: [...PARROT_FACTS.alternateNames],
					url: PARROT_FACTS.siteUrl,
					operatingSystem: PARROT_FACTS.os,
					applicationCategory: "UtilitiesApplication",
					description: PARROT_FACTS.entity,
					image: "https://tryparrot.app/og/home.png",
					screenshot: "https://tryparrot.app/og/home.png",
					downloadUrl: "https://tryparrot.app/download",
					softwareVersion: PARROT_FACTS.version,
					author: {
						"@type": "Person",
						name: "Kash Gohil",
						url: "https://x.com/kashhh",
					},
					publisher: {
						"@type": "Organization",
						name: "Parrot",
						url: "https://tryparrot.app",
					},
					offers: [
						{
							"@type": "Offer",
							name: "Free",
							price: "0",
							priceCurrency: "USD",
							description:
								"Free for life. Fast on-device dictation, AI cleanup, custom vocabulary, and full offline support. No subscription required.",
						},
					],
					featureList:
						"Voice dictation, Fast on-device transcription, AI text cleanup, Custom vocabulary, Local-first privacy, Global hotkey, Works in any app, Dictation history, Live transcript preview",
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
							name: "Does Parrot work fully offline?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Yes. Parrot runs transcription and AI cleanup entirely on your Mac. Everything happens on-device — zero data leaves your computer. You download what you need once, then no internet is required. Ideal for private work, legal documents, or anyone who values control.",
							},
						},
						{
							"@type": "Question",
							name: "How fast is it?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Built for daily use: release the hotkey and text lands at your cursor with minimal wait. Accuracy is tuned for first-pass names, jargon, and everyday speech — not a raw draft you have to rewrite.",
							},
						},
						{
							"@type": "Question",
							name: "Is Parrot really free?",
							acceptedAnswer: {
								"@type": "Answer",
								text: `Yes — ${PARROT_FACTS.price}. Unlimited local dictation with AI cleanup and custom vocabulary. No word caps and no subscription. Wispr Flow Pro is ${wispr.pricing.theirPaid}; Superwhisper Pro is ${superwhisper.pricing.theirPaid} (checked ${wispr.pricesCheckedOn}).`,
							},
						},
						{
							"@type": "Question",
							name: "How does the cleanup work?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "After transcription, an optional AI pass fixes grammar, removes filler words (um, uh, like), and applies your custom vocabulary and writing style. The output reads like you wrote it, not dictated it. It runs entirely on your Mac.",
							},
						},
						{
							"@type": "Question",
							name: "What about my privacy?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Everything stays on your Mac — audio, transcripts, history, vocabulary. Nothing is sent to our servers.",
							},
						},
					],
				}),
			},
		],
	}),
});

// ---------------------------------------------------------------------------
// 8. App Compatibility Carousel
// ---------------------------------------------------------------------------
const APP_ICONS_ROW1: { icon: ReactNode; label: string }[] = [
	{ icon: <SlackIcon className="w-3.5 h-3.5" />, label: "Slack" },
	{ icon: <VSCodeIcon className="w-3.5 h-3.5" />, label: "VS Code" },
	{ icon: <GmailIcon className="w-3.5 h-3.5" />, label: "Gmail" },
	{ icon: <NotionIcon className="w-3.5 h-3.5" />, label: "Notion" },
	{ icon: <ArcIcon className="w-3.5 h-3.5" />, label: "Arc" },
	{ icon: <FigmaIcon className="w-3.5 h-3.5" />, label: "Figma" },
	{ icon: <LinearIcon className="w-3.5 h-3.5" />, label: "Linear" },
	{ icon: <DiscordIcon className="w-3.5 h-3.5" />, label: "Discord" },
	{ icon: <AppleMessagesIcon className="w-3.5 h-3.5" />, label: "Messages" },
	{ icon: <AppleNotesIcon className="w-3.5 h-3.5" />, label: "Notes" },
	{ icon: <GoogleDocsIcon className="w-3.5 h-3.5" />, label: "Google Docs" },
	{ icon: <FinderIcon className="w-3.5 h-3.5" />, label: "Finder" },
	{ icon: <ExcelIcon className="w-3.5 h-3.5" />, label: "Excel" },
	{ icon: <TerminalIcon className="w-3.5 h-3.5" />, label: "Terminal" },
	{ icon: <OutlookIcon className="w-3.5 h-3.5" />, label: "Outlook" },
];
const APP_ICONS_ROW2: { icon: ReactNode; label: string }[] = [
	{ icon: <TwitterIcon className="w-3.5 h-3.5" />, label: "Twitter" },
	{ icon: <TelegramIcon className="w-3.5 h-3.5" />, label: "Telegram" },
	{ icon: <TrelloIcon className="w-3.5 h-3.5" />, label: "Trello" },
	{ icon: <JiraIcon className="w-3.5 h-3.5" />, label: "Jira" },
	{ icon: <ConfluenceIcon className="w-3.5 h-3.5" />, label: "Confluence" },
	{ icon: <SpotifyIcon className="w-3.5 h-3.5" />, label: "Spotify" },
	{ icon: <InstagramIcon className="w-3.5 h-3.5" />, label: "Instagram" },
	{ icon: <TeamsIcon className="w-3.5 h-3.5" />, label: "Teams" },
	{ icon: <ObsidianIcon className="w-3.5 h-3.5" />, label: "Obsidian" },
	{ icon: <BearIcon className="w-3.5 h-3.5" />, label: "Bear" },
	{ icon: <SketchIcon className="w-3.5 h-3.5" />, label: "Sketch" },
	{ icon: <ChromeIcon className="w-3.5 h-3.5" />, label: "Chrome" },
	{ icon: <FirefoxIcon className="w-3.5 h-3.5" />, label: "Firefox" },
	{ icon: <SuperhumanIcon className="w-3.5 h-3.5" />, label: "Superhuman" },
	{ icon: <CalendarIcon className="w-3.5 h-3.5" />, label: "Calendar" },
];

function AppCarousel() {
	const renderItems = (apps: typeof APP_ICONS_ROW1) =>
		apps.map((app, i) => (
			<span
				key={i}
				className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border rounded-xl text-sm text-foreground/80 font-medium shrink-0"
			>
				<span className="text-muted-foreground">{app.icon}</span>
				{app.label}
			</span>
		));

	return (
		<div className="space-y-3 overflow-hidden">
			{/* Row 1 - scrolls left */}
			<div className="flex w-max animate-marquee">
				<div className="flex gap-3 pr-3">{renderItems(APP_ICONS_ROW1)}</div>
				<div className="flex gap-3 pr-3">{renderItems(APP_ICONS_ROW1)}</div>
			</div>
			{/* Row 2 - scrolls right */}
			<div className="flex w-max animate-marquee-reverse">
				<div className="flex gap-3 pr-3">{renderItems(APP_ICONS_ROW2)}</div>
				<div className="flex gap-3 pr-3">{renderItems(APP_ICONS_ROW2)}</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
const FAQ: { q: string; a: ReactNode }[] = [
	{
		q: "Does Parrot work fully offline?",
		a: (
			<>
				Yes. Parrot runs on your Mac — <strong>fully on-device</strong>.
				Transcription and cleanup never leave your machine. You download what
				you need once, then no internet, no account, and no API keys are
				required.
			</>
		),
	},
	{
		q: "How fast and accurate is it?",
		a: (
			<>
				Built for the daily loop: release the hotkey and text shows up at your
				cursor with minimal wait. First-pass accuracy is strong on names,
				jargon, and everyday speech — so you spend less time fixing typos.
			</>
		),
	},
	{
		q: "Is Parrot really free?",
		a: (
			<>
				Yes — {PARROT_FACTS.price}. Unlimited local dictation with AI cleanup
				and custom vocabulary. No word caps and no subscription. (Competitors
				like Wispr Flow Pro at {wispr.pricing.theirPaid} and Superwhisper Pro at{" "}
				{superwhisper.pricing.theirPaid} charge monthly.)
			</>
		),
	},
	{
		q: "How does the cleanup work?",
		a: (
			<>
				After transcription, we feed that into our cleanup engine which:
				<ul className="list-disc list-inside mt-2 space-y-1">
					<li>Fixes grammar</li>
					<li>
						Removes filler words (<em>um, uh, like</em>)
					</li>
					<li>Applies your custom vocabulary and writing style</li>
				</ul>
				<p className="mt-2">
					It's optional and you can toggle it per-dictation.
				</p>
			</>
		),
	},
	{
		q: "What about my privacy?",
		a: (
			<>
				Everything stays on your Mac — audio, transcripts, history, vocabulary.
				Nothing is sent to our servers.
			</>
		),
	},
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function HomePage() {
	return (
		<div className="min-h-screen">
			<Hero>
				<DictationDemo />
			</Hero>

			<CleanupSection />
			<VocabularySection />
			<WritingStyleSection />

			<PrivacySection />
			<ModelsSection />

			<section className="py-16 md:py-20 px-6 border-y border-border">
				<div className="max-w-5xl mx-auto">
					<h2 className="text-center text-lg font-bold text-foreground mb-2">
						Voice dictation in any Mac app
					</h2>
					<p className="text-center text-sm text-muted-foreground mb-8">
						Parrot pastes into any app on your Mac. No plugins, no integrations.
					</p>
					<AppCarousel />
				</div>
			</section>

			<DetailsSection />

			<CompareSection />

			<section className="py-20 md:py-28 bg-muted/30 px-6">
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

			<section className="py-16 md:py-20 px-6 border-t border-border">
				<div className="max-w-4xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						From the blog
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						Guides for free, local Mac dictation
					</h2>
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{[
							{
								href: "/blog/wispr-flow-alternatives",
								tag: "Alternatives",
								title: "Best Wispr Flow alternatives (2026)",
								blurb:
									"Free local options vs Wispr’s subscription and word cap.",
							},
							{
								href: "/blog/superwhisper-alternatives",
								tag: "Alternatives",
								title: "Best Superwhisper alternatives",
								blurb: "Local Mac dictation with cleanup — without a Pro plan.",
							},
							{
								href: "/blog/free-voice-dictation-apps-2026",
								tag: "Guide",
								title: "Free voice dictation apps in 2026",
								blurb:
									"What “free” really means: caps, trials, and free forever.",
							},
							{
								href: "/blog/local-voice-dictation-mac",
								tag: "Tutorial",
								title: "Set up local voice dictation on Mac",
								blurb:
									"On-device transcription and cleanup in under five minutes.",
							},
							{
								href: "/blog/best-voice-dictation-apps-mac-2026",
								tag: "Comparison",
								title: "Best voice dictation apps for Mac",
								blurb: "Parrot, macOS Dictation, Otter, Dragon, and more.",
							},
							{
								href: "/compare",
								tag: "Compare",
								title: "Parrot vs the rest",
								blurb:
									"Side-by-side feature and pricing tables for each competitor.",
							},
						].map((card) => (
							<a
								key={card.href}
								href={card.href}
								className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-colors no-underline block"
							>
								<span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
									{card.tag}
								</span>
								<p className="text-[15px] font-bold text-foreground mt-2 mb-2 leading-snug">
									{card.title}
								</p>
								<p className="text-sm text-muted-foreground line-clamp-2">
									{card.blurb}
								</p>
							</a>
						))}
					</div>
				</div>
			</section>

			<FinalCTA />

			<Footer />
		</div>
	);
}

function FinalCTA() {
	return (
		<section className="py-20 md:py-28 px-6 bg-foreground">
			<div className="max-w-2xl mx-auto text-center">
				<h2 className="text-3xl md:text-4xl font-black text-background tracking-tight mb-4">
					Start dictating. Stop typing.
				</h2>
				<p className="text-background/50 mb-8 text-[15px]">
					{PARROT_FACTS.price}. Fully on-device on Apple Silicon. Download for
					Mac and start dictating in minutes.
				</p>

				<div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
					<Link
						to="/download"
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors no-underline shadow-[0_4px_20px_rgba(124,179,66,0.3)]"
					>
						<Download size={18} strokeWidth={2.5} />
						Download for Mac
						<ArrowRight size={16} strokeWidth={2.5} />
					</Link>
				</div>

				<p className="text-background/40 text-xs mt-8">
					Want product updates?{" "}
					<a
						href="/rss.xml"
						className="text-background/60 underline underline-offset-2 hover:text-background/80 transition-colors"
					>
						Subscribe to the RSS feed
					</a>
					.
				</p>
			</div>
		</section>
	);
}
