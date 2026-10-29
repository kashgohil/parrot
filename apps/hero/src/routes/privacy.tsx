import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, type LegalSection } from "@/components/legal-layout";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
	head: () => ({
		meta: [
			{ title: "Privacy Policy - Parrot" },
			{
				name: "description",
				content:
					"Parrot's privacy policy. Everything runs on-device. No cloud, no analytics, no tracking.",
			},
			{ property: "og:title", content: "Privacy Policy - Parrot" },
			{
				property: "og:description",
				content:
					"Parrot's privacy policy. Everything runs on-device. No cloud, no analytics, no tracking.",
			},
			{ property: "og:url", content: "https://tryparrot.app/privacy" },
			{ name: "twitter:title", content: "Privacy Policy - Parrot" },
			{
				name: "twitter:description",
				content:
					"Parrot's privacy policy. Everything runs on-device. No cloud, no analytics, no tracking.",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/privacy" }],
	}),
});

const SECTIONS: LegalSection[] = [
	{
		title: "On-device processing",
		paragraphs: [
			"All audio capture, transcription, and AI cleanup happen entirely on your Mac. No network requests are made during the dictation process.",
			"Your dictation history, custom vocabulary, writing style settings, and all preferences are stored in a SQLite database at ~/Library/Application Support/com.kash.parrot/parrot.db. This file never leaves your device.",
		],
	},
	{
		title: "No cloud, no accounts",
		paragraphs: [
			"Parrot does not offer cloud transcription, cloud history sync, or managed accounts. There is nothing to opt into on our servers — the product is local-only.",
			"You do not need an email, password, or third-party login to use Parrot.",
		],
	},
	{
		title: "Analytics and tracking",
		paragraphs: [
			"Parrot does not include any analytics SDK, telemetry, or tracking pixels. We don't know how often you use the app, what you dictate, or how long your recordings are.",
			"This website (the one you're reading) may use basic server logs (IP address, page visited) for operational purposes. We don't use third-party analytics services.",
		],
	},
	{
		title: "Data storage and deletion",
		paragraphs: [
			"All dictation data (history, audio references, transcriptions) is stored locally in your app's SQLite database. Deleting the app or the database file removes all data permanently.",
			"Audio is processed in memory. If you turn on Save audio recordings in Settings, the WAV files are kept on your Mac with your history, and you can delete them at any time.",
		],
	},
	{
		title: "Third-party services",
		paragraphs: [
			"Transcription and cleanup run entirely on your Mac. No audio or transcripts are sent to any third party for processing.",
			"Parrot connects to two kinds of outside services, and neither receives your audio or text. When you set up Parrot or switch models, it downloads model files from Hugging Face (Parakeet from blob.handy.computer). While it runs, it checks GitHub for app updates. Those services see your IP address and the files requested, under their own privacy policies.",
		],
	},
	{
		title: "Changes to this policy",
		paragraphs: [
			"If we change this policy, we'll update this page and note the date. For material changes, we'll mention it in the app's changelog. Last updated: October 2026.",
		],
	},
];

const SUMMARY = [
	"Dictation runs on your Mac. Your audio, transcripts, vocabulary and history never leave it.",
	"We don't collect what you dictate, and we don't sell any data.",
	"No account. No cloud processing. No third-party transcription APIs.",
	"Parrot goes online only to download the models you pick and to check for app updates.",
];

function PrivacyPage() {
	return (
		<LegalLayout
			eyebrow="Privacy"
			title="Your voice,"
			quiet="your data."
			lede="Parrot is built around a simple rule: your audio and transcriptions belong to you, not us."
			updated="October 2026"
			summary={SUMMARY}
			sections={SECTIONS}
		/>
	);
}
