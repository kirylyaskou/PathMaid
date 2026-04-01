use serde::Serialize;
use std::io::Read;
use std::path::Path;
use tauri::Emitter;

#[derive(Debug, Serialize, Clone)]
pub struct RawEntity {
    pub id: String,
    pub name: String,
    pub entity_type: String,
    pub level: Option<i64>,
    pub hp: Option<i64>,
    pub ac: Option<i64>,
    pub fort: Option<i64>,
    pub ref_save: Option<i64>,
    pub will: Option<i64>,
    pub perception: Option<i64>,
    pub traits: Option<String>,
    pub rarity: Option<String>,
    pub size: Option<String>,
    pub source_pack: Option<String>,
    pub raw_json: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncProgress {
    pub stage: String,
    pub current: u64,
    pub total: u64,
}

fn extract_entity(value: &serde_json::Value, source_pack: &str) -> Option<RawEntity> {
    let id = value.get("_id")?.as_str()?.to_string();
    let name = value.get("name")?.as_str()?.to_string();
    let entity_type = value.get("type")?.as_str()?.to_string();
    let system = value.get("system")?;

    let level = system
        .pointer("/details/level/value")
        .or_else(|| system.pointer("/level/value"))
        .and_then(|v| v.as_i64());

    let hp = system
        .pointer("/attributes/hp/max")
        .and_then(|v| v.as_i64());
    let ac = system
        .pointer("/attributes/ac/value")
        .and_then(|v| v.as_i64());
    let fort = system
        .pointer("/saves/fortitude/value")
        .and_then(|v| v.as_i64());
    let ref_save = system
        .pointer("/saves/reflex/value")
        .and_then(|v| v.as_i64());
    let will = system
        .pointer("/saves/will/value")
        .and_then(|v| v.as_i64());
    let perception = system
        .pointer("/perception/mod")
        .and_then(|v| v.as_i64());

    let traits = system
        .pointer("/traits/value")
        .and_then(|v| v.as_array())
        .map(|arr| {
            serde_json::to_string(
                &arr.iter()
                    .filter_map(|v| v.as_str())
                    .collect::<Vec<_>>(),
            )
            .unwrap_or_default()
        });

    let rarity = system
        .pointer("/traits/rarity")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let size = system
        .pointer("/traits/size/value")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let raw_json = serde_json::to_string(value).ok()?;

    Some(RawEntity {
        id,
        name,
        entity_type,
        level,
        hp,
        ac,
        fort,
        ref_save,
        will,
        perception,
        traits,
        rarity,
        size,
        source_pack: Some(source_pack.to_string()),
        raw_json,
    })
}

#[tauri::command]
pub async fn import_local_packs(
    app: tauri::AppHandle,
    pack_dir: String,
) -> Result<Vec<RawEntity>, String> {
    let base = Path::new(&pack_dir);
    if !base.exists() {
        return Err(format!("Directory not found: {}", pack_dir));
    }

    let mut entities = Vec::new();
    let mut packs: Vec<_> = std::fs::read_dir(base)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .collect();
    packs.sort_by_key(|e| e.file_name());

    let total_packs = packs.len() as u64;

    for (i, pack_entry) in packs.iter().enumerate() {
        let pack_name = pack_entry.file_name().to_string_lossy().to_string();
        let _ = app.emit(
            "sync-progress",
            SyncProgress {
                stage: format!("Reading pack: {}", pack_name),
                current: i as u64 + 1,
                total: total_packs,
            },
        );

        let json_files = find_json_files(&pack_entry.path());
        for json_path in json_files {
            if let Ok(contents) = std::fs::read_to_string(&json_path) {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&contents) {
                    if let Some(entity) = extract_entity(&value, &pack_name) {
                        entities.push(entity);
                    }
                }
            }
        }
    }

    let _ = app.emit(
        "sync-progress",
        SyncProgress {
            stage: "Import complete".to_string(),
            current: entities.len() as u64,
            total: entities.len() as u64,
        },
    );

    Ok(entities)
}

fn find_json_files(dir: &Path) -> Vec<std::path::PathBuf> {
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                files.extend(find_json_files(&path));
            } else if path.extension().and_then(|e| e.to_str()) == Some("json") {
                files.push(path);
            }
        }
    }
    files
}

#[tauri::command]
pub async fn sync_foundry_data(
    app: tauri::AppHandle,
    url: Option<String>,
) -> Result<Vec<RawEntity>, String> {
    let _ = app.emit(
        "sync-progress",
        SyncProgress {
            stage: "Fetching release info...".to_string(),
            current: 0,
            total: 0,
        },
    );

    let client = reqwest::Client::builder()
        .user_agent("pathbuddy/0.3.0")
        .build()
        .map_err(|e| e.to_string())?;

    let download_url = match url {
        Some(u) => u,
        None => {
            let release: serde_json::Value = client
                .get("https://api.github.com/repos/foundryvtt/pf2e/releases/latest")
                .send()
                .await
                .map_err(|e| format!("Failed to fetch release info: {}", e))?
                .json()
                .await
                .map_err(|e| format!("Failed to parse release JSON: {}", e))?;

            release
                .get("zipball_url")
                .and_then(|v| v.as_str())
                .ok_or("No zipball_url in release response")?
                .to_string()
        }
    };

    let _ = app.emit(
        "sync-progress",
        SyncProgress {
            stage: "Downloading ZIP...".to_string(),
            current: 0,
            total: 0,
        },
    );

    let bytes = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let _ = app.emit(
        "sync-progress",
        SyncProgress {
            stage: "Extracting packs...".to_string(),
            current: 0,
            total: 0,
        },
    );

    let cursor = std::io::Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("Failed to open ZIP: {}", e))?;

    let mut entities = Vec::new();
    let total_files = archive.len() as u64;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;

        if file.is_dir() {
            continue;
        }

        let file_name = file.name().to_string();
        if !file_name.ends_with(".json") {
            continue;
        }

        let source_pack = extract_pack_name(&file_name);

        if i % 500 == 0 {
            let _ = app.emit(
                "sync-progress",
                SyncProgress {
                    stage: format!("Extracting entities ({}/{})", i, total_files),
                    current: i as u64,
                    total: total_files,
                },
            );
        }

        let mut contents = String::new();
        if file.read_to_string(&mut contents).is_ok() {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&contents) {
                if let Some(entity) = extract_entity(&value, &source_pack) {
                    entities.push(entity);
                }
            }
        }
    }

    let _ = app.emit(
        "sync-progress",
        SyncProgress {
            stage: "Extraction complete".to_string(),
            current: entities.len() as u64,
            total: entities.len() as u64,
        },
    );

    Ok(entities)
}

fn extract_pack_name(zip_path: &str) -> String {
    let parts: Vec<&str> = zip_path.split('/').collect();
    for (i, part) in parts.iter().enumerate() {
        if *part == "packs" {
            if let Some(pack) = parts.get(i + 1) {
                return pack.to_string();
            }
        }
    }
    if parts.len() >= 2 {
        return parts[parts.len() - 2].to_string();
    }
    "unknown".to_string()
}
