//! Cleanup LLM via llama.cpp, running in the sidecar process.
//!
//! Moved verbatim from the main app's former in-process `cleanup_engine.rs`.
//! The only differences: no Tauri / shared-state wiring, and all diagnostics go
//! to **stderr** — stdout is reserved for the JSON protocol.

use anyhow::{Context, Result};
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaChatMessage, LlamaChatTemplate, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;
use std::num::NonZeroU32;
use std::path::Path;
use std::sync::{Mutex, OnceLock};

static LLAMA_BACKEND: OnceLock<Result<LlamaBackend, String>> = OnceLock::new();

/// llama.cpp's `LLAMA_FLASH_ATTN_TYPE_DISABLED` (llama.h — 0 is the stable enum
/// value; `llama_flash_attn_type` is a transparent `c_int` alias).
///
/// Kept disabled for now: it's the proven-safe config carried over from the
/// in-process engine. Now that llama owns its ggml in this isolated process the
/// original flash-attn abort cause is gone, so this can be revisited (re-enable
/// + verify) once isolation is confirmed end-to-end.
const FLASH_ATTN_DISABLED: i32 = 0;

fn backend() -> Result<&'static LlamaBackend> {
    match LLAMA_BACKEND.get_or_init(|| {
        LlamaBackend::init().map_err(|e| format!("Failed to init llama.cpp backend: {e}"))
    }) {
        Ok(b) => Ok(b),
        Err(e) => anyhow::bail!("{e}"),
    }
}

/// Loaded cleanup model. Inference is serialised via an internal mutex
/// (dictation cleanup is one-at-a-time).
pub struct CleanupEngine {
    model: LlamaModel,
    #[allow(dead_code)]
    model_label: String,
    lock: Mutex<()>,
}

impl CleanupEngine {
    pub fn load(model_path: &Path) -> Result<Self> {
        let backend = backend()?;
        let label = model_path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| model_path.display().to_string());

        // Offload as many layers as the platform allows (Metal on macOS).
        let model_params = LlamaModelParams::default().with_n_gpu_layers(999);

        let model = LlamaModel::load_from_file(backend, model_path, &model_params)
            .with_context(|| format!("Failed to load cleanup GGUF at {}", model_path.display()))?;

        eprintln!("cleanup-sidecar: model loaded: {label}");
        Ok(Self {
            model,
            model_label: label,
            lock: Mutex::new(()),
        })
    }

    /// Run a single cleanup completion. Returns cleaned text or error.
    pub fn cleanup(
        &self,
        system_prompt: &str,
        user_message: &str,
        max_tokens: i32,
    ) -> Result<String> {
        let _guard = self
            .lock
            .lock()
            .map_err(|_| anyhow::anyhow!("cleanup engine mutex poisoned"))?;

        let backend = backend()?;

        // Prefer the template baked into the GGUF; fall back to ChatML.
        let prompt = match self.build_chat_prompt(system_prompt, user_message) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("chat template failed ({e}); using ChatML fallback");
                format_chatml(system_prompt, user_message)
            }
        };

        let tokens = self
            .model
            .str_to_token(&prompt, AddBos::Always)
            .with_context(|| "Failed to tokenize cleanup prompt")?;

        if tokens.is_empty() {
            anyhow::bail!("Cleanup prompt tokenized to empty");
        }

        let n_ctx = 2048u32;
        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(NonZeroU32::new(n_ctx))
            .with_n_threads(num_threads())
            .with_n_threads_batch(num_threads())
            .with_flash_attention_policy(FLASH_ATTN_DISABLED);

        let mut ctx = self
            .model
            .new_context(backend, ctx_params)
            .context("Failed to create llama context for cleanup")?;

        let prompt_len = tokens.len() as i32;
        let n_len = (prompt_len + max_tokens).min(n_ctx as i32);

        let mut batch = LlamaBatch::new(512, 1);
        let last = (tokens.len() - 1) as i32;
        for (i, token) in (0_i32..).zip(tokens.into_iter()) {
            batch.add(token, i, &[0], i == last)?;
        }
        ctx.decode(&mut batch)
            .context("llama_decode failed on cleanup prompt")?;

        // Greedy + low temp for deterministic cleanup (no creative rewrites).
        let mut sampler = LlamaSampler::chain_simple([
            LlamaSampler::temp(0.1),
            LlamaSampler::dist(42),
            LlamaSampler::greedy(),
        ]);

        let mut decoder = encoding_rs::UTF_8.new_decoder();
        let mut output = String::new();
        let mut n_cur = batch.n_tokens();

        while n_cur < n_len {
            let token = sampler.sample(&ctx, batch.n_tokens() - 1);
            sampler.accept(token);

            if self.model.is_eog_token(token) {
                break;
            }

            let piece = self
                .model
                .token_to_piece(token, &mut decoder, true, None)
                .unwrap_or_default();
            output.push_str(&piece);

            // Hard stop if the model starts chatting / labeling.
            if output.len() > 8000 {
                break;
            }

            batch.clear();
            batch.add(token, n_cur, &[0], true)?;
            ctx.decode(&mut batch)
                .context("llama_decode failed during cleanup generation")?;
            n_cur += 1;
        }

        Ok(sanitize_cleanup_output(&output))
    }

    fn build_chat_prompt(&self, system: &str, user: &str) -> Result<String> {
        let template = self
            .model
            .chat_template(None)
            .or_else(|_| LlamaChatTemplate::new("chatml").map_err(|e| anyhow::anyhow!("{e}")))
            .context("model has no chat template")?;
        let messages = vec![
            LlamaChatMessage::new("system".into(), system.to_string())
                .map_err(|e| anyhow::anyhow!("system message: {e}"))?,
            LlamaChatMessage::new("user".into(), user.to_string())
                .map_err(|e| anyhow::anyhow!("user message: {e}"))?,
        ];
        self.model
            .apply_chat_template(&template, &messages, true)
            .map_err(|e| anyhow::anyhow!("apply_chat_template: {e}"))
    }
}

fn format_chatml(system: &str, user: &str) -> String {
    format!(
        "<|im_start|>system\n{system}<|im_end|>\n\
         <|im_start|>user\n{user}<|im_end|>\n\
         <|im_start|>assistant\n"
    )
}

/// Strip common model flourishes (quotes, "Cleaned:" labels).
fn sanitize_cleanup_output(raw: &str) -> String {
    let mut s = raw.trim().to_string();
    for prefix in [
        "Cleaned text:",
        "Cleaned transcript:",
        "Cleaned:",
        "Here is the cleaned transcript:",
        "Here's the cleaned text:",
    ] {
        if let Some(rest) = s.strip_prefix(prefix) {
            s = rest.trim().to_string();
        }
    }
    // Strip wrapping quotes if the whole output is quoted.
    if s.len() >= 2 {
        let bytes = s.as_bytes();
        if (bytes[0] == b'"' && bytes[s.len() - 1] == b'"')
            || (bytes[0] == b'\'' && bytes[s.len() - 1] == b'\'')
        {
            s = s[1..s.len() - 1].trim().to_string();
        }
    }
    s
}

fn num_threads() -> i32 {
    std::thread::available_parallelism()
        .map(|n| n.get().min(8) as i32)
        .unwrap_or(4)
}
