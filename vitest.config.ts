import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" throws outside Next's server bundle; in tests it's a no-op.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      // Unit tests need *some* values for env validation. Integration tests
      // use the real DATABASE_URL from .env (or CI) and skip without one.
      AUTH_SECRET: process.env["AUTH_SECRET"] ?? "test-secret-test-secret-test-secret",
      DATABASE_URL: process.env["DATABASE_URL"] ?? "postgresql://test:test@localhost:5432/test",
      GOOGLE_GENERATIVE_AI_API_KEY: "test-key",
    },
    testTimeout: 20_000,
  },
});
