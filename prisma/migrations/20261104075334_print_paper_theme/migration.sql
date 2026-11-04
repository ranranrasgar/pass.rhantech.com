-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('A4', 'LETTER', 'LABEL');

-- CreateEnum
CREATE TYPE "PrintTheme" AS ENUM ('LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "print_presets" ADD COLUMN     "paper" "PaperSize" NOT NULL DEFAULT 'A4',
ADD COLUMN     "theme" "PrintTheme" NOT NULL DEFAULT 'LIGHT';
