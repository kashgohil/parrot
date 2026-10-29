import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import Footer from "@/components/Footer";
import { SectionHead } from "@/components/section-head";

export const Route = createFileRoute("/contact")({
	component: ContactPage,
	head: () => ({
		meta: [
			{ title: "Contact Parrot - Voice Dictation Support for Mac" },
			{
				name: "description",
				content:
					"Get in touch with the Parrot team. We're here to help with questions, feedback, and support.",
			},
			{
				property: "og:title",
				content: "Contact Parrot - Voice Dictation Support for Mac",
			},
			{
				property: "og:description",
				content:
					"Get in touch with the Parrot team. We're here to help with questions, feedback, and support.",
			},
			{ property: "og:url", content: "https://tryparrot.app/contact" },
			{
				name: "twitter:title",
				content: "Contact Parrot - Voice Dictation Support for Mac",
			},
			{
				name: "twitter:description",
				content:
					"Get in touch with the Parrot team. We're here to help with questions, feedback, and support.",
			},
			{
				property: "og:image",
				content: "https://tryparrot.app/og/contact.png",
			},
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content: "Contact Parrot — Voice dictation support",
			},
			{
				name: "twitter:image",
				content: "https://tryparrot.app/og/contact.png",
			},
			{
				name: "twitter:image:alt",
				content: "Contact Parrot — Voice dictation support",
			},
			{
				name: "keywords",
				content:
					"contact Parrot, voice dictation support, Parrot help, dictation app contact",
			},
		],
		links: [{ rel: "canonical", href: "https://tryparrot.app/contact" }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "ContactPage",
					name: "Contact Parrot",
					description:
						"Get in touch with the Parrot team for questions, feedback, and support.",
					url: "https://tryparrot.app/contact",
					mainEntity: {
						"@type": "Organization",
						name: "Parrot",
						url: "https://tryparrot.app",
						email: "hello@tryparrot.app",
						sameAs: ["https://x.com/tryparrot"],
					},
				}),
			},
		],
	}),
});

const WRAP = "mx-auto max-w-[1224px] px-4 md:px-8";
const EMAIL = "hello@tryparrot.app";

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={async (e) => {
				try {
					await navigator.clipboard.writeText(text);
					setCopied(true);
					setTimeout(() => setCopied(false), 1600);
				} catch {
					// Clipboard blocked: select the address so it can be copied by hand.
					const target =
						e.currentTarget.parentElement?.querySelector("[data-copy-target]");
					if (target) window.getSelection()?.selectAllChildren(target);
				}
			}}
			className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-muted"
		>
			{copied ? (
				<Check className="size-3.5 text-success" />
			) : (
				<Copy className="size-3.5" />
			)}
			{copied ? "Copied" : "Copy"}
		</button>
	);
}

function ContactPage() {
	return (
		<div className="min-h-screen">
			<section
				className={`${WRAP} pt-[clamp(48px,8vw,96px)] pb-[clamp(40px,6vw,64px)]`}
			>
				<SectionHead
					as="h1"
					eyebrow="Contact"
					title="Questions, bugs, ideas?"
					quiet="Write to us."
					lede="Email is the best way to reach us. We usually reply within 24 to 48 hours."
				/>
			</section>

			<section className={`${WRAP} pb-[clamp(72px,10vw,128px)]`}>
				<ul className="m-0 list-none border-b border-border p-0">
					<li className="grid gap-x-12 gap-y-3 border-t border-border py-7 md:grid-cols-[220px_minmax(0,1fr)]">
						<h2 className="m-0 text-[19px] font-semibold tracking-[-0.01em]">
							Email
						</h2>
						<div className="grid gap-3">
							<div className="flex flex-wrap items-center gap-3">
								<a
									href={`mailto:${EMAIL}`}
									className="text-[clamp(1.3rem,2.6vw,1.75rem)] font-semibold tracking-[-0.02em] text-foreground no-underline hover:underline"
								>
									<span data-copy-target>{EMAIL}</span>
								</a>
								<CopyButton text={EMAIL} />
							</div>
							<p className="m-0 max-w-[60ch] text-[15px] text-muted-foreground">
								For questions, feedback and bug reports. With a bug, include
								your Parrot version and macOS version, and what you said and
								what got pasted if it's about transcription.
							</p>
						</div>
					</li>
					<li className="grid gap-x-12 gap-y-3 border-t border-border py-7 md:grid-cols-[220px_minmax(0,1fr)]">
						<h2 className="m-0 text-[19px] font-semibold tracking-[-0.01em]">
							X
						</h2>
						<div className="grid gap-2">
							<a
								href="https://x.com/tryparrot"
								target="_blank"
								rel="noopener noreferrer"
								className="justify-self-start text-[19px] font-semibold text-foreground no-underline hover:underline"
							>
								@tryparrot
							</a>
							<p className="m-0 text-[15px] text-muted-foreground">
								Release notes, tips and announcements.
							</p>
						</div>
					</li>
				</ul>
			</section>

			<section className={`${WRAP} pb-[clamp(72px,10vw,128px)]`}>
				<SectionHead
					eyebrow="Before you write"
					title="It might"
					quiet="already be answered."
					className="mb-6"
				/>
				<ul className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-3">
					{(
						[
							[
								"/",
								"faq",
								"Homepage FAQ",
								"Offline use, languages, cleanup, which Macs.",
							],
							[
								"/download",
								undefined,
								"Install help",
								"Permissions, the security prompt and uninstalling.",
							],
							[
								"/changelog",
								undefined,
								"Changelog",
								"Whether your bug is already fixed.",
							],
						] as const
					).map(([to, hash, title, body]) => (
						<li key={title} className="border-t border-border">
							<Link
								to={to}
								hash={hash}
								className="group grid gap-1 py-4 no-underline"
							>
								<span className="font-semibold text-foreground group-hover:text-success">
									{title} →
								</span>
								<span className="text-sm text-muted-foreground">{body}</span>
							</Link>
						</li>
					))}
				</ul>
			</section>

			<Footer />
		</div>
	);
}
