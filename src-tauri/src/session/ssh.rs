//! Sesi SSH via russh (D-3). Model: koneksi async dijalankan di satu tokio task
//! (event loop). Trait Session yang sinkron hanya mengirim perintah lewat mpsc,
//! jadi write/resize/close tidak pernah blocking di UI thread.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use base64::Engine;
use russh::client::{self, Handle};
use russh::keys::known_hosts::{check_known_hosts_path, learn_known_hosts_path};
use russh::keys::{HashAlg, PrivateKeyWithHashAlg};
use russh::{ChannelMsg, Disconnect};
use tokio::sync::mpsc;
use tauri::Emitter;

use super::{OutputChannel, Session, SessionId, SessionOutput};

/// Parameter koneksi SSH dari UI.
#[derive(Clone)]
pub struct SshParams {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth: SshAuth,
}

#[derive(Clone)]
pub enum SshAuth {
    Password(String),
    /// path private key + passphrase opsional
    Key { key_path: String, passphrase: Option<String> },
}

/// Perintah dari trait Session ke event loop.
enum Cmd {
    Write(Vec<u8>),
    Resize { cols: u16, rows: u16 },
    Close,
}

/// Handle sesi yang disimpan SessionManager.
pub struct SshSession {
    tx: mpsc::UnboundedSender<Cmd>,
    task: tokio::task::JoinHandle<()>,
}

impl Session for SshSession {
    fn write(&mut self, data: &[u8]) -> Result<(), String> {
        self.tx
            .send(Cmd::Write(data.to_vec()))
            .map_err(|_| "sesi SSH sudah tertutup".to_string())
    }

    fn resize(&mut self, cols: u16, rows: u16) -> Result<(), String> {
        // Abaikan error bila loop sudah berhenti; resize bukan operasi kritis.
        let _ = self.tx.send(Cmd::Resize { cols, rows });
        Ok(())
    }

    fn close(&mut self) -> Result<(), String> {
        let _ = self.tx.send(Cmd::Close);
        Ok(())
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

/// Hasil verifikasi host key untuk dilaporkan ke UI (Fase 11, D-25).
#[derive(Clone, Copy, PartialEq)]
enum HostKeyStatus {
    /// Sudah tercatat & cocok dengan known_hosts.
    Known,
    /// Host baru — otomatis dipercaya & disimpan (Trust-On-First-Use).
    LearnedNew,
}

/// Handler client russh dengan verifikasi host key Trust-On-First-Use (D-25).
/// - Host baru → simpan ke known_hosts app, lanjut connect (accept-new).
/// - Host key BERUBAH → tolak koneksi (kemungkinan MITM).
/// known_hosts disimpan di file terpisah milik app (bukan `~/.ssh/known_hosts`)
/// agar tidak mencampuri konfigurasi SSH sistem pengguna.
struct ClientHandler {
    host: String,
    port: u16,
    known_hosts_path: PathBuf,
    /// Fingerprint + status diisi saat verifikasi, dibaca setelah connect.
    fingerprint: Arc<Mutex<Option<String>>>,
    status: Arc<Mutex<Option<HostKeyStatus>>>,
}

impl client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &russh::keys::ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        // Catat fingerprint SHA256 untuk ditampilkan ke UI.
        let fp = server_public_key.fingerprint(HashAlg::Sha256).to_string();
        *self.fingerprint.lock().unwrap() = Some(fp);

        match check_known_hosts_path(
            &self.host,
            self.port,
            server_public_key,
            &self.known_hosts_path,
        ) {
            // Sudah dikenal & cocok.
            Ok(true) => {
                *self.status.lock().unwrap() = Some(HostKeyStatus::Known);
                Ok(true)
            }
            // Belum tercatat → Trust-On-First-Use: simpan lalu terima.
            Ok(false) => {
                learn_known_hosts_path(
                    &self.host,
                    self.port,
                    server_public_key,
                    &self.known_hosts_path,
                )
                .map_err(|_| russh::Error::UnknownKey)?;
                *self.status.lock().unwrap() = Some(HostKeyStatus::LearnedNew);
                Ok(true)
            }
            // Host key BERUBAH (Error::KeyChanged) atau error baca → tolak keras.
            Err(_) => Ok(false),
        }
    }
}

/// Connect + autentikasi + buka PTY shell. Dipanggil dari command async.
/// Mengembalikan handle siap pakai; error dikembalikan apa adanya agar UI
/// bisa menampilkan "auth gagal", "connection refused", dst.
pub async fn open(
    app: tauri::AppHandle,
    id: SessionId,
    params: SshParams,
    known_hosts_path: PathBuf,
    log_file_path: Option<String>,
    output: OutputChannel,
) -> Result<SshSession, String> {
    let config = Arc::new(client::Config {
        inactivity_timeout: Some(Duration::from_secs(3600)),
        keepalive_interval: Some(Duration::from_secs(30)),
        ..Default::default()
    });

    // Verifikasi host key Trust-On-First-Use (D-25).
    let fingerprint = Arc::new(Mutex::new(None));
    let hostkey_status = Arc::new(Mutex::new(None));
    let handler = ClientHandler {
        host: params.host.clone(),
        port: params.port,
        known_hosts_path,
        fingerprint: fingerprint.clone(),
        status: hostkey_status.clone(),
    };

    let mut handle: Handle<ClientHandler> =
        client::connect(config, (params.host.as_str(), params.port), handler)
            .await
            .map_err(|e| {
                // Bila handler menolak (host key berubah), sampaikan pesan MITM yang jelas.
                if hostkey_status.lock().unwrap().is_none() && fingerprint.lock().unwrap().is_some() {
                    let fp = fingerprint.lock().unwrap().clone().unwrap_or_default();
                    format!(
                        "koneksi ditolak: HOST KEY BERBEDA dari yang tersimpan untuk {}:{} \
                         (kemungkinan serangan MITM). Fingerprint server sekarang: {}. \
                         Bila perubahan ini memang sah, hapus entri host tersebut dari known_hosts app.",
                        params.host, params.port, fp
                    )
                } else {
                    format!("koneksi gagal: {e}")
                }
            })?;

    // Banner status host key ke terminal (hanya bila host baru dipelajari).
    if let Some(HostKeyStatus::LearnedNew) = *hostkey_status.lock().unwrap() {
        let fp = fingerprint.lock().unwrap().clone().unwrap_or_default();
        let banner = format!(
            "\r\n[host key baru dipercaya & disimpan] {}:{}\r\n[fingerprint] {}\r\n",
            params.host, params.port, fp
        );
        send(&output, id, banner.as_bytes());
    }

    // --- autentikasi ---
    let auth_ok = match params.auth {
        SshAuth::Password(pw) => handle
            .authenticate_password(&params.username, pw)
            .await
            .map_err(|e| format!("auth error: {e}"))?
            .success(),
        SshAuth::Key { key_path, passphrase } => {
            let key = russh::keys::load_secret_key(&key_path, passphrase.as_deref())
                .map_err(|e| format!("gagal baca private key: {e}"))?;
            let hash = handle
                .best_supported_rsa_hash()
                .await
                .map_err(|e| format!("auth error: {e}"))?
                .flatten();
            handle
                .authenticate_publickey(
                    &params.username,
                    PrivateKeyWithHashAlg::new(Arc::new(key), hash),
                )
                .await
                .map_err(|e| format!("auth error: {e}"))?
                .success()
        }
    };
    if !auth_ok {
        return Err("autentikasi ditolak (cek user/password atau key)".to_string());
    }

    // --- buka channel + PTY + shell ---
    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| format!("gagal buka channel: {e}"))?;
    channel
        .request_pty(false, "xterm-256color", 80, 24, 0, 0, &[])
        .await
        .map_err(|e| format!("gagal request PTY: {e}"))?;
    channel
        .request_shell(true)
        .await
        .map_err(|e| format!("gagal request shell: {e}"))?;

    // --- open log file if requested ---
    let log_file = if let Some(path) = log_file_path {
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .ok()
            .map(|f| Arc::new(std::sync::Mutex::new(f)))
    } else {
        None
    };

    // --- spawn event loop ---
    let (tx, mut rx) = mpsc::unbounded_channel::<Cmd>();
    let task = tokio::spawn(async move {
        loop {
            tokio::select! {
                cmd = rx.recv() => match cmd {
                    Some(Cmd::Write(data)) => {
                        if channel.data(&data[..]).await.is_err() { break; }
                    }
                    Some(Cmd::Resize { cols, rows }) => {
                        let _ = channel.window_change(cols as u32, rows as u32, 0, 0).await;
                    }
                    Some(Cmd::Close) | None => break,
                },
                msg = channel.wait() => match msg {
                    Some(ChannelMsg::Data { data }) => {
                        if let Some(ref file) = log_file {
                            if let Ok(mut f) = file.lock() {
                                use std::io::Write;
                                let _ = f.write_all(&data);
                            }
                        }
                        send(&output, id, &data);
                    }
                    Some(ChannelMsg::ExtendedData { data, .. }) => {
                        if let Some(ref file) = log_file {
                            if let Ok(mut f) = file.lock() {
                                use std::io::Write;
                                let _ = f.write_all(&data);
                            }
                        }
                        send(&output, id, &data);
                    }
                    Some(ChannelMsg::Eof) | Some(ChannelMsg::Close) | None => {
                        send(&output, id, b"\r\n[koneksi ditutup]\r\n");
                        break;
                    }
                    _ => {}
                },
            }
        }
        let _ = handle
            .disconnect(Disconnect::ByApplication, "", "")
            .await;
        
        // Kirim event penutupan sesi ke frontend untuk Auto-reconnect
        let _ = app.emit("session-terminated", id);
    });

    Ok(SshSession { tx, task })
}

fn send(output: &OutputChannel, id: SessionId, data: &[u8]) {
    let data_b64 = base64::engine::general_purpose::STANDARD.encode(data);
    let _ = output.send(SessionOutput { session_id: id, data_b64 });
}
