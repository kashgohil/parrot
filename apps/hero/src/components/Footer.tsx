import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const LINK =
	"text-on-forest-muted hover:text-on-forest transition-colors no-underline";

function Column({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div>
			<h2 className="mb-3 text-sm font-semibold text-on-forest">{title}</h2>
			<ul className="m-0 grid list-none gap-2 p-0 text-[15px]">{children}</ul>
		</div>
	);
}

export default function Footer() {
	return (
		<footer className="relative border-t border-forest-line bg-[#132113] pt-14 pb-8 text-on-forest-muted">
			<div className="mx-auto max-w-[1120px] px-5">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
					<div className="col-span-2 md:col-span-1">
						<Link
							to="/"
							className="inline-flex items-center gap-2 text-on-forest no-underline"
						>
							<img src="/parrot-transparent.png" alt="" className="h-8 w-8" />
							<span className="text-2xl font-bold tracking-tight">Parrot</span>
						</Link>
						<p className="mt-3 max-w-[26ch] text-[15px]">
							Voice dictation for Mac that runs on your Mac.
						</p>
					</div>
					<Column title="Product">
						<li>
							<Link to="/download" className={LINK}>
								Download
							</Link>
						</li>
						<li>
							<Link to="/changelog" className={LINK}>
								Changelog
							</Link>
						</li>
						<li>
							<Link to="/compare" className={LINK}>
								Compare
							</Link>
						</li>
					</Column>
					<Column title="Resources">
						<li>
							<Link to="/blog" className={LINK}>
								Blog
							</Link>
						</li>
						<li>
							<a href="/rss.xml" className={LINK}>
								RSS
							</a>
						</li>
						<li>
							<a href="/llms.txt" className={LINK}>
								llms.txt
							</a>
						</li>
					</Column>
					<Column title="Company">
						<li>
							<Link to="/about" className={LINK}>
								About
							</Link>
						</li>
						<li>
							<Link to="/contact" className={LINK}>
								Contact
							</Link>
						</li>
						<li>
							<Link to="/privacy" className={LINK}>
								Privacy
							</Link>
						</li>
						<li>
							<Link to="/terms" className={LINK}>
								Terms
							</Link>
						</li>
					</Column>
				</div>
				<div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-forest-line pt-6 text-[13.5px]">
					<span>&copy; {new Date().getFullYear()} Parrot</span>
					<span>Voice dictation that just works.</span>
				</div>
			</div>
		</footer>
	);
}
