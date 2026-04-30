/**
 * Generates sitemap.xml and rss.xml from blog data and static routes.
 * Run: bun run scripts/generate-seo.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SITE_URL = "https://tryparrot.app";
const SITE_NAME = "Parrot";
const SITE_DESCRIPTION =
	"Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.";

// Parse blog posts from blog.ts without importing (avoids React/path alias deps)
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

	// Match each post object block in the posts array
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

// Static pages with their metadata
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

// Main
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
