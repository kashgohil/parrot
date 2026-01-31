import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import Footer from "@/components/Footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Blocks,
	Bot,
	Braces,
	BriefcaseBusiness,
	Calendar,
	Check,
	ChevronDown,
	Chrome,
	Clipboard,
	Cloud,
	Code,
	Command,
	Compass,
	FileText,
	FolderOpen,
	Globe,
	Hash,
	Headphones,
	Heart,
	Image,
	Keyboard,
	Laptop,
	Link2,
	Lock,
	Mail,
	MessageCircle,
	MessageSquare,
	Mic,
	Minus,
	Monitor,
	Music,
	Notebook,
	Package,
	Paintbrush,
	PenLine,
	Quote,
	Ruler,
	Search,
	Send,
	Shield,
	Smartphone,
	Stethoscope,
	StickyNote,
	Table2,
	Terminal,
	TriangleAlert,
	X as XIcon,
	Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
	component: HomePage,
	head: () => ({
		meta: [
			{ title: "Parrot — Voice dictation that just works" },
			{
				name: "description",
				content:
					"Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.",
			},
			{ property: "og:title", content: "Parrot — Voice dictation that just works" },
			{
				property: "og:description",
				content:
					"Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.",
			},
			{ property: "og:url", content: "https://tryparrot.app/" },
			{ name: "twitter:title", content: "Parrot — Voice dictation that just works" },
			{
				name: "twitter:description",
				content:
					"Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "SoftwareApplication",
					name: "Parrot",
					operatingSystem: "macOS",
					applicationCategory: "UtilitiesApplication",
					offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
					description:
						"Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.",
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
							name: "Is it actually free?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Yes. Parrot costs nothing. If you use cloud transcription, you bring your own API key and pay the provider (Whisper charges ~$0.006/min). Local mode is completely free with no strings attached.",
							},
						},
						{
							"@type": "Question",
							name: "What's local mode?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Whisper.cpp runs on your Mac for transcription, Ollama handles AI cleanup. Everything happens on-device. You download models once (~4GB), then no internet needed.",
							},
						},
						{
							"@type": "Question",
							name: "Which providers work?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Cloud: OpenAI Whisper, Deepgram, ElevenLabs. Local: Whisper.cpp. For AI cleanup: GPT-4o-mini (cloud) or Ollama (local). Switch anytime in settings.",
							},
						},
						{
							"@type": "Question",
							name: "Works offline?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Local mode, yes — fully offline once models are downloaded. Cloud mode needs internet.",
							},
						},
						{
							"@type": "Question",
							name: "How does the AI cleanup work?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "After transcription, an LLM pass fixes grammar, removes filler words (um, uh, like), and applies your custom vocabulary and writing style. It's optional and you can toggle it per-dictation.",
							},
						},
						{
							"@type": "Question",
							name: "What about my privacy?",
							acceptedAnswer: {
								"@type": "Answer",
								text: "Local mode: nothing leaves your Mac. Cloud mode: audio goes directly to your chosen provider with your API key. Parrot never stores your audio or text on any server.",
							},
						},
					],
				}),
			},
		],
	}),
});

// ---------------------------------------------------------------------------
// Hook: IntersectionObserver trigger
// ---------------------------------------------------------------------------
function useInView(options?: IntersectionObserverInit) {
	const ref = useRef<HTMLDivElement>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					obs.disconnect();
				}
			},
			{ threshold: 0.2, ...options },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, []);
	return { ref, inView };
}

// ---------------------------------------------------------------------------
// 1. Hero: Live Typing Race
// ---------------------------------------------------------------------------
const RACE_SENTENCES = [
	"Send the quarterly report to the team by Friday.",
	"Dear Dr. Patel, thank you for the referral.",
	"The defendant's counsel filed a motion to dismiss.",
	"Let's reschedule the standup to 3pm.",
	"Remind me to buy oat milk and sourdough.",
];

function TypingRace() {
	const [sentenceIdx, setSentenceIdx] = useState(0);
	const [keyboardPos, setKeyboardPos] = useState(0);
	const [voicePos, setVoicePos] = useState(0);
	const [phase, setPhase] = useState<"racing" | "paused">("racing");
	const sentence = RACE_SENTENCES[sentenceIdx];

	useEffect(() => {
		if (phase !== "racing") return;
		const len = sentence.length;

		// Keyboard: ~45 wpm ≈ 1 char every ~65ms
		const kbInterval = setInterval(() => {
			setKeyboardPos((p) => {
				if (p >= len) return p;
				return p + 1;
			});
		}, 65);

		// Voice: ~180 wpm ≈ 1 char every ~17ms
		const voiceInterval = setInterval(() => {
			setVoicePos((p) => {
				if (p >= len) return p;
				return p + 1;
			});
		}, 17);

		return () => {
			clearInterval(kbInterval);
			clearInterval(voiceInterval);
		};
	}, [phase, sentence]);

	// When voice finishes, pause then reset
	useEffect(() => {
		if (voicePos >= sentence.length && phase === "racing") {
			setPhase("paused");
			const t = setTimeout(() => {
				setSentenceIdx((i) => (i + 1) % RACE_SENTENCES.length);
				setKeyboardPos(0);
				setVoicePos(0);
				setPhase("racing");
			}, 2000);
			return () => clearTimeout(t);
		}
	}, [voicePos, sentence.length, phase]);

	return (
		<div className="bg-[#1a1f2b] rounded-xl border border-white/[0.08] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden">
			{/* Title bar */}
			<div className="flex items-center gap-2 px-4 py-3 bg-[#1e2433] border-b border-white/[0.06]">
				<div className="flex gap-[7px]">
					<div className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
					<div className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
					<div className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
				</div>
				<div className="flex-1 text-center">
					<span className="text-[11px] text-white/30 font-medium">Speed comparison</span>
				</div>
				<div className="w-[52px]" />
			</div>
			{/* Lanes */}
			<div className="p-5 space-y-4">
				{/* Keyboard lane */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<Keyboard size={14} className="text-white/40" />
						<span className="text-[11px] text-white/40 font-medium uppercase tracking-wider">
							Typing · ~45 wpm
						</span>
					</div>
					<div className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06] min-h-[48px]">
						<p className="text-white/60 text-[13px] leading-relaxed font-mono">
							{sentence.slice(0, keyboardPos)}
							<span className="inline-block w-[2px] h-[1.1em] bg-white/30 ml-px align-text-bottom animate-blink-caret border-r-2 border-white/30" />
						</p>
					</div>
				</div>
				{/* Voice lane */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<Mic size={14} className="text-primary" />
						<span className="text-[11px] text-primary font-medium uppercase tracking-wider">
							Parrot · ~180 wpm
						</span>
						{voicePos >= sentence.length && (
							<span className="text-[10px] text-primary bg-primary/20 px-2 py-0.5 rounded-full font-bold">
								3.9x faster
							</span>
						)}
					</div>
					<div className="bg-primary/[0.06] rounded-lg p-3 border border-primary/20 min-h-[48px]">
						<p className="text-white/90 text-[13px] leading-relaxed font-mono">
							{sentence.slice(0, voicePos)}
							{voicePos < sentence.length && (
								<span className="inline-block w-[2px] h-[1.1em] bg-primary/70 ml-px align-text-bottom animate-blink-caret border-r-2 border-primary/70" />
							)}
						</p>
					</div>
				</div>
				{/* Progress bars */}
				<div className="flex gap-3">
					<div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
						<div
							className="h-full bg-white/20 rounded-full transition-all duration-100"
							style={{ width: `${(keyboardPos / sentence.length) * 100}%` }}
						/>
					</div>
					<div className="flex-1 h-1 bg-primary/10 rounded-full overflow-hidden">
						<div
							className="h-full bg-primary/60 rounded-full transition-all duration-100"
							style={{ width: `${(voicePos / sentence.length) * 100}%` }}
						/>
					</div>
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
				"Let's move the meeting to Thursday — Monday doesn't work for Sarah, and John can't make it either.",
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
	const ex = examples[idx];

	return (
		<div className="max-w-4xl mx-auto">
			<div className="grid md:grid-cols-2 gap-4 md:gap-0">
				<div className="bg-card rounded-2xl md:rounded-r-none border border-border p-6 md:p-7">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-2 h-2 rounded-full bg-amber-400" />
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							What you said
						</span>
					</div>
					<p className="text-[15px] leading-relaxed text-foreground/70 italic">
						"{ex.before}"
					</p>
				</div>
				<div className="bg-foreground rounded-2xl md:rounded-l-none border border-foreground p-6 md:p-7">
					<div className="flex items-center gap-2 mb-4">
						<div className="w-2 h-2 rounded-full bg-primary" />
						<span className="text-xs font-semibold uppercase tracking-wider text-background/50">
							What Parrot writes
						</span>
					</div>
					<p className="text-[15px] leading-relaxed text-background/90">
						"{ex.after}"
					</p>
				</div>
			</div>
			<div className="flex items-center justify-center gap-2 mt-5">
				{examples.map((_, i) => (
					<button
						key={i}
						type="button"
						onClick={() => setIdx(i)}
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
const VOICE_SCENARIOS: { label: string; icon: ReactNode; appName: string; words: string }[] = [
	{
		label: "Email",
		icon: <Mail size={18} />,
		appName: "Gmail",
		words: "Hi team, just a quick update on the Q3 launch. We're tracking ahead of schedule and should have the beta ready by next Wednesday. I'll send calendar invites for the review session.",
	},
	{
		label: "Code",
		icon: <Code size={18} />,
		appName: "VS Code",
		words: "This function validates the user session token against the Redis store. If expired, it triggers a refresh flow and returns the new token. Throws AuthError on invalid signatures.",
	},
	{
		label: "Medical",
		icon: <Stethoscope size={18} />,
		appName: "Epic",
		words: "Patient is a 54-year-old male presenting with chest tightness and shortness of breath on exertion. No prior cardiac history. Recommend stress echocardiogram and lipid panel.",
	},
	{
		label: "Slack",
		icon: <MessageSquare size={18} />,
		appName: "Slack",
		words: "Hey, the deploy pipeline is green. I merged the hotfix for the auth redirect bug. Can someone from the frontend team verify on staging before we push to prod?",
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
			<div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
				{VOICE_SCENARIOS.map((s, i) => (
					<button
						key={i}
						type="button"
						onClick={() => setActiveTab(i)}
						className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
							i === activeTab
								? "bg-foreground text-background shadow-sm"
								: "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
						}`}
					>
						<span>{s.icon}</span>
						{s.label}
					</button>
				))}
			</div>

			{/* Demo card */}
			<div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
				{/* App context bar */}
				<div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
					<span className="text-muted-foreground">{scenario.icon}</span>
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Dictating into {scenario.appName}
					</span>
				</div>

				{/* Waveform */}
				<div className="px-5 pt-4">
					<div className="flex items-center gap-[2px] h-8">
						{waveformBars.map((i) => {
							const isActive = visibleWords < wordsArr.length;
							return (
								<div
									key={i}
									className={`flex-1 rounded-full transition-all ${
										isActive ? "bg-primary/50 animate-soundwave" : "bg-primary/15"
									}`}
									style={{
										height: isActive ? `${12 + Math.sin(i * 0.8) * 16}px` : "4px",
										animationDelay: `${i * 0.06}s`,
										animationDuration: `${0.7 + (i % 5) * 0.15}s`,
									}}
								/>
							);
						})}
					</div>
				</div>

				{/* Word-by-word text */}
				<div className="p-5">
					<p className="text-[15px] leading-relaxed text-foreground min-h-[80px]">
						{wordsArr.map((word, i) => (
							<span
								key={`${activeTab}-${i}`}
								className={`inline-block mr-[0.3em] transition-all duration-200 ${
									i < visibleWords
										? "opacity-100 translate-y-0"
										: "opacity-0 translate-y-1"
								} ${
									i === visibleWords - 1
										? "text-primary font-medium"
										: ""
								}`}
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
	const [mode, setMode] = useState<"local" | "cloud">("local");

	const localSteps: { icon: ReactNode; label: string }[] = [
		{ icon: <Mic size={20} className="text-primary" />, label: "Mic" },
		{ icon: <Laptop size={20} className="text-foreground/70" />, label: "Your Mac" },
		{ icon: <Zap size={20} className="text-amber-500" />, label: "Whisper.cpp" },
		{ icon: <Bot size={20} className="text-violet-500" />, label: "Ollama" },
		{ icon: <Clipboard size={20} className="text-foreground/70" />, label: "Clipboard" },
	];
	const cloudSteps: { icon: ReactNode; label: string }[] = [
		{ icon: <Mic size={20} className="text-primary" />, label: "Mic" },
		{ icon: <Lock size={20} className="text-sky-500" />, label: "Encrypted" },
		{ icon: <Cloud size={20} className="text-sky-500" />, label: "Cloud API" },
		{ icon: <Laptop size={20} className="text-foreground/70" />, label: "Your Mac" },
		{ icon: <Clipboard size={20} className="text-foreground/70" />, label: "Clipboard" },
	];

	const steps = mode === "local" ? localSteps : cloudSteps;

	const localStats = [
		{ value: "0 bytes", label: "data sent" },
		{ value: "Free", label: "forever" },
		{ value: "100%", label: "offline" },
	];
	const cloudStats = [
		{ value: "E2E", label: "encrypted" },
		{ value: "$0.006", label: "per minute" },
		{ value: "<500ms", label: "latency" },
	];
	const stats = mode === "local" ? localStats : cloudStats;

	const features = [
		{ label: "Audio never leaves device", local: true, cloud: false },
		{ label: "No API keys needed", local: true, cloud: false },
		{ label: "Works offline", local: true, cloud: false },
		{ label: "Fastest transcription speed", local: false, cloud: true },
		{ label: "No model downloads", local: false, cloud: true },
		{ label: "Custom vocabulary", local: true, cloud: true },
		{ label: "AI cleanup", local: true, cloud: true },
		{ label: "Dictation history", local: true, cloud: true },
	];

	return (
		<div className="max-w-4xl mx-auto">
			{/* Toggle */}
			<div className="flex items-center justify-center gap-4 mb-10">
				<button
					type="button"
					onClick={() => setMode("local")}
					className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
						mode === "local"
							? "bg-foreground text-background shadow-md"
							: "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
					}`}
				>
					<Monitor size={16} />
					Local
				</button>
				<div className="w-px h-6 bg-border" />
				<button
					type="button"
					onClick={() => setMode("cloud")}
					className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
						mode === "cloud"
							? "bg-foreground text-background shadow-md"
							: "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
					}`}
				>
					<Cloud size={16} />
					Cloud
				</button>
			</div>

			{/* Data flow diagram */}
			<div className={`relative rounded-2xl border-2 p-6 md:p-8 mb-8 transition-colors duration-300 ${
				mode === "local"
					? "border-primary/30 bg-primary/[0.03]"
					: "border-sky-300/30 bg-sky-50/30"
			}`}>
				{mode === "local" && (
					<div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full">
						<Lock size={11} className="text-primary" />
						<span className="text-[10px] font-bold text-primary uppercase tracking-wider">On device</span>
					</div>
				)}
				{mode === "cloud" && (
					<div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 rounded-full">
						<Shield size={11} className="text-sky-600" />
						<span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Encrypted</span>
					</div>
				)}

				<div className="flex items-center justify-between gap-2 overflow-x-auto py-4">
					{steps.map((step, i) => (
						<div key={`${mode}-${i}`} className="flex items-center gap-2 shrink-0">
							<div className="flex flex-col items-center gap-1.5">
								<div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
									{step.icon}
								</div>
								<span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
									{step.label}
								</span>
							</div>
							{i < steps.length - 1 && (
								<svg width="32" height="12" className="shrink-0 mx-1" viewBox="0 0 32 12">
									<line
										x1="0" y1="6" x2="24" y2="6"
										stroke={mode === "local" ? "#7cb342" : "#38bdf8"}
										strokeWidth="2"
										strokeDasharray="4 3"
										className="animate-flow-line"
									/>
									<polygon
										points="24,2 32,6 24,10"
										fill={mode === "local" ? "#7cb342" : "#38bdf8"}
									/>
								</svg>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-3 gap-4 mb-8">
				{stats.map((s, i) => (
					<div key={`${mode}-${i}`} className="text-center bg-card rounded-xl border border-border p-4">
						<p className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
							{s.value}
						</p>
						<p className="text-xs text-muted-foreground mt-1">{s.label}</p>
					</div>
				))}
			</div>

			{/* Feature comparison */}
			<div className="bg-card rounded-2xl border border-border overflow-hidden">
				{features.map((f, i) => {
					const active = mode === "local" ? f.local : f.cloud;
					return (
						<div
							key={i}
							className={`flex items-center justify-between px-5 py-3 transition-colors ${
								i > 0 ? "border-t border-border" : ""
							} ${active ? "" : "opacity-40"}`}
						>
							<span className="text-sm text-foreground">{f.label}</span>
							{active ? (
								<Check size={16} className="text-primary" />
							) : (
								<Minus size={16} className="text-muted-foreground" />
							)}
						</div>
					);
				})}
			</div>

			{/* Badge */}
			<div className="flex justify-center mt-8">
				<div className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-full animate-glow-badge">
					<Zap size={14} className="text-primary" />
					<span className="text-sm font-bold text-primary">
						Only Parrot offers both local and cloud
					</span>
				</div>
			</div>
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
// 7. Animated Stats
// ---------------------------------------------------------------------------
function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
	const { ref, inView } = useInView();
	const [value, setValue] = useState(0);

	useEffect(() => {
		if (!inView) return;
		const duration = 1500;
		const steps = 60;
		const increment = target / steps;
		let current = 0;
		const interval = setInterval(() => {
			current += increment;
			if (current >= target) {
				setValue(target);
				clearInterval(interval);
			} else {
				setValue(Math.floor(current));
			}
		}, duration / steps);
		return () => clearInterval(interval);
	}, [inView, target]);

	return (
		<div ref={ref} className="text-center">
			<p className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
				{prefix}{inView ? value : 0}{suffix}
			</p>
		</div>
	);
}

function LiveWordCounter() {
	const [count, setCount] = useState(847293);
	useEffect(() => {
		const interval = setInterval(() => {
			setCount((c) => c + Math.floor(Math.random() * 3) + 1);
		}, 200);
		return () => clearInterval(interval);
	}, []);
	return (
		<div className="text-center">
			<p className="text-4xl md:text-5xl font-black text-foreground tracking-tight tabular-nums">
				{count.toLocaleString()}
			</p>
			<p className="text-sm text-muted-foreground mt-1">words dictated</p>
		</div>
	);
}

function AnimatedStats() {
	const { ref, inView } = useInView();
	return (
		<div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
			<div>
				<AnimatedCounter target={3} suffix="x" />
				<p className="text-sm text-muted-foreground mt-1 text-center">faster than typing</p>
			</div>
			<div className="text-center">
				<p className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
					{"<"}1s
				</p>
				<p className="text-sm text-muted-foreground mt-1">to start recording</p>
			</div>
			<div className="text-center">
				<p className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
					<span className={`inline-block transition-all duration-700 ${inView ? "scale-110" : "scale-100"}`}>
						0
					</span>
				</p>
				<p className="text-sm text-muted-foreground mt-1">data on our servers</p>
			</div>
			<LiveWordCounter />
		</div>
	);
}

// ---------------------------------------------------------------------------
// 8. App Compatibility Carousel
// ---------------------------------------------------------------------------
const APP_ICONS_ROW1: { icon: ReactNode; label: string }[] = [
	{ icon: <MessageSquare size={14} />, label: "Slack" },
	{ icon: <Code size={14} />, label: "VS Code" },
	{ icon: <Mail size={14} />, label: "Gmail" },
	{ icon: <StickyNote size={14} />, label: "Notion" },
	{ icon: <Globe size={14} />, label: "Arc" },
	{ icon: <Paintbrush size={14} />, label: "Figma" },
	{ icon: <Blocks size={14} />, label: "Linear" },
	{ icon: <Hash size={14} />, label: "Discord" },
	{ icon: <MessageCircle size={14} />, label: "Messages" },
	{ icon: <Notebook size={14} />, label: "Notes" },
	{ icon: <FileText size={14} />, label: "Google Docs" },
	{ icon: <FolderOpen size={14} />, label: "Finder" },
	{ icon: <Table2 size={14} />, label: "Excel" },
	{ icon: <Terminal size={14} />, label: "Terminal" },
	{ icon: <Mail size={14} />, label: "Outlook" },
];
const APP_ICONS_ROW2: { icon: ReactNode; label: string }[] = [
	{ icon: <Send size={14} />, label: "Twitter" },
	{ icon: <Smartphone size={14} />, label: "Telegram" },
	{ icon: <Braces size={14} />, label: "Trello" },
	{ icon: <Link2 size={14} />, label: "Jira" },
	{ icon: <Compass size={14} />, label: "Confluence" },
	{ icon: <Music size={14} />, label: "Spotify" },
	{ icon: <Image size={14} />, label: "Instagram" },
	{ icon: <BriefcaseBusiness size={14} />, label: "Teams" },
	{ icon: <Package size={14} />, label: "Obsidian" },
	{ icon: <PenLine size={14} />, label: "Bear" },
	{ icon: <Ruler size={14} />, label: "Sketch" },
	{ icon: <Chrome size={14} />, label: "Chrome" },
	{ icon: <Search size={14} />, label: "Firefox" },
	{ icon: <Headphones size={14} />, label: "Superhuman" },
	{ icon: <Calendar size={14} />, label: "Calendar" },
];

function AppCarousel() {
	return (
		<div className="space-y-3 overflow-hidden">
			{/* Row 1 — scrolls left */}
			<div className="animate-marquee flex gap-3 whitespace-nowrap">
				{[...APP_ICONS_ROW1, ...APP_ICONS_ROW1].map((app, i) => (
					<span
						key={i}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border rounded-xl text-sm text-foreground/80 font-medium shrink-0"
					>
						<span className="text-muted-foreground">{app.icon}</span>
						{app.label}
					</span>
				))}
			</div>
			{/* Row 2 — scrolls right */}
			<div className="animate-marquee-reverse flex gap-3 whitespace-nowrap">
				{[...APP_ICONS_ROW2, ...APP_ICONS_ROW2].map((app, i) => (
					<span
						key={i}
						className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border rounded-xl text-sm text-foreground/80 font-medium shrink-0"
					>
						<span className="text-muted-foreground">{app.icon}</span>
						{app.label}
					</span>
				))}
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
		before: "so um I think the main point of the article is that like AI is changing how we write and uh we need to adapt our workflows",
		after: "The core argument: AI is fundamentally changing how we write, and our workflows need to adapt accordingly.",
		benefits: [
			"Draft blog posts and newsletters at the speed of thought",
			"AI cleanup turns stream-of-consciousness into polished prose",
			"Custom writing style keeps your voice consistent",
		],
		quote: "I write 2,000 words a day for my blog. Parrot cut my drafting time in half.",
		quotee: "Megan R., Content writer",
	},
	{
		label: "Medical",
		before: "patient is a 54 year old male presenting with uh chest tightness and shortness of breath on exertion no prior cardiac history",
		after: "Patient is a 54-year-old male presenting with chest tightness and dyspnea on exertion. No prior cardiac history.",
		benefits: [
			"Dictate patient notes between appointments",
			"Custom vocabulary handles medical terminology",
			"Local mode keeps patient data on-device",
		],
		quote: "Custom vocabulary is a lifesaver. All my medical terms come through correctly now.",
		quotee: "Dr. James K., Cardiologist",
	},
	{
		label: "Legal",
		before: "the defendants counsel filed a motion to dismiss arguing that the plaintiff lacks standing under uh article three",
		after: "Defendant's counsel filed a motion to dismiss, arguing that the plaintiff lacks standing under Article III.",
		benefits: [
			"Draft case notes and contracts by voice",
			"Local mode keeps privileged communications on-device",
			"Writing style adapts to formal legal prose",
		],
		quote: "The local mode sold me. Client data never leaves my laptop.",
		quotee: "Priya S., Immigration lawyer",
	},
	{
		label: "Developers",
		before: "this function validates the user session token and if its expired it triggers a refresh flow uh and returns the new token",
		after: "This function validates the user session token. If expired, it triggers a refresh flow and returns the new token.",
		benefits: [
			"Write documentation and code comments by voice",
			"Great for developers managing RSI",
			"Technical vocabulary like 'Kubernetes' transcribed correctly",
		],
		quote: "I have RSI and can't type for long stretches. Parrot lets me keep coding.",
		quotee: "Tom L., Software engineer",
	},
	{
		label: "Executives",
		before: "hey can you schedule a follow up with the client for next tuesday and also send the deck to marketing before the all hands",
		after: "Please schedule a follow-up with the client for next Tuesday. Also, send the deck to Marketing before the all-hands.",
		benefits: [
			"Fire off emails and status updates in seconds",
			"Writing style keeps tone consistent across communication",
			"Works in any app — email, Slack, Notion, etc.",
		],
		quote: "I fire off emails between meetings. Parrot makes it effortless.",
		quotee: "Sarah M., VP of Product",
	},
	{
		label: "Accessibility",
		before: "for anyone who finds typing difficult parrot provides a reliable fast alternative that works across every app",
		after: "For anyone who finds typing difficult, Parrot provides a reliable, fast alternative that works across every app.",
		benefits: [
			"Reliable voice input across every Mac app",
			"Global hotkey means no mouse required to start",
			"Local mode works fully offline",
		],
		quote: "Parrot gives me independence. I can communicate freely without relying on typing.",
		quotee: "Alex D., Accessibility advocate",
	},
];

function UseCaseTabs() {
	const [activeTab, setActiveTab] = useState(0);
	const tab = USE_CASE_TABS[activeTab];

	return (
		<div className="max-w-4xl mx-auto">
			{/* Tab bar */}
			<div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-2 flex-wrap">
				{USE_CASE_TABS.map((t, i) => (
					<button
						key={i}
						type="button"
						onClick={() => setActiveTab(i)}
						className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
							i === activeTab
								? "bg-foreground text-background shadow-sm"
								: "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{/* Panel */}
			<div className="bg-card rounded-2xl border border-border p-6 md:p-8">
				{/* Mini before/after */}
				<div className="grid md:grid-cols-2 gap-4 mb-6">
					<div className="bg-muted/30 rounded-xl p-4 border border-border">
						<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
							You say
						</p>
						<p className="text-sm text-foreground/60 italic leading-relaxed">
							"{tab.before}"
						</p>
					</div>
					<div className="bg-foreground/[0.03] rounded-xl p-4 border border-primary/15">
						<p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
							Parrot writes
						</p>
						<p className="text-sm text-foreground leading-relaxed">
							"{tab.after}"
						</p>
					</div>
				</div>

				{/* Benefits */}
				<ul className="space-y-2.5 mb-6">
					{tab.benefits.map((b, i) => (
						<li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
							<Check size={15} className="text-primary mt-0.5 shrink-0" />
							{b}
						</li>
					))}
				</ul>

				{/* Quote */}
				<div className="bg-muted/30 rounded-xl p-4 border border-border">
					<Quote size={16} className="text-foreground/15 mb-2" fill="currentColor" />
					<p className="text-sm text-foreground italic mb-2">"{tab.quote}"</p>
					<p className="text-xs text-muted-foreground">{tab.quotee}</p>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Testimonials (kept as-is)
// ---------------------------------------------------------------------------
const TESTIMONIALS = [
	{
		quote:
			"I write 2,000 words a day for my blog. Parrot cut my drafting time in half — I just talk through my ideas and edit from there.",
		name: "Megan R.",
		role: "Content writer",
		accent: "bg-amber-50 border-amber-200/60",
	},
	{
		quote:
			"Custom vocabulary is a lifesaver. All my medical terms come through correctly now. I stopped correcting 'hypertension' from 'high per tension'.",
		name: "Dr. James K.",
		role: "Cardiologist",
		accent: "bg-sky-50 border-sky-200/60",
	},
	{
		quote:
			"The local mode sold me. Patient data never leaves my laptop. I dictate case notes between appointments and they're ready by end of day.",
		name: "Priya S.",
		role: "Immigration lawyer",
		accent: "bg-emerald-50 border-emerald-200/60",
	},
	{
		quote:
			"I have RSI and can't type for long stretches. Parrot lets me keep coding — I dictate comments, docs, and even Slack messages.",
		name: "Tom L.",
		role: "Software engineer",
		accent: "bg-violet-50 border-violet-200/60",
	},
];

// ---------------------------------------------------------------------------
// 12. Competitor Comparison Table
// ---------------------------------------------------------------------------
function ComparisonTable() {
	const rows = [
		{ feature: "Local mode", parrot: true, wispr: false, macos: false },
		{ feature: "Cloud mode", parrot: true, wispr: true, macos: false },
		{ feature: "Custom vocabulary", parrot: true, wispr: true, macos: false },
		{ feature: "AI cleanup", parrot: true, wispr: true, macos: false },
		{ feature: "Privacy (no data sent)", parrot: true, wispr: false, macos: "partial" as const },
		{ feature: "Offline support", parrot: true, wispr: false, macos: true },
		{ feature: "Open source", parrot: true, wispr: false, macos: false },
		{ feature: "Price", parrot: "Free", wispr: "$8/mo", macos: "Free" },
	];

	const renderCell = (val: boolean | string) => {
		if (val === true) return <Check size={16} className="text-primary mx-auto" />;
		if (val === false) return <XIcon size={16} className="text-red-400/60 mx-auto" />;
		if (val === "partial") return <Minus size={16} className="text-amber-400 mx-auto" />;
		return <span className="text-sm font-medium text-foreground">{val}</span>;
	};

	return (
		<div className="max-w-3xl mx-auto overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b-2 border-border">
						<th className="text-left py-3 px-4 text-muted-foreground font-medium">Feature</th>
						<th className="text-center py-3 px-4 font-bold text-primary">Parrot</th>
						<th className="text-center py-3 px-4 text-muted-foreground font-medium">Wispr Flow</th>
						<th className="text-center py-3 px-4 text-muted-foreground font-medium">macOS Dictation</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => (
						<tr key={i} className="border-b border-border">
							<td className="py-3 px-4 text-foreground">{row.feature}</td>
							<td className="py-3 px-4 text-center">{renderCell(row.parrot)}</td>
							<td className="py-3 px-4 text-center">{renderCell(row.wispr)}</td>
							<td className="py-3 px-4 text-center">{renderCell(row.macos)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ---------------------------------------------------------------------------
// FAQ (kept as-is)
// ---------------------------------------------------------------------------
const FAQ = [
	{
		q: "Is it actually free?",
		a: "Yes. Parrot costs nothing. If you use cloud transcription, you bring your own API key and pay the provider (Whisper charges ~$0.006/min). Local mode is completely free with no strings attached.",
	},
	{
		q: "What's local mode?",
		a: "Whisper.cpp runs on your Mac for transcription, Ollama handles AI cleanup. Everything happens on-device. You download models once (~4GB), then no internet needed.",
	},
	{
		q: "Which providers work?",
		a: "Cloud: OpenAI Whisper, Deepgram, ElevenLabs. Local: Whisper.cpp. For AI cleanup: GPT-4o-mini (cloud) or Ollama (local). Switch anytime in settings.",
	},
	{
		q: "Works offline?",
		a: "Local mode, yes — fully offline once models are downloaded. Cloud mode needs internet.",
	},
	{
		q: "How does the AI cleanup work?",
		a: "After transcription, an LLM pass fixes grammar, removes filler words (um, uh, like), and applies your custom vocabulary and writing style. It's optional and you can toggle it per-dictation.",
	},
	{
		q: "What about my privacy?",
		a: "Local mode: nothing leaves your Mac. Cloud mode: audio goes directly to your chosen provider with your API key. Parrot never stores your audio or text on any server.",
	},
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function HomePage() {
	return (
		<div className="min-h-screen">
			{/* ============================================================
			    1. HERO — two columns, left text / right typing race
			    ============================================================ */}
			<section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
				<div className="max-w-6xl mx-auto grid md:grid-cols-[1.1fr_1fr] gap-12 md:gap-16 items-center">
					{/* Left — copy */}
					<div>
						<div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/8 border border-primary/15 rounded-full mb-6 animate-fade-in-up">
							<div className="w-1.5 h-1.5 rounded-full bg-primary" />
							<span className="text-xs font-semibold text-primary tracking-wide">
								Free &middot; macOS &middot; Local or Cloud
							</span>
						</div>

						<h1 className="text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-black text-foreground tracking-tight leading-[1.08] mb-5 animate-fade-in-up-delay-1">
							Your voice,
							<br />
							their inbox.
						</h1>

						<p className="text-lg text-muted-foreground leading-relaxed max-w-md mb-8 animate-fade-in-up-delay-2">
							Parrot transcribes what you say and pastes it where your cursor
							is. Custom vocabulary, AI cleanup, and full history. Runs on your
							Mac — locally or with cloud APIs.
						</p>

						<div className="flex flex-col sm:flex-row items-start gap-4 animate-fade-in-up-delay-3">
							<Link
								to="/download"
								className="group inline-flex items-center gap-2.5 px-7 py-3 bg-foreground text-background font-semibold rounded-2xl hover:bg-foreground/85 transition-colors no-underline shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
							>
								Download for Mac
								<ArrowRight
									size={16}
									strokeWidth={2.5}
									className="transition-transform group-hover:translate-x-0.5"
								/>
							</Link>
							<a
								href="#demo"
								className="inline-flex items-center gap-2 px-5 py-3 text-foreground font-medium text-[15px] hover:bg-muted rounded-2xl transition-colors"
							>
								See it in action
								<ChevronDown size={15} />
							</a>
						</div>

						{/* Hotkey hint */}
						<div className="mt-8 flex items-center gap-3 animate-fade-in-up-delay-3">
							<div className="flex items-center gap-1">
								<kbd className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] font-bold text-foreground/70 shadow-[0_1px_0_0] shadow-border/50">
									<Command size={10} className="inline -mt-px" />
								</kbd>
								<kbd className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] font-bold text-foreground/70 shadow-[0_1px_0_0] shadow-border/50">
									Shift
								</kbd>
								<kbd className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] font-bold text-foreground/70 shadow-[0_1px_0_0] shadow-border/50">
									Space
								</kbd>
							</div>
							<span className="text-xs text-muted-foreground">
								to start dictating
							</span>
						</div>
					</div>

					{/* Right — typing race */}
					<div className="animate-fade-in-up-delay-2 max-w-md md:max-w-none mx-auto w-full">
						<TypingRace />
					</div>
				</div>
			</section>

			{/* ============================================================
			    2. SCROLLING MARQUEE
			    ============================================================ */}
			<div className="border-y border-border bg-muted/30 py-4 overflow-hidden">
				<div className="animate-marquee flex gap-8 whitespace-nowrap">
					{[
						"Send the quarterly report to the team by Friday.",
						"Dear Dr. Patel, thank you for the referral.",
						"Schedule a follow-up with the client next Tuesday.",
						"The defendant's counsel filed a motion to dismiss.",
						"Remind me to buy oat milk and sourdough.",
						"Let's reschedule the standup to 3pm.",
						"Patient presents with elevated BP, recommend full metabolic panel.",
						"Can you review the PR and merge when ready?",
					].map((phrase, i) => (
						<span
							key={i}
							className="text-[13px] text-muted-foreground/60 font-mono"
						>
							{phrase}
						</span>
					))}
					{[
						"Send the quarterly report to the team by Friday.",
						"Dear Dr. Patel, thank you for the referral.",
						"Schedule a follow-up with the client next Tuesday.",
						"The defendant's counsel filed a motion to dismiss.",
						"Remind me to buy oat milk and sourdough.",
						"Let's reschedule the standup to 3pm.",
						"Patient presents with elevated BP, recommend full metabolic panel.",
						"Can you review the PR and merge when ready?",
					].map((phrase, i) => (
						<span
							key={`dup-${i}`}
							className="text-[13px] text-muted-foreground/60 font-mono"
						>
							{phrase}
						</span>
					))}
				</div>
			</div>

			{/* ============================================================
			    3. BEFORE / AFTER — AI cleanup demo
			    ============================================================ */}
			<section id="demo" className="py-20 md:py-28 px-6">
				<div className="max-w-4xl mx-auto mb-12 md:mb-16">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						AI Cleanup
					</p>
					<h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">
						You ramble. Parrot edits.
					</h2>
					<p className="text-muted-foreground max-w-lg text-[15px]">
						The optional AI cleanup pass removes filler words, fixes grammar,
						and applies your writing style. Here's what that looks like.
					</p>
				</div>
				<BeforeAfter />
			</section>

			{/* ============================================================
			    4. INTERACTIVE VOICE DEMO PLAYGROUND
			    ============================================================ */}
			<section className="py-20 md:py-28 px-6 bg-muted/30 border-y border-border">
				<div className="max-w-4xl mx-auto mb-12 md:mb-16">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Live Demo
					</p>
					<h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-3">
						See it in any context
					</h2>
					<p className="text-muted-foreground max-w-lg text-[15px]">
						Parrot works wherever your cursor is. Watch it transcribe for
						different workflows.
					</p>
				</div>
				<VoiceDemoPlayground />
			</section>

			{/* ============================================================
			    5. DUAL MODE SPOTLIGHT
			    ============================================================ */}
			<section className="py-20 md:py-28 px-6">
				<div className="max-w-4xl mx-auto mb-12 md:mb-16">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Your setup
					</p>
					<h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
						Runs on your machine.
						<br />
						Or doesn't. Up to you.
					</h2>
					<p className="text-muted-foreground max-w-lg text-[15px]">
						Switch between local and cloud anytime in settings. No data
						migration, no lock-in. Parrot is the only voice tool that gives you both.
					</p>
				</div>
				<DualModeSpotlight />
			</section>

			{/* ============================================================
			    6. FEATURE DEEP-DIVES
			    ============================================================ */}
			<section className="py-20 md:py-28 px-6 bg-muted/30 border-y border-border">
				<div className="max-w-5xl mx-auto space-y-20 md:space-y-28">
					<FeatureRow
						title="Custom vocabulary that actually remembers"
						body="Add names, acronyms, brand terms, and jargon. Parrot feeds them to the transcription engine so 'Kubernetes' doesn't become 'Cooper Netties' and your coworker's name isn't butchered every time."
						visual={
							<div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
								<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
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
											className="px-3 py-1.5 bg-primary/6 border border-primary/12 rounded-lg text-sm text-foreground font-medium"
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
						body="Set your writing context and style. The AI cleanup matches your tone — whether that's terse Slack messages, formal legal prose, or casual blog posts. You write it once, Parrot applies it every time."
						visual={
							<div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
								<div className="border-b border-border px-5 py-3">
									<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
										Writing style
									</p>
								</div>
								<div className="p-5 space-y-4">
									<div>
										<p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											Context
										</p>
										<p className="text-sm text-foreground bg-muted/50 rounded-lg p-3 border border-border">
											I'm a senior engineer writing technical docs and Slack
											messages to my team.
										</p>
									</div>
									<div>
										<p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
											Tone
										</p>
										<div className="flex gap-2">
											{["Concise", "Technical", "Friendly"].map((t, i) => (
												<span
													key={t}
													className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
														i === 0
															? "bg-foreground text-background border-foreground"
															: "bg-muted/50 text-muted-foreground border-border"
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
						body="Every dictation is saved to your local SQLite database with full text, timestamp, and audio duration. Search past transcriptions, copy them again, or review what you said last Tuesday."
						visual={
							<div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
								<div className="px-5 py-3 border-b border-border flex items-center gap-3">
									<div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 border border-border">
										<span className="text-xs text-muted-foreground">
											Search dictations...
										</span>
									</div>
								</div>
								<div className="divide-y divide-border">
									{[
										{
											text: "Move the meeting to Thursday — Monday doesn't work for Sarah.",
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
									].map((entry, i) => (
										<div
											key={i}
											className="px-5 py-3.5 hover:bg-muted/30 transition-colors"
										>
											<p className="text-sm text-foreground truncate">
												{entry.text}
											</p>
											<div className="flex items-center gap-3 mt-1">
												<span className="text-[11px] text-muted-foreground">
													{entry.time}
												</span>
												<span className="text-[11px] text-muted-foreground">
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
			</section>

			{/* ============================================================
			    7. ANIMATED STATS
			    ============================================================ */}
			<section className="py-20 md:py-24 px-6">
				<div className="max-w-4xl mx-auto">
					<AnimatedStats />
				</div>
			</section>

			{/* ============================================================
			    8. APP COMPATIBILITY CAROUSEL
			    ============================================================ */}
			<section className="py-16 md:py-20 px-6 bg-muted/30 border-y border-border">
				<div className="max-w-5xl mx-auto">
					<p className="text-center text-lg font-bold text-foreground mb-2">
						Works everywhere your cursor is
					</p>
					<p className="text-center text-sm text-muted-foreground mb-8">
						Parrot pastes into any app on your Mac. No plugins, no integrations.
					</p>
					<AppCarousel />
				</div>
			</section>

			{/* ============================================================
			    9. USE-CASE TABS
			    ============================================================ */}
			<section className="py-20 md:py-28 px-6">
				<div className="max-w-5xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Who it's for
					</p>
					<h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
						Voice dictation for every workflow
					</h2>
					<p className="text-muted-foreground max-w-lg text-[15px] mb-12">
						Whether you're drafting emails, writing patient notes, or coding
						documentation — Parrot adapts to how you work.
					</p>
					<UseCaseTabs />
				</div>
			</section>

			{/* ============================================================
			    10. TESTIMONIALS
			    ============================================================ */}
			<section className="py-20 md:py-28 px-6 bg-muted/30 border-y border-border">
				<div className="max-w-5xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						People using Parrot
					</p>
					<h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-14">
						They talked. It typed.
					</h2>

					<div className="grid md:grid-cols-2 gap-5">
						{TESTIMONIALS.map((t, i) => (
							<div
								key={i}
								className={`rounded-2xl border p-6 md:p-7 ${t.accent}`}
							>
								<Quote
									size={20}
									className="text-foreground/15 mb-3"
									fill="currentColor"
								/>
								<p className="text-[15px] text-foreground leading-relaxed mb-5">
									{t.quote}
								</p>
								<div>
									<p className="text-sm font-semibold text-foreground">
										{t.name}
									</p>
									<p className="text-xs text-muted-foreground">{t.role}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ============================================================
			    11. FEATURE GRID
			    ============================================================ */}
			<section className="py-20 md:py-24 px-6">
				<div className="max-w-5xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						And also...
					</h2>
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
						{[
							{
								title: "Global hotkey",
								desc: "Cmd+Shift+Space from anywhere. Customizable in settings.",
							},
							{
								title: "Auto-paste",
								desc: "Transcription goes to clipboard and is pasted at your cursor automatically.",
							},
							{
								title: "Multiple providers",
								desc: "Whisper, Deepgram, ElevenLabs. Switch without re-configuring.",
							},
							{
								title: "Offline capable",
								desc: "Local mode works without internet once models are downloaded.",
							},
							{
								title: "Native Mac app",
								desc: "Built with Tauri and Rust. Light on resources, no Electron.",
							},
							{
								title: "No account needed",
								desc: "Local mode works out of the box. Cloud mode just needs an API key.",
							},
						].map((f, i) => (
							<div key={i}>
								<h3 className="text-[15px] font-semibold text-foreground mb-1">
									{f.title}
								</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{f.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ============================================================
			    12. COMPETITOR COMPARISON TABLE
			    ============================================================ */}
			<section className="py-20 md:py-28 px-6 bg-muted/30 border-y border-border">
				<div className="max-w-4xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						How we compare
					</p>
					<h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
						Parrot vs the alternatives
					</h2>
					<p className="text-muted-foreground max-w-lg text-[15px] mb-12">
						The only voice dictation tool with both local and cloud modes, full
						privacy, and zero cost.
					</p>
					<ComparisonTable />
				</div>
			</section>

			{/* ============================================================
			    13. FAQ
			    ============================================================ */}
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

			{/* ============================================================
			    14. FINAL CTA
			    ============================================================ */}
			<section className="py-20 md:py-28 px-6 bg-foreground">
				<div className="max-w-2xl mx-auto text-center">
					<img
						src="/parrot-transparent.png"
						alt="Parrot"
						className="w-14 h-14 mx-auto mb-6 drop-shadow-lg"
					/>
					<h2 className="text-3xl md:text-4xl font-black text-background tracking-tight mb-4">
						Start talking.
						<br />
						Stop typing.
					</h2>
					<p className="text-background/50 mb-8 text-[15px]">
						Free download. No account required for local mode.
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
