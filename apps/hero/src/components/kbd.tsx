import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A keycap for shortcuts in running text: fn, ⌘⇧C.
export function Kbd({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<kbd
			className={cn(
				"inline-flex items-center rounded-[5px] border border-b-2 border-border bg-card px-1.5 font-mono text-[0.85em] leading-snug text-foreground",
				className,
			)}
		>
			{children}
		</kbd>
	);
}
