import * as faceapi from 'face-api.js';

// Model diletakkan di folder public/models — lihat README untuk cara mengunduhnya.
const MODEL_URL = '/models';

let modelsLoaded = false;

export async function loadFaceModels() {
  if (modelsLoaded) return;

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

/**
 * Mendeteksi SATU wajah dari elemen <video> atau <img> dan mengembalikan
 * descriptor 128-dimensi (Float32Array -> Array biasa agar bisa di-JSON-kan).
 * Melempar error jika tidak ada wajah / lebih dari satu wajah terdeteksi
 * (mencegah foto yang berisi banyak orang / wajah tidak jelas).
 */
export async function ekstrakDescriptorWajah(elementVideoAtauImg) {
  await loadFaceModels();

  const detections = await faceapi
    .detectAllFaces(elementVideoAtauImg, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) {
    throw new Error('Wajah tidak terdeteksi. Pastikan pencahayaan cukup dan wajah menghadap kamera.');
  }

  if (detections.length > 1) {
    throw new Error('Terdeteksi lebih dari satu wajah. Pastikan hanya kamu sendiri di depan kamera.');
  }

  return Array.from(detections[0].descriptor);
}
