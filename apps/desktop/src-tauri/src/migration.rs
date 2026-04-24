use anyhow::Result;
use serde::Serialize;
use tauri::{Emitter, Manager};

use crate::cloud_api::{self, ImportEntry, ImportProfile, MigrationStatus};
use crate::db::Database;

const BATCH_SIZE: usize = 100;

#[derive(Serialize, Clone)]
struct MigrationProgress {
    phase: String,
    done: usize,
    total: usize,
}

fn emit_progress(app: &tauri::AppHandle, phase: &str, done: usize, total: usize) {
    let _ = app.emit(
        "migration-progress",
        MigrationProgress {
            phase: phase.to_string(),
            done,
            total,
        },
    );
}

fn require_session_token(db: &Database) -> Result<String> {
    db.get_setting("session_token")?
        .ok_or_else(|| anyhow::anyhow!("Sign in to cloud before migrating"))
}

#[tauri::command]
pub async fn get_migration_status(
    db: tauri::State<'_, Database>,
) -> Result<MigrationStatus, String> {
    let token = require_session_token(&db).map_err(|e| e.to_string())?;
    cloud_api::get_migration_status(&token)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_migration_checkout_url(
    db: tauri::State<'_, Database>,
) -> Result<String, String> {
    let token = require_session_token(&db).map_err(|e| e.to_string())?;
    cloud_api::get_migration_checkout_url(&token)
        .await
        .map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct MigrationSnapshot {
    pub status: MigrationStatus,
    pub total_history: i64,
    pub unmigrated_history: i64,
    pub pending_audio: i64,
    pub setup_mode: String,
}

/// Local + server state in one call. UI uses this on mount to render resume UX.
#[tauri::command]
pub async fn get_migration_snapshot(
    db: tauri::State<'_, Database>,
) -> Result<MigrationSnapshot, String> {
    let token = require_session_token(&db).map_err(|e| e.to_string())?;
    let status = cloud_api::get_migration_status(&token)
        .await
        .map_err(|e| e.to_string())?;
    Ok(MigrationSnapshot {
        total_history: db.count_total_history().map_err(|e| e.to_string())?,
        unmigrated_history: db.count_unmigrated_history().map_err(|e| e.to_string())?,
        pending_audio: db.count_pending_audio().map_err(|e| e.to_string())?,
        setup_mode: db
            .get_setting("setup_mode")
            .map_err(|e| e.to_string())?
            .unwrap_or_else(|| "local".to_string()),
        status,
    })
}

#[derive(Serialize)]
pub struct MigrationResult {
    pub inserted: i64,
    pub skipped: i64,
    pub audio_uploaded: usize,
    pub audio_failed: usize,
}

/// Returns true if this error string indicates the server considers migration
/// already complete (409 Conflict). We treat that as success for resumes.
fn is_already_completed(err: &str) -> bool {
    err.contains("409") || err.contains("already completed")
}

async fn upload_audio_pass(
    app: &tauri::AppHandle,
    db: &Database,
    token: &str,
    entries: Vec<crate::db::DictationEntry>,
) -> (usize, usize) {
    let mut uploaded = 0usize;
    let mut failed = 0usize;
    let total = entries.len();

    for (i, entry) in entries.iter().enumerate() {
        let Some(path) = entry.audio_path.as_ref() else {
            continue;
        };
        let ok = match tokio::fs::read(path).await {
            Ok(bytes) => match cloud_api::upload_audio(token, &entry.id, &bytes).await {
                Ok(_) => true,
                Err(e) => {
                    eprintln!("Audio upload failed for {}: {}", entry.id, e);
                    false
                }
            },
            Err(e) => {
                eprintln!("Failed to read local audio {}: {}", path, e);
                false
            }
        };
        if ok {
            uploaded += 1;
            let now = chrono::Utc::now().to_rfc3339();
            if let Err(e) = db.mark_audio_migrated(&entry.id, &now) {
                eprintln!("Failed to mark audio migrated for {}: {}", entry.id, e);
            }
        } else {
            failed += 1;
        }
        emit_progress(app, "audio", i + 1, total);
    }

    (uploaded, failed)
}

#[tauri::command]
pub async fn migrate_local_to_cloud(
    app: tauri::AppHandle,
) -> Result<MigrationResult, String> {
    let db = app.state::<Database>();
    let token = require_session_token(&db).map_err(|e| e.to_string())?;

    let status = cloud_api::get_migration_status(&token)
        .await
        .map_err(|e| e.to_string())?;
    if !status.tier_ok {
        return Err("Cloud tier required".into());
    }
    if !status.paid {
        return Err("Migration fee not paid".into());
    }

    // If the server already marked complete (e.g. prior run crashed after
    // /import/complete but before flipping local setup_mode), fall through to
    // audio retry + mode flip without hitting /import.
    let server_complete = status.completed;

    let entries = db.list_unmigrated_history().map_err(|e| e.to_string())?;
    let total = entries.len();
    emit_progress(&app, "preparing", 0, total);

    let profile = db.get_profile().map_err(|e| e.to_string())?;
    let import_profile = ImportProfile {
        custom_words: profile.custom_words,
        context_prompt: profile.context_prompt,
        writing_style: profile.writing_style,
    };

    let mut inserted_total: i64 = 0;
    let mut skipped_total: i64 = 0;

    if !server_complete {
        for (batch_idx, chunk) in entries.chunks(BATCH_SIZE).enumerate() {
            let payload: Vec<ImportEntry> = chunk
                .iter()
                .map(|e| ImportEntry {
                    id: e.id.clone(),
                    raw_text: e.raw_text.clone(),
                    cleaned_text: e.cleaned_text.clone(),
                    provider: e.provider.clone(),
                    duration_ms: e.duration_ms,
                    created_at: e.created_at.clone(),
                })
                .collect();

            let profile_ref = if batch_idx == 0 {
                Some(&import_profile)
            } else {
                None
            };

            match cloud_api::sync_import(&token, &payload, profile_ref).await {
                Ok(result) => {
                    inserted_total += result.inserted;
                    skipped_total += result.skipped;
                }
                Err(e) => {
                    let s = e.to_string();
                    if is_already_completed(&s) {
                        // Server raced ahead of us; skip history and proceed.
                        break;
                    }
                    return Err(s);
                }
            }

            let now = chrono::Utc::now().to_rfc3339();
            for entry in chunk {
                db.mark_dictation_migrated(&entry.id, &now)
                    .map_err(|e| e.to_string())?;
            }

            let done = (batch_idx + 1) * BATCH_SIZE;
            emit_progress(&app, "history", done.min(total), total);
        }
    }

    // Audio: always run, covers this run + any unfinished from prior runs.
    let pending_audio = db.list_pending_audio().map_err(|e| e.to_string())?;
    let (audio_uploaded, audio_failed) =
        upload_audio_pass(&app, &db, &token, pending_audio).await;

    // Mark complete on server. Tolerate 409.
    if !server_complete {
        if let Err(e) = cloud_api::sync_import_complete(&token).await {
            let s = e.to_string();
            if !is_already_completed(&s) {
                return Err(s);
            }
        }
    }

    db.set_setting("setup_mode", "cloud")
        .map_err(|e| e.to_string())?;

    emit_progress(&app, "done", total, total);

    Ok(MigrationResult {
        inserted: inserted_total,
        skipped: skipped_total,
        audio_uploaded,
        audio_failed,
    })
}

#[derive(Serialize)]
pub struct AudioRetryResult {
    pub uploaded: usize,
    pub failed: usize,
}

/// Re-attempts just the failed/pending audio uploads. Does not touch history
/// or server migration completion state.
#[tauri::command]
pub async fn retry_failed_audio(app: tauri::AppHandle) -> Result<AudioRetryResult, String> {
    let db = app.state::<Database>();
    let token = require_session_token(&db).map_err(|e| e.to_string())?;
    let pending = db.list_pending_audio().map_err(|e| e.to_string())?;
    let (uploaded, failed) = upload_audio_pass(&app, &db, &token, pending).await;
    Ok(AudioRetryResult { uploaded, failed })
}

#[tauri::command]
pub fn revert_to_local(db: tauri::State<'_, Database>) -> Result<(), String> {
    db.set_setting("setup_mode", "local")
        .map_err(|e| e.to_string())
}
