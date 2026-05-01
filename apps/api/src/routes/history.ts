import { Hono } from "hono";
import * as Minio from "minio";
import { getSession, getHistory, searchHistory, insertDictation, updateDictationCleaned, deleteDictation } from "../db";

const minioClient = new Minio.Client({
  endPoint: process.env.S3_ENDPOINT || "localhost",
  port: Number(process.env.S3_PORT) || 9000,
  useSSL: process.env.S3_USE_SSL === "true",
  accessKey: process.env.S3_ACCESS_KEY || "",
  secretKey: process.env.S3_SECRET_KEY || "",
});

const BUCKET = process.env.S3_BUCKET || "parrot-audio";

export const history = new Hono();

history.get("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const session = await getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const query = c.req.query("q");
  const entries = query
    ? await searchHistory(session.userId, query)
    : await getHistory(session.userId);

  return c.json({ entries });
});

history.post("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const session = await getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const body = await c.req.json<{
    id: string;
    raw_text: string;
    cleaned_text: string;
    provider: string;
    duration_ms: number;
  }>();

  await insertDictation(
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

  const session = await getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const id = c.req.param("id");
  const body = await c.req.json<{ cleaned_text: string }>();

  await updateDictationCleaned(id, body.cleaned_text);

  return c.json({ status: "ok" });
});

history.delete("/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const session = await getSession(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401);

  const id = c.req.param("id");
  const audioUrl = await deleteDictation(id, session.userId);

  if (audioUrl) {
    const key = `${session.userId}/${id}.wav`;
    try {
      await minioClient.removeObject(BUCKET, key);
    } catch (e) {
      console.error("Failed to remove audio from S3:", e);
    }
  }

  return c.json({ status: "ok" });
});
