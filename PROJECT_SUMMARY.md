# Ringkasan Proyek: Aplikasi Absensi KKM Kelompok 41 - Desa Tambiluk

## Deskripsi Singkat
Aplikasi absensi berbasis web untuk KKM Kelompok 41 Desa Tambiluk yang menerapkan:
- validasi waktu absensi
- geofencing lokasi GPS untuk kelas REGULER
- verifikasi wajah menggunakan `face-api.js`
- role-based access control untuk panitia
- sesi absensi dengan QR code
- export data absensi ke CSV

## Arsitektur
- `backend/`: API Node.js + Express
- `frontend/`: React + Vite + Tailwind CSS
- Database: PostgreSQL dengan Prisma ORM

## Fitur Utama
1. Registrasi anggota dengan:
   - nama lengkap
   - NIM
   - jurusan
   - email dan password
   - divisi/role
   - pilihan kelas: `REGULER` atau `KARYAWAN`
   - verifikasi wajah langsung dari browser

2. Autentikasi JWT untuk login dan proteksi API.

3. Pembuatan sesi absensi oleh panitia inti (`KETUA`, `WAKIL`, `SEKRETARIS`):
   - nama kegiatan
   - deskripsi opsional
   - tanggal sesi
   - jam mulai dan selesai
   - radius geofencing untuk kelas REGULER
   - lokasi GPS diambil saat pembuatan sesi
   - QR code valid untuk absensi sesi tersebut

4. Alur absensi untuk pengguna:
   - scan QR atau buka halaman scan
   - validasi sesi aktif dan jam absensi
   - jika kelas REGULER, validasi lokasi GPS terhadap radius sesi
   - selalu lakukan verifikasi wajah dengan face descriptor
   - batasi absensi pengguna per sesi satu kali
   - hasil absensi dicatat dengan status `HADIR` atau `TELAT`

5. Enforce kelas user terhadap sesi:
   - user `KARYAWAN` hanya dapat absen di sesi `KARYAWAN`
   - user `REGULER` hanya dapat absen di sesi `REGULER`

6. Halaman admin/rekap untuk melihat dan mengekspor absensi.

## Struktur Folder
```
kkm-absensi2/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── config/db.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.js
│   └── package.json
└── frontend/
    ├── public/models/    # model face-api.js
    ├── src/
    │   ├── api/axios.js
    │   ├── context/AuthContext.jsx
    │   ├── components/FaceCapture.jsx
    │   ├── pages/
    │   └── utils/faceapi.js
    └── package.json
```

## Stack Teknologi
- Backend: Node.js, Express, Prisma, PostgreSQL
- Frontend: React, Vite, Tailwind CSS
- Autentikasi: JWT, bcrypt
- Face recognition: `face-api.js` di browser
- QR code: `qrcode.react`
- Geofencing: kalkulasi radius native JS

## API dan Logika Inti
- `POST /api/auth/register`: registrasi user baru dengan descriptor wajah dan jenis kelas
- `POST /api/auth/login`: login dan mengeluarkan token JWT
- `GET /api/auth/me`: data user saat ini
- `POST /api/sessions`: buat sesi absensi (hanya panitia inti)
- `DELETE /api/sessions/:id`: hapus sesi
- `GET /api/attendance`: rekap absensi
- `POST /api/attendance/checkin`: absensi pengguna dengan QR token, lokasi, dan face descriptor

## Kondisi Khusus
- `KARYAWAN` bebas lokasi, tetapi tetap harus verifikasi wajah.
- `REGULER` wajib cek lokasi dan wajah.
- Jika user tidak cocok kelasnya dengan sesi, absen akan ditolak.

## Catatan Deploy
- Backend membutuhkan environment variable `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `FACE_MATCH_THRESHOLD`, dan `PORT`.
- Frontend menggunakan variable `VITE_API_URL` untuk target API.
- Model face-api.js harus disimpan di `frontend/public/models/` untuk bisa memuat di client.

## Catatan Tambahan
- Database schema telah diperbarui dengan field `jenisKelas` di model `User`.
- Fitur penghapusan data user dan attendance juga tersedia melalui operasi langsung di database.
- Build frontend sudah berhasil setelah perbaikan JSX di `Dashboard.jsx`.
