import { Link } from "@tanstack/react-router";
import {
	AppWindow,
	CircleDot,
	ClipboardPaste,
	History,
	Infinity as InfinityIcon,
	Keyboard,
	Languages,
	type LucideIcon,
	PlaneTakeoff,
	WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { Kbd } from "@/components/kbd";
import { SectionHead } from "@/components/section-head";
import { type Competitor, getCompetitor } from "@/lib/competitors";
import { PARROT_FACTS } from "@/lib/parrot-facts";
import { cn } from "@/lib/utils";

const DETAILS: { icon: LucideIcon; title: string; body: ReactNode }[] = [
	{
		icon: Keyboard,
		title: "One key, any app",
		body: (
			<>
				Hold <Kbd>{PARROT_FACTS.defaultHotkey}</Kbd> from anywhere to dictate.
				Rebind it to any shortcut you like.
			</>
		),
	},
	{
		icon: ClipboardPaste,
		title: "Pastes at your cursor",
		body: "Text lands in whatever field you're in. There are no plugins to install.",
	},
	{
		icon: CircleDot,
		title: "A HUD that stays small",
		body: "A small orb in the corner shows when Parrot is recording, transcribing or cleaning up.",
	},
	{
		icon: History,
		title: "Searchable history",
		body: "Every dictation is saved with its time and length. Search it, copy one again or delete it.",
	},
	{
		icon: WandSparkles,
		title: "Skip the wait",
		body: (
			<>
				In Background mode Parrot pastes right away, and <Kbd>⌘⇧C</Kbd> pastes
				the cleaned version if it differs.
			</>
		),
	},
	{
		icon: AppWindow,
		title: "Per-app styles",
		body: "Casual in chat, formal in email, bullets in notes. Set a writing style once per app.",
	},
	{
		icon: Languages,
		title: "Hindi and English, mixed",
		body: "An experimental mode for people who switch languages mid-sentence. Uses Whisper turbo.",
	},
	{
		icon: PlaneTakeoff,
		title: "Offline by default",
		body: "After the first download, Parrot doesn't need a connection to dictate.",
	},
	{
		icon: InfinityIcon,
		title: "No account, no limits",
		body: "No sign-in, no weekly word cap and no trial that runs out.",
	},
];

export function DetailsSection() {
	return (
		<section className="px-4 pb-[clamp(104px,14vw,184px)] md:px-8">
			<div className="mx-auto max-w-[1160px]">
				<SectionHead
					title="Small things"
					quiet="you'll use every day."
					className="mb-[clamp(44px,6vw,72px)]"
				/>
				<div className="grid border-t border-l border-border sm:grid-cols-2 lg:grid-cols-3">
					{DETAILS.map(({ icon: Icon, title, body }) => (
						<div
							key={title}
							className="grid content-start gap-2 border-r border-b border-border p-6"
						>
							<Icon
								aria-hidden="true"
								className="mb-1.5 size-[22px] text-leaf"
								strokeWidth={1.75}
							/>
							<h3 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">
								{title}
							</h3>
							<p className="m-0 text-[14.5px] leading-normal text-muted-foreground">
								{body}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// Every competitor cell comes from lib/competitors.ts, the same source as the
// /compare pages. A row names the feature as each competitor's entry spells it;
// a missing feature fails loudly instead of rendering a guess.
const RIVALS = ["wispr-flow", "superwhisper"] as const;

const ROWS: {
	label: string;
	feature: Record<(typeof RIVALS)[number], string>;
}[] = [
	{
		label: "Runs on your Mac",
		feature: {
			"wispr-flow": "On-device transcription",
			superwhisper: "Fully local",
		},
	},
	{
		label: "AI cleanup",
		feature: { "wispr-flow": "AI cleanup", superwhisper: "AI cleanup" },
	},
	{
		label: "Custom vocabulary",
		feature: {
			"wispr-flow": "Custom vocabulary",
			superwhisper: "Custom vocabulary",
		},
	},
	{
		label: "Works offline",
		feature: { "wispr-flow": "Works offline", superwhisper: "Works offline" },
	},
	{
		label: "Windows",
		feature: { "wispr-flow": "Windows", superwhisper: "Windows" },
	},
];

function lookup(c: Competitor, name: string) {
	const row = c.features.find((f) => f.name === name);
	if (!row) throw new Error(`competitors.ts: ${c.slug} has no "${name}" row`);
	return row;
}

function Cell({ value, us }: { value: string | boolean; us?: boolean }) {
	const text = value === true ? "Yes" : value === false ? "No" : value;
	return (
		<td
			className={cn(
				"border-b border-border px-4 py-3.5",
				us && "bg-[color-mix(in_srgb,var(--brand-lime)_30%,transparent)]",
				value === true && "font-semibold text-success",
				value === false && "text-muted-foreground",
			)}
		>
			{text}
		</td>
	);
}

export function CompareSection() {
	const rivals = RIVALS.map((slug) => {
		const c = getCompetitor(slug);
		if (!c) throw new Error(`competitors.ts: missing ${slug}`);
		return c;
	});
	// Parrot's own values are the same in every entry; read them from the first.
	const ours = (row: (typeof ROWS)[number]) =>
		lookup(rivals[0], row.feature[rivals[0].slug as (typeof RIVALS)[number]])
			.parrot;

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: #compare is linked from the footer; rendered once
		<section
			id="compare"
			className="scroll-mt-20 px-4 pb-[clamp(104px,14vw,184px)] md:px-8"
		>
			<div className="mx-auto max-w-[1160px]">
				<SectionHead
					title="The same job,"
					quiet="without the subscription."
					className="mb-[clamp(44px,6vw,72px)]"
				/>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[560px] border-collapse text-[15px]">
						<thead>
							<tr className="text-left align-bottom">
								<th className="border-b border-border px-4 py-3.5" />
								<th className="rounded-t-xl border-b border-border bg-[color-mix(in_srgb,var(--brand-lime)_30%,transparent)] px-4 py-3.5 font-semibold">
									Parrot
									<small className="mt-0.5 block font-mono text-xs font-normal text-muted-foreground">
										{PARROT_FACTS.price}
									</small>
								</th>
								{rivals.map((c) => (
									<th
										key={c.slug}
										className="border-b border-border px-4 py-3.5 font-semibold"
									>
										{c.name}
										<small className="mt-0.5 block font-mono text-xs font-normal text-muted-foreground">
											{c.pricing.theirPaid}
										</small>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{ROWS.map((row) => (
								<tr key={row.label}>
									<td className="border-b border-border px-4 py-3.5 text-ink-2">
										{row.label}
									</td>
									<Cell value={ours(row)} us />
									{rivals.map((c) => (
										<Cell
											key={c.slug}
											value={
												lookup(
													c,
													row.feature[c.slug as (typeof RIVALS)[number]],
												).them
											}
										/>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="mt-[18px] flex flex-wrap items-baseline gap-x-[18px] gap-y-2 text-[14.5px]">
					{(
						[
							["wispr-flow", "Parrot vs Wispr Flow"],
							["superwhisper", "vs Superwhisper"],
							["macwhisper", "vs MacWhisper"],
							["dragon-professional", "vs Dragon"],
						] as const
					).map(([competitor, label]) => (
						<Link
							key={competitor}
							to="/compare/$competitor"
							params={{ competitor }}
							className="text-ink-2 underline decoration-border underline-offset-[3px] hover:text-foreground"
						>
							{label} →
						</Link>
					))}
					<span className="text-[13px] text-muted-foreground">
						Prices checked {rivals[0].pricesCheckedOn}.
					</span>
				</div>
			</div>
		</section>
	);
}
