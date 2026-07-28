# AGENTS.md — Aturan Main untuk Semua Model AI

> **Baca file ini PERTAMA sebelum melakukan apa pun.**
> Berlaku untuk model AI apa pun (Claude, GPT, Gemini, dll) yang mengerjakan proyek ini.
> Tujuannya: hasil tetap konsisten walau model berganti-ganti.

---

## 0. Ritual Onboarding (WAJIB, tiap sesi baru)

Sebelum menulis kode atau menjawab, baca berurutan:

1. **`AGENTS.md`** (file ini, di root) — aturan main.
2. **`docs/DECISIONS.md`** — keputusan yang sudah terkunci. JANGAN dilanggar.
3. **`docs/PRD.md`** — apa yang dibangun & kenapa.
4. **`docs/PLANNING.md`** — arsitektur & rencana teknis.
5. **`docs/CHECKLIST.md`** — status progres saat ini (apa yang sudah/belum).
6. **`docs/WORKLOG.md`** — 3–5 entry terakhir, untuk tahu perubahan terbaru.

> **Struktur:** `AGENTS.md` & `CLAUDE.md` ada di root (pintu masuk). Semua dokumen lain ada di folder **`docs/`**.

Setelah membaca, konfirmasi singkat ke user: *"Sudah baca konteks, posisi terakhir di Fase X, task Y."*

---

## 1. Aturan Emas (agar konsisten lintas model)

1. **Sumber kebenaran = dokumen, bukan asumsi.** Kalau ragu, ikuti PRD/PLANNING/DECISIONS. Jangan mengarang ulang keputusan.
2. **Keputusan terkunci tidak boleh diubah** tanpa: (a) alasan jelas, (b) persetujuan user, (c) dicatat di `docs/DECISIONS.md`. Contoh: framework, struktur folder, nama crate.
3. **Satu task, satu perubahan kecil.** Jangan refactor besar tak diminta. Kerjakan sesuai item di `docs/CHECKLIST.md`.
4. **Setiap perubahan WAJIB dicatat** di `docs/WORKLOG.md` (format di bagian 3).
5. **Update `docs/CHECKLIST.md`** saat task selesai (⬜ → 🟨 → ✅) + counter progress.
6. **Ikuti konvensi** di bagian 4. Gaya kode harus seragam antar model.
7. **Jangan hapus/timpa dokumen tata-kelola** (`AGENTS.md`, `docs/DECISIONS.md`, `docs/PRD.md`). Hanya menambah/mengubah dengan hati-hati.

---

## 2. Alur Kerja per Task

```
1. Baca ritual onboarding (bagian 0).
2. Ambil 1 task dari docs/CHECKLIST.md (yang prioritas & belum selesai).
3. Kalau butuh keputusan baru → tanya user → catat di docs/DECISIONS.md.
4. Kerjakan perubahan sekecil mungkin yang menyelesaikan task.
5. Tulis entry di docs/WORKLOG.md (ringkas, ≤ 15 baris).
6. Update status di docs/CHECKLIST.md.
7. Lapor ke user: apa yang berubah + file mana + task berikutnya.
```

---

## 3. Aturan Pencatatan Perubahan (WORKLOG.md)

- **Tiap perubahan = 1 entry.** Tulis di ATAS (paling baru di atas).
- **Maksimal ~15 baris per entry.** Kalau lebih panjang, ringkas — tulis *apa* & *kenapa*, bukan seluruh kode.
- **Format entry:**
  ```
  ## [YYYY-MM-DD] Fase X · <judul singkat>
  - **Ubah:** <apa yang diubah, file mana>
  - **Kenapa:** <alasan singkat>
  - **Efek:** <dampak / task checklist yang terpengaruh>
  - **Catatan:** <opsional: hal yang perlu diingat model berikutnya>
  ```
- **Aturan ringkas otomatis:** kalau `docs/WORKLOG.md` **> 200 baris**, pindahkan entry-entry lama (paling tua) ke `docs/WORKLOG-ARCHIVE.md`, dan ganti dengan **satu paragraf ringkasan** di bagian bawah `docs/WORKLOG.md`. Sisakan ~10 entry terbaru saja dalam bentuk detail.

---

## 4. Konvensi Kode (seragam antar model)

- **Bahasa:** Rust (backend `src-tauri/`), TypeScript + React (frontend `src/`).
- **Naming:** Rust `snake_case`, TS `camelCase` (variabel/fungsi) & `PascalCase` (komponen/tipe).
- **Error handling:** semua Tauri command return `Result<T, AppError>`. Jangan `unwrap()` di jalur produksi.
- **Komentar:** secukupnya, jelaskan *kenapa* bukan *apa*. Ikuti gaya kode di sekitarnya.
- **Struktur folder:** ikuti `docs/PLANNING.md` bagian 4. Jangan bikin struktur baru tanpa update `docs/DECISIONS.md`.
- **Commit/perubahan:** kecil & fokus. Satu tujuan per perubahan.
- **Bahasa komunikasi ke user:** Indonesia.

---

## 5. Kalau Ada Konflik / Ketidakpastian

- Dokumen bertentangan → **`docs/DECISIONS.md` menang**, lalu `docs/PRD.md`, lalu `docs/PLANNING.md`.
- Butuh keputusan yang belum ada → **berhenti, tanya user**, jangan asal pilih.
- Menemukan bug di keputusan lama → catat sebagai usulan di `docs/WORKLOG.md`, minta konfirmasi sebelum ubah `docs/DECISIONS.md`.

---

## 6. Ringkasan Satu Kalimat

> Baca dokumen dulu → ikuti keputusan terkunci → kerjakan task kecil → catat di WORKLOG → update CHECKLIST → lapor. Model boleh ganti, aturannya tetap.
