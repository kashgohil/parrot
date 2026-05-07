import { Hono } from "hono";
import { getProfile, incrementUsage } from "../db";
import { parseVocab, whisperInitialPrompt } from "../lib/vocab";
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

	// Bias the upstream provider with the user's unconditional vocabulary.
	// The desktop client may also pass a `prompt` form field; that takes
	// precedence so callers can override per-request if needed.
	const formPrompt = formData.get("prompt");
	let biasPrompt: string | null =
		typeof formPrompt === "string" && formPrompt.trim() ? formPrompt.trim() : null;
	if (!biasPrompt) {
		const profile = await getProfile(user.id);
		if (profile) {
			biasPrompt = whisperInitialPrompt(parseVocab(profile.customWords));
		}
	}

	try {
		const text = await transcribeAudio(
			new Uint8Array(audioBuffer),
			provider,
			apiKey,
			biasPrompt,
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
	biasPrompt: string | null,
): Promise<string> {
	switch (provider) {
		case "openai":
			return transcribeOpenAI(audio, apiKey, biasPrompt);
		case "deepgram":
			return transcribeDeepgram(audio, apiKey, biasPrompt);
		case "elevenlabs":
			return transcribeElevenLabs(audio, apiKey, biasPrompt);
		default:
			throw new Error(`Unknown provider: ${provider}`);
	}
}

async function transcribeOpenAI(
	audio: Uint8Array,
	apiKey: string,
	biasPrompt: string | null,
): Promise<string> {
	const form = new FormData();
	form.append("model", "whisper-1");
	form.append(
		"file",
		new File([toArrayBuffer(audio)], "audio.wav", { type: "audio/wav" }),
	);
	if (biasPrompt) {
		form.append("prompt", biasPrompt);
	}

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
	biasPrompt: string | null,
): Promise<string> {
	// Deepgram's Nova-2 supports `keywords` (per-word boosting) rather than a
	// freeform prompt. Splitting the prompt back into terms gives roughly the
	// same effect — each unconditional vocab term gets boosted.
	let url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true";
	if (biasPrompt) {
		const terms = extractKeywordsFromPrompt(biasPrompt);
		for (const term of terms) {
			url += `&keywords=${encodeURIComponent(term)}`;
		}
	}

	const resp = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Token ${apiKey}`,
			"Content-Type": "audio/wav",
		},
		body: toArrayBuffer(audio),
	});

	if (!resp.ok) {
		throw new Error(`Deepgram error ${resp.status}: ${await resp.text()}`);
	}

	const json = await resp.json();
	return json.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}

async function transcribeElevenLabs(
	audio: Uint8Array,
	apiKey: string,
	biasPrompt: string | null,
): Promise<string> {
	const form = new FormData();
	form.append("model_id", "scribe_v1");
	form.append(
		"file",
		new File([toArrayBuffer(audio)], "audio.wav", { type: "audio/wav" }),
	);
	if (biasPrompt) {
		form.append("biased_keywords", biasPrompt);
	}

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

// Recover the comma-separated terms from the sentence-style prompt produced
// by `whisperInitialPrompt` — strips the "Vocabulary hints:" prefix and
// trailing period, then splits on commas.
function extractKeywordsFromPrompt(prompt: string): string[] {
	const stripped = prompt
		.replace(/^Vocabulary hints:\s*/i, "")
		.replace(/\.$/, "")
		.trim();
	return stripped
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}
