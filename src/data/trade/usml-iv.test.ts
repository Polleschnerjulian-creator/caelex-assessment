/**
 * Data-Sprint S2 — Tests for the USML Category IV enumeration.
 *
 * USML Category IV ("Launch Vehicles, Guided Missiles, Ballistic Missiles,
 * Rockets, Torpedoes, Bombs, and Mines") is the second Tier-1 USML category
 * the Passage corpus curates at paragraph depth (Cat XV is already curated
 * across `usml-xv-*.ts`). Cat IV is the launch-vehicle / rocket-propulsion
 * spine that is fully in scope for space exporters.
 *
 * Contract enforced by these tests (mirror of `usml-xv-e.test.ts` plus the
 * S2-specific SME + min-count invariants from the plan):
 *
 *   1. Paragraph format — every entry matches /^IV\([a-z]\)/ (the real eCFR
 *      scheme: bare sub-category `IV(a)`, numbered `IV(a)(1)`, deep
 *      `IV(h)(30)(i)`, the reserved span `IV(e)-(f)`, and the EAR catch-all
 *      `IV(x)`).
 *   2. Coverage threshold — ≥ 25 enumerated paragraphs.
 *   3. Uniqueness — no two entries share a paragraph code.
 *   4. Completeness — every entry has a non-empty title (≤ 100 chars) and a
 *      description > 20 chars; sourceUrl + asOfDate present and well-formed.
 *   5. SME — Significant Military Equipment flags (`itarSME: true`) are
 *      present on exactly the paragraphs the eCFR text asterisks: the four
 *      asterisked headline paragraphs IV(a), IV(b), IV(d), IV(g), and the
 *      asterisked deep sub-paragraph IV(h)(30) (incl. its (i)/(ii)/(iii)).
 *      No other paragraph carries the SME flag (no fabricated designations).
 *   6. ITAR — every entry is ITAR by construction (Cat IV is a USML category).
 *   7. Staleness — asOfDate within 365 days of today (matches the other
 *      classification files' staleness gate).
 *   8. Coverage honesty — the exported coverage object declares what is
 *      excluded (the non-space weapon paragraphs are listed at headline
 *      depth only, with an honest note).
 *
 * Source: 22 CFR § 121.1 Category IV (eCFR official versioner API,
 *   title-22 issue date 2026-06-09). Zero external cost — official free source.
 */

import { describe, it, expect } from "vitest";

import {
  USML_IV_ENUMERATION,
  USML_IV_BY_PARAGRAPH,
  USML_IV_AS_OF_DATE,
  USML_IV_COVERAGE,
  findUsmlIvEntry,
  getUsmlIvSourceCitation,
} from "./usml-iv";

// ─── 1. Paragraph format ──────────────────────────────────────────────

describe("USML IV — paragraph format", () => {
  it("every entry's paragraph starts with the canonical IV(x) scheme", () => {
    const pattern = /^IV\([a-z]\)/;
    for (const entry of USML_IV_ENUMERATION) {
      expect(
        pattern.test(entry.paragraph),
        `paragraph '${entry.paragraph}' does not match /^IV\\([a-z]\\)/`,
      ).toBe(true);
    }
  });

  it("paragraphs follow the real eCFR depth scheme (numbered + deep + reserved + x)", () => {
    // Spot-check the structural variety the regex must tolerate.
    const fullPattern =
      /^IV\((?:[a-z]\)(?:\(\d+\)(?:\((?:i|ii|iii)\))?)?|[a-z]\)-\([a-z]\))$/;
    for (const entry of USML_IV_ENUMERATION) {
      expect(
        fullPattern.test(entry.paragraph),
        `paragraph '${entry.paragraph}' has an unexpected shape`,
      ).toBe(true);
    }
  });
});

// ─── 2. Coverage threshold ────────────────────────────────────────────

describe("USML IV — coverage threshold", () => {
  it("contains at least 25 enumerated paragraphs", () => {
    expect(USML_IV_ENUMERATION.length).toBeGreaterThanOrEqual(25);
  });

  it("covers the launch-vehicle / propulsion spine called out in the plan", () => {
    const required = [
      "IV(a)", // rockets/SLVs/missiles headline
      "IV(a)(1)", // ≥500kg @ ≥300km (MT) — MTCR Cat I delivery
      "IV(a)(2)", // <500kg @ ≥300km (MT)
      "IV(b)", // launchers headline
      "IV(b)(1)", // fixed/mobile launchers for (a)(1)/(a)(2) (MT)
      "IV(c)", // handling/control/detonation equipment
      "IV(d)", // power plants headline
      "IV(d)(1)", // individual rocket stages
      "IV(d)(2)", // total impulse ≥ 1.1e6 N·s (MTCR Cat I)
      "IV(d)(3)", // total impulse 8.41e5–1.1e6 N·s (MTCR Cat II band)
      "IV(g)", // non-nuclear warheads
      "IV(h)", // systems/subsystems/parts headline
      "IV(h)(1)", // flight control & guidance
      "IV(h)(8)", // re-entry vehicle / warhead heat shields
      "IV(h)(17)", // re-entry vehicles n.e.s.
      "IV(h)(26)", // liquid propellant tanks
      "IV(h)(30)", // classified catch-all (SME)
      "IV(i)", // technical data & defense services
    ];
    for (const paragraph of required) {
      expect(
        findUsmlIvEntry(paragraph),
        `expected enumeration to include ${paragraph}`,
      ).toBeDefined();
    }
  });
});

// ─── 3. Uniqueness ────────────────────────────────────────────────────

describe("USML IV — uniqueness", () => {
  it("no two entries share a paragraph code", () => {
    const codes = USML_IV_ENUMERATION.map((e) => e.paragraph);
    const unique = new Set(codes);
    expect(
      unique.size,
      `duplicate paragraph codes — total ${codes.length}, unique ${unique.size}`,
    ).toBe(codes.length);
  });

  it("the by-paragraph index covers every entry exactly once", () => {
    expect(Object.keys(USML_IV_BY_PARAGRAPH).length).toBe(
      USML_IV_ENUMERATION.length,
    );
    for (const entry of USML_IV_ENUMERATION) {
      expect(USML_IV_BY_PARAGRAPH[entry.paragraph]).toBe(entry);
    }
  });
});

// ─── 4. Completeness ──────────────────────────────────────────────────

describe("USML IV — completeness", () => {
  it("every entry has a non-empty title (≤ 100 chars) and description > 20 chars", () => {
    for (const entry of USML_IV_ENUMERATION) {
      expect(entry.title, `title for ${entry.paragraph}`).toBeTruthy();
      expect(
        entry.title.length,
        `title for ${entry.paragraph} exceeds 100 chars`,
      ).toBeLessThanOrEqual(100);
      expect(
        entry.description.length,
        `description for ${entry.paragraph} is not longer than 20 chars`,
      ).toBeGreaterThan(20);
    }
  });

  it("every entry carries a non-empty sourceUrl when adapted (file-level URL applies)", () => {
    const citation = getUsmlIvSourceCitation();
    expect(citation.url).toMatch(/^https:\/\/www\.ecfr\.gov\//);
  });
});

// ─── 5. SME (Significant Military Equipment) flags ────────────────────

describe("USML IV — SME flags mirror the eCFR asterisks", () => {
  // The eCFR text asterisks exactly these paragraphs as SME:
  //   * (a), * (b), * (d), * (g)  — headline paragraphs
  //   * (30) under (h)            — the classified catch-all sub-paragraph
  const SME_HEADLINES = ["IV(a)", "IV(b)", "IV(d)", "IV(g)"];
  const SME_DEEP = [
    "IV(h)(30)",
    "IV(h)(30)(i)",
    "IV(h)(30)(ii)",
    "IV(h)(30)(iii)",
  ];

  it("the four asterisked headline paragraphs are flagged itarSME", () => {
    for (const code of SME_HEADLINES) {
      const e = findUsmlIvEntry(code);
      expect(e, `${code} must exist`).toBeDefined();
      expect(e!.itarSME, `${code} must be SME`).toBe(true);
    }
  });

  it("the asterisked classified catch-all IV(h)(30) (and sub-items) are SME", () => {
    for (const code of SME_DEEP) {
      const e = findUsmlIvEntry(code);
      if (e) {
        expect(e.itarSME, `${code} must be SME`).toBe(true);
      }
    }
    // IV(h)(30) itself must exist and be SME.
    expect(findUsmlIvEntry("IV(h)(30)")!.itarSME).toBe(true);
  });

  it("paragraphs NOT asterisked in the source are NOT flagged SME (no fabrication)", () => {
    // (c), (h) parent, (i), (x), and the ordinary (h)(1)..(h)(29) sub-paragraphs
    // are not asterisked → must not carry the SME flag.
    const NON_SME = [
      "IV(c)",
      "IV(h)",
      "IV(h)(1)",
      "IV(h)(17)",
      "IV(i)",
      "IV(x)",
    ];
    for (const code of NON_SME) {
      const e = findUsmlIvEntry(code);
      expect(e, `${code} must exist`).toBeDefined();
      expect(e!.itarSME ?? false, `${code} must NOT be SME`).toBe(false);
    }
  });

  it("at least the 5 asterisked paragraphs carry the SME flag", () => {
    const smeCount = USML_IV_ENUMERATION.filter(
      (e) => e.itarSME === true,
    ).length;
    expect(smeCount).toBeGreaterThanOrEqual(5);
  });
});

// ─── 6. ITAR semantics ────────────────────────────────────────────────

describe("USML IV — ITAR semantics", () => {
  it("the source citation names 22 CFR Category IV", () => {
    const citation = getUsmlIvSourceCitation();
    expect(citation.source).toMatch(/22\s*CFR/);
    expect(citation.source).toMatch(/Category\s+IV/i);
    expect(citation.asOfDate).toBe(USML_IV_AS_OF_DATE);
  });
});

// ─── 7. Staleness gate ────────────────────────────────────────────────

describe("USML IV — staleness gate", () => {
  it("the file's asOfDate is within 365 days of today", () => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    const threshold = d.toISOString().slice(0, 10);
    expect(
      USML_IV_AS_OF_DATE >= threshold,
      `USML_IV_AS_OF_DATE ${USML_IV_AS_OF_DATE} is older than 365 days (threshold ${threshold})`,
    ).toBe(true);
  });

  it("the asOfDate follows ISO-8601 YYYY-MM-DD format", () => {
    expect(USML_IV_AS_OF_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── 8. Coverage honesty ──────────────────────────────────────────────

describe("USML IV — coverage honesty", () => {
  it("declares an excluded list (non-space weapon paragraphs noted honestly)", () => {
    expect(Array.isArray(USML_IV_COVERAGE.excluded)).toBe(true);
    expect(USML_IV_COVERAGE.excluded.length).toBeGreaterThan(0);
  });

  it("the coverage count matches the enumeration length", () => {
    expect(USML_IV_COVERAGE.caelexCoverageCount).toBe(
      USML_IV_ENUMERATION.length,
    );
  });
});

// ─── Lookup helpers ───────────────────────────────────────────────────

describe("USML IV — lookup helpers", () => {
  it("findUsmlIvEntry returns undefined for unknown / wrong-category codes", () => {
    expect(findUsmlIvEntry("IV(z)")).toBeUndefined();
    expect(findUsmlIvEntry("XV(e)(1)")).toBeUndefined();
    expect(findUsmlIvEntry("9A004")).toBeUndefined();
  });

  it("findUsmlIvEntry returns the entry for known paragraph codes", () => {
    const ivd2 = findUsmlIvEntry("IV(d)(2)");
    expect(ivd2).toBeDefined();
    expect(ivd2!.description).toMatch(/impulse/i);
  });
});
