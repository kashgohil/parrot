import type { BlogPost } from "@/lib/blog";
import { getRelatedPosts } from "@/lib/blog";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import Footer from "./Footer";

export default function BlogPostLayout({ post }: { post: BlogPost }) {
	const related = getRelatedPosts(post.slug);
	const Component = post.component;

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<section className="px-6 pt-16 pb-12 md:pt-24 md:pb-16">
				<div className="max-w-3xl mx-auto">
					<h1 className="text-[2rem] md:text-[2.75rem] font-black text-foreground tracking-tight leading-[1.1] mb-4">
						{post.title}
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed">
						{post.description}
					</p>
					<div className="flex items-center justify-between">
						{/* Author */}
						<div className="flex items-center gap-3 mt-6">
							<div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
								KG
							</div>
							<div className="flex flex-col">
								<span className="flex items-center gap-2 text-sm font-semibold text-foreground">
									Kash Gohil
									<a
										href="https://x.com/kashhh"
										target="_blank"
										rel="noopener noreferrer"
										className="text-muted-foreground hover:text-foreground transition-colors"
									>
										<svg
											width="13"
											height="13"
											viewBox="0 0 24 24"
											fill="currentColor"
										>
											<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
										</svg>
									</a>
								</span>
								<span className="text-xs text-muted-foreground">
									Creator of Parrot
								</span>
							</div>
						</div>
						{/* Meta */}
						<div className="flex flex-col gap-2 mt-6 text-xs text-muted-foreground">
							<span className="w-fit self-end px-2 py-0.5 bg-primary/8 border border-primary/15 rounded-full text-[11px] font-semibold text-primary">
								{post.category}
							</span>
							<div className="flex items-center gap-2">
								<span>
									{new Date(post.date).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</span>
								<span>·</span>
								<span>{post.readingTime}</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Body */}
			<section className="px-6 pb-16 md:pb-24">
				<div className="max-w-3xl mx-auto [&>p]:text-[15px] [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-5 [&>h2]:text-xl [&>h2]:md:text-2xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:text-foreground [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:tracking-tight [&>h3]:text-foreground [&>h3]:mt-8 [&>h3]:mb-3 [&>ul]:my-5 [&>ul]:space-y-2 [&>ul]:list-disc [&>ul]:pl-5 [&_li]:text-[15px] [&_li]:text-muted-foreground [&_li]:leading-relaxed [&_a]:text-primary [&_a]:no-underline hover:[&_a]:text-primary/80 [&_strong]:text-foreground [&>img]:rounded-2xl [&>img]:border [&>img]:border-border [&_pre]:my-5 [&_pre]:rounded-lg [&_pre]:bg-foreground/3 [&_pre]:border [&_pre]:border-border/60 [&_pre]:px-4 [&_pre]:py-3 [&_pre]:overflow-x-auto [&_pre_code]:text-[13px] [&_pre_code]:leading-relaxed [&_pre_code]:text-foreground/70 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:font-mono [&_code]:text-[13px] [&_code]:font-mono [&_code]:bg-foreground/4 [&_code]:text-foreground/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md">
					<Suspense
						fallback={
							<div className="py-12 text-center text-muted-foreground">
								Loading...
							</div>
						}
					>
						<Component />
					</Suspense>
				</div>
			</section>

			{/* Related posts */}
			{related.length > 0 && (
				<section className="px-6 py-16 md:py-20 bg-muted/30 border-y border-border">
					<div className="max-w-5xl mx-auto">
						<h2 className="text-xl font-bold text-foreground tracking-tight mb-8">
							More from the blog
						</h2>
						<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
							{related.map((p) => (
								<Link
									key={p.slug}
									to="/blog/$slug"
									params={{ slug: p.slug }}
									className="group bg-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-colors no-underline"
								>
									<span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
										{p.category}
									</span>
									<h3 className="text-[15px] font-bold text-foreground mt-2 mb-2 group-hover:text-primary transition-colors leading-snug">
										{p.title}
									</h3>
									<p className="text-sm text-muted-foreground line-clamp-2">
										{p.description}
									</p>
									<span className="text-xs text-muted-foreground mt-3 block">
										{p.readingTime}
									</span>
								</Link>
							))}
						</div>
					</div>
				</section>
			)}

			{/* CTA */}
			<section className="px-6 py-16 md:py-20 bg-foreground">
				<div className="max-w-2xl mx-auto text-center">
					<h2 className="text-2xl md:text-3xl font-black text-background tracking-tight mb-3">
						Try Parrot
					</h2>
					<p className="text-background/50 mb-6 text-[15px]">
						Voice dictation for Mac. No account required for local mode.
					</p>
					<Link
						to="/download"
						className="group inline-flex items-center gap-2.5 px-7 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 transition-colors no-underline shadow-[0_4px_20px_rgba(124,179,66,0.3)]"
					>
						Download for Mac
						<ArrowRight
							size={16}
							strokeWidth={2.5}
							className="transition-transform group-hover:translate-x-0.5"
						/>
					</Link>
				</div>
			</section>
			<Footer />
		</div>
	);
}
