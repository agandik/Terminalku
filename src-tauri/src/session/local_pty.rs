//! Sesi terminal lokal: menjalankan shell sistem ($SHELL atau /bin/bash)
//! menggunakan portable-pty sebagai pseudo-terminal penuh (xterm-256color).
//! Byte I/O diteruskan ke UI persis seperti sesi SSH/Telnet.

use std::io::{Read, Write};
use std::thread;

use base64::Engine;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};

use super::{OutputChannel, Session, SessionId, SessionOutput};

pub struct LocalPtySession {
    /// id sesi (dipakai untuk identifikasi, prefiks _ agar tidak picu dead_code warning).
    _id: SessionId,
    /// Writer untuk mengirim keystroke ke shell.
    writer: Box<dyn Write + Send>,
    /// Master PTY disimpan agar bisa di-resize & tetap hidup selama sesi aktif.
    master: Box<dyn portable_pty::MasterPty + Send>,
    /// Handle child process; drop-nya akan mengakhiri proses shell.
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

impl LocalPtySession {
    /// Buka sesi PTY lokal. Langsung spawn thread pembaca output.
    pub fn new(
        id: SessionId,
        output: OutputChannel,
        cols: u16,
        rows: u16,
    ) -> Result<Self, String> {
        let pty_system = NativePtySystem::default();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Gagal membuka PTY lokal: {e}"))?;

        // Deteksi shell default dari env; fallback ke /bin/bash
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        let mut cmd = CommandBuilder::new(&shell);
        // Pastikan terminal identifier diset agar program seperti htop / vim bekerja
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Gagal menjalankan shell '{shell}': {e}"))?;

        // Reader diclone sebelum writer di-take agar keduanya bisa dipakai
        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Gagal membuat reader PTY: {e}"))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Gagal membuat writer PTY: {e}"))?;

        // Thread terpisah: terus baca output PTY → kirim ke UI via Channel
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let data_b64 =
                            base64::engine::general_purpose::STANDARD.encode(&buf[..n]);
                        // Abaikan error bila channel sudah ditutup (tab sudah ditutup)
                        let _ = output.send(SessionOutput {
                            session_id: id,
                            data_b64,
                        });
                    }
                }
            }
        });

        Ok(Self {
            _id: id,
            writer,
            master: pair.master,
            _child: child,
        })
    }
}

impl Session for LocalPtySession {
    fn write(&mut self, data: &[u8]) -> Result<(), String> {
        self.writer
            .write_all(data)
            .map_err(|e| format!("Gagal menulis ke PTY lokal: {e}"))
    }

    fn resize(&mut self, cols: u16, rows: u16) -> Result<(), String> {
        self.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Gagal resize PTY lokal: {e}"))
    }

    fn close(&mut self) -> Result<(), String> {
        // Kirim sinyal EOF ke shell (ctrl-d) agar shell keluar dengan bersih;
        // jika gagal tidak masalah — _child akan di-drop dan OS membersihkan.
        let _ = self.writer.write_all(b"\x04");
        Ok(())
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}
