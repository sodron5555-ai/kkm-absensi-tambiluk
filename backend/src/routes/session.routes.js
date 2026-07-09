const express = require('express');
const { buatSesi, cekStatusSesi, daftarSesi } = require('../controllers/sessionController');
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/role');

const router = express.Router();

// Hanya panitia inti yang boleh membuat sesi absensi
router.post('/', authenticate, allowRoles('KETUA', 'WAKIL', 'SEKRETARIS'), buatSesi);
router.get('/', authenticate, daftarSesi);

// Endpoint publik-terautentikasi: dicek dari halaman /absen/:token sebelum kamera dibuka
router.get('/status/:token', authenticate, cekStatusSesi);

module.exports = router;
