import { describe } from "vitest";
import { PrismaClient } from "@prisma/client";

// ─── Integration Test Wrapper ───────────────────────────────────────────────
// Skips the entire suite when DATABASE_URL is not set.
// Run with: DATABASE_URL=postgres://... npx vitest run tests/integration/

/**
 * Integration test wrapper — skips when DATABASE_URL is not set.
 * Run with: DATABASE_URL=postgres://... npx vitest run tests/integration/
 */
export const describeIntegration = process.env.DATABASE_URL
  ? describe
  : describe.skip;

// ─── Test Prisma Client ─────────────────────────────────────────────────────

let testPrisma: PrismaClient | null = null;

/**
 * Returns a shared PrismaClient configured for integration tests.
 * Uses the DATABASE_URL environment variable.
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
  }
  return testPrisma;
}

/**
 * Disconnects and cleans up the shared test PrismaClient.
 * Call this in afterAll() to avoid connection leaks.
 */
export async function cleanupTestPrisma(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}
