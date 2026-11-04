// Tes integrasi ke DATABASE UJI terpisah (TEST_DATABASE_URL). Jalankan: npm run test:int
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ quiet: true });
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !/_test\b/.test(new URL(testUrl).pathname) || testUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL harus menunjuk ke database *_test yang berbeda dari DATABASE_URL");
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: testUrl },
    testTimeout: 30_000,
  },
});
