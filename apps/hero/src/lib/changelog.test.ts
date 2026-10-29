import { expect, test } from "vitest";
import { RELEASES } from "./changelog";
import { PARROT_FACTS } from "./parrot-facts";

test("the newest changelog entry is the current app version", () => {
	expect(RELEASES[0].version).toBe(`v${PARROT_FACTS.version}`);
});
