import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dir, "theme.css"), "utf8");

// Body text needs 4.5:1 (WCAG AA); headings and non-text accents need 3:1.
const PAIRS: [fg: string, bg: string, min: number][] = [
	["ink", "paper", 4.5],
	["ink", "surface", 4.5],
	["ink-2", "paper", 4.5],
	["muted", "paper", 4.5],
	["muted", "surface", 4.5],
	["muted", "sunk", 4.5],
	["quiet", "paper", 3],
	["leaf", "paper", 3],
	["on-leaf", "leaf-strong", 4.5],
	["lime-ink", "lime", 4.5],
	["band-ink", "band", 4.5],
	["band-muted", "band", 4.5],
	["band-accent", "band", 4.5],
	["band-muted", "band-2", 4.5],
	["band-accent", "band-2", 4.5],
	["success", "success-soft", 4.5],
	["warning", "warning-soft", 4.5],
	["danger", "danger-soft", 4.5],
	["danger", "paper", 4.5],
	["info", "info-soft", 4.5],
];

function block(selector: RegExp): string {
	const match = css.match(selector);
	if (!match) throw new Error(`theme.css has no block matching ${selector}`);
	return match[1];
}

function tokens(body: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [, name, hex] of body.matchAll(/--brand-([\w-]+):\s*(#[0-9a-f]{6})/gi)) {
		out[name] = hex;
	}
	return out;
}

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const light = tokens(block(/^:root \{([\s\S]*?)\n\}/m));
const darkMedia = tokens(block(/:root:not\(\.light\) \{([\s\S]*?)\n\t\}/));
const darkClass = tokens(block(/^:root\.dark \{([\s\S]*?)\n\}/m));

test("both dark blocks define the same values", () => {
	expect(darkMedia).toEqual(darkClass);
});

test("every light token has a dark value", () => {
	expect(Object.keys(darkClass).sort()).toEqual(Object.keys(light).sort());
});

for (const [mode, palette] of [
	["light", light],
	["dark", { ...light, ...darkClass }],
] as const) {
	describe(mode, () => {
		for (const [fg, bg, min] of PAIRS) {
			test(`${fg} on ${bg} ≥ ${min}:1`, () => {
				expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
			});
		}
	});
}
