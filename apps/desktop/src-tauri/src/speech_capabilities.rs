//! One capability contract for Settings, onboarding and native decoding.
use anyhow::{bail, Result};
use serde::Serialize;
use std::{fs::File, io::Read, path::Path};

const PARAKEET_LANGUAGES: &[&str] = &[
    "bg", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "de", "el", "hu", "it", "lv", "lt", "mt",
    "pl", "pt", "ro", "sk", "sl", "es", "sv", "ru", "uk",
];

#[derive(Clone, Debug, Serialize)]
pub struct Language {
    pub code: &'static str,
    pub name: String,
}

pub fn languages() -> Vec<Language> {
    let mut languages: Vec<_> = (0..=whisper_rs::get_lang_max_id())
        .filter_map(|id| {
            let code = whisper_rs::get_lang_str(id)?;
            let name = whisper_rs::get_lang_str_full(id)?;
            let mut chars = name.chars();
            let name = chars.next()?.to_uppercase().collect::<String>() + chars.as_str();
            Some(Language { code, name })
        })
        .collect();
    languages.sort_by(|a, b| a.name.cmp(&b.name));
    languages
}

pub fn normalize_language(language: Option<&str>) -> String {
    let code = language.unwrap_or("auto").trim().to_ascii_lowercase();
    if code.is_empty() {
        "auto".into()
    } else {
        code
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct Capabilities {
    pub known: bool,
    pub multilingual: Option<bool>,
    pub explicit_language_hints: bool,
    pub languages: Vec<&'static str>,
    // Language coverage does not establish accuracy on mixed speech.
    pub mixed_language_evaluated: bool,
}

impl Capabilities {
    fn unknown() -> Self {
        Self {
            known: false,
            multilingual: None,
            explicit_language_hints: false,
            languages: vec![],
            mixed_language_evaluated: false,
        }
    }

    pub fn parakeet() -> Self {
        Self {
            known: true,
            multilingual: Some(true),
            explicit_language_hints: false,
            languages: PARAKEET_LANGUAGES.to_vec(),
            mixed_language_evaluated: false,
        }
    }

    /// Matches whisper.cpp's vocabulary contract. Do not guess for custom vocabularies.
    pub fn whisper_vocab(n_vocab: i32) -> Self {
        let count = match n_vocab {
            51864 => 1,
            51865 => 99,
            51866 => 100,
            _ => return Self::unknown(),
        };
        let languages = if count == 1 {
            vec!["en"]
        } else {
            (0..count).filter_map(whisper_rs::get_lang_str).collect()
        };
        Self {
            known: true,
            multilingual: Some(count > 1),
            explicit_language_hints: true,
            languages,
            mixed_language_evaluated: false,
        }
    }

    pub fn supports(&self, language: &str) -> Option<bool> {
        if language == "auto" {
            Some(true)
        } else if self.known {
            Some(self.languages.contains(&language))
        } else {
            None
        }
    }

    pub fn validate(&self, language: Option<&str>) -> Result<()> {
        let code = normalize_language(language);
        if code != "auto" && !languages().iter().any(|language| language.code == code) {
            bail!("Unknown speech language '{code}'. Choose a language in Settings → Speech.");
        }
        if self.supports(&code) == Some(false) {
            bail!("This speech model does not support '{code}'. Choose a compatible multilingual Whisper model in Settings → Speech, or change the language to Auto-detect.");
        }
        Ok(())
    }
}

#[derive(Serialize)]
pub struct Model {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub size: &'static str,
    pub recommended: bool,
    pub capabilities: Capabilities,
}

pub fn models() -> Vec<Model> {
    vec![
        Model { id: "parakeet-v3", name: "Fast (Parakeet)", size: "~450 MB download",
            description: "Automatically detects 25 European languages, including English. Cannot pin a language; Hindi and CJK languages require Whisper.",
            recommended: true, capabilities: Capabilities::parakeet() },
        Model { id: "large-v3-turbo", name: "Multilingual (Whisper turbo)", size: "~600 MB download",
            description: "100 languages, including Hindi and Cantonese. Supports auto-detection and explicit language hints.",
            recommended: false, capabilities: Capabilities::whisper_vocab(51866) },
        Model { id: "small-q5_1", name: "Compact multilingual (Whisper small)", size: "~181 MiB download",
            description: "99 languages, including Hindi. Smaller download; accuracy can differ from turbo. Cantonese requires turbo.",
            recommended: false, capabilities: Capabilities::whisper_vocab(51865) },
        Model { id: "small.en", name: "English only (Whisper small.en)", size: "~500 MB download",
            description: "English only. Auto-detect also decodes as English. Other languages require a multilingual model.",
            recommended: false, capabilities: Capabilities::whisper_vocab(51864) },
    ]
}

/// Read only the GGML header, without allocating model weights or starting inference.
/// Existing custom files take precedence over model IDs and filename guesses.
pub fn for_target(engine: &str, model_id: &str, path: &Path) -> Capabilities {
    if engine == "parakeet" {
        return Capabilities::parakeet();
    }
    if let Ok(mut file) = File::open(path) {
        let mut header = [0u8; 8];
        if file.read_exact(&mut header).is_ok()
            && u32::from_le_bytes(header[..4].try_into().unwrap()) == 0x67676d6c
        {
            return Capabilities::whisper_vocab(i32::from_le_bytes(
                header[4..].try_into().unwrap(),
            ));
        }
        return Capabilities::unknown();
    }
    models()
        .into_iter()
        .find(|model| model.id == model_id)
        .map(|model| model.capabilities)
        .unwrap_or_else(Capabilities::unknown)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_matches_native_language_tokens_and_model_coverage() {
        let all = languages();
        assert_eq!(all.len(), 100);
        assert!(all
            .iter()
            .any(|language| language.code == "hi" && language.name == "Hindi"));
        assert!(all.iter().any(|language| language.code == "yue"));
        let models = models();
        for (model, count) in models.iter().zip([25, 100, 99, 1]) {
            assert_eq!(model.capabilities.languages.len(), count);
            assert!(!model.capabilities.mixed_language_evaluated);
        }
        let parakeet = &models[0].capabilities;
        assert!(!parakeet.explicit_language_hints);
        assert!(parakeet.validate(Some(" FR ")).is_ok());
        assert!(parakeet.validate(Some("hi")).is_err());
        assert!(models[1].capabilities.validate(Some("yue")).is_ok());
        assert!(models[2].capabilities.validate(Some("yue")).is_err());
        let english = &models[3].capabilities;
        for code in [None, Some("auto"), Some(" AUTO "), Some(""), Some("en")] {
            assert!(english.validate(code).is_ok());
        }
        for code in ["hi", "fr", "zz", "en\0"] {
            assert!(english.validate(Some(code)).is_err());
        }
    }

    #[test]
    fn actual_ggml_header_overrides_stale_ids_and_custom_names_without_loading() {
        let path =
            std::env::temp_dir().join(format!("parrot-capabilities-{}.bin", uuid::Uuid::new_v4()));
        let mut header = 0x67676d6cu32.to_le_bytes().to_vec();
        header.extend(51864i32.to_le_bytes());
        std::fs::write(&path, &header).unwrap();
        let caps = for_target("whisper", "large-v3-turbo", &path);
        assert_eq!(caps.languages, ["en"]);
        assert!(caps.validate(Some("hi")).is_err());
        std::fs::write(&path, b"bad header").unwrap();
        assert!(!for_target("whisper", "large-v3-turbo", &path).known);
        std::fs::remove_file(&path).unwrap();
        assert!(for_target("whisper", "large-v3-turbo", &path).known);
        assert!(!for_target("whisper", "my-custom-model", &path).known);
    }
}
