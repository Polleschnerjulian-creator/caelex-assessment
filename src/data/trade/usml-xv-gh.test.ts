/**
 * Batch 14 — Tests for the USML Category XV(g) Software + XV(h)
 * Components/Parts/Accessories enumeration.
 *
 * Contract enforced by these tests:
 *
 *   1. Paragraph format — every entry uses `XV(g)(N)`, `XV(h)(N)`,
 *      `XV(g)(N)(i|ii|iii)`, or `XV(h)(N)(i|ii|iii)`.
 *   2. Uniqueness — no two entries share a paragraph code.
 *   3. Completeness — each entry has a non-empty title (≤ 120 chars)
 *      and a non-empty description (≥ 40 chars).
 *   4. See-through invariant — NO entry in XV(g)/(h) is flagged
 *      `isSeeThroughTrigger: true`. Only XV(e)(17) carries that flag,
 *      and that file is verified separately.
 *   5. Coverage threshold — ≥ 25 entries total. Sub-paragraph
 *      breakdown: ≥ 10 XV(g), ≥ 13 XV(h).
 *   6. Both sub-paragraphs (g) and (h) represented.
 *   7. Coverage metadata — `USML_XV_GH_COVERAGE` matches actual
 *      cardinality + sub-paragraph counts + SME count.
 *   8. Required fields — every entry has paragraph, subParagraph,
 *      title, description.
 *   9. SubParagraph consistency — the `subParagraph` field matches
 *      the prefix of the `paragraph` code.
 *  10. SME flag — at least 1 entry is itarSME=true.
 *  11. EAR cross-walk — references to EAR 9D515 / 9A515 present.
 *  12. License-exception strings — only valid values (AUKUS / CSA /
 *      DTCT) appear; SME entries do not carry AUKUS/CSA (unless
 *      explicitly documented).
 *  13. Specific entries — AOCS software, solar arrays, star trackers,
 *      etc. exist.
 *  14. Lookup helpers — `findUsmlXvGhEntry`, `findUsmlXvGhByParagraph`,
 *      `findUsmlXvGhBySME`, `findUsmlXvGhSpaceRelevant` behave
 *      correctly.
 *  15. Staleness — the file's `asOf` date is within 365 days of today.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  USML_XV_GH_ENTRIES,
  USML_XV_GH_BY_PARAGRAPH,
  USML_XV_GH_COVERAGE,
  USML_XV_GH_AS_OF,
  findUsmlXvGhEntry,
  findUsmlXvGhByParagraph,
  findUsmlXvGhBySME,
  findUsmlXvGhSpaceRelevant,
  getUsmlXvGhSourceCitation,
} from "./usml-xv-gh";

// ─── 1. Paragraph format ──────────────────────────────────────────────

describe("USML XV(g)/(h) — paragraph format", () => {
  it("every entry uses the format XV(s)(N) or XV(s)(N)(i|ii|iii) where s ∈ {g,h}", () => {
    const paragraphPattern = /^XV\((g|h)\)\(\d+\)(\((i|ii|iii)\))?$/;
    for (const entry of USML_XV_GH_ENTRIES) {
      expect(
        paragraphPattern.test(entry.paragraph),
        `paragraph '${entry.paragraph}' does not match XV(s)(N) | XV(s)(N)(i|ii|iii) where s ∈ {g,h}`,
      ).toBe(true);
    }
  });

  it("paragraph code's sub-letter matches the subParagraph field", () => {
    for (const entry of USML_XV_GH_ENTRIES) {
      const expectedPrefix = `XV(${entry.subParagraph})`;
      expect(
        entry.paragraph.startsWith(expectedPrefix),
        `entry ${entry.paragraph} has subParagraph '${entry.subParagraph}' but does not start with '${expectedPrefix}'`,
      ).toBe(true);
    }
  });
});

// ─── 2. Uniqueness ────────────────────────────────────────────────────

describe("USML XV(g)/(h) — uniqueness", () => {
  it("no two entries share a paragraph code", () => {
    const codes = USML_XV_GH_ENTRIES.map((e) => e.paragraph);
    const unique = new Set(codes);
    expect(
      unique.size,
      `duplicate paragraph codes detected — total ${codes.length}, unique ${unique.size}`,
    ).toBe(codes.length);
  });

  it("the by-paragraph index covers every entry exactly once", () => {
    expect(Object.keys(USML_XV_GH_BY_PARAGRAPH).length).toBe(
      USML_XV_GH_ENTRIES.length,
    );
    for (const entry of USML_XV_GH_ENTRIES) {
      expect(USML_XV_GH_BY_PARAGRAPH[entry.paragraph]).toBe(entry);
    }
  });
});

// ─── 3. Completeness ──────────────────────────────────────────────────

describe("USML XV(g)/(h) — completeness", () => {
  it("every entry has a non-empty title (≤ 120 chars) and description (≥ 40 chars)", () => {
    for (const entry of USML_XV_GH_ENTRIES) {
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

  it("every entry declares a valid subParagraph of 'g' or 'h'", () => {
    for (const entry of USML_XV_GH_ENTRIES) {
      expect(
        entry.subParagraph === "g" || entry.subParagraph === "h",
        `entry ${entry.paragraph} has invalid subParagraph '${entry.subParagraph}'`,
      ).toBe(true);
    }
  });
});

// ─── 4. See-through invariant ─────────────────────────────────────────

describe("USML XV(g)/(h) — see-through invariant", () => {
  it("NO entry is flagged as a see-through trigger (only XV(e)(17) carries that flag)", () => {
    const triggers = USML_XV_GH_ENTRIES.filter(
      (e) => e.isSeeThroughTrigger === true,
    );
    expect(
      triggers.length,
      `expected zero see-through triggers in XV(g/h), found ${triggers.length}: ${triggers
        .map((e) => e.paragraph)
        .join(", ")}`,
    ).toBe(0);
  });
});

// ─── 5. Coverage threshold ───────────────────────────────────────────

describe("USML XV(g)/(h) — coverage threshold", () => {
  it("contains at least 25 enumerated paragraphs", () => {
    expect(USML_XV_GH_ENTRIES.length).toBeGreaterThanOrEqual(25);
  });

  it("covers each sub-paragraph with at least the minimum number of entries", () => {
    const gEntries = findUsmlXvGhByParagraph("g");
    const hEntries = findUsmlXvGhByParagraph("h");

    // Spec floors: ≥ 10 XV(g), ≥ 13 XV(h).
    expect(gEntries.length, "XV(g) sub-paragraph").toBeGreaterThanOrEqual(10);
    expect(hEntries.length, "XV(h) sub-paragraph").toBeGreaterThanOrEqual(13);
  });

  it("both sub-paragraphs (g) and (h) are represented", () => {
    const gEntries = findUsmlXvGhByParagraph("g");
    const hEntries = findUsmlXvGhByParagraph("h");
    expect(gEntries.length).toBeGreaterThan(0);
    expect(hEntries.length).toBeGreaterThan(0);
  });

  it("the two sub-paragraph arrays partition the full enumeration with no overlap", () => {
    const gEntries = findUsmlXvGhByParagraph("g");
    const hEntries = findUsmlXvGhByParagraph("h");
    expect(gEntries.length + hEntries.length).toBe(USML_XV_GH_ENTRIES.length);
  });
});

// ─── 6. Coverage metadata ────────────────────────────────────────────

describe("USML XV(g)/(h) — coverage metadata", () => {
  it("USML_XV_GH_COVERAGE.totalEntries matches actual enumeration length", () => {
    expect(USML_XV_GH_COVERAGE.totalEntries).toBe(USML_XV_GH_ENTRIES.length);
  });

  it("USML_XV_GH_COVERAGE.byParagraph counts match actual sub-paragraph counts", () => {
    expect(USML_XV_GH_COVERAGE.byParagraph.g).toBe(
      findUsmlXvGhByParagraph("g").length,
    );
    expect(USML_XV_GH_COVERAGE.byParagraph.h).toBe(
      findUsmlXvGhByParagraph("h").length,
    );
  });

  it("USML_XV_GH_COVERAGE.smeCount matches the number of SME-flagged entries", () => {
    expect(USML_XV_GH_COVERAGE.smeCount).toBe(findUsmlXvGhBySME().length);
  });

  it("USML_XV_GH_COVERAGE.asOf matches USML_XV_GH_AS_OF constant", () => {
    expect(USML_XV_GH_COVERAGE.asOf).toBe(USML_XV_GH_AS_OF);
  });
});

// ─── 7. SME flag ──────────────────────────────────────────────────────

describe("USML XV(g)/(h) — Significant Military Equipment flag", () => {
  it("at least 1 entry is flagged as Significant Military Equipment", () => {
    const sme = findUsmlXvGhBySME();
    expect(sme.length).toBeGreaterThanOrEqual(1);
  });

  it("every SME-flagged entry has itarSME explicitly set to true", () => {
    for (const entry of findUsmlXvGhBySME()) {
      expect(
        entry.itarSME,
        `entry ${entry.paragraph} should have itarSME=true`,
      ).toBe(true);
    }
  });
});

// ─── 8. EAR cross-walk ───────────────────────────────────────────────

describe("USML XV(g)/(h) — EAR cross-walk references", () => {
  it("at least one XV(g) entry references EAR 9D515 (software)", () => {
    const gWith9D515 = findUsmlXvGhByParagraph("g").filter(
      (e) => e.ear600SeriesCounterpart === "9D515",
    );
    expect(gWith9D515.length).toBeGreaterThanOrEqual(1);
  });

  it("at least one XV(h) entry references EAR 9A515 (components)", () => {
    const hWith9A515 = findUsmlXvGhByParagraph("h").filter(
      (e) => e.ear600SeriesCounterpart === "9A515",
    );
    expect(hWith9A515.length).toBeGreaterThanOrEqual(1);
  });

  it("XV(g) entries with EAR cross-walk only reference 9D515 (software ECCN)", () => {
    const gWithCrosswalk = findUsmlXvGhByParagraph("g").filter(
      (e) => e.ear600SeriesCounterpart !== undefined,
    );
    for (const entry of gWithCrosswalk) {
      expect(
        entry.ear600SeriesCounterpart!.startsWith("9D515"),
        `XV(g) entry ${entry.paragraph} should cross-walk to 9D515 (software), got '${entry.ear600SeriesCounterpart}'`,
      ).toBe(true);
    }
  });
});

// ─── 9. License-exception strings ─────────────────────────────────────

describe("USML XV(g)/(h) — license-exception strings", () => {
  it("every license-exception string is one of {AUKUS, CSA, DTCT}", () => {
    const validExceptions = new Set(["AUKUS", "CSA", "DTCT"]);
    for (const entry of USML_XV_GH_ENTRIES) {
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
    for (const entry of findUsmlXvGhBySME()) {
      if (entry.licenseExceptions !== undefined) {
        // SME entries that declare licenseExceptions should declare them empty
        // (i.e., they explicitly carry no exemption eligibility).
        expect(
          entry.licenseExceptions.length,
          `SME entry ${entry.paragraph} should have empty licenseExceptions, got ${JSON.stringify(entry.licenseExceptions)}`,
        ).toBe(0);
      }
    }
  });
});

// ─── 10. Specific required entries ───────────────────────────────────

describe("USML XV(g)/(h) — required specific entries", () => {
  it("includes AOCS / attitude-control software (XV(g))", () => {
    const aocsEntry = findUsmlXvGhEntry("XV(g)(1)");
    expect(aocsEntry).toBeDefined();
    expect(aocsEntry!.title).toMatch(/AOCS|attitude/i);
  });

  it("includes star-tracker / IMU firmware (XV(g))", () => {
    const starTrackerSoftware = findUsmlXvGhEntry("XV(g)(2)");
    expect(starTrackerSoftware).toBeDefined();
    expect(starTrackerSoftware!.title).toMatch(/star.?tracker|IMU/i);
  });

  it("includes TT&C ground software (XV(g))", () => {
    const ttcSoftware = findUsmlXvGhEntry("XV(g)(4)");
    expect(ttcSoftware).toBeDefined();
    expect(ttcSoftware!.title).toMatch(/TT&C|ground/i);
  });

  it("includes image-processing software for XV(c) payloads", () => {
    const imageSw = findUsmlXvGhEntry("XV(g)(5)");
    expect(imageSw).toBeDefined();
    expect(imageSw!.title).toMatch(/image.?processing|imaging/i);
  });

  it("includes AI/ML models trained on USML data (XV(g))", () => {
    const aiMlSw = findUsmlXvGhEntry("XV(g)(6)");
    expect(aiMlSw).toBeDefined();
    expect(aiMlSw!.title).toMatch(/AI\/ML|machine.?learning|models/i);
  });

  it("includes solar arrays specifically designed for USML XV(a) (XV(h))", () => {
    const solar = findUsmlXvGhEntry("XV(h)(1)");
    expect(solar).toBeDefined();
    expect(solar!.title).toMatch(/solar.?array/i);
  });

  it("includes reaction wheels / momentum wheels / CMGs (XV(h))", () => {
    const wheels = findUsmlXvGhEntry("XV(h)(2)");
    expect(wheels).toBeDefined();
    expect(wheels!.title).toMatch(/reaction.?wheel|momentum.?wheel|CMG/i);
  });

  it("includes star trackers / sun sensors / magnetometers at component level (XV(h))", () => {
    const sensors = findUsmlXvGhEntry("XV(h)(3)");
    expect(sensors).toBeDefined();
    expect(sensors!.title).toMatch(/star.?tracker|sun.?sensor|magnetometer/i);
  });

  it("includes propellant tanks / valves / regulators (XV(h))", () => {
    const propulsion = findUsmlXvGhEntry("XV(h)(4)");
    expect(propulsion).toBeDefined();
    expect(propulsion!.title).toMatch(/propellant.?tank|valve|regulator/i);
  });

  it("includes thermal control hardware (XV(h))", () => {
    const thermal = findUsmlXvGhEntry("XV(h)(5)");
    expect(thermal).toBeDefined();
    expect(thermal!.title).toMatch(/thermal|heater|radiator|MLI/i);
  });

  it("includes ground support equipment (XV(h))", () => {
    const gse = findUsmlXvGhEntry("XV(h)(11)");
    expect(gse).toBeDefined();
    expect(gse!.title).toMatch(/ground.?support|GSE/i);
  });

  it("includes test equipment for USML XV defense articles (XV(h))", () => {
    const testEq = findUsmlXvGhEntry("XV(h)(10)");
    expect(testEq).toBeDefined();
    expect(testEq!.title).toMatch(/test.?equipment/i);
  });

  it("includes mounting brackets / fasteners (XV(h))", () => {
    const brackets = findUsmlXvGhEntry("XV(h)(12)");
    expect(brackets).toBeDefined();
    expect(brackets!.title).toMatch(/mounting|bracket|fastener/i);
  });

  it("includes catch-all entries for both XV(g) and XV(h)", () => {
    // XV(g)(12) and XV(h)(18) are the catch-alls in this enumeration.
    const gCatchAll = findUsmlXvGhEntry("XV(g)(12)");
    const hCatchAll = findUsmlXvGhEntry("XV(h)(18)");
    expect(gCatchAll).toBeDefined();
    expect(hCatchAll).toBeDefined();
    expect(gCatchAll!.title).toMatch(/catch.?all|classified/i);
    expect(hCatchAll!.title).toMatch(/catch.?all|classified/i);
  });
});

// ─── 11. Lookup helpers ──────────────────────────────────────────────

describe("USML XV(g)/(h) — lookup helpers", () => {
  it("findUsmlXvGhEntry returns undefined for unknown paragraph codes", () => {
    expect(findUsmlXvGhEntry("XV(g)(999)")).toBeUndefined();
    expect(findUsmlXvGhEntry("XV(a)(1)")).toBeUndefined();
    expect(findUsmlXvGhEntry("XV(e)(17)")).toBeUndefined();
    expect(findUsmlXvGhEntry("9D515")).toBeUndefined();
    expect(findUsmlXvGhEntry("")).toBeUndefined();
  });

  it("findUsmlXvGhEntry returns the entry for known paragraph codes", () => {
    const xvg1 = findUsmlXvGhEntry("XV(g)(1)");
    expect(xvg1).toBeDefined();
    expect(xvg1!.subParagraph).toBe("g");

    const xvh1 = findUsmlXvGhEntry("XV(h)(1)");
    expect(xvh1).toBeDefined();
    expect(xvh1!.subParagraph).toBe("h");
  });

  it("findUsmlXvGhByParagraph returns entries matching the sub-letter", () => {
    const gEntries = findUsmlXvGhByParagraph("g");
    const hEntries = findUsmlXvGhByParagraph("h");

    for (const entry of gEntries) {
      expect(entry.paragraph.startsWith("XV(g)")).toBe(true);
      expect(entry.subParagraph).toBe("g");
    }
    for (const entry of hEntries) {
      expect(entry.paragraph.startsWith("XV(h)")).toBe(true);
      expect(entry.subParagraph).toBe("h");
    }
  });

  it("findUsmlXvGhBySME returns only entries with itarSME=true", () => {
    const sme = findUsmlXvGhBySME();
    for (const entry of sme) {
      expect(entry.itarSME).toBe(true);
    }
  });

  it("findUsmlXvGhSpaceRelevant returns the full enumeration (all XV(g/h) is space)", () => {
    const spaceRelevant = findUsmlXvGhSpaceRelevant();
    expect(spaceRelevant.length).toBe(USML_XV_GH_ENTRIES.length);
  });

  it("getUsmlXvGhSourceCitation returns the eCFR citation", () => {
    const citation = getUsmlXvGhSourceCitation();
    expect(citation.source).toMatch(/22\s*CFR/);
    expect(citation.source).toMatch(/Category\s+XV/i);
    expect(citation.url).toMatch(/^https:\/\/www\.ecfr\.gov\//);
    expect(citation.asOfDate).toBe(USML_XV_GH_AS_OF);
  });
});

// ─── 12. Staleness gate ──────────────────────────────────────────────

describe("USML XV(g)/(h) — staleness gate", () => {
  it("the file's asOf date is within 365 days of today", () => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    const threshold = d.toISOString().slice(0, 10);
    expect(
      USML_XV_GH_AS_OF >= threshold,
      `USML_XV_GH_AS_OF ${USML_XV_GH_AS_OF} is older than 365 days (threshold: ${threshold})`,
    ).toBe(true);
  });

  it("the asOf date follows ISO-8601 YYYY-MM-DD format", () => {
    expect(USML_XV_GH_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
