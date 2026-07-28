mod commands;
mod credential;
mod profile;
mod session;
mod snippet;

use profile::Db;
use session::SessionManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(SessionManager::new())
        .setup(|app| {
            // Dapatkan path folder data lokal aplikasi
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
            let db_path = app_data_dir.join("profiles.db");
            let db = Db::new(db_path);
            // Inisialisasi DB profil
            profile::init_db(&db)
                .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)))?;

            // Inisialisasi DB snippet
            let snippet_db_path = app_data_dir.join("snippets.db");
            let snippet_db = snippet::SnippetDb::new(snippet_db_path);
            snippet::init_snippet_db(&snippet_db)
                .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
            app.manage(snippet_db);

            // Masukkan database ke state Tauri agar bisa diakses di commands
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::session_open_loopback,
            commands::session_open_local,
            commands::session_open_ssh,
            commands::session_open_telnet,
            commands::session_write,
            commands::session_resize,
            commands::session_close,
            // Perintah profil baru
            commands::profile_list,
            commands::profile_create,
            commands::profile_update,
            commands::profile_delete,
            commands::export_profiles,
            commands::import_profiles,
            commands::session_open_from_profile,
            // Perintah serial
            commands::list_serial_ports,
            commands::session_open_serial,
            // Perintah FTP & File Explorer
            commands::session_open_ftp,
            commands::ftp_list_dir,
            commands::ftp_cwd,
            commands::ftp_pwd,
            commands::ftp_upload,
            commands::ftp_download,
            commands::ftp_delete,
            commands::ftp_mkdir,
            commands::list_local_dir,
            commands::get_local_home,
            commands::delete_local_file,
            commands::mkdir_local,
            commands::copy_local_file,
            // Perintah Window Controls
            commands::window_minimize,
            commands::window_toggle_maximize,
            commands::window_close,
            commands::window_is_maximized,
            commands::detect_serial_baud_rate,
            commands::fix_serial_permissions,
            commands::check_dialout_permission,
            // Snippet / Macro Manager (Fase 16)
            commands::snippet_list,
            commands::snippet_create,
            commands::snippet_update,
            commands::snippet_delete,
            // Session Logging (Fase 15)
            commands::open_log_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
