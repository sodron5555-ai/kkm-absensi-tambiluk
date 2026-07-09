/**
 * Generator CSV manual (tanpa dependency tambahan) yang:
 * - Menambahkan BOM UTF-8 (\uFEFF) agar karakter dan format terbaca benar di Excel.
 * - Menggunakan pemisah titik koma (;) yang merupakan default Excel versi Indonesia/Eropa,
 *   namun tetap bisa diganti ke koma (,) lewat parameter jika dibutuhkan.
 * - Mengapit setiap nilai dengan tanda kutip dua dan melakukan escaping yang benar,
 *   sehingga koma/titik koma/baris baru di dalam data tidak merusak struktur kolom.
 */
function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Selalu bungkus dengan kutip dua dan escape kutip dua yang ada di dalam nilai
  return `"${str.replace(/"/g, '""')}"`;
}

function buatCsv(headers, rows, delimiter = ';') {
  const headerLine = headers.map(escapeCsvValue).join(delimiter);
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(delimiter));
  const content = [headerLine, ...dataLines].join('\r\n');

  const BOM = '\uFEFF';
  return BOM + content;
}

/**
 * Memaksa Excel membaca sebuah nilai sebagai TEKS MURNI, bukan angka.
 * Dipakai untuk kolom seperti NIM, Latitude, dan Longitude agar tidak:
 * - Diubah otomatis ke notasi ilmiah (mis. NIM panjang jadi "2,84E+09")
 * - Salah dibaca akibat perbedaan pemisah desimal titik (.) vs koma (,)
 *   antara region Excel Indonesia/Eropa dan format angka JavaScript.
 *
 * Caranya dengan trik formula Excel: ="isi teks di sini" — Excel akan
 * mengevaluasi ini sebagai formula yang hasilnya adalah teks apa adanya.
 */
function paksaTeks(value) {
  if (value === null || value === undefined) return '';
  return `="${String(value).replace(/"/g, '""')}"`;
}

module.exports = { buatCsv, paksaTeks };