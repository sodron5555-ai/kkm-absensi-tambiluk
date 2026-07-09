const jwt = require('jsonwebtoken');

/**
 * Middleware untuk memverifikasi token JWT.
 * Menyimpan payload user (id, role, email) ke req.user jika valid.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login kembali.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role, namaLengkap }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

module.exports = authenticate;
