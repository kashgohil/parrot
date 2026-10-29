import { createFileRoute } from "@tanstack/react-router";
import { AboutView } from "@/components/about-view";
import { PARROT_FACTS } from "@/lib/parrot-facts";

export const Route = createFileRoute("/about")({
	component: AboutPage,
	head: () => ({
		meta: [
			{ title: "About Parrot - Native voice dictation for Mac" },
			{
				name: "description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
			},
			{
				property: "og:title",
				content: "About Parrot - Native voice dictation for Mac",
			},
			{
				property: "og:description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
			},
			{ property: "og:url", content: "https://tryparrot.app/about" },
			{
				name: "twitter:title",
				content: "About Parrot - Native voice dictation for Mac",
			},
			{
				name: "twitter:description",
				content:
					"Learn how Parrot delivers fast, private voice dictation using native audio capture and AI-powered text cleanup.",
			},
			{
				property: "og:image",
				content: "https://tryparrot.app/og/about.png",
			},
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content: "About Parrot — Native Mac voice dictation",
			},
			{
				name: "twitter:image",
				content: "https://tryparrot.app/og/about.png",
			},
			{
				name: "twitter:image:alt",
				content: "About Parrot — Native Mac voice dictation",
			},
			{
				name: "keywords",
				content:
					"about Parrot, voice dictation app, native mac dictation, Tauri app, local-first privacy, AI cleanup, speech to text mac",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/about" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "Organization",
					name: "Parrot",
					alternateName: [...PARROT_FACTS.alternateNames],
					url: "https://tryparrot.app",
					description: PARROT_FACTS.entity,
					logo: {
						"@type": "ImageObject",
						url: "https://tryparrot.app/parrot-transparent.png",
					},
					sameAs: ["https://x.com/tryparrot"],
					founder: {
						"@type": "Person",
						name: "Kash Gohil",
						url: "https://x.com/kashhh",
					},
					foundingDate: "2025",
					contactPoint: {
						"@type": "ContactPoint",
						email: "hello@tryparrot.app",
						contactType: "customer support",
					},
				}),
			},
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "Person",
					name: "Kash Gohil",
					url: "https://tryparrot.app/about",
					jobTitle: "Founder & Engineer",
					description:
						"Software engineer building Parrot, a native, local-first voice dictation app for Mac.",
					image: "https://tryparrot.app/parrot-transparent.png",
					worksFor: {
						"@type": "Organization",
						name: "Parrot",
						url: "https://tryparrot.app",
					},
					knowsAbout: [
						"Voice dictation",
						"Speech recognition",
						"Whisper",
						"Local-first software",
						"Native macOS apps",
						"Tauri",
						"Rust",
						"On-device AI",
					],
					sameAs: ["https://x.com/kashhh", "https://github.com/kashgohil"],
				}),
			},
		],
	}),
});

function AboutPage() {
	return <AboutView />;
}
