const prisma = require('../config/db');
const { apakahDalamRadius } = require('../utils/geofence');
const { cocokkanWajah } = require('../utils/faceMatch');
const { buatCsv, paksaTeks } = require('../utils/csv');
const { dalamRentangWaktu, apakahTanggalSesiHariIni, waktuSekarangWIB } = require('./sessionController');

const FACE_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.5');

// POST /api/attendance/checkin
// body: { token, latitude, longitude, faceDescriptor: number[128] }
async function checkin(req, res) {
  try {
    const { token, latitude, longitude, faceDescriptor } = req.body;
    const userId = req.user.id;

    if (!token || !faceDescriptor) {
      return res.status(400).json({ message: 'Data absensi tidak lengkap.' });
    }

    // 1. Validasi sesi & waktu
    const sesi = await prisma.attendanceSession.findUnique({ where: { tokenQr: token } });
    if (!sesi || !sesi.isActive) {
      return res.status(404).json({ message: 'Sesi absensi tidak ditemukan atau tidak aktif.' });
    }

    if (!apakahTanggalSesiHariIni(sesi.tanggal)) {
      return res.status(400).json({ message: 'Sesi absensi ini bukan untuk hari ini.' });
    }

    if (!dalamRentangWaktu(sesi.jamMulai, sesi.jamSelesai)) {
      return res.status(400).json({
        message: `Di luar jam absensi (${sesi.jamMulai} - ${sesi.jamSelesai}). Absensi ditolak.`,
      });
    }

    // 2. Cegah absen ganda
    const sudahAbsen = await prisma.attendance.findUnique({
      where: { userId_sessionId: { userId, sessionId: sesi.id } },
    });
    if (sudahAbsen) {
      return res.status(409).json({ message: 'Kamu sudah absen pada sesi ini.' });
    }

    // 3. Validasi GPS (geofencing) — dilewati untuk kelas KARYAWAN
    const { valid: lokasiValid, jarak } = apakahDalamRadius(
      sesi.latitude,
      sesi.longitude,
      parseFloat(latitude),
      parseFloat(longitude),
      sesi.radiusMeter
    );

    if (sesi.jenisKelas === 'REGULER' && !lokasiValid) {
      return res.status(400).json({
        message: `Kamu berada di luar radius lokasi KKM (jarak: ${Math.round(jarak)} m, maksimal: ${sesi.radiusMeter} m).`,
      });
    }

    // 4. Validasi wajah (tetap wajib untuk semua jenis kelas)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const descriptorTerdaftar = JSON.parse(user.faceDescriptor);

    let hasilWajah;
    try {
      hasilWajah = cocokkanWajah(descriptorTerdaftar, faceDescriptor, FACE_THRESHOLD);
    } catch (e) {
      return res.status(400).json({ message: 'Format data wajah tidak valid.' });
    }

    if (!hasilWajah.match) {
      return res.status(403).json({
        message: 'Wajah tidak cocok dengan data terdaftar. Absensi ditolak untuk mencegah titip absen.',
      });
    }

    // 5. Tentukan status Hadir/Telat, dihitung dalam WIB (telat jika lewat jamMulai + 1 jam 30 menit)
    const nowWIB = waktuSekarangWIB();
    const totalMenitSekarang = nowWIB.getUTCHours() * 60 + nowWIB.getUTCMinutes();

    const [hMulai, mMulai] = sesi.jamMulai.split(':').map(Number);
    const totalMenitBatasTelat = hMulai * 60 + mMulai + 90;

    const status = totalMenitSekarang > totalMenitBatasTelat ? 'TELAT' : 'HADIR';

    const absen = await prisma.attendance.create({
      data: {
        userId,
        sessionId: sesi.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        jarakMeter: jarak,
        faceMatchScore: hasilWajah.distance,
        status,
      },
    });

    return res.status(201).json({ message: 'Absensi berhasil dicatat.', absen, status });
  } catch (err) {
    console.error('Checkin error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat absensi.' });
  }
}

// GET /api/attendance  -> daftar absensi (untuk panitia), bisa difilter ?sessionId=
async function daftarAbsensi(req, res) {
  const { sessionId } = req.query;
  const where = sessionId ? { sessionId } : {};

  const data = await prisma.attendance.findMany({
    where,
    include: { user: true, session: true },
    orderBy: { waktuAbsen: 'desc' },
  });

  return res.json({ data });
}

// GET /api/attendance/export?sessionId=...  -> CSV rapi, UTF-8 BOM
async function exportCsv(req, res) {
  try {
    const { sessionId } = req.query;
    const where = sessionId ? { sessionId } : {};

    const data = await prisma.attendance.findMany({
      where,
      include: { user: true, session: true },
      orderBy: { waktuAbsen: 'asc' },
    });

    const headers = [
      'No',
      'Nama Lengkap',
      'NIM',
      'Jurusan',
      'Divisi/Role',
      'Kegiatan',
      'Jenis Kelas',
      'Tanggal Absen',
      'Jam Absen',
      'Status',
      'Jarak dari Lokasi (meter)',
      'Skor Kecocokan Wajah',
      'Latitude',
      'Longitude',
    ];

    const rows = data.map((a, idx) => [
      idx + 1,
      a.user.namaLengkap,
      paksaTeks(a.user.nim), // NIM dipaksa jadi teks agar tidak berubah ke notasi ilmiah
      a.user.jurusan,
      a.user.role,
      a.session.namaKegiatan,
      a.session.jenisKelas,
      new Date(a.waktuAbsen).toLocaleDateString('id-ID'),
      new Date(a.waktuAbsen).toLocaleTimeString('id-ID'),
      a.status,
      paksaTeks(a.jarakMeter.toFixed(2)), // dipaksa teks agar titik desimal tidak salah dibaca
      paksaTeks(a.faceMatchScore.toFixed(4)),
      paksaTeks(a.latitude), // koordinat dipaksa teks agar presisi tidak rusak
      paksaTeks(a.longitude),
    ]);

    const csvContent = buatCsv(headers, rows, ';');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="absensi_kkm41_tambiluk_${Date.now()}.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ message: 'Gagal mengekspor data CSV.' });
  }
}

module.exports = { checkin, daftarAbsensi, exportCsv };