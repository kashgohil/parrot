import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/download")({
	component: DownloadPage,
});

const REPO = "kashgohil/parrot";
const LATEST_BASE = `https://github.com/${REPO}/releases/latest/download`;
const DMG_HREF = `${LATEST_BASE}/Parrot_universal.dmg`;

function isMac(): boolean {
	if (typeof navigator === "undefined") return true;
	const ua = navigator.userAgent.toLowerCase();
	const platform = (navigator.platform || "").toLowerCase();
	return platform.includes("mac") || ua.includes("mac os");
}

function DownloadPage() {
	const [mac, setMac] = useState(true);
	useEffect(() => setMac(isMac()), []);

	return (
		<div className="mx-auto max-w-2xl px-6 py-24">
			<h1 className="text-4xl font-semibold tracking-tight">Download Parrot</h1>
			<p className="mt-3 text-muted-foreground">
				Free, local-only voice dictation for macOS. Runs entirely on your
				device.
			</p>

			<div className="mt-10">
				<Button asChild size="lg" className="w-full justify-start">
					<a href={DMG_HREF}>
						<span className="flex flex-col items-start">
							<span>Download for macOS</span>
							<span className="text-xs opacity-80">
								Universal (Apple Silicon + Intel) · .dmg
							</span>
						</span>
					</a>
				</Button>

				{!mac && (
					<p className="mt-4 text-sm text-muted-foreground">
						Parrot is currently macOS-only. Windows and Linux support is
						not planned at this time.
					</p>
				)}
			</div>

			<p className="mt-12 text-xs text-muted-foreground">
				Requires macOS 10.15 or later. Looking for a specific version? See all{" "}
				<a
					href={`https://github.com/${REPO}/releases`}
					className="underline hover:text-foreground"
				>
					releases on GitHub
				</a>
				.
			</p>
		</div>
	);
}
