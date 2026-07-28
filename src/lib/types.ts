// Bentuk data yang dipakai bersama frontend & mirror dari struct Rust.
// Jaga tetap sinkron dengan src-tauri/src/session/mod.rs.

export type SessionId = number;

/** Potongan output byte dari sebuah sesi, byte di-encode base64. */
export interface SessionOutput {
  session_id: number;
  data_b64: string;
}

export type Protocol = "ssh" | "telnet" | "serial" | "ftp" | "local";

/** Satu tab sesi di UI. `open` memulai koneksi & mengembalikan session_id backend. */
export interface Tab {
  /** id unik tab di frontend (bukan session_id backend). */
  key: number;
  title: string;
  protocol: Protocol;
  open: (onOutput: (bytes: Uint8Array) => void) => Promise<number>;
}

export type DeviceVendor =
  | "auto"
  | "cisco_ios"
  | "cisco_ios_router"
  | "cisco_ios_switch"
  | "cisco_nxos"
  | "mikrotik"
  | "huawei_vrp"
  | "juniper_junos"
  | "linux"
  | "generic";

export interface Profile {
  id: string;
  name: string;
  group_path: string;
  protocol: Protocol;
  host: string;
  port: number;
  username: string;
  auth_method: "password" | "key";
  key_path: string;
  has_password: boolean;
  // Serial fields
  serial_port: string;
  baud_rate: number;
  data_bits: number;
  parity: string;
  stop_bits: number;
  // FTP fields
  ftps: boolean;
  /** Opt-in eksplisit: lewati verifikasi sertifikat FTPS (D-26, rentan MITM). */
  ftps_insecure?: boolean;
  // Misc
  legacy_mode: boolean;
  device_vendor?: DeviceVendor;
  /** Rekam output sesi ke file log di app_data_dir/logs/ */
  enable_logging?: boolean;
  created_at: number;
  updated_at: number;
}

export interface FileEntry {
  name: string;
  is_dir: boolean;
  size: number;
}

/** Satu snippet/macro command tersimpan di library. */
export interface Snippet {
  id: string;
  name: string;
  content: string;
  vendor?: string;        // opsional: filter per vendor
  category?: string;      // opsional: kategori bebas
  created_at: number;
}
