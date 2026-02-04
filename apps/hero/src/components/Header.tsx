import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<>
			<div className="sticky top-0 z-40 w-full px-4 pt-3">
				<header className="max-w-5xl mx-auto flex items-center justify-between px-4 py-2.5 bg-foreground/3 backdrop-blur-xl rounded-2xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
					<Link
						to="/"
						className="flex items-center gap-2 no-underline text-foreground hover:opacity-80 transition-opacity"
					>
						<img
							src="/parrot-transparent.png"
							alt="Parrot"
							className="w-8 h-8"
						/>
						<span className="text-2xl font-bold tracking-tight">Parrot</span>
					</Link>

					<nav className="hidden md:flex items-center">
						<div className="flex items-center gap-0.5 bg-muted/60 rounded-xl p-1">
							{(
								[
									{ to: "/", label: "Home" },
									{ to: "/about", label: "About" },
									{ to: "/blog", label: "Blog" },
								] as const
							).map((link) => (
								<Link
									key={link.to}
									to={link.to}
									className="px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors no-underline"
									activeProps={{
										className:
											"px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-card text-foreground shadow-sm no-underline",
									}}
								>
									{link.label}
								</Link>
							))}
						</div>
					</nav>

					<div className="hidden md:block">
						<Link
							to="/waitlist"
							className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-foreground text-background text-[13px] font-semibold rounded-xl hover:bg-foreground/85 transition-colors no-underline"
						>
							Join waitlist
							<ArrowRight size={13} strokeWidth={2.5} />
						</Link>
					</div>

					<button
						onClick={() => setIsOpen(true)}
						className="p-1.5 rounded-lg hover:bg-muted transition-colors md:hidden"
						aria-label="Open menu"
					>
						<Menu size={20} className="text-foreground" />
					</button>
				</header>
			</div>

			{isOpen && (
				<div
					className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-40 md:hidden"
					onClick={() => setIsOpen(false)}
				/>
			)}

			<aside
				className={`fixed top-0 right-0 h-full w-[280px] bg-card z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col shadow-[-8px_0_30px_rgba(0,0,0,0.08)] ${
					isOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between p-5">
					<span className="text-sm font-bold text-foreground tracking-tight">
						Menu
					</span>
					<button
						onClick={() => setIsOpen(false)}
						className="p-1.5 rounded-lg hover:bg-muted transition-colors"
						aria-label="Close menu"
					>
						<X size={18} className="text-foreground" />
					</button>
				</div>

				<nav className="flex-1 px-3">
					{(
						[
							{ to: "/", label: "Home" },
							{ to: "/about", label: "About" },
							{ to: "/blog", label: "Blog" },
						] as const
					).map((link) => (
						<Link
							key={link.to}
							to={link.to}
							onClick={() => setIsOpen(false)}
							className="block px-3 py-3 rounded-xl text-[15px] text-foreground hover:bg-muted transition-colors no-underline"
							activeProps={{
								className:
									"block px-3 py-3 rounded-xl text-[15px] font-semibold text-foreground bg-muted no-underline",
							}}
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className="p-4 border-t border-border">
					<Link
						to="/waitlist"
						onClick={() => setIsOpen(false)}
						className="flex items-center justify-center gap-2 w-full py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/85 transition-colors no-underline"
					>
						Join waitlist
						<ArrowRight size={14} />
					</Link>
				</div>
			</aside>
		</>
	);
}
