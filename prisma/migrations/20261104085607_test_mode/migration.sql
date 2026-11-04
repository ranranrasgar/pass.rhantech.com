-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "is_test" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "test_mode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "scan_logs" ADD COLUMN     "is_test" BOOLEAN NOT NULL DEFAULT false;
