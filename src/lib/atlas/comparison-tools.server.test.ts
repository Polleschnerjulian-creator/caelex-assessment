import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Comparison-Tools bundle smoke-tests (Atlas V3 T0.1.f).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasUpdate: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import {
  COMPARISON_TOOLS,
  isComparisonToolName,
  executeComparisonTool,
} from "./comparison-tools.server";

describe("comparison-tools bundle", () => {
  describe("COMPARISON_TOOLS schema", () => {
    it("exports exactly 2 tools", () => {
      expect(COMPARISON_TOOLS).toHaveLength(2);
      const names = COMPARISON_TOOLS.map((t) => t.name).sort();
      expect(names).toEqual([
        "compare_jurisdictions_for_filing",
        "summarize_changes_since",
      ]);
    });

    it("summarize_changes_since requires 'since' field", () => {
      const tool = COMPARISON_TOOLS.find(
        (t) => t.name === "summarize_changes_since",
      );
      const schema = tool?.input_schema as { required?: string[] };
      expect(schema.required).toEqual(["since"]);
    });

    it("compare_jurisdictions_for_filing accepts 10-criterion enum", () => {
      const tool = COMPARISON_TOOLS.find(
        (t) => t.name === "compare_jurisdictions_for_filing",
      );
      const schema = tool?.input_schema as {
        properties: {
          criteria: { items: { enum: string[] } };
        };
      };
      expect(schema.properties.criteria.items.enum).toHaveLength(10);
      expect(schema.properties.criteria.items.enum).toContain("insurance_cap");
      expect(schema.properties.criteria.items.enum).toContain("pmd_timeline");
    });
  });

  describe("isComparisonToolName", () => {
    it("returns true for both comparison tool names", () => {
      expect(isComparisonToolName("compare_jurisdictions_for_filing")).toBe(
        true,
      );
      expect(isComparisonToolName("summarize_changes_since")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isComparisonToolName("search_legal_sources")).toBe(false);
      expect(isComparisonToolName("get_filing_deadlines")).toBe(false);
      expect(isComparisonToolName("")).toBe(false);
    });
  });

  describe("executeComparisonTool — compare_jurisdictions_for_filing", () => {
    it("returns matrix with default jurisdictions when empty input", async () => {
      const result = await executeComparisonTool({
        name: "compare_jurisdictions_for_filing",
        input: {},
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.drafting_mode).toBe("jurisdiction_comparison");
      expect(payload.jurisdictions).toEqual([
        "US",
        "UK",
        "FR",
        "DE",
        "IT",
        "NL",
        "AU",
        "NZ",
      ]);
      expect(payload.criteria.length).toBe(5); // DEFAULT_CRITERIA
      expect(Array.isArray(payload.matrix)).toBe(true);
      expect(payload.coverage_pct).toBeGreaterThanOrEqual(0);
      expect(payload.coverage_pct).toBeLessThanOrEqual(100);
    });

    it("respects custom jurisdiction list (uppercases input)", async () => {
      const result = await executeComparisonTool({
        name: "compare_jurisdictions_for_filing",
        input: { candidate_jurisdictions: ["de", "fr"] },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.jurisdictions).toEqual(["DE", "FR"]);
    });

    it("rejects malformed jurisdiction code (4 digits)", async () => {
      const result = await executeComparisonTool({
        name: "compare_jurisdictions_for_filing",
        input: { candidate_jurisdictions: ["1234"] },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("INVALID_INPUT");
    });

    it("respects criteria filter", async () => {
      const result = await executeComparisonTool({
        name: "compare_jurisdictions_for_filing",
        input: { criteria: ["insurance_cap", "pmd_timeline"] },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.criteria).toEqual(["insurance_cap", "pmd_timeline"]);
    });
  });

  describe("executeComparisonTool — summarize_changes_since", () => {
    it("rejects invalid date format", async () => {
      const result = await executeComparisonTool({
        name: "summarize_changes_since",
        input: { since: "not-a-date" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("INVALID_INPUT");
    });

    it("returns ordered headlines + counts for valid date", async () => {
      const result = await executeComparisonTool({
        name: "summarize_changes_since",
        input: { since: "2020-01-01" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.since).toBe("2020-01-01");
      expect(payload.counts).toMatchObject({
        amendments: expect.any(Number),
        lifecycle: expect.any(Number),
        updates: expect.any(Number),
        total: expect.any(Number),
      });
      expect(Array.isArray(payload.headlines)).toBe(true);
      expect(payload.headlines.length).toBeLessThanOrEqual(5);
    });

    it("respects jurisdiction filter", async () => {
      const result = await executeComparisonTool({
        name: "summarize_changes_since",
        input: { since: "2020-01-01", jurisdiction: "DE" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.scope.jurisdiction).toBe("DE");
    });

    it("respects source_ids filter", async () => {
      const result = await executeComparisonTool({
        name: "summarize_changes_since",
        input: {
          since: "2020-01-01",
          source_ids: ["EU-NIS2-2022", "UK-SIA-2018"],
        },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.scope.source_ids).toEqual(["EU-NIS2-2022", "UK-SIA-2018"]);
    });
  });

  describe("executeComparisonTool — unknown tool", () => {
    it("returns isError for unhandled name", async () => {
      const result = await executeComparisonTool({
        name: "bogus_tool" as never,
        input: {},
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown comparison");
    });
  });
});
