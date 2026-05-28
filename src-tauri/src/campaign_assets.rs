use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::Manager;

fn campaign_assets_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?
        .join("campaign-assets"))
}

fn safe_join(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let normalized = relative_path.replace('\\', "/");
    let path = Path::new(&normalized);

    if path.is_absolute() {
        return Err("Campaign asset path must be relative".to_string());
    }

    for component in path.components() {
        match component {
            Component::Normal(_) => {}
            Component::CurDir => {}
            Component::ParentDir => {
                return Err("Campaign asset path cannot contain parent traversal".to_string())
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err("Campaign asset path must be relative".to_string())
            }
        }
    }

    Ok(root.join(path))
}

fn sanitize_extension(extension: &str) -> Result<String, String> {
    let sanitized = extension
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .collect::<String>()
        .to_ascii_lowercase();

    if sanitized.is_empty() {
        return Err("Campaign asset extension is required".to_string());
    }

    Ok(sanitized)
}

#[tauri::command]
pub async fn save_campaign_asset_bytes(
    app: tauri::AppHandle,
    campaign_id: String,
    asset_id: String,
    extension: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let ext = sanitize_extension(&extension)?;
    let relative_path = format!("{}/{}.{}", campaign_id, asset_id, ext);
    let root = campaign_assets_root(&app)?;
    let path = safe_join(&root, &relative_path)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create campaign asset directory: {}", e))?;
    }

    fs::write(&path, bytes).map_err(|e| format!("Failed to write campaign asset: {}", e))?;
    Ok(relative_path)
}

#[tauri::command]
pub async fn remove_campaign_asset(
    app: tauri::AppHandle,
    relative_path: String,
) -> Result<(), String> {
    let root = campaign_assets_root(&app)?;
    let path = safe_join(&root, &relative_path)?;

    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Failed to remove campaign asset: {}", e)),
    }
}

#[tauri::command]
pub async fn read_campaign_asset_bytes(
    app: tauri::AppHandle,
    relative_path: String,
) -> Result<Vec<u8>, String> {
    let root = campaign_assets_root(&app)?;
    let path = safe_join(&root, &relative_path)?;
    fs::read(path).map_err(|e| format!("Failed to read campaign asset: {}", e))
}
