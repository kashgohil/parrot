import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";
import { SubscribeCTA } from "@/components/SubscribeCTA";
import { competitors } from "@/lib/competitors";

export const Route = createFileRoute("/compare/")({
	component: CompareIndexPage,
	head: () => ({
		meta: [
			{
				title: "Parrot vs the rest — Voice Dictation App Comparisons | Parrot",
			},
			{
				name: "description",
				content:
					"Compare Parrot to Wispr Flow, Superwhisper, MacWhisper, and Dragon. Side-by-side feature, pricing, and privacy comparisons for Mac voice dictation apps.",
			},
			{
				property: "og:title",
				content: "Parrot vs the rest — Voice Dictation Comparisons",
			},
			{
				property: "og:description",
				content:
					"Side-by-side comparisons of Parrot against Wispr Flow, Superwhisper, MacWhisper, and Dragon Professional.",
			},
			{
				property: "og:url",
				content: "https://tryparrot.app/compare",
			},
			{ property: "og:type", content: "website" },
			{
				property: "og:image",
				content: "https://tryparrot.app/og/compare.png",
			},
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content: "Parrot voice dictation comparisons",
			},
			{
				name: "twitter:image",
				content: "https://tryparrot.app/og/compare.png",
			},
			{
				name: "twitter:image:alt",
				content: "Parrot voice dictation comparisons",
			},
			{
				name: "keywords",
				content:
					"voice dictation comparison, mac dictation app comparison, wispr flow alternative, superwhisper alternative, macwhisper alternative, dragon alternative",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/compare" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: "Parrot Comparisons",
					description:
						"Side-by-side comparisons of Parrot against the leading voice dictation apps for Mac.",
					url: "https://tryparrot.app/compare",
					publisher: {
						"@type": "Organization",
						name: "Parrot",
						url: "https://tryparrot.app",
					},
					hasPart: competitors.map((c) => ({
						"@type": "Article",
						name: `Parrot vs ${c.name}`,
						url: `https://tryparrot.app/compare/${c.slug}`,
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
					],
				}),
			},
		],
	}),
});

function CompareIndexPage() {
	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Comparisons
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						Parrot vs the rest
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
						Honest, side-by-side comparisons of Parrot against the apps people
						actually consider when shopping for voice dictation on Mac.
					</p>
				</div>
			</section>

			{/* ── Cards ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-4xl mx-auto">
					<div className="grid sm:grid-cols-2 gap-5">
						{competitors.map((c) => (
							<Link
								key={c.slug}
								to="/compare/$competitor"
								params={{ competitor: c.slug }}
								className="group bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors no-underline"
							>
								<p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">
									Parrot vs
								</p>
								<h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
									{c.name}
								</h2>
								<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
									{c.tagline}
								</p>
								<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
									Read comparison
									<ArrowRight size={14} strokeWidth={2.5} />
								</span>
							</Link>
						))}
					</div>
				</div>
			</section>

			<SubscribeCTA
				heading="Try Parrot"
				subheading="Free for life. Local-first. No account."
				source="compare-index"
			/>

			<Footer />
		</div>
	);
}
