-- CreateEnum
CREATE TYPE "Role" AS ENUM ('KETUA', 'WAKIL', 'HUMAS', 'PDD', 'SEKRETARIS', 'BENDAHARA', 'LOGISTIK');

-- CreateEnum
CREATE TYPE "StatusAbsensi" AS ENUM ('HADIR', 'TELAT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "jurusan" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "fotoWajahUrl" TEXT NOT NULL,
    "faceDescriptor" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "namaKegiatan" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "jamMulai" TEXT NOT NULL,
    "jamSelesai" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeter" INTEGER NOT NULL DEFAULT 100,
    "tokenQr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "waktuAbsen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "jarakMeter" DOUBLE PRECISION NOT NULL,
    "faceMatchScore" DOUBLE PRECISION NOT NULL,
    "status" "StatusAbsensi" NOT NULL DEFAULT 'HADIR',

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nim_key" ON "users"("nim");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_tokenQr_key" ON "attendance_sessions"("tokenQr");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_userId_sessionId_key" ON "attendances"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
