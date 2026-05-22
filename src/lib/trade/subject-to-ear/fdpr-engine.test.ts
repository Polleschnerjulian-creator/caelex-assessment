/**
 * Tests for src/lib/trade/subject-to-ear/fdpr-engine.ts — Sprint Z20a.
 *
 * Covers Blueprint 2 § 9.3 Worked Examples C, D:
 *   C — EU rocket engine on US-origin 9E003.a.1 plant tooling at 0%
 *       physical US content → for India NO FDP, for China (D:1) NS-FDP
 *   D — EU avionics box with US-origin 9D515 in design path, no
 *       embedded US sw/hw → for Korea NO FDP, for Russia 9x515-FDP
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  evaluateFDPR,
  type FDPRBOMComponent,
  type FDPREvaluationInput,
} from "./fdpr-engine";

// ─── Helpers ────────────────────────────────────────────────────────

function mkLine(overrides: Partial<FDPRBOMComponent> = {}): FDPRBOMComponent {
  return {
    nodeId: "LINE-1",
    description: "Test line",
    eccn: "EAR99",
    ...overrides,
  };
}

function mkInput(
  destinationCountry: string,
  bom: FDPRBOMComponent[],
  extras: Partial<FDPREvaluationInput> = {},
): FDPREvaluationInput {
  return {
    destinationCountry,
    bom,
    foreignItemEccn: extras.foreignItemEccn,
  };
}

// ─── § 734.9(c) — 9x515-FDP ──────────────────────────────────────────

describe("§ 734.9(c) — 9x515-FDP", () => {
  it("Foreign 9A515.a.1 sat + US 9E515 tech to China (D:5) → fires", () => {
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            nodeId: "DESIGN-PATH",
            eccn: "EAR99",
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E515"],
          }),
        ],
        { foreignItemEccn: "9A515.a.1" },
      ),
    );
    expect(result.fdprApplicable).toBe(true);
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(true);
  });

  it("Foreign 9A515 sat + US 9D515 software to Russia → fires", () => {
    const result = evaluateFDPR(
      mkInput(
        "RU",
        [
          mkLine({
            nodeId: "SW-1",
            madeWithUSSoftware: true,
            usSoftwareEccns: ["9D515"],
          }),
        ],
        { foreignItemEccn: "9A515.a" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(true);
  });

  it("Plant is direct product of 9E515 → fires (the FDPR factory-tooling case)", () => {
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            nodeId: "PLANT-1",
            producedByPlantThatIsUSDirectProduct: true,
            plantTechEccns: ["9E515"],
          }),
        ],
        { foreignItemEccn: "9A515.a.1" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(true);
  });

  it("Foreign 9A515 + US 9E515 tech to Brazil → does NOT fire (B group)", () => {
    const result = evaluateFDPR(
      mkInput(
        "BR",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E515"],
          }),
        ],
        { foreignItemEccn: "9A515.a.1" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(false);
  });

  it("Foreign 9A004 (NOT 9x515) + US 9E515 tech to China → does NOT fire (wrong foreign-item ECCN)", () => {
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E515"],
          }),
        ],
        { foreignItemEccn: "9A004" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(false);
  });

  it("Blueprint 2 Example D — EU avionics box (9A515.x) + US 9D515 in design path to Russia → fires", () => {
    const result = evaluateFDPR(
      mkInput(
        "RU",
        [
          mkLine({
            nodeId: "AVIONICS-DESIGN",
            description: "EU avionics box developed using US 9D515 source",
            madeWithUSSoftware: true,
            usSoftwareEccns: ["9D515"],
            // No embedded US sw in shipped box — design-time use only
          }),
        ],
        { foreignItemEccn: "9A515.x" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(true);
    const hit = result.hits.find((h) => h.ruleId === "734.9(c)-9x515");
    expect(hit?.licenseAuthority).toMatch(/§ 742\.6/);
  });

  it("Blueprint 2 Example D — same EU avionics to South Korea → does NOT fire", () => {
    const result = evaluateFDPR(
      mkInput(
        "KR",
        [
          mkLine({
            madeWithUSSoftware: true,
            usSoftwareEccns: ["9D515"],
          }),
        ],
        { foreignItemEccn: "9A515.x" },
      ),
    );
    // South Korea is A:5; NOT in {D:5, E:1, E:2} → 9x515-FDPR doesn't fire
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(false);
  });

  it("0% physical US content — FDPR still fires (orthogonal to de-minimis)", () => {
    // Critical FDPR property: foreign item with 0% physical US content
    // is STILL subject to the EAR via FDPR if produced on
    // US-direct-product technology / plant.
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            nodeId: "ALL-NON-US",
            // No usOrigin field; no physical US content
            producedByPlantThatIsUSDirectProduct: true,
            plantTechEccns: ["9E515"],
          }),
        ],
        { foreignItemEccn: "9A515.a.1" },
      ),
    );
    expect(result.fdprApplicable).toBe(true);
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(true);
  });
});

// ─── § 734.9(b) — NS-FDP ─────────────────────────────────────────────

describe("§ 734.9(b) — NS-FDP", () => {
  it("Foreign item produced using US 9E003.a.1 tech → fires for China (D:1)", () => {
    const result = evaluateFDPR(
      mkInput("CN", [
        mkLine({
          nodeId: "DESIGN-TECH",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["9E003.a.1"],
        }),
      ]),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(b)-NS")).toBe(true);
  });

  it("Plant is direct product of NS-controlled tech → fires for D:1", () => {
    const result = evaluateFDPR(
      mkInput("CN", [
        mkLine({
          producedByPlantThatIsUSDirectProduct: true,
          plantTechEccns: ["9E003"],
        }),
      ]),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(b)-NS")).toBe(true);
  });

  it("Blueprint 2 Example C — EU rocket engine on 9E003.a.1 plant to China → fires NS-FDP", () => {
    const result = evaluateFDPR(
      mkInput("CN", [
        mkLine({
          nodeId: "PLANT-9E003",
          description: "EU plant CNC milling line, direct product of 9E003.a.1",
          producedByPlantThatIsUSDirectProduct: true,
          plantTechEccns: ["9E003.a.1"],
        }),
      ]),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(b)-NS")).toBe(true);
  });

  it("Blueprint 2 Example C — same EU engine to India → does NOT fire NS-FDP", () => {
    // India is A:5/A:6 zone (not in D:1/E:1/E:2) → NS-FDP doesn't fire.
    const result = evaluateFDPR(
      mkInput("IN", [
        mkLine({
          producedByPlantThatIsUSDirectProduct: true,
          plantTechEccns: ["9E003.a.1"],
        }),
      ]),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(b)-NS")).toBe(false);
  });

  it("Foreign item with NO US tech/software/plant → no NS-FDP", () => {
    const result = evaluateFDPR(
      mkInput("CN", [
        mkLine({
          eccn: "EAR99",
          // No US-tech provenance fields set
        }),
      ]),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(b)-NS")).toBe(false);
  });
});

// ─── § 734.9(d) — 600-series-FDP ─────────────────────────────────────

describe("§ 734.9(d) — 600-series-FDP", () => {
  it("Foreign 9A610 + US 9E610 tech to China → fires", () => {
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E610"],
          }),
        ],
        { foreignItemEccn: "9A610" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(d)-600-series")).toBe(
      true,
    );
  });

  it("Foreign 0A919 (military commodity) + US 600-series tech to China → fires", () => {
    // The (d) rule: foreign item is "in a 600-series ECCN OR 0A919"
    // AND "direct product of US-origin 600-series tech/sw". So 0A919
    // counts as the foreign-item side; the US tech must be 600-series.
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E610"], // 600-series tech
          }),
        ],
        { foreignItemEccn: "0A919" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(d)-600-series")).toBe(
      true,
    );
  });

  it("Foreign 9A610 to D:3 destination (Pakistan) → fires", () => {
    // D:3 is in the 600-series-FDPR destination scope.
    const result = evaluateFDPR(
      mkInput(
        "PK",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E610"],
          }),
        ],
        { foreignItemEccn: "9A610" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(d)-600-series")).toBe(
      true,
    );
  });

  it("Foreign 9A610 to Brazil (B group) → does NOT fire", () => {
    const result = evaluateFDPR(
      mkInput(
        "BR",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E610"],
          }),
        ],
        { foreignItemEccn: "9A610" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(d)-600-series")).toBe(
      false,
    );
  });

  it("Foreign 9A515 (NOT 600-series) + US 9E610 to China → does NOT fire 600-FDP", () => {
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E610"],
          }),
        ],
        { foreignItemEccn: "9A515.a.1" },
      ),
    );
    // 9A515 foreign item is not 600-series → 600-FDP doesn't fire.
    // (9x515-FDP might fire separately but that's a different rule.)
    expect(result.hits.some((h) => h.ruleId === "734.9(d)-600-series")).toBe(
      false,
    );
  });
});

// ─── Cross-rule interactions ────────────────────────────────────────

describe("Multi-rule interaction", () => {
  it("Foreign 9A515 + 9E515 to China → fires 9x515-FDP (c); NS-FDP (b) also fires for D:1", () => {
    // China is in BOTH D:5 (triggers c) and D:1 (triggers b for NS).
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E515"],
          }),
        ],
        { foreignItemEccn: "9A515.a.1" },
      ),
    );
    expect(result.hits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(true);
    // 9E515 is also NS-controlled in the conservative reading; (b) NS-FDP fires too.
    expect(result.hits.some((h) => h.ruleId === "734.9(b)-NS")).toBe(true);
  });

  it("Foreign 9A610 + US 9E610 to China → fires BOTH (b) NS and (d) 600", () => {
    const result = evaluateFDPR(
      mkInput(
        "CN",
        [
          mkLine({
            madeWithUSTechnology: true,
            usTechnologyEccns: ["9E610"],
          }),
        ],
        { foreignItemEccn: "9A610" },
      ),
    );
    expect(result.hits.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Aggregate properties ──────────────────────────────────────────

describe("evaluateFDPR — aggregate behavior", () => {
  it("Empty BOM + Brazil → no hits, fdprApplicable=false", () => {
    const result = evaluateFDPR(mkInput("BR", []));
    expect(result.fdprApplicable).toBe(false);
    expect(result.hits).toHaveLength(0);
  });

  it("Notes 7 not-yet-evaluated rules (Z20b-d queued)", () => {
    const result = evaluateFDPR(mkInput("BR", []));
    expect(result.notYetEvaluatedRules).toHaveLength(7);
    expect(result.notYetEvaluatedRules).toContain("734.9(e)-entity-list-fn1");
    expect(result.notYetEvaluatedRules).toContain(
      "734.9(f)-russia-belarus-crimea",
    );
    expect(result.notYetEvaluatedRules).toContain(
      "734.9(h)-advanced-computing",
    );
  });

  it("Disclaimer references the 3 implemented + 5 not-yet-evaluated rules", () => {
    const result = evaluateFDPR(mkInput("BR", []));
    expect(result.disclaimer).toMatch(/SCREENING-LEVEL/);
    expect(result.disclaimer).toMatch(/three of the eight|3.*8|Entity-List/i);
  });

  it("Clean civilian foreign item to A:5 destination → no FDP", () => {
    const result = evaluateFDPR(
      mkInput(
        "DE",
        [
          mkLine({
            eccn: "EAR99",
            madeWithUSTechnology: false,
          }),
        ],
        { foreignItemEccn: "9A004" },
      ),
    );
    expect(result.fdprApplicable).toBe(false);
  });
});
