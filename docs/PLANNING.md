# Development Planning: Remote Access Desktop App

**Berdasarkan:** PRD.md v0.3
**Tanggal planning:** 21 Juli 2026
**Owner:** Diki

---

## 1. Ringkasan Pendekatan

Planning ini menerjemahkan PRD menjadi keputusan teknis konkret + breakdown tugas per fase.
Prinsip utama: **ship fase per fase**, tiap fase menghasilkan aplikasi yang bisa dipakai
(bukan setengah jadi). Fase 1 sudah bisa SSH beneran ke Ubuntu server.

Urutan fase mengikuti PRD, tapi ada satu penyesuaian yang direkomendasikan:
**geser sebagian "manajemen profil + kredensial" (Fase 5) lebih awal**, karena tanpa saved
profile setiap testing SSH harus ketik host/user/password manual. Detail di bagian 6.

---

## 2. Keputusan Tech Stack (final + alasan)

| Komponen | Pilihan | Alasan |
|----------|---------|--------|
| App shell | **Tauri v2** | v2 sudah stable, plugin system & IPC Channel lebih baik utk streaming data terminal. Footprint kecil sesuai goal PRD. |
| Bahasa backend | **Rust** | Sesuai PRD, akses native ke serial/socket, aman. |
| Frontend | **React + TypeScript + Vite** *(alternatif: Svelte)* | Ekosistem xterm.js paling matang di React. Svelte lebih ringan bila mau. Lihat "Keputusan terbuka". |
| Terminal UI | **xterm.js** + addon `fit`, `web-links`, `search`, `canvas`/`webgl` renderer | Standar de-facto, cepat. |
| SSH | **russh** + **russh-keys** | Pure-Rust async, tanpa dependency C. `russh-sftp` untuk SFTP (future). |
| Telnet | **tokio TCP raw** + handler IAC option negotiation manual | Protokol sederhana, tak perlu crate berat. |
| Serial | **tokio-serial** (di atas crate `serialport`) | `serialport::available_ports()` untuk auto-detect (FR-5). |
| FTP / FTPS | **suppaftp** (feature `async` + `rustls`) | Mendukung FTP & FTPS (FR-11, FR-13). |
| Simpan kredensial | **keyring** crate | Wrapper Keychain (mac) / Credential Manager (win) / Secret Service (linux) — sesuai FR-8 & NFR security. |
| Simpan profil | **SQLite** via `rusqlite` (bundled) | Mendukung folder/tag & query (FR-9). Bundled = tanpa install manual (NFR portability). |
| State async | **tokio** | Runtime async untuk semua koneksi. |

**Catatan versi:** kunci semua versi crate/npm di lockfile sejak awal supaya build cross-platform reproducible.

---

## 3. Arsitektur High-Level

```
┌─────────────────────────── Webview (Frontend, React+TS) ───────────────────────────┐
│  Sidebar profil (tree/tag)   │   Tab bar (multi-session)                             │
│  ─────────────────────────── │   ───────────────────────────────────────────────────│
│  Connection form / editor     │   xterm.js  ⇄  atau  Dual-pane FTP browser           │
└───────────────────────────────┬──────────────────────────────────────────────────────┘
                                 │  Tauri IPC
             commands (invoke)   │            events / Channel<Bytes> (stream keluar)
                                 ▼
┌─────────────────────────── Rust Core (Tauri backend) ───────────────────────────────┐
│  SessionManager: HashMap<SessionId, SessionHandle>                                    │
│    ├─ SshSession   (russh) ──┐                                                        │
│    ├─ TelnetSession (tcp)  ──┤ tiap session = tokio task, baca byte → Channel ke UI   │
│    ├─ SerialSession (serial)─┤ input dari UI → command → tulis ke stream              │
│    ├─ FtpSession   (suppaftp)┤                                                        │
│    └─ LocalPtySession (pty) ─┘                                                        │
│  ProfileStore (SQLite)     CredentialStore (keyring)                                  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Session lifecycle:**
1. UI panggil command `session_open(profile)` → backend buat task, return `session_id`.
2. Backend spawn tokio task: baca byte dari koneksi → kirim ke UI lewat **Tauri Channel** (efisien utk streaming, tidak flooding event bus).
3. UI kirim keystroke → command `session_write(session_id, bytes)`.
4. Resize terminal → command `session_resize(session_id, cols, rows)` → SSH `window_change`.
5. Tutup tab → `session_close(session_id)` → task di-drop, koneksi ditutup.

**Kenapa Channel bukan event biasa:** stream terminal bisa ribuan pesan/detik; Tauri v2 `Channel` dirancang untuk throughput tinggi tanpa membebani event system.

---

## 4. Struktur Folder (usulan)

```
remote-app/
├─ src/                        # Frontend React
│  ├─ components/
│  │  ├─ Terminal.tsx          # wrapper xterm.js (forwardRef + SearchAddon expose)
│  │  ├─ TabBar.tsx            # tab bar (drag-reorder, scroll wheel)
│  │  ├─ Sidebar.tsx           # profil tree (kiri)
│  │  ├─ RightPanel.tsx        # panel kanan (search + commands)
│  │  ├─ ConnectionForm.tsx
│  │  ├─ WelcomeScreen.tsx     # halaman awal
│  │  ├─ NewSessionDialog.tsx  # dialog buat sesi baru
│  │  └─ FtpBrowser.tsx        # dual-pane
│  ├─ lib/
│  │  ├─ ipc.ts                # wrapper invoke/Channel typed
│  │  └─ types.ts              # tipe Profile, Session, Protocol, dll
│  ├─ state/                   # store (Zustand/Context)
│  └─ App.tsx
├─ src-tauri/
│  ├─ src/
│  │  ├─ main.rs
│  │  ├─ session/
│  │  │  ├─ mod.rs             # SessionManager, trait Session
│  │  │  ├─ ssh.rs
│  │  │  ├─ ssh_compat.rs      # SSH fallback via native ssh binary + PTY
│  │  │  ├─ telnet.rs
│  │  │  ├─ serial.rs
│  │  │  ├─ ftp.rs
│  │  │  └─ local_pty.rs       # Terminal lokal (shell bawaan OS)
│  │  ├─ profile.rs            # SQLite store
│  │  ├─ credential.rs         # keyring
│  │  └─ commands.rs           # #[tauri::command] semua
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ package.json
└─ PLANNING.md
```

---

## 5. Data Model

**Profile (SQLite table `profiles`):**
```
id           TEXT (uuid) PK
name         TEXT
group_path   TEXT        -- folder/tag, mis. "Lab/Routers" (FR-9)
protocol     TEXT        -- ssh | telnet | serial | ftp
host         TEXT        -- utk ssh/telnet/ftp
port         INTEGER
username     TEXT
auth_method  TEXT        -- password | key   (ssh)
key_path     TEXT        -- path private key
serial_port  TEXT        -- /dev/ttyUSB0 | COM3
baud_rate    INTEGER
data_bits    INTEGER
parity       TEXT
stop_bits    INTEGER
ftps         INTEGER     -- bool, FTP over TLS
device_vendor TEXT       -- cisco_ios | mikrotik | huawei_vrp | juniper_junos | linux
created_at   INTEGER
updated_at   INTEGER
```

**Kredensial:** TIDAK disimpan di SQLite. Password/passphrase disimpan di **keyring**
dengan key = `remote-app:{profile_id}`. SQLite hanya menyimpan referensi (boolean "punya password tersimpan").

**Session log (FR-10, Could):** opsional, append byte ke file `~/.remote-app/logs/{session_id}.log`.

---

## 6. Breakdown Per Fase

> Tiap fase punya **Definition of Done (DoD)** yang bisa dites manual. Estimasi effort relatif (S/M/L).

### Fase 0 — Scaffold & Fondasi *(prasyarat, ~S)*
- [ ] Init proyek Tauri v2 + React + TS + Vite.
- [ ] Setup `SessionManager` kosong + trait `Session { write, resize, close }`.
- [ ] Pasang xterm.js, render terminal dummy yang echo input lokal.
- [ ] Setup pipe generik: command `session_write` + Channel `session_output`.
- **DoD:** window terbuka, terminal xterm menampilkan teks yang diketik (loopback lokal).

### Fase 1 — SSH Client Dasar *(PRD Fase 1, ~L)*
- [ ] Integrasi `russh`: connect host:port, auth **password** (FR-2).
- [ ] Buka shell channel PTY, stream stdout/stderr → UI.
- [ ] Keystroke UI → tulis ke channel; handle `session_resize` → `window_change`.
- [ ] Handle disconnect & tampilkan status di UI.

### Fase 7 — Fitur Lanjutan *(~M)*
- [x] Terminal Lokal (`portable-pty`).
- [x] Split View (Compare workspace, vertikal/horizontal, grouped tab).
- [x] Tab UX (drag-to-reorder, scroll wheel horizontal).
- [x] Panel Kanan Terpisah: Search (`@xterm/addon-search`) & Command Recommendations.

### Fase 8 — Smart Device Detection & Vendor-Aware Commands *(~M)*
- [ ] Deteksi otomatis pasif vendor/OS perangkat (Cisco IOS, MikroTik, Huawei VRP, Juniper, Linux) dari banner/prompt.
- [ ] Opsi manual pilihan "Tipe Perangkat / OS" di Form Profil & migrasi database SQLite (`device_vendor`).
- [ ] Katalog Command Presets bawaan per vendor (Cisco, MikroTik, Huawei, Juniper, Linux).
- [ ] `CommandPanel` kontekstual cerdas yang otomatis beradaptasi dengan tab terminal aktif.
- **DoD:** Perangkat terdeteksi otomatis/manual, `CommandPanel` secara presisi menampilkan preset & riwayat khusus vendor tersebut.
- [ ] Auth **private key** (FR-2) + passphrase.
- **DoD:** bisa SSH ke Ubuntu server pribadi, jalankan `vim`/`htop` (uji resize & escape sequence), copy-paste jalan (FR-7).

### Fase 2 — Telnet + Multi-tab *(PRD Fase 2, ~M)*
- [ ] `TelnetSession`: TCP connect + negosiasi opsi IAC dasar (ECHO, SGA, NAWS untuk window size).
- [ ] Multi-tab UI: banyak session paralel dalam satu window (FR-6).
- [ ] Tab bar: buka/tutup/switch, tiap tab punya xterm sendiri.
- **DoD:** buka 2+ sesi sekaligus (mis. 1 SSH + 1 Telnet) di tab berbeda, semua interaktif.

### Fase 3 — Serial Console + Auto-detect *(PRD Fase 3, ~M)*
- [ ] Enumerasi port: command `list_serial_ports()` via `serialport::available_ports()` (FR-5).
- [ ] Form serial: pilih port, baud, data bits, parity, stop bits (FR-4).
- [ ] `SerialSession`: baca/tulis byte ↔ terminal.
- [ ] Abstraksi nama port lintas OS (`/dev/ttyUSB0` vs `COM3`) — lihat Risiko.
- **DoD:** colok USB-to-serial, port terdeteksi otomatis, bisa akses console router/switch.

### Fase 4 — FTP Client Dual-pane *(PRD Fase 4, ~L)*
- [ ] `FtpSession` via `suppaftp`: connect, list, CWD, download, upload (FR-11).
- [ ] UI dual-pane: browser lokal (kiri) vs remote (kanan) (FR-12).
- [ ] Upload/download dengan progress; drag atau tombol.
- [ ] Opsi FTPS (FTP over TLS) di form koneksi (FR-13).
- **DoD:** connect FTP server, browse dua sisi, transfer file dua arah berhasil, FTPS opsional jalan.

### Fase 5 — Profil + Kredensial Terenkripsi *(PRD Fase 5, ~M)*
> **Rekomendasi:** pindahkan sub-tugas ini lebih awal — **subset minimal profil (host/user/port) di akhir Fase 1** — supaya testing tidak input manual terus. Sisanya (grouping, kredensial keyring, semua protokol) tetap di sini.
- [ ] CRUD profil: create/save/edit/delete (FR-1) → SQLite.
- [ ] Simpan password/passphrase ke **keyring**, bukan plaintext (FR-8).
- [ ] Sidebar profil dengan folder/tag (FR-9).
- [ ] Klik profil → auto-fill & connect.
- **DoD:** simpan profil lengkap, restart app, connect sekali klik tanpa ketik ulang; cek OS credential store berisi entry terenkripsi (bukan plaintext di file config).

### Fase 6 — Polish, Themes, Packaging *(PRD Fase 6, ~M)*
- [ ] Color themes terminal (FR-7) + preferensi font/scrollback.
- [ ] Auto-reconnect opsional SSH/Telnet (NFR reliability).
- [ ] Session logging ke file (FR-10, Could).
- [ ] Build installer: `.msi`/`.exe` (Win), `.dmg` (mac), `.deb`/`.AppImage` (Linux).
- [ ] Ikon, nama app, tentang, first-run experience.
- **DoD:** ✅ Installer platform jalan; app terbukti handal tanpa crash (metrik sukses PRD).

### Fase 7 — Fitur Lanjutan: Terminal Lokal, Split View, Tab UX, Panel Kanan *(~L)*
- [x] Terminal lokal: `LocalPtySession` via `portable-pty`, spawn `$SHELL` (FR-14).
- [x] Kartu Terminal Lokal di Welcome Screen + NewSessionDialog.
- [x] Split/Compare view: vertical & horizontal, grouped tab (FR-15).
- [x] Dropdown pilihan grup/folder otomatis di form profil.
- [x] Drag-to-reorder tab + scroll horizontal via mouse wheel (FR-16).
- [x] Padding internal terminal (anti pinggir layar).
- [ ] Panel kanan: Search terminal via `@xterm/addon-search` (FR-17).
- [ ] Panel kanan: Command recommendations berdasarkan frekuensi (FR-18).
- **DoD:** Semua fitur Fase 7 selesai, build bersih, diverifikasi user.

---

## Fase Lanjutan Hasil Audit (2026-07-23)

> Diturunkan dari audit config & keamanan (lihat WORKLOG 2026-07-23). Fase 11–12 menyentuh
> perilaku keamanan → **butuh persetujuan user (D-25..D-29) sebelum eksekusi**. Fase 10 aman/non-breaking.

### Fase 10 — Quick Wins Config & Kebersihan Repo *(~S, non-breaking)*
- [ ] `[profile.release]` di `Cargo.toml`: `opt-level="s"`, `lto=true`, `codegen-units=1`, `strip=true`, `panic="abort"` (D-30).
- [ ] Sempitkan fitur `tokio` dari `full` ke subset yang dipakai (rt-multi-thread, net, io-util, sync, time, process, macros).
- [ ] Tambah `src-tauri/target/` & `src-tauri/gen/` ke `.gitignore`.
- [ ] Isi CSP di `tauri.conf.json` (ganti `"csp": null` dengan policy ketat).
- [ ] Cek `cargo tree -d` untuk duplikasi rustls; rapikan bila ada dua major-version.
- **DoD:** `npm run build` & `cargo check` lulus, binary rilis mengecil, tidak ada regresi fungsi.

### Fase 11 — Security Hardening: SSH & FTPS *(~M, breaking — butuh D-25/D-26)*
- [ ] SSH host key: known_hosts + Trust-On-First-Use, ganti `check_server_key` `Ok(true)` (`ssh.rs`) & `StrictHostKeyChecking=no` (`ssh_compat.rs`) (D-25).
- [ ] UI trust dialog untuk host baru / host key berubah.
- [ ] FTPS: hapus `NoVerifier`, pakai verifier asli; opsi "trust insecure" eksplisit per-profil (D-26).
- **DoD:** Connect ke host baru memicu konfirmasi fingerprint; FTPS menolak cert invalid kecuali user opt-in.

### Fase 12 — Serial Permission & Kredensial Hardening *(~S, butuh D-27/D-28/D-29)*
- [ ] `fix_serial_permissions`: udev `MODE=0660 GROUP=dialout`, hapus `chmod 666` & hardcode user `diki` (D-27).
- [ ] Konfirmasi user sebelum `fuser -k -9` (D-28).
- [ ] Zeroize password/passphrase di memori via `zeroize` (D-29).
- **DoD:** Izin serial tidak lagi world-writable permanen; force-kill hanya setelah konfirmasi.

### Fase 13 — CI/CD & Testing *(~M)*
- [ ] Buat `.github/workflows/` matrix (win/mac/linux) — koreksi checklist yang keliru ditandai ✅.
- [ ] Test integrasi: SSH (`linuxserver/openssh-server`), FTP (`vsftpd`), serial (`socat` PTY).
- **DoD:** CI hijau di 3 platform; test integrasi jalan.

### Fase 16 — UX Productivity: Command Palette & Import/Export Profil *(~M, non-breaking)*
- [ ] `CommandPalette.tsx`: overlay Ctrl+K, fuzzy filter lintas sumber (D-33).
  - Sumber profil → Enter langsung connect.
  - Sumber snippet → kirim ke terminal aktif 1 tekan.
  - Sumber aksi app → buka Settings, sesi baru, split view, toggle panel.
- [ ] Hook global keybinding Ctrl+K di `App.tsx` (Esc menutup, ↑/↓ navigasi, Enter eksekusi).
- [ ] Backend `export_profiles` → tulis JSON semua profil (tanpa kredensial) (D-34).
- [ ] Backend `import_profiles` → baca JSON, buat `id` baru, reset `has_password=false`.
- [ ] `tauri-plugin-dialog` untuk save/open file picker + permission di capabilities.
- [ ] Tombol Export/Import di `Sidebar.tsx` atau `SettingsDialog.tsx`.
- **DoD:** Ctrl+K membuka palette & connect profil sekali Enter; export menghasilkan `.json` tanpa password; import memuat profil dengan status "belum ada password".

### Backlog Fitur (PRD §12 — belum dijadwalkan)
- SFTP via `russh-sftp` (lebih relevan untuk server Ubuntu daripada FTP).
- SSH port forwarding / tunneling.
- Persist settings/tema permanen (verifikasi `SettingsDialog.tsx`).

---

## 7. Cross-cutting Concerns

- **Security:** kredensial hanya di keyring; config file tak boleh berisi password. Tidak ada koneksi keluar ke pihak ketiga (NFR). Hati-hati logging jangan bocorkan password.
- **Encoding:** terminal harus UTF-8 aware; uji karakter non-ASCII (Risiko PRD). Byte mentah dilewatkan apa adanya ke xterm.js, jangan di-decode paksa di Rust.
- **Error handling:** semua command return `Result<T, AppError>` dengan tipe error jelas; UI tampilkan pesan ramah (connection refused, auth failed, timeout).
- **Serial cross-OS:** abstraksi enumerasi + label port yang konsisten; tampilkan deskripsi device bila ada.
- **Backpressure terminal:** batasi buffer output agar sesi high-throughput (mis. `cat` file besar) tidak nge-freeze UI.

---

## 8. Strategi Testing

- **Unit (Rust):** parser IAC Telnet, konstruksi config serial, mapping profil↔SQLite, credential store (mock keyring).
- **Integration:** SSH ke container `linuxserver/openssh-server` lokal; FTP ke container `vsftpd`; serial via `socat` PTY pair virtual.
- **Manual matrix:** tiap fase diuji di minimal Linux (dev utama) + 1 platform lain sebelum tandai selesai.
- **Regression escape sequence:** simpan skenario `vim`, `htop`, `less`, warna 256, resize.

---

## 9. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| SSH edge case (format key, timeout, PTY) | Uji dgn key ed25519 & rsa; set timeout & keepalive eksplisit. |
| Serial beda perilaku antar-OS | Abstraksi port di satu modul; uji di Linux & Windows sedini mungkin. |
| Encoding non-ASCII di terminal | Lewatkan byte mentah, biar xterm.js yang decode; test dedicated. |
| Throughput streaming bikin UI lag | Pakai Tauri Channel + buffering/chunking, bukan event per-byte. |
| keyring di Linux butuh Secret Service aktif | Fallback: prompt tiap connect bila keyring tak tersedia; dokumentasikan. |
| Build cross-platform CI | Siapkan GitHub Actions matrix (win/mac/linux) sejak Fase 1 agar tak kaget di Fase 6. |

---

## 10. Estimasi Timeline (indikatif, part-time)

| Fase | Effort | Perkiraan |
|------|--------|-----------|
| 0 Scaffold | S | ~2–4 hari |
| 1 SSH | L | ~1–2 minggu |
| 2 Telnet + tabs | M | ~1 minggu |
| 3 Serial | M | ~1 minggu |
| 4 FTP | L | ~1–2 minggu |
| 5 Profil + kredensial | M | ~1 minggu |
| 6 Polish + packaging | M | ~1 minggu |
| 7 Fitur lanjutan | L | ~2 minggu |

*MVP layak-pakai sehari-hari = sampai Fase 3 (SSH+Telnet+Serial+profil dasar).*

---

## 11. Keputusan Terbuka (butuh konfirmasi Diki)

1. **Frontend framework:** React (ekosistem xterm terkuat) vs Svelte (lebih ringan). Default rencana ini: **React**.
2. **Simpan profil:** SQLite (mendukung grouping rapi) vs JSON (lebih simpel). Default: **SQLite**.
3. **Prioritas MVP:** setuju geser subset profil dasar ke akhir Fase 1 supaya testing lebih enak?
4. **Target platform pertama** untuk daily-use (Linux dev utama?) — menentukan urutan uji manual.

---

## 12. Next Step Konkret

1. Konfirmasi 4 keputusan terbuka di atas.
2. Jalankan Fase 0: scaffold Tauri v2 + React + xterm.js loopback.
3. Lanjut Fase 1 SSH sampai bisa `vim` di server sungguhan.
