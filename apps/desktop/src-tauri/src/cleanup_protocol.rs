//! Completion metadata shared by the app and its isolated cleanup worker.
use serde::{Deserialize, Serialize};

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
}

impl Completion {
    pub fn is_complete(&self) -> bool {
        self.complete && self.finish_reason == FinishReason::EndOfGeneration
    }

    pub fn incomplete(reason: FinishReason) -> Self {
        Self {
            text: String::new(),
            complete: false,
            finish_reason: reason,
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
                finish_reason: reason
            }
            .is_complete());
            assert!(Completion::incomplete(reason).text.is_empty());
        }
        assert!(!Completion {
            text: "partial".into(),
            complete: false,
            finish_reason: FinishReason::EndOfGeneration
        }
        .is_complete());
        assert!(serde_json::from_str::<Completion>(r#"{"text":"partial"}"#).is_err());
    }
}
