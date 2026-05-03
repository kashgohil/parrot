import Footer from "@/components/Footer";
import { SubscribeCTA } from "@/components/SubscribeCTA";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/changelog")({
	component: ChangelogPage,
	head: () => ({
		meta: [
			{ title: "Parrot Changelog - Voice Dictation App Updates" },
			{
				name: "description",
				content:
					"Follow Parrot's development progress. See what we've built and what's coming next.",
			},
			{
				property: "og:title",
				content: "Parrot Changelog - Voice Dictation App Updates",
			},
			{
				property: "og:description",
				content:
					"Follow Parrot's development progress. See what we've built and what's coming next.",
			},
			{ property: "og:url", content: "https://tryparrot.app/changelog" },
			{
				name: "twitter:title",
				content: "Parrot Changelog - Voice Dictation App Updates",
			},
			{
				name: "twitter:description",
				content:
					"Follow Parrot's development progress. See what we've built and what's coming next.",
			},
			{
				name: "keywords",
				content:
					"Parrot changelog, voice dictation updates, Parrot release notes, dictation app roadmap",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/changelog" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "WebPage",
					name: "Parrot Changelog",
					description:
						"Follow Parrot's development progress. See what we've built and what's coming next.",
					url: "https://tryparrot.app/changelog",
					publisher: {
						"@type": "Organization",
						name: "Parrot",
						url: "https://tryparrot.app",
					},
				}),
			},
		],
	}),
});

const RELEASES = [
	{
		version: "v0.1.5",
		date: "May 3, 2026",
		tag: "Latest",
		changes: [
			{
				type: "added",
				items: [
					"Manual Ollama setup fallback — if the automatic install fails, the wizard now walks you through installing Ollama yourself and resumes from where it left off",
				],
			},
			{
				type: "fixed",
				items: [
					"Onboarding now persists setup mode before saving your profile, so local-setup and tour steps no longer lose track of the local user",
				],
			},
			{
				type: "improved",
				items: [
					"Cleaner onboarding transitions — dropped the route cross-fade in favor of stable layout heights and instant step changes",
				],
			},
		],
	},
	{
		version: "v0.1.4",
		date: "May 3, 2026",
		changes: [
			{
				type: "fixed",
				items: [
					"Local setup no longer hangs on “Installing Ollama…” — installer now elevates through a native macOS password prompt instead of a stuck sudo call",
					"Setup correctly detects an existing Ollama install — including users on Ollama.app who never ran “Install command line”",
				],
			},
			{
				type: "improved",
				items: [
					"Local mode no longer requires Homebrew — CMake (a build-from-source dependency) is the only prerequisite, and the official cmake.org installer works fine",
					"Default dictation hotkey shown as fn across the marketing site and download page",
					"Blog posts now render markdown tables properly",
				],
			},
		],
	},
	{
		version: "v0.1.3",
		date: "May 2, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Floating HUD orb shows dictation status and can be dragged anywhere on screen",
					"History table with grouping by date, one-click copy, and delete with confirmation",
					"Delete a dictation removes it from local storage and the cloud (including S3 audio)",
				],
			},
			{
				type: "improved",
				items: [
					"Local Ollama cleanup now respects your custom vocabulary",
					"Reuses an existing Ollama instance, warms up the model, and cleans up child processes on exit",
					"Tuned history group header contrast for readability",
				],
			},
			{
				type: "fixed",
				items: [
					"Paste now uses CGEvent for Cmd+V instead of osascript (more reliable)",
					"Audio buffer is cleared before each recording to prevent stale data",
					"Microphone permission prompt now appears correctly on macOS",
				],
			},
		],
	},
	{
		version: "v0.1.2",
		date: "April 30, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Competitor comparison pages and Compare link in the marketing site nav",
					"Four new blog posts",
					"Open Graph images and SEO metadata across marketing pages",
					"Enhanced download page with FAQ",
				],
			},
			{
				type: "improved",
				items: [
					"Subscribe flow replaces the old waitlist (new /subscribe route and component)",
					"API consolidated to PostgreSQL (SQLite support removed)",
				],
			},
			{
				type: "fixed",
				items: [
					"PATH resolution for GUI-launched apps on macOS",
				],
			},
			{
				type: "removed",
				items: [
					"Framer Motion animations from the setup wizard",
				],
			},
		],
	},
	{
		version: "v0.1.1",
		date: "April 29, 2026",
		changes: [
			{
				type: "added",
				items: [
					"Download page dynamically fetches the latest release from GitHub",
				],
			},
			{
				type: "improved",
				items: [
					"CI now ships Apple Silicon-only builds; download page updated to match",
				],
			},
		],
	},
	{
		version: "v0.1.0",
		date: "April 29, 2026",
		tag: "Initial release",
		changes: [
			{
				type: "added",
				items: [
					"Native macOS menu bar app — press a hotkey, speak, and text appears at your cursor",
					"In-process Whisper transcription with Metal acceleration (whisper-rs)",
					"Customizable dictation hotkey with fn-key support",
					"Silent background auto-updater with sidebar banner",
					"Accessibility permission step in onboarding",
					"Centralized error handling with Sonner toast notifications",
					"GitHub Releases CI workflow for Tauri builds",
					"Marketing site, blog, and download page",
				],
			},
			{
				type: "improved",
				items: [
					"Local-first launch — free local mode for life, no account required",
					"Simplified onboarding with local-first default",
					"Friendlier model names in the setup wizard",
					"Safer copy-paste that handles missing accessibility permission",
					"Cleanup prompts hardened against instruction-following",
				],
			},
			{
				type: "removed",
				items: [
					"BYOK API keys section, cloud-setup route, and pricing page (cloud mode coming later)",
					"Standalone whisper.cpp server (replaced by in-process transcription)",
				],
			},
		],
	},
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
	added: {
		label: "Added",
		color: "text-emerald-600 bg-emerald-50 border-emerald-200/60",
	},
	improved: {
		label: "Improved",
		color: "text-sky-600 bg-sky-50 border-sky-200/60",
	},
	fixed: {
		label: "Fixed",
		color: "text-amber-600 bg-amber-50 border-amber-200/60",
	},
	removed: {
		label: "Removed",
		color: "text-red-600 bg-red-50 border-red-200/60",
	},
};

function ChangelogPage() {
	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Changelog
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5">
						Parrot Changelog
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
						Parrot is in active development. Here's what we've built so far and
						what's coming next.
					</p>
				</div>
			</section>

			{/* ── Releases ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<div className="relative">
						{/* Vertical line */}
						<div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

						{RELEASES.map((release, ri) => (
							<div key={release.version} className="relative mb-14 last:mb-0">
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
											{release.version}
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
											const meta = TYPE_LABELS[group.type] || TYPE_LABELS.added;
											return (
												<div key={group.type}>
													<span
														className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mb-2.5 ${meta.color}`}
													>
														{meta.label}
													</span>
													<ul className="space-y-1.5">
														{group.items.map((item, i) => (
															<li
																key={i}
																className="flex items-start gap-2.5 text-[15px] text-foreground/80"
															>
																<span className="w-1 h-1 rounded-full bg-foreground/25 mt-2.5 shrink-0" />
																{item}
															</li>
														))}
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
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						What we're working on
					</h2>
					<div className="space-y-4">
						{[
							"Cloud mode with sync across devices and managed transcription",
							"Windows support via Tauri's cross-platform build",
							"Mobile apps for iOS and Android",
							"Multi-lingual transcription with automatic language detection",
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
					<p className="text-xs text-muted-foreground/60 mt-8">
						No dates - we ship when it's ready.
					</p>
				</div>
			</section>

			{/* ── CTA ── */}
			<SubscribeCTA
				heading="Always improving"
				subheading="Subscribe for product updates and changelog notes."
				source="changelog"
			/>

			<Footer />
		</div>
	);
}
