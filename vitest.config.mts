import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright specs live outside src/ and must not be picked up here.
    include: ["src/**/*.test.ts"],
  },
});
