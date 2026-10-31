import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { PARROT_FACTS } from "@/lib/parrot-facts";

// Dark closing section shared by the homepage and the inner pages.
export function ForestCTA({
	title = "Start dictating. Stop typing.",
	body = `${PARROT_FACTS.price}. Fully on-device on Apple Silicon. Download Parrot and start dictating in a few minutes.`,
}: {
	title?: string;
	body?: string;
}) {
	return (
		<section className="relative overflow-hidden bg-forest px-5 py-[clamp(72px,9vw,112px)] text-on-forest-muted">
			<div className="pointer-events-none absolute -top-[140px] left-1/2 h-[300px] w-[min(760px,90%)] -translate-x-1/2 rounded-full bg-primary/32 blur-[100px]" />
			<div className="relative mx-auto grid max-w-[1120px] justify-items-center gap-[22px] text-center">
				<h2 className="text-balance text-[clamp(2.4rem,6vw,4.2rem)] font-black leading-none tracking-[-0.035em] text-on-forest">
					{title}
				</h2>
				<p className="max-w-[34em] text-lg">{body}</p>
				<Link
					to="/download"
					className="inline-flex h-[50px] items-center gap-2.5 rounded-full bg-primary pr-6 pl-5 font-semibold text-[#11210f] no-underline shadow-[0_12px_32px_-10px_rgba(124,179,66,0.7)] transition-[background-color,transform] hover:bg-[#8cc152] active:scale-[0.98]"
				>
					<Download size={18} strokeWidth={2.4} />
					Download for Mac
				</Link>
				<p className="text-[13px]">
					Want product updates?{" "}
					<a
						href="/rss.xml"
						className="text-on-forest underline underline-offset-2"
					>
						Subscribe to the RSS feed
					</a>
					.
				</p>
			</div>
		</section>
	);
}
