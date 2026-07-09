const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');

// Helper: mengecek apakah waktu sekarang berada dalam rentang jamMulai - jamSelesai (HH:mm)
function dalamRentangWaktu(jamMulai, jamSelesai) {
  const now = new Date();
  const [hMulai, mMulai] = jamMulai.split(':').map(Number);
  const [hSelesai, mSelesai] = jamSelesai.split(':').map(Number);

  const mulai = new Date(now);
  mulai.setHours(hMulai, mMulai, 0, 0);

  const selesai = new Date(now);
  selesai.setHours(hSelesai, mSelesai, 59, 999);

  return now >= mulai && now <= selesai;
}

// POST /api/sessions  (Ketua/Wakil/Sekretaris membuat sesi absensi harian)
async function buatSesi(req, res) {
  try {
    const { namaKegiatan, tanggal, jamMulai, jamSelesai, latitude, longitude, radiusMeter } = req.body;

    if (!namaKegiatan || !tanggal || !jamMulai || !jamSelesai || latitude == null || longitude == null) {
      return res.status(400).json({ message: 'Semua field sesi wajib diisi.' });
    }

    const sesi = await prisma.attendanceSession.create({
      data: {
        namaKegiatan,
        tanggal: new Date(tanggal),
        jamMulai,
        jamSelesai,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeter: radiusMeter ? parseInt(radiusMeter) : 100,
        tokenQr: uuidv4(),
      },
    });

    // URL ini yang di-encode menjadi QR Code oleh frontend (pakai library qrcode.react)
    const linkAbsen = `${process.env.CORS_ORIGIN}/absen/${sesi.tokenQr}`;

    return res.status(201).json({ message: 'Sesi absensi berhasil dibuat.', sesi, linkAbsen });
  } catch (err) {
    console.error('Buat sesi error:', err);
    return res.status(500).json({ message: 'Gagal membuat sesi absensi.' });
  }
}

// GET /api/sessions/status/:token  -> dicek oleh halaman absen sebelum menampilkan kamera
async function cekStatusSesi(req, res) {
  try {
    const { token } = req.params;

    const sesi = await prisma.attendanceSession.findUnique({ where: { tokenQr: token } });
    if (!sesi || !sesi.isActive) {
      return res.status(404).json({ valid: false, message: 'Link/QR absensi tidak ditemukan atau tidak aktif.' });
    }

    const sekarang = new Date();
    const tanggalSesi = new Date(sesi.tanggal).toDateString();
    const tanggalSekarang = sekarang.toDateString();

    if (tanggalSesi !== tanggalSekarang) {
      return res.json({ valid: false, message: 'Sesi absensi ini bukan untuk hari ini.' });
    }

    if (!dalamRentangWaktu(sesi.jamMulai, sesi.jamSelesai)) {
      return res.json({
        valid: false,
        message: `Absensi hanya dibuka pukul ${sesi.jamMulai} - ${sesi.jamSelesai}. Saat ini di luar jam tersebut.`,
      });
    }

    return res.json({
      valid: true,
      sesi: {
        id: sesi.id,
        namaKegiatan: sesi.namaKegiatan,
        jamMulai: sesi.jamMulai,
        jamSelesai: sesi.jamSelesai,
        latitude: sesi.latitude,
        longitude: sesi.longitude,
        radiusMeter: sesi.radiusMeter,
      },
    });
  } catch (err) {
    console.error('Cek status sesi error:', err);
    return res.status(500).json({ message: 'Gagal memeriksa status sesi.' });
  }
}

// GET /api/sessions  -> daftar semua sesi (untuk panitia)
async function daftarSesi(req, res) {
  const sesiList = await prisma.attendanceSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { attendances: true } } },
  });
  return res.json({ sesiList });
}

module.exports = { buatSesi, cekStatusSesi, daftarSesi, dalamRentangWaktu };
