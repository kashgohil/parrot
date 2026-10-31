import { createFileRoute, Link } from "@tanstack/react-router";
import Footer from "@/components/Footer";
import { ForestCTA } from "@/components/forest-cta";
import { getPostsForBlogIndex } from "@/lib/blog";

export const Route = createFileRoute("/blog/")({
	component: BlogIndex,
	head: () => ({
		meta: [
			{ title: "Voice Dictation Blog - Guides & Tips | Parrot" },
			{
				name: "description",
				content:
					"Articles about voice dictation, transcription APIs, productivity, and building native Mac apps.",
			},
			{
				property: "og:title",
				content: "Voice Dictation Blog - Guides & Tips | Parrot",
			},
			{
				property: "og:description",
				content:
					"Articles about voice dictation, transcription APIs, productivity, and building native Mac apps.",
			},
			{ property: "og:url", content: "https://tryparrot.app/blog" },
			{ property: "og:type", content: "website" },
			{
				name: "twitter:title",
				content: "Voice Dictation Blog - Guides & Tips | Parrot",
			},
			{
				name: "twitter:description",
				content:
					"Articles about voice dictation, transcription APIs, productivity, and building native Mac apps.",
			},
			{
				property: "og:image",
				content: "https://tryparrot.app/og/blog.png",
			},
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content: "Voice Dictation Blog — Parrot",
			},
			{
				name: "twitter:image",
				content: "https://tryparrot.app/og/blog.png",
			},
			{
				name: "twitter:image:alt",
				content: "Voice Dictation Blog — Parrot",
			},
			{
				name: "keywords",
				content:
					"voice dictation blog, speech to text articles, transcription guides, dictation tips, voice typing productivity",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/blog" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: "Voice Dictation Blog",
					description:
						"Articles about voice dictation, transcription APIs, productivity, and building native Mac apps.",
					url: "https://tryparrot.app/blog",
					publisher: {
						"@type": "Organization",
						name: "Parrot",
						url: "https://tryparrot.app",
						logo: {
							"@type": "ImageObject",
							url: "https://tryparrot.app/parrot-transparent.png",
						},
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
					],
				}),
			},
		],
	}),
});

function BlogIndex() {
	const orderedPosts = getPostsForBlogIndex();

	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-5 pt-[clamp(48px,7vw,88px)] pb-[clamp(56px,7vw,96px)]">
				<div className="max-w-3xl mx-auto">
					<h1 className="text-[clamp(2.6rem,5.2vw,4.1rem)] font-black text-foreground tracking-[-0.035em] leading-none text-balance mb-6">
						Voice Dictation Blog
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
						Guides, comparisons, and stories about voice dictation,
						transcription, and building Parrot. Money guides (alternatives,
						free, local) surface first.
					</p>
				</div>
			</section>

			{/* ── Posts grid ── */}
			<section className="px-5 py-[clamp(72px,9vw,112px)] bg-band border-y border-line-soft">
				<div className="max-w-5xl mx-auto">
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{orderedPosts.map((post) => (
							<Link
								key={post.slug}
								to="/blog/$slug"
								params={{ slug: post.slug }}
								className="group surface p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_1px_2px_rgba(27,46,27,0.06),0_22px_40px_-18px_rgba(27,46,27,0.32)] no-underline"
							>
								<span className="inline-block rounded-full bg-lime-soft px-2.5 py-1 text-xs font-bold text-[#2f5410]">
									{post.category}
								</span>
								<h2 className="text-[16px] font-bold text-foreground mt-2 mb-2 group-hover:text-primary transition-colors leading-snug">
									{post.title}
								</h2>
								<p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
									{post.description}
								</p>
								<div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
									<span>
										{new Date(post.date).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</span>
									<span>{post.readingTime}</span>
								</div>
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
