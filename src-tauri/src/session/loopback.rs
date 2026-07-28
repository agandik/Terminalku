//! Sesi loopback untuk Fase 0: apa pun yang diketik user dikirim balik
//! sebagai output (echo). Berguna untuk memverifikasi pipa
//! UI ⇄ command ⇄ Channel bekerja sebelum protokol asli dipasang.

use base64::Engine;

use super::{OutputChannel, Session, SessionId, SessionOutput};

pub struct LoopbackSession {
    id: SessionId,
    output: OutputChannel,
}

impl LoopbackSession {
    pub fn new(id: SessionId, output: OutputChannel) -> Self {
        // Sapaan awal supaya terminal jelas terhubung.
        let banner = b"[loopback] Fase 0 siap. Ketik sesuatu; teks akan di-echo.\r\n";
        let _ = send(&output, id, banner);
        Self { id, output }
    }
}

impl Session for LoopbackSession {
    fn write(&mut self, data: &[u8]) -> Result<(), String> {
        // Echo balik. Ganti CR menjadi CRLF agar Enter tampil rapi di xterm.
        let mut echoed = Vec::with_capacity(data.len());
        for &b in data {
            if b == b'\r' {
                echoed.extend_from_slice(b"\r\n");
            } else {
                echoed.push(b);
            }
        }
        send(&self.output, self.id, &echoed)
    }

    fn resize(&mut self, _cols: u16, _rows: u16) -> Result<(), String> {
        // Loopback tak peduli ukuran; no-op.
        Ok(())
    }

    fn close(&mut self) -> Result<(), String> {
        Ok(())
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

fn send(output: &OutputChannel, id: SessionId, data: &[u8]) -> Result<(), String> {
    let data_b64 = base64::engine::general_purpose::STANDARD.encode(data);
    output
        .send(SessionOutput {
            session_id: id,
            data_b64,
        })
        .map_err(|e| e.to_string())
}
