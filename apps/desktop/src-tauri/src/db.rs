use anyhow::Result;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

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
            ",
        )?;
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
            "SELECT id, raw_text, cleaned_text, provider, duration_ms, created_at FROM dictation_history ORDER BY created_at DESC",
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
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(entries)
    }

    pub fn search_history(&self, query: &str) -> Result<Vec<DictationEntry>> {
        let conn = self.conn.lock().unwrap();
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, raw_text, cleaned_text, provider, duration_ms, created_at FROM dictation_history WHERE raw_text LIKE ?1 OR cleaned_text LIKE ?1 ORDER BY created_at DESC",
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

    pub fn update_dictation_cleaned(&self, id: &str, cleaned_text: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE dictation_history SET cleaned_text = ?1 WHERE id = ?2",
            [cleaned_text, id],
        )?;
        Ok(())
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
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct DictationEntry {
    pub id: String,
    pub raw_text: String,
    pub cleaned_text: String,
    pub provider: String,
    pub duration_ms: i64,
    pub created_at: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Profile {
    pub custom_words: String,
    pub context_prompt: String,
    pub writing_style: String,
}
