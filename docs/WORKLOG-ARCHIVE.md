# WORKLOG ARCHIVE — Catatan Perubahan (Arsip)

> Entry yang dipindahkan dari `WORKLOG.md` untuk menjaga file utama ≤ 200 baris.
> Diarsipkan pada: 2026-07-22.

---

## [2026-07-22] Redesain · Grouped Workspace Tab & Multi-Directional Split View (Persis Termius)
- **Tambah:** *Grouped Workspace Tab* di `src/components/TabBar.tsx` — saat 2 tab digabungkan menjadi mode compare/split view, tab-tab tersebut menyatu menjadi **1 tab tunggal di TabBar** (`Router 7606 Main | ⚏ Router 7606 Backup`) lengkap dengan tombol pisahkan (*unsplit*). Mengklik tab tunggal ini langsung membuka dan memfokuskan kedua terminal sekaligus.
- **Tambah:** Multi-directional drag-and-drop di `src/App.tsx` & `src/App.css`:
  - **Drag ke Kanan**: Mengaktifkan **Split Vertikal (Kiri / Kanan)**.
  - **Drag ke Bawah**: Mengaktifkan **Split Horizontal (Atas / Bawah)**.
- **Tambah:** Indikator visual *floating drag pill badge* (`.drop-zone-pill`) di tengah drop zone hijau glowing yang menampilkan judul tab yang sedang didrag (`Router 7606 Backup`) persis seperti pada screenshot Termius.
- **Tambah:** Tombol sakelar mode split `<Rows />` / `<Columns />` di header pane kanan untuk beralih antara Vertikal dan Horizontal secara langsung.
- **Kenapa:** Permintaan pengguna untuk memiliki visual penaruhan tab pill khas Termius, opsi split horizontal/vertikal, dan penggabungan tab compare menjadi 1 tab tunggal.
- **Efek:** Tampilan dan pengalaman penggunaan split workspace kini 100% identik dengan Termius namun dengan performa native yang jauh lebih ringan.

---

## [2026-07-22] Fix · Pembersihan & Termination Sempurna Subproses OS Saat Tab Ditutup
- **Ubah:** `src-tauri/src/session/ssh_compat.rs` — menyimpan `child: Arc<Mutex<Box<dyn Child>>>` di `LegacySshSession` dan secara eksplisit mengeksekusi `child.kill()` saat method `.close()` dipanggil atau tab ditutup.
- **Ubah:** `src-tauri/src/session/ssh.rs` — menghapus `task.abort()` instan di `.close()` agar handler `disconnect()` sempat mengeksekusi penutupan koneksi SSH secara bersih.
- **Kenapa:** Subproses `ssh` legacy sebelumnya tidak dimatikan (*orphaned process*) ketika tab ditutup, menyebabkan socket port 22 ke Cisco router tetap menggantung di background sampai seluruh aplikasi di-close.
- **Efek:** Menutup tab kini secara instan memutuskan koneksi socket ke router dan melepaskan VTY line, sehingga Termius atau tab lain dapat terhubung kembali tanpa error `Connection refused`.

---

## [2026-07-22] Fitur · Sidebar Collapse & Side-by-Side Terminal Split View (Gaya Termius)
- **Tambah:** Tombol toggle sidebar `<PanelLeft />` / `<PanelLeftClose />` di `TitleBar.tsx` serta shortcut keyboard `Ctrl+B` untuk menyembunyikan/menampilkan bar kiri secara transisi mulus.
- **Tambah:** Fitur *Drag & Drop Tab to Split* di `TabBar.tsx` & `App.tsx` — mendrag tab ke area workspace kanan menampilkan indikator *drop zone* hijau/cyan glowing persis seperti Termius.
- **Tambah:** Mode workspace `workspace-split` dual-pane side-by-side — memungkinkan 2 terminal dibuka dan dibandingkan secara bersamaan dalam 1 layar.
- **Tambah:** Tombol quick split `<Columns />` di TabBar serta header pane kanan lengkap dengan tombol penutup pane `<X />`.
- **Kenapa:** Permintaan pengguna untuk bisa menyembunyikan sidebar kiri dan membandingkan dua konfigurasi terminal berdampingan (*side-by-side*).
- **Efek:** Produktivitas dan fleksibilitas analisis konfigurasi antar perangkat meningkat drastis.

---

## [2026-07-22] Fitur · Tema Termius Midnight & Auto Syntax Highlighting Network CLI
- **Tambah:** `highlightNetworkCli()` di `src/components/Terminal.tsx` — mendeteksi dan memberi warna otomatis pada output terminal jaringan CLI.
- **Tambah:** Palet Tema `termius` di `Terminal.tsx` & `App.css` — nuansa dark midnight `#0d111a` khas Termius.
- **Kenapa:** Permintaan pengguna yang menyukai tampilan warna terminal dan penyorotan otomatis IP address seperti di Termius.
- **Efek:** Output terminal perangkat jaringan terlihat jauh lebih jelas, indah, dan mudah dianalisis.

---

## [2026-07-22] Fix · Perbaikan Fungsi Tombol TitleBar (Minimize, Maximize, Close)
- **Ubah:** `src-tauri/capabilities/default.json`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`, `src/components/TitleBar.tsx`.
- **Kenapa:** Tombol kustom window control sebelumnya terblokir oleh batasan izin Tauri v2 capabilities.
- **Efek:** Tombol Minimize, Maximize/Restore, dan Close kini berfungsi dengan instan dan lancar.

---

## [2026-07-22] Redesain · Custom Frameless TitleBar & Kurasi Palet Tema Terminal
- **Tambah:** `src/components/TitleBar.tsx`, upgrade 8 tema terminal, integrasi layout.
- **Kenapa:** Permintaan user untuk mengganti title bar OS yang kaku dan mempercantik warna teks terminal.
- **Efek:** Aplikasi kini berpenampilan frameless ala VS Code / Warp Terminal.

---

## [2026-07-22] Polish · UI Design System & Lucide Icons Migration
- **Ubah:** Sidebar, SerialForm, ProfileForm, SettingsDialog, FtpBrowser — ganti emoji dengan Lucide icons.
- **Tambah:** `WelcomeScreen.tsx` — landing page modern.
- **Efek:** Tampilan aplikasi jauh lebih konsisten, cepat, dan premium.

---

## [2026-07-21] Fitur · Auto-Detection & Persistence SSH Legacy Mode
## [2026-07-21] Hotfix · Dukungan SSH Perangkat Legacy (group1-sha1)
## [2026-07-21] Hotfix · Password Override pada Edit Profil
## [2026-07-21] Fase 6 · Polish, Themes, & Packaging (Selesai)
## [2026-07-21] Fase 4 · FTP Client Dual-pane (Selesai)
## [2026-07-21] Fase 3 · Serial Console + Auto-detect Port (Selesai)
## [2026-07-21] Fase 5 · Profil & Kredensial Terenkripsi (Selesai)
## [2026-07-21] Fase 2 · Telnet + Multi-tab (Selesai)
## [2026-07-21] Fase 1 · Verifikasi Key Authentication SSH (Selesai)
## [2026-07-21] Fase 0 · Setup tata-kelola multi-model
## [2026-07-21] Fase 0 · Kunci keputusan D-9…D-12
## [2026-07-21] Fase 0 · Rapikan struktur → folder docs/
## [2026-07-21] Fase 0 · Scaffold + pipa loopback (kode selesai)
## [2026-07-21] Fase 0 · SELESAI — build & verifikasi loopback
## [2026-07-21] Fase 1 · SSH client dasar (password terverifikasi)

> Detail masing-masing entry lama dapat dilihat di git history.
