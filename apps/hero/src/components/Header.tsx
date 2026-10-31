import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

// Homepage sections are linked by hash so the nav works from every page.
const NAV = [
	{ label: "Cleanup", to: "/", hash: "cleanup" },
	{ label: "Privacy", to: "/", hash: "privacy" },
	{ label: "Models", to: "/", hash: "models" },
	{ label: "Compare", to: "/compare" },
	{ label: "FAQ", to: "/", hash: "faq" },
	{ label: "Blog", to: "/blog" },
] as const;

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen]);

	return (
		<>
			{/* Floating bar: inset from the edges, so the page shows around it. */}
			<div className="sticky top-[env(safe-area-inset-top,0px)] z-40 px-3 pt-3 md:px-4">
				<header className="mx-auto flex h-14 max-w-[1120px] items-center gap-6 rounded-2xl border border-border/70 bg-background/80 pr-2 pl-4 shadow-[0_1px_2px_rgba(18,27,20,0.04),0_8px_24px_-12px_rgba(18,27,20,0.12)] backdrop-blur-xl backdrop-saturate-150 md:pl-5">
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

					<nav
						aria-label="Main"
						className="hidden items-center gap-5 text-[14px] md:flex lg:gap-6"
					>
						{NAV.map((item) => (
							<Link
								key={item.label}
								to={item.to}
								hash={"hash" in item ? item.hash : undefined}
								activeOptions={{ includeHash: true }}
								className="text-ink-2 no-underline transition-colors hover:text-foreground"
								activeProps={
									"hash" in item ? undefined : { className: "text-foreground" }
								}
							>
								{item.label}
							</Link>
						))}
					</nav>

					<Link
						to="/download"
						className="ml-auto inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background no-underline transition-[background-color,transform] hover:bg-primary hover:text-primary-foreground active:scale-[0.97]"
					>
						Download
					</Link>

					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className="rounded-lg p-1.5 transition-colors hover:bg-muted md:hidden"
						aria-label="Open menu"
						aria-expanded={isOpen}
					>
						<Menu size={20} className="text-foreground" />
					</button>
				</header>
			</div>

			{isOpen && (
				<button
					type="button"
					aria-label="Close menu"
					tabIndex={-1}
					className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm md:hidden"
					onClick={() => setIsOpen(false)}
				/>
			)}

			<aside
				aria-label="Menu"
				aria-hidden={!isOpen}
				inert={!isOpen}
				className={`fixed top-0 right-0 z-50 flex h-full w-[280px] flex-col bg-card pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] shadow-[-8px_0_30px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
					isOpen ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between p-5">
					<span className="text-sm font-bold tracking-tight text-foreground">
						Menu
					</span>
					<button
						type="button"
						onClick={() => setIsOpen(false)}
						className="rounded-lg p-1.5 transition-colors hover:bg-muted"
						aria-label="Close menu"
					>
						<X size={18} className="text-foreground" />
					</button>
				</div>

				<nav aria-label="Mobile" className="flex-1 px-3">
					{NAV.map((item) => (
						<Link
							key={item.label}
							to={item.to}
							hash={"hash" in item ? item.hash : undefined}
							onClick={() => setIsOpen(false)}
							className="block rounded-xl px-3 py-3 text-[15px] text-foreground no-underline transition-colors hover:bg-muted"
						>
							{item.label}
						</Link>
					))}
				</nav>

				<div className="border-t border-border p-4">
					<Link
						to="/download"
						onClick={() => setIsOpen(false)}
						className="flex w-full items-center justify-center rounded-full bg-foreground py-2.5 text-sm font-semibold text-background no-underline transition-colors hover:bg-primary hover:text-primary-foreground"
					>
						Download for Mac
					</Link>
				</div>
			</aside>
		</>
	);
}
