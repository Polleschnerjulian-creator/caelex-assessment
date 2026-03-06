import { describe, it, expect, vi } from "vitest";

// Mock server-only before importing the module
vi.mock("server-only", () => ({}));

// Mock the safeLog utility to prevent console noise
vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: vi.fn(),
}));

import {
  getRegulatoryChanges,
  hasPendingRegulatoryChanges,
} from "./eurlex-adapter";

// Minimal mock PrismaClient for testing
function createMockPrisma(overrides?: { findMany?: unknown; count?: unknown }) {
  return {
    regulatoryUpdate: {
      findMany: overrides?.findMany ?? vi.fn().mockResolvedValue([]),
      count: overrides?.count ?? vi.fn().mockResolvedValue(0),
    },
  } as never;
}

describe("eurlex-adapter", () => {
  describe("getRegulatoryChanges", () => {
    it("returns an empty array when no regulatory updates exist", async () => {
      const mockPrisma = createMockPrisma();
      const result = await getRegulatoryChanges(mockPrisma);
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("transforms RegulatoryUpdate records to RegulatoryChangeImpact", async () => {
      const mockPrisma = createMockPrisma({
        findMany: vi.fn().mockResolvedValue([
          {
            id: "test-1",
            celexNumber: "32025R0001",
            title: "Test Regulation",
            sourceUrl: "https://eur-lex.europa.eu/test",
            publishedAt: new Date("2025-01-15"),
            severity: "HIGH",
            affectedModules: ["cybersecurity", "debris"],
          },
        ]),
      });

      const result = await getRegulatoryChanges(mockPrisma);
      expect(result).toHaveLength(1);
      expect(result[0]!.event.id).toBe("test-1");
      expect(result[0]!.event.severity).toBe("HIGH");
      expect(result[0]!.event.eurLexUrl).toBe("https://eur-lex.europa.eu/test");
    });

    it("returns empty array on DB error", async () => {
      const mockPrisma = createMockPrisma({
        findMany: vi.fn().mockRejectedValue(new Error("DB connection lost")),
      });

      const result = await getRegulatoryChanges(mockPrisma);
      expect(result).toEqual([]);
    });
  });

  describe("hasPendingRegulatoryChanges", () => {
    it("returns false when no high-priority updates exist", async () => {
      const mockPrisma = createMockPrisma();
      const result = await hasPendingRegulatoryChanges(mockPrisma, "25544");
      expect(result).toBe(false);
    });

    it("returns true when CRITICAL/HIGH updates exist", async () => {
      const mockPrisma = createMockPrisma({
        count: vi.fn().mockResolvedValue(2),
      });
      const result = await hasPendingRegulatoryChanges(mockPrisma, "25544");
      expect(result).toBe(true);
    });

    it("returns false on DB error", async () => {
      const mockPrisma = createMockPrisma({
        count: vi.fn().mockRejectedValue(new Error("DB error")),
      });
      const result = await hasPendingRegulatoryChanges(mockPrisma, "25544");
      expect(result).toBe(false);
    });
  });
});
