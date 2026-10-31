import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	Clipboard,
	ClipboardPaste,
	Download,
	Eye,
	Keyboard,
	Laptop,
	Mic,
	Search,
	Sparkles,
	WifiOff,
	X as XIcon,
	Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
import { ForestCTA } from "@/components/forest-cta";
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
// Layout helpers
// ---------------------------------------------------------------------------
const WRAP = "mx-auto max-w-[1120px] px-5";
// Bands alternate so every section has a visible edge: paper (doodles show
// through), a pale green tint, or forest.
const BAND = "py-[clamp(72px,9vw,112px)]";
const TINT = `${BAND} bg-band border-y border-line-soft`;
const FOREST = `${BAND} bg-forest text-on-forest-muted`;

function Head({
	title,
	lede,
	center,
	dark,
	className = "",
}: {
	title: ReactNode;
	lede?: ReactNode;
	center?: boolean;
	dark?: boolean;
	className?: string;
}) {
	return (
		<div
			className={`mb-[clamp(36px,5vw,56px)] grid max-w-[640px] gap-3.5 ${center ? "mx-auto text-center" : ""} ${className}`}
		>
			<h2
				className={`text-balance text-[clamp(2rem,4.4vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.028em] ${dark ? "text-on-forest" : "text-foreground"}`}
			>
				{title}
			</h2>
			{lede && (
				<p
					className={`text-pretty text-lg ${dark ? "text-on-forest-muted" : "text-muted-foreground"}`}
				>
					{lede}
				</p>
			)}
		</div>
	);
}

const PILL_BTN =
	"inline-flex h-[50px] items-center gap-2.5 rounded-full pr-6 pl-5 font-semibold no-underline transition-[background-color,transform] active:scale-[0.98]";

function Wave({
	bars = 6,
	className = "",
}: {
	bars?: number;
	className?: string;
}) {
	return (
		<span className={`flex h-[18px] items-center gap-[3px] ${className}`}>
			{Array.from({ length: bars }, (_, i) => (
				<i
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bars
					key={i}
					className="w-[3px] animate-hud-wave rounded-full bg-primary"
					style={{ animationDelay: `${i * 0.12}s` }}
				/>
			))}
		</span>
	);
}

function Tabs<T extends string>({
	items,
	active,
	onSelect,
	label,
}: {
	items: readonly T[];
	active: T;
	onSelect: (item: T) => void;
	label: string;
}) {
	return (
		<div
			role="tablist"
			aria-label={label}
			className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 shadow-[0_1px_2px_rgba(27,46,27,0.05)] [scrollbar-width:none]"
		>
			{items.map((item) => (
				<button
					key={item}
					type="button"
					role="tab"
					aria-selected={item === active}
					onClick={() => onSelect(item)}
					className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
						item === active
							? "bg-foreground text-background"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					{item}
				</button>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// 1. Hero: a Gmail draft typing itself while the Parrot HUD listens
// ---------------------------------------------------------------------------
const HERO_WORDS =
	"Hi Sarah, let's move the design review to Thursday at 2. Monday doesn't work for John either. I'll send the Figma link before then.".split(
		" ",
	);

function HeroMock() {
	const [shown, setShown] = useState(0);
	const [seconds, setSeconds] = useState(3);

	useEffect(() => {
		const done = shown >= HERO_WORDS.length;
		const t = setTimeout(
			() => setShown(done ? 0 : shown + 1),
			done ? 3200 : 140 + Math.random() * 90,
		);
		return () => clearTimeout(t);
	}, [shown]);

	useEffect(() => {
		const t = setInterval(() => setSeconds((s) => (s >= 14 ? 1 : s + 1)), 1000);
		return () => clearInterval(t);
	}, []);

	return (
		<div
			className="relative pt-7 pb-[52px]"
			role="img"
			aria-label="Parrot dictating into a Gmail draft"
		>
			<div className="absolute inset-y-0 right-[-6%] bottom-[8%] left-[6%] rounded-[36px] bg-[linear-gradient(140deg,#cfe8ad,#9fcd6a_55%,#6aa338)] max-md:right-0" />
			<div className="relative overflow-hidden rounded-[14px] border border-foreground/15 bg-card shadow-[0_40px_70px_-30px_rgba(27,46,27,0.55),0_12px_24px_-12px_rgba(27,46,27,0.25)] md:-ml-[4%]">
				<div className="flex h-10 items-center gap-2 border-b border-line-soft bg-[#f3f6ef] px-3.5">
					<span className="size-3 rounded-full bg-[#ff5f57]" />
					<span className="size-3 rounded-full bg-[#febc2e]" />
					<span className="size-3 rounded-full bg-[#28c840]" />
					<span className="mr-[52px] flex-1 text-center text-[13px] font-semibold text-muted-foreground">
						New message · Gmail
					</span>
				</div>
				{[
					["To", "sarah@northwind.co"],
					["Subject", "Thursday review"],
				].map(([k, v]) => (
					<div
						key={k}
						className="flex gap-2.5 border-b border-line-soft px-5 py-[11px] text-sm"
					>
						<span className="w-[58px] text-muted-foreground">{k}</span>
						<span className="font-medium text-foreground">{v}</span>
					</div>
				))}
				<p className="min-h-[172px] px-5 pt-[18px] pb-6 text-base leading-[1.65] text-foreground">
					{HERO_WORDS.slice(0, shown).join(" ")}
					<span className="ml-px inline-block h-[1.1em] w-0.5 animate-blink-caret-bg bg-lime-text align-[-0.2em]" />
				</p>
			</div>
			<div className="absolute bottom-2 left-1/2 flex h-11 -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-[#142214] pr-4 pl-3 text-[13px] font-semibold text-on-forest shadow-[0_14px_34px_-10px_rgba(0,0,0,0.55)]">
				<span className="size-[9px] rounded-full bg-[#ff5d3d] shadow-[0_0_0_4px_rgba(255,93,61,0.22)]" />
				<Wave />
				Listening
				<span className="font-mono font-medium text-on-forest-muted tabular-nums">
					0:{String(seconds).padStart(2, "0")}
				</span>
			</div>
		</div>
	);
}

const PHRASES = [
	"Send the quarterly report to the team by Friday.",
	"Dear Dr. Patel, thank you for the referral.",
	"Schedule a follow-up with the client next Tuesday.",
	"The defendant's counsel filed a motion to dismiss.",
	"Remind me to buy oat milk and sourdough.",
	"Let's reschedule the standup to 3pm.",
	"Can you review the PR and merge when ready?",
];

function Ticker() {
	return (
		<div
			aria-hidden="true"
			className="overflow-hidden border-y border-line-soft bg-card py-[18px] fade-x"
		>
			<div className="flex w-max animate-marquee gap-3">
				{[0, 1].map((set) =>
					PHRASES.map((p) => (
						<span
							key={`${set}-${p}`}
							className="whitespace-nowrap rounded-full bg-band px-3.5 py-1.5 font-mono text-[13.5px] text-muted-foreground"
						>
							{p}
						</span>
					)),
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 2. Cleanup: what you said vs what Parrot writes
// ---------------------------------------------------------------------------
// Words wrapped in [brackets] are fillers that cleanup removes.
const CLEANUP_EXAMPLES = [
	{
		said: "so [um] basically I think we should [uh] move the meeting to [like] Thursday because [uh] monday doesnt work for sarah and john cant make it either",
		fillers: "4 fillers",
		wrote:
			"Let's move the meeting to Thursday. Monday doesn't work for Sarah, and John can't make it either.",
	},
	{
		said: "hey can you [um] send me the report for Q3 the one with the revenue numbers and the churn data I need it for the board deck thanks",
		fillers: "1 filler",
		wrote:
			"Can you send me the Q3 report with the revenue numbers and churn data? I need it for the board deck. Thanks.",
	},
	{
		said: "patient presents with [um] elevated BP around 150 over 95 and [uh] recurring headaches in the mornings",
		fillers: "2 fillers",
		wrote:
			"Patient presents with elevated BP (~150/95) and recurring morning headaches.",
	},
];

function Said({ text }: { text: string }) {
	return (
		<>
			“
			{text.split(/(\[[^\]]+\])/).map((part, i) =>
				part.startsWith("[") ? (
					<s
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed token order
						key={i}
						className="rounded bg-coral-soft px-[3px] text-coral decoration-2"
					>
						{part.slice(1, -1)}
					</s>
				) : (
					part
				),
			)}
			”
		</>
	);
}

function CleanupSection() {
	const [idx, setIdx] = useState(0);
	const [auto, setAuto] = useState(true);

	useEffect(() => {
		if (!auto) return;
		const t = setInterval(
			() => setIdx((i) => (i + 1) % CLEANUP_EXAMPLES.length),
			6000,
		);
		return () => clearInterval(t);
	}, [auto]);

	const ex = CLEANUP_EXAMPLES[idx];
	const tag = "rounded-full px-3 py-[5px] text-[13px] font-semibold";

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: #demo is a link target and renders once
		<section id="demo" className={TINT}>
			<div className={WRAP}>
				<Head
					title="Say it messy. Parrot sends it clean."
					lede="The optional cleanup pass removes filler words, applies your corrections and fixes punctuation. Here's what that looks like."
				/>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="min-w-0 rounded-[22px] border border-border bg-card p-[clamp(24px,3.5vw,36px)]">
						<p className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
							<i className="size-2 rounded-full bg-[#f0a020]" />
							What you said
						</p>
						<p className="text-[clamp(18px,2vw,21px)] leading-[1.55] text-ink-2">
							<Said text={ex.said} />
						</p>
						<div className="mt-[22px] flex flex-wrap gap-2">
							<span className={`${tag} bg-coral-soft text-[#a33a17]`}>
								{ex.fillers}
							</span>
						</div>
					</div>
					<div className="relative min-w-0 overflow-hidden rounded-[22px] bg-forest p-[clamp(24px,3.5vw,36px)] text-on-forest">
						<div className="pointer-events-none absolute -top-[60px] -right-[60px] size-[220px] rounded-full bg-primary/35 blur-[60px]" />
						<p className="relative mb-4 flex items-center gap-2 text-sm font-semibold text-on-forest-muted">
							<i className="size-2 rounded-full bg-primary" />
							What Parrot writes
						</p>
						<p className="relative text-[clamp(18px,2vw,21px)] leading-[1.55]">
							“{ex.wrote}”
						</p>
						<div className="relative mt-[22px] flex flex-wrap gap-2">
							<span className={`${tag} bg-primary/20 text-[#cfeaa8]`}>
								Filler removed
							</span>
							<span className={`${tag} bg-primary/20 text-[#cfeaa8]`}>
								Punctuation fixed
							</span>
						</div>
					</div>
				</div>
				<div className="mt-[22px] flex justify-center gap-2">
					{CLEANUP_EXAMPLES.map((e, i) => (
						<button
							key={e.wrote}
							type="button"
							aria-label={`Example ${i + 1}`}
							aria-current={i === idx || undefined}
							onClick={() => {
								setIdx(i);
								setAuto(false);
							}}
							className={`h-1.5 rounded-full transition-all ${i === idx ? "w-9 bg-primary" : "w-[18px] bg-border hover:bg-primary/40"}`}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// 3. Dictate into any app
// ---------------------------------------------------------------------------
const VOICE_SCENARIOS = [
	{
		label: "Email",
		appName: "Gmail",
		words:
			"Hi team, just a quick update on the Q3 launch. We're tracking ahead of schedule and should have the beta ready by next Wednesday. I'll send calendar invites for the review session.",
	},
	{
		label: "Code",
		appName: "VS Code",
		words:
			"This function validates the user session token against the Redis store. If expired, it triggers a refresh flow and returns the new token. Throws AuthError on invalid signatures.",
	},
	{
		label: "Medical",
		appName: "Epic",
		words:
			"Patient is a 54-year-old male presenting with chest tightness and shortness of breath on exertion. No prior cardiac history. Recommend stress echocardiogram and lipid panel.",
	},
	{
		label: "Slack",
		appName: "Slack",
		words:
			"Hey, the deploy pipeline is green. I merged the hotfix for the auth redirect bug. Can someone from the frontend team verify on staging before we push to prod?",
	},
] as const;

function AnyAppSection() {
	const [tab, setTab] = useState<string>(VOICE_SCENARIOS[0].label);
	const [shown, setShown] = useState(0);
	const scenario =
		VOICE_SCENARIOS.find((s) => s.label === tab) ?? VOICE_SCENARIOS[0];
	const words = scenario.words.split(" ");

	// biome-ignore lint/correctness/useExhaustiveDependencies: restart typing when the tab changes
	useEffect(() => setShown(0), [tab]);
	useEffect(() => {
		if (shown >= words.length) return;
		const t = setTimeout(() => setShown((n) => n + 1), 70 + Math.random() * 50);
		return () => clearTimeout(t);
	}, [shown, words.length]);

	return (
		<section className={BAND}>
			<div className={WRAP}>
				<Head
					center
					title="Dictate into any app"
					lede="Parrot works wherever your cursor is. Pick an app and watch it type."
				/>
				<div className="mx-auto grid min-w-0 max-w-[820px] justify-items-center gap-5">
					<Tabs
						label="App"
						items={VOICE_SCENARIOS.map((s) => s.label)}
						active={tab}
						onSelect={setTab}
					/>
					<div className="surface w-full overflow-hidden">
						<div className="flex items-center gap-2.5 border-b border-line-soft px-[22px] py-3.5 text-sm font-semibold text-muted-foreground">
							Dictating into {scenario.appName}
							<span className="ml-auto inline-flex items-center gap-2 text-[13px] text-lime-text">
								<Wave bars={4} />
								On device
							</span>
						</div>
						<p className="min-h-[150px] p-[22px] text-lg leading-[1.65] text-foreground">
							{words.slice(0, shown).join(" ")}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// 4. Privacy (forest band)
// ---------------------------------------------------------------------------
const FLOW: { icon: ReactNode; label: string }[] = [
	{ icon: <Mic size={24} />, label: "Mic" },
	{ icon: <Laptop size={24} />, label: "Your Mac" },
	{ icon: <Zap size={24} />, label: "Transcribe" },
	{ icon: <Sparkles size={24} />, label: "Cleanup" },
	{ icon: <Clipboard size={24} />, label: "Your cursor" },
];

const PRIVACY_CHECKS = [
	"Fast, accurate first pass",
	"Audio never leaves your Mac",
	"No account, no sign-in",
	"Works fully offline",
	"Custom vocabulary and cleanup",
	"Dictation history you control",
];

function PrivacySection() {
	const panel = "rounded-[22px] border border-forest-line bg-forest-2";
	return (
		<section className={FOREST}>
			<div className={WRAP}>
				<Head
					dark
					title="Fast. Private. Free for life."
					lede="Transcription and cleanup run on your Mac. Your voice never leaves it, and you never pay a subscription to keep dictating."
				/>
				<div
					className={`${panel} relative grid grid-cols-2 gap-y-5 p-[clamp(22px,3vw,34px)] sm:grid-cols-5 sm:gap-2`}
				>
					<span className="absolute top-4 right-4 rounded-full bg-primary/18 px-3 py-[5px] text-xs font-semibold text-[#cfeaa8]">
						On device
					</span>
					{FLOW.map((step, i) => (
						<div
							key={step.label}
							className="relative grid justify-items-center gap-2.5 pt-5 text-center text-sm font-semibold text-on-forest"
						>
							<span className="grid size-14 place-items-center rounded-[18px] border border-forest-line bg-on-forest/8 text-[#b9e27a]">
								{step.icon}
							</span>
							{step.label}
							{i < FLOW.length - 1 && (
								<span className="absolute top-[47px] right-[calc(-50%+36px)] left-[calc(50%+36px)] border-t-2 border-dashed border-[#b9e27a]/50 max-sm:hidden" />
							)}
						</div>
					))}
				</div>
				<div className="mt-4 grid gap-4 sm:grid-cols-3">
					{[
						["Snappy", "from releasing the key to pasted text"],
						["0 bytes", "of your audio sent anywhere"],
						["Free", "for life, no word caps"],
					].map(([big, small]) => (
						<div key={big} className={`${panel} p-[26px]`}>
							<b className="block text-[clamp(30px,4vw,44px)] font-black leading-none tracking-[-0.035em] text-on-forest">
								{big}
							</b>
							<span className="mt-2 block text-[15px]">{small}</span>
						</div>
					))}
				</div>
				<ul className="m-0 mt-7 grid list-none gap-x-6 gap-y-3.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
					{PRIVACY_CHECKS.map((c) => (
						<li
							key={c}
							className="flex items-center gap-2.5 text-[15px] text-on-forest"
						>
							<span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-primary/22 text-[#b9e27a]">
								<Check size={14} strokeWidth={3} />
							</span>
							{c}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// 5. Features bento
// ---------------------------------------------------------------------------
const MINI_FEATURES: { icon: ReactNode; title: string; desc: string }[] = [
	{
		icon: <Keyboard size={19} />,
		title: "Global hotkey",
		desc: "Hold fn from anywhere, or set your own shortcut.",
	},
	{
		icon: <ClipboardPaste size={19} />,
		title: "Auto-paste",
		desc: "Text lands at your cursor when you let go.",
	},
	{
		icon: <Eye size={19} />,
		title: "Live preview",
		desc: "See the words form in the HUD as you talk.",
	},
	{
		icon: <WifiOff size={19} />,
		title: "Fully offline",
		desc: "After setup, no internet and no account.",
	},
];

const VOCAB = [
	"Kubernetes",
	"GraphQL",
	"Supabase",
	"Dr. Nakamura",
	"OAuth2",
	"PostgreSQL",
];

function FeaturesSection() {
	const tile =
		"surface grid min-w-0 content-start gap-2.5 p-[clamp(22px,3vw,30px)]";
	const h3 = "text-[21px] font-bold tracking-[-0.015em] text-foreground";
	const p = "text-[15.5px] text-muted-foreground";
	const inset = "rounded-[14px] border border-line-soft bg-background";
	return (
		<section className={BAND}>
			<div className={WRAP}>
				<Head
					title="The details you'll use every day"
					lede="Faster dictation, sharper accuracy, and the polish you actually notice."
				/>
				<div className="grid gap-4 md:grid-cols-6">
					<div className={`${tile} md:col-span-4`}>
						<h3 className={h3}>Custom vocabulary that remembers</h3>
						<p className={p}>
							Add names, acronyms and jargon once. Parrot spells them right
							every time after.
						</p>
						<div className="mt-2.5 flex flex-wrap gap-2">
							{VOCAB.map((w) => (
								<span
									key={w}
									className="rounded-full bg-band px-3.5 py-[7px] text-sm font-medium text-foreground"
								>
									{w}
								</span>
							))}
							<span className="rounded-full bg-lime-soft px-3.5 py-[7px] text-sm font-medium text-[#2f5410]">
								+ Priya Raman
							</span>
						</div>
						<div
							className={`${inset} mt-3 flex flex-wrap items-center gap-2.5 px-4 py-3.5 text-[15px]`}
						>
							<s className="text-coral">cooper netties cluster</s>
							<ArrowRight size={15} className="text-muted-foreground" />
							<b className="text-foreground">Kubernetes cluster</b>
						</div>
					</div>
					<div className={`${tile} md:col-span-2`}>
						<h3 className={h3}>Pick how your text sounds</h3>
						<p className={p}>
							Write your context once. Cleanup matches your tone.
						</p>
						<p className={`${inset} mt-1.5 px-3.5 py-3 text-sm text-ink-2`}>
							I'm a senior engineer writing docs and Slack messages to my team.
						</p>
						<div className="mt-2 flex flex-wrap gap-1.5">
							{["Concise", "Technical", "Friendly"].map((t, i) => (
								<span
									key={t}
									className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${i === 0 ? "bg-foreground text-background" : "bg-band text-muted-foreground"}`}
								>
									{t}
								</span>
							))}
						</div>
					</div>
					<div className={`${tile} md:col-span-3`}>
						<h3 className={h3}>Everything searchable</h3>
						<p className={p}>
							Every dictation is saved with its text, time and length. Turn
							history off any time.
						</p>
						<div className="mt-2 grid overflow-hidden rounded-[14px] border border-line-soft">
							<div className="flex items-center gap-2 border-b border-line-soft bg-background px-3.5 py-2.5 text-sm text-muted-foreground">
								<Search size={15} />
								Search dictations
							</div>
							{[
								[
									"Move the meeting to Thursday. Monday doesn't work for Sarah.",
									"2 min ago · 0:08",
								],
								[
									"Can you send me the Q3 report with revenue numbers?",
									"Yesterday · 0:06",
								],
							].map(([text, meta]) => (
								<div
									key={text}
									className="border-b border-line-soft px-3.5 py-[11px] last:border-b-0"
								>
									<p className="truncate text-[14.5px] text-foreground">
										{text}
									</p>
									<small className="text-[12.5px] text-muted-foreground tabular-nums">
										{meta}
									</small>
								</div>
							))}
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 md:col-span-3">
						{MINI_FEATURES.map((f) => (
							<div
								key={f.title}
								className="surface grid content-start gap-2 p-5"
							>
								<span className="grid size-[38px] place-items-center rounded-xl bg-lime-soft text-lime-text">
									{f.icon}
								</span>
								<h3 className="text-[15.5px] font-semibold text-foreground">
									{f.title}
								</h3>
								<p className="text-sm leading-normal text-muted-foreground">
									{f.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// 6. App carousel
// ---------------------------------------------------------------------------
const APP_ICONS_ROW1: { icon: ReactNode; label: string }[] = [
	{ icon: <SlackIcon className="w-4 h-4" />, label: "Slack" },
	{ icon: <VSCodeIcon className="w-4 h-4" />, label: "VS Code" },
	{ icon: <GmailIcon className="w-4 h-4" />, label: "Gmail" },
	{ icon: <NotionIcon className="w-4 h-4" />, label: "Notion" },
	{ icon: <ArcIcon className="w-4 h-4" />, label: "Arc" },
	{ icon: <FigmaIcon className="w-4 h-4" />, label: "Figma" },
	{ icon: <LinearIcon className="w-4 h-4" />, label: "Linear" },
	{ icon: <DiscordIcon className="w-4 h-4" />, label: "Discord" },
	{ icon: <AppleMessagesIcon className="w-4 h-4" />, label: "Messages" },
	{ icon: <AppleNotesIcon className="w-4 h-4" />, label: "Notes" },
	{ icon: <GoogleDocsIcon className="w-4 h-4" />, label: "Google Docs" },
	{ icon: <FinderIcon className="w-4 h-4" />, label: "Finder" },
	{ icon: <ExcelIcon className="w-4 h-4" />, label: "Excel" },
	{ icon: <TerminalIcon className="w-4 h-4" />, label: "Terminal" },
	{ icon: <OutlookIcon className="w-4 h-4" />, label: "Outlook" },
];
const APP_ICONS_ROW2: { icon: ReactNode; label: string }[] = [
	{ icon: <TwitterIcon className="w-4 h-4" />, label: "Twitter" },
	{ icon: <TelegramIcon className="w-4 h-4" />, label: "Telegram" },
	{ icon: <TrelloIcon className="w-4 h-4" />, label: "Trello" },
	{ icon: <JiraIcon className="w-4 h-4" />, label: "Jira" },
	{ icon: <ConfluenceIcon className="w-4 h-4" />, label: "Confluence" },
	{ icon: <SpotifyIcon className="w-4 h-4" />, label: "Spotify" },
	{ icon: <InstagramIcon className="w-4 h-4" />, label: "Instagram" },
	{ icon: <TeamsIcon className="w-4 h-4" />, label: "Teams" },
	{ icon: <ObsidianIcon className="w-4 h-4" />, label: "Obsidian" },
	{ icon: <BearIcon className="w-4 h-4" />, label: "Bear" },
	{ icon: <SketchIcon className="w-4 h-4" />, label: "Sketch" },
	{ icon: <ChromeIcon className="w-4 h-4" />, label: "Chrome" },
	{ icon: <FirefoxIcon className="w-4 h-4" />, label: "Firefox" },
	{ icon: <SuperhumanIcon className="w-4 h-4" />, label: "Superhuman" },
	{ icon: <CalendarIcon className="w-4 h-4" />, label: "Calendar" },
];

function AppsSection() {
	const row = (apps: typeof APP_ICONS_ROW1, set: number) =>
		apps.map((app) => (
			<span
				key={`${set}-${app.label}`}
				className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-[7px] text-sm font-medium text-foreground"
			>
				<span className="text-muted-foreground">{app.icon}</span>
				{app.label}
			</span>
		));
	return (
		<section className={`${TINT} !py-[clamp(56px,7vw,80px)]`}>
			<div className={WRAP}>
				<Head
					center
					className="!mb-8"
					title={
						<span className="text-[clamp(1.6rem,3vw,2.2rem)]">
							Works in every Mac app
						</span>
					}
					lede="No plugins, no integrations. If it has a text field, Parrot can type into it."
				/>
				<div className="grid gap-3 overflow-hidden fade-x">
					<div className="flex w-max animate-marquee gap-2.5">
						{row(APP_ICONS_ROW1, 0)}
						{row(APP_ICONS_ROW1, 1)}
					</div>
					<div className="flex w-max animate-marquee-reverse gap-2.5">
						{row(APP_ICONS_ROW2, 0)}
						{row(APP_ICONS_ROW2, 1)}
					</div>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// 7. Workflows
// ---------------------------------------------------------------------------
const USE_CASES = [
	{
		label: "Writers",
		before:
			"so um I think the main point of the article is that like AI is changing how we write and uh we need to adapt our workflows",
		after:
			"The core argument: AI is fundamentally changing how we write, and our workflows need to adapt accordingly.",
		benefits: [
			"Draft blog posts and newsletters at the speed of thought",
			"Cleanup turns stream-of-consciousness into polished prose",
			"Custom writing style keeps your voice consistent",
		],
	},
	{
		label: "Medical",
		before:
			"patient is a 54 year old male presenting with uh chest tightness and shortness of breath on exertion no prior cardiac history",
		after:
			"Patient is a 54-year-old male presenting with chest tightness and dyspnea on exertion. No prior cardiac history.",
		benefits: [
			"Dictate patient notes between appointments",
			"Custom vocabulary handles medical terminology",
			"Local mode keeps patient data on-device",
		],
	},
	{
		label: "Legal",
		before:
			"the defendants counsel filed a motion to dismiss arguing that the plaintiff lacks standing under uh article three",
		after:
			"Defendant's counsel filed a motion to dismiss, arguing that the plaintiff lacks standing under Article III.",
		benefits: [
			"Draft case notes and contracts by voice",
			"Local mode keeps privileged communications on-device",
			"Writing style adapts to formal legal prose",
		],
	},
	{
		label: "Developers",
		before:
			"this function validates the user session token and if its expired it triggers a refresh flow uh and returns the new token",
		after:
			"This function validates the user session token. If expired, it triggers a refresh flow and returns the new token.",
		benefits: [
			"Write documentation and code comments by voice",
			"Great for developers managing RSI",
			"Technical vocabulary like 'Kubernetes' transcribed correctly",
		],
	},
	{
		label: "Executives",
		before:
			"hey can you schedule a follow up with the client for next tuesday and also send the deck to marketing before the all hands",
		after:
			"Please schedule a follow-up with the client for next Tuesday. Also, send the deck to Marketing before the all-hands.",
		benefits: [
			"Fire off emails and status updates in seconds",
			"Writing style keeps tone consistent across communication",
			"Works in any app - email, Slack, Notion, etc.",
		],
	},
	{
		label: "Accessibility",
		before:
			"for anyone who finds typing difficult parrot provides a reliable fast alternative that works across every app",
		after:
			"For anyone who finds typing difficult, Parrot provides a reliable, fast alternative that works across every app.",
		benefits: [
			"Reliable voice input across every Mac app",
			"Global hotkey means no mouse required to start",
			"Local mode works fully offline",
		],
	},
] as const;

function WorkflowsSection() {
	const [tab, setTab] = useState<string>(USE_CASES[0].label);
	const active = USE_CASES.findIndex((u) => u.label === tab);
	// Every tab's content shares one grid cell, so switching never changes the height.
	const stack = (i: number) =>
		`col-start-1 row-start-1 transition-opacity duration-200 ${i === active ? "opacity-100" : "invisible opacity-0"}`;

	return (
		<section className={BAND}>
			<div className={WRAP}>
				<Head
					title="Built for how you work"
					lede="Drafting emails, writing patient notes or documenting code, Parrot adapts to the job."
				/>
				<div className="grid justify-items-start gap-5">
					<Tabs
						label="Workflow"
						items={USE_CASES.map((u) => u.label)}
						active={tab}
						onSelect={setTab}
					/>
					<div className="surface grid w-full overflow-hidden md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
						<div className="grid border-line-soft p-[clamp(22px,3vw,32px)] max-md:border-b md:border-r">
							{USE_CASES.map((u, i) => (
								<div
									key={u.label}
									className={`${stack(i)} grid content-start gap-3.5`}
								>
									<p className="rounded-2xl border border-line-soft bg-background px-[18px] py-4 italic text-muted-foreground">
										<small className="mb-1 block text-[13px] font-semibold not-italic">
											You say
										</small>
										“{u.before}”
									</p>
									<p className="rounded-2xl bg-lime-soft px-[18px] py-4 text-foreground">
										<small className="mb-1 block text-[13px] font-semibold text-[#3d6a14]">
											Parrot writes
										</small>
										“{u.after}”
									</p>
								</div>
							))}
						</div>
						<div className="grid bg-band p-[clamp(22px,3vw,32px)]">
							{USE_CASES.map((u, i) => (
								<div
									key={u.label}
									className={`${stack(i)} grid content-start gap-3.5`}
								>
									<h3 className="text-lg font-bold text-foreground">
										Why {u.label.toLowerCase()} use it
									</h3>
									<ul className="m-0 grid list-none gap-3 p-0">
										{u.benefits.map((b) => (
											<li
												key={b}
												className="flex gap-2.5 text-[15px] text-ink-2"
											>
												<Check
													size={18}
													strokeWidth={2.5}
													className="mt-0.5 shrink-0 text-lime-text"
												/>
												{b}
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// 8. Competitor comparison
// ---------------------------------------------------------------------------
type Cell = boolean | "partial";
const COMPARISON: {
	feature: string;
	parrot: Cell;
	wispr: Cell;
	macos: Cell;
}[] = [
	{ feature: "Local mode", parrot: true, wispr: false, macos: false },
	{
		feature: "Fast on-device dictation",
		parrot: true,
		wispr: false,
		macos: "partial",
	},
	{ feature: "Custom vocabulary", parrot: true, wispr: true, macos: false },
	{ feature: "AI cleanup", parrot: true, wispr: true, macos: false },
	{
		feature: "Privacy (no data sent)",
		parrot: true,
		wispr: false,
		macos: "partial",
	},
	{ feature: "Offline support", parrot: true, wispr: false, macos: true },
	{ feature: "Free, for life", parrot: true, wispr: false, macos: true },
];

function CompareCell({ value }: { value: Cell }) {
	if (value === true)
		return (
			<Check
				size={18}
				strokeWidth={2.5}
				className="mx-auto text-lime-text"
				aria-label="Yes"
			/>
		);
	if (value === false)
		return (
			<XIcon size={18} className="mx-auto text-[#b54a2e]" aria-label="No" />
		);
	return <span className="font-medium text-[#9a6a00]">Partial</span>;
}

function CompareSection() {
	const cell = "border-b border-line-soft px-5 py-[15px] text-center";
	return (
		<section className={TINT}>
			<div className={WRAP}>
				<Head
					title="Parrot vs the alternatives"
					lede="Free for life, fully local, and built for the daily dictation loop."
				/>
				<div className="surface overflow-x-auto">
					<table className="w-full min-w-[560px] border-separate border-spacing-0 text-[15px]">
						<thead>
							<tr className="text-sm font-semibold text-muted-foreground">
								<th className={`${cell} bg-background text-left`}>Feature</th>
								<th
									className={`${cell} bg-lime-soft text-[15px] font-extrabold text-[#2f5410]`}
								>
									Parrot
								</th>
								<th className={`${cell} bg-background`}>Wispr Flow</th>
								<th className={`${cell} bg-background`}>macOS Dictation</th>
							</tr>
						</thead>
						<tbody>
							{COMPARISON.map((row) => (
								<tr key={row.feature} className="[&:last-child>td]:border-b-0">
									<td className={`${cell} text-left text-foreground`}>
										{row.feature}
									</td>
									<td className={`${cell} bg-lime-soft`}>
										<CompareCell value={row.parrot} />
									</td>
									<td className={cell}>
										<CompareCell value={row.wispr} />
									</td>
									<td className={cell}>
										<CompareCell value={row.macos} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// 9. FAQ
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

function FaqSection() {
	return (
		<section className={BAND}>
			<div
				className={`${WRAP} grid items-start gap-[clamp(32px,5vw,64px)] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]`}
			>
				<Head
					className="!mb-0"
					title="Questions"
					lede="The short answers. Anything else, write to us from the Contact page."
				/>
				<Accordion
					type="single"
					collapsible
					defaultValue={FAQ[0].q}
					className="surface overflow-hidden"
				>
					{FAQ.map((item) => (
						<AccordionItem
							key={item.q}
							value={item.q}
							className="border-b border-line-soft px-6 last:border-b-0"
						>
							<AccordionTrigger className="py-5 text-[16.5px] font-semibold text-foreground hover:no-underline">
								{item.q}
							</AccordionTrigger>
							<AccordionContent className="pb-5 text-[15.5px] leading-relaxed text-ink-2">
								{item.a}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// 10. Blog
// ---------------------------------------------------------------------------
const BLOG_CARDS = [
	{
		href: "/blog/wispr-flow-alternatives",
		tag: "Alternatives",
		title: "Best Wispr Flow alternatives (2026)",
		blurb: "Free local options vs Wispr’s subscription and word cap.",
	},
	{
		href: "/blog/superwhisper-alternatives",
		tag: "Alternatives",
		title: "Best Superwhisper alternatives",
		blurb: "Local Mac dictation with cleanup, without a Pro plan.",
	},
	{
		href: "/blog/free-voice-dictation-apps-2026",
		tag: "Guide",
		title: "Free voice dictation apps in 2026",
		blurb: "What free really means: caps, trials, and free forever.",
	},
	{
		href: "/blog/local-voice-dictation-mac",
		tag: "Tutorial",
		title: "Set up local voice dictation on Mac",
		blurb: "On-device transcription and cleanup in under five minutes.",
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
		blurb: "Side-by-side feature and pricing tables for each competitor.",
	},
];

function BlogSection() {
	return (
		<section className={TINT}>
			<div className={WRAP}>
				<Head title="Guides for free, local Mac dictation" />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{BLOG_CARDS.map((card) => (
						<a
							key={card.href}
							href={card.href}
							className="surface grid content-start gap-2.5 p-6 no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_1px_2px_rgba(27,46,27,0.06),0_22px_40px_-18px_rgba(27,46,27,0.32)]"
						>
							<span className="justify-self-start rounded-full bg-lime-soft px-2.5 py-1 text-xs font-bold text-[#2f5410]">
								{card.tag}
							</span>
							<h3 className="text-lg leading-[1.3] font-bold text-foreground">
								{card.title}
							</h3>
							<p className="text-[15px] text-muted-foreground">{card.blurb}</p>
							<span className="mt-1.5 text-sm font-bold text-lime-text">
								Read the guide →
							</span>
						</a>
					))}
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function HomePage() {
	return (
		<div className="min-h-screen">
			<section className="overflow-hidden pt-[clamp(48px,7vw,88px)] pb-[clamp(56px,7vw,96px)]">
				<div
					className={`${WRAP} grid items-center gap-[clamp(36px,5vw,64px)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]`}
				>
					<div>
						<span className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-3.5 pl-2.5 text-[13px] font-semibold text-lime-text shadow-[0_1px_2px_rgba(27,46,27,0.05)]">
							<i className="size-[7px] rounded-full bg-primary shadow-[0_0_0_4px_var(--lime-soft)]" />
							macOS · {PARROT_FACTS.price} · Apple Silicon
						</span>
						<h1 className="mt-[22px] text-[clamp(2.6rem,5.2vw,4.1rem)] font-black leading-none tracking-[-0.035em] text-foreground">
							Voice dictation for Mac.{" "}
							<span className="block whitespace-nowrap text-primary">
								Local-first. Free.
							</span>
						</h1>
						<p className="mt-[22px] max-w-[30em] text-[19px] leading-relaxed text-ink-2">
							Hold{" "}
							<kbd className="inline-grid h-[26px] min-w-[30px] place-items-center rounded-[7px] border border-b-2 border-border bg-card px-[7px] font-mono text-xs font-semibold text-foreground">
								fn
							</kbd>
							, talk, let go. Parrot writes it down on your Mac, cleans it up,
							and pastes it into whatever app you're in. No account, no
							subscription, no audio leaving the machine.
						</p>
						<div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3.5">
							<Link
								to="/download"
								className={`${PILL_BTN} bg-foreground text-background shadow-[0_10px_24px_-10px_rgba(27,46,27,0.55)] hover:bg-[#2b452b]`}
							>
								<Download size={18} strokeWidth={2.4} />
								Download for Mac
							</Link>
							<span className="text-sm text-muted-foreground">
								Apple Silicon (M1 and later)
							</span>
						</div>
						<dl className="mt-9 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-line-soft pt-6">
							{[
								["$0", "forever, no word caps"],
								["0 bytes", "of audio sent anywhere"],
								["Any app", "pastes at your cursor"],
							].map(([big, small]) => (
								<div key={big} className="grid">
									<dt className="text-[22px] font-extrabold tracking-[-0.02em] text-foreground">
										{big}
									</dt>
									<dd className="m-0 text-[13px] text-muted-foreground">
										{small}
									</dd>
								</div>
							))}
						</dl>
					</div>
					<HeroMock />
				</div>
			</section>

			<Ticker />
			<CleanupSection />
			<AnyAppSection />
			<PrivacySection />
			<FeaturesSection />
			<AppsSection />
			<WorkflowsSection />
			<CompareSection />
			<FaqSection />
			<BlogSection />
			<ForestCTA />
			<Footer />
		</div>
	);
}
