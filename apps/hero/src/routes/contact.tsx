import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";
import { SubscribeCTA } from "@/components/SubscribeCTA";

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

function ContactPage() {
	return (
		<div className="min-h-screen">
			{/* Hero */}
			<section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20">
				<div className="max-w-3xl mx-auto">
					<p className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3 animate-fade-in-up">
						Contact
					</p>
					<h1 className="text-[2.5rem] md:text-[3.25rem] font-black text-foreground tracking-tight leading-[1.1] mb-5 animate-fade-in-up-delay-1">
						Contact Parrot
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in-up-delay-2">
						Have a question, found a bug, or just want to say hi? We'd love to
						hear from you.
					</p>
				</div>
			</section>

			{/* Contact Options */}
			<section className="px-6 py-20 md:py-28 bg-muted/30 border-y border-border">
				<div className="max-w-3xl mx-auto">
					{/* Primary contact - Email */}
					<div className="bg-card border border-border rounded-2xl p-8 md:p-10 mb-8">
						<div className="flex flex-col md:flex-row md:items-center gap-6">
							<div className="flex-1">
								<h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
									Email us
								</h2>
								<p className="text-[15px] text-muted-foreground leading-relaxed">
									For questions, feedback, bug reports, or anything else. We
									typically respond within 24-48 hours.
								</p>
							</div>
							<a
								href="mailto:hello@tryparrot.app"
								className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/85 transition-colors no-underline shrink-0"
							>
								hello@tryparrot.app
								<ArrowRight size={16} strokeWidth={2.5} />
							</a>
						</div>
					</div>

					{/* Secondary options */}
					<div className="grid gap-6 sm:grid-cols-2">
						<div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
							<div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
								</svg>
							</div>
							<h3 className="text-lg font-bold text-foreground tracking-tight mb-2">
								Twitter / X
							</h3>
							<p className="text-[14px] text-muted-foreground mb-4">
								Follow for updates, tips, and announcements.
							</p>
							<a
								href="https://x.com/tryparrot"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:text-primary/80 font-medium no-underline transition-colors"
							>
								@tryparrot &rarr;
							</a>
						</div>

						<Link
							to="/"
							className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors no-underline block"
						>
							<div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<h3 className="text-lg font-bold text-foreground tracking-tight mb-2">
								FAQ
							</h3>
							<p className="text-[14px] text-muted-foreground mb-4">
								Common questions answered on our homepage.
							</p>
							<span className="text-primary font-medium">
								Read the FAQ &rarr;
							</span>
						</Link>
					</div>
				</div>
			</section>

			{/* CTA */}
			<SubscribeCTA
				heading="Stay in the loop."
				subheading="Subscribe for product updates and changelog notes."
				source="contact"
			/>

			<Footer />
		</div>
	);
}
