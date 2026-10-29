import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Short feature copy on hairline rules (title + one sentence), not cards.
export function FeatureNotes({
	items,
	tone = "default",
	className,
}: {
	items: { title: string; body: ReactNode }[];
	tone?: "default" | "band";
	className?: string;
}) {
	const band = tone === "band";
	return (
		<div className={cn("grid gap-x-8", className)}>
			{items.map((item) => (
				<div
					key={item.title}
					className={cn(
						"grid content-start gap-1.5 border-t pt-5 pb-1",
						band ? "border-band-line" : "border-border",
					)}
				>
					<h3
						className={cn(
							"m-0 text-[17px] font-semibold leading-snug tracking-[-0.01em]",
							band ? "text-band-ink" : "text-foreground",
						)}
					>
						{item.title}
					</h3>
					<p
						className={cn(
							"m-0 text-[15px] leading-normal",
							band ? "text-band-muted" : "text-muted-foreground",
						)}
					>
						{item.body}
					</p>
				</div>
			))}
		</div>
	);
}
