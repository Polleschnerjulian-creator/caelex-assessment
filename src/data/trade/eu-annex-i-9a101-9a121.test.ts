/**
 * Sprint Z24b (Tier 3) — EU Annex I MTCR-derived 9A101-9A121 tests.
 *
 * Confirms that the full MTCR-derived 9A1xx family in EU Annex I Cat 9
 * is present in textual classification entries AND that the MTCR-Cat-I
 * tripwires (range × payload, total impulse) are encoded as parametric
 * predicates in the cross-walk so the matcher engine can flip from
 * Cat-II review to "strong presumption of denial" at the hard edge.
 *
 * Sources:
 *   - EU Reg. (EU) 2021/821 Annex I, Cat. 9 (consolidated text)
 *   - MTCR Equipment, Software and Technology Annex (current)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  EU_ANNEX_I_ENTRIES,
  EU_ANNEX_I_COVERAGE,
  findEuAnnexIEntry,
} from "./eu-annex-i";
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

const Z24B_REQUIRED_ECCNS = [
  "9A101",
  "9A102",
  "9A103",
  "9A104",
  "9A105",
  "9A106",
  "9A107",
  "9A108",
  "9A109",
  "9A110",
  "9A111",
  "9A115",
  "9A116",
  "9A117",
  "9A118",
  "9A119",
  "9A120",
  "9A121",
] as const;

const Z24B_NEW_ECCNS = [
  // Codes added by Z24b (vs. those already shipped pre-Z24b)
  "9A102",
  "9A103",
  "9A108",
  "9A109",
  "9A110",
  "9A111",
  "9A115",
  "9A116",
  "9A117",
  "9A118",
  "9A119",
  "9A120",
  "9A121",
] as const;

const Z24B_PARAMETRIC_IDS = [
  "EU:9A101",
  "EU:9A102",
  "EU:9A103",
  "EU:9A104",
  "EU:9A105",
  "EU:9A106",
  "EU:9A107",
  "EU:9A108",
  "EU:9A116",
  "EU:9A119",
] as const;

// ─── 1. Presence of all MTCR-derived ECCNs ────────────────────────────

describe("Z24b — EU Annex I 9A101-9A121 presence", () => {
  it("all 18 Z24b MTCR-derived ECCNs are present in EU_ANNEX_I_ENTRIES", () => {
    for (const code of Z24B_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry, `missing EU Annex I entry for ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("no duplicate code under EU_ANNEX_I for the Z24b range", () => {
    for (const code of Z24B_REQUIRED_ECCNS) {
      const matches = EU_ANNEX_I_ENTRIES.filter((e) => e.code === code);
      expect(
        matches.length,
        `${code} appears ${matches.length} times in EU_ANNEX_I_ENTRIES`,
      ).toBe(1);
    }
  });

  it("all Z24b MTCR-derived ECCNs carry an MT control reason", () => {
    for (const code of Z24B_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.controlReasons.includes("MT"),
        `${code} should carry MT control reason — it's MTCR-derived`,
      ).toBe(true);
    }
  });

  it("all Z24b MTCR-derived ECCNs declare an mtcrCategory", () => {
    for (const code of Z24B_REQUIRED_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.mtcrCategory,
        `${code} should declare mtcrCategory (I or II)`,
      ).toMatch(/^(I|II)$/);
    }
  });
});

// ─── 2. Schema conformance for the newly-added entries ────────────────

describe("Z24b — schema conformance (new entries only)", () => {
  it("each Z24b-new entry has a non-empty title (≤120 chars)", () => {
    for (const code of Z24B_NEW_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.title.length, `${code} title is empty`).toBeGreaterThan(0);
      expect(
        entry?.title.length ?? Infinity,
        `${code} title exceeds 120 chars`,
      ).toBeLessThanOrEqual(120);
    }
  });

  it("each Z24b-new entry has a substantive description (>= 80 chars)", () => {
    for (const code of Z24B_NEW_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(
        entry?.description.length ?? 0,
        `${code} description is too short`,
      ).toBeGreaterThanOrEqual(80);
    }
  });

  it("each Z24b-new entry has a sourceUrl pointing at eur-lex", () => {
    for (const code of Z24B_NEW_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.sourceUrl, `${code} has empty sourceUrl`).toMatch(
        /eur-lex\.europa\.eu/,
      );
    }
  });

  it("each Z24b-new entry has an ISO-8601 asOfDate", () => {
    for (const code of Z24B_NEW_ECCNS) {
      const entry = findEuAnnexIEntry(code);
      expect(entry?.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ─── 3. Parametric thresholds — MTCR Cat-I tripwires ──────────────────

describe("Z24b — parametric thresholds for MTCR Cat-I tripwires", () => {
  it("EU:9A102 (reusable vehicles) has the range+payload Cat-I tripwire", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:9A102",
    );
    expect(entry, "missing EU:9A102 in CONTROL_LIST_CROSS_WALK").toBeDefined();

    const rangePredicate = entry?.predicates.find(
      (p) => p.attribute === "rangeKm",
    );
    const payloadPredicate = entry?.predicates.find(
      (p) => p.attribute === "payloadKg",
    );
    expect(rangePredicate?.op).toBe("gte");
    expect(rangePredicate?.value).toBe(300);
    expect(payloadPredicate?.op).toBe("gte");
    expect(payloadPredicate?.value).toBe(500);
  });

  it("EU:9A104 (sounding rockets) has the 300 km range tripwire", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:9A104",
    );
    expect(entry, "missing EU:9A104 in CONTROL_LIST_CROSS_WALK").toBeDefined();

    const rangePredicate = entry?.predicates.find(
      (p) => p.attribute === "rangeKm",
    );
    expect(rangePredicate?.op).toBe("gte");
    expect(rangePredicate?.value).toBe(300);
  });

  it("EU:9A105 + EU:9A107 (Cat-II liquid + solid engines) have 1.1×10⁶ N·s impulse threshold", () => {
    for (const id of ["EU:9A105", "EU:9A107", "EU:9A119"] as const) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry, `missing ${id} in cross-walk`).toBeDefined();

      const impulsePredicate = entry?.predicates.find(
        (p) => p.attribute === "totalImpulseNs",
      );
      expect(
        impulsePredicate,
        `${id} missing totalImpulseNs predicate`,
      ).toBeDefined();
      expect(impulsePredicate?.op).toBe("gte");
      expect(impulsePredicate?.value).toBe(1_100_000);
    }
  });

  it("EU:9A116 (re-entry vehicles) has the 500 kg Cat-I payload tripwire", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:9A116",
    );
    expect(entry, "missing EU:9A116 in CONTROL_LIST_CROSS_WALK").toBeDefined();

    const payloadPredicate = entry?.predicates.find(
      (p) => p.attribute === "payloadKg",
    );
    expect(payloadPredicate?.op).toBe("gte");
    expect(payloadPredicate?.value).toBe(500);
  });

  it("every Z24b cross-walk entry has at least 2 predicates", () => {
    for (const id of Z24B_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry, `${id} missing from cross-walk`).toBeDefined();
      expect(
        entry?.predicates.length ?? 0,
        `${id} should have ≥ 2 predicates`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("every Z24b cross-walk entry is tagged regime = 'EU-ANNEX-I'", () => {
    for (const id of Z24B_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry?.regime).toBe("EU-ANNEX-I");
    }
  });

  it("every Z24b cross-walk entry carries reasonsForControl = ['MT'] (or includes MT)", () => {
    for (const id of Z24B_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(
        entry?.reasonsForControl.includes("MT"),
        `${id} should include MT in reasonsForControl`,
      ).toBe(true);
    }
  });
});

// ─── 4. Source citations include MTCR + EU 2021/821 ───────────────────

describe("Z24b — source citations", () => {
  it("every Z24b cross-walk entry cites EU Reg. 2021/821 Annex I", () => {
    for (const id of Z24B_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry?.citation).toMatch(/2021\/821/);
    }
  });

  it("every Z24b cross-walk entry has at least one MTCR-Annex seeAlso link", () => {
    for (const id of Z24B_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      const hasMtcr = entry?.seeAlso.some((l) => l.regime === "MTCR-ANNEX");
      expect(
        hasMtcr,
        `${id} should include an MTCR-ANNEX seeAlso (it's MTCR-derived)`,
      ).toBe(true);
    }
  });
});

// ─── 5. Coverage-count bump ───────────────────────────────────────────

describe("Z24b — caelexCoverageCount", () => {
  it("caelexCoverageCount equals the actual entry count", () => {
    expect(EU_ANNEX_I_COVERAGE.caelexCoverageCount).toBe(
      EU_ANNEX_I_ENTRIES.length,
    );
  });

  it("caelexCoverageCount is at least 45 (post-Z24b minimum)", () => {
    expect(EU_ANNEX_I_COVERAGE.caelexCoverageCount).toBeGreaterThanOrEqual(45);
  });
});
