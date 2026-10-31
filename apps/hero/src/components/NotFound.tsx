import { Link } from "@tanstack/react-router";
import { ArrowRight, Download, House } from "lucide-react";
import Footer from "@/components/Footer";

export default function NotFound() {
	return (
		<div className="min-h-screen">
			<section className="px-6 pt-24 pb-16 md:pt-32 md:pb-24">
				<div className="max-w-3xl mx-auto text-center">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						404 — Page not found
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5">
						This page flew away
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
						The link is broken or the page moved. Everything worth seeing is one
						click away.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/"
							className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/85 transition-colors no-underline"
						>
							<House size={18} strokeWidth={2.5} />
							Back home
						</Link>
						<Link
							to="/download"
							className="inline-flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground font-semibold rounded-xl hover:border-primary/40 transition-colors no-underline"
						>
							<Download size={18} strokeWidth={2.5} />
							Download Parrot
						</Link>
					</div>
				</div>
			</section>

			<section className="px-6 py-16 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-6">
						Popular pages
					</p>
					<div className="grid sm:grid-cols-2 gap-3">
						{[
							{
								to: "/blog",
								title: "Blog",
								body: "Guides on voice dictation, local AI, and Mac productivity",
							},
							{
								to: "/compare",
								title: "Comparisons",
								body: "Parrot vs Wispr Flow, Superwhisper, MacWhisper, and Dragon",
							},
							{
								to: "/about",
								title: "About",
								body: "What Parrot is and why it's local-first",
							},
							{
								to: "/changelog",
								title: "Changelog",
								body: "What's new in each release",
							},
						].map((item) => (
							<Link
								key={item.to}
								to={item.to}
								className="group p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors no-underline"
							>
								<p className="text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
									{item.title}
									<ArrowRight
										size={15}
										strokeWidth={2.5}
										className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
									/>
								</p>
								<p className="text-sm text-muted-foreground mt-0.5">
									{item.body}
								</p>
							</Link>
						))}
					</div>
				</div>
			</section>

			<Footer />
		</div>
	);
}
