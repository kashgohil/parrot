import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { audio } from "./routes/audio";
import { auth } from "./routes/auth";
import { cleanup } from "./routes/cleanup";
import { history } from "./routes/history";
import { profile } from "./routes/profile";
import { subscription } from "./routes/subscription";
import { sync } from "./routes/sync";
import { transcribe } from "./routes/transcribe";
import { subscribeRoute } from "./routes/subscribe";
import { webhooks } from "./routes/webhooks";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.onError((err, c) => {
	console.error(err);
	return c.json({ error: "Internal Server Error" }, 500);
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/auth", auth);
app.route("/api/transcribe", transcribe);
app.route("/api/cleanup", cleanup);
app.route("/api/history", history);
app.route("/api/profile", profile);
app.route("/api/audio", audio);
app.route("/api/sync", sync);
app.route("/api/webhooks", webhooks);
app.route("/api/subscription", subscription);
app.route("/api/subscribe", subscribeRoute);

export default {
	port: 8030,
	fetch: app.fetch,
};
