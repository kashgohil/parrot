import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/changelog")({
	component: ChangelogPage,
	head: () => ({
		meta: [
			{ title: "Changelog — Parrot" },
			{
				name: "description",
				content:
					"See what's new in Parrot. Release notes and version history.",
			},
			{ property: "og:title", content: "Changelog — Parrot" },
			{
				property: "og:description",
				content:
					"See what's new in Parrot. Release notes and version history.",
			},
			{ property: "og:url", content: "https://tryparrot.app/changelog" },
			{ name: "twitter:title", content: "Changelog — Parrot" },
			{
				name: "twitter:description",
				content:
					"See what's new in Parrot. Release notes and version history.",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/changelog" }],
	}),
});

const RELEASES = [
	{
		version: "1.2.0",
		date: "January 2026",
		tag: "Latest",
		changes: [
			{
				type: "added",
				items: [
					"Dictation history with full-text search",
					"Onboarding wizard for first-time setup",
					"Audio duration shown in history entries",
				],
			},
			{
				type: "improved",
				items: [
					"Faster local transcription on Apple Silicon (M-series)",
					"Reduced memory usage during long recordings",
				],
			},
			{
				type: "fixed",
				items: [
					"Auto-paste not working in some Electron-based apps",
					"Custom hotkey not persisting after restart",
				],
			},
		],
	},
	{
		version: "1.1.0",
		date: "November 2025",
		changes: [
			{
				type: "added",
				items: [
					"ElevenLabs as a transcription provider",
					"Writing style and context settings for AI cleanup",
					"Export history as plain text or JSON",
				],
			},
			{
				type: "improved",
				items: [
					"AI cleanup now applies custom vocabulary more consistently",
					"Settings UI redesigned for clarity",
				],
			},
		],
	},
	{
		version: "1.0.0",
		date: "September 2025",
		changes: [
			{
				type: "added",
				items: [
					"Initial release",
					"Global hotkey recording (Cmd+Shift+Space)",
					"OpenAI Whisper and Deepgram transcription",
					"Whisper.cpp local transcription",
					"AI cleanup with GPT-4o-mini and Ollama",
					"Custom vocabulary support",
					"Auto-paste to cursor via enigo",
					"Local SQLite history and settings",
				],
			},
		],
	},
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
	added: { label: "Added", color: "text-emerald-600 bg-emerald-50 border-emerald-200/60" },
	improved: { label: "Improved", color: "text-sky-600 bg-sky-50 border-sky-200/60" },
	fixed: { label: "Fixed", color: "text-amber-600 bg-amber-50 border-amber-200/60" },
	removed: { label: "Removed", color: "text-red-600 bg-red-50 border-red-200/60" },
};

function ChangelogPage() {
	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Changelog
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						What's new
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
						A record of every release, feature, and fix shipped in
						Parrot.
					</p>
				</div>
			</section>

			{/* ── Releases ── */}
			<section className="px-6 pb-20 md:pb-28">
				<div className="max-w-3xl mx-auto">
					<div className="relative">
						{/* Vertical line */}
						<div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

						{RELEASES.map((release, ri) => (
							<div
								key={release.version}
								className="relative mb-14 last:mb-0"
							>
								{/* Dot */}
								<div
									className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 z-10 ${
										ri === 0
											? "bg-primary border-primary"
											: "bg-card border-border"
									}`}
								/>

								<div className="ml-9">
									{/* Version header */}
									<div className="flex items-center gap-3 mb-4">
										<h2 className="text-xl font-black text-foreground tracking-tight">
											v{release.version}
										</h2>
										{release.tag && (
											<span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full uppercase tracking-wider">
												{release.tag}
											</span>
										)}
										<span className="text-xs text-muted-foreground ml-auto">
											{release.date}
										</span>
									</div>

									{/* Change groups */}
									<div className="space-y-5">
										{release.changes.map((group) => {
											const meta =
												TYPE_LABELS[group.type] || TYPE_LABELS.added;
											return (
												<div key={group.type}>
													<span
														className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mb-2.5 ${meta.color}`}
													>
														{meta.label}
													</span>
													<ul className="space-y-1.5">
														{group.items.map(
															(item, i) => (
																<li
																	key={i}
																	className="flex items-start gap-2.5 text-[15px] text-foreground/80"
																>
																	<span className="w-1 h-1 rounded-full bg-foreground/25 mt-2.5 shrink-0" />
																	{item}
																</li>
															),
														)}
													</ul>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Roadmap preview ── */}
			<section className="px-6 py-20 md:py-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Coming up
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						What we're working on
					</h2>
					<div className="space-y-4">
						{[
							"Windows support via Tauri's cross-platform build",
							"Multilingual transcription with automatic language detection",
							"Real-time streaming transcription (live preview as you speak)",
							"Team shared vocabulary and style guides",
							"Browser extension for web-based text fields",
						].map((item, i) => (
							<div
								key={i}
								className="flex items-start gap-3 text-[15px] text-muted-foreground"
							>
								<span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
									<span className="w-1.5 h-1.5 rounded-full bg-primary" />
								</span>
								{item}
							</div>
						))}
					</div>
					<p className="text-xs text-muted-foreground/50 mt-6">
						No dates — we ship when it's ready.
					</p>
				</div>
			</section>

			{/* ── Related links ── */}
			<section className="px-6 py-14 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<div className="flex flex-wrap items-center justify-center gap-6 text-sm">
						<Link
							to="/download"
							className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
						>
							Download the latest version &rarr;
						</Link>
						<Link
							to="/"
							className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
						>
							See all features &rarr;
						</Link>
						<Link
							to="/about"
							className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
						>
							About Parrot &rarr;
						</Link>
					</div>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="px-6 py-20 md:py-28 bg-foreground">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-black text-background tracking-tight mb-4">
						Always improving
					</h2>
					<p className="text-background/50 mb-8 text-[15px]">
						Download the latest version and get every update
						automatically.
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

			<Footer />
		</div>
	);
}

