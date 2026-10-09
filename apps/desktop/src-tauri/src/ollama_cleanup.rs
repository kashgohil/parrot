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

pub(crate) fn selected_model(db: &crate::db::Database) -> String {
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

    pub async fn shutdown(&self) {
        self.state.lock().unwrap().policy.model = None;
        let _ = tokio::time::timeout(Duration::from_secs(5), async {
            let _gate = self.transaction.lock().await;
            self.release_due(Instant::now()).await;
        })
        .await;
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
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    struct Request {
        path: String,
        body: Value,
        reply: tokio::sync::oneshot::Sender<(u16, Value)>,
    }

    struct Server {
        port: u16,
        requests: tokio::sync::mpsc::UnboundedReceiver<Request>,
        task: tokio::task::JoinHandle<()>,
    }

    impl Drop for Server {
        fn drop(&mut self) {
            self.task.abort();
        }
    }

    impl Server {
        async fn new() -> Self {
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let port = listener.local_addr().unwrap().port();
            let (tx, requests) = tokio::sync::mpsc::unbounded_channel();
            let task = tokio::spawn(async move {
                while let Ok((mut socket, _)) = listener.accept().await {
                    let tx = tx.clone();
                    tokio::spawn(async move {
                        let mut bytes = Vec::new();
                        let (headers, start, length) = loop {
                            let mut chunk = [0u8; 1024];
                            let n = socket.read(&mut chunk).await.unwrap();
                            assert!(n > 0);
                            bytes.extend_from_slice(&chunk[..n]);
                            if let Some(end) = bytes.windows(4).position(|w| w == b"\r\n\r\n") {
                                let headers = String::from_utf8(bytes[..end].to_vec()).unwrap();
                                let length: usize = headers
                                    .lines()
                                    .find_map(|line| {
                                        let (key, value) = line.split_once(':')?;
                                        key.eq_ignore_ascii_case("content-length")
                                            .then(|| value.trim().parse().unwrap())
                                    })
                                    .unwrap();
                                break (headers, end + 4, length);
                            }
                        };
                        while bytes.len() < start + length {
                            let mut chunk = [0u8; 1024];
                            let n = socket.read(&mut chunk).await.unwrap();
                            assert!(n > 0);
                            bytes.extend_from_slice(&chunk[..n]);
                        }
                        let body = serde_json::from_slice(&bytes[start..start + length]).unwrap();
                        let path = headers.split_whitespace().nth(1).unwrap().to_owned();
                        let (reply, rx) = tokio::sync::oneshot::channel();
                        if tx.send(Request { path, body, reply }).is_err() {
                            return;
                        }
                        let Ok((status, response)) = rx.await else {
                            return;
                        };
                        let text = response.to_string();
                        let response = format!("HTTP/1.1 {status} Test\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{text}", text.len());
                        socket.write_all(response.as_bytes()).await.unwrap();
                    });
                }
            });
            Self {
                port,
                requests,
                task,
            }
        }

        async fn next(&mut self) -> Request {
            tokio::time::timeout(Duration::from_secs(2), self.requests.recv())
                .await
                .unwrap()
                .unwrap()
        }
    }

    fn policy(model: Option<&str>, seconds: Option<u64>) -> Policy {
        Policy {
            model: model.map(str::to_owned),
            idle: seconds.map(Duration::from_secs),
        }
    }

    async fn complete(owner: &Arc<OllamaCleanup>, server: &mut Server, keep_alive: i64) {
        let task = tokio::spawn({
            let owner = owner.clone();
            let port = server.port;
            async move {
                owner
                    .chat(port, json!({"messages": [], "stream": false}))
                    .await
            }
        });
        let request = server.next().await;
        assert_eq!(request.path, "/api/chat");
        assert_eq!(request.body["model"], "parrot:latest");
        assert_eq!(request.body["keep_alive"], keep_alive);
        request.reply.send((200, json!({"done": true}))).unwrap();
        task.await.unwrap().unwrap();
    }

    async fn release(owner: &Arc<OllamaCleanup>, server: &mut Server, now: Instant, status: u16) {
        let task = tokio::spawn({
            let owner = owner.clone();
            async move { owner.release_if_idle(now).await }
        });
        let request = server.next().await;
        assert_eq!(request.path, "/api/generate");
        assert_eq!(
            request.body,
            json!({"model": "parrot:latest", "keep_alive": 0, "stream": false})
        );
        request
            .reply
            .send((status, json!({"done": true, "done_reason": "unload"})))
            .unwrap();
        task.await.unwrap();
    }

    #[tokio::test]
    async fn demand_idle_and_keep_warm_only_release_the_used_model_on_its_port() {
        let mut server = Server::new().await;
        let owner = OllamaCleanup::new();
        assert!(owner.chat(server.port, json!({})).await.is_err());
        owner.configure(policy(Some("parrot:latest"), Some(60)));
        owner
            .release_if_idle(Instant::now() + Duration::from_secs(3600))
            .await;
        assert!(server.requests.try_recv().is_err());
        complete(&owner, &mut server, 60).await;
        owner.release_if_idle(Instant::now()).await;
        assert!(server.requests.try_recv().is_err());
        release(
            &owner,
            &mut server,
            Instant::now() + Duration::from_secs(61),
            200,
        )
        .await;
        owner.configure(policy(Some("parrot:latest"), None));
        complete(&owner, &mut server, -1).await;
        owner
            .release_if_idle(Instant::now() + Duration::from_secs(86400))
            .await;
        assert!(server.requests.try_recv().is_err());
        owner.configure(policy(None, Some(30)));
        release(&owner, &mut server, Instant::now(), 200).await;
        assert!(owner.state.lock().unwrap().used.is_empty());
    }

    #[tokio::test]
    async fn cancelled_caller_keeps_active_request_owned_until_completion_and_disable_release() {
        let mut server = Server::new().await;
        let owner = OllamaCleanup::new();
        owner.configure(policy(Some("parrot:latest"), None));
        let caller = tokio::spawn({
            let owner = owner.clone();
            let port = server.port;
            async move { owner.chat(port, json!({})).await }
        });
        let request = server.next().await;
        caller.abort();
        let _ = caller.await;
        owner.configure(policy(None, Some(30)));
        owner
            .release_if_idle(Instant::now() + Duration::from_secs(86400))
            .await;
        assert!(server.requests.try_recv().is_err());
        request.reply.send((200, json!({"done": true}))).unwrap();
        let unload = server.next().await;
        assert_eq!(unload.body["model"], "parrot:latest");
        assert_eq!(unload.body["keep_alive"], 0);
        unload
            .reply
            .send((200, json!({"done": true, "done_reason": "unload"})))
            .unwrap();
        // Taking the gate proves that the detached transaction has finished.
        let _gate = owner.transaction.lock().await;
        assert!(owner.state.lock().unwrap().used.is_empty());
    }

    #[tokio::test]
    async fn shorter_policy_switch_and_failed_unload_preserve_targets_for_retry() {
        let mut server = Server::new().await;
        let owner = OllamaCleanup::new();
        owner.configure(policy(Some("parrot:latest"), None));
        complete(&owner, &mut server, -1).await;
        owner.configure(policy(Some("parrot:latest"), Some(30)));
        release(
            &owner,
            &mut server,
            Instant::now() + Duration::from_secs(31),
            500,
        )
        .await;
        assert_eq!(owner.state.lock().unwrap().used.len(), 1);
        owner.release_if_idle(Instant::now()).await;
        assert!(server.requests.try_recv().is_err());
        // A model switch retires the old target; only its original port is used.
        owner.configure(policy(Some("replacement:latest"), None));
        release(
            &owner,
            &mut server,
            Instant::now() + Duration::from_secs(6),
            200,
        )
        .await;
        assert!(owner.state.lock().unwrap().used.is_empty());
    }

    #[tokio::test]
    async fn queued_disabled_work_is_rejected_before_sending_any_request() {
        let mut server = Server::new().await;
        let owner = OllamaCleanup::new();
        owner.configure(policy(Some("parrot:latest"), None));
        let gate = owner.transaction.lock().await;
        let caller = tokio::spawn({
            let owner = owner.clone();
            let port = server.port;
            async move { owner.chat(port, json!({})).await }
        });
        tokio::task::yield_now().await;
        owner.configure(policy(None, Some(30)));
        drop(gate);
        assert!(caller.await.unwrap().is_err());
        assert!(server.requests.try_recv().is_err());
        assert!(owner.state.lock().unwrap().used.is_empty());
    }

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

    #[tokio::test]
    async fn production_cleanup_uses_residency_owner_and_existing_fidelity_guard() {
        let mut server = Server::new().await;
        let owner = OllamaCleanup::new();
        owner.configure(policy(Some("parrot:latest"), Some(300)));
        let source = "Priya did not approve the payment today.";
        let task = tokio::spawn({
            let owner = owner.clone();
            let port = server.port;
            async move {
                crate::cleanup::cleanup_text(
                    source,
                    Some(Session { owner, port }),
                    "",
                    "",
                    "",
                    crate::cleanup::Formality::Neutral,
                    "ollama",
                    None,
                )
                .await
            }
        });
        let request = server.next().await;
        assert_eq!(request.body["model"], "parrot:latest");
        assert_eq!(request.body["keep_alive"], 300);
        assert_eq!(request.body["options"]["temperature"], json!(0.1f32));
        request.reply.send((200, json!({"message": {"role": "assistant", "content": "Priya approved the payment today."}, "done": true, "done_reason": "stop"}))).unwrap();
        assert_eq!(task.await.unwrap().unwrap(), source);
    }

    #[tokio::test]
    #[ignore = "requires an owned isolated Ollama daemon, PARROT_TEST_OLLAMA_PORT, MODEL and UNRELATED_MODEL"]
    async fn real_ollama_demand_idle_keep_warm_and_targeted_release() {
        let port: u16 = std::env::var("PARROT_TEST_OLLAMA_PORT")
            .unwrap()
            .parse()
            .unwrap();
        assert_ne!(
            port, 11434,
            "Never run this workload on the user's default daemon"
        );
        let model = std::env::var("PARROT_TEST_OLLAMA_MODEL").unwrap();
        let unrelated = std::env::var("PARROT_TEST_OLLAMA_UNRELATED_MODEL").unwrap();
        assert_ne!(model, unrelated);
        let idle = std::env::var("PARROT_TEST_OLLAMA_IDLE_SECONDS").unwrap_or_else(|_| "2".into());
        let idle_seconds: u64 = idle.parse().unwrap();
        let client = reqwest::Client::new();
        let base = format!("http://127.0.0.1:{port}");
        async fn resident(client: &reqwest::Client, base: &str) -> Value {
            client
                .get(format!("{base}/api/ps"))
                .send()
                .await
                .unwrap()
                .error_for_status()
                .unwrap()
                .json()
                .await
                .unwrap()
        }
        async fn event(client: &reqwest::Client, base: &str, phase: &str, latency: Option<f64>) {
            eprintln!(
                "OLLAMA_EVENT {}",
                json!({"phase": phase, "latency_ms": latency,
                "resident": resident(client, base).await})
            );
        }
        async fn clean(
            owner: &Arc<OllamaCleanup>,
            port: u16,
            phase: &str,
            client: &reqwest::Client,
            base: &str,
        ) {
            event(client, base, phase, None).await;
            let started = Instant::now();
            let source = "Priya did not approve the payment of 25 rupees today.";
            let output = crate::cleanup::cleanup_text(
                source,
                Some(Session {
                    owner: owner.clone(),
                    port,
                }),
                "",
                "",
                "",
                crate::cleanup::Formality::Neutral,
                "ollama",
                None,
            )
            .await
            .unwrap();
            assert_eq!(
                crate::cleanup::cleanup_candidate(&output, source)
                    .to_lowercase()
                    .trim_end_matches('.'),
                source.to_lowercase().trim_end_matches('.')
            );
            event(
                client,
                base,
                &format!("{phase}_done"),
                Some(started.elapsed().as_secs_f64() * 1000.0),
            )
            .await;
        }
        fn has(value: &Value, name: &str) -> bool {
            value["models"]
                .as_array()
                .unwrap()
                .iter()
                .any(|v| v["name"] == name)
        }
        assert_eq!(resident(&client, &base).await["models"], json!([]));
        let db = crate::db::Database::in_memory().unwrap();
        db.set_setting("cleanup_backend", "ollama").unwrap();
        db.set_setting("llm_model", &model).unwrap();
        db.set_setting("cleanup_idle_seconds", &idle).unwrap();
        let owner = OllamaCleanup::new();
        owner.configure(Policy::from_database(&db));
        owner.start_idle_monitor();
        crate::local_setup::test_cleanup(port, &model)
            .await
            .unwrap();
        assert_eq!(resident(&client, &base).await["models"], json!([]));
        event(&client, &base, "demand_start", None).await;
        tokio::time::sleep(Duration::from_millis(1200)).await;
        clean(&owner, port, "cold", &client, &base).await;
        clean(&owner, port, "warm", &client, &base).await;
        assert!(has(&resident(&client, &base).await, &model));
        event(&client, &base, "resident_idle_wait", None).await;
        let wait_start = Instant::now();
        loop {
            owner.release_if_idle(Instant::now()).await;
            if !has(&resident(&client, &base).await, &model) {
                break;
            }
            assert!(wait_start.elapsed() < Duration::from_secs(idle_seconds + 10));
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        event(
            &client,
            &base,
            "idle_released",
            Some(wait_start.elapsed().as_secs_f64() * 1000.0),
        )
        .await;
        tokio::time::sleep(Duration::from_millis(1200)).await;
        clean(&owner, port, "reload", &client, &base).await;
        db.set_setting("cleanup_idle_seconds", "0").unwrap();
        owner.configure(Policy::from_database(&db));
        clean(&owner, port, "keep_warm", &client, &base).await;
        // The accelerated runs exceed the prior timeout; the 60-second run
        // samples keep-warm briefly rather than repeating another long idle.
        tokio::time::sleep(Duration::from_secs(if idle_seconds < 5 {
            idle_seconds + 1
        } else {
            3
        }))
        .await;
        assert!(has(&resident(&client, &base).await, &model));
        event(&client, &base, "keep_warm_retained", None).await;
        client
            .post(format!("{base}/api/generate"))
            .json(&json!({"model": unrelated, "keep_alive": -1, "stream": false}))
            .send()
            .await
            .unwrap()
            .error_for_status()
            .unwrap();
        let both = resident(&client, &base).await;
        assert!(has(&both, &model) && has(&both, &unrelated));
        event(&client, &base, "unrelated_loaded", None).await;
        for (key, value, phase) in [
            ("cleanup_mode", "off", "disabled"),
            ("low_memory_mode", "true", "low_memory"),
            ("cleanup_backend", "builtin", "switched_builtin"),
        ] {
            db.set_setting(key, value).unwrap();
            owner.configure(Policy::from_database(&db));
            // Ollama acknowledges the unload before its scheduler removes the
            // runner from /api/ps. Validate eventual release, not an atomic view.
            let started = Instant::now();
            loop {
                owner.release_if_idle(Instant::now()).await;
                let remaining = resident(&client, &base).await;
                assert!(has(&remaining, &unrelated));
                if !has(&remaining, &model) {
                    break;
                }
                assert!(started.elapsed() < Duration::from_secs(10));
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
            assert!(owner.chat(port, json!({"messages": []})).await.is_err());
            assert!(client
                .get(format!("{base}/api/tags"))
                .send()
                .await
                .unwrap()
                .status()
                .is_success());
            event(
                &client,
                &base,
                phase,
                Some(started.elapsed().as_secs_f64() * 1000.0),
            )
            .await;
            tokio::time::sleep(Duration::from_millis(1200)).await;
            if phase != "switched_builtin" {
                db.set_setting(
                    key,
                    if key == "cleanup_mode" {
                        "blocking"
                    } else {
                        "false"
                    },
                )
                .unwrap();
                owner.configure(Policy::from_database(&db));
                clean(&owner, port, &format!("{phase}_reload"), &client, &base).await;
            }
        }
        owner.shutdown().await;
        assert!(has(&resident(&client, &base).await, &unrelated));
        event(&client, &base, "complete", None).await;
    }
}
