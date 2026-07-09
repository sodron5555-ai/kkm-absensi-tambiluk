import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

export default function AdminAttendance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    muatData();
  }, []);

  async function muatData() {
    setLoading(true);
    try {
      const res = await api.get('/attendance');
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const res = await api.get('/attendance/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `absensi_kkm41_tambiluk_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Gagal mengekspor data. Pastikan kamu punya izin akses.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="font-bold text-gray-800">Data Absensi</h1>
        <Link to="/dashboard" className="text-sm text-primary-600 font-medium">
          ← Dashboard
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <button
          onClick={handleExport}
          className="mb-4 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm"
        >
          ⬇ Ekspor ke CSV
        </button>

        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-3 text-left">Nama</th>
                <th className="p-3 text-left">NIM</th>
                <th className="p-3 text-left">Divisi</th>
                <th className="p-3 text-left">Kegiatan</th>
                <th className="p-3 text-left">Waktu</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Jarak (m)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.user.namaLengkap}</td>
                  <td className="p-3">{a.user.nim}</td>
                  <td className="p-3">{a.user.role}</td>
                  <td className="p-3">{a.session.namaKegiatan}</td>
                  <td className="p-3">{new Date(a.waktuAbsen).toLocaleString('id-ID')}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        a.status === 'HADIR' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="p-3">{a.jarakMeter.toFixed(1)}</td>
                </tr>
              ))}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400">
                    Belum ada data absensi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
