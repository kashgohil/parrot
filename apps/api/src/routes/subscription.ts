import { Hono } from "hono";
import { getOrCreateUsage } from "../db/index";
import { authMiddleware } from "../middleware/auth";
import { getTierLimits } from "../middleware/feature-gate";

export const subscription = new Hono();

subscription.get("/status", authMiddleware, async (c) => {
	const user = c.get("user");
	const tier = user.subscription_tier || "local";
	const month = new Date().toISOString().slice(0, 7);
	const usage = await getOrCreateUsage(user.id, month);
	const limits = getTierLimits(tier);

	return c.json({
		tier,
		status: user.subscription_status || null,
		expiresAt: user.subscription_expires_at || null,
		usage: {
			month,
			transcriptionMinutes: usage.transcriptionMinutes || 0,
			cleanupRequests: usage.cleanupRequests || 0,
		},
		limits: {
			transcriptionMinutes:
				limits.transcriptionMinutes === Infinity
					? null
					: limits.transcriptionMinutes,
			cleanupRequests:
				limits.cleanupRequests === Infinity ? null : limits.cleanupRequests,
		},
	});
});

subscription.post("/checkout", authMiddleware, async (c) => {
	const user = c.get("user");
	const { tier } = await c.req.json<{ tier: string }>();

	const productMap: Record<string, string | undefined> = {
		byok: process.env.POLAR_PRODUCT_BYOK,
		managed: process.env.POLAR_PRODUCT_MANAGED,
		teams: process.env.POLAR_PRODUCT_TEAMS,
	};

	const productId = productMap[tier];
	if (!productId) {
		return c.json({ error: "Invalid tier" }, 400);
	}

	const successUrl = `${
		process.env.HERO_URL || "https://tryparrot.app"
	}/checkout/success`;
	const checkoutUrl = `https://polar.sh/checkout?productId=${productId}&successUrl=${encodeURIComponent(
		successUrl,
	)}&customerEmail=${encodeURIComponent(user.email)}&metadata[userId]=${
		user.id
	}`;

	return c.json({ url: checkoutUrl });
});
