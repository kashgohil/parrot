import { Hono } from "hono";
import {
  createUser,
  createOAuthUser,
  getUserByEmail,
  getUserByGoogleId,
  verifyPassword,
  createSession,
  deleteSession,
  updateUserOnboarding,
} from "../db/index";
import { authMiddleware } from "../middleware/auth";

export const auth = new Hono();

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

    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return c.json({ error: "Email already registered" }, 400);
    }

    const user = await createUser(email, password, name);
    const session = createSession(user.id);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboarding_completed: user.onboarding_completed,
        setup_mode: user.setup_mode,
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

    const user = getUserByEmail(email);
    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const valid = await verifyPassword(user, password);
    if (!valid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const session = createSession(user.id);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboarding_completed: user.onboarding_completed,
        setup_mode: user.setup_mode,
      },
      token: session.id,
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Failed to login" }, 500);
  }
});

// Google OAuth callback
auth.post("/google", async (c) => {
  try {
    const { id_token } = await c.req.json();

    if (!id_token) {
      return c.json({ error: "ID token required" }, 400);
    }

    // Decode and verify the Google ID token
    // In production, you'd verify this with Google's public keys
    const payload = decodeGoogleToken(id_token);

    if (!payload || !payload.email) {
      return c.json({ error: "Invalid token" }, 401);
    }

    // Find or create user
    let user = getUserByGoogleId(payload.sub);

    if (!user) {
      user = createOAuthUser(payload.email, payload.sub, payload.name);
    }

    const session = createSession(user.id);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboarding_completed: user.onboarding_completed,
        setup_mode: user.setup_mode,
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

    updateUserOnboarding(user.id, completed, setup_mode);

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
auth.post("/logout", authMiddleware, (c) => {
  const sessionId = c.get("sessionId");
  deleteSession(sessionId);
  return c.json({ success: true });
});

// Helper to decode Google ID token (simplified - in production use a proper library)
function decodeGoogleToken(token: string): { sub: string; email: string; name?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}
