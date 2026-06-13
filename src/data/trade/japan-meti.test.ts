/**
 * Sprint Z35-JP-METI (Tier 4, Asia jurisdiction) — Japan METI Export
 * Controls dataset tests.
 *
 * Validates that the METI Schedule 1 + 2 enumeration is structurally
 * present, schema-conformant, and that the four space-critical
 * categories (4(1) spacecraft, 4(2) propulsion, 4(7) optical sensors,
 * 4 (3)/(4) MTCR-derived missiles/UAVs, 11(x) telecom) have parametric
 * capture in the cross-walk so the matcher can discriminate at run-
 * time without falling back to manual review.
 *
 * Sources:
 *   - METI Export Trade Control Order — Schedule 1 (English)
 *   - METI Foreign Exchange Order — Technology
 *   - FEFTA consolidated text
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  JAPAN_METI_ENTRIES,
  JAPAN_METI_COVERAGE,
  findJapanMetiEntry,
  findJapanMetiEntries,
  findJapanMetiByCategory,
  type JapanMetiEntry,
} from "./japan-meti";
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

// ─── Z35-JP-METI — required code presence ────────────────────────────

const SCHEDULE_1_REQUIRED_CODES = [
  // Cat 1 weapons (space crossover)
  "1(7)",
  // Cat 4 spacecraft + rockets
  "4(1)",
  "4(2)",
  "4(3)",
  "4(4)",
  "4(7)",
  "4(8)",
  // Cat 11 telecom + crypto
  "11(1)",
  "11(2)",
  "11(5)",
  // Cat 16 imaging
  "16(1)",
  "16(2)",
  "16(3)",
] as const;

const CROSS_WALK_JP_METI_IDS = [
  "JP-METI:4(1)",
  "JP-METI:4(2)",
  "JP-METI:4(7)",
  "JP-METI:11(1)",
  "JP-METI:11(5)",
] as const;

// ─── 1. Presence of required Schedule 1 codes ────────────────────────

describe("Z35-JP-METI — required code presence", () => {
  it("all space-relevant Schedule 1 codes present", () => {
    for (const code of SCHEDULE_1_REQUIRED_CODES) {
      const entry = findJapanMetiEntry(code);
      expect(entry, `missing Schedule 1 code ${code}`).toBeDefined();
      expect(entry?.schedule).toBe("1");
    }
  });

  it("Schedule 2 (Technology) entries are present for the core Cat 4 + Cat 11 items", () => {
    const schedule2 = JAPAN_METI_ENTRIES.filter((e) => e.schedule === "2");
    expect(
      schedule2.length,
      "expected at least 5 Schedule 2 entries",
    ).toBeGreaterThanOrEqual(5);
    // Spot-checks: 4(1), 4(2), 4(3) technology
    const tech4_1 = schedule2.find((e) => e.code === "4(1)");
    const tech4_2 = schedule2.find((e) => e.code === "4(2)");
    expect(tech4_1, "Schedule 2 4(1) missing").toBeDefined();
    expect(tech4_2, "Schedule 2 4(2) missing").toBeDefined();
  });

  it("S6 row-faithful codes (Appended Table 1 row → Ministerial Order Article) are present", () => {
    // row 4 / Art. 3 (rockets, UAVs, MTCR), row 9 / Art. 8 (telecom +
    // crypto), row 10 / Art. 9 (sensors/optics), row 13 / Art. 12
    // ("flying objects for outer space" = spacecraft + launch vehicles).
    const S6_REQUIRED = [
      "4(xvii)", // accel/gyro navigation usable in MTCR rockets
      "4(iii)", // turbojet/turbofan/ramjet propulsion units
      "9(ix)", // cryptographic equipment > 56-bit symmetric key
      "9(v)", // electronically-scanned phased-array antennas
      "10(iii)", // solid optical detectors designed for space use
      "10(iv)", // remote-sensing image sensors < 200 µrad IFOV
      "13(iv)", // spacecraft, launch vehicles, buses, payloads
      "13(vii)", // solid rocket propulsion units > 1.1 MN·s
    ] as const;
    for (const code of S6_REQUIRED) {
      const entry = JAPAN_METI_ENTRIES.find(
        (e) => e.code === code && e.schedule === "1",
      );
      expect(entry, `missing S6 row-faithful code ${code}`).toBeDefined();
      expect(entry?.asOfDate).toBe("2026-06-13");
    }
  });
});

// ─── 2. Schema conformance ───────────────────────────────────────────

describe("Z35-JP-METI — schema conformance", () => {
  it("entry count meets the S6 deepened-window minimum (>= 90)", () => {
    // S6 deepening (2026-06-13): raised from the original 30-50 window to
    // >= 90 row-faithful entries (legacy Wassenaar-mirror codes + new
    // Appended Table 1 row → Ministerial Order Article codes).
    expect(JAPAN_METI_ENTRIES.length).toBeGreaterThanOrEqual(90);
    expect(JAPAN_METI_ENTRIES.length).toBeLessThanOrEqual(140);
  });

  it("coverage.caelexCoverageCount matches the array length", () => {
    expect(JAPAN_METI_COVERAGE.caelexCoverageCount).toBe(
      JAPAN_METI_ENTRIES.length,
    );
  });

  it("every entry has a non-empty title (≤120 chars)", () => {
    for (const entry of JAPAN_METI_ENTRIES) {
      expect(
        entry.title.length,
        `${entry.code} title is empty`,
      ).toBeGreaterThan(0);
      expect(
        entry.title.length,
        `${entry.code} title exceeds 120 chars`,
      ).toBeLessThanOrEqual(120);
    }
  });

  it("every entry has a non-empty description", () => {
    for (const entry of JAPAN_METI_ENTRIES) {
      expect(
        entry.description.length,
        `${entry.code} description is empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("every entry has a sourceUrl pointing at meti.go.jp", () => {
    for (const entry of JAPAN_METI_ENTRIES) {
      expect(entry.sourceUrl).toMatch(/meti\.go\.jp/);
    }
  });

  it("every entry has an ISO-8601 asOfDate", () => {
    for (const entry of JAPAN_METI_ENTRIES) {
      expect(entry.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every entry has schedule '1' or '2'", () => {
    for (const entry of JAPAN_METI_ENTRIES) {
      expect(["1", "2"]).toContain(entry.schedule);
    }
  });

  it("every entry has a known category", () => {
    const validCategories: JapanMetiEntry["category"][] = [
      "weapons",
      "dual-use",
      "missiles",
      "spacecraft",
      "telecommunications",
      "imaging",
      "etc",
    ];
    for (const entry of JAPAN_METI_ENTRIES) {
      expect(validCategories).toContain(entry.category);
    }
  });

  it("schedule + code combination is unique (no duplicates within a schedule)", () => {
    const seen = new Map<string, number>();
    for (const entry of JAPAN_METI_ENTRIES) {
      const key = `${entry.schedule}:${entry.code}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const dupes = Array.from(seen.entries()).filter(([, n]) => n > 1);
    expect(dupes).toEqual([]);
  });
});

// ─── 3. Code-format validation ───────────────────────────────────────

describe("Z35-JP-METI — code-format validation", () => {
  it("every code matches METI bracket form (digit + optional sub-brackets)", () => {
    // Patterns: "1(1)", "4(1)(i)", "16(1)(ii)", "11(5)"
    const METI_CODE_RE = /^\d{1,2}\([0-9ivx]+\)(\([0-9ivx]+\))?$/;
    for (const entry of JAPAN_METI_ENTRIES) {
      expect(
        entry.code,
        `${entry.code} does not match METI code format`,
      ).toMatch(METI_CODE_RE);
    }
  });

  it("Cat 4 entries all sit under 'spacecraft' or 'missiles' category", () => {
    const cat4 = JAPAN_METI_ENTRIES.filter((e) => /^4/.test(e.code));
    expect(cat4.length).toBeGreaterThan(0);
    for (const entry of cat4) {
      expect(
        ["spacecraft", "missiles"],
        `${entry.code} should be spacecraft or missiles, got ${entry.category}`,
      ).toContain(entry.category);
    }
  });

  it("Cat 11 entries all sit under 'telecommunications' category", () => {
    const cat11 = JAPAN_METI_ENTRIES.filter((e) => /^11/.test(e.code));
    expect(cat11.length).toBeGreaterThan(0);
    for (const entry of cat11) {
      expect(entry.category).toBe("telecommunications");
    }
  });

  it("Cat 16 entries all sit under 'imaging' or 'dual-use' category", () => {
    const cat16 = JAPAN_METI_ENTRIES.filter((e) => /^16/.test(e.code));
    expect(cat16.length).toBeGreaterThan(0);
    for (const entry of cat16) {
      expect(["imaging", "dual-use"]).toContain(entry.category);
    }
  });
});

// ─── 4. Cross-references to EU / EAR / Wassenaar ─────────────────────

describe("Z35-JP-METI — cross-references", () => {
  it("Cat 4(1) spacecraft entry cross-references EU 9A004 + EAR 9A515", () => {
    const entry = findJapanMetiEntry("4(1)");
    expect(entry).toBeDefined();
    expect(entry?.euAnnexIRef).toMatch(/9A004/);
    expect(entry?.earCclRef).toMatch(/9A515/);
  });

  it("Cat 4(7) optical-sensors entry cross-references EU 6A002", () => {
    const entry = findJapanMetiEntry("4(7)");
    expect(entry).toBeDefined();
    expect(entry?.euAnnexIRef).toMatch(/6A002/);
  });

  it("Cat 11(5) crypto entry cross-references EU 5A002.a", () => {
    const entry = findJapanMetiEntry("11(5)");
    expect(entry).toBeDefined();
    expect(entry?.euAnnexIRef).toMatch(/5A002/);
  });

  it("MTCR-derived Cat 4(3) launch-vehicle entry references EU 9A101", () => {
    const entry = findJapanMetiEntry("4(3)");
    expect(entry).toBeDefined();
    expect(entry?.euAnnexIRef).toMatch(/9A101/);
  });

  it("Wassenaar refs use the multilateral 'N.X.N' dot-form when present", () => {
    const withWassenaar = JAPAN_METI_ENTRIES.filter(
      (e) => e.wassenaarRef && e.wassenaarRef !== "n/a (MTCR-only)",
    );
    expect(withWassenaar.length).toBeGreaterThan(0);
    // Either ML-format (military list) or N.X.N dual-use format.
    // Schedule 2 (Technology) entries can reference multiple Wassenaar
    // items in a single field (e.g. "9.E.1, 9.E.2") — split + validate.
    const WASS_TOKEN_RE = /^(ML\d+|\d+\.[A-Z]\.\d+(\.\w+)*)$/;
    for (const entry of withWassenaar) {
      const tokens = entry.wassenaarRef!.split(",").map((t) => t.trim());
      for (const token of tokens) {
        expect(
          token,
          `${entry.code} wassenaarRef token "${token}" unexpected form`,
        ).toMatch(WASS_TOKEN_RE);
      }
    }
  });
});

// ─── 5. Helper functions ─────────────────────────────────────────────

describe("Z35-JP-METI — helper functions", () => {
  it("findJapanMetiEntry returns the entry by code (Schedule 1 first)", () => {
    const entry = findJapanMetiEntry("4(1)");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("4(1)");
    expect(entry?.schedule).toBe("1");
  });

  it("findJapanMetiEntry returns undefined for unknown code", () => {
    const entry = findJapanMetiEntry("99(99)");
    expect(entry).toBeUndefined();
  });

  it("findJapanMetiEntries returns both Schedule 1 + 2 for shared codes", () => {
    const entries = findJapanMetiEntries("4(1)");
    expect(entries.length).toBe(2);
    expect(entries[0].schedule).toBe("1");
    expect(entries[1].schedule).toBe("2");
  });

  it("findJapanMetiByCategory returns the spacecraft cluster", () => {
    const entries = findJapanMetiByCategory("spacecraft");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.code === "4(1)")).toBe(true);
    expect(entries.some((e) => e.code === "4(2)")).toBe(true);
    expect(entries.some((e) => e.code === "4(7)")).toBe(true);
  });

  it("findJapanMetiByCategory returns the telecommunications cluster", () => {
    const entries = findJapanMetiByCategory("telecommunications");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.code === "11(1)")).toBe(true);
    expect(entries.some((e) => e.code === "11(5)")).toBe(true);
  });

  it("findJapanMetiByCategory returns the missiles cluster (MTCR-derived)", () => {
    const entries = findJapanMetiByCategory("missiles");
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.code === "4(3)")).toBe(true);
    expect(entries.some((e) => e.code === "4(4)")).toBe(true);
  });

  it("findJapanMetiByCategory returns empty for an unused category bucket", () => {
    // "etc" is reserved but currently empty.
    const entries = findJapanMetiByCategory("etc");
    expect(entries).toEqual([]);
  });
});

// ─── 6. Cross-walk parametric capture ────────────────────────────────

describe("Z35-JP-METI — parametric cross-walk capture", () => {
  it("all 5 Z35-JP-METI cross-walk IDs are present in CONTROL_LIST_CROSS_WALK", () => {
    for (const id of CROSS_WALK_JP_METI_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry, `missing cross-walk entry ${id}`).toBeDefined();
      expect(entry?.regime).toBe("JP-METI");
    }
  });

  it("JP-METI:4(1) spacecraft entry has itemClass + isSpeciallyDesigned predicates", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "JP-METI:4(1)",
    );
    expect(entry).toBeDefined();
    expect(entry?.predicates.length).toBeGreaterThanOrEqual(2);

    const itemClassPredicate = entry?.predicates.find(
      (p) => p.attribute === "itemClass",
    );
    expect(itemClassPredicate?.op).toBe("prefix");
    expect(itemClassPredicate?.value).toBe("spacecraft");

    const isSpecialPredicate = entry?.predicates.find(
      (p) => p.attribute === "isSpeciallyDesigned",
    );
    expect(isSpecialPredicate?.op).toBe("eq");
    expect(isSpecialPredicate?.value).toBe(true);
  });

  it("JP-METI:4(2) propulsion entry carries MT reason-for-control (MTCR tripwire)", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "JP-METI:4(2)",
    );
    expect(entry).toBeDefined();
    expect(entry?.reasonsForControl).toContain("MT");
  });

  it("JP-METI:4(7) optical-sensor entry has apertureMM ≥ 350 threshold", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "JP-METI:4(7)",
    );
    expect(entry).toBeDefined();
    const aperturePredicate = entry?.predicates.find(
      (p) => p.attribute === "apertureMM",
    );
    expect(
      aperturePredicate,
      "JP-METI:4(7) missing apertureMM predicate",
    ).toBeDefined();
    expect(aperturePredicate?.op).toBe("gte");
    expect(aperturePredicate?.value).toBe(350);
  });

  it("JP-METI:11(1) telecom entry has spacecraft.communications itemClass prefix", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "JP-METI:11(1)",
    );
    expect(entry).toBeDefined();
    const itemClassPredicate = entry?.predicates.find(
      (p) => p.attribute === "itemClass",
    );
    expect(itemClassPredicate?.op).toBe("prefix");
    expect(itemClassPredicate?.value).toBe("spacecraft.communications");
  });

  it("JP-METI:11(5) crypto entry carries EI (Encryption Items) reason", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "JP-METI:11(5)",
    );
    expect(entry).toBeDefined();
    expect(entry?.reasonsForControl).toContain("EI");
  });

  it("all JP-METI cross-walk entries have at least one seeAlso link", () => {
    for (const id of CROSS_WALK_JP_METI_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(
        entry?.seeAlso.length,
        `${id} should have at least one seeAlso link`,
      ).toBeGreaterThan(0);
    }
  });

  it("all JP-METI cross-walk entries cite the METI Export Trade Control Order", () => {
    for (const id of CROSS_WALK_JP_METI_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry?.citation).toMatch(/Export Trade Control Order|METI/i);
    }
  });
});

// ─── 7. Coverage metadata ────────────────────────────────────────────

describe("Z35-JP-METI — coverage metadata", () => {
  it("coverage scope explicitly mentions Schedule 1 + Schedule 2", () => {
    expect(JAPAN_METI_COVERAGE.scope).toMatch(/Schedule 1/);
    expect(JAPAN_METI_COVERAGE.scope).toMatch(/Schedule 2/);
  });

  it("coverage asOfDate is ISO-8601 and not stale (≤ 365 days)", () => {
    expect(JAPAN_METI_COVERAGE.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const asOf = new Date(JAPAN_METI_COVERAGE.asOfDate);
    const now = new Date("2026-05-23");
    const ageDays = (now.getTime() - asOf.getTime()) / 86_400_000;
    expect(ageDays).toBeLessThanOrEqual(365);
  });

  it("coverage excluded list documents the catch-all carve-out", () => {
    const excluded = JAPAN_METI_COVERAGE.excluded.join(" ");
    expect(excluded.toLowerCase()).toMatch(/inform requirement|catch-all/);
  });
});
