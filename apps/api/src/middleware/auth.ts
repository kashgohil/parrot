import type { Context, Next } from "hono";
import { getSession, getUserById } from "../db/index";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  onboarding_completed: boolean;
  setup_mode: string | null;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    sessionId: string;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const sessionId = authHeader.slice(7);
  const session = getSession(sessionId);

  if (!session) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  const user = getUserById(session.user_id);

  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  c.set("user", {
    id: user.id,
    email: user.email,
    name: user.name,
    onboarding_completed: user.onboarding_completed,
    setup_mode: user.setup_mode,
  });
  c.set("sessionId", sessionId);

  await next();
}
