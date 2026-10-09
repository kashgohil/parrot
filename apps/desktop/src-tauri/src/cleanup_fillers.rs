//! Conservative, source-derived permission to remove a leading vocal pause.
//! These English clause cues are not a general language detector. Unknown
//! contexts keep their words; model output never grants itself permission.

use unicode_script::{Script, UnicodeScript};

const LEADING_PAUSES: &[&str] = &["um", "uh", "uhh", "umm", "uhm"];

fn pause(token: &str) -> bool {
    // Only trailing speech punctuation is allowed. Never collapse u.m, u/m,
    // quotation marks, symbols or capitalized names into a filler spelling.
    LEADING_PAUSES.contains(&token.trim_end_matches([',', '.', '!', '?', '…']))
}

fn quoted(text: &str) -> bool {
    let mut chars = text.chars().peekable();
    let mut previous = None;
    while let Some(c) = chars.next() {
        if matches!(
            c,
            '"' | '“' | '”' | '‘' | '«' | '»' | '`' | '「' | '」' | '『' | '』'
        ) || (matches!(c, '\'' | '’')
            && !(previous.is_some_and(char::is_alphabetic)
                && chars.peek().is_some_and(|c| c.is_alphabetic())))
        {
            return true;
        }
        previous = Some(c);
    }
    false
}

fn english_clause(first: &str, second: &str, third: Option<&str>) -> bool {
    let second_is_name = second.starts_with(|c: char| c.is_ascii_uppercase());
    let first = first.to_ascii_lowercase();
    let second = second
        .trim_end_matches([',', '.', '!', '?', ':'])
        .to_ascii_lowercase();
    let pronouns = ["i", "we", "you", "they", "he", "she", "it"];
    let verbs = [
        "send", "keep", "delete", "do", "check", "use", "ship", "approve", "review",
    ];
    (!["um", "uh", "er", "ah", "hmm", "hm", "mm", "mmm"].contains(&first.as_str())
        && ["has", "have", "did", "approved"].contains(&second.as_str()))
        || (first == "please" && verbs.contains(&second.as_str()))
        || (pronouns.contains(&first.as_str())
            && [
                "am", "is", "are", "was", "were", "have", "has", "will", "would", "can", "could",
                "should", "actually", "think", "need", "want", "like", "did", "do", "don't",
                "can't", "cannot",
            ]
            .contains(&second.as_str()))
        || (verbs.contains(&first.as_str())
            && ["the", "this", "that", "my", "your", "our", "it"].contains(&second.as_str()))
        || (["can", "could", "would", "should"].contains(&first.as_str())
            && (pronouns.contains(&second.as_str())
                || (second_is_name
                    && third.is_some_and(|word| word == "not" || verbs.contains(&word)))))
}

pub(crate) fn allows_leading_pause_removal(original: &str) -> bool {
    if quoted(original)
        || original
            .chars()
            .any(|c| c.is_alphabetic() && (c.script() != Script::Latin || !c.is_ascii()))
    {
        return false;
    }
    let mut tokens = original.split_whitespace().peekable();
    let mut found = false;
    while tokens.peek().is_some_and(|word| pause(word)) {
        found = true;
        tokens.next();
    }
    // A bare pause or an ambiguous name/foreign phrase supplies no context.
    found
        && tokens
            .next()
            .zip(tokens.next())
            .is_some_and(|(a, b)| english_clause(a, b, tokens.next()))
}

/// Keep interior tokens, acknowledgments, capitalized names and uncertain
/// language intact. Apply permission from the original to both candidates
/// and fallback text so a translated candidate cannot authorize deletion.
pub(crate) fn strip_leading_pauses(text: &str, original: &str) -> String {
    if !allows_leading_pause_removal(original) {
        return text.to_owned();
    }
    let mut rest = text.trim_start();
    while let Some(token) = rest.split_whitespace().next() {
        if !pause(token) {
            break;
        }
        rest = rest[token.len()..].trim_start();
    }
    rest.to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn removes_only_leading_pauses_in_recognizable_english_clauses() {
        for (source, expected) in [
            ("um I think we should keep it", "I think we should keep it"),
            ("uh, please send the draft", "please send the draft"),
            ("umm uh keep the invoice", "keep the invoice"),
            ("uhm we have not paid", "we have not paid"),
            ("um I like it, uh, actually", "I like it, uh, actually"),
        ] {
            assert_eq!(strip_leading_pauses(source, source), expected);
        }
    }

    #[test]
    fn preserves_meaningful_or_uncertain_tokens() {
        for source in [
            "Er kommt um acht Uhr.",
            "um acht kommt er",
            "Wir sprechen um den Plan.",
            "um please send कल का invoice",
            "um die Rechnung please send",
            "um meeting कल है",
            "um 今日は雨です",
            "uh प्रिया ने भुगतान नहीं किया",
            "um",
            "uh-huh",
            "hmm",
            "Um please send the draft",
            "Er will send the draft",
            "um Um will send it",
            "She said \"um please send the draft\".",
            "um please send the word ‘um’",
            "um please send 'uh'",
            "um please send `um`",
            "u.m please send the draft",
            "u/m please send the draft",
            "u$m please send the draft",
            "um I like café",
            "ah I like it",
            "I, um, like it",
        ] {
            assert_eq!(strip_leading_pauses(source, source), source, "{source}");
        }
    }

    #[test]
    fn output_cannot_authorize_its_own_language() {
        assert_eq!(
            strip_leading_pauses("um I think it is ready", "Er kommt um acht"),
            "um I think it is ready"
        );
        assert_eq!(
            strip_leading_pauses("um please send the draft", "Please send the draft"),
            "um please send the draft"
        );
    }
}
