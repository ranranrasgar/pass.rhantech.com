// Kredensial & URL KHUSUS tes E2E. Hanya dipakai di database uji (*_test) yang di-reset tiap run.
import { config } from "dotenv";

config({ quiet: true });

export const TEST_DB = process.env.TEST_DATABASE_URL ?? "";
if (!/_test\b/.test(new URL(TEST_DB || "postgresql://x/none").pathname) || TEST_DB === process.env.DATABASE_URL) {
  throw new Error("E2E butuh TEST_DATABASE_URL ke database *_test yang berbeda dari DATABASE_URL");
}
export const E2E_PORT = 3200;
export const E2E_ADMIN = { name: "Admin E2E", email: "e2e-admin@uji.local", password: "E2e-Admin-Uji-2026" };
