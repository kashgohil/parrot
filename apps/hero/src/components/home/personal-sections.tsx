import { useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { FeatureNotes } from "@/components/feature-notes";
import { Panel } from "@/components/panel";
import { SectionHead } from "@/components/section-head";
import { cn } from "@/lib/utils";

// Vocabulary and per-app writing style. Both describe the desktop app as built:
// - Vocabulary (apps/desktop/src-tauri/src/vocab.rs): plain terms become Whisper
//   hints and "always spell as" rules for cleanup; terms with a context note
//   become conditional cleanup rules.
// - Per-app modes (settings.tsx AppProfilesSection): per bundle ID, override the
//   context or the free-text writing style, or turn cleanup off.

const SECTION = "px-4 pb-[clamp(104px,14vw,184px)] md:px-8";
const SPLIT =
	"mx-auto grid max-w-[1160px] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-[72px]";

const WORDS: { term: string; note?: string; fresh?: boolean }[] = [
	{ term: "Kubernetes", fresh: true },
	{ term: "Priya Raman" },
	{ term: "useAuth" },
	{ term: "PostgreSQL" },
	{ term: "Mercury", note: "the bank, in finance talk" },
	{ term: "Northwind" },
];

export function VocabularySection() {
	return (
		<section className={SECTION}>
			<div className={SPLIT}>
				<div>
					<SectionHead
						title="Names and jargon,"
						quiet="spelled right."
						lede="Add the words you use that a speech model has never heard: coworkers, clients, products, code. Parrot hands them to the speech model as hints and to cleanup as spellings to keep."
						className="mb-7"
					/>
					<FeatureNotes
						items={[
							{
								title: "People and places",
								body: 'Priya Raman instead of "pre a ramen". Add a name once and it stays spelled right.',
							},
							{
								title: "Code and acronyms",
								body: "useAuth, PostgreSQL, SOC 2, OAuth. Casing comes out the way you write it.",
							},
							{
								title: "Notes for tricky words",
								body: "Give a word a short note, like when it applies, and cleanup only uses it where it fits.",
							},
						]}
					/>
				</div>

				<Panel
					title="Vocabulary"
					aside={`${WORDS.length} words`}
					label="Example vocabulary window"
				>
					<div className="flex items-center gap-2.5 border-b border-border px-[18px] py-3">
						<span className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-[13.5px] text-muted-foreground">
							Add a word or name…
						</span>
						<span className="rounded-lg bg-foreground px-3 py-2 text-[13px] font-semibold text-background">
							Add
						</span>
					</div>
					<ul className="m-0 list-none p-0">
						{WORDS.map((w) => (
							<li
								key={w.term}
								className={cn(
									"grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-[18px] py-[11px]",
									w.fresh &&
										"bg-[color-mix(in_srgb,var(--brand-lime)_35%,transparent)]",
								)}
							>
								<b className="font-semibold">{w.term}</b>
								<span className="text-right font-mono text-xs text-muted-foreground">
									{w.note ?? ""}
								</span>
							</li>
						))}
					</ul>
					<div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3.5 bg-sunk px-[18px] py-4">
						<div className="grid min-w-0 gap-0.5">
							<small className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
								Before
							</small>
							<s className="text-muted-foreground decoration-beak">
								cooper netties cluster
							</s>
						</div>
						<span aria-hidden="true" className="text-muted-foreground">
							→
						</span>
						<div className="grid min-w-0 gap-0.5">
							<small className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
								After
							</small>
							<b>Kubernetes cluster</b>
						</div>
					</div>
				</Panel>
			</div>
		</section>
	);
}

type StyleApp = "slack" | "mail" | "notes";

const STYLES: Record<StyleApp, { name: string; style: string; out: string }> = {
	slack: {
		name: "Slack",
		style: "Casual and short. Lowercase is fine, no sign-off.",
		out: "hey, can you look over the draft before tomorrow? want to send it out by noon",
	},
	mail: {
		name: "Mail",
		style: "Full sentences, a greeting and a sign-off.",
		out: "Hi,\n\nCould you look over the draft before tomorrow? I'd like to send it out by noon.\n\nThanks,",
	},
	notes: {
		name: "Notes",
		style: "Brief bullets, no fluff.",
		out: "• Review the draft before tomorrow\n• Send it out by noon",
	},
};

export function WritingStyleSection() {
	const [app, setApp] = useState<StyleApp>("slack");
	const current = STYLES[app];

	return (
		<section className={SECTION}>
			<div className={SPLIT}>
				<div className="lg:order-2">
					<SectionHead
						title="Casual in Slack."
						quiet="Careful in Mail."
						lede="Tell Parrot who you are and how you write, then give any app its own writing style. The same sentence comes out differently depending on where your cursor is."
						className="mb-7"
					/>
					<FeatureNotes
						items={[
							{
								title: "Your context",
								body: "A line or two about your work, so cleanup knows which words and tone fit.",
							},
							{
								title: "Per-app modes",
								body: "Parrot recognizes the app in front by its bundle ID, with no screen capture, and applies that app's style. You can also turn cleanup off for one app.",
							},
						]}
					/>
				</div>

				<Panel
					title="Settings › Per-app"
					label="Example per-app writing styles"
				>
					<div
						role="tablist"
						aria-label="App"
						className="mx-[18px] mt-3.5 inline-flex flex-wrap gap-0.5 rounded-full border border-border bg-muted p-1"
					>
						{(Object.keys(STYLES) as StyleApp[]).map((id) => (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={app === id}
								onClick={() => setApp(id)}
								className={cn(
									"inline-flex items-center gap-[7px] rounded-full px-3.5 py-[7px] text-sm font-medium transition-colors",
									app === id
										? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_var(--border)]"
										: "text-ink-2 hover:text-foreground",
								)}
							>
								<AppIcon app={id} />
								{STYLES[id].name}
							</button>
						))}
					</div>
					<div className="grid gap-1 px-[18px] pt-4">
						<small className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
							You said
						</small>
						<p className="m-0 text-muted-foreground">
							"hey can you look over the draft before tomorrow I want to send it
							out by noon"
						</p>
					</div>
					<div
						role="tabpanel"
						className="m-[18px] grid min-h-[150px] content-start gap-2 rounded-xl border border-border px-[18px] py-4"
					>
						<small className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
							Pasted in {current.name}
						</small>
						<p
							aria-live="polite"
							className="m-0 whitespace-pre-line text-base leading-normal"
						>
							{current.out}
						</p>
						<p className="m-0 mt-auto border-t border-dashed border-border pt-2.5 text-[13px] text-muted-foreground">
							Writing style for {current.name}: "{current.style}"
						</p>
					</div>
				</Panel>
			</div>
		</section>
	);
}
