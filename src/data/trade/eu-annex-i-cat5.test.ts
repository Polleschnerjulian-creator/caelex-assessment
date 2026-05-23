/**
 * Sprint Z34-Cat5 (Tier 3) — EU Annex I Cat. 5 (Telecom + Crypto)
 * coverage tests.
 *
 * Validates that the full Cat-5 enumeration (5A001 telecom family,
 * 5A002/3/4 information-security family, 5B/5D/5E supporting entries)
 * is structurally present + schema-conformant, and that the
 * space-critical sub-entries have parametric capture in the cross-walk
 * so the matcher engine can discriminate at run time without falling
 * back to manual review.
 *
 * Sources:
 *   - Reg. (EU) 2021/821 Annex I, Cat. 5 (consolidated text)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";

import {
  EU_ANNEX_I_CAT5_ENTRIES,
  EU_ANNEX_I_CAT5_COVERAGE,
  findEuAnnexICat5Entry,
  findEuAnnexICat5EntriesByTopic,
} from "./eu-annex-i-cat5";
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

// ─── Z34-Cat5 — required code coverage ───────────────────────────────

const CAT5_PART1_HEADERS = ["5A001", "5B001", "5D001", "5E001"] as const;
const CAT5_PART2_HEADERS = [
  "5A002",
  "5A003",
  "5A004",
  "5B002",
  "5D002",
  "5D003",
  "5E002",
] as const;

const CAT5_SPACE_CRITICAL_SUBPARAS = [
  "5A001.b", // ISL bandwidth
  "5A001.b.1", // ISL transmit/receive specifically
  "5A001.f.1", // spread-spectrum anti-jam
  "5A001.h", // optical free-space (OISL)
  "5A002.a", // crypto modules > 56-bit symmetric
  "5A002.f", // QKD
] as const;

const CAT5_PARAMETRIC_IDS = [
  "EU:5A001.b",
  "EU:5A001.f.1",
  "EU:5A002.a",
  "EU:5A002.f",
  "EU:5D002.c",
] as const;

// ─── 1. Presence of all Cat-5 headers ────────────────────────────────

describe("Z34-Cat5 — header presence in EU_ANNEX_I_CAT5_ENTRIES", () => {
  it("all Cat-5 Part 1 headers present (5A001/5B001/5D001/5E001)", () => {
    for (const code of CAT5_PART1_HEADERS) {
      const entry = findEuAnnexICat5Entry(code);
      expect(entry, `missing Cat-5 Part 1 header ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("all Cat-5 Part 2 headers present (5A002/5A003/5A004/5B002/5D002/5D003/5E002)", () => {
    for (const code of CAT5_PART2_HEADERS) {
      const entry = findEuAnnexICat5Entry(code);
      expect(entry, `missing Cat-5 Part 2 header ${code}`).toBeDefined();
      expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("all space-critical sub-entries present", () => {
    for (const code of CAT5_SPACE_CRITICAL_SUBPARAS) {
      const entry = findEuAnnexICat5Entry(code);
      expect(entry, `missing space-critical sub-entry ${code}`).toBeDefined();
    }
  });
});

// ─── 2. Schema conformance ───────────────────────────────────────────

describe("Z34-Cat5 — schema conformance", () => {
  it("entry count is within the 40-60 target window", () => {
    expect(EU_ANNEX_I_CAT5_ENTRIES.length).toBeGreaterThanOrEqual(40);
    expect(EU_ANNEX_I_CAT5_ENTRIES.length).toBeLessThanOrEqual(60);
  });

  it("coverage.caelexCoverageCount matches the array length", () => {
    expect(EU_ANNEX_I_CAT5_COVERAGE.caelexCoverageCount).toBe(
      EU_ANNEX_I_CAT5_ENTRIES.length,
    );
  });

  it("every entry has a non-empty title (≤100 chars)", () => {
    for (const entry of EU_ANNEX_I_CAT5_ENTRIES) {
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

  it("every entry has a non-empty description", () => {
    for (const entry of EU_ANNEX_I_CAT5_ENTRIES) {
      expect(
        entry.description.length,
        `${entry.code} description is empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("every entry has at least one controlReason", () => {
    for (const entry of EU_ANNEX_I_CAT5_ENTRIES) {
      expect(
        entry.controlReasons.length,
        `${entry.code} has no controlReasons`,
      ).toBeGreaterThan(0);
    }
  });

  it("every entry has a sourceUrl pointing at eur-lex", () => {
    for (const entry of EU_ANNEX_I_CAT5_ENTRIES) {
      expect(entry.sourceUrl).toMatch(/eur-lex\.europa\.eu/);
    }
  });

  it("every entry has an ISO-8601 asOfDate", () => {
    for (const entry of EU_ANNEX_I_CAT5_ENTRIES) {
      expect(entry.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("no duplicate code within EU_ANNEX_I_CAT5_ENTRIES", () => {
    const codes = EU_ANNEX_I_CAT5_ENTRIES.map((e) => e.code);
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  });

  it("all entries carry jurisdiction EU_ANNEX_I", () => {
    for (const entry of EU_ANNEX_I_CAT5_ENTRIES) {
      expect(entry.jurisdiction).toBe("EU_ANNEX_I");
    }
  });
});

// ─── 3. Reason-for-control semantics ─────────────────────────────────

describe("Z34-Cat5 — reason-for-control semantics", () => {
  it("every 5A002.x entry carries the EI (Encryption Items) reason", () => {
    const cryptoEntries = EU_ANNEX_I_CAT5_ENTRIES.filter((e) =>
      e.code.startsWith("5A002"),
    );
    expect(cryptoEntries.length).toBeGreaterThan(0);
    for (const entry of cryptoEntries) {
      // 5A002.d (intrusion-detection cables) and 5A002.e (TEMPEST) are
      // not cryptographic in nature — they live under 5A002 by EU
      // numbering but don't carry the EI tag.
      if (entry.code === "5A002.d" || entry.code === "5A002.e") continue;
      expect(entry.controlReasons, `${entry.code} missing EI reason`).toContain(
        "EI",
      );
    }
  });

  it("every 5D002.x crypto-software entry carries EI", () => {
    const cryptoSwEntries = EU_ANNEX_I_CAT5_ENTRIES.filter((e) =>
      e.code.startsWith("5D002"),
    );
    expect(cryptoSwEntries.length).toBeGreaterThan(0);
    for (const entry of cryptoSwEntries) {
      expect(entry.controlReasons, `${entry.code} missing EI reason`).toContain(
        "EI",
      );
    }
  });

  it("interception / surveillance entries carry HR reason (cyber-surveillance)", () => {
    const hrCandidates = [
      "5A001.b.5",
      "5D001.c",
      "5D001.d",
      "5E001.c",
      "5A004.a",
    ] as const;
    for (const code of hrCandidates) {
      const entry = findEuAnnexICat5Entry(code);
      expect(entry, `${code} not found`).toBeDefined();
      expect(
        entry?.controlReasons,
        `${code} missing HR reason — cyber-surveillance regime should fire`,
      ).toContain("HR");
    }
  });
});

// ─── 4. Cross-walk parametric capture ────────────────────────────────

describe("Z34-Cat5 — parametric cross-walk capture", () => {
  it("all 5 Z34-Cat5 parametric IDs are present in CONTROL_LIST_CROSS_WALK", () => {
    for (const id of CAT5_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry, `missing cross-walk entry ${id}`).toBeDefined();
      expect(entry?.regime).toBe("EU-ANNEX-I");
    }
  });

  it("EU:5A001.b ISL entry has crossLinkBandwidthMbps predicate ≥ 1000", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:5A001.b",
    );
    expect(entry).toBeDefined();
    const bwPredicate = entry?.predicates.find(
      (p) => p.attribute === "crossLinkBandwidthMbps",
    );
    expect(
      bwPredicate,
      "EU:5A001.b missing crossLinkBandwidthMbps predicate",
    ).toBeDefined();
    expect(bwPredicate?.op).toBe("gte");
    expect(bwPredicate?.value).toBe(1000);
  });

  it("EU:5A001.f.1 spread-spectrum entry has isAntiJam predicate", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:5A001.f.1",
    );
    expect(entry).toBeDefined();
    const antiJamPredicate = entry?.predicates.find(
      (p) => p.attribute === "isAntiJam",
    );
    expect(
      antiJamPredicate,
      "EU:5A001.f.1 missing isAntiJam predicate",
    ).toBeDefined();
    expect(antiJamPredicate?.op).toBe("eq");
    expect(antiJamPredicate?.value).toBe(true);
    // MT reason-for-control: spread-spectrum anti-jam carries MTCR
    // tripwire when paired with the parent TT&C subsystem.
    expect(entry?.reasonsForControl).toContain("MT");
  });

  it("EU:5A002.a crypto entry has itemClass + isSpeciallyDesigned predicates", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:5A002.a",
    );
    expect(entry).toBeDefined();
    expect(entry?.predicates.length).toBeGreaterThanOrEqual(2);

    const itemClassPredicate = entry?.predicates.find(
      (p) => p.attribute === "itemClass",
    );
    expect(itemClassPredicate?.op).toBe("prefix");
    expect(itemClassPredicate?.value).toBe("spacecraft.crypto");

    const isSpecialPredicate = entry?.predicates.find(
      (p) => p.attribute === "isSpeciallyDesigned",
    );
    expect(isSpecialPredicate?.op).toBe("eq");
    expect(isSpecialPredicate?.value).toBe(true);

    // EI reason mandatory for 5A002.a (Encryption Items).
    expect(entry?.reasonsForControl).toContain("EI");
  });

  it("EU:5A002.f QKD entry is space-rated (itemClass = spacecraft.crypto.quantum)", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:5A002.f",
    );
    expect(entry).toBeDefined();
    const itemClassPredicate = entry?.predicates.find(
      (p) => p.attribute === "itemClass",
    );
    expect(itemClassPredicate?.value).toBe("spacecraft.crypto.quantum");
  });

  it("all Z34-Cat5 cross-walk entries are tagged regime = 'EU-ANNEX-I'", () => {
    for (const id of CAT5_PARAMETRIC_IDS) {
      const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
      expect(entry?.regime).toBe("EU-ANNEX-I");
    }
  });
});

// ─── 5. Topic / helper lookup ────────────────────────────────────────

describe("Z34-Cat5 — helper functions", () => {
  it("findEuAnnexICat5Entry returns the entry by code", () => {
    const entry = findEuAnnexICat5Entry("5A001.f.1");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("5A001.f.1");
  });

  it("findEuAnnexICat5Entry returns undefined for unknown code", () => {
    const entry = findEuAnnexICat5Entry("5A999.zz");
    expect(entry).toBeUndefined();
  });

  it("findEuAnnexICat5EntriesByTopic returns the spacecraft-tt-c-and-comms cluster", () => {
    const entries = findEuAnnexICat5EntriesByTopic("spacecraft-tt-c-and-comms");
    expect(entries.length).toBeGreaterThan(0);
    // 5A001 family is the canonical comms cluster.
    expect(entries.some((e) => e.code === "5A001")).toBe(true);
    expect(entries.some((e) => e.code === "5A001.b")).toBe(true);
    expect(entries.some((e) => e.code === "5A001.f.1")).toBe(true);
  });
});

// ─── 6. Coverage metadata ────────────────────────────────────────────

describe("Z34-Cat5 — coverage metadata", () => {
  it("coverage object names the EU_ANNEX_I jurisdiction", () => {
    expect(EU_ANNEX_I_CAT5_COVERAGE.jurisdiction).toBe("EU_ANNEX_I");
  });

  it("coverage scope explicitly mentions Part 1 + Part 2", () => {
    expect(EU_ANNEX_I_CAT5_COVERAGE.scope).toMatch(/Part 1/);
    expect(EU_ANNEX_I_CAT5_COVERAGE.scope).toMatch(/Part 2/);
  });

  it("coverage asOfDate is ISO-8601 and not stale (≤ 365 days)", () => {
    expect(EU_ANNEX_I_CAT5_COVERAGE.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const asOf = new Date(EU_ANNEX_I_CAT5_COVERAGE.asOfDate);
    const now = new Date("2026-05-23");
    const ageDays = (now.getTime() - asOf.getTime()) / 86_400_000;
    expect(ageDays).toBeLessThanOrEqual(365);
  });

  it("coverage excluded list documents the mass-market-crypto carve-out", () => {
    const excluded = EU_ANNEX_I_CAT5_COVERAGE.excluded.join(" ");
    expect(excluded.toLowerCase()).toMatch(/mass-market|cryptography note/);
  });
});
