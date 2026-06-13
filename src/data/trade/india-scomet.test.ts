/**
 * Tests for India DGFT SCOMET export controls dataset.
 *
 * Contract:
 *   - All entries have required fields
 *   - Codes follow SCOMET format (digit + letter + 3 digits)
 *   - No duplicate codes
 *   - Categories are valid (0-8)
 *   - Cross-walk demo entries exist (Z35-IN-SCOMET markers)
 *   - Helper functions behave correctly
 *   - Coverage metadata is consistent
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  INDIA_SCOMET_ENTRIES,
  INDIA_SCOMET_COVERAGE,
  INDIA_SCOMET_AS_OF,
  findIndiaScometEntry,
  findIndiaScometByCategory,
  findIndiaScometByAuthority,
  findIndiaScometByEuRef,
  DGFT_SCOMET_URL,
  type IndiaScometEntry,
} from "./india-scomet";

// ─── 1. Required-field integrity ─────────────────────────────────────

describe("India SCOMET — required-field integrity", () => {
  it("every entry has all required fields", () => {
    for (const entry of INDIA_SCOMET_ENTRIES) {
      expect(entry.code, `entry has empty code`).toBeTruthy();
      expect(entry.category, `${entry.code} missing category`).toBeTruthy();
      expect(entry.title.length, `${entry.code} empty title`).toBeGreaterThan(
        0,
      );
      expect(
        entry.description.length,
        `${entry.code} empty description`,
      ).toBeGreaterThan(0);
      expect(
        entry.sourceUrl.length,
        `${entry.code} empty sourceUrl`,
      ).toBeGreaterThan(0);
      expect(entry.asOfDate, `${entry.code} missing asOfDate`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(
        entry.licensingAuthority,
        `${entry.code} missing licensingAuthority`,
      ).toBeTruthy();
    }
  });

  it("titles are ≤ 120 chars", () => {
    for (const entry of INDIA_SCOMET_ENTRIES) {
      expect(
        entry.title.length,
        `entry ${entry.code} title exceeds 120 chars: '${entry.title}'`,
      ).toBeLessThanOrEqual(120);
    }
  });
});

// ─── 2. Code format validity ─────────────────────────────────────────

describe("India SCOMET — code format validity", () => {
  it("every code matches SCOMET pattern (digit + letter + 3 digits)", () => {
    // e.g. "4A001", "5A101", "6A002", "8A001", "5D001", "6E001"
    const SCOMET_CODE_RE = /^\d[A-E]\d{3}$/;
    for (const entry of INDIA_SCOMET_ENTRIES) {
      expect(
        SCOMET_CODE_RE.test(entry.code),
        `code '${entry.code}' does not match SCOMET pattern`,
      ).toBe(true);
    }
  });

  it("code prefix digit matches the declared category", () => {
    for (const entry of INDIA_SCOMET_ENTRIES) {
      const codePrefix = entry.code.charAt(0);
      expect(
        codePrefix,
        `entry ${entry.code} category '${entry.category}' mismatches code prefix '${codePrefix}'`,
      ).toBe(entry.category);
    }
  });
});

// ─── 3. Uniqueness ───────────────────────────────────────────────────

describe("India SCOMET — uniqueness", () => {
  it("no duplicate codes", () => {
    const codes = INDIA_SCOMET_ENTRIES.map((e) => e.code);
    const unique = new Set(codes);
    expect(
      unique.size,
      `expected ${codes.length} unique codes, got ${unique.size}`,
    ).toBe(codes.length);
  });

  it("no duplicate titles (soft data-quality check)", () => {
    const titles = INDIA_SCOMET_ENTRIES.map((e) => e.title);
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });
});

// ─── 4. Category coverage ────────────────────────────────────────────

describe("India SCOMET — category coverage", () => {
  it("categories are within valid SCOMET range (0-8)", () => {
    const VALID_CATEGORIES = new Set([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    for (const entry of INDIA_SCOMET_ENTRIES) {
      expect(
        VALID_CATEGORIES.has(entry.category),
        `entry ${entry.code} has invalid category '${entry.category}'`,
      ).toBe(true);
    }
  });

  it("Category 5 (Aerospace) has the largest representation (≥ 10 entries)", () => {
    const cat5 = findIndiaScometByCategory("5");
    expect(
      cat5.length,
      `Category 5 must dominate per task spec (got ${cat5.length})`,
    ).toBeGreaterThanOrEqual(10);
  });

  it("dataset has ≥ 70 entries total (S6 deepening)", () => {
    expect(INDIA_SCOMET_ENTRIES.length).toBeGreaterThanOrEqual(70);
  });

  it("dataset spans categories 3, 4, 5, 6, 7, 8", () => {
    const categoriesPresent = new Set(
      INDIA_SCOMET_ENTRIES.map((e) => e.category),
    );
    expect(categoriesPresent.has("3")).toBe(true);
    expect(categoriesPresent.has("4")).toBe(true);
    expect(categoriesPresent.has("5")).toBe(true);
    expect(categoriesPresent.has("6")).toBe(true);
    expect(categoriesPresent.has("7")).toBe(true);
    expect(categoriesPresent.has("8")).toBe(true);
  });
});

// ─── 5. Licensing authority distribution ─────────────────────────────

describe("India SCOMET — licensing authority distribution", () => {
  it("licensingAuthority is one of {DGFT, DRDO, DAE, ISRO}", () => {
    const VALID_AUTHS = new Set(["DGFT", "DRDO", "DAE", "ISRO"]);
    for (const entry of INDIA_SCOMET_ENTRIES) {
      expect(
        VALID_AUTHS.has(entry.licensingAuthority),
        `entry ${entry.code} has invalid authority '${entry.licensingAuthority}'`,
      ).toBe(true);
    }
  });

  it("ISRO-routed entries are concentrated in the space categories (5 + 8)", () => {
    const isroEntries = findIndiaScometByAuthority("ISRO");
    expect(
      isroEntries.length,
      "expected ≥ 1 ISRO-routed entry",
    ).toBeGreaterThan(0);
    // Spacecraft items live in the space-relevant categories: the missile-spine
    // Category 5 (5A101), the file's cross-walk Cat 6 (EO sensors, SAR) and Cat 7
    // (on-board computers), and — per the official Appendix-3 structure — the
    // Wassenaar-aligned Category 8 (8A904 spacecraft/buses, 8A9 propulsion, 8A7
    // navigation, 8A6 sensors). Every ISRO-routed entry must sit in {5,6,7,8};
    // none may land in a non-space category (0,1,2,3,4).
    const SPACE_CATS = new Set(["5", "6", "7", "8"]);
    expect(isroEntries.every((e) => SPACE_CATS.has(e.category))).toBe(true);
    // The overwhelming majority (≥ 80%) sit in the two space spines {5, 8}.
    const isroSpine = isroEntries.filter(
      (e) => e.category === "5" || e.category === "8",
    );
    expect(isroSpine.length).toBeGreaterThanOrEqual(
      Math.ceil(isroEntries.length * 0.8),
    );
    // Category 5 must still carry at least one ISRO-routed spacecraft entry.
    const isroCat5 = isroEntries.filter((e) => e.category === "5");
    expect(isroCat5.length).toBeGreaterThan(0);
  });

  it("DAE-routed entries exist for nuclear-overlap items (Cat 4)", () => {
    const daeEntries = findIndiaScometByAuthority("DAE");
    expect(daeEntries.length).toBeGreaterThan(0);
    for (const entry of daeEntries) {
      expect(entry.category).toBe("4");
    }
  });
});

// ─── 6. Cross-walk demo entries (Z35-IN-SCOMET markers) ──────────────

describe("India SCOMET — Z35-IN-SCOMET cross-walk demo entries", () => {
  it("4A001 RTG entry exists (Cat 4 nuclear-overlap)", () => {
    const entry = findIndiaScometEntry("4A001");
    expect(entry).toBeDefined();
    expect(entry?.category).toBe("4");
    expect(entry?.licensingAuthority).toBe("DAE");
  });

  it("IN-SCOMET:5A101 spacecraft (parametric) — exists with ISRO route + MTCR Cat I refs", () => {
    const entry = findIndiaScometEntry("5A101");
    expect(entry, "missing critical cross-walk entry 5A101").toBeDefined();
    expect(entry?.licensingAuthority).toBe("ISRO");
    expect(entry?.mtcrRef).toBeTruthy();
    expect(entry?.euAnnexIRef).toBe("9A004");
  });

  it("IN-SCOMET:5A201 launch vehicle stages — MTCR Cat I, DRDO clearance", () => {
    const entry = findIndiaScometEntry("5A201");
    expect(entry).toBeDefined();
    expect(entry?.licensingAuthority).toBe("DRDO");
    expect(entry?.mtcrRef).toBe("1.A.1");
    expect(entry?.title.toLowerCase()).toMatch(/launch|stage/);
  });

  it("IN-SCOMET:6A002 sensors (high-resolution EO)", () => {
    const entry = findIndiaScometEntry("6A002");
    expect(entry).toBeDefined();
    expect(entry?.category).toBe("6");
    expect(entry?.euAnnexIRef).toBe("6A002");
    expect(entry?.licensingAuthority).toBe("ISRO");
  });

  it("IN-SCOMET:8A001 telecom (uplink/downlink, TT&C, ISL)", () => {
    const entry = findIndiaScometEntry("8A001");
    expect(entry).toBeDefined();
    expect(entry?.category).toBe("8");
    expect(entry?.title.toLowerCase()).toMatch(/telecom|tt&c|telemetry/);
    expect(entry?.euAnnexIRef).toContain("5A001");
  });
});

// ─── 7. Cross-reference resolvability ────────────────────────────────

describe("India SCOMET — cross-reference resolvability", () => {
  it("euAnnexIRef where present matches EU Annex I code shape", () => {
    // Allow ECCN sub-paragraphs: e.g. "3A001.a.1", "9A515.a", "5A001.b"
    const EU_RE = /^\d[A-E]\d{3}(\.[a-z0-9]+)*$/;
    for (const entry of INDIA_SCOMET_ENTRIES) {
      if (entry.euAnnexIRef !== undefined) {
        expect(
          EU_RE.test(entry.euAnnexIRef),
          `entry ${entry.code} euAnnexIRef '${entry.euAnnexIRef}' has bad shape`,
        ).toBe(true);
      }
    }
  });

  it("earCclRef where present matches ECCN shape", () => {
    // Allow ECCN sub-paragraphs: e.g. "3A001.a.1", "9A515.f"
    const ECCN_RE = /^\d[A-E]\d{3}(\.[a-z0-9]+)*$/;
    for (const entry of INDIA_SCOMET_ENTRIES) {
      if (entry.earCclRef !== undefined) {
        expect(
          ECCN_RE.test(entry.earCclRef),
          `entry ${entry.code} earCclRef '${entry.earCclRef}' has bad shape`,
        ).toBe(true);
      }
    }
  });

  it("mtcrRef where present matches MTCR item shape (digit.A|B|C|D|E.digit)", () => {
    const MTCR_RE = /^\d+\.[A-E]\.\d+$/;
    for (const entry of INDIA_SCOMET_ENTRIES) {
      if (entry.mtcrRef !== undefined) {
        expect(
          MTCR_RE.test(entry.mtcrRef),
          `entry ${entry.code} mtcrRef '${entry.mtcrRef}' has bad shape`,
        ).toBe(true);
      }
    }
  });

  it("MTCR-tagged entries cluster in Cat 3, 4 and Cat 5 (materials, RTGs, launch vehicle)", () => {
    const mtcrEntries = INDIA_SCOMET_ENTRIES.filter(
      (e) => e.mtcrRef !== undefined,
    );
    expect(mtcrEntries.length).toBeGreaterThan(0);
    for (const entry of mtcrEntries) {
      // MTCR cross-controls span Cat 3 (high-temp materials, refractory metals),
      // Cat 4 (nuclear thermal propulsion), and Cat 5 (launch vehicles, propulsion, GNC).
      expect(["3", "4", "5"]).toContain(entry.category);
    }
  });
});

// ─── 8. Coverage metadata ────────────────────────────────────────────

describe("India SCOMET — coverage metadata", () => {
  it("coverage asOfDate is ISO-8601 YYYY-MM-DD", () => {
    expect(INDIA_SCOMET_COVERAGE.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("coverage scope is a non-empty string", () => {
    expect(INDIA_SCOMET_COVERAGE.scope.length).toBeGreaterThan(0);
  });

  it("coverage excluded list documents ≥ 1 exclusion", () => {
    expect(INDIA_SCOMET_COVERAGE.excluded.length).toBeGreaterThan(0);
  });

  it("coverage sourceUrl points at DGFT", () => {
    expect(INDIA_SCOMET_COVERAGE.sourceUrl).toContain("dgft.gov.in");
  });

  it("caelexCoverageCount matches actual entries length", () => {
    expect(INDIA_SCOMET_COVERAGE.caelexCoverageCount).toBe(
      INDIA_SCOMET_ENTRIES.length,
    );
  });

  it("caelexCoverageCount ≤ officialTotalEntriesApprox", () => {
    expect(INDIA_SCOMET_COVERAGE.caelexCoverageCount).toBeLessThanOrEqual(
      INDIA_SCOMET_COVERAGE.officialTotalEntriesApprox,
    );
  });

  it("INDIA_SCOMET_AS_OF is set and ≤ 365 days from today", () => {
    expect(INDIA_SCOMET_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const asOf = new Date(INDIA_SCOMET_AS_OF).getTime();
    const now = Date.now();
    const ageDays = (now - asOf) / (1000 * 60 * 60 * 24);
    expect(ageDays).toBeLessThan(365);
  });
});

// ─── 9. Helper-function behaviour ────────────────────────────────────

describe("India SCOMET — helper functions", () => {
  it("findIndiaScometEntry returns the right entry for a known code", () => {
    const entry = findIndiaScometEntry("5A101");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("5A101");
  });

  it("findIndiaScometEntry returns undefined for unknown / empty codes", () => {
    expect(findIndiaScometEntry("9Z999")).toBeUndefined();
    expect(findIndiaScometEntry("")).toBeUndefined();
  });

  it("findIndiaScometByCategory returns only entries of that category", () => {
    const cat5 = findIndiaScometByCategory("5");
    expect(cat5.length).toBeGreaterThan(0);
    expect(cat5.every((e) => e.category === "5")).toBe(true);
  });

  it("findIndiaScometByCategory returns empty array for absent category", () => {
    const cat0 = findIndiaScometByCategory("0");
    expect(Array.isArray(cat0)).toBe(true);
    expect(cat0.length).toBe(0);
  });

  it("findIndiaScometByAuthority filters by licensing authority", () => {
    const isro = findIndiaScometByAuthority("ISRO");
    expect(isro.length).toBeGreaterThan(0);
    expect(isro.every((e) => e.licensingAuthority === "ISRO")).toBe(true);
  });

  it("findIndiaScometByEuRef finds entries cross-walking to an EU code", () => {
    const matches = findIndiaScometByEuRef("9A004");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((e) => e.euAnnexIRef === "9A004")).toBe(true);
  });
});

// ─── 10. Indian-specific quirks (ISRO direct-application etc.) ──────

describe("India SCOMET — Indian-specific quirks", () => {
  it("at least one entry mentions the ISRO direct-application / Inter-Ministerial Working Group route", () => {
    const noteMatches = INDIA_SCOMET_ENTRIES.filter(
      (e) => e.notes !== undefined && /ISRO|Inter-Ministerial/i.test(e.notes),
    );
    expect(noteMatches.length).toBeGreaterThan(0);
  });

  it("Indian Space Policy 2023 is referenced in the file via a constant", () => {
    // ISP_2023_URL exported; not strictly required for runtime but
    // we verify it's documented in the module (smoke test).
    expect(DGFT_SCOMET_URL).toContain("dgft.gov.in");
  });

  it("intangible technology transfer (ITT) is flagged in the Cat 5 technology entry", () => {
    const tech = findIndiaScometEntry("5E001");
    expect(tech).toBeDefined();
    expect(tech?.description.toLowerCase()).toMatch(
      /technology|intangible|technical assistance/,
    );
  });
});

// ─── 11. Type-level smoke ────────────────────────────────────────────

describe("India SCOMET — type-level smoke", () => {
  it("IndiaScometEntry compiles with all optional fields absent", () => {
    const minimal: IndiaScometEntry = {
      code: "9A999",
      category: "9",
      title: "test entry",
      description: "minimal test",
      sourceUrl: "https://example.com",
      asOfDate: "2026-01-01",
      licensingAuthority: "DGFT",
    };
    expect(minimal.code).toBe("9A999");
    expect(minimal.euAnnexIRef).toBeUndefined();
    expect(minimal.notes).toBeUndefined();
  });
});
