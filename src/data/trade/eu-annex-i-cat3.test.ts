/**
 * Sprint Z32a (Tier 4) — EU Annex I Category 3 (Electronics) coverage tests.
 *
 * Verifies that the Cat-3 enumeration covers the headline-ECCN segments
 * required by the Z32a brief:
 *
 *   - 3A001.a.* (general & rad-hard ICs, incl. .a.2 TID-tolerance gate)
 *   - 3A001.b.* (discrete & power semiconductors, GaN HEMTs)
 *   - 3A001.c.* (memory)
 *   - 3A001.d.* (opto-electronic devices)
 *   - 3A001.h.* (atomic-frequency standards)
 *   - 3A090 / 3A091 / 3A092 (advanced-computing AI + EUV)
 *   - 3A2xx (nuclear-relevant)
 *   - 3A501 / 3A611 (EU-autonomous cyber-surveillance + mil)
 *   - 3B (production equipment)
 *   - 3C (materials)
 *   - 3D (software)
 *   - 3E (technology)
 *   - AM-3A-* (EU-autonomous space-specific additions)
 *
 * Sources:
 *   - Reg. (EU) 2021/821 Annex I, Cat 3 (consolidated text)
 *   - Delegated Reg. (EU) 2025/2003 (OJ L 2025/2003)
 *   - Z25 Tier-3 parametric attribute `radHardenedTID_krad`
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  EU_ANNEX_I_CAT3_ENTRIES,
  EU_ANNEX_I_CAT3_COVERAGE,
  findEuAnnexICat3Entry,
  findEuAnnexICat3EntriesByTopic,
} from "./eu-annex-i-cat3";
import { EU_ANNEX_I_ENTRIES } from "./eu-annex-i";
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

const HEADLINE_3A001_CODES = [
  "3A001.a.2",
  "3A001.a.3",
  "3A001.a.4",
  "3A001.a.5",
  "3A001.a.7",
  "3A001.a.10",
  "3A001.a.12",
  "3A001.b.1",
  "3A001.b.3",
  "3A001.b.4",
  "3A001.b.5",
  "3A001.c.1",
  "3A001.d.1",
  "3A001.d.3",
  "3A001.e.1",
  "3A001.e.2",
  "3A001.h.1",
  "3A001.h.2",
] as const;

const ADVANCED_COMPUTING_CODES = [
  "3A090.a",
  "3A090.b",
  "3A091",
  "3A092",
] as const;

const PRODUCTION_EQUIPMENT_CODES = [
  "3B001.a",
  "3B001.c",
  "3B001.d",
  "3B001.e",
  "3B001.h",
  "3B002",
  "3B991",
] as const;

const MATERIAL_CODES = [
  "3C001",
  "3C002",
  "3C003",
  "3C004",
  "3C005",
  "3C006",
] as const;

const SOFTWARE_CODES = [
  "3D001",
  "3D002",
  "3D003",
  "3D004",
  "3D090",
  "3D101",
  "3D991",
] as const;

const TECHNOLOGY_CODES = [
  "3E001",
  "3E002",
  "3E003",
  "3E090",
  "3E101",
  "3E201",
  "3E991",
] as const;

const AM_PREFIX_CODES = ["AM-3A-001", "AM-3A-002", "AM-3A-003"] as const;

const NUCLEAR_CODES = ["3A201.a", "3A225", "3A228"] as const;

const ALL_CODES = [
  ...HEADLINE_3A001_CODES,
  ...ADVANCED_COMPUTING_CODES,
  ...PRODUCTION_EQUIPMENT_CODES,
  ...MATERIAL_CODES,
  ...SOFTWARE_CODES,
  ...TECHNOLOGY_CODES,
  ...AM_PREFIX_CODES,
  ...NUCLEAR_CODES,
  "3A002.a",
  "3A002.c",
  "3A002.d",
  "3A002.g",
  "3A501",
  "3A611",
] as const;

// ─── 1. Headline 3A001 presence ──────────────────────────────────────────

describe("Z32a — 3A001 headline ICs", () => {
  it("all 18 headline 3A001 ECCNs are present", () => {
    for (const code of HEADLINE_3A001_CODES) {
      const entry = findEuAnnexICat3Entry(code);
      expect(entry, `missing Cat-3 entry for ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("3A001.a.5 (space-grade rad-hard) carries NS + MT control reasons", () => {
    const entry = findEuAnnexICat3Entry("3A001.a.5");
    expect(entry).toBeDefined();
    expect(entry?.controlReasons).toContain("NS");
    expect(entry?.controlReasons).toContain("MT");
  });

  it("3A001.h.1 (atomic-frequency standards) uses gnss-receivers-imus-star-trackers topic", () => {
    const entry = findEuAnnexICat3Entry("3A001.h.1");
    expect(entry?.crossReferenceTopic).toBe(
      "gnss-receivers-imus-star-trackers",
    );
  });

  it("3A001.b.1 (GaN/GaAs HEMTs) is captured", () => {
    const entry = findEuAnnexICat3Entry("3A001.b.1");
    expect(entry).toBeDefined();
    expect(entry?.title.toLowerCase()).toMatch(/gan|gaas|hemt/);
  });
});

// ─── 2. Advanced-computing & lithography ─────────────────────────────────

describe("Z32a — 3A090 advanced-computing + lithography", () => {
  it("3A090.a (Oct 2022 IFR TPP > 4800) is captured", () => {
    const entry = findEuAnnexICat3Entry("3A090.a");
    expect(entry).toBeDefined();
    expect(entry?.description).toMatch(/TPP|Total Processing Performance/);
  });

  it("3A092 (EUV lithography) is captured", () => {
    const entry = findEuAnnexICat3Entry("3A092");
    expect(entry).toBeDefined();
    expect(entry?.description).toMatch(/EUV|13\.5\s*nm/i);
  });

  it("all 3A090/.b/3A091/3A092 codes are present", () => {
    for (const code of ADVANCED_COMPUTING_CODES) {
      const entry = findEuAnnexICat3Entry(code);
      expect(entry, `missing entry for ${code}`).toBeDefined();
    }
  });
});

// ─── 3. Production equipment, materials, software, technology ────────────

describe("Z32a — 3B/3C/3D/3E full enumeration", () => {
  it("all 7 3B production-equipment codes are present", () => {
    for (const code of PRODUCTION_EQUIPMENT_CODES) {
      const entry = findEuAnnexICat3Entry(code);
      expect(entry, `missing ${code}`).toBeDefined();
    }
  });

  it("all 6 3C materials codes are present", () => {
    for (const code of MATERIAL_CODES) {
      const entry = findEuAnnexICat3Entry(code);
      expect(entry, `missing ${code}`).toBeDefined();
    }
  });

  it("all 7 3D software codes are present", () => {
    for (const code of SOFTWARE_CODES) {
      const entry = findEuAnnexICat3Entry(code);
      expect(entry, `missing ${code}`).toBeDefined();
    }
  });

  it("all 7 3E technology codes are present", () => {
    for (const code of TECHNOLOGY_CODES) {
      const entry = findEuAnnexICat3Entry(code);
      expect(entry, `missing ${code}`).toBeDefined();
    }
  });

  it("3D101 + 3E101 carry MTCR-II category", () => {
    expect(findEuAnnexICat3Entry("3D101")?.mtcrCategory).toBe("II");
    expect(findEuAnnexICat3Entry("3E101")?.mtcrCategory).toBe("II");
  });
});

// ─── 4. EU-autonomous AM additions ───────────────────────────────────────

describe("Z32a — AM-3A-* EU-autonomous additions", () => {
  it("all 3 AM-3A-* codes are present", () => {
    for (const code of AM_PREFIX_CODES) {
      const entry = findEuAnnexICat3Entry(code);
      expect(entry, `missing ${code}`).toBeDefined();
    }
  });

  it("all AM-3A-* entries cite the Delegated Reg. 2025/2003 source URL", () => {
    for (const code of AM_PREFIX_CODES) {
      const entry = findEuAnnexICat3Entry(code);
      expect(entry?.sourceUrl).toMatch(/2025\/2003/);
    }
  });

  it("AM-3A-001 (on-board AI accelerators) is captured", () => {
    const entry = findEuAnnexICat3Entry("AM-3A-001");
    expect(entry?.description.toLowerCase()).toMatch(
      /neural.network|inference|on-board/,
    );
  });

  it("AM-3A-003 (optical clocks) cross-references GNSS topic", () => {
    const entry = findEuAnnexICat3Entry("AM-3A-003");
    expect(entry?.crossReferenceTopic).toBe(
      "gnss-receivers-imus-star-trackers",
    );
  });
});

// ─── 5. Schema conformance ───────────────────────────────────────────────

describe("Z32a — schema conformance", () => {
  it("every entry has a non-empty title ≤100 chars", () => {
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      expect(entry.title.length, `${entry.code} title empty`).toBeGreaterThan(
        0,
      );
      expect(
        entry.title.length,
        `${entry.code} title exceeds 100 chars (${entry.title.length})`,
      ).toBeLessThanOrEqual(100);
    }
  });

  it("every entry has a substantive description ≥ 60 chars", () => {
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      expect(
        entry.description.length,
        `${entry.code} description too short`,
      ).toBeGreaterThanOrEqual(60);
    }
  });

  it("every entry has at least one controlReason", () => {
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      expect(
        entry.controlReasons.length,
        `${entry.code} missing controlReasons`,
      ).toBeGreaterThan(0);
    }
  });

  it("every entry has a sourceUrl pointing at eur-lex", () => {
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      expect(entry.sourceUrl).toMatch(/eur-lex\.europa\.eu/);
    }
  });

  it("every entry has an ISO-8601 asOfDate", () => {
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      expect(entry.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every entry has jurisdiction EU_ANNEX_I", () => {
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      expect(entry.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("controlReasons use the canonical vocabulary", () => {
    const valid = new Set([
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
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      for (const r of entry.controlReasons) {
        expect(
          valid.has(r),
          `invalid controlReason '${r}' on ${entry.code}`,
        ).toBe(true);
      }
    }
  });
});

// ─── 6. Uniqueness & coverage count ──────────────────────────────────────

describe("Z32a — uniqueness & coverage", () => {
  it("no duplicate code in EU_ANNEX_I_CAT3_ENTRIES", () => {
    const seen = new Set<string>();
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      expect(seen.has(entry.code), `duplicate code: ${entry.code}`).toBe(false);
      seen.add(entry.code);
    }
  });

  it("caelexCoverageCount matches the array length", () => {
    expect(EU_ANNEX_I_CAT3_COVERAGE.caelexCoverageCount).toBe(
      EU_ANNEX_I_CAT3_ENTRIES.length,
    );
  });

  it("entry count is in the 50-70 target band", () => {
    expect(EU_ANNEX_I_CAT3_ENTRIES.length).toBeGreaterThanOrEqual(50);
    expect(EU_ANNEX_I_CAT3_ENTRIES.length).toBeLessThanOrEqual(80);
  });

  it("no overlap with EU_ANNEX_I_ENTRIES (Cat-3 entries already present)", () => {
    const existingCodes = new Set(EU_ANNEX_I_ENTRIES.map((e) => e.code));
    for (const entry of EU_ANNEX_I_CAT3_ENTRIES) {
      expect(
        existingCodes.has(entry.code),
        `${entry.code} duplicates an existing EU_ANNEX_I_ENTRIES code`,
      ).toBe(false);
    }
  });
});

// ─── 7. Lookup helpers ───────────────────────────────────────────────────

describe("Z32a — lookup helpers", () => {
  it("findEuAnnexICat3Entry returns entry for known code", () => {
    const entry = findEuAnnexICat3Entry("3A090.a");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("3A090.a");
  });

  it("findEuAnnexICat3Entry returns undefined for unknown code", () => {
    expect(findEuAnnexICat3Entry("9Z999")).toBeUndefined();
  });

  it("findEuAnnexICat3EntriesByTopic returns the rad-hard cluster", () => {
    const entries = findEuAnnexICat3EntriesByTopic(
      "spacecraft-rad-hard-electronics",
    );
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.crossReferenceTopic).toBe("spacecraft-rad-hard-electronics");
    }
  });
});

// ─── 8. Cross-walk additions (Z34-Cat3) ──────────────────────────────────

describe("Z34-Cat3 — parametric cross-walk additions", () => {
  it("EU:3A001.a.2 exists with radHardenedTID_krad predicate", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:3A001.a.2",
    );
    expect(entry, "EU:3A001.a.2 missing from cross-walk").toBeDefined();
    const pred = entry?.predicates.find(
      (p) => p.attribute === "radHardenedTID_krad",
    );
    expect(
      pred,
      "EU:3A001.a.2 missing radHardenedTID_krad predicate",
    ).toBeDefined();
    expect(pred?.op).toBe("gte");
    expect(typeof pred?.value).toBe("number");
  });

  it("EU:3A001.a.5 exists with rad-hard predicates", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:3A001.a.5",
    );
    expect(entry, "EU:3A001.a.5 missing from cross-walk").toBeDefined();
    expect(entry?.regime).toBe("EU-ANNEX-I");
    const tidPred = entry?.predicates.find(
      (p) => p.attribute === "radHardenedTID_krad",
    );
    expect(tidPred).toBeDefined();
  });

  it("EU:3A090.a exists with parametricAttributes predicates", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:3A090.a",
    );
    expect(entry, "EU:3A090.a missing from cross-walk").toBeDefined();
    expect(entry?.predicates.length).toBeGreaterThan(0);
  });

  it("EU:3A001.h.1 exists (atomic-frequency standard entry)", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:3A001.h.1",
    );
    expect(entry, "EU:3A001.h.1 missing from cross-walk").toBeDefined();
    expect(entry?.regime).toBe("EU-ANNEX-I");
  });

  it("all Cat-3 cross-walk entries are tagged regime = 'EU-ANNEX-I'", () => {
    for (const id of [
      "EU:3A001.a.2",
      "EU:3A001.a.5",
      "EU:3A090.a",
      "EU:3A001.h.1",
    ] as const) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry?.regime).toBe("EU-ANNEX-I");
    }
  });
});

// ─── 9. Coverage scope check ─────────────────────────────────────────────

describe("Z32a — coverage scope completeness", () => {
  it("all expected Cat-3 codes are accounted for", () => {
    for (const code of ALL_CODES) {
      expect(findEuAnnexICat3Entry(code), `missing ${code}`).toBeDefined();
    }
  });

  it("coverage.jurisdiction is EU_ANNEX_I", () => {
    expect(EU_ANNEX_I_CAT3_COVERAGE.jurisdiction).toBe("EU_ANNEX_I");
  });

  it("coverage.asOfDate is a valid ISO-8601 date", () => {
    expect(EU_ANNEX_I_CAT3_COVERAGE.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
