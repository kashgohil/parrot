import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Section opener used across the site: a small mono label, a heading whose
// second clause is set in the quiet color (never italics), and an optional lead.
export function SectionHead({
	eyebrow,
	title,
	quiet,
	lede,
	as: Heading = "h2",
	tone = "default",
	className,
}: {
	eyebrow?: string;
	title: ReactNode;
	quiet?: ReactNode;
	lede?: ReactNode;
	as?: "h1" | "h2";
	tone?: "default" | "band";
	className?: string;
}) {
	const band = tone === "band";
	return (
		<div className={cn("grid max-w-[760px] gap-4", className)}>
			{eyebrow && (
				<p
					className={cn(
						"font-mono text-xs uppercase tracking-[0.08em]",
						band ? "text-band-muted" : "text-muted-foreground",
					)}
				>
					{eyebrow}
				</p>
			)}
			<Heading
				className={cn(
					"font-bold leading-[1.05]",
					Heading === "h1"
						? "text-[clamp(2.6rem,6.4vw,4.9rem)] leading-none tracking-[-0.03em]"
						: "text-[clamp(2rem,4.2vw,3.25rem)]",
					band ? "text-band-ink" : "text-foreground",
				)}
			>
				{title}
				{quiet && (
					<>
						{" "}
						<span className={band ? "text-band-muted" : "text-quiet"}>
							{quiet}
						</span>
					</>
				)}
			</Heading>
			{lede && (
				<p
					className={cn(
						"max-w-[36em] text-pretty text-[1.1875rem] leading-relaxed",
						band ? "text-band-muted" : "text-ink-2",
					)}
				>
					{lede}
				</p>
			)}
		</div>
	);
}
