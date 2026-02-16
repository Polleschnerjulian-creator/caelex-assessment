/**
 * Reusable encryption mock for tests that import @/lib/encryption.
 *
 * Usage in test files:
 *   vi.mock("@/lib/encryption", () => encryptionMock);
 *
 * Or import individual functions if you need to override:
 *   import { encryptionMock } from "tests/mocks/encryption";
 */

import { vi } from "vitest";

export const encryptionMock = {
  encrypt: vi.fn((value: string) => Promise.resolve(value)),
  decrypt: vi.fn((value: string) => Promise.resolve(value)),
  isEncrypted: vi.fn(() => false),
  hashValue: vi.fn((value: string) => Promise.resolve(`hashed_${value}`)),
};
