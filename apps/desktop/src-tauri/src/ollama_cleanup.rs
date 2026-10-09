//! Residency for the optional Ollama backend. Never stop the daemon or enumerate
//! other models: only release model/port pairs used by this owner.
use anyhow::{bail, Context, Result};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant};

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct Policy {
    pub model: Option<String>,
    pub idle: Option<Duration>,
}

impl Policy {
    pub fn from_database(db: &crate::db::Database) -> Self {
        let memory = crate::memory_policy::MemoryPolicy::from_database(db);
        let enabled = crate::resolve_cleanup_backend(db) == "ollama"
            && !memory.skip_cleanup
            && db.get_setting("cleanup_mode").ok().flatten().as_deref() != Some("off");
        Self {
            model: enabled.then(|| selected_model(db)),
            idle: memory.cleanup_idle,
        }
    }

    fn keep_alive(&self) -> i64 {
        self.idle.map(|d| d.as_secs() as i64).unwrap_or(-1)
    }
}

fn selected_model(db: &crate::db::Database) -> String {
    db.get_setting("llm_model")
        .ok()
        .flatten()
        .filter(|s| !s.trim().is_empty())
        .or_else(|| {
            db.get_local_setup_config()
                .ok()
                .map(|c| c.ollama_model)
                .filter(|s| !s.is_empty() && !s.ends_with(".gguf"))
        })
        .unwrap_or_else(|| "llama3.2".into())
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct Target {
    port: u16,
    model: String,
}

struct Used {
    finished: Instant,
    retry_after: Instant,
}

struct State {
    policy: Policy,
    used: HashMap<Target, Used>,
}

pub(crate) struct OllamaCleanup {
    state: Mutex<State>,
    // Covers the entire HTTP transaction, including response consumption and
    // any release. A cancelled caller does not drop the owned transaction.
    transaction: tokio::sync::Mutex<()>,
    client: reqwest::Client,
    monitoring: AtomicBool,
}

#[derive(Clone)]
pub(crate) struct Session {
    pub owner: Arc<OllamaCleanup>,
    pub port: u16,
}

impl OllamaCleanup {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            state: Mutex::new(State {
                policy: Policy {
                    model: None,
                    idle: Some(Duration::from_secs(60)),
                },
                used: HashMap::new(),
            }),
            transaction: tokio::sync::Mutex::new(()),
            client: reqwest::Client::new(),
            monitoring: AtomicBool::new(false),
        })
    }

    /// Configuration never sends a load request. The monitor releases previously
    /// used targets after disable, model/backend switches, or a shorter timeout.
    pub fn configure(&self, policy: Policy) {
        self.state.lock().unwrap().policy = policy;
    }

    pub async fn chat(self: &Arc<Self>, port: u16, body: Value) -> Result<Value> {
        let owner = self.clone();
        // Capture the selected model so queued work cannot silently use a new
        // selection. Recheck enablement and derive keep_alive after taking the gate.
        let model = self.state.lock().unwrap().policy.model.clone();
        tokio::spawn(async move {
            let _gate = owner.transaction.lock().await;
            let policy = owner.state.lock().unwrap().policy.clone();
            if model.is_none() || model != policy.model {
                bail!("Ollama cleanup is disabled or changed");
            }
            let target = Target {
                port,
                model: model.unwrap(),
            };
            let mut body = body;
            body["model"] = json!(target.model);
            body["keep_alive"] = json!(policy.keep_alive());
            let result = owner
                .post(&target, "chat", &body, Duration::from_secs(180))
                .await;
            let now = Instant::now();
            owner.state.lock().unwrap().used.insert(
                target,
                Used {
                    finished: now,
                    retry_after: now,
                },
            );
            owner.release_due(now).await;
            result
        })
        .await
        .context("Ollama cleanup task failed")?
    }

    async fn post(
        &self,
        target: &Target,
        endpoint: &str,
        body: &Value,
        timeout: Duration,
    ) -> Result<Value> {
        Ok(self
            .client
            .post(format!("http://127.0.0.1:{}/api/{endpoint}", target.port))
            .json(body)
            .timeout(timeout)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?)
    }

    /// Caller holds the transaction gate. Only successful releases forget a
    /// target; failures retry with a delay instead of losing an indefinite pin.
    async fn release_due(&self, now: Instant) {
        let targets: Vec<_> = {
            let state = self.state.lock().unwrap();
            state
                .used
                .iter()
                .filter(|(target, used)| {
                    now >= used.retry_after
                        && (state.policy.model.as_ref() != Some(&target.model)
                            || state.policy.idle.is_some_and(|idle| {
                                now.saturating_duration_since(used.finished) >= idle
                            }))
                })
                .map(|(target, _)| target.clone())
                .collect()
        };
        for target in targets {
            let body = json!({"model": target.model, "keep_alive": 0, "stream": false});
            match self
                .post(&target, "generate", &body, Duration::from_secs(5))
                .await
            {
                Ok(response) if response["done"] == true && response["done_reason"] == "unload" => {
                    self.state.lock().unwrap().used.remove(&target);
                }
                result => {
                    eprintln!(
                        "Ollama cleanup release failed for {}: {result:?}",
                        target.model
                    );
                    if let Some(used) = self.state.lock().unwrap().used.get_mut(&target) {
                        used.retry_after = Instant::now() + Duration::from_secs(5);
                    }
                }
            }
        }
    }

    pub async fn release_if_idle(&self, now: Instant) {
        if let Ok(_gate) = self.transaction.try_lock() {
            self.release_due(now).await;
        }
    }

    pub fn start_idle_monitor(self: &Arc<Self>) {
        if self.monitoring.swap(true, Ordering::Relaxed) {
            return;
        }
        let weak = Arc::downgrade(self);
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(1)).await;
                let Some(owner) = weak.upgrade() else {
                    break;
                };
                owner.release_if_idle(Instant::now()).await;
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saved_policy_and_disabled_modes_do_not_load_or_overwrite_preferences() {
        let db = crate::db::Database::in_memory().unwrap();
        db.set_setting("cleanup_backend", "ollama").unwrap();
        assert_eq!(Policy::from_database(&db).keep_alive(), 60);
        for (setting, expected) in [
            ("0", -1),
            ("30", 30),
            ("300", 300),
            ("86400", 86400),
            ("bad", 60),
            ("86401", 60),
        ] {
            db.set_setting("cleanup_idle_seconds", setting).unwrap();
            assert_eq!(Policy::from_database(&db).keep_alive(), expected);
        }
        db.set_setting("llm_model", "custom:latest").unwrap();
        assert_eq!(
            Policy::from_database(&db).model.as_deref(),
            Some("custom:latest")
        );
        db.set_setting("low_memory_mode", "true").unwrap();
        assert_eq!(Policy::from_database(&db).model, None);
        assert_eq!(
            db.get_setting("cleanup_idle_seconds").unwrap().as_deref(),
            Some("86401")
        );
        db.set_setting("low_memory_mode", "false").unwrap();
        db.set_setting("cleanup_mode", "off").unwrap();
        assert_eq!(Policy::from_database(&db).model, None);
        db.set_setting("cleanup_mode", "blocking").unwrap();
        db.set_setting("cleanup_backend", "builtin").unwrap();
        assert_eq!(Policy::from_database(&db).model, None);
        assert_eq!(OllamaCleanup::new().state.lock().unwrap().used.len(), 0);
    }

    #[test]
    fn model_resolution_uses_legacy_setup_but_not_builtin_gguf() {
        let db = crate::db::Database::in_memory().unwrap();
        let mut config = db.get_local_setup_config().unwrap();
        config.ollama_model = "qwen2.5:0.5b".into();
        db.set_local_setup_config(&config).unwrap();
        assert_eq!(selected_model(&db), "qwen2.5:0.5b");
        config.ollama_model = "qwen2.5-0.5b-instruct-q4_k_m.gguf".into();
        db.set_local_setup_config(&config).unwrap();
        assert_eq!(selected_model(&db), "llama3.2");
    }
}
