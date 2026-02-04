import { createFileRoute, Link } from "@tanstack/react-router";
import { posts } from "@/lib/blog";
import Footer from "@/components/Footer";
import { WaitlistCTA } from "@/components/WaitlistCTA";

export const Route = createFileRoute("/blog/")({
	component: BlogIndex,
	head: () => ({
		meta: [
			{ title: "Blog - Parrot" },
			{
				name: "description",
				content:
					"Articles about voice dictation, transcription APIs, productivity, and building native Mac apps.",
			},
			{ property: "og:title", content: "Blog - Parrot" },
			{
				property: "og:description",
				content:
					"Articles about voice dictation, transcription APIs, productivity, and building native Mac apps.",
			},
			{ property: "og:url", content: "https://tryparrot.app/blog" },
			{ property: "og:type", content: "website" },
			{ name: "twitter:title", content: "Blog - Parrot" },
			{
				name: "twitter:description",
				content:
					"Articles about voice dictation, transcription APIs, productivity, and building native Mac apps.",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/blog" }],
	}),
});

function BlogIndex() {
	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Blog
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						Words about words
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
						Guides, comparisons, and stories about voice dictation,
						transcription, and building Parrot.
					</p>
				</div>
			</section>

			{/* ── Posts grid ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-5xl mx-auto">
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{posts.map((post) => (
							<Link
								key={post.slug}
								to="/blog/$slug"
								params={{ slug: post.slug }}
								className="group bg-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors no-underline"
							>
								<span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
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

			{/* ── CTA ── */}
			<WaitlistCTA
				heading="Try Parrot"
				subheading="Join the waitlist and be first to know when we launch."
				source="blog"
			/>

			<Footer />
		</div>
	);
}
