# PRD: Remote Access Desktop App (SSH / Telnet / Serial Console / FTP / Local Terminal)

**Versi:** 0.3
**Tanggal:** 21 Juli 2026
**Owner:** Diki

---

## 1. Ringkasan

Aplikasi desktop cross-platform (Windows/Linux/Mac) untuk melakukan remote access ke mesin Ubuntu pribadi dan perangkat jaringan, dengan dukungan protokol **SSH**, **Telnet**, **Serial/Console**, **FTP** (transfer file), dan **Terminal Lokal** (shell bawaan OS). Terinspirasi dari tools seperti PuTTY, MobaXterm, dan Termius, tapi custom-built sesuai kebutuhan sendiri.

## 2. Latar Belakang & Masalah

Saat ini remote access ke server/device (Ubuntu pribadi maupun perangkat jaringan seperti router/switch) masih tersebar di beberapa tools terpisah (terminal SSH biasa, aplikasi terminal serial terpisah, dll). Dibutuhkan satu aplikasi terpadu yang ringan, cepat, dan bisa menyimpan profil koneksi supaya akses jadi lebih efisien.

## 3. Tujuan (Goals)

- Satu aplikasi untuk semua kebutuhan remote terminal access (SSH, Telnet, Serial) + terminal lokal
- Ringan dan cepat dijalankan di 3 platform utama (Windows, Linux, macOS)
- Mendukung penyimpanan profil koneksi (host, port, kredensial) supaya tidak perlu input ulang tiap kali
- UI/UX sederhana dengan multi-tab/multi-session, split view, dan panel bantu (search + command rekomendasi)

## 4. Ruang Lingkup (Scope)

### In Scope
- SSH client (autentikasi password & key-based)
- Telnet client
- Serial console (koneksi ke port serial/USB-to-serial, berguna untuk akses console perangkat jaringan seperti router/switch)
- FTP client (transfer file, termasuk mendukung FTPS/SFTP sebagai varian aman)
- Manajemen profil koneksi (simpan host, port, user, kredensial/key path)
- Terminal emulator dengan fitur dasar: resize, scrollback, copy-paste, color themes
- Multi-tab / multi-session dalam satu window
- Terminal lokal (buka shell OS seperti bash/zsh langsung di dalam tab)
- Split/Compare view (vertikal & horizontal) untuk membandingkan dua sesi
- Drag-to-reorder tab + scroll horizontal via mouse wheel
- Panel kanan: pencarian teks di terminal + rekomendasi command yang sering digunakan

### Out of Scope (untuk versi ini)
- **RDP** — tidak diperlukan
- **VNC** — tidak diperlukan
- Sinkronisasi cloud/multi-device — tidak direncanakan

## 5. Target Pengguna & Use Case

Personal tool, digunakan sendiri untuk:
- Mengakses Ubuntu server/VM pribadi via SSH
- Mengakses perangkat lama/lab yang masih pakai Telnet
- Mengakses console port perangkat jaringan (mis. router/switch) via serial/USB-to-serial, terutama saat perangkat tidak reachable lewat network (butuh akses console langsung)

## 6. Functional Requirements

| ID | Requirement | Prioritas |
|----|-------------|-----------|
| FR-1 | User dapat membuat, menyimpan, edit, dan hapus profil koneksi | Must |
| FR-2 | User dapat connect via SSH dengan autentikasi password atau private key | Must |
| FR-3 | User dapat connect via Telnet | Must |
| FR-4 | User dapat connect ke port serial (pilih port + baud rate + parity/stop bits) | Must |
| FR-5 | Aplikasi menampilkan daftar port serial yang terdeteksi otomatis | Should |
| FR-6 | User dapat membuka beberapa sesi sekaligus dalam tab berbeda | Must |
| FR-7 | Terminal mendukung resize, scrollback buffer, copy-paste | Must |
| FR-8 | Kredensial (password/passphrase) disimpan terenkripsi, bukan plaintext | Must |
| FR-9 | User dapat mengelompokkan profil koneksi (folder/tag) | Could |
| FR-10 | Log/history sesi bisa disimpan ke file lokal | Could |
| FR-11 | User dapat connect via FTP untuk transfer file (upload/download) | Must |
| FR-12 | Tampilan FTP dalam bentuk dual-pane browser (lokal vs remote) | Should |
| FR-13 | Mendukung FTPS (FTP over TLS) sebagai opsi koneksi aman | Could |
| FR-14 | User dapat membuka terminal lokal (shell bawaan OS) tanpa remote connection | Should |
| FR-15 | Split/Compare view: dua sesi berdampingan (vertikal/horizontal) | Should |
| FR-16 | Drag-to-reorder tab + scroll horizontal di tab bar saat banyak tab | Should |
| FR-17 | Pencarian teks di output terminal (search in terminal) | Should |
| FR-18 | Panel rekomendasi command berdasarkan frekuensi penggunaan | Could |
| FR-19 | Auto-detection tipe perangkat & OS (Cisco, MikroTik, Huawei, Juniper, Linux) | Should |
| FR-20 | Rekomendasi command presisi kontekstual per vendor/OS | Should |
| FR-21 | Snippet / Macro Manager: library command tersimpan, bisa dikirim ke terminal 1 klik | Should |

## 7. Non-Functional Requirements

- **Cross-platform:** build native untuk Windows, Linux, macOS
- **Performance:** startup cepat, low memory footprint
- **Security:** kredensial tersimpan terenkripsi (mis. pakai OS keychain/credential store), tidak ada transmisi data ke server pihak ketiga
- **Reliability:** auto-reconnect opsional saat koneksi SSH/Telnet putus
- **Portability:** instalasi tanpa dependency berat (hindari perlu install runtime tambahan secara manual)

## 8. Arsitektur Teknis (Diusulkan)

- **Shell aplikasi:** Tauri (Rust + webview) — dipilih karena resource footprint lebih kecil dibanding Electron
- **Terminal UI:** `xterm.js`
- **SSH:** library `russh` (Rust) atau `ssh2` bila pakai Node-based stack
- **Telnet:** implementasi raw TCP socket (protokol Telnet relatif sederhana)
- **Serial:** `serialport` (Node) atau crate `serialport` (Rust), untuk enumerasi port & komunikasi
- **FTP:** crate `suppaftp` (Rust, mendukung FTP & FTPS) atau library `basic-ftp` (Node)
- **Penyimpanan kredensial:** OS-native secure storage (Keychain di macOS, Credential Manager di Windows, Secret Service/libsecret di Linux)
- **Penyimpanan profil koneksi:** local config file (JSON/SQLite)

## 9. Milestone / Fase Pengembangan

| Fase | Deliverable |
|------|-------------|
| Fase 1 | SSH client dasar (connect, auth password, terminal jalan) |
| Fase 2 | Tambah Telnet + multi-tab/session |
| Fase 3 | Tambah Serial console + auto-detect port |
| Fase 4 | Tambah FTP client (dual-pane upload/download) |
| Fase 5 | Manajemen profil koneksi + penyimpanan kredensial terenkripsi |
| Fase 6 | Polish UI, themes, packaging installer untuk 3 platform |
| Fase 7 | Fitur lanjutan: Terminal Lokal, Split View, Tab UX, Panel Kanan Terpisah (Search + Commands) |
| Fase 8 | Smart Device Detection (Cisco, MikroTik, Huawei, Juniper, Linux) + Vendor-Aware Commands |
| Fase 9 | Serial Hardware Engine: Auto-Kill `EBUSY`, 1-Click `pkexec` Dialout/udev Repair, Baud ASCII Scoring & Framing Noise Sanitizer |
| Fase 10 | Quick Wins: `[profile.release]` Cargo, tokio subset, CSP, .gitignore |
| Fase 11 | Security Hardening: SSH TOFU host key + FTPS cert verify |
| Fase 12 | Serial Permission & Kredensial Hardening: udev MODE=0660, fuser konfirmasi, zeroize |
| Fase 13 | CI/CD & Testing: GitHub Actions matrix (win/mac/linux), unit test Rust |
| Fase 14 | Session Logging UI: toggle rekam + buka log di text editor/file manager OS (FR-10) |
| Fase 15 | Snippet / Macro Manager: library command tersimpan per vendor (FR-21) |

## 10. Metrik Keberhasilan

- Bisa dipakai sehari-hari menggantikan kombinasi tools lama (terminal SSH manual + tool serial terpisah)
- Waktu untuk connect ke device favorit turun signifikan berkat saved profiles
- Aplikasi stabil jalan lintas platform tanpa crash pada penggunaan normal

## 11. Risiko & Pertimbangan

- Implementasi SSH/Telnet/Serial dari nol butuh testing ekstra untuk edge case (auth key format, timeout, encoding karakter non-ASCII di terminal)
- Cross-platform serial port access punya perbedaan behavior antar OS (naming port: `/dev/ttyUSB0` vs `COM3`) — perlu abstraksi yang rapi

## 12. Future Considerations (Tidak untuk versi awal)

- File transfer SCP/SFTP
- Port forwarding / SSH tunneling
- Kembali mempertimbangkan RDP/VNC bila ada kebutuhan baru
