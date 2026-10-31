import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Folder } from "lucide-react";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import { FeatureNotes } from "@/components/feature-notes";
import { AppleLogo } from "@/components/home/hero";
import { Kbd } from "@/components/kbd";
import { SectionHead } from "@/components/section-head";
import { buttonVariants } from "@/components/ui/button";
import { SPEECH_MODELS } from "@/lib/models";
import { PARROT_FACTS } from "@/lib/parrot-facts";

export type ReleaseState =
	| { status: "loading" }
	| { status: "ready"; url: string; version: string }
	| { status: "no-release" }
	| { status: "error" };

const WRAP = "mx-auto max-w-[1224px] px-4 md:px-8";
const SECTION = "pb-[clamp(104px,14vw,184px)]";
const LINK =
	"text-ink-2 underline decoration-border underline-offset-[3px] hover:text-foreground";

// Facts on this page are checked against apps/desktop:
// - macOS: tauri.conf.json sets 10.15, and every Apple Silicon Mac runs 11+.
// - 5 GB: local_setup.rs refuses setup with less free space.
// - Permission prompt text: src-tauri/Info.plist NSMicrophoneUsageDescription.
// - Onboarding model names and sizes: SPEECH_MODELS (tested against the app).
// - Hotkey: hold fn to record, release to stop (hotkey.rs).

export function DownloadView({
	release,
	mac,
	faq,
	releasesPage,
}: {
	release: ReleaseState;
	mac: boolean;
	faq: { title: string; body: string }[];
	releasesPage: string;
}) {
	const version =
		release.status === "ready" ? release.version : `v${PARROT_FACTS.version}`;

	return (
		<div className="min-h-screen">
			<section
				className={`${WRAP} pt-[clamp(48px,8vw,96px)] pb-[clamp(80px,11vw,128px)]`}
			>
				<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
					<div className="grid gap-6">
						<SectionHead
							as="h1"
							title="Get Parrot for Mac."
							quiet="Free, for life."
							lede={`${PARROT_FACTS.entity} No account and no subscription.`}
						/>
						<div className="grid justify-items-start gap-3">
							{release.status === "ready" ? (
								<a
									href={release.url}
									className={buttonVariants({
										variant: "ink",
										size: "pill",
										className: "no-underline",
									})}
								>
									<AppleLogo />
									Download for Mac
								</a>
							) : (
								<span
									aria-live="polite"
									className="inline-flex h-11 items-center gap-2.5 rounded-full border border-border px-5 text-[15px] font-semibold text-muted-foreground"
								>
									<AppleLogo />
									{release.status === "loading"
										? "Finding the latest release…"
										: "Download unavailable"}
								</span>
							)}
							<p className="m-0 font-mono text-[12.5px] text-muted-foreground">
								{version} · .dmg · {PARROT_FACTS.osRequirement}
							</p>
							{release.status === "no-release" && (
								<p className="m-0 text-sm text-muted-foreground">
									No public release yet. Check the{" "}
									<a href={releasesPage} className={LINK}>
										releases page
									</a>{" "}
									on GitHub, or follow{" "}
									<a href="/rss.xml" className={LINK}>
										RSS
									</a>{" "}
									for updates.
								</p>
							)}
							{release.status === "error" && (
								<p className="m-0 text-sm text-muted-foreground">
									Couldn't reach GitHub. Get the latest .dmg from{" "}
									<a href={releasesPage} className={LINK}>
										the releases page
									</a>
									.
								</p>
							)}
							{!mac && release.status !== "loading" && (
								<p className="m-0 text-sm text-muted-foreground">
									Parrot is macOS-only for now. Windows and Linux aren't
									planned.
								</p>
							)}
						</div>
					</div>
					<DragToInstall />
				</div>

				<dl className="m-0 mt-[clamp(48px,7vw,72px)] grid grid-cols-1 border-y border-border sm:grid-cols-3">
					{(
						[
							[
								"Apple Silicon",
								"M1, M2, M3 or M4. Intel Macs aren't supported.",
							],
							["macOS 11 or later", "Every Apple Silicon Mac already runs it."],
							["5 GB free", "Setup checks for room to download the models."],
						] as const
					).map(([value, label], i) => (
						<div
							key={value}
							className={`grid content-start gap-1.5 py-6 sm:pr-6 ${i > 0 ? "border-t border-border sm:border-t-0 sm:border-l sm:pl-6" : ""}`}
						>
							<dt className="order-2 text-sm text-muted-foreground">{label}</dt>
							<dd className="order-1 m-0 text-[22px] font-bold tracking-[-0.02em] text-foreground">
								{value}
							</dd>
						</div>
					))}
				</dl>
			</section>

			<section className={`${WRAP} ${SECTION}`}>
				<SectionHead
					title="Install in"
					quiet="about a minute."
					className="mb-[clamp(44px,6vw,72px)]"
				/>
				<ol className="m-0 grid list-none gap-0 p-0">
					<Step
						n={1}
						title="Download the .dmg"
						body={`The button above gets the latest signed build for ${PARROT_FACTS.osRequirement}.`}
						visual={<DmgFile version={version} />}
					/>
					<Step
						n={2}
						title="Drag Parrot to Applications"
						body="Open the .dmg, drag Parrot into your Applications folder, then eject the disk image."
						visual={<DragToInstall compact />}
					/>
					<Step
						n={3}
						title="Allow Microphone and Accessibility"
						body="On first launch macOS asks for both. Microphone lets Parrot hear you; Accessibility lets it paste at your cursor."
						visual={<PermissionPrompt />}
					/>
					<Step
						n={4}
						title="Pick your models"
						body="Choose the speech model that suits your languages and Mac. Parrot downloads it once, then runs offline."
						visual={<ModelChoice />}
					/>
					<Step
						n={5}
						title={`Hold ${PARROT_FACTS.defaultHotkey} and talk`}
						body={
							<>
								In any app, hold <Kbd>{PARROT_FACTS.defaultHotkey}</Kbd>, speak,
								and let go. Your words paste where your cursor is.
							</>
						}
						visual={<RecordingChip />}
					/>
				</ol>
			</section>

			<section className={`${WRAP} ${SECTION}`}>
				<SectionHead title="What you get" quiet="for free." className="mb-7" />
				<FeatureNotes
					className="sm:grid-cols-2 lg:grid-cols-3"
					items={[
						{
							title: "One hotkey",
							body: `Hold ${PARROT_FACTS.defaultHotkey} in any app. Let go and your words paste at the cursor.`,
						},
						{
							title: "Speech to text on your Mac",
							body: "Fast transcription with nothing uploaded.",
						},
						{
							title: "Custom vocabulary",
							body: "Teach Parrot your names, jargon and acronyms once.",
						},
						{
							title: "Optional cleanup",
							body: "A small model on your Mac removes filler and fixes punctuation.",
						},
						{
							title: "Local history",
							body: "Every dictation is saved on your Mac. Search it, copy it again or delete it.",
						},
						{
							title: "A small native app",
							body: "Lives in your menu bar. Built with Tauri, not Electron.",
						},
					]}
				/>
			</section>

			<section className={`${WRAP} ${SECTION}`}>
				<div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
					<SectionHead
						title="Common"
						quiet="questions."
						className="content-start self-start lg:sticky lg:top-24"
					/>
					<div>
						{faq.map((item) => (
							<details
								key={item.title}
								className="group border-b border-border first:border-t"
							>
								<summary className="relative cursor-pointer list-none py-5 pr-9 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
									{item.title}
									<span
										aria-hidden="true"
										className="absolute top-4 right-1 text-[22px] font-normal text-muted-foreground transition-transform group-open:rotate-45"
									>
										+
									</span>
								</summary>
								<p className="m-0 max-w-[60ch] pb-5 text-ink-2">{item.body}</p>
							</details>
						))}
					</div>
				</div>
			</section>

			<section className={`${WRAP} ${SECTION}`}>
				<SectionHead
					title="Before or"
					quiet="after you install."
					className="mb-7"
				/>
				<ul className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-2">
					<RelatedLink
						to="/blog/local-voice-dictation-mac"
						title="Local setup guide"
						body="On-device dictation in under five minutes."
					/>
					<RelatedLink
						to="/blog/free-voice-dictation-apps-2026"
						title="Free dictation apps"
						body="What free forever and free tier actually mean."
					/>
					<RelatedLink
						to="/changelog"
						title="Changelog"
						body="What changed in each release."
					/>
					<RelatedLink
						href={releasesPage}
						title="All releases"
						body="Older versions on GitHub."
					/>
					<RelatedLink to="/contact" title="Need help?" body="Get in touch." />
				</ul>
			</section>

			<Footer />
		</div>
	);
}

function Step({
	n,
	title,
	body,
	visual,
}: {
	n: number;
	title: string;
	body: ReactNode;
	visual: ReactNode;
}) {
	return (
		<li className="grid items-center gap-x-8 gap-y-4 border-t border-border py-7 md:grid-cols-[56px_minmax(0,1fr)_minmax(0,300px)]">
			<span className="font-mono text-sm text-muted-foreground tabular-nums">
				{String(n).padStart(2, "0")}
			</span>
			<div className="grid gap-1.5">
				<h3 className="m-0 text-[19px] font-semibold tracking-[-0.01em]">
					{title}
				</h3>
				<p className="m-0 max-w-[48ch] text-[15px] leading-normal text-muted-foreground">
					{body}
				</p>
			</div>
			<div aria-hidden="true">{visual}</div>
		</li>
	);
}

function MiniPanel({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-xl border border-border bg-card p-4 text-[13px] shadow-[0_12px_28px_-20px_rgba(16,37,26,0.4)]">
			{children}
		</div>
	);
}

function AppTile({ size = 44 }: { size?: number }) {
	return (
		<span
			className="grid place-items-center rounded-[22%] border border-border bg-card shadow-sm"
			style={{ width: size, height: size }}
		>
			<img
				src="/parrot-192.png"
				alt=""
				width={size * 0.72}
				height={size * 0.72}
			/>
		</span>
	);
}

function DmgFile({ version }: { version: string }) {
	return (
		<MiniPanel>
			<div className="flex items-center gap-3">
				<span className="grid h-10 w-8 place-items-center rounded-[5px] border border-border bg-sunk font-mono text-[9px] text-muted-foreground">
					DMG
				</span>
				<div className="grid min-w-0">
					<b className="truncate font-mono text-[12.5px] font-medium">
						Parrot_{version.replace(/^v/, "")}_aarch64.dmg
					</b>
					<span className="text-muted-foreground">Signed and notarized</span>
				</div>
				<Check className="ml-auto size-4 shrink-0 text-success" />
			</div>
		</MiniPanel>
	);
}

function DragToInstall({ compact }: { compact?: boolean }) {
	const tile = compact ? 40 : 72;
	return (
		<div
			aria-hidden={compact ? undefined : true}
			className={`grid place-items-center rounded-[18px] border border-border bg-sunk ${compact ? "p-4" : "p-[clamp(24px,5vw,48px)]"}`}
		>
			<div className="flex items-center gap-[clamp(16px,4vw,40px)]">
				<div className="grid justify-items-center gap-2">
					<AppTile size={tile} />
					<span className="text-xs font-medium">Parrot</span>
				</div>
				<ArrowRight
					className="size-5 text-muted-foreground"
					strokeWidth={1.75}
				/>
				<div className="grid justify-items-center gap-2">
					<span
						className="grid place-items-center rounded-[22%] bg-[color-mix(in_srgb,var(--brand-info)_14%,var(--card))]"
						style={{ width: tile, height: tile }}
					>
						<Folder className="size-[55%] text-info" strokeWidth={1.5} />
					</span>
					<span className="text-xs font-medium">Applications</span>
				</div>
			</div>
		</div>
	);
}

function PermissionPrompt() {
	return (
		<MiniPanel>
			<div className="grid justify-items-center gap-2 text-center">
				<AppTile size={36} />
				<b className="text-[13px]">
					“Parrot” would like to access the microphone.
				</b>
				<span className="text-xs text-muted-foreground">
					Parrot needs microphone access to transcribe your voice into text.
				</span>
				<div className="mt-1 grid w-full grid-cols-2 gap-2">
					<span className="rounded-md border border-border py-1 text-xs">
						Don't Allow
					</span>
					<span className="rounded-md bg-info py-1 text-xs font-semibold text-card">
						Allow
					</span>
				</div>
			</div>
		</MiniPanel>
	);
}

function ModelChoice() {
	return (
		<MiniPanel>
			<div className="grid gap-2">
				{SPEECH_MODELS.slice(0, 2).map((m) => (
					<div
						key={m.id}
						className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${m.recommended ? "border-foreground" : "border-border"}`}
					>
						<span className="font-medium">{m.label}</span>
						<span className="font-mono text-[11px] text-muted-foreground">
							{m.size}
						</span>
					</div>
				))}
			</div>
		</MiniPanel>
	);
}

function RecordingChip() {
	return (
		<div className="grid place-items-center rounded-xl border border-border bg-sunk p-6">
			<span className="flex h-7 items-center gap-2 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground">
				<span className="size-2 rounded-full bg-current" />
				<span className="flex h-3 items-center gap-[2px]">
					{[6, 10, 5, 12, 7].map((h, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: static bar heights
							key={i}
							className="w-[2px] rounded-sm bg-current"
							style={{ height: h }}
						/>
					))}
				</span>
				<span className="tabular-nums opacity-90">0:03</span>
			</span>
		</div>
	);
}

function RelatedLink({
	to,
	href,
	title,
	body,
}: {
	to?: string;
	href?: string;
	title: string;
	body: string;
}) {
	const inner = (
		<>
			<span className="text-[16px] font-semibold leading-snug text-foreground group-hover:text-success">
				{title} →
			</span>
			<span className="text-sm text-muted-foreground">{body}</span>
		</>
	);
	return (
		<li className="border-t border-border">
			{to ? (
				<Link to={to} className="group grid gap-1 py-4 no-underline">
					{inner}
				</Link>
			) : (
				<a href={href} className="group grid gap-1 py-4 no-underline">
					{inner}
				</a>
			)}
		</li>
	);
}
