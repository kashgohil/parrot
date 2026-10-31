import { Link } from "@tanstack/react-router";
import { DownloadButton } from "@/components/home/hero";
import { SectionHead } from "@/components/section-head";
import { buttonVariants } from "@/components/ui/button";
import { getPostBySlug, MONEY_POST_SLUGS } from "@/lib/blog";
import { HOME_FAQ } from "@/lib/home-faq";
import { PARROT_FACTS } from "@/lib/parrot-facts";

const WRAP = "mx-auto max-w-[1160px]";
const SECTION = "px-4 pb-[clamp(104px,14vw,184px)] md:px-8";

// DRAFT: written for review; Kash signs off on the final wording (ISSUE-1337).
export function FounderNote() {
	return (
		<section className={SECTION}>
			<div
				className={`${WRAP} grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16`}
			>
				<p className="m-0 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
					Why it's free
				</p>
				<div>
					<blockquote className="m-0 max-w-[30em] text-pretty text-[clamp(1.3rem,2.4vw,1.8rem)] font-medium leading-[1.4] tracking-[-0.018em] text-foreground">
						<p className="m-0">
							I wanted to dictate all day without sending my voice to someone
							else's server, and without paying every month for the privilege.
						</p>
						<p className="m-0 mt-[0.7em]">
							Apple Silicon is fast enough to run good speech and writing models
							locally. There's no server bill, so there's nothing to charge you
							for. That's why Parrot is free, and why it will stay that way.
						</p>
					</blockquote>
					<div className="mt-7 flex items-center gap-3 text-[14.5px]">
						<span
							aria-hidden="true"
							className="grid size-10 place-items-center rounded-full border border-border bg-muted text-sm font-bold"
						>
							KG
						</span>
						<div>
							Kash Gohil
							<small className="block text-[13px] text-muted-foreground">
								Maker of Parrot
							</small>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export function FaqSection() {
	return (
		// biome-ignore lint/correctness/useUniqueElementIds: #faq is the header nav target; rendered once
		<section id="faq" className={`${SECTION} scroll-mt-20`}>
			<div
				className={`${WRAP} grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16`}
			>
				<SectionHead
					eyebrow="FAQ"
					title="Before you"
					quiet="install."
					className="content-start self-start lg:sticky lg:top-24"
				/>
				<div>
					{HOME_FAQ.map((item, i) => (
						<details
							key={item.q}
							open={i === 0}
							className="group border-b border-border first:border-t"
						>
							<summary className="relative cursor-pointer list-none py-5 pr-9 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
								{item.q}
								<span
									aria-hidden="true"
									className="absolute top-4 right-1 text-[22px] font-normal text-muted-foreground transition-transform group-open:rotate-45"
								>
									+
								</span>
							</summary>
							<p className="m-0 max-w-[60ch] pb-5 text-ink-2">{item.a}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

export function BlogStrip() {
	const posts = MONEY_POST_SLUGS.map(getPostBySlug).filter(
		(p): p is NonNullable<typeof p> => Boolean(p),
	);
	return (
		<section className={SECTION}>
			<div className={WRAP}>
				<SectionHead
					eyebrow="From the blog"
					title="Guides for local"
					quiet="Mac dictation."
					className="mb-[clamp(28px,4vw,40px)]"
				/>
				<ul className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-2">
					{posts.map((post) => (
						<li key={post.slug} className="border-t border-border">
							<Link
								to="/blog/$slug"
								params={{ slug: post.slug }}
								className="group grid gap-1 py-4 no-underline"
							>
								<span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
									{post.category} · {post.readingTime}
								</span>
								<span className="text-[16px] font-semibold leading-snug text-foreground group-hover:text-success">
									{post.title}
								</span>
								<span className="line-clamp-2 text-sm text-muted-foreground">
									{post.description}
								</span>
							</Link>
						</li>
					))}
					<li className="border-t border-border">
						<Link to="/compare" className="group grid gap-1 py-4 no-underline">
							<span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
								Compare
							</span>
							<span className="text-[16px] font-semibold leading-snug text-foreground group-hover:text-success">
								Parrot vs the alternatives
							</span>
							<span className="text-sm text-muted-foreground">
								Side-by-side feature and pricing tables for each competitor.
							</span>
						</Link>
					</li>
				</ul>
			</div>
		</section>
	);
}

export function FinalCta() {
	return (
		<section className="border-t border-border px-4 py-[clamp(120px,16vw,208px)] md:px-8">
			<div className={`${WRAP} grid justify-items-start gap-7`}>
				<img
					src="/parrot-192.png"
					alt=""
					width={72}
					height={72}
					className="size-[72px]"
				/>
				<h2 className="m-0 text-[clamp(2.6rem,7vw,5.4rem)] font-bold leading-none tracking-[-0.035em] text-foreground">
					Hold {PARROT_FACTS.defaultHotkey}.{" "}
					<span className="text-quiet">Say something.</span>
				</h2>
				<div className="flex flex-wrap items-center gap-x-[18px] gap-y-3">
					<DownloadButton />
					<a
						href="#demo"
						className={buttonVariants({
							variant: "ink-outline",
							size: "pill",
							className: "no-underline",
						})}
					>
						Try the demo again
					</a>
				</div>
				<p className="m-0 text-[13.5px] text-muted-foreground">
					Version {PARROT_FACTS.version} · {PARROT_FACTS.osRequirement} ·{" "}
					{PARROT_FACTS.price}
				</p>
			</div>
		</section>
	);
}
