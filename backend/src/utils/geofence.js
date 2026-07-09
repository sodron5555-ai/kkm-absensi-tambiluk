/**
 * Menghitung jarak antara dua koordinat GPS menggunakan formula Haversine.
 * @returns jarak dalam meter
 */
function hitungJarakMeter(lat1, lon1, lat2, lon2) {
  const R = 6371000; // radius bumi dalam meter
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Mengecek apakah koordinat user berada dalam radius yang ditentukan.
 */
function apakahDalamRadius(latPusat, lonPusat, latUser, lonUser, radiusMeter) {
  const jarak = hitungJarakMeter(latPusat, lonPusat, latUser, lonUser);
  return { valid: jarak <= radiusMeter, jarak };
}

module.exports = { hitungJarakMeter, apakahDalamRadius };
