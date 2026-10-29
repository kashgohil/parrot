import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { CLEANUP_TIERS, SPEECH_MODELS } from "./models";

// The site must not advertise a model or size the app doesn't ship.
const settings = readFileSync(
	join(__dirname, "../../../desktop/src/routes/settings.tsx"),
	"utf8",
);

describe("CLEANUP_TIERS matches the desktop app", () => {
	for (const tier of CLEANUP_TIERS) {
		test(tier.name, () => {
			const block = settings.match(
				new RegExp(`id: "${tier.id.replaceAll(".", "\\.")}",[\\s\\S]*?\\}`),
			)?.[0];
			expect(block, `${tier.id} missing from settings.tsx`).toBeDefined();
			expect(block).toContain(`name: "${tier.name}"`);
			expect(block).toContain(`pill: "${tier.size} download"`);
			expect(block).toContain(`recommended: ${tier.recommended}`);
		});
	}
});

const speech = readFileSync(
	join(__dirname, "../../../desktop/src-tauri/src/speech_capabilities.rs"),
	"utf8",
);

describe("SPEECH_MODELS matches the desktop app", () => {
	test("same ids in the same order", () => {
		const ids = [...speech.matchAll(/Model \{ id: "([^"]+)"/g)].map(
			(m) => m[1],
		);
		expect(ids).toEqual(SPEECH_MODELS.map((m) => m.id));
	});
	for (const model of SPEECH_MODELS) {
		test(model.id, () => {
			const line = speech.match(
				new RegExp(
					`id: "${model.id.replaceAll(".", "\\.")}"[\\s\\S]*?recommended: (true|false)`,
				),
			);
			expect(line?.[0]).toContain(`size: "${model.size} download"`);
			expect(line?.[0]).toContain(`name: "${model.label}"`);
			expect(line?.[1]).toBe(String(model.recommended));
		});
	}
});
