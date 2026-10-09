//! Client for the out-of-process cleanup LLM (`cleanup-sidecar`).
//!
//! The cleanup model (llama.cpp) runs in a **separate process** so its ggml is
//! not statically linked into the same binary as whisper-rs. Two ggml copies in
//! one process collide at link time (duplicate symbols) and llama ends up
//! executing whisper's ggml — the root cause of the cleanup crash. Isolating
//! llama in its own process removes the collision by construction.
//!
//! Wire protocol (newline-delimited JSON, see `cleanup-sidecar/src/main.rs`):
//!   startup  <- {"type":"ready","protocol_version":2} | {"type":"error","error":..}
//!   request  -> {"id":N,"system":..,"user":..,"max_tokens":N}
//!            -> {"id":N,"system":..,"hints":..,"transcript":..}
//!   response <- {"type":"result","id":N,"ok":bool,"completion"?:..,"error"?:..}

#[path = "cleanup_protocol.rs"]
pub mod protocol;
use anyhow::{anyhow, Context, Result};
use protocol::Completion;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

/// Shared handle to the cleanup sidecar client. `None` until the sidecar is up.
pub type SharedCleanupEngine = Arc<crate::model_lifecycle::ModelLifecycle<SidecarCleanupClient>>;

pub fn new_cleanup_engine() -> SharedCleanupEngine {
    crate::model_lifecycle::ModelLifecycle::new(|model: PathBuf| {
        SidecarCleanupClient::spawn(&resolve_sidecar_path()?, &model)
    })
}

#[derive(Serialize)]
struct Request<'a> {
    id: u64,
    system: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    user: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    transcript: Option<&'a str>,
    hints: &'a str,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum Message {
    #[serde(rename = "ready")]
    Ready {
        #[serde(default)]
        protocol_version: u32,
    },
    #[serde(rename = "error")]
    Error { error: String },
    #[serde(rename = "result")]
    Result {
        id: u64,
        ok: bool,
        completion: Option<Completion>,
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

    /// A bounded single completion, used by model diagnostics and smoke tests.
    pub fn cleanup(&self, system: &str, user: &str, max_tokens: i32) -> Result<Completion> {
        self.request(system, "", None, Some(user), Some(max_tokens))
    }

    pub fn cleanup_transcript(
        &self,
        system: &str,
        hints: &str,
        transcript: &str,
    ) -> Result<Completion> {
        self.request(system, hints, Some(transcript), None, None)
    }

    fn request(
        &self,
        system: &str,
        hints: &str,
        transcript: Option<&str>,
        user: Option<&str>,
        max_tokens: Option<i32>,
    ) -> Result<Completion> {
        let request = Request {
            id: self.next_id.fetch_add(1, Ordering::Relaxed),
            system,
            hints,
            transcript,
            user,
            max_tokens,
        };
        let mut guard = self
            .proc
            .lock()
            .map_err(|_| anyhow!("cleanup sidecar mutex poisoned"))?;
        match transact(&mut guard, &request) {
            Ok(completion) => Ok(completion),
            Err(error) => {
                eprintln!("cleanup sidecar transaction failed ({error:#}); restarting");
                *guard = spawn_proc(&self.sidecar_path, &self.model_path)
                    .context("failed to restart cleanup sidecar")?;
                transact(&mut guard, &request)
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
        Message::Ready { protocol_version } if protocol_version == protocol::PROTOCOL_VERSION => {
            Ok(proc)
        }
        Message::Ready { protocol_version } => anyhow::bail!(
            "cleanup sidecar protocol {protocol_version} is incompatible; expected {}",
            protocol::PROTOCOL_VERSION
        ),
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
fn transact(proc: &mut Proc, request: &Request<'_>) -> Result<Completion> {
    let line = serde_json::to_string(request)?;
    proc.stdin.write_all(line.as_bytes())?;
    proc.stdin.write_all(b"\n")?;
    proc.stdin.flush()?;

    loop {
        match read_message(proc)? {
            Message::Result {
                id: rid,
                ok,
                completion,
                error,
            } if rid == request.id => {
                if ok {
                    let completion =
                        completion.ok_or_else(|| anyhow!("sidecar sent no completion status"))?;
                    if let Some(input) = request.transcript {
                        validate_completion(&completion, input)?;
                    }
                    return Ok(completion);
                }
                return Err(anyhow!(
                    error.unwrap_or_else(|| "cleanup failed (no error message)".to_string())
                ));
            }
            // A result for a different id (e.g. id 0 protocol error) — skip.
            Message::Result { .. } | Message::Ready { .. } => continue,
            Message::Error { error } => anyhow::bail!("cleanup sidecar error: {error}"),
        }
    }
}

fn validate_completion(completion: &Completion, input: &str) -> Result<()> {
    let mut end = 0;
    for segment in &completion.segments {
        anyhow::ensure!(
            segment.start_byte == end
                && segment.end_byte > end
                && segment.end_byte <= input.len()
                && input.is_char_boundary(end)
                && input.is_char_boundary(segment.end_byte),
            "cleanup sidecar returned invalid segment coverage"
        );
        anyhow::ensure!(
            segment.output_budget > 0
                && segment.prompt_tokens < segment.context_tokens
                && segment.output_budget <= segment.context_tokens - segment.prompt_tokens
                && segment.generated_tokens <= segment.output_budget,
            "cleanup sidecar returned invalid token reservation"
        );
        end = segment.end_byte;
    }
    anyhow::ensure!(
        !completion.complete || completion.is_complete(),
        "cleanup sidecar returned inconsistent completion status"
    );
    anyhow::ensure!(
        !completion.is_complete() || end == input.len(),
        "cleanup sidecar omitted transcript segments"
    );
    anyhow::ensure!(
        completion.is_complete() || completion.text.is_empty(),
        "cleanup sidecar returned partial text as usable output"
    );
    Ok(())
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
        if let Some(msg) = parse_message(trimmed)? {
            return Ok(msg);
        }
        // Non-protocol line on stdout — ignore and keep reading.
    }
}

fn parse_message(line: &str) -> Result<Option<Message>> {
    match serde_json::from_str::<Message>(line) {
        Ok(message) => Ok(Some(message)),
        Err(error) => {
            if serde_json::from_str::<serde_json::Value>(line)
                .ok()
                .is_some_and(|value| value.get("type").is_some())
            {
                // A broken protocol response must fail immediately. Discarding
                // it as a log line would wait forever for an already-sent result.
                return Err(error).context("invalid cleanup sidecar protocol message");
            }
            Ok(None)
        }
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

    #[test]
    fn malformed_completion_is_an_error_instead_of_a_discarded_log() {
        assert!(parse_message("llama model diagnostic").unwrap().is_none());
        assert!(parse_message(
            r#"{"type":"result","id":1,"ok":true,"completion":{"text":"partial","complete":false}}"#
        )
        .is_err());
        assert!(parse_message(r#"{"type":"ready","protocol_version":2}"#)
            .unwrap()
            .is_some());
    }

    #[cfg(unix)]
    #[test]
    fn incompatible_worker_is_reaped_before_any_request_can_stall() {
        use std::os::unix::fs::PermissionsExt;
        let dir =
            std::env::temp_dir().join(format!("parrot-cleanup-protocol-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&dir).unwrap();
        let script = dir.join("sidecar");
        let pid_file = dir.join("pid");
        std::fs::write(
            &script,
            "#!/bin/sh\necho $$ > \"$1\"\nprintf '%s\\n' '{\"type\":\"ready\"}'\nexec sleep 30\n",
        )
        .unwrap();
        std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o700)).unwrap();
        let error = SidecarCleanupClient::spawn(&script, &pid_file)
            .err()
            .unwrap();
        assert!(error.to_string().contains("incompatible"));
        let pid = std::fs::read_to_string(&pid_file).unwrap();
        assert!(!std::process::Command::new("ps")
            .args(["-p", pid.trim(), "-o", "pid="])
            .output()
            .unwrap()
            .status
            .success());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[ignore = "needs PARROT_CLEANUP_SIDECAR + PARROT_TEST_CLEANUP_MODEL"]
    fn limits_keep_the_same_worker_and_next_transcript_succeeds() {
        let sidecar = std::env::var("PARROT_CLEANUP_SIDECAR").unwrap();
        let model = std::env::var("PARROT_TEST_CLEANUP_MODEL").unwrap();
        let client = SidecarCleanupClient::spawn(Path::new(&sidecar), Path::new(&model)).unwrap();
        let pid = client.proc.lock().unwrap().child.id();
        let short = client
            .cleanup(
                "Copy exactly. Output only the transcript.",
                "Priya did not approve invoice 25 on Friday.",
                1,
            )
            .unwrap();
        assert_eq!(short.finish_reason, protocol::FinishReason::TokenLimit);
        assert!(!short.is_complete() && short.text.is_empty());
        assert_eq!(client.proc.lock().unwrap().child.id(), pid);
        let input = "Priya did not approve invoice 25 on Friday.";
        let (system, hints) =
            crate::cleanup::build_prompt_parts("", "", "", crate::cleanup::Formality::Neutral);
        let complete = client.cleanup_transcript(&system, &hints, input).unwrap();
        assert!(complete.is_complete());
        assert_eq!(client.proc.lock().unwrap().child.id(), pid);
        let text = crate::cleanup::finalize_completion(
            &complete,
            input,
            crate::cleanup::Formality::Neutral,
            "",
        );
        assert!(text.contains("25") && text.contains("not"));
    }

    #[test]
    fn transcript_response_requires_full_ordered_coverage_and_token_reservation() {
        let valid = serde_json::json!({"text":"हिंदी", "complete":true, "finish_reason":"end_of_generation", "segments":[{
            "start_byte":0,"end_byte":"हिंदी".len(),"prompt_tokens":300,"context_tokens":2048,
            "input_tokens":5,"output_budget":72,"generated_tokens":5,"reused_tokens":0,"decoded_tokens":300,
            "prefill_ms":1,"generation_ms":1,"complete":true,"finish_reason":"end_of_generation","text":"हिंदी"
        }]});
        let wire = serde_json::json!({"type":"result", "id":1,"ok":true,"completion":valid});
        assert!(matches!(
            parse_message(&wire.to_string()).unwrap(),
            Some(Message::Result {
                completion: Some(_),
                ..
            })
        ));
        assert!(
            validate_completion(&serde_json::from_value(valid.clone()).unwrap(), "हिंदी").is_ok()
        );
        for (field, value) in [
            ("start_byte", 1),
            ("end_byte", 1),
            ("prompt_tokens", 2040),
            ("output_budget", 0),
            ("generated_tokens", 73),
        ] {
            let mut invalid = valid.clone();
            invalid["segments"][0][field] = serde_json::json!(value);
            assert!(
                validate_completion(&serde_json::from_value(invalid).unwrap(), "हिंदी").is_err(),
                "{field}"
            );
        }
        let mut omitted = valid.clone();
        omitted["segments"] = serde_json::json!([]);
        assert!(validate_completion(&serde_json::from_value(omitted).unwrap(), "हिंदी").is_err());
        let mut inconsistent = valid;
        inconsistent["segments"][0]["finish_reason"] = serde_json::json!("token_limit");
        assert!(
            validate_completion(&serde_json::from_value(inconsistent).unwrap(), "हिंदी").is_err()
        );
    }

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
        assert!(!out1.text.trim().is_empty(), "first cleanup returned empty");

        let out2 = client
            .cleanup(SYS, "the the meeting is at three pm tomorrow", 128)
            .expect("second cleanup");
        assert!(
            !out2.text.trim().is_empty(),
            "second cleanup returned empty"
        );

        eprintln!("sidecar round-trip ok:\n  in : um so like i think ...\n  out: {out1:?}\n  out: {out2:?}");
    }
}
