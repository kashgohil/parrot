import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { prometheus } from "@hono/prometheus";
import { audio } from "./routes/audio";
import { auth } from "./routes/auth";
import { cleanup } from "./routes/cleanup";
import { history } from "./routes/history";
import { profile } from "./routes/profile";
import { sync } from "./routes/sync";
import { transcribe } from "./routes/transcribe";
import { waitlistRoute } from "./routes/waitlist";

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

const sdk = new NodeSDK({
	traceExporter: new OTLPTraceExporter({
		url: `${otelEndpoint}/v1/traces`,
	}),
	metricReader: new PeriodicExportingMetricReader({
		exporter: new OTLPMetricExporter({
			url: `${otelEndpoint}/v1/metrics`,
		}),
		exportIntervalMillis: 60000,
	}),
	serviceName: "parrot-api",
});

try {
	sdk.start();
} catch (error) {
	console.error("OpenTelemetry SDK failed to start", error);
}

const app = new Hono();

const { printMetrics, registerMetrics } = prometheus();
app.use("*", registerMetrics);

app.use("*", cors());
app.use("*", logger());
app.use(
	"*",
	httpInstrumentationMiddleware({
		serviceName: "parrot-api",
	})
);

app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/metrics", printMetrics);

app.route("/api/auth", auth);
app.route("/api/transcribe", transcribe);
app.route("/api/cleanup", cleanup);
app.route("/api/history", history);
app.route("/api/profile", profile);
app.route("/api/audio", audio);
app.route("/api/sync", sync);
app.route("/api/waitlist", waitlistRoute);

export default {
	port: 3001,
	fetch: app.fetch,
};
