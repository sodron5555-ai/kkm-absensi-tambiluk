-- CreateEnum
CREATE TYPE "JenisKelas" AS ENUM ('REGULER', 'KARYAWAN');

-- AlterTable
ALTER TABLE "attendance_sessions" ADD COLUMN     "jenisKelas" "JenisKelas" NOT NULL DEFAULT 'REGULER';
