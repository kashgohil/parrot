import { Hono } from "hono";

export const sync = new Hono();

// Placeholder for cloud sync endpoints
sync.post("/push", async (c) => {
  const body = await c.req.json();
  // TODO: persist dictation entries to cloud storage
  return c.json({ status: "ok", received: body.entries?.length ?? 0 });
});

sync.get("/pull", async (c) => {
  const since = c.req.query("since") || "1970-01-01T00:00:00Z";
  // TODO: return entries newer than `since` from cloud storage
  return c.json({ entries: [], since });
});
