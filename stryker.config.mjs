/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/lib/engine.server.ts',
    'src/lib/nis2-engine.server.ts',
    'src/lib/space-law-engine.server.ts',
    'src/lib/encryption.ts',
    'src/lib/permissions.ts',
  ],
  testRunner: 'vitest',
  checkers: ['typescript'],
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: { high: 80, low: 60, break: 50 },
  concurrency: 4,
  timeoutMS: 60000,
};
