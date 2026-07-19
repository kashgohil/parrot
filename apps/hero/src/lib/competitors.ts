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
	/** Month competitor pricing was last verified, e.g. "July 2026". */
	pricesCheckedOn: string;
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
		pricesCheckedOn: "July 2026",
		features: [
			{ name: "Price", parrot: "Free for life", them: "Free tier / $15/mo" },
			{ name: "Word caps", parrot: "None", them: "Weekly cap on free tier" },
			{ name: "Local-first option", parrot: true, them: false },
			{ name: "On-device transcription", parrot: true, them: false },
			{ name: "AI cleanup", parrot: true, them: true },
			{ name: "Custom vocabulary", parrot: "Deep", them: "Limited" },
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
				body: "Your microphone audio never leaves your Mac. Wispr Flow processes audio in the cloud — a non-starter for HIPAA-covered, legal, or finance work.",
			},
			{
				title: "Fast enough for daily work",
				body: "Snappy time-to-text with strong first-pass accuracy — so you dictate more and fix less.",
			},
			{
				title: "Deeper vocabulary control",
				body: "Custom words, writing style, and context that move the needle on accuracy for technical or domain-specific dictation.",
			},
		],
		chooseParrotWhen: [
			"You're on Mac and want to stop paying monthly for dictation",
			"You handle sensitive content (medical, legal, financial, internal)",
			"You hit Wispr Flow's free-tier word cap regularly",
			"You travel and need dictation that works on planes and bad Wi-Fi",
		],
		chooseThemWhen: [
			"You need Windows support (Parrot is Mac-only today)",
			"You're already deep into Wispr Flow's workflow and free tier covers your usage",
			"You strongly prefer cloud-managed tooling",
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
				a: "Yes. Parrot is free for life with no word caps — unlimited on-device dictation, no account required.",
			},
			{
				q: "Can Parrot do everything Wispr Flow does?",
				a: "On Mac, yes for the daily loop — global hotkey, AI-cleaned transcription, paste at cursor, custom vocabulary. The two main gaps are Windows support (Parrot is Mac-only) and Wispr's account-synced history across devices.",
			},
			{
				q: "Why is Parrot free when Wispr Flow charges?",
				a: "Parrot runs entirely on your Mac, so there are no per-minute server costs to recoup. Unlimited local dictation stays free.",
			},
			{
				q: "How does accuracy compare?",
				a: "On everyday speech, Parrot is competitive for the daily dictation loop — strong first-pass accuracy plus optional cleanup. Wispr may still edge ahead on very noisy audio or heavy accents in some cases.",
			},
		],
	},
	{
		slug: "superwhisper",
		name: "Superwhisper",
		shortName: "Superwhisper",
		tagline: "Mac-native dictation with local models",
		description:
			"Parrot vs Superwhisper — comparing two Mac-native voice dictation apps on price, features, and AI cleanup quality.",
		heroVerdict:
			"Both apps run locally on Mac and have similar workflows. Pick Parrot if you want a fully free option with no subscription. Pick Superwhisper if you specifically want their voice command features and don't mind a monthly fee.",
		pricing: {
			theirFree: "Limited free tier",
			theirPaid: "$8.49/mo Pro",
			parrotPrice: "Free for life",
		},
		pricesCheckedOn: "July 2026",
		features: [
			{ name: "Price", parrot: "Free for life", them: "$8.49/mo Pro" },
			{ name: "Fully local", parrot: true, them: true },
			{ name: "AI cleanup", parrot: "Free", them: "Pro only" },
			{ name: "Custom vocabulary", parrot: "Deep", them: "Yes" },
			{ name: "Voice commands", parrot: false, them: true },
			{ name: "Mac (Apple Silicon)", parrot: true, them: true },
			{ name: "Windows", parrot: false, them: false },
			{ name: "Works offline", parrot: true, them: true },
			{ name: "Native menu-bar app", parrot: true, them: true },
		],
		theirStrengths: [
			"Voice commands for app actions (open, navigate, etc.)",
			"Mature Mac-native experience",
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
				title: "Fast everyday dictation",
				body: "Parrot is tuned for the daily hotkey loop: snappy time-to-text and strong first-pass accuracy without a paid tier.",
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
				q: "How does accuracy compare?",
				a: "Both apps are strong on-device. Parrot leans hard into first-pass accuracy for everyday dictation and proper nouns, plus an optional cleanup pass for filler and style — without a paid tier for the basics.",
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
			theirPaid: "€59 one-time (Pro)",
			parrotPrice: "Free for life",
		},
		pricesCheckedOn: "July 2026",
		features: [
			{ name: "Price", parrot: "Free for life", them: "€59 one-time" },
			{
				name: "Live dictation (hotkey + paste)",
				parrot: true,
				them: "Limited",
			},
			{ name: "Audio file transcription", parrot: true, them: true },
			{ name: "AI cleanup", parrot: true, them: false },
			{ name: "Custom vocabulary", parrot: "Deep", them: "Limited" },
			{ name: "Fully local", parrot: true, them: true },
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
				title: "Built for dictation first",
				body: "Parrot is designed around the live workflow: press hotkey, speak, transcript appears at cursor. You can still drop in a file when you need a batch transcript.",
			},
			{
				title: "AI cleanup",
				body: "Parrot removes filler words and applies your writing style automatically. MacWhisper leaves you with raw transcripts.",
			},
		],
		chooseParrotWhen: [
			"You want to dictate emails, code comments, or notes throughout the day",
			"You want filler words and grammar cleaned up automatically",
			"You want custom vocabulary to handle names and jargon",
		],
		chooseThemWhen: [
			"Your main job is batch-transcribing long recordings with a specialized editor UI",
			"You don't need live dictation or AI cleanup",
			"You want a one-time purchase tool focused only on files",
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
				a: "If you want free live dictation with AI cleanup, yes. MacWhisper is still strong if you mostly live in a file-transcription editor — Parrot is built for the daily hotkey workflow first.",
			},
			{
				q: "Can Parrot transcribe audio files like MacWhisper?",
				a: "Yes. Drop a file onto History or pick one from the app — Parrot transcribes it locally. Live hotkey dictation is still the main experience.",
			},
		],
	},
	{
		slug: "dragon-professional",
		name: "Dragon Professional",
		shortName: "Dragon",
		tagline: "Enterprise dictation built for legal and medical fields",
		description:
			"Parrot vs Dragon Professional — free, Mac-native AI dictation versus the Windows-only enterprise standard for legal and medical transcription. Dragon no longer ships a Mac version.",
		heroVerdict:
			"Dragon is the gold standard for hour-a-day professional dictation in legal and medical settings, but it's expensive and Windows-only — Nuance discontinued Dragon for Mac in 2018, so there's no current Mac version at any price. On a Mac, Parrot is the practical choice: free, fast, and good enough for most work. Dragon still wins on raw accuracy after extensive voice training, but only if you're on Windows.",
		pricing: {
			theirFree: null,
			theirPaid: "$699 one-time (Professional)",
			parrotPrice: "Free for life",
		},
		pricesCheckedOn: "July 2026",
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
			{ name: "Runs on Mac", parrot: true, them: "No (Windows only)" },
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
			"No Mac version — Windows-only since Dragon for Mac was discontinued in 2018",
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
				title: "Actually runs on Mac",
				body: "Parrot is built natively for Mac with a clean menu-bar interface. Dragon has no Mac version at all — Nuance discontinued Dragon for Mac in 2018, so Mac users would need Windows or a virtual machine to run it.",
			},
		],
		chooseParrotWhen: [
			"You're on a Mac — Dragon no longer ships a Mac version at all",
			"You dictate occasionally to a few hours a day",
			"You don't have a $699 budget for dictation",
			"You want modern AI cleanup, not rule-based correction",
		],
		chooseThemWhen: [
			"You're on Windows (Dragon is Windows-only) and dictate 4+ hours a day for legal or medical work",
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
				q: "Does Dragon Professional work on Mac?",
				a: "No. Nuance discontinued Dragon for Mac in 2018, and the current Dragon Professional (v16) is Windows-only. On a Mac your realistic options are a Mac-native dictation app like Parrot, or running Dragon inside a Windows virtual machine.",
			},
			{
				q: "Is Parrot a Dragon Professional alternative for medical dictation?",
				a: "For most general medical dictation, yes — Parrot's local mode keeps audio on-device (HIPAA-friendly) and AI cleanup handles formatting. For highly specialized terminology Dragon's medical vocabularies remain best-in-class. Note Dragon is Windows-only, so on a Mac Parrot is the native option.",
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
