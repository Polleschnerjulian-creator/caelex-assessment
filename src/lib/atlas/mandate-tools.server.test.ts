import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Mandate-Tools bundle smoke-tests (Atlas V3 T0.1.b).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    legalMatter: {
      findMany: vi.fn(),
    },
    atlasMandate: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  MANDATE_TOOLS,
  isMandateToolName,
  executeMandateTool,
} from "./mandate-tools.server";

describe("mandate-tools bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MANDATE_TOOLS schema", () => {
    it("exports 2 tools (find_or_open_matter + search_mandate_vault)", () => {
      expect(MANDATE_TOOLS).toHaveLength(2);
      const names = MANDATE_TOOLS.map((t) => t.name).sort();
      expect(names).toEqual(["find_or_open_matter", "search_mandate_vault"]);
    });

    it("find_or_open_matter declares query + action as required", () => {
      const tool = MANDATE_TOOLS.find((t) => t.name === "find_or_open_matter");
      const schema = tool?.input_schema as { required?: string[] };
      expect(schema?.required).toContain("query");
      expect(schema?.required).toContain("action");
    });

    it("search_mandate_vault declares query as required", () => {
      const tool = MANDATE_TOOLS.find((t) => t.name === "search_mandate_vault");
      const schema = tool?.input_schema as { required?: string[] };
      expect(schema?.required).toEqual(["query"]);
    });
  });

  describe("isMandateToolName", () => {
    it("returns true for both mandate tool names", () => {
      expect(isMandateToolName("find_or_open_matter")).toBe(true);
      expect(isMandateToolName("search_mandate_vault")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isMandateToolName("search_legal_sources")).toBe(false);
      expect(isMandateToolName("create_solo_matter")).toBe(false);
      expect(isMandateToolName("")).toBe(false);
    });
  });

  describe("executeMandateTool — find_or_open_matter (search)", () => {
    it("rejects invalid input (short query)", async () => {
      const result = await executeMandateTool({
        name: "find_or_open_matter",
        input: { query: "a", action: "search" },
        callerOrgId: "org_test_1",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("INVALID_INPUT");
    });

    it("returns empty matches list when no rows", async () => {
      vi.mocked(prisma.legalMatter.findMany).mockResolvedValueOnce([] as never);
      const result = await executeMandateTool({
        name: "find_or_open_matter",
        input: { query: "spire", action: "search" },
        callerOrgId: "org_test_2",
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.totalMatches).toBe(0);
      expect(payload.activeMatches).toBe(0);
      expect(payload.matches).toEqual([]);
      expect(payload.navigate).toBeNull();
      expect(result.navigateUrl).toBeUndefined();
    });

    it("returns candidates with null clientName for solo-matters", async () => {
      vi.mocked(prisma.legalMatter.findMany).mockResolvedValueOnce([
        {
          id: "m1",
          name: "Solo Test",
          reference: "M-2026-001",
          status: "ACTIVE",
          updatedAt: new Date(),
          clientOrg: null,
        },
      ] as never);
      const result = await executeMandateTool({
        name: "find_or_open_matter",
        input: { query: "solo", action: "search" },
        callerOrgId: "org_test_3",
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.matches[0].clientName).toBeNull();
      expect(payload.matches[0].canOpen).toBe(true);
    });
  });

  describe("executeMandateTool — find_or_open_matter (open)", () => {
    it("sets navigateUrl when single ACTIVE match + action=open", async () => {
      vi.mocked(prisma.legalMatter.findMany).mockResolvedValueOnce([
        {
          id: "m42",
          name: "Spire Authorization",
          reference: "M-2026-042",
          status: "ACTIVE",
          updatedAt: new Date(),
          clientOrg: { id: "c1", name: "Spire Global" },
        },
      ] as never);
      const result = await executeMandateTool({
        name: "find_or_open_matter",
        input: { query: "Spire Authorization", action: "open" },
        callerOrgId: "org_test_4",
      });
      expect(result.isError).toBe(false);
      expect(result.navigateUrl).toBe("/atlas/network/m42/workspace");
      const payload = JSON.parse(result.content);
      expect(payload.navigate).toBe("/atlas/network/m42/workspace");
    });

    it("does NOT set navigateUrl on multi-match even with action=open", async () => {
      vi.mocked(prisma.legalMatter.findMany).mockResolvedValueOnce([
        {
          id: "m1",
          name: "Spire 1",
          reference: "R1",
          status: "ACTIVE",
          updatedAt: new Date(),
          clientOrg: { id: "c1", name: "Spire" },
        },
        {
          id: "m2",
          name: "Spire 2",
          reference: "R2",
          status: "ACTIVE",
          updatedAt: new Date(),
          clientOrg: { id: "c1", name: "Spire" },
        },
      ] as never);
      const result = await executeMandateTool({
        name: "find_or_open_matter",
        input: { query: "spire", action: "open" },
        callerOrgId: "org_test_5",
      });
      expect(result.navigateUrl).toBeUndefined();
    });

    it("does NOT set navigateUrl when single match is SUSPENDED", async () => {
      vi.mocked(prisma.legalMatter.findMany).mockResolvedValueOnce([
        {
          id: "m99",
          name: "Old Mandate",
          reference: "R99",
          status: "SUSPENDED",
          updatedAt: new Date(),
          clientOrg: null,
        },
      ] as never);
      const result = await executeMandateTool({
        name: "find_or_open_matter",
        input: { query: "Old", action: "open" },
        callerOrgId: "org_test_6",
      });
      expect(result.navigateUrl).toBeUndefined();
      const payload = JSON.parse(result.content);
      expect(payload.activeMatches).toBe(0);
      expect(payload.matches[0].canOpen).toBe(false);
    });
  });

  describe("executeMandateTool — unknown tool", () => {
    it("returns isError for unhandled name", async () => {
      const result = await executeMandateTool({
        name: "bogus_tool" as never,
        input: {},
        callerOrgId: "org_test_7",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown mandate");
    });
  });

  describe("executeMandateTool — search_mandate_vault (gates)", () => {
    it("refuses when no mandate attached", async () => {
      const result = await executeMandateTool({
        name: "search_mandate_vault",
        input: { query: "frequency coordination" },
        callerOrgId: "org_test_8",
        mandateId: null,
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Kein Mandat");
    });

    it("rejects too-short query (zod validation)", async () => {
      const result = await executeMandateTool({
        name: "search_mandate_vault",
        input: { query: "x" }, // < 3 chars
        callerOrgId: "org_test_9",
        mandateId: "m_test",
      });
      expect(result.isError).toBe(true);
    });

    it("denies vault search for a non-member of the mandate (M3)", async () => {
      vi.mocked(prisma.atlasMandate.findFirst).mockResolvedValue(null);
      const result = await executeMandateTool({
        name: "search_mandate_vault",
        input: { query: "frequency coordination" },
        callerUserId: "user_outsider",
        callerOrgId: "org_test_10",
        mandateId: "m_not_mine",
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Kein Zugriff");
    });
  });
});
