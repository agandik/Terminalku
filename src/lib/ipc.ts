// Wrapper typed di atas Tauri IPC. Semua komunikasi ke backend lewat sini
// agar nama command & bentuk argumen terpusat di satu tempat.

import { invoke, Channel } from "@tauri-apps/api/core";
import type { SessionId, SessionOutput, Profile, FileEntry, Snippet } from "./types";

// --- base64 helpers (byte mentah ⇄ string) ---
// Byte dilewatkan mentah; xterm.js yang men-decode ke teks.
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Buka sesi loopback (Fase 0). `onOutput` dipanggil tiap ada byte dari backend.
 * Mengembalikan session_id.
 */
export async function openLoopback(
  onOutput: (bytes: Uint8Array) => void,
): Promise<SessionId> {
  const output = new Channel<SessionOutput>();
  output.onmessage = (msg) => onOutput(base64ToBytes(msg.data_b64));
  return invoke<SessionId>("session_open_loopback", { output });
}

/**
 * Buka sesi terminal lokal (shell sistem Ubuntu/Linux).
 * Shell yang digunakan diambil dari $SHELL; fallback ke /bin/bash.
 * `cols` dan `rows` adalah ukuran PTY awal (disinkronkan saat xterm.js mount).
 */
export async function openLocalTerminal(
  onOutput: (bytes: Uint8Array) => void,
  cols = 80,
  rows = 24,
): Promise<SessionId> {
  const output = new Channel<SessionOutput>();
  output.onmessage = (msg) => onOutput(base64ToBytes(msg.data_b64));
  return invoke<SessionId>("session_open_local", { output, cols, rows });
}

/** Parameter koneksi SSH dari form. */
export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  keyPath?: string;
  passphrase?: string;
}

/**
 * Buka sesi SSH (FR-2). `onOutput` menerima byte stream dari server.
 * Promise reject dengan pesan error bila connect/auth gagal.
 */
export async function openSsh(
  cfg: SshConfig,
  onOutput: (bytes: Uint8Array) => void,
  enableLogging = false,
): Promise<SessionId> {
  const output = new Channel<SessionOutput>();
  output.onmessage = (msg) => onOutput(base64ToBytes(msg.data_b64));
  return invoke<SessionId>("session_open_ssh", {
    output,
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: cfg.password ?? null,
    keyPath: cfg.keyPath ?? null,
    passphrase: cfg.passphrase ?? null,
    enableLogging,
  });
}

/**
 * Buka sesi Telnet (FR-3). `onOutput` menerima byte stream dari server.
 */
export async function openTelnet(
  host: string,
  port: number,
  onOutput: (bytes: Uint8Array) => void,
  enableLogging = false,
  username?: string,
  password?: string,
): Promise<SessionId> {
  const output = new Channel<SessionOutput>();
  output.onmessage = (msg) => onOutput(base64ToBytes(msg.data_b64));
  return invoke<SessionId>("session_open_telnet", {
    output,
    host,
    port,
    username: username ?? null,
    password: password ?? null,
    enableLogging,
  });
}

/** Kirim byte keystroke ke sesi. */
export function sessionWrite(sessionId: SessionId, bytes: Uint8Array): Promise<void> {
  return invoke("session_write", { sessionId, dataB64: bytesToBase64(bytes) });
}

/** Beri tahu backend ukuran terminal baru. */
export function sessionResize(sessionId: SessionId, cols: number, rows: number): Promise<void> {
  return invoke("session_resize", { sessionId, cols, rows });
}

/** Tutup sesi. */
export function sessionClose(sessionId: SessionId): Promise<void> {
  return invoke("session_close", { sessionId });
}

// --- CRUD Profil & Sesi Satu-Klik ---

/** Ambil semua profil koneksi dari SQLite. */
export function listProfiles(): Promise<Profile[]> {
  return invoke<Profile[]>("profile_list");
}

/** Buat profil koneksi baru. */
export function createProfile(profile: Profile, password?: string): Promise<void> {
  return invoke("profile_create", { profile, password: password || null });
}

/** Update profil koneksi yang sudah ada. */
export function updateProfile(profile: Profile, password?: string): Promise<void> {
  return invoke("profile_update", { profile, password: password !== undefined ? password : null });
}

/** Hapus profil koneksi. */
export function deleteProfile(id: string): Promise<void> {
  return invoke("profile_delete", { id });
}

/** Buka koneksi langsung dari profil (sekali klik). */
export function openSessionFromProfile(
  profileId: string,
  onOutput: (bytes: Uint8Array) => void,
  enableLogging = false,
): Promise<SessionId> {
  const output = new Channel<SessionOutput>();
  output.onmessage = (msg) => onOutput(base64ToBytes(msg.data_b64));
  return invoke<SessionId>("session_open_from_profile", { profileId, output, enableLogging });
}

// --- Serial Port Helpers ---

export interface SerialPortDetail {
  port_name: string;
  description: string | null;
}

/** Deteksi port serial yang terhubung ke sistem. */
export function listSerialPorts(): Promise<SerialPortDetail[]> {
  return invoke<SerialPortDetail[]>("list_serial_ports");
}

/** Buka koneksi serial. */
export function openSerial(
  portName: string,
  baudRate: number,
  dataBits: number,
  parity: string,
  stopBits: number,
  onOutput: (bytes: Uint8Array) => void,
  enableLogging = false,
  forceRelease = false,
): Promise<SessionId> {
  const output = new Channel<SessionOutput>();
  output.onmessage = (msg) => onOutput(base64ToBytes(msg.data_b64));
  return invoke<SessionId>("session_open_serial", {
    output,
    portName,
    baudRate,
    dataBits,
    parity,
    stopBits,
    enableLogging,
    forceRelease,
  });
}

// --- FTP & File Explorer Helpers ---

/** Buka koneksi FTP. */
export function openFtp(
  host: string,
  port: number,
  username: string,
  password?: string,
  ftps = false,
  allowInsecure = false,
): Promise<SessionId> {
  return invoke<SessionId>("session_open_ftp", {
    host,
    port,
    username,
    password: password || null,
    ftps,
    allowInsecure,
  });
}

/** Ambil daftar berkas remote FTP. */
export function listFtpDir(sessionId: SessionId): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("ftp_list_dir", { sessionId });
}

/** Berpindah direktori remote FTP. */
export function ftpCwd(sessionId: SessionId, path: string): Promise<string> {
  return invoke<string>("ftp_cwd", { sessionId, path });
}

/** Ambil direktori aktif remote FTP. */
export function ftpPwd(sessionId: SessionId): Promise<string> {
  return invoke<string>("ftp_pwd", { sessionId });
}

/** Unggah berkas dari lokal ke FTP. */
export function ftpUpload(
  sessionId: SessionId,
  localPath: string,
  remoteName: string,
): Promise<void> {
  return invoke("ftp_upload", { sessionId, localPath, remoteName });
}

/** Unduh berkas dari FTP ke lokal. */
export function ftpDownload(
  sessionId: SessionId,
  remoteName: string,
  localPath: string,
): Promise<void> {
  return invoke("ftp_download", { sessionId, remoteName, localPath });
}

/** Hapus berkas/folder FTP. */
export function ftpDelete(sessionId: SessionId, path: string, isDir: boolean): Promise<void> {
  return invoke("ftp_delete", { sessionId, path, isDir });
}

/** Buat folder baru di FTP. */
export function ftpMkdir(sessionId: SessionId, name: string): Promise<void> {
  return invoke("ftp_mkdir", { sessionId, name });
}

/** Ambil daftar berkas lokal. */
export function listLocalDir(path: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("list_local_dir", { path });
}

/** Ambil path folder Home lokal. */
export function getLocalHome(): Promise<string> {
  return invoke<string>("get_local_home");
}

/** Hapus file atau folder di komputer lokal. */
export function deleteLocalFile(path: string, isDir: boolean): Promise<void> {
  return invoke("delete_local_file", { path, isDir });
}

/** Buat folder baru di komputer lokal. */
export function mkdirLocal(path: string): Promise<void> {
  return invoke("mkdir_local", { path });
}

/** Salin file atau folder di komputer lokal. */
export function copyLocalFile(src: string, dest: string): Promise<void> {
  return invoke("copy_local_file", { src, dest });
}

/** Deteksi baud rate serial secara otomatis. */
export function detectSerialBaudRate(portName: string): Promise<number> {
  return invoke<number>("detect_serial_baud_rate", { portName });
}

/** Perbaiki izin port serial secara otomatis pada Linux. */
export function fixSerialPermissions(): Promise<void> {
  return invoke("fix_serial_permissions");
}

/** Cek apakah izin dialout/udev serial sudah terpasang. */
export function checkDialoutPermission(): Promise<boolean> {
  return invoke<boolean>("check_dialout_permission");
}

// ─── Fase 15 — Session Logging ────────────────────────────────────────────────

/** Buka file log sesi di aplikasi teks default OS. */
export function openLogFile(path: string): Promise<void> {
  return invoke("open_log_file", { path });
}

// ─── Fase 16 — Snippet / Macro Manager ───────────────────────────────────────

/** Ambil daftar snippet. Jika `vendor` diisi, tampilkan snippet vendor tsb + global. */
export function listSnippets(vendor?: string): Promise<Snippet[]> {
  return invoke<Snippet[]>("snippet_list", { vendor: vendor ?? null });
}

/** Simpan snippet baru. */
export function createSnippet(s: Snippet): Promise<void> {
  return invoke("snippet_create", { s });
}

/** Perbarui snippet yang sudah ada. */
export function updateSnippet(s: Snippet): Promise<void> {
  return invoke("snippet_update", { s });
}

/** Hapus snippet berdasarkan ID. */
export function deleteSnippet(id: string): Promise<void> {
  return invoke("snippet_delete", { id });
}

// ─── Fase 16 — Import/Export Profil (D-34) ────────────────────────────────────

/**
 * Ekspor semua profil ke file JSON via dialog "Save As".
 * Kredensial TIDAK ikut — hanya metadata profil. Return path file bila disimpan,
 * atau null bila dialog dibatalkan user.
 */
export async function exportProfilesToFile(): Promise<string | null> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    title: "Ekspor Profil",
    defaultPath: "remote-app-profiles.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!path) return null;
  // Backend yang menulis file (hindari plugin-fs tambahan).
  await invoke("export_profiles", { path });
  return path;
}

/**
 * Impor profil dari file JSON via dialog "Open". Setiap profil dapat `id` baru &
 * `has_password` direset (kredensial tidak pernah ikut file). Return jumlah profil
 * terimpor, atau null bila dialog dibatalkan.
 */
export async function importProfilesFromFile(): Promise<number | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    title: "Impor Profil",
    multiple: false,
    directory: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!selected || typeof selected !== "string") return null;
  // Backend yang membaca file & parse JSON.
  return invoke<number>("import_profiles", { path: selected });
}

