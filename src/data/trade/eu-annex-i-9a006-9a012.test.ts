/**
 * Sprint Z24a (Tier 3) — EU Annex I 9A006-9A012 coverage tests.
 *
 * Confirms that the seven Annex I Cat-9 core ECCNs called out in
 * Z24a are all present in the textual classification entries and
 * (where applicable) in the parametric cross-walk.
 *
 * Sources:
 *   - Reg. (EU) 2021/821 Annex I, Cat. 9 (consolidated text)
 *   - Delegated Reg. (EU) 2025/2003 (OJ L 2025/2003, 14.11.2025;
 *     in force 15.11.2025)
 *
 * Per the Z24a brief the seven codes are 9A006, 9A007, 9A008, 9A009,
 * 9A010, 9A011, 9A012. Of those, 9A007/9A009/9A010/9A011 were already
 * shipped in earlier sprints; Z24a adds 9A006 + 9A008 + 9A012 and
 * extends the parametric cross-walk with EU:9A006/9A008/9A011/9A012
 * predicates so the Z3c matcher can discriminate at run time.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import { EU_ANNEX_I_ENTRIES, findEuAnnexIEntry } from "./eu-annex-i";
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

const Z24A_REQUIRED_ECCNS = [
  "9A006",
  "9A007",
  "9A008",
  "9A009",
  "9A010",
  "9A011",
  "9A012",
] as const;

// ─── 1. Presence of all seven ECCNs ───────────────────────────────────

describe("Z24a — EU Annex I 9A006-9A012 presence", () => {
  it("all seven Z24a ECCNs are present in EU_ANNEX_I_ENTRIES", () => {
    for (const code of Z24A_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry, `missing EU Annex I entry for ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("no duplicate code under EU_ANNEX_I for the Z24a range", () => {
    for (const code of Z24A_REQUIRED_ECCNS) {
      const matches = EU_ANNEX_I_ENTRIES.filter((e) => e.code === code);
      expect(
        matches.length,
        `${code} appears ${matches.length} times in EU_ANNEX_I_ENTRIES`,
      ).toBe(1);
    }
  });
});

// ─── 2. Schema conformance for the Z24a entries ───────────────────────

describe("Z24a — schema conformance", () => {
  it("each Z24a entry has a non-empty title (≤100 chars)", () => {
    for (const code of Z24A_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.title.length, `${code} title is empty`).toBeGreaterThan(0);
      expect(
        entry?.title.length ?? Infinity,
        `${code} title exceeds 100 chars`,
      ).toBeLessThanOrEqual(100);
    }
  });

  it("each Z24a entry has a non-empty description", () => {
    for (const code of Z24A_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.description.length,
        `${code} description is empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("each Z24a entry has at least one controlReason", () => {
    for (const code of Z24A_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.controlReasons.length,
        `${code} has no controlReasons`,
      ).toBeGreaterThan(0);
    }
  });

  it("each Z24a entry has a sourceUrl pointing at eur-lex", () => {
    for (const code of Z24A_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.sourceUrl).toMatch(/eur-lex\.europa\.eu/);
    }
  });

  it("each Z24a entry has an ISO-8601 asOfDate", () => {
    for (const code of Z24A_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ─── 3. Parametric thresholds for 9A011 + 9A012 ───────────────────────

describe("Z24a — parametric thresholds for 9A011 + 9A012", () => {
  it("EU:9A004.f electric-propulsion entry exists in the parametric cross-walk with Isp threshold", () => {
    // CORRECTED 2026-06-13: the electric-propulsion Isp predicate used to
    // live under EU:9A011, but 9A011 = ramjet/scramjet/combined-cycle
    // (Wassenaar 9.A.11). EP sits in the 9A004 family (9A004.f → 9A515).
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:9A004.f",
    );
    expect(
      entry,
      "missing EU:9A004.f in CONTROL_LIST_CROSS_WALK",
    ).toBeDefined();
    expect(entry?.predicates.length).toBeGreaterThan(0);

    // EP capture: itemClass propulsion.electric + IspSeconds threshold
    const ispPredicate = entry?.predicates.find(
      (p) => p.attribute === "IspSeconds",
    );
    expect(
      ispPredicate,
      "EU:9A004.f missing IspSeconds parametric predicate",
    ).toBeDefined();
    expect(ispPredicate?.op).toBe("gte");
    expect(typeof ispPredicate?.value).toBe("number");
  });

  it("EU:9A011 entry exists and is keyed to ramjet/scramjet (NOT electric propulsion)", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:9A011",
    );
    expect(entry, "missing EU:9A011 in CONTROL_LIST_CROSS_WALK").toBeDefined();
    expect(entry?.predicates.length).toBeGreaterThan(0);
    // 9A011 must NOT carry an electric-propulsion (IspSeconds) predicate.
    const ispPredicate = entry?.predicates.find(
      (p) => p.attribute === "IspSeconds",
    );
    expect(
      ispPredicate,
      "EU:9A011 must NOT carry an electric-propulsion Isp predicate (ramjet/scramjet scope)",
    ).toBeUndefined();
  });

  it("EU:9A012 entry exists in the parametric cross-walk with MTCR Cat-I range+payload thresholds", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:9A012",
    );
    expect(entry, "missing EU:9A012 in CONTROL_LIST_CROSS_WALK").toBeDefined();
    expect(entry?.predicates.length).toBeGreaterThan(0);

    // UAV MTCR-Cat-I tripwire: range ≥ 300 km AND payload ≥ 500 kg
    const rangePredicate = entry?.predicates.find(
      (p) => p.attribute === "rangeKm",
    );
    const payloadPredicate = entry?.predicates.find(
      (p) => p.attribute === "payloadKg",
    );
    expect(rangePredicate, "EU:9A012 missing rangeKm predicate").toBeDefined();
    expect(rangePredicate?.op).toBe("gte");
    expect(rangePredicate?.value).toBe(300);
    expect(
      payloadPredicate,
      "EU:9A012 missing payloadKg predicate",
    ).toBeDefined();
    expect(payloadPredicate?.op).toBe("gte");
    expect(payloadPredicate?.value).toBe(500);
  });

  it("EU:9A006 + EU:9A008 also have parametric predicates (component-of carrier)", () => {
    // Both 9A006 and 9A008 are "specially designed components" entries —
    // they ride on the universal `isSpeciallyDesigned` qualifier plus an
    // itemClass prefix. Both must have ≥ 2 predicates.
    for (const id of ["EU:9A006", "EU:9A008"] as const) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry, `${id} missing from cross-walk`).toBeDefined();
      expect(entry?.predicates.length).toBeGreaterThanOrEqual(2);
      const hasSpeciallyDesigned = entry?.predicates.some(
        (p) => p.attribute === "isSpeciallyDesigned",
      );
      expect(
        hasSpeciallyDesigned,
        `${id} missing isSpeciallyDesigned predicate`,
      ).toBe(true);
    }
  });
});

// ─── 4. EU-pendant integrity — Z24a entries cite their EU-regime ──────

describe("Z24a — cross-walk seeAlso integrity", () => {
  it("all Z24a cross-walk entries are tagged regime = 'EU-ANNEX-I'", () => {
    for (const id of [
      "EU:9A006",
      "EU:9A008",
      "EU:9A011",
      "EU:9A012",
    ] as const) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry?.regime).toBe("EU-ANNEX-I");
    }
  });
});
