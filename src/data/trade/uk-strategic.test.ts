/**
 * Data-Sprint S3 — Tests for the UK Strategic Export Control List space slice.
 *
 * The UK consolidated list (gov.uk, edition 16 December 2025) is the
 * post-Brexit successor to the EU dual-use + military lists. It bundles
 * three structurally distinct code schemes under one roof:
 *
 *   1. **UK Dual-Use List (Annex I)** — assimilated Reg. 428/2009 Annex I,
 *      five-deep Wassenaar-derived codes (e.g. `9A004`, `5A002`, `6A008`).
 *      Structurally identical to the EU Annex I the sibling `eu-annex-i*.ts`
 *      files cover — most codes are byte-identical because the UK assimilated
 *      the EU regime. Curated here only insofar as each code is VERIFIED to
 *      exist in the UK source with matching scope (never blind-copied).
 *   2. **UK Military List (Schedule 2)** — `ML1`–`ML22`. Space-relevant
 *      positions only (ML4, ML10, ML11 "spacecraft", ML15, ML18, ML20–ML22).
 *   3. **UK national controls (Schedule 3 / Article 4A)** — `PL` ratings
 *      (e.g. `PL9009` aircraft-to-Iran, `PL9002` energetic materials). These
 *      are GB-specific supplemental controls with no EU equivalent.
 *
 * Contract enforced by these tests (the plan's W2 invariant template adapted
 * to the three real UK schemes):
 *
 *   1. Coverage threshold — ≥ 120 enumerated entries (the space slice).
 *   2. Code format — every code matches the UK scheme union
 *      /^(PL\d{4}|[0-9][A-E]\d{3}|ML\d{1,2})/ (dual-use NNNNN, ML, PL).
 *   3. Provenance — every entry has a gov.uk sourceUrl, an ISO asOfDate,
 *      and a description > 20 chars.
 *   4. Uniqueness — no duplicate codes.
 *   5. Coverage honesty — the exported coverage object declares a non-empty
 *      `excluded` list.
 *   6. Regime tagging — every entry is tagged for the UK_STRATEGIC regime
 *      (the `regime` field is the literal "UK_STRATEGIC").
 *   7. Staleness — asOfDate within 365 days of today (matches the sibling
 *      classification files' staleness gate).
 *
 * Source: UK Strategic Export Control List, consolidated edition published
 *   16 December 2025 (gov.uk asset). Zero external cost — official free PDF.
 */

import { describe, it, expect } from "vitest";

import {
  UK_STRATEGIC_ENTRIES,
  UK_STRATEGIC_COVERAGE,
  UK_STRATEGIC_AS_OF,
  findUkStrategicEntry,
} from "./uk-strategic";

// ─── 1. Coverage threshold ────────────────────────────────────────────

describe("UK Strategic — coverage threshold", () => {
  it("has at least 120 entries (the space slice)", () => {
    expect(UK_STRATEGIC_ENTRIES.length).toBeGreaterThanOrEqual(120);
  });
});

// ─── 2. Code format ───────────────────────────────────────────────────

describe("UK Strategic — code format", () => {
  it("every code matches the UK scheme union (dual-use / ML / PL)", () => {
    const pattern = /^(PL\d{4}|[0-9][A-E]\d{3}|ML\d{1,2})/;
    for (const e of UK_STRATEGIC_ENTRIES) {
      expect(
        pattern.test(e.code),
        `code '${e.code}' does not match the UK scheme union`,
      ).toBe(true);
    }
  });

  it("covers all three real UK schemes (dual-use, ML, PL)", () => {
    const hasDualUse = UK_STRATEGIC_ENTRIES.some((e) =>
      /^[0-9][A-E]\d{3}/.test(e.code),
    );
    const hasMilitary = UK_STRATEGIC_ENTRIES.some((e) =>
      /^ML\d{1,2}/.test(e.code),
    );
    const hasPl = UK_STRATEGIC_ENTRIES.some((e) => /^PL\d{4}/.test(e.code));
    expect(hasDualUse, "expected at least one dual-use code").toBe(true);
    expect(hasMilitary, "expected at least one ML code").toBe(true);
    expect(hasPl, "expected at least one PL national-control code").toBe(true);
  });
});

// ─── 3. Provenance ────────────────────────────────────────────────────

describe("UK Strategic — provenance", () => {
  it("every entry has a gov.uk sourceUrl + ISO asOfDate + description > 20 chars", () => {
    for (const e of UK_STRATEGIC_ENTRIES) {
      expect(e.sourceUrl, `entry ${e.code} sourceUrl`).toMatch(
        /^https:\/\/(www\.gov\.uk|assets\.publishing\.service\.gov\.uk)/,
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
    for (const e of UK_STRATEGIC_ENTRIES) {
      expect(e.title.length, `entry ${e.code} title empty`).toBeGreaterThan(0);
      expect(
        e.title.length,
        `entry ${e.code} title too long`,
      ).toBeLessThanOrEqual(100);
    }
  });
});

// ─── 4. Uniqueness ────────────────────────────────────────────────────

describe("UK Strategic — uniqueness", () => {
  it("has no duplicate codes", () => {
    const codes = UK_STRATEGIC_ENTRIES.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

// ─── 5. Coverage honesty ──────────────────────────────────────────────

describe("UK Strategic — coverage honesty", () => {
  it("declares a non-empty exclusion list", () => {
    expect(UK_STRATEGIC_COVERAGE.excluded.length).toBeGreaterThan(0);
  });

  it("coverage count matches the actual entry count", () => {
    expect(UK_STRATEGIC_COVERAGE.caelexCoverageCount).toBe(
      UK_STRATEGIC_ENTRIES.length,
    );
  });
});

// ─── 6. Regime tagging ────────────────────────────────────────────────

describe("UK Strategic — regime tagging", () => {
  it("every entry is tagged for the UK_STRATEGIC regime", () => {
    for (const e of UK_STRATEGIC_ENTRIES) {
      expect(e.regime, `entry ${e.code} regime`).toBe("UK_STRATEGIC");
    }
  });
});

// ─── 7. Staleness ─────────────────────────────────────────────────────

describe("UK Strategic — staleness", () => {
  it("the file-level asOfDate is within 365 days of today (not stale, not absurdly future)", () => {
    const asOf = new Date(UK_STRATEGIC_AS_OF).getTime();
    const ageDays = (Date.now() - asOf) / (1000 * 60 * 60 * 24);
    // Upper bound is the real staleness gate (matches the sibling files' 365d
    // rule). Lower bound allows a small future skew: `new Date("YYYY-MM-DD")`
    // parses as UTC midnight, which can sit ~hours ahead of a local `Date.now()`
    // when the verification date == today — that is not a "future-dated entry".
    expect(ageDays).toBeLessThan(365);
    expect(ageDays).toBeGreaterThan(-2);
  });
});

// ─── 8. Lookup helper ─────────────────────────────────────────────────

describe("UK Strategic — lookup", () => {
  it("findUkStrategicEntry resolves a known code case-insensitively", () => {
    const e = findUkStrategicEntry("9a004");
    expect(e).toBeDefined();
    expect(e?.code).toBe("9A004");
  });

  it("returns undefined for an unknown code", () => {
    expect(findUkStrategicEntry("ZZ999")).toBeUndefined();
  });
});
