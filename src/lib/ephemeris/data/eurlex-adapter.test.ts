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

describe("eurlex-adapter", () => {
  describe("getRegulatoryChanges", () => {
    it("returns an empty array (Phase 1 stub)", async () => {
      const result = await getRegulatoryChanges();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("hasPendingRegulatoryChanges", () => {
    it("returns false for any NORAD ID (Phase 1 stub)", async () => {
      const result = await hasPendingRegulatoryChanges("25544");
      expect(result).toBe(false);
    });

    it("returns false for an empty string", async () => {
      const result = await hasPendingRegulatoryChanges("");
      expect(result).toBe(false);
    });
  });
});
