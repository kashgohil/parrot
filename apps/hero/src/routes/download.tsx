import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DownloadView, type ReleaseState } from "@/components/download-view";
import { PARROT_FACTS } from "@/lib/parrot-facts";

const DOWNLOAD_FAQ = [
	{
		title: "Is it really free?",
		body: `Yes, ${PARROT_FACTS.price.toLowerCase()}. No account, no trial and no card. Dictate as much as you like on your Mac.`,
	},
	{
		title: "Does it work on Intel Macs?",
		body: `No. Parrot requires ${PARROT_FACTS.osRequirement}.`,
	},
	{
		title: "Will my audio be uploaded?",
		body: "No. Audio, transcripts, vocabulary and history stay on your Mac, and recordings are kept only if you turn on Save audio. The only network requests Parrot makes are model downloads and the update check.",
	},
	{
		title: "Why does macOS show a security prompt?",
		body: "The .dmg is signed and notarized by Apple. On first launch macOS asks for Microphone access (to hear you) and Accessibility (to paste at your cursor). You can turn either off in System Settings › Privacy & Security.",
	},
	{
		title: "How do I uninstall?",
		body: "Drag Parrot from Applications to the Trash. Models and history live in ~/Library/Application Support/com.kash.parrot. Delete that folder to remove everything.",
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
		<DownloadView
			release={release}
			mac={mac}
			faq={DOWNLOAD_FAQ}
			releasesPage={RELEASES_PAGE}
		/>
	);
}
