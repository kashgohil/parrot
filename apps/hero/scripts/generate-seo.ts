/**
 * Generates sitemap.xml, rss.xml, and llms-full.txt from site data.
 * Run: bun run scripts/generate-seo.ts
 * Also runs as part of `bun run build`.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { competitors } from "../src/lib/competitors.ts";

const SITE_URL = "https://tryparrot.app";
const SITE_NAME = "Parrot";
const SITE_DESCRIPTION =
	"Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.";

// ---------------------------------------------------------------------------
// Blog metadata (regex parse — avoids React/lazy import deps)
// ---------------------------------------------------------------------------

function parseBlogPosts(): {
	slug: string;
	title: string;
	description: string;
	date: string;
	keywords: string[];
}[] {
	const blogPath = resolve(import.meta.dir, "../src/lib/blog.ts");
	const content = readFileSync(blogPath, "utf-8");

	const posts: {
		slug: string;
		title: string;
		description: string;
		date: string;
		keywords: string[];
	}[] = [];

	const postRegex =
		/\{\s*slug:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?description:\s*\n?\s*"([^"]+)"[\s\S]*?date:\s*"([^"]+)"[\s\S]*?keywords:\s*\[([\s\S]*?)\]/g;

	let match: RegExpExecArray | null;
	while ((match = postRegex.exec(content)) !== null) {
		const keywords = match[5]
			.split(",")
			.map((k) => k.trim().replace(/^"|"$/g, ""))
			.filter(Boolean);
		posts.push({
			slug: match[1],
			title: match[2],
			description: match[3],
			date: match[4],
			keywords,
		});
	}

	return posts;
}

// ---------------------------------------------------------------------------
// Sitemap / RSS
// ---------------------------------------------------------------------------

const staticPages: {
	path: string;
	changefreq: string;
	priority: number;
}[] = [
	{ path: "/", changefreq: "weekly", priority: 1.0 },
	{ path: "/about", changefreq: "monthly", priority: 0.7 },
	{ path: "/download", changefreq: "weekly", priority: 0.9 },
	{ path: "/changelog", changefreq: "weekly", priority: 0.6 },
	{ path: "/contact", changefreq: "monthly", priority: 0.5 },
	{ path: "/blog", changefreq: "weekly", priority: 0.8 },
	{ path: "/compare", changefreq: "monthly", priority: 0.8 },
	{ path: "/compare/wispr-flow", changefreq: "monthly", priority: 0.8 },
	{ path: "/compare/superwhisper", changefreq: "monthly", priority: 0.7 },
	{ path: "/compare/macwhisper", changefreq: "monthly", priority: 0.7 },
	{ path: "/compare/dragon-professional", changefreq: "monthly", priority: 0.7 },
	{ path: "/privacy", changefreq: "yearly", priority: 0.3 },
	{ path: "/terms", changefreq: "yearly", priority: 0.3 },
];

function generateSitemap(posts: ReturnType<typeof parseBlogPosts>): string {
	const today = new Date().toISOString().split("T")[0];
	const latestPostDate = posts.length > 0 ? posts[0].date : today;

	const urls: string[] = [];

	for (const page of staticPages) {
		const lastmod = page.path === "/blog" ? latestPostDate : today;
		urls.push(`  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`);
	}

	for (const post of posts) {
		urls.push(`  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

function generateRSS(posts: ReturnType<typeof parseBlogPosts>): string {
	const items = posts.map((post) => {
		const pubDate = new Date(post.date).toUTCString();
		return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <category>${post.keywords.join(", ")}</category>
    </item>`;
	});

	const lastBuildDate = new Date().toUTCString();

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>
`;
}

// ---------------------------------------------------------------------------
// llms-full.txt — full text dump for LLM context
// ---------------------------------------------------------------------------

function cellValue(v: string | boolean): string {
	if (v === true) return "Yes";
	if (v === false) return "No";
	return v;
}

function decodeEntities(s: string): string {
	return s
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'");
}

/**
 * Convert a blog post TSX body to rough markdown.
 * Posts are simple JSX (p/h2/h3/ul/li/table/Link/strong) — no custom components.
 */
function jsxToMarkdown(source: string): string {
	// Prefer fragment body: return ( <> ... </> )
	let body = source;
	const fragment = source.match(
		/return\s*\(\s*<>\s*([\s\S]*?)\s*<\/>\s*\)/,
	);
	if (fragment) {
		body = fragment[1];
	} else {
		const paren = source.match(/return\s*\(\s*([\s\S]*)\s*\)\s*;?\s*\}?\s*$/);
		if (paren) body = paren[1];
	}

	// Normalize JSX whitespace/newlines between tags into single spaces where useful
	let md = body;

	// Tables → markdown tables (best-effort)
	md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_m, tableBody: string) => {
		const rows: string[][] = [];
		const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
		let tr: RegExpExecArray | null;
		while ((tr = trRe.exec(tableBody)) !== null) {
			const cells: string[] = [];
			const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
			let cell: RegExpExecArray | null;
			while ((cell = cellRe.exec(tr[1])) !== null) {
				cells.push(stripInlineJsx(cell[1]).trim());
			}
			if (cells.length) rows.push(cells);
		}
		if (rows.length === 0) return "";
		const header = rows[0];
		const sep = header.map(() => "---");
		const lines = [
			`| ${header.join(" | ")} |`,
			`| ${sep.join(" | ")} |`,
			...rows.slice(1).map((r) => `| ${r.join(" | ")} |`),
		];
		return `\n${lines.join("\n")}\n`;
	});

	// Block elements — collapse source-formatting whitespace inside each block
	const blockText = (c: string) =>
		stripInlineJsx(c).replace(/\s+/g, " ").trim();

	md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n\n## ${blockText(c)}\n\n`);
	md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n\n### ${blockText(c)}\n\n`);
	md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) => `\n\n${blockText(c)}\n\n`);
	md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `\n- ${blockText(c)}`);
	md = md.replace(/<\/?ul[^>]*>/gi, "\n");
	md = md.replace(/<\/?ol[^>]*>/gi, "\n");
	md = md.replace(/<\/?thead[^>]*>/gi, "");
	md = md.replace(/<\/?tbody[^>]*>/gi, "");
	md = md.replace(/<\/?tr[^>]*>/gi, "");
	md = md.replace(/<\/?th[^>]*>/gi, "");
	md = md.replace(/<\/?td[^>]*>/gi, "");
	md = md.replace(/<br\s*\/?>/gi, "\n");
	md = md.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");

	// Any remaining tags → strip, keep text
	md = stripInlineJsx(md);

	// Collapse excess blank lines
	md = md
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	return decodeEntities(md);
}

function stripInlineJsx(s: string): string {
	let out = s;
	// <Link ...>text</Link> → text
	out = out.replace(/<Link[^>]*>([\s\S]*?)<\/Link>/gi, "$1");
	// self-closing components
	out = out.replace(/<[A-Z][A-Za-z0-9.]*[^>]*\/>/g, "");
	// <strong>/<em>/<a> etc.
	out = out.replace(/<\/?(?:strong|em|b|i|a|span|code|small)[^>]*>/gi, "");
	// JSX expressions that are pure string literals: {"foo"} or {'bar'}
	out = out.replace(/\{["']([^"']*)["']\}/g, "$1");
	// Drop remaining JSX expressions (icons, className props spilled, etc.)
	out = out.replace(/\{[\s\S]*?\}/g, "");
	// Any leftover tags
	out = out.replace(/<\/?[A-Za-z][^>]*>/g, "");
	// Collapse whitespace within lines
	out = out.replace(/[ \t]{2,}/g, " ");
	return out;
}

function extractBlogPostBody(slug: string): string | null {
	const postsDir = resolve(import.meta.dir, "../src/routes/blog/-posts");
	const filePath = resolve(postsDir, `${slug}.tsx`);
	try {
		const source = readFileSync(filePath, "utf-8");
		const md = jsxToMarkdown(source);
		return md.length > 40 ? md : null;
	} catch {
		return null;
	}
}

function formatCompetitorSection(
	c: (typeof competitors)[number],
): string {
	const lines: string[] = [];
	lines.push(`## Parrot vs ${c.name}`);
	lines.push("");
	lines.push(`URL: ${SITE_URL}/compare/${c.slug}`);
	lines.push("");
	lines.push(c.heroVerdict);
	lines.push("");
	lines.push(`**${c.name}:** ${c.tagline}`);
	lines.push("");
	lines.push("### Pricing");
	lines.push("");
	lines.push(`- Parrot: ${c.pricing.parrotPrice}`);
	if (c.pricing.theirFree) {
		lines.push(`- ${c.name} free: ${c.pricing.theirFree}`);
	}
	lines.push(`- ${c.name} paid: ${c.pricing.theirPaid}`);
	lines.push("");
	lines.push("### Feature comparison");
	lines.push("");
	lines.push("| Feature | Parrot | " + c.name + " |");
	lines.push("| --- | --- | --- |");
	for (const row of c.features) {
		lines.push(
			`| ${row.name} | ${cellValue(row.parrot)} | ${cellValue(row.them)} |`,
		);
	}
	lines.push("");
	lines.push(`### ${c.name} strengths`);
	lines.push("");
	for (const s of c.theirStrengths) lines.push(`- ${s}`);
	lines.push("");
	lines.push(`### ${c.name} weaknesses`);
	lines.push("");
	for (const s of c.theirWeaknesses) lines.push(`- ${s}`);
	lines.push("");
	lines.push("### Where Parrot wins");
	lines.push("");
	for (const w of c.parrotWins) {
		lines.push(`- **${w.title}:** ${w.body}`);
	}
	lines.push("");
	lines.push("### Choose Parrot when");
	lines.push("");
	for (const s of c.chooseParrotWhen) lines.push(`- ${s}`);
	lines.push("");
	lines.push(`### Choose ${c.name} when`);
	lines.push("");
	for (const s of c.chooseThemWhen) lines.push(`- ${s}`);
	lines.push("");
	if (c.faq.length) {
		lines.push("### FAQ");
		lines.push("");
		for (const item of c.faq) {
			lines.push(`**Q: ${item.q}**`);
			lines.push("");
			lines.push(item.a);
			lines.push("");
		}
	}
	return lines.join("\n");
}

function generateLlmsFull(posts: ReturnType<typeof parseBlogPosts>): {
	content: string;
	extracted: number;
	fallback: number;
} {
	const generatedAt = new Date().toISOString().split("T")[0];
	const sections: string[] = [];

	sections.push(`# ${SITE_NAME} — Full LLM Context`);
	sections.push("");
	sections.push(
		`> Free, local-first voice dictation for Apple Silicon Macs. Press a global hotkey, speak, and text is transcribed on-device, optionally cleaned by AI, then auto-pasted into any app. No subscription, no cloud required, no API keys for local mode.`,
	);
	sections.push("");
	sections.push(
		`Generated: ${generatedAt}. Prefer live pages for the latest UI; this file is a consolidated text dump for LLM context. Index: ${SITE_URL}/llms.txt`,
	);
	sections.push("");

	// --- Product overview (home + download facts) ---
	sections.push("# Product overview");
	sections.push("");
	sections.push(`URL: ${SITE_URL}/`);
	sections.push("");
	sections.push(SITE_DESCRIPTION);
	sections.push("");
	sections.push("## Key facts");
	sections.push("");
	sections.push("- Free for life (local mode) — no account, no trial, no card");
	sections.push("- macOS only; Apple Silicon (M1 and later)");
	sections.push("- On-device transcription and optional AI cleanup");
	sections.push("- Works system-wide via global hotkey (any Mac app)");
	sections.push("- Custom vocabulary, writing style, and dictation history");
	sections.push("- Fully offline after one-time model download");
	sections.push(
		"- Optional cloud mode with OpenAI, Deepgram, or ElevenLabs (own API keys or Parrot cloud)",
	);
	sections.push("- Built with Tauri 2 (Rust + React)");
	sections.push("");
	sections.push("## How it works");
	sections.push("");
	sections.push(
		"1. Press your global hotkey (default Cmd+Shift+Space) to start recording.",
	);
	sections.push("2. Speak naturally — names, jargon, full sentences.");
	sections.push(
		"3. Release or press again to stop. Parrot transcribes on-device.",
	);
	sections.push(
		"4. Optional AI cleanup fixes grammar, removes filler (um, uh, like), and applies your vocabulary and writing style.",
	);
	sections.push(
		"5. Text is copied to the clipboard and pasted at the cursor. Entry is saved to history.",
	);
	sections.push("");
	sections.push("## Features");
	sections.push("");
	sections.push("- Fast, accurate first-pass dictation");
	sections.push("- Audio never leaves your device (local mode)");
	sections.push("- No account, no sign-in required for local use");
	sections.push("- Works fully offline after setup");
	sections.push("- Custom vocabulary & AI cleanup");
	sections.push("- Dictation history with search");
	sections.push("- Live transcript workflow into Slack, Notion, VS Code, email, browsers, and more");
	sections.push("");
	sections.push("## FAQ");
	sections.push("");
	sections.push("**Q: What's local mode?**");
	sections.push("");
	sections.push(
		"Parrot runs transcription and AI cleanup entirely on your Mac. Everything happens on-device — zero data leaves your computer. You download what you need once, then no internet is required. Ideal for private work, legal documents, or anyone who values control.",
	);
	sections.push("");
	sections.push("**Q: How fast is it?**");
	sections.push("");
	sections.push(
		"Built for daily use: release the hotkey and text lands at your cursor with minimal wait. Accuracy is tuned for first-pass names, jargon, and everyday speech — not a raw draft you have to rewrite.",
	);
	sections.push("");
	sections.push("**Q: Does it work offline?**");
	sections.push("");
	sections.push(
		"Yes. After the one-time download, Parrot runs fully offline. No internet, no account, no API keys.",
	);
	sections.push("");
	sections.push("**Q: How does the cleanup work?**");
	sections.push("");
	sections.push(
		"After transcription, an optional AI pass fixes grammar, removes filler words (um, uh, like), and applies your custom vocabulary and writing style. The output reads like you wrote it, not dictated it. It runs entirely on your Mac.",
	);
	sections.push("");
	sections.push("**Q: What about my privacy?**");
	sections.push("");
	sections.push(
		"Everything stays on your Mac — audio, transcripts, history, vocabulary. Nothing is sent to our servers in local mode.",
	);
	sections.push("");
	sections.push("**Q: Is it really free?**");
	sections.push("");
	sections.push(
		"Yes. Local mode is free, for life. No account, no trial, no card. Unlimited dictation on your Mac.",
	);
	sections.push("");
	sections.push("**Q: Does it work on Intel Macs?**");
	sections.push("");
	sections.push(
		"Not currently. Parrot is built for Apple Silicon (M1 and later) and the on-device performance that makes dictation feel instant.",
	);
	sections.push("");
	sections.push("**Q: Will my audio be uploaded?**");
	sections.push("");
	sections.push(
		"No. Local mode runs entirely on your Mac — transcription, cleanup, and history all stay on-device. Nothing is sent to any server.",
	);
	sections.push("");
	sections.push(`Download: ${SITE_URL}/download`);
	sections.push(`About: ${SITE_URL}/about`);
	sections.push(`Changelog: ${SITE_URL}/changelog`);
	sections.push("");

	// --- Comparisons ---
	sections.push("# Comparisons");
	sections.push("");
	sections.push(
		`Side-by-side pages: ${SITE_URL}/compare. Data sourced from competitors.ts (same source as the live site).`,
	);
	sections.push("");
	for (const c of competitors) {
		sections.push(formatCompetitorSection(c));
		sections.push("");
	}

	// --- Blog posts (full body when extractable) ---
	sections.push("# Blog");
	sections.push("");
	sections.push(
		`Index: ${SITE_URL}/blog. Bodies extracted from post source so they stay aligned with the site.`,
	);
	sections.push("");

	let extracted = 0;
	let fallback = 0;
	for (const post of posts) {
		sections.push(`## ${post.title}`);
		sections.push("");
		sections.push(`URL: ${SITE_URL}/blog/${post.slug}`);
		sections.push(`Date: ${post.date}`);
		sections.push("");
		sections.push(post.description);
		sections.push("");
		const body = extractBlogPostBody(post.slug);
		if (body) {
			sections.push(body);
			sections.push("");
			extracted++;
		} else {
			fallback++;
		}
	}

	return {
		content: `${sections.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`,
		extracted,
		fallback,
	};
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const posts = parseBlogPosts();
const publicDir = resolve(import.meta.dir, "../public");

const sitemap = generateSitemap(posts);
writeFileSync(resolve(publicDir, "sitemap.xml"), sitemap);
console.log(
	`sitemap.xml generated with ${staticPages.length + posts.length} URLs`,
);

const rss = generateRSS(posts);
writeFileSync(resolve(publicDir, "rss.xml"), rss);
console.log(`rss.xml generated with ${posts.length} items`);

const llmsFull = generateLlmsFull(posts);
writeFileSync(resolve(publicDir, "llms-full.txt"), llmsFull.content);
console.log(
	`llms-full.txt generated (${posts.length} posts: ${llmsFull.extracted} with body, ${llmsFull.fallback} meta-only; ${competitors.length} compare pages)`,
);

// Sanity: ensure every post file in -posts/ is represented in blog.ts
const postsDir = resolve(import.meta.dir, "../src/routes/blog/-posts");
const onDisk = readdirSync(postsDir)
	.filter((f) => f.endsWith(".tsx"))
	.map((f) => f.replace(/\.tsx$/, ""));
const inMeta = new Set(posts.map((p) => p.slug));
const missingMeta = onDisk.filter((s) => !inMeta.has(s));
if (missingMeta.length) {
	console.warn(
		`warning: post files not in blog.ts: ${missingMeta.join(", ")}`,
	);
}
