# Conservative filler removal

ISSUE-1048 replaces the global English filler blacklist with permission derived
from the original transcript. The same finalizer handles builtin and legacy
Ollama responses. A model translation cannot grant permission to delete words.

Only a leading run of lowercase `um`, `uh`, `uhh`, `umm` or `uhm` can be removed.
Trailing speech punctuation is allowed; internal punctuation, symbols and
capitalized spellings are preserved. The remaining text must start with one
of the small English clause patterns in `cleanup_fillers.rs`, such as `I think`,
`please send`, `keep the`, or `can <Name> not`. This is conservative lexical
context, not a general language detector or a semantic guarantee.

Any non-ASCII alphabetic text, another script, quotation marks or code quotes
disable deterministic removal. Apostrophes inside words such as `don't` remain
usable. Bare pauses, unfamiliar clauses, capitalized names, and every interior
token remain protected. German `er` and `um`, meaningful `like`, interjections
and acknowledgments such as `hmm` and `uh-huh` stay in the ordered content check.
The check rejects model deletion of those words too; fallback keeps them.

| Original | Deterministic result |
| --- | --- |
| `um I think we should keep it` | `I think we should keep it` |
| `uh, please send the draft` | `please send the draft` |
| `Er kommt um acht Uhr.` | Preserved |
| `um please send कल का invoice` | Preserved |
| `um die Rechnung please send` | Preserved |
| `Um please send the draft` | Preserved |
| `um please send the word 'uh'` | Preserved |
| `I, um, like it, actually.` | Preserved |

Only the beginning of the full transcript receives this permission. A later
token-budget segment cannot delete a pause from the middle of the transcript.
Incomplete generations continue to return the exact original text.

This deliberately retains some actual fillers, including capitalized pauses,
interior pauses, Hindi/Hinglish pauses and English phrases outside the supported
patterns. Same-script code-switching cannot be fully identified from these
cues; surrounding meaningful words remain protected, but a recognized English
opening can still authorize a leading pause before a later language switch.
Uncapitalized names that resemble pauses also remain a contextual ambiguity.
Expanding removal needs speaker-reviewed examples, tracked in ISSUE-1077.
No language model, new dependency, ASR setting or selected cleanup tier is added.
