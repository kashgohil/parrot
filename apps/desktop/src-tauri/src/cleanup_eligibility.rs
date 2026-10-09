//! Shared microphone/import cleanup policy. This estimates content length;
//! it does not detect a language or estimate the model's token budget.
use unicode_script::{Script, UnicodeScript};
use unicode_segmentation::UnicodeSegmentation;

/// Global Off and the effective per-app profile take precedence over length.
pub(crate) fn should_cleanup(text: &str, mode: &str, enabled: bool) -> bool {
    mode != "off" && enabled && has_substantive_text(text)
}

fn unspaced_script(c: char) -> bool {
    matches!(
        c.script(),
        Script::Han
            | Script::Hiragana
            | Script::Katakana
            | Script::Thai
            | Script::Lao
            | Script::Khmer
            | Script::Myanmar
    )
}

fn has_substantive_text(text: &str) -> bool {
    // Do not treat each Han ideograph as a separate word. Three words from
    // other scripts still qualify, including in mixed-script utterances.
    if text
        .unicode_words()
        .filter(|word| !word.chars().any(unspaced_script))
        .take(3)
        .count()
        == 3
    {
        return true;
    }

    // Eight content graphemes qualify if an unspaced script is present.
    // Counting graphemes keeps accents/vowel marks from inflating length;
    // punctuation, spaces and emoji do not contribute. Latin/Indic content
    // in mixed text does contribute. Long single Latin names still bypass.
    let mut content = 0;
    let mut unspaced = false;
    for grapheme in text.graphemes(true) {
        if grapheme.chars().any(char::is_alphanumeric) {
            content += 1;
            unspaced |= grapheme.chars().any(unspaced_script);
            if unspaced && content >= 8 {
                return true;
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn substantive_unspaced_and_mixed_text_qualifies() {
        for text in [
            "小王没有批准这笔付款",
            "明日の会議は午後三時です",
            "พรุ่งนี้อย่าส่งใบแจ้งหนี้",
            "प्रिया ने invoice नहीं भेजा",
            "send,the,invoice",
            "send\u{2003}the\u{00a0}invoice",
            "请发送invoice",
            "小王 approved invoice today",
        ] {
            assert!(should_cleanup(text, "blocking", true), "{text}");
            assert!(should_cleanup(text, "background", true), "{text}");
        }
    }

    #[test]
    fn short_acknowledgments_and_non_content_bypass() {
        for text in [
            "",
            "   ",
            "yes!",
            "on it",
            "thank you",
            "Priya",
            "Alexanderson",
            "हाँ",
            "ठीक है",
            "谢谢",
            "好的",
            "ありがとう",
            "了解しました",
            "ขอบคุณ",
            "... !!! —",
            "🙂🙂🙂🙂🙂🙂🙂🙂",
            "yes ... !!!",
            "e\u{301} e\u{301}",
        ] {
            assert!(!should_cleanup(text, "blocking", true), "{text}");
        }
    }

    #[test]
    fn thresholds_count_content_and_combined_characters() {
        assert!(!should_cleanup("一二三四五六七！！！", "blocking", true));
        assert!(should_cleanup("一二三四五六七八", "blocking", true));
        assert!(!should_cleanup(
            "中a\u{301}a\u{301}a\u{301}a\u{301}a\u{301}a\u{301}",
            "blocking",
            true
        ));
        assert!(should_cleanup(
            "中a\u{301}a\u{301}a\u{301}a\u{301}a\u{301}a\u{301}a\u{301}",
            "blocking",
            true
        ));
        assert!(!should_cleanup("don't send", "blocking", true));
        assert!(should_cleanup("don't send it", "blocking", true));
        assert!(!should_cleanup("नहीं भेजो", "blocking", true));
        assert!(should_cleanup("इसे नहीं भेजो", "blocking", true));
    }

    #[test]
    fn explicit_disable_wins_over_every_length_rule() {
        for text in ["send the invoice", "小王没有批准这笔付款"] {
            assert!(!should_cleanup(text, "off", true));
            for mode in ["blocking", "background", "off"] {
                assert!(!should_cleanup(text, mode, false));
            }
        }
    }
}
