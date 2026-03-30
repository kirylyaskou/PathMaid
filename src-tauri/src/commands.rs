use std::fs;
use std::io::Write;
use std::path::Path;
use tauri::command;

#[command]
pub async fn download_file(url: String, dest_path: String) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("pathbuddy")
        .build()
        .map_err(|e| e.to_string())?;
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let mut file = fs::File::create(&dest_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn extract_zip(zip_path: String, dest_path: String) -> Result<(), String> {
    let file = fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    archive.extract(&dest_path).map_err(|e| e.to_string())?;
    Ok(())
}

fn collect_json_files(dir: &Path, results: &mut Vec<String>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            collect_json_files(&path, results)?;
        } else if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let normalized = path.to_string_lossy().replace('\\', "/");
            results.push(normalized);
        }
    }
    Ok(())
}

#[command]
pub async fn glob_json_files(base_path: String) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    collect_json_files(Path::new(&base_path), &mut results)?;
    Ok(results)
}

#[command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[command]
pub async fn remove_dir(path: String) -> Result<(), String> {
    fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

#[command]
pub async fn remove_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}
