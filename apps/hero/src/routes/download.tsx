import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { PARROT_FACTS } from "@/lib/parrot-facts";

const DOWNLOAD_FAQ = [
	{
		title: "Is it really free?",
		body: `Yes — ${PARROT_FACTS.price}. No account, no trial, no card. Unlimited local dictation on your Mac.`,
	},
	{
		title: "Does it work on Intel Macs?",
		body: `Not currently. Parrot requires ${PARROT_FACTS.osRequirement} for the on-device performance that makes dictation feel instant.`,
	},
	{
		title: "Will my audio be uploaded?",
		body: "No. Parrot runs entirely on your Mac — transcription, cleanup, and history all stay on-device. Nothing is sent to any server.",
	},
	{
		title: "Why does macOS show a security prompt?",
		body: "The .dmg is signed and notarized, but on first launch macOS still asks for Microphone and Accessibility permissions. You can revoke either anytime in System Settings → Privacy & Security.",
	},
	{
		title: "How do I uninstall?",
		body: "Drag Parrot from Applications to the Trash. Models and history live in ~/Library/Application Support/com.kash.parrot — delete that folder to remove everything.",
	},
];

export const Route = createFileRoute("/download")({
	component: DownloadPage,
	head: () => ({
		meta: [
			{ title: "Download Parrot - Free voice dictation for Mac" },
			{
				name: "description",
				content: `Download Parrot for ${PARROT_FACTS.os}. Free, local-only voice dictation for ${PARROT_FACTS.osRequirement}. Press a hotkey, talk, and your words appear where your cursor is.`,
			},
			{
				property: "og:title",
				content: "Download Parrot - Free voice dictation for Mac",
			},
			{
				property: "og:description",
				content: `${PARROT_FACTS.entity} Runs entirely on your device — ${PARROT_FACTS.price}.`,
			},
			{ property: "og:url", content: "https://tryparrot.app/download" },
			{
				name: "twitter:title",
				content: "Download Parrot - Free voice dictation for Mac",
			},
			{
				name: "twitter:description",
				content: `${PARROT_FACTS.entity} Runs entirely on your device.`,
			},
			{
				property: "og:image",
				content: "https://tryparrot.app/og/download.png",
			},
			{
				property: "og:image:width",
				content: "1200",
			},
			{
				property: "og:image:height",
				content: "630",
			},
			{
				property: "og:image:alt",
				content: "Download Parrot — Free voice dictation for Mac",
			},
			{
				name: "twitter:image",
				content: "https://tryparrot.app/og/download.png",
			},
			{
				name: "twitter:image:alt",
				content: "Download Parrot — Free voice dictation for Mac",
			},
			{
				name: "keywords",
				content:
					"download Parrot, mac voice dictation download, dmg download, apple silicon dictation app, free dictation mac",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/download" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "SoftwareApplication",
					name: PARROT_FACTS.name,
					alternateName: [...PARROT_FACTS.alternateNames],
					operatingSystem: PARROT_FACTS.os,
					applicationCategory: "UtilitiesApplication",
					description: PARROT_FACTS.entity,
					softwareVersion: PARROT_FACTS.version,
					downloadUrl: "https://tryparrot.app/download",
					offers: {
						"@type": "Offer",
						price: "0",
						priceCurrency: "USD",
						description: PARROT_FACTS.price,
					},
				}),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "FAQPage",
					mainEntity: DOWNLOAD_FAQ.map((item) => ({
						"@type": "Question",
						name: item.title,
						acceptedAnswer: {
							"@type": "Answer",
							text: item.body,
						},
					})),
				}),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "BreadcrumbList",
					itemListElement: [
						{
							"@type": "ListItem",
							position: 1,
							name: "Home",
							item: "https://tryparrot.app/",
						},
						{
							"@type": "ListItem",
							position: 2,
							name: "Download",
							item: "https://tryparrot.app/download",
						},
					],
				}),
			},
		],
	}),
});

const REPO = "kashgohil/parrot";
const RELEASES_PAGE = `https://github.com/${REPO}/releases`;
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;

type GHAsset = { name: string; browser_download_url: string };
type GHRelease = { tag_name: string; assets: GHAsset[] };

type ReleaseState =
	| { status: "loading" }
	| { status: "ready"; url: string; version: string }
	| { status: "no-release" }
	| { status: "error" };

function isMac(): boolean {
	if (typeof navigator === "undefined") return true;
	const ua = navigator.userAgent.toLowerCase();
	const platform = (navigator.platform || "").toLowerCase();
	return platform.includes("mac") || ua.includes("mac os");
}

function DownloadPage() {
	const [mac, setMac] = useState(true);
	const [release, setRelease] = useState<ReleaseState>({ status: "loading" });

	useEffect(() => setMac(isMac()), []);

	useEffect(() => {
		fetch(LATEST_API)
			.then(async (r) => {
				if (r.status === 404) {
					setRelease({ status: "no-release" });
					return null;
				}
				if (!r.ok) throw new Error("network");
				return (await r.json()) as GHRelease;
			})
			.then((data) => {
				if (!data) return;
				const asset = data.assets.find(
					(a) => a.name.endsWith(".dmg") && a.name.includes("aarch64"),
				);
				if (asset) {
					setRelease({
						status: "ready",
						url: asset.browser_download_url,
						version: data.tag_name,
					});
				} else {
					setRelease({ status: "no-release" });
				}
			})
			.catch(() => setRelease({ status: "error" }));
	}, []);

	return (
		<div className="min-h-screen">
			{/* ── Hero ── */}
			<section className="px-6 pt-16 pb-16 md:pt-24 md:pb-20">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Download
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5">
						Get Parrot for Mac.
						<br />
						Free, for life.
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
						{PARROT_FACTS.entity} No account, no subscription, no servers —
						requires {PARROT_FACTS.osRequirement}.
					</p>

					<div className="mt-10">
						{release.status === "ready" ? (
							<a
								href={release.url}
								className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/85 transition-colors no-underline shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
							>
								<Download size={18} strokeWidth={2.5} />
								Download for Mac &middot; {release.version}
								<ArrowRight size={16} strokeWidth={2.5} />
							</a>
						) : (
							<span className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground font-semibold rounded-xl border border-border">
								<Download size={18} strokeWidth={2.5} />
								{release.status === "loading"
									? "Loading…"
									: "Download unavailable"}
							</span>
						)}
						<p className="mt-3 text-xs text-muted-foreground">
							{PARROT_FACTS.osRequirement} &middot; .dmg &middot; macOS 11+
							&middot; {PARROT_FACTS.price}
						</p>

						{release.status === "no-release" && (
							<p className="mt-4 text-sm text-muted-foreground max-w-xl">
								No public release yet. Check the{" "}
								<a
									href={RELEASES_PAGE}
									className="underline hover:text-foreground"
								>
									releases page
								</a>{" "}
								on GitHub, or follow{" "}
								<a
									href="/rss.xml"
									className="underline hover:text-foreground"
								>
									RSS
								</a>{" "}
								for product updates.
							</p>
						)}

						{release.status === "error" && (
							<p className="mt-4 text-sm text-muted-foreground max-w-xl">
								Couldn&apos;t reach GitHub. Grab the latest .dmg directly from{" "}
								<a
									href={RELEASES_PAGE}
									className="underline hover:text-foreground"
								>
									the releases page
								</a>
								.
							</p>
						)}

						{!mac && release.status !== "loading" && (
							<p className="mt-4 text-sm text-muted-foreground max-w-xl">
								Parrot is currently macOS-only. Windows and Linux support is not
								planned at this time.
							</p>
						)}
					</div>
				</div>
			</section>

			{/* ── What you get ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						In the box
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8">
						What you get
					</h2>
					<div className="grid md:grid-cols-2 gap-6">
						{[
							{
								label: "Global hotkey",
								body: "Press fn to start recording from any app. Release the hotkey and your words paste at the cursor.",
							},
							{
								label: "Fast, private transcription",
								body: "Speech turns into text on your Mac — snappy enough for daily work, with nothing uploaded.",
							},
							{
								label: "Custom vocabulary",
								body: "Teach Parrot your jargon, names, and abbreviations once — it gets them right every time after that.",
							},
							{
								label: "Optional AI cleanup",
								body: "On-device cleanup removes filler words, fixes grammar, and matches your writing style.",
							},
							{
								label: "Local history",
								body: "Every dictation is saved on your Mac. Search, copy, re-paste — all offline.",
							},
							{
								label: "Native menu bar app",
								body: "Light native app. Low memory, no Electron bloat.",
							},
						].map((item) => (
							<div key={item.label}>
								<p className="text-[13px] font-bold text-primary uppercase tracking-wider mb-2">
									{item.label}
								</p>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{item.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Install steps ── */}
			<section className="px-6 py-20 md:py-28">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Setup
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						Install in under a minute
					</h2>
					<div className="space-y-10">
						{[
							{
								num: "01",
								title: "Download the .dmg",
								body: "Hit the download button above. The .dmg is signed for Apple Silicon (M1 and later).",
							},
							{
								num: "02",
								title: "Drag Parrot to Applications",
								body: "Open the .dmg and drag the Parrot icon into your Applications folder. Eject the disk image when you're done.",
							},
							{
								num: "03",
								title: "Grant Microphone & Accessibility",
								body: "On first launch, macOS will ask for Microphone (to record) and Accessibility (to paste at the cursor). Both are required.",
							},
							{
								num: "04",
								title: "Finish onboarding",
								body: "Pick the speed and accuracy balance you want. Parrot downloads what it needs once — then everything runs offline.",
							},
							{
								num: "05",
								title: "Press fn and talk",
								body: "Anywhere, in any app. Release the hotkey and your transcription pastes at the cursor.",
							},
						].map((item) => (
							<div key={item.num} className="flex gap-6">
								<span className="text-3xl font-black text-border/80 shrink-0 leading-none pt-1">
									{item.num}
								</span>
								<div>
									<h3 className="text-lg font-bold text-foreground mb-1.5">
										{item.title}
									</h3>
									<p className="text-[15px] text-muted-foreground leading-relaxed">
										{item.body}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Requirements ── */}
			<section className="px-6 py-16 bg-card border-y border-border">
				<div className="max-w-3xl mx-auto">
					<div className="grid sm:grid-cols-3 gap-6 text-center">
						<div className="p-5 rounded-2xl border border-border">
							<p className="text-2xl font-black text-foreground mb-1">
								Apple Silicon
							</p>
							<p className="text-xs text-muted-foreground">M1, M2, M3, or M4</p>
						</div>
						<div className="p-5 rounded-2xl border border-border">
							<p className="text-2xl font-black text-foreground mb-1">
								macOS 11+
							</p>
							<p className="text-xs text-muted-foreground">Big Sur or later</p>
						</div>
						<div className="p-5 rounded-2xl border border-border">
							<p className="text-2xl font-black text-foreground mb-1">
								~5 GB free
							</p>
							<p className="text-xs text-muted-foreground">
								For models &amp; cache
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── FAQ ── */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Common questions
					</p>
					<h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-10">
						Before you install
					</h2>
					<div className="space-y-8">
						{DOWNLOAD_FAQ.map((item) => (
							<div
								key={item.title}
								className="border-l-2 border-primary/30 pl-5"
							>
								<h3 className="text-lg font-bold text-foreground mb-1.5">
									{item.title}
								</h3>
								<p className="text-base text-muted-foreground leading-relaxed">
									{item.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Related guides ── */}
			<section className="px-6 py-16 border-t border-border">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
						Before or after you install
					</p>
					<h2 className="text-2xl font-bold text-foreground tracking-tight mb-6">
						Related guides
					</h2>
					<div className="grid sm:grid-cols-2 gap-4 mb-12">
						<Link
							to="/blog/$slug"
							params={{ slug: "local-voice-dictation-mac" }}
							className="p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-[15px] font-bold text-foreground mb-1">
								Local setup guide
							</p>
							<p className="text-sm text-muted-foreground">
								On-device dictation in under five minutes.
							</p>
						</Link>
						<Link
							to="/blog/$slug"
							params={{ slug: "free-voice-dictation-apps-2026" }}
							className="p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-[15px] font-bold text-foreground mb-1">
								Free dictation apps
							</p>
							<p className="text-sm text-muted-foreground">
								What free forever vs free tier actually means.
							</p>
						</Link>
					</div>
					<div className="grid sm:grid-cols-3 gap-6 text-center">
						<Link
							to="/changelog"
							className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">
								Changelog
							</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								What&apos;s new &rarr;
							</p>
						</Link>
						<a
							href={RELEASES_PAGE}
							className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">
								All releases
							</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								Older versions on GitHub &rarr;
							</p>
						</a>
						<Link
							to="/contact"
							className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-colors no-underline"
						>
							<p className="text-2xl font-black text-foreground mb-1">
								Need help?
							</p>
							<p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
								Get in touch &rarr;
							</p>
						</Link>
					</div>
				</div>
			</section>

			{/* ── Footer ── */}
			<Footer />
		</div>
	);
}
