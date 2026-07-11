const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');

function waktuSekarangWIB() {
  const now = new Date();
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

// Mendukung sesi yang melewati tengah malam (contoh: 22:50 - 00:00, atau 23:00 - 02:00)
function dalamRentangWaktu(jamMulai, jamSelesai) {
  const nowWIB = waktuSekarangWIB();

  const [hMulai, mMulai] = jamMulai.split(':').map(Number);
  const [hSelesai, mSelesai] = jamSelesai.split(':').map(Number);

  const totalMenitSekarang = nowWIB.getUTCHours() * 60 + nowWIB.getUTCMinutes();
  const totalMenitMulai = hMulai * 60 + mMulai;
  let totalMenitSelesai = hSelesai * 60 + mSelesai;

  if (totalMenitSelesai <= totalMenitMulai) {
    totalMenitSelesai += 24 * 60;
    let sekarangAdj = totalMenitSekarang;
    if (sekarangAdj < totalMenitMulai) {
      sekarangAdj += 24 * 60;
    }
    return sekarangAdj >= totalMenitMulai && sekarangAdj <= totalMenitSelesai;
  }

  return totalMenitSekarang >= totalMenitMulai && totalMenitSekarang <= totalMenitSelesai;
}

function apakahTanggalSesiHariIni(tanggalSesi) {
  const nowWIB = waktuSekarangWIB();
  const tanggalSesiUTC = new Date(tanggalSesi);

  return (
    tanggalSesiUTC.getUTCFullYear() === nowWIB.getUTCFullYear() &&
    tanggalSesiUTC.getUTCMonth() === nowWIB.getUTCMonth() &&
    tanggalSesiUTC.getUTCDate() === nowWIB.getUTCDate()
  );
}

async function buatSesi(req, res) {
  try {
    const { namaKegiatan, deskripsi, tanggal, jamMulai, jamSelesai, latitude, longitude, radiusMeter, jenisKelas } = req.body;

    const jenisKelasValid = ['REGULER', 'KARYAWAN'].includes(jenisKelas) ? jenisKelas : 'REGULER';

    if (!namaKegiatan || !tanggal || !jamMulai || !jamSelesai || (jenisKelasValid === 'REGULER' && (latitude == null || longitude == null))) {
      return res.status(400).json({ message: 'Semua field sesi wajib diisi.' });
    }

    const sesi = await prisma.attendanceSession.create({
      data: {
        namaKegiatan,
        deskripsi: deskripsi || null,
        tanggal: new Date(tanggal),
        jamMulai,
        jamSelesai,
        latitude: latitude != null ? parseFloat(latitude) : 0,
        longitude: longitude != null ? parseFloat(longitude) : 0,
        radiusMeter: radiusMeter ? parseInt(radiusMeter) : 100,
        jenisKelas: jenisKelasValid,
        tokenQr: uuidv4(),
      },
    });

    const linkAbsen = `${process.env.CORS_ORIGIN}/absen/${sesi.tokenQr}`;

    return res.status(201).json({ message: 'Sesi absensi berhasil dibuat.', sesi, linkAbsen });
  } catch (err) {
    console.error('Buat sesi error:', err);
    return res.status(500).json({ message: 'Gagal membuat sesi absensi.' });
  }
}

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
        deskripsi: sesi.deskripsi,
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

async function daftarSesi(req, res) {
  const sesiList = await prisma.attendanceSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { attendances: true } } },
  });
  return res.json({ sesiList });
}

async function hapusSesi(req, res) {
  try {
    const { id } = req.params;

    const sesi = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!sesi) {
      return res.status(404).json({ message: 'Sesi absensi tidak ditemukan.' });
    }

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