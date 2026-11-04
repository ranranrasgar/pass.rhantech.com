# Dokumen Produk & Teknis

## Sistem Tiket dan Absensi Tamu Venue Berbasis QR Code

**Versi:** 1.1\
**Tanggal:** 4 November 2026\
**Status:** Draft spesifikasi awal untuk implementasi\
**Nama proyek sementara:** VenuePass

------------------------------------------------------------------------

## 1. Ringkasan Eksekutif

VenuePass adalah aplikasi web sederhana untuk mengelola daftar tamu,
membuat kode QR unik, mencetak kartu/gelang, memvalidasi QR di beberapa
gate, dan menghasilkan rekap kehadiran.

Alur utama:

1.  Admin mengimpor data tamu dari file Excel.
2.  Sistem membuat satu token QR unik untuk setiap tamu.
3.  Admin mengunduh lembar cetak QR sesuai ukuran dan tata letak yang
    dipilih.
4.  Tamu menerima gelang/kartu dengan QR tersebut.
5.  Petugas di gate memindai QR menggunakan kamera perangkat atau
    scanner USB.
6.  Sistem menampilkan nama dan grup tamu serta status validasi.
7.  Jika valid, sistem mencatat waktu dan gate masuk. Jika tidak valid
    atau sudah pernah masuk, sistem menampilkan alasan dan petunjuk
    tindak lanjut.
8.  Admin melihat dan mengunduh rekap kehadiran.

File `DATA BARCODE.xlsx` telah diperiksa. Data utama berada di `Sheet1`
dengan 742 baris tamu dan tiga kolom: `No`, `NAMA LENGKAP`, dan `GROUP`.
`Sheet2` dan `Sheet3` kosong. Rincian pemeriksaan dan pemetaan impor final
ditambahkan pada Lampiran A.

## 2. Tujuan dan Indikator Keberhasilan

### 2.1 Tujuan

-   Mempercepat proses pemeriksaan tamu di pintu masuk.
-   Mengurangi pencatatan manual dan risiko satu QR digunakan berulang.
-   Mengetahui siapa yang hadir, kapan hadir, dan melalui gate mana.
-   Memudahkan pembuatan serta pencetakan QR dalam berbagai ukuran.
-   Menyediakan laporan yang mudah diekspor ke Excel.

### 2.2 Indikator keberhasilan

  -----------------------------------------------------------------------
  Indikator                                                   Target awal
  ------------------------------ ----------------------------------------
  Waktu respons validasi QR          Maksimal 2 detik pada jaringan lokal
                                                              yang stabil

  Pencatatan gate                100% scan valid tercatat dengan gate dan
                                                                    waktu

  Duplikasi check-in                  Tidak membuat check-in kedua secara
                                                            tidak sengaja

  Akurasi rekap                         Sama dengan catatan check-in pada
                                                                 database

  QR tidak dikenal                        Ditolak dengan pesan yang jelas

  Ekspor laporan                   Bisa diunduh dalam format XLSX dan CSV
  -----------------------------------------------------------------------

Target di atas adalah sasaran pengujian, bukan jaminan performa sebelum
diuji pada perangkat dan jaringan venue.

## 3. Ruang Lingkup

### 3.1 Fitur dalam versi pertama (MVP)

1.  Login admin dan petugas.
2.  Pengaturan event/venue sederhana.
3.  Pengaturan beberapa gate.
4.  Impor tamu dari XLSX/CSV.
5.  Validasi data impor dan laporan baris bermasalah.
6.  Pembuatan token QR unik oleh sistem.
7.  Pratinjau dan pencetakan QR.
8.  Pengaturan ukuran kartu/label, margin, jarak, dan jumlah kolom
    cetak.
9.  Scan QR melalui kamera atau scanner USB.
10. Menampilkan nama, grup, identitas tiket, dan status.
11. Check-in satu kali per tamu secara default.
12. Mencatat gate, petugas, dan waktu check-in.
13. Dashboard jumlah terdaftar, hadir, belum hadir, dan persentase
    kehadiran.
14. Filter dan ekspor rekap ke XLSX/CSV.
15. Riwayat scan dan log aktivitas penting.

### 3.2 Di luar ruang lingkup MVP

-   Penjualan tiket dan pembayaran online.
-   Pengiriman QR otomatis melalui WhatsApp/email.
-   Integrasi turnstile atau perangkat akses fisik.
-   Penggunaan biometrik.
-   Sinkronisasi multi-venue.
-   Mode offline penuh dengan sinkronisasi konflik.
-   Aplikasi native Android/iOS.

Fitur tersebut dapat ditambahkan setelah kebutuhan operasional dasar
berjalan stabil.

## 4. Aktor dan Hak Akses

  -----------------------------------------------------------------------
  Aktor                               Hak akses
  ----------------------------------- -----------------------------------
  Super Admin                         Mengelola seluruh event, user,
                                      gate, data tamu, QR, laporan, dan
                                      pengaturan

  Admin Event                         Mengelola tamu, membuat QR,
                                      mencetak, melihat laporan event

  Petugas Gate                        Scan QR pada gate yang ditugaskan
                                      dan melihat hasil validasi

  Viewer/Manajemen                    Melihat dashboard dan mengunduh
                                      laporan tanpa mengubah data
  -----------------------------------------------------------------------

Petugas gate tidak boleh mengubah data tamu atau menghapus catatan
check-in.

## 5. Alur Operasional

### 5.1 Persiapan event

1.  Admin membuat event: nama, tanggal, lokasi, dan status.
2.  Admin membuat daftar gate, misalnya Gate A, Gate B, dan Gate VIP.
3.  Admin mengimpor file `DATA BARCODE.xlsx`.
4.  Sistem membaca dan memvalidasi kolom.
5.  Admin memeriksa pratinjau, memperbaiki data yang salah, lalu
    mengonfirmasi impor.
6.  Sistem membuat satu token QR unik untuk setiap tamu.
7.  Admin memilih template cetak, ukuran kartu, dan mengunduh PDF.
8.  Gelang/kartu dicetak dan dibagikan kepada tamu.

### 5.2 Proses scan di gate

1.  Petugas login dan memilih event serta gate yang benar.
2.  Halaman scan membuka kamera atau menerima input dari scanner USB.
3.  Petugas mengarahkan scanner ke QR pada gelang.
4.  Sistem mengirim token ke server untuk validasi.
5.  Server memeriksa token, event, status tamu, dan status check-in.
6.  Jika valid dan belum check-in, server menyimpan check-in secara
    atomik.
7.  Layar menampilkan hasil besar dan mudah dibaca.
8.  Petugas mempersilakan tamu masuk hanya jika status menunjukkan
    berhasil.

### 5.3 Hasil validasi

  -----------------------------------------------------------------------
  Kondisi                 Hasil pada layar        Tindakan
  ----------------------- ----------------------- -----------------------
  QR valid, belum         **BERHASIL** -- nama,   Izinkan masuk
  check-in                grup, gate, waktu       

  QR tidak ditemukan      **QR TIDAK DIKENAL**    Scan ulang; periksa
                                                  gelang

  QR sudah digunakan      **SUDAH CHECK-IN** --   Jangan izinkan masuk
                          waktu dan gate          ulang tanpa otorisasi
                          sebelumnya              

  QR milik event lain     **EVENT TIDAK SESUAI**  Arahkan ke admin

  Tamu                    **TIKET TIDAK AKTIF**   Arahkan ke admin
  dibatalkan/nonaktif                             

  Koneksi/server          **GAGAL TERHUBUNG**     Jangan menganggap
  bermasalah                                      check-in berhasil; coba
                                                  lagi
  -----------------------------------------------------------------------

**Aturan penting:** layar harus membedakan "gagal memvalidasi" dengan
"berhasil check-in". Jangan tampilkan status berhasil sebelum server
mengonfirmasi transaksi tersimpan.

### 5.4 Apakah tamu boleh masuk lebih dari sekali?

Default MVP adalah satu kali check-in untuk satu QR. Jika venue
membutuhkan keluar-masuk berulang, buat fitur terpisah berupa
*check-in/check-out* dengan kebijakan yang jelas. Jangan mengubah
perilaku default tanpa keputusan pemilik event.

------------------------------------------------------------------------

## 6. Kebutuhan Fungsional (PRD)

### FR-01 --- Autentikasi

-   Pengguna login dengan username/email dan password.
-   Password disimpan dalam bentuk hash yang aman.
-   Hak akses mengikuti role.
-   Sesi dapat diakhiri dengan logout.
-   Akun petugas dapat dinonaktifkan.

### FR-02 --- Pengelolaan event dan gate

-   Admin dapat membuat, mengubah, dan menonaktifkan event.
-   Admin dapat menambah, mengubah, dan menonaktifkan gate.
-   Nama gate unik dalam satu event.
-   Petugas dapat ditugaskan ke satu atau beberapa gate.
-   Scan harus menyimpan gate aktif yang dipilih petugas.

### FR-03 --- Impor data tamu

-   Menerima `.xlsx` dan `.csv`.
-   Menampilkan pratinjau sebelum data disimpan.
-   Memungkinkan pemetaan kolom sumber ke kolom sistem.
-   Memeriksa nama kosong, grup kosong (jika diwajibkan), dan duplikasi
    berdasarkan aturan yang disepakati.
-   Menampilkan nomor baris dan alasan kegagalan.
-   Tidak membuat QR untuk baris yang gagal divalidasi.
-   Menyimpan nama file, waktu impor, dan pengguna pengimpor.
-   Impor ulang tidak boleh diam-diam membuat tamu ganda.

**Pemetaan kolom awal yang disarankan:**

  -----------------------------------------------------------------------
  Kolom sistem      Wajib             Contoh            Catatan
  ----------------- ----------------- ----------------- -----------------
  Nama              Ya                Budi Santoso      Nama yang tampil
                                                        di gate

  Grup              Ya\*              Delegasi A        \*Konfirmasi
                                                        apakah wajib

  Kode tamu         Tidak             REG-001           Nomor dari sumber
  eksternal                                             bila tersedia

  Email/telepon     Tidak             \-                Hindari jika
                                                        tidak diperlukan

  Catatan           Tidak             VIP               Informasi
                                                        tambahan
  -----------------------------------------------------------------------

Jika file sumber memiliki nama kolom berbeda, admin dapat memetakannya
pada saat impor.

### FR-04 --- Pembuatan QR

-   Sistem membuat token acak yang tidak mudah ditebak.
-   Satu tamu memiliki satu QR aktif per event pada MVP.
-   QR menyimpan token, bukan nama, nomor telepon, atau data pribadi.
-   Token disimpan di database dengan indeks unik.
-   Admin dapat menerbitkan ulang QR jika gelang hilang, dengan
    menonaktifkan token lama.
-   QR dapat diunduh sebagai PDF untuk dicetak.

### FR-05 --- Pencetakan QR

-   Admin memilih ukuran kartu/label.
-   Admin mengatur lebar, tinggi, margin, jarak horizontal/vertikal,
    jumlah kolom, dan orientasi.
-   Sistem menampilkan pratinjau sebelum cetak.
-   Admin dapat memilih informasi yang dicetak: nama, grup, kode tamu,
    nama event.
-   QR harus memiliki ruang kosong (*quiet zone*) yang cukup.
-   QR harus diuji dengan printer, bahan gelang, dan scanner yang
    benar-benar digunakan.
-   Sediakan PDF sebagai format utama untuk hasil cetak konsisten.
-   Sediakan XLSX/CSV sebagai daftar data, bukan format utama untuk
    mencetak QR.

### FR-06 --- Scan dan validasi

-   Mendukung kamera laptop/ponsel melalui browser modern.
-   Mendukung scanner USB yang berperilaku seperti keyboard.
-   Setelah scan, sistem memvalidasi token ke server.
-   Menampilkan nama dan grup jika token valid.
-   Mencatat gate, user petugas, waktu server, dan hasil scan.
-   Menangani dua scan bersamaan tanpa membuat check-in ganda.
-   Ada tombol untuk memulai scan berikutnya.
-   Pesan berhasil/gagal harus jelas secara visual dan teks.

### FR-07 --- Rekap dan laporan

-   Menampilkan total tamu terdaftar.
-   Menampilkan jumlah hadir dan belum hadir.
-   Menghitung persentase hadir.
-   Filter berdasarkan event, grup, gate, status, dan rentang waktu.
-   Menampilkan nama, grup, kode tamu, waktu check-in, gate, dan
    petugas.
-   Ekspor XLSX dan CSV.
-   Laporan daftar tamu belum hadir.
-   Laporan jumlah check-in per gate.
-   Laporan scan ditolak/duplikat untuk audit.

### FR-08 --- Audit dan koreksi

-   Mencatat aktivitas admin penting.
-   Check-in tidak dihapus langsung oleh petugas.
-   Jika koreksi diperlukan, admin melakukan tindakan koreksi dengan
    alasan.
-   Simpan siapa yang mengoreksi, kapan, nilai sebelum/sesudah, dan
    alasannya.

------------------------------------------------------------------------

## 7. Kebutuhan Nonfungsional

-   **Keamanan:** HTTPS jika diakses melalui jaringan publik; password
    di-hash; validasi akses server-side; token QR tidak memuat data
    pribadi.
-   **Kinerja:** target validasi di bawah 2 detik pada jaringan lokal
    yang stabil.
-   **Keandalan:** transaksi database mencegah check-in ganda.
-   **Kemudahan penggunaan:** halaman scan memiliki tombol dan teks
    besar, kontras tinggi, dan minim langkah.
-   **Kompatibilitas:** Chrome/Edge versi modern pada laptop, tablet,
    atau ponsel.
-   **Auditabilitas:** setiap check-in memiliki waktu server, gate, dan
    petugas.
-   **Privasi:** hanya kumpulkan data tamu yang diperlukan; batasi akses
    dan masa penyimpanan sesuai kebijakan penyelenggara.
-   **Backup:** database dicadangkan secara terjadwal dan diuji
    pemulihannya.

## 8. Rekomendasi Teknologi

Karena lingkungan yang disebutkan adalah Laragon dan folder proyek
Next.js, rekomendasi MVP adalah tetap menggunakan ekosistem
JavaScript/TypeScript agar implementasi dan pemeliharaan sederhana.

  -----------------------------------------------------------------------
  Lapisan                 Rekomendasi             Alasan
  ----------------------- ----------------------- -----------------------
  Frontend                Next.js + TypeScript    Cocok untuk aplikasi
                                                  web admin dan scan

  UI                      Tailwind CSS +          Komponen dashboard dan
                          shadcn/ui               form konsisten

  Backend/API             Next.js Route Handlers  Tidak perlu server
                                                  backend terpisah untuk
                                                  MVP

  Database                MySQL 8 / MariaDB       Praktis dengan Laragon;
                          InnoDB                  transaksi dan indeks
                                                  tersedia

  ORM                     Prisma                  Skema dan query
                                                  database lebih
                                                  terstruktur

  Validasi                Zod                     Validasi data impor dan
                                                  request

  Login                   Auth.js atau            Pengelolaan login dan
                          autentikasi berbasis    role
                          session yang teruji     

  Scan kamera             `html5-qrcode` atau     Membaca QR melalui
                          `@zxing/browser`        kamera browser

  Scanner USB             Input keyboard wedge    Banyak scanner USB
                                                  mengirim hasil scan
                                                  seperti ketikan
                                                  keyboard

  QR generator            `qrcode` (Node.js)      Membuat QR PNG/SVG

  Baca Excel              `xlsx` (SheetJS)        Membaca XLSX/CSV

  Ekspor Excel            `exceljs`               Membuat laporan XLSX

  Cetak                   HTML print + PDF via    Mendukung ukuran
                          Playwright, atau PDF    halaman dan layout
                          generator               khusus

  Deployment lokal        Node.js + MySQL melalui Sesuai lingkungan
                          Laragon                 pengembangan yang ada
  -----------------------------------------------------------------------

**Catatan pilihan database:** MySQL 8 direkomendasikan untuk kemudahan
di Laragon. PostgreSQL juga baik, tetapi tidak perlu menambah
kompleksitas jika lingkungan saat ini sudah menggunakan MySQL/MariaDB.

**Catatan kamera:** akses kamera browser umumnya membutuhkan HTTPS,
kecuali localhost. Untuk penggunaan di beberapa perangkat dalam jaringan
venue, siapkan HTTPS lokal yang valid atau akses melalui domain HTTPS.
Uji sejak awal di ponsel petugas.

**Tidak perlu untuk MVP:** Redis, microservices, Kubernetes, dan message
broker. Tambahkan hanya jika beban dan kebutuhan nyata sudah
mengharuskannya.

### 8.1 Struktur proyek yang disarankan

``` text
venuepass/
├── prisma/
│   └── schema.prisma
├── public/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── dashboard/
│   │   ├── guests/
│   │   ├── import/
│   │   ├── print/
│   │   ├── gates/
│   │   ├── scan/
│   │   ├── reports/
│   │   └── api/
│   │       ├── guests/
│   │       ├── imports/
│   │       ├── qr/
│   │       ├── check-in/
│   │       └── reports/
│   ├── components/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── qr.ts
│   │   ├── import/
│   │   └── validation/
│   └── server/
│       ├── services/
│       └── repositories/
├── prisma/
├── .env
└── package.json
```

Struktur ini adalah rancangan awal; nama folder dapat disesuaikan dengan
versi Next.js dan struktur proyek yang sudah ada.

------------------------------------------------------------------------

## 9. Desain Data dan Database

### 9.1 Entitas utama

-   `User`: akun admin dan petugas.
-   `Event`: acara/venue.
-   `Gate`: pintu masuk.
-   `Guest`: data tamu.
-   `QrCredential`: token QR milik tamu.
-   `CheckIn`: catatan check-in yang berhasil.
-   `ScanLog`: seluruh hasil scan, termasuk yang ditolak.
-   `ImportBatch`: riwayat impor.
-   `AuditLog`: aktivitas administratif.

### 9.2 Relasi sederhana

``` mermaid
erDiagram
    EVENT ||--o{ GATE : memiliki
    EVENT ||--o{ GUEST : mendaftarkan
    GUEST ||--o{ QR_CREDENTIAL : memiliki
    GUEST ||--o{ CHECK_IN : melakukan
    GATE ||--o{ CHECK_IN : menerima
    USER ||--o{ CHECK_IN : memproses
    EVENT ||--o{ IMPORT_BATCH : menerima
    USER ||--o{ IMPORT_BATCH : mengimpor
    EVENT ||--o{ SCAN_LOG : mencatat
    GATE ||--o{ SCAN_LOG : lokasi
    USER ||--o{ SCAN_LOG : memindai
```

### 9.3 Rancangan tabel

**users** - `id` (PK) - `name` - `email` (unique) - `password_hash` -
`role` (`SUPER_ADMIN`, `ADMIN`, `GATE_OFFICER`, `VIEWER`) -
`is_active` - `created_at`, `updated_at`

**events** - `id` (PK) - `name` - `venue_name` - `event_date` - `status`
(`DRAFT`, `ACTIVE`, `CLOSED`) - `created_at`, `updated_at`

**gates** - `id` (PK) - `event_id` (FK) - `name` - `is_active` - unique
(`event_id`, `name`)

**guests** - `id` (PK) - `event_id` (FK) - `external_code` (nullable) -
`name` - `group_name` - `status` (`ACTIVE`, `CANCELLED`) - `notes`
(nullable) - `import_batch_id` (nullable) - `created_at`, `updated_at`

**qr_credentials** - `id` (PK) - `guest_id` (FK) - `token_hash`
(unique) - `token_last4` (opsional, untuk bantuan operasional) -
`is_active` - `issued_at` - `revoked_at` (nullable)

**check_ins** - `id` (PK) - `guest_id` (FK) - `event_id` (FK) -
`gate_id` (FK) - `user_id` (FK) - `checked_in_at` (waktu server) -
unique (`guest_id`, `event_id`) untuk kebijakan satu kali check-in

**scan_logs** - `id` (PK) - `event_id` (FK) - `gate_id` (nullable) -
`user_id` (nullable) - `token_fingerprint` (nullable; jangan simpan
token mentah) - `result` (`SUCCESS`, `UNKNOWN_QR`, `ALREADY_CHECKED_IN`,
`INACTIVE`, `WRONG_EVENT`, `ERROR`) - `message` - `scanned_at`

**import_batches** - `id` (PK) - `event_id` (FK) - `file_name` -
`total_rows` - `success_rows` - `failed_rows` - `created_by` (FK) -
`created_at`

**audit_logs** - `id` (PK) - `user_id` (FK) - `action` - `entity_type` -
`entity_id` - `before_data` (JSON, nullable) - `after_data` (JSON,
nullable) - `reason` (nullable) - `created_at`

### 9.4 Aturan database penting

-   Gunakan foreign key dan indeks pada kolom pencarian.
-   Simpan waktu dalam UTC di database, tampilkan sesuai zona waktu
    event (misalnya `Asia/Jakarta`).
-   Gunakan transaksi saat check-in.
-   Unique constraint pada (`guest_id`, `event_id`) mencegah dua
    check-in berhasil untuk tamu yang sama.
-   Token QR dibuat dengan generator kriptografis, bukan nomor urut yang
    mudah ditebak.
-   Simpan hash token di database; QR membawa token acak mentah. Saat
    scan, hash token yang diterima lalu cari hash-nya.
-   Jangan memakai nama atau grup sebagai token QR.

------------------------------------------------------------------------

## 10. Desain QR Code dan Kartu/Gelang

### 10.1 Isi QR

Rekomendasi isi QR adalah token acak, misalnya:

``` text
VP1_7f3b...random-token...
```

Contoh di atas hanya ilustrasi, bukan token yang harus digunakan. QR
tidak perlu memuat nama dan grup. Setelah scan, aplikasi mengirim token
ke server; server mencari tamu lalu mengembalikan informasi yang boleh
ditampilkan.

**Alasan:** jika gelang hilang atau difoto, data pribadi tidak langsung
terbaca dari QR. Token juga dapat dinonaktifkan dan diterbitkan ulang.

### 10.2 Format keluaran cetak

Rekomendasi: - **PDF sebagai format cetak utama:** ukuran dan posisi QR
lebih konsisten antar komputer/printer. - **XLSX sebagai data
pendamping:** daftar nama, grup, kode, dan status penerbitan QR. -
**PNG/SVG per QR (opsional):** berguna untuk percetakan yang meminta
aset gambar terpisah.

Jadi, jangan menjadikan Word atau Excel sebagai format utama untuk
mengatur posisi QR. Gunakan halaman cetak di aplikasi yang menghasilkan
PDF. Excel tetap berguna untuk daftar data dan rekap.

### 10.3 Pengaturan ukuran oleh admin

Sediakan pilihan ukuran umum dan mode kustom:

  Pengaturan          Contoh awal
  ------------------- ---------------------------------
  Ukuran kartu        85,6 × 54 mm
  Label kecil         50 × 30 mm
  Ukuran kustom       Lebar dan tinggi diisi pengguna
  Margin halaman      5 mm
  Jarak antar label   2--4 mm
  QR                  25--30 mm, menyesuaikan ruang
  Orientasi           Portrait / Landscape
  Jumlah kolom        Otomatis atau manual

Ukuran di atas hanya preset awal. Ukuran akhir harus disesuaikan dengan
gelang, bahan cetak, printer, dan kemampuan scanner. Berikan opsi ukuran
QR minimal dan maksimal, lalu lakukan uji scan fisik.

### 10.4 Isi kartu

Contoh tata letak:

``` text
+--------------------------------+
|           NAMA EVENT           |
|                                |
|       [ QR CODE BESAR ]        |
|                                |
|       BUDI SANTOSO             |
|       GRUP: DELEGASI A         |
|       KODE: REG-001            |
+--------------------------------+
```

Untuk gelang sempit, prioritaskan QR dan kode pendek. Nama/grup dapat
dicetak jika ukuran memungkinkan. Pastikan QR tidak melengkung tajam
pada permukaan gelang dan tidak tertutup sambungan.

------------------------------------------------------------------------

## 11. Desain Antarmuka (UI/UX)

### 11.1 Navigasi admin

Menu: - Dashboard - Event - Data Tamu - Impor Data - QR & Cetak - Gate &
Petugas - Laporan Kehadiran - Riwayat Scan - Pengguna - Pengaturan

### 11.2 Dashboard

Informasi utama: - Total tamu - Sudah hadir - Belum hadir - Persentase
kehadiran - Kehadiran per gate - Kehadiran terbaru

### 11.3 Halaman impor

Komponen: - Tombol pilih file XLSX/CSV - Pilihan sheet (jika workbook
memiliki beberapa sheet) - Pemetaan kolom - Tabel pratinjau - Ringkasan
baris valid/tidak valid - Tombol konfirmasi impor

Jangan langsung menyimpan semua baris saat file dipilih. Minta admin
memeriksa pratinjau terlebih dahulu.

### 11.4 Halaman cetak

Komponen: - Pilih event - Pilih tamu atau rentang data - Pilih preset
ukuran atau kustom - Input lebar dan tinggi (mm) - Margin dan jarak -
Jumlah kolom - Pilih informasi yang dicetak - Pratinjau - Tombol unduh
PDF

### 11.5 Halaman scan gate

Desain harus fokus pada satu tugas dan bisa dibaca dari jarak petugas:

``` text
+--------------------------------------------------+
| VENUEPASS          EVENT: CONFERENCE 2026        |
| Gate: GATE A                 Petugas: Andi       |
+--------------------------------------------------+
|                                                  |
|                [ AREA KAMERA ]                  |
|                                                  |
|             Arahkan QR ke kamera                 |
|                                                  |
+--------------------------------------------------+
|                MENUNGGU SCAN                      |
|                                                  |
|  Hasil terakhir:                                 |
|  [STATUS] BERHASIL                               |
|  Nama : Budi Santoso                             |
|  Grup : Delegasi A                               |
|  Gate : Gate A                                   |
|  Waktu: 09:12:34                                 |
|                                                  |
|  [Mulai Scan Lagi]                               |
+--------------------------------------------------+
```

Perilaku UI: - Warna hijau dan ikon centang untuk berhasil. - Warna
merah untuk QR tidak dikenal atau tidak aktif. - Warna kuning/oranye
untuk sudah check-in. - Status selalu ditulis dengan teks, bukan warna
saja. - Bunyi singkat opsional untuk berhasil dan gagal; sediakan
kontrol mute. - Jangan menampilkan data pribadi yang tidak diperlukan. -
Tampilkan status koneksi server.

### 11.6 Halaman laporan

Kolom: - No. - Nama - Grup - Kode tamu - Status kehadiran - Waktu
hadir - Gate - Petugas

Filter: - Event - Grup - Gate - Hadir/belum hadir - Tanggal/waktu

------------------------------------------------------------------------

## 12. Rancangan API

Contoh endpoint REST untuk Next.js Route Handlers:

  ------------------------------------------------------------------------------
  Method                  Endpoint                       Fungsi
  ----------------------- ------------------------------ -----------------------
  POST                    `/api/auth/login`              Login (jika tidak
                                                         ditangani Auth.js)

  GET/POST                `/api/events`                  Daftar/buat event

  GET/POST                `/api/events/:eventId/gates`   Daftar/buat gate

  POST                    `/api/imports/preview`         Baca file dan tampilkan
                                                         hasil validasi

  POST                    `/api/imports/commit`          Simpan baris impor yang
                                                         dikonfirmasi

  GET                     `/api/guests`                  Daftar dan filter tamu

  POST                    `/api/guests`                  Tambah tamu manual

  POST                    `/api/guests/:id/issue-qr`     Terbitkan token QR

  POST                    `/api/guests/:id/revoke-qr`    Nonaktifkan QR

  POST                    `/api/check-in/scan`           Validasi QR dan proses
                                                         check-in

  GET                     `/api/reports/attendance`      Rekap kehadiran

  GET                     `/api/reports/export`          Unduh XLSX/CSV
  ------------------------------------------------------------------------------

### 12.1 Contoh request scan

``` json
{
  "token": "VP1_random_token",
  "eventId": "event-id",
  "gateId": "gate-id"
}
```

User petugas sebaiknya diambil dari session login di server, bukan
dipercaya dari body request.

### 12.2 Contoh respons berhasil

``` json
{
  "ok": true,
  "result": "SUCCESS",
  "guest": {
    "name": "Budi Santoso",
    "group": "Delegasi A",
    "code": "REG-001"
  },
  "checkIn": {
    "gate": "Gate A",
    "checkedInAt": "2026-11-04T02:12:34.000Z"
  }
}
```

### 12.3 Contoh respons sudah check-in

``` json
{
  "ok": false,
  "result": "ALREADY_CHECKED_IN",
  "guest": {
    "name": "Budi Santoso",
    "group": "Delegasi A"
  },
  "previousCheckIn": {
    "gate": "Gate A",
    "checkedInAt": "2026-11-04T02:12:34.000Z"
  }
}
```

Jangan mengirim token QR mentah kembali dalam respons API atau log.

### 12.4 Logika check-in atomik

Pseudocode:

``` text
1. Pastikan session petugas valid.
2. Pastikan petugas berhak menggunakan gate tersebut.
3. Hash token dari QR.
4. Cari QR aktif berdasarkan token_hash.
5. Pastikan tamu aktif dan event sesuai.
6. Mulai transaksi database.
7. Insert check_in.
8. Jika unique constraint gagal:
      baca check-in yang sudah ada;
      catat scan sebagai ALREADY_CHECKED_IN;
      kembalikan status tersebut.
9. Jika berhasil:
      catat scan SUCCESS;
      commit transaksi;
      kembalikan data nama, grup, gate, waktu.
```

Unique constraint database adalah perlindungan utama terhadap scan
bersamaan dari dua gate. Pemeriksaan di sisi frontend saja tidak cukup.

------------------------------------------------------------------------

## 13. Keamanan dan Privasi

1.  Wajibkan autentikasi untuk halaman admin dan scan.
2.  Petugas hanya dapat mengakses gate yang diizinkan.
3.  Validasi role dan kepemilikan event di server untuk setiap endpoint.
4.  Hash password dengan algoritma password hashing yang sesuai,
    misalnya Argon2id atau bcrypt dengan konfigurasi aman.
5.  Gunakan token acak kriptografis dengan entropi memadai.
6.  Simpan hash token, bukan token mentah.
7.  Batasi ukuran dan tipe file impor; validasi isi file, bukan hanya
    ekstensi.
8.  Hindari menampilkan stack trace atau detail database ke pengguna.
9.  Gunakan HTTPS untuk akses kamera lintas perangkat dan akses
    jaringan.
10. Simpan log audit untuk penerbitan ulang QR dan koreksi check-in.
11. Lakukan backup database dan uji restore.
12. Tentukan kebijakan retensi dan penghapusan data setelah event
    selesai.
13. Batasi ekspor data hanya untuk role yang berwenang.

------------------------------------------------------------------------

## 14. Penanganan Jaringan dan Kegagalan

MVP sebaiknya **online-first**: setiap scan perlu konfirmasi server agar
tidak ada dua gate yang menerima QR sama secara bersamaan.

Jika koneksi terputus: - Tampilkan banner "Koneksi terputus". - Jangan
tampilkan sukses. - Jangan menyimpan antrean scan lokal yang otomatis
dianggap sah. - Petugas dapat mencoba kembali setelah koneksi pulih. -
Sediakan prosedur manual darurat yang disetujui penyelenggara dan
dicatat terpisah.

Jika kelak dibutuhkan offline mode, perlu rancangan khusus mengenai
konflik antar-gate, daftar token yang diunduh, masa berlaku data lokal,
dan rekonsiliasi. Offline mode tidak disarankan untuk MVP multi-gate
karena satu QR dapat dipindai bersamaan di dua lokasi tanpa server
pusat.

------------------------------------------------------------------------

## 15. Pengujian dan Kriteria Penerimaan

### 15.1 Pengujian fungsional

  -----------------------------------------------------------------------
  ID                      Skenario                Hasil yang diharapkan
  ----------------------- ----------------------- -----------------------
  TC-01                   Impor file valid        Data masuk sesuai kolom

  TC-02                   Impor nama kosong       Baris ditandai gagal
                                                  dengan alasan

  TC-03                   Impor data duplikat     Duplikat ditandai dan
                                                  tidak membuat tamu
                                                  ganda

  TC-04                   Generate QR             Setiap tamu memiliki
                                                  token unik

  TC-05                   Scan QR valid           Nama dan grup tampil;
                                                  check-in tercatat

  TC-06                   Scan QR tidak dikenal   Ditolak dengan pesan
                                                  jelas

  TC-07                   Scan QR yang sama dua   Scan kedua menunjukkan
                          kali                    sudah check-in

  TC-08                   Scan di dua gate hampir Hanya satu check-in
                          bersamaan               berhasil

  TC-09                   Scan QR event lain      Ditolak sebagai event
                                                  tidak sesuai

  TC-10                   QR dicabut              Ditolak sebagai QR
                                                  tidak aktif

  TC-11                   Koneksi terputus        Tidak menampilkan
                                                  sukses

  TC-12                   Ekspor laporan          Jumlah dan isi cocok
                                                  dengan database

  TC-13                   Cetak ukuran kustom     Dimensi PDF sesuai
                                                  input

  TC-14                   Petugas akses gate      Akses ditolak
                          tanpa izin              
  -----------------------------------------------------------------------

### 15.2 Pengujian fisik

Sebelum hari acara: - Cetak sampel pada bahan gelang/kartu
sesungguhnya. - Uji scanner dari jarak dan sudut yang realistis. - Uji
QR pada pencahayaan venue. - Uji hasil cetak dengan beberapa jenis
ponsel/scanner. - Uji jaringan dengan seluruh gate aktif. - Simulasikan
dua gate memindai QR yang sama. - Uji backup dan pemulihan database.

### 15.3 Kriteria MVP siap digunakan

-   Impor dan pemeriksaan data berjalan.
-   Semua tamu aktif memiliki QR unik.
-   PDF dapat dicetak pada ukuran yang dibutuhkan.
-   Setiap gate dapat login dan melakukan scan.
-   Validasi sukses/gagal tampil dengan jelas.
-   Satu tamu tidak dapat memperoleh dua check-in berhasil.
-   Rekap hadir/belum hadir dan gate sesuai database.
-   Backup dan prosedur gangguan telah diuji.

------------------------------------------------------------------------

## 16. Rencana Pengerjaan

Estimasi kasar untuk satu developer yang sudah memahami Next.js, dengan
kebutuhan dan file sumber yang tidak berubah besar:

  ------------------------------------------------------------------------
  Tahap                 Pekerjaan                                 Estimasi
  --------------------- --------------------- ----------------------------
  1                     Konfirmasi data                        0,5--1 hari
                        Excel, aturan event,  
                        dan desain alur       

  2                     Setup Next.js,                           1--2 hari
                        database,             
                        autentikasi, role     

  3                     CRUD event, gate,                        1--2 hari
                        user, dan tamu        

  4                     Impor Excel,                             1--2 hari
                        validasi, dan         
                        pembuatan QR          

  5                     Halaman scan dan                         1--2 hari
                        transaksi check-in    

  6                     Template cetak PDF                       1--2 hari
                        ukuran kustom         

  7                     Dashboard, laporan,                      1--2 hari
                        dan ekspor            

  8                     Pengujian multi-gate,                    2--3 hari
                        keamanan, dan         
                        perbaikan             
  ------------------------------------------------------------------------

Estimasi total awal: **8--16 hari kerja**. Ini perkiraan perencanaan,
bukan komitmen waktu; kondisi proyek Next.js yang sudah ada, bentuk file
Excel, dan kebutuhan cetak dapat mengubah estimasi.

------------------------------------------------------------------------

## 17. Deployment dan Operasional

### 17.1 Pengembangan lokal

-   Jalankan MySQL/MariaDB melalui Laragon.
-   Jalankan aplikasi Next.js dengan Node.js.
-   Simpan konfigurasi database dan secret di `.env`.
-   Jangan commit `.env` ke Git.
-   Gunakan migration Prisma untuk perubahan skema.

Contoh `.env`:

``` env
DATABASE_URL="mysql://root:password@localhost:3306/venuepass"
AUTH_SECRET="ganti-dengan-secret-acak-yang-kuat"
APP_TIMEZONE="Asia/Jakarta"
```

Sesuaikan username, password, nama database, dan konfigurasi autentikasi
dengan lingkungan aktual.

### 17.2 Hari acara

Pilihan yang disarankan adalah satu server pusat di jaringan lokal venue
atau server cloud yang stabil. Semua perangkat gate mengakses server
yang sama.

Kebutuhan operasional: - Satu komputer/server pusat. - Jaringan
Wi-Fi/LAN yang menjangkau semua gate. - Perangkat scan per gate. -
Kamera yang berfungsi atau scanner USB. - Printer untuk pencetakan
awal. - UPS untuk server/router bila memungkinkan. - Petugas admin yang
dapat menangani QR bermasalah.

Lakukan simulasi beban sesuai jumlah gate dan perkiraan laju kedatangan
tamu.

------------------------------------------------------------------------

## 18. Keputusan Produk yang Perlu Dikonfirmasi

Sebelum implementasi final, pemilik event perlu mengonfirmasi:

1.  Apakah satu QR hanya boleh digunakan satu kali, atau tamu boleh
    keluar-masuk?
2.  Apakah satu nama dapat memiliki beberapa orang dalam satu grup, atau
    setiap orang tetap mendapat QR sendiri?
3.  Kolom apa saja yang ada di `DATA BARCODE.xlsx` dan sheet mana yang
    digunakan?
4.  Apakah grup wajib diisi?
5.  Apakah ada kategori khusus seperti VIP, panitia, media, atau
    sponsor?
6.  Apakah petugas hanya perlu melihat nama dan grup, atau informasi
    lain?
7.  Ukuran gelang/kartu yang sebenarnya berapa mm dan apakah printer
    sudah tersedia?
8.  Berapa jumlah tamu, jumlah gate, dan perkiraan waktu kedatangan
    tersibuk?
9.  Apakah jaringan internet tersedia, atau aplikasi harus berjalan di
    jaringan lokal tanpa internet?
10. Apakah QR lama harus dapat dicabut dan diterbitkan ulang jika gelang
    hilang?

## 19. Rekomendasi Default Jika Belum Ada Keputusan

Agar pekerjaan bisa dimulai tanpa menambah kompleksitas:

-   Satu QR untuk satu orang.
-   Satu check-in berhasil per orang per event.
-   QR berisi token acak, bukan data pribadi.
-   Nama dan grup tampil setelah validasi server berhasil.
-   Semua gate terhubung ke satu database pusat.
-   PDF menjadi format cetak utama dengan ukuran kustom.
-   XLSX digunakan untuk impor dan ekspor data.
-   Aplikasi online-first; tidak menganggap scan offline sebagai
    check-in berhasil.
-   MySQL/MariaDB + Prisma + Next.js + TypeScript.
-   Petugas gate tidak dapat mengedit data tamu.

## 20. Langkah Berikutnya

1.  Sediakan file `DATA BARCODE.xlsx` di percakapan atau unggah file
    tersebut agar nama sheet dan kolom aktual bisa dipetakan dengan
    tepat.
2.  Konfirmasi ukuran gelang/kartu dan contoh printer yang akan
    digunakan.
3.  Tentukan jumlah gate dan apakah koneksi jaringan lokal tersedia.
4.  Setelah itu, spesifikasi dapat diturunkan menjadi desain layar
    final, skema Prisma siap migrasi, daftar endpoint final, dan backlog
    task implementasi.

------------------------------------------------------------------------

**Kesimpulan:** Untuk kebutuhan ini, bentuk paling praktis adalah
aplikasi web Next.js yang terhubung ke satu database pusat. QR dibuat
oleh sistem sebagai token unik, dicetak melalui PDF dengan ukuran yang
dapat diatur, lalu divalidasi oleh server pada setiap gate. Data
kehadiran disimpan sebagai transaksi sehingga rekap per tamu, grup,
waktu, petugas, dan gate dapat dipertanggungjawabkan.


---

# Lampiran A — Hasil Pemeriksaan File DATA BARCODE.xlsx

Lampiran ini memperbarui asumsi impor data pada dokumen utama berdasarkan file Excel yang telah diunggah.

## A.1 Struktur file aktual

| Properti | Hasil pemeriksaan |
|---|---|
| Nama file | `DATA BARCODE.xlsx` |
| Sheet data | `Sheet1` |
| Sheet lain | `Sheet2` dan `Sheet3` kosong |
| Jumlah baris data | 742 |
| Jumlah kolom | 3 |
| Kolom pertama | `No` |
| Kolom kedua | `NAMA LENGKAP` |
| Kolom ketiga | `GROUP` |
| Nama kosong | 0 |
| Grup kosong | 0 |
| Nama duplikat persis | 0 |
| Baris duplikat persis | 0 |

Data memiliki 742 nama tamu yang terisi dan 742 grup yang terisi. Pemeriksaan duplikasi nama secara persis tidak menemukan duplikat. Pemeriksaan ini tidak menjamin tidak ada orang berbeda dengan nama serupa atau variasi ejaan.

## A.2 Distribusi tamu berdasarkan grup

| Grup | Jumlah tamu |
|---|---:|
| BANK CAPITAL | 705 |
| CS3 | 21 |
| AMP | 16 |
| **Total** | **742** |

Jumlah ini menjadi baseline awal untuk mencocokkan hasil impor dan dashboard.

## A.3 Pemetaan kolom Excel ke database

| Kolom Excel | Kolom sistem | Aturan |
|---|---|---|
| `No` | `external_code` | Simpan sebagai kode referensi dari file sumber; jangan jadikan token QR |
| `NAMA LENGKAP` | `name` | Wajib, trim spasi di awal/akhir |
| `GROUP` | `group_name` | Wajib, trim spasi di awal/akhir |

Rekomendasi: simpan nilai `No` sebagai string di `external_code`, misalnya `"1"` sampai `"742"`. Ini menjaga kode referensi tetap utuh jika kelak sumber menggunakan angka dengan awalan nol atau format khusus. Nomor tersebut bukan pengaman QR dan tidak boleh menjadi isi QR secara langsung.

Sistem tetap membuat `guest.id` internal dan token QR acak yang terpisah. Dengan demikian, kode dari Excel hanya berfungsi sebagai referensi administrasi.

## A.4 Aturan impor yang disarankan untuk file ini

1. Admin memilih event tujuan sebelum mengimpor.
2. Sistem otomatis memilih `Sheet1` sebagai sheet yang berisi data, tetapi tetap menampilkan pilihan sheet dan pratinjau.
3. Baris pertama dikenali sebagai header: `No`, `NAMA LENGKAP`, `GROUP`.
4. Sistem memeriksa 742 baris data, bukan menghitung header sebagai tamu.
5. Baris tanpa `No`, nama, atau grup ditandai gagal validasi.
6. `external_code` harus unik dalam satu event. Jika kode sudah ada pada event yang sama, baris ditandai sebagai duplikat atau proses impor diarahkan ke mode pembaruan yang dikonfirmasi admin.
7. Nama dan grup dibersihkan dari spasi berlebih; kapitalisasi grup sebaiknya dipertahankan seperti sumber.
8. Sebelum commit, tampilkan ringkasan: total baris, valid, gagal, duplikat kode, dan contoh data.
9. Setelah impor, jumlah tamu yang diharapkan adalah 742 jika seluruh baris diterima dan belum ada data sebelumnya pada event tujuan.
10. Pembuatan QR dilakukan setelah data tamu berhasil disimpan, bukan ketika file baru dipilih.

## A.5 Contoh hasil pemetaan

| No | NAMA LENGKAP | GROUP | external_code | name | group_name |
|---:|---|---|---|---|---|
| 1 | Singgih Wiratama | BANK CAPITAL | `"1"` | Singgih Wiratama | BANK CAPITAL |
| 2 | Afiat Glegar Ramadhan | BANK CAPITAL | `"2"` | Afiat Glegar Ramadhan | BANK CAPITAL |
| 3 | Anisah | BANK CAPITAL | `"3"` | Anisah | BANK CAPITAL |

Contoh tersebut hanya menunjukkan pemetaan kolom. QR tidak berisi `No`, nama, atau grup. QR berisi token acak yang dibuat sistem.

## A.6 Dampak terhadap desain aplikasi

Berdasarkan file aktual, MVP tidak memerlukan fitur pemetaan kolom yang kompleks untuk impor pertama, karena struktur sumber sudah jelas. Namun, tetap disarankan mempertahankan fitur pratinjau dan pemetaan kolom agar aplikasi bisa menerima file revisi di masa mendatang.

Halaman impor dapat menampilkan ringkasan awal:

- **742** baris tamu terdeteksi
- **3** grup terdeteksi
- **0** nama kosong
- **0** grup kosong
- **0** nama duplikat persis
- **0** baris duplikat persis

Setelah impor berhasil, sistem sebaiknya menampilkan jumlah aktual yang tersimpan dan membandingkannya dengan baseline 742. Bila jumlah berbeda, admin harus dapat melihat rincian baris yang dilewati atau ditolak.

## A.7 Hal yang masih perlu dikonfirmasi

Pemeriksaan file belum menjawab beberapa aturan operasional:

1. Apakah nilai `No` 1–742 merupakan nomor peserta resmi yang perlu dicetak di gelang?
2. Apakah satu baris selalu mewakili satu orang dan setiap orang harus memiliki satu QR?
3. Apakah `BANK CAPITAL`, `CS3`, dan `AMP` merupakan nama grup final yang akan dipakai untuk filter laporan?
4. Apakah nama grup atau nomor peserta dapat berubah setelah QR dicetak?
5. Jika ada perubahan data, apakah QR lama tetap berlaku selama tokennya belum dicabut?

**Rekomendasi sementara:** satu baris Excel mewakili satu tamu, setiap tamu memperoleh satu QR unik, dan `No` dicetak sebagai kode referensi opsional. Token QR dibuat terpisah oleh sistem.
