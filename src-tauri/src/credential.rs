//! Wrapper untuk keyring OS agar menyimpan kredensial (password/passphrase) secara aman.

use keyring::Entry;
use zeroize::Zeroizing;

const SERVICE_NAME: &str = "remote-app";

fn make_username(profile_id: &str) -> String {
    format!("profile-{}", profile_id)
}

/// Simpan password ke OS credential store.
pub fn set_password(profile_id: &str, password: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &make_username(profile_id))
        .map_err(|e| format!("Keyring init error: {e}"))?;
    entry
        .set_password(password)
        .map_err(|e| format!("Gagal menyimpan password ke keyring: {e}"))
}

/// Ambil password dari OS credential store.
/// Dibungkus `Zeroizing` (D-29) agar isi memori dihapus otomatis saat di-drop,
/// sehingga kredensial tidak tertinggal di heap lebih lama dari perlu.
pub fn get_password(profile_id: &str) -> Result<Zeroizing<String>, String> {
    let entry = Entry::new(SERVICE_NAME, &make_username(profile_id))
        .map_err(|e| format!("Keyring init error: {e}"))?;
    entry
        .get_password()
        .map(Zeroizing::new)
        .map_err(|e| format!("Gagal mengambil password dari keyring: {e}"))
}

/// Hapus password dari OS credential store.
pub fn delete_password(profile_id: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &make_username(profile_id))
        .map_err(|e| format!("Keyring init error: {e}"))?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        // Jika entry tidak ditemukan, anggap sukses (sudah terhapus)
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Gagal menghapus password dari keyring: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keyring() {
        let id = "test-profile-123";
        let pwd = "mypassword";
        if set_password(id, pwd).is_ok() {
            let res = get_password(id).unwrap();
            assert_eq!(res.as_str(), pwd);
            delete_password(id).unwrap();
        }
    }
}
