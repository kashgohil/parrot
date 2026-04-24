import { TanStackDevtools } from "@tanstack/react-devtools";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import Header from "../components/Header";
import { Telemetry } from "../components/Telemetry";
import { DoodleBackground } from "../components/doodle-background";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Parrot - Voice dictation that just works",
			},
			{
				name: "description",
				content:
					"Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.",
			},
			{
				name: "theme-color",
				content: "#7cb342",
			},
			{
				property: "og:site_name",
				content: "Parrot",
			},
			{
				property: "og:image",
				content: "https://tryparrot.app/og-image.png",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:image",
				content: "https://tryparrot.app/og-image.png",
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
				content: "Parrot - Voice dictation for Mac",
			},
			{
				name: "robots",
				content: "index, follow",
			},
			{
				property: "og:locale",
				content: "en_US",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "alternate",
				type: "application/rss+xml",
				title: "Parrot Blog",
				href: "/rss.xml",
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon",
				sizes: "16x16",
			},
			{
				rel: "icon",
				href: "/parrot-48.png",
				type: "image/png",
				sizes: "48x48",
			},
			{
				rel: "apple-touch-icon",
				href: "/parrot-192.png",
				sizes: "192x192",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Telemetry />
				<Header />
				<div className="relative min-h-screen">
					<DoodleBackground opacity={0.07} />
					<div className="relative">{children}</div>
				</div>
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
