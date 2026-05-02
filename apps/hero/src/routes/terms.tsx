import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";
import { SubscribeCTA } from "@/components/SubscribeCTA";

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

function TermsPage() {
	return (
		<div className="min-h-screen">
			{/* Hero */}
			<section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Legal
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5">
						Terms of Service
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
						The legal stuff. We've kept it readable.
					</p>
				</div>
			</section>

			{/* Content */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					{/* Last updated */}
					<div className="bg-muted/30 border border-border rounded-2xl p-6 md:p-7 mb-14">
						<p className="text-[14px] text-muted-foreground">
							<span className="font-semibold text-foreground">
								Last updated:
							</span>{" "}
							February 2026
						</p>
					</div>

					{/* Sections */}
					<div className="space-y-12">
						<TermsSection
							title="1. Acceptance of terms"
							paragraphs={[
								"By downloading, installing, or using Parrot (\"the Software\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Software.",
								"We may update these terms from time to time. Continued use of Parrot after changes constitutes acceptance of the new terms.",
							]}
						/>

						<TermsSection
							title="2. Description of service"
							paragraphs={[
								"Parrot is a voice dictation application for macOS that converts speech to text. The Software currently operates in local mode, with all processing performed on-device. A managed cloud mode is in development; additional terms will apply when it ships.",
								"We do not guarantee uninterrupted or error-free operation. Transcription accuracy depends on audio quality, accent, background noise, and other factors.",
							]}
						/>

						<TermsSection
							title="3. User responsibilities"
							paragraphs={[
								"You are responsible for all activity that occurs under any account you create.",
								"You agree not to use Parrot for any unlawful purpose or in any way that could damage, disable, or impair the Software or interfere with any other party's use.",
							]}
						/>

						<TermsSection
							title="4. Intellectual property"
							paragraphs={[
								"Parrot and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws.",
								"Your transcriptions and dictation content remain your property. We claim no ownership over content you create using the Software.",
							]}
						/>

						<TermsSection
							title="5. Privacy"
							paragraphs={[
								"Your privacy is important to us. Please review our Privacy Policy, which explains how we handle your data. In local mode, no data leaves your device.",
							]}
						/>

						<TermsSection
							title="6. Third-party software"
							paragraphs={[
								"Parrot's local mode runs entirely on your Mac and incorporates open-source components governed by their own licenses. Attribution and license details are bundled with the app.",
								"We are not responsible for the availability, accuracy, or policies of third-party software. Any issues with these projects should be directed to their maintainers.",
							]}
						/>

						<TermsSection
							title="7. Disclaimer of warranties"
							paragraphs={[
								"THE SOFTWARE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
								"We do not warrant that the Software will meet your requirements, operate without interruption, be error-free, or that defects will be corrected.",
							]}
						/>

						<TermsSection
							title="8. Limitation of liability"
							paragraphs={[
								"TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.",
								"Our total liability for any claims under these terms shall not exceed the amount you paid us in the twelve (12) months preceding the claim.",
							]}
						/>

						<TermsSection
							title="9. Subscription and payments"
							paragraphs={[
								"Parrot is currently free to use in local mode. If we offer paid features in the future (such as managed cloud transcription), payment terms, pricing, and billing cycles will be presented at the time of purchase.",
								"Any future subscriptions will renew automatically unless cancelled before the renewal date. Refunds, if applicable, will be handled on a case-by-case basis.",
							]}
						/>

						<TermsSection
							title="10. Termination"
							paragraphs={[
								"We reserve the right to suspend or terminate your access to Parrot at any time, with or without cause, with or without notice.",
								"Upon termination, your right to use the Software will immediately cease. Provisions that by their nature should survive termination shall survive.",
							]}
						/>

						<TermsSection
							title="11. Governing law"
							paragraphs={[
								"These terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.",
								"Any disputes arising from these terms or your use of the Software shall be resolved in the courts located in Delaware.",
							]}
						/>

						<TermsSection
							title="12. Contact"
							paragraphs={[
								"If you have questions about these Terms of Service, please contact us at hello@tryparrot.app.",
							]}
						/>
					</div>
				</div>
			</section>

			{/* Questions */}
			<section className="px-6 py-20 md:py-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Questions
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-4">
						Need clarification?
					</h2>
					<p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl mb-6">
						If you have questions about these terms, reach out to us. We're
						happy to explain anything.
					</p>
					<div className="flex flex-wrap gap-4">
						<a
							href="mailto:hello@tryparrot.app"
							className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/85 transition-colors no-underline"
						>
							Email us
							<ArrowRight size={16} strokeWidth={2.5} />
						</a>
						<Link
							to="/contact"
							className="inline-flex items-center gap-2 px-5 py-2.5 bg-muted text-foreground font-semibold rounded-xl hover:bg-muted/80 border border-border transition-colors no-underline"
						>
							All contact options
						</Link>
					</div>
				</div>
			</section>

			{/* CTA */}
			<SubscribeCTA
				heading="Stay in the loop."
				subheading="Subscribe for product updates and changelog notes."
				source="terms"
			/>

			<Footer />
		</div>
	);
}

function TermsSection({
	title,
	paragraphs,
}: {
	title: string;
	paragraphs: string[];
}) {
	return (
		<div>
			<h2 className="text-lg font-bold text-foreground tracking-tight mb-3">
				{title}
			</h2>
			<div className="space-y-3">
				{paragraphs.map((p, i) => (
					<p
						key={i}
						className="text-[15px] text-muted-foreground leading-relaxed"
					>
						{p}
					</p>
				))}
			</div>
		</div>
	);
}
