import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';
import FaceCapture from '../components/FaceCapture.jsx';

// Tahapan: cek_waktu -> minta_lokasi -> verifikasi_wajah -> selesai
export default function AbsenCheckin() {
  const { token } = useParams();
  const [tahap, setTahap] = useState('cek_waktu');
  const [pesan, setPesan] = useState('Memeriksa validitas link/QR absensi...');
  const [sesi, setSesi] = useState(null);
  const [lokasi, setLokasi] = useState(null);
  const [hasilAkhir, setHasilAkhir] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    cekWaktu();
  }, [token]);

  async function cekWaktu() {
    try {
      const { data } = await api.get(`/sessions/status/${token}`);
      if (!data.valid) {
        setPesan(data.message);
        setTahap('ditolak');
        return;
      }
      setSesi(data.sesi);
      setTahap(data.sesi.jenisKelas === 'KARYAWAN' ? 'verifikasi_wajah' : 'minta_lokasi');
    } catch (err) {
      setPesan(err.response?.data?.message || 'Link absensi tidak valid.');
      setTahap('ditolak');
    }
  }

  function mintaLokasi() {
    if (!navigator.geolocation) {
      setError('Perangkatmu tidak mendukung GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLokasi({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setTahap('verifikasi_wajah');
      },
      () => setError('Gagal mengambil lokasi. Aktifkan GPS dan izinkan akses lokasi pada browser.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleWajahCaptured({ descriptor }) {
    try {
      const body = {
        token,
        faceDescriptor: descriptor,
      };

      if (sesi.jenisKelas === 'REGULER') {
        body.latitude = lokasi.latitude;
        body.longitude = lokasi.longitude;
      }

      const { data } = await api.post('/attendance/checkin', body);
      setHasilAkhir({ sukses: true, status: data.status, message: data.message });
    } catch (err) {
      setHasilAkhir({ sukses: false, message: err.response?.data?.message || 'Absensi gagal.' });
    }
    setTahap('selesai');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white shadow-lg rounded-2xl p-8 text-center">
        <h1 className="font-bold text-gray-800 mb-1">Absensi KKM Kelompok 41</h1>
        <p className="text-sm text-gray-500 mb-6">{sesi?.namaKegiatan || 'Desa Tambiluk'}</p>

        {tahap === 'cek_waktu' && <p className="text-gray-600">{pesan}</p>}

        {tahap === 'ditolak' && (
          <div className="text-red-600 bg-red-50 rounded-lg p-4 text-sm">{pesan}</div>
        )}

        {tahap === 'minta_lokasi' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Absensi dibuka pukul {sesi.jamMulai} - {sesi.jamSelesai}. Selanjutnya kami perlu memverifikasi
              lokasimu.
            </p>
            <button
              onClick={mintaLokasi}
              className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg"
            >
              📍 Bagikan Lokasi Saya
            </button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        )}

        {tahap === 'verifikasi_wajah' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Terakhir, verifikasi wajahmu untuk mencegah titip absen.</p>
            <FaceCapture onCaptured={handleWajahCaptured} label="Verifikasi Wajah & Absen" />
          </div>
        )}

        {tahap === 'selesai' && hasilAkhir && (
          <div
            className={`rounded-lg p-4 text-sm ${
              hasilAkhir.sukses ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}
          >
            <p className="font-semibold mb-1">{hasilAkhir.sukses ? '✓ Absensi Berhasil' : '✗ Absensi Gagal'}</p>
            <p>{hasilAkhir.message}</p>
            {hasilAkhir.status && <p className="mt-1">Status: {hasilAkhir.status}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
