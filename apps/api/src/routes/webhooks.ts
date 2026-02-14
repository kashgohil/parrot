import {
	validateEvent,
	WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { Hono } from "hono";
import {
	getUserByEmail,
	getUserByPolarCustomerId,
	hasPolarEvent,
	insertPolarEvent,
	updateUserSubscription,
} from "../db/index";

export const webhooks = new Hono();

// Map Polar product IDs to tier names
function tierFromProductId(productId: string): string | null {
	const map: Record<string, string> = {
		[process.env.POLAR_PRODUCT_PRO || ""]: "managed",
		[process.env.POLAR_PRODUCT_TEAMS || ""]: "teams",
	};
	return map[productId] || null;
}

webhooks.post("/polar", async (c) => {
	const body = await c.req.text();
	const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

	if (!webhookSecret) {
		console.error("POLAR_WEBHOOK_SECRET not configured");
		return c.json({ error: "Webhook not configured" }, 500);
	}

	let event: ReturnType<typeof validateEvent>;
	try {
		event = validateEvent(
			body,
			Object.fromEntries(c.req.raw.headers.entries()),
			webhookSecret,
		);
	} catch (e) {
		if (e instanceof WebhookVerificationError) {
			return c.json({ error: "Invalid signature" }, 403);
		}
		throw e;
	}

	// Idempotency check
	const eventId = (event as any).id || crypto.randomUUID();
	if (await hasPolarEvent(eventId)) {
		return c.json({ status: "already_processed" });
	}

	const type = event.type;
	const sub = (event as any).data;

	await insertPolarEvent(eventId, type, JSON.stringify(sub));

	// Find user by polar customer ID or email
	const customerId = sub?.customer_id || sub?.customer?.id;
	const email = sub?.customer?.email || sub?.email;
	const productId = sub?.product_id || sub?.product?.id || "";
	const tier = tierFromProductId(productId);

	let user = customerId ? await getUserByPolarCustomerId(customerId) : null;
	if (!user && email) {
		user = await getUserByEmail(email);
	}

	if (!user) {
		console.warn(`Polar webhook: no matching user for event ${type}`, {
			customerId,
			email,
		});
		return c.json({ status: "no_matching_user" });
	}

	switch (type) {
		case "subscription.created":
		case "subscription.active":
			await updateUserSubscription(user.id, {
				subscriptionTier: tier || user.subscriptionTier || "local",
				polarCustomerId: customerId || user.polarCustomerId || undefined,
				polarSubscriptionId: sub?.id || user.polarSubscriptionId || undefined,
				subscriptionStatus: "active",
				subscriptionExpiresAt: sub?.current_period_end || null,
			});
			break;

		case "subscription.updated":
			await updateUserSubscription(user.id, {
				subscriptionTier: tier || user.subscriptionTier || "local",
				subscriptionStatus: sub?.status || "active",
				subscriptionExpiresAt: sub?.current_period_end || null,
			});
			break;

		case "subscription.canceled":
			await updateUserSubscription(user.id, {
				subscriptionStatus: "canceled",
				subscriptionExpiresAt: sub?.current_period_end || null,
			});
			break;

		case "subscription.revoked":
			await updateUserSubscription(user.id, {
				subscriptionTier: "local",
				subscriptionStatus: null,
				polarSubscriptionId: undefined,
				subscriptionExpiresAt: null,
			});
			break;
	}

	return c.json({ status: "ok" });
});
