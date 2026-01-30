import { Hono } from "hono";
import { getSession, getProfile } from "../db";
import type { Profile } from "../db/schema";

export const cleanup = new Hono();

interface CleanupRequest {
  text: string;
}

cleanup.post("/", async (c) => {
  // Get session from Authorization header
  const authHeader = c.req.header("Authorization");
  const sessionId = authHeader?.replace("Bearer ", "");

  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Validate session
  const session = getSession(sessionId);
  if (!session) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  // Get user's profile
  const profile = getProfile(session.userId);

  // Use user's API key if provided, otherwise fall back to server's key
  const userApiKey = c.req.header("X-API-Key");
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return c.json({ error: "No API key available" }, 500);
  }

  const body = await c.req.json<CleanupRequest>();
  if (!body.text) {
    return c.json({ error: "No text provided" }, 400);
  }

  try {
    const cleaned = await cleanupText(body.text, apiKey, profile);
    return c.json({ text: cleaned });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

async function cleanupText(
  text: string,
  apiKey: string,
  profile: Profile | null | undefined
): Promise<string> {
  let systemPrompt =
    "You are a text cleanup assistant for voice dictation. " +
    "Fix grammar, punctuation, and remove filler words (um, uh, like, you know). " +
    "Preserve the speaker's meaning and tone. Return ONLY the cleaned text, nothing else.";

  if (profile) {
    if (profile.customWords && profile.customWords !== "[]") {
      systemPrompt += `\n\nCustom vocabulary (use these exact spellings when relevant): ${profile.customWords}`;
    }
    if (profile.contextPrompt) {
      systemPrompt += `\n\nContext: ${profile.contextPrompt}`;
    }
    if (profile.writingStyle) {
      systemPrompt += `\n\nWriting style: ${profile.writingStyle}`;
    }
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    }),
  });

  if (!resp.ok) {
    throw new Error(`OpenAI error ${resp.status}: ${await resp.text()}`);
  }

  const json = await resp.json();
  return json.choices?.[0]?.message?.content || text;
}
