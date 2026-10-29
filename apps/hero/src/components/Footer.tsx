import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function Column({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div>
			<h2 className="m-0 mb-3 text-[13px] font-semibold tracking-normal text-foreground">
				{title}
			</h2>
			<ul className="m-0 grid list-none gap-2 p-0 text-muted-foreground [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:text-foreground">
				{children}
			</ul>
		</div>
	);
}

export default function Footer() {
	return (
		<footer className="border-t border-border py-12 text-sm">
			<div className="mx-auto max-w-[1224px] px-4 md:px-8">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
					<div className="col-span-2 md:col-span-1">
						<Link
							to="/"
							className="inline-flex items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.03em] text-foreground no-underline"
						>
							<img
								src="/parrot-192.png"
								alt=""
								width={30}
								height={30}
								className="size-[30px]"
							/>
							Parrot
						</Link>
						<p className="mt-2.5 max-w-[26ch] text-muted-foreground">
							Free voice dictation for Mac that runs entirely on your machine.
						</p>
					</div>

					<Column title="Product">
						<li>
							<Link to="/download">Download</Link>
						</li>
						<li>
							<Link to="/changelog">Changelog</Link>
						</li>
						<li>
							<Link to="/" hash="models">
								Models
							</Link>
						</li>
						<li>
							<Link to="/" hash="faq">
								FAQ
							</Link>
						</li>
					</Column>

					<Column title="Compare">
						{(
							[
								["wispr-flow", "vs Wispr Flow"],
								["superwhisper", "vs Superwhisper"],
								["macwhisper", "vs MacWhisper"],
								["dragon-professional", "vs Dragon"],
							] as const
						).map(([competitor, label]) => (
							<li key={competitor}>
								<Link to="/compare/$competitor" params={{ competitor }}>
									{label}
								</Link>
							</li>
						))}
					</Column>

					<Column title="Resources">
						<li>
							<Link to="/blog">Blog</Link>
						</li>
						<li>
							<Link
								to="/blog/$slug"
								params={{ slug: "speech-to-text-complete-guide" }}
							>
								Speech-to-text guide
							</Link>
						</li>
						<li>
							<a href="/rss.xml">RSS</a>
						</li>
						<li>
							<a href="/llms.txt">llms.txt</a>
						</li>
					</Column>

					<Column title="Company">
						<li>
							<Link to="/about">About</Link>
						</li>
						<li>
							<Link to="/contact">Contact</Link>
						</li>
						<li>
							<Link to="/privacy">Privacy</Link>
						</li>
						<li>
							<Link to="/terms">Terms</Link>
						</li>
					</Column>
				</div>

				<div className="mt-10 flex flex-wrap justify-between gap-3 text-[13px] text-muted-foreground">
					<span>&copy; {new Date().getFullYear()} Parrot</span>
					<span className="font-mono">tryparrot.app</span>
				</div>
			</div>
		</footer>
	);
}
