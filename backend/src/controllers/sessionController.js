const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');

// Helper: mendapatkan waktu sekarang dalam WIB (UTC+7), independen dari timezone server
function waktuSekarangWIB() {
  const now = new Date();
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

// Helper: mengecek apakah waktu sekarang (WIB) berada dalam rentang jamMulai - jamSelesai (HH:mm)
function dalamRentangWaktu(jamMulai, jamSelesai) {
  const nowWIB = waktuSekarangWIB();

  const [hMulai, mMulai] = jamMulai.split(':').map(Number);
  const [hSelesai, mSelesai] = jamSelesai.split(':').map(Number);

  const totalMenitSekarang = nowWIB.getUTCHours() * 60 + nowWIB.getUTCMinutes();
  const totalMenitMulai = hMulai * 60 + mMulai;
  const totalMenitSelesai = hSelesai * 60 + mSelesai;

  return totalMenitSekarang >= totalMenitMulai && totalMenitSekarang <= totalMenitSelesai;
}

// Helper: mengecek apakah tanggal sesi = hari ini, dihitung berdasarkan WIB
function apakahTanggalSesiHariIni(tanggalSesi) {
  const nowWIB = waktuSekarangWIB();
  const tanggalSesiUTC = new Date(tanggalSesi);

  return (
    tanggalSesiUTC.getUTCFullYear() === nowWIB.getUTCFullYear() &&
    tanggalSesiUTC.getUTCMonth() === nowWIB.getUTCMonth() &&
    tanggalSesiUTC.getUTCDate() === nowWIB.getUTCDate()
  );
}

// POST /api/sessions  (Ketua/Wakil/Sekretaris membuat sesi absensi harian)
async function buatSesi(req, res) {
  try {
    const { namaKegiatan, tanggal, jamMulai, jamSelesai, latitude, longitude, radiusMeter, jenisKelas } = req.body;

    if (!namaKegiatan || !tanggal || !jamMulai || !jamSelesai || latitude == null || longitude == null) {
      return res.status(400).json({ message: 'Semua field sesi wajib diisi.' });
    }

    const jenisKelasValid = ['REGULER', 'KARYAWAN'].includes(jenisKelas) ? jenisKelas : 'REGULER';

    const sesi = await prisma.attendanceSession.create({
      data: {
        namaKegiatan,
        tanggal: new Date(tanggal),
        jamMulai,
        jamSelesai,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeter: radiusMeter ? parseInt(radiusMeter) : 100,
        jenisKelas: jenisKelasValid,
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

    if (!apakahTanggalSesiHariIni(sesi.tanggal)) {
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
        jenisKelas: sesi.jenisKelas,
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

// DELETE /api/sessions/:id  (menghapus sesi beserta seluruh data absensi terkait)
async function hapusSesi(req, res) {
  try {
    const { id } = req.params;

    const sesi = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!sesi) {
      return res.status(404).json({ message: 'Sesi absensi tidak ditemukan.' });
    }

    // Hapus data absensi dulu (foreign key constraint), baru sesi-nya, dibungkus transaction
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { sessionId: id } }),
      prisma.attendanceSession.delete({ where: { id } }),
    ]);

    return res.json({ message: 'Sesi absensi berhasil dihapus.' });
  } catch (err) {
    console.error('Hapus sesi error:', err);
    return res.status(500).json({ message: 'Gagal menghapus sesi absensi.' });
  }
}

module.exports = {
  buatSesi,
  cekStatusSesi,
  daftarSesi,
  hapusSesi,
  dalamRentangWaktu,
  apakahTanggalSesiHariIni,
  waktuSekarangWIB,
};