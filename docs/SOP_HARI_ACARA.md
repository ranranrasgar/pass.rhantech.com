# SOP Hari Acara — VenuePass

Pegangan untuk **admin** dan **petugas gate**. Prinsip utama: **tamu hanya boleh masuk bila layar menampilkan BERHASIL (hijau)**. Layar lain = jangan izinkan masuk.

---

## 1. Persiapan (H-3 s/d H-1) — Admin

| # | Langkah | Cek |
|---|---|---|
| 1 | Event berstatus **Aktif**; gate dibuat & aktif | Menu Event, Gate & Petugas |
| 2 | Tiap petugas punya akun **Petugas Gate** dan ditugaskan ke gate-nya | Gate & Petugas → Atur petugas |
| 3 | Data tamu lengkap (impor `DATA BARCODE.xlsx` lalu file Ref) | Dashboard: total per grup |
| 4 | **Buat QR** semua tamu; "Belum punya QR" = 0 | QR & Cetak |
| 5 | Cetak 2–3 gelang uji di bahan asli → scan dengan **setiap** perangkat gate (ponsel & scanner USB), di cahaya venue | Hasil BERHASIL, lalu batalkan check-in uji di Laporan |
| 6 | Cetak semua gelang; simpan PDF | QR & Cetak → Unduh PDF |
| 7 | **Backup** database & uji pemulihan (lihat §6) | `HASIL: pemulihan berhasil` |
| 8 | Siapkan cadangan kertas: ekspor **Laporan → Semua → XLSX**, cetak per gate | Untuk prosedur darurat §5 |
| 9 | Uji jaringan: semua perangkat gate membuka halaman Scan bersamaan, indikator **● Terhubung** | Halaman Scan |

## 2. Pembukaan gate (Hari H) — Petugas

1. Sambungkan perangkat ke Wi-Fi venue → buka alamat aplikasi → login akun petugas.
2. Pilih **gate tempat bertugas** (nama gate tampil besar di kanan atas — pastikan benar).
3. Pilih mode: **Scanner USB** (scanner dicolok) atau **Kamera** (ponsel/laptop).
4. Pastikan pita atas hijau **● Terhubung ke server**. Bila merah → lapor admin sebelum mulai.
5. Bunyi boleh dimatikan bila lokasi bising/sunyi (tombol Bunyi).

## 3. Saat scan — arti layar

| Layar | Artinya | Tindakan petugas |
|---|---|---|
| 🟩 **BERHASIL** | Check-in tercatat | Izinkan masuk. Cocokkan nama bila ragu. Tekan **Mulai Scan Lagi** (mode kamera). |
| 🟧 **SUDAH CHECK-IN** | QR ini sudah masuk sebelumnya (gate & jam tertera) | **Jangan izinkan masuk ulang.** Arahkan ke admin/meja bantuan. |
| 🟥 **QR TIDAK DIKENAL** | QR bukan dari sistem / rusak | Scan ulang 1×; bila tetap → meja bantuan. |
| 🟥 **TIKET TIDAK AKTIF** | QR dicabut/diganti atau tiket dibatalkan | Meja bantuan. |
| 🟥 **EVENT TIDAK SESUAI** | Gelang untuk event lain | Meja bantuan. |
| ⬛ **GAGAL TERHUBUNG** | Server tidak terjangkau — **belum tervalidasi** | Jangan izinkan masuk. Coba lagi; bila berulang → §5. |
| 🟥 **GAGAL (pesan lain)** | Mis. "Anda tidak ditugaskan di gate ini" | Lapor admin. |

**Tamu tidak membawa gelang** (tertinggal/hilang/rusak): di layar scan pilih mode **Manual** (ikon orang) → cari nama atau kode tamu → pilih → cocokkan identitas (KTP/undangan) → pilih alasan → centang konfirmasi identitas → **Check-in Manual**. Layar hijau **BERHASIL — MANUAL** = izinkan masuk. Tamu yang sudah masuk/dibatalkan tidak bisa dipilih. Setiap absen manual tercatat (metode, alasan, petugas) di Laporan dan Audit Log; gelang tamu itu otomatis ditolak *SUDAH CHECK-IN* bila dipakai orang lain.

Scanner USB kadang membaca dua kali; sistem mengabaikan QR sama dalam 2 detik dan server tetap menjamin satu check-in per tamu.

## 4. Meja bantuan — Admin

| Kasus | Langkah |
|---|---|
| **Gelang hilang / rusak** | Data Tamu → cari nama → **Terbitkan ulang** (isi alasan) → QR & Cetak → Tamu: *Kode tertentu* = kode tamu → Unduh PDF → cetak. Gelang lama otomatis tidak berlaku. |
| **SUDAH CHECK-IN padahal tamu baru datang** (gelang dipakai orang lain / salah scan) | Laporan → cari tamu → lihat gate & jam & petugas. Bila disetujui penyelenggara: **Batalkan check-in** (alasan wajib, tercatat di Audit Log) → tamu scan ulang. |
| **Tamu tidak ada di daftar** | Data Tamu → Tambah tamu (kode otomatis) → Buat QR → cetak. Hanya atas persetujuan penyelenggara. |
| **Tiket dibatalkan tapi tamu datang** | Keputusan penyelenggara; bila diizinkan: Data Tamu → Aktifkan → scan. |
| **Petugas tidak bisa login** | Pengguna → periksa aktif / Reset password. Setelah 5× salah password akun terkunci 15 menit. |

## 5. Prosedur darurat — jaringan/server mati

Aplikasi **online-first**: scan offline tidak pernah dianggap sah (PRD §14).

1. Petugas lapor admin; admin cek server & router (UPS, kabel, Wi-Fi).
2. Bila > 5 menit dan penyelenggara menyetujui **mode manual**:
   - Pakai cetakan daftar tamu (§1 langkah 8) per gate.
   - Petugas mencentang nama, menulis **jam, gate, nama petugas** dan memeriksa identitas tamu.
   - Catatan manual **disimpan terpisah** dan ditandatangani koordinator gate.
3. Setelah normal: kembali scan; catatan manual dilampirkan ke laporan akhir (tidak dimasukkan otomatis ke sistem).

## 6. Backup & pemulihan — Admin

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1          # backup (simpan 14 terakhir di backups\)
powershell -ExecutionPolicy Bypass -File scripts\restore-test.ps1       # uji restore ke DB sementara, bandingkan jumlah baris
```

Jadwal otomatis (opsional, dijalankan admin sendiri — membuat Scheduled Task Windows tiap 30 menit pada hari acara):

```powershell
schtasks /Create /TN "VenuePass Backup" /SC MINUTE /MO 30 /TR "powershell -ExecutionPolicy Bypass -File C:\laragon\www\NextJS\Tiketing\scripts\backup-db.ps1"
```

Salin folder `backups\` ke flashdisk / drive lain setelah acara. File backup berisi data pribadi tamu — simpan & hapus sesuai kebijakan penyelenggara.

Pemulihan penuh ke database utama (hanya bila server rusak, dengan persetujuan): `pg_restore --clean --no-owner --dbname=<DATABASE_URL> backups\venuepass-<waktu>.dump`.

## 7. Menjalankan server hari acara

```bash
npm run build
npm run start -- -H 0.0.0.0 -p 3000
```

- Perangkat gate membuka `http://<IP-server>:3000` di jaringan venue. **Kamera ponsel butuh HTTPS**: pakai `npm run dev:https` hanya untuk uji, atau sediakan sertifikat/HTTPS reverse proxy untuk hari H; scanner USB berjalan di HTTP biasa.
- Server & router pakai UPS bila memungkinkan.

## 8. Penutupan

1. Laporan → ekspor **Semua**, **Belum Hadir**, **Per Gate**, **Scan Ditolak** (XLSX).
2. Backup terakhir + uji restore.
3. Event → ubah status **Ditutup** (scan otomatis ditolak).
