import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
	preset: "vercel",
	publicAssets: [
		{
			dir: "public",
			maxAge: 3600,
		},
	],
});
