import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';

// Halaman ini dipakai saat user menekan tombol "Lakukan Absensi Sekarang" dari dashboard
// (tanpa scan QR). Sistem akan mencari sesi yang sedang berlangsung hari ini lalu mengarahkan
// ke halaman /absen/:token. Jika pakai QR fisik, QR akan langsung berisi link /absen/:token
// sehingga halaman ini bisa dilewati.
export default function AbsenScanRedirect() {
  const [pesan, setPesan] = useState('Mencari sesi absensi aktif...');
  const navigate = useNavigate();

  useEffect(() => {
    async function cari() {
      try {
        const { data } = await api.get('/sessions');
        const hariIni = new Date().toDateString();

        const sesiAktif = data.sesiList.find((s) => new Date(s.tanggal).toDateString() === hariIni);

        if (!sesiAktif) {
          setPesan('Tidak ada sesi absensi untuk hari ini. Hubungi panitia.');
          return;
        }

        navigate(`/absen/${sesiAktif.tokenQr}`, { replace: true });
      } catch (err) {
        setPesan('Gagal memuat sesi absensi.');
      }
    }
    cari();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">{pesan}</p>
    </div>
  );
}
