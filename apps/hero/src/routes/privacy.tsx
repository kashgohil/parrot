import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";

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

function PrivacyPage() {
	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Privacy
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5">
						Your voice, your data.
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
						Parrot is built around a simple rule: your audio and
						transcriptions belong to you, not us.
					</p>
				</div>
			</section>

			{/* ── Content ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					{/* TLDR */}
					<div className="bg-primary/[0.04] border border-primary/15 rounded-2xl p-6 md:p-7 mb-14">
						<p className="text-[13px] font-bold text-primary uppercase tracking-wider mb-3">
							TL;DR
						</p>
						<ul className="space-y-2">
							{[
								"Everything runs on your Mac. Nothing leaves your device.",
								"We don't track what you dictate, store your audio, or sell any data.",
								"History, settings, and vocabulary are stored locally on your device.",
								"No account required. No cloud processing. No third-party transcription APIs.",
							].map((item, i) => (
								<li
									key={i}
									className="flex items-start gap-2.5 text-[15px] text-foreground"
								>
									<span className="w-1 h-1 rounded-full bg-primary mt-2.5 shrink-0" />
									{item}
								</li>
							))}
						</ul>
					</div>

					{/* Detailed sections */}
					<div className="space-y-12">
						<PolicySection
							title="On-device processing"
							paragraphs={[
								"All audio capture, transcription, and AI cleanup happen entirely on your Mac. No network requests are made during the dictation process.",
								"Your dictation history, custom vocabulary, writing style settings, and all preferences are stored in a SQLite database at ~/Library/Application Support/com.kash.parrot/parrot.db. This file never leaves your device.",
							]}
						/>

						<PolicySection
							title="No cloud, no accounts"
							paragraphs={[
								"Parrot does not offer cloud transcription, cloud history sync, or managed accounts. There is nothing to opt into on our servers — the product is local-only.",
								"You do not need an email, password, or third-party login to use Parrot.",
							]}
						/>

						<PolicySection
							title="Analytics and tracking"
							paragraphs={[
								"Parrot does not include any analytics SDK, telemetry, or tracking pixels. We don't know how often you use the app, what you dictate, or how long your recordings are.",
								"This website (the one you're reading) may use basic server logs (IP address, page visited) for operational purposes. We don't use third-party analytics services.",
							]}
						/>

						<PolicySection
							title="Data storage and deletion"
							paragraphs={[
								"All dictation data (history, audio references, transcriptions) is stored locally in your app's SQLite database. Deleting the app or the database file removes all data permanently.",
							]}
						/>

						<PolicySection
							title="Third-party services"
							paragraphs={[
								"Transcription and cleanup run entirely on your Mac. No audio or transcripts are sent to any third party for processing.",
							]}
						/>

						<PolicySection
							title="Changes to this policy"
							paragraphs={[
								"If we change this policy, we'll update this page and note the date. For material changes, we'll mention it in the app's changelog. Last updated: July 2026.",
							]}
						/>
					</div>
				</div>
			</section>

			{/* ── Contact ── */}
			<section className="px-6 py-20 md:py-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Questions
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-4">
						Need more info?
					</h2>
					<p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl mb-6">
						If you have questions about how Parrot handles your data, reach out
						to us. We're happy to clarify anything.
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

			<Footer />
		</div>
	);
}

function PolicySection({
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

