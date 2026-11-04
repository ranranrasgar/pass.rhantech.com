import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Tes integrasi DB dijalankan terpisah: npm run test:int (vitest.int.config.mts).
    exclude: ["**/node_modules/**", "src/**/*.int.test.ts"],
  },
});
