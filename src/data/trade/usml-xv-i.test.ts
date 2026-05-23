/**
 * Batch 15 — Tests for the USML Category XV(i) Technical Data +
 * Defense Services enumeration.
 *
 * Contract enforced by these tests:
 *
 *   1. Paragraph format — every entry uses `XV(i)(N)` or
 *      `XV(i)(N)(i|ii|iii)`.
 *   2. Uniqueness — no two entries share a paragraph code.
 *   3. Completeness — each entry has a non-empty title (≤ 120 chars)
 *      and a non-empty description (≥ 40 chars), plus citation and
 *      sourceUrl fields.
 *   4. See-through invariant — NO entry in XV(i) is flagged
 *      `isSeeThroughTrigger: true`. Only XV(e)(17) carries that flag,
 *      and that file is verified separately.
 *   5. Coverage threshold — ≥ 15 entries total. Both kinds represented
 *      with TD ≥ 10 and DS ≥ 5.
 *   6. SubParagraph — every entry has subParagraph === "i".
 *   7. Coverage metadata — `USML_XV_I_COVERAGE` matches actual
 *      cardinality + kind counts + SME count.
 *   8. Required fields — every entry has paragraph, subParagraph,
 *      kind, title, description, citation, sourceUrl.
 *   9. Kind discriminator — kind is one of TECHNICAL_DATA /
 *      DEFENSE_SERVICE; both are represented.
 *  10. SME flag — at least 1 entry is itarSME=true.
 *  11. EAR cross-walk — references to EAR 9E515 present on most
 *      entries (exclusions deliberately omit the field).
 *  12. License-exception strings — only valid values (AUKUS / CSA /
 *      DSP-83) appear; SME entries have empty exemptions array.
 *  13. Exclusions — both public-domain and fundamental-research
 *      § 120.11 carve-outs documented.
 *  14. Specific entries — engineering drawings, AI/ML weights,
 *      training services on spacecraft, etc. exist.
 *  15. Lookup helpers — `findUsmlXvIEntry`, `findUsmlXvIByKind`,
 *      `findUsmlXvIBySME`, `findUsmlXvISpaceRelevant` behave
 *      correctly.
 *  16. Staleness — the file's `asOf` date is within 365 days of today.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  USML_XV_I_ENTRIES,
  USML_XV_I_BY_PARAGRAPH,
  USML_XV_I_COVERAGE,
  USML_XV_I_AS_OF,
  findUsmlXvIEntry,
  findUsmlXvIByKind,
  findUsmlXvIBySME,
  findUsmlXvISpaceRelevant,
  getUsmlXvISourceCitation,
} from "./usml-xv-i";

// ─── 1. Paragraph format ──────────────────────────────────────────────

describe("USML XV(i) — paragraph format", () => {
  it("every entry uses the format XV(i)(N) or XV(i)(N)(i|ii|iii)", () => {
    const paragraphPattern = /^XV\(i\)\(\d+\)(\((i|ii|iii)\))?$/;
    for (const entry of USML_XV_I_ENTRIES) {
      expect(
        paragraphPattern.test(entry.paragraph),
        `paragraph '${entry.paragraph}' does not match XV(i)(N) | XV(i)(N)(i|ii|iii)`,
      ).toBe(true);
    }
  });

  it("every entry has subParagraph === 'i'", () => {
    for (const entry of USML_XV_I_ENTRIES) {
      expect(
        entry.subParagraph,
        `entry ${entry.paragraph} has subParagraph '${entry.subParagraph}', expected 'i'`,
      ).toBe("i");
    }
  });

  it("paragraph code starts with 'XV(i)' for every entry", () => {
    for (const entry of USML_XV_I_ENTRIES) {
      expect(
        entry.paragraph.startsWith("XV(i)"),
        `entry ${entry.paragraph} does not start with 'XV(i)'`,
      ).toBe(true);
    }
  });
});

// ─── 2. Uniqueness ────────────────────────────────────────────────────

describe("USML XV(i) — uniqueness", () => {
  it("no two entries share a paragraph code", () => {
    const codes = USML_XV_I_ENTRIES.map((e) => e.paragraph);
    const unique = new Set(codes);
    expect(
      unique.size,
      `duplicate paragraph codes detected — total ${codes.length}, unique ${unique.size}`,
    ).toBe(codes.length);
  });

  it("the by-paragraph index covers every entry exactly once", () => {
    expect(Object.keys(USML_XV_I_BY_PARAGRAPH).length).toBe(
      USML_XV_I_ENTRIES.length,
    );
    for (const entry of USML_XV_I_ENTRIES) {
      expect(USML_XV_I_BY_PARAGRAPH[entry.paragraph]).toBe(entry);
    }
  });
});

// ─── 3. Completeness ──────────────────────────────────────────────────

describe("USML XV(i) — completeness", () => {
  it("every entry has a non-empty title (≤ 120 chars) and description (≥ 40 chars)", () => {
    for (const entry of USML_XV_I_ENTRIES) {
      expect(entry.title, `title for ${entry.paragraph}`).toBeTruthy();
      expect(
        entry.title.length,
        `title for ${entry.paragraph} exceeds 120 chars (got ${entry.title.length})`,
      ).toBeLessThanOrEqual(120);
      expect(
        entry.description,
        `description for ${entry.paragraph}`,
      ).toBeTruthy();
      expect(
        entry.description.length,
        `description for ${entry.paragraph} is shorter than 40 chars (got ${entry.description.length})`,
      ).toBeGreaterThanOrEqual(40);
    }
  });

  it("every entry has a non-empty citation and sourceUrl", () => {
    for (const entry of USML_XV_I_ENTRIES) {
      expect(entry.citation, `citation for ${entry.paragraph}`).toBeTruthy();
      expect(entry.sourceUrl, `sourceUrl for ${entry.paragraph}`).toBeTruthy();
      expect(
        entry.sourceUrl.startsWith("https://www.ecfr.gov/"),
        `sourceUrl for ${entry.paragraph} does not point to eCFR (got ${entry.sourceUrl})`,
      ).toBe(true);
    }
  });

  it("every entry has a defined kind", () => {
    for (const entry of USML_XV_I_ENTRIES) {
      expect(
        entry.kind === "TECHNICAL_DATA" || entry.kind === "DEFENSE_SERVICE",
        `entry ${entry.paragraph} has invalid kind '${entry.kind}'`,
      ).toBe(true);
    }
  });
});

// ─── 4. See-through invariant ─────────────────────────────────────────

describe("USML XV(i) — see-through invariant", () => {
  it("NO entry is flagged as a see-through trigger (only XV(e)(17) carries that flag)", () => {
    const triggers = USML_XV_I_ENTRIES.filter(
      (e) => e.isSeeThroughTrigger === true,
    );
    expect(
      triggers.length,
      `expected zero see-through triggers in XV(i), found ${triggers.length}: ${triggers
        .map((e) => e.paragraph)
        .join(", ")}`,
    ).toBe(0);
  });
});

// ─── 5. Coverage threshold ───────────────────────────────────────────

describe("USML XV(i) — coverage threshold", () => {
  it("contains at least 15 enumerated paragraphs", () => {
    expect(USML_XV_I_ENTRIES.length).toBeGreaterThanOrEqual(15);
  });

  it("both kinds (TECHNICAL_DATA and DEFENSE_SERVICE) are represented with floor counts", () => {
    const td = findUsmlXvIByKind("TECHNICAL_DATA");
    const ds = findUsmlXvIByKind("DEFENSE_SERVICE");

    // Spec floors: ≥ 10 TD, ≥ 5 DS.
    expect(td.length, "TECHNICAL_DATA entries").toBeGreaterThanOrEqual(10);
    expect(ds.length, "DEFENSE_SERVICE entries").toBeGreaterThanOrEqual(5);
  });

  it("the two kinds partition the full enumeration with no overlap", () => {
    const td = findUsmlXvIByKind("TECHNICAL_DATA");
    const ds = findUsmlXvIByKind("DEFENSE_SERVICE");
    expect(td.length + ds.length).toBe(USML_XV_I_ENTRIES.length);
  });
});

// ─── 6. Coverage metadata ────────────────────────────────────────────

describe("USML XV(i) — coverage metadata", () => {
  it("USML_XV_I_COVERAGE.totalEntries matches actual enumeration length", () => {
    expect(USML_XV_I_COVERAGE.totalEntries).toBe(USML_XV_I_ENTRIES.length);
  });

  it("USML_XV_I_COVERAGE.byKind counts match actual kind counts", () => {
    expect(USML_XV_I_COVERAGE.byKind.TECHNICAL_DATA).toBe(
      findUsmlXvIByKind("TECHNICAL_DATA").length,
    );
    expect(USML_XV_I_COVERAGE.byKind.DEFENSE_SERVICE).toBe(
      findUsmlXvIByKind("DEFENSE_SERVICE").length,
    );
  });

  it("USML_XV_I_COVERAGE.smeCount matches the number of SME-flagged entries", () => {
    expect(USML_XV_I_COVERAGE.smeCount).toBe(findUsmlXvIBySME().length);
  });

  it("USML_XV_I_COVERAGE.asOf matches USML_XV_I_AS_OF constant", () => {
    expect(USML_XV_I_COVERAGE.asOf).toBe(USML_XV_I_AS_OF);
  });
});

// ─── 7. SME flag ──────────────────────────────────────────────────────

describe("USML XV(i) — Significant Military Equipment flag", () => {
  it("at least 1 entry is flagged as Significant Military Equipment", () => {
    const sme = findUsmlXvIBySME();
    expect(sme.length).toBeGreaterThanOrEqual(1);
  });

  it("every SME-flagged entry has itarSME explicitly set to true", () => {
    for (const entry of findUsmlXvIBySME()) {
      expect(
        entry.itarSME,
        `entry ${entry.paragraph} should have itarSME=true`,
      ).toBe(true);
    }
  });
});

// ─── 8. EAR cross-walk ───────────────────────────────────────────────

describe("USML XV(i) — EAR cross-walk references", () => {
  it("at least one entry references EAR 9E515 (technology counterpart)", () => {
    const with9E515 = USML_XV_I_ENTRIES.filter(
      (e) => e.ear600SeriesCounterpart === "9E515",
    );
    expect(with9E515.length).toBeGreaterThanOrEqual(1);
  });

  it("XV(i) entries with EAR cross-walk only reference 9E515 (technology ECCN)", () => {
    const withCrosswalk = USML_XV_I_ENTRIES.filter(
      (e) => e.ear600SeriesCounterpart !== undefined,
    );
    for (const entry of withCrosswalk) {
      expect(
        entry.ear600SeriesCounterpart!.startsWith("9E515"),
        `XV(i) entry ${entry.paragraph} should cross-walk to 9E515 (technology), got '${entry.ear600SeriesCounterpart}'`,
      ).toBe(true);
    }
  });

  it("public-domain and fundamental-research entries omit the EAR cross-walk", () => {
    const carveOuts = USML_XV_I_ENTRIES.filter(
      (e) => (e.exclusionsByDesignation?.length ?? 0) > 0,
    );
    expect(carveOuts.length).toBeGreaterThan(0);
    for (const entry of carveOuts) {
      // Public-domain / fundamental-research carve-outs fall outside
      // *both* ITAR and the EAR 600 series. They deliberately have no
      // counterpart.
      const hasOnlyOutsideJurisdiction =
        entry.exclusionsByDesignation!.includes("PUBLIC_DOMAIN") ||
        entry.exclusionsByDesignation!.includes("FUNDAMENTAL_RESEARCH");
      if (hasOnlyOutsideJurisdiction) {
        expect(
          entry.ear600SeriesCounterpart,
          `entry ${entry.paragraph} is a § 120.11 carve-out and should not have an EAR cross-walk (got '${entry.ear600SeriesCounterpart}')`,
        ).toBeUndefined();
      }
    }
  });
});

// ─── 9. License-exception strings ─────────────────────────────────────

describe("USML XV(i) — license-exception strings", () => {
  it("every license-exception string is one of {AUKUS, CSA, DSP-83}", () => {
    const validExceptions = new Set(["AUKUS", "CSA", "DSP-83"]);
    for (const entry of USML_XV_I_ENTRIES) {
      if (entry.licenseExceptions) {
        for (const ex of entry.licenseExceptions) {
          expect(
            validExceptions.has(ex),
            `entry ${entry.paragraph} has invalid license-exception '${ex}'`,
          ).toBe(true);
        }
      }
    }
  });

  it("SME-flagged entries with explicit empty licenseExceptions array signal no exemption eligibility", () => {
    for (const entry of findUsmlXvIBySME()) {
      if (entry.licenseExceptions !== undefined) {
        // SME entries that declare licenseExceptions should declare them
        // empty (i.e., they explicitly carry no exemption eligibility).
        expect(
          entry.licenseExceptions.length,
          `SME entry ${entry.paragraph} should have empty licenseExceptions, got ${JSON.stringify(entry.licenseExceptions)}`,
        ).toBe(0);
      }
    }
  });
});

// ─── 10. Exclusions / carve-outs ─────────────────────────────────────

describe("USML XV(i) — § 120.11 exclusions documented", () => {
  it("at least one entry documents the PUBLIC_DOMAIN exclusion", () => {
    const publicDomain = USML_XV_I_ENTRIES.filter((e) =>
      e.exclusionsByDesignation?.includes("PUBLIC_DOMAIN"),
    );
    expect(publicDomain.length).toBeGreaterThanOrEqual(1);
  });

  it("at least one entry documents the FUNDAMENTAL_RESEARCH exclusion", () => {
    const fundamentalResearch = USML_XV_I_ENTRIES.filter((e) =>
      e.exclusionsByDesignation?.includes("FUNDAMENTAL_RESEARCH"),
    );
    expect(fundamentalResearch.length).toBeGreaterThanOrEqual(1);
  });

  it("USML_XV_I_COVERAGE.exclusionCount matches the number of entries with exclusions", () => {
    const expected = USML_XV_I_ENTRIES.filter(
      (e) => (e.exclusionsByDesignation?.length ?? 0) > 0,
    ).length;
    expect(USML_XV_I_COVERAGE.exclusionCount).toBe(expected);
  });
});

// ─── 11. Specific required entries ───────────────────────────────────

describe("USML XV(i) — required specific entries", () => {
  it("includes engineering drawings entry (TECHNICAL_DATA)", () => {
    const drawings = findUsmlXvIEntry("XV(i)(1)");
    expect(drawings).toBeDefined();
    expect(drawings!.kind).toBe("TECHNICAL_DATA");
    expect(drawings!.title).toMatch(/drawing|schematic/i);
  });

  it("includes performance / design analyses entry (TECHNICAL_DATA)", () => {
    const analyses = findUsmlXvIEntry("XV(i)(2)");
    expect(analyses).toBeDefined();
    expect(analyses!.kind).toBe("TECHNICAL_DATA");
    expect(analyses!.title).toMatch(/analys|trade.?stud/i);
  });

  it("includes manufacturing know-how entry (TECHNICAL_DATA)", () => {
    const manufacturing = findUsmlXvIEntry("XV(i)(3)");
    expect(manufacturing).toBeDefined();
    expect(manufacturing!.kind).toBe("TECHNICAL_DATA");
    expect(manufacturing!.title).toMatch(/manufacturing|process/i);
  });

  it("includes software source code entry (TECHNICAL_DATA)", () => {
    const sourceCode = findUsmlXvIEntry("XV(i)(4)");
    expect(sourceCode).toBeDefined();
    expect(sourceCode!.kind).toBe("TECHNICAL_DATA");
    expect(sourceCode!.title).toMatch(/source.?code|software/i);
  });

  it("includes AI/ML model weights entry (TECHNICAL_DATA)", () => {
    const aiMl = findUsmlXvIEntry("XV(i)(5)");
    expect(aiMl).toBeDefined();
    expect(aiMl!.kind).toBe("TECHNICAL_DATA");
    expect(aiMl!.title).toMatch(/AI\/ML|model.?weight|machine.?learning/i);
  });

  it("includes test procedures / qualification data entry (TECHNICAL_DATA)", () => {
    const testProcs = findUsmlXvIEntry("XV(i)(6)");
    expect(testProcs).toBeDefined();
    expect(testProcs!.kind).toBe("TECHNICAL_DATA");
    expect(testProcs!.title).toMatch(/test|qualification|acceptance/i);
  });

  it("includes algorithms / mathematical models entry (TECHNICAL_DATA)", () => {
    const algos = findUsmlXvIEntry("XV(i)(7)");
    expect(algos).toBeDefined();
    expect(algos!.kind).toBe("TECHNICAL_DATA");
    expect(algos!.title).toMatch(/algorithm|mathematical|model/i);
  });

  it("includes BOM / supplier documentation entry (TECHNICAL_DATA)", () => {
    const bom = findUsmlXvIEntry("XV(i)(9)");
    expect(bom).toBeDefined();
    expect(bom!.kind).toBe("TECHNICAL_DATA");
    expect(bom!.title).toMatch(/bill.?of.?material|BOM|supplier/i);
  });

  it("includes public-domain exclusion entry", () => {
    const publicDomain = findUsmlXvIEntry("XV(i)(13)");
    expect(publicDomain).toBeDefined();
    expect(publicDomain!.title).toMatch(/public.?domain/i);
    expect(publicDomain!.exclusionsByDesignation).toContain("PUBLIC_DOMAIN");
  });

  it("includes fundamental-research exclusion entry", () => {
    const fundResearch = findUsmlXvIEntry("XV(i)(14)");
    expect(fundResearch).toBeDefined();
    expect(fundResearch!.title).toMatch(/fundamental.?research|university/i);
    expect(fundResearch!.exclusionsByDesignation).toContain(
      "FUNDAMENTAL_RESEARCH",
    );
  });

  it("includes training services on spacecraft entry (DEFENSE_SERVICE)", () => {
    const training = findUsmlXvIEntry("XV(i)(15)");
    expect(training).toBeDefined();
    expect(training!.kind).toBe("DEFENSE_SERVICE");
    expect(training!.title).toMatch(/training|spacecraft/i);
  });

  it("includes maintenance / repair services entry (DEFENSE_SERVICE)", () => {
    const mro = findUsmlXvIEntry("XV(i)(17)");
    expect(mro).toBeDefined();
    expect(mro!.kind).toBe("DEFENSE_SERVICE");
    expect(mro!.title).toMatch(/maintenance|repair|installation/i);
  });

  it("includes consulting / engineering-assistance entry (DEFENSE_SERVICE)", () => {
    const consulting = findUsmlXvIEntry("XV(i)(19)");
    expect(consulting).toBeDefined();
    expect(consulting!.kind).toBe("DEFENSE_SERVICE");
    expect(consulting!.title).toMatch(/consulting|engineering.?assistance/i);
  });

  it("includes a classified catch-all defense-service entry", () => {
    const catchAll = findUsmlXvIEntry("XV(i)(22)");
    expect(catchAll).toBeDefined();
    expect(catchAll!.title).toMatch(/catch.?all|classified/i);
  });
});

// ─── 12. Lookup helpers ──────────────────────────────────────────────

describe("USML XV(i) — lookup helpers", () => {
  it("findUsmlXvIEntry returns undefined for unknown paragraph codes", () => {
    expect(findUsmlXvIEntry("XV(i)(999)")).toBeUndefined();
    expect(findUsmlXvIEntry("XV(a)(1)")).toBeUndefined();
    expect(findUsmlXvIEntry("XV(e)(17)")).toBeUndefined();
    expect(findUsmlXvIEntry("9E515")).toBeUndefined();
    expect(findUsmlXvIEntry("")).toBeUndefined();
  });

  it("findUsmlXvIEntry returns the entry for known paragraph codes", () => {
    const xvi1 = findUsmlXvIEntry("XV(i)(1)");
    expect(xvi1).toBeDefined();
    expect(xvi1!.subParagraph).toBe("i");
    expect(xvi1!.kind).toBe("TECHNICAL_DATA");

    const xvi15 = findUsmlXvIEntry("XV(i)(15)");
    expect(xvi15).toBeDefined();
    expect(xvi15!.subParagraph).toBe("i");
    expect(xvi15!.kind).toBe("DEFENSE_SERVICE");
  });

  it("findUsmlXvIByKind returns entries matching the requested kind", () => {
    const td = findUsmlXvIByKind("TECHNICAL_DATA");
    const ds = findUsmlXvIByKind("DEFENSE_SERVICE");

    for (const entry of td) {
      expect(entry.kind).toBe("TECHNICAL_DATA");
    }
    for (const entry of ds) {
      expect(entry.kind).toBe("DEFENSE_SERVICE");
    }
  });

  it("findUsmlXvIBySME returns only entries with itarSME=true", () => {
    const sme = findUsmlXvIBySME();
    for (const entry of sme) {
      expect(entry.itarSME).toBe(true);
    }
  });

  it("findUsmlXvISpaceRelevant returns the full enumeration (all XV(i) is space)", () => {
    const spaceRelevant = findUsmlXvISpaceRelevant();
    expect(spaceRelevant.length).toBe(USML_XV_I_ENTRIES.length);
  });

  it("getUsmlXvISourceCitation returns the eCFR citation", () => {
    const citation = getUsmlXvISourceCitation();
    expect(citation.source).toMatch(/22\s*CFR/);
    expect(citation.source).toMatch(/Category\s+XV/i);
    expect(citation.url).toMatch(/^https:\/\/www\.ecfr\.gov\//);
    expect(citation.asOfDate).toBe(USML_XV_I_AS_OF);
  });
});

// ─── 13. Staleness gate ──────────────────────────────────────────────

describe("USML XV(i) — staleness gate", () => {
  it("the file's asOf date is within 365 days of today", () => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    const threshold = d.toISOString().slice(0, 10);
    expect(
      USML_XV_I_AS_OF >= threshold,
      `USML_XV_I_AS_OF ${USML_XV_I_AS_OF} is older than 365 days (threshold: ${threshold})`,
    ).toBe(true);
  });

  it("the asOf date follows ISO-8601 YYYY-MM-DD format", () => {
    expect(USML_XV_I_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
