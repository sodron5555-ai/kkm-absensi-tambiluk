import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

const ROLE_PANITIA_INTI = ['KETUA', 'WAKIL', 'SEKRETARIS'];
const ROLE_BOLEH_EXPORT = ['KETUA', 'SEKRETARIS', 'BENDAHARA'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sesiList, setSesiList] = useState([]);
  const [formSesi, setFormSesi] = useState({
    namaKegiatan: '',
    tanggal: new Date().toISOString().slice(0, 10),
    jamMulai: '06:00',
    jamSelesai: '09:00',
    radiusMeter: 100,
  });
  const [lokasi, setLokasi] = useState(null);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    muatSesi();
  }, []);

  async function muatSesi() {
    try {
      const { data } = await api.get('/sessions');
      setSesiList(data.sesiList);
    } catch (err) {
      console.error(err);
    }
  }

  function ambilLokasiSaatIni() {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLokasi({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setPesan('Gagal mengambil lokasi. Izinkan akses GPS.')
    );
  }

  async function handleBuatSesi(e) {
    e.preventDefault();
    if (!lokasi) {
      setPesan('Ambil lokasi KKM terlebih dahulu sebagai titik pusat geofencing.');
      return;
    }
    try {
      await api.post('/sessions', { ...formSesi, ...lokasi });
      setPesan('Sesi absensi berhasil dibuat!');
      muatSesi();
    } catch (err) {
      setPesan(err.response?.data?.message || 'Gagal membuat sesi.');
    }
  }

  async function handleHapusSesi(id, namaKegiatan) {
    const konfirmasi = window.confirm(
      `Yakin ingin menghapus sesi "${namaKegiatan}"? Semua data absensi yang terkait juga akan terhapus permanen.`
    );
    if (!konfirmasi) return;

    try {
      await api.delete(`/sessions/${id}`);
      setPesan('Sesi berhasil dihapus.');
      muatSesi();
    } catch (err) {
      setPesan(err.response?.data?.message || 'Gagal menghapus sesi.');
    }
  }

  function handleLogoutClick() {
    const konfirmasi = window.confirm('Yakin ingin keluar?');
    if (konfirmasi) logout();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-800">Absensi KKM Kelompok 41 - Tambiluk</h1>
          <p className="text-sm text-gray-500">
            {user.namaLengkap} · {user.role}
          </p>
        </div>
        <button onClick={handleLogoutClick} className="text-sm text-red-600 font-medium">
          Keluar
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <button
          onClick={() => navigate('/absen-scan')}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl"
        >
          📷 Lakukan Absensi Sekarang
        </button>

        {ROLE_BOLEH_EXPORT.includes(user.role) && (
          <button
            onClick={() => navigate('/admin/absensi')}
            className="w-full bg-white border border-primary-600 text-primary-700 font-medium py-3 rounded-xl"
          >
            📊 Lihat & Ekspor Data Absensi
          </button>
        )}

        {ROLE_PANITIA_INTI.includes(user.role) && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Buat Sesi Absensi Baru</h2>
            <form onSubmit={handleBuatSesi} className="space-y-3">
              <input
                placeholder="Nama Kegiatan"
                required
                value={formSesi.namaKegiatan}
                onChange={(e) => setFormSesi({ ...formSesi, namaKegiatan: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={formSesi.tanggal}
                  onChange={(e) => setFormSesi({ ...formSesi, tanggal: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Radius (meter)"
                  value={formSesi.radiusMeter}
                  onChange={(e) => setFormSesi({ ...formSesi, radiusMeter: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={formSesi.jamMulai}
                  onChange={(e) => setFormSesi({ ...formSesi, jamMulai: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                />
                <input
                  type="time"
                  value={formSesi.jamSelesai}
                  onChange={(e) => setFormSesi({ ...formSesi, jamSelesai: e.target.value })}
                  className="border rounded-lg px-3 py-2"
                />
              </div>

              <button
                type="button"
                onClick={ambilLokasiSaatIni}
                className="w-full border border-gray-300 rounded-lg py-2 text-sm"
              >
                {lokasi ? `📍 Lokasi diset: ${lokasi.latitude.toFixed(5)}, ${lokasi.longitude.toFixed(5)}` : '📍 Ambil Lokasi KKM Saat Ini sebagai Titik Pusat'}
              </button>

              {pesan && <p className="text-sm text-gray-600">{pesan}</p>}

              <button type="submit" className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg">
                Buat Sesi & Generate QR
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-3">Daftar Sesi Absensi</h2>
          <div className="space-y-2">
            {sesiList.map((s) => (
              <div key={s.id} className="border rounded-lg p-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium">{s.namaKegiatan}</p>
                  <p className="text-gray-500">
                    {new Date(s.tanggal).toLocaleDateString('id-ID')} · {s.jamMulai}-{s.jamSelesai} ·{' '}
                    {s._count.attendances} sudah absen
                  </p>
                </div>
                {ROLE_PANITIA_INTI.includes(user.role) && (
                  <button
                    onClick={() => navigate(`/admin/qr/${s.tokenQr}`)}
                    className="text-primary-600 font-medium"
                  >
                    Lihat QR
                  </button>
                )}
                {ROLE_PANITIA_INTI.includes(user.role) && (
                  <button
                    onClick={() => handleHapusSesi(s.id, s.namaKegiatan)}
                    className="text-red-600 font-medium ml-3"
                  >
                    Hapus
                  </button>
                )}
              </div>
            ))}
            {sesiList.length === 0 && <p className="text-gray-400 text-sm">Belum ada sesi absensi.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}