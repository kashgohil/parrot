use anyhow::Result;
use reqwest::multipart;
use serde::Deserialize;

/// Response from the backend transcription API
#[derive(Deserialize)]
struct BackendTranscribeResponse {
    text: String,
}

pub async fn transcribe_audio(
    wav_data: &[u8],
    mode: &str,
    session_token: Option<&str>,
    api_key: Option<&str>,
) -> Result<String> {
    match mode {
        "local" => transcribe_with_whisper_server(wav_data).await,
        "cloud" => transcribe_with_backend(wav_data, session_token, api_key).await,
        _ => anyhow::bail!("Unknown transcription mode: {}", mode),
    }
}

/// Use local whisper.cpp server for transcription
async fn transcribe_with_whisper_server(wav_data: &[u8]) -> Result<String> {
    let client = reqwest::Client::new();
    let part = multipart::Part::bytes(wav_data.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")?;
    let form = multipart::Form::new()
        .text("temperature", "0.0")
        .text("response_format", "json")
        .part("file", part);

    let resp = client
        .post("http://localhost:8080/inference")
        .multipart(form)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Whisper server error {}: {}", status, body);
    }

    let json: serde_json::Value = resp.json().await?;
    let text = json["text"].as_str().unwrap_or("").to_string();
    Ok(text)
}

/// Use our backend API for transcription (proxies to OpenAI/Deepgram/ElevenLabs)
/// Provider is decided server-side
async fn transcribe_with_backend(
    wav_data: &[u8],
    session_token: Option<&str>,
    api_key: Option<&str>,
) -> Result<String> {
    let session_token = session_token
        .ok_or_else(|| anyhow::anyhow!("Session token required for cloud mode"))?;

    let part = multipart::Part::bytes(wav_data.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")?;
    let form = multipart::Form::new().part("file", part);

    let client = reqwest::Client::new();
    let mut req_builder = client
        .post("http://localhost:3001/api/transcribe")
        .header("Authorization", format!("Bearer {}", session_token))
        .multipart(form);

    if let Some(key) = api_key {
        req_builder = req_builder.header("X-API-Key", key);
    }

    let resp = req_builder.send().await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Backend transcribe API error {}: {}", status, body);
    }

    let result: BackendTranscribeResponse = resp.json().await?;
    Ok(result.text)
}
