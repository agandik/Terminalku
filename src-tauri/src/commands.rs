//! Tauri commands: jembatan tunggal antara frontend dan SessionManager/profile.
//! Semua command mengembalikan Result<_, String> agar error tampil ramah di UI
//! (sesuai konvensi AGENTS.md §4).

use base64::Engine;
use tauri::{State, Manager};
use tokio_util::compat::TokioAsyncReadCompatExt;
use tokio_util::compat::FuturesAsyncReadCompatExt;

use crate::credential;
use crate::profile::{self, Db, Profile};
use crate::session::ftp;
use crate::session::loopback::LoopbackSession;
use crate::session::local_pty::LocalPtySession;
use crate::session::serial;
use crate::session::ssh::{self, SshAuth, SshParams};
use crate::session::ssh_compat;
use crate::session::telnet;
use crate::session::{OutputChannel, SessionId, SessionManager};

/// Path file known_hosts milik app (terpisah dari `~/.ssh/known_hosts` sistem).
/// Dipakai untuk verifikasi host key Trust-On-First-Use (D-25, Fase 11).
fn app_known_hosts_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    let dir = app.path().app_data_dir().unwrap_or_default();
    std::fs::create_dir_all(&dir).ok();
    dir.join("known_hosts")
}

#[derive(serde::Serialize)]
pub struct SerialPortDetail {
    pub port_name: String,
    pub description: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

/// Buka sesi loopback (Fase 0). Mengembalikan session_id.
/// `output` adalah Channel yang dibuat frontend untuk menerima stream byte.
#[tauri::command]
pub fn session_open_loopback(
    manager: State<'_, SessionManager>,
    output: OutputChannel,
) -> Result<SessionId, String> {
    let id = manager.insert(|id| Box::new(LoopbackSession::new(id, output)));
    Ok(id)
}

/// Buka sesi terminal lokal (shell sistem). Menjalankan $SHELL atau /bin/bash
/// di dalam pseudo-terminal (PTY) penuh sehingga program interaktif (vim, htop)
/// dapat bekerja dengan baik.
#[tauri::command]
pub fn session_open_local(
    manager: State<'_, SessionManager>,
    output: OutputChannel,
    cols: u16,
    rows: u16,
) -> Result<SessionId, String> {
    let id = manager.insert(|id| {
        Box::new(
            LocalPtySession::new(id, output, cols, rows)
                .unwrap_or_else(|e| panic!("Gagal buka PTY lokal: {e}"))
        )
    });
    Ok(id)
}

/// Buka sesi SSH (FR-2). Auth password bila `password` diisi, atau key bila
fn is_legacy_ssh_error(err: &str) -> bool {
    let e = err.to_lowercase();
    e.contains("kex")
        || e.contains("algorithm")
        || e.contains("no common")
        || e.contains("cipher")
        || e.contains("key exchange")
        || e.contains("dsa")
        || e.contains("rsa")
        || e.contains("incompatible")
}

/// Buka sesi SSH (FR-2). Auth password bila `password` diisi, atau key bila
/// `key_path` diisi (passphrase opsional). Mengembalikan session_id.
#[tauri::command]
pub async fn session_open_ssh(
    app: tauri::AppHandle,
    manager: State<'_, SessionManager>,
    output: OutputChannel,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    key_path: Option<String>,
    passphrase: Option<String>,
    enable_logging: bool,
) -> Result<SessionId, String> {
    let auth = match (password, key_path) {
        (Some(pw), _) if !pw.is_empty() => SshAuth::Password(pw),
        (_, Some(path)) if !path.is_empty() => SshAuth::Key { key_path: path, passphrase },
        _ => return Err("butuh password atau key_path".to_string()),
    };
    let log_file_path = if enable_logging {
        let app_dir = app.path().app_data_dir().unwrap_or_default();
        let log_dir = app_dir.join("logs");
        std::fs::create_dir_all(&log_dir).ok();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Some(log_dir.join(format!("ssh_{}_{}.log", host.replace(":", "_"), timestamp)).to_string_lossy().to_string())
    } else {
        None
    };
    let id = manager.reserve_id();
    let params = SshParams { host, port, username, auth };
    let known_hosts = app_known_hosts_path(&app);
    match ssh::open(app.clone(), id, params.clone(), known_hosts.clone(), log_file_path.clone(), output.clone()).await {
        Ok(session) => {
            manager.insert_ready(id, Box::new(session));
            Ok(id)
        }
        Err(err) => {
            if is_legacy_ssh_error(&err) {
                match ssh_compat::open(app, id, params, known_hosts, log_file_path, output).await {
                    Ok(session) => {
                        manager.insert_ready(id, Box::new(session));
                        Ok(id)
                    }
                    Err(compat_err) => Err(format!("{err}\n(Fallback otomatis ke Mode Legacy juga gagal: {compat_err})")),
                }
            } else {
                Err(err)
            }
        }
    }
}

/// Buka sesi Telnet (FR-3). Mengembalikan session_id.
#[tauri::command]
pub async fn session_open_telnet(
    app: tauri::AppHandle,
    manager: State<'_, SessionManager>,
    output: OutputChannel,
    host: String,
    port: u16,
    username: Option<String>,
    password: Option<String>,
    enable_logging: bool,
) -> Result<SessionId, String> {
    let log_file_path = if enable_logging {
        let app_dir = app.path().app_data_dir().unwrap_or_default();
        let log_dir = app_dir.join("logs");
        std::fs::create_dir_all(&log_dir).ok();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Some(log_dir.join(format!("telnet_{}_{}.log", host.replace(":", "_"), timestamp)).to_string_lossy().to_string())
    } else {
        None
    };
    let id = manager.reserve_id();
    let session = telnet::open(app, id, host, port, username, password, log_file_path, output).await?;
    manager.insert_ready(id, Box::new(session));
    Ok(id)
}

/// Buka sesi Serial (FR-4). Mengembalikan session_id.
#[tauri::command]
pub async fn session_open_serial(
    app: tauri::AppHandle,
    manager: State<'_, SessionManager>,
    output: OutputChannel,
    port_name: String,
    baud_rate: u32,
    data_bits: u8,
    parity: String,
    stop_bits: u8,
    enable_logging: bool,
    force_release: bool,
) -> Result<SessionId, String> {
    let log_file_path = if enable_logging {
        let app_dir = app.path().app_data_dir().unwrap_or_default();
        let log_dir = app_dir.join("logs");
        std::fs::create_dir_all(&log_dir).ok();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let safe_port = port_name.replace("/", "_").replace("\\", "_");
        Some(log_dir.join(format!("serial_{}_{}.log", safe_port, timestamp)).to_string_lossy().to_string())
    } else {
        None
    };
    let id = manager.reserve_id();
    let session = serial::open(app, id, port_name, baud_rate, data_bits, parity, stop_bits, log_file_path, force_release, output).await?;
    manager.insert_ready(id, Box::new(session));
    Ok(id)
}

/// Deteksi daftar port serial yang tersedia di OS (FR-5).
#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<SerialPortDetail>, String> {
    let mut list = Vec::new();
    let mut seen_names = std::collections::HashSet::new();

    if let Ok(ports) = tokio_serial::available_ports() {
        for p in ports {
            #[cfg(unix)]
            let full_path = if !p.port_name.starts_with("/dev/") {
                format!("/dev/{}", p.port_name)
            } else {
                p.port_name.clone()
            };

            #[cfg(not(unix))]
            let full_path = p.port_name.clone();

            seen_names.insert(full_path.clone());
            seen_names.insert(p.port_name.clone());

            let mut description = match p.port_type {
                tokio_serial::SerialPortType::UsbPort(info) => {
                    let desc = info.product.clone().unwrap_or_else(|| "USB Serial Device".to_string());
                    let vid = format!("{:04x}", info.vid);
                    let pid = format!("{:04x}", info.pid);
                    Some(format!("{} (VID:{}, PID:{})", desc, vid, pid))
                }
                tokio_serial::SerialPortType::PciPort => Some("PCI Serial Port".to_string()),
                tokio_serial::SerialPortType::BluetoothPort => Some("Bluetooth Port".to_string()),
                _ => None,
            };

            #[cfg(unix)]
            {
                if std::fs::OpenOptions::new().read(true).write(true).open(&full_path).is_err() {
                    let current_desc = description.unwrap_or_else(|| "Serial Port".to_string());
                    description = Some(format!("{current_desc} ⚠️ Perlu akses dialout"));
                }
            }

            list.push(SerialPortDetail {
                port_name: full_path,
                description,
            });
        }
    }

    // --- Linux Fallback Scanner ---
    #[cfg(target_os = "linux")]
    {
        let prefixes = ["ttyUSB", "ttyACM", "ttyS"];
        for prefix in &prefixes {
            for i in 0..32 {
                let dev_name = format!("{prefix}{i}");
                let path_str = format!("/dev/{dev_name}");
                if std::path::Path::new(&path_str).exists()
                    && !seen_names.contains(&path_str)
                    && !seen_names.contains(&dev_name)
                {
                    seen_names.insert(path_str.clone());
                    seen_names.insert(dev_name.clone());

                    let sys_driver = std::fs::read_link(format!("/sys/class/tty/{dev_name}/device/driver"))
                        .ok()
                        .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_string()))
                        .unwrap_or_else(|| "USB Serial Converter".to_string());

                    let mut desc = format!("USB Serial ({sys_driver})");
                    if std::fs::OpenOptions::new().read(true).write(true).open(&path_str).is_err() {
                        desc.push_str(" ⚠️ Perlu akses dialout");
                    }

                    list.push(SerialPortDetail {
                        port_name: path_str,
                        description: Some(desc),
                    });
                }
            }
        }
    }

    // --- Sort daftar port: Utamakan ttyUSB* / ttyACM* / USB Serial di bagian atas ---
    list.sort_by(|a, b| {
        let a_usb = a.port_name.contains("ttyUSB")
            || a.port_name.contains("ttyACM")
            || a.description.as_deref().unwrap_or("").contains("USB");
        let b_usb = b.port_name.contains("ttyUSB")
            || b.port_name.contains("ttyACM")
            || b.description.as_deref().unwrap_or("").contains("USB");
        match (a_usb, b_usb) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.port_name.cmp(&b.port_name),
        }
    });

    Ok(list)
}

/// Kirim keystroke (byte, base64) dari UI ke sesi.
#[tauri::command]
pub fn session_write(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
    data_b64: String,
) -> Result<(), String> {
    let data = base64::engine::general_purpose::STANDARD
        .decode(data_b64.as_bytes())
        .map_err(|e| format!("base64 tidak valid: {e}"))?;
    manager.write(session_id, &data)
}

/// Beri tahu sesi ukuran terminal baru.
#[tauri::command]
pub fn session_resize(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    manager.resize(session_id, cols, rows)
}

/// Tutup sesi.
#[tauri::command]
pub fn session_close(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
) -> Result<(), String> {
    manager.close(session_id)
}

// --- CRUD Profil & Koneksi Satu-Klik ---

/// Ambil daftar semua profil koneksi.
#[tauri::command]
pub fn profile_list(db: State<'_, Db>) -> Result<Vec<Profile>, String> {
    profile::list_profiles(&db)
}

/// Buat profil baru. Jika password disediakan, simpan secara aman di keyring.
#[tauri::command]
pub fn profile_create(
    db: State<'_, Db>,
    mut profile: Profile,
    password: Option<String>,
) -> Result<(), String> {
    if let Some(ref pw) = password {
        if !pw.is_empty() {
            credential::set_password(&profile.id, pw)?;
            profile.has_password = true;
        }
    }
    profile::create_profile(&db, &profile)
}

/// Update profil. Jika password diubah ke baru, update keyring.
/// Jika password berupa string kosong (""), hapus password dari keyring.
#[tauri::command]
pub fn profile_update(
    db: State<'_, Db>,
    mut profile: Profile,
    password: Option<String>,
) -> Result<(), String> {
    if let Some(ref pw) = password {
        if !pw.is_empty() {
            credential::set_password(&profile.id, pw)?;
            profile.has_password = true;
        } else {
            let _ = credential::delete_password(&profile.id);
            profile.has_password = false;
        }
    }
    profile::update_profile(&db, &profile)
}

/// Hapus profil beserta passwordnya di keyring.
#[tauri::command]
pub fn profile_delete(db: State<'_, Db>, id: String) -> Result<(), String> {
    let _ = credential::delete_password(&id);
    profile::delete_profile(&db, &id)
}

/// Ekspor semua profil ke string JSON (D-34).
/// Kredensial TIDAK ikut: hanya metadata profil yang disimpan di SQLite.
/// `has_password` sengaja tetap sesuai DB agar UI bisa memberi tahu bahwa
/// password perlu diisi ulang setelah import di perangkat lain.
#[tauri::command]
pub fn export_profiles(db: State<'_, Db>, path: String) -> Result<(), String> {
    let profiles = profile::list_profiles(&db)?;
    let json = serde_json::to_string_pretty(&profiles).map_err(|e| format!("Gagal serialisasi profil: {e}"))?;
    std::fs::write(&path, json).map_err(|e| format!("Gagal menulis file ekspor: {e}"))?;
    Ok(())
}

/// Impor profil dari file JSON (D-34).
/// Setiap profil diberi `id` baru (hindari tabrakan) dan `has_password`
/// direset ke false — kredensial tidak pernah ikut file JSON, jadi user
/// wajib mengisi ulang password setelah import. Mengembalikan jumlah profil terimpor.
#[tauri::command]
pub fn import_profiles(db: State<'_, Db>, path: String) -> Result<usize, String> {
    let json = std::fs::read_to_string(&path).map_err(|e| format!("Gagal membaca file impor: {e}"))?;
    let profiles: Vec<Profile> =
        serde_json::from_str(&json).map_err(|e| format!("Format JSON profil tidak valid: {e}"))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);

    let mut count = 0usize;
    for (i, mut p) in profiles.into_iter().enumerate() {
        // ID baru dari timestamp + indeks agar unik walau import beruntun.
        p.id = format!("import-{now}-{i}");
        p.has_password = false;
        p.created_at = now;
        p.updated_at = now;
        profile::create_profile(&db, &p)?;
        count += 1;
    }
    Ok(count)
}

/// Buka sesi koneksi dari profil tersimpan secara langsung (satu-klik).
#[tauri::command]
pub async fn session_open_from_profile(
    app: tauri::AppHandle,
    manager: State<'_, SessionManager>,
    db: State<'_, Db>,
    profile_id: String,
    output: OutputChannel,
    enable_logging: bool,
) -> Result<SessionId, String> {
    let p = profile::get_profile(&db, &profile_id)?;
    match p.protocol.as_str() {
        "ssh" => {
            let auth = match p.auth_method.as_str() {
                "password" => {
                    // Zeroizing di-drop di ujung blok ini setelah dikonversi (D-29).
                    let pw = credential::get_password(&p.id)
                        .map_err(|e| format!("Gagal memuat password SSH: {e}"))?;
                    ssh::SshAuth::Password(pw.to_string())
                }
                "key" => {
                    let passphrase = if p.has_password {
                        Some(
                            credential::get_password(&p.id)
                                .map_err(|e| format!("Gagal memuat passphrase key: {e}"))?
                                .to_string(),
                        )
                    } else {
                        None
                    };
                    ssh::SshAuth::Key { key_path: p.key_path.clone(), passphrase }
                }
                _ => return Err("Metode autentikasi SSH tidak valid".to_string()),
            };
            let log_file_path = if enable_logging {
                let app_dir = app.path().app_data_dir().unwrap_or_default();
                let log_dir = app_dir.join("logs");
                std::fs::create_dir_all(&log_dir).ok();
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                Some(log_dir.join(format!("ssh_{}_{}.log", p.host.replace(":", "_"), timestamp)).to_string_lossy().to_string())
            } else {
                None
            };
            let id = manager.reserve_id();
            let params = ssh::SshParams {
                host: p.host.clone(),
                port: p.port,
                username: p.username.clone(),
                auth,
            };
            let known_hosts = app_known_hosts_path(&app);
            // Gunakan ssh_compat (binary ssh sistem) jika profil sudah ditandai legacy
            if p.legacy_mode {
                let session = ssh_compat::open(app, id, params, known_hosts, log_file_path, output).await?;
                manager.insert_ready(id, Box::new(session));
            } else {
                match ssh::open(app.clone(), id, params.clone(), known_hosts.clone(), log_file_path.clone(), output.clone()).await {
                    Ok(session) => {
                        manager.insert_ready(id, Box::new(session));
                    }
                    Err(err) => {
                        if is_legacy_ssh_error(&err) {
                            // Mencoba fallback otomatis ke Mode Legacy
                            match ssh_compat::open(app, id, params, known_hosts, log_file_path, output).await {
                                Ok(session) => {
                                    // Berhasil terhubung via Mode Legacy!
                                    // Otomatis perbarui & simpan setting legacy_mode = true ke database profil
                                    let mut updated_p = p.clone();
                                    updated_p.legacy_mode = true;
                                    let _ = profile::update_profile(&db, &updated_p);

                                    manager.insert_ready(id, Box::new(session));
                                }
                                Err(compat_err) => {
                                    return Err(format!("{err}\n(Fallback otomatis ke Mode Legacy juga gagal: {compat_err})"));
                                }
                            }
                        } else {
                            return Err(err);
                        }
                    }
                }
            }
            Ok(id)
        }
        "telnet" => {
            let pass = if p.has_password {
                credential::get_password(&p.id).ok().map(|z| z.to_string())
            } else {
                None
            };
            let log_file_path = if enable_logging {
                let app_dir = app.path().app_data_dir().unwrap_or_default();
                let log_dir = app_dir.join("logs");
                std::fs::create_dir_all(&log_dir).ok();
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                Some(log_dir.join(format!("telnet_{}_{}.log", p.host.replace(":", "_"), timestamp)).to_string_lossy().to_string())
            } else {
                None
            };
            let id = manager.reserve_id();
            let session = telnet::open(
                app,
                id,
                p.host.clone(),
                p.port,
                if p.username.is_empty() { None } else { Some(p.username.clone()) },
                pass,
                log_file_path,
                output,
            ).await?;
            manager.insert_ready(id, Box::new(session));
            Ok(id)
        }
        "serial" => {
            let log_file_path = if enable_logging {
                let app_dir = app.path().app_data_dir().unwrap_or_default();
                let log_dir = app_dir.join("logs");
                std::fs::create_dir_all(&log_dir).ok();
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                let safe_port = p.serial_port.replace("/", "_").replace("\\", "_");
                Some(log_dir.join(format!("serial_{}_{}.log", safe_port, timestamp)).to_string_lossy().to_string())
            } else {
                None
            };
            let id = manager.reserve_id();
            let session = serial::open(
                app,
                id,
                p.serial_port.clone(),
                p.baud_rate,
                p.data_bits,
                p.parity.clone(),
                p.stop_bits,
                log_file_path,
                false,
                output,
            )
            .await?;
            manager.insert_ready(id, Box::new(session));
            Ok(id)
        }
        "ftp" => {
            let pw = if p.has_password {
                credential::get_password(&p.id).unwrap_or_default()
            } else {
                zeroize::Zeroizing::new(String::new())
            };
            let id = manager.reserve_id();
            let session = ftp::open(&p.host, p.port, &p.username, &pw, p.ftps, p.ftps_insecure).await?;
            manager.insert_ready(id, Box::new(session));
            Ok(id)
        }
        proto => Err(format!("Protokol tidak dikenal/didukung: {proto}")),
    }
}

// --- Operasi FTP & File Explorer Lokal ---

/// Buka sesi FTP baru secara langsung.
#[tauri::command]
pub async fn session_open_ftp(
    manager: State<'_, SessionManager>,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    ftps: bool,
    allow_insecure: bool,
) -> Result<SessionId, String> {
    let pw = password.unwrap_or_default();
    let id = manager.reserve_id();
    let session = ftp::open(&host, port, &username, &pw, ftps, allow_insecure).await?;
    manager.insert_ready(id, Box::new(session));
    Ok(id)
}

/// Mengambil daftar file/folder di FTP server.
#[tauri::command]
pub async fn ftp_list_dir(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
) -> Result<Vec<FileEntry>, String> {
    let client = manager.with_session_mut(session_id, |session| {
        let ftp_session = session
            .as_any_mut()
            .downcast_mut::<ftp::FtpSession>()
            .ok_or_else(|| "Sesi bukan bertipe FTP".to_string())?;
        Ok(ftp_session.client.clone())
    })?;

    let mut client = client.lock().await;
    let list_data = client
        .list(None)
        .await
        .map_err(|e| format!("Gagal memuat direktori FTP: {e}"))?;

    let mut entries = Vec::new();
    for line in list_data {
        if let Some(entry) = parse_ftp_line(&line) {
            if entry.name != "." && entry.name != ".." {
                entries.push(entry);
            }
        }
    }

    // Sortir: folder di atas, berkas di bawah
    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(entries)
}

/// Berpindah direktori di FTP server.
#[tauri::command]
pub async fn ftp_cwd(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
    path: String,
) -> Result<String, String> {
    let (client, current_dir) = manager.with_session_mut(session_id, |session| {
        let ftp_session = session
            .as_any_mut()
            .downcast_mut::<ftp::FtpSession>()
            .ok_or_else(|| "Sesi bukan bertipe FTP".to_string())?;
        Ok((ftp_session.client.clone(), ftp_session.current_dir.clone()))
    })?;

    let mut client = client.lock().await;
    client
        .cwd(&path)
        .await
        .map_err(|e| format!("Gagal berpindah direktori remote: {e}"))?;

    let pwd = client.pwd().await.unwrap_or(path);
    *current_dir.lock().await = pwd.clone();
    Ok(pwd)
}

/// Mendapatkan direktori aktif di FTP server.
#[tauri::command]
pub async fn ftp_pwd(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
) -> Result<String, String> {
    let current_dir = manager.with_session_mut(session_id, |session| {
        let ftp_session = session
            .as_any_mut()
            .downcast_mut::<ftp::FtpSession>()
            .ok_or_else(|| "Sesi bukan bertipe FTP".to_string())?;
        Ok(ftp_session.current_dir.clone())
    })?;

    let path = current_dir.lock().await.clone();
    Ok(path)
}

/// Unggah berkas lokal ke FTP server.
#[tauri::command]
pub async fn ftp_upload(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
    local_path: String,
    remote_name: String,
) -> Result<(), String> {
    let client = manager.with_session_mut(session_id, |session| {
        let ftp_session = session
            .as_any_mut()
            .downcast_mut::<ftp::FtpSession>()
            .ok_or_else(|| "Sesi bukan bertipe FTP".to_string())?;
        Ok(ftp_session.client.clone())
    })?;

    let file = tokio::fs::File::open(&local_path)
        .await
        .map_err(|e| format!("Gagal membuka file lokal: {e}"))?;
    let mut compat_reader = file.compat();

    let mut client = client.lock().await;
    match &mut *client {
        ftp::FtpClient::Plain(c) => {
            c.put_file(&remote_name, &mut compat_reader)
                .await
                .map_err(|e| format!("Gagal mengunggah berkas ke FTP: {e}"))?;
        }
        ftp::FtpClient::Secure(c) => {
            c.put_file(&remote_name, &mut compat_reader)
                .await
                .map_err(|e| format!("Gagal mengunggah berkas ke FTP: {e}"))?;
        }
    }

    Ok(())
}

/// Unduh berkas remote dari FTP server ke lokal.
#[tauri::command]
pub async fn ftp_download(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
    remote_name: String,
    local_path: String,
) -> Result<(), String> {
    let client = manager.with_session_mut(session_id, |session| {
        let ftp_session = session
            .as_any_mut()
            .downcast_mut::<ftp::FtpSession>()
            .ok_or_else(|| "Sesi bukan bertipe FTP".to_string())?;
        Ok(ftp_session.client.clone())
    })?;

    let mut file = tokio::fs::File::create(&local_path)
        .await
        .map_err(|e| format!("Gagal membuat file lokal: {e}"))?;

    let mut client = client.lock().await;
    match &mut *client {
        ftp::FtpClient::Plain(c) => {
            let stream = c.retr_as_stream(&remote_name)
                .await
                .map_err(|e| format!("Gagal mendownload berkas: {e}"))?;
            let mut compat_reader = stream.compat();
            tokio::io::copy(&mut compat_reader, &mut file)
                .await
                .map_err(|e| format!("Gagal menulis data: {e}"))?;
            let reclaimed_stream = compat_reader.into_inner();
            c.finalize_retr_stream(reclaimed_stream)
                .await
                .map_err(|e| format!("Gagal menutup data transfer: {e}"))?;
        }
        ftp::FtpClient::Secure(c) => {
            let stream = c.retr_as_stream(&remote_name)
                .await
                .map_err(|e| format!("Gagal mendownload berkas: {e}"))?;
            let mut compat_reader = stream.compat();
            tokio::io::copy(&mut compat_reader, &mut file)
                .await
                .map_err(|e| format!("Gagal menulis data: {e}"))?;
            let reclaimed_stream = compat_reader.into_inner();
            c.finalize_retr_stream(reclaimed_stream)
                .await
                .map_err(|e| format!("Gagal menutup data transfer: {e}"))?;
        }
    }

    Ok(())
}

/// Hapus berkas atau folder di FTP server.
#[tauri::command]
pub async fn ftp_delete(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
    path: String,
    is_dir: bool,
) -> Result<(), String> {
    let client = manager.with_session_mut(session_id, |session| {
        let ftp_session = session
            .as_any_mut()
            .downcast_mut::<ftp::FtpSession>()
            .ok_or_else(|| "Sesi bukan bertipe FTP".to_string())?;
        Ok(ftp_session.client.clone())
    })?;

    let mut client = client.lock().await;
    
    if is_dir {
        client
            .rmdir(&path)
            .await
            .map_err(|e| format!("Gagal menghapus folder remote: {e}"))?;
    } else {
        client
            .rm(&path)
            .await
            .map_err(|e| format!("Gagal menghapus file remote: {e}"))?;
    }
    Ok(())
}

/// Buat direktori baru di FTP server.
#[tauri::command]
pub async fn ftp_mkdir(
    manager: State<'_, SessionManager>,
    session_id: SessionId,
    name: String,
) -> Result<(), String> {
    let client = manager.with_session_mut(session_id, |session| {
        let ftp_session = session
            .as_any_mut()
            .downcast_mut::<ftp::FtpSession>()
            .ok_or_else(|| "Sesi bukan bertipe FTP".to_string())?;
        Ok(ftp_session.client.clone())
    })?;

    let mut client = client.lock().await;
    client
        .mkdir(&name)
        .await
        .map_err(|e| format!("Gagal membuat folder remote: {e}"))?;
    Ok(())
}


/// Membaca daftar file/folder lokal.
#[tauri::command]
pub fn list_local_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = std::fs::read_dir(&path).map_err(|e| format!("Gagal membaca folder lokal: {e}"))?;
    let mut list = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let metadata = entry.metadata().ok();
            let is_dir = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);

            if let Some(name) = entry.file_name().to_str() {
                list.push(FileEntry { name: name.to_string(), is_dir, size });
            }
        }
    }

    // Sortir: folder di atas, berkas di bawah
    list.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(list)
}

/// Mengambil path folder HOME pengguna untuk memulai explorer lokal.
#[tauri::command]
pub fn get_local_home() -> Result<String, String> {
    std::env::var("HOME")
        .ok()
        .or_else(|| std::env::var("USERPROFILE").ok())
        .ok_or_else(|| "Gagal mendapatkan folder Home".to_string())
}

/// Hapus file atau folder lokal.
#[tauri::command]
pub fn delete_local_file(path: String, is_dir: bool) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if is_dir {
        std::fs::remove_dir_all(p).map_err(|e| format!("Gagal menghapus folder lokal: {e}"))?;
    } else {
        std::fs::remove_file(p).map_err(|e| format!("Gagal menghapus file lokal: {e}"))?;
    }
    Ok(())
}

/// Buat folder baru di komputer lokal.
#[tauri::command]
pub fn mkdir_local(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("Gagal membuat folder lokal: {e}"))?;
    Ok(())
}

/// Salin file atau folder di komputer lokal.
#[tauri::command]
pub fn copy_local_file(src: String, dest: String) -> Result<(), String> {
    let src_path = std::path::Path::new(&src);
    let dest_path = std::path::Path::new(&dest);
    if src_path.is_dir() {
        copy_dir_all(src_path, dest_path).map_err(|e| format!("Gagal menyalin folder lokal: {e}"))?;
    } else {
        std::fs::copy(src_path, dest_path).map_err(|e| format!("Gagal menyalin file lokal: {e}"))?;
    }
    Ok(())
}

fn copy_dir_all(src: &std::path::Path, dest: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dest)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dest.join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dest.join(entry.file_name()))?;
        }
    }
    Ok(())
}

// --- Helper Parser FTP List ---

fn parse_ftp_line(line: &str) -> Option<FileEntry> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }
    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if parts.len() < 4 {
        return None;
    }

    // Cek format UNIX (mis. drwxr-xr-x atau -rw-r--r--)
    let first = parts[0];
    if first.starts_with('-') || first.starts_with('d') || first.starts_with('l') {
        if parts.len() < 9 {
            return None;
        }
        let is_dir = first.starts_with('d');
        let size = parts[4].parse::<u64>().unwrap_or(0);
        let name = parts[8..].join(" ");
        return Some(FileEntry { name, is_dir, size });
    }

    // Cek format Windows IIS: 07-21-26  07:00AM       <DIR>          foldername
    if parts[2] == "<DIR>" {
        let name = parts[3..].join(" ");
        return Some(FileEntry { name, is_dir: true, size: 0 });
    } else if let Ok(size) = parts[2].parse::<u64>() {
        let name = parts[3..].join(" ");
        return Some(FileEntry { name, is_dir: false, size });
    }

    None
}

// --- Window Control Commands ---

#[tauri::command]
pub fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_toggle_maximize(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_is_maximized(window: tauri::Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

/// Deteksi baud rate serial secara otomatis dengan menguji rasio karakter ASCII & prompt valid.
#[tauri::command]
pub async fn detect_serial_baud_rate(port_name: String) -> Result<u32, String> {
    let rates = [38400u32, 9600, 115200, 57600, 19200, 4800];
    let mut best_rate = 38400u32;
    let mut best_score = -1.0f32;

    for &rate in &rates {
        let builder = tokio_serial::new(&port_name, rate).timeout(std::time::Duration::from_millis(150));
        if let Ok(mut stream) = tokio_serial::SerialStream::open(&builder) {
            use tokio::io::{AsyncReadExt, AsyncWriteExt};
            let _ = stream.write_all(b"\r\n\r\n").await;
            tokio::time::sleep(std::time::Duration::from_millis(80)).await;

            let mut buf = [0u8; 1024];
            if let Ok(Ok(n)) = tokio::time::timeout(std::time::Duration::from_millis(200), stream.read(&mut buf)).await {
                if n > 0 {
                    let printable_ascii = buf[..n]
                        .iter()
                        .filter(|&&b| (b >= 32 && b <= 126) || b == b'\r' || b == b'\n' || b == b'\t')
                        .count();
                    let has_newline_or_prompt = buf[..n]
                        .iter()
                        .any(|&b| b == b'\r' || b == b'\n' || b == b'>' || b == b'#' || b == b':' || b == b']');

                    let mut score = (printable_ascii as f32) / (n as f32);
                    if has_newline_or_prompt {
                        score += 0.3;
                    }

                    if score > best_score {
                        best_score = score;
                        best_rate = rate;
                    }
                }
            }
            drop(stream);
            tokio::time::sleep(std::time::Duration::from_millis(30)).await;
        }
    }

    if best_score > 0.4 {
        Ok(best_rate)
    } else {
        Ok(38400)
    }
}

/// Perbaiki izin port serial secara otomatis pada Linux (membuat udev rule + usermod + chmod + ModemManager ignore).
#[tauri::command]
pub async fn fix_serial_permissions() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        // Ambil user asli yang menjalankan app. pkexec menjalankan skrip sebagai root,
        // jadi $USER di dalam skrip = root; pakai PKEXEC_UID untuk pemetaan nama user asli.
        // Tanpa hardcode "diki" (D-27).
        let user = std::env::var("USER")
            .or_else(|_| std::env::var("LOGNAME"))
            .map_err(|_| "Tidak dapat menentukan user saat ini untuk usermod dialout".to_string())?;
        // D-27: izin serial dibatasi grup `dialout` (MODE=0660 GROUP=dialout),
        // BUKAN world-writable (0666). Perangkat serial tidak lagi bisa diakses
        // sembarang proses/pengguna lain di sistem.
        let cmd = format!(
            "usermod -aG dialout {user} 2>/dev/null; \
             echo 'SUBSYSTEM==\"tty\", KERNEL==\"ttyUSB[0-9]*|ttyACM[0-9]*\", MODE=\"0660\", GROUP=\"dialout\", ENV{{ID_MM_DEVICE_IGNORE}}=\"1\"' > /etc/udev/rules.d/99-remote-app-serial.rules; \
             udevadm control --reload-rules && udevadm trigger; \
             systemctl restart ModemManager 2>/dev/null || killall -9 ModemManager 2>/dev/null || true"
        );

        let output = std::process::Command::new("pkexec")
            .args(["sh", "-c", &cmd])
            .output()
            .map_err(|e| format!("Gagal menjalankan pkexec: {e}"))?;

        if !output.status.success() {
            let err_msg = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Gagal memperbarui izin serial: {err_msg}"));
        }
        Ok(())
    }
    #[cfg(not(target_os = "linux"))]
    {
        Ok(())
    }
}

/// Cek apakah pengguna saat ini sudah memiliki akses dialout/udev serial yang fix.
#[tauri::command]
pub fn check_dialout_permission() -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        let rule_exists = std::path::Path::new("/etc/udev/rules.d/99-remote-app-serial.rules").exists();
        let user_in_dialout = std::process::Command::new("groups")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("dialout"))
            .unwrap_or(false);

        let mut usb_ok = true;
        if let Ok(entries) = std::fs::read_dir("/dev") {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("ttyUSB") || name.starts_with("ttyACM") {
                    let path = entry.path();
                    if std::fs::OpenOptions::new().read(true).write(true).open(&path).is_err() {
                        usb_ok = false;
                        break;
                    }
                }
            }
        }

        Ok((rule_exists || user_in_dialout) && usb_ok)
    }
    #[cfg(not(target_os = "linux"))]
    {
        Ok(true)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fase 15 — Session Logging: buka file log di aplikasi default OS
// ─────────────────────────────────────────────────────────────────────────────

/// Membuka file log sesi di aplikasi teks default OS (xdg-open / open / start).
#[tauri::command]
pub async fn open_log_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| format!("Gagal membuka file log: {e}"))
}

// ─────────────────────────────────────────────────────────────────────────────
// Fase 16 — Snippet / Macro Manager
// ─────────────────────────────────────────────────────────────────────────────

use crate::snippet::{self, Snippet, SnippetDb};

/// Mengembalikan daftar snippet. Jika `vendor` diisi, tampilkan snippet vendor tsb + global.
#[tauri::command]
pub async fn snippet_list(
    db: State<'_, SnippetDb>,
    vendor: Option<String>,
) -> Result<Vec<Snippet>, String> {
    snippet::list_snippets(&db, vendor)
}

/// Menyimpan snippet baru ke database.
#[tauri::command]
pub async fn snippet_create(db: State<'_, SnippetDb>, s: Snippet) -> Result<(), String> {
    snippet::create_snippet(&db, &s)
}

/// Memperbarui snippet yang sudah ada.
#[tauri::command]
pub async fn snippet_update(db: State<'_, SnippetDb>, s: Snippet) -> Result<(), String> {
    snippet::update_snippet(&db, &s)
}

/// Menghapus snippet berdasarkan ID.
#[tauri::command]
pub async fn snippet_delete(db: State<'_, SnippetDb>, id: String) -> Result<(), String> {
    snippet::delete_snippet(&db, &id)
}
