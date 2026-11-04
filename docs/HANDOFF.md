# HANDOFF — VenuePass

Catatan serah terima untuk agent/developer berikutnya. Baca ini + `AGENTS.md` + `docs/RENCANA_FASE.md` sebelum mengubah apa pun.

## Status Terakhir

- **Branch:** `main` (repo baru di-`git init`, belum ada remote).
- **Commit terakhir:** `94062a8` feat: Fase 5 — laporan kehadiran, koreksi check-in, audit log (+ commit docs ini). Belum di-push (belum ada remote).
- **Fase:** Fase 0–5 ✅ (tinggal uji fisik: cetak gelang, scan kamera ponsel/scanner USB via HTTPS). Berikutnya: **Fase 6 — Hardening & Kesiapan Hari Acara** (E2E, beban, keamanan, backup, SOP).
- **Data di DB dev = data kerja pengguna** (event id 1 — kini bernama `BankCapital`, 4 gate, 840 tamu kode 0001–0840). **Jangan TRUNCATE/reset tabel** untuk membersihkan uji — buat event uji sendiri dan hapus hanya baris uji itu.
- **Keputusan terbuka:** ukuran fisik gelang & printer (preset 250 × 20 mm masih asumsi), jumlah gate & laju kedatangan puncak (untuk simulasi beban F6), jaringan venue.
- **Keputusan sudah diambil (F5):** koreksi = batalkan check-in (hapus baris + audit); Pengaturan = Audit Log saja.

## Riwayat Perubahan

### 2026-11-04 — `94062a8` feat: Fase 5 — laporan kehadiran, koreksi check-in, audit log

**Apa & mengapa**
- **Laporan Kehadiran** (`/reports`, Super Admin/Admin/Viewer): kolom PRD §11.6 (No, Nama, Grup, Kode, Status, Waktu hadir, Gate, Petugas); tab **Semua / Belum Hadir / Per Gate / Scan Ditolak-Duplikat**; filter grup, gate, status, rentang tanggal (lokal `APP_TIMEZONE`, "sampai" inklusif); paginasi 50. Hanya tamu ACTIVE yang dihitung — sama dengan dashboard. Filter gate/tanggal tanpa status = hanya tamu hadir yang cocok.
- **Ekspor** `GET /api/reports/export?format=xlsx|csv&<filter sama>` mengikuti tab & filter aktif; CSV UTF-8 + BOM (pemisah koma); setiap ekspor dicatat `report.export` di audit. `GET /api/reports/attendance` = data JSON yang sama.
- **Koreksi** (keputusan pengguna): `POST /api/check-ins/:id/cancel {reason}` (Super Admin/Admin, alasan ≥ 5 karakter) — data check-in lama + nama gate/petugas disimpan di `audit_logs.before_data` (`checkin.cancel`), baris `check_ins` dihapus → tamu jadi belum hadir & bisa scan lagi. Tombol "Batalkan check-in" di tabel laporan (tidak tampil untuk Viewer).
- **Pengaturan** (`/settings`, Super Admin): hanya **Audit Log** (keputusan pengguna) — filter pengguna/aksi/tanggal, detail sebelum/sesudah (JSON) per baris. Tabel `app_settings` tetap ada tapi belum dipakai.
- Menu baru: **Laporan Kehadiran**, **Pengaturan**.
- Catatan dev: setelah mengubah method objek model (mis. `AuditLog`), Turbopack kadang tetap memakai modul lama ("... is not a function") → restart dev server.

**File utama:** `src/Services/ReportService.ts`, `src/Services/Report/exportFile.ts` (+ test), `src/Http/Controllers/ReportController.ts`, `src/Http/Requests/ReportRequest.ts`, `src/Models/AuditLog.ts` (`paginate`, `actions`), `src/app/api/{reports,check-ins}/**`, `src/app/(admin)/{reports,settings}/page.tsx`, `src/views/{reports,settings}/**`.

**Verifikasi**
- `lint`, `typecheck`, `npm test` (37), `npm run test:int` (10) lulus.
- Uji HTTP di event uji terpisah (dihapus setelahnya, event pengguna utuh): ringkasan & semua tab/filter benar; **TC-12** XLSX 7 baris/3 hadir = query DB, CSV belum hadir 4 = DB, dashboard 42,9% = laporan; Viewer bisa lihat & ekspor tetapi 403 untuk batalkan/ubah data dan tidak melihat tombol; batalkan check-in → audit before + alasan, tamu belum hadir lalu bisa scan lagi, batal dua kali 404; Admin non-super tidak bisa buka Pengaturan — 27/27.

**Belum dilakukan / perlu tindakan manual**
- Tampilan laporan & audit log belum dicek manusia di browser; buka file ekspor di Excel (CSV memakai koma — bila Excel berlokal Indonesia memisah kolom dengan titik koma, pakai XLSX).

### 2026-11-04 — `0775a87` feat: Fase 4 — scan gate & check-in atomik

**Apa & mengapa**
- `POST /api/check-in/scan {token, gateId}` (`CheckInController` → `Services/CheckInService.scan`). Petugas dari sesi; **event ditentukan dari gate**, bukan dari body. Urutan: hash token → `UNKNOWN_QR` → `WRONG_EVENT` → `INACTIVE` (QR dicabut / tamu dibatalkan) → insert `check_ins`; unique `(guest_id, event_id)` + tangkap P2002 → `ALREADY_CHECKED_IN` dengan gate & waktu check-in pertama. Galat tak terduga → `ERROR` (tidak pernah sukses).
- `scan_logs` ditulis setelah hasil diketahui (keputusan #3) dengan `token_fingerprint` = 16 hex awal sha256; token mentah tidak di log/respons. Penolakan akses (401/403/404/409) **tidak** dicatat di scan_logs (bukan scan sah).
- Akses (`Services/GateAccessService.ts`): Petugas Gate hanya gate yang ditugaskan; Super Admin/Admin semua gate (untuk uji); Viewer 403; gate nonaktif / event bukan ACTIVE → 409. Waktu ditampilkan dalam `APP_TIMEZONE` (field `time` di respons).
- Halaman `/scan` (di luar layout admin, layar penuh, kontras tinggi): pilih gate (gate tunggal langsung terbuka), mode **Scanner USB** (input selalu fokus, kirim saat Enter) dan **Kamera** (`@zxing/browser`, kamera belakang, ditahan setelah hasil sampai "Mulai Scan Lagi"), debounce token sama 2 dtk, timeout 8 dtk, kartu hasil besar (hijau/oranye/merah + ikon + teks + tindakan), bunyi Web Audio + mute (localStorage), indikator koneksi (ping `/api/check-in/ping` tiap 15 dtk). Fetch gagal → **GAGAL TERHUBUNG**, tidak pernah sukses (TC-11). Komponen dirender client-only (`ScanStationClient`, `ssr: false`).
- Petugas yang membuka `/dashboard` diarahkan ke `/scan`. Menu baru: **Scan Gate** (Super Admin, Admin, Petugas), **Riwayat Scan** (Super Admin, Admin; filter hasil/gate/petugas/tanggal, paginasi 50).
- Dashboard: panel Kehadiran (terdaftar aktif, hadir, belum, %, per gate, 10 check-in terbaru), auto-refresh 10 dtk saat tab terlihat.
- **Tes integrasi** ke DB terpisah `venuepass_test` (`TEST_DATABASE_URL` di `.env`, `npm run test:int`, `vitest.int.config.mts` menolak jalan bila URL bukan `*_test`; `server-only` di-stub). `npm test` mengecualikan `*.int.test.ts`. Setelah menambah migrasi: `DATABASE_URL=<TEST_DATABASE_URL> npx prisma migrate deploy`.
- `npm run dev:https` = `next dev --experimental-https -H 0.0.0.0` untuk uji kamera di ponsel (kamera browser butuh HTTPS di luar localhost).

**File utama:** `src/Services/{CheckInService,GateAccessService}.ts` (+ `CheckInService.int.test.ts`), `src/Models/{CheckIn,ScanLog}.ts`, `src/Http/Controllers/CheckInController.ts`, `src/Http/Requests/ScanRequest.ts`, `src/app/api/check-in/**`, `src/app/scan/page.tsx`, `src/app/(admin)/scan-logs/page.tsx`, `src/views/scan/**`, `src/views/scan-logs/ScanLogIndex.tsx`, `src/views/dashboard/{AttendancePanel,AutoRefresh}.tsx`, `vitest.int.config.mts`, `src/test/server-only-stub.ts`.

**Verifikasi**
- `lint`, `typecheck`, `npm test` (35) dan `npm run test:int` (10: TC-05/06/07/08/09/10/14, spasi/Enter scanner USB, scan_logs tanpa token) lulus.
- Uji HTTP di event uji terpisah (baris uji dihapus setelahnya, event pengguna utuh): TC-05/06/07/09/10/14 + viewer/401/409/404, **TC-08 20 request paralel → 1 SUCCESS + 19 ALREADY**, respons maks 1,1 dtk di dev server, check_ins = 2, redirect petugas, pilih gate, Riwayat Scan, dashboard 40%.

**Belum dilakukan / perlu tindakan manual**
- TC-11 (koneksi putus) & tampilan halaman scan belum dicoba di browser oleh manusia (agent tidak bisa login di browser).
- Uji di ponsel: jalankan `npm run dev:https` (pertama kali memasang CA mkcert — perlu persetujuan pengguna), buka `https://<IP-laptop>:3000/scan` dari ponsel di Wi-Fi yang sama; ponsel perlu memercayai sertifikat.
- Uji scanner USB & cetak gelang fisik.
- `npm install` (dependensi baru `@zxing/browser`); buat DB `venuepass_test` + `migrate deploy` di mesin lain.

### 2026-11-04 — `3092dd6` feat: cetak gelang memakai desain asli, hanya QR + nama + entitas berubah

**Apa & mengapa** (permintaan pengguna: "bentuk gelangnya samakan saja, yang berubah nama dan QR-nya saja")
- Tema `DARK` tidak lagi menggambar tiruan; kini memakai **gambar desain asli** `src/Services/Print/assets/gelang-template.png` sebagai latar. Template dibuat dari `docs/WhatsApp Image 2026-11-04 at 8.41.29 AM.jpeg` dengan mengosongkan kotak QR dan menghapus nama/entitas contoh (isi ulang gradasi emas) — tidak ada data pribadi di template. Skrip pembuatnya tidak di-commit; bila desain berubah, minta file desain kosong (tanpa nama & QR) dari desainer dan timpa PNG itu.
- Di atas template digambar per tamu: QR (vektor, quiet zone 4 modul) di kotak putih, garis pemisah, NAMA (huruf kapital), dan baris kedua = grup/entitas (+ kode bila field "Kode tamu" dicentang). Posisi dalam piksel gambar 1600 × 128 (`T` di `renderPdf.ts`), diskalakan ke ukuran label. Nama event & logo sudah ada di gambar, jadi field "Nama event" dan "Ukuran QR" diabaikan untuk tema ini.
- Rasio gambar 12,5 : 1 → preset gelang diganti ke **250 × 20 mm** (masih ASUMSI ukuran fisik). Ukuran lain akan membuat gambar gepeng.
- Gambar dimuat sekali per dokumen (`doc.openImage`, belum ada di @types/pdfkit → cast): 839 gelang ≈ 1,9 MB, bukan ~110 MB.
- Nama: font desain 5,6 pt (20 mm), dikecilkan s/d 60% sebelum dipotong. Dari 840 nama asli: 807 utuh, 33 dikecilkan, 0 terpotong.
- Resolusi gambar 1600 px untuk 250 mm ≈ 160 dpi — cukup, tapi untuk hasil tajam minta file desain resolusi lebih tinggi (≥ 3000 px lebar) dengan rasio sama.

**File utama:** `src/Services/Print/renderPdf.ts` (+ test), `src/Services/Print/assets/gelang-template.png`, `src/config/printPresets.ts`, `src/views/print/PrintSettings.tsx`.

**Verifikasi:** `lint`, `typecheck`, 35 test lulus; contoh PDF dicek visual (tampil sama dengan desain); uji HTTP di event uji terpisah: 839 halaman 250 × 20 mm, 1,9 MB, 1,6 dtk (baris uji dihapus, event pengguna utuh).

### 2026-11-04 — `665b9b5` feat: Fase 3 — QR & cetak gelang/kartu PDF

**Apa & mengapa**
- `src/lib/qr.ts`: token `VP1_` + 32 byte acak base64url; DB menyimpan `token_hash` (sha256, unik), `token_last4`, dan `token_encrypted` (AES-256-GCM, kunci `QR_ENC_KEY`, format iv|tag|data base64) khusus untuk cetak ulang. Token mentah hanya ada di PDF; tidak ada di respons API, log, atau ekspor.
- `Services/QrService.ts`: generate massal (tamu ACTIVE tanpa QR aktif), terbitkan per tamu, **terbitkan ulang** (QR lama dicabut, alasan wajib), **cabut** (alasan wajib). Semua di bawah advisory lock `(1002, event_id)` supaya satu tamu tidak punya dua QR aktif; audit `qr.generate_bulk|issue|reissue|revoke|print`.
- Cetak: `Services/Print/layout.ts` (hitung grid dalam mm, fungsi murni + tes), `renderPdf.ts` (pdfkit; QR vektor, quiet zone 4 modul, modul gelap digabung per baris → 839 gelang ≈ 1,9 MB / 1,8 dtk), `PrintService.ts` (pilih tamu: semua / grup / daftar kode `0001-0100, 0150`; tamu tanpa QR aktif dilewati & dihitung di header `X-Skipped-No-Qr`).
- Kertas: `LABEL` (1 label per halaman, ukuran halaman = label → printer gelang/label) atau `A4`/`LETTER` (grid, kolom otomatis/manual, orientasi). Tema `DARK` meniru gelang tamu (hitam, judul emas, QR di kotak putih, nama+grup di label emas) dan `LIGHT` (putih + garis potong). Teks panjang dikecilkan s/d 70% lalu dipotong "…".
- Migrasi `print_paper_theme`: kolom `print_presets.paper` & `theme` (aditif, data aman). **Setelah migrasi, restart dev server** — `src/lib/db.ts` menyimpan PrismaClient di `globalThis`, jadi client lama tetap dipakai sampai restart.
- `next.config.ts`: `serverExternalPackages: ["pdfkit"]` (pdfkit membaca font AFM lewat `__dirname`).
- Preset bawaan di `src/config/printPresets.ts`. **ASUMSI** gelang 254 × 25,4 mm (Tyvek 10"×1") karena ukuran asli belum dikonfirmasi — ubah di form lalu "Simpan sebagai preset".
- UI: menu **QR & Cetak** (`/print`): ringkasan + tombol Buat QR + ekspor XLSX, pilih tamu, preset, ukuran, field, pratinjau halaman 1 (iframe PDF), unduh PDF. Data Tamu: kolom QR (Punya QR / Dicabut / Belum) + aksi Buat QR / Terbitkan ulang / Cabut QR. Dashboard: tamu ber-QR vs belum.

**File utama:** `src/lib/qr.ts`, `src/Models/{QrCredential,PrintPreset}.ts`, `src/Services/QrService.ts`, `src/Services/Print/**`, `src/Http/Controllers/{Qr,Print}Controller.ts`, `src/Http/Requests/PrintRequest.ts`, `src/app/api/{qr,print,print-presets,guests/[id]/issue-qr,guests/[id]/revoke-qr}/**`, `src/app/(admin)/print/page.tsx`, `src/views/print/**`, `src/views/guests/GuestQrActions.tsx`, `src/config/printPresets.ts`, `prisma/migrations/*_print_paper_theme`.

**Verifikasi**
- `lint`, `typecheck`, `npm test` (35 test: token, enkripsi, layout, dimensi PDF) lulus.
- Uji HTTP pada **event uji terpisah** berisi 840 tamu dari kedua file (lalu hanya baris uji yang dihapus): generate 840 (0,5 dtk), generate ulang 0; **TC-04** 841 token unik & 841/841 hasil dekripsi cocok dengan hash; terbitkan ulang/cabut wajib alasan; **TC-13** PDF gelang 839 halaman tepat 254 × 25,4 mm, A4 landscape/grid sesuai; pilih grup/kode; preset simpan/hapus; ekspor XLSX tanpa token; Viewer 403 — 25/25 lulus. Halaman `/print`, `/guests`, `/dashboard` ter-render.
- **QR belum dibuat untuk Event-Bandung** — itu keputusan pengguna (klik "Buat QR" di menu QR & Cetak).

**Belum dilakukan / perlu tindakan manual**
- Uji fisik: cetak di gelang asli, scan dengan kamera ponsel & scanner USB (DoD F3). Konfirmasi ukuran gelang & printer lalu sesuaikan preset.
- Interaksi UI (unduh, pratinjau, prompt alasan) belum dicoba manusia.
- `npm install` di mesin lain (dependensi baru `pdfkit`, `qrcode`), `npx prisma migrate dev`, restart dev server.

### 2026-11-04 — `0e92d68` feat: kode tamu otomatis 0001.. per event + tema hitam-emas gelang

**Apa & mengapa** (keputusan pengguna, menyimpang dari PRD A.3/A.4 #5–#6)
- Ada file kedua `docs/DATA BARCODE (Ref) - CAPITAL GROUP.xlsx` (98 tamu, kolom `ENTITAS`). Kedua file sama-sama mulai No 1, jadi kolom `No` kini **diabaikan** saat impor.
- `external_code` dibuat sistem: 4 digit berurutan per event (`formatGuestCode`), melanjutkan angka terbesar yang ada. Urutan impor menentukan nomor: file utama 0001–0742, Ref 0743–0840. Tamu manual tanpa kode juga mendapat nomor berikutnya.
- Penomoran aman paralel: `pg_advisory_xact_lock(1001, event_id)` (`Guest.lockCodes`). Commit impor membaca & memvalidasi ulang **di dalam** transaksi yang terkunci (`ImportService.commitImport`), jadi nomor di pratinjau bisa bergeser bila ada impor lain di antaranya.
- Duplikat kini = **nama + grup** (tanpa beda huruf besar/kecil & spasi, `guestKey`), termasuk tamu yang dibatalkan. Nama sama dengan grup berbeda dianggap orang lain (ada 1 nama yang muncul di kedua file dengan grup berbeda → keduanya masuk).
- `ENTITAS` dikenali sebagai Grup. Pratinjau menampilkan rentang kode yang akan dibuat.
- QR tetap token acak (Fase 3); kode 0001 hanya dicetak sebagai teks di gelang.
- Bug diperbaiki: di Zod 4, `.default("")` tidak menjalankan `transform`, sehingga tamu manual tanpa field `externalCode` tersimpan dengan kode `""` → diganti `.prefault("")`.
- Tema aplikasi hitam-emas mengikuti desain gelang (`docs/WhatsApp Image 2026-11-04 at 8.41.29 AM.jpeg`, sengaja di-commit sebagai acuan desain): `--primary` emas, sidebar & login hitam, `theme_color` PWA `#141414`.
- `.gitignore`: `/docs/*.xlsx` dan `~$*` (file kunci Office). Kedua xlsx sudah dihapus dari riwayat git sebelum ada push.

**File utama:** `src/Services/Import/{validateImport,ImportService}.ts`, `src/Models/Guest.ts`, `src/Http/Controllers/GuestController.ts`, `src/Http/Requests/GuestRequest.ts` (+ test), `src/views/imports/*`, `src/views/guests/GuestFormDialog.tsx`, `src/app/globals.css`, `src/views/layouts/*`.

**Verifikasi**
- `lint`, `typecheck`, `npm test` (21 test) lulus.
- Uji HTTP dengan kedua file asli: 840 tamu, kode 0001–0840 unik & berurutan, baris pertama Ref = 0743, grup 705/21/16 + entitas Ref; impor ulang kedua file → 0 baru; tamu manual → 0841; 10 POST paralel → 0842–0851 tanpa kembar. Data uji dihapus.
- Tema dicek visual hanya di halaman login.

### 2026-11-04 — `eeaead8` feat: Fase 2 — gate & petugas, data tamu, impor XLSX/CSV

**Apa & mengapa**
- Semua fitur Fase 2 bekerja pada **event aktif** di header (cookie `vp_event`); tidak ada `eventId` dari body. `requireActiveEvent()` (409 bila belum ada event) di `Services/ActiveEventService.ts`.
- **Gate & Petugas** (`/gates`): tambah, ubah nama, aktif/nonaktif; nama unik per event (409). Penugasan `PUT /api/gates/:id/officers {userIds}` mengganti seluruh daftar; hanya user aktif ber-role `GATE_OFFICER` (422 selain itu). Satu petugas boleh di beberapa gate.
- **Data Tamu** (`/guests`): filter di URL (`q`, `group`, `status`, `page`), paginasi server 50/halaman, urut `created_at, id` (urutan impor). Tambah/ubah manual (kode tamu opsional; unik per event → 409), batalkan/aktifkan lagi (`status`), audit `guest.create|update|cancel`.
- **Impor** (`/import`): stateless — file dikirim ulang saat commit, server membaca & memvalidasi ulang (tidak ada file sementara). `exceljs` untuk XLSX, `papaparse` untuk CSV (BOM, pemisah `,`/`;` auto). Batas 5 MB; isi dicek (XLSX harus ZIP, CSV tanpa byte NUL). Sheet default = sheet pertama yang berisi data; header = baris tidak kosong pertama; auto-map `No`/`NAMA LENGKAP`/`GROUP` (+ sinonim) dan bisa dipetakan manual.
- Aturan baris (PRD A.4): No, Nama, Grup **wajib**; spasi dirapikan; kode duplikat di file → `duplicate_file`, kode sudah ada di event → `duplicate_db`. Tidak ada mode pembaruan — duplikat hanya dilewati (impor ulang tidak membuat tamu ganda).
- Commit: satu transaksi `import_batches` + `createMany(skipDuplicates)` + audit `import.commit`; `failed_rows = total - tersimpan` (gagal + duplikat). Commit tanpa baris valid → 422.
- Dashboard: tamu aktif per grup + jumlah dibatalkan untuk event aktif.
- Menu baru di `config/nav.ts`: Gate & Petugas, Data Tamu, Impor Data (Super Admin, Admin).

**File/folder utama:** `src/Services/Import/{readSpreadsheet,validateImport,ImportService}.ts` (+ `import.test.ts`), `src/Models/{Gate,Guest,ImportBatch}.ts`, `src/Http/Controllers/{Gate,Guest,Import}Controller.ts`, `src/Http/Requests/{Gate,Guest}Request.ts`, `src/app/api/{gates,guests,imports}/**`, `src/app/(admin)/{gates,guests,import}/page.tsx`, `src/views/{gates,guests,imports}/**`, `src/views/components/NoActiveEvent.tsx`, `src/lib/api.ts` (`apiUpload`).

**Verifikasi**
- `lint`, `typecheck`, `npm test` (18 test, termasuk 7 test impor) lulus.
- Uji HTTP dengan `DATA BARCODE.xlsx` asli: **TC-01** 742 tamu, BANK CAPITAL 705 / CS3 21 / AMP 16; **TC-03** impor ulang → 0 valid, 742 duplikat, commit ditolak, total tetap 742; **TC-02** CSV nama kosong → gagal "Nama kosong" baris 2. Juga: pratinjau tidak menyimpan, isi file palsu ditolak, gate/penugasan/tamu manual/paginasi/filter, Viewer 403 di semua API Fase 2 — 44 cek lulus.
- Data uji dihapus; DB kembali hanya berisi Super Admin.

**Belum dilakukan / perlu tindakan manual**
- Interaksi UI di browser (unggah file, dialog) belum dicek manusia — agent hanya memeriksa HTML hasil render; coba impor `DATA BARCODE.xlsx` lewat menu Impor Data.
- `npm install` diperlukan di mesin lain (dependensi baru: `exceljs`, `papaparse`).

### 2026-11-04 — `dae7289` feat: Fase 0 & 1 — fondasi, auth, pengguna, event, PWA

**Apa & mengapa**
- Scaffold Next.js 16.4 (App Router, Turbopack, TS, Tailwind 4, ESLint) + shadcn/ui (style `base-nova`, berbasis Base UI — bukan Radix; komponen memakai prop `render`, bukan `asChild`) + Vitest 5.
- `cacheComponents` dari template **dimatikan**: semua halaman admin membaca sesi dan butuh data segar, model dinamis biasa lebih sederhana. Aturan Tailwind lewat `@tailwindcss/turbopack` di `next.config.ts` **harus dipertahankan** (tidak ada postcss.config).
- Database diganti dari MySQL ke **PostgreSQL 14 Laragon** atas permintaan pengguna. Prisma 7.10.1 (stabil; `latest` di npm adalah 8.0.0-rc) dengan `@prisma/adapter-pg`, generator `prisma-client` → `src/generated/prisma` (tidak di-commit; `postinstall` menjalankan `prisma generate`).
- Struktur folder **gaya Laravel** atas permintaan pengguna: `src/app` = routes (tipis), `src/Http/{Controllers,Requests,Middleware}`, `src/Models`, `src/Services`, `src/views`. Pemetaan lengkap di `README.md`.
- Skema lengkap (semua tabel PRD §9.3 + tambahan §1.4: `gate_assignments`, `qr_credentials.token_encrypted`, unique `guests(event_id, external_code)`, `print_presets`, `app_settings`) dalam satu migrasi `init`. **Kolom void check-in sengaja belum dibuat** karena opsi koreksi belum diputuskan.
- Keputusan §1.3 #1–#4 disetujui: #1 `gate_assignments`, #2 `token_encrypted` + `QR_ENC_KEY` (dipakai F3), #3 scan_log ditulis di luar transaksi (F4), #4 `requireUser()` membaca user dari DB tiap request.
- Auth.js v5 Credentials (JWT 12 jam). `currentUser()` di `Http/Middleware/Authenticate.ts` selalu cek `is_active` di DB → user nonaktif langsung ditolak (API 401, halaman → /login). `src/proxy.ts` hanya cek optimistis ada/tidaknya sesi; **sengaja tidak** mengalihkan `/login` → `/dashboard` (penyebab loop untuk user nonaktif yang JWT-nya masih berlaku); halaman login yang mengecek DB.
- Menu dari `src/config/nav.ts`: Dashboard (semua), Event (Super Admin, Admin), Pengguna (Super Admin). Halaman memakai `rolesFor(href)` agar guard sama dengan menu.
- CRUD Event (tambah, ubah, status DRAFT/ACTIVE/CLOSED = "nonaktifkan"), CRUD Pengguna (tambah, ubah, role, aktif/nonaktif, reset password; tidak bisa menonaktifkan/mengubah role diri sendiri). Semua mutasi menulis `audit_logs` dalam transaksi yang sama.
- Pemilih event aktif di header → cookie `vp_event` (`POST /api/active-event`), fallback ke event ACTIVE terbaru.
- Tanggal event: input tanggal lokal `APP_TIMEZONE` → disimpan UTC 00:00 lokal (`lib/time.ts`). Format tanggal dilakukan di server (client tidak punya `APP_TIMEZONE`).
- PWA: logo `G:\Rhansoft Logo\logo-rhansoft.png` → `public/logo-rhansoft.png`, ikon 192/512/maskable, `apple-icon.png`, `favicon.ico`; `src/app/manifest.ts`; `public/sw.js` **tidak meng-cache data/API** (online-first PRD §14), hanya fallback `public/offline.html` untuk navigasi saat offline.
- `DATA BARCODE.xlsx` dimasukkan ke `.gitignore` (berisi 742 nama asli). Jika butuh fixture uji di F2, buat file contoh tanpa data pribadi.

**File/folder utama:** `prisma/schema.prisma`, `prisma/migrations/*_init`, `prisma/seed.ts`, `prisma.config.ts`, `src/proxy.ts`, `src/lib/{auth,db,password,time,roles,api}.ts`, `src/config/nav.ts`, `src/Http/**`, `src/Models/**`, `src/Services/**`, `src/views/**`, `src/app/**`, `public/{sw.js,offline.html,icons/}`, `README.md`, `docs/RENCANA_FASE.md`.

**Verifikasi**
- `npm run lint`, `npm run typecheck`, `npm test` (11 test: hash password, guard role, menu per role, zona waktu) lulus.
- Uji HTTP ke dev server (30 cek, semua lulus): login; Viewer dapat 403 di `/api/events` & `/api/users` dan dialihkan dari `/events`; menu Viewer tanpa Event/Pengguna; petugas yang dinonaktifkan saat masih login → API 401 dan halaman → /login, tidak bisa login lagi, `/login` tidak loop; validasi server 422; email duplikat 409; reset password; audit log tercatat; manifest, `sw.js` no-store, `offline.html` tidak dialihkan.
- Data uji sudah dihapus; DB hanya berisi Super Admin dari seed.

**Belum dilakukan / perlu tindakan manual**
- Belum di-push (repo belum punya remote).
- UI belum dicek visual setelah login oleh manusia (agent hanya memeriksa HTML hasil render) — cek tampilan Event & Pengguna di browser.
- Uji install PWA di ponsel butuh HTTPS (rencana F4: mkcert/SSL Laragon).
- Rate limit login → F6.
- Setelah `git pull` di mesin lain: `npm install` (generate client), `npx prisma migrate dev`, `npx prisma db seed`.
