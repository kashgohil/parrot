import { createFileRoute } from "@tanstack/react-router";
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
	BlogStrip,
	FaqSection,
	FinalCta,
	FounderNote,
} from "@/components/home/closing-sections";
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
import { HOME_FAQ } from "@/lib/home-faq";
import { PARROT_FACTS } from "@/lib/parrot-facts";

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
					mainEntity: HOME_FAQ.map((item) => ({
						"@type": "Question",
						name: item.q,
						acceptedAnswer: { "@type": "Answer", text: item.a },
					})),
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

			<FounderNote />
			<FaqSection />
			<BlogStrip />
			<FinalCta />

			<Footer />
		</div>
	);
}
