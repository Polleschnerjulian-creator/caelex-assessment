/**
 * Sprint Z34 (Tier 6) — EU Annex I Cat 6 Sensors & Lasers
 * full-enumeration coverage tests.
 *
 * Confirms that:
 *   1. The Cat-6 enumeration ships every required top-level entry
 *      (6A001-6A008, 6B*, 6C*, 6D*, 6E*) plus the MTCR-derived
 *      6A1xx variants.
 *   2. Each entry conforms to the ClassificationEntry schema.
 *   3. The companion parametric cross-walk additions (Z34-Cat6
 *      section) are present for the SPACE-CRITICAL codes (6A002.a.4,
 *      6A002.b, 6A003.b, 6A004.a, 6A005.a, 6A005.d, 6A006,
 *      6A008.j).
 *   4. The helper lookup functions work end-to-end.
 *   5. Coverage metadata matches the entry count.
 *
 * Source: Reg. (EU) 2021/821 Annex I, Cat. 6 (consolidated text).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  EU_ANNEX_I_CAT6_COVERAGE,
  EU_ANNEX_I_CAT6_ENTRIES,
  findEuAnnexICat6Entry,
  findEuAnnexICat6EntriesByPrefix,
  findEuAnnexICat6EntriesByTopic,
} from "./eu-annex-i-cat6";
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

// ─── Required top-level codes ─────────────────────────────────────────

const REQUIRED_TOP_LEVEL = [
  "6A001", // Acoustic
  "6A002", // Optical sensors
  "6A003", // Cameras
  "6A004", // Optics
  "6A005", // Lasers
  "6A006", // Magnetometers
  "6A007", // Gravity meters
  "6A008", // Radar (SAR)
  // MTCR-derived
  "6A102",
  "6A107",
  "6A108",
  // Test/production
  "6B004",
  "6B007",
  "6B008",
  // Materials
  "6C002",
  "6C004",
  "6C005",
  // Software
  "6D001",
  "6D002",
  "6D003",
  "6D004",
  // Technology
  "6E001",
  "6E002",
  "6E003",
  "6E101",
] as const;

const Z34_CROSS_WALK_IDS = [
  "EU:6A002.a.4",
  "EU:6A002.b",
  "EU:6A003.b",
  "EU:6A004.a",
  // 6A005 regime-migration (2026-06-13): fiber-CW screen → .a (non-tunable
  // CW), semiconductor-diode CW screen → .d (the Nota-Bene 'other' media).
  "EU:6A005.a",
  "EU:6A005.d",
  "EU:6A006",
  "EU:6A008.j",
] as const;

// ─── 1. Top-level presence ────────────────────────────────────────────

describe("Z34-Cat6 — EU Annex I Cat 6 top-level presence", () => {
  it("all required Cat-6 top-level codes are present", () => {
    for (const code of REQUIRED_TOP_LEVEL) {
      const entry = findEuAnnexICat6Entry(code);
      expect(entry, `missing EU Annex I entry for ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("no duplicate code in EU_ANNEX_I_CAT6_ENTRIES", () => {
    const codes = EU_ANNEX_I_CAT6_ENTRIES.map((e) => e.code);
    const dupes = codes.filter((code, i) => codes.indexOf(code) !== i);
    expect(dupes).toEqual([]);
  });

  it("ships at least 60 entries (target: full Cat-6 enumeration)", () => {
    expect(EU_ANNEX_I_CAT6_ENTRIES.length).toBeGreaterThanOrEqual(60);
  });
});

// ─── 2. Schema conformance ────────────────────────────────────────────

describe("Z34-Cat6 — schema conformance", () => {
  it("each entry has a non-empty title ≤100 chars", () => {
    for (const entry of EU_ANNEX_I_CAT6_ENTRIES) {
      expect(
        entry.title.length,
        `${entry.code} title is empty`,
      ).toBeGreaterThan(0);
      expect(
        entry.title.length,
        `${entry.code} title exceeds 100 chars`,
      ).toBeLessThanOrEqual(100);
    }
  });

  it("each entry has a non-empty description", () => {
    for (const entry of EU_ANNEX_I_CAT6_ENTRIES) {
      expect(
        entry.description.length,
        `${entry.code} description is empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("each entry has at least one controlReason", () => {
    for (const entry of EU_ANNEX_I_CAT6_ENTRIES) {
      expect(
        entry.controlReasons.length,
        `${entry.code} has no controlReasons`,
      ).toBeGreaterThan(0);
    }
  });

  it("each entry has a sourceUrl pointing at eur-lex", () => {
    for (const entry of EU_ANNEX_I_CAT6_ENTRIES) {
      expect(entry.sourceUrl).toMatch(/eur-lex\.europa\.eu/);
    }
  });

  it("each entry has a valid ISO-8601 asOfDate", () => {
    for (const entry of EU_ANNEX_I_CAT6_ENTRIES) {
      expect(entry.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("each entry carries jurisdiction = 'EU_ANNEX_I'", () => {
    for (const entry of EU_ANNEX_I_CAT6_ENTRIES) {
      expect(entry.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("each entry has a code that starts with '6' (Cat 6)", () => {
    for (const entry of EU_ANNEX_I_CAT6_ENTRIES) {
      expect(
        entry.code.startsWith("6"),
        `${entry.code} does not start with '6'`,
      ).toBe(true);
    }
  });

  it("controlReasons only contain valid values", () => {
    const validReasons = new Set([
      "NS",
      "MT",
      "NP",
      "CB",
      "AT",
      "RS",
      "SI",
      "CC",
      "EI",
      "HR",
      "UN",
      "FC",
    ]);
    for (const entry of EU_ANNEX_I_CAT6_ENTRIES) {
      for (const reason of entry.controlReasons) {
        expect(
          validReasons.has(reason),
          `invalid controlReason '${reason}' on ${entry.code}`,
        ).toBe(true);
      }
    }
  });
});

// ─── 3. MTCR markings ─────────────────────────────────────────────────

describe("Z34-Cat6 — MTCR-derived 6A1xx entries carry 'MT' control reason", () => {
  it("6A102 carries 'MT'", () => {
    const entry = findEuAnnexICat6Entry("6A102");
    expect(entry?.controlReasons).toContain("MT");
  });

  it("6A107 carries 'MT'", () => {
    const entry = findEuAnnexICat6Entry("6A107");
    expect(entry?.controlReasons).toContain("MT");
  });

  it("6A108 carries 'MT'", () => {
    const entry = findEuAnnexICat6Entry("6A108");
    expect(entry?.controlReasons).toContain("MT");
  });

  it("6E101 (MTCR-related tech) carries 'MT'", () => {
    const entry = findEuAnnexICat6Entry("6E101");
    expect(entry?.controlReasons).toContain("MT");
  });
});

// ─── 4. Cross-walk parametric tripwires ───────────────────────────────

describe("Z34-Cat6 — parametric cross-walk additions", () => {
  it("all Z34 cross-walk IDs are present", () => {
    for (const id of Z34_CROSS_WALK_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry, `missing ${id} in CONTROL_LIST_CROSS_WALK`).toBeDefined();
    }
  });

  it("all Z34 cross-walk entries carry regime = 'EU-ANNEX-I'", () => {
    for (const id of Z34_CROSS_WALK_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry?.regime).toBe("EU-ANNEX-I");
    }
  });

  it("EU:6A002.a.4 entry uses pixelPitchMicrons predicate", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:6A002.a.4",
    );
    const predicate = entry?.predicates.find(
      (p) => p.attribute === "pixelPitchMicrons",
    );
    expect(predicate, "EU:6A002.a.4 missing pixelPitchMicrons").toBeDefined();
    expect(predicate?.op).toBe("lte");
  });

  // Semiconductor diode lasers are confined to 6A005.d by the regulation's
  // Nota Bene (NOT .a/.b/.c); the CW-power screen pins EU:6A005.d at ≥ 1 W.
  it("EU:6A005.d entry (semiconductor-diode CW screen) uses transmitPowerW predicate", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:6A005.d",
    );
    const predicate = entry?.predicates.find(
      (p) => p.attribute === "transmitPowerW",
    );
    expect(predicate, "EU:6A005.d missing transmitPowerW").toBeDefined();
    expect(predicate?.op).toBe("gte");
    expect(predicate?.value).toBe(1);
  });

  // Fiber lasers are solid-state CW → 6A005.a (non-tunable CW); the ISL-range
  // power screen pins EU:6A005.a at ≥ 5 W.
  it("EU:6A005.a fiber laser threshold is at 5 W (ISL-range)", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:6A005.a",
    );
    const predicate = entry?.predicates.find(
      (p) => p.attribute === "transmitPowerW",
    );
    expect(predicate?.value).toBe(5);
  });

  it("EU:6A008.j SAR entry uses groundResolutionMeters predicate", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:6A008.j",
    );
    const predicate = entry?.predicates.find(
      (p) => p.attribute === "groundResolutionMeters",
    );
    expect(
      predicate,
      "EU:6A008.j missing groundResolutionMeters",
    ).toBeDefined();
    expect(predicate?.op).toBe("lte");
    expect(predicate?.value).toBe(3);
  });

  it("EU:6A008.j carries see-also link to EU AM-006 (sub-0.5m SAR autonomy)", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:6A008.j",
    );
    const link = entry?.seeAlso.find(
      (l) => l.regime === "EU-ANNEX-I" && l.id === "AM-006",
    );
    expect(
      link,
      "EU:6A008.j missing seeAlso to EU AM-006 for sub-0.5m GSD overlap",
    ).toBeDefined();
  });

  it("EU:6A004.a mirror entry uses apertureMM predicate", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:6A004.a",
    );
    const predicate = entry?.predicates.find(
      (p) => p.attribute === "apertureMM",
    );
    expect(predicate, "EU:6A004.a missing apertureMM predicate").toBeDefined();
    expect(predicate?.op).toBe("gte");
  });
});

// ─── 5. Helper functions ──────────────────────────────────────────────

describe("Z34-Cat6 — helper functions", () => {
  it("findEuAnnexICat6Entry returns entry for known code", () => {
    const entry = findEuAnnexICat6Entry("6A008");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("6A008");
  });

  it("findEuAnnexICat6Entry returns undefined for unknown code", () => {
    expect(findEuAnnexICat6Entry("NONEXISTENT")).toBeUndefined();
  });

  it("findEuAnnexICat6EntriesByTopic returns SAR-tagged entries", () => {
    const entries = findEuAnnexICat6EntriesByTopic(
      "synthetic-aperture-radar-payloads",
    );
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.crossReferenceTopic).toBe("synthetic-aperture-radar-payloads");
    }
  });

  it("findEuAnnexICat6EntriesByPrefix returns all 6A002 sub-paragraphs", () => {
    const entries = findEuAnnexICat6EntriesByPrefix("6A002");
    expect(entries.length).toBeGreaterThanOrEqual(5);
    for (const e of entries) {
      expect(e.code === "6A002" || e.code.startsWith("6A002.")).toBe(true);
    }
  });

  it("findEuAnnexICat6EntriesByPrefix returns all 6A005 (laser) sub-paragraphs", () => {
    const entries = findEuAnnexICat6EntriesByPrefix("6A005");
    expect(entries.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── 6. Coverage metadata ─────────────────────────────────────────────

describe("Z34-Cat6 — coverage metadata", () => {
  it("declared count matches actual entries", () => {
    expect(EU_ANNEX_I_CAT6_ENTRIES.length).toBe(
      EU_ANNEX_I_CAT6_COVERAGE.caelexCoverageCount,
    );
  });

  it("coverage jurisdiction is 'EU_ANNEX_I'", () => {
    expect(EU_ANNEX_I_CAT6_COVERAGE.jurisdiction).toBe("EU_ANNEX_I");
  });

  it("coverage as-of-date is ISO-8601", () => {
    expect(EU_ANNEX_I_CAT6_COVERAGE.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("officialTotalEntriesApprox is a positive number", () => {
    expect(EU_ANNEX_I_CAT6_COVERAGE.officialTotalEntriesApprox).toBeGreaterThan(
      0,
    );
  });
});

// ─── 7. Sub-category breadth (each major sub-cat represented) ─────────

describe("Z34-Cat6 — sub-category breadth", () => {
  it("ships entries for every 6A0xx top-level sensor type", () => {
    const codes6A0 = EU_ANNEX_I_CAT6_ENTRIES.map((e) => e.code).filter((c) =>
      /^6A00\d$/.test(c),
    );
    expect(codes6A0).toContain("6A001"); // Acoustic
    expect(codes6A0).toContain("6A002"); // Optical
    expect(codes6A0).toContain("6A003"); // Cameras
    expect(codes6A0).toContain("6A004"); // Optics
    expect(codes6A0).toContain("6A005"); // Lasers
    expect(codes6A0).toContain("6A006"); // Magnetometers
    expect(codes6A0).toContain("6A007"); // Gravity
    expect(codes6A0).toContain("6A008"); // Radar
  });

  it("ships at least one MTCR-derived 6A1xx entry", () => {
    const codes6A1 = EU_ANNEX_I_CAT6_ENTRIES.map((e) => e.code).filter((c) =>
      /^6A1\d{2}$/.test(c),
    );
    expect(codes6A1.length).toBeGreaterThan(0);
  });

  it("ships software (6D*) entries", () => {
    const codes6D = EU_ANNEX_I_CAT6_ENTRIES.map((e) => e.code).filter((c) =>
      c.startsWith("6D"),
    );
    expect(codes6D.length).toBeGreaterThan(0);
  });

  it("ships technology (6E*) entries", () => {
    const codes6E = EU_ANNEX_I_CAT6_ENTRIES.map((e) => e.code).filter((c) =>
      c.startsWith("6E"),
    );
    expect(codes6E.length).toBeGreaterThan(0);
  });

  it("ships materials (6C*) entries", () => {
    const codes6C = EU_ANNEX_I_CAT6_ENTRIES.map((e) => e.code).filter((c) =>
      c.startsWith("6C"),
    );
    expect(codes6C.length).toBeGreaterThan(0);
  });
});

// ─── 8. Cross-reference-topic invariants ──────────────────────────────

describe("Z34-Cat6 — cross-reference topic alignment", () => {
  it("EO-payload-tagged entries reference 'high-resolution-eo-payloads' topic", () => {
    const eoEntries = EU_ANNEX_I_CAT6_ENTRIES.filter(
      (e) => e.crossReferenceTopic === "high-resolution-eo-payloads",
    );
    expect(eoEntries.length).toBeGreaterThan(0);
    // Sanity: the obvious 6A002 + 6A003 codes should be in there.
    const codes = eoEntries.map((e) => e.code);
    expect(codes.some((c) => c.startsWith("6A002"))).toBe(true);
    expect(codes.some((c) => c.startsWith("6A003"))).toBe(true);
  });

  it("SAR-tagged entries reference 'synthetic-aperture-radar-payloads' topic", () => {
    const sarEntries = EU_ANNEX_I_CAT6_ENTRIES.filter(
      (e) => e.crossReferenceTopic === "synthetic-aperture-radar-payloads",
    );
    expect(sarEntries.length).toBeGreaterThan(0);
    // 6A008 is the primary radar/SAR home.
    const codes = sarEntries.map((e) => e.code);
    expect(codes.some((c) => c.startsWith("6A008"))).toBe(true);
  });

  it("laser-comm-tagged entries reference 'optical-comm-terminals' topic", () => {
    const lcEntries = EU_ANNEX_I_CAT6_ENTRIES.filter(
      (e) => e.crossReferenceTopic === "optical-comm-terminals",
    );
    expect(lcEntries.length).toBeGreaterThan(0);
  });
});
