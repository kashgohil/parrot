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

	// Calculate trial info
	const trialEndsAt = user.trial_ends_at;
	const isTrialing = user.subscription_status === "trialing" && !!trialEndsAt;
	const trialDaysRemaining = isTrialing
		? Math.max(
				0,
				Math.ceil(
					(new Date(trialEndsAt).getTime() - Date.now()) /
						(1000 * 60 * 60 * 24),
				),
			)
		: null;

	return c.json({
		tier,
		status: user.subscription_status || null,
		expiresAt: user.subscription_expires_at || null,
		trial: isTrialing
			? { endsAt: trialEndsAt, daysRemaining: trialDaysRemaining }
			: null,
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
	const { tier, billingPeriod } = await c.req.json<{
		tier: string;
		billingPeriod?: "monthly" | "annual";
	}>();

	const period = billingPeriod || "monthly";

	// Product IDs: monthly and annual variants per tier
	const productMap: Record<string, Record<string, string | undefined>> = {
		managed: {
			monthly: process.env.POLAR_PRODUCT_PRO,
			annual:
				process.env.POLAR_PRODUCT_PRO_ANNUAL || process.env.POLAR_PRODUCT_PRO,
		},
		teams: {
			monthly: process.env.POLAR_PRODUCT_TEAMS,
			annual:
				process.env.POLAR_PRODUCT_TEAMS_ANNUAL ||
				process.env.POLAR_PRODUCT_TEAMS,
		},
	};

	const productId = productMap[tier]?.[period];
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
