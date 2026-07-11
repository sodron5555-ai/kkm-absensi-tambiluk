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
    deskripsi: '',
    tanggal: new Date().toISOString().slice(0, 10),
    jamMulai: '06:00',
    jamSelesai: '09:00',
    radiusMeter: 100,
    jenisKelas: 'REGULER',
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
    if (formSesi.jenisKelas === 'REGULER' && !lokasi) {
      setPesan('Ambil lokasi KKM terlebih dahulu sebagai titik pusat geofencing.');
      return;
    }

    try {
      const payload = { ...formSesi };
      if (formSesi.jenisKelas === 'REGULER') {
        payload.latitude = lokasi.latitude;
        payload.longitude = lokasi.longitude;
      }

      await api.post('/sessions', payload);
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
    const konfirmasi = window.confirm('Yakin ingin logout?');
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
          Logout
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

              <textarea
                placeholder="Deskripsi (opsional)"
                value={formSesi.deskripsi}
                onChange={(e) => setFormSesi({ ...formSesi, deskripsi: e.target.value })}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 resize-none"
              />

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Jenis Kelas</label>
                <select
                  value={formSesi.jenisKelas}
                  onChange={(e) => {
                    const jenisKelas = e.target.value;
                    setFormSesi({ ...formSesi, jenisKelas });
                    if (jenisKelas === 'KARYAWAN') {
                      setLokasi(null);
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                >
                  <option value="REGULER">Reguler (wajib di lokasi posko / GPS dicek)</option>
                  <option value="KARYAWAN">Karyawan (bebas lokasi, GPS tidak dicek)</option>
                </select>
              </div>

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
                  disabled={formSesi.jenisKelas === 'KARYAWAN'}
                  className="border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              {formSesi.jenisKelas === 'REGULER' && (
                <button
                  type="button"
                  onClick={ambilLokasiSaatIni}
                  className="w-full border border-gray-300 rounded-lg py-2 text-sm"
                >
                  {lokasi
                    ? `📍 Lokasi diset: ${lokasi.latitude.toFixed(5)}, ${lokasi.longitude.toFixed(5)}`
                    : '📍 Ambil Lokasi KKM Saat Ini sebagai Titik Pusat'}
                </button>
              )}
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


                  <div className="flex items-center gap-2">
                    <p className="font-medium">{s.namaKegiatan}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.jenisKelas === 'KARYAWAN'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {s.jenisKelas === 'KARYAWAN' ? 'Karyawan' : 'Reguler'}
                    </span>
                  </div>
                  {s.deskripsi && <p className="text-gray-500 text-xs mt-0.5">{s.deskripsi}</p>}
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