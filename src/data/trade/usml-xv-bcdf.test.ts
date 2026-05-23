/**
 * Batch 13 — Tests for the USML Category XV(b)/(c)/(d)/(f) enumeration.
 *
 * Contract enforced by these tests:
 *
 *   1. Paragraph format — every entry uses `XV(s)`, `XV(s)(N)`, or
 *      `XV(s)(N)(i|ii|iii)` where s ∈ {b, c, d, f}.
 *   2. Uniqueness — no two entries share a paragraph code.
 *   3. Completeness — each entry has a non-empty title (≤ 100 chars)
 *      and a non-empty description (≥ 40 chars).
 *   4. See-through invariant — NO entry in XV(b)/(c)/(d)/(f) is flagged
 *      `isSeeThroughTrigger: true`. Only XV(e)(17) carries that flag,
 *      and that file is verified separately.
 *   5. Coverage threshold — ≥ 18 entries total (Tier-S Batch 13 floor).
 *      Sub-category breakdown: ≥ 5 XV(b), ≥ 5 XV(c), ≥ 3 XV(d),
 *      ≥ 5 XV(f).
 *   6. Lookup helpers — `findUsmlXvBcdfEntry` and
 *      `getUsmlXvBcdfBySubcategory` behave correctly.
 *   7. Staleness — the file's `asOfDate` is within 365 days of today.
 */

import { describe, it, expect } from "vitest";

import {
  USML_XV_BCDF_ENUMERATION,
  USML_XV_BCDF_BY_PARAGRAPH,
  USML_XV_BCDF_AS_OF_DATE,
  findUsmlXvBcdfEntry,
  getUsmlXvBcdfBySubcategory,
  getUsmlXvBcdfSourceCitation,
} from "./usml-xv-bcdf";

// ─── 1. Paragraph format ──────────────────────────────────────────────

describe("USML XV(b)/(c)/(d)/(f) — paragraph format", () => {
  it("every entry uses the format XV(s) or XV(s)(N) or XV(s)(N)(i|ii|iii) where s ∈ {b,c,d,f}", () => {
    const paragraphPattern = /^XV\((b|c|d|f)\)(\(\d+\))?(\((i|ii|iii)\))?$/;
    for (const entry of USML_XV_BCDF_ENUMERATION) {
      expect(
        paragraphPattern.test(entry.paragraph),
        `paragraph '${entry.paragraph}' does not match XV(s) | XV(s)(N) | XV(s)(N)(i|ii|iii)`,
      ).toBe(true);
    }
  });
});

// ─── 2. Uniqueness ────────────────────────────────────────────────────

describe("USML XV(b)/(c)/(d)/(f) — uniqueness", () => {
  it("no two entries share a paragraph code", () => {
    const codes = USML_XV_BCDF_ENUMERATION.map((e) => e.paragraph);
    const unique = new Set(codes);
    expect(
      unique.size,
      `duplicate paragraph codes detected — total ${codes.length}, unique ${unique.size}`,
    ).toBe(codes.length);
  });

  it("the by-paragraph index covers every entry exactly once", () => {
    expect(Object.keys(USML_XV_BCDF_BY_PARAGRAPH).length).toBe(
      USML_XV_BCDF_ENUMERATION.length,
    );
    for (const entry of USML_XV_BCDF_ENUMERATION) {
      expect(USML_XV_BCDF_BY_PARAGRAPH[entry.paragraph]).toBe(entry);
    }
  });
});

// ─── 3. Completeness ──────────────────────────────────────────────────

describe("USML XV(b)/(c)/(d)/(f) — completeness", () => {
  it("every entry has a non-empty title (≤ 100 chars) and description (≥ 40 chars)", () => {
    for (const entry of USML_XV_BCDF_ENUMERATION) {
      expect(entry.title, `title for ${entry.paragraph}`).toBeTruthy();
      expect(
        entry.title.length,
        `title for ${entry.paragraph} exceeds 100 chars`,
      ).toBeLessThanOrEqual(100);
      expect(
        entry.description,
        `description for ${entry.paragraph}`,
      ).toBeTruthy();
      // Descriptions should be operator-facing prose, not single words.
      expect(
        entry.description.length,
        `description for ${entry.paragraph} is shorter than 40 chars`,
      ).toBeGreaterThanOrEqual(40);
    }
  });
});

// ─── 4. See-through invariant ─────────────────────────────────────────

describe("USML XV(b)/(c)/(d)/(f) — see-through invariant", () => {
  it("NO entry is flagged as a see-through trigger (only XV(e)(17) carries that flag)", () => {
    const triggers = USML_XV_BCDF_ENUMERATION.filter(
      (e) => e.isSeeThroughTrigger === true,
    );
    expect(
      triggers.length,
      `expected zero see-through triggers in XV(b/c/d/f), found ${triggers.length}: ${triggers
        .map((e) => e.paragraph)
        .join(", ")}`,
    ).toBe(0);
  });
});

// ─── 5. Coverage threshold ───────────────────────────────────────────

describe("USML XV(b)/(c)/(d)/(f) — coverage threshold", () => {
  it("contains at least 18 enumerated paragraphs", () => {
    // Batch 13 acceptance: full enumeration of XV(b)/(c)/(d)/(f). 18 is
    // the floor; the file currently ships ≥ 22 entries.
    expect(USML_XV_BCDF_ENUMERATION.length).toBeGreaterThanOrEqual(18);
  });

  it("covers each sub-category with at least the minimum number of entries", () => {
    const bEntries = getUsmlXvBcdfBySubcategory("b");
    const cEntries = getUsmlXvBcdfBySubcategory("c");
    const dEntries = getUsmlXvBcdfBySubcategory("d");
    const fEntries = getUsmlXvBcdfBySubcategory("f");

    // Spec floors: ~5 XV(b), ~5 XV(c), ~3 XV(d), ~5 XV(f).
    expect(bEntries.length, "XV(b) sub-category").toBeGreaterThanOrEqual(5);
    expect(cEntries.length, "XV(c) sub-category").toBeGreaterThanOrEqual(5);
    expect(dEntries.length, "XV(d) sub-category").toBeGreaterThanOrEqual(3);
    expect(fEntries.length, "XV(f) sub-category").toBeGreaterThanOrEqual(5);
  });

  it("covers core XV(b) ground-control paragraphs called out by the spec", () => {
    const required = [
      "XV(b)(1)", // ground stations
      "XV(b)(2)", // antennas
      "XV(b)(3)", // COMSEC
    ];
    for (const paragraph of required) {
      expect(
        findUsmlXvBcdfEntry(paragraph),
        `expected enumeration to include ${paragraph}`,
      ).toBeDefined();
    }
  });

  it("covers core XV(c) rad-hardened paragraphs", () => {
    const required = [
      "XV(c)(1)", // five-criterion rad-hard (9A515.d boundary)
      "XV(c)(2)", // specially designed rad-hard for USML XV
    ];
    for (const paragraph of required) {
      expect(
        findUsmlXvBcdfEntry(paragraph),
        `expected enumeration to include ${paragraph}`,
      ).toBeDefined();
    }
  });

  it("covers core XV(d) anti-tamper paragraphs", () => {
    const required = [
      "XV(d)(1)", // physical anti-tamper enclosures
      "XV(d)(2)", // anti-tamper firmware/software
    ];
    for (const paragraph of required) {
      expect(
        findUsmlXvBcdfEntry(paragraph),
        `expected enumeration to include ${paragraph}`,
      ).toBeDefined();
    }
  });

  it("covers XV(f) technology and software paragraphs", () => {
    const required = [
      "XV(f)(1)", // tech for development
      "XV(f)(2)", // tech for production
      "XV(f)(4)", // software specifically designed
    ];
    for (const paragraph of required) {
      expect(
        findUsmlXvBcdfEntry(paragraph),
        `expected enumeration to include ${paragraph}`,
      ).toBeDefined();
    }
  });
});

// ─── 6. Lookup helpers ────────────────────────────────────────────────

describe("USML XV(b)/(c)/(d)/(f) — lookup helpers", () => {
  it("findUsmlXvBcdfEntry returns undefined for unknown paragraph codes", () => {
    expect(findUsmlXvBcdfEntry("XV(b)(99)")).toBeUndefined();
    expect(findUsmlXvBcdfEntry("XV(a)(1)")).toBeUndefined();
    expect(findUsmlXvBcdfEntry("XV(e)(17)")).toBeUndefined();
    expect(findUsmlXvBcdfEntry("9A515.d")).toBeUndefined();
  });

  it("findUsmlXvBcdfEntry returns the entry for known paragraph codes", () => {
    const xvb1 = findUsmlXvBcdfEntry("XV(b)(1)");
    expect(xvb1).toBeDefined();
    expect(xvb1!.title).toMatch(/ground/i);

    const xvc1 = findUsmlXvBcdfEntry("XV(c)(1)");
    expect(xvc1).toBeDefined();
    expect(xvc1!.title).toMatch(/rad/i);

    const xvf4 = findUsmlXvBcdfEntry("XV(f)(4)");
    expect(xvf4).toBeDefined();
    expect(xvf4!.title).toMatch(/software/i);
  });

  it("getUsmlXvBcdfBySubcategory partitions entries correctly", () => {
    const bEntries = getUsmlXvBcdfBySubcategory("b");
    const cEntries = getUsmlXvBcdfBySubcategory("c");
    const dEntries = getUsmlXvBcdfBySubcategory("d");
    const fEntries = getUsmlXvBcdfBySubcategory("f");

    // Every returned entry should match its sub-category prefix.
    for (const entry of bEntries) {
      expect(entry.paragraph.startsWith("XV(b)")).toBe(true);
    }
    for (const entry of cEntries) {
      expect(entry.paragraph.startsWith("XV(c)")).toBe(true);
    }
    for (const entry of dEntries) {
      expect(entry.paragraph.startsWith("XV(d)")).toBe(true);
    }
    for (const entry of fEntries) {
      expect(entry.paragraph.startsWith("XV(f)")).toBe(true);
    }

    // The four sub-category arrays should partition the full enumeration
    // — no overlap, no missing entry.
    expect(
      bEntries.length + cEntries.length + dEntries.length + fEntries.length,
    ).toBe(USML_XV_BCDF_ENUMERATION.length);
  });

  it("getUsmlXvBcdfSourceCitation returns the eCFR citation", () => {
    const citation = getUsmlXvBcdfSourceCitation();
    expect(citation.source).toMatch(/22\s*CFR/);
    expect(citation.source).toMatch(/Category\s+XV/i);
    expect(citation.url).toMatch(/^https:\/\/www\.ecfr\.gov\//);
    expect(citation.asOfDate).toBe(USML_XV_BCDF_AS_OF_DATE);
  });
});

// ─── 7. Staleness gate ────────────────────────────────────────────────

describe("USML XV(b)/(c)/(d)/(f) — staleness gate", () => {
  it("the file's asOfDate is within 365 days of today", () => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    const threshold = d.toISOString().slice(0, 10);
    expect(
      USML_XV_BCDF_AS_OF_DATE >= threshold,
      `USML_XV_BCDF_AS_OF_DATE ${USML_XV_BCDF_AS_OF_DATE} is older than 365 days (threshold: ${threshold})`,
    ).toBe(true);
  });

  it("the asOfDate follows ISO-8601 YYYY-MM-DD format", () => {
    expect(USML_XV_BCDF_AS_OF_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
