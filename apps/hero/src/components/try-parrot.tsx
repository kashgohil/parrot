import type { ReactNode } from "react";
import { DownloadButton } from "@/components/home/hero";
import { PARROT_FACTS } from "@/lib/parrot-facts";

// The download block that closes the inner pages (blog posts, comparisons).
export function TryParrot({ children }: { children?: ReactNode }) {
	return (
		<section className="border-t border-border">
			<div className="mx-auto grid max-w-[1224px] justify-items-start gap-6 px-4 py-[clamp(88px,12vw,152px)] md:px-8">
				<h2 className="m-0 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-none tracking-[-0.035em]">
					Try Parrot. <span className="text-quiet">It's free.</span>
				</h2>
				<DownloadButton />
				<p className="m-0 text-sm text-muted-foreground">
					{PARROT_FACTS.osRequirement} · no account · {PARROT_FACTS.price}
					{children}
				</p>
			</div>
		</section>
	);
}
