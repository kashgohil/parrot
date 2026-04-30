import { createFileRoute } from "@tanstack/react-router";
import BlogPostLayout from "@/components/BlogPost";
import { getPostBySlug } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
	loader: ({ params }) => {
		const post = getPostBySlug(params.slug);
		if (!post) throw new Error("Post not found");
		return {
			slug: post.slug,
			title: post.title,
			description: post.description,
			date: post.date,
			dateModified: post.dateModified || post.date,
			readingTime: post.readingTime,
			category: post.category,
			keywords: post.keywords,
			howTo: post.howTo,
		};
	},
	component: BlogPostPage,
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const post = loaderData;
		return {
			meta: [
				{ title: `${post.title} - Parrot Blog` },
				{ name: "description", content: post.description },
				{ property: "og:title", content: `${post.title} - Parrot Blog` },
				{ property: "og:description", content: post.description },
				{
					property: "og:url",
					content: `https://tryparrot.app/blog/${post.slug}`,
				},
				{ property: "og:type", content: "article" },
				{
					property: "og:image",
					content: `https://tryparrot.app/og/${post.slug}.png`,
				},
				{
					property: "og:image:width",
					content: "1200",
				},
				{
					property: "og:image:height",
					content: "630",
				},
				{
					property: "og:image:alt",
					content: `${post.title} — Parrot Blog`,
				},
				{
					name: "twitter:image",
					content: `https://tryparrot.app/og/${post.slug}.png`,
				},
				{
					name: "twitter:image:alt",
					content: `${post.title} — Parrot Blog`,
				},
				{
					property: "article:published_time",
					content: post.date,
				},
				{
					property: "article:modified_time",
					content: post.dateModified || post.date,
				},
				{
					property: "article:author",
					content: "Kash Gohil",
				},
				{
					property: "article:section",
					content: post.category,
				},
				...post.keywords.map((keyword: string) => ({
					property: "article:tag",
					content: keyword,
				})),
				{ name: "twitter:title", content: `${post.title} - Parrot Blog` },
				{ name: "twitter:description", content: post.description },
				{ name: "keywords", content: post.keywords.join(", ") },
			],
			links: [
				{
					rel: "canonical",
					href: `https://tryparrot.app/blog/${post.slug}`,
				},
			],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "BlogPosting",
						headline: post.title,
						description: post.description,
						datePublished: post.date,
						dateModified: post.dateModified || post.date,
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
						image: `https://tryparrot.app/og/${post.slug}.png`,
						mainEntityOfPage: `https://tryparrot.app/blog/${post.slug}`,
						keywords: post.keywords.join(", "),
						articleSection: post.category,
						wordCount:
							Number.parseInt(post.readingTime, 10) > 0
								? Number.parseInt(post.readingTime, 10) * 200
								: undefined,
						inLanguage: "en-US",
						speakable: {
							"@type": "SpeakableSpecification",
							cssSelector: ["h1", "h2", "article p:first-of-type"],
						},
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
								name: "Blog",
								item: "https://tryparrot.app/blog",
							},
							{
								"@type": "ListItem",
								position: 3,
								name: post.title,
								item: `https://tryparrot.app/blog/${post.slug}`,
							},
						],
					}),
				},
				...(post.howTo
					? [
							{
								type: "application/ld+json",
								children: JSON.stringify({
									"@context": "https://schema.org",
									"@type": "HowTo",
									name: post.howTo.name,
									description: post.howTo.description,
									totalTime: post.howTo.totalTime,
									step: post.howTo.steps.map((s, i) => ({
										"@type": "HowToStep",
										position: i + 1,
										name: s.name,
										text: s.text,
									})),
								}),
							},
						]
					: []),
			],
		};
	},
});

function BlogPostPage() {
	const loaderData = Route.useLoaderData();
	const post = getPostBySlug(loaderData.slug)!;
	return <BlogPostLayout post={post} />;
}
