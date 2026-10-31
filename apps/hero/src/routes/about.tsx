import { createFileRoute, Link } from "@tanstack/react-router";
import Footer from "@/components/Footer";
import { ForestCTA } from "@/components/forest-cta";
import { PARROT_FACTS } from "@/lib/parrot-facts";

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
					alternateName: [...PARROT_FACTS.alternateNames],
					url: "https://tryparrot.app",
					description: PARROT_FACTS.entity,
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
			<section className="px-5 pt-[clamp(48px,7vw,88px)] pb-[clamp(56px,7vw,96px)]">
				<div className="max-w-3xl mx-auto">
					<h1 className="text-[clamp(2.6rem,5.2vw,4.1rem)] font-black text-foreground tracking-[-0.035em] leading-none text-balance mb-6">
						About Parrot.
						<br />
						Voice dictation, rebuilt.
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
						{PARROT_FACTS.entity} Press a hotkey, talk, and your words appear
						where your cursor is.
					</p>
				</div>
			</section>

			{/* ── The problem ── */}
			<section className="px-5 py-[clamp(72px,9vw,112px)] bg-band border-y border-line-soft">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-[clamp(2rem,4.4vw,3rem)] font-extrabold text-foreground tracking-[-0.028em] leading-[1.06] text-balance mb-8">
						The problem with dictation software
					</h2>
					<div className="grid md:grid-cols-3 gap-6">
						{[
							{
								label: "Lives in a browser",
								body: "Most dictation tools are web apps. You record in one tab, copy from another, paste into a third. Parrot runs natively and pastes directly where you're typing.",
							},
							{
								label: "Slow, fussy, or locked-in",
								body: "Many tools feel laggy, need constant connectivity, or gate the good stuff behind a subscription. Parrot is fast, fully local, and free for life on your Mac.",
							},
							{
								label: "Your audio, their servers",
								body: "Most tools upload your audio to process it. Parrot runs fully on-device — nothing leaves your Mac, ever.",
							},
						].map((item, i) => (
							<div key={i} className="surface p-6">
								<p className="text-lg font-bold text-foreground mb-2">
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
			<section className="px-5 py-[clamp(72px,9vw,112px)]">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-[clamp(2rem,4.4vw,3rem)] font-extrabold text-foreground tracking-[-0.028em] leading-[1.06] text-balance mb-10">
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
								title: "Fast and fully local",
								body: "Transcription and cleanup run entirely on your Mac — free for life. Snappy enough for daily work, private by design.",
							},
							{
								num: "03",
								title: "Cleanup that learns you",
								body: "An optional cleanup pass fixes grammar, removes filler words, and applies your custom vocabulary and writing style. The output reads like you wrote it, not dictated it.",
							},
							{
								num: "04",
								title: "Everything stays local",
								body: "History, settings, vocabulary — all stored in a local SQLite database. Your audio never leaves your Mac.",
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
			<section className="px-5 py-[clamp(64px,8vw,96px)] bg-band border-y border-line-soft">
				<div className="max-w-3xl mx-auto">
					<div className="grid sm:grid-cols-3 gap-6 text-center">
						<Link
							to="/download"
							className="group surface p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_1px_2px_rgba(27,46,27,0.06),0_22px_40px_-18px_rgba(27,46,27,0.32)] no-underline"
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
							className="group surface p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_1px_2px_rgba(27,46,27,0.06),0_22px_40px_-18px_rgba(27,46,27,0.32)] no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">Faster</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								v0.2 is out &rarr;
							</p>
						</Link>
						<Link
							to="/privacy"
							className="group surface p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_1px_2px_rgba(27,46,27,0.06),0_22px_40px_-18px_rgba(27,46,27,0.32)] no-underline"
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
			<section className="px-5 py-[clamp(72px,9vw,112px)] bg-band border-y border-line-soft">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-[clamp(2rem,4.4vw,3rem)] font-extrabold text-foreground tracking-[-0.028em] leading-[1.06] text-balance mb-10">
						Our principles
					</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						{[
							{
								title: "Your data is yours",
								body: "We don't want your audio or transcripts. Local mode keeps everything on your Mac — nothing is ever sent to our servers.",
							},
							{
								title: "Free means free",
								body: "Free for life — no word caps, no trial that expires, no feature paywall for the daily dictation loop.",
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
							<div key={i} className="surface p-6">
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
			<section className="px-5 py-[clamp(72px,9vw,112px)] bg-band border-y border-line-soft">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-[clamp(2rem,4.4vw,3rem)] font-extrabold text-foreground tracking-[-0.028em] leading-[1.06] text-balance mb-6">
						Kash Gohil
					</h2>
					<p className="text-base text-muted-foreground leading-relaxed mb-4 max-w-2xl">
						Software engineer focused on native macOS apps, on-device AI, and
						local-first software. Built Parrot after fighting with cloud
						dictation tools that were slow, leaky, or paywalled. Parrot is the
						dictation app I wanted to use every day - fast, private, and free.
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
			<section className="px-5 py-[clamp(72px,9vw,112px)]">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-[clamp(2rem,4.4vw,3rem)] font-extrabold text-foreground tracking-[-0.028em] leading-[1.06] text-balance mb-10">
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
								date: "Spring 2026",
								text: "Shipped a draggable HUD orb, dictation history with grouping and quick-copy, and steady polish across the app based on early-user feedback.",
							},
							{
								date: "Summer 2026",
								text: "v0.2 — much snappier dictation, sharper accuracy, live transcript preview, smarter vocabulary, and simpler setup.",
							},
							{
								date: "On the roadmap",
								text: "Cross-device sync, Windows support, and multi-lingual transcription.",
							},
						].map((item, i) => (
							<div key={i} className="relative flex gap-5 mb-8 last:mb-0">
								<div className="relative z-10 w-[15px] h-[15px] rounded-full bg-card border-2 border-primary shrink-0 mt-1" />
								<div>
									<p className="text-[13px] font-bold text-lime-text mb-1">
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

			{/* ── Footer ── */}
			<ForestCTA />
			<Footer />
		</div>
	);
}
