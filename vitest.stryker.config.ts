/**
 * Stryker-specific Vitest config.
 *
 * Mutation testing runs the test suite once per mutation. Including the
 * pre-existing failing tests (encryption.test.ts, api-auth.test.ts,
 * nexus/*.test.ts) would poison the baseline and abort the Stryker run.
 *
 * This config narrows the include glob to only the engine-related test
 * files we want Stryker to use as the mutation oracle. It is intentionally
 * NOT used by `npm test` — only by `npx stryker run`.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.tsx"],
    include: [
      "tests/unit/lib/engine.test.ts",
      "tests/unit/lib/engine-real-data.test.ts",
      "tests/unit/lib/nis2-engine.test.ts",
      "tests/unit/lib/nis2-engine-real-data.test.ts",
      "tests/unit/lib/nis2-engine-branch-coverage.test.ts",
      "tests/unit/lib/space-law-engine.test.ts",
      "tests/unit/lib/space-law-engine-real-data.test.ts",
      "tests/unit/lib/cross-engine-consistency.test.ts",
      "tests/unit/lib/unified-engine-merger.test.ts",
      "tests/unit/lib/unified-engine-merger.regression.test.ts",
      "tests/unit/lib/unified-assessment-mappers.test.ts",
    ],
    exclude: ["tests/e2e/**/*", "node_modules/**/*"],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: "forks",
    isolate: true,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
