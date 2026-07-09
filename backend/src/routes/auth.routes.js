const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { register, login, me } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Pastikan folder upload ada
const uploadDir = path.join(__dirname, '../../uploads/faces');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const namaAman = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, namaAman);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // maks 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format foto harus JPG, PNG, atau WEBP.'));
  },
});

router.post('/register', upload.single('foto'), register);
router.post('/login', login);
router.get('/me', authenticate, me);

module.exports = router;
