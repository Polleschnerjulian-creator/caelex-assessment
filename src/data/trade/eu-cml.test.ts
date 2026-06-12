/**
 * Data-Sprint S4 — Tests for the EU Common Military List (space slice).
 *
 * The EU Common Military List ("Gemeinsame Militärgüterliste der EU") is the
 * military-goods counterpart to the EU dual-use Annex I (Reg. 2021/821). It is
 * adopted ANNUALLY by the Council as a notice in the OJ C series under Council
 * Common Position 2008/944/CFSP. The edition curated here is the one adopted on
 * 23 February 2026 (OJ C/2026/1640, 13 March 2026 — CELEX 52026XG01640), the
 * current edition superseding the 24 February 2025 list.
 *
 * The list runs ML1–ML22. This file curates the SPACE SLICE — the positions a
 * satellite / launcher / EO operator can plausibly touch on the military leg:
 *   ML4  (rockets, missiles), ML10 (aircraft incl. SUB-ORBITAL craft),
 *   ML11 (electronic equipment + the explicit SPACECRAFT position + sat-nav
 *        jamming), ML15 (military imaging), ML18 (production/test facilities),
 *   ML19 (directed-energy weapons), ML20 (cryogenic/superconductive incl. the
 *        explicit SPACE-applications sub-position), ML21 (software shadow),
 *   ML22 (technology shadow).
 *
 * Contract enforced by these tests (the plan's W2 invariant template):
 *
 *   1. Coverage threshold — ≥ 20 enumerated entries (the space slice).
 *   2. Code format — every code matches /^ML\d{1,2}/ (with sub-letters as the
 *      source structures them, e.g. "ML11.c").
 *   3. Provenance — every entry has an eur-lex sourceUrl, an ISO asOfDate, and
 *      a description > 20 chars.
 *   4. Uniqueness — no duplicate codes.
 *   5. Coverage honesty — the exported coverage object declares a non-empty
 *      `excluded` list (the non-space ML positions).
 *   6. Regime tagging — every entry is tagged for the EU_CML regime.
 *   7. Staleness — asOfDate within 365 days of today.
 *
 * Source: EU Common Military List adopted by the Council on 23 February 2026,
 *   OJ C/2026/1640 (CELEX 52026XG01640). Zero external cost — official free
 *   EUR-Lex publication.
 */

import { describe, it, expect } from "vitest";

import {
  EU_CML_ENTRIES,
  EU_CML_COVERAGE,
  EU_CML_AS_OF,
  findEuCmlEntry,
} from "./eu-cml";

// ─── 1. Coverage threshold ────────────────────────────────────────────

describe("EU CML — coverage threshold", () => {
  it("has at least 20 entries (the space slice)", () => {
    expect(EU_CML_ENTRIES.length).toBeGreaterThanOrEqual(20);
  });
});

// ─── 2. Code format ───────────────────────────────────────────────────

describe("EU CML — code format", () => {
  it("every code matches the ML position format /^ML\\d{1,2}/", () => {
    const pattern = /^ML\d{1,2}/;
    for (const e of EU_CML_ENTRIES) {
      expect(
        pattern.test(e.code),
        `code '${e.code}' does not match /^ML\\d{1,2}/`,
      ).toBe(true);
    }
  });

  it("carries the explicit ML11.c spacecraft position (the space-munitions entry)", () => {
    expect(EU_CML_ENTRIES.some((e) => e.code === "ML11.c")).toBe(true);
  });
});

// ─── 3. Provenance ────────────────────────────────────────────────────

describe("EU CML — provenance", () => {
  it("every entry has a eur-lex sourceUrl + ISO asOfDate + description > 20 chars", () => {
    for (const e of EU_CML_ENTRIES) {
      expect(e.sourceUrl, `entry ${e.code} sourceUrl`).toMatch(
        /^https:\/\/eur-lex\.europa\.eu/,
      );
      expect(e.asOfDate, `entry ${e.code} asOfDate`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(
        e.description.length,
        `entry ${e.code} description too short`,
      ).toBeGreaterThan(20);
    }
  });

  it("every title is non-empty and ≤ 100 chars", () => {
    for (const e of EU_CML_ENTRIES) {
      expect(e.title.length, `entry ${e.code} title empty`).toBeGreaterThan(0);
      expect(
        e.title.length,
        `entry ${e.code} title too long`,
      ).toBeLessThanOrEqual(100);
    }
  });
});

// ─── 4. Uniqueness ────────────────────────────────────────────────────

describe("EU CML — uniqueness", () => {
  it("has no duplicate codes", () => {
    const codes = EU_CML_ENTRIES.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

// ─── 5. Coverage honesty ──────────────────────────────────────────────

describe("EU CML — coverage honesty", () => {
  it("declares a non-empty exclusion list (the non-space ML positions)", () => {
    expect(EU_CML_COVERAGE.excluded.length).toBeGreaterThan(0);
  });

  it("coverage count matches the actual entry count", () => {
    expect(EU_CML_COVERAGE.caelexCoverageCount).toBe(EU_CML_ENTRIES.length);
  });
});

// ─── 6. Regime tagging ────────────────────────────────────────────────

describe("EU CML — regime tagging", () => {
  it("every entry is tagged for the EU_CML regime", () => {
    for (const e of EU_CML_ENTRIES) {
      expect(e.regime, `entry ${e.code} regime`).toBe("EU_CML");
    }
  });
});

// ─── 7. Staleness ─────────────────────────────────────────────────────

describe("EU CML — staleness", () => {
  it("the file-level asOfDate is within 365 days of today (not stale, not absurdly future)", () => {
    const asOf = new Date(EU_CML_AS_OF).getTime();
    const ageDays = (Date.now() - asOf) / (1000 * 60 * 60 * 24);
    expect(ageDays).toBeLessThan(365);
    expect(ageDays).toBeGreaterThan(-2);
  });
});

// ─── 8. Lookup helper ─────────────────────────────────────────────────

describe("EU CML — lookup", () => {
  it("findEuCmlEntry resolves a known code case-insensitively", () => {
    const e = findEuCmlEntry("ml11.c");
    expect(e).toBeDefined();
    expect(e?.code).toBe("ML11.c");
  });

  it("returns undefined for an unknown code", () => {
    expect(findEuCmlEntry("ML99")).toBeUndefined();
  });
});
