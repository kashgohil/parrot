use anyhow::Result;
use serde::{Deserialize, Serialize};

const BACKEND_URL: &str = "http://localhost:3001";

// -- History --

#[derive(Serialize)]
struct CreateDictationRequest {
    id: String,
    raw_text: String,
    cleaned_text: String,
    provider: String,
    duration_ms: i64,
}

#[derive(Deserialize, Clone, serde::Serialize)]
pub struct DictationEntry {
    pub id: String,
    pub raw_text: String,
    pub cleaned_text: String,
    pub provider: String,
    pub duration_ms: i64,
    pub created_at: String,
}

#[derive(Deserialize)]
struct HistoryResponse {
    entries: Vec<DictationEntry>,
}

pub async fn insert_dictation(
    session_token: &str,
    id: &str,
    raw_text: &str,
    cleaned_text: &str,
    provider: &str,
    duration_ms: i64,
) -> Result<()> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/history", BACKEND_URL))
        .header("Authorization", format!("Bearer {}", session_token))
        .json(&CreateDictationRequest {
            id: id.to_string(),
            raw_text: raw_text.to_string(),
            cleaned_text: cleaned_text.to_string(),
            provider: provider.to_string(),
            duration_ms,
        })
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend history API error {}: {}", status, body);
    }

    Ok(())
}

pub async fn update_dictation_cleaned(
    session_token: &str,
    id: &str,
    cleaned_text: &str,
) -> Result<()> {
    let client = reqwest::Client::new();
    let resp = client
        .patch(format!("{}/api/history/{}", BACKEND_URL, id))
        .header("Authorization", format!("Bearer {}", session_token))
        .json(&serde_json::json!({ "cleaned_text": cleaned_text }))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend history update error {}: {}", status, body);
    }

    Ok(())
}

pub async fn get_history(session_token: &str) -> Result<Vec<DictationEntry>> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/api/history", BACKEND_URL))
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend history API error {}: {}", status, body);
    }

    let result: HistoryResponse = resp.json().await?;
    Ok(result.entries)
}

pub async fn search_history(session_token: &str, query: &str) -> Result<Vec<DictationEntry>> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/api/history?q={}", BACKEND_URL, urlencoding::encode(query)))
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend history search error {}: {}", status, body);
    }

    let result: HistoryResponse = resp.json().await?;
    Ok(result.entries)
}

// -- Profile --

#[derive(Deserialize, Clone, serde::Serialize)]
pub struct Profile {
    pub custom_words: String,
    pub context_prompt: String,
    pub writing_style: String,
}

pub async fn get_profile(session_token: &str) -> Result<Profile> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/api/profile", BACKEND_URL))
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend profile API error {}: {}", status, body);
    }

    let profile: Profile = resp.json().await?;
    Ok(profile)
}

pub async fn update_profile(
    session_token: &str,
    custom_words: &str,
    context_prompt: &str,
    writing_style: &str,
) -> Result<()> {
    let client = reqwest::Client::new();
    let resp = client
        .put(format!("{}/api/profile", BACKEND_URL))
        .header("Authorization", format!("Bearer {}", session_token))
        .json(&serde_json::json!({
            "custom_words": custom_words,
            "context_prompt": context_prompt,
            "writing_style": writing_style,
        }))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend profile update error {}: {}", status, body);
    }

    Ok(())
}
