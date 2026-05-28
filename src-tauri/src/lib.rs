mod campaign_assets;
mod ocr;
mod sync;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            #[cfg(all(desktop, not(debug_assertions)))]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sync::sync_foundry_data,
            sync::import_local_packs,
            ocr::ocr_statblock_file_bytes,
            campaign_assets::save_campaign_asset_bytes,
            campaign_assets::remove_campaign_asset,
            campaign_assets::read_campaign_asset_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
