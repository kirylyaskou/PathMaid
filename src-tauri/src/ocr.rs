use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use tauri::{path::BaseDirectory, Manager};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrLine {
    pub text: String,
    pub score: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrPage {
    pub page_index: usize,
    pub lines: Vec<OcrLine>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrResult {
    pub text: String,
    pub pages: Vec<OcrPage>,
}

fn allowed_extension(file_name: &str) -> Result<String, String> {
    let ext = std::path::Path::new(file_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    match ext.as_str() {
        "pdf" | "png" | "jpg" | "jpeg" | "webp" | "bmp" | "tif" | "tiff" => Ok(ext),
        _ => Err(format!("Unsupported OCR input type: {}", file_name)),
    }
}

fn paddle_script_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(value) = std::env::var_os("PATHMAID_PADDLEOCR_SCRIPT") {
        return Ok(PathBuf::from(value));
    }

    let bundled = app
        .path()
        .resolve("ocr/paddle_ocr.py", BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve bundled OCR sidecar: {}", e))?;
    if bundled.exists() {
        return Ok(bundled);
    }

    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("ocr")
        .join("paddle_ocr.py");
    if dev.exists() {
        return Ok(dev);
    }

    Ok(bundled)
}

fn bundled_ocr_binary_path(app: &tauri::AppHandle) -> Result<Option<PathBuf>, String> {
    if let Some(value) = std::env::var_os("PATHMAID_PADDLEOCR_BIN") {
        let path = PathBuf::from(value);
        return Ok(path.exists().then_some(path));
    }

    let binary_name = if cfg!(windows) {
        "pathmaid-ocr.exe"
    } else {
        "pathmaid-ocr"
    };
    let bundled = app
        .path()
        .resolve(format!("ocr-bin/{}", binary_name), BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve bundled OCR executable: {}", e))?;
    Ok(bundled.exists().then_some(bundled))
}

fn bundled_ocr_cache_path(app: &tauri::AppHandle) -> Result<Option<PathBuf>, String> {
    let bundled = app
        .path()
        .resolve("ocr-models", BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve bundled OCR models: {}", e))?;
    Ok(bundled.exists().then_some(bundled))
}

fn writable_ocr_cache_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let cache = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to resolve OCR cache directory: {}", e))?
        .join("ocr-cache");
    fs::create_dir_all(&cache)
        .map_err(|e| format!("Failed to create OCR cache directory: {}", e))?;
    Ok(cache)
}

fn python_command() -> PathBuf {
    if let Some(value) = std::env::var_os("PATHMAID_PADDLEOCR_PYTHON") {
        return PathBuf::from(value);
    }

    if let Some(user_profile) = std::env::var_os("USERPROFILE") {
        let bundled = PathBuf::from(user_profile)
            .join(".cache")
            .join("codex-runtimes")
            .join("codex-primary-runtime")
            .join("dependencies")
            .join("python")
            .join("python.exe");
        if bundled.exists() {
            return bundled;
        }
    }

    PathBuf::from("python")
}

#[tauri::command]
pub async fn ocr_statblock_file_bytes(
    app: tauri::AppHandle,
    file_name: String,
    file_bytes: Vec<u8>,
    lang: Option<String>,
) -> Result<OcrResult, String> {
    let ext = allowed_extension(&file_name)?;
    let mut tmp = tempfile::Builder::new()
        .prefix("pathmaid-ocr-")
        .suffix(&format!(".{}", ext))
        .tempfile()
        .map_err(|e| format!("Failed to create OCR temp file: {}", e))?;
    tmp.write_all(&file_bytes)
        .map_err(|e| format!("Failed to write OCR temp file: {}", e))?;

    let mut command = if let Some(binary) = bundled_ocr_binary_path(&app)? {
        let mut command = Command::new(&binary);
        if let Some(parent) = binary.parent() {
            command.current_dir(parent);
        }
        command
    } else {
        let script = paddle_script_path(&app)?;
        if !script.exists() {
            return Err(format!("PaddleOCR sidecar not found: {}", script.display()));
        }

        let mut command = Command::new(python_command());
        command.arg(&script);
        if let Some(parent) = script.parent() {
            command.current_dir(parent);
            command.env("PATHMAID_OCR_REQUIREMENTS", parent.join("requirements.txt"));
        }
        command
    };

    command.env("PADDLE_PDX_CACHE_HOME", writable_ocr_cache_path(&app)?);
    if let Some(model_cache) = bundled_ocr_cache_path(&app)? {
        command.env("PATHMAID_BUNDLED_OCR_CACHE", model_cache);
    }

    command
        .arg("--input")
        .arg(tmp.path())
        .arg("--lang")
        .arg(lang.unwrap_or_else(|| "en".to_string()));

    let output = command
        .output()
        .map_err(|e| {
            format!(
                "Failed to start PaddleOCR sidecar: {}. Release builds must include the bundled OCR executable; Python is only required for development fallback.",
                e
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "PaddleOCR failed: {}{}",
            stderr.trim(),
            if stdout.trim().is_empty() {
                String::new()
            } else {
                format!(" stdout: {}", stdout.trim())
            }
        ));
    }

    serde_json::from_slice::<OcrResult>(&output.stdout)
        .map_err(|e| format!("Failed to parse PaddleOCR output: {}", e))
}
