import { Hono } from "hono";
import { incrementUsage } from "../db";
import { authMiddleware } from "../middleware/auth";
import { checkUsageLimits } from "../middleware/feature-gate";

/** Copy Uint8Array to a plain ArrayBuffer for use as BlobPart / BodyInit (avoids SharedArrayBuffer typing). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const copy = new Uint8Array(bytes.length);
	copy.set(bytes);
	return copy.buffer;
}

export const transcribe = new Hono();

transcribe.use("*", authMiddleware, checkUsageLimits("transcriptionMinutes"));

transcribe.post("/", async (c) => {
	const user = c.get("user");

	const formData = await c.req.formData();
	const file = formData.get("file") as File | null;

	if (!file) {
		return c.json({ error: "No audio file provided" }, 400);
	}

	// Use user's API key if provided, otherwise fall back to server's key
	const userApiKey = c.req.header("X-API-Key");
	const { provider, apiKey } = resolveProvider(userApiKey);

	if (!apiKey) {
		return c.json({ error: "No API key available" }, 500);
	}

	const audioBuffer = await file.arrayBuffer();

	try {
		const text = await transcribeAudio(
			new Uint8Array(audioBuffer),
			provider,
			apiKey,
		);
		// Track usage: estimate 1 minute per request (rough; could use audio duration)
		await incrementUsage(user.id, "transcriptionMinutes", 1);
		return c.json({ text });
	} catch (e) {
		return c.json({ error: String(e) }, 500);
	}
});

/**
 * Resolve which transcription provider and API key to use.
 * If the user provides their own key, use OpenAI by default.
 * Otherwise, pick the first available server-side key.
 */
function resolveProvider(userApiKey?: string | null): {
	provider: string;
	apiKey: string | undefined;
} {
	if (userApiKey) {
		return { provider: "openai", apiKey: userApiKey };
	}

	if (process.env.DEEPGRAM_API_KEY) {
		return { provider: "deepgram", apiKey: process.env.DEEPGRAM_API_KEY };
	}
	if (process.env.OPENAI_API_KEY) {
		return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
	}
	if (process.env.ELEVENLABS_API_KEY) {
		return { provider: "elevenlabs", apiKey: process.env.ELEVENLABS_API_KEY };
	}

	return { provider: "openai", apiKey: undefined };
}

async function transcribeAudio(
	audio: Uint8Array,
	provider: string,
	apiKey: string,
): Promise<string> {
	switch (provider) {
		case "openai":
			return transcribeOpenAI(audio, apiKey);
		case "deepgram":
			return transcribeDeepgram(audio, apiKey);
		case "elevenlabs":
			return transcribeElevenLabs(audio, apiKey);
		default:
			throw new Error(`Unknown provider: ${provider}`);
	}
}

async function transcribeOpenAI(
	audio: Uint8Array,
	apiKey: string,
): Promise<string> {
	const form = new FormData();
	form.append("model", "whisper-1");
	form.append(
		"file",
		new File([toArrayBuffer(audio)], "audio.wav", { type: "audio/wav" }),
	);

	const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}` },
		body: form,
	});

	if (!resp.ok) {
		throw new Error(`OpenAI error ${resp.status}: ${await resp.text()}`);
	}

	const json = await resp.json();
	return json.text || "";
}

async function transcribeDeepgram(
	audio: Uint8Array,
	apiKey: string,
): Promise<string> {
	const resp = await fetch(
		"https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
		{
			method: "POST",
			headers: {
				Authorization: `Token ${apiKey}`,
				"Content-Type": "audio/wav",
			},
			body: toArrayBuffer(audio),
		},
	);

	if (!resp.ok) {
		throw new Error(`Deepgram error ${resp.status}: ${await resp.text()}`);
	}

	const json = await resp.json();
	return json.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}

async function transcribeElevenLabs(
	audio: Uint8Array,
	apiKey: string,
): Promise<string> {
	const form = new FormData();
	form.append("model_id", "scribe_v1");
	form.append(
		"file",
		new File([toArrayBuffer(audio)], "audio.wav", { type: "audio/wav" }),
	);

	const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
		method: "POST",
		headers: { "xi-api-key": apiKey },
		body: form,
	});

	if (!resp.ok) {
		throw new Error(`ElevenLabs error ${resp.status}: ${await resp.text()}`);
	}

	const json = await resp.json();
	return json.text || "";
}
