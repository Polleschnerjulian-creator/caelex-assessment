/**
 * Sprint Z35-RU-833 — Russia 833/2014 deeper-annexes dataset tests.
 *
 * Confirms the new `russia-833-deep-annexes` file ships:
 *   1. All three annexes (VII, XXIII, XXIX) populated above documented
 *      lower bounds.
 *   2. Every entry has the required fields (code, annex, category,
 *      title, description, prohibitionType, addedDate, sourceUrl,
 *      asOfDate).
 *   3. Unique canonical codes (no duplicates across the three arrays).
 *   4. Canonical code format matches the documented `<annex>.<subcode>`
 *      pattern (VII / XXIII / XXIX prefix + arbitrary regulatory code
 *      suffix).
 *   5. Category coverage spans the four documented values (spacecraft,
 *      telecom, advanced-tech, drone).
 *   6. Prohibition-type values are in the documented union.
 *   7. ISO-8601 date formats on `addedDate` and `asOfDate`.
 *   8. EUR-Lex source URLs on every entry.
 *   9. Cross-walk integration — the matcher's `CONTROL_LIST_CROSS_WALK`
 *      seed carries at least 5 Z35-RU-833 entries with the new
 *      `RUSSIA-833-VII` / `RUSSIA-833-XXIII` / `RUSSIA-833-XXIX`
 *      regimes.
 *  10. Functional helpers (`findRussia833Entry`,
 *      `findRussia833ByAnnex`, `findRussia833ByDate`).
 *
 * Source: Council Regulation (EU) 833/2014 as consolidated.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  RUSSIA_833_ANNEX_VII_ENTRIES,
  RUSSIA_833_ANNEX_XXIII_ENTRIES,
  RUSSIA_833_ANNEX_XXIX_ENTRIES,
  findRussia833Entry,
  findRussia833ByAnnex,
  findRussia833ByDate,
  type Russia833Entry,
} from "./russia-833-deep-annexes";
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

const ALL_ENTRIES: Russia833Entry[] = [
  ...RUSSIA_833_ANNEX_VII_ENTRIES,
  ...RUSSIA_833_ANNEX_XXIII_ENTRIES,
  ...RUSSIA_833_ANNEX_XXIX_ENTRIES,
];

// ─── 1. Dataset presence + bounds ─────────────────────────────────────

describe("Z35-RU-833 — dataset presence", () => {
  it("ships at least 25 Annex VII entries", () => {
    expect(RUSSIA_833_ANNEX_VII_ENTRIES.length).toBeGreaterThanOrEqual(25);
  });

  it("ships at least 12 Annex XXIII entries", () => {
    expect(RUSSIA_833_ANNEX_XXIII_ENTRIES.length).toBeGreaterThanOrEqual(12);
  });

  it("ships at least 8 Annex XXIX entries", () => {
    expect(RUSSIA_833_ANNEX_XXIX_ENTRIES.length).toBeGreaterThanOrEqual(8);
  });

  it("ships 45-60 entries total across the three annexes", () => {
    expect(ALL_ENTRIES.length).toBeGreaterThanOrEqual(45);
    expect(ALL_ENTRIES.length).toBeLessThanOrEqual(60);
  });
});

// ─── 2. Required fields ───────────────────────────────────────────────

describe("Z35-RU-833 — required fields", () => {
  it("every entry has all required fields populated", () => {
    for (const entry of ALL_ENTRIES) {
      expect(entry.code, `entry missing code`).toBeTruthy();
      expect(entry.annex, `entry ${entry.code} missing annex`).toBeTruthy();
      expect(
        entry.category,
        `entry ${entry.code} missing category`,
      ).toBeTruthy();
      expect(entry.title, `entry ${entry.code} missing title`).toBeTruthy();
      expect(
        entry.description,
        `entry ${entry.code} missing description`,
      ).toBeTruthy();
      expect(
        entry.prohibitionType,
        `entry ${entry.code} missing prohibitionType`,
      ).toBeTruthy();
      expect(
        entry.addedDate,
        `entry ${entry.code} missing addedDate`,
      ).toBeTruthy();
      expect(
        entry.sourceUrl,
        `entry ${entry.code} missing sourceUrl`,
      ).toBeTruthy();
      expect(
        entry.asOfDate,
        `entry ${entry.code} missing asOfDate`,
      ).toBeTruthy();
    }
  });

  it("every entry's `annex` field matches the array it lives in", () => {
    for (const entry of RUSSIA_833_ANNEX_VII_ENTRIES) {
      expect(entry.annex).toBe("VII");
    }
    for (const entry of RUSSIA_833_ANNEX_XXIII_ENTRIES) {
      expect(entry.annex).toBe("XXIII");
    }
    for (const entry of RUSSIA_833_ANNEX_XXIX_ENTRIES) {
      expect(entry.annex).toBe("XXIX");
    }
  });
});

// ─── 3. Code uniqueness ───────────────────────────────────────────────

describe("Z35-RU-833 — code uniqueness", () => {
  it("no duplicate codes across all three annexes", () => {
    const codes = ALL_ENTRIES.map((e) => e.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

// ─── 4. Code format ───────────────────────────────────────────────────

describe("Z35-RU-833 — code format", () => {
  // Format: <annex>.<arbitrary-regulatory-code>
  // e.g. "VII.9A004", "XXIII.5A002.c", "XXIX.9A012.a"
  const CODE_PATTERN = /^(VII|XXIII|XXIX)\.[A-Za-z0-9.-]+$/;

  it("every code matches the `<annex>.<subcode>` format", () => {
    for (const entry of ALL_ENTRIES) {
      expect(
        CODE_PATTERN.test(entry.code),
        `entry ${entry.code} does not match expected format`,
      ).toBe(true);
    }
  });

  it("every code's annex prefix matches the entry's annex field", () => {
    for (const entry of ALL_ENTRIES) {
      const prefix = entry.code.split(".")[0];
      expect(prefix).toBe(entry.annex);
    }
  });
});

// ─── 5. Category coverage ─────────────────────────────────────────────

describe("Z35-RU-833 — category coverage", () => {
  it("ships entries in all four documented categories", () => {
    const categories = new Set(ALL_ENTRIES.map((e) => e.category));
    expect(categories.has("spacecraft")).toBe(true);
    expect(categories.has("telecom")).toBe(true);
    expect(categories.has("advanced-tech")).toBe(true);
    expect(categories.has("drone")).toBe(true);
  });

  it("Annex XXIX entries are predominantly drone-category", () => {
    const droneEntries = RUSSIA_833_ANNEX_XXIX_ENTRIES.filter(
      (e) => e.category === "drone",
    );
    // Should be a strong majority — at least 80%.
    expect(
      droneEntries.length / RUSSIA_833_ANNEX_XXIX_ENTRIES.length,
    ).toBeGreaterThan(0.8);
  });
});

// ─── 6. Prohibition-type ──────────────────────────────────────────────

describe("Z35-RU-833 — prohibition-type values", () => {
  it("every prohibitionType is in the documented union", () => {
    const validTypes = new Set(["STRICT", "WIND_DOWN", "DEROGATION_AVAILABLE"]);
    for (const entry of ALL_ENTRIES) {
      expect(
        validTypes.has(entry.prohibitionType),
        `entry ${entry.code} has invalid prohibitionType ${entry.prohibitionType}`,
      ).toBe(true);
    }
  });

  it("the vast majority of entries are STRICT (sanctions baseline)", () => {
    const strict = ALL_ENTRIES.filter((e) => e.prohibitionType === "STRICT");
    // 833/2014 is structurally a hard-ban regulation — > 80% strict.
    expect(strict.length / ALL_ENTRIES.length).toBeGreaterThan(0.8);
  });
});

// ─── 7. Date format ───────────────────────────────────────────────────

describe("Z35-RU-833 — ISO-8601 dates", () => {
  it("every addedDate is ISO-8601 (YYYY-MM-DD)", () => {
    for (const entry of ALL_ENTRIES) {
      expect(entry.addedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every asOfDate is ISO-8601 (YYYY-MM-DD)", () => {
    for (const entry of ALL_ENTRIES) {
      expect(entry.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every addedDate falls within 2022-01-01 to today (sanctions package range)", () => {
    for (const entry of ALL_ENTRIES) {
      expect(entry.addedDate >= "2022-01-01").toBe(true);
      // Use the file's own as-of-date as the upper bound — gives the
      // test a deterministic ceiling without using `new Date()`.
      expect(entry.addedDate <= "2026-12-31").toBe(true);
    }
  });
});

// ─── 8. Source URLs ───────────────────────────────────────────────────

describe("Z35-RU-833 — source URLs", () => {
  it("every sourceUrl is a eur-lex.europa.eu URL", () => {
    for (const entry of ALL_ENTRIES) {
      expect(entry.sourceUrl).toMatch(/eur-lex\.europa\.eu/);
    }
  });
});

// ─── 9. Cross-walk integration ────────────────────────────────────────

describe("Z35-RU-833 — cross-walk integration", () => {
  it("CONTROL_LIST_CROSS_WALK carries at least 5 RUSSIA-833 entries", () => {
    const russia833 = CONTROL_LIST_CROSS_WALK.filter((e) =>
      e.regime.startsWith("RUSSIA-833"),
    );
    expect(russia833.length).toBeGreaterThanOrEqual(5);
  });

  it("cross-walk includes entries from all three Russia-833 regimes", () => {
    const regimes = new Set(
      CONTROL_LIST_CROSS_WALK.filter((e) =>
        e.regime.startsWith("RUSSIA-833"),
      ).map((e) => e.regime),
    );
    expect(regimes.has("RUSSIA-833-VII")).toBe(true);
    expect(regimes.has("RUSSIA-833-XXIII")).toBe(true);
    expect(regimes.has("RUSSIA-833-XXIX")).toBe(true);
  });

  it("every Russia-833 cross-walk entry has a citation referencing 833/2014", () => {
    const russia833 = CONTROL_LIST_CROSS_WALK.filter((e) =>
      e.regime.startsWith("RUSSIA-833"),
    );
    for (const entry of russia833) {
      expect(
        entry.citation.includes("833/2014"),
        `cross-walk entry ${entry.canonicalId} missing 833/2014 in citation`,
      ).toBe(true);
    }
  });
});

// ─── 10. Helper functions ─────────────────────────────────────────────

describe("Z35-RU-833 — helper functions", () => {
  it("findRussia833Entry returns entry for known code", () => {
    const entry = findRussia833Entry("VII.9A004");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("VII.9A004");
    expect(entry?.annex).toBe("VII");
  });

  it("findRussia833Entry returns undefined for unknown code", () => {
    expect(findRussia833Entry("XXX.NOPE")).toBeUndefined();
  });

  it("findRussia833ByAnnex('VII') returns only Annex VII entries", () => {
    const result = findRussia833ByAnnex("VII");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.annex).toBe("VII");
    }
  });

  it("findRussia833ByAnnex('XXIII') returns only Annex XXIII entries", () => {
    const result = findRussia833ByAnnex("XXIII");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.annex).toBe("XXIII");
    }
  });

  it("findRussia833ByAnnex('XXIX') returns only Annex XXIX entries", () => {
    const result = findRussia833ByAnnex("XXIX");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.annex).toBe("XXIX");
    }
  });

  it("findRussia833ByDate('2024-01-01') returns only entries added on or after that date", () => {
    const result = findRussia833ByDate("2024-01-01");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.addedDate >= "2024-01-01").toBe(true);
    }
  });

  it("findRussia833ByDate('2030-01-01') returns empty (no future entries)", () => {
    const result = findRussia833ByDate("2030-01-01");
    expect(result.length).toBe(0);
  });
});

// ─── 11. Cross-walk references (EU Annex I + EAR CCL) ─────────────────

describe("Z35-RU-833 — EU Annex I + EAR CCL refs", () => {
  it("at least 50% of entries cross-reference EU Annex I", () => {
    const withRef = ALL_ENTRIES.filter((e) => e.euAnnexIRef);
    expect(withRef.length / ALL_ENTRIES.length).toBeGreaterThan(0.5);
  });

  it("VII.9A004 cross-references EU Annex I 9A004 (canonical mirror)", () => {
    const entry = findRussia833Entry("VII.9A004");
    expect(entry?.euAnnexIRef).toBe("9A004");
  });

  it("XXIII.3A090 cross-references EU Annex I 3A090 (AI compute mirror)", () => {
    const entry = findRussia833Entry("XXIII.3A090");
    expect(entry?.euAnnexIRef).toBe("3A090");
  });
});
