//! Manajemen Profil Koneksi di SQLite Database.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub group_path: String,
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: String,
    pub key_path: String,
    pub has_password: bool,
    // Serial fields
    pub serial_port: String,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub parity: String,
    pub stop_bits: u8,
    // FTP fields
    pub ftps: bool,
    /// Opt-in eksplisit: lewati verifikasi sertifikat FTPS (D-26, rentan MITM).
    #[serde(default)]
    pub ftps_insecure: bool,
    // Misc
    pub legacy_mode: bool,
    pub device_vendor: Option<String>,
    /// Rekam seluruh output sesi ke file log lokal (app_data_dir/logs/).
    #[serde(default)]
    pub enable_logging: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct Db {
    pub path: PathBuf,
}

impl Db {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    /// Membuka koneksi ke SQLite database (membuat folder induk jika belum ada).
    pub fn get_conn(&self) -> Result<Connection, String> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Gagal membuat folder DB: {e}"))?;
        }
        Connection::open(&self.path).map_err(|e| format!("Gagal membuka database: {e}"))
    }
}

/// Inisialisasi skema tabel jika belum ada.
pub fn init_db(db: &Db) -> Result<(), String> {
    let conn = db.get_conn()?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_path TEXT NOT NULL,
            protocol TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            username TEXT NOT NULL,
            auth_method TEXT NOT NULL,
            key_path TEXT NOT NULL,
            has_password INTEGER NOT NULL,
            serial_port TEXT NOT NULL DEFAULT '',
            baud_rate INTEGER NOT NULL DEFAULT 9600,
            data_bits INTEGER NOT NULL DEFAULT 8,
            parity TEXT NOT NULL DEFAULT 'none',
            stop_bits INTEGER NOT NULL DEFAULT 1,
            ftps INTEGER NOT NULL DEFAULT 0,
            legacy_mode INTEGER NOT NULL DEFAULT 0,
            device_vendor TEXT DEFAULT 'auto',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            ftps_insecure INTEGER NOT NULL DEFAULT 0
        )",
        [],
    )
    .map_err(|e| format!("Gagal inisialisasi tabel SQLite: {e}"))?;

    // Migrasi kolom legacy_mode & device_vendor untuk database lama (idempotent)
    let _ = conn.execute(
        "ALTER TABLE profiles ADD COLUMN legacy_mode INTEGER NOT NULL DEFAULT 0",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE profiles ADD COLUMN device_vendor TEXT DEFAULT 'auto'",
        [],
    );
    // Migrasi kolom ftps_insecure (Fase 11, D-26) untuk database lama (idempotent).
    let _ = conn.execute(
        "ALTER TABLE profiles ADD COLUMN ftps_insecure INTEGER NOT NULL DEFAULT 0",
        [],
    );
    // Migrasi kolom enable_logging (Fase 15) untuk database lama (idempotent).
    let _ = conn.execute(
        "ALTER TABLE profiles ADD COLUMN enable_logging INTEGER NOT NULL DEFAULT 0",
        [],
    );

    Ok(())
}

/// Mengambil semua daftar profil dari database.
pub fn list_profiles(db: &Db) -> Result<Vec<Profile>, String> {
    let conn = db.get_conn()?;
    let mut stmt = conn
        .prepare("SELECT id, name, group_path, protocol, host, port, username, auth_method, key_path, has_password, serial_port, baud_rate, data_bits, parity, stop_bits, ftps, legacy_mode, device_vendor, created_at, updated_at, ftps_insecure, enable_logging FROM profiles ORDER BY group_path, name")
        .map_err(|e| format!("Gagal menyiapkan statement SELECT: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Profile {
                id: row.get(0)?,
                name: row.get(1)?,
                group_path: row.get(2)?,
                protocol: row.get(3)?,
                host: row.get(4)?,
                port: row.get(5)?,
                username: row.get(6)?,
                auth_method: row.get(7)?,
                key_path: row.get(8)?,
                has_password: row.get::<_, i32>(9)? != 0,
                serial_port: row.get(10)?,
                baud_rate: row.get(11)?,
                data_bits: row.get(12)?,
                parity: row.get(13)?,
                stop_bits: row.get(14)?,
                ftps: row.get::<_, i32>(15)? != 0,
                legacy_mode: row.get::<_, i32>(16).unwrap_or(0) != 0,
                device_vendor: row.get(17).ok(),
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
                ftps_insecure: row.get::<_, i32>(20).unwrap_or(0) != 0,
                enable_logging: row.get::<_, i32>(21).unwrap_or(0) != 0,
            })
        })
        .map_err(|e| format!("Gagal query_map profiles: {e}"))?;

    let mut profiles = Vec::new();
    for r in rows {
        profiles.push(r.map_err(|e| format!("Gagal parse row: {e}"))?);
    }
    Ok(profiles)
}

/// Mengambil satu profil berdasarkan ID.
pub fn get_profile(db: &Db, id: &str) -> Result<Profile, String> {
    let conn = db.get_conn()?;
    conn.query_row(
        "SELECT id, name, group_path, protocol, host, port, username, auth_method, key_path, has_password, serial_port, baud_rate, data_bits, parity, stop_bits, ftps, legacy_mode, device_vendor, created_at, updated_at, ftps_insecure, enable_logging FROM profiles WHERE id = ?",
        [id],
        |row| {
            Ok(Profile {
                id: row.get(0)?,
                name: row.get(1)?,
                group_path: row.get(2)?,
                protocol: row.get(3)?,
                host: row.get(4)?,
                port: row.get(5)?,
                username: row.get(6)?,
                auth_method: row.get(7)?,
                key_path: row.get(8)?,
                has_password: row.get::<_, i32>(9)? != 0,
                serial_port: row.get(10)?,
                baud_rate: row.get(11)?,
                data_bits: row.get(12)?,
                parity: row.get(13)?,
                stop_bits: row.get(14)?,
                ftps: row.get::<_, i32>(15)? != 0,
                legacy_mode: row.get::<_, i32>(16).unwrap_or(0) != 0,
                device_vendor: row.get(17).ok(),
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
                ftps_insecure: row.get::<_, i32>(20).unwrap_or(0) != 0,
                enable_logging: row.get::<_, i32>(21).unwrap_or(0) != 0,
            })
        },
    )
    .map_err(|e| format!("Profil {id} tidak ditemukan: {e}"))
}

/// Membuat profil baru di database.
pub fn create_profile(db: &Db, p: &Profile) -> Result<(), String> {
    let conn = db.get_conn()?;
    conn.execute(
        "INSERT INTO profiles (id, name, group_path, protocol, host, port, username, auth_method, key_path, has_password, serial_port, baud_rate, data_bits, parity, stop_bits, ftps, legacy_mode, device_vendor, created_at, updated_at, ftps_insecure, enable_logging)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            &p.id,
            &p.name,
            &p.group_path,
            &p.protocol,
            &p.host,
            p.port,
            &p.username,
            &p.auth_method,
            &p.key_path,
            if p.has_password { 1 } else { 0 },
            &p.serial_port,
            p.baud_rate,
            p.data_bits,
            &p.parity,
            p.stop_bits,
            if p.ftps { 1 } else { 0 },
            if p.legacy_mode { 1 } else { 0 },
            &p.device_vendor,
            p.created_at,
            p.updated_at,
            if p.ftps_insecure { 1 } else { 0 },
            if p.enable_logging { 1 } else { 0 },
        ],
    )
    .map_err(|e| format!("Gagal menyimpan profil ke database: {e}"))?;
    Ok(())
}

/// Memperbarui data profil di database.
pub fn update_profile(db: &Db, p: &Profile) -> Result<(), String> {
    let conn = db.get_conn()?;
    conn.execute(
        "UPDATE profiles SET name = ?, group_path = ?, protocol = ?, host = ?, port = ?, username = ?, auth_method = ?, key_path = ?, has_password = ?, serial_port = ?, baud_rate = ?, data_bits = ?, parity = ?, stop_bits = ?, ftps = ?, legacy_mode = ?, device_vendor = ?, updated_at = ?, ftps_insecure = ?, enable_logging = ? WHERE id = ?",
        params![
            &p.name,
            &p.group_path,
            &p.protocol,
            &p.host,
            p.port,
            &p.username,
            &p.auth_method,
            &p.key_path,
            if p.has_password { 1 } else { 0 },
            &p.serial_port,
            p.baud_rate,
            p.data_bits,
            &p.parity,
            p.stop_bits,
            if p.ftps { 1 } else { 0 },
            if p.legacy_mode { 1 } else { 0 },
            &p.device_vendor,
            p.updated_at,
            if p.ftps_insecure { 1 } else { 0 },
            if p.enable_logging { 1 } else { 0 },
            &p.id,
        ],
    )
    .map_err(|e| format!("Gagal memperbarui profil di database: {e}"))?;
    Ok(())
}

/// Menghapus profil dari database berdasarkan ID.
pub fn delete_profile(db: &Db, id: &str) -> Result<(), String> {
    let conn = db.get_conn()?;
    conn.execute("DELETE FROM profiles WHERE id = ?", [id])
        .map_err(|e| format!("Gagal menghapus profil dari database: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profile_crud() {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let temp_dir = std::env::temp_dir().join(format!("remote_app_test_{}_{}", std::process::id(), timestamp));
        let db_path = temp_dir.join("test_profiles.db");
        let db = Db::new(db_path.clone());

        // Inisialisasi DB
        init_db(&db).unwrap();

        // Create new profile
        let profile = Profile {
            id: "test-p1".to_string(),
            name: "Server Router Test".to_string(),
            group_path: "Lab/Cisco".to_string(),
            protocol: "ssh".to_string(),
            host: "127.0.0.1".to_string(),
            port: 22,
            username: "admin".to_string(),
            auth_method: "password".to_string(),
            key_path: "".to_string(),
            has_password: true,
            serial_port: "".to_string(),
            baud_rate: 9600,
            data_bits: 8,
            parity: "none".to_string(),
            stop_bits: 1,
            ftps: false,
            ftps_insecure: false,
            legacy_mode: false,
            enable_logging: false,
            device_vendor: Some("cisco_ios".to_string()),
            created_at: 1000,
            updated_at: 1000,
        };

        create_profile(&db, &profile).unwrap();

        // List profiles
        let profiles = list_profiles(&db).unwrap();
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "Server Router Test");
        assert_eq!(profiles[0].device_vendor, Some("cisco_ios".to_string()));

        // Get single profile
        let single = get_profile(&db, "test-p1").unwrap();
        assert_eq!(single.id, "test-p1");
        assert_eq!(single.username, "admin");

        // Update profile
        let mut updated = profile.clone();
        updated.name = "Server Router Updated".to_string();
        update_profile(&db, &updated).unwrap();

        let profiles_after = list_profiles(&db).unwrap();
        assert_eq!(profiles_after[0].name, "Server Router Updated");

        // Delete profile
        delete_profile(&db, "test-p1").unwrap();
        let profiles_empty = list_profiles(&db).unwrap();
        assert_eq!(profiles_empty.len(), 0);

        let _ = std::fs::remove_dir_all(temp_dir);
    }
}
