# Panduan Rilis & Sistem Auto-Update (Tauri v2 Updater)

Aplikasi **Terminalku** dilengkapi dengan fitur **Auto-Update Otomatis** berbasis `@tauri-apps/plugin-updater`.

Setiap kali pengguna membuka aplikasi **Terminalku**, aplikasi akan mengecek berkas manifes `updater.json`. Jika terdapat versi baru (misal `v0.2.0`), pop-up dialog pembaharuan akan secara otomatis muncul di layar pengguna.

---

## 📋 Format Berkas Manifes (`updater.json`)

Berkas `updater.json` diletakkan di repositori (contoh: `https://raw.githubusercontent.com/username/terminalku/main/updater.json`).

```json
{
  "version": "0.2.0",
  "notes": "Rilis versi 0.2.0 dengan peningkatan performa SSH dan perbaikan bug UI.",
  "pub_date": "2026-07-28T12:00:00Z",
  "platforms": {
    "linux-x86_64": {
      "signature": "...",
      "url": "https://github.com/username/terminalku/releases/download/v0.2.0/Terminalku_0.2.0_amd64.AppImage.tar.gz"
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/username/terminalku/releases/download/v0.2.0/Terminalku_0.2.0_x64-setup.nsis.zip"
    }
  }
}
```

---

## 🚀 Langkah-langkah Merilis Versi Baru:

1. **Naikkan Nomor Versi**:
   Buka `src-tauri/tauri.conf.json` dan `package.json`, lalu ubah `"version": "0.1.0"` menjadi `"version": "0.2.0"`.

2. **Jalankan Kompilasi Rilis**:
   ```bash
   npx tauri build
   ```

3. **Upload Aset Rilis ke GitHub Releases**:
   - Buat *New Release* di repositori GitHub Anda dengan tag `v0.2.0`.
   - Upload file installer (`Terminalku_0.2.0_amd64.deb` / `.AppImage`) ke halaman release tersebut.

4. **Perbarui `updater.json`**:
   - Masukkan nomor versi baru (`0.2.0`), catatan perubahan (*notes*), dan link download aset rilis.
   - Commit & Push berkas `updater.json` ke branch `main`.

5. **Selesai!**
   Seluruh pengguna yang menggunakan **Terminalku** akan mendapatkan pemberitahuan pop-up update secara otomatis saat membuka aplikasi!
