/**
 * Generate every social preview image (1200×630) in public/og with Satori + resvg:
 * the site pages, each blog post and each comparison. They share one layout
 * that mirrors the site's headings (a title plus a quieter second clause).
 *
 * Usage:
 *   bun run scripts/generate-og.ts                 # all images
 *   bun run scripts/generate-og.ts home blog-slug  # only these file names
 *
 * Fonts: Inter (SIL OFL, scripts/og-fonts) stands in for SF Pro, which the
 * site uses but which can't be bundled. It is the closest open match.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const ROOT = resolve(import.meta.dir, "..");
const OG_DIR = resolve(ROOT, "public/og");
const FONTS_DIR = resolve(import.meta.dir, "og-fonts");

// Light palette from packages/theme/theme.css.
const C = {
	paper: "#f5f7f1",
	ink: "#121b14",
	ink2: "#3a473d",
	muted: "#5e6c60",
	quiet: "#7d8a7f",
	line: "#dae1d3",
	leafStrong: "#2c6e21",
	lime: "#dcefa0",
};

type Card = {
	/** Output file stem in public/og. */
	id: string;
	eyebrow: string;
	title: string;
	quiet?: string;
};

// Same headings as the pages themselves.
const PAGE_CARDS: Card[] = [
	{ id: "home", eyebrow: "Mac app · Free for life", title: "Talk instead of type.", quiet: "Nothing leaves your Mac." },
	{ id: "download", eyebrow: "Download · Apple Silicon", title: "Get Parrot for Mac.", quiet: "Free, for life." },
	{ id: "about", eyebrow: "About", title: "About Parrot.", quiet: "Dictation that stays on your Mac." },
	{ id: "blog", eyebrow: "Blog", title: "Notes on dictation,", quiet: "written on a Mac." },
	{ id: "contact", eyebrow: "Contact", title: "Questions, bugs, ideas?", quiet: "Write to us." },
	{ id: "compare", eyebrow: "Compare", title: "Parrot vs", quiet: "the alternatives." },
];

function parseBlogPosts(): { slug: string; title: string; readingTime: string }[] {
	const content = readFileSync(resolve(ROOT, "src/lib/blog.ts"), "utf-8");
	const posts: { slug: string; title: string; readingTime: string }[] = [];

	// Two-pass: extract slugs, then title + readingTime near each slug.
	const slugRe = /slug:\s*"([^"]+)"/g;
	const slugs: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = slugRe.exec(content)) !== null) slugs.push(m[1]);

	for (const slug of slugs) {
		const idx = content.indexOf(`slug: "${slug}"`);
		if (idx < 0) continue;
		const slice = content.slice(idx, idx + 800);
		const titleMatch = slice.match(
			/title:\s*(?:"([^"]+)"|\n\s*"([^"]+)"\s*\+\s*\n\s*"([^"]+)"|\n\s*"([^"]+)")/,
		);
		let title = "";
		if (titleMatch) {
			title = [titleMatch[1], titleMatch[2], titleMatch[3], titleMatch[4]]
				.filter(Boolean)
				.join("");
		}
		// multi-line: title:\n\t\t"a"\n or title: "a"
		if (!title) {
			const multi = slice.match(
				/title:\s*\n\s*"([^"]+)"(?:\s*\n\s*"([^"]+)")?/,
			);
			if (multi) title = [multi[1], multi[2]].filter(Boolean).join(" ");
		}
		if (!title) {
			const single = slice.match(/title:\s*"([^"]+)"/);
			if (single) title = single[1];
		}
		// Handle title spanning two string literals on consecutive lines
		const twoLine = slice.match(
			/title:\s*\n?\s*"([^"]+)"\s*\n\s*"([^"]+)"/,
		);
		if (twoLine && (!title || title.length < twoLine[1].length)) {
			title = `${twoLine[1]}${twoLine[2]}`;
		}

		const rt = slice.match(/readingTime:\s*"([^"]+)"/);
		if (title && rt) {
			posts.push({ slug, title: title.trim(), readingTime: rt[1] });
		}
	}

	return posts;
}

function parseCompetitors(): { slug: string; name: string; tagline: string }[] {
	const content = readFileSync(resolve(ROOT, "src/lib/competitors.ts"), "utf-8");
	const out: { slug: string; name: string; tagline: string }[] = [];

	// Same convention as parseBlogPosts: each entry's slug comes first,
	// then name/tagline within the next few lines.
	const slugRe = /slug:\s*"([^"]+)"/g;
	let m: RegExpExecArray | null;
	while ((m = slugRe.exec(content)) !== null) {
		const slice = content.slice(m.index, m.index + 600);
		const name = slice.match(/\n\s*name:\s*"([^"]+)"/);
		const tagline = slice.match(/tagline:\s*"([^"]+)"/);
		if (name && tagline) {
			out.push({ slug: m[1], name: name[1], tagline: tagline[1] });
		}
	}
	return out;
}

function titleSize(text: string): number {
	const len = text.length;
	if (len > 80) return 54;
	if (len > 56) return 62;
	if (len > 36) return 72;
	return 84;
}

type El = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): El => ({
	type,
	props: { style, children },
});

function cardElement(card: Card, iconDataUrl: string): El {
	const size = titleSize(`${card.title} ${card.quiet ?? ""}`);
	const heading = {
		fontSize: size,
		fontWeight: 800,
		lineHeight: 1.04,
		letterSpacing: "-0.035em",
	};
	return el(
		"div",
		{
			width: 1200,
			height: 630,
			display: "flex",
			flexDirection: "column",
			justifyContent: "space-between",
			padding: "64px 72px",
			background: C.paper,
			fontFamily: "Inter",
			color: C.ink,
		},
		[
			el("div", { display: "flex", alignItems: "center", justifyContent: "space-between" }, [
				el("div", { display: "flex", alignItems: "center", gap: 14 }, [
					{ type: "img", props: { src: iconDataUrl, width: 52, height: 52 } },
					el("div", { fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em" }, "Parrot"),
				]),
				el("div", { fontSize: 22, color: C.muted }, "tryparrot.app"),
			]),
			el("div", { display: "flex", flexDirection: "column", gap: 22, maxWidth: 1000 }, [
				el(
					"div",
					{ fontSize: 22, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted },
					card.eyebrow,
				),
				el("div", { display: "flex", flexDirection: "column" }, [
					el("div", { ...heading, color: C.ink }, card.title),
					...(card.quiet ? [el("div", { ...heading, color: C.quiet }, card.quiet)] : []),
				]),
			]),
			el(
				"div",
				{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderTop: `2px solid ${C.line}`,
					paddingTop: 24,
				},
				[
					el("div", { fontSize: 22, color: C.ink2 }, "Free voice dictation for Mac, on your Mac."),
					el(
						"div",
						{
							display: "flex",
							alignItems: "center",
							gap: 10,
							background: C.leafStrong,
							color: "#ffffff",
							borderRadius: 999,
							padding: "10px 18px",
							fontSize: 18,
							fontWeight: 600,
						},
						[
							el("div", { width: 10, height: 10, borderRadius: 999, background: "#ffffff" }),
							el(
								"div",
								{ display: "flex", alignItems: "center", gap: 3, height: 18 },
								[8, 14, 6, 16, 10].map((h) => el("div", { width: 3, height: h, borderRadius: 2, background: "#ffffff" })),
							),
							el("div", {}, "Hold fn"),
						],
					),
				],
			),
		],
	);
}

async function render(card: Card, fonts: Record<400 | 600 | 800, Buffer>, iconDataUrl: string) {
	const svg = await satori(cardElement(card, iconDataUrl) as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts: [
			{ name: "Inter", data: fonts[400], weight: 400, style: "normal" },
			{ name: "Inter", data: fonts[600], weight: 600, style: "normal" },
			{ name: "Inter", data: fonts[800], weight: 800, style: "normal" },
		],
	});
	return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
}

function allCards(): Card[] {
	const posts = parseBlogPosts().map((p) => ({
		id: p.slug,
		eyebrow: `Blog · ${p.readingTime}`,
		title: p.title,
	}));
	const compares = parseCompetitors().map((c) => ({
		id: `compare-${c.slug}`,
		eyebrow: "Compare",
		title: "Parrot vs",
		quiet: `${c.name}.`,
	}));
	return [...PAGE_CARDS, ...posts, ...compares];
}

async function main() {
	const filter = process.argv.slice(2);
	const cards = allCards();
	const targets = filter.length ? cards.filter((c) => filter.includes(c.id)) : cards;
	if (targets.length === 0) {
		console.error("No matching targets. Known:", cards.map((c) => c.id).join(", "));
		process.exit(1);
	}

	const fonts = {
		400: readFileSync(resolve(FONTS_DIR, "Inter-Regular.ttf")),
		600: readFileSync(resolve(FONTS_DIR, "Inter-SemiBold.ttf")),
		800: readFileSync(resolve(FONTS_DIR, "Inter-ExtraBold.ttf")),
	};
	const iconPath = resolve(ROOT, "public/parrot-192.png");
	if (!existsSync(iconPath)) throw new Error("Missing public/parrot-192.png");
	const iconDataUrl = `data:image/png;base64,${readFileSync(iconPath).toString("base64")}`;

	console.log(`Generating ${targets.length} OG image(s)…`);
	for (const card of targets) {
		const png = await render(card, fonts, iconDataUrl);
		writeFileSync(resolve(OG_DIR, `${card.id}.png`), png);
		console.log(`  ✓ ${card.id}.png  ${Math.round(png.length / 1024)}KB`);
	}
	console.log("Done.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
