import { getCompetitor } from "./competitors";
import { PARROT_FACTS } from "./parrot-facts";

/**
 * Homepage FAQ: the single source for the visible section, the FAQPage JSON-LD
 * in routes/index.tsx and the homepage FAQ in llms-full.txt (scripts/generate-seo.ts).
 * Answers are plain text so every consumer can use them as-is; each one is
 * checked against apps/desktop (see ISSUE-1335 and ISSUE-1337).
 */
export type HomeFaq = { q: string; a: string };

const wispr = getCompetitor("wispr-flow");
const superwhisper = getCompetitor("superwhisper");
if (!wispr || !superwhisper)
	throw new Error("competitors.ts is missing an entry");

export const HOME_FAQ: readonly HomeFaq[] = [
	{
		q: "Does Parrot work offline?",
		a: "Yes. During setup Parrot downloads the speech and cleanup models you choose. After that, recording, transcription and cleanup all run on your Mac with no internet, no account and no API keys. When you are online, Parrot also checks GitHub for app updates.",
	},
	{
		q: "Does my voice leave my Mac?",
		a: "No. Audio, transcripts, vocabulary and history stay on your Mac, and recordings are kept only if you turn on Save audio. The only network requests Parrot makes are model downloads and the update check.",
	},
	{
		q: "Which Macs does it run on?",
		a: `Macs with ${PARROT_FACTS.osRequirement}. Intel Macs are not supported.`,
	},
	{
		q: "Is it actually free?",
		a: `Yes, ${PARROT_FACTS.price.toLowerCase()}, with no word limit and no subscription. Everything runs on your Mac, so there is no server bill to pass on. For comparison, Wispr Flow Pro is ${wispr.pricing.theirPaid} and Superwhisper Pro is ${superwhisper.pricing.theirPaid} (prices checked ${wispr.pricesCheckedOn}).`,
	},
	{
		q: "Which languages work?",
		a: "Parakeet, the default speech model, detects 25 European languages, including English, on its own. Whisper turbo covers 100 languages, including Hindi, and has an experimental mode for mixed Hindi and English. Accuracy can drop when you switch languages within one recording.",
	},
	{
		q: "What does cleanup change?",
		a: "It removes clear filler like um and uh, resolves corrections you make out loud, fixes punctuation and capitals, and follows your vocabulary and writing style. It keeps your words and your language. You can turn it off, or have Parrot paste first and clean up in the background.",
	},
	{
		q: "Can I use my own model?",
		a: "Yes. If you run Ollama, point Parrot's cleanup at any model you have installed. Parrot talks to Ollama on your Mac, not over the internet.",
	},
];
