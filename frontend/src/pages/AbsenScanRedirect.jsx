import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QrScanner from 'qr-scanner';

// Halaman ini dipakai untuk scan QR/barcode absensi terlebih dahulu,
// lalu diarahkan ke halaman verifikasi wajah /absen/:token.
export default function AbsenScanRedirect() {
  const [pesan, setPesan] = useState('Arahkan kamera ke QR absensi...');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenQuery = params.get('token');
    if (tokenQuery) {
      navigate(`/absen/${tokenQuery}`, { replace: true });
      return;
    }

    if (!videoRef.current) return;

    QrScanner.WORKER_PATH = new URL('qr-scanner-worker.min.js', import.meta.url).toString();

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const teks = result?.data?.trim();
        if (!teks) return;

        let token = teks;
        if (token.startsWith('http')) {
          try {
            const url = new URL(token);
            const match = url.pathname.match(/\/absen\/(.+)/);
            if (match) token = match[1];
            else token = url.searchParams.get('token') || token;
          } catch (err) {
            console.error('QR parse error:', err);
          }
        }

        if (!token) {
          setError('QR tidak valid. Gunakan QR absensi yang benar.');
          return;
        }

        navigate(`/absen/${token}`, { replace: true });
      },
      {
        onDecodeError: () => setPesan('QR tidak terbaca, coba lagi.'),
        highlightScanRegion: true,
      }
    );

    scanner.start().catch((err) => {
      setError('Gagal mengakses kamera: ' + err.message);
      console.error(err);
    });

    return () => scanner.destroy();
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 text-center">
        <h1 className="font-bold text-gray-800 mb-2">Scan QR Absensi</h1>
        <p className="text-sm text-gray-500 mb-4">Silakan scan barcode/QR absensi terlebih dahulu.</p>
        <div className="rounded-2xl overflow-hidden bg-black">
          <video ref={videoRef} className="w-full h-72 object-cover" muted playsInline />
        </div>
        <p className="text-sm text-gray-600 mt-4">{pesan}</p>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <p className="text-xs text-gray-400 mt-4">Jika kamera tidak berfungsi, coba reload halaman atau izinkan akses kamera.</p>
      </div>
    </div>
  );
}
