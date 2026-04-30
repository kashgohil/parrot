import { createFileRoute, Link } from "@tanstack/react-router";
import Footer from "@/components/Footer";
import { SubscribeCTA } from "@/components/SubscribeCTA";

export const Route = createFileRoute("/about")({
	component: AboutPage,
	head: () => ({
		meta: [
			{ title: "About Parrot - Native voice dictation for Mac" },
			{
				name: "description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
			},
			{
				property: "og:title",
				content: "About Parrot - Native voice dictation for Mac",
			},
			{
				property: "og:description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
			},
			{ property: "og:url", content: "https://tryparrot.app/about" },
			{
				name: "twitter:title",
				content: "About Parrot - Native voice dictation for Mac",
			},
			{
				name: "twitter:description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
			},
			{
				property: "og:image",
				content: "https://tryparrot.app/og/about.png",
			},
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content: "About Parrot — Native Mac voice dictation",
			},
			{
				name: "twitter:image",
				content: "https://tryparrot.app/og/about.png",
			},
			{
				name: "twitter:image:alt",
				content: "About Parrot — Native Mac voice dictation",
			},
			{
				name: "keywords",
				content:
					"about Parrot, voice dictation app, native mac dictation, Tauri app, local-first privacy, AI cleanup, speech to text mac",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/about" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "Organization",
					name: "Parrot",
					url: "https://tryparrot.app",
					description:
						"Native Mac voice dictation app with AI cleanup, custom vocabulary, and local-first privacy.",
					logo: {
						"@type": "ImageObject",
						url: "https://tryparrot.app/parrot-transparent.png",
					},
					sameAs: ["https://x.com/tryparrot"],
					founder: {
						"@type": "Person",
						name: "Kash Gohil",
						url: "https://x.com/kashhh",
					},
					foundingDate: "2025",
					contactPoint: {
						"@type": "ContactPoint",
						email: "hello@tryparrot.app",
						contactType: "customer support",
					},
				}),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "Person",
					name: "Kash Gohil",
					url: "https://tryparrot.app/about",
					jobTitle: "Founder & Engineer",
					description:
						"Software engineer building Parrot, a native, local-first voice dictation app for Mac.",
					image: "https://tryparrot.app/parrot-transparent.png",
					worksFor: {
						"@type": "Organization",
						name: "Parrot",
						url: "https://tryparrot.app",
					},
					knowsAbout: [
						"Voice dictation",
						"Speech recognition",
						"Whisper",
						"Local-first software",
						"Native macOS apps",
						"Tauri",
						"Rust",
						"On-device AI",
					],
					sameAs: ["https://x.com/kashhh", "https://github.com/kashgohil"],
				}),
			},
		],
	}),
});

function AboutPage() {
	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						About
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						About Parrot.
						<br />
						Voice dictation, rebuilt.
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
						Parrot is a native Mac dictation app. Press a hotkey, talk, and your
						words appear where your cursor is.
					</p>
				</div>
			</section>

			{/* ── The problem ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						The problem with dictation software
					</h2>
					<div className="grid md:grid-cols-3 gap-6">
						{[
							{
								label: "Lives in a browser",
								body: "Most dictation tools are web apps. You record in one tab, copy from another, paste into a third. Parrot runs natively and pastes directly where you're typing.",
							},
							{
								label: "One engine, take it or leave it",
								body: "Locked into whoever built the app. Parrot ships with local mode today, running entirely on your Mac. A managed cloud mode is on the way for higher accuracy when you want it.",
							},
							{
								label: "Your audio, their servers",
								body: "Most tools upload your audio to process it. Parrot runs fully on-device — nothing leaves your Mac, ever.",
							},
						].map((item, i) => (
							<div key={i}>
								<p className="text-[13px] font-bold text-primary uppercase tracking-wider mb-2">
									{item.label}
								</p>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{item.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── What Parrot does differently ── */}
			<section className="px-6 py-20 md:py-28">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						How Parrot is different
					</h2>
					<div className="space-y-10">
						{[
							{
								num: "01",
								title: "Native and invisible",
								body: "Parrot sits in your menu bar. A global hotkey starts recording from any app. The transcription is pasted at your cursor - no copy-paste, no switching windows.",
							},
							{
								num: "02",
								title: "Local today, cloud soon",
								body: "Local mode runs entirely on-device — free, for life. A managed cloud mode is coming soon for higher accuracy and cross-device sync.",
							},
							{
								num: "03",
								title: "Cleanup that learns you",
								body: "An optional cleanup pass fixes grammar, removes filler words, and applies your custom vocabulary and writing style. The output reads like you wrote it, not dictated it.",
							},
							{
								num: "04",
								title: "Everything stays local",
								body: "In local mode, History, settings, vocabulary - all stored in a local SQLite database. Your audio never leaves your Mac.",
							},
						].map((item) => (
							<div key={item.num} className="flex gap-6">
								<span className="text-3xl font-black text-border/80 shrink-0 leading-none pt-1">
									{item.num}
								</span>
								<div>
									<h3 className="text-lg font-bold text-foreground mb-1.5">
										{item.title}
									</h3>
									<p className="text-[15px] text-muted-foreground leading-relaxed">
										{item.body}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── How it compares ── */}
			<section className="px-6 py-16 bg-card border-y border-border">
				<div className="max-w-3xl mx-auto">
					<div className="grid sm:grid-cols-3 gap-6 text-center">
						<Link
							to="/download"
							className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">
								Free for life
							</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								Local mode, no account &rarr;
							</p>
						</Link>
						<Link
							to="/changelog"
							className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">Soon</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								Managed cloud mode &rarr;
							</p>
						</Link>
						<Link
							to="/privacy"
							className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">Zero</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								Data on our servers &rarr;
							</p>
						</Link>
					</div>
				</div>
			</section>

			{/* ── Principles ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						What we believe
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						Our principles
					</h2>
					<div className="space-y-8">
						{[
							{
								title: "Your data is yours",
								body: "We don't want your audio or transcripts. Local mode keeps everything on your Mac — nothing is ever sent to our servers.",
							},
							{
								title: "Choice over lock-in",
								body: "Local mode is free for life. When managed cloud lands, you'll be able to flip between them anytime in settings — no vendor lock-in, no data migration headaches.",
							},
							{
								title: "Simple beats clever",
								body: "Press a hotkey, talk, see your words. No browser tabs, no copy-paste dance, no learning curve. The best tool is the one you don't have to think about.",
							},
							{
								title: "Works where you work",
								body: "Parrot pastes into any app - email, Slack, your IDE, medical records, legal docs. One tool for everything, not a different integration for each workflow.",
							},
						].map((item, i) => (
							<div key={i} className="border-l-2 border-primary/30 pl-5">
								<h3 className="text-lg font-bold text-foreground mb-1.5">
									{item.title}
								</h3>
								<p className="text-base text-muted-foreground leading-relaxed">
									{item.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Built by ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Built by
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-6">
						Kash Gohil
					</h2>
					<p className="text-base text-muted-foreground leading-relaxed mb-4 max-w-2xl">
						Software engineer focused on native macOS apps, on-device AI, and
						local-first software. Built Parrot after years of fighting with
						cloud dictation tools that were slow, leaky, or paywalled. Parrot is
						the dictation app I wanted to use every day — fast, private, and
						free.
					</p>
					<p className="text-base text-muted-foreground leading-relaxed mb-6 max-w-2xl">
						I write Parrot in Rust (Tauri) and TypeScript, and I publish guides
						on voice dictation, Whisper, and local-first software on the{" "}
						<Link to="/blog">blog</Link>.
					</p>
					<div className="flex flex-wrap gap-3 text-sm">
						<a
							href="https://x.com/kashhh"
							className="px-4 py-2 rounded-lg border border-border hover:border-primary/30 transition-colors no-underline"
							rel="noopener noreferrer"
							target="_blank"
						>
							X / Twitter
						</a>
						<a
							href="https://github.com/kashgohil"
							className="px-4 py-2 rounded-lg border border-border hover:border-primary/30 transition-colors no-underline"
							rel="noopener noreferrer"
							target="_blank"
						>
							GitHub
						</a>
						<Link
							to="/contact"
							className="px-4 py-2 rounded-lg border border-border hover:border-primary/30 transition-colors no-underline"
						>
							Contact
						</Link>
					</div>
				</div>
			</section>

			{/* ── Timeline ── */}
			<section className="px-6 py-20 md:py-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Journey
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						How we got here
					</h2>
					<div className="relative">
						<div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
						{[
							{
								date: "Early 2025",
								text: "Started as a personal script to transcribe voice memos. Glued together a transcription engine and a clipboard hack.",
							},
							{
								date: "Mid 2025",
								text: "Rebuilt it as a Mac app. Added global hotkey, auto-paste, and support for multiple transcription providers.",
							},
							{
								date: "Late 2025",
								text: "Added cleanup engine with custom vocabulary and writing style. Introduced fully on-device local mode.",
							},
							{
								date: "Early 2026",
								text: "Launched publicly with local mode — on-device transcription and cleanup, custom vocabulary, dictation history, and the onboarding wizard. Free, for life.",
							},
							{
								date: "Coming soon",
								text: "Managed cloud mode — higher accuracy, AI cleanup, and cross-device sync.",
							},
						].map((item, i) => (
							<div key={i} className="relative flex gap-5 mb-8 last:mb-0">
								<div className="relative z-10 w-[15px] h-[15px] rounded-full bg-card border-2 border-primary shrink-0 mt-1" />
								<div>
									<p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
										{item.date}
									</p>
									<p className="text-base text-muted-foreground leading-relaxed">
										{item.text}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── CTA ── */}
			<SubscribeCTA
				heading="Stay in the loop."
				subheading="Local mode is available today — download free, for life. Subscribe to get notified when managed cloud mode lands."
				source="about"
			/>

			{/* ── Footer ── */}
			<Footer />
		</div>
	);
}
