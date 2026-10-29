import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The framed surface for product mocks. Only mocks get a frame and shadow;
// feature copy sits on hairline rules instead of cards.

export function TrafficLights() {
	return (
		<span className="inline-flex gap-[7px]" aria-hidden="true">
			<i className="size-[11px] rounded-full bg-[#FF5F57]" />
			<i className="size-[11px] rounded-full bg-[#FEBC2E]" />
			<i className="size-[11px] rounded-full bg-[#28C840]" />
		</span>
	);
}

export function Panel({
	title,
	aside,
	children,
	className,
	label,
}: {
	/** Window title. When set, the panel gets a macOS title bar. */
	title?: ReactNode;
	/** Right-aligned text in the title bar, e.g. a count. */
	aside?: ReactNode;
	children: ReactNode;
	className?: string;
	/** Accessible name for the mock, e.g. "Example vocabulary window". */
	label?: string;
}) {
	return (
		<figure
			aria-label={label}
			className={cn(
				"m-0 overflow-hidden rounded-2xl border border-border bg-card text-sm text-card-foreground shadow-[0_24px_48px_-28px_rgba(16,37,26,0.35)]",
				className,
			)}
		>
			{title !== undefined && (
				<div className="flex items-center gap-3 border-b border-border bg-sunk px-[18px] py-3.5">
					<TrafficLights />
					<b className="text-sm font-semibold">{title}</b>
					{aside && (
						<span className="ml-auto font-mono text-xs text-muted-foreground">
							{aside}
						</span>
					)}
				</div>
			)}
			{children}
		</figure>
	);
}
