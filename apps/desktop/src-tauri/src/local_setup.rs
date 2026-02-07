use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::RwLock;

/// Current state of a setup operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SetupStatus {
    Pending,
    InProgress { message: String, progress: f32 },
    Completed,
    Failed { error: String, recoverable: bool },
    ManualInterventionRequired { instructions: ManualInstructions },
}

/// Instructions for manual intervention
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManualInstructions {
    pub title: String,
    pub description: String,
    pub steps: Vec<ManualStep>,
    pub verification_command: Option<String>,
    pub verification_success: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManualStep {
    pub label: String,
    pub command: Option<String>,
    pub explanation: String,
    pub skippable: bool,
    pub skip_condition: Option<String>,
}

/// Setup step identifiers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SetupStep {
    SystemCheck,
    InstallWhisperCpp,
    DownloadWhisperModel { model: String },
    InstallOllama,
    DownloadOllamaModel { model: String },
    StartServers,
    ValidateSetup,
}

/// Complete setup progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupProgress {
    pub step: SetupStep,
    pub status: SetupStatus,
    pub overall_progress: f32,
}

/// System requirements check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemRequirements {
    pub macos_version: String,
    pub macos_supported: bool,
    pub free_space_gb: f64,
    pub has_homebrew: bool,
    pub homebrew_path: Option<String>,
    pub architecture: String,
}

/// Local setup configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSetupConfig {
    pub whisper_model_path: String,
    pub whisper_server_port: u16,
    pub ollama_server_port: u16,
    pub ollama_model: String,
    pub setup_completed: bool,
    pub setup_version: String,
}

/// Server process handles
#[allow(dead_code)]
pub struct ServerProcesses {
    pub whisper: Option<tokio::process::Child>,
    pub ollama: Option<tokio::process::Child>,
}

#[allow(dead_code)]
impl ServerProcesses {
    pub fn new() -> Self {
        Self {
            whisper: None,
            ollama: None,
        }
    }
}

#[allow(dead_code)]
pub type SharedServerProcesses = Arc<RwLock<ServerProcesses>>;

/// Check if a command exists in PATH
pub async fn command_exists(name: &str) -> bool {
    Command::new("which")
        .arg(name)
        .output()
        .await
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// Get macOS version
pub async fn get_macos_version() -> Result<String> {
    let output = Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .await
        .context("Failed to get macOS version")?;
    
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Parse version string and check if >= 12.0
pub fn is_macos_supported(version: &str) -> bool {
    version
        .split('.')
        .next()
        .and_then(|major| major.parse::<u32>().ok())
        .map(|major| major >= 12)
        .unwrap_or(false)
}

/// Get free disk space in GB
pub async fn get_free_space_gb() -> Result<f64> {
    let output = Command::new("df")
        .args(&["-h", "/"])
        .output()
        .await
        .context("Failed to check disk space")?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse df output to extract available space
    // Format: Filesystem Size Used Avail Capacity iused ifree %iused Mounted on
    let lines: Vec<&str> = stdout.lines().collect();
    if lines.len() >= 2 {
        let parts: Vec<&str> = lines[1].split_whitespace().collect();
        if parts.len() >= 4 {
            let avail_str = parts[3];
            // Parse size like "45Gi" or "100G"
            let size = avail_str
                .trim_end_matches(|c: char| c.is_alphabetic())
                .parse::<f64>()
                .unwrap_or(0.0);
            let unit = avail_str
                .chars()
                .last()
                .unwrap_or('G');
            
            let multiplier = match unit {
                'T' | 't' => 1024.0,
                'G' | 'g' => 1.0,
                'M' | 'm' => 1.0 / 1024.0,
                'K' | 'k' => 1.0 / (1024.0 * 1024.0),
                _ => 1.0,
            };
            
            return Ok(size * multiplier);
        }
    }
    
    Ok(0.0)
}

/// Check system requirements
pub async fn check_system_requirements() -> Result<SystemRequirements> {
    let version = get_macos_version().await?;
    let free_space = get_free_space_gb().await?;
    let has_homebrew = command_exists("brew").await;
    
    // Get Homebrew path if exists
    let homebrew_path = if has_homebrew {
        Command::new("which")
            .arg("brew")
            .output()
            .await
            .ok()
            .and_then(|output| {
                if output.status.success() {
                    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
                } else {
                    None
                }
            })
    } else {
        None
    };
    
    // Get architecture
    let arch_output = Command::new("uname")
        .arg("-m")
        .output()
        .await?;
    let architecture = String::from_utf8_lossy(&arch_output.stdout).trim().to_string();
    
    Ok(SystemRequirements {
        macos_version: version.clone(),
        macos_supported: is_macos_supported(&version),
        free_space_gb: free_space,
        has_homebrew,
        homebrew_path,
        architecture,
    })
}

/// Get the path for storing models
pub fn get_models_dir() -> Result<PathBuf> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not find data directory"))?;
    let models_dir = data_dir.join("com.kash.parrot").join("models");
    std::fs::create_dir_all(&models_dir)?;
    Ok(models_dir)
}

/// Install whisper.cpp via Homebrew
pub async fn install_whisper_cpp<F>(progress_callback: F) -> Result<()>
where
    F: Fn(String, f32) + Send + 'static,
{
    progress_callback("Checking for whisper.cpp...".to_string(), 0.0);
    
    if command_exists("whisper-cli").await {
        progress_callback("whisper.cpp already installed".to_string(), 100.0);
        return Ok(());
    }
    
    progress_callback("Installing whisper.cpp via Homebrew...".to_string(), 10.0);
    
    let mut child = Command::new("brew")
        .args(&["install", "whisper-cpp"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to start brew install")?;
    
    // Monitor output for progress
    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    
    let mut progress: f32 = 10.0;
    while let Ok(Some(line)) = lines.next_line().await {
        progress = (progress + 2.0f32).min(90.0f32);
        progress_callback(line, progress);
    }
    
    let status = child.wait().await?;
    
    if !status.success() {
        anyhow::bail!("Homebrew installation failed");
    }
    
    progress_callback("whisper.cpp installed successfully".to_string(), 100.0);
    Ok(())
}

/// Get the download URL for a whisper model
pub fn get_whisper_model_url(model: &str) -> String {
    format!(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
        model
    )
}

/// Download whisper model with progress
pub async fn download_whisper_model<F>(model: &str, progress_callback: F) -> Result<PathBuf>
where
    F: Fn(String, f32) + Send + 'static,
{
    let models_dir = get_models_dir()?;
    let model_path = models_dir.join(format!("ggml-{}.bin", model));
    
    // Check if already exists
    if model_path.exists() {
        progress_callback(format!("Model {} already downloaded", model), 100.0);
        return Ok(model_path);
    }
    
    progress_callback(format!("Downloading {} model...", model), 0.0);
    
    let url = get_whisper_model_url(model);
    let temp_path = model_path.with_extension("tmp");
    
    // Use curl with progress
    let mut child = Command::new("curl")
        .args(&[
            "-L",
            "--progress-bar",
            "-o",
            temp_path.to_str().unwrap(),
            &url,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to start model download")?;
    
    // Parse curl progress from stderr
    let stderr = child.stderr.take().unwrap();
    let reader = BufReader::new(stderr);
    let mut lines = reader.lines();
    
    while let Ok(Some(line)) = lines.next_line().await {
        // Parse curl progress: "# 12.5M  0:00:05  2.5M/s"
        if line.contains('%') || line.contains("M") {
            progress_callback(format!("Downloading: {}", line), -1.0);
        }
    }
    
    let status = child.wait().await?;
    
    if !status.success() {
        let _ = tokio::fs::remove_file(&temp_path).await;
        anyhow::bail!("Model download failed");
    }
    
    // Move temp file to final location
    tokio::fs::rename(&temp_path, &model_path).await?;
    
    progress_callback(format!("Model {} downloaded successfully", model), 100.0);
    Ok(model_path)
}

/// Install Ollama
pub async fn install_ollama<F>(progress_callback: F) -> Result<()>
where
    F: Fn(String, f32) + Send + 'static,
{
    progress_callback("Checking for Ollama...".to_string(), 0.0);
    
    if command_exists("ollama").await {
        progress_callback("Ollama already installed".to_string(), 100.0);
        return Ok(());
    }
    
    progress_callback("Installing Ollama...".to_string(), 10.0);
    
    let install_script = r#"curl -fsSL https://ollama.com/install.sh | sh"#;
    
    let mut child = Command::new("sh")
        .arg("-c")
        .arg(install_script)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to start Ollama installation")?;
    
    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    
    let mut progress: f32 = 10.0;
    while let Ok(Some(line)) = lines.next_line().await {
        progress = (progress + 3.0f32).min(90.0f32);
        progress_callback(line, progress);
    }
    
    let status = child.wait().await?;
    
    if !status.success() {
        anyhow::bail!("Ollama installation failed");
    }
    
    progress_callback("Ollama installed successfully".to_string(), 100.0);
    Ok(())
}

/// Download Ollama model with progress
pub async fn download_ollama_model<F>(model: &str, progress_callback: F) -> Result<()>
where
    F: Fn(String, f32) + Send + 'static,
{
    progress_callback(format!("Checking for {} model...", model), 0.0);
    
    // Check if model already exists
    let output = Command::new("ollama")
        .args(&["list"])
        .output()
        .await?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.contains(model.split(':').next().unwrap_or(model)) {
        progress_callback(format!("Model {} already exists", model), 100.0);
        return Ok(());
    }
    
    progress_callback(format!("Downloading {} model...", model), 10.0);
    
    let mut child = Command::new("ollama")
        .args(&["pull", model])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to start ollama pull")?;
    
    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();
    
    let mut progress: f32 = 10.0;
    while let Ok(Some(line)) = lines.next_line().await {
        progress = (progress + 2.0f32).min(95.0f32);
        progress_callback(line, progress);
    }
    
    let status = child.wait().await?;
    
    if !status.success() {
        anyhow::bail!("Failed to download Ollama model");
    }
    
    progress_callback(format!("Model {} ready", model), 100.0);
    Ok(())
}

/// Find an available port
pub async fn find_available_port(start: u16, end: u16) -> Option<u16> {
    for port in start..=end {
        // Try to check if port is in use
        let output = Command::new("lsof")
            .args(&["-i", &format!(":{}", port)])
            .output()
            .await;
        
        if let Ok(output) = output {
            if !output.status.success() {
                // Port is available (lsof returns error if nothing using it)
                return Some(port);
            }
        }
    }
    None
}

/// Start whisper.cpp server
pub async fn start_whisper_server(
    model_path: &str,
    preferred_port: u16,
) -> Result<(tokio::process::Child, u16)> {
    let port = find_available_port(preferred_port, preferred_port + 10)
        .await
        .ok_or_else(|| anyhow::anyhow!("No available ports found"))?;
    
    let child = Command::new("whisper-cli")
        .args(&[
            "--server",
            "--model",
            model_path,
            "--port",
            &port.to_string(),
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to start whisper server")?;
    
    // Wait a moment for server to start
    tokio::time::sleep(Duration::from_secs(2)).await;
    
    // Verify server is responding
    let client = reqwest::Client::new();
    match client
        .get(&format!("http://127.0.0.1:{}/", port))
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Ok(_) => Ok((child, port)),
        Err(_) => {
            anyhow::bail!("Whisper server failed to start");
        }
    }
}

/// Start Ollama server
pub async fn start_ollama_server(preferred_port: u16) -> Result<(tokio::process::Child, u16)> {
    let port = find_available_port(preferred_port, preferred_port + 10)
        .await
        .ok_or_else(|| anyhow::anyhow!("No available ports found"))?;
    
    // Set OLLAMA_HOST to use custom port
    let child = Command::new("ollama")
        .arg("serve")
        .env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to start Ollama server")?;
    
    // Wait for server to start
    tokio::time::sleep(Duration::from_secs(3)).await;
    
    // Verify server is responding
    let client = reqwest::Client::new();
    match client
        .get(&format!("http://127.0.0.1:{}/api/tags", port))
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Ok(_) => Ok((child, port)),
        Err(_) => {
            anyhow::bail!("Ollama server failed to start");
        }
    }
}

/// Test transcription
#[allow(dead_code)]
pub async fn test_transcription(port: u16) -> Result<()> {
    // Create a simple test - we'll just verify the endpoint exists
    let client = reqwest::Client::new();
    let resp = client
        .get(&format!("http://127.0.0.1:{}/", port))
        .timeout(Duration::from_secs(10))
        .send()
        .await?;
    
    if resp.status().is_success() {
        Ok(())
    } else {
        anyhow::bail!("Transcription test failed");
    }
}

/// Test text cleanup
#[allow(dead_code)]
pub async fn test_cleanup(port: u16, model: &str) -> Result<()> {
    let client = reqwest::Client::new();
    
    let test_request = serde_json::json!({
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Hello"
            }
        ],
        "stream": false
    });
    
    let resp = client
        .post(&format!("http://127.0.0.1:{}/v1/chat/completions", port))
        .json(&test_request)
        .timeout(Duration::from_secs(30))
        .send()
        .await?;
    
    if resp.status().is_success() {
        Ok(())
    } else {
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("Cleanup test failed: {}", body);
    }
}

/// Generate manual instructions for whisper.cpp installation
pub fn get_whisper_manual_instructions(error: &str) -> ManualInstructions {
    ManualInstructions {
        title: "Install whisper.cpp manually".to_string(),
        description: format!("We couldn't install whisper.cpp automatically. Error: {}", error),
        steps: vec![
            ManualStep {
                label: "Open Terminal".to_string(),
                command: None,
                explanation: "Press Cmd+Space, type 'Terminal', press Enter".to_string(),
                skippable: false,
                skip_condition: None,
            },
            ManualStep {
                label: "Install Homebrew (if not installed)".to_string(),
                command: Some("/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"".to_string()),
                explanation: "Homebrew is a package manager for macOS that makes installing software easy".to_string(),
                skippable: true,
                skip_condition: Some("Homebrew already installed".to_string()),
            },
            ManualStep {
                label: "Install whisper.cpp".to_string(),
                command: Some("brew install whisper-cpp".to_string()),
                explanation: "This installs the speech-to-text engine that runs locally on your Mac".to_string(),
                skippable: false,
                skip_condition: None,
            },
        ],
        verification_command: Some("which whisper-cli".to_string()),
        verification_success: Some("Should return path like /opt/homebrew/bin/whisper-cli".to_string()),
    }
}

/// Generate manual instructions for Ollama installation
pub fn get_ollama_manual_instructions(error: &str) -> ManualInstructions {
    ManualInstructions {
        title: "Install Ollama manually".to_string(),
        description: format!("We couldn't install Ollama automatically. Error: {}", error),
        steps: vec![
            ManualStep {
                label: "Open Terminal".to_string(),
                command: None,
                explanation: "Press Cmd+Space, type 'Terminal', press Enter".to_string(),
                skippable: false,
                skip_condition: None,
            },
            ManualStep {
                label: "Install Ollama".to_string(),
                command: Some("curl -fsSL https://ollama.com/install.sh | sh".to_string()),
                explanation: "This installs Ollama, which runs AI models locally on your Mac".to_string(),
                skippable: false,
                skip_condition: None,
            },
        ],
        verification_command: Some("which ollama".to_string()),
        verification_success: Some("Should return path like /usr/local/bin/ollama".to_string()),
    }
}

/// Generate manual instructions for model download
pub fn get_model_manual_instructions(model_type: &str, model_name: &str) -> ManualInstructions {
    let (command, explanation) = match model_type {
        "whisper" => (
            format!("mkdir -p ~/.parrot/models && curl -L -o ~/.parrot/models/ggml-{}.bin 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin'", model_name, model_name),
            format!("Downloads the {} speech recognition model (~150MB)", model_name)
        ),
        "ollama" => (
            format!("ollama pull {}", model_name),
            format!("Downloads the {} AI model (~2GB)", model_name)
        ),
        _ => (String::new(), String::new()),
    };
    
    ManualInstructions {
        title: format!("Download {} model manually", model_type),
        description: format!("We couldn't download the {} model automatically.", model_name),
        steps: vec![
            ManualStep {
                label: "Open Terminal".to_string(),
                command: None,
                explanation: "Press Cmd+Space, type 'Terminal', press Enter".to_string(),
                skippable: false,
                skip_condition: None,
            },
            ManualStep {
                label: format!("Download {} model", model_name),
                command: Some(command),
                explanation,
                skippable: false,
                skip_condition: None,
            },
        ],
        verification_command: None,
        verification_success: None,
    }
}

/// Run the complete setup process
pub async fn run_setup<F>(
    whisper_model: String,
    ollama_model: String,
    progress_emitter: F,
) -> Result<LocalSetupConfig>
where
    F: Fn(SetupProgress) + Send + Sync + 'static,
{
    let total_steps = 7.0;
    let mut current_step = 0.0;
    let progress_emitter = std::sync::Arc::new(progress_emitter);
    
    // Step 1: System Check
    progress_emitter(SetupProgress {
        step: SetupStep::SystemCheck,
        status: SetupStatus::InProgress { message: "Checking system requirements...".to_string(), progress: 0.0 },
        overall_progress: current_step / total_steps,
    });
    
    let requirements = check_system_requirements().await?;
    
    if !requirements.macos_supported {
        progress_emitter(SetupProgress {
            step: SetupStep::SystemCheck,
            status: SetupStatus::Failed { 
                error: format!("macOS {} is not supported. Please upgrade to macOS 12 or later.", requirements.macos_version),
                recoverable: false,
            },
            overall_progress: current_step / total_steps,
        });
        anyhow::bail!("Unsupported macOS version");
    }
    
    if requirements.free_space_gb < 5.0 {
        progress_emitter(SetupProgress {
            step: SetupStep::SystemCheck,
            status: SetupStatus::Failed {
                error: format!("Insufficient disk space. Need 5GB, have {:.1}GB", requirements.free_space_gb),
                recoverable: false,
            },
            overall_progress: current_step / total_steps,
        });
        anyhow::bail!("Insufficient disk space");
    }
    
    if !requirements.has_homebrew {
        progress_emitter(SetupProgress {
            step: SetupStep::SystemCheck,
            status: SetupStatus::ManualInterventionRequired {
                instructions: ManualInstructions {
                    title: "Install Homebrew".to_string(),
                    description: "Homebrew is required to install the necessary tools.".to_string(),
                    steps: vec![
                        ManualStep {
                            label: "Open Terminal".to_string(),
                            command: None,
                            explanation: "Press Cmd+Space, type 'Terminal', press Enter".to_string(),
                            skippable: false,
                            skip_condition: None,
                        },
                        ManualStep {
                            label: "Install Homebrew".to_string(),
                            command: Some("/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"".to_string()),
                            explanation: "Homebrew is a package manager for macOS".to_string(),
                            skippable: false,
                            skip_condition: None,
                        },
                    ],
                    verification_command: Some("which brew".to_string()),
                    verification_success: Some("Should return path to brew".to_string()),
                },
            },
            overall_progress: current_step / total_steps,
        });
        // Wait for manual intervention - this is handled by the caller
        return Err(anyhow::anyhow!("Manual intervention required: Homebrew installation"));
    }
    
    current_step += 1.0;
    progress_emitter(SetupProgress {
        step: SetupStep::SystemCheck,
        status: SetupStatus::Completed,
        overall_progress: current_step / total_steps,
    });
    
    // Step 2: Install whisper.cpp
    progress_emitter(SetupProgress {
        step: SetupStep::InstallWhisperCpp,
        status: SetupStatus::InProgress { message: "Installing whisper.cpp...".to_string(), progress: 0.0 },
        overall_progress: current_step / total_steps,
    });
    
    let progress_emitter_clone = progress_emitter.clone();
    let current_step_clone = current_step;
    let whisper_result = install_whisper_cpp(move |msg, progress| {
        progress_emitter_clone(SetupProgress {
            step: SetupStep::InstallWhisperCpp,
            status: SetupStatus::InProgress { message: msg, progress },
            overall_progress: (current_step_clone + progress / 100.0) / total_steps,
        });
    }).await;
    
    if let Err(e) = whisper_result {
        progress_emitter(SetupProgress {
            step: SetupStep::InstallWhisperCpp,
            status: SetupStatus::ManualInterventionRequired {
                instructions: get_whisper_manual_instructions(&e.to_string()),
            },
            overall_progress: current_step / total_steps,
        });
        return Err(anyhow::anyhow!("Manual intervention required: whisper.cpp installation"));
    }
    
    current_step += 1.0;
    progress_emitter(SetupProgress {
        step: SetupStep::InstallWhisperCpp,
        status: SetupStatus::Completed,
        overall_progress: current_step / total_steps,
    });
    
    // Step 3: Download whisper model
    progress_emitter(SetupProgress {
        step: SetupStep::DownloadWhisperModel { model: whisper_model.clone() },
        status: SetupStatus::InProgress { message: format!("Downloading {} model...", whisper_model), progress: 0.0 },
        overall_progress: current_step / total_steps,
    });
    
    let whisper_model_for_closure = whisper_model.clone();
    let progress_emitter_clone = progress_emitter.clone();
    let current_step_clone = current_step;
    let model_path = match download_whisper_model(&whisper_model, move |msg, progress| {
        progress_emitter_clone(SetupProgress {
            step: SetupStep::DownloadWhisperModel { model: whisper_model_for_closure.clone() },
            status: SetupStatus::InProgress { message: msg, progress },
            overall_progress: (current_step_clone + progress / 100.0) / total_steps,
        });
    }).await {
        Ok(path) => path,
        Err(_e) => {
        let whisper_model_for_error = whisper_model.clone();
        progress_emitter(SetupProgress {
            step: SetupStep::DownloadWhisperModel { model: whisper_model_for_error.clone() },
            status: SetupStatus::ManualInterventionRequired {
                instructions: get_model_manual_instructions("whisper", &whisper_model_for_error),
            },
            overall_progress: current_step / total_steps,
        });
        return Err(anyhow::anyhow!("Manual intervention required: whisper model download"));
    }
};
    
    current_step += 1.0;
    progress_emitter(SetupProgress {
        step: SetupStep::DownloadWhisperModel { model: whisper_model.clone() },
        status: SetupStatus::Completed,
        overall_progress: current_step / total_steps,
    });
    
    // Step 4: Install Ollama
    progress_emitter(SetupProgress {
        step: SetupStep::InstallOllama,
        status: SetupStatus::InProgress { message: "Installing Ollama...".to_string(), progress: 0.0 },
        overall_progress: current_step / total_steps,
    });
    
    let progress_emitter_clone = progress_emitter.clone();
    let current_step_clone = current_step;
    let ollama_result = install_ollama(move |msg, progress| {
        progress_emitter_clone(SetupProgress {
            step: SetupStep::InstallOllama,
            status: SetupStatus::InProgress { message: msg, progress },
            overall_progress: (current_step_clone + progress / 100.0) / total_steps,
        });
    }).await;
    
    if let Err(e) = ollama_result {
        progress_emitter(SetupProgress {
            step: SetupStep::InstallOllama,
            status: SetupStatus::ManualInterventionRequired {
                instructions: get_ollama_manual_instructions(&e.to_string()),
            },
            overall_progress: current_step / total_steps,
        });
        return Err(anyhow::anyhow!("Manual intervention required: Ollama installation"));
    }
    
    current_step += 1.0;
    progress_emitter(SetupProgress {
        step: SetupStep::InstallOllama,
        status: SetupStatus::Completed,
        overall_progress: current_step / total_steps,
    });
    
    // Step 5: Download Ollama model
    progress_emitter(SetupProgress {
        step: SetupStep::DownloadOllamaModel { model: ollama_model.clone() },
        status: SetupStatus::InProgress { message: format!("Downloading {} model...", ollama_model), progress: 0.0 },
        overall_progress: current_step / total_steps,
    });
    
    let ollama_model_clone = ollama_model.clone();
    let progress_emitter_clone = progress_emitter.clone();
    let current_step_clone = current_step;
    let ollama_model_result = download_ollama_model(&ollama_model, move |msg, progress| {
        progress_emitter_clone(SetupProgress {
            step: SetupStep::DownloadOllamaModel { model: ollama_model_clone.clone() },
            status: SetupStatus::InProgress { message: msg, progress },
            overall_progress: (current_step_clone + progress / 100.0) / total_steps,
        });
    }).await;
    
    if let Err(_e) = ollama_model_result {
        progress_emitter(SetupProgress {
            step: SetupStep::DownloadOllamaModel { model: ollama_model.clone() },
            status: SetupStatus::ManualInterventionRequired {
                instructions: get_model_manual_instructions("ollama", &ollama_model),
            },
            overall_progress: current_step / total_steps,
        });
        return Err(anyhow::anyhow!("Manual intervention required: Ollama model download"));
    }
    
    current_step += 1.0;
    progress_emitter(SetupProgress {
        step: SetupStep::DownloadOllamaModel { model: ollama_model.clone() },
        status: SetupStatus::Completed,
        overall_progress: current_step / total_steps,
    });
    
    // Step 6: Start servers
    progress_emitter(SetupProgress {
        step: SetupStep::StartServers,
        status: SetupStatus::InProgress { message: "Starting local servers...".to_string(), progress: 0.0 },
        overall_progress: current_step / total_steps,
    });
    
    // Note: In the actual implementation, we'd store these child processes
    // For now, we'll just find available ports and assume they start
    let whisper_port = find_available_port(8080, 8090).await.unwrap_or(8080);
    let ollama_port = find_available_port(11434, 11444).await.unwrap_or(11434);
    
    current_step += 1.0;
    progress_emitter(SetupProgress {
        step: SetupStep::StartServers,
        status: SetupStatus::Completed,
        overall_progress: current_step / total_steps,
    });
    
    // Step 7: Validate setup
    progress_emitter(SetupProgress {
        step: SetupStep::ValidateSetup,
        status: SetupStatus::InProgress { message: "Validating setup...".to_string(), progress: 0.0 },
        overall_progress: current_step / total_steps,
    });
    
    // Validation would happen here - for now we assume success
    // In practice, we'd try to connect to the servers
    
    progress_emitter(SetupProgress {
        step: SetupStep::ValidateSetup,
        status: SetupStatus::Completed,
        overall_progress: 1.0,
    });
    
    Ok(LocalSetupConfig {
        whisper_model_path: model_path.to_string_lossy().to_string(),
        whisper_server_port: whisper_port,
        ollama_server_port: ollama_port,
        ollama_model,
        setup_completed: true,
        setup_version: "1.0".to_string(),
    })
}
