use anyhow::Result;
use serde::{Deserialize, Serialize};

const BACKEND_URL: &str = "http://localhost:8030";

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
    #[serde(default)]
    pub audio_path: Option<String>,
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

pub async fn delete_dictation(session_token: &str, id: &str) -> Result<()> {
    let client = reqwest::Client::new();
    let resp = client
        .delete(format!("{}/api/history/{}", BACKEND_URL, id))
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend history delete error {}: {}", status, body);
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

// -- Audio --

pub async fn upload_audio(session_token: &str, dictation_id: &str, wav_data: &[u8]) -> Result<()> {
    let client = reqwest::Client::new();
    let part = reqwest::multipart::Part::bytes(wav_data.to_vec())
        .file_name(format!("{}.wav", dictation_id))
        .mime_str("audio/wav")?;
    let form = reqwest::multipart::Form::new().part("audio", part);

    let resp = client
        .post(format!("{}/api/audio/{}", BACKEND_URL, dictation_id))
        .header("Authorization", format!("Bearer {}", session_token))
        .multipart(form)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend audio upload error {}: {}", status, body);
    }

    Ok(())
}

#[derive(Deserialize)]
struct AudioUrlResponse {
    url: String,
}

pub async fn get_audio_url(session_token: &str, dictation_id: &str) -> Result<String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/api/audio/{}", BACKEND_URL, dictation_id))
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend audio URL error {}: {}", status, body);
    }

    let result: AudioUrlResponse = resp.json().await?;
    Ok(result.url)
}

// -- Migration / Sync --

#[derive(Deserialize, Serialize, Clone)]
pub struct MigrationStatus {
    #[serde(rename = "tierOk")]
    pub tier_ok: bool,
    pub paid: bool,
    pub completed: bool,
    #[serde(rename = "paidAt")]
    pub paid_at: Option<String>,
    #[serde(rename = "completedAt")]
    pub completed_at: Option<String>,
}

pub async fn get_migration_status(session_token: &str) -> Result<MigrationStatus> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/api/sync/migration/status", BACKEND_URL))
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Migration status error {}: {}", status, body);
    }
    Ok(resp.json().await?)
}

#[derive(Deserialize)]
struct CheckoutResponse {
    url: String,
}

pub async fn get_migration_checkout_url(session_token: &str) -> Result<String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/sync/migration/checkout", BACKEND_URL))
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Migration checkout error {}: {}", status, body);
    }
    let result: CheckoutResponse = resp.json().await?;
    Ok(result.url)
}

#[derive(Serialize)]
pub struct ImportEntry {
    pub id: String,
    pub raw_text: String,
    pub cleaned_text: String,
    pub provider: String,
    pub duration_ms: i64,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct ImportProfile {
    pub custom_words: String,
    pub context_prompt: String,
    pub writing_style: String,
}

#[derive(Serialize)]
struct ImportRequest<'a> {
    entries: &'a [ImportEntry],
    #[serde(skip_serializing_if = "Option::is_none")]
    profile: Option<&'a ImportProfile>,
}

#[derive(Deserialize)]
pub struct ImportResult {
    pub inserted: i64,
    pub skipped: i64,
}

pub async fn sync_import(
    session_token: &str,
    entries: &[ImportEntry],
    profile: Option<&ImportProfile>,
) -> Result<ImportResult> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/sync/import", BACKEND_URL))
        .header("Authorization", format!("Bearer {}", session_token))
        .json(&ImportRequest { entries, profile })
        .send()
        .await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Sync import error {}: {}", status, body);
    }
    Ok(resp.json().await?)
}

pub async fn sync_import_complete(session_token: &str) -> Result<()> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/sync/import/complete", BACKEND_URL))
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Sync complete error {}: {}", status, body);
    }
    Ok(())
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
