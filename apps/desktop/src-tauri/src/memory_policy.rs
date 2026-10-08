//! Runtime overrides leave the user's normal preferences and model choices intact.
use crate::{db::Database, resolve_cleanup_backend};
use serde::Serialize;
use std::time::Duration;

#[derive(Debug, Serialize)]
pub struct MemoryPolicy {
    pub low_memory: bool,
    pub previews: bool,
    #[serde(skip)]
    pub speech_idle: Option<Duration>,
    #[serde(skip)]
    pub cleanup_idle: Option<Duration>,
    pub sequential: bool,
    pub skip_cleanup: bool,
}

impl MemoryPolicy {
    pub fn from_database(db: &Database) -> Self {
        let low_memory =
            db.get_setting("low_memory_mode").ok().flatten().as_deref() == Some("true");
        let builtin = resolve_cleanup_backend(db) == "builtin";
        Self {
            low_memory,
            previews: !low_memory,
            speech_idle: idle(db, "stt_idle_seconds", low_memory),
            cleanup_idle: idle(db, "cleanup_idle_seconds", low_memory),
            sequential: builtin
                && (low_memory
                    || db
                        .get_setting("stt_release_before_cleanup")
                        .ok()
                        .flatten()
                        .as_deref()
                        == Some("true")),
            skip_cleanup: low_memory && !builtin,
        }
    }
}

fn idle(db: &Database, key: &str, low_memory: bool) -> Option<Duration> {
    let seconds = if low_memory {
        30
    } else {
        db.get_setting(key)
            .ok()
            .flatten()
            .and_then(|s| s.parse::<u64>().ok())
            .filter(|s| *s <= 86400)
            .unwrap_or(60)
    };
    (seconds != 0).then(|| Duration::from_secs(seconds))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn mode_overrides_and_restores_preferences_without_changing_languages_or_models() {
        let db = Database::in_memory().unwrap();
        for (key, value) in [
            ("stt_idle_seconds", "0"),
            ("cleanup_idle_seconds", "300"),
            ("stt_language", "fr"),
            ("stt_model", "large-v3-turbo"),
            ("cleanup_backend", "builtin"),
        ] {
            db.set_setting(key, value).unwrap();
        }
        db.set_setting("low_memory_mode", "true").unwrap();
        let policy = MemoryPolicy::from_database(&db);
        assert!(!policy.previews && policy.sequential && !policy.skip_cleanup);
        assert_eq!(policy.speech_idle, Some(Duration::from_secs(30)));
        assert_eq!(policy.cleanup_idle, policy.speech_idle);
        assert_eq!(
            db.get_setting("stt_model").unwrap().as_deref(),
            Some("large-v3-turbo")
        );
        assert_eq!(
            crate::transcription::TranscribeOpts::from_database(&db)
                .unwrap()
                .language
                .as_deref(),
            Some("fr")
        );
        db.set_setting("low_memory_mode", "false").unwrap();
        let restored = MemoryPolicy::from_database(&db);
        assert!(restored.previews && !restored.sequential);
        assert_eq!(restored.speech_idle, None);
        assert_eq!(restored.cleanup_idle, Some(Duration::from_secs(300)));
        db.set_setting("low_memory_mode", "true").unwrap();
        db.set_setting("cleanup_backend", "ollama").unwrap();
        let legacy = MemoryPolicy::from_database(&db);
        assert!(legacy.skip_cleanup && !legacy.sequential);
        assert_eq!(
            db.get_setting("cleanup_backend").unwrap().as_deref(),
            Some("ollama")
        );
    }
}
