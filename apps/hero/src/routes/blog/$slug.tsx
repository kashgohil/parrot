import BlogPostLayout from "@/components/BlogPost";
import { getPostBySlug } from "@/lib/blog";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/$slug")({
	loader: ({ params }) => {
		const post = getPostBySlug(params.slug);
		if (!post) throw new Error("Post not found");
		return {
			slug: post.slug,
			title: post.title,
			description: post.description,
			date: post.date,
			readingTime: post.readingTime,
			category: post.category,
			keywords: post.keywords,
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
					content: "https://tryparrot.app/og-image.png",
				},
				{
					property: "article:published_time",
					content: post.date,
				},
				{
					property: "article:modified_time",
					content: post.date,
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
						dateModified: post.date,
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
						image: "https://tryparrot.app/og-image.png",
						mainEntityOfPage: `https://tryparrot.app/blog/${post.slug}`,
						keywords: post.keywords.join(", "),
						inLanguage: "en-US",
					}),
				},
			],
		};
	},
});

function BlogPostPage() {
	const loaderData = Route.useLoaderData();
	const post = getPostBySlug(loaderData.slug)!;
	return <BlogPostLayout post={post} />;
}
