import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    apiRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

// Mock security audit service
vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: vi.fn(),
}));

import { API_SCOPES } from "@/lib/services/api-key-service";

describe("API Key Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("API_SCOPES", () => {
    it("should have compliance scopes", () => {
      expect(API_SCOPES["read:compliance"]).toBeDefined();
      expect(API_SCOPES["write:compliance"]).toBeDefined();
    });

    it("should have spacecraft scopes", () => {
      expect(API_SCOPES["read:spacecraft"]).toBeDefined();
      expect(API_SCOPES["write:spacecraft"]).toBeDefined();
    });

    it("should have reports scopes", () => {
      expect(API_SCOPES["read:reports"]).toBeDefined();
      expect(API_SCOPES["write:reports"]).toBeDefined();
    });

    it("should have incidents scopes", () => {
      expect(API_SCOPES["read:incidents"]).toBeDefined();
      expect(API_SCOPES["write:incidents"]).toBeDefined();
    });

    it("should have deadlines scope", () => {
      expect(API_SCOPES["read:deadlines"]).toBeDefined();
    });

    it("should have documents scopes", () => {
      expect(API_SCOPES["read:documents"]).toBeDefined();
      expect(API_SCOPES["write:documents"]).toBeDefined();
    });

    it("should have organization scope", () => {
      expect(API_SCOPES["read:organization"]).toBeDefined();
    });

    it("should have audit scope", () => {
      expect(API_SCOPES["read:audit"]).toBeDefined();
    });

    it("should have descriptions for all scopes", () => {
      for (const [scope, description] of Object.entries(API_SCOPES)) {
        expect(typeof description).toBe("string");
        expect(description.length).toBeGreaterThan(0);
      }
    });

    it("should have read and write pattern for most resources", () => {
      const readScopes = Object.keys(API_SCOPES).filter((s) =>
        s.startsWith("read:"),
      );
      const writeScopes = Object.keys(API_SCOPES).filter((s) =>
        s.startsWith("write:"),
      );

      expect(readScopes.length).toBeGreaterThan(0);
      expect(writeScopes.length).toBeGreaterThan(0);
    });
  });

  describe("Scope organization", () => {
    it("should categorize scopes by resource", () => {
      const scopes = Object.keys(API_SCOPES);
      const resources = new Set(scopes.map((s) => s.split(":")[1]));

      expect(resources.has("compliance")).toBe(true);
      expect(resources.has("spacecraft")).toBe(true);
      expect(resources.has("reports")).toBe(true);
      expect(resources.has("incidents")).toBe(true);
      expect(resources.has("deadlines")).toBe(true);
      expect(resources.has("documents")).toBe(true);
      expect(resources.has("organization")).toBe(true);
      expect(resources.has("audit")).toBe(true);
    });

    it("should have valid scope format", () => {
      const scopes = Object.keys(API_SCOPES);
      for (const scope of scopes) {
        expect(scope).toMatch(/^(read|write):\w+$/);
      }
    });
  });
});
