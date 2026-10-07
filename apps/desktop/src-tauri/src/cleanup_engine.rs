//! Client for the out-of-process cleanup LLM (`cleanup-sidecar`).
//!
//! The cleanup model (llama.cpp) runs in a **separate process** so its ggml is
//! not statically linked into the same binary as whisper-rs. Two ggml copies in
//! one process collide at link time (duplicate symbols) and llama ends up
//! executing whisper's ggml — the root cause of the cleanup crash. Isolating
//! llama in its own process removes the collision by construction.
//!
//! Wire protocol (newline-delimited JSON, see `cleanup-sidecar/src/main.rs`):
//!   startup  <- {"type":"ready"} | {"type":"error","error":..}
//!   request  -> {"id":N,"system":..,"user":..,"max_tokens":N}
//!   response <- {"type":"result","id":N,"ok":bool,"text"?:..,"error"?:..}

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

/// Shared handle to the cleanup sidecar client. `None` until the sidecar is up.
pub type SharedCleanupEngine =
    Arc<crate::model_lifecycle::ModelLifecycle<SidecarCleanupClient>>;

pub fn new_cleanup_engine() -> SharedCleanupEngine {
    crate::model_lifecycle::ModelLifecycle::new(|model: PathBuf| {
        SidecarCleanupClient::spawn(&resolve_sidecar_path()?, &model)
    })
}

#[derive(Serialize)]
struct Request<'a> {
    id: u64,
    system: &'a str,
    user: &'a str,
    max_tokens: i32,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum Message {
    #[serde(rename = "ready")]
    Ready,
    #[serde(rename = "error")]
    Error { error: String },
    #[serde(rename = "result")]
    Result {
        id: u64,
        ok: bool,
        text: Option<String>,
        error: Option<String>,
    },
}

/// A running sidecar process and its pipes.
struct Proc {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

/// Handle to the cleanup sidecar. `cleanup()` is safe to call from any thread;
/// the whole request/response transaction is serialised (cleanup is
/// one-at-a-time anyway), and a dead sidecar is restarted once per call.
pub struct SidecarCleanupClient {
    proc: Mutex<Proc>,
    next_id: AtomicU64,
    sidecar_path: PathBuf,
    model_path: PathBuf,
}

impl SidecarCleanupClient {
    /// Spawn the sidecar and block until it reports `ready` (model loaded).
    pub fn spawn(sidecar_path: &Path, model_path: &Path) -> Result<Self> {
        let proc = spawn_proc(sidecar_path, model_path)?;
        Ok(Self {
            proc: Mutex::new(proc),
            next_id: AtomicU64::new(1),
            sidecar_path: sidecar_path.to_path_buf(),
            model_path: model_path.to_path_buf(),
        })
    }

    /// Run a single cleanup completion via the sidecar. Same signature as the
    /// former in-process engine, so callers are unchanged.
    pub fn cleanup(&self, system: &str, user: &str, max_tokens: i32) -> Result<String> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        let mut guard = self
            .proc
            .lock()
            .map_err(|_| anyhow!("cleanup sidecar mutex poisoned"))?;

        match transact(&mut guard, id, system, user, max_tokens) {
            Ok(text) => Ok(text),
            Err(e) => {
                // Broken pipe / dead child: restart once and retry.
                eprintln!("cleanup sidecar transaction failed ({e:#}); restarting");
                *guard = spawn_proc(&self.sidecar_path, &self.model_path)
                    .context("failed to restart cleanup sidecar")?;
                transact(&mut guard, id, system, user, max_tokens)
            }
        }
    }
}

// Own the child at the protocol level: startup errors and automatic restarts
// must reap the previous process too.
impl Drop for Proc {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn spawn_proc(sidecar: &Path, model: &Path) -> Result<Proc> {
    let mut child = Command::new(sidecar)
        .arg(model)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit()) // llama logs flow to the app's stderr
        .spawn()
        .with_context(|| format!("failed to spawn cleanup sidecar at {}", sidecar.display()))?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| anyhow!("cleanup sidecar has no stdin"))?;
    let stdout = BufReader::new(
        child
            .stdout
            .take()
            .ok_or_else(|| anyhow!("cleanup sidecar has no stdout"))?,
    );
    let mut proc = Proc {
        child,
        stdin,
        stdout,
    };

    match read_message(&mut proc)? {
        Message::Ready => Ok(proc),
        Message::Error { error } => {
            let _ = proc.child.kill();
            anyhow::bail!("cleanup sidecar failed to start: {error}")
        }
        Message::Result { .. } => {
            let _ = proc.child.kill();
            anyhow::bail!("cleanup sidecar sent a result before ready")
        }
    }
}

/// Send one request and read until the matching-id result comes back.
fn transact(proc: &mut Proc, id: u64, system: &str, user: &str, max_tokens: i32) -> Result<String> {
    let req = Request {
        id,
        system,
        user,
        max_tokens,
    };
    let line = serde_json::to_string(&req)?;
    proc.stdin.write_all(line.as_bytes())?;
    proc.stdin.write_all(b"\n")?;
    proc.stdin.flush()?;

    loop {
        match read_message(proc)? {
            Message::Result {
                id: rid,
                ok,
                text,
                error,
            } if rid == id => {
                if ok {
                    return text.ok_or_else(|| anyhow!("sidecar reported ok but sent no text"));
                }
                return Err(anyhow!(
                    error.unwrap_or_else(|| "cleanup failed (no error message)".to_string())
                ));
            }
            // A result for a different id (e.g. id 0 protocol error) — skip.
            Message::Result { .. } | Message::Ready => continue,
            Message::Error { error } => anyhow::bail!("cleanup sidecar error: {error}"),
        }
    }
}

/// Read one protocol message, tolerating (and discarding) any stray non-JSON
/// line that somehow reaches stdout. Errors if the sidecar closed stdout.
fn read_message(proc: &mut Proc) -> Result<Message> {
    loop {
        let mut line = String::new();
        let n = proc
            .stdout
            .read_line(&mut line)
            .context("reading cleanup sidecar stdout")?;
        if n == 0 {
            anyhow::bail!("cleanup sidecar closed stdout (process exited)");
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(msg) = serde_json::from_str::<Message>(trimmed) {
            return Ok(msg);
        }
        // Non-protocol line on stdout — ignore and keep reading.
    }
}

/// Locate the `cleanup-sidecar` binary. Tauri's `externalBin` bundling lands it
/// next to the main executable, which is also where `cargo`/`tauri dev` put it,
/// so "beside the current exe" covers both. `PARROT_CLEANUP_SIDECAR` overrides.
pub fn resolve_sidecar_path() -> Result<PathBuf> {
    if let Ok(p) = std::env::var("PARROT_CLEANUP_SIDECAR") {
        let p = PathBuf::from(p);
        if p.exists() {
            return Ok(p);
        }
    }
    let exe = std::env::current_exe().context("current_exe() failed")?;
    let dir = exe
        .parent()
        .ok_or_else(|| anyhow!("current exe has no parent directory"))?;
    let name = if cfg!(windows) {
        "cleanup-sidecar.exe"
    } else {
        "cleanup-sidecar"
    };
    let candidate = dir.join(name);
    if candidate.exists() {
        return Ok(candidate);
    }
    anyhow::bail!(
        "cleanup sidecar binary not found (looked for {} next to {})",
        name,
        exe.display()
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(unix)]
    #[test]
    fn startup_error_kills_and_reaps_child() {
        use std::os::unix::fs::PermissionsExt;
        let dir =
            std::env::temp_dir().join(format!("parrot-cleanup-startup-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&dir).unwrap();
        let script = dir.join("sidecar");
        let pid_file = dir.join("pid");
        std::fs::write(&script, "#!/bin/sh\necho $$ > \"$1\"\nprintf '%s\\n' '{\"type\":\"error\",\"error\":\"invalid model\"}'\nexec sleep 30\n").unwrap();
        std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o700)).unwrap();
        assert!(SidecarCleanupClient::spawn(&script, &pid_file).is_err());
        let pid = std::fs::read_to_string(&pid_file).unwrap();
        assert!(!std::process::Command::new("ps")
            .args(["-p", pid.trim(), "-o", "pid="])
            .output()
            .unwrap()
            .status
            .success());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[tokio::test]
    #[ignore = "needs PARROT_CLEANUP_SIDECAR + PARROT_TEST_CLEANUP_MODEL"]
    async fn real_sidecar_demand_idle_release_and_reload() {
        let owner = new_cleanup_engine();
        owner.configure(
            Some(std::env::var("PARROT_TEST_CLEANUP_MODEL").unwrap().into()),
            Some(std::time::Duration::from_secs(1)),
        );
        assert_eq!(owner.status().state, "unloaded");
        let start = std::time::Instant::now();
        let (first, second) = tokio::join!(owner.acquire(), owner.acquire());
        let first = first.unwrap();
        let second = second.unwrap();
        eprintln!("cold load: {:?}", start.elapsed());
        assert!(Arc::ptr_eq(&first.client, &second.client));
        let pid = first.client.proc.lock().unwrap().child.id();
        let raw = "Bonjour, je voudrais réserver une table pour demain soir.";
        let cleaned = crate::cleanup::cleanup_text(
            raw,
            None,
            "",
            "",
            "",
            crate::cleanup::Formality::Neutral,
            "builtin",
            Some(first.client.clone()),
        )
        .await
        .unwrap();
        assert!(cleaned.to_lowercase().contains("réserver"));
        assert!(
            !owner.release_if_idle(std::time::Instant::now() + std::time::Duration::from_secs(2))
        );
        drop(first);
        drop(second);
        assert!(
            owner.release_if_idle(std::time::Instant::now() + std::time::Duration::from_secs(2))
        );
        assert!(!std::process::Command::new("ps")
            .args(["-p", &pid.to_string(), "-o", "pid="])
            .output()
            .unwrap()
            .status
            .success());
        let next = owner.acquire().await.unwrap();
        assert_ne!(pid, next.client.proc.lock().unwrap().child.id());
        drop(next);
        owner.configure(None, None);
        assert!(!owner.is_loaded());
    }

    /// End-to-end round-trip through a spawned sidecar, exercising the real
    /// client: spawn + `ready` handshake, request/response id correlation, and
    /// process reuse across calls. `#[ignore]`d — needs local binaries:
    ///   PARROT_CLEANUP_SIDECAR    = path to the built `cleanup-sidecar`
    ///   PARROT_TEST_CLEANUP_MODEL = path to the cleanup GGUF
    #[test]
    #[ignore = "needs PARROT_CLEANUP_SIDECAR + PARROT_TEST_CLEANUP_MODEL"]
    fn sidecar_round_trip() {
        let sidecar = std::env::var("PARROT_CLEANUP_SIDECAR")
            .expect("set PARROT_CLEANUP_SIDECAR to the built cleanup-sidecar binary");
        let model = std::env::var("PARROT_TEST_CLEANUP_MODEL")
            .expect("set PARROT_TEST_CLEANUP_MODEL to the cleanup GGUF");

        let client = SidecarCleanupClient::spawn(Path::new(&sidecar), Path::new(&model))
            .expect("spawn cleanup sidecar");

        const SYS: &str = "You are a transcript cleanup tool. Output only the cleaned text.";

        // Two sequential requests: proves id correlation and process reuse.
        let out1 = client
            .cleanup(
                SYS,
                "um so like i think we should uh ship it on friday you know",
                128,
            )
            .expect("first cleanup");
        assert!(!out1.trim().is_empty(), "first cleanup returned empty");

        let out2 = client
            .cleanup(SYS, "the the meeting is at three pm tomorrow", 128)
            .expect("second cleanup");
        assert!(!out2.trim().is_empty(), "second cleanup returned empty");

        eprintln!("sidecar round-trip ok:\n  in : um so like i think ...\n  out: {out1:?}\n  out: {out2:?}");
    }
}
