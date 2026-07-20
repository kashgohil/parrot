//! Cleanup LLM sidecar.
//!
//! Usage: `cleanup-sidecar <model.gguf>`
//!
//! Protocol — newline-delimited JSON, stdout is protocol-only (all logs and
//! llama.cpp chatter go to stderr):
//!   startup  -> {"type":"ready"}              (after the model loads)
//!            -> {"type":"error","error":...}  (load failed; process exits 1)
//!   request  <- {"id":N,"system":..,"user":..,"max_tokens":N}   (one per line)
//!   response -> {"type":"result","id":N,"ok":true,"text":..}
//!            -> {"type":"result","id":N,"ok":false,"error":..}
//!
//! Requests are handled one at a time (cleanup is inherently serial). A failed
//! request returns `ok:false` and does NOT kill the sidecar; the process only
//! exits when stdin closes (parent gone) or the model fails to load.

mod engine;

use engine::CleanupEngine;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, Write};

#[derive(Deserialize)]
struct Request {
    id: u64,
    system: String,
    user: String,
    max_tokens: i32,
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
        text: Option<String>,
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
                    text: None,
                    error: Some(format!("bad request json: {e}")),
                });
                continue;
            }
        };

        let msg = match session.cleanup(&req.system, &req.user, req.max_tokens) {
            Ok(text) => Message::Result {
                id: req.id,
                ok: true,
                text: Some(text),
                error: None,
            },
            Err(e) => Message::Result {
                id: req.id,
                ok: false,
                text: None,
                error: Some(format!("{e:#}")),
            },
        };
        emit(&msg);
    }
}
