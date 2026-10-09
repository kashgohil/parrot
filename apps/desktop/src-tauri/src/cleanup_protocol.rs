//! Completion metadata shared by the app and its isolated cleanup worker.
use serde::{Deserialize, Serialize};

pub const PROTOCOL_VERSION: u32 = 2;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FinishReason {
    EndOfGeneration,
    TokenLimit,
    ContextLimit,
    ByteLimit,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Completion {
    pub text: String,
    pub complete: bool,
    pub finish_reason: FinishReason,
    #[serde(default)]
    pub segments: Vec<Segment>,
    #[serde(default)]
    pub hints_truncated: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Segment {
    pub start_byte: usize,
    pub end_byte: usize,
    pub prompt_tokens: usize,
    pub context_tokens: usize,
    pub input_tokens: usize,
    pub output_budget: usize,
    pub generated_tokens: usize,
    pub reused_tokens: usize,
    pub decoded_tokens: usize,
    pub prefill_ms: u64,
    pub generation_ms: u64,
    pub complete: bool,
    pub finish_reason: FinishReason,
    pub text: String,
}

impl Completion {
    pub fn is_complete(&self) -> bool {
        self.complete
            && self.finish_reason == FinishReason::EndOfGeneration
            && self.segments.iter().all(|segment| {
                segment.complete && segment.finish_reason == FinishReason::EndOfGeneration
            })
    }

    pub fn incomplete(reason: FinishReason) -> Self {
        Self {
            text: String::new(),
            complete: false,
            finish_reason: reason,
            segments: Vec::new(),
            hints_truncated: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn completion_requires_explicit_eog_and_complete_status() {
        for reason in [
            FinishReason::TokenLimit,
            FinishReason::ContextLimit,
            FinishReason::ByteLimit,
        ] {
            assert!(!Completion {
                text: "partial".into(),
                complete: true,
                finish_reason: reason,
                segments: Vec::new(),
                hints_truncated: false
            }
            .is_complete());
            assert!(Completion::incomplete(reason).text.is_empty());
        }
        assert!(!Completion {
            text: "partial".into(),
            complete: false,
            finish_reason: FinishReason::EndOfGeneration,
            segments: Vec::new(),
            hints_truncated: false
        }
        .is_complete());
        assert!(serde_json::from_str::<Completion>(r#"{"text":"partial"}"#).is_err());
    }
}
