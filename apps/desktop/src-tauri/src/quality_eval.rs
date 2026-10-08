//! Opt-in headless worker using production ASR, prompts, token budget and finalizer.
//! Only explicit local model/audio paths are used. No Tauri app or user DB is opened.
use crate::{
    audio_import::AudioSource, cleanup, cleanup_engine::SidecarCleanupClient, transcription,
};
use anyhow::{ensure, Context, Result};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    fs::OpenOptions,
    io::Write,
    path::{Path, PathBuf},
    sync::Arc,
    time::Instant,
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Config {
    engine: String,
    model: PathBuf,
    #[serde(default)]
    sidecar: Option<PathBuf>,
    cases: Vec<Case>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Case {
    id: String,
    audio: Option<PathBuf>,
    language: Option<String>,
    initial_prompt: Option<String>,
    input: Option<String>,
    stage: Option<String>,
    #[serde(default)]
    tones: Vec<String>,
    #[serde(default)]
    custom_words: String,
    #[serde(default)]
    context_prompt: String,
    #[serde(default)]
    writing_style: String,
}

fn write_row(file: &mut std::fs::File, row: Value) -> Result<()> {
    writeln!(file, "{row}")?;
    file.flush()?;
    Ok(())
}

pub fn capabilities(engine: &str, path: &Path) -> Value {
    json!(crate::speech_capabilities::for_target(
        engine,
        "quality-eval",
        path
    ))
}

pub async fn run(request: &Path, output: &Path) -> Result<()> {
    let config: Config = serde_json::from_slice(&std::fs::read(request)?)?;
    ensure!(
        matches!(config.engine.as_str(), "whisper" | "parakeet" | "cleanup"),
        "Unknown engine"
    );
    ensure!(config.model.exists(), "Local model does not exist");
    ensure!(!config.cases.is_empty(), "No cases selected");
    let mut ids = std::collections::HashSet::new();
    for case in &config.cases {
        ensure!(ids.insert(&case.id), "Duplicate case ID: {}", case.id);
        if config.engine == "cleanup" {
            ensure!(case.input.is_some(), "Cleanup case needs input");
            ensure!(
                matches!(
                    case.stage.as_deref(),
                    Some("cleanup_isolated" | "cleanup_pipeline")
                ),
                "Invalid cleanup stage"
            );
            ensure!(
                !case.tones.is_empty()
                    && case
                        .tones
                        .iter()
                        .all(|tone| matches!(tone.as_str(), "casual" | "neutral" | "formal")),
                "Invalid cleanup tones"
            );
        } else {
            ensure!(
                case.audio.as_ref().is_some_and(|path| path.is_file()),
                "ASR case needs an existing audio file"
            );
        }
    }
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(output)?;
    let start = Instant::now();
    if config.engine == "cleanup" {
        let sidecar = config
            .sidecar
            .context("Cleanup needs an explicit local sidecar path")?;
        let model = config.model.clone();
        let client = Arc::new(
            tokio::task::spawn_blocking(move || SidecarCleanupClient::spawn(&sidecar, &model))
                .await??,
        );
        write_row(
            &mut file,
            json!({"kind":"loaded", "engine":"cleanup", "load_ms":start.elapsed().as_secs_f64()*1000.0}),
        )?;
        for case in config.cases {
            let input = case.input.unwrap();
            for tone in &case.tones {
                let system = cleanup::build_system_prompt(
                    &case.custom_words,
                    &case.context_prompt,
                    &case.writing_style,
                    cleanup::Formality::from_setting(tone),
                );
                let user = cleanup::build_user_message(&input);
                let budget = cleanup::cleanup_token_budget(&input);
                let started = Instant::now();
                let native = if input.trim().is_empty() {
                    Ok(String::new())
                } else {
                    let client = client.clone();
                    let system = system.clone();
                    let user = user.clone();
                    tokio::task::spawn_blocking(move || client.cleanup(&system, &user, budget))
                        .await?
                };
                let mut row = json!({"kind":"result", "id":case.id, "stage":case.stage, "tone":tone, "input":input,
                    "system_prompt":system, "user_message":user, "max_tokens":budget, "latency_ms":started.elapsed().as_secs_f64()*1000.0});
                match native {
                    Ok(model_output) => {
                        let candidate = cleanup::cleanup_candidate(&model_output);
                        let text = cleanup::finalize_cleanup_output(&model_output, &input);
                        row["fallback"] = json!(candidate != text);
                        row["model_output"] = json!(model_output);
                        row["candidate"] = json!(candidate);
                        row["text"] = json!(text);
                    }
                    Err(error) => row["error"] = json!(format!("{error:#}")),
                }
                write_row(&mut file, row)?;
            }
        }
    } else {
        let engine_name = config.engine.clone();
        let model = config.model.clone();
        let engine = tokio::task::spawn_blocking(move || -> Result<transcription::LocalEngine> {
            Ok(if engine_name == "whisper" {
                transcription::LocalEngine::Whisper(Arc::new(
                    transcription::LocalWhisperProvider::load(&model)?,
                ))
            } else {
                transcription::LocalEngine::Parakeet(Arc::new(
                    transcription::ParakeetProvider::load(&model, "quality-eval")?,
                ))
            })
        })
        .await??;
        write_row(
            &mut file,
            json!({"kind":"loaded", "engine":config.engine, "load_ms":start.elapsed().as_secs_f64()*1000.0,
            "capabilities":crate::speech_capabilities::for_target(&config.engine, "quality-eval", &config.model)}),
        )?;
        for case in config.cases {
            let started = Instant::now();
            let opts = transcription::TranscribeOpts {
                language: case.language.clone(),
                initial_prompt: case.initial_prompt.clone(),
            };
            let result = engine
                .transcribe_import(AudioSource::File(case.audio.unwrap()), opts)
                .await;
            let mut row = json!({"kind":"result", "id":case.id, "stage":"asr", "language":case.language,
                "initial_prompt":case.initial_prompt, "latency_ms":started.elapsed().as_secs_f64()*1000.0});
            match result {
                Ok(result) => row["text"] = json!(result.text),
                Err(error) => row["error"] = json!(format!("{error:#}")),
            }
            write_row(&mut file, row)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn refuses_invalid_requests_and_existing_outputs_before_loading_models() {
        let dir = std::env::temp_dir().join(format!("parrot-quality-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&dir).unwrap();
        let model = dir.join("model.bin");
        let audio = dir.join("audio.wav");
        let request = dir.join("request.json");
        let output = dir.join("output.jsonl");
        std::fs::write(&model, b"not a model").unwrap();
        std::fs::write(&audio, b"not audio").unwrap();
        let case = json!({"id":"example", "audio":audio});
        std::fs::write(
            &request,
            json!({"engine":"whisper", "model":model, "cases":[case,case]}).to_string(),
        )
        .unwrap();
        assert!(run(&request, &output)
            .await
            .unwrap_err()
            .to_string()
            .contains("Duplicate"));
        assert!(!output.exists());
        std::fs::write(
            &request,
            json!({"engine":"whisper", "model":model, "cases":[case]}).to_string(),
        )
        .unwrap();
        std::fs::write(&output, "existing evidence").unwrap();
        assert!(run(&request, &output).await.is_err());
        assert_eq!(
            std::fs::read_to_string(&output).unwrap(),
            "existing evidence"
        );
        std::fs::remove_file(&output).unwrap();
        std::fs::write(&request, json!({"engine":"cleanup", "model":model,
            "cases":[{"id":"example", "input":"hello", "stage":"cleanup_isolated", "tones":["typo"]}]}).to_string()).unwrap();
        assert!(run(&request, &output)
            .await
            .unwrap_err()
            .to_string()
            .contains("tones"));
        assert!(!output.exists());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
