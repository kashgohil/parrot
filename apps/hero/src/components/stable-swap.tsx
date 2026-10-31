import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Switchable content that never changes size: every view sits in the same grid
// cell and only the active one is visible, so the box always takes the height
// of the tallest view and switching tabs doesn't shift the page.
export function StableSwap({
	active,
	views,
	className,
	viewClassName,
	...props
}: {
	active: string;
	views: Record<string, ReactNode>;
	viewClassName?: string;
} & Omit<ComponentProps<"div">, "children">) {
	return (
		<div className={cn("grid", className)} {...props}>
			{Object.entries(views).map(([key, view]) => (
				<div
					key={key}
					className={cn(
						"[grid-area:1/1]",
						viewClassName,
						key !== active && "invisible",
					)}
				>
					{view}
				</div>
			))}
		</div>
	);
}
