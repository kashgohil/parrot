import type { Context, Next } from "hono";
import { Hono } from "hono";
import {
	insertDictationMany,
	markMigrationCompleted,
	upsertProfile,
} from "../db/index";
import { authMiddleware } from "../middleware/auth";
import { requireTier } from "../middleware/feature-gate";

export const sync = new Hono();

const MIGRATION_TIERS = ["managed", "teams", "enterprise"];

sync.use("*", authMiddleware);

sync.get("/migration/status", (c) => {
	const user = c.get("user");
	return c.json({
		tierOk: MIGRATION_TIERS.includes(user.subscription_tier),
		paid: !!user.migration_paid_at,
		completed: !!user.migration_completed_at,
		paidAt: user.migration_paid_at,
		completedAt: user.migration_completed_at,
	});
});

sync.post("/migration/checkout", async (c) => {
	const user = c.get("user");

	if (!MIGRATION_TIERS.includes(user.subscription_tier)) {
		return c.json(
			{
				error: "Upgrade required",
				requiredTiers: MIGRATION_TIERS,
				currentTier: user.subscription_tier,
			},
			403,
		);
	}
	if (user.migration_completed_at) {
		return c.json({ error: "Migration already completed" }, 409);
	}
	if (user.migration_paid_at) {
		return c.json({ error: "Migration already paid" }, 409);
	}

	const productId = process.env.POLAR_PRODUCT_MIGRATION;
	if (!productId) {
		return c.json({ error: "Migration product not configured" }, 500);
	}

	const successUrl = `${
		process.env.HERO_URL || "https://tryparrot.app"
	}/checkout/success?purpose=migration`;
	const checkoutUrl = `https://polar.sh/checkout?productId=${productId}&successUrl=${encodeURIComponent(
		successUrl,
	)}&customerEmail=${encodeURIComponent(user.email)}&metadata[userId]=${
		user.id
	}&metadata[purpose]=migration`;

	return c.json({ url: checkoutUrl });
});

async function requireMigrationEligible(c: Context, next: Next) {
	const user = c.get("user");
	if (!user.migration_paid_at) {
		return c.json({ error: "Migration fee not paid" }, 402);
	}
	if (user.migration_completed_at) {
		return c.json({ error: "Migration already completed" }, 409);
	}
	await next();
}

interface ImportEntry {
	id: string;
	raw_text: string;
	cleaned_text: string;
	provider: string;
	duration_ms: number;
	created_at?: string;
}

sync.post(
	"/import",
	requireTier(...MIGRATION_TIERS),
	requireMigrationEligible,
	async (c) => {
		const user = c.get("user");
		const body = await c.req.json<{
			entries?: ImportEntry[];
			profile?: {
				custom_words?: string;
				context_prompt?: string;
				writing_style?: string;
			};
		}>();

		const entries = body.entries ?? [];
		const { inserted, skipped } = await insertDictationMany(
			user.id,
			entries.map((e) => ({
				id: e.id,
				rawText: e.raw_text,
				cleanedText: e.cleaned_text,
				provider: e.provider,
				durationMs: e.duration_ms,
				createdAt: e.created_at,
			})),
		);

		if (body.profile) {
			await upsertProfile(
				user.id,
				body.profile.custom_words,
				body.profile.context_prompt,
				body.profile.writing_style,
			);
		}

		return c.json({ inserted, skipped });
	},
);

sync.post(
	"/import/complete",
	requireTier(...MIGRATION_TIERS),
	requireMigrationEligible,
	async (c) => {
		const user = c.get("user");
		await markMigrationCompleted(user.id, new Date().toISOString());
		return c.json({ status: "ok" });
	},
);
