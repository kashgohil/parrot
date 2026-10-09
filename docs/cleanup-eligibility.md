# Cleanup eligibility

ISSUE-1046 applies one length policy to microphone dictation and imported audio,
before either path acquires the cleanup model. Global Cleanup Off and an enabled
app profile with cleanup disabled always bypass cleanup. Imports use the global
profile, as before. Blocking and Background use the same eligibility rule.

Text qualifies when either condition holds:

- It contains at least three Unicode words that do not contain characters from
  the scripts listed below. Unicode word boundaries recognize punctuation and
  Unicode whitespace; apostrophes within contractions do not create extra words.
- It contains Han, Hiragana, Katakana, Thai, Lao, Khmer or Myanmar script and at
  least eight grapheme clusters containing letters or numbers. Mixed Latin or
  Indic content contributes to this length. Spaces, punctuation and emoji do not.

The second rule avoids counting each Han character as a word and keeps short
Chinese/Japanese acknowledgments cheap. Grapheme clusters keep combining marks
attached to their base character. The dependency is the existing locked
`unicode-segmentation` 1.12.0; script properties use `unicode-script` 0.5.8.

| Input | Decision when enabled |
| --- | --- |
| `yes!`, `on it`, `thank you`, `Alexanderson` | Bypass |
| `send,the,invoice`, `don't send it` | Cleanup |
| `हाँ`, `ठीक है`, `नहीं भेजो` | Bypass |
| `इसे नहीं भेजो`, `प्रिया ने invoice नहीं भेजा` | Cleanup |
| `谢谢`, `好的`, `ありがとう`, `了解しました`, `ขอบคุณ` | Bypass |
| `小王没有批准这笔付款`, `明日の会議は午後三時です` | Cleanup |
| `พรุ่งนี้อย่าส่งใบแจ้งหนี้`, `请发送invoice` | Cleanup |
| Punctuation or emoji alone | Bypass |

These thresholds estimate content length; they do not detect language or prove
that text is an acknowledgment. Short substantive phrases can still bypass:
`don't send`, `नहीं भेजो`, and Chinese/Japanese text below eight content graphemes
are examples. Long single Latin names remain cheap. This is a documented latency
tradeoff, rather than dictionary-based segmentation for every language.

Model token budgeting is separate: ISSUE-1047 uses the actual model tokenizer
and bounded segments after text qualifies. Eligibility does not modify the
transcript, choose a model, enable low-memory mode or change cleanup finalization.
Native-speaker semantic review remains ISSUE-1077; physical lower-RAM device
validation remains ISSUE-1072.
