// E2E alur utama (RENCANA_FASE F6). Jalankan: npm run build && npm run test:e2e
// Server produksi terpisah (port 3200) memakai DATABASE UJI; data event asli tidak tersentuh.
import { defineConfig } from "@playwright/test";
import { E2E_PORT, TEST_DB } from "./e2e/env";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    channel: "chrome", // pakai Google Chrome terpasang, tidak perlu unduh browser
    acceptDownloads: true,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  webServer: {
    command: `npx next start -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { DATABASE_URL: TEST_DB },
  },
});
