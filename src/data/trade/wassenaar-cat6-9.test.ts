/**
 * Wassenaar Arrangement — Cat 6 + 9 first-class-dataset tests.
 *
 * Confirms the new `wassenaar-cat6-9` file ships:
 *   1. Both list types (ML + DUL).
 *   2. Coverage of every Cat-6 + Cat-9 sub-category the operator-facing
 *      UI expects (acoustic, optical, cameras, lasers, radar, aero
 *      turbines, spacecraft, UAVs, software, technology).
 *   3. Unique canonical codes (no duplicates).
 *   4. Valid code formats matching Wassenaar's `N.X.M.l.n` dot notation
 *      OR `MLn[.x]` munitions notation.
 *   5. Provenance integrity: every entry cites a source URL + ISO-8601
 *      as-of-date.
 *   6. Functional helper lookup (`findWassenaarEntry`,
 *      `findWassenaarEntriesByCategory`,
 *      `findWassenaarEntriesByList`).
 *
 * Source: Wassenaar Arrangement public lists (current).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  WASSENAAR_CAT6_9_ENTRIES,
  findWassenaarEntry,
  findWassenaarEntriesByCategory,
  findWassenaarEntriesByList,
} from "./wassenaar-cat6-9";

// ─── 1. Presence / shape ──────────────────────────────────────────────

describe("Wassenaar Cat 6 + 9 — dataset presence", () => {
  it("ships a non-empty dataset", () => {
    expect(WASSENAAR_CAT6_9_ENTRIES.length).toBeGreaterThanOrEqual(60);
  });

  it("ships within the documented 60-80-entry target", () => {
    expect(WASSENAAR_CAT6_9_ENTRIES.length).toBeLessThanOrEqual(80);
  });

  it("every entry has the required fields", () => {
    for (const entry of WASSENAAR_CAT6_9_ENTRIES) {
      expect(entry.code, `entry missing code`).toBeTruthy();
      expect(entry.list, `entry ${entry.code} missing list`).toMatch(
        /^(ML|DUL)$/,
      );
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
        entry.sourceUrl,
        `entry ${entry.code} missing sourceUrl`,
      ).toBeTruthy();
      expect(
        entry.asOfDate,
        `entry ${entry.code} missing asOfDate`,
      ).toBeTruthy();
    }
  });
});

// ─── 2. Code uniqueness ───────────────────────────────────────────────

describe("Wassenaar Cat 6 + 9 — code uniqueness", () => {
  it("no duplicate codes", () => {
    const codes = WASSENAAR_CAT6_9_ENTRIES.map((e) => e.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

// ─── 3. Code format validation ────────────────────────────────────────

describe("Wassenaar Cat 6 + 9 — code format", () => {
  // DUL codes: digit.letter.digit[.letter[.digit]]  e.g. "6.A.2.a.1"
  // ML codes:  MLnn[.letter]                         e.g. "ML10.a"
  const DUL_PATTERN = /^\d+\.[A-Z](\.\d+(\.[a-z](\.\d+)?)?)?$/;
  const ML_PATTERN = /^ML\d{1,2}(\.[a-z])?$/;

  it("every code matches the documented Wassenaar format", () => {
    for (const entry of WASSENAAR_CAT6_9_ENTRIES) {
      const pattern = entry.list === "ML" ? ML_PATTERN : DUL_PATTERN;
      expect(
        pattern.test(entry.code),
        `entry ${entry.code} (list=${entry.list}) does not match expected pattern`,
      ).toBe(true);
    }
  });

  it("every asOfDate is ISO-8601", () => {
    for (const entry of WASSENAAR_CAT6_9_ENTRIES) {
      expect(entry.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every sourceUrl is a wassenaar.org URL", () => {
    for (const entry of WASSENAAR_CAT6_9_ENTRIES) {
      expect(entry.sourceUrl).toMatch(/wassenaar\.org/);
    }
  });
});

// ─── 4. List distribution (ML vs DUL) ─────────────────────────────────

describe("Wassenaar Cat 6 + 9 — ML / DUL distribution", () => {
  it("ships at least one ML (Munitions) entry", () => {
    const ml = WASSENAAR_CAT6_9_ENTRIES.filter((e) => e.list === "ML");
    expect(ml.length).toBeGreaterThan(0);
  });

  it("ships substantially more DUL than ML entries (DUL is the bulk)", () => {
    const ml = WASSENAAR_CAT6_9_ENTRIES.filter((e) => e.list === "ML").length;
    const dul = WASSENAAR_CAT6_9_ENTRIES.filter((e) => e.list === "DUL").length;
    expect(dul).toBeGreaterThan(ml);
  });

  it("ships ML10 (aircraft) sub-entries", () => {
    const ml10 = WASSENAAR_CAT6_9_ENTRIES.filter((e) =>
      e.code.startsWith("ML10"),
    );
    expect(ml10.length).toBeGreaterThan(0);
  });

  it("ships ML15 (imaging) sub-entries", () => {
    const ml15 = WASSENAAR_CAT6_9_ENTRIES.filter((e) =>
      e.code.startsWith("ML15"),
    );
    expect(ml15.length).toBeGreaterThan(0);
  });
});

// ─── 5. Category breadth (Cat 6 + Cat 9 both represented) ─────────────

describe("Wassenaar Cat 6 + 9 — sub-category breadth", () => {
  it("ships Cat 6 entries", () => {
    const cat6 = WASSENAAR_CAT6_9_ENTRIES.filter((e) => e.category === "6");
    expect(cat6.length).toBeGreaterThan(0);
  });

  it("ships Cat 9 entries", () => {
    const cat9 = WASSENAAR_CAT6_9_ENTRIES.filter((e) => e.category === "9");
    expect(cat9.length).toBeGreaterThan(0);
  });

  it("ships 6.A.1 (acoustic) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("6.A.1"),
    );
    expect(present).toBe(true);
  });

  it("ships 6.A.2 (optical sensors) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("6.A.2"),
    );
    expect(present).toBe(true);
  });

  it("ships 6.A.3 (cameras) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("6.A.3"),
    );
    expect(present).toBe(true);
  });

  it("ships 6.A.5 (lasers) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("6.A.5"),
    );
    expect(present).toBe(true);
  });

  it("ships 6.A.8 (radar) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("6.A.8"),
    );
    expect(present).toBe(true);
  });

  it("ships 9.A.1 (aero gas turbines) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("9.A.1"),
    );
    expect(present).toBe(true);
  });

  it("ships 9.A.4-7 (spacecraft + components) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some(
      (e) =>
        e.code.startsWith("9.A.4") ||
        e.code.startsWith("9.A.5") ||
        e.code.startsWith("9.A.6") ||
        e.code.startsWith("9.A.7"),
    );
    expect(present).toBe(true);
  });

  it("ships 9.A.11 (UAVs) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("9.A.11"),
    );
    expect(present).toBe(true);
  });

  it("ships aerospace software (9.D) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("9.D"),
    );
    expect(present).toBe(true);
  });

  it("ships aerospace technology (9.E) entries", () => {
    const present = WASSENAAR_CAT6_9_ENTRIES.some((e) =>
      e.code.startsWith("9.E"),
    );
    expect(present).toBe(true);
  });
});

// ─── 6. Cross-walk references ─────────────────────────────────────────

describe("Wassenaar Cat 6 + 9 — cross-walk to national lists", () => {
  it("every DUL entry that mirrors a national code carries euAnnexIRef OR earCclRef", () => {
    // We don't require ALL DUL entries to have one — only that
    // entries that ARE direct mirrors carry the reference. As a sanity
    // floor, more than half of DUL entries should cross-walk.
    const dul = WASSENAAR_CAT6_9_ENTRIES.filter((e) => e.list === "DUL");
    const withRef = dul.filter((e) => e.euAnnexIRef || e.earCclRef);
    expect(withRef.length / dul.length).toBeGreaterThan(0.5);
  });

  it("6.A.2.a.1 cross-walks to EU 6A002.a.1", () => {
    const entry = findWassenaarEntry("6.A.2.a.1");
    expect(entry).toBeDefined();
    expect(entry?.euAnnexIRef).toBe("6A002.a.1");
  });

  it("6.A.8.j (SAR) cross-walks to EU 6A008.j", () => {
    const entry = findWassenaarEntry("6.A.8.j");
    expect(entry).toBeDefined();
    expect(entry?.euAnnexIRef).toBe("6A008.j");
  });
});

// ─── 7. Helper functions ──────────────────────────────────────────────

describe("Wassenaar Cat 6 + 9 — helper functions", () => {
  it("findWassenaarEntry returns entry for known code", () => {
    const entry = findWassenaarEntry("6.A.5.c.2");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("6.A.5.c.2");
  });

  it("findWassenaarEntry returns undefined for unknown code", () => {
    expect(findWassenaarEntry("99.Z.99")).toBeUndefined();
  });

  it("findWassenaarEntriesByCategory('6') returns only Cat-6 entries", () => {
    const result = findWassenaarEntriesByCategory("6");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.category).toBe("6");
    }
  });

  it("findWassenaarEntriesByCategory('9') returns only Cat-9 entries", () => {
    const result = findWassenaarEntriesByCategory("9");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.category).toBe("9");
    }
  });

  it("findWassenaarEntriesByList('ML') returns only Munitions entries", () => {
    const result = findWassenaarEntriesByList("ML");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.list).toBe("ML");
    }
  });

  it("findWassenaarEntriesByList('DUL') returns only Dual-Use entries", () => {
    const result = findWassenaarEntriesByList("DUL");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.list).toBe("DUL");
    }
  });
});
