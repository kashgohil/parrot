import { Hono } from "hono";
import * as Minio from "minio";
import { getSession, updateDictationAudioUrl } from "../db";

const minioClient = new Minio.Client({
	endPoint: process.env.S3_ENDPOINT || "localhost",
	port: Number(process.env.S3_PORT) || 9000,
	useSSL: process.env.S3_USE_SSL === "true",
	accessKey: process.env.S3_ACCESS_KEY || "",
	secretKey: process.env.S3_SECRET_KEY || "",
});

const BUCKET = process.env.S3_BUCKET || "parrot-audio";

export const audio = new Hono();

// Upload audio
audio.post("/:dictationId", async (c) => {
	const authHeader = c.req.header("Authorization");
	const sessionId = authHeader?.replace("Bearer ", "");

	if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

	const session = getSession(sessionId);
	if (!session) return c.json({ error: "Invalid or expired session" }, 401);

	const dictationId = c.req.param("dictationId");
	const formData = await c.req.formData();
	const file = formData.get("audio") as File | null;

	if (!file) return c.json({ error: "No audio file provided" }, 400);

	const buffer = Buffer.from(await file.arrayBuffer());
	const key = `${session.userId}/${dictationId}.wav`;

	await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
		"Content-Type": "audio/wav",
	});

	const audioUrl = `s3://${BUCKET}/${key}`;
	updateDictationAudioUrl(dictationId, audioUrl);

	return c.json({ status: "ok", audioUrl });
});

// Get presigned URL for playback
audio.get("/:dictationId", async (c) => {
	const authHeader = c.req.header("Authorization");
	const sessionId = authHeader?.replace("Bearer ", "");

	if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

	const session = getSession(sessionId);
	if (!session) return c.json({ error: "Invalid or expired session" }, 401);

	const dictationId = c.req.param("dictationId");
	const key = `${session.userId}/${dictationId}.wav`;

	const url = await minioClient.presignedGetObject(BUCKET, key, 3600);

	return c.json({ url });
});
