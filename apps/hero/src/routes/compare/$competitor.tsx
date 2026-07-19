import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Download, X } from "lucide-react";
import Footer from "@/components/Footer";
import { competitors, getCompetitor } from "@/lib/competitors";

export const Route = createFileRoute("/compare/$competitor")({
	loader: ({ params }) => {
		const c = getCompetitor(params.competitor);
		if (!c) throw new Error("Competitor not found");
		return c;
	},
	component: CompareCompetitorPage,
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const c = loaderData;
		const title = `Parrot vs ${c.name}: Which Voice Dictation App Wins?`;
		const url = `https://tryparrot.app/compare/${c.slug}`;
		return {
			meta: [
				{ title },
				{ name: "description", content: c.description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: c.description },
				{ property: "og:url", content: url },
				{ property: "og:type", content: "article" },
				{
					property: "og:image",
					content: "https://tryparrot.app/og/compare.png",
				},
				{ property: "og:image:width", content: "1200" },
				{ property: "og:image:height", content: "630" },
				{
					property: "og:image:alt",
					content: `Parrot vs ${c.name} — voice dictation comparison`,
				},
				{
					name: "twitter:image",
					content: "https://tryparrot.app/og/compare.png",
				},
				{
					name: "twitter:image:alt",
					content: `Parrot vs ${c.name} — voice dictation comparison`,
				},
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: c.description },
				{ name: "keywords", content: c.keywords.join(", ") },
			],
			links: [{ rel: "canonical", href: url }],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "Article",
						headline: title,
						description: c.description,
						url,
						mainEntityOfPage: url,
						author: {
							"@type": "Person",
							name: "Kash Gohil",
							url: "https://x.com/kashhh",
						},
						publisher: {
							"@type": "Organization",
							name: "Parrot",
							url: "https://tryparrot.app",
							logo: {
								"@type": "ImageObject",
								url: "https://tryparrot.app/parrot-transparent.png",
							},
						},
						image: "https://tryparrot.app/og/compare.png",
						about: [
							{
								"@type": "SoftwareApplication",
								name: "Parrot",
								applicationCategory: "UtilitiesApplication",
								operatingSystem: "macOS",
								url: "https://tryparrot.app",
							},
							{
								"@type": "SoftwareApplication",
								name: c.name,
								applicationCategory: "UtilitiesApplication",
							},
						],
						inLanguage: "en-US",
					}),
				},
				{
					type: "application/ld+json",
					children: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "FAQPage",
						mainEntity: c.faq.map((f) => ({
							"@type": "Question",
							name: f.q,
							acceptedAnswer: {
								"@type": "Answer",
								text: f.a,
							},
						})),
					}),
				},
				{
					type: "application/ld+json",
					children: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "BreadcrumbList",
						itemListElement: [
							{
								"@type": "ListItem",
								position: 1,
								name: "Home",
								item: "https://tryparrot.app/",
							},
							{
								"@type": "ListItem",
								position: 2,
								name: "Compare",
								item: "https://tryparrot.app/compare",
							},
							{
								"@type": "ListItem",
								position: 3,
								name: `Parrot vs ${c.name}`,
								item: url,
							},
						],
					}),
				},
			],
		};
	},
});

function Cell({ value }: { value: string | boolean }) {
	if (value === true) {
		return (
			<span className="inline-flex items-center gap-1.5 text-primary font-semibold">
				<Check size={16} strokeWidth={3} /> Yes
			</span>
		);
	}
	if (value === false) {
		return (
			<span className="inline-flex items-center gap-1.5 text-muted-foreground">
				<X size={16} strokeWidth={2.5} /> No
			</span>
		);
	}
	return <span className="text-foreground">{value}</span>;
}

function CompareCompetitorPage() {
	const c = Route.useLoaderData();

	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Comparison
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5">
						Parrot vs {c.name}
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
						{c.heroVerdict}
					</p>
				</div>
			</section>

			{/* ── Quick comparison table ── */}
			<section className="px-6 py-16 md:py-20 bg-muted/30 border-y border-border">
				<div className="max-w-4xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						Side-by-side
					</h2>
					<div className="overflow-x-auto bg-card border border-border rounded-2xl">
						<table className="w-full text-left">
							<thead>
								<tr className="border-b border-border">
									<th className="px-5 py-4 text-sm font-bold text-muted-foreground uppercase tracking-wider">
										Feature
									</th>
									<th className="px-5 py-4 text-sm font-bold text-foreground">
										Parrot
									</th>
									<th className="px-5 py-4 text-sm font-bold text-foreground">
										{c.shortName}
									</th>
								</tr>
							</thead>
							<tbody>
								{c.features.map((row) => (
									<tr
										key={row.name}
										className="border-b border-border last:border-0"
									>
										<td className="px-5 py-3.5 text-sm text-muted-foreground">
											{row.name}
										</td>
										<td className="px-5 py-3.5 text-sm">
											<Cell value={row.parrot} />
										</td>
										<td className="px-5 py-3.5 text-sm">
											<Cell value={row.them} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</section>

			{/* ── Pricing comparison ── */}
			<section className="px-6 py-20 md:py-24">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Pricing
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						What it costs
					</h2>
					<div className="grid sm:grid-cols-2 gap-5">
						<div className="bg-card border border-primary/30 rounded-2xl p-6">
							<p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
								Parrot
							</p>
							<p className="text-3xl font-black text-foreground tracking-tight mb-2">
								{c.pricing.parrotPrice}
							</p>
							<p className="text-sm text-muted-foreground leading-relaxed">
								No account, no card, no trial. Full feature set.
							</p>
						</div>
						<div className="bg-card border border-border rounded-2xl p-6">
							<p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
								{c.shortName}
							</p>
							<p className="text-3xl font-black text-foreground tracking-tight mb-2">
								{c.pricing.theirPaid}
							</p>
							{c.pricing.theirFree && (
								<p className="text-sm text-muted-foreground leading-relaxed">
									Or: {c.pricing.theirFree.toLowerCase()}
								</p>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* ── Their strengths (honest) ── */}
			<section className="px-6 py-20 md:py-24 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Honest take
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						Where {c.shortName} is genuinely good
					</h2>
					<ul className="space-y-3 mb-12">
						{c.theirStrengths.map((s) => (
							<li key={s} className="flex gap-3 items-start">
								<Check
									size={18}
									strokeWidth={3}
									className="text-primary mt-1 shrink-0"
								/>
								<span className="text-base text-foreground leading-relaxed">
									{s}
								</span>
							</li>
						))}
					</ul>

					<h3 className="text-xl font-bold text-foreground tracking-tight mb-6">
						Where it falls short
					</h3>
					<ul className="space-y-3">
						{c.theirWeaknesses.map((w) => (
							<li key={w} className="flex gap-3 items-start">
								<X
									size={18}
									strokeWidth={2.5}
									className="text-muted-foreground mt-1 shrink-0"
								/>
								<span className="text-base text-muted-foreground leading-relaxed">
									{w}
								</span>
							</li>
						))}
					</ul>
				</div>
			</section>

			{/* ── Why Parrot ── */}
			<section className="px-6 py-20 md:py-24">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Why Parrot
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						What you get instead
					</h2>
					<div className="space-y-8">
						{c.parrotWins.map((win, i) => (
							<div key={win.title} className="flex gap-6">
								<span className="text-3xl font-black text-border/80 shrink-0 leading-none pt-1">
									{String(i + 1).padStart(2, "0")}
								</span>
								<div>
									<h3 className="text-lg font-bold text-foreground mb-1.5">
										{win.title}
									</h3>
									<p className="text-[15px] text-muted-foreground leading-relaxed">
										{win.body}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── When to choose which ── */}
			<section className="px-6 py-20 md:py-24 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						Which one should you pick?
					</h2>
					<div className="grid md:grid-cols-2 gap-6">
						<div className="bg-card border border-primary/30 rounded-2xl p-6">
							<h3 className="text-lg font-bold text-foreground mb-4">
								Pick Parrot if…
							</h3>
							<ul className="space-y-2.5">
								{c.chooseParrotWhen.map((item) => (
									<li key={item} className="flex gap-2.5 items-start">
										<Check
											size={16}
											strokeWidth={3}
											className="text-primary mt-1 shrink-0"
										/>
										<span className="text-sm text-foreground leading-relaxed">
											{item}
										</span>
									</li>
								))}
							</ul>
						</div>
						<div className="bg-card border border-border rounded-2xl p-6">
							<h3 className="text-lg font-bold text-foreground mb-4">
								Pick {c.shortName} if…
							</h3>
							<ul className="space-y-2.5">
								{c.chooseThemWhen.map((item) => (
									<li key={item} className="flex gap-2.5 items-start">
										<Check
											size={16}
											strokeWidth={3}
											className="text-muted-foreground mt-1 shrink-0"
										/>
										<span className="text-sm text-muted-foreground leading-relaxed">
											{item}
										</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* ── FAQ ── */}
			<section className="px-6 py-20 md:py-24">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						FAQ
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						Common questions
					</h2>
					<div className="space-y-8">
						{c.faq.map((item) => (
							<div key={item.q} className="border-l-2 border-primary/30 pl-5">
								<h3 className="text-lg font-bold text-foreground mb-2">
									{item.q}
								</h3>
								<p className="text-base text-muted-foreground leading-relaxed">
									{item.a}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="px-6 py-20 md:py-24 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto text-center">
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-4">
						Try Parrot for free
					</h2>
					<p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto">
						No account, no card, no trial. Local-first dictation that runs on
						your Mac.
					</p>
					<Link
						to="/download"
						className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/85 transition-colors no-underline"
					>
						<Download size={18} strokeWidth={2.5} />
						Download Parrot
						<ArrowRight size={16} strokeWidth={2.5} />
					</Link>
				</div>
			</section>

			{/* ── Other comparisons ── */}
			<section className="px-6 py-16">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Other comparisons
					</p>
					<div className="grid sm:grid-cols-2 gap-3">
						{competitors
							.filter((other) => other.slug !== c.slug)
							.map((other) => (
								<Link
									key={other.slug}
									to="/compare/$competitor"
									params={{ competitor: other.slug }}
									className="group p-4 rounded-xl border border-border hover:border-primary/30 transition-colors no-underline"
								>
									<p className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
										Parrot vs {other.name}
									</p>
									<p className="text-sm text-muted-foreground mt-0.5">
										{other.tagline}
									</p>
								</Link>
							))}
					</div>
				</div>
			</section>

			<Footer />
		</div>
	);
}
