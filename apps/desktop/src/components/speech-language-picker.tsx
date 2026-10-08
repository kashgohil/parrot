import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	coverageLabel,
	supportsLanguage,
	type SpeechCapabilities,
	type SpeechCatalog,
} from "@/lib/speech-catalog";

export function SpeechLanguagePicker({
	catalog,
	capabilities,
	language,
	switching,
	onLanguageChange,
	onSwitchModel,
}: {
	catalog: SpeechCatalog | null;
	capabilities: SpeechCapabilities | null;
	language: string;
	switching: boolean;
	onLanguageChange: (language: string) => void;
	onSwitchModel: (modelId: string) => void;
}) {
	const selectedLanguage = catalog?.languages.find(item => item.code === language);
	const unknownLanguage = language !== "auto" && catalog && !selectedLanguage;
	const unsupported = supportsLanguage(capabilities, language) === false || unknownLanguage;
	const alternatives = catalog?.models.filter(model =>
		model.capabilities.multilingual && supportsLanguage(model.capabilities, language) === true,
	) ?? [];

	function optionLabel(code: string, name: string) {
		if (supportsLanguage(capabilities, code) === false) return `${name} — requires another model`;
		if (capabilities?.known && !capabilities.explicit_language_hints) return `${name} — auto-detected`;
		return name;
	}

	return (
		<div className="space-y-2 pt-2">
			<Label htmlFor="sttLanguage" className="text-sm font-medium">Language</Label>
			<Select
				disabled={!catalog || !capabilities || switching}
				value={language}
				onValueChange={onLanguageChange}
			>
				<SelectTrigger id="sttLanguage" className="w-full h-10 rounded-xl border-border bg-muted/50">
					<SelectValue placeholder="Select language" />
				</SelectTrigger>
				<SelectContent position="popper" className="rounded-xl">
					<SelectItem value="auto">{capabilities?.multilingual === false ? "Auto (English only)" : "Auto-detect"}</SelectItem>
					{catalog?.languages.map(item => (
						<SelectItem key={item.code} value={item.code}>{optionLabel(item.code, item.name)}</SelectItem>
					))}
					{unknownLanguage && <SelectItem value={language}>{language} — unknown saved language</SelectItem>}
				</SelectContent>
			</Select>
			<p className="text-xs text-muted-foreground">
				{capabilities?.known ? `${coverageLabel(capabilities)}. ` : ""}
				{capabilities?.known ? capabilities.explicit_language_hints
					? capabilities.multilingual
						? "Whisper uses your language hint for decoding. Auto-detect identifies the language from audio."
						: "This model decodes English only, including with Auto-detect."
					: "Parakeet auto-detects among its supported languages. A saved language preference does not pin decoding."
					: capabilities ? "Custom model coverage is unknown. The loaded model checks language compatibility before decoding." : "Loading model capabilities…"}
			</p>
			{unsupported && (
				<div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
					<p className="text-sm">{selectedLanguage?.name ?? language} is not supported by this model. Your preference is retained, but transcription cannot use it until you select a compatible model or Auto-detect.</p>
					<p className="text-xs text-muted-foreground">Choose a model below to download it if needed and switch. Your language preference stays the same; use Save changes to persist edits.</p>
					<div className="flex flex-wrap gap-2">
						{alternatives.map(model => (
							<Button key={model.id} variant="outline" size="sm" disabled={switching} onClick={() => onSwitchModel(model.id)}>Use {model.name}</Button>
						))}
					</div>
				</div>
			)}
			<p className="text-xs text-muted-foreground">Language coverage does not guarantee accuracy when languages are mixed in one recording. Broader mixed-language evaluation is still pending.</p>
		</div>
	);
}
