import { Hono } from "hono";
import { getSession } from "../db";

export const transcribe = new Hono();

transcribe.post("/", async (c) => {
  // Get session from Authorization header
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = getSession(sessionId);
  if (!session) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

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
    const text = await transcribeAudio(new Uint8Array(audioBuffer), provider, apiKey);
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
function resolveProvider(userApiKey?: string | null): { provider: string; apiKey: string | undefined } {
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

async function transcribeAudio(audio: Uint8Array, provider: string, apiKey: string): Promise<string> {
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

async function transcribeOpenAI(audio: Uint8Array, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", new File([audio], "audio.wav", { type: "audio/wav" }));

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

async function transcribeDeepgram(audio: Uint8Array, apiKey: string): Promise<string> {
  const resp = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "audio/wav",
    },
    body: audio,
  });

  if (!resp.ok) {
    throw new Error(`Deepgram error ${resp.status}: ${await resp.text()}`);
  }

  const json = await resp.json();
  return json.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}

async function transcribeElevenLabs(audio: Uint8Array, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("file", new File([audio], "audio.wav", { type: "audio/wav" }));

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
