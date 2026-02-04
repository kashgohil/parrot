import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";
import { WaitlistCTA } from "@/components/WaitlistCTA";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
	head: () => ({
		meta: [
			{ title: "Privacy Policy — Parrot" },
			{
				name: "description",
				content:
					"Parrot's privacy policy. Local mode keeps everything on-device. No analytics, no tracking.",
			},
			{ property: "og:title", content: "Privacy Policy — Parrot" },
			{
				property: "og:description",
				content:
					"Parrot's privacy policy. Local mode keeps everything on-device. No analytics, no tracking.",
			},
			{ property: "og:url", content: "https://tryparrot.app/privacy" },
			{ name: "twitter:title", content: "Privacy Policy — Parrot" },
			{
				name: "twitter:description",
				content:
					"Parrot's privacy policy. Local mode keeps everything on-device. No analytics, no tracking.",
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
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Privacy
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						Your voice, your data.
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
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
								"Local mode: nothing leaves your Mac. Ever.",
								"Cloud mode: audio goes directly to your chosen provider with your API key. We never see it.",
								"We don't track what you dictate, store your audio, or sell any data.",
								"History, settings, and vocabulary are stored locally on your device.",
								"If you create an account, we store your email and hashed password. That's it.",
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
							title="Local mode"
							paragraphs={[
								"When you use local mode, all audio capture, transcription (Whisper.cpp), and AI cleanup (Ollama) happen entirely on your Mac. No network requests are made during the dictation process.",
								"Your dictation history, custom vocabulary, writing style settings, and all preferences are stored in a SQLite database at ~/Library/Application Support/com.kash.parrot/parrot.db. This file never leaves your device.",
							]}
						/>

						<PolicySection
							title="Cloud mode"
							paragraphs={[
								"When you use cloud mode, your recorded audio is sent directly from Parrot to the transcription provider you selected (OpenAI, Deepgram, or ElevenLabs) using your own API key. Parrot acts as a thin client — we do not proxy, store, or log this audio.",
								"If AI cleanup is enabled, the transcribed text (not the audio) is sent to your chosen LLM provider (e.g., OpenAI for GPT-4o-mini) for grammar and style correction. Again, this goes directly to the provider using your key.",
								"Each provider has their own privacy policy governing how they handle your data. We recommend reviewing them.",
							]}
						/>

						<PolicySection
							title="Accounts (optional)"
							paragraphs={[
								"Creating a Parrot account is optional. Local mode works without any account.",
								"If you create an account, we store: your email address, a hashed password (Argon2id), and your session token (30-day expiry). We do not store your API keys on our servers — those are kept locally on your device.",
								"Google OAuth: if you sign in with Google, we receive your email and name from Google's OAuth flow. We store only the email.",
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
								"If you have a Parrot account and want it deleted, email us and we'll remove it within 48 hours.",
							]}
						/>

						<PolicySection
							title="Third-party services"
							paragraphs={[
								"The only third-party services Parrot communicates with are the transcription and AI providers you explicitly configure: OpenAI, Deepgram, ElevenLabs, or Ollama (local). No data is sent anywhere else.",
							]}
						/>

						<PolicySection
							title="Changes to this policy"
							paragraphs={[
								"If we change this policy, we'll update this page and note the date. For material changes, we'll mention it in the app's changelog. Last updated: January 2026.",
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

			{/* ── CTA ── */}
			<WaitlistCTA
				heading="Privacy-first dictation"
				subheading="Try Parrot and see how voice dictation should work."
				source="privacy"
			/>

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

