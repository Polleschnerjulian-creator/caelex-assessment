import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/atlas/korpus-tools.server", () => ({
  executeKorpusTool: vi.fn(),
}));
vi.mock("@/data/legal-sources", () => ({
  getLegalSourceById: vi.fn((id: string) => {
    if (id === "DE-SATDSIG-2007") {
      return {
        relevance_level: "high",
        official_reference: "BGBl. I 2007 S. 2278",
      };
    }
    return undefined;
  }),
  // Used by the keyword-only (semantic-opted-out) path.
  ALL_SOURCES: [
    {
      id: "DE-SATDSIG-2007",
      jurisdiction: "DE",
      type: "federal_law",
      status: "in_force",
      title_en: "Satellite Data Security Act",
      title_local: "Satellitendatensicherheitsgesetz",
      scope_description: "EO operators only",
      key_provisions: [
        { title: "Licensing", summary: "operators must register" },
      ],
      compliance_areas: ["data_security"],
      relevance_level: "high",
      official_reference: "BGBl. I 2007 S. 2278",
    },
  ],
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
          snippet: "EO operators only",
          score: 0.8,
          keywordScore: 0.6,
          semanticScore: 0.9,
          relevanceLevel: "high",
          officialReference: "BGBl. I 2007 S. 2278",
        },
      ],
    });
  });

  it("falls back to null snippet + null sub-scores when the engine omits them", async () => {
    mockExec.mockResolvedValue({
      isError: false,
      content: JSON.stringify({
        query: "satellite",
        filters: {},
        hit_count: 1,
        semantic_available: false,
        hint: "",
        hits: [
          {
            id: "DE-SATDSIG-2007",
            jurisdiction: "DE",
            type: "federal_law",
            status: "in_force",
            title: "Satellite Data Security Act",
            score: 0.4,
            // scope_description, keyword_score, semantic_score all omitted
          },
        ],
      }),
    });
    const out = await scholarSearchSources({ query: "satellite" });
    expect(out.semanticAvailable).toBe(false);
    expect(out.hits[0]).toMatchObject({
      scopeDescription: null,
      snippet: null,
      keywordScore: null,
      semanticScore: null,
      relevanceLevel: "high", // still enriched from the source record
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

  it("uses a keyword-only path (NO embedding call) when semantic is opted out", async () => {
    const out = await scholarSearchSources(
      { query: "satellite" },
      { semantic: false },
    );
    // The paid hybrid engine (which embeds the query via OpenAI) is NEVER invoked.
    expect(mockExec).not.toHaveBeenCalled();
    expect(out.semanticAvailable).toBe(false);
    expect(out.hits[0]).toMatchObject({
      id: "DE-SATDSIG-2007",
      title: "Satellite Data Security Act",
      semanticScore: null,
      relevanceLevel: "high",
    });
    expect(out.hits[0].score).toBeGreaterThan(0);
  });

  it("still uses the hybrid engine when semantic is opted in", async () => {
    mockExec.mockResolvedValue({
      isError: false,
      content: JSON.stringify({
        query: "satellite",
        filters: {},
        hit_count: 0,
        semantic_available: true,
        hint: "",
        hits: [],
      }),
    });
    await scholarSearchSources({ query: "satellite" }, { semantic: true });
    expect(mockExec).toHaveBeenCalledTimes(1);
  });
});
