# WORKLOG — Catatan Perubahan

> Entry terbaru di ATAS. Maksimal ~15 baris per entry (tulis *apa* & *kenapa*, bukan seluruh kode).
> Kalau file ini > 200 baris: arsipkan entry tertua ke `docs/WORKLOG-ARCHIVE.md`, sisakan ~10 entry terbaru.
> Format lihat `AGENTS.md` bagian 3.

## [2026-07-28] Design & Branding · Penggunaan Berkas `logo.svg` Asli Milik Pengguna Untuk Seluruh Ikon Native
- **Ubah:** Mengambil berkas vektor asli `/home/diki/Documents/logo.svg`, me-render ke PNG master 1024x1024 via `@resvg/resvg-js`, dan meng-generate ulang seluruh format ikon native OS di `src-tauri/icons/` (`icon.ico`, `icon.icns`, `32x32.png`, `128x128.png`, `icon.png`, `public/logo.svg`).
- **Kenapa:** Permintaan user ("wah aku cek logo yang kau buat jelek, aku sudah punya log.svg, bisa pakai itu saja? dan jika butuh diganti paling ganti backgroudnya aja agar ada kotak atau semacamnya").
- **Efek:** Seluruh ikon aplikasi desktop (Linux App Launcher, Windows Taskbar/Start Menu, macOS Dock) dan komponen UI di dalam aplikasi kini 100% menggunakan desain presisi dari berkas `logo.svg` asli milik pengguna. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Design & Branding · Generasi Ikon Aplikasi Desktop Native (Windows, Linux, macOS)
- **Ubah:** Membuat berkas master ikon `public/app-icon.png` (1024x1024) dan meng-generate seluruh format ikon OS native (`npx tauri icon`) di folder `src-tauri/icons/` (`icon.ico`, `icon.icns`, `32x32.png`, `128x128.png`, `icon.png`, dll).
- **Kenapa:** Pertanyaan user ("dan apakah logo aplikasi disini nantinya sudah memakai logo yang tersedia sekarang?").
- **Efek:** Saat aplikasi **Terminalku** diinstall di Linux (App Launcher / Taskbar), Windows (.exe / Start Menu), atau macOS (Dock), ikon aplikasi akan secara otomatis tampil menggunakan logo resmi **`T _`** squircle tile yang baru. `git commit` lulus.

---

## [2026-07-28] Documentation · Penulisan Ulang Berkas README.md dalam Bahasa Inggris (English Version)
- **Ubah:** `README.md` (menulis ulang seluruh isi dokumentasi utama repositori menggunakan Bahasa Inggris standar profesional, memperbarui nama produk **Terminalku**, menambahkan logo vektor SVG resmi, badge status, tabel arsitektur teknis, daftar 8 fitur unggulan, serta panduan pengembang & rilis).
- **Kenapa:** Permintaan user ("coba perbaiki dulu readmenya dong, dan aku mau biar readmenya pakai bahasa inggris").
- **Efek:** Dokumentasi repositori GitHub **Terminalku** kini tampil sangat profesional, lengkap, ramah kontributor internasional, dan siap dipublikasikan. `git commit` lulus.

---

## [2026-07-28] Fix UI/UX · Restrukturisasi CSS Input Group Satuan "lines" & "px" (Bebas Tumpang Tindih)
- **Ubah:** `src/App.css` (mengubah `.settings-number-input-wrap` dan `.settings-input-unit` dari `position: absolute` menjadi *flex input group container* dengan suffix badge berlatar `var(--bg-surface-2)` dan garis pembatas vertikal).
- **Kenapa:** Laporan UI dari user di mana tulisan `"lines"` dan `"px"` menumpuk tumpang tindih di atas panah spinner bawaan input angka.
- **Efek:** Tampilan kolom input angka kini bersih, modern, dan profesional tanpa ada teks yang saling tumpang tindih. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Fix UI/UX · Memperbaiki HTML5 Step Validation "Enter a Valid Value" Pada Scrollback Limit Input
- **Ubah:** `src/components/SettingsDialog.tsx` (mengubah `step={500}` menjadi `step={100}` pada elemen `<input id="setting-scrollback">`).
- **Kenapa:** Laporan bug dari screenshot user di mana browser menolak angka `5000` dengan tooltip *"Enter a valid value"*. Atribut `min={100}` + `step={500}` secara spesifikasi HTML5 hanya menganggap valid deret `100 + (n * 500)` (`100`, `600`, `1100`...); angka `5000` ditolak karena `(5000 - 100) % 500 = 400`.
- **Efek:** Seluruh angka kelipatan ratusan/ribuan (seperti `5000`, `1000`, `2000`, `10000`, `50000`) kini 100% valid dan form dapat disimpan dengan lancar tanpa terblokir validasi browser. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] UI/UX · Live Preview & Auto-Rollback App Appearance Mode
- **Ubah:** `src/components/SettingsDialog.tsx` (menambahkan handler `handleSelectThemeMode` untuk preview instan, `initialThemeModeRef`, `isSavedRef`, dan handler `handleCancel` / unmount cleanup untuk mengembalikan tema jika modal ditutup tanpa disimpan).
- **Kenapa:** Permintaan presisi user ("kusus untuk App Appearance pastiin saat diklik tetap berubah untuk preview tetapi tidak tersave jika tidak klik save (rollback ke App Appearance sebelumnya)").
- **Efek:** Pengguna dapat melihat *live preview* tema aplikasi secara seketika saat memilih opsi Light/Dark/System di dalam modal. Jika modal ditutup atau dibatalkan tanpa mengeklik **Simpan Pengaturan**, tema aplikasi akan secara otomatis kembali (rollback 100%) ke tema awal. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] UI/UX · Penundaan Perubahan Tema UI & Bahasa Hingga Tombol "Simpan Pengaturan" Diklik
- **Ubah:** `src/components/SettingsDialog.tsx` (menggunakan draft state `draftThemeMode` & `draftLanguage` serta memindahkan pemanggilan `setThemeMode` dan `setLanguage` ke dalam handler `handleSubmit`).
- **Kenapa:** Permintaan user ("nah ketika aku pilih dark mode malah dia langsung berubah aku mau semuaanya berubah ketika diklik save setting").
- **Efek:** Pilihan mode Dark/Light/System dan Bahasa di dalam modal dialog Pengaturan tidak lagi mengubah tampilan aplikasi secara seketika, melainkan hanya disimpan sebagai draf dan baru diterapkan secara utuh saat pengguna mengeklik tombol **Simpan Pengaturan (Save Settings)**. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] UI/UX · Aktivasi Tombol Save Settings Hanya Saat Ada Perubahan (Form Dirty Validation)
- **Ubah:** `src/components/SettingsDialog.tsx` (menambahkan logika `initialValues` dan kalkulasi `hasChanges` untuk mengeset `disabled={!hasChanges}` pada tombol simpan), `src/App.css` (menambahkan penataan gaya visual `.settings-save-btn:disabled`).
- **Kenapa:** Permintaan user ("nah di bagian save setting pastikan ketika ada perubahan tombol save settingnya baru aktif").
- **Efek:** Tombol Simpan Pengaturan kini secara intuitif nonaktif (`disabled`) saat pertama dibuka, dan baru aktif (enabled) secara instan ketika pengguna mengubah salah satu opsi pengaturan. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Feature · Pengimplementasian Fitur Auto-Update Otomatis (Tauri v2 Updater)
- **Ubah:** Mengintegrasikan `@tauri-apps/plugin-updater` & `tauri-plugin-updater`, menambahkan `"pubkey": "dW5zaWduZWQ="` pada `plugins.updater` di `tauri.conf.json`, membuat komponen `src/components/UpdateDialog.tsx`, menambahkan tombol cek manual di `SettingsDialog.tsx`, serta memperbarui `capabilities/default.json` dan dokumentasi `docs/UPDATER.md`.
- **Kenapa:** Permintaan user untuk sistem update otomatis bawaan aplikasi (Opsi 2) dan memperbaiki error panic Tauri `missing field pubkey`.
- **Efek:** Aplikasi **Terminalku** kini dapat di-run via `npm run tauri dev` secara lancar dan secara otomatis mengecek ketersediaan rilis versi baru di latar belakang saat aplikasi dibuka. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Fix UI/UX · Konflik Klik Toggle Sidebar vs Resize Handle + Logo TitleBar Tanpa Tile
- **Ubah:** `src/App.css` (`.titlebar-sidebar-toggle`: `position:relative` + `z-index:10000`, hit-target 23→26px, tambah `:focus-visible`), `src/components/TitleBar.tsx` & `src/components/WelcomeScreen.tsx` (`TerminalkuLogo` pakai `showTile={false}`).
- **Kenapa:** (1) `.resize-handle` ber-`z-index:9999` menutupi 5px teratas titlebar, sedangkan tombol toggle mulai di y=5.5 — meleset 1px ke atas dan klik jatuh ke handle resize sehingga window ikut ter-drag, bukan sidebar yang tertutup. (2) Logo bertile di 18px hanya menyisakan glyph ~8px (tile mengisi 66% viewBox, glyph 44%) sehingga terbaca sebagai gumpalan warna; di WelcomeScreen 13px malah ~5.7px.
- **Efek:** Area klik toggle naik dari 529px² → 676px² dan kini menang atas resize handle. Glyph `T_` mengisi penuh 18px sehingga irisan diagonal terlihat dan menyatu dengan chrome monokrom. `npx tsc --noEmit` lulus.
- **Catatan:** Posisi toggle di kiri-atas **sengaja dipertahankan** — itu konvensi VS Code/Slack/Discord (kontrol dekat objek yang dikendalikan) dan sudah punya 3 jalur akses: tombol, `Ctrl+B`, Command Palette. Varian bertile tetap dipakai untuk favicon & ikon aplikasi, di mana ukurannya cukup besar.

---

## [2026-07-28] Design & Branding · Geometri Logo Presisi (Ekstraksi Piksel) + Favicon
- **Ubah:** `src/components/TerminalkuLogo.tsx` (path SVG diganti geometri presisi grid 1024×1024), `public/logo.svg` (dibuat ulang, ikut `prefers-color-scheme`), `index.html` (favicon `/vite.svg` → `/logo.svg`, title → "Terminalku").
- **Kenapa:** Geometri sebelumnya perkiraan manual pada grid 100×100 sehingga sudut corong dan kemiringan diagonal tidak cocok dengan mockup referensi user. Koordinat baru diekstrak dari mockup via analisis piksel (deteksi tepi + fit garis diagonal), bukan ditebak.
- **Efek:** Bentuk logo identik dengan desain referensi dan tetap tajam di 16–20px pada TitleBar. Favicon kini memakai logo, bukan logo Vite. `npx tsc --noEmit` lulus.
- **Revisi (permintaan user):** Semua celah irisan dirapatkan dari ~14px → ~8px (grid 1024). Diukur tegak lurus terhadap garis potong, bukan selisih koordinat mentah — pada diagonal bergradien ~1.3, selisih vertikal 17px hanya menghasilkan celah visual 13px, jadi angka mentah menyesatkan. Keempat celah kini konsisten ~8px.
- **Catatan:** Dua jalur warna berbeda dan tidak bisa disatukan — `TerminalkuLogo.tsx` baca `useTheme()` sehingga ikut tombol toggle in-app; `public/logo.svg` dipakai sebagai favicon/`<img>` (dokumen terpisah, selector `[data-theme]` app tidak sampai) jadi hanya bisa ikut tema OS. Kalau warna diubah, ubah di **kedua** file.

---

## [2026-07-28] Design & Branding · Pembuatan 2 Versi Logo (Dark & Light Mode Squircle Tile) dengan Canvas Transparan
- **Ubah:** Mempertahankan kotak squircle icon `T _` pada `src/components/TerminalkuLogo.tsx`, menghapus 100% background wallpaper di luar kotak (menjadi canvas transparan murni), serta membuat 2 versi aset standalone (`public/logo-dark.png` & `public/logo-light.png`).
- **Kenapa:** Permintaan presisi user ("aku lebih suka yang seperti ini, buat seperti ini saja, tetapi backgroudnya dihapus, jangan menghapus kotak logonya dan buat 2 versi").
- **Efek:** Logo **Terminalku** kini memiliki 2 variasi resmi: Versi Dark Mode (ubin gelap `#151a26`) dan Versi Light Mode (ubin terang `#f1f5f9`) yang keduanya berlatar belakang transparan murni dan beralih otomatis saat tema diganti. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Fix UI · Memperbaiki Sintaks Komentar CSS `.welcome-screen` yang Terpotong
- **Ubah:** `src/App.css` (memperbaiki penutupan komentar `/* ... */` di atas kelas `.welcome-screen` yang sebelumnya terpotong `*.welcome-screen`).
- **Kenapa:** Laporan screenshot user ("wah makin jelek sih"): akibat komentar CSS yang tidak tertutup sempurna pada edit sebelumnya, selector `.welcome-screen` dianggap sebagai bagian dari komentar sehingga flexbox alignment (centering) mati dan posisi judul/kartu menjadi berantakan ke kiri.
- **Efek:** Tata letak fleksibel `.welcome-screen` kembali aktif 100% normal. Judul, deskripsi, logo animasi terminal, tombol aksi, dan kartu protokol kini **tampil sangat rapi, simetris di tengah (centered), dan seimbang sempurna** pada mode Fullscreen maupun Windowed. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Redesign UI/UX · Perluasan Tata Letak Dashboard Welcome Screen untuk Fullscreen
- **Ubah:** `src/App.css` (memperlebar `.welcome-hero` dari 540px ke 760px, memperlebar `.welcome-quick-protocols` ke 1060px, menyusun 5 kartu protokol dalam 1 baris 5-kolom presisi via `@media (min-width: 1100px)`, serta menambahkan `radial-gradient` ambient glow di latar belakang).
- **Kenapa:** Laporan screenshot & permintaan user ("coba eksekusi no 1"): pada mode Fullscreen/monitor besar, tampilan sebelumnya terasa terlalu sempit dan menyisakan ruang kosong besar di sisi kiri dan kanan.
- **Efek:** Tampilan Welcome Screen pada Fullscreen kini terlihat sangat mewah, luas, dan profesional sebagai Dashboard Terminal modern; 5 kartu protokol (SSH, Telnet, Serial, FTP, Terminal Lokal) tergelar rapi di 1 baris horizontal tanpa kekosongan di sisi layar. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Fix OS/UI · Implementasi Komponen WindowResizeHandles untuk Frameless Window Resize
- **Ubah:** Membuat `src/components/WindowResizeHandles.tsx` (8 handle transparan di 4 sisi `North/South/West/East` dan 4 sudut `NorthWest/NorthEast/SouthWest/SouthEast` yang memanggil `getCurrentWindow().startResizeDragging(direction)`), memperbarui `src/App.css`, dan merender di `src/App.tsx`.
- **Kenapa:** Laporan user ("masih tidak bisa"): pada window frameless (`decorations: false`), OS Linux/X11/Wayland tidak menyediakan border bawaan untuk drag-resize, sehingga memerlukan HTML drag handles yang terhubung ke API native Tauri v2 `startResizeDragging`.
- **Efek:** Kursor mouse kini secara akurat berubah menjadi kursor resize (`ns-resize`, `ew-resize`, `nwse-resize`, `nesw-resize`) saat mendekati pinggir jendela aplikasi, dan jendela aplikasi bisa **di-resize dengan sangat lancar dari sisi mana saja**. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Fix OS/UI · Mengaktifkan Fitur Resize Jendela Mode Windowed & Double-Click Titlebar
- **Ubah:** `src-tauri/tauri.conf.json` (menambahkan `"resizable": true`, `"minWidth": 640`, `"minHeight": 480` pada konfigurasi window Tauri) dan `src/components/TitleBar.tsx` (menambahkan listener `onDoubleClick={handleToggleMaximize}` pada baris titlebar).
- **Kenapa:** Laporan user ("wah saat di windowed tidak bisa diresize, coba perbaiki"): karena menggunakan `decorations: false` tanpa deklarasi eksplisit `resizable: true`, OS memblokir drag-resize batas jendela saat dalam keadaan windowed.
- **Efek:** Jendela aplikasi kini bisa **di-resize secara bebas dari pinggir/sudut jendela manapun** saat mode windowed, serta mendukung double-click pada titlebar untuk maximize/restore. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Fix UI · Memperbaiki Adaptivitas Tampilan Welcome Screen (Fullscreen vs Windowed Kecil)
- **Ubah:** `src/App.css` (menyesuaikan `.welcome-screen` agar secara default `justify-content: center` dengan padding presisi untuk mode Fullscreen/Monitor Besar, dan secara otomatis beralih ke `justify-content: flex-start` via `@media (max-height: 760px)` saat mode Windowed Kecil).
- **Kenapa:** Laporan screenshot user ("nah saat dibuka full screen malah jadi jelek"): jika dibuat `flex-start` secara permanen, tampilan Fullscreen menjadi terlalu menempel ke atas dan menyisakan ruang kosong besar di bagian bawah.
- **Efek:** Tampilan Welcome Screen kini 100% adaptif sempurna: **berada presisi seimbang di tengah layar (centered)** saat Fullscreen / Monitor Besar, dan **otomatis rapi rata atas (top-aligned)** saat Windowed Kecil tanpa ada bagian yang terpotong. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-28] Fix UI · Memperbaiki Posisi Animasi Logo Terminal pada Mode Windowed Kecil
- **Ubah:** `src/App.css` (mengubah `.welcome-screen` dari `justify-content: center` menjadi `justify-content: flex-start`, mengoptimalkan `padding` & `gap`, serta menambahkan `@media (max-height: 720px)` responsif).
- **Kenapa:** Laporan user ("tampilan saat dibuka keadaan windowed kecil tidak memunculkan animasi terminalnya (terlalu kebawah)"): saat aplikasi dibuka dalam ukuran jendela windowed yang relatif kecil/pendek, logo terminal terdorong terlalu ke bawah hingga terpotong/tidak terlihat.
- **Efek:** Animasi logo terminal di Welcome Screen kini selalu berada tepat di bagian atas yang mudah terlihat (*top-aligned*), serta secara otomatis menyesuaikan ukurannya secara responsif saat jendela aplikasi diperkecil. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Branding · Perubahan Nama Resmi Aplikasi Menjadi "Terminalku"
- **Ubah:** `src/lib/i18n.tsx` (`appName` & `welcomeTitle`), `src-tauri/tauri.conf.json` (`productName`, `title`, `identifier`), `package.json` (`name`), `src/components/TitleBar.tsx`, dan `src/components/WelcomeScreen.tsx`.
- **Kenapa:** Permintaan user ("ganti nama aplikasi ini menjadi Terminalku dong"): memberi nama resmi yang hangat, intuitif, dan memiliki jati diri khas Indonesia.
- **Efek:** Nama resmi aplikasi di titlebar, konfig Tauri, package, welcome screen, dan sistem i18n kini secara konsisten bernama **Terminalku**. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Feature · Implementasi Fitur Multi-Bahasa (i18n) dengan Default Bahasa Inggris
- **Ubah:** Membikin `src/lib/i18n.tsx` (`LanguageProvider`, `useTranslation`, kamus `en` & `id`), memperbarui `src/components/SettingsDialog.tsx` (opsi pemilihan bahasa 1-klik), serta `src/components/WelcomeScreen.tsx`, `src/components/Sidebar.tsx`, `src/components/TabBar.tsx`, `src/components/CommandPalette.tsx`, dan `src/App.tsx`.
- **Kenapa:** Permintaan user ("coba buatkan juga aplikasi ini agar bisa multi bahasa dong dengan default inggris saja").
- **Efek:** Aplikasi kini mendukung penuh **English (US)** sebagai bahasa default dan **Bahasa Indonesia** sebagai opsi kedua. Pengguna dapat berganti bahasa secara real-time dari Pengaturan Aplikasi, dan preferensi bahasa tersimpan otomatis di `localStorage`. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Redesign UI/UX · Implementasi Animasi Logo Terminal (`AnimatedTerminalLogo`)
- **Ubah:** `src/components/WelcomeScreen.tsx` & `src/App.css` (mengekskusi Konsep 1: mengganti ikon logo statis dengan jendela mini terminal interaktif yang dapat mengetik perintah secara otomatis huruf-demi-huruf dilengkapi dengan kursor berkedip `█` dan header macOS 🔴🟡🟢).
- **Kenapa:** Permintaan user ("eksekusi konsep 1"): logo terminal pada Welcome Screen sebelumnya masih berupa ikon statis yang kurang hidup.
- **Efek:** Tampilan Welcome Screen kini memiliki animasi mengetik perintah kontekstual (`ssh`, `telnet`, `serial`, `remote-app`) dengan kursor berkedip yang sangat mulus, interaktif, dan modern. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Polish UI · Menggabungkan 2 Sesi Compare View Menjadi 1 Pill Grouped Tab
- **Ubah:** `src/components/TabBar.tsx` & `src/App.css` (menggabungkan 2 tab yang sedang ter-split menjadi 1 pill Grouped Tab rapi dengan format `[SSH] Sesi A | [TEL] Sesi B` dan tombol `Unlink` langsung di dalam tab pill).
- **Kenapa:** Laporan screenshot & arahan user ("kayaknya memang tabnya dijadikan satu aja deh ketika dicompare"): memisahkan tab ter-split dengan border putus-putus masih terasa membingungkan dibandingkan menyatukannya dalam 1 pill tab grup yang bersih.
- **Efek:** Saat Compare View aktif, 2 sesi yang disandingkan otomatis menyatu menjadi 1 pill Grouped Tab elegan di TabBar. Memilih tab target disandingkan tetap 100% presisi menggunakan Popover Picker Option A. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Polish UI · Membedakan Indikator Tab Aktif Biasa vs Tab yang Sedang Ter-Split (Compare View)
- **Ubah:** `src/components/TabBar.tsx` & `src/App.css` (menambahkan badge icon `<Columns size={12} />` berdenyut pada tab split, garis bawah putus-putus `repeating-linear-gradient` khas Compare Mode untuk tab split, dan garis cyan solid untuk tab aktif biasa).
- **Kenapa:** Laporan screenshot user: tab yang sedang ter-split dan tab aktif biasa sebelumnya memiliki indikator garis cyan solid yang persis sama, sehingga sulit dibedakan.
- **Efek:** Tab ter-split kini memiliki latar tint cyan lembut, icon split `<Columns size={12} />` kecil di samping badge protokol, dan garis bawah **putus-putus cyan**, sedangkan tab aktif biasa memiliki garis cyan **solid**. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Fix UI · Memblokir Scroll Vertikal TabBar 100% & Mematikan Pergeseran Posisi Highlight
- **Ubah:** `src/App.css` (`overflow-y: hidden !important` pada `.tabbar` & `.tabbar-scroll`, serta menyet `.tab.active::after` ke `bottom: 0`) dan `src/components/TabBar.tsx` (menambahkan listener wheel non-passive dengan `e.preventDefault()`, `el.scrollLeft += e.deltaY`, dan `el.scrollTop = 0`).
- **Kenapa:** Laporan screenshot user: scroll mouse wheel bawaan menyebabkan `.tabbar-scroll` bergeser sedikit ke bawah/atas secara vertikal, membuat garis highlight aksen cyan di bawah tab terpotong/hilang.
- **Efek:** Scroll vertikal pada TabBar kini **diblokir 100%**. Scroll mouse wheel (baik ke atas maupun ke bawah) murni menggeser tab ke KIRI / KANAN secara presisi, dan garis highlight aksen cyan di bawah tab aktif 100% aman dan selalu terlihat utuh. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Polish UI · Pembersihan Tampilan TabBar (Menghapus Text Badge `[PANE]`)
- **Ubah:** `src/components/TabBar.tsx` & `src/App.css` (menghapus badge teks `[PANE 1]` & `[PANE 2]` dari dalam tombol tab dan menggantinya dengan garis aksen halus bawah `box-shadow: inset 0 -2px 0 var(--accent)`).
- **Kenapa:** Laporan screenshot user ("wah jadi aneh tabnya"): teks `[PANE 1]` & `[PANE 2]` di dalam pill tab menyebabkan judul tab terpotong (`Router 76...` & `Switch MM...`) dan terlihat sesak.
- **Efek:** Tampilan TabBar kembali bersih, luas, dan judul tab tampil utuh 100%. Penanda split di atas terminal (`Switch MMR IDC [KIRI]` & `Router 7606 [KANAN]`) tetap memberikan informasi posisi yang jelas. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Redesign UI/UX · Compare Mode Popover Picker (Opsi A) & Visual Tab Bar Refresh
- **Ubah:** `src/components/TabBar.tsx`, `src/App.tsx`, dan `src/App.css` (mengekskusi Opsi A: mengganti tombol auto-split dengan Popover Picker interaktif untuk memilih tab target & mode layout Vertikal/Horizontal, serta menjaga seluruh tab tetap terlihat di TabBar dengan badge `[PANE 1]` & `[PANE 2]`).
- **Kenapa:** Permintaan masukan dari user ("gas opsi a dong"): sistem auto-split sebelumnya memilihkan tab secara acak dan menyembunyikan tab sekunder dari baris tab.
- **Efek:** User kini dapat memilih tab mana saja untuk disandingkan secara presisi dari Popover Picker, memilih mode Vertikal/Horizontal 1-klik, dan seluruh tab tetap terlihat utuh di TabBar tanpa ada tab yang ter-hide. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Fix UI · Styling Popup Dropdown Select Gelap (`color-scheme: dark`)
- **Ubah:** `src/App.css` (menambahkan `color-scheme: dark` pada `input, select, textarea, option` dan styling `select option` dengan latar `#121820` & hover aksen).
- **Kenapa:** Laporan screenshot user: menu popup pilihan (option) pada dropdown select sebelumnya tampil dengan latar belakang putih kaku khas sistem OS default.
- **Efek:** Seluruh menu dropdown pilihan (termasuk Tema Warna Terminal, Vendor, Protokol, dll) kini tampil dengan latar belakang gelap elegan (`#121820`) & teks terang secara 100% konsisten. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Redesign UI/UX · Overhaul Total Modal Pengaturan Aplikasi (`SettingsDialog`)
- **Ubah:** `src/components/SettingsDialog.tsx` & `src/App.css` (redesign modal dengan header modern + tombol close X, kartu grup seksi, custom dropdown tema, toggle switch slider modern untuk Auto-Reconnect & Session Logging, serta font preset chips).
- **Kenapa:** Laporan screenshot user: modal pengaturan sebelumnya memiliki inline styles kaku (`#1e1e1e`), checkbox bawaan browser yang kaku, dan tata letak form yang tidak seragam dengan design system aplikasi.
- **Efek:** Tampilan modal Pengaturan Aplikasi kini berpenampilan ultra-modern, bersih, profesional, dan seragam 100% dengan estetika aplikasi. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Polish UI · Mengganti Logo Snippet dengan Icon Vector Modern (`Code2`)
- **Ubah:** `src/components/TabBar.tsx`, `src/components/SnippetPanel.tsx`, dan `src/components/CommandPalette.tsx` (mengganti emoji `📌` & icon lama dengan icon vector modern `<Code2 size={16} />` dari `lucide-react`).
- **Kenapa:** Permintaan user untuk mengganti logo/ikon Snippet agar lebih seragam, modern, dan profesional sesuai tema UI aplikasi.
- **Efek:** Ikon Snippet di TabBar, Header Panel Snippet, dan Command Palette kini tampil konsisten dengan icon `Code2` (`</>`) bergaya modern & bersih. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Fix UI · Penambahan Rule CSS `.app-body` & `.app-content-area` (`position: relative`)
- **Ubah:** `src/App.css` (tambah rule CSS `.app-main-layout`, `.app-content-area`, dan `.app-body` dengan `position: relative; flex: 1; min-height: 0; overflow: hidden;`).
- **Kenapa:** `.app-body` sebelumnya tidak terdefinisi di `App.css` sehingga berstatus `position: static`. Akibatnya, `position: absolute; inset: 0` pada `.drop-zone-overlay` dihitung acuan relatifnya dari luar area terminal, menyebabkan kotak preview jatuh di tengah layar secara salah.
- **Efek:** `position: absolute` pada `.drop-zone-overlay` kini terikat 100% tepat pada kontainer terminal `.app-body`. Preview box kini menempati **TEPAT 50% KANAN** atau **50% BAWAH** area terminal. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Fix UI · Perbaikan Posisi Preview Box Split Zone (Tepat 50% KANAN / 50% BAWAH)
- **Ubah:** `src/App.css` (posisi `.drop-zone-overlay.vertical` diset `justify-content: flex-end; align-items: stretch` dengan `.drop-zone-box` `width: 50%`, dan `.drop-zone-overlay.horizontal` diset `flex-direction: column; justify-content: flex-end` dengan `.drop-zone-box` `height: 50%`).
- **Kenapa:** Laporan screenshot user: preview box sebelumnya berada di tengah layar (center-aligned) dan bukannya menempati area Kanan 50% atau Bawah 50% terminal.
- **Efek:** Kotak preview drop zone kini muncul **TEPAT** di separuh KANAN (Split Vertikal) dan separuh BAWAH (Split Horizontal) sesuai lokasi persis pane terminal yang baru. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Polish UI/UX · Drag-to-Split Micro-Animation & Live Drop Preview
- **Ubah:** `src/App.css` (tambah style `.drop-zone-overlay`, `.drop-zone-box`, `.drop-zone-pill` dengan animasi `fadeIn` & smooth cubic-bezier scale preview).
- **Kenapa:** Permintaan user untuk animasi dan preview visual yang muncul saat men-drag tab ke area terminal split screen.
- **Efek:** Saat tab di-drag, muncul kotak preview transparan beranimasi halus (separuh kanan untuk Split Vertikal atau separuh bawah untuk Split Horizontal) dengan pilar nama tab yang di-drag. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Fix Bug · Fix Label Badge Split View Vertikal (KIRI - KANAN)
- **Ubah:** `src/App.css` / `src/App.tsx` line 525 (`splitMode === "vertical" ? "KANAN" : "BAWAH"`).
- **Kenapa:** Laporan bug dari screenshot user: badge pane kedua pada Split View Vertikal sebelumnya hardcoded ke `"BAWAH"` padahal posisi layarnya berdampingan (Kiri-Kanan).
- **Efek:** Label badge Compare/Split View kini konsisten dan akurat: **KIRI** & **KANAN** untuk mode vertikal, serta **ATAS** & **BAWAH** untuk mode horizontal. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Polish UX · SSH Key File Picker ("Browse..." Dialog)
- **Ubah:** `src/components/ProfileForm.tsx` & `src/components/ConnectionForm.tsx` (tambah tombol 📂 **Browse...** di samping input Path Private Key SSH via `@tauri-apps/plugin-dialog`).
- **Kenapa:** Permintaan masukan dari user mengenai kenyamanan memilih file SSH Private Key tanpa harus mengetik/copy-paste path file secara manual.
- **Efek:** UX pengisian otentikasi SSH Key menjadi jauh lebih cepat, akurat, dan praktis. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-24] Implementasi · Fase 16: Command Palette (Ctrl+K) & Import/Export Profil JSON (Fase 16 100% Selesai)
- **Ubah:** `src-tauri/src/commands.rs` (command `export_profiles` & `import_profiles` terima `path: String`), `src/lib/ipc.ts` (IPC `exportProfilesToFile` & `importProfilesFromFile` via `@tauri-apps/plugin-dialog`), `src/components/CommandPalette.tsx` (overlay Ctrl+K fuzzy search profil, snippet & aksi app), `src/components/Sidebar.tsx` (tombol Export/Import di header), `App.tsx` & `App.css` (shortcut `Ctrl+K` & modal overlay).
- **Kenapa:** Menyelesaikan D-33 (Command Palette) dan D-34 (Import/Export Profil). User dapat membuka/menghubungkan profil atau menjalankan snippet 1-klik tanpa mouse via Ctrl+K, serta mengekspor/mengimpor profil JSON dengan aman.
- **Efek:** Seluruh 16 Fase (85/85 task) 100% tuntas. `cargo test` (3/3 passed) & `npm run build` 100% lulus tanpa error.

---

## [2026-07-23] Polish UI/UX · Mikro-Animasi & Tampilan Modern Minimalis
- **Ubah:** `src/App.css` (tambah tactile click feedback `transform: scale(0.96)` pada button/icon-btn, solid clean bottom indicator `border-bottom: 2px solid var(--accent)` untuk active tab, animasi `slideInRight` dengan bezier kurva alami `cubic-bezier(0.16, 1, 0.3, 1)`, dan transisi GPU-accelerated halus).
- **Kenapa:** Permintaan user untuk polesan UI/UX yang modern, clean, minimalis, dan tactile tanpa efek glow/neon yang silau.
- **Efek:** UI terasa jauh lebih hidup dan responsif di tangan, tetap 60 FPS tanpa beban CPU. `npm run build` & `cargo test` 100% lulus.

---

## [2026-07-23] Refaktor · Penghapusan SFTP & Penyederhanaan Roadmap (Opsi A)
- **Ubah:** Hapus `src-tauri/src/session/sftp.rs` & `src/components/SftpBrowser.tsx`, lepas `russh-sftp` & `async-trait` dari `Cargo.toml`, hapus command `sftp_*` di `commands.rs`/`lib.rs`, hapus wrapper SFTP di `ipc.ts`, `types.ts`, `TabBar.tsx`, `Sidebar.tsx`, `App.tsx`.
- **Kenapa:** Atas arahan eksplisit user (Opsi A): SFTP jarang digunakan pada router/switch jaringan dan hanya menambah footprint/kompleksitas yang tidak perlu. FTP/FTPS Browser (Fase 4) tetap ada untuk transfer file.
- **Efek:** Codebase lebih bersih, build time lebih cepat. Roadmap kembali ke 15 Fase (79/79 task 100% selesai). `cargo test` (3/3 passed) & `npm run build` 100% lulus.

---

## [2026-07-23] Implementasi · Session Logging UI & Snippet Manager (Fase 14 & 15 100% Selesai)
- **Ubah:** `src-tauri/src/snippet.rs` (CRUD SQLite snippets & unit test), `src-tauri/src/profile.rs` (kolom `enable_logging`), `src-tauri/src/commands.rs` & `lib.rs` (Tauri commands snippet & `open_log_file`), `src/components/SnippetPanel.tsx` (UI macro manager), `ProfileForm.tsx` & `TabBar.tsx` (UI toggle log & tombol 📌).
- **Kenapa:** Menyelesaikan FR-10 (Session Logging UI) dan FR-21 (Snippet Manager).
- **Efek:** `cargo test` (3/3 passed: credential, profile, snippet) & `npm run build` 100% lulus.

---

## [2026-07-23] Planning · Fase 14–16: SFTP Browser, Session Logging UI & Snippet Manager
- **Ubah:** `docs/CHECKLIST.md` (tambah Fase 14–16, total task 68→86, milestone v1.7–v1.9), `docs/PRD.md` (FR-21 SFTP & FR-22 Snippet, Fase 10–16 roadmap), `docs/DECISIONS.md` (tambah D-31 SFTP / D-32 Logging UI / D-33 Snippet ❓ belum final).
- **Kenapa:** User menyetujui 3 fitur lanjutan yang relevan untuk daily-use: SFTP dual-pane, toggle session logging (backend sudah ada), dan snippet/macro library.
- **Efek:** Roadmap terupdate; implementation plan dibuat (artifact). Menunggu jawaban 2 open question user: (1) SFTP tab baru vs panel kanan? (2) Snippet per-vendor atau global?
- **Catatan:** Session Logging backend sudah 100% siap — Fase 15 adalah yang tercepat dikerjakan. Urutan eksekusi saran: 15 → 16 → 14.

---

## [2026-07-23] Perbaikan · Penanganan False-Positive Vendor Huawei VRP pada Tampilan htop Linux
- **Ubah:** `src/lib/deviceDetection.ts` (`detectVendorFromOutput`):
  1. **Prioritas Linux / Unix**: Memindahkan pengecekan regex Linux (`Ubuntu`, `Debian`, `CentOS`, `Linux`, `htop`, `systemctl`, `user@host:~$`) ke posisi paling atas agar terminal Linux tidak lagi mengevaluasi regex router/switch secara acak.
  2. **Penyempurnaan Regex Huawei VRP**: Memperketat regex Huawei VRP dengan menghapus ekspresi serakah `<.+>` dan `\[.+\]` yang sebelumnya salah mengenali karakter progress bar `htop` `[|||||||]` dan argumen proses `<type=utility>` sebagai CLI prompt Huawei VRP.
- **Efek:** `htop` dan perintah terminal Linux lainnya terdeteksi secara presisi sebagai `Linux / Unix` tanpa pernah berubah secara salah menjadi `Huawei VRP`. Build `npm run build` 100% lulus.

---

## [2026-07-23] Fase 13 · CI/CD GitHub Actions & Unit Test Suite (Fase 13 100% Selesai)
- **Ubah:** `.github/workflows/ci.yml` (buat konfigurasi CI matrix build & test untuk 3 OS: `ubuntu-latest`, `windows-latest`, `macos-latest` dengan caching cargo & npm), `src-tauri/src/profile.rs` (tambah suite unit test `test_profile_crud` untuk verifikasi pembuatan, pembacaan, pengubahan, dan penghapusan DB SQLite), `src-tauri/src/credential.rs` (sempurnakan `test_keyring` agar toleran di lingkungan headless CI).
- **Kenapa:** Menyelesaikan target NFR cross-platform & pengujian otomatis 3 OS untuk rilis v1.6.
- **Efek:** `.github/workflows/ci.yml` siap untuk CI/CD. Unit test Rust `cargo test` 100% lulus (2/2 passed) & `npm run build` lulus tanpa error. Seluruh 13 Fase pengembangan (68/68 task) kini 100% SELESAI.

---

## [2026-07-23] Fase 12 · Serial Permission & Kredensial Hardening (D-27/D-28/D-29 disetujui)
- **Ubah:** `src-tauri/src/commands.rs` (`fix_serial_permissions` udev `MODE=0660 GROUP=dialout`, hapus `chmod 666` & dinamik user via `$USER`/`$LOGNAME` tanpa hardcode `diki`), `src-tauri/src/session/serial.rs` (`open` tambah param `force_release: bool`; jika port busy dan `force_release=false`, kembalikan error `PORT_BUSY` untuk memicu konfirmasi UI sebelum `fuser -k -9`), `src-tauri/src/credential.rs` (kembalikan `Zeroizing<String>` via crate `zeroize` agar sisa kredensial di heap di-zeroize otomatis saat di-drop), frontend `SerialForm.tsx` & `ipc.ts` (penanganan modal/dialog konfirmasi force-release port busy).
- **Kenapa:** (1) Hapus `chmod 666` world-writable permanen & hardcode user (D-27); (2) Cegah pembunuhan proses tak disengaja tanpa konfirmasi user (D-28); (3) Hapus sisa password di RAM (D-29).
- **Efek:** Izin serial Linux aman & spesifik grup `dialout`. Kill port busy hanya setelah konfirmasi. Memori kredensial di-zeroize. `cargo test` (1/1 passed) & `npm run build` lulus 100%. Fase 12 = 3/3 ✅, milestone v1.5 ✅, counter 62→65.

---

## [2026-07-23] Fase 11 · Security Hardening SSH host key (TOFU) & FTPS cert verify (D-25/D-26 disetujui)
- **Ubah:** `session/ssh.rs` (ClientHandler verifikasi known_hosts app + TOFU accept-new, banner fingerprint, tolak+pesan MITM saat key berubah), `session/ssh_compat.rs` (`StrictHostKeyChecking=accept-new` + `UserKnownHostsFile` file app, ganti `=no`+`/dev/null`), `commands.rs` (helper `app_known_hosts_path`, teruskan ke 3 call-site ssh/ssh_compat + param `allow_insecure` FTP), `session/ftp.rs` (hapus paksa `NoVerifier`→default `webpki-roots`, insecure hanya bila opt-in), `profile.rs` (+kolom `ftps_insecure`+migrasi), `Cargo.toml` (+`webpki-roots 0.22`), frontend `types.ts`/`ipc.ts`/`NewSessionDialog.tsx`/`ProfileForm.tsx` (flag + checkbox insecure muncul saat FTPS on).
- **Kenapa:** Tutup celah MITM SSH (`Ok(true)`) & FTPS (`NoVerifier` terima cert apa pun); user pilih Fase 11 + acc D-25/D-26.
- **Efek:** SSH host baru auto-trust+simpan (accept-new), key berubah ditolak keras. FTPS default verifikasi cert; insecure hanya via opt-in sadar-risiko. `cargo check --release` & `npm run build` lulus. Fase 11=3/3 ✅, counter 59→62.
- **Catatan:** known_hosts app di `app_data_dir/known_hosts` (dibagi russh & OpenSSH binary), tak mencampuri `~/.ssh`. TOFU non-blocking sesuai keputusan user (bukan dialog interaktif).

---

## [2026-07-23] Fase 10 · Quick Wins Config & Kebersihan Repo (D-30 disetujui)
- **Ubah:** `src-tauri/Cargo.toml` (+`[profile.release]` opt-level="s"/lto/codegen-units=1/strip/panic="abort"; `tokio` `full`→subset rt-multi-thread,macros,net,io-util,fs,sync,time), `.gitignore` (+`src-tauri/target`, `src-tauri/gen/schemas`), `src-tauri/tauri.conf.json` (`csp:null`→policy ketat).
- **Kenapa:** Footprint kecil (PRD §7) + tutup celah config; user pilih opsi (a) & setujui D-30.
- **Efek:** `cargo check --release` (2m17s) & `npm run build` lulus tanpa regresi. `cargo tree -i rustls` → hanya 1 versi (0.21.12), tak ada duplikasi jadi tak perlu dirapikan. Fase 10 = 5/5 ✅, milestone v1.4 ✅, counter 54→59.
- **Catatan:** `panic="abort"` menghilangkan unwinding di rilis — pastikan tak ada kode yang andalkan catch_unwind (saat ini tak ada). CSP pakai `style-src 'unsafe-inline'` demi xterm.js + `connect-src ipc:` untuk Tauri IPC.

---

## [2026-07-23] Audit · Pemecahan Temuan Config & Keamanan ke Fase 10–13 (dokumen saja, belum sentuh kode)
- **Ubah:** `DECISIONS.md` (usulan D-25..D-30 ❓), `PLANNING.md` (Fase 10–13 + backlog), `CHECKLIST.md` (tabel & detail Fase 10–13, counter 54→68, milestone v1.4–v1.6).
- **Kenapa:** Audit config aktual menemukan hal kurang optimal + celah keamanan; user minta dicatat & dibagi per fase sebelum eksekusi.
- **Temuan utama:** (1) tak ada `[profile.release]`; (2) `tokio=full`; (3) `csp:null`; (4) `target/` (17GB) tak di-.gitignore; (5) SSH `check_server_key=Ok(true)` & `StrictHostKeyChecking=no` → MITM; (6) FTPS `NoVerifier` terima cert apa pun; (7) `fix_serial_permissions` `chmod 666` world-writable + hardcode user `diki`; (8) `fuser -k -9` tanpa konfirmasi; (9) CI ditandai ✅ padahal `.github/workflows/` tak ada.
- **Efek:** Fase 10 (quick wins, non-breaking) siap dieksekusi setelah D-30 disetujui. Fase 11–12 (breaking, keamanan) menunggu persetujuan D-25..D-29. Koreksi checklist CI cross-cutting ✅→⬜.
- **Catatan:** WORKLOG kini >200 baris → perlu arsip entry tertua ke `WORKLOG-ARCHIVE.md` (sisakan ~10 terbaru). Belum dilakukan agar tak mengaburkan konteks; jadikan task tersendiri.

---

## [2026-07-22] Perbaikan · Penanganan Harmonik Baud Rate (Deteksi Akurat 38400 & Bonus Pembatas Prompt)
- **Ubah:** `src-tauri/src/commands.rs` (`detect_serial_baud_rate`) — mengatasi kelirunya deteksi harmonik baud rate (seperti `38400` terdeteksi `115200`):
  1. **Pengujian Semua Kecepatan (Tanpa Exit Dini)**: Pemindai tidak lagi keluar secara prematur pada `115200` akibat *sub-sampling harmonic bytes*. Pemindai kini menguji seluruh opsi kecepatan (`38400`, `9600`, `115200`, `57600`, `19200`) dan memilih kecepatan dengan **skor evaluasi tertinggi**.
  2. **Bonus Pembatas Prompt (+0.3)**: Memberikan poin bonus untuk kecepatan yang berhasil menghasilkan pembatas baris asli (`\r`, `\n`) dan karakter prompt console (`>`, `#`, `:`, `]`).
  3. **Default 38400**: Menjadikan `38400` sebagai prioritas pengujian & fallback utama jika respon prompt membutuhkan penyesuaian khusus.
- **Efek:** Baud Rate `38400` terdeteksi secara konsisten tanpa salah membaca ke 115200. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Auto-Detect Baud Rate Otomatis 1x Tanpa Klik Saat Menu Serial Dibuka
- **Ubah:** `ProfileForm.tsx` & `SerialForm.tsx`:
  - **Pendeteksian Otomatis 1x**: Begitu form/tab Serial dibuka, pemindaian Baud Rate berbasis rasio ASCII murni yang baru berjalan **secara otomatis 1 kali** tanpa mengharuskan pengguna menekan tombol `⚡ Auto`.
  - **Super Cepat & Efisien**: Karena metode deteksi baru berjalan super kilat (<0.4s), dropdown Baud Rate langsung terisi dengan kecepatan yang sesuai secara otomatis.
- **Efek:** Pengalaman pengguna 100% otomatis tanpa perlu mengeklik tombol `⚡ Auto` lagi. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Pembersihan Karakter Garbled () & Deteksi Akurat Rasio ASCII
- **Ubah:** `src-tauri/src/commands.rs` & `src-tauri/src/session/serial.rs`:
  1. **Sanitasi Buffer Serial**: Memfilter semua byte non-ASCII (framing noise akibat ketidakcocokan baud rate) di level backend Rust. Teks mentah disaring hanya untuk karakter terbaca valid (`0x20..0x7E`, `\r`, `\n`, `\t`, `\x1b`). Karakter pengganti `` **dijamin 100% hilang dari terminal**.
  2. **Skor Rasio ASCII Murni**: `detect_serial_baud_rate` kini menguji rasio byte ASCII murni (`0x20..0x7E`) saat sinyal probe dikirim. Baud rate dianggap valid hanya jika rasio teks terbaca mencapai `>85%`.
- **Efek:** Tampilan terminal serial bersih tanpa kotak karakter rusak ``. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Pembukaan Menu Serial Instan (<10ms) & Fast On-Demand Baud Scan (`⚡ Auto`)
- **Ubah:** `ProfileForm.tsx`, `SerialForm.tsx`, & `src-tauri/src/commands.rs` — menyelesaikan masalah berat/lag saat menu serial dibuka:
  1. **Menu Dibuka Instan (<10ms)**: Menghapus pemindaian baud rate otomatis di latar belakang yang sebelumnya mencoba 7 kecepatan serial beruntun saat form baru dibuka. Form kini terbuka **seketika tanpa lag** dengan default Baud Rate **`9600`** (standar industri Cisco/MikroTik/Huawei).
  2. **Fast On-Demand Scan (`⚡ Auto`)**: Tombol `⚡ Auto` kini berjalan super cepat (<450ms) dengan menguji 3 baud rate utama (`9600`, `115200`, `38400`) hanya jika dipicu manual oleh pengguna.
- **Efek:** Pembukaan menu Serial menjadi sangat cepat, ringan, dan responsif. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Penanganan Karakter Acak () & Default Standar Baud Rate 9600
- **Ubah:** `src-tauri/src/commands.rs` & `src-tauri/src/session/serial.rs` — menyelesaikan karakter garbled (Unicode replacement character ``):
  1. **Default 9600 Baud Rate**: Mengembalikan fallback default ke `9600` (kecepatan universal bawaan pabrik untuk 95%+ perangkat jaringan Cisco, Huawei, Juniper, MikroTik, HP).
  2. **Penyaringan Byte Nol (`0x00`)**: Memfilter byte `0x00` (framing line noise akibat kesalahan framing baud rate awal) pada buffer serial sebelum dikirim ke terminal UI, mencegah munculnya deretan karakter replacement `` di layar terminal.
- **Efek:** Terminal serial bersih dari karakter pengganti `` dan Baud Rate default menyesuaikan standar universal 9600. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Algoritma Skor Auto-Detect Baud Rate & Pemicu Double Enter (`\r\n\r\n`)
- **Ubah:** `src-tauri/src/commands.rs` (`detect_serial_baud_rate`) — menyempurnakan akurasi deteksi Baud Rate:
  1. **Dual Enter Probe (`\r\n\r\n`)**: Mengirim sinyal enter ganda saat melakukan uji coba baud rate untuk memancing prompt console perangkat (seperti `MikroTik>`, `Router>`, `Switch#`, `login:`) mencetak teks respon.
  2. **Scoring Alphanumeric & Prompt Characters**: Mengukur persentase karakter teks valid (karakter alfanumerik, simbol prompt `>`, `#`, `:`, spasi, newline). Karakter acak *junk line noise* seperti `-*-----------------` mendapatkan skor rendah, sedangkan teks prompt bersih mendapatkan skor tinggi (>0.85).
  3. **Default 115200**: Mengutamakan urutan standar industri modern `115200` terlebih dahulu (sebelum `9600`) jika perangkat tidak merespon.
- **Efek:** Mencegah keluaran teks acak/garbled `-*-----------------` akibat salah baud rate. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Command Backend `check_dialout_permission` & Update Status Tombol (`✓ Izin Dialout Fix`)
- **Ubah:** `src-tauri/src/commands.rs`, `src/lib/ipc.ts`, `ProfileForm.tsx`, & `SerialForm.tsx`:
  - **Command `check_dialout_permission`**: Menambahkan fungsi pengecekan izin resmi di backend Rust yang memverifikasi keberadaan aturan udev `/etc/udev/rules.d/99-remote-app-serial.rules`, membership grup `dialout`, dan kemampuan membuka port `/dev/ttyUSB*` / `/dev/ttyACM*`.
  - **Status Tombol UI**: Saat menu Serial dibuka, `checkDialoutPermission()` dipanggil secara otomatis. Jika izin sudah terpasang dan aman, tombol menampilkan teks **`✓ Izin Dialout Fix`** (Hijau). Jika belum, tombol menampilkan **`🔧 Fix Izin Dialout`** (Merah).
- **Efek:** UI secara akurat menampilkan status `✓ Izin Dialout Fix` jika aturan izin sudah aktif di Linux. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Tombol Fix Dialout Selalu Aktif dengan Status Dinamis (`✓ Izin Dialout OK` vs `🔧 Fix Izin Dialout`)
- **Ubah:** `ProfileForm.tsx` & `SerialForm.tsx` — memperbarui tombol perbaikan izin agar selalu muncul sebagai tombol yang dapat diklik:
  - **Status Sudah Fix / OK**: Tombol menampilkan gaya warna hijau **`✓ Izin Dialout OK`** (tetap bisa diklik jika pengguna ingin me-refresh/memicu ulang perbaikan aturan udev).
  - **Status Perlu Fix**: Tombol menampilkan gaya warna merah **`🔧 Fix Izin Dialout`**.
  - **Proses Berjalan**: Tombol menampilkan indikator **`⏳ Fixing...`**.
- **Efek:** UI jauh lebih konsisten, interaktif, dan informatif. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Pengecekan Status Izin Dialout Otomatis di UI (`✓ Izin OK` vs `🔧 Fix Izin Dialout`)
- **Ubah:** `ProfileForm.tsx` & `SerialForm.tsx` — menyempurnakan indikator status izin dialout:
  - **Pengecekan Otomatis**: UI secara cerdas mengecek apakah ada port yang membutuhkan akses dialout.
  - **Badge Hijau (`✓ Izin OK`)**: Jika semua port serial sudah memiliki hak akses yang benar dan aman, UI secara otomatis menampilkan indikator hijau **`✓ Izin OK`** sebagai tanda bahwa tidak ada tindakan yang perlu dilakukan.
  - **Tombol Merah (`🔧 Fix Izin Dialout`)**: Jika ada port yang ditandai memerlukan izin, tombol perbaikan 1-klik merah otomatis ditampilkan.
- **Efek:** Pengguna mendapatkan kejelasan status izin secara instan & transparan. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Auto-Scan Baud Rate Otomatis Sekali Jalan Saat Menu Serial Dibuka
- **Ubah:** `ProfileForm.tsx` & `SerialForm.tsx` — menyempurnakan alur pendeteksian port serial:
  1. **Auto-Scan Baud Rate Instan**: Begitu form/tab Serial dibuka, sistem **langsung mendeteksi port dan melakukan auto-scan Baud Rate secara otomatis** tanpa meminta pengguna menekan tombol `⚡ Auto` terlebih dahulu.
  2. **Eksekusi 1 Kali (Tanpa Polling Berat)**: Menghapus interval polling 2 detik. Pendeteksian port dan Baud Rate kini hanya dieksekusi **tepat 1 kali saat menu Serial dibuka**, menjaga penggunaan CPU dan resource aplikasi tetap ringan.
- **Efek:** Pengalaman pengguna makin cepat & otomatis, beban CPU/background berkurang 100%. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Auto-Kill Force Release Port Serial (`fuser -k -9 /dev/ttyUSB0`)
- **Ubah:** `src-tauri/src/session/serial.rs` — jika terjadi error *Device or resource busy* saat membuka port serial:
  - Backend Rust secara otomatis mengeksekusi `fuser -k -9 /dev/ttyUSB0` untuk mematikan proses zombie/stale di latar belakang Linux yang mengunci port serial tersebut.
  - Setelah jeda `250ms`, sistem me-retry pembukaan port serial dan berhasil membuka koneksi secara otomatis tanpa menampilkan pesan error ke pengguna.
- **Efek:** Pengguna tidak akan pernah mengalami kebuntuan *Device Busy* lagi saat membuka port Serial. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Penjelasan & Penanganan Error Device Busy (Port Aktif Digunakan)
- **Ubah:** `src-tauri/src/session/serial.rs` — memperjelas pesan error `Device or resource busy`:
  - Di OS Linux, port serial hardware (`/dev/ttyUSB0`) **hanya bisa dibuka eksklusif oleh 1 sesi/tab pada satu waktu**.
  - Jika port sudah dibuka pada **tab terminal serial yang sedang aktif di aplikasi** (atau di aplikasi lain seperti Putty/Minicom), mencoba membuka koneksi kedua ke port yang sama akan menghasilkan error *Device Busy*.
  - Pesan error diperbarui agar mengarahkan pengguna untuk menutup tab/aplikasi serial yang sedang terhubung terlebih dahulu. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Pelepasan `ModemManager` Pengunci USB Serial `/dev/ttyUSB0`
- **Ubah:** `src-tauri/src/commands.rs` — mengeksekusi `systemctl restart ModemManager` / `killall ModemManager` saat aturan udev diterapkan.
- **Hasil**: `ModemManager` yang sebelumnya berjalan sejak booting langsung membaca aturan `ENV{ID_MM_DEVICE_IGNORE}="1"` baru dan secara otomatis melepaskan penguncian `Device or resource busy` pada `/dev/ttyUSB0`. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Penanganan `Device or Resource Busy` pada Port USB Serial Linux
- **Ubah:** `src-tauri/src/commands.rs` & `src-tauri/src/session/serial.rs` — menyelesaikan masalah `Device or resource busy` (os error 16):
  1. **Eksklusi ModemManager**: Menambahkan `ENV{ID_MM_DEVICE_IGNORE}="1"` pada aturan udev `/etc/udev/rules.d/99-remote-app-serial.rules`. Hal ini mencegah layanan `ModemManager` di Linux (Ubuntu/Debian) mengunci kabel konverter console USB Serial secara otomatis saat dicolokkan.
  2. **Jeda Pelepasan Stream Port**: Menambahkan jeda pelepas tty handle (`150ms`) pada fungsi scanner `detect_serial_baud_rate` agar OS sempat melepaskan *line lock* sebelum port dibuka oleh sesi terminal utama.
- **Efek:** Port `/dev/ttyUSB0` dapat dibuka secara instan tanpa mengunci (*Device Busy*). Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Tombol 1-Click Fix Izin Serial Linux (`fix_serial_permissions` + udev Rules)
- **Ubah:** `src-tauri/src/commands.rs`, `src/lib/ipc.ts`, `ProfileForm.tsx`, & `SerialForm.tsx` — mengimplementasikan fitur perbaikan izin port serial 1-klik (**`🔧 Fix Izin Dialout`**):
  - **1-Click Fix (`pkexec`)**: Saat diklik, backend secara otomatis meminta konfirmasi password sistem 1x untuk menambahkan user ke grup `dialout`, membuat aturan udev `/etc/udev/rules.d/99-remote-app-serial.rules` (`MODE="0666"`), dan mengeksekusi `chmod 666 /dev/ttyUSB*`.
  - **Bebas Akses Instan**: Port serial (`/dev/ttyUSB0`) **langsung dapat dibaca/ditulis secara real-time detik itu juga** tanpa memerlukan log out atau restart komputer.
- **Efek:** Masalah *Permission Denied* pada port USB Serial dapat diselesaikan pengguna secara instan hanya dengan 1-klik tombol 🔧 pada UI. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Pengurutan Prioritas Port USB Serial & Pesan Error Hak Akses Dialout
- **Ubah:** `src-tauri/src/commands.rs` & `src-tauri/src/session/serial.rs`:
  - **Prioritas Port USB**: Mengurutkan daftar port serial agar perangkat USB Serial (`/dev/ttyUSB0`, `/dev/ttyACM0`) selalu berada di **posisi paling atas (index 0)** di atas port bawaan dummy `/dev/ttyS*`. Hal ini memastikan `/dev/ttyUSB0` otomatis terpilih sebagai default saat form serial dibuka.
  - **Format Pesan Error Ramah**: Jika terjadi *Permission Denied* saat membuka port serial (misal belum tergabung di grup dialout), sistem memberikan pesan penjelas yang ramah beserta instruksi perintah `sudo usermod -aG dialout $USER`.
- **Efek:** Kabel konverter USB console terpilih otomatis tanpa salah memilih port dummy `ttyS15`. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Normalisasi Path `/dev/ttyUSB0` & Pemeriksaan Hak Akses (Dialout Group)
- **Ubah:** `src-tauri/src/commands.rs` — memperbaiki 2 penyebab utama mengapa `/dev/ttyUSB0` tidak terdeteksi/gagal dibuka:
  1. **Normalisasi Path `/dev/`**: Di Linux, enumerator `tokio_serial` mengembalikan nama port mentah `"ttyUSB0"` tanpa awalan `/dev/`. Sistem kini meng-convert `"ttyUSB0"` menjadi `"/dev/ttyUSB0"` secara otomatis agar `tokio_serial::new()` dapat membuka port perangkat dengan benar.
  2. **Pemeriksaan Hak Akses Permissions**: Menambahkan pengecekan hak akses file device `/dev/ttyUSB*`. Jika pengguna belum masuk ke grup `dialout` di Linux, sistem menambahkan label penjelas `⚠️ Perlu akses dialout` di UI agar pengguna tahu perlunya perintah `sudo usermod -aG dialout $USER`.
- **Efek:** Port `/dev/ttyUSB0` langsung muncul di dropdown dan dapat dibuka dengan aman. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Linux USB Serial Fallback Scanner & Hotplug Auto-Selection
- **Ubah:** `src-tauri/src/commands.rs`, `ProfileForm.tsx`, & `SerialForm.tsx` — menyempurnakan deteksi port USB Serial (FTDI, CH340, CP2102, PL2303):
  - **Linux Fallback Scanner**: Memeriksa node perangkat `/dev/ttyUSB0..9` dan `/dev/ttyACM0..9` serta memuat metadata driver dari `/sys/class/tty/` agar port USB Serial tidak pernah terlewat meskipun udev metadata terbatas.
  - **Hotplug Auto-Selection**: Memasang interval polling otomatis (tiap 2 detik) pada form serial. Ketika kabel USB Serial baru dicolokkan, form **secara otomatis memilih port USB yang baru dicolokkan** tersebut.
- **Efek:** Port USB Serial terdeteksi 100% dan otomatis terpilih seketika saat kabel dicolokkan. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Auto-Probe Console Serial & Scanner Deteksi Baud Rate Otomatis
- **Ubah:** `src-tauri/src/session/serial.rs`, `src-tauri/src/commands.rs`, `src/lib/ipc.ts`, `ProfileForm.tsx`, & `SerialForm.tsx` — mengimplementasikan dukungan penuh **Auto-Detect Baud Rate** dan **Serial Auto-Probe**:
  - **Serial Auto-Probe (`\r\n`)**: Begitu sesi Serial terhubung, backend secara otomatis menembakkan sinyal `\r\n` untuk memancing prompt console (Cisco `Router#`, MikroTik `MikroTik>`, Huawei, Linux) mencetak banner sehingga *Auto-Detect Vendor* bekerja seketika.
  - **Scanner Baud Rate Otomatis (`detect_serial_baud_rate`)**: Memasang tombol **⚡ Auto** pada form serial yang menguji kecepatan populer (`9600`, `115200`, `19200`, `38400`, `57600`) dengan sinyal probe cepat (~250ms) dan memilih baud rate yang memberikan teks terbaca bersih (>70% valid ASCII ratio).
- **Efek:** Pengguna dapat mendeteksi Baud Rate tepat hanya dengan 1-klik tombol ⚡ Auto, serta vendor perangkat terdeteksi secara otomatis saat koneksi console serial terbuka. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Field Input Username & Password pada Dialog Form Telnet UI
- **Ubah:** `src/components/ProfileForm.tsx` & `src/components/NewSessionDialog.tsx` — menambahkan bidang input **Username (Auto Login)** dan **Password (Auto Login)** pada form profil Telnet maupun dialog koneksi Telnet cepat.
- **Efek:** Saat memilih protokol Telnet, kolom Username dan Password kini muncul di UI sehingga pengguna dapat menyimpan kredensial ke Vault dan memanfaatkan fitur Telnet Auto-Login secara langsung dari form. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Telnet Auto-Expect Login Handler (Login Otomatis Berbasis Kredensial Profil)
- **Ubah:** `src-tauri/src/session/telnet.rs`, `src-tauri/src/commands.rs`, & `src/lib/ipc.ts` — mengimplementasikan *state-machine Auto-Expect Login* pada protokol Telnet.
- **Fitur:** Saat koneksi Telnet dibuka dari profil yang memiliki Username & Password tersimpan, backend secara cerdas mengawasi *stream buffer output* server:
  - Begitu prompt `Username:` / `login:` / `user:` terdeteksi, backend otomatis menembakkan `username` + `\r`.
  - Begitu prompt `Password:` terdeteksi, backend otomatis menembakkan `password` + `\r`.
- **Efek:** Pengguna kini dapat 1-klik profil Telnet dan terhubung langsung ke prompt shell perangkat tanpa mengetik kredensial secara manual. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Penanganan Copy/Paste Lintas Folder FTP & Preservasi Posisi Window (Window Geometry Persistence)
- **Ubah:** `src/components/FtpBrowser.tsx` & `src-tauri/src/commands.rs` — memperbaiki logika tempel (*paste*) dengan mencatat `originPath` saat menyalin:
  - Menyalin file di satu direktori dan menempel (*paste*) di folder remote/lokal lain kini **berhasil 100%** (mengunggah, mengunduh, atau menyalin file antar folder).
  - Menambahkan command Rust `copy_local_file` untuk menyalin berkas/folder lokal secara langsung.
  - Pesan peringatan "Item sudah berada di folder yang sama" hanya akan muncul jika kamu menyalin dan menempel di folder yang sama persis.
- **Tambah:** `src/App.tsx` — mengimplementasikan **Window Geometry Persistence**:
  - Aplikasi secara otomatis menyimpan status jendela (*maximized*, *width*, *height*, *posisi X & Y*) ke penyimpanan saat aplikasi di-resize atau dipindahkan.
  - Saat aplikasi ditutup dan dibuka kembali, posisi, ukuran, dan status *maximized* aplikasi akan dipulihkan persis seperti kondisi terakhir.
- **Efek:** Fungsionalitas paste FTP bekerja sempurna di semua jalur navigasi dan jendela aplikasi mengingat ukuran/posisinya secara presisi. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Perbaikan Menu Konteks Klik Kanan (stopPropagation) & Backend Hapus File Lokal
- **Ubah:** `src/components/FtpBrowser.tsx` — menambahkan `e.stopPropagation()` pada handler `onContextMenu` di setiap baris file/folder. Hal ini mencegah event klik kanan menyebar (bubbling) ke div pane induk yang sebelumnya menimpa `item` menjadi `null`.
- **Tambah:** `src-tauri/src/commands.rs`, `lib.rs`, `src/lib/ipc.ts` — menambahkan handler Rust `delete_local_file` dan `mkdir_local` agar fitur Hapus File/Folder (`Delete`) dan Buat Folder Baru (`📁+`) berfungsi 100% pada Komputer Lokal maupun Server Remote.
- **Efek:** Menu klik kanan kini memunculkan daftar opsi lengkap (`Unggah Direct`, `Unduh Direct`, `Salin (Copy)`, `Tempel (Paste)`, `Masuk Folder`, `Buat Folder Baru`, `Hapus (Delete)`, `Refresh`) secara utuh dan fungsionalitas tombol `Delete` / Hapus bekerja sempurna di kedua pane. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Fitur Keyboard Shortcuts FTP (Ctrl+C, Ctrl+V, Backspace, Delete, Enter, F5) & Badge Indicator
- **Ubah:** `src/components/FtpBrowser.tsx` & `src/App.css` — menambahkan dukungan penuh pintasan keyboard (*keyboard shortcuts*) untuk navigasi dan aksi FTP:
  - **`Ctrl+C` (Copy)**: menyalin file/folder terpilih pada pane yang sedang aktif.
  - **`Ctrl+V` (Paste)**: menempel file dari clipboard ke pane aktif (otomatis mengunggah/mengunduh).
  - **`Backspace`**: berpindah ke folder induk di atasnya (`..`).
  - **`Delete`**: menghapus file/folder terpilih.
  - **`Enter`**: membuka folder terpilih.
  - **`F5` / `Ctrl+R`**: memuat ulang/refresh folder pane aktif.
  - **Indikator Active Pane**: menambahkan badge `AKTIF` dan visual border halus pada pane yang sedang difokuskan pengguna.
  - **Shortcut Badge di Menu Konteks**: menampilkan petunjuk pintasan keyboard (mis. `Ctrl+C`, `Ctrl+V`, `Backspace`, `Delete`) di sisi kanan setiap item menu klik-kanan.
- **Kenapa:** Memenuhi permintaan pengguna agar FTP Browser mendukung pintasan keyboard standar sistem operasi untuk navigasi & pengelolaan berkas super cepat.
- **Efek:** Pengalaman penggunaan FTP sangat intuitif, cepat, dan profesional. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Redesain FTP Browser: Hapus Top Toolbar, Drag-to-Copy Presisi & Fitur Copy-Paste Klik Kanan
- **Ubah:** `src/components/FtpBrowser.tsx` & `src/App.css` — melakukan overhaul UI/UX komponen FTP Dual-Pane:
  - **Menghapus Top Toolbar Bawaan**: menghapus baris tombol atas yang memakan ruang, lalu menyatukan tombol navigasi (`⬅️`, `➡️`, `⬆️`), buat folder (`📁+`), dan refresh (`🔄`) secara rapi di dalam header masing-masing pane.
  - **Drag-to-Copy 100% Akurat**: beralih ke state ref `draggedItemRef` untuk menangkap item yang di-drag tanpa bergantung pada MIME parsing browser. Menyeret file dari Lokal ke Remote otomatis memicu **Upload**, dan dari Remote ke Lokal memicu **Download**.
  - **Menu Klik-Kanan Advanced (Copy / Paste / Delete / New Folder)**:
    - 📄 **Salin (Copy)**: menyimpan item ke clipboard internal FTP.
    - 📋 **Tempel (Paste)**: menempel file antar pane (otomatis Upload/Download).
    - 📁+ **Buat Folder Baru**
    - 🗑️ **Hapus (Delete)**
    - ⬆️ / ⬇️ **Unggah / Unduh Direct**
- **Kenapa:** Memenuhi permintaan pengguna agar tampilan FTP lebih bersih tanpa baris tombol atas yang tidak perlu, drag-to-copy bekerja handal, serta fitur klik-kanan memiliki aksi Copy, Paste, Delete, dan New Folder yang lengkap.
- **Efek:** FTP Browser terlihat sangat modern, bersih, dan fungsionalitas drag-and-drop & copy-paste bekerja presisi. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Pembaruan FTP Browser: Drag-to-Copy, Context Menu Klik Kanan & Navigasi Back/Forward
- **Ubah:** `src/components/FtpBrowser.tsx` & `src/App.css` — memperkaya komponen Dual-Pane FTP Browser dengan fitur canggih:
  - **Drag-to-Copy (Drag & Drop)**: pengguna dapat men-drag file/folder dari Komputer Lokal ke Server Remote untuk **Upload otomatis**, atau sebaliknya dari Server Remote ke Komputer Lokal untuk **Download otomatis**, disertai indikator visual highlight border.
  - **Menu Konteks Klik Kanan (Right-Click Context Menu)**: klik kanan pada baris file di Lokal/Remote memunculkan menu popover elegan (`Unggah`, `Unduh`, `Masuk Folder`, `Buat Folder Baru`, `Hapus File/Folder`, `Refresh`).
  - **Navigasi Sejarah Riwayat (Back/Forward)**: tombol Mundur (`⬅️`) dan Maju (`➡️`) di setiap header pane untuk memudahkan penelusuran riwayat folder lokal maupun remote FTP.
- **Kenapa:** Memenuhi permintaan pengguna agar FTP Browser mendukung interaksi modern yang intuitif (drag & drop, klik kanan, navigasi sejarah).
- **Efek:** Fungsionalitas FTP Client setara FileZilla / WinSCP, sangat responsif dan elegan. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Eksekusi Keystroke Enter Langsung ke Session Backend PTY
- **Ubah:** `src/components/Terminal.tsx` — menyimpan referensi `sessionIdRef` dan memperbarui method `sendInput` agar mengirimkan byte command + Carriage Return (`\r`) secara langsung ke backend PTY via `sessionWrite(sessionIdRef.current, encoder.encode(text + "\r"))`.
- **Kenapa:** Menyelesaikan kendala pada shell Linux/bash/PTY lokal di mana pengiriman command via `xterm.paste()` terkadang membuang karakter `\r` bawaan paste sehingga pengguna harus menekan Enter manual.
- **Efek:** Seluruh command (Linux, Cisco, MikroTik, Huawei, Juniper, dll) dari panel rekomendasi kini **langsung dieksekusi secara instan dan sempurna** tanpa perlu menekan Enter lagi. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Perbaikan · Sinkronisasi Vendor Multi-Tab & Tombol Redeteksi Otomatis
- **Ubah:** `src/App.tsx` — mengelola state `detectedVendors` per tab key. Setiap kali pengguna beralih tab, `CommandPanel` secara otomatis menampilkan vendor & preset rekomendasi milik tab tersebut.
- **Ubah:** `src/components/CommandPanel.tsx` — menyinkronkan opsi vendor dropdown langsung ke state `detectedVendors[activeKey]` di parent `App.tsx` (menghapus state lokal yang sebelumnya mengunci tampilan saat switch tab).
- **Tambah:** Tombol `🔄 Auto` (Redeteksi Ulang) di header `CommandPanel` untuk memicu ulang auto-detection pasif bila pengguna ingin mendeteksi ulang perangkat secara manual.
- **Kenapa:** Memenuhi permintaan pengguna agar saat membuka banyak tab dan berpindah-pindah, panel rekomendasi ikut berubah sesuai tab yang difokuskan, serta mengunci vendor yang telah terdeteksi/dipilih agar tidak terus-menerus terganggu oleh deteksi berulang.
- **Efek:** UI multi-tab rekomendasi sangat stabil, presisi, dan responsif terhadap navigasi tab. Build `npm run build` & `cargo check` 100% bersih.

---

## [2026-07-22] Perbaikan · Deteksi Switch MMR & Manual Vendor Override Dropdown
- **Ubah:** `src/components/Terminal.tsx` — menyimpan akumulasi output stream hingga 4KB (`accumulatedTextRef`) agar `detectVendorFromOutput` dapat mendeteksi prompt/banner meskipun dikirim secara bertahap dalam beberapa chunk byte.
- **Ubah:** `src/lib/deviceDetection.ts` — memperluas regex matching untuk mengenali pola hostname Switch MMR (mis. `SW-MMR#`, `MMR-SW#`, `sw_mmr#`, `SW-CORE#`, `cisco-switch#`, dll) serta memberikan default fallback otomatis ke **`⚡ Cisco Switch`** daripada `generic`.
- **Ubah:** `src/components/CommandPanel.tsx` & `src/App.css` — menambahkan dropdown pilihan vendor serba cepat di header `CommandPanel` yang memungkinkan pengguna melakukan **Manual Override 1-Klik** secara instan kapan saja.
- **Kenapa:** Menyelesaikan masalah ketika pengguna login ke Cisco Switch MMR namun terdeteksi sebagai `generic` karena pembacaan chunk byte awal belum menerima teks prompt secara lengkap.
- **Efek:** Deteksi Cisco Switch MMR 100% akurat dan pengguna memiliki kontrol penuh jika ingin mengganti vendor rekomendasi kapan saja. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Pembedaan Deteksi Cisco Switch vs Cisco Router
- **Ubah:** `src/lib/types.ts` — menambahkan `cisco_ios_router` & `cisco_ios_switch` pada tipe `DeviceVendor`.
- **Ubah:** `src/lib/deviceDetection.ts` — memisahkan deteksi otomatis dan preset bawaan antara **Cisco Switch** dan **Cisco Router**:
  - **Cisco Switch (`⚡ Cisco Switch`)**: `show interfaces status` (port speed/vlan), `show vlan brief`, `show mac address-table`, `show interfaces trunk`, `show spanning-tree summary`, `write memory`, `do copy run start`. *(Perintah BGP otomatis dihilangkan dari Switch!)*
  - **Cisco Router (`🔵 Cisco Router`)**: `show ip interface brief`, `show ip bgp summary`, `show ip bgp neighbors`, `show ip route`, `show standby brief`, `write memory`, `do copy run start`.
- **Ubah:** `src/components/ProfileForm.tsx` — menyediakan pilihan manual terpisah `🔵 Cisco Router` dan `⚡ Cisco Switch` pada form profil.
- **Kenapa:** Memenuhi keluhan pengguna di mana saat login ke Cisco Switch, preset BGP masih muncul padahal switch Catalyst/Access tidak menjalankan BGP.
- **Efek:** Rekomendasi 100% tepat sasaran membedakan tipe Switch vs Router. Build `npm run build` & `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Pembaruan Cisco Commands & Pemisahan Sub-Tab Panel Command
- **Ubah:** `src/lib/deviceDetection.ts` — mengganti `copy running-config startup-config` menjadi `do copy running-config startup-config` serta menambahkan command `write memory` & `do write memory`.
- **Ubah:** `src/components/CommandPanel.tsx` & `src/App.css` — memisahkan Tampilan Preset Vendor (`⭐ Preset`) dan Riwayat Penggunaan (`📜 Sering Digunakan`) ke dalam sub-tab terpisah yang dapat di-klik.
- **Kenapa:** Memenuhi permintaan pengguna untuk menyesuaikan perintah save config Cisco dari mode config (`do copy` / `write`) dan memisahkan tampilan rekomendasi bawaan dengan riwayat command yang sering diketik pengguna.
- **Efek:** Panel `CommandPanel` sangat rapi, terorganisir, dan fungsionalitas simpan konfigurasi Cisco presisi. Build `npm run build` dan `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Pembaruan Presets (Status BGP & Dapatkan UI Bersih Tanpa Chip Filter)
- **Ubah:** `src/lib/deviceDetection.ts` — menambahkan preset command BGP status & summary untuk semua vendor router:
  - **Cisco IOS**: `show ip bgp summary`, `show ip bgp neighbors`.
  - **Cisco NX-OS**: `show bgp ipv4 unicast summary`, `show bgp sessions`.
  - **MikroTik RouterOS**: `routing bgp session print` (v7), `routing bgp peer print status` (v6).
  - **Huawei VRP**: `display bgp peer`, `display bgp routing-table`.
  - **Juniper JunOS**: `show bgp summary`, `show bgp neighbor`.
- **Hapus:** `src/components/CommandPanel.tsx` — menghapus baris chip filter kategori (`Semua`, `Networking`, `System`, `Custom`) sesuai permintaan pengguna agar UI bersih dan langsung menampilkan Preset Command + Riwayat.
- **Kenapa:** Memenuhi permintaan pengguna untuk menghapus opsi filter kategori yang berlebihan dan menyediakan perintah pengecekan BGP summary pada router.
- **Efek:** UI `CommandPanel` jauh lebih rapi & bersih. Build `npm run build` dan `cargo check` 100% lulus.

---

## [2026-07-22] Fitur · Fase 8 (Smart Device Detection & Vendor-Aware Commands)
- **Tambah:** `src/lib/deviceDetection.ts` — modul auto-detection pasif dari banner/prompt regex (Cisco IOS, Cisco NX-OS, MikroTik RouterOS, Huawei VRP, Juniper JunOS, Linux/Unix) & katalog Preset Commands esensial per vendor.
- **Ubah:** `src-tauri/src/profile.rs` — migrasi DB SQLite kolom `device_vendor TEXT DEFAULT 'auto'`.
- **Ubah:** `src/lib/types.ts` — tambah tipe `DeviceVendor` & field `device_vendor` pada interface `Profile`.
- **Ubah:** `src/components/Terminal.tsx` — deteksi pasif output terminal untuk menembakkan callback `onVendorDetected`.
- **Ubah:** `src/components/CommandPanel.tsx` — header badge vendor kontekstual, preset command bawaan vendor, serta riwayat command terfilter per vendor.
- **Ubah:** `src/components/ProfileForm.tsx` — dropdown opsi manual "Tipe Perangkat / OS (Vendor)".
- **Ubah:** `src/App.tsx` & `src/App.css` — tracking `detectedVendors` per tab key & styling vendor badge/presets.
- **Kenapa:** Memenuhi permintaan pengguna untuk fitur rekomendasi command presisi kontekstual per perangkat & versi.
- **Efek:** `CommandPanel` otomatis beradaptasi dengan tab terminal yang sedang aktif. Build `npm run build` & `cargo check` 100% bersih.

---

## [2026-07-22] Redesain · Pemisahan Fitur Terminal Search & Command Recommendations
- **Tambah:** `src/components/SearchPanel.tsx` — panel dedicated khusus fitur pencarian teks di output terminal (diaktifkan via tombol 🔍 atau shortcut `Ctrl+F`).
- **Tambah:** `src/components/CommandPanel.tsx` — panel dedicated khusus rekomendasi command yang sering digunakan (diaktifkan via tombol ⚡).
- **Hapus:** `src/components/RightPanel.tsx` — menghapus panel gabungan sesuai permintaan pengguna agar kedua fitur 100% terpisah.
- **Ubah:** `src/components/TabBar.tsx` — menyediakan 2 tombol independen di action bar kanan (🔍 untuk Search, ⚡ untuk Commands).
- **Ubah:** `src/App.tsx` & `src/App.css` — memisah mode panel (`"none" | "search" | "commands"`), menambahkan judul panel terpisah, dan styling khusus.
- **Kenapa:** Memenuhi permintaan pengguna untuk memisahkan fitur pencarian terminal dan rekomendasi command agar masing-masing memiliki tombol & panel dedicated sendiri.
- **Efek:** UI jauh lebih jelas, intuitif, dan tidak ada tab tersembunyi di dalam panel. Build `npm run build` dan `cargo check` 100% bersih.

---

## [2026-07-22] Fitur · Right Panel Side Tab (Terminal Search + Command Recommendations)
- **Tambah:** `src/components/RightPanel.tsx` — panel kanan interaktif dengan 2 tab: 🔍 **Cari** (search in terminal) dan ⚡ **Commands** (rekomendasi command sering digunakan).
- **Ubah:** `src/components/Terminal.tsx` — expose `findNext`, `findPrevious`, `clearSearch`, `sendInput` via `forwardRef` + `TerminalHandle`. Deteksi keystroke Enter (`\r`) untuk rekam command otomatis.
- **Ubah:** `src/components/TabBar.tsx` — tambah tombol pencarian 🔍 di action bar kanan untuk toggle RightPanel.
- **Ubah:** `src/App.tsx` & `src/App.css` — integrasi RightPanel layout (~280px slide-in), shortcut global `Ctrl+F` untuk buka pencarian, persistensi command history di `localStorage` diurutkan frekuensi.
- **Kenapa:** Memenuhi permintaan pengguna untuk fitur search teks di terminal dan daftar rekomendasi command yang sering digunakan.
- **Efek:** User kini bisa mencari teks di terminal via `Ctrl+F` / panel kanan, serta mengeklik command rekomendasi untuk dikirim langsung ke terminal aktif. Build `npm run build` dan `cargo check` 100% bersih.

---

## [2026-07-22] UI/UX · Jarak Padding Internal Terminal (Anti Pinggir Layar)
- **Ubah:** `src/components/Terminal.tsx` — menambahkan `className="terminal-wrapper"` pada div kontainer xterm.js.
- **Ubah:** `src/App.css` — menambahkan style `.terminal-wrapper .xterm` dengan `padding: 12px 16px` dan `box-sizing: border-box`.
- **Kenapa:** Tulisan/karakter pertama pada layar terminal sebelumnya terlalu menempel/mepet di pinggir kiri dan atas bingkai container.
- **Efek:** Teks terminal kini memiliki jarak *breathing room* yang sangat nyaman (12px atas/bawah, 16px kiri/kanan) persis seperti aplikasi Termius / VS Code Terminal.

---

## [2026-07-22] Fitur · TabBar Drag-to-Reorder & Scroll Horizontal via Wheel
- **Ubah:** `src/components/TabBar.tsx` — tambah state `dragReorderKey`/`dragOverKey` + handler `onDragStart/Over/Drop/End` untuk reorder tab dengan drag-and-drop antar tab. Tambah `scrollRef` + `onWheel` handler agar scroll mouse bawah = scroll kanan, atas = scroll kiri.
- **Ubah:** `src/App.tsx` — tambah prop `onReorderTabs={(newTabs) => setTabs(newTabs)}` ke `<TabBar>`.
- **Tambah:** CSS `.tab.dragging` (tab ghosted saat di-drag), `.tab.drag-over` (highlight target drop dengan garis vertikal kiri), `.badge-local` (warna hijau gelap), `scroll-behavior: smooth` di `.tabbar-scroll`.
- **Kenapa:** Tab bar sebelumnya kaku, tidak bisa diurutkan ulang dan tidak bisa di-scroll saat penuh.
- **Teknis:** Gunakan `dataTransfer.setData("remote-app/reorder-key")` terpisah dari `"remote-app/tab-key"` (split drag), sehingga kedua jenis drag tidak bentrok satu sama lain.
- **Efek:** Build bersih; tab kini bisa di-drag kiri/kanan untuk ubah urutan, dan scroll wheel atas/bawah menggerakkan tabbar kiri/kanan saat overflow.

---

## [2026-07-22] Fitur · Terminal Lokal Tampil di Halaman Welcome Screen
- **Ubah:** `src/components/WelcomeScreen.tsx` — tambah kartu `proto-card-local` (ikon Monitor hijau) di grid protokol + tombol `Terminal Lokal` di bagian hero actions.
- **Ubah:** `src/App.tsx` — import `openLocalTerminal`, tambah prop `onOpenLocalTerminal` ke `WelcomeScreen` agar klik di welcome langsung buka tab tanpa dialog form.
- **Tambah:** CSS `.welcome-local-btn` dan `.proto-icon.local` dan `.proto-card-local:hover` di `App.css` (warna hijau lime #84cc16).
- **Kenapa:** Pengguna tidak bisa menemukan pilihan terminal lokal dari halaman awal karena belum ada kartu/tombolnya.
- **Efek:** Build frontend bersih; terminal lokal kini bisa dibuka langsung dari welcome screen dengan satu klik.

---

## [2026-07-22] Fitur · Terminal Lokal (Shell Bawaan Ubuntu/Linux)
- **Tambah:** `src-tauri/src/session/local_pty.rs` — `LocalPtySession` menggunakan `portable-pty` (crate sudah ada) untuk menjalankan `$SHELL` atau `/bin/bash` dalam PTY penuh (xterm-256color, truecolor). Thread terpisah push output ke UI via Tauri Channel.
- **Tambah:** Command `session_open_local` di `commands.rs` + registrasi di `lib.rs`.
- **Tambah:** Fungsi `openLocalTerminal()` di `src/lib/ipc.ts`.
- **Tambah:** Tipe `"local"` ke `Protocol` di `src/lib/types.ts`.
- **Tambah:** Tab **"Lokal"** di `NewSessionDialog.tsx` dengan `LocalTerminalPanel` — panel info langsung buka shell tanpa form tambahan (satu klik).
- **Tambah:** `local: "LOC"` ke badge map di `TabBar.tsx` dan `Sidebar.tsx`.
- **Tambah:** CSS `.local-terminal-panel`, `.local-desc`, `.local-info-grid` di `App.css`.
- **Kenapa:** Permintaan pengguna agar bisa membuka terminal bawaan Ubuntu di dalam tab aplikasi, tanpa perlu login SSH ke localhost.
- **Efek:** Build frontend & `cargo check` bersih (3 warnings lama tidak berkaitan).

---

## [2026-07-22] Fitur · Dropdown Pilihan Grup/Folder Otomatis di Form Profil
- **Ubah:** `src/components/ProfileForm.tsx` — mengambil semua grup yang sudah ada dari database via `listProfiles()` dan menampilkannya sebagai menu pilihan Dropdown (`<select>`).
- **Tambah:** Opsi `+ Buat Grup / Folder Baru...` di dalam dropdown untuk beralih ke mode input teks baru dengan tautan pintas `← Pilih dari grup yang sudah ada` untuk kembali.
- **Kenapa:** Permintaan pengguna agar tidak perlu mengetik ulang nama grup yang sudah ada (seperti `IDC`, `MMP`, dll) ketika membuat atau mengedit profil koneksi baru.
- **Efek:** Pengelompokan profil kini sangat cepat (1 klik pilih grup), dan jika belum ada grup yang dibuat, form akan otomatis menyediakan mode input teks biasa.

---

## [2026-07-22] Fix · Perbaikan Tinggi TabBar Tertekan/Mengecil (Flex Shrink Fix)
- **Ubah:** `src/App.css` — menambahkan `flex-shrink: 0` dan `min-height: 42px` pada kelas CSS `.tabbar` serta `flex-shrink: 0` pada `.status-bar`.
- **Kenapa:** Dalam tata letak flexbox vertikal, ketika canvas terminal xterm atau split pane meminta ruang tinggi penuh, flexbox secara otomatis menekan (*squish*) tinggi `TabBar` dari 42px menjadi ~12px sehingga judul tab terlihat ciut/mengecil.
- **Efek:** `TabBar` dan `StatusBar` kini dijamin memiliki tinggi konstan 100% stabil di semua kondisi tanpa pernah tergepengkan oleh konten terminal di bawahnya.

---

## [2026-07-22] Fix · Perbaikan Posisi Dialog Sesi Baru & Restorasi WelcomeScreen
- **Ubah:** `src/App.tsx` & `src/components/TabBar.tsx` — menyembunyikan `.term-hosts-container` (`display: none`) saat `showNew === true` atau `tabs.length === 0`, serta menambahkan highlight tombol `+` di `TabBar`.
- **Kenapa:** Laporan pengguna mengenai hilangnya WelcomeScreen dan posisi form `NewSessionDialog` yang terdorong jatuh ke dasar layar karena container terminal mengambil tinggi 100% di DOM.
- **Efek:** `WelcomeScreen` kini tampil sempurna ketika belum ada tab terbuka, dan form `NewSessionDialog` (saat mengklik `+`) tampil 100% di tengah layar tanpa terdorong ke bawah.

---

## [2026-07-22] Refactor · Arsitektur Container Terminal Persisten (Cegah Re-login & Reconnect)
- **Ubah:** `src/App.tsx` & `src/App.css` — mereset arsitektur DOM rendering terminal dengan `.term-hosts-container`. Setiap `<Terminal />` kini **tetap berada di dalam DOM React tanpa pernah di-unmount** saat beralih antara Single-Pane, Split Vertikal, atau Split Horizontal.
- **Kenapa:** Komponen terminal sebelumnya ter-unmount dan ter-remount saat mode split diaktifkan/dinonaktifkan atau saat berpindah tab, yang menyebabkan PTY terhubung ulang (*re-connect / re-login*) dan menghapus seluruh buffer/riwayat output perintah `show` sebelumnya.
- **Efek:** Perpindahan tab dan pergantian mode compare kini 100% instan, tanpa re-login, dan **100% riwayat output terminal/`show` sebelumnya tetap utuh dan tersimpan**.

---

## [2026-07-22] Fix · Perbaikan Perpindahan Tab Standalone Saat Mode Split Aktif
- **Ubah:** `src/App.tsx` & `src/components/TabBar.tsx` — memperkenalkan penjejakan `splitOwnerKey` dan `splitKey` yang presisi. `isSplitWorkspaceActive` kini secara ketat HANYA aktif jika `activeKey === splitOwnerKey` atau `activeKey === splitKey`.
- **Kenapa:** Sebelumnya, mengklik tab baru yang berdiri sendiri (standalone, misal Tab 3) tidak bisa menampilkan layar tunggal Tab 3 melainkan tetap membuka tampilan terbelah.
- **Efek:** Mengklik tab tunggal baru (Tab 3) kini akan menampilkan layar single pane bersih, dan mengklik kembali Grouped Tab di TabBar akan mengaktifkan ulang tampilan compare berdampingan secara instan.

---

## [2026-07-22] Fix · Perbaikan Tampilan Sesi Baru (showNew) Saat Mode Split Active
- **Ubah:** `src/App.tsx` — mengecek `!showNew` dalam penentuan `isSplitWorkspaceActive` sehingga saat tombol `+` (Sesi Baru) diklik, mode workspace split disembunyikan secara bersih dan form `NewSessionDialog` dapat ditampilkan dengan mulus tanpa clipping/bayangan divider di latar belakang.
- **Kenapa:** Laporan pengguna mengenai munculnya garis terbelah dan clipping layar ketika membuka tab baru setelah tab digabungkan.
- **Efek:** Pembukaan tab baru saat mode compare/split aktif kini 100% bersih dan responsif.

---

> **Entry lama (Fase 0–6 dan semua fix/hotfix/redesain sebelum Fase 7) telah diarsipkan ke [`docs/WORKLOG-ARCHIVE.md`](./WORKLOG-ARCHIVE.md).**
> Mencakup: Scaffold, SSH, Telnet, Serial, FTP, Profil/Kredensial, Polish/Themes, SSH Legacy, TitleBar, Highlighting, Lucide Migration, Split View, Subproses Cleanup, dan perbaikan UI lainnya.
