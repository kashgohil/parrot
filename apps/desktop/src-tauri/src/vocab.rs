use serde::Deserialize;

#[derive(Debug, Clone)]
pub struct VocabEntry {
    pub term: String,
    pub context: Option<String>,
}

// Parse the profile.custom_words JSON. Each element may be a bare string
// (legacy) or an object { term, context? }. Empty/garbage input yields an
// empty list rather than erroring — vocab is a hint, not a hard requirement.
pub fn parse(custom_words_json: &str) -> Vec<VocabEntry> {
    let trimmed = custom_words_json.trim();
    if trimmed.is_empty() || trimmed == "[]" {
        return Vec::new();
    }
    let raw: Vec<RawEntry> = match serde_json::from_str(trimmed) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    raw.into_iter()
        .filter_map(|e| match e {
            RawEntry::Str(s) => {
                let s = s.trim();
                if s.is_empty() {
                    None
                } else {
                    Some(VocabEntry {
                        term: s.to_string(),
                        context: None,
                    })
                }
            }
            RawEntry::Obj { term, context } => {
                let term = term.trim();
                if term.is_empty() {
                    return None;
                }
                let context = context.and_then(|c| {
                    let c = c.trim();
                    if c.is_empty() {
                        None
                    } else {
                        Some(c.to_string())
                    }
                });
                Some(VocabEntry {
                    term: term.to_string(),
                    context,
                })
            }
        })
        .collect()
}

#[derive(Deserialize)]
#[serde(untagged)]
enum RawEntry {
    Str(String),
    Obj {
        term: String,
        #[serde(default)]
        context: Option<String>,
    },
}

// Build a comma-separated list of terms with no associated context. These are
// safe to bias the acoustic model with — the user wants this spelling
// unconditionally.
pub fn unconditional_terms(entries: &[VocabEntry]) -> Vec<&str> {
    entries
        .iter()
        .filter(|e| e.context.is_none())
        .map(|e| e.term.as_str())
        .collect()
}

// Whisper takes a free-form initial prompt; embedding the vocabulary as a
// natural sentence works better than a bare comma list.
pub fn whisper_initial_prompt(entries: &[VocabEntry]) -> Option<String> {
    let terms = unconditional_terms(entries);
    if terms.is_empty() {
        return None;
    }
    Some(format!("Vocabulary hints: {}.", terms.join(", ")))
}

// Build the cleanup-prompt section that teaches the LLM how to apply the
// user's vocabulary. Unconditional terms become "always spell as X". Terms
// with a context note become conditional rewrite rules so the LLM can keep
// the original spelling in unrelated contexts.
pub fn cleanup_vocabulary_section(entries: &[VocabEntry]) -> Option<String> {
    if entries.is_empty() {
        return None;
    }
    let mut out = String::from("\n\nVocabulary rules:");
    for e in entries {
        if let Some(ctx) = &e.context {
            out.push_str(&format!(
                "\n- Spell as \"{}\" when the surrounding text is about: {}. \
                 In any other context, leave the user's wording unchanged.",
                e.term, ctx
            ));
        } else {
            out.push_str(&format!(
                "\n- Always spell as \"{}\" when this term appears.",
                e.term
            ));
        }
    }
    Some(out)
}
