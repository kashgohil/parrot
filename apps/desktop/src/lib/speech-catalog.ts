import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export interface SpeechCapabilities {
	known: boolean;
	multilingual: boolean | null;
	explicit_language_hints: boolean;
	languages: string[];
	mixed_language_evaluated: boolean;
}

export interface SpeechModel {
	id: string;
	name: string;
	description: string;
	size: string;
	recommended: boolean;
	capabilities: SpeechCapabilities;
}

export interface SpeechCatalog {
	models: SpeechModel[];
	languages: {code: string; name: string}[];
}

export const EMPTY_MODELS: SpeechModel[] = [];

export function supportsLanguage(capabilities: SpeechCapabilities | null, language: string): boolean | null {
	if (language === "auto") return true;
	return capabilities?.known ? capabilities.languages.includes(language) : null;
}

export function coverageLabel(capabilities: SpeechCapabilities): string {
	if (!capabilities.known) return "Coverage unknown";
	return capabilities.multilingual ? `${capabilities.languages.length} languages` : "English only";
}

export function useSpeechCatalog() {
	const [catalog, setCatalog] = useState<SpeechCatalog | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	const retry = useCallback(() => setAttempt(value => value + 1), []);
	useEffect(() => {
		let active = true;
		setError(null);
		invoke<SpeechCatalog>("get_speech_catalog").then(result => {
			if (active) setCatalog(result);
		}).catch(error => {
			if (active) setError(String(error));
		});
		return () => { active = false; };
	}, [attempt]);
	return {catalog, error, retry};
}
