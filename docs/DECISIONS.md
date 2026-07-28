# DECISIONS.md — Keputusan Terkunci

> Daftar keputusan yang **sudah final**. Model AI mana pun WAJIB mengikuti ini.
> Untuk mengubah: butuh alasan jelas + persetujuan user, lalu ubah statusnya + catat di WORKLOG.
> **Legend:** 🔒 Terkunci · ❓ Belum diputuskan (butuh input user) · ♻️ Direvisi

---

## Keputusan Terkunci

| # | Keputusan | Nilai | Status | Alasan singkat |
|---|-----------|-------|--------|----------------|
| D-1 | App shell | Tauri v2 | 🔒 | Footprint kecil (PRD §8). |
| D-2 | Bahasa backend | Rust | 🔒 | Native access + aman (PRD §8). |
| D-3 | Crate SSH | `russh` + `russh-keys` | 🔒 | Pure-Rust async. |
| D-4 | Telnet | tokio TCP raw + IAC manual | 🔒 | Protokol sederhana. |
| D-5 | Serial | `tokio-serial` / `serialport` | 🔒 | Auto-detect port (FR-5). |
| D-6 | FTP/FTPS | `suppaftp` (async + rustls) | 🔒 | Dukung FTP & FTPS. |
| D-7 | Simpan kredensial | crate `keyring` (OS store) | 🔒 | FR-8 / NFR security. |
| D-8 | Streaming terminal | Tauri Channel (bukan event biasa) | 🔒 | Throughput tinggi tanpa lag. |
| D-9 | Frontend framework | React + TypeScript | 🔒 (2026-07-21) | Ekosistem xterm.js terkuat. |
| D-10 | Simpan profil | SQLite (`rusqlite` bundled) | 🔒 (2026-07-21) | Mendukung grouping/folder-tag (FR-9). |
| D-11 | Subset profil dasar ke akhir Fase 1 | Ya | 🔒 (2026-07-21) | Testing SSH sekali klik, tak input manual. |
| D-12 | Platform pertama daily-use | Linux | 🔒 (2026-07-21) | Dev utama; uji manual diprioritaskan di Linux. |
| D-13 | Terminal lokal | `portable-pty` (PTY penuh, `$SHELL`) | 🔒 (2026-07-22) | Jalankan shell bawaan OS tanpa SSH. Reuse crate yang sudah ada di ssh_compat. |
| D-14 | Split/Compare view | Drag-and-drop tab ke drop zone | 🔒 (2026-07-22) | Grouped tab gaya Termius; vertikal & horizontal. |
| D-15 | Tab reorder | HTML5 Drag-and-Drop API (`dataTransfer`) | 🔒 (2026-07-22) | Key `remote-app/reorder-key` terpisah dari split drag. |
| D-16 | Terminal search | `@xterm/addon-search` (sudah terpasang) + forwardRef | 🔒 (2026-07-22) | Expose SearchAddon ke parent via imperative handle. |
| D-17 | Command recommendations | `localStorage` (command history per-browser) | 🔒 (2026-07-22) | Auto-record saat Enter, auto-detect kategori (network/system/custom). |
| D-18 | Panel kanan terpisah | `SearchPanel.tsx` & `CommandPanel.tsx` | 🔒 (2026-07-22) | Dua panel terpisah dengan tombol dedicated 🔍 dan ⚡ di TabBar. |
| D-19 | Auto-detection Perangkat | Pasif via Banner/Prompt Terminal Regex | 🔒 (2026-07-22) | 100% aman tanpa probing aktif. Opsi manual di Form Profil & DB SQLite (`device_vendor`). |
| D-20 | Vendor Presets & Context | Built-in presets per vendor + History per vendor | 🔒 (2026-07-22) | `CommandPanel` otomatis beradaptasi menampilkan preset & riwayat sesuai vendor tab aktif. |
| D-21 | Auto-Kill EBUSY Handle | `fuser -k -9 <port>` saat `os error 16` | 🔒 (2026-07-22) | Otomatis menghentikan kuncian proses latar belakang pada port serial. |
| D-22 | 1-Click Repair Dialout & udev | `pkexec` penulisan udev rule & usermod dialout | 🔒 (2026-07-22) | Memperbaiki izin port serial secara permanen tanpa memerlukan perintah terminal manual. |
| D-23 | Baud Rate ASCII Scoring | Rasio ASCII murni + bonus prompt (`\r\n`, `>`, `#`, `:`) | 🔒 (2026-07-22) | Mengatasi kesalahan pembacaan kelipatan harmonik baud rate (seperti 38400 vs 115200). |
| D-24 | Serial Framing Noise Filter | Penyaringan byte mentah ASCII terbaca | 🔒 (2026-07-22) | Menghilangkan karakter pengganti acak `` dari layar terminal serial. |
| D-25 | Verifikasi host key SSH | known_hosts (file app) + TOFU accept-new; host key berubah → tolak (MITM). `ssh.rs` pakai russh `known_hosts`, `ssh_compat.rs` pakai `StrictHostKeyChecking=accept-new` | 🔒 (2026-07-23) | Menutup celah MITM; NFR-security. Disetujui user. |
| D-26 | Verifikasi sertifikat FTPS | Default verifikasi via `webpki-roots`; `NoVerifier` hanya bila opt-in eksplisit per-profil (`ftps_insecure`) | 🔒 (2026-07-23) | FTPS kini beri jaminan; insecure hanya sadar-risiko. Disetujui user. |
| D-27 | Scope perbaikan izin serial | Grup `dialout` + udev `MODE=0660 GROUP=dialout`, hapus `chmod 666` & hardcode user `diki` | 🔒 (2026-07-23) | Keamanan izin Linux ketat; NFR-security. Disetujui user. |
| D-28 | Force-release port serial | Minta konfirmasi dialog user sebelum `fuser -k -9` | 🔒 (2026-07-23) | Mencegah pembunuhan proses tak disengaja. Disetujui user. |
| D-29 | Zeroize kredensial di memori | Crate `zeroize` (`Zeroizing<String>`) untuk password/passphrase | 🔒 (2026-07-23) | Menghapus sisa kredensial di heap saat di-drop. Disetujui user. |
| D-30 | Tuning build rilis | `[profile.release]` opt-level/lto/strip/panic=abort | 🔒 (2026-07-23) | Footprint kecil (PRD §7). Aman, non-breaking. Disetujui user. |
| D-31 | Session Logging UI | Checkbox di ProfileForm/NewSessionDialog + kolom `enable_logging` di SQLite profil; log disimpan di `app_data/logs/` | 🔒 (2026-07-23) | Mudah dikonfigurasi per-profil dan per-sesi. Disetujui user. |
| D-32 | Snippet / Macro Manager | SQLite tabel `snippets` (bukan localStorage) + panel 📌 dedicated dengan filter vendor | 🔒 (2026-07-23) | Persisten, mendukung multi-line command & filter vendor. Disetujui user. |
| D-33 | Command Palette (Ctrl+K) | Overlay pencarian global lintas sumber: profil (connect), snippet (kirim ke terminal aktif), aksi app | 🔒 (2026-07-24) | Quick-connect & akses cepat tanpa mouse. Disetujui user. |
| D-34 | Import/Export profil | Format JSON milik app sendiri; kredensial TIDAK ikut (tetap di keyring), `has_password` direset & `id` dibuat baru saat import; file picker via `tauri-plugin-dialog` | 🔒 (2026-07-24) | Backup & pindah antar-PC aman tanpa membocorkan password. Disetujui user. |

---

## Keputusan Belum Final (❓ butuh input user)

_Tidak ada — semua keputusan audit Fase 10–12 sudah disetujui & terkunci._

---

## Cara Mengubah Keputusan Terkunci

1. Jangan ubah diam-diam.
2. Ajukan usulan + alasan ke user.
3. Setelah disetujui: ubah baris jadi ♻️, tulis nilai baru + tanggal, catat di `WORKLOG.md`.
