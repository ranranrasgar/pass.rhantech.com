# Rencana Fase Implementasi — VenuePass

**Sumber:** `PRD_VenuePass_Tiket_Absensi_QR.md` v1.1 + pemeriksaan `DATA BARCODE.xlsx`
**Tanggal:** 4 November 2026
**Prinsip:** setiap fase menghasilkan aplikasi yang **bisa dipakai utuh**; menu baru hanya muncul saat fiturnya selesai end-to-end. Tidak ada halaman placeholder.

---

## 1. Hasil Analisis

### 1.1 Data sumber (sudah diverifikasi)

| Item | Nilai |
|---|---|
| Sheet data | `Sheet1` (Sheet2 & Sheet3 kosong) |
| Header | `No`, `NAMA LENGKAP`, `GROUP` |
| Jumlah tamu | 742 |
| Grup | BANK CAPITAL (705), CS3 (21), AMP (16) |
| Pemetaan | `No` → `external_code` (string), `NAMA LENGKAP` → `name`, `GROUP` → `group_name` |

### 1.2 Stack final

| Lapisan | Pilihan | Catatan |
|---|---|---|
| App | Next.js 16 (App Router) + TypeScript | Route Handlers untuk API, Server Components untuk halaman; `cacheComponents` dimatikan (semua halaman dinamis per sesi) |
| UI | Tailwind CSS + shadcn/ui | Tabel pakai TanStack Table (sudah dipakai di contoh shadcn) |
| DB | **PostgreSQL 14 (Laragon)** | Diganti dari MySQL atas permintaan pengguna (4 Nov 2026) |
| ORM | Prisma 7.10 + `@prisma/adapter-pg` | `latest` npm = 8.0.0-rc, jadi dipakai rilis stabil 7.10.1 |
| Auth | Auth.js v5 (Credentials) + bcryptjs (cost 12) | Strategi JWT + cek `is_active` ke DB di setiap request terproteksi |
| Validasi | Zod | Dipakai bersama di form & API |
| Scan kamera | `html5-qrcode` atau `@zxing/browser` | Butuh HTTPS di luar localhost |
| QR | `qrcode` | |
| Excel | `exceljs` (baca **dan** tulis) + `papaparse` (CSV) | Lihat catatan 1.3 #5 |
| PDF | `pdfkit` (atau `pdf-lib`) | Lihat catatan 1.3 #6 |
| Test | Vitest (+ Playwright untuk E2E di fase 6) | |

### 1.3 Celah / keputusan teknis yang ditemukan di PRD

Ini perlu disepakati sebelum kode ditulis (sesuai aturan *Think Before Coding*):

1. **Penugasan petugas ke gate belum punya tabel.** FR-02 menyebut petugas bisa ditugaskan ke satu/beberapa gate, tetapi §9.3 tidak punya tabelnya.
   → **Usulan:** tambah tabel `gate_assignments (user_id, gate_id)` unique pasangan.

2. **Cetak ulang QR vs. "simpan hash saja".** §9.4 menyimpan `token_hash` saja. Akibatnya, setelah token dibuat, sistem **tidak bisa mencetak ulang PDF** tanpa menerbitkan token baru (yang mematikan gelang lama).
   → **Usulan:** tambah kolom `token_encrypted` (AES-256-GCM, kunci di `.env` `QR_ENC_KEY`). Lookup saat scan tetap pakai `token_hash`; enkripsi hanya untuk keperluan cetak ulang. Alternatif: cetak hanya sekali saat generate (lebih aman, kurang praktis).

3. **Scan log saat transaksi gagal.** Jika insert `check_in` melanggar unique dan transaksi di-rollback, `scan_log` di dalam transaksi ikut hilang.
   → **Usulan:** insert `check_in` di transaksi; tangkap error unique (Prisma `P2002`); tulis `scan_log` **di luar** transaksi setelah hasil diketahui.

4. **Petugas dinonaktifkan saat masih login.** Sesi JWT tetap valid sampai kedaluwarsa.
   → **Usulan:** helper `requireUser()` membaca user dari DB (cek `is_active` + role) di setiap API/aksi terproteksi.

5. **SheetJS (`xlsx`) versi npm sudah lama tidak diperbarui** (rilis baru hanya dari CDN SheetJS). Karena `exceljs` sudah dipakai untuk ekspor, pakai `exceljs` juga untuk membaca XLSX → satu dependensi lebih sedikit.

6. **Playwright untuk PDF terlalu berat** di Laragon/Windows (unduh browser, proses headless). `pdfkit` cukup: ukuran dalam mm dikonversi ke point (1 mm = 2,8346 pt), presisi dimensi mudah diuji (TC-13).

7. **Grup wajib?** Data aktual 100% terisi. → **Default:** grup wajib.

8. **Scanner USB mengirim Enter dua kali / scan berulang cepat.** → debounce token yang sama ≤ 2 detik di client (server tetap jadi penentu via unique constraint).

9. **Menu "Pengaturan"** belum dirinci di PRD. → **Usulan isi MVP:** zona waktu event, preset ukuran cetak tersimpan, bunyi scan default on/off, dan tampilan Audit Log.

### 1.4 Tambahan skema dari analisis

```text
gate_assignments  : id, user_id (FK), gate_id (FK), unique(user_id, gate_id)
qr_credentials    : + token_encrypted (TEXT, nullable)      -- jika usulan #2 disetujui
guests            : + unique(event_id, external_code)       -- dedupe impor (A.4 #6)
check_ins         : + is_voided, voided_at, voided_by, void_reason  -- koreksi (FR-08)
print_presets     : id, name, width_mm, height_mm, margin_mm, gap_x_mm, gap_y_mm,
                    columns (nullable=auto), orientation, fields(JSON), qr_size_mm
app_settings      : key (PK), value (JSON)
```

Catatan koreksi check-in: jika check-in di-*void*, unique `(guest_id, event_id)` menghalangi check-in ulang. Opsi paling sederhana: saat void, record dipindah ke `audit_logs.before_data` lalu baris `check_ins` dihapus oleh admin (dengan alasan). Ini memenuhi FR-08 tanpa unique parsial. **Perlu konfirmasi** pilihan mana.

---

## 2. Prinsip "Tidak Ada Menu Kosong"

- Navigasi didefinisikan di satu file `src/config/nav.ts` (label, href, role yang boleh).
- Item ditambahkan **hanya** pada fase saat fiturnya selesai.
- Sidebar memfilter item berdasarkan role; server tetap memvalidasi akses (403 jika tidak berhak).
- Setiap fase ditutup dengan checklist DoD + demo alur nyata memakai data `DATA BARCODE.xlsx`.

### Matriks menu per fase

| Menu | F1 | F2 | F3 | F4 | F5 | Role yang melihat |
|---|:-:|:-:|:-:|:-:|:-:|---|
| Dashboard | ✅ dasar | ✅ + tamu | ✅ + QR | ✅ + kehadiran | ✅ | Semua (petugas → diarahkan ke Scan) |
| Event | ✅ | | | | | Super Admin, Admin |
| Pengguna | ✅ | | | | | Super Admin |
| Gate & Petugas | | ✅ | | | | Super Admin, Admin |
| Data Tamu | | ✅ | | | | Super Admin, Admin |
| Impor Data | | ✅ | | | | Super Admin, Admin |
| QR & Cetak | | | ✅ | | | Super Admin, Admin |
| Scan Gate | | | | ✅ | | Petugas Gate (+ Admin untuk uji) |
| Riwayat Scan | | | | ✅ | | Super Admin, Admin |
| Laporan Kehadiran | | | | | ✅ | Super Admin, Admin, Viewer |
| Pengaturan (+ Audit Log) | | | | | ✅ | Super Admin |

---

## 3. Rincian Fase

### Fase 0 — Persiapan & Keputusan (0,5 hari)

**Tujuan:** semua keputusan di §1.3 dan PRD §18 terjawab; repo siap.

- [x] Konfirmasi keputusan #1–#4 (disetujui sesuai usulan, 4 Nov 2026). **Masih terbuka:** #9 isi Pengaturan, opsi koreksi check-in (dibutuhkan F5).
- [ ] Konfirmasi ukuran gelang/kartu & printer, jumlah gate, jaringan venue. *(belum dijawab; dibutuhkan F3/F4)*
- [x] `create-next-app` (TS, Tailwind, App Router, `src/`), shadcn/ui init, ESLint, Vitest. + PWA (logo Rhansoft).
- [x] Database `venuepass` (PostgreSQL) di Laragon, `.env.example`.

**DoD:** `npm run dev`, `lint`, `typecheck`, `test` lulus pada proyek kosong.

---

### Fase 1 — Fondasi: Auth, Pengguna, Event (2–3 hari)

**Menu aktif:** Dashboard (dasar), Event, Pengguna.

- [x] Skema Prisma **lengkap** sejak awal (semua tabel §9.3 + §1.4) → satu migrasi awal, mengurangi migrasi berantai.
- [x] Seed Super Admin dari env.
- [x] Login/logout (Auth.js Credentials), hash password, `requireUser(roles)`, middleware proteksi route.
- [x] Layout admin: sidebar dari `nav.ts`, header dengan **pemilih event aktif** (disimpan di cookie).
- [x] CRUD Pengguna: tambah, ubah, reset password, nonaktifkan, role.
- [x] CRUD Event: nama, venue, tanggal, status `DRAFT/ACTIVE/CLOSED`.
- [x] Dashboard dasar: kartu event aktif, jumlah event per status, jumlah pengguna per role.
- [x] Audit log ditulis untuk aksi pengguna & event (tampilan menyusul di F5).

**DoD / verifikasi:**
- User nonaktif tidak bisa login dan request API-nya ditolak walau masih punya sesi.
- Viewer tidak melihat menu Event/Pengguna dan mendapat 403 bila memanggil API-nya.
- Test: hash & verifikasi password, guard role.

---

### Fase 2 — Gate, Petugas, Tamu & Impor (2–3 hari)

**Menu baru:** Gate & Petugas, Data Tamu, Impor Data.

- [x] Gate: CRUD per event, nama unik per event, aktif/nonaktif.
- [x] Penugasan petugas ke gate (`gate_assignments`), multi-gate.
- [x] Data Tamu: tabel dengan pencarian, filter grup/status, paginasi server; tambah/ubah manual; batalkan (`CANCELLED`).
- [x] Impor:
  - [x] Upload XLSX/CSV (batas ukuran, cek MIME + isi).
  - [x] Pilih sheet (default sheet pertama yang berisi data), deteksi header otomatis.
  - [x] Pemetaan kolom (auto-map `No`/`NAMA LENGKAP`/`GROUP`).
  - [x] Pratinjau + ringkasan: total, valid, gagal (nomor baris + alasan), duplikat kode di file & di DB.
  - [x] Commit hanya baris valid dalam satu transaksi; simpan `import_batches`.
  - [x] Riwayat impor (tabel di halaman Impor).
- [x] Dashboard: total tamu per grup.

**DoD / verifikasi:**
- Impor `DATA BARCODE.xlsx` → **742 tamu**, BANK CAPITAL 705 / CS3 21 / AMP 16 (TC-01).
- Impor ulang file yang sama → 0 baris baru, 742 ditandai duplikat (TC-03).
- File dengan nama kosong → baris gagal dengan alasan (TC-02).

---

### Fase 3 — QR & Cetak (2 hari)

**Menu baru:** QR & Cetak.

- [ ] `lib/qr.ts`: token `VP1_` + 32 byte acak base64url (`crypto.randomBytes`), `sha256` → `token_hash`, `token_last4`, (opsional) `token_encrypted`.
- [ ] Generate massal untuk tamu aktif tanpa QR aktif; generate per tamu.
- [ ] Terbitkan ulang (cabut token lama + buat baru) & cabut QR, wajib alasan → audit log.
- [ ] Status QR tampil di Data Tamu (punya QR / dicabut / belum).
- [ ] Halaman cetak: pilih tamu (semua / grup / pilihan / rentang No), preset (Kartu 85,6×54, Label 50×30, Kustom), margin, jarak, kolom (auto/manual), orientasi, ukuran QR, field yang dicetak (nama event, nama, grup, kode).
- [ ] Pratinjau HTML skala mm + unduh **PDF** (pdfkit). Quiet zone ≥ 4 modul.
- [ ] Simpan preset cetak (`print_presets`).
- [ ] Ekspor daftar penerbitan QR (XLSX).
- [ ] Dashboard: jumlah tamu ber-QR vs belum.

**DoD / verifikasi:**
- 742 token unik (cek `COUNT(DISTINCT token_hash)`) (TC-04).
- PDF kustom: ukuran halaman & posisi label sesuai input (test unit hitung layout + cek dimensi PDF) (TC-13).
- QR hasil cetak terbaca kamera ponsel & scanner USB (uji fisik).

---

### Fase 4 — Scan Gate & Check-in (2–3 hari)

**Menu baru:** Scan Gate, Riwayat Scan.

- [ ] `POST /api/check-in/scan` sesuai §12.4 + keputusan §1.3 #3:
  hasil `SUCCESS`, `UNKNOWN_QR`, `ALREADY_CHECKED_IN`, `INACTIVE`, `WRONG_EVENT`, `ERROR`.
- [ ] Validasi: sesi, petugas aktif, petugas berhak di gate, gate & event aktif.
- [ ] Halaman Scan (layar penuh, kontras tinggi):
  - [ ] Pilih event + gate (hanya gate yang ditugaskan).
  - [ ] Mode kamera & mode scanner USB (input fokus otomatis, submit saat Enter, debounce).
  - [ ] Kartu hasil besar: hijau/merah/oranye + teks + ikon, waktu ditampilkan di zona event.
  - [ ] Bunyi berhasil/gagal + mute.
  - [ ] Indikator koneksi; saat gagal → **GAGAL TERHUBUNG**, tidak pernah tampil sukses.
  - [ ] Tombol "Mulai Scan Lagi".
- [ ] Riwayat Scan: tabel `scan_logs` dengan filter hasil/gate/petugas/waktu.
- [ ] Dashboard: hadir, belum hadir, %, per gate, 10 check-in terbaru (auto-refresh 10 detik).
- [ ] Setup HTTPS lokal (mis. mkcert / SSL Laragon) untuk uji di ponsel.

**DoD / verifikasi (test integrasi ke DB):**
- TC-05, 06, 07, 09, 10, 11, 14 lulus.
- **TC-08:** 20 request paralel token yang sama → tepat 1 `SUCCESS`, 19 `ALREADY_CHECKED_IN`.
- Respons/log tidak memuat token mentah.
- Waktu respons scan < 2 detik di LAN.

---

### Fase 5 — Laporan, Koreksi, Pengaturan (2 hari)

**Menu baru:** Laporan Kehadiran, Pengaturan.

- [ ] Laporan kehadiran: kolom §11.6, filter event/grup/gate/status/rentang waktu.
- [ ] Tab: Semua, Belum Hadir, Per Gate (rekap jumlah), Scan Ditolak/Duplikat.
- [ ] Ekspor XLSX & CSV mengikuti filter aktif (role: Super Admin, Admin, Viewer).
- [ ] Koreksi check-in oleh admin dengan alasan → audit log before/after (sesuai opsi yang disepakati).
- [ ] Pengaturan: zona waktu, default bunyi scan, kelola preset cetak, retensi data (catatan kebijakan).
- [ ] Viewer Audit Log (filter user/aksi/tanggal) di dalam Pengaturan.

**DoD / verifikasi:**
- Angka ekspor = angka dashboard = query DB (TC-12).
- Viewer bisa lihat & ekspor, tidak bisa ubah apa pun.

---

### Fase 6 — Hardening & Kesiapan Hari Acara (2–3 hari)

Tidak menambah menu; memastikan semuanya andal.

- [ ] E2E Playwright untuk alur utama: login → impor → generate → cetak → scan → laporan.
- [ ] Simulasi beban: N gate × laju kedatangan puncak.
- [ ] Review keamanan: rate limit login, ukuran upload, header keamanan, tidak ada stack trace ke user.
- [ ] Skrip backup `mysqldump` terjadwal + uji restore.
- [ ] Dokumen SOP gate & prosedur darurat manual (PRD §14).
- [ ] Uji fisik: cetak di bahan gelang asli, cahaya venue, beberapa ponsel/scanner.

**DoD:** checklist PRD §15.3 terpenuhi seluruhnya.

---

## 4. Estimasi

| Fase | Estimasi |
|---|---|
| 0 Persiapan | 0,5 hari |
| 1 Fondasi | 2–3 hari |
| 2 Gate, Tamu, Impor | 2–3 hari |
| 3 QR & Cetak | 2 hari |
| 4 Scan & Check-in | 2–3 hari |
| 5 Laporan & Pengaturan | 2 hari |
| 6 Hardening | 2–3 hari |
| **Total** | **12,5–16,5 hari kerja** |

Sedikit di atas estimasi PRD (8–16 hari) karena menambahkan penugasan gate, cetak ulang, koreksi, Pengaturan, dan E2E agar tidak ada menu setengah jadi.

## 5. Struktur folder

Diubah ke gaya Laravel atas permintaan pengguna (4 Nov 2026). `src/app/` wajib untuk routing
Next.js, jadi berperan sebagai `routes/`. Rincian pemetaan ada di `README.md`.

```text
prisma/                 # database/: schema.prisma, migrations/, seed.ts
src/
├── app/                # routes/ (tipis)
│   ├── (auth)/login/   (admin)/dashboard|events|users/ ...
│   └── api/**/route.ts # export const GET = XController.index
├── Http/
│   ├── Controllers/    # EventController, UserController, AuthController (server action)
│   ├── Requests/       # validasi Zod
│   └── Middleware/     # Authenticate.ts (requireUser / requirePageUser)
├── Models/             # query Prisma per tabel
├── Services/           # logika bisnis (import, checkin, report, print menyusul)
├── views/              # resources/views; views/components/ui = shadcn
├── config/nav.ts       # satu-satunya sumber menu
├── lib/                # auth.ts, db.ts, password.ts, time.ts, roles.ts, api.ts
├── generated/prisma/   # hasil prisma generate (tidak di-commit)
└── proxy.ts            # pengganti middleware.ts di Next 16
```
