//! Demand loading and ownership shared by speech and isolated models.
use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex, Weak},
    time::{Duration, Instant},
};
use tokio::sync::watch;

type LoadResult = std::result::Result<(), String>;
type Loader<T, K> = dyn Fn(K) -> Result<T> + Send + Sync;

pub struct ModelLifecycle<T, K = PathBuf> {
    inner: Mutex<Inner<T, K>>,
    loader: Arc<Loader<T, K>>,
}

struct Inner<T, K> {
    model: Option<K>,
    generation: u64,
    client: Option<Arc<T>>,
    loading: Option<watch::Receiver<Option<LoadResult>>>,
    error: Option<String>,
    last_used: Instant,
    idle_timeout: Option<Duration>,
}

#[derive(Serialize)]
pub struct ModelStatus {
    pub state: &'static str,
    pub error: Option<String>,
    pub idle_seconds: Option<u64>,
}

/// A job owns its resource even if Settings selects another model.
pub struct ModelLease<T, K = PathBuf> {
    pub client: Arc<T>,
    owner: Weak<ModelLifecycle<T, K>>,
    generation: u64,
}

impl<T, K> Drop for ModelLease<T, K> {
    fn drop(&mut self) {
        if let Some(owner) = self.owner.upgrade() {
            let mut inner = owner.inner.lock().unwrap();
            if inner.generation == self.generation {
                inner.last_used = Instant::now();
            }
        }
    }
}

impl<T: Send + Sync + 'static, K: Clone + PartialEq + Send + 'static> ModelLifecycle<T, K> {
    pub fn new(loader: impl Fn(K) -> Result<T> + Send + Sync + 'static) -> Arc<Self> {
        Arc::new(Self {
            inner: Mutex::new(Inner {
                model: None,
                generation: 0,
                client: None,
                loading: None,
                error: None,
                last_used: Instant::now(),
                idle_timeout: Some(Duration::from_secs(60)),
            }),
            loader: Arc::new(loader),
        })
    }

    /// Configure without loading. Invalidating an in-flight load cannot publish
    /// its obsolete result; existing jobs keep their own handles until done.
    pub fn configure(&self, model: Option<K>, idle_timeout: Option<Duration>) {
        let retired = {
            let mut inner = self.inner.lock().unwrap();
            inner.idle_timeout = idle_timeout;
            if inner.model == model {
                return;
            }
            inner.model = model;
            inner.generation += 1;
            inner.loading = None;
            inner.error = None;
            inner.client.take()
        };
        drop(retired); // Never kill/wait while holding the coordinator lock.
    }

    pub fn status(&self) -> ModelStatus {
        let inner = self.inner.lock().unwrap();
        ModelStatus {
            state: if inner.loading.is_some() {
                "loading"
            } else if inner
                .client
                .as_ref()
                .is_some_and(|c| Arc::strong_count(c) > 1)
            {
                "in_use"
            } else if inner.client.is_some() {
                "ready"
            } else if inner.error.is_some() {
                "failed"
            } else {
                "unloaded"
            },
            error: inner.error.clone(),
            idle_seconds: inner.idle_timeout.map(|d| d.as_secs()),
        }
    }

    pub fn is_loaded(&self) -> bool {
        self.inner.lock().unwrap().client.is_some()
    }

    pub async fn acquire(self: &Arc<Self>) -> Result<ModelLease<T, K>> {
        let generation = self.inner.lock().unwrap().generation;
        loop {
            let mut receiver = {
                let mut inner = self.inner.lock().unwrap();
                if generation != inner.generation {
                    return Err(anyhow!("model selection changed"));
                }
                if let Some(client) = inner.client.clone() {
                    inner.last_used = Instant::now();
                    return Ok(ModelLease {
                        client,
                        owner: Arc::downgrade(self),
                        generation,
                    });
                }
                if let Some(receiver) = &inner.loading {
                    receiver.clone()
                } else {
                    let model = inner
                        .model
                        .clone()
                        .ok_or_else(|| anyhow!("model is not configured"))?;
                    let (sender, receiver) = watch::channel(None);
                    inner.loading = Some(receiver.clone());
                    inner.error = None;
                    let owner = self.clone();
                    // This task survives cancellation of any one caller.
                    tauri::async_runtime::spawn(async move {
                        let loader = owner.loader.clone();
                        let loaded = tokio::task::spawn_blocking(move || loader(model))
                            .await
                            .map_err(|e| format!("model load task failed: {e}"))
                            .and_then(|r| r.map(Arc::new).map_err(|e| format!("{e:#}")));
                        let outcome = {
                            let mut inner = owner.inner.lock().unwrap();
                            if inner.generation != generation {
                                Err("model selection changed during load".to_string())
                            } else {
                                inner.loading = None;
                                match &loaded {
                                    Ok(client) => {
                                        inner.client = Some(client.clone());
                                        inner.last_used = Instant::now();
                                        Ok(())
                                    }
                                    Err(error) => {
                                        inner.error = Some(error.clone());
                                        Err(error.clone())
                                    }
                                }
                            }
                        };
                        drop(loaded); // Reap obsolete resources outside the lock.
                        let _ = sender.send(Some(outcome));
                    });
                    receiver
                }
            };
            loop {
                if let Some(outcome) = receiver.borrow().clone() {
                    outcome.map_err(|e| anyhow!(e))?;
                    break;
                }
                receiver
                    .changed()
                    .await
                    .map_err(|_| anyhow!("model load task ended without a result"))?;
            }
        }
    }

    pub async fn acquire_with_timeout(
        self: &Arc<Self>,
        timeout: Duration,
    ) -> Result<ModelLease<T, K>> {
        tokio::time::timeout(timeout, self.acquire())
            .await
            .context("Model loading timed out; the background load may still finish")?
    }

    pub fn release_if_idle(&self, now: Instant) -> bool {
        let retired = {
            let mut inner = self.inner.lock().unwrap();
            if inner
                .client
                .as_ref()
                .is_some_and(|c| Arc::strong_count(c) > 1)
            {
                // Also protects a blocking inference that outlives a cancelled async job.
                inner.last_used = now;
                return false;
            }
            if !inner
                .idle_timeout
                .is_some_and(|d| now.saturating_duration_since(inner.last_used) >= d)
            {
                return false;
            }
            inner.client.take()
        };
        let released = retired.is_some();
        drop(retired);
        released
    }

    /// Release a warm model without changing its selection. Active work wins.
    pub fn release_unused(&self) -> bool {
        let retired = {
            let mut inner = self.inner.lock().unwrap();
            if inner.loading.is_some()
                || inner
                    .client
                    .as_ref()
                    .is_some_and(|c| Arc::strong_count(c) > 1)
            {
                return false;
            }
            inner.client.take()
        };
        let released = retired.is_some();
        drop(retired);
        released
    }

    pub fn start_idle_monitor(self: &Arc<Self>) {
        let owner = Arc::downgrade(self);
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(1)).await;
                let Some(owner) = owner.upgrade() else {
                    return;
                };
                // Native resources and child processes must drop on a blocking worker.
                let _ = tokio::task::spawn_blocking(move || owner.release_if_idle(Instant::now()))
                    .await;
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[tokio::test]
    async fn a_load_timeout_does_not_cancel_or_duplicate_the_native_load() {
        let (resume_tx, resume_rx) = std::sync::mpsc::channel();
        let receiver = Mutex::new(resume_rx);
        let owner = ModelLifecycle::<_, PathBuf>::new(move |_| {
            receiver.lock().unwrap().recv().unwrap();
            Ok(())
        });
        owner.configure(Some("model".into()), None);
        assert!(owner
            .acquire_with_timeout(Duration::from_millis(1))
            .await
            .is_err());
        assert_eq!(owner.status().state, "loading");
        resume_tx.send(()).unwrap();
        drop(owner.acquire().await.unwrap());
        assert!(owner.is_loaded());
    }

    #[tokio::test]
    async fn sequential_release_respects_active_owners_even_with_keep_warm_policy() {
        let owner = ModelLifecycle::<_, PathBuf>::new(|_| Ok(()));
        owner.configure(Some("model".into()), None);
        let active = owner.acquire().await.unwrap();
        assert!(!owner.release_unused());
        drop(active);
        assert!(owner.release_unused());
        assert!(!owner.is_loaded());
        drop(owner.acquire().await.unwrap());
        assert!(owner.is_loaded());
    }

    #[tokio::test]
    async fn idle_policy_change_preserves_pending_load_and_active_job() {
        let (started_tx, started_rx) = std::sync::mpsc::channel();
        let (resume_tx, resume_rx) = std::sync::mpsc::channel();
        let resume = Mutex::new(resume_rx);
        let owner = ModelLifecycle::new(move |p: PathBuf| {
            started_tx.send(()).unwrap();
            resume.lock().unwrap().recv().unwrap();
            Ok(p)
        });
        owner.configure(Some("same-model".into()), None);
        let loading = {
            let owner = owner.clone();
            tokio::spawn(async move { owner.acquire().await })
        };
        tokio::task::spawn_blocking(move || started_rx.recv().unwrap())
            .await
            .unwrap();
        owner.configure(Some("same-model".into()), Some(Duration::from_secs(30)));
        resume_tx.send(()).unwrap();
        let active = loading.await.unwrap().unwrap();
        assert_eq!(*active.client, PathBuf::from("same-model"));
        assert!(!owner.release_if_idle(Instant::now() + Duration::from_secs(60)));
        owner.configure(Some("same-model".into()), None);
        assert_eq!(owner.status().state, "in_use");
        drop(active);
        assert!(owner.is_loaded());
        owner.configure(Some("same-model".into()), Some(Duration::from_secs(30)));
        assert!(owner.release_if_idle(Instant::now() + Duration::from_secs(60)));
    }

    #[tokio::test]
    async fn concurrent_loads_reuse_and_idle_waits_for_final_owner() {
        let loads = Arc::new(AtomicUsize::new(0));
        let count = loads.clone();
        let owner = ModelLifecycle::<_, PathBuf>::new(move |_| {
            count.fetch_add(1, Ordering::SeqCst);
            std::thread::sleep(Duration::from_millis(30));
            Ok(())
        });
        owner.configure(Some("model".into()), Some(Duration::from_secs(1)));
        assert_eq!(owner.status().state, "unloaded");
        let (a, b) = tokio::join!(owner.acquire(), owner.acquire());
        let a = a.unwrap();
        let b = b.unwrap();
        assert!(Arc::ptr_eq(&a.client, &b.client));
        assert_eq!(loads.load(Ordering::SeqCst), 1);
        assert_eq!(owner.status().state, "in_use");
        assert!(!owner.release_if_idle(Instant::now() + Duration::from_secs(2)));
        drop(a);
        drop(b);
        assert_eq!(owner.status().state, "ready");
        assert!(!owner.release_if_idle(Instant::now()));
        assert!(owner.release_if_idle(Instant::now() + Duration::from_secs(2)));
        assert_eq!(owner.status().state, "unloaded");
        drop(owner.acquire().await.unwrap());
        assert_eq!(loads.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn model_switch_rejects_stale_load_and_keeps_active_resource_alive() {
        let (started_tx, started_rx) = std::sync::mpsc::channel();
        let (resume_tx, resume_rx) = std::sync::mpsc::channel();
        let resume = Mutex::new(resume_rx);
        let owner = ModelLifecycle::new(move |p: PathBuf| {
            if p == PathBuf::from("old") {
                started_tx.send(()).unwrap();
                resume.lock().unwrap().recv().unwrap();
            }
            Ok(p)
        });
        owner.configure(Some("old".into()), None);
        let task = {
            let owner = owner.clone();
            tokio::spawn(async move { owner.acquire().await })
        };
        tokio::task::spawn_blocking(move || started_rx.recv().unwrap())
            .await
            .unwrap();
        owner.configure(Some("new".into()), None);
        let active = owner.acquire().await.unwrap();
        resume_tx.send(()).unwrap();
        assert!(task.await.unwrap().is_err());
        assert_eq!(*active.client, PathBuf::from("new"));
        owner.configure(None, None);
        assert!(!owner.is_loaded());
        assert_eq!(*active.client, PathBuf::from("new"));
        assert!(owner.acquire().await.is_err());
    }

    #[tokio::test]
    async fn cancelled_waiter_does_not_cancel_load_and_failures_are_retryable() {
        let attempts = Arc::new(AtomicUsize::new(0));
        let count = attempts.clone();
        let owner = ModelLifecycle::<_, PathBuf>::new(move |_| {
            let n = count.fetch_add(1, Ordering::SeqCst);
            if n == 0 {
                anyhow::bail!("invalid model");
            }
            std::thread::sleep(Duration::from_millis(50));
            Ok(())
        });
        owner.configure(Some("model".into()), None);
        assert!(owner.acquire().await.is_err());
        assert_eq!(owner.status().state, "failed");
        let task = {
            let owner = owner.clone();
            tokio::spawn(async move { owner.acquire().await })
        };
        tokio::time::sleep(Duration::from_millis(10)).await;
        task.abort();
        drop(owner.acquire().await.unwrap());
        assert_eq!(attempts.load(Ordering::SeqCst), 2);
        assert_eq!(owner.status().state, "ready");
        assert!(!owner.release_if_idle(Instant::now() + Duration::from_secs(3600)));
    }
}
