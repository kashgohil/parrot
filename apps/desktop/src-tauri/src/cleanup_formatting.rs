//! Bounded formatting rules for a completed, content-guarded transcript.
//! These cues are not general grammar or language detection. Unknown fragments
//! keep their punctuation; no words, internal spelling or sentence boundaries
//! are inferred. Never call this on a bypass or incomplete model response.

use unicode_script::{Script, UnicodeScript};

pub(crate) fn format_completed(safe: &str, original: &str) -> String {
    // Work on the whole transcript, not sidecar segments: a byte/token split
    // cannot establish a sentence boundary. Source quotes/code also veto edits
    // when a model has changed their layout punctuation.
    let protected = |text: &str| {
        crate::cleanup_fillers::quoted(text)
            || text.chars().any(|c| {
                matches!(
                    c,
                    '\n' | '\r'
                        | ':'
                        | ';'
                        | '/'
                        | '\\'
                        | '@'
                        | '_'
                        | '='
                        | '+'
                        | '*'
                        | '#'
                        | '<'
                        | '>'
                        | '['
                        | ']'
                        | '{'
                        | '}'
                        | '('
                        | ')'
                )
            })
    };
    if protected(original)
        || protected(safe)
        || !safe.starts_with(char::is_alphabetic)
        || safe.split_whitespace().next().is_some_and(|word| {
            matches!(
                word.trim_end_matches([',', '.', '!', '?']),
                "um" | "uh" | "uhh" | "umm" | "uhm" | "er" | "ah" | "hmm" | "hm" | "mm" | "mmm"
            )
        })
    {
        return safe.to_owned();
    }
    let tokens: Vec<&str> = safe.split_whitespace().collect();
    let terminal = if tokens.len() >= 3 && safe.ends_with(|c: char| c.is_alphanumeric()) {
        infer_terminal(safe, &tokens, original)
    } else {
        None
    };
    let mut result = safe.to_owned();
    // ASCII casing is one byte and cannot expand a Unicode character, change
    // a script or capitalize a later token. Preserve iPhone/eBay-style names.
    // Unknown fragments are capitalized only when already sentence-punctuated.
    if tokens.len() >= 3
        && (terminal.is_some() || safe.ends_with(['.', '?', '!', '।', '。', '？', '！']))
        && tokens[0]
            .trim_end_matches(',')
            .bytes()
            .all(|c| c.is_ascii_lowercase())
        && safe.as_bytes()[0].is_ascii_lowercase()
    {
        result.replace_range(..1, &safe[..1].to_ascii_uppercase());
    }
    if let Some(mark) = terminal {
        result.push(mark);
    }
    result
}

fn infer_terminal(safe: &str, tokens: &[&str], original: &str) -> Option<char> {
    let devanagari = safe.chars().any(|c| c.script() == Script::Devanagari);
    if safe
        .chars()
        .any(|c| c.is_alphabetic() && !matches!(c.script(), Script::Latin | Script::Devanagari))
    {
        return None;
    }
    let last = *tokens.last().unwrap();
    if devanagari {
        // A final finite/copular Hindi form is a narrow prose cue, including
        // Hindi–English mixes. Interrogatives and dependent endings abstain.
        let question = tokens.iter().any(|word| {
            matches!(
                *word,
                "क्या"
                    | "क्यों"
                    | "कैसे"
                    | "कब"
                    | "कहाँ"
                    | "कौन"
                    | "किस"
                    | "किसने"
                    | "किसका"
                    | "कितना"
                    | "कितनी"
                    | "कितने"
            )
        });
        if !question
            && matches!(
                last,
                "है" | "हैं"
                    | "था"
                    | "थी"
                    | "थे"
                    | "किया"
                    | "गया"
                    | "गई"
                    | "गए"
                    | "हुआ"
                    | "हुई"
                    | "हुए"
            )
            && !tokens
                .iter()
                .any(|word| matches!(*word, "अगर" | "यदि" | "जब"))
        {
            return Some('।');
        }
        return None;
    }
    // English terminal punctuation requires an explicit auxiliary and words
    // after it. Other Latin languages and imperative/fragments abstain.
    let first = tokens[0].to_ascii_lowercase();
    let auxiliary = |word: &str| {
        matches!(
            word,
            "am" | "is"
                | "are"
                | "was"
                | "were"
                | "has"
                | "have"
                | "had"
                | "did"
                | "does"
                | "will"
                | "would"
                | "can"
                | "could"
                | "should"
        )
    };
    let second = tokens[1].to_ascii_lowercase();
    if auxiliary(&last.to_ascii_lowercase())
        || matches!(
            last.to_ascii_lowercase().as_str(),
            "not" | "to" | "of" | "with" | "and" | "or" | "but" | "the" | "a" | "an"
        )
    {
        return None;
    }
    if auxiliary(&first) {
        // A model may lowercase a source name. The original prefix can still
        // establish inversion; candidate casing cannot create that evidence.
        let mut source_tokens = original.split_whitespace();
        let source_name = source_tokens
            .next()
            .is_some_and(|word| word.eq_ignore_ascii_case(tokens[0]))
            && source_tokens.next().is_some_and(|word| {
                word.eq_ignore_ascii_case(tokens[1])
                    && word.starts_with(|c: char| c.is_ascii_uppercase())
            });
        let subject = matches!(
            second.as_str(),
            "i" | "we" | "you" | "they" | "he" | "she" | "it" | "the" | "this" | "that"
        ) || source_name;
        if subject && tokens.len() >= 4 {
            return Some('?');
        }
    } else if !matches!(
        first.as_str(),
        "if" | "when"
            | "while"
            | "although"
            | "unless"
            | "because"
            | "until"
            | "after"
            | "before"
            | "since"
            | "once"
            | "who"
            | "what"
            | "where"
            | "why"
            | "how"
    ) && tokens
        .iter()
        .enumerate()
        .any(|(i, word)| i > 0 && i + 1 < tokens.len() && auxiliary(&word.to_ascii_lowercase()))
    {
        return Some('.');
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_clear_clauses_without_editing_internal_names_numbers_or_words() {
        for (source, expected) in [
            (
                "priya did not approve invoice 25 on friday",
                "Priya did not approve invoice 25 on friday.",
            ),
            (
                "maybe Ravi has not paid 2.50 euros",
                "Maybe Ravi has not paid 2.50 euros.",
            ),
            (
                "can Priya not deploy release 2.1 until Friday",
                "Can Priya not deploy release 2.1 until Friday?",
            ),
            ("is the API ready", "Is the API ready?"),
            (
                "शायद रवि ने bill approve नहीं किया",
                "शायद रवि ने bill approve नहीं किया।",
            ),
            ("आज meeting है", "आज meeting है।"),
            ("रीमा ने 2.50 रुपये नहीं दिए हैं", "रीमा ने 2.50 रुपये नहीं दिए हैं।"),
            (
                "bonjour, je voudrais réserver une table.",
                "Bonjour, je voudrais réserver une table.",
            ),
            ("iPhone is still available", "iPhone is still available."),
        ] {
            assert_eq!(format_completed(source, source), expected);
            assert_eq!(format_completed(expected, source), expected, "idempotent");
        }
    }

    #[test]
    fn preserves_protected_layout_and_abstains_on_ambiguous_terminals() {
        for source in [
            "Priya did not approve it?",
            "Priya did not approve it!",
            "Priya did not approve it…",
            "Priya did not approve it:",
            "iPhone",
            "eBay",
            "maybe tomorrow",
            "Priya has",
            "Priya did not",
            "Priya has not paid the",
            "Can of soup",
            "If Priya has not paid",
            "When Priya has not paid",
            "क्या प्रिया ने भुगतान नहीं किया",
            "रवि कब घर गया",
            "अगर रवि घर गया",
            "शायद कल",
            "release 2.1",
            "小王没有批准25元的付款",
            "田中さんは25円の支払いを承認していません",
            "priya said \"i have not paid\"",
            "‘ravi has not paid’",
            "`ravi has not paid`",
            "ravi has not paid\npriya has paid",
            "- priya has not paid",
            "priya has not paid; ravi has paid",
            "ravi has not paid user@example.com",
            "ravi has not paid https://example.com",
            "ravi has not paid invoice_id",
            "ravi has not paid (yet)",
        ] {
            assert_eq!(format_completed(source, source), source);
        }
        assert_eq!(
            format_completed("ravi has not paid", "\"ravi has not paid\""),
            "ravi has not paid"
        );
        assert_eq!(
            format_completed(
                "can priya not deploy release 2.1",
                "can Priya not deploy release 2.1"
            ),
            "Can priya not deploy release 2.1?"
        );
        assert_eq!(
            format_completed(
                "can priya not deploy release 2.1",
                "can priya not deploy release 2.1"
            ),
            "can priya not deploy release 2.1"
        );
        assert_eq!(format_completed("can Of soup be served", "can of soup be served"),
            "can Of soup be served");
    }
}
