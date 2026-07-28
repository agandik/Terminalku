//! Manajemen sesi remote. Fase 0 hanya berisi loopback (echo lokal);
//! implementasi SSH/Telnet/Serial/FTP ditambahkan di fase berikutnya.

pub mod loopback;
pub mod local_pty;
pub mod ssh;
pub mod ssh_compat;
pub mod telnet;
pub mod serial;
pub mod ftp;

use std::collections::HashMap;
use std::sync::Mutex;

use serde::Serialize;
use tauri::ipc::Channel;

/// Identitas unik tiap sesi (tab).
pub type SessionId = u32;

/// Potongan byte output dari sebuah sesi menuju UI.
/// Byte dikirim mentah (base64) — UI/xterm.js yang men-decode, sesuai
/// aturan encoding di AGENTS.md (jangan decode paksa di Rust).
#[derive(Clone, Serialize)]
pub struct SessionOutput {
    pub session_id: SessionId,
    /// Byte output, di-encode base64 agar aman lewat IPC JSON.
    pub data_b64: String,
}

/// Kontrak umum semua jenis sesi. Semua fase protokol mengimplementasikan ini.
pub trait Session: Send {
    /// Tulis byte input (keystroke) dari UI ke koneksi.
    fn write(&mut self, data: &[u8]) -> Result<(), String>;
    /// Beri tahu koneksi ukuran terminal baru (SSH window_change, Telnet NAWS, dst).
    fn resize(&mut self, cols: u16, rows: u16) -> Result<(), String>;
    /// Tutup koneksi & bebaskan resource.
    fn close(&mut self) -> Result<(), String>;
    /// Memungkinkan downcasting dari dyn Session ke tipe konkrit.
    fn as_any(&self) -> &dyn std::any::Any;
    /// Memungkinkan downcasting mutabel dari dyn Session ke tipe konkrit.
    fn as_any_mut(&mut self) -> &mut dyn std::any::Any;
}

/// Menyimpan semua sesi aktif. Dibungkus Mutex agar aman dipakai lintas command.
#[derive(Default)]
pub struct SessionManager {
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    next_id: SessionId,
    sessions: HashMap<SessionId, Box<dyn Session>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// Daftarkan sesi baru (sinkron), kembalikan id-nya.
    pub fn insert(&self, make: impl FnOnce(SessionId) -> Box<dyn Session>) -> SessionId {
        let mut inner = self.inner.lock().unwrap();
        let id = inner.next_id;
        inner.next_id += 1;
        let session = make(id);
        inner.sessions.insert(id, session);
        id
    }

    /// Ambil id baru tanpa langsung menyisipkan sesi. Dipakai bila pembuatan
    /// sesi bersifat async (mis. SSH) dan id dibutuhkan lebih dulu untuk Channel.
    pub fn reserve_id(&self) -> SessionId {
        let mut inner = self.inner.lock().unwrap();
        let id = inner.next_id;
        inner.next_id += 1;
        id
    }

    /// Sisipkan sesi yang sudah jadi dengan id hasil `reserve_id`.
    pub fn insert_ready(&self, id: SessionId, session: Box<dyn Session>) {
        let mut inner = self.inner.lock().unwrap();
        inner.sessions.insert(id, session);
    }

    pub fn write(&self, id: SessionId, data: &[u8]) -> Result<(), String> {
        let mut inner = self.inner.lock().unwrap();
        inner
            .sessions
            .get_mut(&id)
            .ok_or_else(|| format!("sesi {id} tidak ditemukan"))?
            .write(data)
    }

    pub fn resize(&self, id: SessionId, cols: u16, rows: u16) -> Result<(), String> {
        let mut inner = self.inner.lock().unwrap();
        inner
            .sessions
            .get_mut(&id)
            .ok_or_else(|| format!("sesi {id} tidak ditemukan"))?
            .resize(cols, rows)
    }

    pub fn close(&self, id: SessionId) -> Result<(), String> {
        let mut inner = self.inner.lock().unwrap();
        if let Some(mut session) = inner.sessions.remove(&id) {
            session.close()?;
        }
        Ok(())
    }

    /// Eksekusi operasi mutabel pada sesi tertentu dengan meminjam sesi secara aman.
    pub fn with_session_mut<R>(&self, id: SessionId, f: impl FnOnce(&mut dyn Session) -> Result<R, String>) -> Result<R, String> {
        let mut inner = self.inner.lock().unwrap();
        let session = inner.sessions.get_mut(&id)
            .ok_or_else(|| format!("Sesi {id} tidak ditemukan"))?;
        f(session.as_mut())
    }
}

/// Channel output milik satu sesi (dipegang implementasi Session untuk push data ke UI).
pub type OutputChannel = Channel<SessionOutput>;
