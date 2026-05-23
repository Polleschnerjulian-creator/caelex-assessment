/**
 * Sprint Z24c + Z24d (Tier 3) — EU Annex I Software (9D) + Technology
 * (9E) + Additional Munitions (AM) coverage tests.
 *
 * Confirms that the Cat-9 software/technology companion entries and
 * the new EU-autonomous AM-prefix entries are present, schema-conformant,
 * and properly cited.
 *
 * Sources:
 *   - Reg. (EU) 2021/821 Annex I, Cat. 9 Sections D + E (consolidated)
 *   - Delegated Reg. (EU) 2025/2003 (OJ L 2025/2003, 14.11.2025)
 *
 * Z24c adds 15 entries (8 × 9D + 7 × 9E) — deemed-export companions to
 * the 9A hardware ECCNs added by Z24a + Z24b. No parametric cross-walk
 * additions (software/tech entries are textual capture surfaces).
 *
 * Z24d adds 8 AM-prefix entries — EU-autonomous controls introduced
 * outside Wassenaar consensus by Delegated Reg. 2025/2003. Coverage of
 * the aerospace-relevant slice (quantum cooling, refractory metal AM,
 * hypersonic test, IOS, OISL, sub-meter SAR, on-board AI EO, anti-jam
 * GNSS).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  EU_ANNEX_I_ENTRIES,
  EU_ANNEX_I_COVERAGE,
  findEuAnnexIEntry,
} from "./eu-annex-i";

const Z24C_SOFTWARE_ECCNS = [
  "9D001",
  "9D002",
  "9D003",
  "9D004",
  "9D005",
  "9D101",
  "9D103",
  "9D104",
] as const;

const Z24C_TECHNOLOGY_ECCNS = [
  "9E001",
  "9E002",
  "9E003",
  "9E101",
  "9E102",
  "9E103",
  "9E104",
] as const;

const Z24C_ALL_ECCNS = [
  ...Z24C_SOFTWARE_ECCNS,
  ...Z24C_TECHNOLOGY_ECCNS,
] as const;

const Z24C_MTCR_ECCNS = [
  "9D101",
  "9D103",
  "9D104",
  "9E101",
  "9E102",
  "9E103",
  "9E104",
] as const;

const Z24D_AM_ECCNS = [
  "AM-001",
  "AM-002",
  "AM-003",
  "AM-004",
  "AM-005",
  "AM-006",
  "AM-007",
  "AM-008",
] as const;

// ─── 1. Z24c presence — Software (9D) + Technology (9E) ───────────────

describe("Z24c — EU Annex I Cat-9 software + tech presence", () => {
  it("all 8 Z24c software (9D) ECCNs are present in EU_ANNEX_I_ENTRIES", () => {
    for (const code of Z24C_SOFTWARE_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry, `missing EU Annex I entry for ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("all 7 Z24c technology (9E) ECCNs are present in EU_ANNEX_I_ENTRIES", () => {
    for (const code of Z24C_TECHNOLOGY_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry, `missing EU Annex I entry for ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("no duplicate code under EU_ANNEX_I for the Z24c range", () => {
    for (const code of Z24C_ALL_ECCNS) {
      const matches = EU_ANNEX_I_ENTRIES.filter((e) => e.code === code);
      expect(
        matches.length,
        `${code} appears ${matches.length} times in EU_ANNEX_I_ENTRIES`,
      ).toBe(1);
    }
  });

  it("Z24c MTCR-derived entries carry MT control reason + mtcrCategory", () => {
    for (const code of Z24C_MTCR_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.controlReasons.includes("MT"),
        `${code} should carry MT control reason — it's MTCR-derived`,
      ).toBe(true);
      expect(
        entry?.mtcrCategory,
        `${code} should declare mtcrCategory (I or II)`,
      ).toMatch(/^(I|II)$/);
    }
  });
});

// ─── 2. Z24c schema conformance ────────────────────────────────────────

describe("Z24c — schema conformance (software + technology)", () => {
  it("each Z24c entry has a non-empty title (≤120 chars)", () => {
    for (const code of Z24C_ALL_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.title.length, `${code} title is empty`).toBeGreaterThan(0);
      expect(
        entry?.title.length ?? Infinity,
        `${code} title exceeds 120 chars`,
      ).toBeLessThanOrEqual(120);
    }
  });

  it("each Z24c entry has a substantive description (>= 80 chars)", () => {
    for (const code of Z24C_ALL_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.description.length ?? 0,
        `${code} description is too short`,
      ).toBeGreaterThanOrEqual(80);
    }
  });

  it("each Z24c entry has a sourceUrl pointing at eur-lex", () => {
    for (const code of Z24C_ALL_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.sourceUrl, `${code} has empty sourceUrl`).toMatch(
        /eur-lex\.europa\.eu/,
      );
    }
  });

  it("each Z24c entry has an ISO-8601 asOfDate", () => {
    for (const code of Z24C_ALL_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("each Z24c entry declares at least one control reason", () => {
    for (const code of Z24C_ALL_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.controlReasons.length ?? 0,
        `${code} has no control reasons`,
      ).toBeGreaterThan(0);
    }
  });
});

// ─── 3. Z24d presence — AM (Additional Munitions) entries ─────────────

describe("Z24d — EU Annex I AM-prefix entries presence", () => {
  it("all 8 Z24d AM-prefix ECCNs are present in EU_ANNEX_I_ENTRIES", () => {
    for (const code of Z24D_AM_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry, `missing EU Annex I entry for ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("no duplicate AM code under EU_ANNEX_I", () => {
    for (const code of Z24D_AM_ECCNS) {
      const matches = EU_ANNEX_I_ENTRIES.filter((e) => e.code === code);
      expect(
        matches.length,
        `${code} appears ${matches.length} times in EU_ANNEX_I_ENTRIES`,
      ).toBe(1);
    }
  });

  it("all AM entries cite the Delegated Reg. 2025/2003 source URL", () => {
    const expectedHost = "eur-lex.europa.eu";
    for (const code of Z24D_AM_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.sourceUrl, `${code} has empty sourceUrl`).toContain(
        expectedHost,
      );
      // AM entries are all EU-autonomous from Delegated Reg. 2025/2003 —
      // their sourceUrl should point at the 2025/2003 ELI URI rather
      // than the consolidated CELEX 02021R0821 base.
      expect(
        entry?.sourceUrl,
        `${code} should cite Delegated Reg. 2025/2003 ELI URI`,
      ).toMatch(/2025\/2003/);
    }
  });

  it("all AM entries cite EU-autonomous origin in their description", () => {
    for (const code of Z24D_AM_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.description,
        `${code} description should mention EU-autonomous origin`,
      ).toMatch(/EU-autonomous/i);
    }
  });
});

// ─── 4. Z24d schema conformance ────────────────────────────────────────

describe("Z24d — schema conformance (AM entries)", () => {
  it("each Z24d entry has a non-empty title (≤120 chars)", () => {
    for (const code of Z24D_AM_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.title.length, `${code} title is empty`).toBeGreaterThan(0);
      expect(
        entry?.title.length ?? Infinity,
        `${code} title exceeds 120 chars`,
      ).toBeLessThanOrEqual(120);
    }
  });

  it("each Z24d entry has a substantive description (>= 80 chars)", () => {
    for (const code of Z24D_AM_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.description.length ?? 0,
        `${code} description is too short`,
      ).toBeGreaterThanOrEqual(80);
    }
  });

  it("each Z24d entry has an ISO-8601 asOfDate", () => {
    for (const code of Z24D_AM_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("each Z24d entry declares at least one control reason", () => {
    for (const code of Z24D_AM_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.controlReasons.length ?? 0,
        `${code} has no control reasons`,
      ).toBeGreaterThan(0);
    }
  });
});

// ─── 5. Coverage-count bump ────────────────────────────────────────────

describe("Z24c + Z24d — caelexCoverageCount", () => {
  it("caelexCoverageCount equals the actual entry count", () => {
    expect(EU_ANNEX_I_COVERAGE.caelexCoverageCount).toBe(
      EU_ANNEX_I_ENTRIES.length,
    );
  });

  it("caelexCoverageCount is at least 68 (post-Z24c+Z24d minimum)", () => {
    expect(EU_ANNEX_I_COVERAGE.caelexCoverageCount).toBeGreaterThanOrEqual(68);
  });
});

// ─── 6. Cross-references stay sound ───────────────────────────────────

describe("Z24c + Z24d — crossReferenceTopic invariants", () => {
  it("Z24c entries with a crossReferenceTopic use kebab-case slugs", () => {
    for (const code of Z24C_ALL_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      if (entry?.crossReferenceTopic) {
        expect(
          entry.crossReferenceTopic,
          `${code} crossReferenceTopic should be kebab-case`,
        ).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    }
  });

  it("Z24d entries with a crossReferenceTopic use kebab-case slugs", () => {
    for (const code of Z24D_AM_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      if (entry?.crossReferenceTopic) {
        expect(
          entry.crossReferenceTopic,
          `${code} crossReferenceTopic should be kebab-case`,
        ).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    }
  });
});
