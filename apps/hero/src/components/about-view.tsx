import { Link } from "@tanstack/react-router";
import Footer from "@/components/Footer";
import { FeatureNotes } from "@/components/feature-notes";
import { Kbd } from "@/components/kbd";
import { Panel } from "@/components/panel";
import { SectionHead } from "@/components/section-head";
import { PARROT_FACTS } from "@/lib/parrot-facts";

const WRAP = "mx-auto max-w-[1160px] px-4 md:px-8";
const SECTION = "pb-[clamp(72px,10vw,128px)]";
const LINK =
	"text-ink-2 underline decoration-border underline-offset-[3px] hover:text-foreground";

// The stack as built (apps/desktop/src-tauri/Cargo.toml).
const STACK: [string, string][] = [
	["App", "Tauri 2 and Rust, with a React interface"],
	["Audio", "cpal, captured on your Mac"],
	["Speech", "whisper.cpp on Metal, or Parakeet on ONNX with Core ML"],
	["Cleanup", "llama.cpp in its own process, or your Ollama"],
	["Storage", "SQLite in Application Support"],
	["Paste", "The clipboard and a simulated ⌘V via enigo"],
];

export function AboutView() {
	return (
		<div className="min-h-screen">
			<section className={`${WRAP} pt-[clamp(48px,8vw,96px)] ${SECTION}`}>
				<SectionHead
					as="h1"
					eyebrow="About"
					title="About Parrot."
					quiet="Dictation that stays on your Mac."
					lede={
						<>
							{PARROT_FACTS.entity} Hold <Kbd>{PARROT_FACTS.defaultHotkey}</Kbd>
							, talk, and your words appear where your cursor is.
						</>
					}
				/>
			</section>

			<section className={`${WRAP} ${SECTION}`}>
				<div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
					<p className="m-0 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
						Why it exists
					</p>
					<div>
						<div className="grid max-w-[34em] gap-[0.7em] text-pretty text-[clamp(1.2rem,2.2vw,1.6rem)] font-medium leading-[1.45] tracking-[-0.015em] text-foreground">
							<p className="m-0">
								I built Parrot after fighting with cloud dictation tools that
								were slow, leaky or paywalled. Parrot is the dictation app I
								wanted to use every day: fast, private and free.
							</p>
							<p className="m-0">
								I write it in Rust (Tauri) and TypeScript, and I publish guides
								on voice dictation, Whisper and local-first software on the{" "}
								<Link to="/blog" className={LINK}>
									blog
								</Link>
								.
							</p>
						</div>
						<div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-[14.5px]">
							<div className="flex items-center gap-3">
								<span
									aria-hidden="true"
									className="grid size-10 place-items-center rounded-full border border-border bg-muted text-sm font-bold"
								>
									KG
								</span>
								<div>
									Kash Gohil
									<small className="block text-[13px] text-muted-foreground">
										Software engineer, maker of Parrot
									</small>
								</div>
							</div>
							<a
								href="https://x.com/kashhh"
								className={LINK}
								rel="noopener noreferrer"
								target="_blank"
							>
								X / Twitter
							</a>
							<a
								href="https://github.com/kashgohil"
								className={LINK}
								rel="noopener noreferrer"
								target="_blank"
							>
								GitHub
							</a>
						</div>
					</div>
				</div>
			</section>

			<section className={`${WRAP} ${SECTION}`}>
				<SectionHead
					eyebrow="Principles"
					title="What Parrot"
					quiet="won't compromise on."
					className="mb-7"
				/>
				<FeatureNotes
					className="sm:grid-cols-2 lg:grid-cols-3"
					items={[
						{
							title: "Native and out of the way",
							body: "Parrot lives in your menu bar. One hotkey works from any app, and the text lands at your cursor without switching windows.",
						},
						{
							title: "Local by default",
							body: "Transcription and cleanup run on your Mac. History, settings and vocabulary stay in a local database. Only model downloads and update checks go online.",
						},
						{
							title: "Cleanup that keeps your words",
							body: "The optional cleanup pass removes clear filler, applies corrections you say out loud and fixes punctuation. It keeps your wording and your language.",
						},
						{
							title: "Free means free",
							body: "No word cap, no trial that runs out and no paywall on the daily dictation loop.",
						},
						{
							title: "Simple beats clever",
							body: "Hold a key, talk, see your words. No browser tabs and nothing new to learn.",
						},
						{
							title: "Works where you work",
							body: "Email, Slack, your editor, a document. Parrot pastes into any text field, with no plugins for each app.",
						},
					]}
				/>
			</section>

			<section className={`${WRAP} ${SECTION}`}>
				<div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-[72px]">
					<SectionHead
						eyebrow="Under the hood"
						title="How Parrot"
						quiet="is built."
						lede={
							<>
								A small native app with open models doing the heavy lifting. For
								why it's Tauri and not Electron, read{" "}
								<Link
									to="/blog/$slug"
									params={{ slug: "why-tauri-not-electron" }}
									className={LINK}
								>
									Why Tauri, not Electron
								</Link>
								.
							</>
						}
					/>
					<Panel title="Stack" label="Parrot's technology stack">
						<dl className="m-0">
							{STACK.map(([k, v]) => (
								<div
									key={k}
									className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-border px-[18px] py-3 last:border-b-0"
								>
									<dt className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
										{k}
									</dt>
									<dd className="m-0">{v}</dd>
								</div>
							))}
						</dl>
					</Panel>
				</div>
			</section>

			<section className={`${WRAP} ${SECTION}`}>
				<ul className="m-0 grid list-none gap-x-8 border-b border-border p-0 sm:grid-cols-3">
					{(
						[
							["/download", PARROT_FACTS.price, "Download for Mac"],
							["/changelog", `v${PARROT_FACTS.version}`, "See what changed"],
							["/privacy", "Your data", "Read the privacy policy"],
						] as const
					).map(([to, big, small]) => (
						<li key={to} className="border-t border-border">
							<Link to={to} className="group grid gap-1 py-5 no-underline">
								<span className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
									{big}
								</span>
								<span className="text-sm text-muted-foreground group-hover:text-success">
									{small} →
								</span>
							</Link>
						</li>
					))}
				</ul>
			</section>

			<Footer />
		</div>
	);
}
