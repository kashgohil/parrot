import { Hono } from "hono";
import {
	createOAuthUser,
	createSession,
	createUser,
	deleteSession,
	getUserByEmail,
	getUserByGoogleId,
	updateUserOnboarding,
	updateUserSubscription,
	verifyPassword,
} from "../db/index";
import { authMiddleware } from "../middleware/auth";

export const auth = new Hono();

const TRIAL_DURATION_DAYS = 14;

/** Activate a 14-day Pro trial for a newly created user */
async function activateProTrial(userId: string) {
	const trialEndsAt = new Date(
		Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
	).toISOString();
	await updateUserSubscription(userId, {
		subscriptionTier: "managed",
		subscriptionStatus: "trialing",
		trialEndsAt,
	});
}

// Signup with email/password
auth.post("/signup", async (c) => {
	try {
		const { email, password, name } = await c.req.json();

		if (!email || !password) {
			return c.json({ error: "Email and password are required" }, 400);
		}

		if (password.length < 8) {
			return c.json({ error: "Password must be at least 8 characters" }, 400);
		}

		const existingUser = await getUserByEmail(email);
		if (existingUser) {
			return c.json({ error: "Email already registered" }, 400);
		}

		const user = await createUser(email, password, name);
		await activateProTrial(user.id);
		const session = await createSession(user.id);

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				onboarding_completed: user.onboardingCompleted,
				setup_mode: user.setupMode,
				subscription_tier: "managed",
				subscription_status: "trialing",
			},
			token: session.id,
		});
	} catch (error) {
		console.error("Signup error:", error);
		return c.json({ error: "Failed to create account" }, 500);
	}
});

// Login with email/password
auth.post("/login", async (c) => {
	try {
		const { email, password } = await c.req.json();

		if (!email || !password) {
			return c.json({ error: "Email and password are required" }, 400);
		}

		const user = await getUserByEmail(email);
		if (!user) {
			return c.json({ error: "Invalid email or password" }, 401);
		}

		const valid = await verifyPassword(user, password);
		if (!valid) {
			return c.json({ error: "Invalid email or password" }, 401);
		}

		const session = await createSession(user.id);

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				onboarding_completed: user.onboardingCompleted,
				setup_mode: user.setupMode,
			},
			token: session.id,
		});
	} catch (error) {
		console.error("Login error:", error);
		return c.json({ error: "Failed to login" }, 500);
	}
});

// In-memory store for pending OAuth flows (state -> session token)
const pendingOAuthFlows = new Map<
	string,
	{ token: string; user: any; expiresAt: number } | null
>();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

// Initiate Google OAuth - desktop app opens this in browser
auth.get("/google/redirect", (c) => {
	const state = c.req.query("state");
	if (!state) {
		return c.text("Missing state parameter", 400);
	}

	// Mark this state as pending
	pendingOAuthFlows.set(state, null);

	// Clean up after 10 minutes
	setTimeout(() => pendingOAuthFlows.delete(state), 10 * 60 * 1000);

	const params = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: `${API_BASE_URL}/api/auth/google/callback`,
		response_type: "code",
		scope: "openid email profile",
		state,
		access_type: "offline",
		prompt: "consent",
	});

	return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Google OAuth callback - browser redirects here after consent
auth.get("/google/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");
	const error = c.req.query("error");

	if (error || !code || !state) {
		return c.html(
			`<html><body><h2>Authentication failed</h2><p>${error || "Missing parameters"}</p><p>You can close this window.</p></body></html>`,
		);
	}

	if (!pendingOAuthFlows.has(state)) {
		return c.html(
			"<html><body><h2>Invalid or expired request</h2><p>Please try again from the app.</p></body></html>",
		);
	}

	try {
		// Exchange code for tokens
		const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: GOOGLE_CLIENT_ID,
				client_secret: GOOGLE_CLIENT_SECRET,
				redirect_uri: `${API_BASE_URL}/api/auth/google/callback`,
				grant_type: "authorization_code",
			}),
		});

		const tokens = (await tokenResponse.json()) as any;

		if (!tokens.id_token) {
			throw new Error("No id_token in response");
		}

		const payload = decodeGoogleToken(tokens.id_token);
		if (!payload || !payload.email) {
			throw new Error("Invalid token payload");
		}

		// Find or create user
		let user = await getUserByGoogleId(payload.sub);
		let isNewUser = false;
		if (!user) {
			const existing = await getUserByEmail(payload.email);
			isNewUser = !existing;
			user = await createOAuthUser(payload.email, payload.sub, payload.name);
			if (isNewUser) {
				await activateProTrial(user.id);
			}
		}

		const session = await createSession(user.id);

		// Store result for polling
		pendingOAuthFlows.set(state, {
			token: session.id,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				onboarding_completed: user.onboardingCompleted,
				setup_mode: user.setupMode,
			},
			expiresAt: Date.now() + 5 * 60 * 1000,
		});

		return c.html(
			`<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Signed in successfully!</h2><p>You can close this window and return to the app.</p></div></body></html>`,
		);
	} catch (err) {
		console.error("Google callback error:", err);
		return c.html(
			"<html><body><h2>Authentication failed</h2><p>Something went wrong. Please try again.</p></body></html>",
		);
	}
});

// Poll for OAuth result - desktop app calls this
auth.get("/google/poll", (c) => {
	const state = c.req.query("state");
	if (!state) {
		return c.json({ error: "Missing state" }, 400);
	}

	const result = pendingOAuthFlows.get(state);

	if (result === undefined) {
		return c.json({ error: "Invalid or expired state" }, 404);
	}

	if (result === null) {
		return c.json({ status: "pending" });
	}

	// Clean up
	pendingOAuthFlows.delete(state);

	return c.json({ status: "complete", user: result.user, token: result.token });
});

// Google OAuth with ID token (direct)
auth.post("/google", async (c) => {
	try {
		const { id_token } = await c.req.json();

		if (!id_token) {
			return c.json({ error: "ID token required" }, 400);
		}

		const payload = decodeGoogleToken(id_token);

		if (!payload || !payload.email) {
			return c.json({ error: "Invalid token" }, 401);
		}

		let user = await getUserByGoogleId(payload.sub);

		if (!user) {
			const existing = await getUserByEmail(payload.email);
			const isNewUser = !existing;
			user = await createOAuthUser(payload.email, payload.sub, payload.name);
			if (isNewUser) {
				await activateProTrial(user.id);
			}
		}

		const session = await createSession(user.id);

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				onboarding_completed: user.onboardingCompleted,
				setup_mode: user.setupMode,
			},
			token: session.id,
		});
	} catch (error) {
		console.error("Google auth error:", error);
		return c.json({ error: "Failed to authenticate with Google" }, 500);
	}
});

// Get current user
auth.get("/me", authMiddleware, (c) => {
	const user = c.get("user");
	return c.json({ user });
});

// Update onboarding status
auth.post("/onboarding", authMiddleware, async (c) => {
	try {
		const user = c.get("user");
		const { completed, setup_mode } = await c.req.json();

		await updateUserOnboarding(user.id, completed, setup_mode);

		return c.json({
			user: {
				...user,
				onboarding_completed: completed,
				setup_mode: setup_mode || user.setup_mode,
			},
		});
	} catch (error) {
		console.error("Onboarding update error:", error);
		return c.json({ error: "Failed to update onboarding status" }, 500);
	}
});

// Logout
auth.post("/logout", authMiddleware, async (c) => {
	const sessionId = c.get("sessionId");
	await deleteSession(sessionId);
	return c.json({ success: true });
});

// Helper to decode Google ID token (simplified - in production use a proper library)
function decodeGoogleToken(
	token: string,
): { sub: string; email: string; name?: string } | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) return null;

		const payload = JSON.parse(atob(parts[1]));
		return payload;
	} catch {
		return null;
	}
}
