import { FeatureNotes } from "@/components/feature-notes";
import { SectionHead } from "@/components/section-head";
import { CLEANUP_TIERS, SPEECH_MODELS } from "@/lib/models";

// Privacy claims here are checked against apps/desktop:
// - Network: the only outbound requests are model downloads (local_setup.rs) and
//   the updater (tauri.conf.json endpoint; src/lib/updater.ts checks at launch,
//   every 30 minutes and on focus). Ollama cleanup talks to 127.0.0.1.
// - Storage: db.rs and local_setup.rs put everything under
//   ~/Library/Application Support/com.kash.parrot. Audio is kept only when
//   "Save audio recordings" is on.

const APP_SUPPORT = "~/Library/Application Support/com.kash.parrot";

const LEAVES: { what: string; to: string; when: string; never?: boolean }[] = [
	{
		what: "Your voice, transcripts, vocabulary and history",
		to: "Nowhere",
		when: "Never",
		never: true,
	},
	{
		what: "Model files",
		to: "Downloaded from Hugging Face (Parakeet from blob.handy.computer)",
		when: "During setup, and when you switch models",
	},
	{
		what: "Update check",
		to: "github.com",
		when: "At launch, then every 30 minutes",
	},
];

export function PrivacySection() {
	return (
		// biome-ignore lint/correctness/useUniqueElementIds: #privacy is the header nav target; rendered once
		<section
			id="privacy"
			className="scroll-mt-20 bg-band px-4 py-[clamp(104px,14vw,184px)] text-band-ink md:px-8"
		>
			<div className="mx-auto grid max-w-[1160px] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-[72px]">
				<div>
					<SectionHead
						tone="band"
						title="Your voice"
						quiet="stays on this Mac."
						lede="Parrot has no servers to send your audio to. You download the models once. After that, recording, transcription, cleanup and history all happen on your machine."
						className="mb-7"
					/>
					<FeatureNotes
						tone="band"
						items={[
							{
								title: "Works in Airplane mode",
								body: "Once setup finishes, Parrot doesn't need the internet to dictate.",
							},
							{
								title: "No account",
								body: "No sign-up, no email, no API keys. Open it and press fn.",
							},
							{
								title: "History you control",
								body: "Search past dictations, copy them again, or delete them. Recordings are kept only if you turn on Save audio.",
							},
						]}
					/>
				</div>

				<figure
					aria-label="Everything Parrot sends off your Mac"
					className="m-0 overflow-hidden rounded-2xl border border-band-line bg-band-2 text-sm"
				>
					<figcaption className="flex items-center gap-2.5 border-b border-band-line px-[18px] py-3.5">
						<b className="font-semibold">What leaves your Mac</b>
						<span className="ml-auto font-mono text-xs text-band-muted">
							all of it
						</span>
					</figcaption>
					<table className="w-full border-collapse">
						<thead>
							<tr className="text-left font-mono text-[11px] uppercase tracking-[0.08em] text-band-muted">
								<th className="border-b border-band-line px-[18px] py-2.5 font-normal">
									What
								</th>
								<th className="border-b border-band-line px-[18px] py-2.5 font-normal max-sm:hidden">
									Where to
								</th>
								<th className="border-b border-band-line px-[18px] py-2.5 font-normal">
									When
								</th>
							</tr>
						</thead>
						<tbody>
							{LEAVES.map((row) => (
								<tr
									key={row.what}
									className={
										row.never
											? "bg-[color-mix(in_srgb,var(--brand-band-accent)_10%,transparent)]"
											: undefined
									}
								>
									<td className="border-b border-band-line px-[18px] py-3 align-top font-semibold">
										{row.what}
									</td>
									<td
										className={`border-b border-band-line px-[18px] py-3 align-top max-sm:hidden ${row.never ? "text-band-accent" : "text-band-muted"}`}
									>
										{row.to}
									</td>
									<td
										className={`border-b border-band-line px-[18px] py-3 align-top ${row.never ? "font-semibold text-band-accent" : "text-band-muted"}`}
									>
										{row.when}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<dl className="m-0 grid gap-2.5 px-[18px] py-4 text-[13.5px]">
						{(
							[
								["History and settings", `${APP_SUPPORT}/parrot.db`],
								["Models", `${APP_SUPPORT}/models`],
								[
									"Cleanup with Ollama",
									"Optional, and it runs on your Mac too (localhost)",
								],
							] as const
						).map(([label, value]) => (
							<div
								key={label}
								className="grid gap-x-3 gap-y-0.5 sm:grid-cols-[150px_minmax(0,1fr)]"
							>
								<dt className="text-band-muted">{label}</dt>
								<dd className="m-0 font-mono text-xs [overflow-wrap:anywhere]">
									{value}
								</dd>
							</div>
						))}
					</dl>
				</figure>
			</div>
		</section>
	);
}

export function ModelsSection() {
	return (
		// biome-ignore lint/correctness/useUniqueElementIds: #models is the header nav target; rendered once
		<section
			id="models"
			className="scroll-mt-20 px-4 py-[clamp(104px,14vw,184px)] md:px-8"
		>
			<div className="mx-auto max-w-[1160px]">
				<SectionHead
					title="What runs"
					quiet="on your Mac."
					lede="Parrot uses open models that are small enough to run locally. You pick the ones that suit your Mac and switch whenever you want."
					className="mb-[clamp(44px,6vw,72px)]"
				/>
				<div className="overflow-x-auto rounded-[18px] border border-border bg-card">
					<table className="w-full min-w-[640px] border-collapse text-[14.5px]">
						<thead>
							<tr className="bg-sunk text-left font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
								<th className="px-5 py-3.5 font-medium">Step</th>
								<th className="px-5 py-3.5 font-medium">Model</th>
								<th className="px-5 py-3.5 font-medium">Download</th>
								<th className="px-5 py-3.5 font-medium">Good for</th>
							</tr>
						</thead>
						<tbody className="[&_td]:border-t [&_td]:border-border [&_td]:px-5 [&_td]:py-[15px] [&_td]:align-top">
							{SPEECH_MODELS.map((m) => (
								<tr key={m.id}>
									<td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
										Speech
									</td>
									<td className="whitespace-nowrap font-semibold">{m.model}</td>
									<td className="whitespace-nowrap font-mono text-[13px] tabular-nums">
										{m.size}
									</td>
									<td className="text-ink-2">
										{m.blurb}
										{m.recommended && <Tag>Default</Tag>}
										{m.experimental && (
											<Tag
												experimental
											>{`${m.experimental}: experimental`}</Tag>
										)}
									</td>
								</tr>
							))}
							{CLEANUP_TIERS.map((t) => (
								<tr key={t.id}>
									<td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
										Cleanup
									</td>
									<td className="whitespace-nowrap font-semibold">
										{t.model}
										<small className="block font-mono text-[11.5px] font-normal text-muted-foreground">
											{t.name} · Q4_K_M
										</small>
									</td>
									<td className="whitespace-nowrap font-mono text-[13px] tabular-nums">
										{t.size}
									</td>
									<td className="text-ink-2">
										{t.blurb}
										{t.recommended && <Tag>Default</Tag>}
									</td>
								</tr>
							))}
							<tr>
								<td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
									Cleanup
								</td>
								<td className="whitespace-nowrap font-semibold">
									Ollama
									<small className="block font-mono text-[11.5px] font-normal text-muted-foreground">
										Bring your own
									</small>
								</td>
								<td className="whitespace-nowrap font-mono text-[13px]">
									yours
								</td>
								<td className="text-ink-2">
									Point cleanup at a model you already run in Ollama.
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}

function Tag({
	children,
	experimental,
}: {
	children: string;
	experimental?: boolean;
}) {
	return (
		<span
			className={`ml-2 inline-block rounded-[5px] px-[7px] py-0.5 align-[1px] font-mono text-[10.5px] uppercase tracking-[0.06em] ${experimental ? "bg-beak-soft text-danger" : "bg-lime text-lime-ink"}`}
		>
			{children}
		</span>
	);
}
