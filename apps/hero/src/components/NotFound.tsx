import { Link } from "@tanstack/react-router";
import { ArrowRight, Download, House } from "lucide-react";
import Footer from "@/components/Footer";

export default function NotFound() {
	return (
		<div className="min-h-screen">
			<section className="px-5 pt-[clamp(64px,9vw,120px)] pb-[clamp(56px,7vw,96px)]">
				<div className="max-w-3xl mx-auto text-center">
					<h1 className="text-[clamp(2.6rem,5.2vw,4.1rem)] font-black text-foreground tracking-[-0.035em] leading-none text-balance mb-6">
						This page flew away
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
						The link is broken or the page moved. Everything worth seeing is one
						click away.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/"
							className="inline-flex items-center gap-2 h-[50px] px-6 bg-foreground text-background font-semibold rounded-full hover:bg-[#2b452b] transition-[background-color,transform] active:scale-[0.98] shadow-[0_10px_24px_-10px_rgba(27,46,27,0.55)] no-underline"
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

			<section className="px-5 py-[clamp(64px,8vw,96px)] bg-band border-y border-line-soft">
				<div className="max-w-3xl mx-auto">
					<p className="text-lg font-bold text-foreground mb-5">
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
								className="group surface p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] no-underline"
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
