import { lazy } from "react";

export interface BlogPost {
	slug: string;
	title: string;
	description: string;
	date: string;
	dateModified?: string;
	readingTime: string;
	category: string;
	keywords: string[];
	component: React.LazyExoticComponent<React.ComponentType>;
}

export const posts: BlogPost[] = [
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
			"whisper local",
		],
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
