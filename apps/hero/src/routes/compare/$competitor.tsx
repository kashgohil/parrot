import { createFileRoute, notFound } from "@tanstack/react-router";
import { CompetitorView } from "@/components/compare-view";
import { getCompetitor } from "@/lib/competitors";

/** Blog alternatives posts that pair with a compare page (cross-links both ways). */
const ALTERNATIVES_BLOG: Record<string, string> = {
	"wispr-flow": "wispr-flow-alternatives",
	superwhisper: "superwhisper-alternatives",
};

export const Route = createFileRoute("/compare/$competitor")({
	loader: ({ params }) => {
		const c = getCompetitor(params.competitor);
		if (!c) throw notFound();
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
					content: `https://tryparrot.app/og/compare-${c.slug}.png`,
				},
				{ property: "og:image:width", content: "1200" },
				{ property: "og:image:height", content: "630" },
				{
					property: "og:image:alt",
					content: `Parrot vs ${c.name} — voice dictation comparison`,
				},
				{
					name: "twitter:image",
					content: `https://tryparrot.app/og/compare-${c.slug}.png`,
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
						image: `https://tryparrot.app/og/compare-${c.slug}.png`,
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

function CompareCompetitorPage() {
	const c = Route.useLoaderData();
	return <CompetitorView c={c} alternativesSlug={ALTERNATIVES_BLOG[c.slug]} />;
}
