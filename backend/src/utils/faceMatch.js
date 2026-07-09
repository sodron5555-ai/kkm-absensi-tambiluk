/**
 * Perbandingan wajah dilakukan dengan membandingkan "face descriptor"
 * (vektor 128-dimensi) yang dihasilkan oleh face-api.js DI SISI BROWSER
 * (client-side), lalu backend hanya menghitung jarak Euclidean antara
 * descriptor saat registrasi vs descriptor saat absen.
 *
 * Pendekatan ini dipilih karena:
 * 1. Tidak perlu install library ML berat (canvas, tensorflow native) di server -> deploy ke Railway jauh lebih ringan & cepat.
 * 2. Foto wajah asli tidak perlu dikirim ulang setiap absen, cukup vektor angka -> lebih hemat bandwidth & lebih privasi.
 * 3. Ini adalah pola umum yang direkomendasikan face-api.js untuk arsitektur client-heavy.
 */

function euclideanDistance(desc1, desc2) {
  if (!Array.isArray(desc1) || !Array.isArray(desc2) || desc1.length !== desc2.length) {
    throw new Error('Format face descriptor tidak valid.');
  }

  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += (desc1[i] - desc2[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function cocokkanWajah(descriptorTerdaftar, descriptorAbsen, threshold) {
  const distance = euclideanDistance(descriptorTerdaftar, descriptorAbsen);
  return { match: distance <= threshold, distance };
}

module.exports = { euclideanDistance, cocokkanWajah };
