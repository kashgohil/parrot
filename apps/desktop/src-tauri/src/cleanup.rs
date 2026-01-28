use anyhow::Result;
use serde::{Deserialize, Serialize};

/// Request body for Ollama's OpenAI-compatible chat endpoint
#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    stream: bool,
}

#[derive(Serialize, Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

/// Response from Ollama's OpenAI-compatible chat endpoint
#[derive(Deserialize)]
struct OllamaChatResponse {
    choices: Vec<OllamaChatChoice>,
}

#[derive(Deserialize)]
struct OllamaChatChoice {
    message: ChatMessage,
}

/// Request body for our backend API (profile data is stored server-side)
#[derive(Serialize)]
struct BackendCleanupRequest {
    text: String,
}

/// Response from our backend API
#[derive(Deserialize)]
struct BackendCleanupResponse {
    text: String,
}

pub async fn cleanup_text(
    raw_text: &str,
    mode: &str,
    session_token: Option<&str>,
    api_key: Option<&str>,
    model: Option<&str>,
    context_prompt: &str,
    writing_style: &str,
) -> Result<String> {
    if raw_text.trim().is_empty() {
        return Ok(String::new());
    }

    match mode {
        "local" => cleanup_with_ollama(raw_text, model, context_prompt, writing_style).await,
        "cloud" => cleanup_with_backend(raw_text, session_token, api_key).await,
        _ => anyhow::bail!("Unknown cleanup mode: {}", mode),
    }
}

/// Use Ollama's local server for text cleanup
/// Note: custom_words not supported in local mode
async fn cleanup_with_ollama(
    raw_text: &str,
    model: Option<&str>,
    context_prompt: &str,
    writing_style: &str,
) -> Result<String> {
    let system_prompt = build_system_prompt(context_prompt, writing_style);
    let model_name = model.unwrap_or("llama3.2");

    let request = OllamaChatRequest {
        model: model_name.to_string(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: system_prompt,
            },
            ChatMessage {
                role: "user".to_string(),
                content: raw_text.to_string(),
            },
        ],
        temperature: 0.3,
        stream: false,
    };

    let client = reqwest::Client::new();
    let resp = client
        .post("http://localhost:11434/v1/chat/completions")
        .json(&request)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Ollama API error {}: {}", status, body);
    }

    let chat_resp: OllamaChatResponse = resp.json().await?;
    let cleaned = chat_resp
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .unwrap_or_else(|| raw_text.to_string());

    Ok(cleaned)
}

/// Use our backend API for text cleanup (proxies to OpenAI/Anthropic)
/// Profile data (custom_words, context_prompt, writing_style) is stored server-side
/// If user provides their own API key, we pass it; otherwise backend uses its own key
async fn cleanup_with_backend(
    raw_text: &str,
    session_token: Option<&str>,
    api_key: Option<&str>,
) -> Result<String> {
    let session_token = session_token
        .ok_or_else(|| anyhow::anyhow!("Session token required for cloud mode"))?;

    let request = BackendCleanupRequest {
        text: raw_text.to_string(),
    };

    let client = reqwest::Client::new();
    let mut req_builder = client
        .post("http://localhost:3001/api/cleanup")
        .header("Authorization", format!("Bearer {}", session_token))
        .json(&request);

    // Optionally add user's API key if they provided one
    if let Some(key) = api_key {
        req_builder = req_builder.header("X-API-Key", key);
    }

    let resp = req_builder.send().await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend cleanup API error {}: {}", status, body);
    }

    let cleanup_resp: BackendCleanupResponse = resp.json().await?;
    Ok(cleanup_resp.text)
}

fn build_system_prompt(context_prompt: &str, writing_style: &str) -> String {
    let mut prompt = String::from(
        "You are a text cleanup assistant for voice dictation. \
         Fix grammar, punctuation, and remove filler words (um, uh, like, you know). \
         Preserve the speaker's meaning and tone. Return ONLY the cleaned text, nothing else.",
    );

    if !context_prompt.is_empty() {
        prompt.push_str(&format!("\n\nContext: {}", context_prompt));
    }
    if !writing_style.is_empty() {
        prompt.push_str(&format!("\n\nWriting style: {}", writing_style));
    }

    prompt
}
