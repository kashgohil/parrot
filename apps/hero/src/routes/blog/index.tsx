import { createFileRoute, Link } from "@tanstack/react-router";
import { formatPostDate } from "@/components/BlogPost";
import Footer from "@/components/Footer";
import { SectionHead } from "@/components/section-head";
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
	const [featured, ...rest] = getPostsForBlogIndex();

	return (
		<div className="min-h-screen">
			<section className="mx-auto max-w-[1224px] px-4 pt-[clamp(48px,8vw,96px)] pb-[clamp(40px,6vw,64px)] md:px-8">
				<SectionHead
					as="h1"
					eyebrow="Blog"
					title="Notes on dictation,"
					quiet="written on a Mac."
					lede="Guides, comparisons and the occasional build story: how to dictate well, which apps are worth it, and how Parrot works."
				/>
			</section>

			<section className="mx-auto max-w-[1224px] px-4 pb-[clamp(72px,10vw,128px)] md:px-8">
				{featured && (
					<Link
						to="/blog/$slug"
						params={{ slug: featured.slug }}
						className="group mb-[clamp(40px,6vw,64px)] grid gap-3 rounded-[18px] border border-border bg-card p-[clamp(24px,4vw,40px)] no-underline"
					>
						<span className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
							Start here · {featured.category} · {featured.readingTime}
						</span>
						<span className="max-w-[24ch] text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground group-hover:text-success">
							{featured.title}
						</span>
						<span className="max-w-[60ch] text-[17px] leading-relaxed text-ink-2">
							{featured.description}
						</span>
					</Link>
				)}

				<ul className="m-0 list-none border-b border-border p-0">
					{rest.map((post) => (
						<li key={post.slug} className="border-t border-border">
							<Link
								to="/blog/$slug"
								params={{ slug: post.slug }}
								className="group grid gap-x-8 gap-y-1 py-5 no-underline md:grid-cols-[150px_minmax(0,1fr)]"
							>
								<span className="font-mono text-xs leading-6 text-muted-foreground">
									<time dateTime={post.date}>
										{formatPostDate(post.date, "short")}
									</time>
									<span className="md:block">
										<span className="md:hidden"> · </span>
										{post.category}
									</span>
								</span>
								<span className="grid gap-1">
									<span className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-foreground group-hover:text-success">
										{post.title}
									</span>
									<span className="max-w-[70ch] text-[15px] text-muted-foreground">
										{post.description}
									</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			</section>

			<Footer />
		</div>
	);
}
