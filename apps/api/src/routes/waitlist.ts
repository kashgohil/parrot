import { Hono } from "hono";
import {
	addToWaitlist,
	getWaitlistEntry,
	getWaitlistCount,
	getAllWaitlistEntries,
} from "../db/index";

export const waitlistRoute = new Hono();

// Check if waitlist mode is enabled
// Set WAITLIST_MODE=false in .env when ready to launch
export const isWaitlistMode = () => {
	const mode = process.env.WAITLIST_MODE;
	// Default to true (waitlist mode) if not set
	return mode !== "false";
};

// Join waitlist
waitlistRoute.post("/", async (c) => {
	try {
		const { email, source } = await c.req.json();

		if (!email) {
			return c.json({ error: "Email is required" }, 400);
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return c.json({ error: "Invalid email format" }, 400);
		}

		// Check if already on waitlist
		const existing = await getWaitlistEntry(email);
		if (existing) {
			// Return success anyway to avoid revealing if email exists
			return c.json({ success: true, message: "You're on the list!" });
		}

		await addToWaitlist(email.toLowerCase().trim(), source);

		return c.json({ success: true, message: "You're on the list!" });
	} catch (error) {
		console.error("Waitlist signup error:", error);
		return c.json({ error: "Failed to join waitlist" }, 500);
	}
});

// Get waitlist status (public - just returns if waitlist mode is active)
waitlistRoute.get("/status", async (c) => {
	return c.json({
		waitlistMode: isWaitlistMode(),
		count: await getWaitlistCount(),
	});
});

// Admin: Get all waitlist entries (protected - add auth later if needed)
// For now, only accessible via direct API call
waitlistRoute.get("/entries", async (c) => {
	const adminKey = c.req.header("X-Admin-Key");
	if (adminKey !== process.env.ADMIN_KEY) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const entries = await getAllWaitlistEntries();
	return c.json({ entries, total: entries.length });
});
