use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::sync::RwLock;

/// Current state of a setup operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
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
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SetupStep {
    SystemCheck,
    DownloadWhisperModel { model: String },
    InstallOllama,
    DownloadOllamaModel { model: String },
    StartOllama,
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
    pub architecture: String,
}

/// Local setup configuration. `setup_version` is bumped to "2.0" with the
/// transition to in-process whisper-rs (no whisper server, no port).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSetupConfig {
    pub whisper_model_path: String,
    pub ollama_server_port: u16,
    pub ollama_model: String,
    pub setup_completed: bool,
    pub setup_version: String,
}

pub const CURRENT_SETUP_VERSION: &str = "2.0";

/// Background process handles. With whisper running in-process, only the
/// Ollama daemon needs lifecycle tracking now.
pub struct ServerProcesses {
    pub ollama: Option<tokio::process::Child>,
    pub ollama_port: Option<u16>,
}

impl ServerProcesses {
    pub fn new() -> Self {
        Self {
            ollama: None,
            ollama_port: None,
        }
    }

    pub async fn stop_all(&mut self) {
        if let Some(mut child) = self.ollama.take() {
            let _ = child.kill().await;
        }
        self.ollama_port = None;
    }
}

pub type SharedServerProcesses = Arc<RwLock<ServerProcesses>>;

/// Check if a command exists in PATH
pub async fn command_exists(name: &str) -> bool {
    find_command_path(name).await.is_some()
}

/// Verify that the resolved `ollama` binary is actually runnable. On corporate
/// Macs we've seen `command_exists("ollama")` return true for a binary that
/// can't execute — quarantined Ollama.app from a prior install, MDM-blocked
/// signatures, missing Rosetta, etc. A successful `--version` invocation is
/// cheap and proves the binary actually launches.
pub async fn ollama_binary_works() -> bool {
    let Some(path) = find_command_path("ollama").await else {
        return false;
    };
    match tokio::time::timeout(
        Duration::from_secs(5),
        Command::new(&path)
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status(),
    )
    .await
    {
        Ok(Ok(status)) => status.success(),
        _ => false,
    }
}

/// True when we have a working Ollama on this machine — either a runnable CLI
/// or a daemon already answering on the standard port.
pub async fn ollama_available() -> bool {
    if ollama_binary_works().await {
        return true;
    }
    let client = reqwest::Client::new();
    probe_ollama(&client, 11434).await
}

/// Locate an installed `Ollama.app` bundle, if any. The DMG installer drops
/// the app here even when the CLI shim never makes it onto PATH (common on
/// corp laptops — DMG drag-install doesn't touch `/usr/local/bin`).
fn find_ollama_app() -> Option<PathBuf> {
    let mut candidates = vec![PathBuf::from("/Applications/Ollama.app")];
    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join("Applications/Ollama.app"));
    }
    candidates.into_iter().find(|p| p.exists())
}

/// If `Ollama.app` is installed but its daemon isn't running, launch the app
/// and wait briefly for the API to come up. Returns true if the daemon ends
/// up reachable. This lets us recover a broken-CLI install without bothering
/// the user with a reinstall flow.
pub async fn try_launch_ollama_app() -> bool {
    let Some(app_path) = find_ollama_app() else {
        return false;
    };

    // `open -a` returns immediately; the app then spawns its daemon. Errors
    // here are non-fatal — we'll fall through and let the caller decide what
    // to do based on the post-launch probe.
    let _ = Command::new("/usr/bin/open")
        .arg("-a")
        .arg(app_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .await;

    let client = reqwest::Client::new();
    for _ in 0..20 {
        if probe_ollama(&client, 11434).await {
            return true;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    false
}

/// Known absolute paths to check for binaries that are commonly missing from
/// the GUI app's inherited PATH on macOS. Tauri/Finder-launched apps don't
/// run a login shell, so the standard CLI install dirs aren't on PATH and
/// have to be probed directly.
fn known_paths_for(name: &str) -> Vec<String> {
    let mut paths = Vec::new();
    for prefix in ["/opt/homebrew/bin", "/usr/local/bin", "/opt/local/bin"] {
        paths.push(format!("{prefix}/{name}"));
    }
    if name == "ollama" {
        paths.push("/Applications/Ollama.app/Contents/Resources/ollama".to_string());
        if let Some(home) = dirs::home_dir() {
            paths.push(
                home.join("Applications/Ollama.app/Contents/Resources/ollama")
                    .to_string_lossy()
                    .into_owned(),
            );
        }
    }
    paths
}

/// Resolve the absolute path to a command, falling back to common CLI
/// install locations when the binary is on disk but not on the inherited
/// PATH.
pub async fn find_command_path(name: &str) -> Option<String> {
    if let Ok(output) = Command::new("which").arg(name).output().await {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }

    // Ask a login shell — picks up any PATH additions from the user's profile.
    if let Ok(output) = Command::new("/bin/bash")
        .args(["-lc", &format!("command -v {name}")])
        .output()
        .await
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() && std::path::Path::new(&path).exists() {
                return Some(path);
            }
        }
    }

    for candidate in known_paths_for(name) {
        if tokio::fs::metadata(&candidate).await.is_ok() {
            return Some(candidate);
        }
    }

    None
}

/// Build a `tokio::process::Command` for `name`, resolving its absolute path
/// when possible so it works inside Tauri's stripped-down GUI PATH.
pub async fn resolved_command(name: &str) -> Command {
    match find_command_path(name).await {
        Some(path) => Command::new(path),
        None => Command::new(name),
    }
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

    let arch_output = Command::new("uname")
        .arg("-m")
        .output()
        .await?;
    let architecture = String::from_utf8_lossy(&arch_output.stdout).trim().to_string();

    Ok(SystemRequirements {
        macos_version: version.clone(),
        macos_supported: is_macos_supported(&version),
        free_space_gb: free_space,
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

/// Get the download URL for a whisper model
pub fn get_whisper_model_url(model: &str) -> String {
    format!(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
        model
    )
}

fn get_whisper_model_file_name(model: &str) -> String {
    format!("ggml-{}.bin", model)
}

pub fn get_whisper_model_path(model: &str) -> Result<PathBuf> {
    let models_dir = get_models_dir()?;
    Ok(models_dir.join(get_whisper_model_file_name(model)))
}

pub async fn is_whisper_model_downloaded(model: &str) -> Result<bool> {
    Ok(get_whisper_model_path(model)?.exists())
}

pub async fn list_ollama_models() -> Result<Vec<String>> {
    if !command_exists("ollama").await {
        return Ok(vec![]);
    }

    let output = resolved_command("ollama")
        .await
        .args(["list"])
        .output()
        .await
        .context("Failed to list Ollama models")?;

    if !output.status.success() {
        anyhow::bail!("Failed to list Ollama models");
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut models = Vec::new();

    for line in stdout.lines().skip(1) {
        if let Some(first_col) = line.split_whitespace().next() {
            if !first_col.is_empty() {
                models.push(first_col.to_string());
            }
        }
    }

    Ok(models)
}

pub async fn is_ollama_model_downloaded(model: &str) -> Result<bool> {
    let installed = list_ollama_models().await?;
    let requested_base = model.split(':').next().unwrap_or(model);

    Ok(installed.iter().any(|installed_model| {
        installed_model == model || installed_model.split(':').next().unwrap_or(installed_model) == requested_base
    }))
}

/// Download whisper model with progress
pub async fn download_whisper_model<F>(model: &str, progress_callback: F) -> Result<PathBuf>
where
    F: Fn(String, f32) + Send + 'static,
{
    let model_path = get_whisper_model_path(model)?;
    
    // Check if already exists
    if model_path.exists() {
        progress_callback(format!("Model {} already downloaded", model), 100.0);
        return Ok(model_path);
    }
    
    progress_callback(format!("Downloading {} model...", model), 0.0);
    
    let url = get_whisper_model_url(model);
    let temp_path = model_path.with_extension("tmp");
    
    let client = reqwest::Client::new();
    let mut response = client
        .get(&url)
        .send()
        .await
        .context("Failed to start model download")?
        .error_for_status()
        .context("Model download request failed")?;

    let total_bytes = response.content_length();
    let mut downloaded_bytes: u64 = 0;
    let mut temp_file = tokio::fs::File::create(&temp_path)
        .await
        .context("Failed to create temporary model file")?;

    while let Some(chunk) = response.chunk().await.context("Failed while downloading model")? {
        temp_file
            .write_all(&chunk)
            .await
            .context("Failed to write model data")?;

        downloaded_bytes += chunk.len() as u64;

        if let Some(total) = total_bytes {
            if total > 0 {
                let progress = (downloaded_bytes as f32 / total as f32) * 100.0;
                progress_callback(
                    format!("Downloading {} model...", model),
                    progress.min(99.0),
                );
            }
        } else {
            let downloaded_mb = downloaded_bytes as f64 / (1024.0 * 1024.0);
            progress_callback(
                format!("Downloaded {:.1} MB...", downloaded_mb),
                0.0,
            );
        }
    }

    temp_file
        .flush()
        .await
        .context("Failed to finalize downloaded model")?;
    
    // Move temp file to final location
    tokio::fs::rename(&temp_path, &model_path).await?;
    
    progress_callback(format!("Model {} downloaded successfully", model), 100.0);
    Ok(model_path)
}

/// Install Ollama via the official `install.sh`.
///
/// The installer needs `sudo` to write into `/usr/local/bin`. Spawning it
/// from `sh -c` gives sudo no TTY, so the password prompt blocks forever
/// and the UI hangs on "Installing Ollama…". We elevate via `osascript`'s
/// `with administrator privileges` instead — macOS shows a native password
/// dialog, the user authenticates once, and sudo inside the installer
/// inherits the elevated context.
///
/// Detection is daemon-first so users who already run Ollama.app (which
/// rarely puts a CLI on PATH) are recognized without a reinstall.
pub async fn install_ollama<F>(progress_callback: F) -> Result<()>
where
    F: Fn(String, f32) + Send + 'static,
{
    progress_callback("Checking for Ollama...".to_string(), 0.0);

    // Note: we deliberately do NOT short-circuit on `command_exists` alone —
    // a quarantined or MDM-blocked Ollama binary at one of the known paths
    // would make existence checks lie, and we'd skip install for a binary
    // that can't actually run. `ollama_available` runs `--version` to prove
    // the binary launches before trusting it.
    if ollama_available().await {
        progress_callback("Ollama already installed".to_string(), 100.0);
        return Ok(());
    }

    // If Ollama.app is installed but the daemon isn't running and the CLI
    // shim never landed on PATH (common when the user installed via the DMG
    // and never opened the app), launch the app for them. Once the daemon
    // is up on 11434, the rest of setup can use the HTTP API and we don't
    // need a CLI at all.
    if find_ollama_app().is_some() {
        progress_callback("Starting installed Ollama app...".to_string(), 50.0);
        if try_launch_ollama_app().await {
            progress_callback("Ollama is running".to_string(), 100.0);
            return Ok(());
        }
    }

    progress_callback(
        "Requesting permission to install Ollama…".to_string(),
        10.0,
    );

    // `do shell script` runs through /bin/sh; the inner double quotes are
    // what AppleScript needs around the command string. No user-controlled
    // input is interpolated, so this string is safe as a literal.
    let applescript = r#"do shell script "curl -fsSL https://ollama.com/install.sh | sh" with administrator privileges"#;

    let output = Command::new("/usr/bin/osascript")
        .args(["-e", applescript])
        .output()
        .await
        .context("Failed to run osascript for Ollama install")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // osascript exit code 1 with "User canceled" means the user dismissed
        // the password dialog — surface that distinctly so the caller can
        // route to manual instructions instead of treating it as a hard fail.
        if stderr.contains("User canceled") || stderr.contains("(-128)") {
            anyhow::bail!("Ollama install cancelled at the password prompt");
        }
        anyhow::bail!(
            "Ollama installation failed: {}",
            stderr.trim().lines().last().unwrap_or("unknown error")
        );
    }

    progress_callback("Ollama installed successfully".to_string(), 100.0);
    Ok(())
}

/// Download Ollama model with progress via the HTTP streaming API.
///
/// The `ollama pull` CLI does not support `--json`, and its TTY progress uses
/// `\r` updates that don't surface as line-buffered reads. Hitting the daemon
/// API directly gives us reliable NDJSON progress events.
pub async fn download_ollama_model<F>(model: &str, progress_callback: F) -> Result<()>
where
    F: Fn(String, f32) + Send + 'static,
{
    progress_callback(format!("Checking for {} model...", model), 0.0);

    if is_ollama_model_downloaded(model).await? {
        progress_callback(format!("Model {} already exists", model), 100.0);
        return Ok(());
    }

    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let daemon_url = "http://127.0.0.1:11434";

    // Ensure the Ollama daemon is reachable; if not, spawn it and wait briefly.
    let mut spawned_daemon: Option<tokio::process::Child> = None;
    let probe = client
        .get(format!("{daemon_url}/api/tags"))
        .timeout(Duration::from_secs(2))
        .send()
        .await;
    if probe.is_err() {
        progress_callback("Starting Ollama daemon...".to_string(), 1.0);
        let child = resolved_command("ollama")
            .await
            .arg("serve")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .context("Failed to start the Ollama daemon")?;
        spawned_daemon = Some(child);

        let mut ready = false;
        for _ in 0..30 {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if client
                .get(format!("{daemon_url}/api/tags"))
                .timeout(Duration::from_secs(2))
                .send()
                .await
                .is_ok()
            {
                ready = true;
                break;
            }
        }
        if !ready {
            if let Some(mut child) = spawned_daemon.take() {
                let _ = child.kill().await;
            }
            anyhow::bail!("Ollama daemon did not start in time");
        }
    }

    progress_callback(format!("Downloading {} model...", model), 1.0);

    let mut response = match client
        .post(format!("{daemon_url}/api/pull"))
        .json(&serde_json::json!({ "name": model, "stream": true }))
        .send()
        .await
    {
        Ok(resp) => match resp.error_for_status() {
            Ok(r) => r,
            Err(e) => {
                if let Some(mut child) = spawned_daemon.take() {
                    let _ = child.kill().await;
                }
                return Err(anyhow::Error::from(e).context("Pull request rejected by Ollama"));
            }
        },
        Err(e) => {
            if let Some(mut child) = spawned_daemon.take() {
                let _ = child.kill().await;
            }
            return Err(anyhow::Error::from(e).context("Failed to call Ollama pull API"));
        }
    };

    let mut buffer: Vec<u8> = Vec::new();
    let mut last_progress: f32 = 1.0;

    loop {
        let chunk = match response.chunk().await {
            Ok(Some(c)) => c,
            Ok(None) => break,
            Err(e) => {
                if let Some(mut child) = spawned_daemon.take() {
                    let _ = child.kill().await;
                }
                return Err(anyhow::Error::from(e).context("Pull stream interrupted"));
            }
        };
        buffer.extend_from_slice(&chunk);

        while let Some(idx) = buffer.iter().position(|b| *b == b'\n') {
            let line_bytes: Vec<u8> = buffer.drain(..=idx).collect();
            let line = String::from_utf8_lossy(&line_bytes);
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
                if let Some(err) = value.get("error").and_then(|v| v.as_str()) {
                    if let Some(mut child) = spawned_daemon.take() {
                        let _ = child.kill().await;
                    }
                    anyhow::bail!("Ollama pull failed: {}", err);
                }

                let status = value
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Downloading")
                    .to_string();
                let completed = value.get("completed").and_then(|v| v.as_u64());
                let total = value.get("total").and_then(|v| v.as_u64());

                if let (Some(done), Some(total)) = (completed, total) {
                    if total > 0 {
                        let pct = (done as f32 / total as f32) * 100.0;
                        last_progress = pct.clamp(0.0, 99.0);
                        progress_callback(status, last_progress);
                        continue;
                    }
                }

                if status.contains("success") {
                    progress_callback("Finalizing model...".to_string(), 99.0);
                } else {
                    progress_callback(status, last_progress);
                }
            }
        }
    }

    progress_callback(format!("Model {} ready", model), 100.0);

    // Stop any daemon we spawned ad-hoc; the StartServers step will spawn its own.
    if let Some(mut child) = spawned_daemon {
        let _ = child.kill().await;
    }

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

/// Start whisper.cpp server.
///
/// Start Ollama server, polling until the API responds.
/// Start (or adopt) the Ollama daemon.
///
/// First probes the preferred port — if something is already serving the
/// `/api/tags` endpoint (e.g. Ollama.app, a daemon left running from a prior
/// session, or a user-launched `ollama serve`), we adopt it instead of
/// spawning a new one. This avoids the zombie-process pile that builds up
/// across failed setup attempts.
///
/// Returns the (optional) child handle alongside the port. `None` means we're
/// reusing a daemon we don't own — `stop_all` won't try to kill it on exit,
/// which is the right behavior.
pub async fn start_ollama_server(
    preferred_port: u16,
) -> Result<(Option<tokio::process::Child>, u16)> {
    use tokio::io::AsyncReadExt;

    let client = reqwest::Client::new();

    // Probe the preferred port first — if anyone is already serving Ollama's
    // API there, reuse it rather than fighting for the port.
    if probe_ollama(&client, preferred_port).await {
        return Ok((None, preferred_port));
    }

    let port = find_available_port(preferred_port, preferred_port + 10)
        .await
        .ok_or_else(|| anyhow::anyhow!("No available ports found"))?;

    let mut child = resolved_command("ollama")
        .await
        .arg("serve")
        .env("OLLAMA_HOST", format!("127.0.0.1:{}", port))
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to start Ollama server")?;

    let url = format!("http://127.0.0.1:{}/api/tags", port);

    for _ in 0..60 {
        if let Ok(Some(status)) = child.try_wait() {
            let mut err = String::new();
            if let Some(mut stderr) = child.stderr.take() {
                let _ = stderr.read_to_string(&mut err).await;
            }
            anyhow::bail!(
                "ollama serve exited (code {:?}) before binding: {}",
                status.code(),
                err.trim()
            );
        }

        if client
            .get(&url)
            .timeout(Duration::from_secs(2))
            .send()
            .await
            .is_ok()
        {
            return Ok((Some(child), port));
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    let _ = child.kill().await;
    anyhow::bail!("Ollama server did not start listening within 30 seconds");
}

/// Cheap GET against `/api/tags`. Treated as "Ollama is here" if the server
/// answers with any 2xx within a couple of seconds.
async fn probe_ollama(client: &reqwest::Client, port: u16) -> bool {
    let url = format!("http://127.0.0.1:{}/api/tags", port);
    match client
        .get(&url)
        .timeout(Duration::from_secs(2))
        .send()
        .await
    {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// Pre-warm the Ollama LLM by asking it to load the model into RAM with a
/// long `keep_alive` window. Without this the first dictation pays a 3-10s
/// cold-load tax inside the cleanup step. Errors are swallowed — this is
/// best-effort and the user's first cleanup will still work, just slowly.
pub async fn warm_up_ollama(port: u16, model: &str) {
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/api/generate", port);
    // Empty prompt + `keep_alive: "30m"` tells Ollama to load weights and
    // hold them in memory for half an hour after this call returns. That
    // window resets on every subsequent request, so an active user keeps the
    // model warm indefinitely.
    let body = serde_json::json!({
        "model": model,
        "prompt": "",
        "keep_alive": "30m",
        "stream": false,
    });
    let result = client
        .post(&url)
        .json(&body)
        .timeout(Duration::from_secs(180))
        .send()
        .await;
    match result {
        Ok(resp) if resp.status().is_success() => {
            println!("Ollama model '{}' warmed up", model);
        }
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            eprintln!("Ollama warmup non-success ({}): {}", status, body);
        }
        Err(e) => {
            eprintln!("Ollama warmup request failed: {}", e);
        }
    }
}

/// Test text cleanup
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

/// Generate manual instructions for Ollama installation.
///
/// We lead with the `.dmg` download because it works on locked-down corporate
/// Macs where the user doesn't have local admin and `curl | sh` (which uses
/// sudo) gets blocked. The shell installer is included as a fallback for
/// users who prefer it.
pub fn get_ollama_manual_instructions(error: &str) -> ManualInstructions {
    ManualInstructions {
        title: "Install Ollama manually".to_string(),
        description: format!("We couldn't install Ollama automatically. Error: {}", error),
        steps: vec![
            ManualStep {
                label: "Download the Ollama app".to_string(),
                command: Some("https://ollama.com/download/mac".to_string()),
                explanation: "Open this link in your browser, then drag Ollama into your Applications folder. This works without admin access — useful on managed/work laptops.".to_string(),
                skippable: false,
                skip_condition: None,
            },
            ManualStep {
                label: "Launch Ollama once".to_string(),
                command: None,
                explanation: "Open Ollama from Applications so it can finish setup and start its background service.".to_string(),
                skippable: false,
                skip_condition: None,
            },
            ManualStep {
                label: "Or install via Terminal (needs admin)".to_string(),
                command: Some("curl -fsSL https://ollama.com/install.sh | sh".to_string()),
                explanation: "Alternative if you have admin access — paste this in Terminal (Cmd+Space → 'Terminal').".to_string(),
                skippable: true,
                skip_condition: Some("you used the .dmg above".to_string()),
            },
        ],
        verification_command: Some("which ollama".to_string()),
        verification_success: Some("Should return a path like /usr/local/bin/ollama or /Applications/Ollama.app/Contents/Resources/ollama".to_string()),
    }
}

/// Same as `get_ollama_manual_instructions` but also tells the user to pull
/// the cleanup model afterwards. Used when the auto-install path didn't leave
/// us with a working Ollama, so the user needs both steps in one place — we
/// can't surface a "pull MODEL" instruction in isolation when `ollama` itself
/// is missing.
pub fn get_ollama_manual_instructions_with_model(
    error: &str,
    model: &str,
) -> ManualInstructions {
    let mut instructions = get_ollama_manual_instructions(error);
    instructions.description = format!(
        "We couldn't finish setting up Ollama automatically. Run the steps below to install it and download the {} model. Error: {}",
        model, error
    );
    instructions.steps.push(ManualStep {
        label: format!("Download {} model", model),
        command: Some(format!("ollama pull {}", model)),
        explanation: format!(
            "After Ollama is installed, this downloads the {} model used for cleanup.",
            model
        ),
        skippable: false,
        skip_condition: None,
    });
    instructions
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
    servers: SharedServerProcesses,
    progress_emitter: F,
) -> Result<LocalSetupConfig>
where
    F: Fn(SetupProgress) + Send + Sync + 'static,
{
    let total_steps = 6.0;
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
    
    current_step += 1.0;
    progress_emitter(SetupProgress {
        step: SetupStep::SystemCheck,
        status: SetupStatus::Completed,
        overall_progress: current_step / total_steps,
    });

    // Step 2: Download whisper model
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
                instructions: get_ollama_manual_instructions_with_model(
                    &e.to_string(),
                    &ollama_model,
                ),
            },
            overall_progress: current_step / total_steps,
        });
        return Err(anyhow::anyhow!("Manual intervention required: Ollama installation"));
    }

    // Belt-and-suspenders: osascript can return success while leaving us
    // without a usable Ollama (MDM-blocked installer, network blip after the
    // password prompt, stale Ollama.app resources making `command_exists`
    // lie). If we can't actually find or talk to Ollama after the install
    // call, route to manual instructions now — otherwise the next step
    // would fail with a generic "ollama pull" error and the user would see
    // a pull command they can't actually run.
    if !ollama_available().await {
        progress_emitter(SetupProgress {
            step: SetupStep::InstallOllama,
            status: SetupStatus::ManualInterventionRequired {
                instructions: get_ollama_manual_instructions_with_model(
                    "Ollama wasn't runnable after installation",
                    &ollama_model,
                ),
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
    
    if let Err(e) = ollama_model_result {
        // If Ollama itself isn't reachable here, the user can't run
        // `ollama pull` either. Show the install steps with the pull
        // appended so they get one self-contained recovery flow.
        let instructions = if ollama_available().await {
            get_model_manual_instructions("ollama", &ollama_model)
        } else {
            get_ollama_manual_instructions_with_model(&e.to_string(), &ollama_model)
        };
        progress_emitter(SetupProgress {
            step: SetupStep::DownloadOllamaModel { model: ollama_model.clone() },
            status: SetupStatus::ManualInterventionRequired { instructions },
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
    
    // Step 5: Start the Ollama daemon (whisper now runs in-process — no
    // server to spawn for it).
    progress_emitter(SetupProgress {
        step: SetupStep::StartOllama,
        status: SetupStatus::InProgress {
            message: "Starting Ollama server...".to_string(),
            progress: 0.0,
        },
        overall_progress: current_step / total_steps,
    });

    {
        let mut guard = servers.write().await;
        guard.stop_all().await;
    }

    let (ollama_child, ollama_port) = start_ollama_server(11434)
        .await
        .context("Failed to start Ollama server")?;

    {
        let mut guard = servers.write().await;
        guard.ollama = ollama_child;
        guard.ollama_port = Some(ollama_port);
    }

    current_step += 1.0;
    progress_emitter(SetupProgress {
        step: SetupStep::StartOllama,
        status: SetupStatus::Completed,
        overall_progress: current_step / total_steps,
    });

    // Step 6: Validate the cleanup model end-to-end.
    progress_emitter(SetupProgress {
        step: SetupStep::ValidateSetup,
        status: SetupStatus::InProgress {
            message: "Testing cleanup model...".to_string(),
            progress: 0.0,
        },
        overall_progress: current_step / total_steps,
    });

    test_cleanup(ollama_port, &ollama_model)
        .await
        .context("Ollama validation failed")?;

    progress_emitter(SetupProgress {
        step: SetupStep::ValidateSetup,
        status: SetupStatus::Completed,
        overall_progress: 1.0,
    });

    Ok(LocalSetupConfig {
        whisper_model_path: model_path.to_string_lossy().to_string(),
        ollama_server_port: ollama_port,
        ollama_model,
        setup_completed: true,
        setup_version: CURRENT_SETUP_VERSION.to_string(),
    })
}
