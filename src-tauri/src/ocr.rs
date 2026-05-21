use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;

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

fn paddle_script_path() -> PathBuf {
    std::env::var_os("PATHMAID_PADDLEOCR_SCRIPT")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("ocr")
                .join("paddle_ocr.py")
        })
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

    let script = paddle_script_path();
    if !script.exists() {
        return Err(format!("PaddleOCR sidecar not found: {}", script.display()));
    }

    let mut command = Command::new(python_command());
    command
        .arg(&script)
        .arg("--input")
        .arg(tmp.path())
        .arg("--lang")
        .arg(lang.unwrap_or_else(|| "en".to_string()));

    if let Some(parent) = script.parent() {
        command.current_dir(parent);
    }

    let output = command
        .output()
        .map_err(|e| format!("Failed to start PaddleOCR sidecar: {}", e))?;

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
