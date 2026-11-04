# VenuePass — Tiket & Absensi QR

Aplikasi web untuk mengelola tamu, QR, cetak gelang/kartu, scan di gate, dan rekap kehadiran.
Kebutuhan produk: `PRD_VenuePass_Tiket_Absensi_QR.md`. Urutan kerja: `docs/RENCANA_FASE.md`.
Catatan serah terima antar-agent: `docs/HANDOFF.md`.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 + shadcn/ui (Base UI) ·
PostgreSQL 14 (Laragon) · Prisma 7 (`@prisma/adapter-pg`) · Auth.js v5 (Credentials, JWT) ·
Zod 4 · Vitest · PWA (manifest + service worker tanpa cache data).

## Menjalankan (lokal, Laragon)

1. Nyalakan PostgreSQL di Laragon (port 5432).
2. Buat database: `createdb -U postgres venuepass` (atau lewat HeidiSQL/DBeaver).
3. `cp .env.example .env` lalu isi `AUTH_SECRET`, `QR_ENC_KEY`, `SEED_ADMIN_*`.
4. Perintah:

```bash
npm install            # juga menjalankan prisma generate
npx prisma migrate dev # buat tabel
npx prisma db seed     # Super Admin awal dari SEED_ADMIN_*
npm run dev            # http://localhost:3000
```

Cek kualitas: `npm run lint`, `npm run typecheck`, `npm test`.

## Struktur folder (gaya Laravel)

Next.js mewajibkan `src/app/` untuk routing, jadi folder itu berperan sebagai `routes/` dan
isinya dibuat tipis (hanya memanggil controller / view).

| Laravel | Di proyek ini | Isi |
|---|---|---|
| `routes/web.php` | `src/app/(admin)/**/page.tsx`, `src/app/(auth)/login` | Halaman: guard → ambil data → render view |
| `routes/api.php` | `src/app/api/**/route.ts` | `export const GET = EventController.index` |
| `app/Http/Controllers` | `src/Http/Controllers/` | `EventController`, `UserController`, `AuthController` (server action) |
| `app/Http/Requests` | `src/Http/Requests/` | Validasi Zod (`StoreEventRequest`, dll.) |
| `app/Http/Middleware` | `src/Http/Middleware/Authenticate.ts` + `src/proxy.ts` | `requireUser(roles)` / `requirePageUser(roles)` |
| `app/Models` | `src/Models/` | Query Prisma per tabel (`User`, `Event`, `AuditLog`) |
| `app/Services` | `src/Services/` | Logika bisnis lintas model |
| `resources/views` | `src/views/` | Komponen React per fitur; `views/components/ui` = shadcn |
| `config/` | `src/config/nav.ts` | Satu-satunya sumber menu |
| `database/migrations`, `seeders` | `prisma/schema.prisma`, `prisma/migrations`, `prisma/seed.ts` | |
| `public/` | `public/` | Logo, ikon PWA, `sw.js`, `offline.html` |
