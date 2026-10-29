import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, type LegalSection } from "@/components/legal-layout";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
	head: () => ({
		meta: [
			{ title: "Terms of Service - Parrot" },
			{
				name: "description",
				content:
					"Terms and conditions for using Parrot voice dictation software.",
			},
			{ property: "og:title", content: "Terms of Service - Parrot" },
			{
				property: "og:description",
				content:
					"Terms and conditions for using Parrot voice dictation software.",
			},
			{ property: "og:url", content: "https://tryparrot.app/terms" },
			{ name: "twitter:title", content: "Terms of Service - Parrot" },
			{
				name: "twitter:description",
				content:
					"Terms and conditions for using Parrot voice dictation software.",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/terms" }],
	}),
});

const SECTIONS: LegalSection[] = [
	{
		title: "1. Acceptance of terms",
		paragraphs: [
			'By downloading, installing, or using Parrot ("the Software"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Software.',
			"We may update these terms from time to time. Continued use of Parrot after changes constitutes acceptance of the new terms.",
		],
	},
	{
		title: "2. Description of service",
		paragraphs: [
			"Parrot is a voice dictation application for macOS that converts speech to text. All processing is performed on-device on your Mac. Parrot does not provide cloud transcription or managed server-side accounts.",
			"We do not guarantee uninterrupted or error-free operation. Transcription accuracy depends on audio quality, accent, background noise, and other factors.",
		],
	},
	{
		title: "3. User responsibilities",
		paragraphs: [
			"You are responsible for how you use the Software and for content you create with it.",
			"You agree not to use Parrot for any unlawful purpose or in any way that could damage, disable, or impair the Software or interfere with any other party's use.",
		],
	},
	{
		title: "4. Intellectual property",
		paragraphs: [
			"Parrot and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws.",
			"Your transcriptions and dictation content remain your property. We claim no ownership over content you create using the Software.",
		],
	},
	{
		title: "5. Privacy",
		paragraphs: [
			"Your privacy is important to us. Please review our Privacy Policy, which explains how we handle your data. No dictation data leaves your device.",
		],
	},
	{
		title: "6. Third-party software",
		paragraphs: [
			"Parrot runs entirely on your Mac and incorporates open-source components governed by their own licenses. Attribution and license details are bundled with the app.",
			"We are not responsible for the availability, accuracy, or policies of third-party software. Any issues with these projects should be directed to their maintainers.",
		],
	},
	{
		title: "7. Disclaimer of warranties",
		paragraphs: [
			'THE SOFTWARE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
			"We do not warrant that the Software will meet your requirements, operate without interruption, be error-free, or that defects will be corrected.",
		],
	},
	{
		title: "8. Limitation of liability",
		paragraphs: [
			"TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.",
			"Our total liability for any claims under these terms shall not exceed the amount you paid us in the twelve (12) months preceding the claim.",
		],
	},
	{
		title: "9. Price",
		paragraphs: [
			"Parrot is free to download and use. There is no subscription, trial, or in-app purchase required for the local product described in these terms.",
		],
	},
	{
		title: "10. Termination",
		paragraphs: [
			"You may stop using the Software at any time by uninstalling it from your Mac.",
			"We reserve the right to discontinue distribution of the Software. Provisions of these terms that by their nature should survive shall survive.",
		],
	},
	{
		title: "11. Governing law",
		paragraphs: [
			"These terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.",
			"Any disputes arising from these terms or your use of the Software shall be resolved in the courts located in Delaware.",
		],
	},
	{
		title: "12. Contact",
		paragraphs: [
			"If you have questions about these Terms of Service, please contact us at hello@tryparrot.app.",
		],
	},
];

function TermsPage() {
	return (
		<LegalLayout
			eyebrow="Legal"
			title="Terms of Service."
			quiet="Kept readable."
			lede="The legal terms for using Parrot."
			updated="July 2026"
			sections={SECTIONS}
		/>
	);
}
