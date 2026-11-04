# HANDOFF — VenuePass

Catatan serah terima untuk agent/developer berikutnya. Baca ini + `AGENTS.md` + `docs/RENCANA_FASE.md` sebelum mengubah apa pun.

## Status Terakhir

- **Branch:** `main` (repo baru di-`git init`, belum ada remote).
- **Commit terakhir:** belum ada commit — semua pekerjaan Fase 0 & 1 masih di working tree, menunggu persetujuan pengguna untuk commit.
- **Fase:** Fase 0 ✅, Fase 1 ✅ (DoD terverifikasi, lihat di bawah). Berikutnya: **Fase 2 — Gate, Petugas, Tamu & Impor**.
- **Keputusan terbuka:** §1.3 #9 (isi menu Pengaturan) dan opsi koreksi check-in (kolom void vs. hapus+audit) — dibutuhkan di F5; ukuran gelang/printer, jumlah gate, jaringan venue — dibutuhkan F3/F4.

## Riwayat Perubahan

### 2026-11-04 — (belum di-commit) Fase 0 & Fase 1: fondasi, auth, pengguna, event, PWA

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
- Belum di-commit / push.
- UI belum dicek visual setelah login oleh manusia (agent hanya memeriksa HTML hasil render) — cek tampilan Event & Pengguna di browser.
- Uji install PWA di ponsel butuh HTTPS (rencana F4: mkcert/SSL Laragon).
- Rate limit login → F6.
- Setelah `git pull` di mesin lain: `npm install` (generate client), `npx prisma migrate dev`, `npx prisma db seed`.
