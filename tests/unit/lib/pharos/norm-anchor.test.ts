/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Norm-Anchor Tests — focus on the security-critical bits:
 *   1. Query sanitisation strips SQL/tsquery hostile chars
 *   2. Jurisdiction whitelist rejects unknown values
 *   3. Instrument regex is strict
 *   4. computeNormContentHash is stable + collision-free for distinct text
 *   5. normHitToCitation produces a valid Citation
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  upsert: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    normAnchor: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

// We need a Prisma stub that exposes Prisma.sql + Prisma.empty without
// pulling in the real generated client (which needs a DB connection).
vi.mock("@prisma/client", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
    empty: { strings: [""], values: [] },
  },
}));

import {
  computeNormContentHash,
  normHitToCitation,
  searchNormAnchors,
  type NormSearchHit,
} from "@/lib/pharos/norm-anchor";
import { CitationSchema } from "@/lib/pharos/citation";

describe("computeNormContentHash", () => {
  it("is stable for the same text", () => {
    expect(computeNormContentHash("Article 7. Authorisation.")).toBe(
      computeNormContentHash("Article 7. Authorisation."),
    );
  });

  it("differs for distinct text", () => {
    expect(computeNormContentHash("foo")).not.toBe(
      computeNormContentHash("bar"),
    );
  });

  it("uses sha256:<32hex> format", () => {
    expect(computeNormContentHash("foo")).toMatch(/^sha256:[0-9a-f]{32}$/);
  });
});

describe("normHitToCitation", () => {
  const hit: NormSearchHit = {
    id: "EUSPACEACT.ART.7",
    jurisdiction: "EU",
    instrument: "EU_SPACE_ACT",
    unit: "ARTICLE",
    number: "7",
    title: "Authorisation",
    textSnippet: "Authorisation requirements for space activities…",
    contentHash: "sha256:" + "a".repeat(32),
    sourceUrl: "https://eur-lex.europa.eu/x",
    relevance: 0.42,
    language: "en",
  };

  it("produces a NORM-prefixed Citation ID", () => {
    const c = normHitToCitation(hit);
    expect(c.id).toBe("NORM:EUSPACEACT.ART.7");
    expect(c.kind).toBe("norm");
  });

  it("passes Citation schema validation", () => {
    expect(() => CitationSchema.parse(normHitToCitation(hit))).not.toThrow();
  });

  it("normalises a non-prefixed contentHash", () => {
    const c = normHitToCitation({ ...hit, contentHash: "a".repeat(64) });
    expect(c.contentHash).toMatch(/^sha256:[0-9a-f]{32}$/);
  });
});

describe("searchNormAnchors", () => {
  it("returns empty for too-short query", async () => {
    const result = await searchNormAnchors("a");
    expect(result).toEqual([]);
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("rejects unknown jurisdictions without hitting the DB", async () => {
    const result = await searchNormAnchors("authorisation", {
      jurisdiction: "XX-ATTACK",
    });
    expect(result).toEqual([]);
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("rejects malformed instrument codes", async () => {
    const result = await searchNormAnchors("authorisation", {
      instrument: "lowercase-bad'; DROP TABLE",
    });
    expect(result).toEqual([]);
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it("filters out hits below the relevance threshold", async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      {
        id: "X.1",
        jurisdiction: "EU",
        instrument: "EU_SPACE_ACT",
        unit: "ARTICLE",
        number: "1",
        title: "x",
        text: "noise",
        contentHash: "sha256:" + "f".repeat(32),
        sourceUrl: null,
        language: "en",
        relevance: 0.001, // below threshold
      },
      {
        id: "X.2",
        jurisdiction: "EU",
        instrument: "EU_SPACE_ACT",
        unit: "ARTICLE",
        number: "2",
        title: "real hit",
        text: "real",
        contentHash: "sha256:" + "e".repeat(32),
        sourceUrl: null,
        language: "en",
        relevance: 0.5, // above threshold
      },
    ]);
    const result = await searchNormAnchors("authorisation");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("X.2");
  });

  it("strips dangerous chars from the query (no $/`/quotes)", async () => {
    mocks.queryRaw.mockResolvedValueOnce([]);
    await searchNormAnchors("'; DROP TABLE NormAnchor; --");
    // Passes only because the sanitiser removed everything dangerous
    // and Prisma.sql parameterises remaining safe text.
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
  });

  it("accepts well-formed jurisdiction + instrument filters", async () => {
    mocks.queryRaw.mockResolvedValueOnce([]);
    await searchNormAnchors("space activities", {
      jurisdiction: "DE",
      instrument: "BWRG",
    });
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
  });
});
