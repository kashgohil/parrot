import type { Context, Next } from "hono";
import { getOrCreateUsage } from "../db/index";

const TIER_LIMITS: Record<
	string,
	{ transcriptionMinutes: number; cleanupRequests: number }
> = {
	local: { transcriptionMinutes: 0, cleanupRequests: 0 },
	byok: { transcriptionMinutes: Infinity, cleanupRequests: Infinity }, // user pays provider directly
	managed: { transcriptionMinutes: 2000, cleanupRequests: Infinity },
	teams: { transcriptionMinutes: 5000, cleanupRequests: Infinity },
	enterprise: { transcriptionMinutes: Infinity, cleanupRequests: Infinity },
};

export function requireTier(...tiers: string[]) {
	return async (c: Context, next: Next) => {
		const user = c.get("user");
		const tier = user.subscription_tier || "local";
		if (!tiers.includes(tier)) {
			return c.json(
				{ error: "Upgrade required", requiredTiers: tiers, currentTier: tier },
				403,
			);
		}
		await next();
	};
}

export function checkUsageLimits(
	type: "transcriptionMinutes" | "cleanupRequests",
) {
	return async (c: Context, next: Next) => {
		const user = c.get("user");
		const tier = user.subscription_tier || "local";
		const limits = TIER_LIMITS[tier];
		if (!limits) {
			await next();
			return;
		}

		const month = new Date().toISOString().slice(0, 7);
		const usage = await getOrCreateUsage(user.id, month);
		const current =
			type === "transcriptionMinutes"
				? usage.transcriptionMinutes || 0
				: usage.cleanupRequests || 0;
		const limit = limits[type];

		if (limit !== Infinity && current >= limit) {
			return c.json(
				{
					error: "Usage limit exceeded",
					type,
					current,
					limit,
					tier,
				},
				429,
			);
		}

		await next();
	};
}

export function getTierLimits(tier: string) {
	return TIER_LIMITS[tier] || TIER_LIMITS.local;
}
