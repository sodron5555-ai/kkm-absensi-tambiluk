require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const sessionRoutes = require('./routes/session.routes');
const attendanceRoutes = require('./routes/attendance.routes');

const app = express();

// Keamanan dasar
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' })); // face descriptor cukup besar (array 128 float)
app.use(express.urlencoded({ extended: true }));

// Rate limit khusus endpoint absen & login untuk mencegah brute force / spam absen
const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
app.use('/api/auth/login', limiter);
app.use('/api/attendance/checkin', limiter);

// Sajikan foto wajah yang diunggah (agar bisa ditampilkan di dashboard admin)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', waktuServer: new Date().toISOString() });
});

// Fallback 404
app.use((req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan.' }));

// Error handler global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Terjadi kesalahan internal server.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server Absensi KKM Kelompok 41 berjalan di port ${PORT}`);
});