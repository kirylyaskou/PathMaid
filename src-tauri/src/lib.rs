mod campaign_assets;
mod ocr;
mod sync;

use tauri_plugin_log::{Target, TargetKind};

#[cfg(desktop)]
use tauri::Manager;
#[cfg(all(desktop, debug_assertions))]
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .targets([
                    // Rotating files in the platform log dir
                    // (Windows: %LOCALAPPDATA%/<bundleId>/logs). Survives crashes.
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                // Canonical line shape consumed across the app:
                //   LEVEL-ACTOR-TIMESTAMP-MESSAGE-ERROR
                // JS side (shared/api/logging.ts) builds the "ACTOR|MESSAGE[|ERROR]" body
                // and passes it as the message; here we only stamp LEVEL + TIMESTAMP.
                .format(|out, message, record| {
                    let level = record.level();
                    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
                    out.finish(format_args!("{level}-{now}-{message}"));
                })
                .build(),
        )
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .setup(|_app| {
            #[cfg(all(desktop, debug_assertions))]
            _app.deep_link().register_all()?;

            #[cfg(all(desktop, not(debug_assertions)))]
            {
                _app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                _app.handle().plugin(tauri_plugin_process::init())?;
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
