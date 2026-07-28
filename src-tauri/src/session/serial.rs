//! Sesi Serial: Komunikasi asinkron via tokio-serial (D-5).
//! Menyalurkan keystroke dari UI ke serial port, dan sebaliknya.

use std::sync::Arc;
use base64::Engine;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;
use tokio_serial::{DataBits, FlowControl, Parity, SerialStream, StopBits};
use tauri::Emitter;

use super::{OutputChannel, Session, SessionId, SessionOutput};

enum Cmd {
    Write(Vec<u8>),
    Close,
}

pub struct SerialSession {
    tx: mpsc::UnboundedSender<Cmd>,
    task: tokio::task::JoinHandle<()>,
}

impl Session for SerialSession {
    fn write(&mut self, data: &[u8]) -> Result<(), String> {
        self.tx
            .send(Cmd::Write(data.to_vec()))
            .map_err(|_| "sesi Serial sudah tertutup".to_string())
    }

    fn resize(&mut self, _cols: u16, _rows: u16) -> Result<(), String> {
        // Serial console tidak mendukung konsep resize
        Ok(())
    }

    fn close(&mut self) -> Result<(), String> {
        let _ = self.tx.send(Cmd::Close);
        self.task.abort();
        Ok(())
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

pub async fn open(
    app: tauri::AppHandle,
    id: SessionId,
    port_name: String,
    baud_rate: u32,
    data_bits: u8,
    parity: String,
    stop_bits: u8,
    log_file_path: Option<String>,
    force_release: bool,
    output: OutputChannel,
) -> Result<SerialSession, String> {
    let mut builder = tokio_serial::new(&port_name, baud_rate);
    builder = builder.flow_control(FlowControl::None);

    let db = match data_bits {
        5 => DataBits::Five,
        6 => DataBits::Six,
        7 => DataBits::Seven,
        8 => DataBits::Eight,
        _ => DataBits::Eight,
    };
    builder = builder.data_bits(db);

    let par = match parity.to_lowercase().as_str() {
        "none" => Parity::None,
        "even" => Parity::Even,
        "odd" => Parity::Odd,
        _ => Parity::None,
    };
    builder = builder.parity(par);

    let sb = match stop_bits {
        1 => StopBits::One,
        2 => StopBits::Two,
        _ => StopBits::One,
    };
    builder = builder.stop_bits(sb);

    let stream_result = SerialStream::open(&builder);
    let stream = match stream_result {
        Ok(s) => s,
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("Device or resource busy") || err_str.contains("os error 16") || err_str.contains("busy") {
                // D-28: JANGAN auto force-kill. Force-release (fuser -k -9) bisa membunuh
                // proses lain yang tak terkait. Hanya lakukan bila user sudah konfirmasi
                // (`force_release`); jika belum, kembalikan error khusus agar UI menawarkan pilihan.
                #[cfg(target_os = "linux")]
                {
                    if !force_release {
                        return Err(format!(
                            "PORT_BUSY:{port_name}:Port serial sedang dikunci oleh proses lain. \
                             Force-release akan menghentikan paksa proses tersebut."
                        ));
                    }
                    let _ = std::process::Command::new("fuser")
                        .args(["-k", "-9", &port_name])
                        .output();
                    tokio::time::sleep(std::time::Duration::from_millis(250)).await;

                    if let Ok(s_retry) = SerialStream::open(&builder) {
                        s_retry
                    } else {
                        return Err(format!("Gagal membuka port {port_name}: Port serial masih terkunci setelah force-release."));
                    }
                }
                #[cfg(not(target_os = "linux"))]
                {
                    let _ = force_release;
                    return Err(format!("Gagal membuka port {port_name}: Port serial sedang dikunci oleh proses lain (Device Busy)."));
                }
            } else if err_str.contains("Permission denied") || err_str.contains("os error 13") {
                return Err(format!("Gagal membuka port {port_name}: Hak akses ditolak (Permission Denied). Klik tombol 'Fix Izin Dialout' atau jalankan 'sudo usermod -aG dialout $USER' di terminal."));
            } else {
                return Err(format!("Gagal membuka port serial {port_name}: {e}"));
            }
        }
    };
    let (mut reader, mut writer) = tokio::io::split(stream);

    // Kirim probe awal \r\n agar console perangkat (Cisco/MikroTik/Huawei/Linux) mencetak banner & prompt
    let _ = writer.write_all(b"\r\n").await;

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

    let (tx, mut rx) = mpsc::unbounded_channel::<Cmd>();
    let task = tokio::spawn(async move {
        let mut buf = [0u8; 4096];
        loop {
            tokio::select! {
                cmd = rx.recv() => match cmd {
                    Some(Cmd::Write(data)) => {
                        if writer.write_all(&data).await.is_err() { break; }
                    }
                    Some(Cmd::Close) | None => break,
                },
                n = reader.read(&mut buf) => match n {
                    Ok(0) | Err(_) => {
                        send(&output, id, b"\r\n[koneksi ditutup]\r\n");
                        break;
                    }
                    Ok(n) => {
                        let clean_data: Vec<u8> = buf[..n]
                            .iter()
                            .cloned()
                            .filter(|&b| (b >= 32 && b <= 126) || b == b'\r' || b == b'\n' || b == b'\t' || b == 0x1b)
                            .collect();
                        if !clean_data.is_empty() {
                            if let Some(ref file) = log_file {
                                if let Ok(mut f) = file.lock() {
                                    use std::io::Write;
                                    let _ = f.write_all(&clean_data);
                                }
                            }
                            send(&output, id, &clean_data);
                        }
                    }
                }
            }
        }
        
        // Kirim event penutupan sesi ke frontend untuk Auto-reconnect
        let _ = app.emit("session-terminated", id);
    });

    Ok(SerialSession { tx, task })
}

fn send(output: &OutputChannel, id: SessionId, data: &[u8]) {
    let data_b64 = base64::engine::general_purpose::STANDARD.encode(data);
    let _ = output.send(SessionOutput { session_id: id, data_b64 });
}
