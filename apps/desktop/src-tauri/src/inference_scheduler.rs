//! One speech job at a time. Previews never queue ahead of final work.
use anyhow::{Context, Result};
use std::{
    future::Future,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
};
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

pub struct InferenceScheduler {
    gate: Arc<Semaphore>,
    waiting_final: Arc<AtomicUsize>,
}

struct FinalTicket(Arc<AtomicUsize>);
impl Drop for FinalTicket {
    fn drop(&mut self) {
        self.0.fetch_sub(1, Ordering::SeqCst);
    }
}

impl InferenceScheduler {
    pub fn new() -> Self {
        Self {
            gate: Arc::new(Semaphore::new(1)),
            waiting_final: Arc::new(AtomicUsize::new(0)),
        }
    }

    pub async fn exclusive(&self) -> Result<OwnedSemaphorePermit> {
        self.waiting_final.fetch_add(1, Ordering::SeqCst);
        let ticket = FinalTicket(self.waiting_final.clone());
        let permit = self
            .gate
            .clone()
            .acquire_owned()
            .await
            .context("speech scheduler closed")?;
        drop(ticket);
        Ok(permit)
    }

    /// The owned task keeps the permit and model lease alive if its caller is
    /// cancelled while native inference still runs.
    pub async fn final_job<F, T>(self: &Arc<Self>, job: F) -> Result<T>
    where
        F: Future<Output = Result<T>> + Send + 'static,
        T: Send + 'static,
    {
        // Announce final demand before spawning so a preview on another
        // runtime thread cannot sneak in while this task is being scheduled.
        self.waiting_final.fetch_add(1, Ordering::SeqCst);
        let ticket = FinalTicket(self.waiting_final.clone());
        let scheduler = self.clone();
        tauri::async_runtime::spawn(async move {
            let _permit = scheduler
                .gate
                .clone()
                .acquire_owned()
                .await
                .context("speech scheduler closed")?;
            drop(ticket);
            job.await
        })
        .await
        .context("speech job task failed")?
    }

    pub async fn preview_job<F, T>(self: &Arc<Self>, job: F) -> Result<Option<T>>
    where
        F: Future<Output = Result<T>> + Send + 'static,
        T: Send + 'static,
    {
        if self.waiting_final.load(Ordering::SeqCst) != 0 {
            return Ok(None);
        }
        let Ok(permit) = self.gate.clone().try_acquire_owned() else {
            return Ok(None);
        };
        tauri::async_runtime::spawn(async move {
            let _permit = permit;
            job.await.map(Some)
        })
        .await
        .context("speech preview task failed")?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::oneshot;

    #[tokio::test]
    async fn final_waiters_take_priority_and_previews_never_queue() {
        let scheduler = Arc::new(InferenceScheduler::new());
        let active = scheduler.exclusive().await.unwrap();
        let (started_tx, started_rx) = oneshot::channel();
        let (done_tx, done_rx) = oneshot::channel();
        let final_job = {
            let scheduler = scheduler.clone();
            tokio::spawn(async move {
                scheduler
                    .final_job(async move {
                        started_tx.send(()).unwrap();
                        done_rx.await.unwrap();
                        Ok(())
                    })
                    .await
            })
        };
        while scheduler.waiting_final.load(Ordering::SeqCst) == 0 {
            tokio::task::yield_now().await;
        }
        assert!(scheduler
            .preview_job(async {
                panic!("obsolete preview ran");
                #[allow(unreachable_code)]
                Ok(())
            })
            .await
            .unwrap()
            .is_none());
        drop(active);
        started_rx.await.unwrap();
        assert!(scheduler
            .preview_job(async { Ok(()) })
            .await
            .unwrap()
            .is_none());
        done_tx.send(()).unwrap();
        final_job.await.unwrap().unwrap();
        assert_eq!(
            scheduler.preview_job(async { Ok(42) }).await.unwrap(),
            Some(42)
        );
    }

    #[tokio::test]
    async fn cancelled_caller_does_not_release_an_active_job_permit_or_resource() {
        let scheduler = Arc::new(InferenceScheduler::new());
        let resource = Arc::new(());
        let owned = resource.clone();
        let (started_tx, started_rx) = oneshot::channel();
        let (done_tx, done_rx) = oneshot::channel();
        let caller = {
            let scheduler = scheduler.clone();
            tokio::spawn(async move {
                scheduler
                    .final_job(async move {
                        let _owned = owned;
                        started_tx.send(()).unwrap();
                        done_rx.await.unwrap();
                        Ok(())
                    })
                    .await
            })
        };
        started_rx.await.unwrap();
        caller.abort();
        assert_eq!(Arc::strong_count(&resource), 2);
        assert!(scheduler
            .preview_job(async { Ok(()) })
            .await
            .unwrap()
            .is_none());
        done_tx.send(()).unwrap();
        let permit = scheduler.exclusive().await.unwrap();
        assert_eq!(Arc::strong_count(&resource), 1);
        drop(permit);
    }
}
