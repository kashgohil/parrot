import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { CLEANUP_TIERS } from "./models";

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
