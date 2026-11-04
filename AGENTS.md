# AGENTS.md — VenuePass (Tiket & Absensi QR)

Panduan untuk agent AI (Claude, Codex, Cursor, dll.) dan developer yang mengerjakan repo ini.

## Wajib dibaca sebelum menulis kode

1. `.agents/skills/karpathy-guidelines/SKILL.md` — aturan perilaku coding (wajib diikuti di setiap task).
2. `PRD_VenuePass_Tiket_Absensi_QR.md` — sumber kebenaran kebutuhan produk.
3. `docs/RENCANA_FASE.md` — urutan fase, Definition of Done, dan menu yang aktif per fase.

## Ringkasan aturan Karpathy (versi singkat)

- **Pikir dulu:** tulis asumsi; kalau ragu, tanya. Jangan diam-diam memilih tafsiran.
- **Sederhana dulu:** kode minimum yang menyelesaikan masalah. Tanpa abstraksi/fitur spekulatif.
- **Perubahan bedah:** sentuh hanya yang perlu; ikuti gaya kode yang ada.
- **Berbasis tujuan:** setiap task punya kriteria sukses yang bisa diverifikasi (test / langkah cek).

## Aturan proyek

- **Tidak ada menu kosong.** Item navigasi hanya ditambahkan ke `src/config/nav.ts` ketika fiturnya
  sudah berjalan end-to-end (UI + API + validasi server + data nyata). Dilarang membuat halaman
  "Coming soon" / placeholder.
- Kerjakan per fase sesuai `docs/RENCANA_FASE.md`. Jangan mulai fase berikutnya sebelum DoD fase berjalan terpenuhi.
- Otorisasi selalu dicek di server (route handler / server action), bukan hanya menyembunyikan menu.
- User petugas diambil dari session server, tidak pernah dari body request.
- Token QR mentah tidak boleh muncul di log, respons API, atau `scan_logs`.
- Simpan waktu dalam UTC; tampilkan dalam `APP_TIMEZONE` (default `Asia/Jakarta`).
- Perubahan skema hanya lewat `prisma migrate`. Jangan commit `.env`.

## Perintah

```bash
npm run dev          # jalankan dev server
npm run lint         # lint
npm run typecheck    # tsc --noEmit
npm test             # unit/integration test (Vitest)
npx prisma migrate dev
npx prisma db seed   # super admin awal
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
