//! Sesi Telnet: TCP mentah + penanganan negosiasi opsi IAC (RFC 854/1073/1091) + Auto-Expect Login Handler.
//! Byte data dilewatkan apa adanya ke terminal; sekuens IAC diintersepsi.

use std::sync::Arc;
use base64::Engine;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::tcp::OwnedWriteHalf;
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tauri::Emitter;

use super::{OutputChannel, Session, SessionId, SessionOutput};

// --- konstanta protokol Telnet ---
const IAC: u8 = 255;
const DONT: u8 = 254;
const DO: u8 = 253;
const WONT: u8 = 252;
const WILL: u8 = 251;
const SB: u8 = 250; // subnegotiation begin
const SE: u8 = 240; // subnegotiation end

const OPT_ECHO: u8 = 1;
const OPT_SGA: u8 = 3; // suppress go-ahead
const OPT_TTYPE: u8 = 24; // terminal type
const OPT_NAWS: u8 = 31; // negotiate about window size

enum Cmd {
    Write(Vec<u8>),
    Resize { cols: u16, rows: u16 },
    Close,
}

pub struct TelnetSession {
    tx: mpsc::UnboundedSender<Cmd>,
    task: tokio::task::JoinHandle<()>,
}

impl Session for TelnetSession {
    fn write(&mut self, data: &[u8]) -> Result<(), String> {
        self.tx
            .send(Cmd::Write(data.to_vec()))
            .map_err(|_| "sesi Telnet sudah tertutup".to_string())
    }

    fn resize(&mut self, cols: u16, rows: u16) -> Result<(), String> {
        let _ = self.tx.send(Cmd::Resize { cols, rows });
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

enum AutoExpectState {
    WaitingUser,
    WaitingPass,
    Done,
}

pub async fn open(
    app: tauri::AppHandle,
    id: SessionId,
    host: String,
    port: u16,
    username: Option<String>,
    password: Option<String>,
    log_file_path: Option<String>,
    output: OutputChannel,
) -> Result<TelnetSession, String> {
    let stream = TcpStream::connect((host.as_str(), port))
        .await
        .map_err(|e| format!("koneksi Telnet gagal: {e}"))?;
    stream.set_nodelay(true).ok();
    let (mut reader, mut writer) = stream.into_split();

    // Negosiasi awal proaktif: kita mau server ECHO + SGA, dan kita WILL NAWS.
    let hello = [
        IAC, DO, OPT_SGA,
        IAC, DO, OPT_ECHO,
        IAC, WILL, OPT_NAWS,
    ];
    writer
        .write_all(&hello)
        .await
        .map_err(|e| format!("gagal negosiasi awal: {e}"))?;

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

    let user_str = username.unwrap_or_default();
    let pass_str = password.unwrap_or_default();

    let (tx, mut rx) = mpsc::unbounded_channel::<Cmd>();
    let task = tokio::spawn(async move {
        let mut parser = IacParser::new();
        let mut buf = [0u8; 4096];

        let mut auto_expect = if !user_str.is_empty() || !pass_str.is_empty() {
            AutoExpectState::WaitingUser
        } else {
            AutoExpectState::Done
        };

        let mut text_acc = String::new();

        loop {
            tokio::select! {
                cmd = rx.recv() => match cmd {
                    Some(Cmd::Write(data)) => {
                        // Byte 0xFF pada input harus di-escape jadi 0xFF 0xFF.
                        let escaped = escape_iac(&data);
                        if writer.write_all(&escaped).await.is_err() { break; }
                    }
                    Some(Cmd::Resize { cols, rows }) => {
                        let _ = send_naws(&mut writer, cols, rows).await;
                    }
                    Some(Cmd::Close) | None => break,
                },
                n = reader.read(&mut buf) => match n {
                    Ok(0) | Err(_) => {
                        send(&output, id, b"\r\n[koneksi ditutup]\r\n");
                        break;
                    }
                    Ok(n) => {
                        let (data, replies) = parser.feed(&buf[..n]);
                        if !data.is_empty() {
                            if let Some(ref file) = log_file {
                                if let Ok(mut f) = file.lock() {
                                    use std::io::Write;
                                    let _ = f.write_all(&data);
                                }
                            }
                            send(&output, id, &data);

                            // --- Auto-Expect Login Handler ---
                            if let Ok(text_chunk) = std::str::from_utf8(&data) {
                                match auto_expect {
                                    AutoExpectState::WaitingUser => {
                                        text_acc.push_str(text_chunk);
                                        if text_acc.len() > 2048 {
                                            let drain_to = text_acc.len() - 1024;
                                            text_acc.drain(..drain_to);
                                        }
                                        let lower = text_acc.to_lowercase();
                                        if lower.contains("username:") || lower.contains("login:") || lower.contains("user:") || lower.ends_with("login: ") || lower.ends_with("username: ") {
                                            if !user_str.is_empty() {
                                                let mut payload = user_str.as_bytes().to_vec();
                                                payload.push(b'\r');
                                                let escaped = escape_iac(&payload);
                                                let _ = writer.write_all(&escaped).await;
                                            } else {
                                                let _ = writer.write_all(&[b'\r']).await;
                                            }
                                            text_acc.clear();
                                            auto_expect = AutoExpectState::WaitingPass;
                                        } else if lower.contains("password:") || lower.contains("pass:") {
                                            if !pass_str.is_empty() {
                                                let mut payload = pass_str.as_bytes().to_vec();
                                                payload.push(b'\r');
                                                let escaped = escape_iac(&payload);
                                                let _ = writer.write_all(&escaped).await;
                                            }
                                            text_acc.clear();
                                            auto_expect = AutoExpectState::Done;
                                        }
                                    }
                                    AutoExpectState::WaitingPass => {
                                        text_acc.push_str(text_chunk);
                                        if text_acc.len() > 2048 {
                                            let drain_to = text_acc.len() - 1024;
                                            text_acc.drain(..drain_to);
                                        }
                                        let lower = text_acc.to_lowercase();
                                        if lower.contains("password:") || lower.contains("pass:") || lower.ends_with("password: ") {
                                            if !pass_str.is_empty() {
                                                let mut payload = pass_str.as_bytes().to_vec();
                                                payload.push(b'\r');
                                                let escaped = escape_iac(&payload);
                                                let _ = writer.write_all(&escaped).await;
                                            }
                                            text_acc.clear();
                                            auto_expect = AutoExpectState::Done;
                                        }
                                    }
                                    AutoExpectState::Done => {}
                                }
                            }
                        }
                        if !replies.is_empty() {
                            if writer.write_all(&replies).await.is_err() { break; }
                        }
                    }
                },
            }
        }
        
        // Kirim event penutupan sesi ke frontend untuk Auto-reconnect
        let _ = app.emit("session-terminated", id);
    });

    Ok(TelnetSession { tx, task })
}

/// Kirim ukuran window via subnegosiasi NAWS.
async fn send_naws(writer: &mut OwnedWriteHalf, cols: u16, rows: u16) -> std::io::Result<()> {
    let (cw, ch) = (cols.to_be_bytes(), rows.to_be_bytes());
    // Byte di dalam subneg juga harus di-escape bila bernilai 0xFF.
    let mut msg = vec![IAC, SB, OPT_NAWS];
    for &b in &[cw[0], cw[1], ch[0], ch[1]] {
        msg.push(b);
        if b == IAC { msg.push(IAC); }
    }
    msg.extend_from_slice(&[IAC, SE]);
    writer.write_all(&msg).await
}

fn escape_iac(data: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(data.len());
    for &b in data {
        out.push(b);
        if b == IAC { out.push(IAC); }
    }
    out
}

/// State machine parser IAC. `feed` mengembalikan (data_bersih, balasan_negosiasi).
struct IacParser {
    state: State,
    /// opsi yang sudah kita setujui (hindari loop balasan).
    negotiated: std::collections::HashSet<(u8, u8)>,
}

enum State {
    Data,
    Iac,
    Negotiate(u8),        // WILL/WONT/DO/DONT diterima, menunggu kode opsi
    Subneg,               // di dalam SB … SE
    SubnegIac,            // IAC di dalam subneg (cek SE)
}

impl IacParser {
    fn new() -> Self {
        Self { state: State::Data, negotiated: std::collections::HashSet::new() }
    }

    fn feed(&mut self, input: &[u8]) -> (Vec<u8>, Vec<u8>) {
        let mut data = Vec::with_capacity(input.len());
        let mut reply = Vec::new();
        for &b in input {
            match self.state {
                State::Data => {
                    if b == IAC { self.state = State::Iac; } else { data.push(b); }
                }
                State::Iac => match b {
                    IAC => { data.push(IAC); self.state = State::Data; } // 0xFF ter-escape
                    WILL | WONT | DO | DONT => self.state = State::Negotiate(b),
                    SB => self.state = State::Subneg,
                    _ => self.state = State::Data, // perintah lain (GA, NOP, dll) diabaikan
                },
                State::Negotiate(verb) => {
                    self.respond(verb, b, &mut reply);
                    self.state = State::Data;
                }
                State::Subneg => {
                    if b == IAC { self.state = State::SubnegIac; }
                    // isi subneg diabaikan (mis. TTYPE request); cukup tunggu SE.
                }
                State::SubnegIac => {
                    // hanya IAC SE yang mengakhiri; sisanya tetap di subneg.
                    self.state = if b == SE { State::Data } else { State::Subneg };
                }
            }
        }
        (data, reply)
    }

    /// Kebijakan klien terminal interaktif. Balas sekali per opsi agar tak loop.
    fn respond(&mut self, verb: u8, opt: u8, reply: &mut Vec<u8>) {
        let key = (verb, opt);
        if !self.negotiated.insert(key) {
            return; // sudah pernah dibalas
        }
        match (verb, opt) {
            // Server bersedia ECHO / SGA → kita setuju (DO).
            (WILL, OPT_ECHO) => reply.extend_from_slice(&[IAC, DO, OPT_ECHO]),
            (WILL, OPT_SGA) => reply.extend_from_slice(&[IAC, DO, OPT_SGA]),
            // Server minta kita SGA → kita bersedia.
            (DO, OPT_SGA) => reply.extend_from_slice(&[IAC, WILL, OPT_SGA]),
            // Server minta window size / terminal type → kita dukung NAWS, tolak TTYPE.
            (DO, OPT_NAWS) => reply.extend_from_slice(&[IAC, WILL, OPT_NAWS]),
            (DO, OPT_TTYPE) => reply.extend_from_slice(&[IAC, WONT, OPT_TTYPE]),
            // Server minta kita ECHO → kita tidak (server yang echo).
            (DO, OPT_ECHO) => reply.extend_from_slice(&[IAC, WONT, OPT_ECHO]),
            // Opsi lain: tolak dengan sopan agar tak menggantung.
            (WILL, o) => reply.extend_from_slice(&[IAC, DONT, o]),
            (DO, o) => reply.extend_from_slice(&[IAC, WONT, o]),
            // WONT/DONT tak perlu balasan.
            _ => {}
        }
    }
}

fn send(output: &OutputChannel, id: SessionId, data: &[u8]) {
    let data_b64 = base64::engine::general_purpose::STANDARD.encode(data);
    let _ = output.send(SessionOutput { session_id: id, data_b64 });
}
