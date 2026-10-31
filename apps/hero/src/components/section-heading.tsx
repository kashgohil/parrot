import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Section title and optional lead paragraph, shared by the homepage sections.
export function SectionHeading({
	title,
	lede,
	align = "left",
	className,
}: {
	title: ReactNode;
	lede?: ReactNode;
	align?: "left" | "center";
	className?: string;
}) {
	return (
		<div
			className={cn(
				"mb-12 max-w-2xl md:mb-16",
				align === "center" && "mx-auto text-center",
				className,
			)}
		>
			<h2 className="text-balance text-[2rem] font-bold leading-[1.1] tracking-[-0.025em] text-foreground md:text-[2.75rem]">
				{title}
			</h2>
			{lede && (
				<p className="mt-4 text-pretty text-[17px] leading-relaxed text-muted-foreground">
					{lede}
				</p>
			)}
		</div>
	);
}
