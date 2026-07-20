//! Cleanup LLM via llama.cpp, running in the sidecar process.
//!
//! Moved verbatim from the main app's former in-process `cleanup_engine.rs`.
//! The only differences: no Tauri / shared-state wiring, and all diagnostics go
//! to **stderr** — stdout is reserved for the JSON protocol.

use anyhow::{Context, Result};
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::context::LlamaContext;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaChatMessage, LlamaChatTemplate, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;
use llama_cpp_2::token::LlamaToken;
use std::num::NonZeroU32;
use std::path::Path;
use std::sync::OnceLock;
use std::time::Instant;

static LLAMA_BACKEND: OnceLock<Result<LlamaBackend, String>> = OnceLock::new();

/// llama.cpp `llama_flash_attn_type` values (llama.h — `llama_flash_attn_type`
/// is a transparent `c_int` alias): AUTO = -1, DISABLED = 0, ENABLED = 1.
///
/// AUTO lets llama.cpp turn flash attention on where the backend supports it
/// (Metal does) and fall back otherwise. It was previously forced DISABLED to
/// dodge a ggml symbol collision with whisper-rs; now that llama owns its own
/// ggml in this isolated sidecar process, that abort cause is gone and we let
/// llama pick the fast path. (Force ENABLED = 1 if profiling shows AUTO isn't
/// engaging flash attention.)
const FLASH_ATTN_AUTO: i32 = -1;

/// Context window for the persistent cleanup context. Dictations are short, so
/// 2048 comfortably holds the system prompt + transcript + generated output.
const N_CTX: u32 = 2048;

/// Max tokens submitted to a single `decode` call — matches the batch capacity.
const DECODE_BATCH: usize = 512;

fn backend() -> Result<&'static LlamaBackend> {
    match LLAMA_BACKEND.get_or_init(|| {
        LlamaBackend::init().map_err(|e| format!("Failed to init llama.cpp backend: {e}"))
    }) {
        Ok(b) => Ok(b),
        Err(e) => anyhow::bail!("{e}"),
    }
}

/// Loaded cleanup model. Owns the GGUF weights for the process lifetime; open a
/// [`CleanupSession`] to run inference against it.
pub struct CleanupEngine {
    model: LlamaModel,
    #[allow(dead_code)]
    model_label: String,
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
        })
    }

    /// Open a warm inference session that keeps one llama context alive and
    /// reuses the system-prompt KV prefix across requests. The session borrows
    /// the model, so both must outlive it — in the sidecar they are siblings in
    /// `main` and drop (context first, then model) before process teardown,
    /// which keeps ggml's Metal device destructor happy.
    pub fn new_session(&self) -> Result<CleanupSession<'_>> {
        let backend = backend()?;
        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(NonZeroU32::new(N_CTX))
            .with_n_threads(num_threads())
            .with_n_threads_batch(num_threads())
            .with_flash_attention_policy(FLASH_ATTN_AUTO);
        let ctx = self
            .model
            .new_context(backend, ctx_params)
            .context("Failed to create persistent cleanup context")?;
        Ok(CleanupSession {
            model: &self.model,
            ctx,
            cached_prompt: Vec::new(),
        })
    }
}

/// Warm inference session: one llama context reused across every dictation.
/// Keeping the context alive avoids reallocating the KV/compute buffers per
/// request, and retaining the prompt tokens lets us reuse the system-prompt KV
/// prefix (see [`CleanupSession::cleanup`]). Requests are inherently serial, so
/// `cleanup` takes `&mut self` and no locking is needed.
pub struct CleanupSession<'a> {
    model: &'a LlamaModel,
    ctx: LlamaContext<'a>,
    /// Prompt tokens currently held in the KV cache at positions
    /// `0..cached_prompt.len()`. Empty until the first cleanup.
    cached_prompt: Vec<LlamaToken>,
}

impl CleanupSession<'_> {
    /// Run a single cleanup completion. Returns cleaned text or error.
    ///
    /// Reuses the longest shared prefix of the previous prompt's KV cache.
    /// Because the system prompt is identical across dictations (until the user
    /// changes vocab/context/style/formality), only the transcript tail is
    /// re-decoded — the ~1k-token system prompt is prefilled once and then
    /// reused, and shrinks automatically when settings change (the shared prefix
    /// simply gets shorter).
    pub fn cleanup(
        &mut self,
        system_prompt: &str,
        user_message: &str,
        max_tokens: i32,
    ) -> Result<String> {
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

        let prompt_len = tokens.len() as i32;
        let n_len = (prompt_len + max_tokens).min(N_CTX as i32);

        // Keep the KV prefix shared with the previous prompt; re-decode at least
        // the final token so we have fresh logits to sample from.
        let reused = common_prefix_len(&self.cached_prompt, &tokens);
        let start = reused.min(tokens.len() - 1);

        // Drop everything from `start` onward: the divergent tail plus the
        // previous request's generated tokens.
        self.ctx
            .clear_kv_cache_seq(Some(0), Some(start as u32), None)
            .context("failed to trim cleanup KV cache")?;

        // Prefill tokens[start..] at absolute positions, logits only on the last
        // prompt token. Chunked by batch capacity so long prompts stay safe.
        let prefill_start = Instant::now();
        let last = tokens.len() - 1;
        let mut batch = LlamaBatch::new(DECODE_BATCH, 1);
        let mut pos = start;
        while pos < tokens.len() {
            let end = (pos + DECODE_BATCH).min(tokens.len());
            batch.clear();
            for i in pos..end {
                batch.add(tokens[i], i as i32, &[0], i == last)?;
            }
            self.ctx
                .decode(&mut batch)
                .context("llama_decode failed on cleanup prompt")?;
            pos = end;
        }
        let prefill_ms = prefill_start.elapsed().as_millis();
        let decoded = tokens.len() - start;

        // KV now holds exactly [0, prompt_len) — record it for the next request.
        self.cached_prompt = tokens;

        // Greedy + low temp for deterministic cleanup (no creative rewrites).
        let mut sampler = LlamaSampler::chain_simple([
            LlamaSampler::temp(0.1),
            LlamaSampler::dist(42),
            LlamaSampler::greedy(),
        ]);

        let gen_start = Instant::now();
        let mut decoder = encoding_rs::UTF_8.new_decoder();
        let mut output = String::new();
        let mut n_cur = prompt_len;
        // First sample reads the last prompt token's logits in the final prefill
        // chunk; every generation step after decodes a single-token batch.
        let mut sample_idx = batch.n_tokens() - 1;

        while n_cur < n_len {
            let token = sampler.sample(&self.ctx, sample_idx);
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
            self.ctx
                .decode(&mut batch)
                .context("llama_decode failed during cleanup generation")?;
            sample_idx = 0;
            n_cur += 1;
        }
        let gen_ms = gen_start.elapsed().as_millis();
        let gen_tokens = n_cur - prompt_len;

        eprintln!(
            "cleanup-sidecar: prompt_tok={prompt_len} reused={reused} decoded={decoded} \
             prefill={prefill_ms}ms gen_tok={gen_tokens} gen={gen_ms}ms"
        );

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

/// Length of the shared leading run of two token slices — how much of the
/// previous prompt's KV cache the current prompt can reuse.
fn common_prefix_len(a: &[LlamaToken], b: &[LlamaToken]) -> usize {
    a.iter().zip(b).take_while(|(x, y)| x == y).count()
}

fn num_threads() -> i32 {
    std::thread::available_parallelism()
        .map(|n| n.get().min(8) as i32)
        .unwrap_or(4)
}
