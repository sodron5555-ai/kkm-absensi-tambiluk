const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const ROLE_VALID = ['KETUA', 'WAKIL', 'HUMAS', 'PDD', 'SEKRETARIS', 'BENDAHARA', 'LOGISTIK'];

// POST /api/auth/register
// Menerima multipart/form-data: foto (file) + field lain termasuk faceDescriptor (JSON string array)
async function register(req, res) {
  try {
    const { namaLengkap, nim, jurusan, email, password, role, jenisKelas, faceDescriptor } = req.body;

    if (!namaLengkap || !nim || !jurusan || !email || !password || !role || !jenisKelas || !faceDescriptor) {
      return res.status(400).json({ message: 'Semua field wajib diisi, termasuk kelas dan data wajah.' });
    }

    if (!ROLE_VALID.includes(role)) {
      return res.status(400).json({ message: 'Divisi/role tidak valid.' });
    }

    if (!['REGULER', 'KARYAWAN'].includes(jenisKelas)) {
      return res.status(400).json({ message: 'Jenis kelas tidak valid.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Foto wajah wajib diunggah.' });
    }

    // Validasi format faceDescriptor (harus JSON array 128 angka dari face-api.js)
    let descriptorArray;
    try {
      descriptorArray = JSON.parse(faceDescriptor);
      if (!Array.isArray(descriptorArray) || descriptorArray.length !== 128) {
        throw new Error();
      }
    } catch (e) {
      return res.status(400).json({
        message: 'Data wajah tidak valid. Pastikan wajah terdeteksi dengan jelas sebelum submit.',
      });
    }

    const emailExist = await prisma.user.findUnique({ where: { email } });
    if (emailExist) {
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }

    const nimExist = await prisma.user.findUnique({ where: { nim } });
    if (nimExist) {
      return res.status(409).json({ message: 'NIM sudah terdaftar.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const fotoWajahUrl = `/uploads/faces/${req.file.filename}`;

    const user = await prisma.user.create({
      data: {
        namaLengkap,
        nim,
        jurusan,
        email,
        passwordHash,
        role,
        jenisKelas,
        fotoWajahUrl,
        faceDescriptor: JSON.stringify(descriptorArray),
      },
    });

    return res.status(201).json({
      message: 'Registrasi berhasil. Silakan login.',
      user: {
        id: user.id,
        namaLengkap: user.namaLengkap,
        email: user.email,
        role: user.role,
        jenisKelas: user.jenisKelas,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat registrasi.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, namaLengkap: user.namaLengkap },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    return res.json({
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        namaLengkap: user.namaLengkap,
        email: user.email,
        role: user.role,
        jenisKelas: user.jenisKelas,
        nim: user.nim,
        jurusan: user.jurusan,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat login.' });
  }
}

// GET /api/auth/me
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      namaLengkap: true,
      email: true,
      role: true,
      jenisKelas: true,
      nim: true,
      jurusan: true,
      fotoWajahUrl: true,
    },
  });
  return res.json({ user });
}

module.exports = { register, login, me };
