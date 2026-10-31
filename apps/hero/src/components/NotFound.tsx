import { Link } from "@tanstack/react-router";
import Footer from "@/components/Footer";
import { SectionHead } from "@/components/section-head";
import { buttonVariants } from "@/components/ui/button";

const WRAP = "mx-auto max-w-[1224px] px-4 md:px-8";

const PAGES = [
	{
		to: "/blog",
		title: "Blog",
		body: "Guides on dictation, local AI and Mac productivity.",
	},
	{
		to: "/compare",
		title: "Comparisons",
		body: "Parrot vs Wispr Flow, Superwhisper, MacWhisper and Dragon.",
	},
	{
		to: "/about",
		title: "About",
		body: "What Parrot is and why it runs on your Mac.",
	},
	{
		to: "/changelog",
		title: "Changelog",
		body: "What changed in each release.",
	},
] as const;

// Rendered for unknown routes; the server responds with a real 404 status.
export default function NotFound() {
	return (
		<div className="min-h-screen">
			<section
				className={`${WRAP} pt-[clamp(48px,8vw,96px)] pb-[clamp(64px,9vw,112px)]`}
			>
				<div className="grid justify-items-start gap-7">
					<img
						src="/parrot-192.png"
						alt=""
						width={64}
						height={64}
						className="size-16"
					/>
					<SectionHead
						as="h1"
						eyebrow="404 · Page not found"
						title="This page"
						quiet="flew off."
						lede="The link is broken or the page moved. Everything else is still here."
					/>
					<Link
						to="/"
						className={buttonVariants({
							variant: "ink",
							size: "pill",
							className: "no-underline",
						})}
					>
						Back to home
					</Link>
				</div>
			</section>

			<section className={`${WRAP} pb-[clamp(104px,14vw,184px)]`}>
				<p className="m-0 mb-3 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
					Or try one of these
				</p>
				<ul className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2 lg:grid-cols-4">
					{PAGES.map((page) => (
						<li key={page.to} className="border-t border-border">
							<Link to={page.to} className="group grid gap-1 py-4 no-underline">
								<span className="font-semibold text-foreground group-hover:text-success">
									{page.title} →
								</span>
								<span className="text-sm text-muted-foreground">
									{page.body}
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
