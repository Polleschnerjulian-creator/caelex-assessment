/**
 * Sprint Z26 (Tier 3) — tests for German Ausfuhrliste Teil I A + B.
 *
 * Contract (per Z26 spec):
 *   - All entries have a valid position format
 *   - No duplicate positions
 *   - Sections balance: Teil I A (~20 entries) + Teil I B (≥ 5 entries)
 *   - Cross-references resolvable (where present)
 *   - Position 0010j is present, marked as Teil I A, and has lastAmended
 *     set to a 2025-XX month (added by 22. AWV-ÄndVO of 29 Oct 2025)
 *   - Spot-checks on key positions (0010, 0008, 0011)
 *   - Lookup helpers behave correctly
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  DE_AUSFUHRLISTE_ENTRIES,
  DE_AUSFUHRLISTE_COVERAGE,
  findDeAusfuhrlisteEntry,
  getDeAusfuhrlisteSection,
  getDeAusfuhrlisteSpaceRelevant,
  getDeAusfuhrlisteRecentlyAmended,
  type DeAusfuhrlisteEntry,
} from "./de-ausfuhrliste";

// ─── 1. Position format validity ─────────────────────────────────────

describe("Z26 — position format validity", () => {
  it("every entry has a non-empty position string", () => {
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      expect(
        entry.position.length,
        `entry ${JSON.stringify(entry).slice(0, 80)} has empty position`,
      ).toBeGreaterThan(0);
    }
  });

  it("every Teil I A position matches 4-digit (optional alpha suffix) format", () => {
    // Section A positions are written as 4 digits ("0010") plus optional
    // lowercase alpha sub-position letter ("0010j", "0010ab").
    const TEIL_A_RE = /^\d{4}[a-z]{0,2}$/;
    const teilA = DE_AUSFUHRLISTE_ENTRIES.filter((e) => e.section === "A");
    for (const entry of teilA) {
      expect(
        TEIL_A_RE.test(entry.position),
        `Teil I A position '${entry.position}' does not match /^\\d{4}[a-z]{0,2}$/`,
      ).toBe(true);
    }
  });

  it("every Teil I B position matches the documented patterns", () => {
    // Section B positions are EITHER:
    //   - 9A9xx / 9E9xx pattern (national extension to EU dual-use list)
    //   - B0xx pattern (national catch-all)
    const TEIL_B_RE = /^(9[A-E]9\d{2}|B0\d{2})$/;
    const teilB = DE_AUSFUHRLISTE_ENTRIES.filter((e) => e.section === "B");
    for (const entry of teilB) {
      expect(
        TEIL_B_RE.test(entry.position),
        `Teil I B position '${entry.position}' does not match expected pattern`,
      ).toBe(true);
    }
  });
});

// ─── 2. Uniqueness ───────────────────────────────────────────────────

describe("Z26 — uniqueness", () => {
  it("no duplicate positions across the combined list", () => {
    const positions = DE_AUSFUHRLISTE_ENTRIES.map((e) => e.position);
    const unique = new Set(positions);
    expect(
      unique.size,
      `expected ${positions.length} unique positions, got ${unique.size}`,
    ).toBe(positions.length);
  });

  it("no duplicate titles (a soft data-quality check)", () => {
    const titles = DE_AUSFUHRLISTE_ENTRIES.map((e) => e.title);
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });
});

// ─── 3. Section balance ──────────────────────────────────────────────

describe("Z26 — section balance", () => {
  it("Teil I A has ≥ 15 entries (Z26 target: ~20)", () => {
    const teilA = getDeAusfuhrlisteSection("A");
    expect(teilA.length).toBeGreaterThanOrEqual(15);
  });

  it("Teil I B has ≥ 5 entries (Z26 target: 5-10)", () => {
    const teilB = getDeAusfuhrlisteSection("B");
    expect(teilB.length).toBeGreaterThanOrEqual(5);
    expect(teilB.length).toBeLessThanOrEqual(15);
  });

  it("every entry has section either 'A' or 'B'", () => {
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      expect(["A", "B"]).toContain(entry.section);
    }
  });

  it("coverage metadata countsBySection matches actual counts", () => {
    const actualA = getDeAusfuhrlisteSection("A").length;
    const actualB = getDeAusfuhrlisteSection("B").length;
    expect(DE_AUSFUHRLISTE_COVERAGE.countsBySection.A).toBe(actualA);
    expect(DE_AUSFUHRLISTE_COVERAGE.countsBySection.B).toBe(actualB);
    expect(DE_AUSFUHRLISTE_COVERAGE.caelexCoverageCount).toBe(
      actualA + actualB,
    );
  });
});

// ─── 4. Cross-reference resolvability ────────────────────────────────

describe("Z26 — cross-reference resolvability", () => {
  it("euAnnexIRef where present contains a recognizable EU-Annex-I code or 'Art.' reference", () => {
    // EU Annex I codes look like e.g. "9A001", "1C111", "Cat 4D".
    // Allow "Art. N EU NNNN/NNNN" form for catch-all references.
    const EU_REF_RE =
      /(\d[A-E]\d{3}([a-z]?\.[a-z0-9.]+)?|Cat\s+\d|Art\.\s+\d+)/i;
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      if (entry.euAnnexIRef !== undefined) {
        expect(
          EU_REF_RE.test(entry.euAnnexIRef),
          `entry ${entry.position} has unrecognisable euAnnexIRef '${entry.euAnnexIRef}'`,
        ).toBe(true);
      }
    }
  });

  it("usmlRef where present contains a USML category roman numeral", () => {
    // USML categories are roman numerals I–XXI.
    const USML_RE =
      /USML\s+(XVIII|XVII|XIII|XII|XIX|XIV|XV|XVI|XX|XXI|VIII|VII|VI|IV|IX|XI|X|V|III|II|I)\b/i;
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      if (entry.usmlRef !== undefined) {
        expect(
          USML_RE.test(entry.usmlRef),
          `entry ${entry.position} has unrecognisable usmlRef '${entry.usmlRef}'`,
        ).toBe(true);
      }
    }
  });

  it("earRef where present matches ECCN format (e.g. 9A610, 6A005)", () => {
    // ECCNs are <digit><letter><3 digits>, optionally followed by sub-paragraphs.
    const ECCN_RE = /\d[A-E]\d{3}/;
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      if (entry.earRef !== undefined) {
        expect(
          ECCN_RE.test(entry.earRef),
          `entry ${entry.position} has unrecognisable earRef '${entry.earRef}'`,
        ).toBe(true);
      }
    }
  });
});

// ─── 5. 0010j suborbital — Z26 critical entry ────────────────────────

describe("Z26 — Position 0010j (suborbital military vehicles)", () => {
  it("0010j entry exists and is in Teil I A", () => {
    const entry = findDeAusfuhrlisteEntry("0010j");
    expect(entry, "missing critical Z26 entry 0010j").toBeDefined();
    expect(entry?.section).toBe("A");
  });

  it("0010j has lastAmended set to 2025-XX (22. AWV-ÄndVO, in force 1 Nov 2025)", () => {
    const entry = findDeAusfuhrlisteEntry("0010j");
    expect(entry?.lastAmended).toBeDefined();
    // Format YYYY-MM, year must be 2025 (in-force date 2025-11-01).
    expect(entry?.lastAmended).toMatch(/^2025-\d{2}$/);
  });

  it("0010j is flagged as space-relevant", () => {
    const entry = findDeAusfuhrlisteEntry("0010j");
    expect(entry?.spaceRelevant).toBe(true);
  });

  it("0010j legalBasis cites the 22. AWV-ÄndVO", () => {
    const entry = findDeAusfuhrlisteEntry("0010j");
    expect(entry?.legalBasis).toContain("22. AWV-ÄndVO");
  });

  it("0010j description mentions suborbital", () => {
    const entry = findDeAusfuhrlisteEntry("0010j");
    expect(entry?.description.toLowerCase()).toContain("suborbital");
  });
});

// ─── 6. Spot-checks on key positions ─────────────────────────────────

describe("Z26 — spot-checks on key positions", () => {
  it("0010 (Luftfahrzeuge) is present, Teil I A, space-relevant", () => {
    const entry = findDeAusfuhrlisteEntry("0010");
    expect(entry).toBeDefined();
    expect(entry?.section).toBe("A");
    expect(entry?.spaceRelevant).toBe(true);
    expect(entry?.title.toLowerCase()).toContain("luftfahrzeuge");
  });

  it("0008 (Treibstoffe / Sprengstoffe) is present and cross-walks to EU 1C111", () => {
    const entry = findDeAusfuhrlisteEntry("0008");
    expect(entry).toBeDefined();
    expect(entry?.section).toBe("A");
    expect(entry?.euAnnexIRef).toContain("1C111");
    expect(entry?.spaceRelevant).toBe(true);
  });

  it("0011 (military electronics) is present, Teil I A", () => {
    const entry = findDeAusfuhrlisteEntry("0011");
    expect(entry).toBeDefined();
    expect(entry?.section).toBe("A");
    expect(entry?.usmlRef).toContain("USML XI");
  });

  it("9A901 (Russia/Belarus national extension) is present in Teil I B", () => {
    const entry = findDeAusfuhrlisteEntry("9A901");
    expect(entry).toBeDefined();
    expect(entry?.section).toBe("B");
    expect(entry?.legalBasis).toContain("§ 6");
  });

  it("9A994 (civil aircraft below 0010 threshold) is present in Teil I B", () => {
    const entry = findDeAusfuhrlisteEntry("9A994");
    expect(entry).toBeDefined();
    expect(entry?.section).toBe("B");
  });

  it("9E991 + 9E992 (national tech positions) are both present", () => {
    expect(findDeAusfuhrlisteEntry("9E991")).toBeDefined();
    expect(findDeAusfuhrlisteEntry("9E992")).toBeDefined();
  });
});

// ─── 7. Required fields integrity ────────────────────────────────────

describe("Z26 — required fields integrity", () => {
  it("every entry has all required fields", () => {
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      expect(entry.position, `${entry.title} missing position`).toBeTruthy();
      expect(entry.section, `${entry.position} missing section`).toBeTruthy();
      expect(
        entry.title.length,
        `${entry.position} empty title`,
      ).toBeGreaterThan(0);
      expect(
        entry.description.length,
        `${entry.position} empty description`,
      ).toBeGreaterThan(0);
      expect(
        entry.legalBasis.length,
        `${entry.position} empty legalBasis`,
      ).toBeGreaterThan(0);
      expect(typeof entry.spaceRelevant).toBe("boolean");
    }
  });

  it("every entry's legalBasis cites AWG or AWV", () => {
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      const lb = entry.legalBasis;
      expect(
        lb.includes("AWG") || lb.includes("AWV") || lb.includes("KWKG"),
        `entry ${entry.position} legalBasis '${lb}' cites no German statute`,
      ).toBe(true);
    }
  });

  it("titles are ≤ 130 chars (loose guideline for UI)", () => {
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      expect(
        entry.title.length,
        `entry ${entry.position} title exceeds 130 chars: '${entry.title}'`,
      ).toBeLessThanOrEqual(130);
    }
  });

  it("lastAmended where present matches YYYY-MM format", () => {
    for (const entry of DE_AUSFUHRLISTE_ENTRIES) {
      if (entry.lastAmended !== undefined) {
        expect(
          entry.lastAmended,
          `entry ${entry.position} lastAmended '${entry.lastAmended}' is not YYYY-MM`,
        ).toMatch(/^\d{4}-\d{2}$/);
      }
    }
  });
});

// ─── 8. Lookup helpers ───────────────────────────────────────────────

describe("Z26 — lookup helpers", () => {
  it("findDeAusfuhrlisteEntry returns undefined for unknown position", () => {
    expect(findDeAusfuhrlisteEntry("0XXX")).toBeUndefined();
    expect(findDeAusfuhrlisteEntry("")).toBeUndefined();
  });

  it("getDeAusfuhrlisteSection returns only entries of that section", () => {
    const teilA = getDeAusfuhrlisteSection("A");
    const teilB = getDeAusfuhrlisteSection("B");
    expect(teilA.every((e) => e.section === "A")).toBe(true);
    expect(teilB.every((e) => e.section === "B")).toBe(true);
    expect(teilA.length + teilB.length).toBe(DE_AUSFUHRLISTE_ENTRIES.length);
  });

  it("getDeAusfuhrlisteSpaceRelevant returns only space-relevant entries", () => {
    const spaceRelevant = getDeAusfuhrlisteSpaceRelevant();
    expect(spaceRelevant.every((e) => e.spaceRelevant === true)).toBe(true);
    expect(spaceRelevant.length).toBeGreaterThan(0);
    expect(spaceRelevant.length).toBeLessThan(DE_AUSFUHRLISTE_ENTRIES.length);
  });

  it("getDeAusfuhrlisteRecentlyAmended returns entries with lastAmended", () => {
    const recent = getDeAusfuhrlisteRecentlyAmended();
    expect(recent.every((e) => e.lastAmended !== undefined)).toBe(true);
    // Must include 0010j (the Z26 critical add).
    expect(recent.some((e) => e.position === "0010j")).toBe(true);
  });
});

// ─── 9. Coverage metadata sanity ─────────────────────────────────────

describe("Z26 — coverage metadata", () => {
  it("coverage asOfDate is ISO-8601 YYYY-MM-DD", () => {
    expect(DE_AUSFUHRLISTE_COVERAGE.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("coverage scope is a non-empty string", () => {
    expect(DE_AUSFUHRLISTE_COVERAGE.scope.length).toBeGreaterThan(0);
  });

  it("coverage excluded list is documented (≥ 1 entry)", () => {
    expect(DE_AUSFUHRLISTE_COVERAGE.excluded.length).toBeGreaterThan(0);
  });

  it("coverage sourceUrl points at BAFA", () => {
    expect(DE_AUSFUHRLISTE_COVERAGE.sourceUrl).toContain("bafa.de");
  });

  it("caelexCoverageCount ≤ officialTotalEntriesApprox", () => {
    expect(DE_AUSFUHRLISTE_COVERAGE.caelexCoverageCount).toBeLessThanOrEqual(
      DE_AUSFUHRLISTE_COVERAGE.officialTotalEntriesApprox,
    );
  });
});

// ─── 10. Type-level smoke test ───────────────────────────────────────

describe("Z26 — type-level smoke", () => {
  it("DeAusfuhrlisteEntry exports support optional fields safely", () => {
    // Construct a minimal entry; should compile with optional fields absent.
    const minimal: DeAusfuhrlisteEntry = {
      position: "0099",
      section: "A",
      title: "test",
      description: "test description",
      legalBasis: "AWG § 4 Abs. 1",
      spaceRelevant: false,
    };
    expect(minimal.position).toBe("0099");
    expect(minimal.euAnnexIRef).toBeUndefined();
    expect(minimal.usmlRef).toBeUndefined();
    expect(minimal.lastAmended).toBeUndefined();
  });
});
