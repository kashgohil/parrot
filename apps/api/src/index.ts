import { Hono } from "hono";
import { cors } from "hono/cors";
import { transcribe } from "./routes/transcribe";
import { cleanup } from "./routes/cleanup";
import { sync } from "./routes/sync";
import { auth } from "./routes/auth";
import { history } from "./routes/history";
import { profile } from "./routes/profile";

const app = new Hono();

app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/auth", auth);
app.route("/api/transcribe", transcribe);
app.route("/api/cleanup", cleanup);
app.route("/api/history", history);
app.route("/api/profile", profile);
app.route("/api/sync", sync);

export default {
  port: 3001,
  fetch: app.fetch,
};
