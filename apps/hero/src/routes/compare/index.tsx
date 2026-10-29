import { createFileRoute } from "@tanstack/react-router";
import { CompareIndexView } from "@/components/compare-view";
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
	return <CompareIndexView />;
}
