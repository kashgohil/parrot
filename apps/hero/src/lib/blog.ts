import { lazy } from "react";
import type { FaqItem } from "./competitors";

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
	// FAQs live here (not in post TSX) so the visible section, FAQPage JSON-LD,
	// and llms-full.txt are all generated from this one array. Convention:
	// `faq` immediately follows `keywords` — generate-seo.ts relies on it.
	faq?: FaqItem[];
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Is there a free VoiceInk alternative?",
				a: "Yes. Parrot is free for life with cleanup and custom vocabulary included.",
			},
			{
				q: "Do VoiceInk alternatives work offline?",
				a: "Local apps can. After the one-time setup, Parrot dictates without internet. Cloud apps cannot.",
			},
			{
				q: "Will my accuracy drop if I switch?",
				a: "Measure on your accent and jargon — not demos. Add vocabulary for names and product terms; that usually closes the gap faster than switching engines.",
			},
		],
		component: lazy(() => import("@/routes/blog/-posts/voiceink-alternatives")),
	},
	{
		slug: "willow-voice-alternatives",
		title: "Best Willow Voice Alternatives in 2026",
		description:
			"Compare Willow Voice alternatives for Mac — free local options, privacy-first apps, and cloud peers — so you can keep polished dictation without the wrong tradeoffs.",
		date: "2026-07-18",
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Is Parrot a free Willow Voice alternative?",
				a: "For Mac users who want free local dictation with cleanup — yes. It doesn't match multi-platform cloud sync; that's intentional.",
			},
			{
				q: "Can Willow alternatives keep audio offline?",
				a: "Local apps like Parrot can. Verify by disconnecting Wi-Fi after setup — see our offline setup guide.",
			},
			{
				q: "Which is more accurate?",
				a: "Depends on accent, mic, and vocabulary. Test proper nouns from your real work — client names beat demo scripts.",
			},
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Can I dictate in every Mac app?",
				a: "Almost any app with a standard text field. Exceptions: some secure inputs, canvas-only tools, and fields that don't accept paste.",
			},
			{
				q: "Do I need a plugin for Slack or Notion?",
				a: "No. Global hotkey + paste is enough. Plugins add complexity without unlocking the core loop.",
			},
			{
				q: "What's the best free system-wide dictation for Mac?",
				a: "Parrot — free for life, local, built for the hotkey workflow.",
			},
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Is voice email faster than typing?",
				a: "For most people, yes on first-draft replies. The win is minutes per day, not milliseconds per word. Measure your own afternoon.",
			},
			{
				q: "Will cleanup make me sound robotic?",
				a: "Good cleanup fixes filler and grammar while keeping your phrasing. If it feels stiff, shorten what you say — concise speech produces concise email.",
			},
			{
				q: "Best free tool for dictating email on Mac?",
				a: "Parrot — free, local, works in any client with a text field.",
			},
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Is free dictation good enough for college papers?",
				a: "For drafts, yes. Expect to edit. Local apps with cleanup (like Parrot) get you closer to readable prose than bare built-in dictation.",
			},
			{
				q: "Can I dictate in Google Docs on Mac?",
				a: "Yes — put the cursor in Docs and use a global-hotkey app that pastes system-wide. You're not limited to Docs' built-in voice typing.",
			},
			{
				q: "What if I don't have Apple Silicon?",
				a: "Parrot currently targets Apple Silicon. Use macOS Dictation or Docs voice typing as interim options, or another tool that supports your hardware.",
			},
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Is voice dictation an ADHD treatment?",
				a: "No. It's an assistive writing workflow some people find helpful alongside (not instead of) clinical care and other strategies.",
			},
			{
				q: "What if I lose my train of thought mid-sentence?",
				a: "Stop and re-start the thought as a new sentence. Cleanup and editing exist for a reason. Perfect continuity is optional.",
			},
			{
				q: "Best free option on Mac?",
				a: "Try Parrot — free, on-device, one hotkey. If it feels slow or fussy, you won't stick with any tool.",
			},
		],
		component: lazy(() => import("@/routes/blog/-posts/voice-dictation-adhd")),
	},
	{
		slug: "superwhisper-alternatives",
		title: "Best Superwhisper Alternatives in 2026 (Free & Local Options)",
		description:
			"Looking for a Superwhisper alternative? Compare free and paid Mac dictation apps on price, privacy, AI cleanup, and daily workflow — including a free local option.",
		date: "2026-07-18",
		dateModified: "2026-07-23",
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
		faq: [
			{
				q: "Is there a free Superwhisper alternative?",
				a: "Yes. Parrot is free for life, including AI cleanup and custom vocabulary — features Superwhisper gates behind its $8.49/mo Pro plan (pricing checked July 2026). Local transcription and cleanup are included with no paid tier.",
			},
			{
				q: "Does Superwhisper work offline?",
				a: "Yes. Superwhisper runs local Whisper models, so it works without internet. Parrot does the same — after a one-time model download, dictation and cleanup run fully offline. Cloud apps like Wispr Flow cannot.",
			},
			{
				q: "What do you lose switching from Superwhisper to Parrot?",
				a: "Superwhisper's voice commands for app control are the main gap — Parrot focuses on the dictate-clean-paste loop. If voice-driven app actions are core to your workflow, Superwhisper keeps the edge there.",
			},
			{
				q: "Will switching lose my custom vocabulary?",
				a: "You will re-add terms once. Most people only need 20–50 high-value names and jargon, and Parrot's custom vocabulary plus writing context covers the same use cases.",
			},
			{
				q: "Is Parrot's cleanup as good as Superwhisper Pro's?",
				a: "Both fix grammar and remove filler words on-device. Parrot's cleanup is free; Superwhisper's requires Pro. For the daily hotkey loop — email, chat, notes — most users find the results comparable.",
			},
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Is there a free Aqua Voice alternative for Mac?",
				a: "Yes. Parrot is free for life with on-device transcription and cleanup. macOS Dictation is also free, but limited for daily professional use.",
			},
			{
				q: "Can an Aqua alternative keep audio off the cloud?",
				a: "Yes — choose a local-first app. Parrot processes speech and cleanup on your Mac; nothing is uploaded for dictation.",
			},
			{
				q: "Will I lose real-time text if I switch?",
				a: "Not necessarily. Parrot shows live transcript in the floating HUD while you hold the hotkey, then pastes finished text at the cursor when you release.",
			},
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Are cloud dictation apps ever OK?",
				a: "Yes — for non-sensitive everyday text, many people accept the trade. Just choose consciously. Don't paste patient notes or M&A drafts into a cloud mic by accident.",
			},
			{
				q: "Is free private dictation actually good now?",
				a: "Yes. On modern Apple Silicon, on-device speech recognition and cleanup are fast enough for daily email, docs, and chat — which is why Parrot can be completely free without feeling like a toy.",
			},
			{
				q: "Does private mean lower accuracy?",
				a: "Not automatically. Local accuracy has closed the gap for everyday speech. Cloud may still edge noisy environments in some cases; measure on your accent and vocabulary.",
			},
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Is macOS Dictation private?",
				a: "On-device dictation keeps processing local. Still verify your system settings; behavior can depend on macOS version and language packs.",
			},
			{
				q: "Is a third-party app always better?",
				a: "No. For occasional use, Apple is rational. For professional daily dictation, dedicated apps usually win on cleanup, vocabulary, and workflow.",
			},
			{
				q: "What's the best free upgrade from macOS Dictation?",
				a: "If you want free + local + cleanup, try Parrot. Also see our guide to what's actually free in 2026.",
			},
		],
		component: lazy(
			() => import("@/routes/blog/-posts/macos-dictation-vs-apps"),
		),
	},
	{
		slug: "voice-dictation-for-writers",
		title:
			"Voice Dictation for Writers: Draft Faster Without Fighting the Tool",
		description:
			"How authors, bloggers, and content teams use voice dictation for first drafts — workflow tips, vocabulary setup, privacy, and the best free Mac setup.",
		date: "2026-07-16",
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Do professional writers really use dictation?",
				a: "Yes — especially for first drafts and notes. Many still type revisions. The win is output volume and reduced strain, not magic prose.",
			},
			{
				q: "What's the best free voice dictation for writers on Mac?",
				a: "If you want free + private + cleanup, try Parrot. Apple Dictation works for scraps; daily writers usually outgrow it.",
			},
			{
				q: "Will AI cleanup change my voice?",
				a: "Good cleanup removes filler and fixes grammar without rewriting your personality. If it over-edits, turn cleanup down or off for creative passages.",
			},
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
		dateModified: "2026-07-19",
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
		faq: [
			{
				q: "Is voice dictation confidential enough for client work?",
				a: "It depends on the tool. Local on-device dictation minimizes third-party access. Cloud tools require contract review, policies, and judgment. When in doubt, local is the simpler answer.",
			},
			{
				q: "Can I use free dictation for legal email?",
				a: "Yes — free local tools are viable for drafting. Parrot is free for life on Mac with on-device cleanup. Still review every outbound message like you would typed text.",
			},
			{
				q: "Will dictation replace associates?",
				a: "No. It replaces blank-page time and typing fatigue. Judgment, research, and responsibility stay human.",
			},
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
		dateModified: "2026-07-23",
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
		faq: [
			{
				q: "Is Wispr Flow free?",
				a: "Wispr Flow has a free tier, but it caps your weekly word count — daily dictators typically hit the cap mid-week. Unlimited use requires Pro at $15/mo (pricing checked July 2026). Parrot is free for life with no word caps.",
			},
			{
				q: "What is the best free Wispr Flow alternative?",
				a: "Parrot is the closest free alternative: the same global-hotkey, AI-cleaned dictation workflow, running locally on your Mac, with no subscription and no weekly word cap. Superwhisper ($8.49/mo Pro) and MacWhisper (€64 one-time) are strong paid options.",
			},
			{
				q: "Does Wispr Flow work offline?",
				a: "No. Wispr Flow processes audio in the cloud, so dictation requires an internet connection. If offline dictation matters, Parrot and Superwhisper both run locally on Mac — Parrot works fully offline after a one-time model download.",
			},
			{
				q: "Is there a Wispr Flow alternative for Windows?",
				a: "Wispr Flow and Superwhisper both ship Windows apps; Parrot is Mac-only today. If you are on Windows, Wispr Flow or Superwhisper are the practical choices — Parrot is not an option there yet.",
			},
			{
				q: "Is Whisper Flow the same as Wispr Flow?",
				a: "No. Wispr Flow is the commercial app; Whisper Flow is a free, open-source command-line tool that wraps OpenAI's Whisper model. Whisper Flow costs nothing and runs locally, but you wire up your own hotkey and clipboard plumbing.",
			},
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
		dateModified: "2026-07-23",
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
		faq: [
			{
				q: "What is the best free dictation app for Mac?",
				a: "Parrot is the best fully free dictation app for Mac in 2026: global hotkey, on-device transcription, AI cleanup, and custom vocabulary with no word caps and no account. For occasional short notes, built-in macOS Dictation is also genuinely free.",
			},
			{
				q: "Are free dictation apps really free?",
				a: "Usually not fully. Free typically means one of four things: truly free (usually local apps), freemium with weekly or monthly caps, a time-limited trial, or a free app that bills you per minute through your own API key.",
			},
			{
				q: "Which free dictation apps have no word limit?",
				a: "Parrot and macOS Dictation both have no word caps. Wispr Flow's free tier caps weekly words, and Otter.ai's free tier caps at 300 minutes per month.",
			},
			{
				q: "Do free dictation apps work offline?",
				a: "Local ones do — Parrot, macOS Dictation, and whisper.cpp all work without internet. Cloud-based free tiers like Wispr Flow and Otter.ai require a connection.",
			},
			{
				q: "Is whisper.cpp good enough for daily dictation?",
				a: "The transcription quality is excellent, but it is a command-line tool with no dictation UI — you would have to script audio capture, a global hotkey, and paste yourself. Apps like Parrot wrap the same local-model approach in a ready-made workflow.",
			},
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
		dateModified: "2026-07-18",
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
		dateModified: "2026-07-23",
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
		faq: [
			{
				q: "What is the best voice dictation app for Mac in 2026?",
				a: "For most people, Parrot: free for life, fully local, with AI cleanup and custom vocabulary. macOS Dictation is fine for casual notes, Otter.ai leads for meeting transcription, and Superwhisper or Wispr Flow suit users who prefer their specific workflows.",
			},
			{
				q: "What is the best free dictation app for Mac?",
				a: "Parrot is the most complete free option — unlimited local dictation with cleanup and no word caps. macOS Dictation is the best zero-install option for occasional use.",
			},
			{
				q: "Does Dragon Professional work on Mac?",
				a: "No. Nuance discontinued Dragon for Mac in 2018; Dragon Professional is Windows-only in 2026. Running it on a Mac requires a Windows virtual machine, so Mac users typically pick a native app like Parrot or Superwhisper instead.",
			},
			{
				q: "Which Mac dictation apps work offline?",
				a: "Parrot, macOS Dictation, Superwhisper, MacWhisper, and Whisper Flow all process audio on-device and work offline. Otter.ai and Wispr Flow are cloud-based and need an internet connection.",
			},
			{
				q: "Is cloud dictation safe for sensitive work?",
				a: "Cloud apps upload your audio for processing, which is a non-starter for many medical, legal, and financial workflows. Local apps like Parrot keep audio on your Mac, so nothing leaves the device.",
			},
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
		dateModified: "2026-07-23",
		readingTime: "5 min read",
		category: "Tutorial",
		keywords: [
			"local voice dictation",
			"mac dictation",
			"offline dictation",
			"privacy voice dictation",
			"on-device dictation",
		],
		faq: [
			{
				q: "How do I set up offline voice dictation on a Mac?",
				a: "Install Parrot, run the built-in setup wizard (it downloads the local dictation and cleanup models once), pick a hotkey, and dictate. The whole setup takes under 5 minutes, and everything runs offline afterward.",
			},
			{
				q: "Does Parrot work without internet?",
				a: "Yes. After the one-time model download (~4 GB), transcription and AI cleanup run entirely on your Mac. No internet, no account, no API keys.",
			},
			{
				q: "What permissions does Parrot need?",
				a: "Microphone access to hear you, and Accessibility access to paste text at your cursor. Both are standard macOS permissions granted in System Settings → Privacy & Security.",
			},
			{
				q: "Does local dictation work on Intel Macs?",
				a: "Not with Parrot — it is built for Apple Silicon (M1 and later), where on-device performance makes transcription fast enough for daily use.",
			},
			{
				q: "How much disk space do local dictation models need?",
				a: "Budget a few GB once for the dictation and cleanup models. After the download, no network or additional space is needed.",
			},
		],
		howTo: {
			name: "Set up local voice dictation on Mac",
			description:
				"Run voice dictation entirely on your Mac with no internet, no API keys, and no data leaving your device.",
			totalTime: "PT5M",
			steps: [
				{
					name: "Install Parrot",
					text: "Download Parrot from tryparrot.app/download and grant microphone and accessibility permissions on first launch.",
				},
				{
					name: "Run the setup wizard",
					text: "The wizard checks your system, requests macOS permissions, and downloads what it needs automatically.",
				},
				{
					name: "Pick a speed/accuracy balance",
					text: "Choose the recommended default or a faster/more precise option. Download once, then run offline.",
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
		dateModified: "2026-07-18",
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
		dateModified: "2026-07-18",
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
		dateModified: "2026-07-18",
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
		dateModified: "2026-07-18",
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

/** P0 money URLs for SEO cluster priority (homepage, blog index, related). */
export const MONEY_POST_SLUGS = [
	"wispr-flow-alternatives",
	"superwhisper-alternatives",
	"free-voice-dictation-apps-2026",
	"local-voice-dictation-mac",
	"best-voice-dictation-apps-mac-2026",
] as const;

/** Blog index / hub: money posts first, then the rest in source order. */
export function getPostsForBlogIndex(): BlogPost[] {
	const money = MONEY_POST_SLUGS.map((s) => getPostBySlug(s)).filter(
		(p): p is BlogPost => Boolean(p),
	);
	const moneySet = new Set<string>(MONEY_POST_SLUGS);
	const rest = posts.filter((p) => !moneySet.has(p.slug));
	return [...money, ...rest];
}

export function getRelatedPosts(slug: string, count = 3): BlogPost[] {
	const current = getPostBySlug(slug);
	if (!current) return getPostsForBlogIndex().slice(0, count);

	const moneySet = new Set<string>(MONEY_POST_SLUGS);
	const pool = posts.filter((p) => p.slug !== slug);
	const score = (p: BlogPost) => {
		let s = 0;
		if (moneySet.has(p.slug)) s += 4;
		if (p.category === current.category) s += 2;
		const shared = p.keywords.filter((k) => current.keywords.includes(k));
		s += Math.min(shared.length, 3);
		return s;
	};
	return [...pool].sort((a, b) => score(b) - score(a)).slice(0, count);
}
