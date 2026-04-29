import { Hono } from "hono";
import {
	addSubscriber,
	getAllSubscribers,
	getSubscriber,
	getSubscriberCount,
} from "../db/index";

export const subscribeRoute = new Hono();

subscribeRoute.post("/", async (c) => {
	try {
		const { email, source } = await c.req.json();

		if (!email) {
			return c.json({ error: "Email is required" }, 400);
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return c.json({ error: "Invalid email format" }, 400);
		}

		const existing = await getSubscriber(email);
		if (existing) {
			return c.json({ success: true, message: "You're subscribed!" });
		}

		await addSubscriber(email.toLowerCase().trim(), source);

		return c.json({ success: true, message: "You're subscribed!" });
	} catch (error) {
		console.error("Subscribe error:", error);
		return c.json({ error: "Failed to subscribe" }, 500);
	}
});

subscribeRoute.get("/status", async (c) => {
	return c.json({ count: await getSubscriberCount() });
});

subscribeRoute.get("/entries", async (c) => {
	const adminKey = c.req.header("X-Admin-Key");
	if (adminKey !== process.env.ADMIN_KEY) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const entries = await getAllSubscribers();
	return c.json({ entries, total: entries.length });
});
