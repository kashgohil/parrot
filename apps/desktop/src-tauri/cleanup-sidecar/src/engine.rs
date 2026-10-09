//! Cleanup LLM via llama.cpp, running in the sidecar process.
//!
//! No Tauri or shared app state. Diagnostics go to stderr; stdout carries the
//! JSON protocol. A fixed context processes token-measured transcript segments.

use crate::protocol::{Completion, FinishReason, Segment};
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

/// Fixed cleanup context. Long transcripts are processed in measured segments.
const N_CTX: u32 = 2048;

/// Max tokens submitted to a single `decode` call — matches the batch capacity.
const DECODE_BATCH: usize = 512;
const MAX_SEGMENT_BYTES: usize = 4096;
const MAX_HINT_TOKENS: usize = 256;
const MAX_OUTPUT_BYTES: usize = 8000;

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
    /// re-decoded — the shared system prefix is prefilled once and then
    /// reused, and shrinks automatically when settings change (the shared prefix
    /// simply gets shorter).
    pub fn cleanup(
        &mut self,
        system_prompt: &str,
        user_message: &str,
        max_tokens: i32,
    ) -> Result<Completion> {
        let tokens = self.prompt_tokens(system_prompt, user_message)?;
        self.generate(tokens, max_tokens, MAX_OUTPUT_BYTES)
    }

    /// Tokenize the complete template and reserve output from transcript tokens,
    /// independent of whitespace. Never remove transcript characters to fit.
    pub fn cleanup_transcript(
        &mut self,
        system: &str,
        hints: &str,
        input: &str,
    ) -> Result<Completion> {
        let (hints, hints_truncated) = self.bounded_hints(hints)?;
        let system = format!("{system}{hints}");
        let mut result = Completion {
            text: String::new(),
            complete: true,
            finish_reason: FinishReason::EndOfGeneration,
            segments: Vec::new(),
            hints_truncated,
        };
        if input.is_empty() {
            return Ok(result);
        }
        let mut start = 0;
        while start < input.len() {
            let remaining = &input[start..];
            let ends: Vec<usize> = remaining
                .char_indices()
                .map(|(i, c)| i + c.len_utf8())
                .take_while(|end| *end <= MAX_SEGMENT_BYTES)
                .collect();
            // Prefix token counts can differ slightly at a BPE boundary. Binary
            // search finds a fitting candidate; the chosen prefix is rechecked.
            let mut lo = if self
                .plan(&system, &remaining[..*ends.last().unwrap()])?
                .is_some()
            {
                ends.len()
            } else {
                0
            };
            let mut hi = ends.len();
            while lo < hi {
                let mid = (lo + hi + 1) / 2;
                if self.plan(&system, &remaining[..ends[mid - 1]])?.is_some() {
                    lo = mid;
                } else {
                    hi = mid - 1;
                }
            }
            if lo == 0 {
                result.complete = false;
                result.finish_reason = FinishReason::ContextLimit;
                result.text.clear();
                return Ok(result);
            }
            let max_end = ends[lo - 1];
            let mut end = preferred_boundary(remaining, max_end);
            let (tokens, input_tokens, budget) = loop {
                if let Some(plan) = self.plan(&system, &remaining[..end])? {
                    break plan;
                }
                end = remaining[..end]
                    .char_indices()
                    .last()
                    .map(|(i, _)| i)
                    .unwrap_or(0);
                if end == 0 {
                    result.complete = false;
                    result.finish_reason = FinishReason::ContextLimit;
                    result.text.clear();
                    return Ok(result);
                }
            };
            let source = &remaining[..end];
            let mut completion = self.generate(tokens, budget as i32, MAX_OUTPUT_BYTES)?;
            let complete = completion.is_complete();
            for segment in &mut completion.segments {
                segment.start_byte = start;
                segment.end_byte = start + end;
                segment.input_tokens = input_tokens;
            }
            result.segments.append(&mut completion.segments);
            if !complete {
                result.complete = false;
                result.finish_reason = completion.finish_reason;
                result.text.clear();
                return Ok(result);
            }
            // Keep original boundary whitespace; especially important for word
            // splits and languages that do not use spaces between sentences.
            result
                .text
                .push_str(&source[..source.len() - source.trim_start().len()]);
            result.text.push_str(&completion.text);
            result.text.push_str(&source[source.trim_end().len()..]);
            start += end;
        }
        Ok(result)
    }

    fn plan(&self, system: &str, input: &str) -> Result<Option<(Vec<LlamaToken>, usize, usize)>> {
        let input_tokens = self.model.str_to_token(input, AddBos::Never)?.len();
        let budget = output_budget(input_tokens);
        let tokens =
            self.prompt_tokens(system, &format!("<transcript>\n{input}\n</transcript>"))?;
        Ok(
            fits_context(tokens.len(), budget as i32, self.ctx.n_ctx() as usize).then_some((
                tokens,
                input_tokens,
                budget,
            )),
        )
    }

    fn bounded_hints<'a>(&self, hints: &'a str) -> Result<(&'a str, bool)> {
        let original_len = hints.len();
        let mut byte_end = hints.len().min(MAX_SEGMENT_BYTES);
        while !hints.is_char_boundary(byte_end) {
            byte_end -= 1;
        }
        let hints = &hints[..byte_end];
        let count = |text: &str| -> Result<usize> {
            Ok(self.model.str_to_token(text, AddBos::Never)?.len())
        };
        if count(hints)? <= MAX_HINT_TOKENS {
            return Ok((hints, hints.len() != original_len));
        }
        let ends: Vec<usize> = hints
            .char_indices()
            .map(|(i, c)| i + c.len_utf8())
            .collect();
        let mut lo = 0;
        let mut hi = ends.len();
        while lo < hi {
            let mid = (lo + hi + 1) / 2;
            if count(&hints[..ends[mid - 1]])? <= MAX_HINT_TOKENS {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }
        let mut end = if lo == 0 { 0 } else { ends[lo - 1] };
        while count(&hints[..end])? > MAX_HINT_TOKENS {
            end = hints[..end]
                .char_indices()
                .last()
                .map(|(i, _)| i)
                .unwrap_or(0);
        }
        eprintln!("cleanup-sidecar: optional hints limited to {MAX_HINT_TOKENS} tokens");
        Ok((&hints[..end], true))
    }

    fn prompt_tokens(&self, system: &str, user: &str) -> Result<Vec<LlamaToken>> {
        let prompt = self
            .build_chat_prompt(system, user)
            .unwrap_or_else(|error| {
                eprintln!("chat template failed ({error}); using ChatML fallback");
                format_chatml(system, user)
            });
        let tokens = self
            .model
            .str_to_token(&prompt, AddBos::Always)
            .context("Failed to tokenize cleanup prompt")?;
        anyhow::ensure!(!tokens.is_empty(), "Cleanup prompt tokenized to empty");
        Ok(tokens)
    }

    fn generate(
        &mut self,
        tokens: Vec<LlamaToken>,
        max_tokens: i32,
        max_bytes: usize,
    ) -> Result<Completion> {
        let result = self.generate_inner(tokens, max_tokens, max_bytes);
        if result.is_err() {
            self.cached_prompt.clear();
        }
        result
    }

    fn generate_inner(
        &mut self,
        tokens: Vec<LlamaToken>,
        max_tokens: i32,
        max_bytes: usize,
    ) -> Result<Completion> {
        let prompt_len = tokens.len() as i32;
        let context = self.ctx.n_ctx() as i32;
        if !fits_context(prompt_len as usize, max_tokens, context as usize) {
            return Ok(Completion::incomplete(FinishReason::ContextLimit));
        }
        let n_len = prompt_len + max_tokens;

        // Keep the KV prefix shared with the previous prompt; re-decode at least
        // the final token so we have fresh logits to sample from.
        let reused = common_prefix_len(&self.cached_prompt, &tokens);
        let start = reused.min(tokens.len() - 1);

        // Drop everything from `start` onward: the divergent tail plus the
        // previous request's generated tokens.
        self.cached_prompt.clear();
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
        let prefill_ms = prefill_start.elapsed().as_millis().min(u64::MAX as u128) as u64;
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
        // Tokens can split a UTF-8 character across byte pieces. Accumulate
        // bytes before decoding so no partial character is silently dropped.
        let mut output = Vec::new();
        let mut n_cur = prompt_len;
        let mut generated_tokens = 0;
        // First sample reads the last prompt token's logits in the final prefill
        // chunk; every generation step after decodes a single-token batch.
        let mut sample_idx = batch.n_tokens() - 1;

        let mut finish_reason = FinishReason::TokenLimit;
        loop {
            let token = sampler.sample(&self.ctx, sample_idx);
            sampler.accept(token);

            if self.model.is_eog_token(token) {
                finish_reason = FinishReason::EndOfGeneration;
                break;
            }

            // Sample EOS after the final permitted content token. A further
            // content token means the completion is incomplete; never decode it.
            if n_cur >= n_len {
                break;
            }
            output.extend(token_bytes(self.model, token)?);
            generated_tokens += 1;

            // Hard stop if the model starts chatting / labeling.
            if output.len() > max_bytes {
                finish_reason = FinishReason::ByteLimit;
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
        let gen_ms = gen_start.elapsed().as_millis().min(u64::MAX as u128) as u64;
        let gen_tokens = generated_tokens;

        eprintln!(
            "cleanup-sidecar: prompt_tok={prompt_len} reused={reused} decoded={decoded} \
             prefill={prefill_ms}ms gen_tok={gen_tokens} gen={gen_ms}ms"
        );

        let complete = finish_reason == FinishReason::EndOfGeneration;
        let text = if complete {
            sanitize_cleanup_output(
                &String::from_utf8(output)
                    .context("Cleanup output contains incomplete or invalid UTF-8")?,
            )
        } else {
            String::new()
        };
        Ok(Completion {
            text: text.clone(),
            complete,
            finish_reason,
            hints_truncated: false,
            segments: vec![Segment {
                start_byte: 0,
                end_byte: 0,
                prompt_tokens: prompt_len as usize,
                context_tokens: context as usize,
                input_tokens: 0,
                output_budget: max_tokens as usize,
                generated_tokens: gen_tokens as usize,
                reused_tokens: start,
                decoded_tokens: decoded,
                prefill_ms,
                generation_ms: gen_ms,
                complete,
                finish_reason,
                text,
            }],
        })
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

fn token_bytes(model: &LlamaModel, token: LlamaToken) -> Result<Vec<u8>> {
    let bytes = match model.token_to_piece_bytes(token, 32, true, None) {
        Err(llama_cpp_2::TokenToStringError::InsufficientBufferSpace(required)) => {
            model.token_to_piece_bytes(token, required.unsigned_abs() as usize, true, None)
        }
        result => result,
    };
    bytes.context("Failed to decode cleanup token bytes")
}

fn output_budget(input_tokens: usize) -> usize {
    input_tokens
        .saturating_add(input_tokens.div_ceil(2))
        .saturating_add(64)
        .max(96)
}

/// Prefer a complete sentence, then whitespace, then a UTF-8 boundary. Punctuation
/// next to a digit/letter is not an English sentence boundary (e.g. 3.14, v1.2).
fn preferred_boundary(input: &str, max_end: usize) -> usize {
    if max_end == input.len() {
        return max_end;
    }
    let prefix = &input[..max_end];
    let mut sentence = None;
    let mut whitespace = None;
    for (i, c) in prefix.char_indices() {
        let end = i + c.len_utf8();
        if c.is_whitespace() {
            whitespace = Some(end);
        }
        if matches!(c, '\n' | '।' | '。' | '！' | '？')
            || (matches!(c, '.' | '?' | '!')
                && input[end..].chars().next().is_some_and(char::is_whitespace))
        {
            sentence = Some(end);
        }
    }
    // Avoid tiny segments caused by an early isolated punctuation mark.
    sentence
        .filter(|end| *end >= max_end / 4)
        .or_else(|| whitespace.filter(|end| *end >= max_end / 4))
        .unwrap_or(max_end)
}

fn fits_context(prompt_tokens: usize, output_tokens: i32, context: usize) -> bool {
    output_tokens > 0
        && prompt_tokens < context
        && output_tokens as usize <= context - prompt_tokens
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn segmentation_prefers_sentences_without_splitting_utf8_or_decimal() {
        let english = "Keep 3.14 and v1.2. Another sentence is here.";
        assert_eq!(
            &english[..preferred_boundary(english, 32)],
            "Keep 3.14 and v1.2."
        );
        for text in [
            "प्रिया ने मना किया। कल बैठक है।",
            "小王没有批准付款。明天开会。",
            "No punctuation 👋🏽 here",
        ] {
            for end in text.char_indices().map(|(i, c)| i + c.len_utf8()) {
                let boundary = preferred_boundary(text, end);
                assert!(boundary > 0 && boundary <= end && text.is_char_boundary(boundary));
            }
        }
        assert_eq!(output_budget(200), 364);
        assert_eq!(output_budget(201), 366);
        assert_eq!(output_budget(1), 96);
    }

    #[test]
    #[ignore = "needs PARROT_TEST_CLEANUP_MODEL"]
    fn measured_planning_and_limits_with_real_model() {
        let path = std::env::var_os("PARROT_TEST_CLEANUP_MODEL").unwrap();
        let engine = CleanupEngine::load(Path::new(&path)).unwrap();
        let mut session = engine.new_session().unwrap();
        let system = "Copy the transcript exactly. Output only its text.";
        let chinese = "小王没有批准25元的付款。明天上午十点再次讨论。".repeat(12);
        let (tokens, count, budget) = session.plan(system, &chinese).unwrap().unwrap();
        assert!(count > 96 && budget > 96);
        assert!(tokens.len() + budget <= session.ctx.n_ctx() as usize);
        let (hints, truncated) = session
            .bounded_hints(&" हिंदी 👋🏽 context".repeat(2000))
            .map(|(s, t)| (s.to_string(), t))
            .unwrap();
        assert!(truncated);
        assert!(
            engine
                .model
                .str_to_token(&hints, AddBos::Never)
                .unwrap()
                .len()
                <= MAX_HINT_TOKENS
        );
        let user = "<transcript>\nPriya did not approve the invoice for 25 rupees. The meeting is on Friday.\n</transcript>";
        let tokens = session.prompt_tokens(system, user).unwrap();
        let available = session.ctx.n_ctx() as usize - tokens.len();
        assert!(fits_context(
            tokens.len(),
            available as i32 - 1,
            session.ctx.n_ctx() as usize
        ));
        assert!(fits_context(
            tokens.len(),
            available as i32,
            session.ctx.n_ctx() as usize
        ));
        let beyond = session
            .generate(tokens.clone(), available as i32 + 1, MAX_OUTPUT_BYTES)
            .unwrap();
        assert_eq!(beyond.finish_reason, FinishReason::ContextLimit);
        assert!(
            session.cached_prompt.is_empty(),
            "overflow must not mutate cache"
        );
        let token_stop = session
            .generate(tokens.clone(), 1, MAX_OUTPUT_BYTES)
            .unwrap();
        assert_eq!(token_stop.finish_reason, FinishReason::TokenLimit);
        assert!(token_stop.text.is_empty());
        let byte_stop = session.generate(tokens.clone(), 128, 1).unwrap();
        assert_eq!(byte_stop.finish_reason, FinishReason::ByteLimit);
        assert!(byte_stop.text.is_empty());
        let recovered = session.generate(tokens, 128, MAX_OUTPUT_BYTES).unwrap();
        assert!(recovered.is_complete());
        assert!(recovered.text.contains("25"));
        let long = "Priya did not approve the invoice for 25 rupees. The meeting is on Friday.\n"
            .repeat(60);
        let output = session.cleanup_transcript(system, "", &long).unwrap();
        assert!(
            output.is_complete(),
            "copy prompt should complete: {output:?}"
        );
        assert!(output.segments.len() > 1);
        let mut end = 0;
        for part in &output.segments {
            assert_eq!(part.start_byte, end);
            assert!(part.end_byte > part.start_byte);
            assert!(part.prompt_tokens + part.output_budget <= session.ctx.n_ctx() as usize);
            end = part.end_byte;
        }
        assert_eq!(end, long.len());
        eprintln!(
            "measured non-space budget={budget}, long segments={}",
            output.segments.len()
        );
    }

    #[test]
    fn context_boundary_reserves_output_before_decoding() {
        assert!(fits_context(1947, 100, 2048));
        assert!(fits_context(1948, 100, 2048));
        assert!(!fits_context(1949, 100, 2048));
        assert!(!fits_context(2048, 1, 2048));
        assert!(!fits_context(4096, 100, 2048));
        assert!(!fits_context(200, 0, 2048));
        assert!(!fits_context(200, -1, 2048));
    }

    #[test]
    #[ignore = "needs PARROT_TEST_CLEANUP_MODEL"]
    fn preserves_multibyte_token_boundaries() {
        let path = std::env::var_os("PARROT_TEST_CLEANUP_MODEL")
            .expect("Set PARROT_TEST_CLEANUP_MODEL to an existing cleanup GGUF");
        let engine = CleanupEngine::load(Path::new(&path)).unwrap();
        for text in [
            "प्रिया ने 25 रुपये का invoice approve नहीं किया",
            "小王没有批准25元的付款",
            "Élodie — Привет — مرحبا — 👋🏽",
        ] {
            let tokens = engine.model.str_to_token(text, AddBos::Never).unwrap();
            let mut bytes = Vec::new();
            for token in tokens {
                bytes.extend(token_bytes(&engine.model, token).unwrap());
            }
            assert_eq!(String::from_utf8(bytes).unwrap(), text);
        }
    }
}
