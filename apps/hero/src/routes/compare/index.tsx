import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";
import { ForestCTA } from "@/components/forest-cta";
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
			<section className="px-5 pt-[clamp(48px,7vw,88px)] pb-[clamp(56px,7vw,96px)]">
				<div className="max-w-3xl mx-auto">
					<h1 className="text-[clamp(2.6rem,5.2vw,4.1rem)] font-black text-foreground tracking-[-0.035em] leading-none text-balance mb-6">
						Parrot vs the rest
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
						Honest, side-by-side comparisons of Parrot against the apps people
						actually consider when shopping for voice dictation on Mac.
					</p>
				</div>
			</section>

			{/* ── Cards ── */}
			<section className="px-5 py-[clamp(72px,9vw,112px)] bg-band border-y border-line-soft">
				<div className="max-w-4xl mx-auto">
					<div className="grid sm:grid-cols-2 gap-5">
						{competitors.map((c) => (
							<Link
								key={c.slug}
								to="/compare/$competitor"
								params={{ competitor: c.slug }}
								className="group surface p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_1px_2px_rgba(27,46,27,0.06),0_22px_40px_-18px_rgba(27,46,27,0.32)] no-underline"
							>
								<p className="inline-block rounded-full bg-lime-soft px-2.5 py-1 text-xs font-bold text-[#2f5410] mb-3">
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

			<ForestCTA />
			<Footer />
		</div>
	);
}
