import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/atlas/korpus-tools.server", () => ({
  executeKorpusTool: vi.fn(),
}));

import { executeKorpusTool } from "@/lib/atlas/korpus-tools.server";
import { scholarSearchSources } from "./scholar-search.server";

const mockExec = vi.mocked(executeKorpusTool);
beforeEach(() => vi.clearAllMocks());

describe("scholarSearchSources", () => {
  it("maps the engine result into the Scholar DTO", async () => {
    mockExec.mockResolvedValue({
      isError: false,
      content: JSON.stringify({
        query: "satellite",
        filters: {},
        hit_count: 1,
        semantic_available: true,
        hint: "",
        hits: [
          {
            id: "DE-SATDSIG-2007",
            jurisdiction: "DE",
            type: "federal_law",
            status: "in_force",
            title: "Satellite Data Security Act",
            scope_description: "EO operators only",
            score: 0.8,
            keyword_score: 0.6,
            semantic_score: 0.9,
          },
        ],
      }),
    });
    const out = await scholarSearchSources({ query: "satellite" });
    expect(out).toEqual({
      query: "satellite",
      hitCount: 1,
      semanticAvailable: true,
      hits: [
        {
          id: "DE-SATDSIG-2007",
          jurisdiction: "DE",
          type: "federal_law",
          status: "in_force",
          title: "Satellite Data Security Act",
          scopeDescription: "EO operators only",
          score: 0.8,
        },
      ],
    });
  });

  it("calls search_legal_sources with mapped snake_case filters", async () => {
    mockExec.mockResolvedValue({
      isError: false,
      content: JSON.stringify({
        query: "x",
        filters: {},
        hit_count: 0,
        semantic_available: false,
        hint: "",
        hits: [],
      }),
    });
    await scholarSearchSources({
      query: "x",
      jurisdiction: "DE",
      type: "treaty",
      complianceArea: "licensing",
    });
    expect(mockExec).toHaveBeenCalledWith({
      name: "search_legal_sources",
      input: {
        query: "x",
        jurisdiction: "DE",
        type: "treaty",
        compliance_area: "licensing",
      },
    });
  });

  it("throws when the engine returns isError", async () => {
    mockExec.mockResolvedValue({
      isError: true,
      content: JSON.stringify({
        error: "Invalid tool input",
        code: "INVALID_INPUT",
      }),
    });
    await expect(scholarSearchSources({ query: "x" })).rejects.toThrow();
  });
});
