import { Link } from "@tanstack/react-router";

export default function Footer() {
	return (
		<footer className="py-10 px-6 border-t border-border bg-card">
			<div className="max-w-5xl mx-auto">
				<div className="flex flex-col md:flex-row items-center justify-between gap-6">
					<div className="flex items-center gap-2">
						<img
							src="/parrot-transparent.png"
							alt="Parrot"
							className="w-7 h-7"
						/>
						<span className="text-sm font-bold text-foreground tracking-tight">
							Parrot
						</span>
					</div>
					<nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]">
						<Link to="/" className="text-muted-foreground hover:text-foreground transition-colors no-underline">Home</Link>
						<Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors no-underline">About</Link>
						<Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors no-underline">Pricing</Link>
						<Link to="/download" className="text-muted-foreground hover:text-foreground transition-colors no-underline">Download</Link>
						<Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors no-underline">Blog</Link>
						<Link to="/changelog" className="text-muted-foreground hover:text-foreground transition-colors no-underline">Changelog</Link>
						<Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors no-underline">Privacy</Link>
					</nav>
				</div>
				<p className="text-center text-muted-foreground/50 text-xs mt-8">
					Voice dictation that just works.
				</p>
			</div>
		</footer>
	);
}
