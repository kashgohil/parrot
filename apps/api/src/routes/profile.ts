import { Hono } from "hono";
import { getSession, getProfile, upsertProfile } from "../db";

export const profile = new Hono();

profile.get("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const session = getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const p = getProfile(session.userId);
  return c.json({
    custom_words: p?.customWords || "[]",
    context_prompt: p?.contextPrompt || "",
    writing_style: p?.writingStyle || "",
  });
});

profile.put("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const session = getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const body = await c.req.json<{
    custom_words?: string;
    context_prompt?: string;
    writing_style?: string;
  }>();

  upsertProfile(
    session.userId,
    body.custom_words,
    body.context_prompt,
    body.writing_style
  );

  return c.json({ status: "ok" });
});
