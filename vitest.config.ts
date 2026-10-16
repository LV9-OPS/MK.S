import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    globalSetup: ["tests/unit/global-setup.ts"],
    setupFiles: ["tests/unit/setup-env.ts"],
    fileParallelism: false,
    pool: "forks",
    testTimeout: 20000,
  },
});
