const express = require('express');
const { checkin, daftarAbsensi, exportCsv } = require('../controllers/attendanceController');
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/role');

const router = express.Router();

router.post('/checkin', authenticate, checkin);
router.get('/', authenticate, allowRoles('KETUA', 'WAKIL', 'SEKRETARIS', 'BENDAHARA'), daftarAbsensi);
router.get('/export', authenticate, allowRoles('KETUA', 'SEKRETARIS', 'BENDAHARA'), exportCsv);

module.exports = router;
