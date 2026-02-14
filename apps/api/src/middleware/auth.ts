import type { Context, Next } from "hono";
import { getSession, getUserById, updateUserSubscription } from "../db/index";
import type { User } from "../db/schema";

export interface AuthUser {
	id: string;
	email: string;
	name: string | null;
	onboarding_completed: boolean;
	setup_mode: string | null;
	subscription_tier: string;
	subscription_status: string | null;
	subscription_expires_at: string | null;
	trial_ends_at: string | null;
}

declare module "hono" {
	interface ContextVariableMap {
		user: AuthUser;
		sessionId: string;
	}
}

/**
 * Resolve the effective subscription tier, accounting for trial expiry.
 * If a user is on a trial (tier = "managed", status = "trialing", trial_ends_at set),
 * and the trial has expired, downgrade them to "local" in the background.
 */
function resolveTrialTier(user: User): string {
	const tier = user.subscriptionTier || "local";
	const trialEndsAt = user.trialEndsAt;

	// Only check trial if user is in trialing status
	if (user.subscriptionStatus !== "trialing" || !trialEndsAt) {
		return tier;
	}

	// If trial is still active, keep the tier
	if (new Date(trialEndsAt) > new Date()) {
		return tier;
	}

	// Trial expired — downgrade asynchronously (don't block the request)
	updateUserSubscription(user.id, {
		subscriptionTier: "local",
		subscriptionStatus: null,
		trialEndsAt: null,
	}).catch((err) => console.error("Failed to downgrade expired trial:", err));

	return "local";
}

export async function authMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sessionId = authHeader.slice(7);
	const session = await getSession(sessionId);

	if (!session) {
		return c.json({ error: "Invalid or expired session" }, 401);
	}

	const user = await getUserById(session.userId);

	if (!user) {
		return c.json({ error: "User not found" }, 401);
	}

	// Check if trial has expired and auto-downgrade
	const effectiveTier = resolveTrialTier(user);

	c.set("user", {
		id: user.id,
		email: user.email,
		name: user.name,
		onboarding_completed: user.onboardingCompleted ?? false,
		setup_mode: user.setupMode,
		subscription_tier: effectiveTier,
		subscription_status: user.subscriptionStatus || null,
		subscription_expires_at: user.subscriptionExpiresAt || null,
		trial_ends_at: user.trialEndsAt || null,
	});
	c.set("sessionId", sessionId);

	await next();
}
