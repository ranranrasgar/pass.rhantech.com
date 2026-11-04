# HANDOFF — VenuePass

Catatan serah terima untuk agent/developer berikutnya. Baca ini + `AGENTS.md` + `docs/RENCANA_FASE.md` sebelum mengubah apa pun.

## Status Terakhir

- **Branch:** `main` (repo baru di-`git init`, belum ada remote).
- **Commit terakhir:** `eeaead8` feat: Fase 2 — gate & petugas, data tamu, impor XLSX/CSV (+ commit docs ini). Belum di-push (belum ada remote).
- **Fase:** Fase 0 ✅, Fase 1 ✅, Fase 2 ✅ (DoD terverifikasi). Berikutnya: **Fase 3 — QR & Cetak** (butuh konfirmasi ukuran gelang/kartu & printer).
- **Belum di-commit:** kode tamu otomatis 0001.. + tema hitam-emas (entri teratas Riwayat).
- **Keputusan terbuka:** §1.3 #9 (isi menu Pengaturan) dan opsi koreksi check-in (kolom void vs. hapus+audit) — dibutuhkan di F5; ukuran gelang/printer, jumlah gate, jaringan venue — dibutuhkan F3/F4.

## Riwayat Perubahan

### 2026-11-04 — (belum di-commit) Kode tamu otomatis 0001.. untuk dua file + tema gelang

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
