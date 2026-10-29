import { Link } from "@tanstack/react-router";
import Footer from "@/components/Footer";
import { SectionHead } from "@/components/section-head";

export type LegalSection = { title: string; paragraphs: string[] };

const WRAP = "mx-auto max-w-[1224px] px-4 md:px-8";

function anchor(title: string) {
	return title
		.toLowerCase()
		.replace(/^\d+\.\s*/, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

// Shared by /privacy and /terms: title, last-updated date, contents list, an
// optional plain-language summary, then the sections in a reading column.
export function LegalLayout({
	eyebrow,
	title,
	quiet,
	lede,
	updated,
	summary,
	sections,
}: {
	eyebrow: string;
	title: string;
	quiet?: string;
	lede: string;
	updated: string;
	summary?: string[];
	sections: LegalSection[];
}) {
	return (
		<div className="min-h-screen">
			<section
				className={`${WRAP} pt-[clamp(48px,8vw,96px)] pb-[clamp(36px,5vw,56px)]`}
			>
				<SectionHead
					as="h1"
					eyebrow={eyebrow}
					title={title}
					quiet={quiet}
					lede={lede}
				/>
				<p className="mt-5 font-mono text-[12.5px] text-muted-foreground">
					Last updated {updated}
				</p>
			</section>

			<div
				className={`mx-4 md:mx-[max(32px,calc((100%-1160px)/2))] grid gap-12 border-t border-border pt-[clamp(32px,5vw,48px)] pb-[clamp(72px,10vw,128px)] lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16`}
			>
				<nav aria-label="Contents" className="max-lg:hidden">
					<div className="sticky top-24 grid gap-2.5 text-sm">
						<p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
							Contents
						</p>
						{summary && (
							<a
								href="#summary"
								className="text-muted-foreground no-underline hover:text-foreground"
							>
								In short
							</a>
						)}
						{sections.map((s) => (
							<a
								key={s.title}
								href={`#${anchor(s.title)}`}
								className="leading-snug text-muted-foreground no-underline hover:text-foreground"
							>
								{s.title}
							</a>
						))}
					</div>
				</nav>

				<div className="min-w-0 max-w-[68ch]">
					{summary && (
						// biome-ignore lint/correctness/useUniqueElementIds: in-page anchor; rendered once
						<section
							id="summary"
							className="mb-10 scroll-mt-24 rounded-[14px] border border-border bg-card p-6"
						>
							<h2 className="m-0 mb-3 font-mono text-xs font-normal uppercase tracking-[0.08em] text-muted-foreground">
								In short
							</h2>
							<ul className="m-0 grid list-none gap-2.5 p-0">
								{summary.map((item) => (
									<li
										key={item}
										className="relative pl-5 text-[16px] leading-relaxed text-foreground before:absolute before:top-[0.65em] before:left-0 before:size-1.5 before:rounded-full before:bg-leaf"
									>
										{item}
									</li>
								))}
							</ul>
						</section>
					)}

					<div className="grid gap-9">
						{sections.map((s) => (
							<section
								key={s.title}
								id={anchor(s.title)}
								className="scroll-mt-24"
							>
								<h2 className="m-0 mb-3 text-[20px] font-semibold tracking-[-0.015em] text-foreground">
									{s.title}
								</h2>
								<div className="grid gap-3">
									{s.paragraphs.map((p) => (
										<p
											key={p}
											className="m-0 text-[16px] leading-[1.7] text-ink-2"
										>
											{p}
										</p>
									))}
								</div>
							</section>
						))}
					</div>

					<p className="mt-12 border-t border-border pt-6 text-[15px] text-muted-foreground">
						Questions about this page? Email{" "}
						<a
							href="mailto:hello@tryparrot.app"
							className="text-foreground underline decoration-border underline-offset-[3px]"
						>
							hello@tryparrot.app
						</a>{" "}
						or see{" "}
						<Link
							to="/contact"
							className="text-foreground underline decoration-border underline-offset-[3px]"
						>
							all contact options
						</Link>
						.
					</p>
				</div>
			</div>

			<Footer />
		</div>
	);
}
