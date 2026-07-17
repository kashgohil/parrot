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

/// Deterministic post-STT pass: fix high-confidence near-misses against the
/// user's dictionary before LLM cleanup. Fixes the proper-noun weakness
/// Whisper shares with every local STT app.
///
/// Rules (conservative on purpose):
/// - Exact match ignoring case → rewrite to dictionary casing/spelling
/// - Edit distance 1, both sides length ≥ 4 → rewrite (typo / mis-hear)
/// - Terms with a context note are skipped here (need LLM judgment)
pub fn apply_dictionary_pass(text: &str, entries: &[VocabEntry]) -> String {
    let terms: Vec<&str> = entries
        .iter()
        .filter(|e| e.context.is_none())
        .map(|e| e.term.as_str())
        .filter(|t| !t.is_empty())
        .collect();
    if terms.is_empty() || text.is_empty() {
        return text.to_string();
    }

    let mut out = String::with_capacity(text.len());
    let mut word = String::new();

    let flush_word = |word: &mut String, out: &mut String| {
        if word.is_empty() {
            return;
        }
        let replacement = best_dict_match(word, &terms);
        out.push_str(replacement.unwrap_or(word.as_str()));
        word.clear();
    };

    for ch in text.chars() {
        if ch.is_alphanumeric() || ch == '\'' || ch == '-' {
            word.push(ch);
        } else {
            flush_word(&mut word, &mut out);
            out.push(ch);
        }
    }
    flush_word(&mut word, &mut out);
    out
}

fn best_dict_match<'a>(word: &str, terms: &[&'a str]) -> Option<&'a str> {
    let w_lower = word.to_lowercase();
    // Prefer exact case-insensitive hit.
    for t in terms {
        if t.to_lowercase() == w_lower {
            return Some(*t);
        }
    }
    if word.chars().count() < 4 {
        return None;
    }
    let mut best: Option<(&str, usize)> = None;
    for t in terms {
        let t_len = t.chars().count();
        if t_len < 4 {
            continue;
        }
        // Length must be close — avoid wild rewrites.
        let w_len = word.chars().count();
        if (t_len as isize - w_len as isize).unsigned_abs() > 1 {
            continue;
        }
        let d = edit_distance(&w_lower, &t.to_lowercase());
        if d == 1 {
            match best {
                None => best = Some((t, d)),
                Some((_, bd)) if d < bd => best = Some((t, d)),
                _ => {}
            }
        }
    }
    best.map(|(t, _)| t)
}

/// Classic Levenshtein, early-exit if distance can only grow past 1.
fn edit_distance(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let (n, m) = (a.len(), b.len());
    if a.is_empty() {
        return m;
    }
    if b.is_empty() {
        return n;
    }
    let mut prev: Vec<usize> = (0..=m).collect();
    let mut cur = vec![0; m + 1];
    for i in 1..=n {
        cur[0] = i;
        let mut row_min = cur[0];
        for j in 1..=m {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            cur[j] = (prev[j] + 1).min(cur[j - 1] + 1).min(prev[j - 1] + cost);
            row_min = row_min.min(cur[j]);
        }
        if row_min > 1 {
            // Can't recover to distance ≤ 1.
            return row_min;
        }
        std::mem::swap(&mut prev, &mut cur);
    }
    prev[m]
}

/// Mine raw→cleaned history for spelling corrections the user (via cleanup)
/// repeatedly applies. Returns suggested dictionary terms not already present.
pub fn mine_vocab_suggestions(
    pairs: &[(String, String)],
    existing: &[VocabEntry],
    min_count: usize,
) -> Vec<VocabSuggestion> {
    use std::collections::HashMap;

    let existing_lower: std::collections::HashSet<String> = existing
        .iter()
        .map(|e| e.term.to_lowercase())
        .collect();

    // Map corrected_form (as it appears in cleaned) → count of times a
    // different raw form was rewritten to it.
    let mut counts: HashMap<String, usize> = HashMap::new();
    let mut examples: HashMap<String, String> = HashMap::new();

    for (raw, cleaned) in pairs {
        if raw.trim().is_empty() || cleaned.trim().is_empty() {
            continue;
        }
        if raw.trim() == cleaned.trim() {
            continue;
        }
        let raw_words: Vec<&str> = raw.split_whitespace().collect();
        let clean_words: Vec<&str> = cleaned.split_whitespace().collect();
        // Align only equal-length sequences (conservative).
        if raw_words.len() != clean_words.len() {
            continue;
        }
        for (r, c) in raw_words.iter().zip(clean_words.iter()) {
            let r_stripped = trim_punct(r);
            let c_stripped = trim_punct(c);
            if r_stripped.is_empty() || c_stripped.is_empty() {
                continue;
            }
            if r_stripped.eq_ignore_ascii_case(&c_stripped) && r_stripped != c_stripped {
                // Case-only fix — still useful for proper nouns.
                *counts.entry(c_stripped.clone()).or_insert(0) += 1;
                examples
                    .entry(c_stripped.clone())
                    .or_insert_with(|| r_stripped.clone());
            } else if edit_distance(&r_stripped.to_lowercase(), &c_stripped.to_lowercase()) <= 2
                && c_stripped.chars().count() >= 3
                && r_stripped.to_lowercase() != c_stripped.to_lowercase()
            {
                *counts.entry(c_stripped.clone()).or_insert(0) += 1;
                examples
                    .entry(c_stripped.clone())
                    .or_insert_with(|| r_stripped.clone());
            }
        }
    }

    let mut suggestions: Vec<VocabSuggestion> = counts
        .into_iter()
        .filter(|(term, n)| *n >= min_count && !existing_lower.contains(&term.to_lowercase()))
        .map(|(term, count)| VocabSuggestion {
            term: term.clone(),
            seen_as: examples.get(&term).cloned().unwrap_or_default(),
            count,
        })
        .collect();
    suggestions.sort_by(|a, b| b.count.cmp(&a.count).then(a.term.cmp(&b.term)));
    suggestions.truncate(20);
    suggestions
}

fn trim_punct(s: &str) -> String {
    s.trim_matches(|c: char| !c.is_alphanumeric() && c != '\'' && c != '-')
        .to_string()
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct VocabSuggestion {
    pub term: String,
    pub seen_as: String,
    pub count: usize,
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
