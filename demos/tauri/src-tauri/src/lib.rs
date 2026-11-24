mod note;

use serde::Serialize;
use std::{fs, io::ErrorKind, path::PathBuf, time::UNIX_EPOCH};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInfo {
    platform: &'static str,
    architecture: &'static str,
    version: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedNote {
    text: String,
    updated_at: Option<u64>,
}

#[derive(Serialize)]
struct NativeFailure {
    code: &'static str,
    message: String,
}

impl NativeFailure {
    fn storage(error: impl std::fmt::Display) -> Self {
        Self { code: "storage", message: format!("App storage failed: {error}") }
    }
}

fn get_note_path(app: &tauri::AppHandle) -> Result<PathBuf, NativeFailure> {
    let directory = app.path().app_data_dir().map_err(NativeFailure::storage)?;
    fs::create_dir_all(&directory).map_err(NativeFailure::storage)?;
    Ok(directory.join("component-explorer-note.txt"))
}

#[tauri::command]
fn get_runtime() -> RuntimeInfo {
    RuntimeInfo {
        platform: std::env::consts::OS,
        architecture: std::env::consts::ARCH,
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[tauri::command]
fn read_note(app: tauri::AppHandle) -> Result<SavedNote, NativeFailure> {
    let path = get_note_path(&app)?;
    let text = match fs::read_to_string(&path) {
        Ok(text) => text,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(SavedNote { text: String::new(), updated_at: None }),
        Err(error) => return Err(NativeFailure::storage(error)),
    };
    let modified = fs::metadata(&path).and_then(|metadata| metadata.modified()).map_err(NativeFailure::storage)?;
    let updated_at = modified.duration_since(UNIX_EPOCH).map_err(NativeFailure::storage)?.as_millis();
    let updated_at = u64::try_from(updated_at).map_err(NativeFailure::storage)?;
    Ok(SavedNote { text, updated_at: Some(updated_at) })
}

#[tauri::command]
fn write_note(app: tauri::AppHandle, text: String) -> Result<SavedNote, NativeFailure> {
    note::validate_note(&text).map_err(|message| NativeFailure { code: "invalid-input", message: message.to_owned() })?;
    let path = get_note_path(&app)?;
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, text).map_err(NativeFailure::storage)?;
    fs::rename(temporary, path).map_err(NativeFailure::storage)?;
    read_note(app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_runtime, read_note, write_note])
        .run(tauri::generate_context!())
        .expect("the Fabricator UI mobile host failed to start");
}
