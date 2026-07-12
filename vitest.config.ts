import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside RSC bundles; stub it for unit tests.
      "server-only": fileURLToPath(new URL("./src/test/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    // Pure-logic unit tests only — no DB, no Next runtime.
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: {
      // Satisfy the env schema for modules that import shared/config/env.
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
    },
  },
});
