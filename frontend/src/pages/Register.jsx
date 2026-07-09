import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios.js';
import FaceCapture from '../components/FaceCapture.jsx';

const ROLE_OPTIONS = [
  { value: 'KETUA', label: 'Ketua' },
  { value: 'WAKIL', label: 'Wakil' },
  { value: 'HUMAS', label: 'Humas' },
  { value: 'PDD', label: 'PDD' },
  { value: 'SEKRETARIS', label: 'Sekretaris' },
  { value: 'BENDAHARA', label: 'Bendahara' },
  { value: 'LOGISTIK', label: 'Logistik' },
];

export default function Register() {
  const [form, setForm] = useState({
    namaLengkap: '',
    nim: '',
    jurusan: '',
    email: '',
    password: '',
    role: '',
  });
  const [faceData, setFaceData] = useState(null); // { descriptor, imageDataUrl }
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Konversi dataURL hasil snapshot kamera menjadi File agar bisa dikirim via multipart/form-data
  function dataUrlToFile(dataUrl, filename) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!faceData) {
      setError('Silakan ambil foto wajah terlebih dahulu sebelum mendaftar.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append('faceDescriptor', JSON.stringify(faceData.descriptor));
      formData.append('foto', dataUrlToFile(faceData.imageDataUrl, `${form.nim}.jpg`));

      await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Registrasi berhasil! Mengalihkan ke halaman login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registrasi gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-xl font-bold text-center text-gray-800">Pendaftaran Anggota</h1>
        <p className="text-center text-gray-500 text-sm mb-6">KKM Kelompok 41 - Desa Tambiluk</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nama Lengkap" value={form.namaLengkap} onChange={(v) => updateField('namaLengkap', v)} />
          <Input label="NIM" value={form.nim} onChange={(v) => updateField('nim', v)} />
          <Input label="Jurusan" value={form.jurusan} onChange={(v) => updateField('jurusan', v)} />
          <Input label="Email" type="email" value={form.email} onChange={(v) => updateField('email', v)} />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(v) => updateField('password', v)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Divisi</label>
            <select
              required
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="">-- Pilih Divisi --</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto Wajah (untuk dataset Facial Recognition)
            </label>
            <FaceCapture onCaptured={setFaceData} label="Ambil Foto Wajah" />
            {faceData && <p className="text-green-600 text-sm text-center mt-2">✓ Wajah berhasil diverifikasi</p>}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
          >
            {loading ? 'Mendaftarkan...' : 'Daftar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-primary-600 font-medium">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
      />
    </div>
  );
}
