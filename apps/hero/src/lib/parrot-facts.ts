/**
 * Single source of truth for Parrot product facts (GEO plan §2D).
 *
 * Consume from pages, schema, blog posts, and scripts/generate-seo.ts — one
 * edit here keeps every surface consistent. Monthly freshness check: bump
 * `version` on release; re-verify the entity sentence against the live meta.
 */
export const PARROT_FACTS = {
	name: "Parrot",
	/**
	 * Canonical one-line entity definition. Use verbatim on-site (hero, about,
	 * schema) and off-site (X/GitHub/PH/AlternativeTo bios) so AI models get a
	 * consistent entity.
	 */
	entity:
		"Parrot is a free, local-first voice dictation app for Apple Silicon Macs.",
	/**
	 * Qualified brand names for entity disambiguation — "Parrot" collides with
	 * drones, Parrot OS, and several apps (GEO plan §3D).
	 */
	alternateNames: ["Parrot Dictation", "Parrot for Mac", "tryparrot"],
	/** Current app version — keep in sync with apps/desktop tauri.conf.json. */
	version: "0.2.3",
	price: "Free for life",
	os: "macOS",
	osRequirement: "Apple Silicon (M1 and later)",
	/** Matches apps/desktop hotkey.rs default_for_platform(). */
	defaultHotkey: "fn",
	siteUrl: "https://tryparrot.app",
} as const;
