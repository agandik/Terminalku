//! Sesi SSH via binary `ssh` sistem — untuk perangkat legacy yang hanya mendukung
//! algoritma lama (mis. diffie-hellman-group1-sha1, ssh-rsa).
//!
//! Alih-alih mengimplementasi ulang kripto lama, kita delegasikan ke OpenSSH
//! yang sudah terinstall di sistem, dengan opsi kompatibilitas diaktifkan.
//! PTY lokal dibuat via `portable-pty` agar karakter kontrol terminal berfungsi.

use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use base64::Engine;
use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use tauri::Emitter;
use tokio::sync::mpsc;

use super::{OutputChannel, Session, SessionId, SessionOutput};
use crate::session::ssh::{SshAuth, SshParams};

/// Perintah dari trait Session ke thread I/O.
enum Cmd {
    Write(Vec<u8>),
    Resize { cols: u16, rows: u16 },
    Close,
}

/// Handle sesi legacy SSH.
pub struct LegacySshSession {
    tx: mpsc::UnboundedSender<Cmd>,
    task: tokio::task::JoinHandle<()>,
    master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send>>>,
}

impl Session for LegacySshSession {
    fn write(&mut self, data: &[u8]) -> Result<(), String> {
        self.tx
            .send(Cmd::Write(data.to_vec()))
            .map_err(|_| "sesi SSH legacy sudah tertutup".to_string())
    }

    fn resize(&mut self, cols: u16, rows: u16) -> Result<(), String> {
        if let Ok(m) = self.master.lock() {
            let _ = m.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 });
        }
        Ok(())
    }

    fn close(&mut self) -> Result<(), String> {
        let _ = self.tx.send(Cmd::Close);
        if let Ok(mut c) = self.child.lock() {
            let _ = c.kill();
        }
        self.task.abort();
        Ok(())
    }

    fn as_any(&self) -> &dyn std::any::Any { self }
    fn as_any_mut(&mut self) -> &mut dyn std::any::Any { self }
}

/// Connect ke perangkat SSH legacy menggunakan binary `ssh` sistem.
pub async fn open(
    app: tauri::AppHandle,
    id: SessionId,
    params: SshParams,
    known_hosts_path: std::path::PathBuf,
    log_file_path: Option<String>,
    output: OutputChannel,
) -> Result<LegacySshSession, String> {
    // Ekstrak password untuk auto-fill saat prompt muncul
    let password = match &params.auth {
        SshAuth::Password(p) => Some(p.clone()),
        SshAuth::Key { .. } => None,
    };

    // Bangun perintah ssh dengan opsi kompatibilitas legacy.
    // portable_pty CommandBuilder::arg() memodifikasi in-place (tidak return self).
    let mut cmd = CommandBuilder::new("ssh");
    cmd.arg("-tt");
    // Verifikasi host key Trust-On-First-Use (D-25): host baru otomatis diterima
    // & dicatat, host key yang BERUBAH ditolak (peringatan MITM oleh OpenSSH).
    // Pakai file known_hosts milik app, bukan `~/.ssh/known_hosts` sistem.
    cmd.arg("-o"); cmd.arg("StrictHostKeyChecking=accept-new");
    cmd.arg("-o"); cmd.arg(format!("UserKnownHostsFile={}", known_hosts_path.display()));
    cmd.arg("-o"); cmd.arg(
        "KexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1,\
         diffie-hellman-group14-sha256,diffie-hellman-group-exchange-sha256",
    );
    cmd.arg("-o"); cmd.arg("HostKeyAlgorithms=+ssh-rsa,ssh-dss");
    cmd.arg("-o"); cmd.arg("Ciphers=+aes128-cbc,aes256-cbc,3des-cbc,aes128-ctr,aes256-ctr");
    cmd.arg("-o"); cmd.arg("PubkeyAcceptedAlgorithms=+ssh-rsa,ssh-dss");
    cmd.arg("-o"); cmd.arg("ConnectTimeout=30");
    cmd.arg("-o"); cmd.arg("LogLevel=ERROR");
    cmd.arg("-p"); cmd.arg(params.port.to_string());

    // Jika key-based auth, tambahkan path key
    if let SshAuth::Key { ref key_path, .. } = params.auth {
        cmd.arg("-i"); cmd.arg(key_path);
        cmd.arg("-o"); cmd.arg("PasswordAuthentication=no");
    }

    cmd.arg(format!("{}@{}", params.username, params.host));

    // Buat PTY pair
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| format!("Gagal membuat PTY: {e}"))?;

    // Jalankan ssh di slave PTY
    let child = pair.slave
        .spawn_command(cmd)
        .map_err(|e| format!("Gagal menjalankan ssh: {e}"))?;
    let child_arc: Arc<Mutex<Box<dyn portable_pty::Child + Send>>> = Arc::new(Mutex::new(child));

    // Simpan master PTY dalam Arc<Mutex<>> agar bisa di-resize dari mana pun
    let master_arc: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>> =
        Arc::new(Mutex::new(pair.master));

    // Ambil writer dari master PTY
    let pty_writer = master_arc
        .lock()
        .unwrap()
        .take_writer()
        .map_err(|e| format!("Gagal mengambil PTY writer: {e}"))?;
    let pty_writer = Arc::new(Mutex::new(pty_writer));

    // Ambil reader dari master PTY
    let mut pty_reader = master_arc
        .lock()
        .unwrap()
        .try_clone_reader()
        .map_err(|e| format!("Gagal mengambil PTY reader: {e}"))?;

    // Channel untuk menerima perintah dari UI (write/resize/close)
    let (tx, mut cmd_rx) = mpsc::unbounded_channel::<Cmd>();

    // Channel internal: thread reader -> tokio output task
    let (data_tx, mut data_rx) = mpsc::unbounded_channel::<Option<Vec<u8>>>();

    // --- Thread 1: Membaca output PTY + auto-fill password ---
    let writer_for_pw = pty_writer.clone();
    let data_tx_clone = data_tx;
    let password_clone = password;
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        // Jika tidak ada password, skip deteksi
        let mut password_sent = password_clone.is_none();
        let mut detect_buf: Vec<u8> = Vec::new();

        loop {
            match pty_reader.read(&mut buf) {
                Ok(0) | Err(_) => {
                    let _ = data_tx_clone.send(None); // EOF
                    break;
                }
                Ok(n) => {
                    let data = buf[..n].to_vec();

                    // Deteksi prompt password dan kirim otomatis
                    if !password_sent {
                        detect_buf.extend_from_slice(&data);
                        // Jaga buffer agar tidak tumbuh tak terbatas
                        if detect_buf.len() > 8192 {
                            detect_buf.drain(..4096);
                        }
                        let text = String::from_utf8_lossy(&detect_buf).to_lowercase();
                        // Berbagai format prompt password perangkat jaringan
                        if text.contains("password:")
                            || text.contains("password for")
                            || text.contains("'s password")
                        {
                            if let Some(ref pw) = password_clone {
                                if let Ok(mut w) = writer_for_pw.lock() {
                                    let _ = w.write_all(pw.as_bytes());
                                    let _ = w.write_all(b"\r");
                                }
                            }
                            password_sent = true;
                            detect_buf.clear();
                        }
                    }

                    let _ = data_tx_clone.send(Some(data));
                }
            }
        }
    });

    // --- Thread 2 (tokio task): Meneruskan perintah write/resize/close ke PTY ---
    let writer_for_cmds = pty_writer.clone();
    let master_for_resize = master_arc.clone();
    let child_for_cmds = child_arc.clone();
    tokio::spawn(async move {
        while let Some(cmd) = cmd_rx.recv().await {
            match cmd {
                Cmd::Write(data) => {
                    if let Ok(mut w) = writer_for_cmds.lock() {
                        let _ = w.write_all(&data);
                    }
                }
                Cmd::Resize { cols, rows } => {
                    if let Ok(m) = master_for_resize.lock() {
                        let _ = m.resize(PtySize {
                            rows,
                            cols,
                            pixel_width: 0,
                            pixel_height: 0,
                        });
                    }
                }
                Cmd::Close => {
                    if let Ok(mut c) = child_for_cmds.lock() {
                        let _ = c.kill();
                    }
                    break;
                }
            }
        }
    });

    // Persiapkan log file jika diminta
    let log_file = if let Some(path) = log_file_path {
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .ok()
            .map(|f| Arc::new(Mutex::new(f)))
    } else {
        None
    };

    // --- Tokio task utama: relay output dari PTY ke frontend ---
    let child_for_task = child_arc.clone();
    let task = tokio::spawn(async move {
        while let Some(maybe_data) = data_rx.recv().await {
            match maybe_data {
                None => {
                    send(&output, id, b"\r\n[koneksi ditutup]\r\n");
                    break;
                }
                Some(data) => {
                    if let Some(ref file) = log_file {
                        if let Ok(mut f) = file.lock() {
                            use std::io::Write as _;
                            let _ = f.write_all(&data);
                        }
                    }
                    send(&output, id, &data);
                }
            }
        }
        if let Ok(mut c) = child_for_task.lock() {
            let _ = c.kill();
        }
        let _ = app.emit("session-terminated", id);
    });

    Ok(LegacySshSession { tx, task, master: master_arc, child: child_arc })
}

fn send(output: &OutputChannel, id: SessionId, data: &[u8]) {
    let data_b64 = base64::engine::general_purpose::STANDARD.encode(data);
    let _ = output.send(SessionOutput { session_id: id, data_b64 });
}
