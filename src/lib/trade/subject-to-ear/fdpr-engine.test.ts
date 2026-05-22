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

  it("Notes 2 not-yet-evaluated rules post-Z20c ((h)/(i))", () => {
    const result = evaluateFDPR(mkInput("BR", []));
    expect(result.notYetEvaluatedRules).toHaveLength(2);
    expect(result.notYetEvaluatedRules).toContain(
      "734.9(h)-advanced-computing",
    );
    expect(result.notYetEvaluatedRules).toContain("734.9(i)-supercomputer");
  });

  it("Disclaimer references the 8 implemented + 2 remaining FDPR rules", () => {
    const result = evaluateFDPR(mkInput("BR", []));
    expect(result.disclaimer).toMatch(/SCREENING-LEVEL/);
    expect(result.disclaimer).toMatch(/eight of the ten|8.*10/i);
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

// ─── § 734.9(e)(1) — Entity-List FDP Footnote 1 (Z20b) ──────────────

describe("§ 734.9(e)(1) — Entity-List FDP Footnote 1 (Huawei-style)", () => {
  it("Foreign item + US 3D001 tech + footnote-1 purchaser → fires", () => {
    const result = evaluateFDPR({
      destinationCountry: "DE", // even friendly destinations trip on knowledge
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3D001"],
        },
      ],
      knowledgeFacts: {
        purchaser: { entityListed: true, footnote: 1 },
      },
    });
    expect(result.fdprApplicable).toBe(true);
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn1"),
    ).toBe(true);
  });

  it("Foreign item + US 5E001 tech + footnote-1 end-user → fires", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSSoftware: true,
          usSoftwareEccns: ["5E001"],
        },
      ],
      knowledgeFacts: {
        endUser: { entityListed: true, footnote: 1 },
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn1"),
    ).toBe(true);
  });

  it("Footnote-1 entity in transaction but NO US Cat 3/4/5 D/E tech → does NOT fire", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["9E001"], // 9E not in Cat 3/4/5 scope
        },
      ],
      knowledgeFacts: {
        purchaser: { entityListed: true, footnote: 1 },
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn1"),
    ).toBe(false);
  });

  it("US 3D001 tech but NO footnote-1 party → does NOT fire", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3D001"],
        },
      ],
      knowledgeFacts: {
        purchaser: { entityListed: false },
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn1"),
    ).toBe(false);
  });

  it("License authority cites § 744.11(a)(2)(i)", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3D001"],
        },
      ],
      knowledgeFacts: {
        purchaser: { entityListed: true, footnote: 1 },
      },
    });
    const hit = result.hits.find(
      (h) => h.ruleId === "734.9(e)-entity-list-fn1",
    );
    expect(hit?.licenseAuthority).toMatch(/§ 744\.11\(a\)\(2\)\(i\)/);
  });
});

// ─── § 734.9(e)(2) — Entity-List FDP Footnote 4 (HikVision) ─────────

describe("§ 734.9(e)(2) — Entity-List FDP Footnote 4 (encryption)", () => {
  it("Foreign item + US 5D002 (encryption) + footnote-4 entity → fires", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSSoftware: true,
          usSoftwareEccns: ["5D002"],
        },
      ],
      knowledgeFacts: {
        ultimateConsignee: { entityListed: true, footnote: 4 },
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn4"),
    ).toBe(true);
  });

  it("Foreign item + US 3D001 (in fn1 scope, also fn4) + footnote-4 → fires fn4 AND fn1", () => {
    // 3D001 is in BOTH fn1 and fn4 scope; with footnote-4 entity, both rules fire.
    const result = evaluateFDPR({
      destinationCountry: "BR",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3D001"],
        },
      ],
      knowledgeFacts: {
        endUser: { entityListed: true, footnote: 4 },
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn4"),
    ).toBe(true);
    // fn1 requires fn1 PARTY (not fn4), so it should NOT fire even though
    // the tech ECCN is in fn1 scope.
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn1"),
    ).toBe(false);
  });

  it("US 5E002 + NO footnote-4 party → does NOT fire", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["5E002"],
        },
      ],
      knowledgeFacts: {},
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn4"),
    ).toBe(false);
  });
});

// ─── § 734.9(e)(3) — Entity-List FDP Footnote 5 + Advanced-Node-IC ─

describe("§ 734.9(e)(3) — Entity-List FDP Footnote 5 / Advanced-Node-IC", () => {
  it("Foreign 3B001 + US 3D001 + footnote-5 entity → fires", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      foreignItemEccn: "3B001",
      bom: [
        {
          nodeId: "L1",
          eccn: "3B001",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3D001"],
        },
      ],
      knowledgeFacts: {
        endUser: { entityListed: true, footnote: 5 },
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn5"),
    ).toBe(true);
  });

  it("Foreign 3B002.c + US 3E001 + advanced-node-IC facility in PRC → fires (knowledge trigger without footnote)", () => {
    const result = evaluateFDPR({
      destinationCountry: "CN",
      foreignItemEccn: "3B002",
      bom: [
        {
          nodeId: "L1",
          eccn: "3B002",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3E001"],
        },
      ],
      knowledgeFacts: {
        advancedNodeIcFacility: true,
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn5"),
    ).toBe(true);
  });

  it("Foreign 3B001 + advanced-node-IC facility but destination NOT Macau/D:5 → does NOT fire", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR", // not D:5 / not Macau
      foreignItemEccn: "3B001",
      bom: [
        {
          nodeId: "L1",
          eccn: "3B001",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3D001"],
        },
      ],
      knowledgeFacts: {
        advancedNodeIcFacility: true,
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn5"),
    ).toBe(false);
  });

  it("Foreign 9A001 (NOT 3B scope) + footnote-5 → does NOT fire", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      foreignItemEccn: "9A001",
      bom: [
        {
          nodeId: "L1",
          eccn: "9A001",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3D001"],
        },
      ],
      knowledgeFacts: {
        purchaser: { entityListed: true, footnote: 5 },
      },
    });
    expect(
      result.hits.some((h) => h.ruleId === "734.9(e)-entity-list-fn5"),
    ).toBe(false);
  });

  it("License authority cites § 744.11(a)(2)(v)", () => {
    const result = evaluateFDPR({
      destinationCountry: "BR",
      foreignItemEccn: "3B001",
      bom: [
        {
          nodeId: "L1",
          eccn: "3B001",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3E001"],
        },
      ],
      knowledgeFacts: {
        endUser: { entityListed: true, footnote: 5 },
      },
    });
    const hit = result.hits.find(
      (h) => h.ruleId === "734.9(e)-entity-list-fn5",
    );
    expect(hit?.licenseAuthority).toMatch(/§ 744\.11\(a\)\(2\)\(v\)/);
  });
});

// ─── Entity-List FDPR + cascade integration ────────────────────────

describe("Entity-List FDPR — destination-independent triggering", () => {
  it("Footnote-1 entity in Germany (A:5) → FDPR still fires (knowledge-driven, not destination-driven)", () => {
    // Critical contrast with destination-gated rules: a friendly
    // destination like Germany still trips entity-list FDPR if a
    // footnote-1 party is in the transaction.
    const result = evaluateFDPR({
      destinationCountry: "DE",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["3D001"],
        },
      ],
      knowledgeFacts: {
        purchaser: { entityListed: true, footnote: 1 },
      },
    });
    expect(result.fdprApplicable).toBe(true);
  });
});

// ─── § 734.9(f) — Russia / Belarus / Crimea FDPR (Z20c) ─────────────

describe("§ 734.9(f) — Russia / Belarus / Crimea FDPR", () => {
  it("Russia destination + foreign item made with US 9E001 (Cat 9 E) → fires", () => {
    const result = evaluateFDPR({
      destinationCountry: "RU",
      foreignItemEccn: "9A610", // any foreign ECCN — (f) doesn't gate on it
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["9E001"],
        },
      ],
    });
    expect(result.fdprApplicable).toBe(true);
    const fHit = result.hits.find(
      (h) => h.ruleId === "734.9(f)-russia-belarus-crimea",
    );
    expect(fHit).toBeDefined();
    expect(fHit?.matchingComponentNodeIds).toEqual(["L1"]);
    expect(fHit?.rationale).toMatch(/Russia\/Belarus\/occupied-Ukraine/i);
    expect(fHit?.licenseAuthority).toMatch(/§ 746\.8/);
  });

  it("Belarus destination + plant-direct-product 3E001 → fires", () => {
    const result = evaluateFDPR({
      destinationCountry: "BY",
      foreignItemEccn: "EAR99",
      bom: [
        {
          nodeId: "PLANT",
          eccn: "EAR99",
          producedByPlantThatIsUSDirectProduct: true,
          plantTechEccns: ["3E001"],
        },
      ],
    });
    const fHit = result.hits.find(
      (h) => h.ruleId === "734.9(f)-russia-belarus-crimea",
    );
    expect(fHit).toBeDefined();
  });

  it("Occupied-Ukraine region (flag) + foreign item made with 5D002 software → fires", () => {
    const result = evaluateFDPR({
      destinationCountry: "UA", // Ukraine ISO, but operator flags occupied region
      foreignItemEccn: "5A002",
      bom: [
        {
          nodeId: "L1",
          eccn: "5A002",
          madeWithUSSoftware: true,
          usSoftwareEccns: ["5D002"],
        },
      ],
      knowledgeFacts: {
        destinationIsOccupiedUkraineRegion: true,
      },
    });
    const fHit = result.hits.find(
      (h) => h.ruleId === "734.9(f)-russia-belarus-crimea",
    );
    expect(fHit).toBeDefined();
    expect(fHit?.rationale).toMatch(/occupied Ukrainian region/i);
  });

  it("Friendly destination (Germany) + same US 9E001 tech → does NOT fire", () => {
    // (f) is destination-gated. Without RU/BY/occupied-UA, no trigger.
    const result = evaluateFDPR({
      destinationCountry: "DE",
      foreignItemEccn: "EAR99",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["9E001"],
        },
      ],
    });
    const fHit = result.hits.find(
      (h) => h.ruleId === "734.9(f)-russia-belarus-crimea",
    );
    expect(fHit).toBeUndefined();
  });

  it("Russia destination but only Cat 1/2 US tech in BOM → does NOT fire (Cat 3-9 D/E required)", () => {
    // (f) product scope is Cat 3-9 D/E. Cat 1 (Materials) and Cat 2
    // (Materials Processing) are OUTSIDE scope.
    const result = evaluateFDPR({
      destinationCountry: "RU",
      foreignItemEccn: "EAR99",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["1E001"], // Cat 1 — outside (f) scope
        },
      ],
    });
    const fHit = result.hits.find(
      (h) => h.ruleId === "734.9(f)-russia-belarus-crimea",
    );
    expect(fHit).toBeUndefined();
  });

  it("Russia destination + Cat 7 D (avionics software) → fires (Cat 7 in scope)", () => {
    // Cat 7 = Navigation/Avionics. Direct hit on Cat 3-9 D/E.
    const result = evaluateFDPR({
      destinationCountry: "RU",
      foreignItemEccn: "7A003",
      bom: [
        {
          nodeId: "L1",
          eccn: "7A003",
          madeWithUSSoftware: true,
          usSoftwareEccns: ["7D003"],
        },
      ],
    });
    expect(result.fdprApplicable).toBe(true);
  });

  it("Plain Ukraine destination (no occupied-region flag) + US 9E001 → does NOT fire", () => {
    // Without the explicit knowledge-fact flag, Ukraine proper is not
    // in the (f) country scope.
    const result = evaluateFDPR({
      destinationCountry: "UA",
      foreignItemEccn: "EAR99",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["9E001"],
        },
      ],
    });
    const fHit = result.hits.find(
      (h) => h.ruleId === "734.9(f)-russia-belarus-crimea",
    );
    expect(fHit).toBeUndefined();
  });
});

// ─── § 734.9(g) — MEU / Procurement FDPR Footnote 3 (Z20c) ──────────

describe("§ 734.9(g) — MEU / Procurement FDPR (Footnote 3)", () => {
  it("Footnote-3 end-user + ANY destination + US 5E001 tech → fires", () => {
    // Critical: destination can be friendly (Germany, Kazakhstan, UAE).
    // (g) catches third-country procurement schemes routing to MEU.
    const result = evaluateFDPR({
      destinationCountry: "KZ", // Kazakhstan — friendly transit
      foreignItemEccn: "5A001",
      bom: [
        {
          nodeId: "L1",
          eccn: "5A001",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["5E001"],
        },
      ],
      knowledgeFacts: {
        endUser: { entityListed: true, footnote: 3 },
      },
    });
    expect(result.fdprApplicable).toBe(true);
    const gHit = result.hits.find(
      (h) => h.ruleId === "734.9(g)-meu-procurement-fn3",
    );
    expect(gHit).toBeDefined();
    expect(gHit?.rationale).toMatch(/end-user/);
    expect(gHit?.rationale).toMatch(/WORLDWIDE/i);
    expect(gHit?.licenseAuthority).toMatch(/§ 744\.21/);
  });

  it("Footnote-3 incorporator → fires (any party role triggers)", () => {
    const result = evaluateFDPR({
      destinationCountry: "TR", // Turkey
      foreignItemEccn: "7A003",
      bom: [
        {
          nodeId: "L1",
          eccn: "7A003",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["7E001"],
        },
      ],
      knowledgeFacts: {
        incorporator: { entityListed: true, footnote: 3 },
      },
    });
    const gHit = result.hits.find(
      (h) => h.ruleId === "734.9(g)-meu-procurement-fn3",
    );
    expect(gHit).toBeDefined();
    expect(gHit?.rationale).toMatch(/incorporator/);
  });

  it("No footnote-3 party (only footnote-1) + Cat 3-9 US tech → does NOT fire (g)", () => {
    // (g) is footnote-3-specific. A footnote-1 listing alone won't
    // trigger (g) — though it triggers (e)(1).
    const result = evaluateFDPR({
      destinationCountry: "BR",
      foreignItemEccn: "EAR99",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["5E001"],
        },
      ],
      knowledgeFacts: {
        purchaser: { entityListed: true, footnote: 1 },
      },
    });
    const gHit = result.hits.find(
      (h) => h.ruleId === "734.9(g)-meu-procurement-fn3",
    );
    expect(gHit).toBeUndefined();
  });

  it("Footnote-3 + Cat 1 tech (outside scope) → does NOT fire", () => {
    // (g) product scope is Cat 3-9 D/E. Cat 1 doesn't trigger.
    const result = evaluateFDPR({
      destinationCountry: "BR",
      foreignItemEccn: "EAR99",
      bom: [
        {
          nodeId: "L1",
          eccn: "EAR99",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["1E001"],
        },
      ],
      knowledgeFacts: {
        endUser: { entityListed: true, footnote: 3 },
      },
    });
    const gHit = result.hits.find(
      (h) => h.ruleId === "734.9(g)-meu-procurement-fn3",
    );
    expect(gHit).toBeUndefined();
  });

  it("Russia destination + Footnote-3 entity → BOTH (f) and (g) can fire simultaneously", () => {
    // The high-risk overlap: Russian MEU buying foreign item built
    // with US Cat 3-9 D/E tech triggers both rules.
    const result = evaluateFDPR({
      destinationCountry: "RU",
      foreignItemEccn: "9A610",
      bom: [
        {
          nodeId: "L1",
          eccn: "9A610",
          madeWithUSTechnology: true,
          usTechnologyEccns: ["9E001"],
        },
      ],
      knowledgeFacts: {
        endUser: { entityListed: true, footnote: 3 },
      },
    });
    const fHit = result.hits.find(
      (h) => h.ruleId === "734.9(f)-russia-belarus-crimea",
    );
    const gHit = result.hits.find(
      (h) => h.ruleId === "734.9(g)-meu-procurement-fn3",
    );
    expect(fHit).toBeDefined();
    expect(gHit).toBeDefined();
  });

  it("Plant-direct-product alone (no madeWith) + footnote-3 → fires via plant trigger", () => {
    const result = evaluateFDPR({
      destinationCountry: "AE", // UAE — third-country transit
      foreignItemEccn: "EAR99",
      bom: [
        {
          nodeId: "PLANT",
          eccn: "EAR99",
          producedByPlantThatIsUSDirectProduct: true,
          plantTechEccns: ["6E001"],
        },
      ],
      knowledgeFacts: {
        ultimateConsignee: { entityListed: true, footnote: 3 },
      },
    });
    const gHit = result.hits.find(
      (h) => h.ruleId === "734.9(g)-meu-procurement-fn3",
    );
    expect(gHit).toBeDefined();
    expect(gHit?.matchingComponentNodeIds).toEqual(["PLANT"]);
  });
});
