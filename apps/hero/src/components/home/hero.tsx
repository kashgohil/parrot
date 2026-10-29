import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Kbd } from "@/components/kbd";
import { buttonVariants } from "@/components/ui/button";
import { PARROT_FACTS } from "@/lib/parrot-facts";

export function AppleLogo({ className = "size-4" }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M11.2 8.5c0-1.6 1.3-2.3 1.4-2.4-.8-1.1-1.9-1.3-2.3-1.3-1-.1-1.9.6-2.4.6s-1.3-.6-2.1-.5A3.1 3.1 0 0 0 3.2 6.5c-1.1 2-.3 4.9.8 6.5.5.8 1.1 1.6 1.9 1.6.8 0 1-.5 2-.5s1.2.5 2 .5 1.3-.8 1.8-1.5c.6-.8.8-1.6.8-1.7 0 0-1.5-.6-1.5-2.4h.2ZM9.7 3.7c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.8.9-.4.4-.7 1.1-.6 1.8.7 0 1.4-.3 1.8-.8Z" />
		</svg>
	);
}

export function DownloadButton({ className }: { className?: string }) {
	return (
		<Link
			to="/download"
			className={buttonVariants({
				variant: "ink",
				size: "pill",
				className: ["no-underline", className].join(" "),
			})}
		>
			<AppleLogo />
			Download for Mac
		</Link>
	);
}

// Hero copy on top, the demo (children) below it, then the stats row.
export function Hero({ children }: { children?: ReactNode }) {
	return (
		<section className="px-4 pt-[clamp(48px,8vw,96px)] md:px-8">
			<div className="mx-auto max-w-[1160px]">
				<div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
					<div className="grid gap-6">
						<p className="flex flex-wrap items-center gap-2.5 font-mono text-[12.5px] text-muted-foreground">
							<span>Mac app</span>
							<Dot />
							<span>v{PARROT_FACTS.version}</span>
							<Dot />
							<span>Apple Silicon</span>
							<Dot />
							<span>{PARROT_FACTS.price}</span>
						</p>
						<h1 className="m-0 text-[clamp(2.6rem,6.4vw,4.9rem)] font-bold leading-none tracking-[-0.03em] text-foreground">
							Talk instead of type.{" "}
							<span className="text-quiet">Nothing leaves your Mac.</span>
						</h1>
					</div>
					<div className="grid gap-5 pb-1.5">
						<p className="m-0 max-w-[36em] text-pretty text-lg leading-relaxed text-ink-2">
							Hold <Kbd>{PARROT_FACTS.defaultHotkey}</Kbd>, say what you mean,
							let go. Parrot turns your speech into clean text and pastes it at
							your cursor, in any app. Speech and cleanup both run on your Mac,
							so it works offline and costs nothing.
						</p>
						<div className="flex flex-wrap items-center gap-x-[18px] gap-y-3">
							<DownloadButton />
							<span className="text-[13.5px] text-muted-foreground">
								{PARROT_FACTS.osRequirement} · No account · No word limit
							</span>
						</div>
					</div>
				</div>

				{children}

				<Stats />
			</div>
		</section>
	);
}

function Dot() {
	return (
		<i
			aria-hidden="true"
			className="size-1 rounded-full bg-border not-italic"
		/>
	);
}

function Stats() {
	return (
		<dl className="m-0 mt-[clamp(56px,8vw,88px)] grid grid-cols-2 border-y border-border md:grid-cols-4">
			<Stat value="0" unit="bytes" label="of your voice sent to a server" />
			<Stat value="$0" label="per month, with no word cap" />
			<Stat
				value="~3×"
				label={
					<>
						faster than typing, in a{" "}
						<Link
							to="/blog/$slug"
							params={{ slug: "voice-dictation-vs-typing" }}
							className="text-muted-foreground underline decoration-border underline-offset-[3px] hover:text-foreground"
						>
							Stanford study
						</Link>
					</>
				}
			/>
			<Stat
				value="1"
				unit="key"
				label={
					<>
						<Kbd>{PARROT_FACTS.defaultHotkey}</Kbd> dictates into any app
					</>
				}
			/>
		</dl>
	);
}

function Stat({
	value,
	unit,
	label,
}: {
	value: string;
	unit?: string;
	label: ReactNode;
}) {
	return (
		<div className="grid content-start gap-1.5 py-6 pr-6 [&:nth-child(n+3)]:border-t [&:nth-child(n+3)]:border-border md:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l [&:nth-child(even)]:border-border [&:nth-child(even)]:pl-6 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-6">
			<dt className="order-2 text-sm text-muted-foreground">{label}</dt>
			<dd className="order-1 m-0 font-display text-[clamp(2rem,3.6vw,2.75rem)] font-bold leading-none tracking-[-0.04em] text-foreground tabular-nums">
				{value}
				{unit && (
					<small className="ml-1 font-mono text-[13px] font-medium tracking-normal text-muted-foreground">
						{unit}
					</small>
				)}
			</dd>
		</div>
	);
}
