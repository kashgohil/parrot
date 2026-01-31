import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Monitor,
	Cloud,
	ArrowRight,
	Apple,
	Command,
} from "lucide-react";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/download")({
	component: DownloadPage,
	head: () => ({
		meta: [
			{ title: "Download Parrot for Mac" },
			{
				name: "description",
				content:
					"Download Parrot and start dictating in under a minute. macOS 12+ required.",
			},
			{ property: "og:title", content: "Download Parrot for Mac" },
			{
				property: "og:description",
				content:
					"Download Parrot and start dictating in under a minute. macOS 12+ required.",
			},
			{ property: "og:url", content: "https://tryparrot.app/download" },
			{ name: "twitter:title", content: "Download Parrot for Mac" },
			{
				name: "twitter:description",
				content:
					"Download Parrot and start dictating in under a minute. macOS 12+ required.",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/download" }],
	}),
});

function DownloadPage() {
	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28">
				<div className="max-w-2xl mx-auto text-center">
					<div className="animate-fade-in-up">
						<img
							src="/parrot-transparent.png"
							alt="Parrot"
							className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 drop-shadow-lg"
						/>
					</div>

					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-4 animate-fade-in-up-delay-1">
						Get Parrot
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-md mx-auto animate-fade-in-up-delay-2">
						Free download. Works immediately in local mode — no
						account, no API key, no setup.
					</p>

					<div className="animate-fade-in-up-delay-3">
						<a
							href="#"
							className="group inline-flex items-center gap-3 px-9 py-4 bg-foreground text-background font-bold rounded-2xl transition-all hover:bg-foreground/85 shadow-[0_2px_12px_rgba(0,0,0,0.12)] text-lg no-underline"
						>
							<Apple size={20} />
							Download for macOS
							<ArrowRight
								size={16}
								strokeWidth={2.5}
								className="transition-transform group-hover:translate-x-0.5"
							/>
						</a>
						<div className="flex items-center justify-center gap-3 mt-5 text-xs text-muted-foreground">
							<span>macOS 12+</span>
							<span className="w-1 h-1 rounded-full bg-border" />
							<span>Apple Silicon & Intel</span>
							<span className="w-1 h-1 rounded-full bg-border" />
							<span>Free</span>
						</div>
					</div>
				</div>
			</section>

			{/* ── Setup steps ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-2xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Getting started
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						Three steps. Under a minute.
					</h2>

					<div className="space-y-6">
						{[
							{
								num: "1",
								title: "Install",
								desc: "Open the .dmg, drag Parrot to Applications, launch it. It appears in your menu bar.",
							},
							{
								num: "2",
								title: "Pick your mode",
								desc: "The setup wizard asks one question: local or cloud? Local downloads Whisper.cpp (~4GB, once). Cloud asks for an API key.",
							},
							{
								num: "3",
								title: "Start talking",
								desc: "Press Cmd+Shift+Space to record. Press again to stop. Your transcription appears where your cursor is.",
							},
						].map((item) => (
							<div
								key={item.num}
								className="flex gap-5"
							>
								<span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
									{item.num}
								</span>
								<div>
									<h3 className="text-base font-bold text-foreground mb-1">
										{item.title}
									</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{item.desc}
									</p>
								</div>
							</div>
						))}
					</div>

					{/* Hotkey hint */}
					<div className="mt-10 pt-8 border-t border-border flex items-center gap-4">
						<div className="flex items-center gap-1">
							<kbd className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] font-bold text-foreground/60">
								<Command
									size={10}
									className="inline -mt-px"
								/>
							</kbd>
							<kbd className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] font-bold text-foreground/60">
								Shift
							</kbd>
							<kbd className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] font-bold text-foreground/60">
								Space
							</kbd>
						</div>
						<span className="text-xs text-muted-foreground">
							Default hotkey — customizable in settings
						</span>
					</div>
				</div>
			</section>

			{/* ── Local vs Cloud ── */}
			<section className="px-6 py-20 md:py-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Choose your mode
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						Both are free. Both work great.
					</h2>

					<div className="grid sm:grid-cols-2 gap-5">
						<div className="border border-border rounded-2xl bg-card p-6">
							<div className="flex items-center gap-3 mb-4">
								<Monitor className="w-5 h-5 text-primary" />
								<h3 className="text-lg font-bold text-foreground">
									Local
								</h3>
							</div>
							<p className="text-sm text-muted-foreground leading-relaxed mb-4">
								Whisper.cpp + Ollama running on your Mac. Audio
								never leaves your device. Works offline.
							</p>
							<div className="space-y-2">
								{[
									"Complete privacy",
									"No API keys or accounts",
									"~4GB one-time model download",
								].map((item, i) => (
									<p
										key={i}
										className="flex items-start gap-2 text-sm text-foreground"
									>
										<span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
										{item}
									</p>
								))}
							</div>
						</div>
						<div className="border border-border rounded-2xl bg-card p-6">
							<div className="flex items-center gap-3 mb-4">
								<Cloud className="w-5 h-5 text-primary" />
								<h3 className="text-lg font-bold text-foreground">
									Cloud
								</h3>
							</div>
							<p className="text-sm text-muted-foreground leading-relaxed mb-4">
								Whisper, Deepgram, or ElevenLabs via API. Instant
								setup, fastest speed, minimal disk usage.
							</p>
							<div className="space-y-2">
								{[
									"Ready in seconds",
									"Best transcription accuracy",
									"Pay provider directly (~$0.006/min)",
								].map((item, i) => (
									<p
										key={i}
										className="flex items-start gap-2 text-sm text-foreground"
									>
										<span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
										{item}
									</p>
								))}
							</div>
						</div>
					</div>
					<p className="text-center text-xs text-muted-foreground mt-6">
						Switch between modes anytime in settings. No data
						migration needed.
					</p>
				</div>
			</section>

			{/* ── Why Parrot over alternatives ── */}
			<section className="px-6 py-20 md:py-28 bg-card border-y border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Why Parrot
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						Dictation software that respects your time and data
					</h2>
					<div className="space-y-6">
						{[
							{
								title: "No browser required",
								body: "Most dictation tools live in a browser tab. Parrot is a native Mac app — press a hotkey from any app and your words appear at your cursor. No tab switching, no copy-paste.",
							},
							{
								title: "Your choice of AI engine",
								body: "Not locked into one provider. Use OpenAI Whisper for accuracy, Deepgram for speed, ElevenLabs for multilingual, or Whisper.cpp for complete privacy. Switch anytime in settings.",
							},
							{
								title: "Built with Rust, not Electron",
								body: "Parrot uses Tauri 2, which means a ~15MB binary, minimal RAM usage, and native macOS integration. It runs in the background without slowing your machine down.",
							},
						].map((item, i) => (
							<div key={i}>
								<h3 className="text-base font-bold text-foreground mb-1.5">
									{item.title}
								</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{item.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── System requirements ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-2xl mx-auto">
					<h2 className="text-xl font-bold text-foreground tracking-tight mb-6">
						System requirements
					</h2>
					<div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
						{[
							["OS", "macOS 12 (Monterey) or later"],
							["Architecture", "Apple Silicon or Intel x64"],
							["Disk (cloud mode)", "~50MB"],
							["Disk (local mode)", "~4GB for models"],
							["RAM", "4GB minimum, 8GB recommended for local"],
							["Network", "Required for cloud, optional for local"],
						].map(([label, value]) => (
							<div key={label}>
								<p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
									{label}
								</p>
								<p className="text-[15px] text-foreground">
									{value}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Related links ── */}
			<section className="px-6 py-14 text-center">
				<h2 className="text-lg font-bold text-foreground tracking-tight mb-6">
					Learn more about Parrot
				</h2>
				<div className="flex flex-wrap items-center justify-center gap-6 text-sm">
					<Link
						to="/"
						className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
					>
						Features overview &rarr;
					</Link>
					<Link
						to="/about"
						className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
					>
						How it works &rarr;
					</Link>
					<Link
						to="/pricing"
						className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
					>
						Pricing plans &rarr;
					</Link>
					<Link
						to="/changelog"
						className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
					>
						Latest updates &rarr;
					</Link>
					<Link
						to="/privacy"
						className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
					>
						Privacy policy &rarr;
					</Link>
				</div>
			</section>

			<Footer />
		</div>
	);
}

