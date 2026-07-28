//! Snippet / Macro Manager — penyimpanan library command tersimpan di SQLite.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: String,
    pub name: String,
    /// Konten command (bisa multi-line).
    pub content: String,
    /// Opsional: filter per vendor (mis. "cisco_ios", "mikrotik", dll).
    #[serde(default)]
    pub vendor: Option<String>,
    /// Opsional: kategori bebas (mis. "backup", "troubleshoot").
    #[serde(default)]
    pub category: Option<String>,
    pub created_at: i64,
}

pub struct SnippetDb {
    pub path: PathBuf,
}

impl SnippetDb {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn get_conn(&self) -> Result<Connection, String> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Gagal membuat folder snippet DB: {e}"))?;
        }
        Connection::open(&self.path)
            .map_err(|e| format!("Gagal membuka snippet database: {e}"))
    }
}

/// Inisialisasi tabel snippets (idempotent).
pub fn init_snippet_db(db: &SnippetDb) -> Result<(), String> {
    let conn = db.get_conn()?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS snippets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            vendor TEXT,
            category TEXT,
            created_at INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Gagal inisialisasi tabel snippets: {e}"))?;
    Ok(())
}

/// Mengambil semua snippet; jika vendor diisi, tampilkan snippet vendor tsb + snippet global (vendor NULL).
pub fn list_snippets(db: &SnippetDb, vendor: Option<String>) -> Result<Vec<Snippet>, String> {
    let conn = db.get_conn()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, content, vendor, category, created_at FROM snippets ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Gagal menyiapkan query snippets: {e}"))?;

    let all: Vec<Snippet> = stmt
        .query_map([], |row| {
            Ok(Snippet {
                id: row.get(0)?,
                name: row.get(1)?,
                content: row.get(2)?,
                vendor: row.get(3)?,
                category: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Gagal query snippets: {e}"))?
        .filter_map(|r| r.ok())
        .collect();

    // Filter: tampilkan global (vendor NULL) + snippet yang cocok dengan vendor yg diminta
    let filtered = if let Some(ref v) = vendor {
        all.into_iter()
            .filter(|s| s.vendor.is_none() || s.vendor.as_deref() == Some(v.as_str()))
            .collect()
    } else {
        all
    };

    Ok(filtered)
}

/// Membuat snippet baru.
pub fn create_snippet(db: &SnippetDb, s: &Snippet) -> Result<(), String> {
    let conn = db.get_conn()?;
    conn.execute(
        "INSERT INTO snippets (id, name, content, vendor, category, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        params![&s.id, &s.name, &s.content, &s.vendor, &s.category, s.created_at],
    )
    .map_err(|e| format!("Gagal menyimpan snippet: {e}"))?;
    Ok(())
}

/// Memperbarui snippet (nama, konten, vendor, kategori).
pub fn update_snippet(db: &SnippetDb, s: &Snippet) -> Result<(), String> {
    let conn = db.get_conn()?;
    conn.execute(
        "UPDATE snippets SET name = ?, content = ?, vendor = ?, category = ? WHERE id = ?",
        params![&s.name, &s.content, &s.vendor, &s.category, &s.id],
    )
    .map_err(|e| format!("Gagal memperbarui snippet: {e}"))?;
    Ok(())
}

/// Menghapus snippet berdasarkan ID.
pub fn delete_snippet(db: &SnippetDb, id: &str) -> Result<(), String> {
    let conn = db.get_conn()?;
    conn.execute("DELETE FROM snippets WHERE id = ?", [id])
        .map_err(|e| format!("Gagal menghapus snippet: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_snippet_crud() {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let temp_dir = std::env::temp_dir().join(format!("remote_app_snippet_test_{}_{}", std::process::id(), timestamp));
        let db_path = temp_dir.join("test_snippets.db");
        let db = SnippetDb::new(db_path.clone());

        // Inisialisasi DB
        init_snippet_db(&db).unwrap();

        // Create new snippet
        let snip = Snippet {
            id: "snip-1".to_string(),
            name: "Backup Cisco".to_string(),
            content: "show running-config\nwrite memory".to_string(),
            vendor: Some("cisco_ios".to_string()),
            category: Some("backup".to_string()),
            created_at: 1000,
        };

        create_snippet(&db, &snip).unwrap();

        // List snippets (global / filter vendor)
        let list_all = list_snippets(&db, None).unwrap();
        assert_eq!(list_all.len(), 1);
        assert_eq!(list_all[0].name, "Backup Cisco");

        let list_cisco = list_snippets(&db, Some("cisco_ios".to_string())).unwrap();
        assert_eq!(list_cisco.len(), 1);

        let list_mikrotik = list_snippets(&db, Some("mikrotik".to_string())).unwrap();
        assert_eq!(list_mikrotik.len(), 0); // No matching vendor or global snippet

        // Update snippet
        let mut updated = snip.clone();
        updated.name = "Backup Cisco Updated".to_string();
        update_snippet(&db, &updated).unwrap();

        let list_after = list_snippets(&db, None).unwrap();
        assert_eq!(list_after[0].name, "Backup Cisco Updated");

        // Delete snippet
        delete_snippet(&db, "snip-1").unwrap();
        let list_empty = list_snippets(&db, None).unwrap();
        assert_eq!(list_empty.len(), 0);

        let _ = std::fs::remove_dir_all(temp_dir);
    }
}

