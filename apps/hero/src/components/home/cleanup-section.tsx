import { type ReactNode, useState } from "react";
import { Kbd } from "@/components/kbd";
import { SectionHead } from "@/components/section-head";
import { CLEANUP_TIERS } from "@/lib/models";
import { cn } from "@/lib/utils";

// Before/after for the cleanup pass. The left panel is what the speech model
// heard; the right is what gets pasted, with cleanup on or off.

const HEARD =
	"Um, so I think we should, uh, move the design review to Thursday. No, actually, Friday. And can you send Priya the Figma link before then?";

function Fill({ children }: { children: ReactNode }) {
	return (
		<span className="text-muted-foreground line-through decoration-beak decoration-2">
			{children}
		</span>
	);
}

function Note({ children, kept }: { children: ReactNode; kept?: boolean }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-[5px] text-[12.5px] text-ink-2">
			<i
				aria-hidden="true"
				className={cn("size-[7px] rounded-full", kept ? "bg-leaf" : "bg-beak")}
			/>
			{children}
		</span>
	);
}

export function CleanupSection() {
	const [on, setOn] = useState(true);
	const [tier, setTier] = useState(CLEANUP_TIERS[0].id);

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: #cleanup is the header nav target; rendered once
		<section
			id="cleanup"
			className="scroll-mt-20 px-4 py-[clamp(104px,14vw,184px)] md:px-8"
		>
			<div className="mx-auto max-w-[1160px]">
				<SectionHead
					title="Say it messy."
					quiet="Send it clean."
					lede="People don't talk in finished sentences. After the speech model writes down what you said, a small language model on your Mac takes out the filler, applies your corrections and fixes punctuation."
					className="mb-[clamp(44px,6vw,72px)]"
				/>

				<div className="grid overflow-hidden rounded-[18px] border border-border bg-card md:grid-cols-2">
					<div className="grid min-w-0 content-start gap-4 p-[clamp(20px,3vw,32px)]">
						<p className="m-0 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
							What the speech model heard
						</p>
						<p className="m-0 text-pretty text-[clamp(1.15rem,2vw,1.45rem)] leading-normal tracking-[-0.01em]">
							<Fill>Um,</Fill> so I think we should, <Fill>uh,</Fill> move the
							design review{" "}
							<span className="rounded bg-beak-soft px-0.5 text-foreground line-through decoration-beak decoration-2">
								to Thursday. No, actually,
							</span>{" "}
							Friday. And can you send Priya the Figma link before then?
						</p>
						<div className="flex flex-wrap gap-2">
							<Note>2 fillers</Note>
							<Note>1 self-correction</Note>
						</div>
					</div>

					<div className="grid min-w-0 content-start gap-4 border-border bg-[color-mix(in_srgb,var(--brand-lime)_22%,var(--card))] p-[clamp(20px,3vw,32px)] max-md:border-t md:border-l">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<p className="m-0 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
								What gets pasted
							</p>
							<fieldset className="m-0 inline-flex min-w-0 gap-0.5 rounded-full border border-border bg-muted p-1">
								<legend className="sr-only">Cleanup</legend>
								{(
									[
										[true, "Cleanup on"],
										[false, "Off"],
									] as const
								).map(([value, label]) => (
									<button
										key={label}
										type="button"
										aria-pressed={on === value}
										onClick={() => setOn(value)}
										className={cn(
											"rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
											on === value
												? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_var(--border)]"
												: "text-ink-2 hover:text-foreground",
										)}
									>
										{label}
									</button>
								))}
							</fieldset>
						</div>
						<p
							aria-live="polite"
							className="m-0 text-pretty text-[clamp(1.15rem,2vw,1.45rem)] leading-normal tracking-[-0.01em]"
						>
							{on ? (
								<>
									So I think we should move the design review to{" "}
									<mark className="rounded bg-lime px-[3px] text-lime-ink">
										Friday
									</mark>
									. And can you send Priya the Figma link before then?
								</>
							) : (
								HEARD
							)}
						</p>
						<div className="flex flex-wrap gap-2">
							{on ? (
								<>
									<Note kept>Filler removed</Note>
									<Note kept>Correction applied</Note>
									<Note kept>Punctuation fixed</Note>
								</>
							) : (
								<Note>Pasted as heard</Note>
							)}
						</div>
					</div>
				</div>

				<fieldset className="m-0 min-w-0 border-0 p-0 mt-5 grid gap-2.5 md:grid-cols-3">
					<legend className="sr-only">Cleanup model</legend>
					{CLEANUP_TIERS.map((t) => (
						<button
							key={t.id}
							type="button"
							aria-pressed={tier === t.id}
							onClick={() => setTier(t.id)}
							className={cn(
								"grid content-start gap-1.5 rounded-[14px] border px-[18px] py-4 text-left transition-colors",
								tier === t.id
									? "border-foreground bg-card shadow-[0_0_0_1px_var(--foreground)]"
									: "border-border hover:bg-card",
							)}
						>
							<span className="flex flex-wrap items-baseline justify-between gap-2">
								<b className="text-[15px]">{t.name}</b>
								<span className="font-mono text-xs text-muted-foreground">
									{t.size}
								</span>
							</span>
							{t.recommended && (
								<span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-success">
									Recommended
								</span>
							)}
							<span className="text-[13.5px] leading-snug text-muted-foreground">
								{t.blurb}
							</span>
						</button>
					))}
				</fieldset>

				<p className="mt-3.5 max-w-[70ch] text-[13px] text-muted-foreground">
					Cleanup is optional. Turn it off and Parrot pastes exactly what the
					speech model heard. If you'd rather not wait for cleanup, switch it to
					Background: Parrot pastes right away, and if the cleaned version
					differs, press <Kbd>⌘⇧C</Kbd> within 8 seconds to paste the cleaned
					version.
				</p>
			</div>
		</section>
	);
}
