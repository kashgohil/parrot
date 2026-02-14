import { Hono } from "hono";
import { getProfile, incrementUsage } from "../db";
import type { Profile } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { checkUsageLimits } from "../middleware/feature-gate";

export const cleanup = new Hono();

interface CleanupRequest {
	text: string;
}

cleanup.use("*", authMiddleware, checkUsageLimits("cleanupRequests"));

cleanup.post("/", async (c) => {
	const user = c.get("user");

	// Get user's profile
	const profile = await getProfile(user.id);

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
		await incrementUsage(user.id, "cleanupRequests", 1);
		return c.json({ text: cleaned });
	} catch (e) {
		return c.json({ error: String(e) }, 500);
	}
});

async function cleanupText(
	text: string,
	apiKey: string,
	profile: Profile | null | undefined,
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
