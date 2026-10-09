//! Cleanup LLM sidecar.
//!
//! Usage: `cleanup-sidecar <model.gguf>`
//!
//! Protocol — newline-delimited JSON, stdout is protocol-only (all logs and
//! llama.cpp chatter go to stderr):
//!   startup  -> {"type":"ready"}              (after the model loads)
//!            -> {"type":"error","error":...}  (load failed; process exits 1)
//!   request  <- {"id":N,"system":..,"user":..,"max_tokens":N}   (one per line)
//!            <- {"id":N,"system":..,"hints":..,"transcript":..} (app path)
//!   response -> {"type":"result","id":N,"ok":true,"completion":..}
//!            -> {"type":"result","id":N,"ok":false,"error":..}
//!
//! Requests are handled one at a time (cleanup is inherently serial). A failed
//! request returns `ok:false` and does NOT kill the sidecar; the process only
//! exits when stdin closes (parent gone) or the model fails to load.
//! `ok` means the request was handled. Only completion.complete=true with an
//! end_of_generation finish reason permits accepting its text.

mod engine;
#[path = "../../src/cleanup_protocol.rs"]
mod protocol;
use protocol::Completion;

use engine::CleanupEngine;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, Write};

#[derive(Deserialize)]
struct Request {
    id: u64,
    system: String,
    user: Option<String>,
    max_tokens: Option<i32>,
    transcript: Option<String>,
    #[serde(default)]
    hints: String,
}

#[derive(Serialize)]
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
        #[serde(skip_serializing_if = "Option::is_none")]
        completion: Option<Completion>,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
    },
}

/// Write one protocol message as a single JSON line to stdout and flush.
fn emit(msg: &Message) {
    // stdout is locked per-call; the loop is single-threaded so this is fine.
    let mut out = std::io::stdout().lock();
    if let Ok(line) = serde_json::to_string(msg) {
        let _ = writeln!(out, "{line}");
        let _ = out.flush();
    }
}

fn main() {
    let model_path = match std::env::args().nth(1) {
        Some(p) => p,
        None => {
            emit(&Message::Error {
                error: "usage: cleanup-sidecar <model.gguf>".to_string(),
            });
            std::process::exit(1);
        }
    };

    let engine = match CleanupEngine::load(std::path::Path::new(&model_path)) {
        Ok(e) => e,
        Err(e) => {
            emit(&Message::Error {
                error: format!("failed to load cleanup model: {e:#}"),
            });
            std::process::exit(1);
        }
    };

    // Open the warm inference session (allocates the reusable context) before
    // signalling readiness, so the first request doesn't pay for it.
    let mut session = match engine.new_session() {
        Ok(s) => s,
        Err(e) => {
            emit(&Message::Error {
                error: format!("failed to start cleanup session: {e:#}"),
            });
            std::process::exit(1);
        }
    };

    // Signal readiness only after the model and session are fully initialised.
    emit(&Message::Ready);

    let stdin = std::io::stdin();
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break, // stdin broken — parent gone
        };
        if line.trim().is_empty() {
            continue;
        }

        let req: Request = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                // Can't attribute to an id; report a generic protocol error.
                emit(&Message::Result {
                    id: 0,
                    ok: false,
                    completion: None,
                    error: Some(format!("bad request json: {e}")),
                });
                continue;
            }
        };

        let outcome = match (&req.transcript, &req.user, req.max_tokens) {
            (Some(input), None, None) => session.cleanup_transcript(&req.system, &req.hints, input),
            (None, Some(user), Some(max_tokens)) => session.cleanup(&req.system, user, max_tokens),
            _ => Err(anyhow::anyhow!(
                "request needs transcript or user/max_tokens, exclusively"
            )),
        };
        let msg = match outcome {
            Ok(completion) => Message::Result {
                id: req.id,
                ok: true,
                completion: Some(completion),
                error: None,
            },
            Err(e) => Message::Result {
                id: req.id,
                ok: false,
                completion: None,
                error: Some(format!("{e:#}")),
            },
        };
        emit(&msg);
    }
}
