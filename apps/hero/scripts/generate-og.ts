/**
 * Generate blog + compare OG images (1200×630) with Satori + resvg.
 *
 * Usage:
 *   bun run scripts/generate-og.ts              # all posts + compare pages
 *   bun run scripts/generate-og.ts slug-a slug-b  # specific post slugs
 *   bun run scripts/generate-og.ts compare compare-wispr-flow  # compare images
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const ROOT = resolve(import.meta.dir, "..");
const OG_DIR = resolve(ROOT, "public/og");
const FONTS_DIR = resolve(ROOT, "public/fonts");

const PK = {
	primary: "#7cb342",
	primaryDark: "#689f38",
	bg: "#fafdf6",
	bgSecondary: "#f1f8e9",
	text: "#1b2e1b",
	textMuted: "#5f7a5f",
	border: "#d5e4c3",
	mark: "#c3de36",
};

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

function titleFontSize(title: string): number {
	const len = title.length;
	if (len > 90) return 40;
	if (len > 70) return 46;
	if (len > 50) return 52;
	return 58;
}

function wrapTitle(title: string, maxChars: number): string[] {
	const words = title.split(/\s+/);
	const lines: string[] = [];
	let cur = "";
	for (const w of words) {
		const next = cur ? `${cur} ${w}` : w;
		if (next.length > maxChars && cur) {
			lines.push(cur);
			cur = w;
		} else {
			cur = next;
		}
	}
	if (cur) lines.push(cur);
	return lines.slice(0, 4);
}

async function renderBlogOg(
	post: { slug: string; title: string; readingTime: string },
	fonts: { regular: Buffer; medium: Buffer; bold: Buffer },
	iconDataUrl: string,
): Promise<Buffer> {
	const size = titleFontSize(post.title);
	const maxChars = size >= 52 ? 28 : size >= 46 ? 32 : 36;
	const lines = wrapTitle(post.title, maxChars);

	// Waveform bars on the right
	const barHeights = [90, 140, 70, 200, 110, 250, 80, 170, 130, 220, 60, 180, 100, 240, 90];
	const bars = barHeights.map((h, i) => {
		const x = 56 + i * 20;
		const y = (360 - h) / 2;
		const fill = i % 4 === 0 ? PK.primaryDark : PK.primary;
		const opacity = 0.35 + (i % 3) * 0.08;
		return {
			type: "div",
			props: {
				style: {
					position: "absolute",
					left: x,
					top: y,
					width: 12,
					height: h,
					borderRadius: 6,
					background: fill,
					opacity,
				},
			},
		};
	});

	const element = {
		type: "div",
		props: {
			style: {
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				position: "relative",
				background: `linear-gradient(180deg, ${PK.bg} 0%, ${PK.bgSecondary} 100%)`,
				fontFamily: "Fira Sans",
				color: PK.text,
				overflow: "hidden",
			},
			children: [
				// corner frame
				{
					type: "div",
					props: {
						style: {
							position: "absolute",
							top: 24,
							left: 24,
							right: 24,
							bottom: 24,
							border: `1px solid ${PK.border}`,
							borderRadius: 18,
							opacity: 0.7,
						},
					},
				},
				// waveform area
				{
					type: "div",
					props: {
						style: {
							position: "absolute",
							right: 40,
							top: 135,
							width: 360,
							height: 360,
							display: "flex",
							opacity: 0.5,
						},
						children: bars,
					},
				},
				// header
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							alignItems: "center",
							padding: "56px 64px 0 64px",
							position: "relative",
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 14,
									},
									children: [
										{
											type: "div",
											props: {
												style: {
													width: 60,
													height: 60,
													borderRadius: 14,
													background: PK.mark,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												},
												children: [
													{
														type: "img",
														props: {
															src: iconDataUrl,
															width: 42,
															height: 42,
															style: {
																width: 42,
																height: 42,
																borderRadius: 9,
															},
														},
													},
												],
											},
										},
										{
											type: "div",
											props: {
												style: {
													display: "flex",
													flexDirection: "column",
												},
												children: [
													{
														type: "div",
														props: {
															style: {
																fontSize: 28,
																fontWeight: 800,
																letterSpacing: -0.4,
																lineHeight: 1.05,
															},
															children: "Parrot",
														},
													},
													{
														type: "div",
														props: {
															style: {
																fontSize: 13,
																fontWeight: 600,
																color: PK.textMuted,
																marginTop: 2,
															},
															children: "Voice dictation for Mac",
														},
													},
												],
											},
										},
									],
								},
							},
						],
					},
				},
				// body
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							flexDirection: "column",
							padding: "48px 64px 0 64px",
							flex: 1,
							position: "relative",
							maxWidth: 780,
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 8,
										fontSize: 14,
										fontWeight: 700,
										color: PK.primaryDark,
										letterSpacing: 0.6,
										textTransform: "uppercase",
										marginBottom: 20,
									},
									children: [
										{
											type: "div",
											props: {
												style: {
													width: 8,
													height: 8,
													borderRadius: 4,
													background: PK.primary,
												},
											},
										},
										"The Parrot Blog",
									],
								},
							},
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: 4,
									},
									children: lines.map((line) => ({
										type: "div",
										props: {
											style: {
												fontSize: size,
												fontWeight: 800,
												lineHeight: 1.15,
												letterSpacing: -1,
												color: PK.text,
											},
											children: line,
										},
									})),
								},
							},
						],
					},
				},
				// footer
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "0 64px 52px 64px",
							position: "relative",
							fontSize: 16,
							color: PK.textMuted,
							fontWeight: 600,
						},
						children: [
							{
								type: "div",
								props: {
									style: { display: "flex", alignItems: "center", gap: 12 },
									children: [
										{
											type: "div",
											props: {
												style: {
													fontWeight: 800,
													color: PK.text,
													fontSize: 16,
												},
												children: "Kash Gohil",
											},
										},
										{
											type: "div",
											props: {
												style: {
													width: 4,
													height: 4,
													borderRadius: 2,
													background: PK.border,
												},
											},
										},
										{
											type: "div",
											props: {
												style: { fontSize: 15 },
												children: post.readingTime,
											},
										},
									],
								},
							},
							{
								type: "div",
								props: {
									style: { fontSize: 15 },
									children: "tryparrot.app/blog",
								},
							},
						],
					},
				},
			],
		},
	};

	const svg = await satori(element as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts: [
			{ name: "Fira Sans", data: fonts.regular, weight: 400, style: "normal" },
			{ name: "Fira Sans", data: fonts.medium, weight: 600, style: "normal" },
			{ name: "Fira Sans", data: fonts.bold, weight: 800, style: "normal" },
		],
	});

	const resvg = new Resvg(svg, {
		fitTo: { mode: "width", value: 2400 }, // 2x retina like html-to-image
	});
	return Buffer.from(resvg.render().asPng());
}

function pngToDataUrl(path: string): string {
	const buf = readFileSync(path);
	return `data:image/png;base64,${buf.toString("base64")}`;
}

interface CompareTarget {
	/** Output filename stem, e.g. "compare" or "compare-wispr-flow". */
	id: string;
	/** Competitor display name; null = generic /compare index card. */
	name: string | null;
	subtitle: string;
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

function compareTargets(): CompareTarget[] {
	return [
		{
			id: "compare",
			name: null,
			subtitle: "Side-by-side comparisons of the leading Mac voice dictation apps.",
		},
		...parseCompetitors().map((c) => ({
			id: `compare-${c.slug}`,
			name: c.name,
			subtitle: c.tagline,
		})),
	];
}

async function renderCompareOg(
	target: CompareTarget,
	fonts: { regular: Buffer; medium: Buffer; bold: Buffer },
	iconDataUrl: string,
): Promise<Buffer> {
	const title = target.name ? `Parrot vs ${target.name}` : "Parrot vs the rest";
	const size = titleFontSize(title);
	const maxChars = size >= 52 ? 26 : size >= 46 ? 30 : 34;
	const lines = wrapTitle(title, maxChars);

	// Waveform bars on the right (same motif as blog cards)
	const barHeights = [90, 140, 70, 200, 110, 250, 80, 170, 130, 220, 60, 180, 100, 240, 90];
	const bars = barHeights.map((h, i) => {
		const x = 56 + i * 20;
		const y = (360 - h) / 2;
		const fill = i % 4 === 0 ? PK.primaryDark : PK.primary;
		const opacity = 0.35 + (i % 3) * 0.08;
		return {
			type: "div",
			props: {
				style: {
					position: "absolute",
					left: x,
					top: y,
					width: 12,
					height: h,
					borderRadius: 6,
					background: fill,
					opacity,
				},
			},
		};
	});

	const element = {
		type: "div",
		props: {
			style: {
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				position: "relative",
				background: `linear-gradient(180deg, ${PK.bg} 0%, ${PK.bgSecondary} 100%)`,
				fontFamily: "Fira Sans",
				color: PK.text,
				overflow: "hidden",
			},
			children: [
				// corner frame
				{
					type: "div",
					props: {
						style: {
							position: "absolute",
							top: 24,
							left: 24,
							right: 24,
							bottom: 24,
							border: `1px solid ${PK.border}`,
							borderRadius: 18,
							opacity: 0.7,
						},
					},
				},
				// waveform area
				{
					type: "div",
					props: {
						style: {
							position: "absolute",
							right: 40,
							top: 135,
							width: 360,
							height: 360,
							display: "flex",
							opacity: 0.5,
						},
						children: bars,
					},
				},
				// header
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							alignItems: "center",
							padding: "56px 64px 0 64px",
							position: "relative",
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 14,
									},
									children: [
										{
											type: "div",
											props: {
												style: {
													width: 60,
													height: 60,
													borderRadius: 14,
													background: PK.mark,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												},
												children: [
													{
														type: "img",
														props: {
															src: iconDataUrl,
															width: 42,
															height: 42,
															style: {
																width: 42,
																height: 42,
																borderRadius: 9,
															},
														},
													},
												],
											},
										},
										{
											type: "div",
											props: {
												style: {
													display: "flex",
													flexDirection: "column",
												},
												children: [
													{
														type: "div",
														props: {
															style: {
																fontSize: 28,
																fontWeight: 800,
																letterSpacing: -0.4,
																lineHeight: 1.05,
															},
															children: "Parrot",
														},
													},
													{
														type: "div",
														props: {
															style: {
																fontSize: 13,
																fontWeight: 600,
																color: PK.textMuted,
																marginTop: 2,
															},
															children: "Voice dictation for Mac",
														},
													},
												],
											},
										},
									],
								},
							},
						],
					},
				},
				// body
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							flexDirection: "column",
							padding: "48px 64px 0 64px",
							flex: 1,
							position: "relative",
							maxWidth: 780,
						},
						children: [
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 8,
										fontSize: 14,
										fontWeight: 700,
										color: PK.primaryDark,
										letterSpacing: 0.6,
										textTransform: "uppercase",
										marginBottom: 20,
									},
									children: [
										{
											type: "div",
											props: {
												style: {
													width: 8,
													height: 8,
													borderRadius: 4,
													background: PK.primary,
												},
											},
										},
										"Side-by-side comparison",
									],
								},
							},
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: 4,
									},
									children: lines.map((line) => ({
										type: "div",
										props: {
											style: {
												fontSize: size,
												fontWeight: 800,
												lineHeight: 1.15,
												letterSpacing: -1,
												color: PK.text,
											},
											children: line,
										},
									})),
								},
							},
							{
								type: "div",
								props: {
									style: {
										fontSize: 21,
										fontWeight: 600,
										lineHeight: 1.4,
										color: PK.textMuted,
										marginTop: 18,
										maxWidth: 700,
									},
									children: target.subtitle,
								},
							},
						],
					},
				},
				// footer
				{
					type: "div",
					props: {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "0 64px 52px 64px",
							position: "relative",
							fontSize: 16,
							color: PK.textMuted,
							fontWeight: 600,
						},
						children: [
							{
								type: "div",
								props: {
									style: { display: "flex", alignItems: "center", gap: 12 },
									children: [
										{
											type: "div",
											props: {
												style: {
													fontWeight: 800,
													color: PK.text,
													fontSize: 16,
												},
												children: "Free for life",
											},
										},
										{
											type: "div",
											props: {
												style: {
													width: 4,
													height: 4,
													borderRadius: 2,
													background: PK.border,
												},
											},
										},
										{
											type: "div",
											props: {
												style: { fontSize: 15 },
												children: "Local & offline",
											},
										},
									],
								},
							},
							{
								type: "div",
								props: {
									style: { fontSize: 15 },
									children: "tryparrot.app/compare",
								},
							},
						],
					},
				},
			],
		},
	};

	const svg = await satori(element as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts: [
			{ name: "Fira Sans", data: fonts.regular, weight: 400, style: "normal" },
			{ name: "Fira Sans", data: fonts.medium, weight: 600, style: "normal" },
			{ name: "Fira Sans", data: fonts.bold, weight: 800, style: "normal" },
		],
	});

	const resvg = new Resvg(svg, {
		fitTo: { mode: "width", value: 2400 }, // 2x retina like html-to-image
	});
	return Buffer.from(resvg.render().asPng());
}

async function main() {
	const filter = process.argv.slice(2);
	const posts = parseBlogPosts();
	const compares = compareTargets();
	const postTargets = filter.length
		? posts.filter((p) => filter.includes(p.slug))
		: posts;
	const compareFiltered = filter.length
		? compares.filter((c) => filter.includes(c.id))
		: compares;

	if (postTargets.length === 0 && compareFiltered.length === 0) {
		console.error(
			"No matching targets. Posts:",
			posts.map((p) => p.slug).join(", "),
			"| Compare:",
			compares.map((c) => c.id).join(", "),
		);
		process.exit(1);
	}

	const fonts = {
		regular: readFileSync(resolve(FONTS_DIR, "FiraSans-Regular.woff")),
		medium: readFileSync(resolve(FONTS_DIR, "FiraSans-SemiBold.woff")),
		bold: readFileSync(resolve(FONTS_DIR, "FiraSans-Bold.woff")),
	};
	const iconPath = resolve(ROOT, "public/parrot.png");
	if (!existsSync(iconPath)) {
		console.error("Missing public/parrot.png");
		process.exit(1);
	}
	const iconDataUrl = pngToDataUrl(iconPath);

	const total = postTargets.length + compareFiltered.length;
	console.log(`Generating ${total} OG image(s)…`);
	for (const post of postTargets) {
		const t0 = performance.now();
		const png = await renderBlogOg(post, fonts, iconDataUrl);
		const out = resolve(OG_DIR, `${post.slug}.png`);
		writeFileSync(out, png);
		console.log(
			`  ✓ ${post.slug}.png  (${Math.round(png.length / 1024)}KB, ${Math.round(performance.now() - t0)}ms) — ${post.title.slice(0, 50)}…`,
		);
	}
	for (const target of compareFiltered) {
		const t0 = performance.now();
		const png = await renderCompareOg(target, fonts, iconDataUrl);
		const out = resolve(OG_DIR, `${target.id}.png`);
		writeFileSync(out, png);
		const label = target.name ? `Parrot vs ${target.name}` : "Parrot vs the rest";
		console.log(
			`  ✓ ${target.id}.png  (${Math.round(png.length / 1024)}KB, ${Math.round(performance.now() - t0)}ms) — ${label}`,
		);
	}
	console.log("Done.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
