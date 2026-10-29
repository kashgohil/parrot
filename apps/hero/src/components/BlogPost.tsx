import { Link } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { TryParrot } from "@/components/try-parrot";
import type { BlogPost } from "@/lib/blog";
import { getRelatedPosts } from "@/lib/blog";
import Footer from "./Footer";

const WRAP = "mx-auto max-w-[1224px] px-4 md:px-8";

export function formatPostDate(date: string, month: "long" | "short" = "long") {
	// Fixed time zone so server and client render the same string.
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month,
		day: "numeric",
		timeZone: "UTC",
	});
}

function slugify(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export default function BlogPostLayout({ post }: { post: BlogPost }) {
	const related = getRelatedPosts(post.slug);
	const Component = post.component;
	const body = useRef<HTMLDivElement>(null);
	const [toc, setToc] = useState<{ id: string; text: string }[]>([]);

	// The body is a lazy component, so the contents list is built once it renders.
	useEffect(() => {
		const el = body.current;
		if (!el) return;
		const collect = () => {
			const items = [...el.querySelectorAll("h2")].map((h) => {
				if (!h.id) h.id = slugify(h.textContent ?? "");
				return { id: h.id, text: h.textContent ?? "" };
			});
			setToc(items);
		};
		collect();
		const observer = new MutationObserver(collect);
		observer.observe(el, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, []);

	const updated = post.dateModified && post.dateModified !== post.date;

	return (
		<div className="min-h-screen">
			<header
				className={`${WRAP} pt-[clamp(48px,8vw,96px)] pb-[clamp(36px,5vw,56px)]`}
			>
				<div className="grid max-w-[820px] gap-5">
					<p className="m-0 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
						<Link
							to="/blog"
							className="text-muted-foreground no-underline hover:text-foreground"
						>
							Blog
						</Link>{" "}
						· {post.category} · {post.readingTime}
					</p>
					<h1 className="m-0 text-[clamp(2.1rem,4.6vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-foreground">
						{post.title}
					</h1>
					<p className="m-0 max-w-[40em] text-pretty text-lg leading-relaxed text-ink-2">
						{post.description}
					</p>
					<div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
						<span className="flex items-center gap-2.5">
							<span
								aria-hidden="true"
								className="grid size-8 place-items-center rounded-full border border-border bg-muted text-xs font-bold"
							>
								KG
							</span>
							<span>
								<a
									href="https://x.com/kashhh"
									target="_blank"
									rel="noopener noreferrer"
									className="font-medium text-foreground no-underline hover:underline"
								>
									Kash Gohil
								</a>
								<span className="text-muted-foreground">, maker of Parrot</span>
							</span>
						</span>
						<span className="text-muted-foreground">
							<time dateTime={post.date}>{formatPostDate(post.date)}</time>
							{updated && (
								<>
									{" "}
									· Updated{" "}
									<time dateTime={post.dateModified}>
										{formatPostDate(post.dateModified as string)}
									</time>
								</>
							)}
						</span>
					</div>
				</div>
			</header>

			<div
				className={`${WRAP} grid gap-12 border-t border-border pt-[clamp(32px,5vw,48px)] pb-[clamp(56px,8vw,96px)] lg:grid-cols-[minmax(0,1fr)_220px]`}
			>
				<article ref={body} className="blog-content min-w-0">
					<Suspense
						fallback={<p className="text-muted-foreground">Loading…</p>}
					>
						<Component />
					</Suspense>
				</article>
				{toc.length > 1 && (
					<nav aria-label="On this page" className="max-lg:hidden">
						<div className="sticky top-24 grid gap-2.5 text-sm">
							<p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
								On this page
							</p>
							{toc.map((item) => (
								<a
									key={item.id}
									href={`#${item.id}`}
									className="leading-snug text-muted-foreground no-underline hover:text-foreground"
								>
									{item.text}
								</a>
							))}
						</div>
					</nav>
				)}
			</div>

			{post.faq && post.faq.length > 0 && (
				<section className={`${WRAP} pb-[clamp(56px,8vw,96px)]`}>
					<div className="max-w-[68ch]">
						<h2 className="m-0 mb-4 text-[clamp(1.45rem,2.6vw,1.75rem)] font-bold tracking-[-0.022em]">
							FAQ
						</h2>
						{post.faq.map((item) => (
							<details
								key={item.q}
								className="group border-b border-border first:border-t"
							>
								<summary className="relative cursor-pointer list-none py-4 pr-9 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
									{item.q}
									<span
										aria-hidden="true"
										className="absolute top-3 right-1 text-[22px] font-normal text-muted-foreground transition-transform group-open:rotate-45"
									>
										+
									</span>
								</summary>
								<p className="m-0 pb-4 text-ink-2">{item.a}</p>
							</details>
						))}
					</div>
				</section>
			)}

			{related.length > 0 && (
				<section className={`${WRAP} pb-[clamp(56px,8vw,96px)]`}>
					<p className="m-0 mb-3 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
						More from the blog
					</p>
					<ul className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-3">
						{related.map((p) => (
							<li key={p.slug} className="border-t border-border">
								<Link
									to="/blog/$slug"
									params={{ slug: p.slug }}
									className="group grid gap-1 py-4 no-underline"
								>
									<span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
										{p.category} · {p.readingTime}
									</span>
									<span className="font-semibold leading-snug text-foreground group-hover:text-success">
										{p.title}
									</span>
									<span className="line-clamp-2 text-sm text-muted-foreground">
										{p.description}
									</span>
								</Link>
							</li>
						))}
					</ul>
				</section>
			)}

			<TryParrot />
			<Footer />
		</div>
	);
}
