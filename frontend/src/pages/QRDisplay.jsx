import { useParams, Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

export default function QRDisplay() {
  const { token } = useParams();
  const linkAbsen = `${window.location.origin}/absen-scan?token=${token}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-sm w-full">
        <h1 className="font-bold text-gray-800 mb-4">QR Code Absensi</h1>
        <div className="flex justify-center mb-4">
          <QRCodeCanvas value={linkAbsen} size={220} />
        </div>
        <p className="text-xs text-gray-500 break-all mb-4">{linkAbsen}</p>
        <p className="text-xs text-gray-400 mb-4">
          QR ini hanya akan bisa digunakan sesuai jam yang sudah ditentukan pada sesi. Di luar jam tersebut,
          sistem akan menolak absensi meskipun QR di-scan.
        </p>
        <Link to="/dashboard" className="text-primary-600 font-medium text-sm">
          ← Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
