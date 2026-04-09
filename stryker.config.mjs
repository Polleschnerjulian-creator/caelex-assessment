/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  // Focus the baseline run on the three core regulatory engines —
  // these are the highest-value mutation targets in the codebase.
  // Add encryption.ts / permissions.ts / cra-rule-engine.ts in
  // follow-up runs once the engine baseline is published.
  mutate: [
    'src/lib/engine.server.ts',
    'src/lib/nis2-engine.server.ts',
    'src/lib/space-law-engine.server.ts',
  ],
  testRunner: 'vitest',
  vitest: {
    // Use the dedicated Stryker vitest config so pre-existing failures
    // in unrelated tests (encryption, api-auth, nexus/*) don't poison
    // the baseline.
    configFile: 'vitest.stryker.config.ts',
  },
  // TypeScript checker disabled for the baseline run: it tries to
  // type-check the entire 6,265-line Prisma schema + 14,447 files for
  // each mutant and OOMs the worker process. Without it, mutations
  // that produce invalid TypeScript get reported as "compile errors"
  // by vitest itself, which is acceptable for a first baseline.
  checkers: [],
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: { high: 80, low: 60, break: 50 },
  // Reduced concurrency to keep total RAM under control on a 16GB box.
  concurrency: 2,
  timeoutMS: 60000,
  // Skip the unrelated test files entirely from being instrumented
  // during the dry-run phase.
  ignorePatterns: [
    'tests/e2e/**',
    'tests/contracts/**',
    'docs/**',
    '.next/**',
    'coverage/**',
  ],
};
