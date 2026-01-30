import { Hono } from "hono";
import { getSession, getHistory, searchHistory, insertDictation, updateDictationCleaned } from "../db";

export const history = new Hono();

history.get("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const session = getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const query = c.req.query("q");
  const entries = query
    ? searchHistory(session.userId, query)
    : getHistory(session.userId);

  return c.json({ entries });
});

history.post("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const session = getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const body = await c.req.json<{
    id: string;
    raw_text: string;
    cleaned_text: string;
    provider: string;
    duration_ms: number;
  }>();

  insertDictation(
    session.userId,
    body.id,
    body.raw_text,
    body.cleaned_text,
    body.provider,
    body.duration_ms
  );

  return c.json({ status: "ok" });
});

history.patch("/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const session = getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const id = c.req.param("id");
  const body = await c.req.json<{ cleaned_text: string }>();

  updateDictationCleaned(id, body.cleaned_text);

  return c.json({ status: "ok" });
});
