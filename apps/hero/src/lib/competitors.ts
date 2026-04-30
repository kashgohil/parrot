export interface FeatureRow {
	name: string;
	parrot: string | boolean;
	them: string | boolean;
}

export interface FaqItem {
	q: string;
	a: string;
}

export interface Competitor {
	slug: string;
	name: string;
	shortName: string;
	tagline: string;
	description: string;
	heroVerdict: string;
	pricing: {
		theirFree: string | null;
		theirPaid: string;
		parrotPrice: string;
	};
	features: FeatureRow[];
	theirStrengths: string[];
	theirWeaknesses: string[];
	parrotWins: { title: string; body: string }[];
	chooseParrotWhen: string[];
	chooseThemWhen: string[];
	keywords: string[];
	faq: FaqItem[];
}

export const competitors: Competitor[] = [
	{
		slug: "wispr-flow",
		name: "Wispr Flow",
		shortName: "Wispr",
		tagline: "AI-cleaned cloud dictation with cross-platform support",
		description:
			"Parrot vs Wispr Flow — a deep comparison of pricing, privacy, accuracy, and platform support to help you pick the right voice dictation app.",
		heroVerdict:
			"Pick Parrot if you want the same AI-cleaned dictation workflow without a monthly subscription, with a local-first option, and no weekly word cap. Pick Wispr Flow if you need cross-platform support (Windows + Mac).",
		pricing: {
			theirFree: "Free tier with weekly word cap",
			theirPaid: "$15/mo Pro",
			parrotPrice: "Free for life",
		},
		features: [
			{ name: "Price", parrot: "Free for life", them: "Free tier / $15/mo" },
			{ name: "Word caps", parrot: "None", them: "Weekly cap on free tier" },
			{ name: "Local-first option", parrot: true, them: false },
			{ name: "On-device transcription", parrot: true, them: false },
			{ name: "AI cleanup", parrot: true, them: true },
			{ name: "Custom vocabulary", parrot: "Deep", them: "Limited" },
			{ name: "Bring your own API key", parrot: true, them: false },
			{
				name: "Provider choice (Whisper / Deepgram / ElevenLabs)",
				parrot: true,
				them: false,
			},
			{ name: "Mac (Apple Silicon)", parrot: true, them: true },
			{ name: "Windows", parrot: false, them: true },
			{ name: "Works offline", parrot: true, them: false },
			{ name: "Native menu-bar app", parrot: true, them: true },
		],
		theirStrengths: [
			"Polished onboarding and well-designed UI",
			"Cross-platform — ships on both Windows and Mac",
			"Strong baseline accuracy out of the box",
			"Established product with active funding and team",
		],
		theirWeaknesses: [
			"Cloud-only — your audio is uploaded for processing",
			"Free tier capped by weekly word count, not minutes",
			"No way to swap in your own transcription provider",
			"No fully offline mode for sensitive industries",
			"Pro plan is recurring, not one-time",
		],
		parrotWins: [
			{
				title: "No subscription, no caps",
				body: "Parrot is free for life with no weekly word limit. Wispr Flow's free tier is functional but a daily dictator hits the cap by mid-week.",
			},
			{
				title: "Local-first by design",
				body: "On-device Whisper means your microphone audio never leaves your Mac. Wispr Flow processes audio in the cloud — a non-starter for HIPAA-covered, legal, or finance work.",
			},
			{
				title: "Bring your own provider",
				body: "Use OpenAI Whisper, Deepgram, or ElevenLabs depending on your accuracy/cost needs. Wispr Flow locks you into their stack.",
			},
			{
				title: "Deeper vocabulary control",
				body: "Custom words, writing style profiles, and context tags that move the needle on accuracy for technical or domain-specific dictation.",
			},
		],
		chooseParrotWhen: [
			"You're on Mac and want to stop paying monthly for dictation",
			"You handle sensitive content (medical, legal, financial, internal)",
			"You hit Wispr Flow's free-tier word cap regularly",
			"You want to bring your own Whisper, Deepgram, or ElevenLabs key",
			"You travel and need dictation that works on planes and bad Wi-Fi",
		],
		chooseThemWhen: [
			"You need Windows support (Parrot is Mac-only today)",
			"You're already deep into Wispr Flow's workflow and free tier covers your usage",
			"You strongly prefer cloud-managed tooling over local models",
		],
		keywords: [
			"wispr flow alternative",
			"wispr flow vs parrot",
			"parrot vs wispr",
			"wispr flow comparison",
			"voice dictation app comparison",
		],
		faq: [
			{
				q: "Is Parrot a free Wispr Flow alternative?",
				a: "Yes. Parrot is free for life with no word caps. The app itself never charges you. If you want to use cloud transcription providers, you bring your own API key — usually well under $1/hour of dictation, or free if you use the local mode.",
			},
			{
				q: "Can Parrot do everything Wispr Flow does?",
				a: "On Mac, yes — global hotkey, AI-cleaned transcription, paste at cursor, custom vocabulary. The two main gaps are Windows support (Parrot is Mac-only) and Wispr's account-synced history across devices.",
			},
			{
				q: "Why is Parrot free when Wispr Flow charges?",
				a: "Parrot's local mode runs entirely on your Mac, so there are no per-minute server costs to recoup. A managed cloud mode is coming later for users who want it; that one will be paid.",
			},
			{
				q: "How does accuracy compare?",
				a: "On the same audio, Whisper-large (which Parrot can run locally or via API) is competitive with Wispr Flow's cloud stack on most everyday speech. Wispr may edge ahead on noisy audio or heavy accents — but the gap is small.",
			},
		],
	},
	{
		slug: "superwhisper",
		name: "Superwhisper",
		shortName: "Superwhisper",
		tagline: "Mac-native dictation with local Whisper models",
		description:
			"Parrot vs Superwhisper — comparing two Mac-native voice dictation apps on price, features, and AI cleanup quality.",
		heroVerdict:
			"Both apps run locally on Mac and have similar workflows. Pick Parrot if you want a fully free option with no subscription. Pick Superwhisper if you specifically want their voice command features and don't mind a monthly fee.",
		pricing: {
			theirFree: "Limited free tier",
			theirPaid: "$8.49/mo Pro",
			parrotPrice: "Free for life",
		},
		features: [
			{ name: "Price", parrot: "Free for life", them: "$8.49/mo Pro" },
			{ name: "Local Whisper models", parrot: true, them: true },
			{ name: "AI cleanup", parrot: "Free", them: "Pro only" },
			{ name: "Custom vocabulary", parrot: "Deep", them: "Yes" },
			{ name: "Voice commands", parrot: false, them: true },
			{ name: "Bring your own API key", parrot: true, them: true },
			{ name: "Mac (Apple Silicon)", parrot: true, them: true },
			{ name: "Windows", parrot: false, them: false },
			{ name: "Works offline", parrot: true, them: true },
			{ name: "Native menu-bar app", parrot: true, them: true },
		],
		theirStrengths: [
			"Voice commands for app actions (open, navigate, etc.)",
			"Mature Mac-native experience",
			"Multiple local model sizes to choose from",
			"Established user base with frequent updates",
		],
		theirWeaknesses: [
			"AI cleanup, the most useful feature, is locked behind Pro",
			"Recurring subscription, not one-time",
			"Free tier is genuinely limited",
		],
		parrotWins: [
			{
				title: "Free for life",
				body: "Parrot's full feature set — including AI cleanup — is free with no time limit. Superwhisper gates cleanup behind the $8.49/mo Pro tier.",
			},
			{
				title: "Provider flexibility",
				body: "Both apps support local Whisper, but Parrot also lets you swap in cloud providers (Deepgram, ElevenLabs) for specific accuracy or speed needs.",
			},
		],
		chooseParrotWhen: [
			"You don't want to pay monthly for dictation",
			"You don't need voice commands beyond basic dictation",
			"You want AI cleanup without paying for Pro",
		],
		chooseThemWhen: [
			"You rely heavily on voice commands for app navigation",
			"You're already happy on the Pro plan",
		],
		keywords: [
			"superwhisper alternative",
			"superwhisper vs parrot",
			"parrot vs superwhisper",
			"mac dictation app comparison",
		],
		faq: [
			{
				q: "Is Parrot a free Superwhisper alternative?",
				a: "Yes. Parrot's local mode is free for life, including AI cleanup — which Superwhisper gates behind their Pro plan.",
			},
			{
				q: "Does Parrot have voice commands like Superwhisper?",
				a: "Not yet. Parrot focuses on transcription and cleanup. If voice-driven app actions are core to your workflow, Superwhisper has the edge there.",
			},
			{
				q: "Are the local models the same?",
				a: "Both apps use OpenAI's open-source Whisper models. Accuracy on the same model size will be effectively identical between the two.",
			},
		],
	},
	{
		slug: "macwhisper",
		name: "MacWhisper",
		shortName: "MacWhisper",
		tagline: "One-time payment Whisper transcription for Mac",
		description:
			"Parrot vs MacWhisper — comparing dictation workflow, AI cleanup, and pricing model for Mac voice transcription.",
		heroVerdict:
			"MacWhisper is great for transcribing audio files but isn't built for live dictation. Parrot is the better choice if you want global-hotkey dictation with AI cleanup. Pick MacWhisper if you mostly transcribe pre-recorded audio.",
		pricing: {
			theirFree: "Free tier with smaller models",
			theirPaid: "$19 one-time (Pro)",
			parrotPrice: "Free for life",
		},
		features: [
			{ name: "Price", parrot: "Free for life", them: "$19 one-time" },
			{
				name: "Live dictation (hotkey + paste)",
				parrot: true,
				them: "Limited",
			},
			{ name: "Audio file transcription", parrot: false, them: true },
			{ name: "AI cleanup", parrot: true, them: false },
			{ name: "Custom vocabulary", parrot: "Deep", them: "Limited" },
			{ name: "Local Whisper models", parrot: true, them: true },
			{ name: "Mac (Apple Silicon)", parrot: true, them: true },
			{ name: "Works offline", parrot: true, them: true },
		],
		theirStrengths: [
			"Excellent for transcribing audio files (MP3, M4A, etc.)",
			"One-time payment, no subscription",
			"Polished UI with timestamps and editing",
			"Multiple model sizes selectable",
		],
		theirWeaknesses: [
			"Not designed primarily for live dictation",
			"No AI cleanup — output keeps filler words ('um', 'uh')",
			"Limited custom vocabulary",
			"No global-hotkey paste-into-any-app workflow",
		],
		parrotWins: [
			{
				title: "Built for dictation, not transcription",
				body: "Parrot is designed around the live workflow: press hotkey, speak, transcript appears at cursor. MacWhisper is optimized for batch-transcribing audio files.",
			},
			{
				title: "AI cleanup",
				body: "Parrot removes filler words and applies your writing style automatically. MacWhisper outputs raw Whisper transcripts.",
			},
		],
		chooseParrotWhen: [
			"You want to dictate emails, code comments, or notes throughout the day",
			"You want filler words and grammar cleaned up automatically",
			"You want custom vocabulary to handle names and jargon",
		],
		chooseThemWhen: [
			"Your main job is transcribing recorded audio (interviews, podcasts, lectures)",
			"You don't need live dictation",
			"You want a one-time purchase tool",
		],
		keywords: [
			"macwhisper alternative",
			"macwhisper vs parrot",
			"parrot vs macwhisper",
			"mac whisper dictation",
		],
		faq: [
			{
				q: "Is Parrot a free MacWhisper alternative?",
				a: "Parrot and MacWhisper solve different problems. Parrot is for live dictation; MacWhisper is for transcribing audio files. If you want live dictation for free, Parrot is the answer.",
			},
			{
				q: "Can Parrot transcribe audio files like MacWhisper?",
				a: "Not currently — Parrot is focused on the live dictation workflow. For batch audio file transcription, MacWhisper or whisper.cpp directly are better tools.",
			},
		],
	},
	{
		slug: "dragon-professional",
		name: "Dragon Professional",
		shortName: "Dragon",
		tagline: "Enterprise dictation built for legal and medical fields",
		description:
			"Parrot vs Dragon Professional — modern AI-powered dictation versus the long-standing enterprise standard for legal and medical transcription.",
		heroVerdict:
			"Dragon is the gold standard for hour-a-day professional dictation in legal and medical settings, but it's expensive, dated, and the Mac version lags behind. Parrot is faster, free, and good enough for most users — but Dragon still wins on raw accuracy after extensive voice training.",
		pricing: {
			theirFree: null,
			theirPaid: "$699 one-time (Professional)",
			parrotPrice: "Free for life",
		},
		features: [
			{ name: "Price", parrot: "Free for life", them: "$699 one-time" },
			{ name: "Setup time", parrot: "5 min", them: "Hours of voice training" },
			{ name: "AI cleanup", parrot: true, them: "Manual rules" },
			{
				name: "Custom vocabulary",
				parrot: "Deep, fast to add",
				them: "Extensive but slow",
			},
			{ name: "Voice commands", parrot: false, them: true },
			{ name: "Mac native", parrot: true, them: "Limited (Windows-first)" },
			{ name: "Works offline", parrot: true, them: true },
			{ name: "Modern AI cleanup", parrot: true, them: false },
			{ name: "Recent updates", parrot: true, them: false },
		],
		theirStrengths: [
			"Industry-leading accuracy after voice training",
			"Extensive specialized vocabularies (legal, medical)",
			"Robust voice command system",
			"Long history in regulated industries",
		],
		theirWeaknesses: [
			"$699 one-time price",
			"Mac version historically lags behind Windows",
			"Requires significant training to reach peak accuracy",
			"Heavy software with dated interface",
			"No modern AI cleanup pass",
		],
		parrotWins: [
			{
				title: "Modern AI, no training needed",
				body: "Parrot uses Whisper plus an AI cleanup pass — no profile training, no read-aloud onboarding. You're dictating accurately within minutes.",
			},
			{
				title: "Free vs $699",
				body: "Parrot delivers 90%+ of Dragon's everyday accuracy at zero cost. For occasional dictators, Dragon's price is hard to justify.",
			},
			{
				title: "Native Mac, modern UI",
				body: "Parrot is built natively for Mac with a clean menu-bar interface. Dragon's Mac version has historically been a port of a Windows-first app.",
			},
		],
		chooseParrotWhen: [
			"You dictate occasionally to a few hours a day",
			"You don't have a $699 budget for dictation",
			"You're on Mac and don't want a Windows-first product",
			"You want modern AI cleanup, not rule-based correction",
		],
		chooseThemWhen: [
			"You dictate 4+ hours a day for legal or medical work",
			"You need extensive voice command macros",
			"Your firm or hospital already standardizes on Dragon",
			"You require very specific medical/legal terminology that Dragon's libraries cover",
		],
		keywords: [
			"dragon professional alternative",
			"dragon dictation vs parrot",
			"dragon naturally speaking alternative",
			"medical dictation alternative",
			"affordable dictation software",
		],
		faq: [
			{
				q: "Is Parrot a Dragon Professional alternative for medical dictation?",
				a: "For most general medical dictation, yes — Parrot's local mode keeps audio on-device (HIPAA-friendly) and AI cleanup handles formatting. For highly specialized terminology Dragon's medical vocabularies remain best-in-class.",
			},
			{
				q: "Can Parrot match Dragon's accuracy?",
				a: "On everyday speech, modern Whisper models are within a few percentage points of Dragon. On highly specialized vocabulary after extensive Dragon profile training, Dragon still leads. Most users won't notice the gap.",
			},
			{
				q: "Why is Parrot free when Dragon costs $699?",
				a: "Dragon's price reflects 30+ years of development and specialized vocabularies. Parrot rides on top of open-source Whisper + a cleanup model, so the marginal cost is zero — and we're a small team that doesn't need to monetize the core product.",
			},
		],
	},
];

export function getCompetitor(slug: string): Competitor | undefined {
	return competitors.find((c) => c.slug === slug);
}
