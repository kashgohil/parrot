import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Section opener used across the site: a heading whose second clause is set
// in the quiet color (never italics), and an optional lead.
export function SectionHead({
	title,
	quiet,
	lede,
	as: Heading = "h2",
	tone = "default",
	className,
}: {
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
			<Heading
				className={cn(
					// Line height must follow the size: tailwind-merge drops a
					// leading-* that comes before a text-* size.
					"font-bold",
					Heading === "h1"
						? "text-[clamp(2.6rem,6.4vw,4.9rem)] leading-none tracking-[-0.03em]"
						: "text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.05]",
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
