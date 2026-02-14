import Footer from "@/components/Footer";
import { WaitlistCTA } from "@/components/WaitlistCTA";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/changelog")({
	component: ChangelogPage,
	head: () => ({
		meta: [
			{ title: "Changelog - Parrot" },
			{
				name: "description",
				content:
					"Follow Parrot's development progress. See what we've built and what's coming next.",
			},
			{ property: "og:title", content: "Changelog - Parrot" },
			{
				property: "og:description",
				content:
					"Follow Parrot's development progress. See what we've built and what's coming next.",
			},
			{ property: "og:url", content: "https://tryparrot.app/changelog" },
			{ name: "twitter:title", content: "Changelog - Parrot" },
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
	}),
});

const RELEASES = [
	{
		version: "Pre-launch",
		date: "February 2026",
		tag: "Current",
		changes: [
			{
				type: "added",
				items: [
					"Marketing site with blog and waitlist sign-up",
					"Subscription and pricing plans",
				],
			},
			{
				type: "improved",
				items: [
					"Fresh app icons and menu bar design",
					"Polished UI across the desktop app",
				],
			},
		],
	},
	{
		version: "Beta",
		date: "Late January 2026",
		changes: [
			{
				type: "added",
				items: [
					"Audio recordings saved to cloud for playback",
					"Vocabulary page to manage custom words",
					"Step-by-step onboarding for new users",
					"Sign in with Google",
				],
			},
			{
				type: "improved",
				items: [
					"Cleaner layout with refreshed visuals",
					"Simpler profile and settings screens",
				],
			},
		],
	},
	{
		version: "Alpha",
		date: "January 2026",
		changes: [
			{
				type: "added",
				items: [
					"Native Mac app that lives in your menu bar",
					"Press a hotkey, speak, and your words appear at your cursor",
					"AI cleanup that removes filler words and fixes grammar",
					"Local and cloud transcription options",
					"Searchable dictation history",
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
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Changelog
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						Development progress
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
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
					<p className="text-xs text-muted-foreground/60 mt-8">
						No dates - we ship when it's ready.
					</p>
				</div>
			</section>

			{/* ── CTA ── */}
			<WaitlistCTA
				heading="Always improving"
				subheading="Join the waitlist and be first to get updates."
				source="changelog"
			/>

			<Footer />
		</div>
	);
}
