# Development Checklist: Remote Access Desktop App

**Berdasarkan:** PRD.md v0.2 + PLANNING.md
**Legend status:** ⬜ Belum · 🟨 Berjalan · ✅ Selesai
**Prioritas:** M = Must · S = Should · C = Could

---

## Progress Overview

| Fase | Nama | Status | Progress |
|------|------|--------|----------|
| 0 | Scaffold & Fondasi | ✅ | 5/5 |
| 1 | SSH Client Dasar | ✅ | 6/6 |
| 2 | Telnet + Multi-tab | ✅ | 4/4 |
| 3 | Serial Console | ✅ | 5/5 |
| 4 | FTP Dual-pane | ✅ | 5/5 |
| 5 | Profil + Kredensial | ✅ | 5/5 |
| 6 | Polish + Packaging | ✅ | 6/6 |
| 7 | Fitur Lanjutan (Terminal Lokal, Split View, Tab UX, Panel Kanan) | ✅ | 8/8 |
| 8 | Smart Device Context (Device Auto-Detect & Vendor Commands) | ✅ | 4/4 |
| 9 | Serial Advanced & Izin Dialout Linux (Auto-Kill, pkexec udev, Baud Scoring) | ✅ | 6/6 |
| 10 | Quick Wins Config & Kebersihan Repo | ✅ | 5/5 |
| 11 | Security Hardening: SSH & FTPS | ✅ | 3/3 |
| 12 | Serial Permission & Kredensial Hardening | ✅ | 3/3 |
| 13 | CI/CD & Testing | ✅ | 2/2 |
| 14 | Session Logging UI (Toggle + Log Viewer) | ✅ | 5/5 |
| 15 | Snippet / Macro Manager (Library Command Tersimpan) | ✅ | 6/6 |
| 16 | UX Productivity (Command Palette Ctrl+K + Import/Export Profil) | ✅ | 6/6 |

---

## Fase 0 — Scaffold & Fondasi

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Init proyek Tauri v2 + React + TS + Vite | M | — | ✅ |
| ✅ | Setup `SessionManager` + trait `Session { write, resize, close }` | M | — | ✅ |
| ✅ | Pasang xterm.js + addon (fit, web-links, search) | M | FR-7 | ✅ |
| ✅ | Pipe generik: command `session_write` + Channel `session_output` | M | — | ✅ |
| ✅ | Terminal dummy echo input lokal (loopback) | M | — | ✅ |

**DoD:** ✅ Window terbuka, terminal xterm menampilkan teks yang diketik (dikonfirmasi user 2026-07-21).

---

## Fase 1 — SSH Client Dasar

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Integrasi `russh`: connect host:port | M | FR-2 | ✅ |
| ✅ | Auth password | M | FR-2 | ✅ |
| ✅ | Buka shell channel PTY, stream stdout/stderr → UI | M | FR-2 | ✅ |
| ✅ | Keystroke UI → channel + `session_resize` → `window_change` | M | FR-7 | ✅ |
| ✅ | Handle disconnect & tampilkan status di UI | M | NFR-reliability | ✅ |
| ✅ | Auth private key + passphrase | M | FR-2 | ✅ |

**DoD:** ✅ SSH ke server (container tes), resize & copy-paste jalan (dikonfirmasi user 2026-07-21).
**Catatan:** Auth key sudah diimplementasi di `ssh.rs` dan diverifikasi.

---

## Fase 2 — Telnet + Multi-tab

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | `TelnetSession`: TCP connect | M | FR-3 | ✅ |
| ✅ | Negosiasi opsi IAC (ECHO, SGA, NAWS window size) | M | FR-3 | ✅ |
| ✅ | Auto-Expect Handler Telnet (Login otomatis via kredensial tersimpan) | M | FR-3 | ✅ |
| ✅ | Multi-tab UI: banyak session paralel dalam satu window | M | FR-6 | ✅ |
| ✅ | Tab bar: buka/tutup/switch, tiap tab xterm sendiri | M | FR-6 | ✅ |

**DoD:** ✅ Buka 2+ sesi sekaligus (mis. SSH + Telnet) di tab berbeda, semua interaktif (diverifikasi).

---

## Fase 3 — Serial Console + Auto-detect

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Command `list_serial_ports()` via `serialport::available_ports()` | S | FR-5 | ✅ |
| ✅ | Deteksi port serial yang tersedia di sistem (`list_serial_ports`) | M | FR-4 | ✅ |
| ✅ | `SerialSession`: tokio-serial read/write | M | FR-4 | ✅ |
| ✅ | Auto-Probe `\r\n` pada pembukaan sesi Serial (Memicu banner prompt otomatis) | M | FR-4 | ✅ |
| ✅ | Auto-Detect Baud Rate Scanner (Pengujian cepat rasio ASCII valid) | M | FR-4 | ✅ |
| ✅ | Abstraksi nama port lintas OS (`/dev/ttyUSB0` vs `COM3`) | M | NFR-portability | ✅ |
| ✅ | Auto-refresh daftar port saat device dicolok/dicabut | S | FR-5 | ✅ |

**DoD:** ✅ Colok USB-to-serial, port terdeteksi otomatis, bisa akses console router/switch (diverifikasi).

---

## Fase 4 — FTP Client Dual-pane

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | `FtpSession` via `suppaftp`: connect, list, CWD | M | FR-11 | ✅ |
| ✅ | Download & upload file | M | FR-11 | ✅ |
| ✅ | UI dual-pane: browser lokal (kiri) vs remote (kanan) | S | FR-12 | ✅ |
| ✅ | Progress transfer (tombol/drag) | S | FR-11 | ✅ |
| ✅ | Opsi FTPS (FTP over TLS) di form koneksi | C | FR-13 | ✅ |

**DoD:** ✅ Connect FTP, browse dua sisi, transfer dua arah berhasil, FTPS opsional jalan (diverifikasi).

---

## Fase 5 — Profil + Kredensial Terenkripsi

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | CRUD profil: create/save/edit/delete → SQLite | M | FR-1 | ✅ |
| ✅ | Simpan password/passphrase ke keyring (bukan plaintext) | M | FR-8 | ✅ |
| ✅ | Sidebar profil dengan folder/tag | C | FR-9 | ✅ |
| ✅ | Klik profil → auto-fill & connect | M | FR-1 | ✅ |
| ✅ | *(early)* Subset profil dasar host/user/port di akhir Fase 1 | M | FR-1 | ✅ |

**DoD:** ✅ Simpan profil, restart app, connect sekali klik; credential store berisi entry terenkripsi (diverifikasi).

---

## Fase 6 — Polish, Themes, Packaging

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Color themes terminal + preferensi font/scrollback | M | FR-7 | ✅ |
| ✅ | Auto-reconnect opsional SSH/Telnet | C | NFR-reliability | ✅ |
| ✅ | Session logging ke file lokal | C | FR-10 | ✅ |
| ✅ | Build installer Windows (`.msi`/`.exe`) | M | NFR-cross-platform | ✅ |
| ✅ | Build installer macOS (`.dmg`) | M | NFR-cross-platform | ✅ |
| ✅ | Build installer Linux (`.deb`/`.AppImage`) | M | NFR-cross-platform | ✅ |

**DoD:** ✅ Installer platform jalan; app terbukti handal tanpa crash (diverifikasi).

---

## Cross-cutting (dicek di tiap fase)

| ✔ | Item | FR/NFR | Status |
|---|------|--------|--------|
| ✅ | Kredensial hanya di keyring, config tanpa plaintext | FR-8, NFR-security | ✅ |
| ✅ | Terminal UTF-8 aware (uji karakter non-ASCII) | NFR | ✅ |
| ✅ | Semua command return `Result<T, AppError>` + pesan UI ramah | — | ✅ |
| ✅ | Backpressure output terminal (hindari freeze saat high-throughput) | NFR-performance | ✅ |
| ✅ | CI GitHub Actions matrix (win/mac/linux) sejak Fase 1 | NFR-cross-platform | ✅ (`.github/workflows/ci.yml` tuntas 2026-07-23) |

---

## Progress Overview

- Total task: **85** (79 lama + 6 baru Fase 16)
- Selesai: **85** (Seluruh 16 Fase 100% tuntas 2026-07-24)
- Dalam proses: **0**
- Belum mulai: **0**

## Milestone Status

| Status | Milestone | Target Fase | Hasil |
|--------|-----------|-------------|-------|
| ✅ | **MVP daily-use** (SSH+Telnet+Serial+profil dasar) | s/d 3 | ✅ |
| ✅ | **Feature complete** (semua protokol + profil) | s/d 5 | ✅ |
| ✅ | **Release v1.0** (installer 3 platform) | 6 | ✅ |
| ✅ | **v1.1 Fitur Lanjutan** (Terminal Lokal, Split View, Panel Kanan) | 7 | ✅ |
| ✅ | **v1.2 Smart Device Context** (Device Auto-Detect & Vendor Commands) | 8 | ✅ |
| ✅ | **v1.3 Serial Hardware Engine** (Auto-Kill EBUSY, 1-Click Dialout/udev Fix, Baud Scoring) | 9 | ✅ |
| ✅ | **v1.4 Config & Repo Hygiene** (release profile, CSP, gitignore) | 10 | ✅ |
| ✅ | **v1.5 Security Hardening** (SSH host key, FTPS verify, serial izin, zeroize) | 11–12 | ✅ |
| ✅ | **v1.6 CI/CD & Testing** (GitHub Actions matrix + test integrasi) | 13 | ✅ |
| ✅ | **v1.7 Session Logging UI** (Toggle + viewer log sesi) | 14 | ✅ |
| ✅ | **v1.8 Snippet Manager** (Library macro command tersimpan) | 15 | ✅ |
| ✅ | **v1.9 UX Productivity** (Command Palette Ctrl+K + Import/Export Profil) | 16 | ✅ |

---

## Fase 7 — Fitur Lanjutan: Terminal Lokal, Split View, Tab UX, Panel Kanan

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Terminal lokal: `LocalPtySession` via `portable-pty`, spawn `$SHELL` | S | FR-14 | ✅ |
| ✅ | Kartu Terminal Lokal di Welcome Screen + tab di NewSessionDialog | S | FR-14 | ✅ |
| ✅ | Split/Compare view: vertical & horizontal, grouped tab gaya Termius | S | FR-15 | ✅ |
| ✅ | Dropdown pilihan grup/folder otomatis di form profil | C | FR-9 | ✅ |
| ✅ | Drag-to-reorder tab + scroll horizontal via mouse wheel | S | FR-16 | ✅ |
| ✅ | Padding internal terminal (jarak tulisan dari pinggir layar) | S | FR-7 | ✅ |
| ✅ | Panel kanan: Search teks di terminal via `@xterm/addon-search` | S | FR-17 | ✅ |
| ✅ | Panel kanan: Command recommendations berdasarkan frekuensi | C | FR-18 | ✅ |

**DoD:** Semua fitur Fase 7 selesai, build bersih, diverifikasi user.

---

## Fase 8 — Smart Device Detection & Vendor-Aware Commands

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Deteksi pasif vendor/OS (Cisco, MikroTik, Huawei, Juniper, Linux) dari banner/prompt | S | FR-19 | ✅ |
| ✅ | Pilihan 'Tipe Perangkat / OS' di Form Profil + migrasi SQLite (`device_vendor`) | M | FR-19 | ✅ |
| ✅ | Perpustakaan Command Presets bawaan per vendor (Cisco, MikroTik, Huawei, Juniper, Linux) | S | FR-20 | ✅ |
| ✅ | Integration `CommandPanel` kontekstual otomatis beradaptasi dengan tab terminal aktif | S | FR-20 | ✅ |

**DoD:** Perangkat terdeteksi otomatis/manual, `CommandPanel` secara presisi menampilkan preset & riwayat khusus vendor tersebut.

---

## Fase 9 — Serial Advanced & Izin Dialout Linux (Auto-Kill, pkexec udev, Baud Scoring)

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Auto-Kill Force Release pada `EBUSY`: Menjalankan `fuser -k -9` saat port terkunci | M | FR-4 | ✅ |
| ✅ | Command backend `check_dialout_permission`: Memverifikasi udev rule & dialout group | M | FR-4 | ✅ |
| ✅ | Tombol Izin Dinamis: Menampilkan status `✓ Izin Dialout Fix` (hijau) atau `🔧 Fix Izin Dialout` (merah) | M | FR-4 | ✅ |
| ✅ | 1-Click Fix Izin Dialout & udev: `pkexec` penulisan udev rule `/etc/udev/rules.d/99-remote-app-serial.rules` & usermod | M | FR-4 | ✅ |
| ✅ | Algoritma Auto-Detect Baud Rate Presisi: Evaluasi rasio ASCII murni + bonus pembatas prompt (`38400`, `115200`, `9600`) | M | FR-4 | ✅ |
| ✅ | Pembersih Karakter Garbled (Framing Noise Sanitizer): Memfilter byte mentah non-ASCII (`0x20..0x7E`) pada buffer serial | M | FR-4 | ✅ |

**DoD:** Koneksi Serial berjalan stabil, bebas garbled character ``, izin dialout Linux diperbaiki 1 klik, port terkunci otomatis terbebas.

---

## Fase 10 — Quick Wins Config & Kebersihan Repo *(non-breaking)*

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | `[profile.release]` Cargo (opt-level/lto/codegen-units/strip/panic=abort) | S | NFR-performance | ✅ |
| ✅ | Sempitkan fitur `tokio` dari `full` ke subset yang dipakai | C | NFR-performance | ✅ |
| ✅ | Tambah `src-tauri/target/` & `src-tauri/gen/` ke `.gitignore` | S | — | ✅ |
| ✅ | Isi CSP di `tauri.conf.json` (ganti `"csp": null`) | S | NFR-security | ✅ |
| ✅ | Cek `cargo tree -d` duplikasi rustls & rapikan | C | — | ✅ (hanya 1 versi rustls 0.21.12, tak ada duplikasi) |

**DoD:** ✅ `npm run build` & `cargo check --release` lulus (2026-07-23), tanpa regresi. Disetujui D-30.

---

## Fase 11 — Security Hardening: SSH & FTPS *(breaking — D-25/D-26 disetujui)*

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | SSH host key: known_hosts app + TOFU accept-new (`ssh.rs` russh + `ssh_compat.rs` accept-new), tolak key berubah | M | NFR-security | ✅ |
| ✅ | Surfacing host key: banner fingerprint host baru + pesan MITM saat key berubah (semantik accept-new, non-blocking) | M | NFR-security | ✅ |
| ✅ | FTPS: `webpki-roots` default verify, `NoVerifier` hanya via opt-in `ftps_insecure` per-profil + checkbox UI | M | FR-13, NFR-security | ✅ |

**DoD:** ✅ Host baru: fingerprint disimpan & ditampilkan; key berubah → connect ditolak. FTPS menolak cert invalid kecuali user opt-in. `cargo check --release` & `npm run build` lulus (2026-07-23).

---

## Fase 12 — Serial Permission & Kredensial Hardening *(disetujui D-27/D-28/D-29)*

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | `fix_serial_permissions`: udev `MODE=0660 GROUP=dialout`, hapus `chmod 666` & hardcode `diki` | M | NFR-security | ✅ |
| ✅ | Konfirmasi user sebelum `fuser -k -9` (kembalikan `PORT_BUSY` error jika belum konfirmasi) | S | — | ✅ |
| ✅ | Zeroize password/passphrase di memori via `zeroize` (`Zeroizing<String>`) | S | NFR-security | ✅ |

**DoD:** ✅ Izin serial dibatasi grup dialout (`MODE=0660`), `fuser -k -9` membutuhkan konfirmasi UI via modal/dialog, password/passphrase otomatis di-zeroize saat di-drop. `cargo test` (1/1 passed) & `npm run build` lulus (2026-07-23).

---

## Fase 13 — CI/CD & Testing

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | `.github/workflows/` matrix (win/mac/linux) `.github/workflows/ci.yml` | M | NFR-cross-platform | ✅ |
| ✅ | Unit & Test integrasi DB Profile CRUD (`profile.rs`) & Keyring Credential (`credential.rs`) | S | — | ✅ |

**DoD:** ✅ GitHub Actions CI workflow `ci.yml` dibuat untuk 3 OS (ubuntu, windows, macos); unit test Rust (`cargo test` 2/2 passed) & build frontend (`npm run build`) lulus (2026-07-23).

---

## Fase 14 — Session Logging UI (Toggle + Log Viewer)

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Tambah kolom `enable_logging INTEGER DEFAULT 0` ke SQLite profil + migrasi | M | FR-10 | ✅ |
| ✅ | Tambah field `enable_logging` ke `types.ts` & `ProfileForm.tsx` | M | FR-10 | ✅ |
| ✅ | Checkbox "💾 Rekam sesi" di `NewSessionDialog.tsx` & `SettingsDialog.tsx` (semua protokol) | M | FR-10 | ✅ |
| ✅ | Indikator rekam aktif (badge 💾) di ProfileForm dan auto-read dari settings | S | FR-10 | ✅ |
| ✅ | Command `open_log_file` via `tauri-plugin-opener` (buka file log di text editor/file manager OS) | S | FR-10 | ✅ |

**DoD:** ✅ Centang logging → file `.log` terbuat di `app_data/logs/`, disimpam di SQLite profil, `open_log_file` berfungsi (2026-07-23).

---

## Fase 15 — Snippet / Macro Manager

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | Buat tabel `snippets` di SQLite + CRUD backend (`snippet.rs`) | M | FR-21 | ✅ |
| ✅ | Registrasi command: `snippet_list`, `snippet_create`, `snippet_update`, `snippet_delete` | M | FR-21 | ✅ |
| ✅ | Wrapper IPC & tipe `Snippet` di `ipc.ts` + `types.ts` | M | FR-21 | ✅ |
| ✅ | Komponen `SnippetPanel.tsx`: list snippet, filter vendor, form tambah/edit, tombol kirim ke terminal | M | FR-21 | ✅ |
| ✅ | Tombol 📌 di TabBar untuk toggle SnippetPanel + mode panel `"snippets"` di App | S | FR-21 | ✅ |
| ✅ | Unit test `test_snippet_crud` di `snippet.rs` (100% passed) | S | FR-21 | ✅ |

**DoD:** ✅ Snippet tersimpan di SQLite, bisa ditambah/edit/hapus/filter per vendor, kirim ke terminal 1 klik berfungsi (2026-07-23).

---

## Fase 16 — UX Productivity: Command Palette & Import/Export Profil *(non-breaking, D-33/D-34)*

| ✔ | Task | Prioritas | FR/NFR | Status |
|---|------|-----------|--------|--------|
| ✅ | `CommandPalette.tsx`: overlay Ctrl+K + fuzzy filter lintas sumber | S | — | ✅ |
| ✅ | Sumber profil (connect), snippet (kirim ke terminal aktif), aksi app | S | — | ✅ |
| ✅ | Hook global Ctrl+K + navigasi keyboard (↑/↓/Enter/Esc) di `App.tsx` | S | — | ✅ |
| ✅ | Backend `export_profiles` → JSON tanpa kredensial (D-34) | S | NFR-security | ✅ |
| ✅ | Backend `import_profiles` → `id` baru + reset `has_password` (D-34) | S | — | ✅ |
| ✅ | `tauri-plugin-dialog` file picker + tombol Export/Import di UI | S | — | ✅ |

**DoD:** ✅ Ctrl+K connect profil sekali Enter; export `.json` tanpa password; import memuat profil status "belum ada password". `npm run build` & `cargo test` 100% lulus (2026-07-24).

