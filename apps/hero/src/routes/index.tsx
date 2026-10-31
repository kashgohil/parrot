import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Bot,
	Check,
	Clipboard,
	ClipboardPaste,
	Code,
	Download,
	Eye,
	Gift,
	Keyboard,
	Laptop,
	Lock,
	Mail,
	MessageSquare,
	Mic,
	Minus,
	Search,
	Stethoscope,
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
import { SectionHeading } from "@/components/section-heading";
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
// 1. Hero: Live Dictation Simulation
// ---------------------------------------------------------------------------
const DICTATION_SCENARIOS = [
	{
		appName: "Gmail",
		appIcon: <Mail size={14} className="text-white/50" />,
		placeholder: "Compose...",
		text: "Hi team, let's move the standup to Thursday at 3pm. Monday doesn't work for Sarah, and John is out until Wednesday. I'll send updated calendar invites.",
	},
	{
		appName: "Slack",
		appIcon: <MessageSquare size={14} className="text-white/50" />,
		placeholder: "Message #engineering...",
		text: "Deploy pipeline is green. Merged the hotfix for the auth redirect bug. Can someone from frontend verify on staging before we push to prod?",
	},
	{
		appName: "VS Code",
		appIcon: <Code size={14} className="text-white/50" />,
		placeholder: "// Add comment...",
		text: "This function validates the session token against the Redis store. If expired, it triggers a silent refresh flow and returns the new token pair.",
	},
	{
		appName: "Notes",
		appIcon: <Stethoscope size={14} className="text-white/50" />,
		placeholder: "New note...",
		text: "Patient presents with elevated BP around 150 over 95 and recurring morning headaches. No prior cardiac history. Recommend full metabolic panel and stress echo.",
	},
];

type DictationPhase = "idle" | "hotkey" | "recording" | "transcribing" | "done";

function DictationDemo() {
	const [scenarioIdx, setScenarioIdx] = useState(0);
	const [phase, setPhase] = useState<DictationPhase>("idle");
	const [visibleWords, setVisibleWords] = useState(0);
	const [showClipboard, setShowClipboard] = useState(false);

	const scenario = DICTATION_SCENARIOS[scenarioIdx];
	const wordsArr = scenario.text.split(" ");

	// Phase state machine
	useEffect(() => {
		let timeout: ReturnType<typeof setTimeout>;

		switch (phase) {
			case "idle":
				timeout = setTimeout(() => setPhase("hotkey"), 1000);
				break;
			case "hotkey":
				timeout = setTimeout(() => setPhase("recording"), 600);
				break;
			case "recording": {
				// Recording duration scales with text length
				const dur = 1200 + wordsArr.length * 30;
				timeout = setTimeout(() => setPhase("transcribing"), dur);
				break;
			}
			case "transcribing":
				// Words appear one-by-one, handled by separate effect
				break;
			case "done":
				setShowClipboard(true);
				timeout = setTimeout(() => {
					setShowClipboard(false);
					setVisibleWords(0);
					setScenarioIdx((i) => (i + 1) % DICTATION_SCENARIOS.length);
					setPhase("idle");
				}, 1800);
				break;
		}

		return () => clearTimeout(timeout);
	}, [phase, wordsArr.length]);

	// Word-by-word reveal during transcribing phase
	useEffect(() => {
		if (phase !== "transcribing") return;
		if (visibleWords >= wordsArr.length) {
			setPhase("done");
			return;
		}
		const t = setTimeout(
			() => setVisibleWords((v) => v + 1),
			50 + Math.random() * 35,
		);
		return () => clearTimeout(t);
	}, [phase, visibleWords, wordsArr.length]);

	// Reset words when scenario changes
	useEffect(() => {
		setVisibleWords(0);
	}, [scenarioIdx]);

	const isRecording = phase === "recording";
	const isHotkeyPressed = phase === "hotkey" || phase === "recording";
	const waveformBars = Array.from({ length: 24 }, (_, i) => i);

	return (
		<div className="bg-[#1a1f2b] rounded-xl border border-white/8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden">
			{/* macOS title bar */}
			<div className="flex items-center gap-2 px-4 py-3 bg-[#1e2433] border-b border-white/6">
				<div className="flex gap-[7px]">
					<div className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
					<div className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
					<div className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
				</div>
				<div className="flex-1 flex items-center justify-center gap-1.5">
					{scenario.appIcon}
					<span className="text-[11px] text-white/30 font-medium">
						{scenario.appName}
					</span>
				</div>
				<div className="w-[52px]" />
			</div>

			{/* Text area - all scenarios rendered for consistent height */}
			<div className="p-5">
				<div className="grid">
					{DICTATION_SCENARIOS.map((s, si) => {
						const isActive = si === scenarioIdx;
						const words = s.text.split(" ");
						return (
							<p
								key={si}
								className="col-start-1 row-start-1 text-[13px] leading-relaxed font-mono"
							>
								{words.map((word, i) => {
									// Determine word visibility
									let colorClass = "text-transparent"; // Hidden by default
									if (isActive) {
										if (
											visibleWords === 0 &&
											phase !== "transcribing" &&
											phase !== "done"
										) {
											// Placeholder phase - show nothing (transparent)
											colorClass = "text-transparent";
										} else if (i < visibleWords) {
											// Word has been revealed
											colorClass =
												i === visibleWords - 1 && phase === "transcribing"
													? "text-primary"
													: "text-white/90";
										}
									}
									return (
										<span
											key={`${si}-${i}`}
											className={`inline-block mr-[0.35em] transition-colors duration-150 ${colorClass}`}
										>
											{word}
										</span>
									);
								})}
								{isActive && phase === "transcribing" && (
									<span className="inline-block w-[2px] h-[1.1em] bg-primary/70 ml-px align-text-bottom animate-blink-caret border-r-2 border-primary/70" />
								)}
							</p>
						);
					})}
					{/* Placeholder overlay */}
					{visibleWords === 0 &&
						phase !== "transcribing" &&
						phase !== "done" && (
							<p className="col-start-1 row-start-1 text-[13px] text-white/20 font-mono pointer-events-none">
								{scenario.placeholder}
							</p>
						)}
				</div>
			</div>

			{/* Bottom bar */}
			<div className="flex items-center justify-between px-4 py-3 bg-[#1e2433] border-t border-white/6">
				{/* Hotkey indicator */}
				<div className="flex items-center gap-1">
					<kbd
						className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all duration-150 ${
							isHotkeyPressed
								? "bg-primary/30 text-primary border border-primary/40 shadow-[0_0_8px_rgba(124,179,66,0.3)] translate-y-px"
								: "bg-white/8 text-white/30 border border-white/10"
						}`}
					>
						fn
					</kbd>
				</div>

				{/* Recording / status indicator */}
				<div className="flex items-center gap-2">
					{isRecording && (
						<>
							<div className="flex items-center gap-[2px] h-4">
								{waveformBars.map((i) => (
									<div
										key={i}
										className="w-[2px] rounded-full bg-primary/60 animate-soundwave"
										style={{
											height: `${6 + Math.sin(i * 0.9) * 8}px`,
											animationDelay: `${i * 0.05}s`,
											animationDuration: `${0.6 + (i % 4) * 0.12}s`,
										}}
									/>
								))}
							</div>
							<div className="flex items-center gap-1.5">
								<div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
								<span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
									Recording
								</span>
							</div>
						</>
					)}
					{phase === "transcribing" && (
						<span className="text-[10px] text-white/40 font-medium">
							Transcribing...
						</span>
					)}
					{showClipboard && (
						<span className="text-[10px] text-primary font-semibold flex items-center gap-1">
							<Clipboard size={10} />
							Copied to clipboard
						</span>
					)}
					{phase === "idle" && (
						<span className="text-[10px] text-white/20 font-medium">
							Press hotkey to start
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Before/After cleanup demo (kept as-is)
// ---------------------------------------------------------------------------
function BeforeAfter() {
	const examples = [
		{
			before:
				"so um basically I think we should uh move the meeting to like Thursday because uh monday doesnt work for sarah and also john said he cant make it either so yeah thursday works better I think",
			after:
				"Let's move the meeting to Thursday - Monday doesn't work for Sarah, and John can't make it either.",
		},
		{
			before:
				"hey can you um send me the report for Q3 the one with the revenue numbers and also the customer churn data I need it for the board deck thanks",
			after:
				"Can you send me the Q3 report with revenue numbers and customer churn data? I need it for the board deck. Thanks.",
		},
		{
			before:
				"the patient presents with um elevated BP around 150 over 95 and uh complaints of recurring headaches especially in the morning hours I think we should do a full metabolic panel",
			after:
				"Patient presents with elevated BP (~150/95) and recurring morning headaches. Recommend full metabolic panel.",
		},
	];
	const [idx, setIdx] = useState(0);
	const [key, setKey] = useState(0); // Used to reset the timer on manual selection
	const [isTransitioning, setIsTransitioning] = useState(false);

	// Auto-rotate every 5 seconds, reset when key changes (manual selection)
	useEffect(() => {
		const interval = setInterval(() => {
			setIsTransitioning(true);
			setTimeout(() => {
				setIdx((i) => (i + 1) % examples.length);
				setIsTransitioning(false);
			}, 300);
		}, 5000);
		return () => clearInterval(interval);
	}, [key, examples.length]);

	const handleSelect = (i: number) => {
		if (i === idx) return;
		setIsTransitioning(true);
		setTimeout(() => {
			setIdx(i);
			setIsTransitioning(false);
		}, 300);
		setKey((k) => k + 1); // Reset the timer
	};

	return (
		<div>
			<div className="grid md:grid-cols-2 gap-4">
				<div className="surface p-7 md:p-8">
					<div className="flex items-center gap-2 mb-5">
						<div className="w-2 h-2 rounded-full bg-amber-400" />
						<span className="text-sm font-medium text-muted-foreground">
							What you said
						</span>
					</div>
					<div className="grid">
						{examples.map((example, i) => (
							<p
								key={i}
								className={`col-start-1 row-start-1 text-[17px] leading-relaxed text-foreground/70 italic transition-opacity duration-300 ${
									i === idx && !isTransitioning ? "opacity-100" : "opacity-0"
								}`}
							>
								"{example.before}"
							</p>
						))}
					</div>
				</div>
				<div className="relative overflow-hidden rounded-[20px] bg-foreground p-7 md:p-8 shadow-[0_12px_32px_-16px_rgba(27,46,27,0.5)]">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/25 blur-3xl"
					/>
					<div className="relative flex items-center gap-2 mb-5">
						<div className="w-2 h-2 rounded-full bg-primary" />
						<span className="text-sm font-medium text-background/60">
							What Parrot writes
						</span>
					</div>
					<div className="relative grid">
						{examples.map((example, i) => (
							<p
								key={i}
								className={`col-start-1 row-start-1 text-[17px] leading-relaxed text-background/90 transition-opacity duration-300 ${
									i === idx && !isTransitioning ? "opacity-100" : "opacity-0"
								}`}
							>
								"{example.after}"
							</p>
						))}
					</div>
				</div>
			</div>
			<div className="flex items-center justify-center gap-2 mt-6">
				{examples.map((_, i) => (
					<button
						key={i}
						type="button"
						onClick={() => handleSelect(i)}
						className={`h-1.5 rounded-full transition-all ${
							i === idx ? "w-8 bg-primary" : "w-4 bg-border hover:bg-primary/30"
						}`}
						aria-label={`Example ${i + 1}`}
					/>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 4. Interactive Voice Demo Playground
// ---------------------------------------------------------------------------
const VOICE_SCENARIOS: {
	label: string;
	icon: ReactNode;
	appName: string;
	words: string;
}[] = [
	{
		label: "Email",
		icon: <Mail size={18} />,
		appName: "Gmail",
		words:
			"Hi team, just a quick update on the Q3 launch. We're tracking ahead of schedule and should have the beta ready by next Wednesday. I'll send calendar invites for the review session.",
	},
	{
		label: "Code",
		icon: <Code size={18} />,
		appName: "VS Code",
		words:
			"This function validates the user session token against the Redis store. If expired, it triggers a refresh flow and returns the new token. Throws AuthError on invalid signatures.",
	},
	{
		label: "Medical",
		icon: <Stethoscope size={18} />,
		appName: "Epic",
		words:
			"Patient is a 54-year-old male presenting with chest tightness and shortness of breath on exertion. No prior cardiac history. Recommend stress echocardiogram and lipid panel.",
	},
	{
		label: "Slack",
		icon: <MessageSquare size={18} />,
		appName: "Slack",
		words:
			"Hey, the deploy pipeline is green. I merged the hotfix for the auth redirect bug. Can someone from the frontend team verify on staging before we push to prod?",
	},
];

function VoiceDemoPlayground() {
	const [activeTab, setActiveTab] = useState(0);
	const [visibleWords, setVisibleWords] = useState(0);
	const scenario = VOICE_SCENARIOS[activeTab];
	const wordsArr = scenario.words.split(" ");

	useEffect(() => {
		setVisibleWords(0);
	}, [activeTab]);

	useEffect(() => {
		if (visibleWords >= wordsArr.length) return;
		const t = setTimeout(
			() => setVisibleWords((v) => v + 1),
			60 + Math.random() * 40,
		);
		return () => clearTimeout(t);
	}, [visibleWords, wordsArr.length]);

	// Animated waveform bars
	const waveformBars = Array.from({ length: 32 }, (_, i) => i);

	return (
		<div className="max-w-3xl mx-auto">
			{/* Tab buttons */}
			<div className="flex sm:justify-center mb-6 max-w-full overflow-x-auto [scrollbar-width:none]">
				<div className="inline-flex shrink-0 gap-1 p-1 rounded-full bg-card/80 border border-border/70 shadow-[0_1px_2px_rgba(27,46,27,0.04)] backdrop-blur-sm">
					{VOICE_SCENARIOS.map((s, i) => (
						<button
							key={i}
							type="button"
							onClick={() => setActiveTab(i)}
							className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
								i === activeTab
									? "bg-foreground text-background shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<span>{s.icon}</span>
							{s.label}
						</button>
					))}
				</div>
			</div>

			{/* Demo card */}
			<div className="surface overflow-hidden">
				{/* App context bar */}
				<div className="flex items-center gap-2 px-6 py-3.5 border-b border-border/70">
					<span className="text-muted-foreground">{scenario.icon}</span>
					<span className="text-sm font-medium text-muted-foreground">
						Dictating into {scenario.appName}
					</span>
				</div>

				{/* Waveform */}
				<div className="px-6 pt-5">
					<div className="flex items-center gap-[2px] h-8">
						{waveformBars.map((i) => {
							const isActive = visibleWords < wordsArr.length;
							return (
								<div
									key={i}
									className={`flex-1 rounded-full transition-all ${
										isActive
											? "bg-primary/50 animate-soundwave"
											: "bg-primary/15"
									}`}
									style={{
										height: isActive
											? `${12 + Math.sin(i * 0.8) * 16}px`
											: "4px",
										animationDelay: `${i * 0.06}s`,
										animationDuration: `${0.7 + (i % 5) * 0.15}s`,
									}}
								/>
							);
						})}
					</div>
				</div>

				{/* Word-by-word text */}
				<div className="p-6">
					<p className="text-[17px] leading-relaxed text-foreground min-h-[84px]">
						{wordsArr.map((word, i) => (
							<span
								key={`${activeTab}-${i}`}
								className={`inline-block mr-[0.3em] transition-all duration-200 ${
									i < visibleWords
										? "opacity-100 translate-y-0"
										: "opacity-0 translate-y-1"
								} ${i === visibleWords - 1 ? "text-primary font-medium" : ""}`}
							>
								{word}
							</span>
						))}
					</p>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 5. Dual Mode Spotlight (major section)
// ---------------------------------------------------------------------------
function DualModeSpotlight() {
	const steps: { icon: ReactNode; label: string }[] = [
		{ icon: <Mic size={20} className="text-primary" />, label: "Mic" },
		{
			icon: <Laptop size={20} className="text-foreground/70" />,
			label: "Your Mac",
		},
		{
			icon: <Zap size={20} className="text-amber-500" />,
			label: "Transcribe",
		},
		{ icon: <Bot size={20} className="text-violet-500" />, label: "Cleanup" },
		{
			icon: <Clipboard size={20} className="text-foreground/70" />,
			label: "Clipboard",
		},
	];

	const stats = [
		{ value: "Snappy", label: "time to paste" },
		{ value: "0 bytes", label: "data sent" },
		{ value: "Free", label: "for life" },
	];

	const features = [
		"Fast, accurate first-pass dictation",
		"Audio never leaves your device",
		"No account, no sign-in",
		"Works fully offline",
		"Custom vocabulary & AI cleanup",
		"Dictation history",
	];

	return (
		<div>
			{/* Data flow diagram */}
			<div className="surface relative p-6 md:p-8 mb-4">
				<div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full">
					<Lock size={11} className="text-primary" />
					<span className="text-[10px] font-bold text-primary uppercase tracking-wider">
						On device
					</span>
				</div>

				<div className="flex items-center justify-between gap-2 overflow-x-auto py-4">
					{steps.map((step, i) => (
						<div key={`local-${i}`} className="contents">
							<div className="flex flex-col items-center gap-1.5 shrink-0">
								<div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center">
									{step.icon}
								</div>
								<span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
									{step.label}
								</span>
							</div>
							{i < steps.length - 1 && (
								<svg
									width="32"
									height="12"
									className="shrink-0 mx-1"
									viewBox="0 0 32 12"
								>
									<line
										x1="0"
										y1="6"
										x2="24"
										y2="6"
										stroke="#7cb342"
										strokeWidth="2"
										strokeDasharray="4 3"
										className="animate-flow-line"
									/>
									<polygon points="24,2 32,6 24,10" fill="#7cb342" />
								</svg>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
				{stats.map((s, i) => (
					<div
						key={`local-stat-${i}`}
						className="surface text-center px-2 py-4 md:p-6"
					>
						<p className="text-xl sm:text-2xl md:text-4xl font-black text-foreground tracking-[-0.03em]">
							{s.value}
						</p>
						<p className="text-sm text-muted-foreground mt-1">{s.label}</p>
					</div>
				))}
			</div>

			{/* Feature list */}
			<ul className="surface m-0 grid list-none gap-x-8 gap-y-4 p-6 md:p-8 sm:grid-cols-2">
				{features.map((label) => (
					<li key={label} className="flex items-center gap-3">
						<span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
							<Check size={14} strokeWidth={2.5} />
						</span>
						<span className="text-sm text-foreground">{label}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Feature deep-dive row (kept as-is)
// ---------------------------------------------------------------------------
function FeatureRow({
	title,
	body,
	visual,
	flipped,
}: {
	title: string;
	body: string;
	visual: React.ReactNode;
	flipped?: boolean;
}) {
	return (
		<div
			className={`flex flex-col ${
				flipped ? "md:flex-row-reverse" : "md:flex-row"
			} items-center gap-8 md:gap-14`}
		>
			<div className="flex-1 min-w-0">
				<h3 className="text-2xl md:text-[28px] font-bold text-foreground tracking-tight mb-3 leading-tight">
					{title}
				</h3>
				<p className="text-muted-foreground leading-relaxed text-[15px]">
					{body}
				</p>
			</div>
			<div className="flex-1 min-w-0 w-full">{visual}</div>
		</div>
	);
}

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
				className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border/70 rounded-full text-sm text-foreground/80 font-medium shrink-0 shadow-[0_1px_2px_rgba(27,46,27,0.04)]"
			>
				<span className="text-muted-foreground">{app.icon}</span>
				{app.label}
			</span>
		));

	return (
		<div className="space-y-3 overflow-hidden fade-x">
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
// 9. Use-Case Tabs
// ---------------------------------------------------------------------------
const USE_CASE_TABS = [
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
];

function UseCaseTabs() {
	const [activeTab, setActiveTab] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);

	const handleTabChange = (i: number) => {
		if (i === activeTab) return;
		setIsTransitioning(true);
		setTimeout(() => {
			setActiveTab(i);
			setIsTransitioning(false);
		}, 200);
	};

	return (
		<div>
			{/* Tab bar */}
			<div className="flex mb-6 max-w-full overflow-x-auto [scrollbar-width:none]">
				<div className="inline-flex shrink-0 gap-1 p-1 rounded-full bg-card/80 border border-border/70 shadow-[0_1px_2px_rgba(27,46,27,0.04)] backdrop-blur-sm">
					{USE_CASE_TABS.map((t, i) => (
						<button
							key={i}
							type="button"
							onClick={() => handleTabChange(i)}
							className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
								i === activeTab
									? "bg-foreground text-background shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{t.label}
						</button>
					))}
				</div>
			</div>

			{/* Panel */}
			<div className="surface p-6 md:p-8">
				{/* Mini before/after */}
				<div className="grid md:grid-cols-2 gap-4 mb-6">
					<div className="bg-muted/50 rounded-2xl p-5">
						<p className="text-xs font-medium text-muted-foreground mb-2">
							You say
						</p>
						<div className="grid">
							{USE_CASE_TABS.map((tab, i) => (
								<p
									key={i}
									className={`col-start-1 row-start-1 text-sm text-foreground/60 italic leading-relaxed transition-opacity duration-300 ${
										i === activeTab && !isTransitioning
											? "opacity-100"
											: "opacity-0"
									}`}
								>
									"{tab.before}"
								</p>
							))}
						</div>
					</div>
					<div className="bg-primary/8 rounded-2xl p-5">
						<p className="text-xs font-medium text-primary mb-2">
							Parrot writes
						</p>
						<div className="grid">
							{USE_CASE_TABS.map((tab, i) => (
								<p
									key={i}
									className={`col-start-1 row-start-1 text-sm text-foreground leading-relaxed transition-opacity duration-300 ${
										i === activeTab && !isTransitioning
											? "opacity-100"
											: "opacity-0"
									}`}
								>
									"{tab.after}"
								</p>
							))}
						</div>
					</div>
				</div>

				{/* Benefits */}
				<div className="grid">
					{USE_CASE_TABS.map((tab, tabIndex) => (
						<ul
							key={tabIndex}
							className={`col-start-1 row-start-1 space-y-2.5 transition-opacity duration-300 ${
								tabIndex === activeTab && !isTransitioning
									? "opacity-100"
									: "opacity-0"
							}`}
						>
							{tab.benefits.map((b, i) => (
								<li
									key={i}
									className="flex items-start gap-2.5 text-sm text-muted-foreground"
								>
									<Check size={15} className="text-primary mt-0.5 shrink-0" />
									{b}
								</li>
							))}
						</ul>
					))}
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// 12. Competitor Comparison Table
// ---------------------------------------------------------------------------
function ComparisonTable() {
	const rows: {
		feature: string;
		parrot: boolean | "partial" | "soon";
		wispr: boolean | "partial" | "soon";
		macos: boolean | "partial" | "soon";
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

	const renderCell = (val: boolean | "partial" | "soon") => {
		if (val === true)
			return <Check size={16} className="text-primary mx-auto" />;
		if (val === false)
			return <XIcon size={16} className="text-red-400/60 mx-auto" />;
		if (val === "partial")
			return <Minus size={16} className="text-amber-400 mx-auto" />;
		if (val === "soon")
			return (
				<span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-primary/15 text-primary">
					Soon
				</span>
			);
		return null;
	};

	return (
		<div className="surface overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border/70">
						<th className="text-left py-4 px-6 text-muted-foreground font-medium">
							Feature
						</th>
						<th className="text-center py-4 px-4 font-bold text-primary bg-primary/6">
							Parrot
						</th>
						<th className="text-center py-4 px-4 text-muted-foreground font-medium">
							Wispr Flow
						</th>
						<th className="text-center py-4 px-4 text-muted-foreground font-medium">
							macOS Dictation
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => (
						<tr key={i} className="border-b border-border/70 last:border-b-0">
							<td className="py-3.5 px-6 text-foreground">{row.feature}</td>
							<td className="py-3.5 px-4 text-center bg-primary/6">
								{renderCell(row.parrot)}
							</td>
							<td className="py-3.5 px-4 text-center">
								{renderCell(row.wispr)}
							</td>
							<td className="py-3.5 px-4 text-center">
								{renderCell(row.macos)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
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
// Every section shares the same vertical rhythm and content width.
const SECTION = "px-6 py-24 md:py-32";
const WRAP = "max-w-5xl mx-auto";

const PHRASES = [
	"Send the quarterly report to the team by Friday.",
	"Dear Dr. Patel, thank you for the referral.",
	"Schedule a follow-up with the client next Tuesday.",
	"The defendant's counsel filed a motion to dismiss.",
	"Remind me to buy oat milk and sourdough.",
	"Let's reschedule the standup to 3pm.",
	"Patient presents with elevated BP, recommend full metabolic panel.",
	"Can you review the PR and merge when ready?",
];

const SMALL_FEATURES: { icon: ReactNode; title: string; desc: string }[] = [
	{
		icon: <Keyboard size={18} />,
		title: "Global hotkey",
		desc: "Press fn from anywhere. Customizable in settings.",
	},
	{
		icon: <ClipboardPaste size={18} />,
		title: "Auto-paste",
		desc: "Text lands at your cursor the moment you're done speaking.",
	},
	{
		icon: <Zap size={18} />,
		title: "Fast & accurate",
		desc: "Snappy time-to-text with strong first-pass accuracy on names and jargon.",
	},
	{
		icon: <Eye size={18} />,
		title: "Live preview",
		desc: "Watch your words form in the HUD while you hold the hotkey.",
	},
	{
		icon: <Gift size={18} />,
		title: "Free, for life",
		desc: "No subscription, no word caps, no trial that expires.",
	},
	{
		icon: <WifiOff size={18} />,
		title: "Fully offline",
		desc: "After one download, dictate without internet — or an account.",
	},
];

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
		blurb: "Local Mac dictation with cleanup — without a Pro plan.",
	},
	{
		href: "/blog/free-voice-dictation-apps-2026",
		tag: "Guide",
		title: "Free voice dictation apps in 2026",
		blurb: "What “free” really means: caps, trials, and free forever.",
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

function HomePage() {
	return (
		<div className="min-h-screen">
			<section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
				<div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_1fr] gap-12 md:gap-16 items-center">
					{/* Left - copy */}
					<div>
						<div className="inline-flex items-center gap-2 px-3 py-1 bg-card/80 border border-primary/20 rounded-full mb-6 shadow-[0_1px_2px_rgba(27,46,27,0.04)] backdrop-blur-sm">
							<div className="w-1.5 h-1.5 rounded-full bg-primary" />
							<span className="text-xs font-semibold text-primary tracking-wide">
								macOS &middot; Free for life &middot; Faster &amp; sharper
							</span>
						</div>

						<h1 className="text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-black text-foreground tracking-[-0.03em] leading-[1.04] mb-6">
							Voice dictation for Mac.
							<br />
							<span className="text-primary">Local-first. Free.</span>
						</h1>

						<p className="text-lg text-muted-foreground leading-relaxed max-w-md mb-8">
							{PARROT_FACTS.entity} Unlike Wispr Flow ({wispr.pricing.theirPaid}
							) and Superwhisper ({superwhisper.pricing.theirPaid}), Parrot is{" "}
							{PARROT_FACTS.price}, runs transcription fully on-device, and
							pastes into any Mac app via a global hotkey. Custom vocabulary, AI
							cleanup, full history.
						</p>

						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
							<Link
								to="/download"
								className="group inline-flex items-center gap-2 pl-5 pr-6 h-12 bg-foreground text-background font-semibold rounded-full hover:bg-foreground/90 transition-[background-color,transform] active:scale-[0.98] no-underline shadow-[0_8px_24px_-8px_rgba(27,46,27,0.45)]"
							>
								<Download size={18} strokeWidth={2.5} />
								Download for Mac
								<ArrowRight
									size={16}
									strokeWidth={2.5}
									className="transition-transform group-hover:translate-x-0.5"
								/>
							</Link>
							<span className="flex items-center gap-2 text-xs text-muted-foreground">
								<kbd className="px-2 py-1 bg-card border border-border rounded-md text-[11px] font-bold text-foreground/70 shadow-[0_1px_0_0] shadow-border">
									fn
								</kbd>
								to start dictating &middot; Apple Silicon
							</span>
						</div>
					</div>

					{/* Right - typing race */}
					<div className="max-w-md md:max-w-none mx-auto w-full">
						<DictationDemo />
					</div>
				</div>
			</section>

			<div className="py-4 overflow-hidden fade-x">
				<div className="flex w-max animate-marquee">
					{[0, 1].map((setIndex) => (
						<div key={setIndex} className="flex gap-3 pr-3">
							{PHRASES.map((phrase) => (
								<span
									key={`${setIndex}-${phrase}`}
									className="px-3.5 py-1.5 rounded-full border border-border/70 bg-card/60 text-[13px] text-muted-foreground font-mono whitespace-nowrap"
								>
									{phrase}
								</span>
							))}
						</div>
					))}
				</div>
			</div>

			<section id="demo" className={SECTION}>
				<div className={WRAP}>
					<SectionHeading
						title="AI cleanup for voice dictation"
						lede="The optional cleanup pass removes filler words, fixes grammar, and applies your writing style. Here's what that looks like."
					/>
					<BeforeAfter />
				</div>
			</section>

			<section className={SECTION}>
				<div className={WRAP}>
					<SectionHeading
						align="center"
						title="Dictate into any app"
						lede="Parrot works wherever your cursor is. Watch it transcribe for different workflows."
					/>
					<VoiceDemoPlayground />
				</div>
			</section>

			<section className={SECTION}>
				<div className={WRAP}>
					<SectionHeading
						title="Fast. Private. Free for life."
						lede="Transcription and cleanup run entirely on-device. Nothing leaves your Mac — and you never pay a subscription to keep dictating."
					/>
					<DualModeSpotlight />
				</div>
			</section>

			<section className={SECTION}>
				<div className={WRAP}>
					<SectionHeading
						title="Voice dictation features that work for you"
						lede="Faster dictation, sharper accuracy, and the polish you actually use every day."
					/>
					<div className="space-y-20 md:space-y-28">
						<FeatureRow
							title="Custom vocabulary that actually remembers"
							body="Add names, acronyms, brand terms, and jargon. Parrot learns the words that matter so 'Kubernetes' doesn't become 'Cooper Netties' and your coworker's name isn't butchered every time."
							visual={
								<div className="surface p-6">
									<p className="text-sm font-semibold text-foreground mb-4">
										Your vocabulary
									</p>
									<div className="flex flex-wrap gap-2">
										{[
											"Kubernetes",
											"GraphQL",
											"Supabase",
											"Dr. Nakamura",
											"Anthropic",
											"YC W24",
											"Series A",
											"OAuth2",
											"Tailwind",
											"PostgreSQL",
										].map((word) => (
											<span
												key={word}
												className="px-3 py-1.5 bg-primary/8 rounded-full text-sm text-foreground font-medium"
											>
												{word}
											</span>
										))}
									</div>
								</div>
							}
						/>

						<FeatureRow
							flipped
							title="Pick how your text sounds"
							body="Set your writing context and style. The cleanup matches your tone - whether that's terse Slack messages, formal legal prose, or casual blog posts. You write it once, Parrot applies it every time."
							visual={
								<div className="surface overflow-hidden">
									<div className="border-b border-border/70 px-6 py-3.5">
										<p className="text-sm font-semibold text-foreground">
											Writing style
										</p>
									</div>
									<div className="p-6 space-y-5">
										<div>
											<p className="text-xs font-medium text-muted-foreground mb-2">
												Context
											</p>
											<p className="text-sm text-foreground bg-muted/60 rounded-xl p-3.5">
												I'm a senior engineer writing technical docs and Slack
												messages to my team.
											</p>
										</div>
										<div>
											<p className="text-xs font-medium text-muted-foreground mb-2">
												Tone
											</p>
											<div className="inline-flex gap-1 p-1 rounded-full bg-muted/60">
												{["Concise", "Technical", "Friendly"].map((t, i) => (
													<span
														key={t}
														className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${
															i === 0
																? "bg-card text-foreground shadow-[0_1px_3px_rgba(27,46,27,0.12)]"
																: "text-muted-foreground"
														}`}
													>
														{t}
													</span>
												))}
											</div>
										</div>
									</div>
								</div>
							}
						/>

						<FeatureRow
							title="Everything searchable, nothing lost"
							body="Every dictation is saved with full text, timestamp, and audio duration. Search past transcriptions, copy them again, or review what you said last Tuesday. You can turn it off if you want to keep it private."
							visual={
								<div className="surface overflow-hidden">
									<div className="px-4 py-3 border-b border-border/70">
										<div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2">
											<Search size={14} className="text-muted-foreground" />
											<span className="text-xs text-muted-foreground">
												Search dictations...
											</span>
										</div>
									</div>
									<div className="divide-y divide-border/70">
										{[
											{
												text: "Move the meeting to Thursday - Monday doesn't work for Sarah.",
												time: "2 min ago",
												dur: "0:08",
											},
											{
												text: "Patient presents with elevated BP (~150/95). Recommend full metabolic panel.",
												time: "1 hour ago",
												dur: "0:14",
											},
											{
												text: "Can you send me the Q3 report with revenue numbers?",
												time: "Yesterday",
												dur: "0:06",
											},
										].map((entry) => (
											<div
												key={entry.text}
												className="px-6 py-3.5 hover:bg-muted/40 transition-colors"
											>
												<p className="text-sm text-foreground truncate">
													{entry.text}
												</p>
												<div className="flex items-center gap-3 mt-1">
													<span className="text-[11px] text-muted-foreground">
														{entry.time}
													</span>
													<span className="text-[11px] text-muted-foreground tabular-nums">
														{entry.dur}
													</span>
												</div>
											</div>
										))}
									</div>
								</div>
							}
						/>
					</div>
				</div>
			</section>

			<section className="px-6 py-16 md:py-20">
				<div className={WRAP}>
					<SectionHeading
						align="center"
						className="mb-10 md:mb-10"
						title="Voice dictation in any Mac app"
						lede="Parrot pastes into any app on your Mac. No plugins, no integrations."
					/>
					<AppCarousel />
				</div>
			</section>

			<section className={SECTION}>
				<div className={WRAP}>
					<SectionHeading
						title="Voice dictation for every workflow"
						lede="Whether you're drafting emails, writing patient notes, or coding documentation - Parrot adapts to how you work."
					/>
					<UseCaseTabs />
				</div>
			</section>

			<section className="px-6 pb-24 md:pb-32">
				<div className={`${WRAP} grid sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
					{SMALL_FEATURES.map((f) => (
						<div
							key={f.title}
							className="surface p-6 transition-transform duration-200 hover:-translate-y-0.5"
						>
							<div className="mb-4 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
								{f.icon}
							</div>
							<h3 className="text-[15px] font-semibold text-foreground mb-1">
								{f.title}
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{f.desc}
							</p>
						</div>
					))}
				</div>
			</section>

			<section className={SECTION}>
				<div className={WRAP}>
					<SectionHeading
						title="Parrot vs the alternatives"
						lede="Free for life, fully local, and built for the daily dictation loop — not a metered cloud trial."
					/>
					<ComparisonTable />
				</div>
			</section>

			<section className={SECTION}>
				<div
					className={`${WRAP} grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-16`}
				>
					<SectionHeading
						className="mb-0 md:mb-0"
						title="Questions"
						lede="The short answers. Anything else, just ask."
					/>
					<Accordion
						type="single"
						collapsible
						className="surface overflow-hidden px-2"
					>
						{FAQ.map((item) => (
							<AccordionItem
								key={item.q}
								value={item.q}
								className="border-b border-border/70 last:border-b-0 px-4"
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

			<section className={SECTION}>
				<div className={WRAP}>
					<SectionHeading title="Guides for free, local Mac dictation" />
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{BLOG_CARDS.map((card) => (
							<a
								key={card.href}
								href={card.href}
								className="surface group flex flex-col p-6 no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(27,46,27,0.04),0_20px_40px_-20px_rgba(27,46,27,0.25)]"
							>
								<span className="self-start rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
									{card.tag}
								</span>
								<p className="text-[15px] font-bold text-foreground mt-4 mb-2 leading-snug">
									{card.title}
								</p>
								<p className="text-sm text-muted-foreground line-clamp-2 mb-4">
									{card.blurb}
								</p>
								<span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
									Read
									<ArrowRight
										size={14}
										className="transition-transform group-hover:translate-x-0.5"
									/>
								</span>
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
		<section className="px-4 pb-16 md:px-6 md:pb-24">
			<div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-foreground px-6 py-20 md:py-28">
				{/* Soft lime glow behind the heading */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[min(720px,90%)] -translate-x-1/2 rounded-full bg-primary/30 blur-[100px]"
				/>
				<div className="relative max-w-2xl mx-auto text-center">
					<h2 className="text-4xl md:text-5xl font-black text-background tracking-[-0.03em] leading-[1.05] mb-5">
						Start dictating. Stop typing.
					</h2>
					<p className="text-background/60 mb-10 text-[17px]">
						{PARROT_FACTS.price}. Fully on-device on Apple Silicon. Download for
						Mac and start dictating in minutes.
					</p>

					<Link
						to="/download"
						className="group inline-flex items-center gap-2 pl-5 pr-6 h-12 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-[background-color,transform] active:scale-[0.98] no-underline shadow-[0_8px_32px_-8px_rgba(124,179,66,0.6)]"
					>
						<Download size={18} strokeWidth={2.5} />
						Download for Mac
						<ArrowRight
							size={16}
							strokeWidth={2.5}
							className="transition-transform group-hover:translate-x-0.5"
						/>
					</Link>

					<p className="text-background/40 text-xs mt-10">
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
			</div>
		</section>
	);
}
