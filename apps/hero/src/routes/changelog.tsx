import { createFileRoute } from "@tanstack/react-router";
import Footer from "@/components/Footer";
import { SectionHead } from "@/components/section-head";
import { type ChangeType, RELEASES } from "@/lib/changelog";

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

const TYPE_LABELS: Record<ChangeType, { label: string; color: string }> = {
	added: { label: "Added", color: "text-success bg-success-soft" },
	improved: { label: "Improved", color: "text-info bg-info-soft" },
	fixed: { label: "Fixed", color: "text-warning bg-warning-soft" },
	removed: { label: "Removed", color: "text-danger bg-danger-soft" },
};

const ROADMAP = [
	"Even snappier dictation and smarter cleanup",
	"Cross-device sync when you want it",
	"Windows support",
	"Multi-lingual transcription with automatic language detection",
];

const WRAP = "mx-auto max-w-[1224px] px-4 md:px-8";

function ChangelogPage() {
	return (
		<div className="min-h-screen">
			<section
				className={`${WRAP} pt-[clamp(48px,8vw,96px)] pb-[clamp(56px,8vw,96px)]`}
			>
				<SectionHead
					as="h1"
					eyebrow="Changelog"
					title="What's new"
					quiet="in Parrot."
					lede="Parrot is in active development. Every release, newest first. The app checks for updates on its own, so you'll get these automatically."
				/>
			</section>

			<section className={`${WRAP} pb-[clamp(104px,14vw,184px)]`}>
				<ol className="m-0 list-none p-0">
					{RELEASES.map((release) => (
						<li
							key={release.version}
							className="grid gap-x-12 gap-y-4 border-t border-border py-[clamp(28px,4vw,44px)] lg:grid-cols-[220px_minmax(0,1fr)]"
						>
							<div className="lg:sticky lg:top-24 lg:self-start">
								<h2 className="m-0 font-mono text-[22px] font-semibold tracking-[-0.01em] text-foreground">
									{release.version}
								</h2>
								<p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
									{release.date}
									{release.tag && (
										<span className="rounded-full bg-lime px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-lime-ink">
											{release.tag}
										</span>
									)}
								</p>
							</div>
							<div className="grid gap-6">
								{release.changes.map((group) => {
									const meta = TYPE_LABELS[group.type];
									return (
										<div key={group.type} className="grid gap-2.5">
											<span
												className={`justify-self-start rounded-md px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] ${meta.color}`}
											>
												{meta.label}
											</span>
											<ul className="m-0 grid max-w-[72ch] list-none gap-2 p-0">
												{group.items.map((item) => (
													<li
														key={item}
														className="relative pl-4 text-[15.5px] leading-relaxed text-ink-2 before:absolute before:top-[0.7em] before:left-0 before:size-1.5 before:rounded-full before:bg-quiet"
													>
														{item}
													</li>
												))}
											</ul>
										</div>
									);
								})}
							</div>
						</li>
					))}
				</ol>
			</section>

			<section className={`${WRAP} pb-[clamp(104px,14vw,184px)]`}>
				<SectionHead
					eyebrow="Coming up"
					title="What we're"
					quiet="working on."
					className="mb-6"
				/>
				<ul className="m-0 grid list-none gap-x-8 border-b border-border p-0 sm:grid-cols-2">
					{ROADMAP.map((item) => (
						<li
							key={item}
							className="border-t border-border py-4 text-[16px] text-foreground"
						>
							{item}
						</li>
					))}
				</ul>
				<p className="mt-3 text-sm text-muted-foreground">
					No dates. It ships when it's ready.
				</p>
			</section>

			<Footer />
		</div>
	);
}
