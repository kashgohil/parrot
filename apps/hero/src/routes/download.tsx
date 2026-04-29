import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/download")({
	component: DownloadPage,
});

const REPO = "kashgohil/parrot";
const RELEASES_PAGE = `https://github.com/${REPO}/releases`;
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;

function isMac(): boolean {
	if (typeof navigator === "undefined") return true;
	const ua = navigator.userAgent.toLowerCase();
	const platform = (navigator.platform || "").toLowerCase();
	return platform.includes("mac") || ua.includes("mac os");
}

type GHAsset = { name: string; browser_download_url: string };
type GHRelease = { tag_name: string; assets: GHAsset[] };

function DownloadPage() {
	const [mac, setMac] = useState(true);
	const [dmg, setDmg] = useState<{ url: string; version: string } | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => setMac(isMac()), []);

	useEffect(() => {
		fetch(LATEST_API)
			.then((r) => (r.ok ? (r.json() as Promise<GHRelease>) : Promise.reject()))
			.then((release) => {
				const asset = release.assets.find(
					(a) => a.name.endsWith(".dmg") && a.name.includes("aarch64"),
				);
				if (asset) {
					setDmg({ url: asset.browser_download_url, version: release.tag_name });
				} else {
					setError(true);
				}
			})
			.catch(() => setError(true));
	}, []);

	return (
		<div className="mx-auto max-w-2xl px-6 py-24">
			<h1 className="text-4xl font-semibold tracking-tight">Download Parrot</h1>
			<p className="mt-3 text-muted-foreground">
				Free, local-only voice dictation for macOS. Runs entirely on your
				device.
			</p>

			<div className="mt-10">
				<Button
					asChild={!!dmg}
					size="lg"
					className="w-full justify-start"
					disabled={!dmg}
				>
					{dmg ? (
						<a href={dmg.url}>
							<span className="flex flex-col items-start">
								<span>Download for macOS · {dmg.version}</span>
								<span className="text-xs opacity-80">
									Apple Silicon (M1 or later) · .dmg
								</span>
							</span>
						</a>
					) : (
						<span className="flex flex-col items-start">
							<span>{error ? "Download unavailable" : "Loading…"}</span>
							<span className="text-xs opacity-80">
								Apple Silicon (M1 or later) · .dmg
							</span>
						</span>
					)}
				</Button>

				{error && (
					<p className="mt-4 text-sm text-muted-foreground">
						Couldn't reach GitHub. Grab the latest .dmg directly from{" "}
						<a
							href={RELEASES_PAGE}
							className="underline hover:text-foreground"
						>
							the releases page
						</a>
						.
					</p>
				)}

				{!mac && !error && (
					<p className="mt-4 text-sm text-muted-foreground">
						Parrot is currently macOS-only. Windows and Linux support is
						not planned at this time.
					</p>
				)}
			</div>

			<p className="mt-12 text-xs text-muted-foreground">
				Requires an Apple Silicon Mac (M1 or later) running macOS 11 or
				later. Looking for a specific version? See all{" "}
				<a href={RELEASES_PAGE} className="underline hover:text-foreground">
					releases on GitHub
				</a>
				.
			</p>
		</div>
	);
}
