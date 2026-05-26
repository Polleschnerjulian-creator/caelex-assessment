import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Korpus-Tools bundle smoke-tests (Atlas V3 T0.1.d).
 *
 * Data corpus (ALL_SOURCES, ATLAS_CASES) is imported real — no Prisma,
 * no Anthropic. semanticSearch is mocked to return null (fail-soft)
 * so tests don't require AI Gateway connectivity.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("./semantic-corpus.server", () => ({
  semanticSearch: vi.fn().mockResolvedValue(null),
}));

import {
  KORPUS_TOOLS,
  isKorpusToolName,
  executeKorpusTool,
} from "./korpus-tools.server";

describe("korpus-tools bundle", () => {
  describe("KORPUS_TOOLS schema", () => {
    it("exports exactly 5 tools", () => {
      expect(KORPUS_TOOLS).toHaveLength(5);
      const names = KORPUS_TOOLS.map((t) => t.name).sort();
      expect(names).toEqual([
        "get_case_by_id",
        "get_legal_source_by_id",
        "list_jurisdiction_authorities",
        "search_cases",
        "search_legal_sources",
      ]);
    });

    it("search_legal_sources requires query", () => {
      const tool = KORPUS_TOOLS.find((t) => t.name === "search_legal_sources");
      const schema = tool?.input_schema as { required?: string[] };
      expect(schema.required).toEqual(["query"]);
    });

    it("get_case_by_id requires case_id", () => {
      const tool = KORPUS_TOOLS.find((t) => t.name === "get_case_by_id");
      const schema = tool?.input_schema as { required?: string[] };
      expect(schema.required).toEqual(["case_id"]);
    });
  });

  describe("isKorpusToolName", () => {
    it("returns true for all 5 korpus tool names", () => {
      expect(isKorpusToolName("search_legal_sources")).toBe(true);
      expect(isKorpusToolName("get_legal_source_by_id")).toBe(true);
      expect(isKorpusToolName("list_jurisdiction_authorities")).toBe(true);
      expect(isKorpusToolName("search_cases")).toBe(true);
      expect(isKorpusToolName("get_case_by_id")).toBe(true);
    });

    it("returns false for unrelated names", () => {
      expect(isKorpusToolName("draft_schriftsatz")).toBe(false);
      expect(isKorpusToolName("get_org_branding")).toBe(false);
      expect(isKorpusToolName("")).toBe(false);
    });
  });

  describe("executeKorpusTool — search_legal_sources", () => {
    it("rejects invalid input (query too short)", async () => {
      const result = await executeKorpusTool({
        name: "search_legal_sources",
        input: { query: "x" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("INVALID_INPUT");
    });

    it("returns a hits-array (even if empty) for valid input", async () => {
      const result = await executeKorpusTool({
        name: "search_legal_sources",
        input: { query: "extremely-rare-token-zzz" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(Array.isArray(payload.hits)).toBe(true);
      expect(payload.hit_count).toBe(payload.hits.length);
      expect(payload.semantic_available).toBe(false); // mocked to null
    });

    it("respects jurisdiction filter", async () => {
      const result = await executeKorpusTool({
        name: "search_legal_sources",
        input: { query: "space", jurisdiction: "DE" },
      });
      const payload = JSON.parse(result.content);
      expect(payload.filters.jurisdiction).toBe("DE");
    });
  });

  describe("executeKorpusTool — get_legal_source_by_id", () => {
    it("returns NOT_FOUND for invalid id", async () => {
      const result = await executeKorpusTool({
        name: "get_legal_source_by_id",
        input: { source_id: "BOGUS-ID-NOT-EXISTING" },
      });
      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content);
      expect(payload.code).toBe("NOT_FOUND");
    });

    it("rejects malformed source_id (lowercase prefix)", async () => {
      const result = await executeKorpusTool({
        name: "get_legal_source_by_id",
        input: { source_id: "lower-case" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("INVALID_INPUT");
    });
  });

  describe("executeKorpusTool — list_jurisdiction_authorities", () => {
    it("returns hint when no authorities catalogued", async () => {
      const result = await executeKorpusTool({
        name: "list_jurisdiction_authorities",
        input: { jurisdiction: "XX" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.authority_count).toBe(0);
      expect(payload.hint).toContain("No authorities");
    });

    it("rejects invalid jurisdiction code (digits)", async () => {
      const result = await executeKorpusTool({
        name: "list_jurisdiction_authorities",
        input: { jurisdiction: "12" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("INVALID_INPUT");
    });

    it("uppercases lowercase jurisdiction input", async () => {
      const result = await executeKorpusTool({
        name: "list_jurisdiction_authorities",
        input: { jurisdiction: "de" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.jurisdiction).toBe("DE");
    });
  });

  describe("executeKorpusTool — search_cases", () => {
    it("returns ordered candidates when no query (filter-only)", async () => {
      const result = await executeKorpusTool({
        name: "search_cases",
        input: { jurisdiction: "US" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(Array.isArray(payload.hits)).toBe(true);
      expect(payload.filters.jurisdiction).toBe("US");
    });

    it("scores by query relevance when query supplied", async () => {
      const result = await executeKorpusTool({
        name: "search_cases",
        input: { query: "cosmos" },
      });
      expect(result.isError).toBe(false);
      const payload = JSON.parse(result.content);
      expect(payload.query).toBe("cosmos");
    });
  });

  describe("executeKorpusTool — get_case_by_id", () => {
    it("rejects malformed case_id (no CASE- prefix)", async () => {
      const result = await executeKorpusTool({
        name: "get_case_by_id",
        input: { case_id: "no-prefix" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("INVALID_INPUT");
    });

    it("returns NOT_FOUND for unknown case", async () => {
      const result = await executeKorpusTool({
        name: "get_case_by_id",
        input: { case_id: "CASE-NONEXISTENT-2099" },
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).code).toBe("NOT_FOUND");
    });
  });

  describe("executeKorpusTool — unknown tool", () => {
    it("returns isError for unhandled name", async () => {
      const result = await executeKorpusTool({
        name: "bogus_tool" as never,
        input: {},
      });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content).error).toContain("Unknown korpus");
    });
  });
});
