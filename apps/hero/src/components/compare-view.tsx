import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import { SectionHead } from "@/components/section-head";
import { TryParrot } from "@/components/try-parrot";
import { type Competitor, competitors } from "@/lib/competitors";
import { cn } from "@/lib/utils";

// Every fact on these pages comes from lib/competitors.ts.

const WRAP = "mx-auto max-w-[1224px] px-4 md:px-8";
const SECTION = "pb-[clamp(72px,10vw,128px)]";
const HERO = `${WRAP} pt-[clamp(48px,8vw,96px)] pb-[clamp(56px,8vw,88px)]`;
const LINK =
	"text-ink-2 underline decoration-border underline-offset-[3px] hover:text-foreground";
const US = "bg-[color-mix(in_srgb,var(--brand-lime)_30%,transparent)]";

export function CompareIndexView() {
	return (
		<div className="min-h-screen">
			<section className={HERO}>
				<SectionHead
					as="h1"
					eyebrow="Compare"
					title="Parrot vs"
					quiet="the alternatives."
					lede="Side-by-side comparisons with the apps people actually consider for dictation on a Mac, including where each one is the better pick."
				/>
			</section>
			<section className={`${WRAP} ${SECTION}`}>
				<ul className="m-0 list-none border-b border-border p-0">
					{competitors.map((c) => (
						<li key={c.slug} className="border-t border-border">
							<Link
								to="/compare/$competitor"
								params={{ competitor: c.slug }}
								className="group grid items-center gap-x-8 gap-y-1 py-6 no-underline md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
							>
								<span className="grid gap-1">
									<span className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
										Parrot vs {c.name}
									</span>
									<span className="text-[15px] text-muted-foreground">
										{c.tagline}
									</span>
								</span>
								<span className="grid gap-0.5 text-sm">
									<span className="font-mono text-foreground">
										{c.pricing.theirPaid}
									</span>
									<span className="text-muted-foreground">
										Prices checked {c.pricesCheckedOn}
									</span>
								</span>
								<ArrowRight
									aria-hidden="true"
									className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground max-md:hidden"
								/>
							</Link>
						</li>
					))}
				</ul>
			</section>
			<Footer />
		</div>
	);
}

function Value({ value }: { value: string | boolean }) {
	if (value === true)
		return <span className="font-semibold text-success">Yes</span>;
	if (value === false) return <span className="text-muted-foreground">No</span>;
	return <>{value}</>;
}

function RuledList({ items, title }: { items: string[]; title: string }) {
	return (
		<div>
			<h3 className="m-0 mb-3 text-[17px] font-semibold tracking-[-0.01em]">
				{title}
			</h3>
			<ul className="m-0 list-none p-0">
				{items.map((item) => (
					<li
						key={item}
						className="border-t border-border py-3 text-[15px] leading-normal text-ink-2"
					>
						{item}
					</li>
				))}
			</ul>
		</div>
	);
}

function Block({
	eyebrow,
	title,
	quiet,
	children,
}: {
	eyebrow: string;
	title: string;
	quiet?: string;
	children: ReactNode;
}) {
	return (
		<section className={`${WRAP} ${SECTION}`}>
			<SectionHead
				eyebrow={eyebrow}
				title={title}
				quiet={quiet}
				className="mb-[clamp(28px,4vw,44px)]"
			/>
			{children}
		</section>
	);
}

export function CompetitorView({
	c,
	alternativesSlug,
}: {
	c: Competitor;
	alternativesSlug?: string;
}) {
	return (
		<div className="min-h-screen">
			<section className={HERO}>
				<SectionHead
					as="h1"
					eyebrow="Compare"
					title="Parrot vs"
					quiet={`${c.name}.`}
					lede={c.heroVerdict}
				/>
				<dl className="m-0 mt-[clamp(40px,6vw,56px)] grid border-y border-border sm:grid-cols-2">
					<div className={cn("grid content-start gap-1.5 px-5 py-6", US)}>
						<dt className="order-2 text-sm text-muted-foreground">
							Parrot · no word cap, no account
						</dt>
						<dd className="order-1 m-0 text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-0.03em]">
							{c.pricing.parrotPrice}
						</dd>
					</div>
					<div className="grid content-start gap-1.5 px-5 py-6 max-sm:border-t sm:border-l border-border">
						<dt className="order-2 text-sm text-muted-foreground">
							{c.name}
							{c.pricing.theirFree
								? ` · or ${c.pricing.theirFree.toLowerCase()}`
								: ""}
						</dt>
						<dd className="order-1 m-0 text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-0.03em]">
							{c.pricing.theirPaid}
						</dd>
					</div>
				</dl>
				<p className="mt-3 text-[13px] text-muted-foreground">
					{c.shortName} prices checked {c.pricesCheckedOn}. Vendor prices
					change, so check their site before you decide.
				</p>
			</section>

			<Block eyebrow="Features" title="Side by side.">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[480px] border-collapse text-[15px]">
						<thead>
							<tr className="text-left align-bottom">
								<th className="border-b border-border px-4 py-3.5">
									<span className="sr-only">Feature</span>
								</th>
								<th
									className={cn(
										"rounded-t-xl border-b border-border px-4 py-3.5 font-semibold",
										US,
									)}
								>
									Parrot
								</th>
								<th className="border-b border-border px-4 py-3.5 font-semibold">
									{c.name}
								</th>
							</tr>
						</thead>
						<tbody>
							{c.features.map((row) => (
								<tr key={row.name}>
									<td className="border-b border-border px-4 py-3.5 text-ink-2">
										{row.name}
									</td>
									<td className={cn("border-b border-border px-4 py-3.5", US)}>
										<Value value={row.parrot} />
									</td>
									<td className="border-b border-border px-4 py-3.5">
										<Value value={row.them} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Block>

			<Block
				eyebrow="Fair play"
				title={`Where ${c.shortName}`}
				quiet="is the better pick."
			>
				<div className="grid gap-10 md:grid-cols-2">
					<RuledList
						title={`What ${c.shortName} does well`}
						items={c.theirStrengths}
					/>
					<RuledList title="Where it falls short" items={c.theirWeaknesses} />
				</div>
			</Block>

			<Block
				eyebrow="Why people switch"
				title="What Parrot"
				quiet="does differently."
			>
				<div className="grid gap-x-8 sm:grid-cols-2">
					{c.parrotWins.map((win) => (
						<div
							key={win.title}
							className="grid content-start gap-1.5 border-t border-border pt-5 pb-6"
						>
							<h3 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">
								{win.title}
							</h3>
							<p className="m-0 text-[15px] leading-normal text-muted-foreground">
								{win.body}
							</p>
						</div>
					))}
				</div>
			</Block>

			<Block eyebrow="Decide" title="Which one" quiet="is for you?">
				<div className="grid gap-10 md:grid-cols-2">
					<RuledList title="Pick Parrot if…" items={c.chooseParrotWhen} />
					<RuledList
						title={`Pick ${c.shortName} if…`}
						items={c.chooseThemWhen}
					/>
				</div>
			</Block>

			<section className={`${WRAP} ${SECTION}`}>
				<div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
					<SectionHead
						eyebrow="FAQ"
						title="Parrot vs"
						quiet={`${c.shortName}, answered.`}
						className="content-start self-start lg:sticky lg:top-24"
					/>
					<div>
						{c.faq.map((item) => (
							<details
								key={item.q}
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

			<TryParrot>
				{alternativesSlug && (
					<>
						{" "}
						· Comparing several options? See the{" "}
						<Link
							to="/blog/$slug"
							params={{ slug: alternativesSlug }}
							className={LINK}
						>
							best {c.shortName} alternatives
						</Link>
						.
					</>
				)}
			</TryParrot>

			<section className={`${WRAP} pb-[clamp(56px,8vw,88px)]`}>
				<p className="m-0 mb-3 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
					Other comparisons
				</p>
				<ul className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-3">
					{competitors
						.filter((other) => other.slug !== c.slug)
						.map((other) => (
							<li key={other.slug} className="border-t border-border">
								<Link
									to="/compare/$competitor"
									params={{ competitor: other.slug }}
									className="group grid gap-1 py-4 no-underline"
								>
									<span className="font-semibold text-foreground group-hover:text-success">
										Parrot vs {other.name} →
									</span>
									<span className="text-sm text-muted-foreground">
										{other.tagline}
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
