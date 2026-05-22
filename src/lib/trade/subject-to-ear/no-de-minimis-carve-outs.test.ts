/**
 * Tests for src/lib/trade/subject-to-ear/no-de-minimis-carve-outs.ts
 * — Sprint Z19.
 *
 * Each of the 9 § 734.4(a) carve-outs has at minimum:
 *   - a positive case (correct content + correct destination → hit)
 *   - a negative-destination case (correct content + wrong destination)
 *   - a negative-content case (wrong ECCN + correct destination)
 *
 * Plus the canonical Blueprint 2 § 9.3 Example A:
 *   EU 350 kg Earth-observation satellite with U.S. 9A515.d rad-hard
 *   IC + 9A515.x reaction wheel → destination China → (a)(6)(i) hits.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  checkNoDeMinimisCarveOuts,
  COUNTRY_GROUP_D5,
  COUNTRY_GROUP_E1,
  COUNTRY_GROUP_E2,
  type BOMComponentForCarveOut,
  type NoDeMinimisCheckInput,
} from "./no-de-minimis-carve-outs";

// ─── Helpers ────────────────────────────────────────────────────────

function mkComponent(
  overrides: Partial<BOMComponentForCarveOut> = {},
): BOMComponentForCarveOut {
  return {
    nodeId: "TEST-1",
    description: "Test US-origin component",
    usOrigin: true,
    eccn: "EAR99",
    fairMarketValueEur: 100_000,
    ...overrides,
  };
}

function mkInput(
  destinationCountry: string,
  bom: BOMComponentForCarveOut[],
  extras: Partial<NoDeMinimisCheckInput> = {},
): NoDeMinimisCheckInput {
  const countryGroups = new Set<string>();
  if (COUNTRY_GROUP_D5.has(destinationCountry)) countryGroups.add("D:5");
  if (COUNTRY_GROUP_E1.has(destinationCountry)) countryGroups.add("E:1");
  if (COUNTRY_GROUP_E2.has(destinationCountry)) countryGroups.add("E:2");
  return {
    destinationCountry,
    countryGroups: extras.countryGroups ?? countryGroups,
    bom,
    isMacau: extras.isMacau,
    endUseHints: extras.endUseHints,
  };
}

// ─── (a)(6)(i) — THE CATASTROPHIC SPACE TRAP ─────────────────────────

describe("§ 734.4(a)(6)(i) — 9x515 or 600-series .a-.x to D:5 (THE CATASTROPHIC SPACE TRAP)", () => {
  it("9A515.d rad-hard IC to China → hits (Blueprint 2 § 9.3 Example A)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [
        mkComponent({ eccn: "9A515.d", fairMarketValueEur: 180_000 }),
      ]),
    );
    expect(result.hit).toBe(true);
    const trap = result.hits.find((h) => h.carveOutId === "734.4(a)(6)(i)");
    expect(trap).toBeDefined();
    expect(trap?.title).toMatch(/CATASTROPHIC SPACE TRAP/);
  });

  it("9A515.x reaction wheel to Russia → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("RU", [
        mkComponent({ eccn: "9A515.x", fairMarketValueEur: 220_000 }),
      ]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      true,
    );
  });

  it("9A515.a.1 spacecraft component to Belarus → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BY", [mkComponent({ eccn: "9A515.a.1" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      true,
    );
  });

  it("9A515.d to Brazil (NOT D:5) → does NOT hit (a)(6)(i) — 25% percentage threshold applies", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [mkComponent({ eccn: "9A515.d" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      false,
    );
  });

  it("9A515.d to South Korea (A:5, NOT D:5) → does NOT hit", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("KR", [mkComponent({ eccn: "9A515.d" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      false,
    );
  });

  it("EAR99 content to China → does NOT hit (a)(6)(i) — wrong ECCN", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "EAR99" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      false,
    );
  });

  it("9A515.y content to China → does NOT hit (a)(6)(i) (routes to (a)(6)(ii) instead)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "9A515.y" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      false,
    );
  });

  it("9A515.d with €0 value to China → does NOT hit (non-zero value required)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "9A515.d", fairMarketValueEur: 0 })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      false,
    );
  });

  it("Foreign-origin 9A515.d to China → does NOT hit (usOrigin=false)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "9A515.d", usOrigin: false })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      false,
    );
  });

  it("9A610 (600-series) to China → hits (a)(6)(i) — the 600-series side", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "9A610" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      true,
    );
  });

  it("9E515.f software to China → hits (.f is in .a-.x range)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "9E515.f" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      true,
    );
  });
});

// ─── Blueprint 2 § 9.3 Example A (the canonical scenario) ──────────

describe("Blueprint 2 § 9.3 Example A — EU EO satellite with US 9A515.d+.x to China", () => {
  it("Full BOM: rad-hard FPGA (9A515.d) + reaction wheel (9A515.x) → both lines hit (a)(6)(i)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [
        mkComponent({
          nodeId: "RAD-HARD-IC-01",
          description: "U.S.-origin radiation-hardened FPGA",
          eccn: "9A515.d",
          fairMarketValueEur: 180_000,
        }),
        mkComponent({
          nodeId: "RW-04",
          description: "U.S.-origin reaction wheel, 12 Nms",
          eccn: "9A515.x",
          fairMarketValueEur: 220_000,
        }),
        mkComponent({
          nodeId: "STR-09",
          description: "EU-built star tracker, no U.S. content",
          eccn: "9A515.x",
          usOrigin: false,
          fairMarketValueEur: 95_000,
        }),
      ]),
    );
    expect(result.hit).toBe(true);
    const trap = result.hits.find((h) => h.carveOutId === "734.4(a)(6)(i)");
    expect(trap).toBeDefined();
    expect(trap?.matchingComponentNodeIds).toContain("RAD-HARD-IC-01");
    expect(trap?.matchingComponentNodeIds).toContain("RW-04");
    expect(trap?.matchingComponentNodeIds).not.toContain("STR-09"); // non-US line excluded
  });

  it("Same satellite redirected to Brazil → NO carve-out hit (25% threshold applies)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [
        mkComponent({ eccn: "9A515.d", fairMarketValueEur: 180_000 }),
        mkComponent({ eccn: "9A515.x", fairMarketValueEur: 220_000 }),
      ]),
    );
    expect(result.hit).toBe(false);
    expect(result.hits).toHaveLength(0);
  });
});

// ─── (a)(2) — 5E002 encryption tech (anywhere) ─────────────────────

describe("§ 734.4(a)(2) — 5E002 encryption tech: no de minimis ANYWHERE", () => {
  it("5E002 content to a NEUTRAL destination (e.g. Switzerland) still hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CH", [mkComponent({ eccn: "5E002" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(2)")).toBe(true);
  });

  it("5E002 to China hits and also produces audit trail for both (a)(2) and other applicable carve-outs", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "5E002" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(2)")).toBe(true);
  });

  it("Non-5E002 content (e.g. EAR99) does NOT hit (a)(2)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CH", [mkComponent({ eccn: "EAR99" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(2)")).toBe(false);
  });
});

// ─── (a)(4) — 9E003 turbine/rocket-engine tech ─────────────────────

describe("§ 734.4(a)(4) — 9E003.a.1-.6/.a.8/.h/.i/.l (turbine/rocket tech) anywhere", () => {
  it("9E003.a.1 to Brazil → hits (no de minimis anywhere)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [mkComponent({ eccn: "9E003.a.1" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(4)")).toBe(true);
  });

  it("9E003.h to South Korea → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("KR", [mkComponent({ eccn: "9E003.h" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(4)")).toBe(true);
  });

  it("9E003.a.7 → does NOT hit (.a.7 is explicitly excluded from the list)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [mkComponent({ eccn: "9E003.a.7" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(4)")).toBe(false);
  });

  it("9E003.b → does NOT hit (.b not in the carve-out list)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [mkComponent({ eccn: "9E003.b" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(4)")).toBe(false);
  });
});

// ─── (a)(6)(ii) — 9x515 .y to E:1/E:2/Belarus/PRC/Russia ────────────

describe("§ 734.4(a)(6)(ii) — 9x515/600-series .y to E:1/E:2/Belarus/PRC/Russia", () => {
  it("9A515.y.42 to China → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "9A515.y.42" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(ii)")).toBe(
      true,
    );
  });

  it("9A515.y to Iran → hits (E:1)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("IR", [mkComponent({ eccn: "9A515.y" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(ii)")).toBe(
      true,
    );
  });

  it("9A515.y to Brazil → does NOT hit (destination outside named list)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [mkComponent({ eccn: "9A515.y" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(ii)")).toBe(
      false,
    );
  });
});

// ─── (a)(5) — 0A919.a.1 military commodity ──────────────────────────

describe("§ 734.4(a)(5) — 0A919.a.1 military commodity to D:5", () => {
  it("0A919.a.1 to China → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "0A919.a.1" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(5)")).toBe(true);
  });

  it("0A919.a.1 to Brazil → does NOT hit (not D:5)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [mkComponent({ eccn: "0A919.a.1" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(5)")).toBe(false);
  });
});

// ─── (a)(7) — OFAC override ─────────────────────────────────────────

describe("§ 734.4(a)(7) — OFAC overrides (Cuba / Iran)", () => {
  it("Any controlled US content to Cuba → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CU", [mkComponent({ eccn: "9A001" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(7)")).toBe(true);
  });

  it("EAR99 content to Cuba → does NOT hit (a)(7) (only controlled content surfaces OFAC risk)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CU", [mkComponent({ eccn: "EAR99" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(7)")).toBe(false);
  });

  it("Any controlled US content to Iran → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("IR", [mkComponent({ eccn: "3A001" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(7)")).toBe(true);
  });
});

// ─── (a)(1) — 3A001 semis in foreign computers ──────────────────────

describe("§ 734.4(a)(1) — Foreign computers + 3A001 semis to Computer Tier 3 (≈ D:5)", () => {
  it("3A001 to China → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "3A001" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(1)")).toBe(true);
  });

  it("3A001 to South Korea → does NOT hit", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("KR", [mkComponent({ eccn: "3A001" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(1)")).toBe(false);
  });
});

// ─── (a)(3) — 3B993.f.1 advanced-node IC fab ────────────────────────

describe("§ 734.4(a)(3) — 3B993.f.1 advanced-node IC fab to Macau/D:5", () => {
  it("3B993.f.1 to China + advanced-node IC fab end-use → hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "3B993.f.1" })], {
        endUseHints: { advancedNodeIcFabrication: true },
      }),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(3)")).toBe(true);
  });

  it("3B993.f.1 to China WITHOUT advanced-node end-use hint → does NOT hit (a)(3)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "3B993.f.1" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(3)")).toBe(false);
  });

  it("3B993.f.1 to Macau + advanced-node end-use → hits (Macau treated separately from D:5)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("MO", [mkComponent({ eccn: "3B993.f.1" })], {
        isMacau: true,
        endUseHints: { advancedNodeIcFabrication: true },
      }),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(3)")).toBe(true);
  });
});

// ─── (a)(8) and (a)(9) — 3B parameters ──────────────────────────────

describe("§ 734.4(a)(8) — Specific 3B parameters to Macau/D:5", () => {
  it("3B001.a.4 to China → hits (a)(8)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "3B001.a.4" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(8)")).toBe(true);
  });

  it("3B002.c to China → hits (a)(8)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "3B002.c" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(8)")).toBe(true);
  });

  it("3B001.f.5 to Macau → hits (a)(8) — explicit Macau treatment", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("MO", [mkComponent({ eccn: "3B001.f.5" })], { isMacau: true }),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(8)")).toBe(true);
  });

  it("3B001.a.4 to Brazil → does NOT hit (a)(8)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [mkComponent({ eccn: "3B001.a.4" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(8)")).toBe(false);
  });
});

describe("§ 734.4(a)(9) — Other 3B parameters (residual) to Macau/D:5", () => {
  it("3B001.b (NOT in (a)(8) list) to China → hits (a)(9)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "3B001.b" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(9)")).toBe(true);
    // (a)(8) should NOT also fire for the same ECCN — they're mutually
    // exclusive by construction (residual = not in (a)(8) list).
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(8)")).toBe(false);
  });

  it("3B001.a.4 to China → hits (a)(8), NOT (a)(9) (mutual exclusion)", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "3B001.a.4" })]),
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(8)")).toBe(true);
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(9)")).toBe(false);
  });
});

// ─── Aggregate behavior ─────────────────────────────────────────────

describe("checkNoDeMinimisCarveOuts — aggregate behavior", () => {
  it("Empty BOM → no hits", () => {
    const result = checkNoDeMinimisCarveOuts(mkInput("CN", []));
    expect(result.hit).toBe(false);
    expect(result.hits).toHaveLength(0);
  });

  it("Clean civilian EAR99 BOM to Brazil → no hits", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("BR", [
        mkComponent({ eccn: "EAR99" }),
        mkComponent({ eccn: "EAR99", nodeId: "C2" }),
      ]),
    );
    expect(result.hit).toBe(false);
  });

  it("Multiple carve-outs can fire for the same BOM (audit trail full)", () => {
    // 9A515.d to China hits (a)(6)(i). 5E002 also present hits (a)(2).
    // Both should appear in the audit trail.
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [
        mkComponent({ nodeId: "FPGA", eccn: "9A515.d" }),
        mkComponent({ nodeId: "CRYPTO-TECH", eccn: "5E002" }),
      ]),
    );
    expect(result.hits.length).toBeGreaterThanOrEqual(2);
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(6)(i)")).toBe(
      true,
    );
    expect(result.hits.some((h) => h.carveOutId === "734.4(a)(2)")).toBe(true);
  });

  it("Disclaimer always present", () => {
    const result = checkNoDeMinimisCarveOuts(mkInput("BR", []));
    expect(result.disclaimer).toMatch(/SCREENING-LEVEL/);
    expect(result.disclaimer).toMatch(/de-minimis/);
  });

  it("Hit rationale references both destination and component count", () => {
    const result = checkNoDeMinimisCarveOuts(
      mkInput("CN", [mkComponent({ eccn: "9A515.d" })]),
    );
    const trap = result.hits.find((h) => h.carveOutId === "734.4(a)(6)(i)");
    expect(trap?.rationale).toMatch(/CN|China/i);
    expect(trap?.rationale).toMatch(/license/i);
  });
});

// ─── Country group constants (sanity) ───────────────────────────────

describe("Country group constants", () => {
  it("D:5 has 22 countries post-Cambodia removal (2026-02-03)", () => {
    expect(COUNTRY_GROUP_D5.size).toBe(22);
    expect(COUNTRY_GROUP_D5.has("CN")).toBe(true);
    expect(COUNTRY_GROUP_D5.has("RU")).toBe(true);
    expect(COUNTRY_GROUP_D5.has("KH")).toBe(false); // Cambodia removed
  });

  it("E:1 contains Iran, North Korea, Syria", () => {
    expect(COUNTRY_GROUP_E1.has("IR")).toBe(true);
    expect(COUNTRY_GROUP_E1.has("KP")).toBe(true);
    expect(COUNTRY_GROUP_E1.has("SY")).toBe(true);
  });

  it("E:2 contains Cuba", () => {
    expect(COUNTRY_GROUP_E2.has("CU")).toBe(true);
  });
});
