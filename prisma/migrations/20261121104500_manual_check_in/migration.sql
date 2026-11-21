-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR', 'MANUAL');

-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "manual_reason" VARCHAR(255),
ADD COLUMN     "method" "CheckInMethod" NOT NULL DEFAULT 'QR';
