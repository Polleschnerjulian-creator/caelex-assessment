/**
 * Sprint Z34-Cat4-7 (Tier 4) — EU Annex I Cat. 4 (Computers) + Cat. 7
 * (Navigation + Avionics) coverage tests.
 *
 * Validates that the full Cat-4 + Cat-7 enumeration is structurally
 * present + schema-conformant, and that the space-critical sub-entries
 * have parametric capture in the cross-walk so the matcher engine can
 * discriminate at run time without falling back to manual review.
 *
 * Sources:
 *   - Reg. (EU) 2021/821 Annex I, Cat. 4 + Cat. 7 (consolidated text)
 *   - Delegated Reg. (EU) 2025/2003 (OJ L 2025/2003)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  EU_ANNEX_I_CAT4_ENTRIES,
  EU_ANNEX_I_CAT7_ENTRIES,
  EU_ANNEX_I_CAT4_COVERAGE,
  EU_ANNEX_I_CAT7_COVERAGE,
  findEuAnnexICat4Entry,
  findEuAnnexICat7Entry,
  findEuAnnexICat7EntriesByTopic,
  findEuAnnexICat4EntriesByPrefix,
  findEuAnnexICat7EntriesByPrefix,
} from "./eu-annex-i-cat4-7";
import { EU_ANNEX_I_ENTRIES } from "./eu-annex-i";
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

// ─── Z34-Cat4-7 — required code coverage ─────────────────────────────

const CAT4_HARDWARE_CODES = [
  "4A001",
  "4A001.a.1",
  "4A001.a.2",
  "4A003",
  "4A003.b",
  "4A003.c",
  "4A004",
  "4A090",
  "4A090.a",
] as const;

const CAT4_SW_TECH_CODES = [
  "4D001",
  "4D001.a",
  "4D001.b",
  "4D090",
  "4E001",
  "4E001.a",
] as const;

const CAT7_WASSENAAR_CODES = [
  "7A001",
  "7A001.a",
  "7A001.b",
  "7A002",
  "7A002.a",
  "7A002.b",
  "7A006",
] as const;

const CAT7_MTCR_CODES = ["7A101", "7A102", "7A104", "7A105", "7A106"] as const;

const CAT7_TEST_EQUIPMENT_CODES = ["7B001", "7B002", "7B003"] as const;

const CAT7_SW_TECH_CODES = [
  "7D001",
  "7D002",
  "7D003",
  "7D004",
  "7E001",
  "7E002",
  "7E003",
  "7E004",
  "7E101",
] as const;

const CAT47_PARAMETRIC_IDS = [
  "EU:7A002.a",
  "EU:7A003",
  "EU:7A005",
  "EU:4A090",
] as const;

// ─── 1. Cat-4 presence ────────────────────────────────────────────────

describe("Z34-Cat4-7 — Cat 4 (Computers) presence", () => {
  it("all Cat-4 hardware codes are present", () => {
    for (const code of CAT4_HARDWARE_CODES) {
      const entry = findEuAnnexICat4Entry(code);
      expect(entry, `missing Cat-4 hardware code ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("all Cat-4 software + technology codes are present", () => {
    for (const code of CAT4_SW_TECH_CODES) {
      const entry = findEuAnnexICat4Entry(code);
      expect(entry, `missing Cat-4 SW/tech code ${code}`).toBeDefined();
    }
  });

  it("4A090 (Oct 2022 IFR AI compute) is captured with delegated-reg citation", () => {
    const entry = findEuAnnexICat4Entry("4A090");
    expect(entry).toBeDefined();
    expect(entry?.sourceUrl).toMatch(/2025\/2003/);
    expect(entry?.description.toLowerCase()).toMatch(
      /advanced.computing|ai|bis.october|oct.2022/,
    );
  });

  it("4A001.a.2 (rad-hard ≥ 5×10⁵ rad(Si)) is captured and carries NS+MT", () => {
    const entry = findEuAnnexICat4Entry("4A001.a.2");
    expect(entry).toBeDefined();
    expect(entry?.controlReasons).toContain("NS");
    expect(entry?.controlReasons).toContain("MT");
    expect(entry?.crossReferenceTopic).toBe("spacecraft-rad-hard-electronics");
  });
});

// ─── 2. Cat-7 presence ────────────────────────────────────────────────

describe("Z34-Cat4-7 — Cat 7 (Navigation + Avionics) presence", () => {
  it("all Wassenaar Cat-7 hardware codes are present (7A001/7A002/7A006)", () => {
    for (const code of CAT7_WASSENAAR_CODES) {
      const entry = findEuAnnexICat7Entry(code);
      expect(entry, `missing Wassenaar Cat-7 code ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("all MTCR-derived Cat-7 codes are present (7A101-7A106)", () => {
    for (const code of CAT7_MTCR_CODES) {
      const entry = findEuAnnexICat7Entry(code);
      expect(entry, `missing MTCR Cat-7 code ${code}`).toBeDefined();
      expect(entry?.controlReasons).toContain("MT");
    }
  });

  it("all 7B test/inspection equipment codes are present", () => {
    for (const code of CAT7_TEST_EQUIPMENT_CODES) {
      const entry = findEuAnnexICat7Entry(code);
      expect(entry, `missing 7B code ${code}`).toBeDefined();
    }
  });

  it("all 7D + 7E software/technology codes are present", () => {
    for (const code of CAT7_SW_TECH_CODES) {
      const entry = findEuAnnexICat7Entry(code);
      expect(entry, `missing 7D/7E code ${code}`).toBeDefined();
    }
  });

  it("7A002.a (non-spinning gyros) carries NS+MT and the GNSS-topic linkage", () => {
    const entry = findEuAnnexICat7Entry("7A002.a");
    expect(entry).toBeDefined();
    expect(entry?.controlReasons).toContain("NS");
    expect(entry?.controlReasons).toContain("MT");
    expect(entry?.crossReferenceTopic).toBe(
      "gnss-receivers-imus-star-trackers",
    );
  });

  it("MTCR-derived 7A101-7A106 entries carry mtcrCategory = 'II'", () => {
    for (const code of CAT7_MTCR_CODES) {
      const entry = findEuAnnexICat7Entry(code);
      expect(entry?.mtcrCategory).toBe("II");
    }
  });
});

// ─── 3. Schema conformance ────────────────────────────────────────────

describe("Z34-Cat4-7 — schema conformance", () => {
  const allEntries = [...EU_ANNEX_I_CAT4_ENTRIES, ...EU_ANNEX_I_CAT7_ENTRIES];

  it("entry counts hit the target windows", () => {
    expect(EU_ANNEX_I_CAT4_ENTRIES.length).toBeGreaterThanOrEqual(15);
    expect(EU_ANNEX_I_CAT7_ENTRIES.length).toBeGreaterThanOrEqual(25);
    // Total target: 40-50.
    expect(allEntries.length).toBeGreaterThanOrEqual(40);
    expect(allEntries.length).toBeLessThanOrEqual(55);
  });

  it("coverage counts match the array lengths", () => {
    expect(EU_ANNEX_I_CAT4_COVERAGE.caelexCoverageCount).toBe(
      EU_ANNEX_I_CAT4_ENTRIES.length,
    );
    expect(EU_ANNEX_I_CAT7_COVERAGE.caelexCoverageCount).toBe(
      EU_ANNEX_I_CAT7_ENTRIES.length,
    );
  });

  it("every entry has a non-empty title (≤100 chars)", () => {
    for (const entry of allEntries) {
      expect(
        entry.title.length,
        `${entry.code} title is empty`,
      ).toBeGreaterThan(0);
      expect(
        entry.title.length,
        `${entry.code} title exceeds 100 chars (${entry.title.length})`,
      ).toBeLessThanOrEqual(100);
    }
  });

  it("every entry has a substantive description ≥ 60 chars", () => {
    for (const entry of allEntries) {
      expect(
        entry.description.length,
        `${entry.code} description too short (${entry.description.length})`,
      ).toBeGreaterThanOrEqual(60);
    }
  });

  it("every entry has at least one controlReason", () => {
    for (const entry of allEntries) {
      expect(
        entry.controlReasons.length,
        `${entry.code} has no controlReasons`,
      ).toBeGreaterThan(0);
    }
  });

  it("every entry has a sourceUrl pointing at eur-lex", () => {
    for (const entry of allEntries) {
      expect(entry.sourceUrl).toMatch(/eur-lex\.europa\.eu/);
    }
  });

  it("every entry has an ISO-8601 asOfDate", () => {
    for (const entry of allEntries) {
      expect(entry.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("no duplicate code within Cat-4 entries", () => {
    const codes = EU_ANNEX_I_CAT4_ENTRIES.map((e) => e.code);
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  });

  it("no duplicate code within Cat-7 entries", () => {
    const codes = EU_ANNEX_I_CAT7_ENTRIES.map((e) => e.code);
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  });

  it("all entries carry jurisdiction EU_ANNEX_I", () => {
    for (const entry of allEntries) {
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
    for (const entry of allEntries) {
      for (const r of entry.controlReasons) {
        expect(
          valid.has(r),
          `invalid controlReason '${r}' on ${entry.code}`,
        ).toBe(true);
      }
    }
  });
});

// ─── 4. No overlap with canonical eu-annex-i.ts ──────────────────────

describe("Z34-Cat4-7 — no overlap with canonical EU_ANNEX_I_ENTRIES", () => {
  it("no Cat-4 entry duplicates a code in EU_ANNEX_I_ENTRIES", () => {
    const existingCodes = new Set(EU_ANNEX_I_ENTRIES.map((e) => e.code));
    for (const entry of EU_ANNEX_I_CAT4_ENTRIES) {
      expect(
        existingCodes.has(entry.code),
        `Cat-4 entry ${entry.code} duplicates an existing EU_ANNEX_I_ENTRIES code`,
      ).toBe(false);
    }
  });

  it("no Cat-7 entry duplicates a code in EU_ANNEX_I_ENTRIES", () => {
    const existingCodes = new Set(EU_ANNEX_I_ENTRIES.map((e) => e.code));
    for (const entry of EU_ANNEX_I_CAT7_ENTRIES) {
      expect(
        existingCodes.has(entry.code),
        `Cat-7 entry ${entry.code} duplicates an existing EU_ANNEX_I_ENTRIES code`,
      ).toBe(false);
    }
  });
});

// ─── 5. Reason-for-control semantics ─────────────────────────────────

describe("Z34-Cat4-7 — reason-for-control semantics", () => {
  it("MTCR-derived 7A1xx entries carry the MT control reason", () => {
    const mtcrEntries = EU_ANNEX_I_CAT7_ENTRIES.filter((e) =>
      /^7A10\d/.test(e.code),
    );
    expect(mtcrEntries.length).toBeGreaterThanOrEqual(5);
    for (const entry of mtcrEntries) {
      expect(entry.controlReasons, `${entry.code} missing MT reason`).toContain(
        "MT",
      );
    }
  });

  it("4A001.a.1 (temperature) / 4A001.a.2 (radiation) entries carry both NS and MT", () => {
    for (const code of ["4A001.a.1", "4A001.a.2"]) {
      const entry = findEuAnnexICat4Entry(code);
      expect(entry?.controlReasons).toContain("NS");
      expect(entry?.controlReasons).toContain("MT");
    }
  });

  it("commercial 7A001.a / 7A002.a carry NS+MT (dual-use baseline)", () => {
    for (const code of ["7A001.a", "7A002.a"]) {
      const entry = findEuAnnexICat7Entry(code);
      expect(entry?.controlReasons).toContain("NS");
      expect(entry?.controlReasons).toContain("MT");
    }
  });
});

// ─── 6. Cross-walk parametric capture ────────────────────────────────

describe("Z34-Cat4-7 — parametric cross-walk capture", () => {
  it("all 4 Z34-Cat4-7 parametric IDs are present in CONTROL_LIST_CROSS_WALK", () => {
    for (const id of CAT47_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry, `missing cross-walk entry ${id}`).toBeDefined();
      expect(entry?.regime).toBe("EU-ANNEX-I");
    }
  });

  it("EU:7A002.a gyro entry has starTrackerAccuracyArcsec predicate ≤ 1800", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:7A002.a",
    );
    expect(entry).toBeDefined();
    const accuracyPredicate = entry?.predicates.find(
      (p) => p.attribute === "starTrackerAccuracyArcsec",
    );
    expect(
      accuracyPredicate,
      "EU:7A002.a missing starTrackerAccuracyArcsec predicate",
    ).toBeDefined();
    expect(accuracyPredicate?.op).toBe("lte");
    expect(accuracyPredicate?.value).toBe(1800);
    expect(entry?.reasonsForControl).toContain("MT");
  });

  it("EU:7A003 IMU entry has itemClass + isSpeciallyDesigned + drift predicates", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:7A003",
    );
    expect(entry).toBeDefined();
    expect(entry?.predicates.length).toBeGreaterThanOrEqual(3);

    const itemClassPredicate = entry?.predicates.find(
      (p) => p.attribute === "itemClass",
    );
    expect(itemClassPredicate?.op).toBe("prefix");
    expect(itemClassPredicate?.value).toBe("spacecraft.imu");

    const isSpecialPredicate = entry?.predicates.find(
      (p) => p.attribute === "isSpeciallyDesigned",
    );
    expect(isSpecialPredicate?.op).toBe("eq");
    expect(isSpecialPredicate?.value).toBe(true);
  });

  it("EU:7A005 GNSS receiver entry has anti-jam + velocity-envelope predicates", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:7A005",
    );
    expect(entry).toBeDefined();

    const velocityPredicate = entry?.predicates.find(
      (p) => p.attribute === "gnssMaxVelocityMPerS",
    );
    expect(
      velocityPredicate,
      "EU:7A005 missing gnssMaxVelocityMPerS predicate",
    ).toBeDefined();
    expect(velocityPredicate?.op).toBe("gt");
    expect(velocityPredicate?.value).toBe(600);

    const antiJamPredicate = entry?.predicates.find(
      (p) => p.attribute === "isAntiJam",
    );
    expect(
      antiJamPredicate,
      "EU:7A005 missing isAntiJam predicate",
    ).toBeDefined();
    expect(antiJamPredicate?.op).toBe("eq");
    expect(antiJamPredicate?.value).toBe(true);

    expect(entry?.reasonsForControl).toContain("MT");
  });

  it("EU:4A090 AI-compute entry has itemClass + bandwidth proxy predicates", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:4A090",
    );
    expect(entry).toBeDefined();

    const itemClassPredicate = entry?.predicates.find(
      (p) => p.attribute === "itemClass",
    );
    expect(itemClassPredicate?.value).toBe("compute.ai-accelerator");

    const bandwidthPredicate = entry?.predicates.find(
      (p) => p.attribute === "crossLinkBandwidthMbps",
    );
    expect(
      bandwidthPredicate,
      "EU:4A090 missing crossLinkBandwidthMbps predicate",
    ).toBeDefined();
    expect(bandwidthPredicate?.op).toBe("gte");
    expect(bandwidthPredicate?.value).toBe(1_000_000);
  });

  it("all Z34-Cat4-7 cross-walk entries are tagged regime = 'EU-ANNEX-I'", () => {
    for (const id of CAT47_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry?.regime).toBe("EU-ANNEX-I");
    }
  });

  it("EU:4A090 has a valid validFrom date in 2025 (post-Delegated-Reg)", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:4A090",
    );
    expect(entry?.validFrom).toMatch(/^2025-/);
  });
});

// ─── 7. Helper functions ──────────────────────────────────────────────

describe("Z34-Cat4-7 — helper functions", () => {
  it("findEuAnnexICat4Entry returns the entry by code", () => {
    const entry = findEuAnnexICat4Entry("4A090");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("4A090");
  });

  it("findEuAnnexICat4Entry returns undefined for unknown code", () => {
    expect(findEuAnnexICat4Entry("4Z999")).toBeUndefined();
  });

  it("findEuAnnexICat7Entry returns the entry by code", () => {
    const entry = findEuAnnexICat7Entry("7A002.a");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("7A002.a");
  });

  it("findEuAnnexICat7Entry returns undefined for unknown code", () => {
    expect(findEuAnnexICat7Entry("7Z999")).toBeUndefined();
  });

  it("findEuAnnexICat7EntriesByTopic returns the GNSS / IMU / star-tracker cluster", () => {
    const entries = findEuAnnexICat7EntriesByTopic(
      "gnss-receivers-imus-star-trackers",
    );
    expect(entries.length).toBeGreaterThan(0);
    // 7A002.a is the canonical gyro cluster.
    expect(entries.some((e) => e.code === "7A002.a")).toBe(true);
    expect(entries.some((e) => e.code === "7A001.a")).toBe(true);
    for (const e of entries) {
      expect(e.crossReferenceTopic).toBe("gnss-receivers-imus-star-trackers");
    }
  });

  it("findEuAnnexICat4EntriesByPrefix returns all 4A003 entries", () => {
    const entries = findEuAnnexICat4EntriesByPrefix("4A003");
    // 4A003, 4A003.b, 4A003.c — 4A003.a removed (repealed) in the 2026-06-13 audit.
    expect(entries.length).toBeGreaterThanOrEqual(3);
    for (const e of entries) {
      expect(e.code === "4A003" || e.code.startsWith("4A003.")).toBe(true);
    }
  });

  it("findEuAnnexICat7EntriesByPrefix returns all 7A001 entries", () => {
    const entries = findEuAnnexICat7EntriesByPrefix("7A001");
    expect(entries.length).toBeGreaterThanOrEqual(3);
    for (const e of entries) {
      expect(e.code === "7A001" || e.code.startsWith("7A001.")).toBe(true);
    }
  });
});

// ─── 8. Coverage metadata ─────────────────────────────────────────────

describe("Z34-Cat4-7 — coverage metadata", () => {
  it("Cat-4 coverage object names the EU_ANNEX_I jurisdiction", () => {
    expect(EU_ANNEX_I_CAT4_COVERAGE.jurisdiction).toBe("EU_ANNEX_I");
  });

  it("Cat-7 coverage object names the EU_ANNEX_I jurisdiction", () => {
    expect(EU_ANNEX_I_CAT7_COVERAGE.jurisdiction).toBe("EU_ANNEX_I");
  });

  it("Cat-4 coverage scope mentions Computers + AI accelerators", () => {
    expect(EU_ANNEX_I_CAT4_COVERAGE.scope).toMatch(/Computers/);
    expect(EU_ANNEX_I_CAT4_COVERAGE.scope.toLowerCase()).toMatch(
      /ai|advanced.computing|4a090/,
    );
  });

  it("Cat-7 coverage scope mentions Navigation + Avionics", () => {
    expect(EU_ANNEX_I_CAT7_COVERAGE.scope).toMatch(/Navigation/);
    expect(EU_ANNEX_I_CAT7_COVERAGE.scope).toMatch(/Avionics/);
  });

  it("both coverage asOfDate values are ISO-8601 and not stale (≤ 365 days)", () => {
    for (const cov of [EU_ANNEX_I_CAT4_COVERAGE, EU_ANNEX_I_CAT7_COVERAGE]) {
      expect(cov.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const asOf = new Date(cov.asOfDate);
      const now = new Date("2026-05-23");
      const ageDays = (now.getTime() - asOf.getTime()) / 86_400_000;
      expect(ageDays).toBeLessThanOrEqual(365);
    }
  });

  it("Cat-7 coverage excluded list documents that 7A003/7A004/7A005/7A103 live in eu-annex-i.ts", () => {
    const excluded = EU_ANNEX_I_CAT7_COVERAGE.excluded.join(" ");
    expect(excluded).toMatch(/7A003|7A004|7A005|7A103|eu-annex-i\.ts/);
  });
});
