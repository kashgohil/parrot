import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/about")({
	component: AboutPage,
	head: () => ({
		meta: [
			{ title: "About Parrot — Native voice dictation for Mac" },
			{
				name: "description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
			},
			{ property: "og:title", content: "About Parrot — Native voice dictation for Mac" },
			{
				property: "og:description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
			},
			{ property: "og:url", content: "https://tryparrot.app/about" },
			{ name: "twitter:title", content: "About Parrot — Native voice dictation for Mac" },
			{
				name: "twitter:description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
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
						Typing is slow.
						<br />
						We fixed that.
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
						Parrot is a native Mac dictation app. Press a hotkey,
						talk, and your words appear where your cursor is. No
						browser tab, no subscription, no data on our servers.
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
								body: "Locked into whoever built the app. Parrot lets you pick: OpenAI Whisper, Deepgram, ElevenLabs, or local Whisper.cpp. Switch anytime.",
							},
							{
								label: "Your audio, their servers",
								body: "Most tools upload your audio to process it. Parrot's local mode means nothing ever leaves your Mac. Cloud mode uses your own API key directly.",
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
								body: "Parrot sits in your menu bar. A global hotkey starts recording from any app. The transcription is pasted at your cursor — no copy-paste, no switching windows.",
							},
							{
								num: "02",
								title: "You choose the engine",
								body: "Cloud users pick from Whisper, Deepgram, or ElevenLabs. Local users get Whisper.cpp running entirely on-device. You bring your own API key or use no key at all.",
							},
							{
								num: "03",
								title: "AI cleanup that learns you",
								body: "An optional LLM pass fixes grammar, removes filler words, and applies your custom vocabulary and writing style. The output reads like you wrote it, not dictated it.",
							},
							{
								num: "04",
								title: "Everything stays local",
								body: "History, settings, vocabulary — all stored in a local SQLite database. In local mode, your audio never touches a network. In cloud mode, it goes straight to your chosen provider.",
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
							to="/pricing"
							className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">Free</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								Local mode is free forever &rarr;
							</p>
						</Link>
						<Link
							to="/download"
							className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">&lt;1 min</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								Download and start dictating &rarr;
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

			{/* ── Tech stack ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-4xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Under the hood
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						Built with boring, reliable tech
					</h2>
					<div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
						{[
							["Desktop shell", "Tauri 2 — Rust backend, tiny binary, no Electron"],
							["Frontend", "React 19, Vite, TanStack Router"],
							["Audio capture", "cpal — cross-platform, low-latency"],
							["Transcription", "Whisper.cpp (local) or Whisper / Deepgram / ElevenLabs (cloud)"],
							["AI cleanup", "GPT-4o-mini (cloud) or Ollama (local)"],
							["Text insertion", "Clipboard write + enigo for auto-paste"],
							["Storage", "SQLite via rusqlite — history, settings, vocabulary"],
							["Styling", "Tailwind CSS 4 — utility-first, no runtime"],
						].map(([label, value]) => (
							<div key={label} className="flex flex-col">
								<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
									{label}
								</span>
								<span className="text-[15px] text-foreground">
									{value}
								</span>
							</div>
						))}
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
								text: "Started as a personal script to transcribe voice memos. Glued together Whisper and a clipboard hack.",
							},
							{
								date: "Mid 2025",
								text: "Rebuilt as a Tauri app. Added global hotkey, auto-paste, and support for multiple transcription providers.",
							},
							{
								date: "Late 2025",
								text: "Added AI cleanup with custom vocabulary and writing style. Introduced local mode with Whisper.cpp and Ollama.",
							},
							{
								date: "2026",
								text: "Launched publicly. Added dictation history, search, and the onboarding wizard.",
							},
						].map((item, i) => (
							<div
								key={i}
								className="relative flex gap-5 mb-8 last:mb-0"
							>
								<div className="relative z-10 w-[15px] h-[15px] rounded-full bg-card border-2 border-primary shrink-0 mt-1" />
								<div>
									<p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
										{item.date}
									</p>
									<p className="text-[15px] text-muted-foreground leading-relaxed">
										{item.text}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="px-6 py-20 md:py-28 bg-foreground">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-black text-background tracking-tight mb-4">
						Try it yourself
					</h2>
					<p className="text-background/50 mb-8 text-[15px]">
						Free download. No account for local mode. No catch.
					</p>
					<Link
						to="/download"
						className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 transition-colors no-underline shadow-[0_4px_20px_rgba(124,179,66,0.3)]"
					>
						Download for Mac
						<ArrowRight
							size={16}
							strokeWidth={2.5}
							className="transition-transform group-hover:translate-x-0.5"
						/>
					</Link>
				</div>
			</section>

			{/* ── Footer ── */}
			<Footer />
		</div>
	);
}

