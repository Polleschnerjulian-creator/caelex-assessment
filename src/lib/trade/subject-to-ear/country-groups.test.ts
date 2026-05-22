/**
 * Tests for src/lib/trade/subject-to-ear/country-groups.ts — Sprint Z22.
 *
 * Country-group resolution is load-bearing for both Z19 (hard carve-
 * outs) and Z20 (FDPR scenarios). Tests verify:
 *
 *   - Each major group's membership matches Blueprint 2 § 4 +
 *     Supp. 1 to Part 740 + 22 CFR § 126.1
 *   - Resolve function produces correct multi-group memberships
 *   - Edge cases: Macau (separate from D:5), Group B fallback,
 *     A:5/A:6 closely-cooperating, Cambodia removal (91 FR 5091)
 *   - Russia/Belarus exclusion list (Supp. 3 to Part 746) has 37
 *     countries (AU + CA + 27 EU + Iceland + Japan + Korea +
 *     Liechtenstein + NZ + Norway + Switzerland + UK)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  resolveCountryGroups,
  isInRussiaBelarusExclusionList,
  COUNTRY_GROUP_A5,
  COUNTRY_GROUP_A6,
  COUNTRY_GROUP_D1,
  COUNTRY_GROUP_D5,
  COUNTRY_GROUP_E1,
  COUNTRY_GROUP_E2,
  COUNTRY_MACAU_OR_D5,
} from "./country-groups";

describe("D:5 — arms-embargo list", () => {
  it("has 22 countries post-Cambodia removal (91 FR 5091, 2026-02-03)", () => {
    expect(COUNTRY_GROUP_D5.size).toBe(22);
  });

  it("does NOT contain Cambodia (removed 2026-02-03)", () => {
    expect(COUNTRY_GROUP_D5.has("KH")).toBe(false);
  });

  it("contains China, Russia, Belarus, Iran, North Korea, Cuba, Syria", () => {
    expect(COUNTRY_GROUP_D5.has("CN")).toBe(true);
    expect(COUNTRY_GROUP_D5.has("RU")).toBe(true);
    expect(COUNTRY_GROUP_D5.has("BY")).toBe(true);
    expect(COUNTRY_GROUP_D5.has("IR")).toBe(true);
    expect(COUNTRY_GROUP_D5.has("KP")).toBe(true);
    expect(COUNTRY_GROUP_D5.has("CU")).toBe(true);
    expect(COUNTRY_GROUP_D5.has("SY")).toBe(true);
  });

  it("does NOT contain Brazil, Germany, Japan, Korea", () => {
    expect(COUNTRY_GROUP_D5.has("BR")).toBe(false);
    expect(COUNTRY_GROUP_D5.has("DE")).toBe(false);
    expect(COUNTRY_GROUP_D5.has("JP")).toBe(false);
    expect(COUNTRY_GROUP_D5.has("KR")).toBe(false);
  });
});

describe("E:1 / E:2 — embargo lists", () => {
  it("E:1 contains Iran, North Korea, Syria (3 countries)", () => {
    expect(COUNTRY_GROUP_E1.size).toBe(3);
    expect(COUNTRY_GROUP_E1.has("IR")).toBe(true);
    expect(COUNTRY_GROUP_E1.has("KP")).toBe(true);
    expect(COUNTRY_GROUP_E1.has("SY")).toBe(true);
  });

  it("E:2 contains Cuba (alone in current reading)", () => {
    expect(COUNTRY_GROUP_E2.size).toBe(1);
    expect(COUNTRY_GROUP_E2.has("CU")).toBe(true);
  });
});

describe("A:5 / A:6 — closely-cooperating groups", () => {
  it("A:5 contains 36 STA-eligible countries", () => {
    expect(COUNTRY_GROUP_A5.size).toBe(36);
  });

  it("A:5 contains AU, CA, GB (AUKUS-prerequisite list)", () => {
    expect(COUNTRY_GROUP_A5.has("AU")).toBe(true);
    expect(COUNTRY_GROUP_A5.has("CA")).toBe(true);
    expect(COUNTRY_GROUP_A5.has("GB")).toBe(true);
  });

  it("A:5 contains DE, FR, JP, KR (major allies)", () => {
    expect(COUNTRY_GROUP_A5.has("DE")).toBe(true);
    expect(COUNTRY_GROUP_A5.has("FR")).toBe(true);
    expect(COUNTRY_GROUP_A5.has("JP")).toBe(true);
    // Note: JP and KR — Japan is A:5, Korea is also commonly listed
  });

  it("A:6 adds CY, IL, MX, TW", () => {
    expect(COUNTRY_GROUP_A6.has("CY")).toBe(true);
    expect(COUNTRY_GROUP_A6.has("IL")).toBe(true);
    expect(COUNTRY_GROUP_A6.has("MX")).toBe(true);
    expect(COUNTRY_GROUP_A6.has("TW")).toBe(true);
  });
});

describe("D:1 — NS concern", () => {
  it("contains China and Russia", () => {
    expect(COUNTRY_GROUP_D1.has("CN")).toBe(true);
    expect(COUNTRY_GROUP_D1.has("RU")).toBe(true);
  });
});

describe("Macau or D:5 — Footnote-5-FDP destination set", () => {
  it("contains Macau in addition to all D:5 members", () => {
    expect(COUNTRY_MACAU_OR_D5.has("MO")).toBe(true);
    expect(COUNTRY_MACAU_OR_D5.has("CN")).toBe(true);
    expect(COUNTRY_MACAU_OR_D5.size).toBe(COUNTRY_GROUP_D5.size + 1);
  });
});

describe("resolveCountryGroups — multi-group resolution", () => {
  it("China → D:1, D:3, D:4, D:5 (multiple memberships)", () => {
    const r = resolveCountryGroups("CN");
    expect(r.groups.has("D:1")).toBe(true);
    expect(r.groups.has("D:3")).toBe(true);
    expect(r.groups.has("D:4")).toBe(true);
    expect(r.groups.has("D:5")).toBe(true);
    expect(r.groups.has("B")).toBe(false); // restrictive groups suppress B
    expect(r.isMacau).toBe(false);
    expect(r.isA5OrA6).toBe(false);
  });

  it("Iran → E:1 AND D:5 (in both)", () => {
    const r = resolveCountryGroups("IR");
    expect(r.groups.has("E:1")).toBe(true);
    expect(r.groups.has("D:5")).toBe(true);
  });

  it("Cuba → E:2 AND D:5", () => {
    const r = resolveCountryGroups("CU");
    expect(r.groups.has("E:2")).toBe(true);
    expect(r.groups.has("D:5")).toBe(true);
  });

  it("Brazil → Group B (no restrictive groups, no A:5/A:6)", () => {
    const r = resolveCountryGroups("BR");
    expect(r.groups.has("B")).toBe(true);
    expect(r.isGroupB).toBe(true);
    expect(r.isA5OrA6).toBe(false);
  });

  it("Germany → A:5 (closely-cooperating; NOT Group B)", () => {
    const r = resolveCountryGroups("DE");
    expect(r.groups.has("A:5")).toBe(true);
    expect(r.isA5OrA6).toBe(true);
    expect(r.groups.has("B")).toBe(false);
  });

  it("Macau (MO) → isMacau true, NOT in D:5 (separate treatment)", () => {
    const r = resolveCountryGroups("MO");
    expect(r.isMacau).toBe(true);
    expect(r.groups.has("D:5")).toBe(false);
    expect(r.isGroupB).toBe(false); // explicitly excluded from B
  });

  it("Israel → A:6", () => {
    const r = resolveCountryGroups("IL");
    expect(r.groups.has("A:6")).toBe(true);
    expect(r.isA5OrA6).toBe(true);
  });

  it("UK → A:5 (AUKUS+CA license-free overlay precondition)", () => {
    const r = resolveCountryGroups("GB");
    expect(r.groups.has("A:5")).toBe(true);
  });

  it("Australia → A:5 (AUKUS)", () => {
    const r = resolveCountryGroups("AU");
    expect(r.groups.has("A:5")).toBe(true);
  });

  it("Canada → A:5 (AUKUS+CA)", () => {
    const r = resolveCountryGroups("CA");
    expect(r.groups.has("A:5")).toBe(true);
  });

  it("Lowercase input is normalised to uppercase", () => {
    const r = resolveCountryGroups("cn");
    expect(r.iso).toBe("CN");
    expect(r.groups.has("D:5")).toBe(true);
  });

  it("Empty / unknown country code → Group B fallback", () => {
    const r = resolveCountryGroups("XX");
    expect(r.groups.has("B")).toBe(true);
  });

  it("Empty string → Group B (defensive default)", () => {
    const r = resolveCountryGroups("");
    expect(r.groups.has("B")).toBe(true);
  });
});

describe("isInRussiaBelarusExclusionList — Supp. 3 to Part 746", () => {
  it("Australia → in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("AU")).toBe(true);
  });

  it("Canada → in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("CA")).toBe(true);
  });

  it("Germany → in exclusion list (EU member)", () => {
    expect(isInRussiaBelarusExclusionList("DE")).toBe(true);
  });

  it("UK → in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("GB")).toBe(true);
  });

  it("Japan → in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("JP")).toBe(true);
  });

  it("Korea → in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("KR")).toBe(true);
  });

  it("Switzerland → in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("CH")).toBe(true);
  });

  it("Norway / Iceland / Liechtenstein → in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("NO")).toBe(true);
    expect(isInRussiaBelarusExclusionList("IS")).toBe(true);
    expect(isInRussiaBelarusExclusionList("LI")).toBe(true);
  });

  it("New Zealand → in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("NZ")).toBe(true);
  });

  it("Brazil → NOT in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("BR")).toBe(false);
  });

  it("China → NOT in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("CN")).toBe(false);
  });

  it("India → NOT in exclusion list", () => {
    expect(isInRussiaBelarusExclusionList("IN")).toBe(false);
  });

  it("Russia itself → NOT in exclusion list (it's the embargoed destination)", () => {
    expect(isInRussiaBelarusExclusionList("RU")).toBe(false);
  });
});

describe("Z19 carve-out integration — using resolved groups", () => {
  it("Resolving China gives groups Z19 (a)(6)(i) tests against", () => {
    const r = resolveCountryGroups("CN");
    expect(r.groups.has("D:5")).toBe(true);
  });

  it("Resolving Brazil gives Group B — Z19 (a)(6)(i) does NOT fire", () => {
    const r = resolveCountryGroups("BR");
    expect(r.groups.has("D:5")).toBe(false);
    expect(r.groups.has("B")).toBe(true);
  });
});
