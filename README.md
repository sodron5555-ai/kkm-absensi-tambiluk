# Aplikasi Absensi KKM Kelompok 41 – Desa Tambiluk

Aplikasi web absensi dengan validasi **waktu**, **lokasi (GPS geofencing)**, dan
**pengenalan wajah (facial recognition)**, lengkap dengan role-based access untuk
Ketua, Wakil, Humas, PDD, Sekretaris, Bendahara, dan Logistik.

## Tech Stack & Alasan Pemilihan

| Bagian | Teknologi | Alasan |
|---|---|---|
| Backend | Node.js + Express | Ringan, cepat, mudah dideploy di Railway |
| Database | PostgreSQL + Prisma ORM | Railway punya plugin PostgreSQL gratis, Prisma bikin query & migrasi aman |
| Auth | JWT + bcrypt | Standar industri, stateless, cocok untuk role-based access |
| Face Recognition | **face-api.js (berjalan di browser/client)** | Model TensorFlow.js dijalankan langsung di HP/laptop pengguna. Backend hanya membandingkan angka descriptor (128 dimensi), bukan memproses gambar/ML berat di server. Ini membuat deploy ke Railway jauh lebih ringan, cepat, dan murah dibanding menjalankan face recognition di server (yang butuh library native seperti `canvas` + model besar) |
| Geofencing | Formula Haversine (native JS) | Tidak butuh library eksternal, akurat untuk radius ratusan meter |
| QR Code | `qrcode.react` | Generate QR dari link absensi secara instan di frontend |
| Frontend | React (Vite) + Tailwind CSS | Build cepat, ringan, mudah dikustomisasi |
| Export CSV | Custom generator + UTF-8 BOM | Memastikan file terbuka rapi di Excel (karakter tidak rusak, kolom tidak berantakan) |

### Kenapa Face Recognition di Client, Bukan di Server?
Menjalankan face recognition (misalnya `face-api.js` versi Node atau `dlib`/`OpenCV`)
di server membutuhkan library native (`canvas`, binding C++) yang **sering gagal
di-install di platform PaaS seperti Railway** karena keterbatasan build environment,
dan juga jauh lebih lambat serta boros resource. Solusi yang dipakai di sini:

1. Saat **registrasi**, browser pengguna memuat model face-api.js, mendeteksi wajah
   dari foto yang diunggah, lalu menghasilkan **descriptor** (array 128 angka yang
   merepresentasikan fitur wajah). Descriptor inilah yang disimpan di database.
2. Saat **absen**, browser kembali menghasilkan descriptor dari wajah yang di-scan
   live lewat kamera.
3. Backend hanya menghitung **jarak Euclidean** antara dua descriptor tersebut. Jika
   jaraknya di bawah threshold (default `0.5`), dianggap wajah yang sama.

---

## Struktur Proyek

```
kkm-absensi/
├── backend/
│   ├── prisma/schema.prisma       # Skema database
│   ├── src/
│   │   ├── config/db.js           # Koneksi Prisma
│   │   ├── middleware/            # auth.js (JWT), role.js (RBAC)
│   │   ├── utils/                 # geofence.js, faceMatch.js, csv.js
│   │   ├── controllers/           # authController, sessionController, attendanceController
│   │   ├── routes/                # auth.routes, session.routes, attendance.routes
│   │   └── server.js              # Entry point Express
│   ├── .env.example
│   ├── railway.json
│   └── package.json
└── frontend/
    ├── public/models/             # Taruh file model face-api.js di sini (lihat BACA_INI.md)
    ├── src/
    │   ├── api/axios.js
    │   ├── context/AuthContext.jsx
    │   ├── components/ FaceCapture.jsx, ProtectedRoute.jsx
    │   ├── utils/faceapi.js
    │   ├── pages/ Login, Register, Dashboard, AbsenCheckin, AbsenScanRedirect, QRDisplay, AdminAttendance
    │   └── App.jsx
    ├── .env.example
    └── package.json
```

---

## 1. Setup Lokal (Development)

### Prasyarat
- Node.js versi 18 atau lebih baru
- PostgreSQL (bisa pakai [Neon](https://neon.tech), [Supabase](https://supabase.com), atau instal lokal) — atau gunakan SQLite untuk tes cepat (lihat catatan di `schema.prisma`)

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: isi DATABASE_URL, JWT_SECRET, CORS_ORIGIN

npx prisma migrate dev --name init   # membuat tabel di database
npm run dev                          # jalan di http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:4000/api
```

**Wajib:** unduh model face-api.js ke `frontend/public/models/` — ikuti instruksi
di file `frontend/public/models/BACA_INI.md`. Tanpa file ini, kamera wajah tidak
akan berfungsi.

```bash
npm run dev   # jalan di http://localhost:5173
```

Buka `http://localhost:5173/register` untuk membuat akun pertama (misalnya sebagai
Ketua), lalu login.

---

## 2. Alur Penggunaan Aplikasi

1. **Registrasi**: anggota mengisi data diri, memilih divisi, dan mengambil foto
   wajah lewat kamera (bukan upload file biasa, agar kualitas wajah untuk dataset
   terjamin dan langsung terverifikasi ada wajahnya).
2. **Ketua/Wakil/Sekretaris membuat Sesi Absensi**: menentukan nama kegiatan,
   tanggal, jam mulai–selesai (default 06.00–09.00), serta mengambil lokasi GPS
   saat ini sebagai titik pusat radius geofencing.
3. Sistem menghasilkan **link unik + QR Code** untuk sesi tersebut (halaman
   "Lihat QR" di dashboard). QR ini bisa dicetak/ditampilkan di lokasi KKM.
4. **Anggota absen**: scan QR (atau tekan "Lakukan Absensi Sekarang" di dashboard),
   lalu sistem otomatis:
   - Mengecek apakah waktu sekarang ada di antara jam mulai–selesai sesi. Di luar
     jam itu, request langsung ditolak (dicek dua kali: saat load halaman & saat
     submit di backend).
   - Meminta izin lokasi GPS, menghitung jarak ke titik pusat KKM. Jika di luar
     radius, ditolak.
   - Membuka kamera, mengekstrak descriptor wajah, membandingkan dengan descriptor
     saat registrasi. Jika tidak cocok, ditolak.
   - Jika semua valid, absensi tercatat dengan status Hadir/Telat.
5. **Bendahara/Sekretaris/Ketua** bisa melihat rekap dan mengekspor ke CSV yang
   rapi untuk dibuka di Excel.

---

## 3. Deployment ke Railway (Step-by-Step)

Railway akan dipakai untuk **dua service terpisah**: backend (Node/Express) dan
frontend (React static build), plus **plugin PostgreSQL**.

### Langkah 1 — Push kode ke GitHub
```bash
cd kkm-absensi
git init
git add .
git commit -m "Initial commit: aplikasi absensi KKM Kelompok 41"
git branch -M main
git remote add origin https://github.com/USERNAME/kkm-absensi.git
git push -u origin main
```
> Pastikan `.env` **tidak** ikut ter-commit (sudah ditangani `.gitignore`).

### Langkah 2 — Buat Project di Railway
1. Buka [railway.app](https://railway.app) → **New Project**.
2. Pilih **Deploy from GitHub repo** → pilih repo `kkm-absensi`.

### Langkah 3 — Tambahkan Database PostgreSQL
1. Di dalam project Railway, klik **+ New** → **Database** → **Add PostgreSQL**.
2. Railway otomatis membuat variabel `DATABASE_URL`.

### Langkah 4 — Deploy Service Backend
1. Klik **+ New** → **GitHub Repo** → pilih repo yang sama, lalu set **Root
   Directory** ke `backend`.
2. Buka tab **Variables**, tambahkan:
   - `DATABASE_URL` → klik "Add Reference" dan pilih variabel dari service
     PostgreSQL yang sudah dibuat (agar otomatis tersambung).
   - `JWT_SECRET` → isi string acak panjang.
   - `JWT_EXPIRES_IN` → `12h`
   - `CORS_ORIGIN` → isi nanti setelah frontend dideploy (lihat Langkah 6), untuk
     sementara bisa isi `*`.
   - `FACE_MATCH_THRESHOLD` → `0.5`
3. Railway otomatis mendeteksi Node.js (Nixpacks) dan membaca `railway.json` yang
   menjalankan `npx prisma migrate deploy && node src/server.js` sebagai start
   command — ini otomatis membuat tabel di database saat pertama kali deploy.
4. Klik **Deploy**. Setelah selesai, buka tab **Settings → Networking → Generate
   Domain** untuk mendapat URL publik, misalnya:
   `https://kkm-absensi-backend-production.up.railway.app`
5. Tes dengan membuka `https://URL-BACKEND/api/health` — harus muncul `{"status":"ok"}`.

> **Catatan penting soal foto wajah:** Railway menggunakan *ephemeral filesystem*,
> artinya file yang diupload ke folder `uploads/` bisa hilang saat service
> di-redeploy. Untuk kebutuhan foto profil jangka panjang, disarankan pindah ke
> layanan penyimpanan seperti Cloudinary atau AWS S3 (tinggal ganti logic
> `multer.diskStorage` di `auth.routes.js` menjadi upload ke cloud). Untuk data
> **descriptor wajah** (yang dipakai untuk pencocokan), datanya sudah aman
> tersimpan di database PostgreSQL, jadi fitur absensi tetap berjalan normal
> meski foto asli hilang.

### Langkah 5 — Deploy Service Frontend
1. Klik **+ New** → **GitHub Repo** → pilih repo yang sama, set **Root Directory**
   ke `frontend`.
2. Tambahkan file model face-api.js ke `frontend/public/models/` **sebelum push**
   (lihat `BACA_INI.md`), lalu commit & push.
3. Di tab **Variables**, tambahkan:
   - `VITE_API_URL` → `https://URL-BACKEND-DARI-LANGKAH-4/api`
4. Di tab **Settings → Build**, set:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run preview`
   (Railway otomatis menyuntikkan variabel `$PORT`, dan `vite preview` di
   `package.json` sudah dikonfigurasi untuk membacanya.)
5. Klik **Deploy**, lalu **Generate Domain** untuk mendapat URL publik frontend,
   misalnya: `https://kkm-absensi-frontend-production.up.railway.app`

### Langkah 6 — Sambungkan CORS Backend ↔ Frontend
1. Kembali ke service **backend** → tab **Variables** → update `CORS_ORIGIN`
   menjadi URL frontend dari Langkah 5, contoh:
   `https://kkm-absensi-frontend-production.up.railway.app`
2. Redeploy service backend agar variabel baru terbaca.

### Langkah 7 — Uji Coba End-to-End
1. Buka URL frontend, coba **Register** dengan kamera aktif.
2. Login, lalu sebagai Ketua/Wakil/Sekretaris buat **Sesi Absensi** dengan jam
   sesuai kebutuhan (untuk testing, set jam mulai/selesai mencakup waktu saat itu).
3. Buka halaman **Lihat QR**, scan dengan HP lain (atau buka link-nya langsung),
   lalu coba proses absen lengkap (lokasi + wajah).
4. Sebagai Bendahara/Sekretaris/Ketua, buka **Data Absensi** → **Ekspor CSV**,
   lalu buka file-nya di Excel untuk memastikan rapi.

---

## 4. Kustomisasi Lanjutan (Opsional)
- **Ubah radius default geofencing**: pada saat membuat sesi di Dashboard,
  field "Radius (meter)" bisa diubah sesuai luas area basecamp KKM.
- **Ubah ambang batas kecocokan wajah**: ubah `FACE_MATCH_THRESHOLD` di
  Variables backend Railway. Semakin kecil semakin ketat.
- **Ubah aturan telat**: logic ada di `attendanceController.js` fungsi `checkin`
  (variabel `batasTelat`), sesuaikan toleransi keterlambatan sesuai kebijakan
  kelompok.
- **Simpan foto secara permanen**: ganti storage `multer` di
  `backend/src/routes/auth.routes.js` dari disk lokal menjadi Cloudinary/S3 agar
  tidak hilang saat redeploy di Railway.

---

## 5. Ringkasan Keamanan yang Sudah Diterapkan
- Password di-hash dengan bcrypt (tidak pernah disimpan plain text).
- Autentikasi berbasis JWT dengan masa berlaku terbatas.
- Role-based access control di level middleware backend (bukan hanya disembunyikan
  di UI frontend), sehingga tidak bisa dibypass lewat API langsung.
- Rate limiting pada endpoint login dan checkin absensi untuk mencegah brute force
  / spam.
- Validasi waktu, lokasi, dan wajah dilakukan **di backend** (bukan hanya di
  frontend), sehingga tidak bisa dimanipulasi lewat DevTools browser.
- Satu akun hanya bisa absen sekali per sesi (dijamin oleh constraint unik di
  database `@@unique([userId, sessionId])`).
