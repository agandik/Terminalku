# Remote APP — Aplikasi Remote Access Desktop Modern (Tauri v2 + React)

![Remote APP Logo](dist/assets/index-ct7NtgBZ.css) *(Aplikasi Desktop Remote Management Perangkat Jaringan & Server)*

**Remote APP** adalah aplikasi desktop modern, ringan, dan sangat cepat yang dirancang khusus untuk administrator jaringan, insinyur sistem, dan pengembang. Dibangun di atas **Tauri v2** dan **React 19**, aplikasi ini menyediakan antarmuka akses jarak jauh serba ada untuk protokol **SSH**, **Telnet**, **Serial Console**, **FTP/FTPS**, dan **Terminal Lokal (PTY)**.

---

## ✨ Fitur Utama

### 📡 1. Serial Console & Manajemen Hardware Cerdas
- **Deteksi Port Otomatis**: Mendeteksi port USB-to-Serial (`/dev/ttyUSB*`, `/dev/ttyACM*`, `COM*`) secara *real-time*.
- **Auto-Detect Baud Rate Cerdas**: Menggunakan algoritma rasio evaluasi ASCII murni & pembatas prompt untuk menentukan kecepatan port (`38400`, `115200`, `9600`, `57600`, `19200`) secara akurat dalam waktu <0.4 detik tanpa *lag*.
- **1-Click Fix Izin Dialout & udev (Linux)**: Memperbaiki masalah `Permission Denied` dengan 1 klik via `pkexec` (menambahkan pengguna ke grup `dialout` dan membuat aturan udev `/etc/udev/rules.d/99-remote-app-serial.rules`).
- **Indikator Status Izin Dinamis**: Tombol status menampilkan `✓ Izin Dialout Fix` (hijau) atau `🔧 Fix Izin Dialout` (merah) secara otomatis.
- **Auto-Kill Force Release pada `EBUSY`**: Jika port terkunci oleh proses latar belakang atau ModemManager, aplikasi secara otomatis menjalankan `fuser -k -9` untuk melepas kuncian port secara aman.
- **Pembersih Karakter Garbled (Framing Noise Sanitizer)**: Memfilter byte mentah non-ASCII sehingga terminal terbebas dari deretan karakter pengganti acak (`\uFFFD`).

### 🔐 2. Client SSH & Telnet Handal
- **SSH v2 Full Feature**: Mendukung otentikasi kata sandi serta kunci privat (*RSA, ED25519, ECDSA*) dengan passphrase.
- **Telnet dengan Auto-Expect**: Mendukung penanganan negosiasi Telnet IAC (ECHO, SGA, NAWS) serta *Auto-Expect Login* untuk masuk secara otomatis menggunakan kredensial tersimpan.
- **Auto-Reconnect Opsional**: Otomatis menghubungkan kembali sesi yang terputus akibat gangguan jaringan.

### 💻 3. Terminal Lokal & Multi-Tab UX
- **Terminal Lokal (PTY)**: Mengintegrasikan terminal shell bawaan sistem OS (`bash`, `zsh`, `powershell`, `cmd`) langsung di dalam aplikasi.
- **Multi-Tab & Split View (Gaya Termius)**: Membuka banyak sesi sekaligus dalam tab terpisah atau membagi layar terminal (*vertical/horizontal split view*) untuk perbandingan *real-time*.
- **Drag-to-Reorder & Mouse Wheel Scroll**: Memindahkan posisi tab secara intuitif dan navigasi tab cepat via *scroll wheel*.

### 📂 4. Dual-Pane FTP & FTPS File Manager
- **Manajer File Dua Sisi**: Jelajahi direktori lokal (panel kiri) dan server remote (panel kanan) secara berdampingan dengan dukungan FTPS (FTP over TLS).

### 🏷️ 5. Smart Device Auto-Detection & Preset Vendor
- **Pendeteksi Perangkat Pasif**: Mengenali jenis perangkat keras & sistem operasi secara otomatis dari banner konsol (Cisco, MikroTik, Huawei, Juniper, Linux).
- **Command Panel Kontekstual**: Menyediakan pustaka perintah preset siap pakai yang menyesuaikan dengan tipe vendor tab yang sedang aktif.

### 📌 6. Snippet / Macro Manager (FR-21)
- **Library Perintah Tersimpan**: Simpan command yang sering digunakan ke dalam pustaka SQLite persisten.
- **Filter per Vendor & 1-Click Send**: Kelompokkan snippet berdasarkan vendor (Cisco, MikroTik, Linux, dll) dan kirim ke terminal aktif hanya dengan 1 klik.

### 💾 7. Session Logging UI (FR-10)
- **Perekaman Sesi Otomatis**: Rekam seluruh byte output terminal ke dalam file log di `app_data/logs/`.
- **Integrasi 1-Klik**: Buka file log langsung di aplikasi bawaan OS via `open_log_file`.

### 🔒 8. Pengelolaan Profil & Kredensial Terenkripsi
- **Penyimpanan Kredensial Aman**: Password dan passphrase disimpan di dalam OS Credential Keyring (bukan *plaintext*).
- **Organisasi Folder/Tag**: Mengelompokkan profil server/perangkat ke dalam folder custom untuk akses cepat.

---

## 🛠️ Teknologi & Arsitektur

- **Core Desktop**: [Tauri v2](https://v2.tauri.app/) (Rust + Webview)
- **Backend Protocol Engine**: `russh` (SSH), `tokio-serial` (Serial UART), `suppaftp` (FTP), `portable-pty` (Terminal PTY)
- **Frontend UI**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Terminal Canvas**: `@xterm/xterm` v5 dengan addon `fit`, `web-links`, dan `search`
- **Penyimpanan Lokal**: SQLite (Profil & Folder) + Native OS Keyring (Kredensial)

---

## 🚀 Panduan Memulai & Instalasi

### Prasyarat Pengembangan
1. **Node.js**: v18+ dan `npm`
2. **Rust**: Rustup & Cargo (v1.75+)
3. **Dependensi Linux (Debian/Ubuntu)**:
   ```bash
   sudo apt update
   sudo apt install -y build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev fuser pkexec
   ```

### Jalankan Mode Pengembang (Development)
```bash
# Clone repositori & masuk ke direktori
cd "Remote APP"

# Install dependensi frontend
npm install

# Jalankan server pengembang Tauri
npm run tauri dev
```

### Build Aplikasi Produksi
```bash
# Kompilasi bundel aplikasi lokal
npm run tauri build
```
Hasil instalasi akan berada di folder `src-tauri/target/release/bundle/`.

---

## 📜 Lisensi & Kontribusi

Dibuat & dipelihara untuk efisiensi tinggi dalam manajemen remote access. Hak Cipta © 2026 Remote APP Team.
