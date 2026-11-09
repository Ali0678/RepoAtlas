import { defineConfig } from "vitest/config";
import path from "path";

// Vitest configuration for apps/web.
// jsdom is used as the test environment because Zustand and testing-library
// expect a browser-like DOM. The @/ path alias mirrors tsconfig.json paths
// so test imports resolve identically to source imports.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
