import { useEffect, useRef, useState } from 'react';
import { ekstrakDescriptorWajah, loadFaceModels } from '../utils/faceapi.js';

/**
 * Komponen kamera yang menampilkan preview webcam dan menyediakan tombol
 * "Ambil & Verifikasi Wajah". Saat ditekan, akan mengekstrak face descriptor
 * dan mengirimkannya lewat callback onCaptured({ descriptor, imageDataUrl }).
 */
export default function FaceCapture({ onCaptured, label = 'Ambil & Verifikasi Wajah' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('memuat_model'); // memuat_model | siap | memproses | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stream;

    async function init() {
      try {
        setStatus('memuat_model');
        await loadFaceModels();

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('siap');
      } catch (err) {
        console.error(err);
        setErrorMsg('Gagal mengakses kamera atau memuat model wajah. Izinkan akses kamera pada browser.');
        setStatus('error');
      }
    }

    init();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleCapture() {
    try {
      setStatus('memproses');
      setErrorMsg('');

      const descriptor = await ekstrakDescriptorWajah(videoRef.current);

      // Ambil snapshot gambar untuk preview/bukti (opsional)
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      onCaptured({ descriptor, imageDataUrl });
      setStatus('siap');
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses wajah.');
      setStatus('siap');
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-sm rounded-xl overflow-hidden border-2 border-primary-600 bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-auto scale-x-[-1]" />
        {status === 'memuat_model' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
            Memuat model deteksi wajah...
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {errorMsg && <p className="text-red-600 text-sm text-center">{errorMsg}</p>}

      <button
        type="button"
        onClick={handleCapture}
        disabled={status !== 'siap'}
        className="w-full max-w-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
      >
        {status === 'memproses' ? 'Memproses...' : label}
      </button>
    </div>
  );
}
