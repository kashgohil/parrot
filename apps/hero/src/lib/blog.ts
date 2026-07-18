import { lazy } from "react";

export interface HowToStep {
	name: string;
	text: string;
}

export interface HowToData {
	name: string;
	description: string;
	totalTime?: string;
	steps: HowToStep[];
}

export interface BlogPost {
	slug: string;
	title: string;
	description: string;
	date: string;
	dateModified?: string;
	readingTime: string;
	category: string;
	keywords: string[];
	howTo?: HowToData;
	component: React.LazyExoticComponent<React.ComponentType>;
}

export const posts: BlogPost[] = [
	{
		slug: "voiceink-alternatives",
		title: "Best VoiceInk Alternatives in 2026 (Free & Local)",
		description:
			"Looking for a VoiceInk alternative? Compare free local Mac dictation, Superwhisper, Wispr Flow, and MacWhisper on price, privacy, cleanup, and daily workflow.",
		date: "2026-07-18",
		readingTime: "6 min read",
		category: "Comparison",
		keywords: [
			"voiceink alternative",
			"voiceink vs",
			"voiceink competitors",
			"local dictation mac free",
			"voiceink free alternative",
			"best local dictation app",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voiceink-alternatives"),
		),
	},
	{
		slug: "willow-voice-alternatives",
		title: "Best Willow Voice Alternatives in 2026",
		description:
			"Compare Willow Voice alternatives for Mac — free local options, privacy-first apps, and cloud peers — so you can keep polished dictation without the wrong tradeoffs.",
		date: "2026-07-18",
		readingTime: "6 min read",
		category: "Comparison",
		keywords: [
			"willow voice alternative",
			"willow voice vs",
			"willow dictation alternative",
			"willow voice competitors",
			"multi platform dictation alternative",
			"free willow alternative",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/willow-voice-alternatives"),
		),
	},
	{
		slug: "dictate-in-any-mac-app",
		title: "How to Dictate in Any Mac App: Slack, Notion, VS Code & More",
		description:
			"Set up system-wide voice dictation on Mac so one hotkey works in Slack, Notion, VS Code, Gmail, and more — plus app-specific tips when paste fails.",
		date: "2026-07-18",
		readingTime: "7 min read",
		category: "Tutorial",
		keywords: [
			"dictate in slack mac",
			"voice dictation notion",
			"dictation vs code",
			"system wide dictation mac",
			"voice typing any app",
			"global hotkey dictation",
		],
		howTo: {
			name: "Dictate into any Mac app with a global hotkey",
			description:
				"Install a system-wide dictation app, grant permissions, and speak into Slack, Notion, VS Code, email, and more.",
			totalTime: "PT5M",
			steps: [
				{
					name: "Install a global-hotkey dictation app",
					text: "Download Parrot (or similar) and put it in Applications.",
				},
				{
					name: "Grant Microphone and Accessibility",
					text: "Allow the app to hear you and paste or type into other apps.",
				},
				{
					name: "Set a hotkey",
					text: "Use fn or another key you will not fight with daily shortcuts.",
				},
				{
					name: "Focus a text field and dictate",
					text: "Click into Slack, Notion, VS Code, or email, hold the hotkey, and speak.",
				},
				{
					name: "Verify paste",
					text: "If nothing appears, re-check Accessibility and that the cursor is in an editable field.",
				},
			],
		},
		component: lazy(
			() => import("@/routes/blog/-posts/dictate-in-any-mac-app"),
		),
	},
	{
		slug: "voice-dictation-for-email",
		title: "Voice Dictation for Email: Clear Your Inbox Faster on Mac",
		description:
			"A practical Mac workflow for dictating Gmail, Outlook, and Superhuman replies — formulas, accuracy tips for names, and a free local setup.",
		date: "2026-07-18",
		readingTime: "6 min read",
		category: "Guide",
		keywords: [
			"voice dictation email",
			"dictate gmail mac",
			"voice typing outlook",
			"dictate email faster",
			"speech to text email",
			"inbox zero dictation",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voice-dictation-for-email"),
		),
	},
	{
		slug: "voice-dictation-for-students",
		title: "Voice Dictation for Students: Essays, Notes, and Free Tools",
		description:
			"How students use voice dictation for essays, notes, and email — free Mac setup, essay workflow, academic integrity notes, and offline tips.",
		date: "2026-07-18",
		readingTime: "7 min read",
		category: "Guide",
		keywords: [
			"voice dictation for students",
			"dictation for essays",
			"speech to text homework",
			"free dictation students",
			"voice typing college",
			"dictate essays mac",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voice-dictation-for-students"),
		),
	},
	{
		slug: "voice-dictation-adhd",
		title: "Voice Dictation for ADHD: Lower the Friction to Start Writing",
		description:
			"Practical ways ADHD brains use voice dictation to start writing faster — low-friction setup, brain-dump workflows, and free Mac tools that do not add overwhelm.",
		date: "2026-07-18",
		readingTime: "6 min read",
		category: "Guide",
		keywords: [
			"voice dictation adhd",
			"dictation for adhd",
			"speech to text adhd",
			"adhd writing tools",
			"voice typing focus",
			"adhd productivity dictation",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voice-dictation-adhd"),
		),
	},
	{
		slug: "superwhisper-alternatives",
		title: "Best Superwhisper Alternatives in 2026 (Free & Local Options)",
		description:
			"Looking for a Superwhisper alternative? Compare free and paid Mac dictation apps on price, privacy, AI cleanup, and daily workflow — including a free local option.",
		date: "2026-07-18",
		readingTime: "7 min read",
		category: "Comparison",
		keywords: [
			"superwhisper alternative",
			"superwhisper vs",
			"superwhisper free alternative",
			"local voice dictation mac",
			"best voice dictation mac",
			"superwhisper competitors",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/superwhisper-alternatives"),
		),
	},
	{
		slug: "aqua-voice-alternatives",
		title: "Best Aqua Voice Alternatives for Mac in 2026",
		description:
			"Compare the best Aqua Voice alternatives for Mac — free local dictation, privacy-first apps, and cloud options — so you can keep the real-time feel without the wrong tradeoffs.",
		date: "2026-07-18",
		readingTime: "6 min read",
		category: "Comparison",
		keywords: [
			"aqua voice alternative",
			"aqua voice vs",
			"aqua voice competitors",
			"real-time voice dictation mac",
			"voice typing mac",
			"dictation app alternative",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/aqua-voice-alternatives"),
		),
	},
	{
		slug: "private-voice-dictation-apps",
		title: "Best Private Voice Dictation Apps in 2026 (No Cloud Required)",
		description:
			"The best private voice dictation apps keep audio on your device. Compare local Mac options, learn how to verify offline operation, and pick a free privacy-first tool.",
		date: "2026-07-17",
		readingTime: "7 min read",
		category: "Guide",
		keywords: [
			"private voice dictation",
			"private speech to text",
			"offline voice dictation",
			"local dictation app",
			"no cloud dictation",
			"secure voice typing",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/private-voice-dictation-apps"),
		),
	},
	{
		slug: "macos-dictation-vs-apps",
		title: "macOS Dictation vs Third-Party Apps: When to Upgrade",
		description:
			"Is built-in macOS Dictation enough? Compare Apple Dictation to dedicated Mac voice dictation apps on accuracy, cleanup, vocabulary, privacy, and daily workflow.",
		date: "2026-07-17",
		readingTime: "6 min read",
		category: "Comparison",
		keywords: [
			"macos dictation",
			"apple dictation vs",
			"built-in dictation mac",
			"mac dictation app",
			"improve mac dictation",
			"apple speech to text",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/macos-dictation-vs-apps"),
		),
	},
	{
		slug: "voice-dictation-for-writers",
		title: "Voice Dictation for Writers: Draft Faster Without Fighting the Tool",
		description:
			"How authors, bloggers, and content teams use voice dictation for first drafts — workflow tips, vocabulary setup, privacy, and the best free Mac setup.",
		date: "2026-07-16",
		readingTime: "7 min read",
		category: "Guide",
		keywords: [
			"voice dictation for writers",
			"dictation for authors",
			"write by voice",
			"voice typing for writing",
			"speech to text for writers",
			"dictation writing software",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voice-dictation-for-writers"),
		),
	},
	{
		slug: "voice-dictation-for-lawyers",
		title: "Voice Dictation for Lawyers: Privacy, Accuracy, and Speed",
		description:
			"How lawyers use voice dictation for memos, email, and notes — what to require for client confidentiality, accuracy tips, and why local-first tools are often safer.",
		date: "2026-07-16",
		readingTime: "7 min read",
		category: "Industry",
		keywords: [
			"voice dictation for lawyers",
			"legal dictation software",
			"attorney speech to text",
			"confidential dictation",
			"legal voice typing",
			"dictation for attorneys",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voice-dictation-for-lawyers"),
		),
	},
	{
		slug: "wispr-flow-alternatives",
		title:
			"Wispr Flow Alternatives: 5 Voice Dictation Apps Worth Trying in 2026",
		description:
			"Looking for a Wispr Flow alternative? We compare the 5 best voice dictation apps on price, privacy, accuracy, and offline support so you can pick the right one.",
		date: "2026-04-29",
		dateModified: "2026-07-18",
		readingTime: "7 min read",
		category: "Comparison",
		keywords: [
			"wispr flow alternative",
			"wispr flow vs",
			"voice dictation app",
			"superwhisper alternative",
			"macwhisper alternative",
			"best voice dictation",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/wispr-flow-alternatives"),
		),
	},
	{
		slug: "offline-voice-dictation-setup",
		title: "How to Use Voice Dictation Offline: A Complete Setup Guide",
		description:
			"Step-by-step guide to setting up fully offline voice dictation on Mac in under 10 minutes - no internet, no API keys, no cloud services required.",
		date: "2026-04-27",
		dateModified: "2026-07-18",
		readingTime: "8 min read",
		category: "Tutorial",
		keywords: [
			"offline voice dictation",
			"voice dictation no internet",
			"local dictation setup",
			"offline speech to text",
			"on-device dictation mac",
			"private voice dictation",
		],
		howTo: {
			name: "Set up offline voice dictation on Mac",
			description:
				"Install and configure fully offline, on-device voice dictation on macOS in under 10 minutes.",
			totalTime: "PT10M",
			steps: [
				{
					name: "Download Parrot",
					text: "Download Parrot from tryparrot.app/download and drag it to your Applications folder.",
				},
				{
					name: "Grant permissions",
					text: "Open Parrot and grant Microphone and Accessibility permissions when prompted.",
				},
				{
					name: "Finish onboarding",
					text: "Complete the setup wizard. Parrot downloads what it needs once, then runs fully offline.",
				},
				{
					name: "Set a hotkey",
					text: "Pick a global hotkey for dictation. The default is the fn key.",
				},
				{
					name: "Verify offline operation",
					text: "Disconnect from Wi-Fi and dictate. Text should still appear, confirming transcription is happening locally.",
				},
			],
		},
		component: lazy(
			() => import("@/routes/blog/-posts/offline-voice-dictation-setup"),
		),
	},
	{
		slug: "free-voice-dictation-apps-2026",
		title:
			"Free Voice Dictation Apps: What's Actually Free in 2026 (and What's Not)",
		description:
			"An honest look at free voice dictation apps in 2026 - which ones are truly free forever, which have hidden caps, and which charge you through API fees.",
		date: "2026-04-26",
		dateModified: "2026-07-18",
		readingTime: "7 min read",
		category: "Guide",
		keywords: [
			"free voice dictation",
			"free dictation app",
			"free speech to text mac",
			"free voice typing",
			"free dictation software",
			"voice dictation no subscription",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/free-voice-dictation-apps-2026"),
		),
	},
	{
		slug: "local-first-voice-dictation-explained",
		title:
			"Local-First Voice Dictation Explained: Why Your Audio Should Never Leave Your Mac",
		description:
			"What local-first voice dictation actually means, why it matters for privacy and reliability, and how to verify an app is genuinely local-first.",
		date: "2026-04-25",
		readingTime: "8 min read",
		category: "Industry",
		keywords: [
			"local-first voice dictation",
			"on-device dictation",
			"private voice dictation",
			"local speech to text",
			"offline dictation privacy",
			"local-first software",
		],
		component: lazy(
			() =>
				import("@/routes/blog/-posts/local-first-voice-dictation-explained"),
		),
	},
	{
		slug: "best-voice-dictation-apps-mac-2026",
		title: "Best Voice Dictation Apps for Mac in 2026",
		description:
			"A comprehensive comparison of the best voice dictation apps for Mac, including Parrot, Whisper Flow, macOS Dictation, and more.",
		date: "2026-02-05",
		readingTime: "8 min read",
		category: "Comparison",
		keywords: [
			"voice dictation",
			"voice dictation app",
			"mac dictation",
			"best dictation software",
			"speech to text mac",
			"dictation app mac",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/best-voice-dictation-apps-mac-2026"),
		),
	},
	{
		slug: "speech-to-text-complete-guide",
		title: "Speech to Text: The Complete Guide",
		description:
			"Everything you need to know about speech to text technology - how it works, the best providers, and practical use cases for voice transcription.",
		date: "2026-02-03",
		readingTime: "10 min read",
		category: "Guide",
		keywords: [
			"speech to text",
			"voice to text",
			"transcription",
			"speech recognition",
			"voice transcription",
			"automatic speech recognition",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/speech-to-text-complete-guide"),
		),
	},
	{
		slug: "voice-apps-boost-productivity",
		title: "10 Ways Voice Apps Boost Productivity",
		description:
			"Practical tips for using voice dictation apps to work faster, reduce typing strain, and get more done throughout your workday.",
		date: "2026-02-01",
		readingTime: "7 min read",
		category: "Guide",
		keywords: [
			"voice app",
			"productivity",
			"dictation productivity",
			"hands-free typing",
			"voice productivity",
			"work faster",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voice-apps-boost-productivity"),
		),
	},
	{
		slug: "voice-dictation-vs-typing",
		title: "Voice Dictation vs. Typing: Which Is Actually Faster?",
		description:
			"We compared voice dictation and typing across different tasks. Here's what we found about speed, accuracy, and when each method wins.",
		date: "2026-01-28",
		readingTime: "6 min read",
		category: "Comparison",
		keywords: [
			"voice dictation",
			"typing speed",
			"dictation vs typing",
			"voice typing",
			"speech to text speed",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voice-dictation-vs-typing"),
		),
	},
	{
		slug: "local-voice-dictation-mac",
		title: "How to Set Up Local Voice Dictation on Mac",
		description:
			"Step-by-step guide to running voice dictation entirely on your Mac with no cloud services, no API keys, and no internet required.",
		date: "2026-01-24",
		readingTime: "5 min read",
		category: "Tutorial",
		keywords: [
			"local voice dictation",
			"mac dictation",
			"offline dictation",
			"privacy voice dictation",
			"on-device dictation",
		],
		howTo: {
			name: "Set up local voice dictation on Mac",
			description:
				"Run voice dictation entirely on your Mac with no internet, no API keys, and no data leaving your device.",
			totalTime: "PT5M",
			steps: [
				{
					name: "Install Parrot",
					text: "Download Parrot from tryparrot.app/download and grant microphone permission on first launch.",
				},
				{
					name: "Run the setup wizard",
					text: "The wizard checks your system, requests macOS permissions, and downloads the dictation and cleanup engines automatically.",
				},
				{
					name: "Pick a quality tier",
					text: "Choose Lite, Standard, or Precise for dictation. Standard is recommended for most Macs.",
				},
				{
					name: "Start dictating",
					text: "Press fn to record, press again to stop. Transcription appears at the cursor.",
				},
				{
					name: "Customize",
					text: "Add custom vocabulary, set writing context, and tune the hotkey from Parrot's settings.",
				},
			],
		},
		component: lazy(
			() => import("@/routes/blog/-posts/local-voice-dictation-mac"),
		),
	},
	{
		slug: "transcription-apis-compared",
		title: "Whisper vs. Deepgram vs. ElevenLabs: Transcription APIs Compared",
		description:
			"A practical comparison of three popular transcription APIs - accuracy, speed, pricing, and which one to pick for voice dictation.",
		date: "2026-01-20",
		readingTime: "7 min read",
		category: "Comparison",
		keywords: [
			"whisper api",
			"deepgram",
			"elevenlabs",
			"transcription api",
			"speech to text api",
			"voice transcription",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/transcription-apis-compared"),
		),
	},
	{
		slug: "voice-dictation-medical-hipaa",
		title: "Voice Dictation for Medical Professionals: Privacy and HIPAA",
		description:
			"How medical professionals can use voice dictation without compromising patient privacy. Local-first tools and HIPAA considerations.",
		date: "2026-01-15",
		readingTime: "6 min read",
		category: "Industry",
		keywords: [
			"medical dictation",
			"hipaa voice dictation",
			"healthcare transcription",
			"medical speech to text",
			"private dictation",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/voice-dictation-medical-hipaa"),
		),
	},
	{
		slug: "rsi-developer-voice-dictation",
		title: "Managing RSI as a Developer with Voice Dictation",
		description:
			"A developer's guide to using voice dictation to reduce strain, stay productive, and protect your hands from repetitive stress injury.",
		date: "2026-01-10",
		readingTime: "5 min read",
		category: "Story",
		keywords: [
			"rsi developer",
			"repetitive strain injury",
			"voice coding",
			"ergonomic typing",
			"developer health",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/rsi-developer-voice-dictation"),
		),
	},
	{
		slug: "why-tauri-not-electron",
		title: "Why We Built Parrot with Tauri Instead of Electron",
		description:
			"The technical reasoning behind choosing Tauri over Electron for a native Mac voice dictation app - performance, binary size, and system access.",
		date: "2026-01-05",
		readingTime: "6 min read",
		category: "Technical",
		keywords: [
			"tauri",
			"electron alternative",
			"rust desktop app",
			"native mac app",
			"lightweight desktop app",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/why-tauri-not-electron"),
		),
	},
	{
		slug: "custom-vocabulary-voice-dictation",
		title: "Custom Vocabulary: Stop Correcting Your Own Name",
		description:
			"How custom vocabulary lists fix the most frustrating part of voice dictation - names, jargon, and domain-specific terms that always get mangled.",
		date: "2026-01-01",
		readingTime: "5 min read",
		category: "Guide",
		keywords: [
			"custom vocabulary",
			"voice dictation accuracy",
			"speech recognition vocabulary",
			"dictation custom words",
		],
		component: lazy(
			() => import("@/routes/blog/-posts/custom-vocabulary-voice-dictation"),
		),
	},
];

export function getPostBySlug(slug: string): BlogPost | undefined {
	return posts.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, count = 3): BlogPost[] {
	const current = getPostBySlug(slug);
	if (!current) return posts.slice(0, count);
	const sameCategory = posts.filter(
		(p) => p.slug !== slug && p.category === current.category,
	);
	const others = posts.filter(
		(p) => p.slug !== slug && p.category !== current.category,
	);
	return [...sameCategory, ...others].slice(0, count);
}
