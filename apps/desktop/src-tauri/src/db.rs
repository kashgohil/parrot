use anyhow::Result;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::local_setup::LocalSetupConfig;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = Self::db_path()?;
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    fn db_path() -> Result<PathBuf> {
        let data_dir =
            dirs::data_dir().ok_or_else(|| anyhow::anyhow!("Could not find data directory"))?;
        Ok(data_dir.join("com.kash.parrot").join("parrot.db"))
    }

    fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS dictation_history (
                id TEXT PRIMARY KEY,
                raw_text TEXT NOT NULL,
                cleaned_text TEXT NOT NULL DEFAULT '',
                provider TEXT NOT NULL DEFAULT 'local',
                duration_ms INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                custom_words TEXT NOT NULL DEFAULT '[]',
                context_prompt TEXT NOT NULL DEFAULT '',
                writing_style TEXT NOT NULL DEFAULT ''
            );

            INSERT OR IGNORE INTO profile (id) VALUES (1);

            -- Migration: add audio_path column
            CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY);
            ",
        )?;

        // Run conditional migrations
        let has_audio_path: bool = conn
            .prepare("SELECT COUNT(*) FROM _migrations WHERE name = 'add_audio_path'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .unwrap_or(0)
            > 0;

        if !has_audio_path {
            conn.execute_batch(
                "
                ALTER TABLE dictation_history ADD COLUMN audio_path TEXT;
                INSERT INTO _migrations (name) VALUES ('add_audio_path');
                ",
            )?;
        }

        // Migration: add local_setup table
        let has_local_setup: bool = conn
            .prepare("SELECT COUNT(*) FROM _migrations WHERE name = 'add_local_setup'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .unwrap_or(0)
            > 0;

        if !has_local_setup {
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS local_setup (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    whisper_model_path TEXT NOT NULL DEFAULT '',
                    whisper_server_port INTEGER NOT NULL DEFAULT 8080,
                    ollama_server_port INTEGER NOT NULL DEFAULT 11434,
                    ollama_model TEXT NOT NULL DEFAULT 'llama3.2',
                    setup_completed BOOLEAN NOT NULL DEFAULT 0,
                    setup_version TEXT NOT NULL DEFAULT '1.0'
                );
                INSERT OR IGNORE INTO local_setup (id) VALUES (1);
                INSERT INTO _migrations (name) VALUES ('add_local_setup');
                ",
            )?;
        }

        // Migration: add migrated_at column (cloud migration tracking)
        let has_migrated_at: bool = conn
            .prepare("SELECT COUNT(*) FROM _migrations WHERE name = 'add_migrated_at'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .unwrap_or(0)
            > 0;

        if !has_migrated_at {
            conn.execute_batch(
                "
                ALTER TABLE dictation_history ADD COLUMN migrated_at TEXT;
                INSERT INTO _migrations (name) VALUES ('add_migrated_at');
                ",
            )?;
        }

        // Migration: add audio_migrated_at for retry tracking
        let has_audio_migrated_at: bool = conn
            .prepare("SELECT COUNT(*) FROM _migrations WHERE name = 'add_audio_migrated_at'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .unwrap_or(0)
            > 0;

        if !has_audio_migrated_at {
            conn.execute_batch(
                "
                ALTER TABLE dictation_history ADD COLUMN audio_migrated_at TEXT;
                INSERT INTO _migrations (name) VALUES ('add_audio_migrated_at');
                ",
            )?;
        }

        // Migration: add local_user table
        let has_local_user: bool = conn
            .prepare("SELECT COUNT(*) FROM _migrations WHERE name = 'add_local_user'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .unwrap_or(0)
            > 0;

        if !has_local_user {
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS local_user (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    name TEXT NOT NULL DEFAULT '',
                    email TEXT NOT NULL DEFAULT '',
                    onboarding_completed BOOLEAN NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                INSERT OR IGNORE INTO local_user (id) VALUES (1);
                INSERT INTO _migrations (name) VALUES ('add_local_user');
                ",
            )?;
        }

        // Migration: per-dictation latency metrics (local only, no telemetry)
        let has_timing: bool = conn
            .prepare("SELECT COUNT(*) FROM _migrations WHERE name = 'add_dictation_timing'")?
            .query_row([], |row| row.get::<_, i64>(0))
            .unwrap_or(0)
            > 0;

        if !has_timing {
            conn.execute_batch(
                "
                ALTER TABLE dictation_history ADD COLUMN transcription_ms INTEGER;
                ALTER TABLE dictation_history ADD COLUMN cleanup_ms INTEGER;
                ALTER TABLE dictation_history ADD COLUMN paste_ms INTEGER;
                ALTER TABLE dictation_history ADD COLUMN engine TEXT;
                ALTER TABLE dictation_history ADD COLUMN model TEXT;
                INSERT INTO _migrations (name) VALUES ('add_dictation_timing');
                ",
            )?;
        }

        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let result = stmt.query_row([key], |row| row.get::<_, String>(0)).ok();
        Ok(result)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            [key, value],
        )?;
        Ok(())
    }

    pub fn insert_dictation(
        &self,
        id: &str,
        raw_text: &str,
        cleaned_text: &str,
        provider: &str,
        duration_ms: i64,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO dictation_history (id, raw_text, cleaned_text, provider, duration_ms) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![id, raw_text, cleaned_text, provider, duration_ms],
        )?;
        Ok(())
    }

    pub fn get_history(&self) -> Result<Vec<DictationEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, raw_text, cleaned_text, provider, duration_ms, created_at, audio_path FROM dictation_history ORDER BY created_at DESC",
        )?;
        let entries = stmt
            .query_map([], |row| {
                Ok(DictationEntry {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    cleaned_text: row.get(2)?,
                    provider: row.get(3)?,
                    duration_ms: row.get(4)?,
                    created_at: row.get(5)?,
                    audio_path: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(entries)
    }

    pub fn search_history(&self, query: &str) -> Result<Vec<DictationEntry>> {
        let conn = self.conn.lock().unwrap();
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, raw_text, cleaned_text, provider, duration_ms, created_at, audio_path FROM dictation_history WHERE raw_text LIKE ?1 OR cleaned_text LIKE ?1 ORDER BY created_at DESC",
        )?;
        let entries = stmt
            .query_map([&pattern], |row| {
                Ok(DictationEntry {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    cleaned_text: row.get(2)?,
                    provider: row.get(3)?,
                    duration_ms: row.get(4)?,
                    created_at: row.get(5)?,
                    audio_path: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(entries)
    }

    pub fn get_profile(&self) -> Result<Profile> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT custom_words, context_prompt, writing_style FROM profile WHERE id = 1",
        )?;
        let profile = stmt.query_row([], |row| {
            Ok(Profile {
                custom_words: row.get(0)?,
                context_prompt: row.get(1)?,
                writing_style: row.get(2)?,
            })
        })?;
        Ok(profile)
    }

    pub fn delete_dictation(&self, id: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let audio_path = conn
            .prepare("SELECT audio_path FROM dictation_history WHERE id = ?1")?
            .query_row([id], |row| row.get::<_, Option<String>>(0))
            .ok()
            .flatten();
        conn.execute("DELETE FROM dictation_history WHERE id = ?1", [id])?;
        Ok(audio_path)
    }

    pub fn update_dictation_cleaned(&self, id: &str, cleaned_text: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE dictation_history SET cleaned_text = ?1 WHERE id = ?2",
            [cleaned_text, id],
        )?;
        Ok(())
    }

    /// Record pipeline latency for a dictation. All values are milliseconds;
    /// `None` means that stage was skipped (e.g. cleanup off).
    pub fn update_dictation_timings(
        &self,
        id: &str,
        transcription_ms: Option<i64>,
        cleanup_ms: Option<i64>,
        paste_ms: Option<i64>,
        engine: Option<&str>,
        model: Option<&str>,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE dictation_history SET
                transcription_ms = COALESCE(?1, transcription_ms),
                cleanup_ms = COALESCE(?2, cleanup_ms),
                paste_ms = COALESCE(?3, paste_ms),
                engine = COALESCE(?4, engine),
                model = COALESCE(?5, model)
             WHERE id = ?6",
            rusqlite::params![
                transcription_ms,
                cleanup_ms,
                paste_ms,
                engine,
                model,
                id,
            ],
        )?;
        Ok(())
    }

    /// Aggregate p50/p95 latency from recent local history (last 100 rows
    /// with non-null transcription_ms). Used by the debug timing panel.
    pub fn timing_stats(&self) -> Result<TimingStats> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT transcription_ms, cleanup_ms, paste_ms, duration_ms
             FROM dictation_history
             WHERE transcription_ms IS NOT NULL
             ORDER BY created_at DESC
             LIMIT 100",
        )?;
        let mut transcription = Vec::new();
        let mut cleanup = Vec::new();
        let mut paste = Vec::new();
        let mut audio = Vec::new();
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, Option<i64>>(0)?,
                row.get::<_, Option<i64>>(1)?,
                row.get::<_, Option<i64>>(2)?,
                row.get::<_, Option<i64>>(3)?,
            ))
        })?;
        for row in rows {
            let (t, c, p, a) = row?;
            if let Some(v) = t {
                transcription.push(v);
            }
            if let Some(v) = c {
                cleanup.push(v);
            }
            if let Some(v) = p {
                paste.push(v);
            }
            if let Some(v) = a {
                audio.push(v);
            }
        }
        Ok(TimingStats {
            sample_count: transcription.len(),
            transcription: percentile_pair(&transcription),
            cleanup: percentile_pair(&cleanup),
            paste: percentile_pair(&paste),
            audio_duration: percentile_pair(&audio),
        })
    }

    pub fn update_dictation_audio_path(&self, id: &str, audio_path: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE dictation_history SET audio_path = ?1 WHERE id = ?2",
            [audio_path, id],
        )?;
        Ok(())
    }

    pub fn list_unmigrated_history(&self) -> Result<Vec<DictationEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, raw_text, cleaned_text, provider, duration_ms, created_at, audio_path FROM dictation_history WHERE migrated_at IS NULL ORDER BY created_at ASC",
        )?;
        let entries = stmt
            .query_map([], |row| {
                Ok(DictationEntry {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    cleaned_text: row.get(2)?,
                    provider: row.get(3)?,
                    duration_ms: row.get(4)?,
                    created_at: row.get(5)?,
                    audio_path: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(entries)
    }

    pub fn mark_dictation_migrated(&self, id: &str, migrated_at: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE dictation_history SET migrated_at = ?1 WHERE id = ?2",
            [migrated_at, id],
        )?;
        Ok(())
    }

    pub fn count_unmigrated_history(&self) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn
            .prepare("SELECT COUNT(*) FROM dictation_history WHERE migrated_at IS NULL")?
            .query_row([], |row| row.get(0))?;
        Ok(count)
    }

    pub fn count_total_history(&self) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn
            .prepare("SELECT COUNT(*) FROM dictation_history")?
            .query_row([], |row| row.get(0))?;
        Ok(count)
    }

    pub fn list_pending_audio(&self) -> Result<Vec<DictationEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, raw_text, cleaned_text, provider, duration_ms, created_at, audio_path FROM dictation_history WHERE audio_path IS NOT NULL AND audio_migrated_at IS NULL ORDER BY created_at ASC",
        )?;
        let entries = stmt
            .query_map([], |row| {
                Ok(DictationEntry {
                    id: row.get(0)?,
                    raw_text: row.get(1)?,
                    cleaned_text: row.get(2)?,
                    provider: row.get(3)?,
                    duration_ms: row.get(4)?,
                    created_at: row.get(5)?,
                    audio_path: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(entries)
    }

    pub fn count_pending_audio(&self) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn
            .prepare(
                "SELECT COUNT(*) FROM dictation_history WHERE audio_path IS NOT NULL AND audio_migrated_at IS NULL",
            )?
            .query_row([], |row| row.get(0))?;
        Ok(count)
    }

    pub fn mark_audio_migrated(&self, id: &str, migrated_at: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE dictation_history SET audio_migrated_at = ?1 WHERE id = ?2",
            [migrated_at, id],
        )?;
        Ok(())
    }

    pub fn get_audio_path(&self, id: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT audio_path FROM dictation_history WHERE id = ?1")?;
        let result = stmt
            .query_row([id], |row| row.get::<_, Option<String>>(0))
            .ok()
            .flatten();
        Ok(result)
    }

    pub fn audio_dir() -> Result<PathBuf> {
        let data_dir =
            dirs::data_dir().ok_or_else(|| anyhow::anyhow!("Could not find data directory"))?;
        Ok(data_dir.join("com.kash.parrot").join("audio"))
    }

    pub fn update_profile(
        &self,
        custom_words: &str,
        context_prompt: &str,
        writing_style: &str,
    ) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE profile SET custom_words = ?1, context_prompt = ?2, writing_style = ?3 WHERE id = 1",
            [custom_words, context_prompt, writing_style],
        )?;
        Ok(())
    }

    pub fn get_local_setup_config(&self) -> Result<LocalSetupConfig> {
        let conn = self.conn.lock().unwrap();
        // `whisper_server_port` is still in the schema for backwards
        // compatibility with v1.0 configs; we ignore it now that whisper runs
        // in-process. New writes leave it at its default.
        let mut stmt = conn.prepare(
            "SELECT whisper_model_path, ollama_server_port, ollama_model, setup_completed, setup_version FROM local_setup WHERE id = 1",
        )?;
        let config = stmt.query_row([], |row| {
            Ok(LocalSetupConfig {
                whisper_model_path: row.get(0)?,
                ollama_server_port: row.get(1)?,
                ollama_model: row.get(2)?,
                setup_completed: row.get::<_, i64>(3)? != 0,
                setup_version: row.get(4)?,
            })
        })?;
        Ok(config)
    }

    pub fn set_local_setup_config(&self, config: &LocalSetupConfig) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO local_setup (id, whisper_model_path, whisper_server_port, ollama_server_port, ollama_model, setup_completed, setup_version) VALUES (1, ?1, 0, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                config.whisper_model_path,
                config.ollama_server_port,
                config.ollama_model,
                config.setup_completed as i64,
                config.setup_version,
            ],
        )?;
        Ok(())
    }

    pub fn get_local_user(&self) -> Result<LocalUser> {
        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT name, email, onboarding_completed FROM local_user WHERE id = 1")?;
        let user = stmt.query_row([], |row| {
            Ok(LocalUser {
                name: row.get(0)?,
                email: row.get(1)?,
                onboarding_completed: row.get::<_, i64>(2)? != 0,
            })
        })?;
        Ok(user)
    }

    pub fn set_local_user(&self, user: &LocalUser) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO local_user (id, name, email, onboarding_completed) VALUES (1, ?1, ?2, ?3)",
            rusqlite::params![
                user.name,
                user.email,
                user.onboarding_completed as i64,
            ],
        )?;
        Ok(())
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct DictationEntry {
    pub id: String,
    pub raw_text: String,
    pub cleaned_text: String,
    pub provider: String,
    pub duration_ms: i64,
    pub created_at: String,
    pub audio_path: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
pub struct PercentilePair {
    pub p50: Option<i64>,
    pub p95: Option<i64>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
pub struct TimingStats {
    pub sample_count: usize,
    pub transcription: PercentilePair,
    pub cleanup: PercentilePair,
    pub paste: PercentilePair,
    pub audio_duration: PercentilePair,
}

fn percentile_pair(values: &[i64]) -> PercentilePair {
    if values.is_empty() {
        return PercentilePair::default();
    }
    let mut sorted = values.to_vec();
    sorted.sort_unstable();
    PercentilePair {
        p50: Some(percentile(&sorted, 50)),
        p95: Some(percentile(&sorted, 95)),
    }
}

fn percentile(sorted: &[i64], pct: usize) -> i64 {
    if sorted.is_empty() {
        return 0;
    }
    let idx = ((pct as f64 / 100.0) * (sorted.len() as f64 - 1.0)).round() as usize;
    sorted[idx.min(sorted.len() - 1)]
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Profile {
    pub custom_words: String,
    pub context_prompt: String,
    pub writing_style: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct LocalUser {
    pub name: String,
    pub email: String,
    pub onboarding_completed: bool,
}
