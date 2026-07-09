const { PrismaClient } = require('@prisma/client');

// Singleton Prisma Client agar tidak membuat banyak koneksi saat hot-reload
const prisma = new PrismaClient();

module.exports = prisma;
