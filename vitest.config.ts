import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "backend/**/*.test.ts",
      "frontend/src/**/*.test.ts",
    ],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
