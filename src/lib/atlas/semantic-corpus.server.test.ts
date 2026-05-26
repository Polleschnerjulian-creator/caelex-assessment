import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — semantic-corpus test coverage (T0.3).
 *
 * Tests the semantic-search engine that backs `search_legal_sources` /
 * `search_cases` semantic-rerank paths. The engine is gated behind
 * `ATLAS_SEMANTIC_ENABLED=true` to avoid recurring external API
 * spend; coverage verifies both the disabled-default path and the
 * enabled-search-success path (with the `ai` SDK mocked so no real
 * embedding API call happens).
 *
 * Module-level caches (`aiSdkPromise`, `catalogueCache`) force us to
 * use `vi.resetModules()` between tests + dynamic re-import so each
 * test gets a fresh module instance with fresh caches.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* Shared mock spies — declared via vi.hoisted so the factories below
 * can use them. */
const { readFile, embed } = vi.hoisted(() => ({
  readFile: vi.fn(),
  embed: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile },
  readFile,
}));

vi.mock("ai", () => ({
  default: { embed },
  embed,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

beforeEach(() => {
  readFile.mockReset();
  embed.mockReset();
  vi.resetModules(); // clear module-level caches between tests
});

afterEach(() => {
  delete process.env.ATLAS_SEMANTIC_ENABLED;
});

/** Build a fixture catalogue with controllable vectors. */
function makeCatalogue(
  entries: Array<{
    id: string;
    type: string;
    vector: number[];
  }>,
) {
  return entries.map((e) => ({
    id: e.id,
    type: e.type,
    contentHash: "h-" + e.id,
    vector: e.vector,
  }));
}

/** Dynamic re-import so each test sees fresh module state. */
async function importModule() {
  return await import("./semantic-corpus.server");
}

/* ── Disabled-by-default path ──────────────────────────────────────── */

describe("semanticSearch — env flag", () => {
  it("returns null without any I/O when ATLAS_SEMANTIC_ENABLED is unset", async () => {
    delete process.env.ATLAS_SEMANTIC_ENABLED;

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test query");

    expect(result).toBeNull();
    expect(readFile).not.toHaveBeenCalled();
    expect(embed).not.toHaveBeenCalled();
  });

  it("returns null when ATLAS_SEMANTIC_ENABLED is set to anything except 'true'", async () => {
    process.env.ATLAS_SEMANTIC_ENABLED = "1"; // not the magic string

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test query");
    expect(result).toBeNull();
  });
});

/* ── Catalogue-loading path ────────────────────────────────────────── */

describe("semanticSearch — catalogue loading", () => {
  beforeEach(() => {
    process.env.ATLAS_SEMANTIC_ENABLED = "true";
  });

  it("returns null when catalogue file is missing", async () => {
    readFile.mockRejectedValue(new Error("ENOENT: no such file"));

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test");

    expect(result).toBeNull();
    /* embed should not have been called since catalogue failed. */
    expect(embed).not.toHaveBeenCalled();
  });

  it("returns null when catalogue is empty array", async () => {
    readFile.mockResolvedValue(JSON.stringify([]));

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test");
    expect(result).toBeNull();
  });
});

/* ── Embedding-failure path ────────────────────────────────────────── */

describe("semanticSearch — embedding failure", () => {
  beforeEach(() => {
    process.env.ATLAS_SEMANTIC_ENABLED = "true";
    readFile.mockResolvedValue(
      JSON.stringify(
        makeCatalogue([{ id: "source:A", type: "source", vector: [1, 0, 0] }]),
      ),
    );
  });

  it("returns null when embed() throws", async () => {
    embed.mockRejectedValue(new Error("gateway timeout"));

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test query");
    expect(result).toBeNull();
  });
});

/* ── Happy path: scoring + ranking ──────────────────────────────────── */

describe("semanticSearch — scoring + ranking", () => {
  beforeEach(() => {
    process.env.ATLAS_SEMANTIC_ENABLED = "true";
  });

  it("returns scored hits ordered by descending cosine similarity", async () => {
    const catalogue = makeCatalogue([
      { id: "source:A", type: "source", vector: [1, 0, 0] },
      { id: "source:B", type: "source", vector: [0, 1, 0] },
      { id: "source:C", type: "source", vector: [0.7, 0.7, 0] },
    ]);
    readFile.mockResolvedValue(JSON.stringify(catalogue));
    /* Query exactly matches A. */
    embed.mockResolvedValue({ embedding: [1, 0, 0] });

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("query matching A");

    expect(result).not.toBeNull();
    expect(result?.[0]?.entityId).toBe("A");
    expect(result?.[0]?.score).toBeCloseTo(1, 3);
    /* C has 0.7 partial overlap → score ≈ 0.707 → in result.
       B is orthogonal → score = 0 → below MIN_SCORE → excluded. */
    expect(result?.length).toBe(2);
    expect(result?.[1]?.entityId).toBe("C");
  });

  it("filters hits below MIN_SCORE threshold (0.2)", async () => {
    const catalogue = makeCatalogue([
      { id: "source:Good", type: "source", vector: [1, 0] },
      { id: "source:Weak", type: "source", vector: [0.1, 0.99] }, // mostly orthogonal
    ]);
    readFile.mockResolvedValue(JSON.stringify(catalogue));
    embed.mockResolvedValue({ embedding: [1, 0] });

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test");

    expect(result).toHaveLength(1);
    expect(result?.[0]?.entityId).toBe("Good");
  });

  it("strips the type-prefix from id to produce entityId", async () => {
    readFile.mockResolvedValue(
      JSON.stringify(
        makeCatalogue([
          { id: "case:CASE-COSMOS-954-1981", type: "case", vector: [1, 0] },
        ]),
      ),
    );
    embed.mockResolvedValue({ embedding: [1, 0] });

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("cosmos");

    expect(result?.[0]?.id).toBe("case:CASE-COSMOS-954-1981");
    expect(result?.[0]?.entityId).toBe("CASE-COSMOS-954-1981");
    expect(result?.[0]?.type).toBe("case");
  });

  it("falls back to id-as-entityId when no colon prefix present", async () => {
    readFile.mockResolvedValue(
      JSON.stringify(
        makeCatalogue([
          { id: "no-prefix-here", type: "source", vector: [1, 0] },
        ]),
      ),
    );
    embed.mockResolvedValue({ embedding: [1, 0] });

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test");

    expect(result?.[0]?.entityId).toBe("no-prefix-here");
  });

  it("filters by type when types option provided", async () => {
    readFile.mockResolvedValue(
      JSON.stringify(
        makeCatalogue([
          { id: "source:A", type: "source", vector: [1, 0] },
          { id: "case:B", type: "case", vector: [1, 0] },
          { id: "authority:C", type: "authority", vector: [1, 0] },
        ]),
      ),
    );
    embed.mockResolvedValue({ embedding: [1, 0] });

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test", { types: ["case", "source"] });

    expect(result?.map((h) => h.entityId).sort()).toEqual(["A", "B"]);
  });

  it("skips entries with dimension mismatch (NaN-poison guard, H-3)", async () => {
    readFile.mockResolvedValue(
      JSON.stringify(
        makeCatalogue([
          { id: "source:Good", type: "source", vector: [1, 0, 0] },
          /* Wrong dimension (2 vs query 3) — must be skipped silently. */
          { id: "source:Bad", type: "source", vector: [1, 0] },
        ]),
      ),
    );
    embed.mockResolvedValue({ embedding: [1, 0, 0] });

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test");

    expect(result?.map((h) => h.entityId)).toEqual(["Good"]);
    /* No NaN, no crash from accessing undefined vec index. */
    for (const hit of result ?? []) {
      expect(Number.isNaN(hit.score)).toBe(false);
    }
  });

  it("respects custom limit (max 100)", async () => {
    const entries = Array.from({ length: 60 }, (_, i) => ({
      id: `source:S${i}`,
      type: "source",
      vector: [1, 0],
    }));
    readFile.mockResolvedValue(JSON.stringify(makeCatalogue(entries)));
    embed.mockResolvedValue({ embedding: [1, 0] });

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test", { limit: 10 });
    expect(result).toHaveLength(10);
  });

  it("clamps limit to 100 max even when caller asks for more", async () => {
    const entries = Array.from({ length: 200 }, (_, i) => ({
      id: `source:S${i}`,
      type: "source",
      vector: [1, 0],
    }));
    readFile.mockResolvedValue(JSON.stringify(makeCatalogue(entries)));
    embed.mockResolvedValue({ embedding: [1, 0] });

    const { semanticSearch } = await importModule();
    const result = await semanticSearch("test", { limit: 500 });
    expect(result?.length).toBeLessThanOrEqual(100);
  });

  it("calls embed with the configured model + dimensions", async () => {
    readFile.mockResolvedValue(
      JSON.stringify(
        makeCatalogue([{ id: "source:A", type: "source", vector: [1, 0] }]),
      ),
    );
    embed.mockResolvedValue({ embedding: [1, 0] });

    const { semanticSearch } = await importModule();
    await semanticSearch("test query");

    expect(embed).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/text-embedding-3-small",
        value: "test query",
        providerOptions: expect.objectContaining({
          openai: { dimensions: 512 },
        }),
      }),
    );
  });
});
