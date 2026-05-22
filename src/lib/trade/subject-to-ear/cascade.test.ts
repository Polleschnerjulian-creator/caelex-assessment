/**
 * Tests for src/lib/trade/subject-to-ear/cascade.ts — Sprint Z18.
 *
 * Covers Blueprint 2 § 9.3 Worked Examples A through F:
 *
 *   A — EU 350kg EO satellite + US 9A515.d FPGA + 9A515.x RW → China
 *       → Gate 3a (a)(6)(i) carve-out fires → subject_to_ear=true
 *   B — Same satellite redirected to Brazil
 *       → All gates pass → NOT subject_to_ear, 25% threshold applies
 *   E — EU TT&C ground station + US 9A515.b to Türkiye
 *       → 25% threshold; 6% US content → NOT subject_to_ear
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  evaluateSubjectToEAR,
  type CascadeBOMComponent,
  type CascadeInput,
} from "./cascade";

// ─── Helpers ────────────────────────────────────────────────────────

function mkBom(
  ...overrides: Partial<CascadeBOMComponent>[]
): CascadeBOMComponent[] {
  return overrides.map((ov, i) => ({
    nodeId: `LINE-${i + 1}`,
    description: ov.description ?? "Test line",
    usOrigin: ov.usOrigin ?? true,
    eccn: ov.eccn ?? "EAR99",
    fairMarketValueEur: ov.fairMarketValueEur ?? 100_000,
    isUSML: ov.isUSML,
    usmlCarveOutToEar: ov.usmlCarveOutToEar,
  }));
}

function mkInput(
  destinationCountry: string,
  bom: CascadeBOMComponent[],
  extras: Partial<CascadeInput> = {},
): CascadeInput {
  return {
    destinationCountry,
    bom,
    totalValueEur: extras.totalValueEur ?? 12_000_000,
    endUseHints: extras.endUseHints,
    usControlledContentPercent: extras.usControlledContentPercent,
  };
}

// ─── Gate 1 — ITAR see-through ──────────────────────────────────────

describe("Gate 1 — ITAR see-through", () => {
  it("Any USML in BOM → jurisdiction=ITAR, gateFired=ITAR_SEE_THROUGH, no further math", () => {
    const result = evaluateSubjectToEAR(
      mkInput("DE", mkBom({ eccn: "USML:XV(a)(7)(i)", isUSML: true })),
    );
    expect(result.jurisdiction).toBe("ITAR");
    expect(result.subjectToEar).toBe(false); // ITAR is different jurisdiction
    expect(result.gateFired).toBe("ITAR_SEE_THROUGH");
    expect(result.itarSeeThroughHits).toHaveLength(1);
    expect(result.itarSeeThroughHits[0]).toBe("LINE-1");
  });

  it("USML line with usmlCarveOutToEar=true → does NOT trigger Gate 1 stop", () => {
    const result = evaluateSubjectToEAR(
      mkInput("FR", [
        {
          nodeId: "L1",
          description: "USML XV(c)(3) integrated into 9A610",
          usOrigin: true,
          eccn: "USML:XV(c)(3)",
          isUSML: true,
          usmlCarveOutToEar: true,
          fairMarketValueEur: 50_000,
        },
      ]),
    );
    expect(result.jurisdiction).not.toBe("ITAR");
    expect(result.gateFired).not.toBe("ITAR_SEE_THROUGH");
  });

  it("Multiple USML lines → all listed in itarSeeThroughHits", () => {
    const result = evaluateSubjectToEAR(
      mkInput(
        "DE",
        mkBom(
          { eccn: "USML:XV(a)(7)(i)", isUSML: true },
          { eccn: "USML:IV(d)(2)", isUSML: true },
        ),
      ),
    );
    expect(result.itarSeeThroughHits).toHaveLength(2);
  });

  it("ITAR obligations: recordkeeping 5y per 22 CFR § 122.5, DCS NOT required", () => {
    const result = evaluateSubjectToEAR(
      mkInput("DE", mkBom({ eccn: "USML:XV(a)(7)(i)", isUSML: true })),
    );
    expect(result.obligations.recordkeepingYears).toBe(5);
    expect(result.obligations.destinationControlStatementRequired).toBe(false);
    expect(result.obligations.recordkeepingBasis).toMatch(/22 CFR § 122\.5/);
  });
});

// ─── Blueprint 2 § 9.3 Example A — EU EO sat to China ────────────────

describe("Blueprint 2 § 9.3 Example A — EU EO satellite to China", () => {
  it("9A515.d FPGA + 9A515.x RW to China → Gate 3a (a)(6)(i) fires → subject_to_ear=true", () => {
    const result = evaluateSubjectToEAR(
      mkInput("CN", [
        {
          nodeId: "RAD-HARD-IC-01",
          description: "US-origin rad-hard FPGA",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 180_000,
        },
        {
          nodeId: "RW-04",
          description: "US-origin reaction wheel",
          usOrigin: true,
          eccn: "9A515.x",
          fairMarketValueEur: 220_000,
        },
        {
          nodeId: "STR-09",
          description: "EU-built star tracker",
          usOrigin: false,
          eccn: "9A515.x",
          fairMarketValueEur: 95_000,
        },
      ]),
    );
    expect(result.jurisdiction).toBe("EAR");
    expect(result.subjectToEar).toBe(true);
    expect(result.gateFired).toBe("DE_MINIMIS_CARVE_OUT");
    expect(result.appliedThresholdPercent).toBe(0);
    expect(result.deMinimisCarveOuts.length).toBeGreaterThanOrEqual(1);
    expect(
      result.deMinimisCarveOuts.some((h) => h.carveOutId === "734.4(a)(6)(i)"),
    ).toBe(true);
  });

  it("Example A → DCS required + 5y recordkeeping per § 762.6 + § 758.6", () => {
    const result = evaluateSubjectToEAR(
      mkInput("CN", [
        {
          nodeId: "L1",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 180_000,
        },
      ]),
    );
    expect(result.obligations.destinationControlStatementRequired).toBe(true);
    expect(result.obligations.recordkeepingYears).toBe(5);
    expect(result.obligations.recordkeepingBasis).toMatch(/762\.6.*758\.6/);
  });

  it("Example A rationale includes destination country + carve-out citation", () => {
    const result = evaluateSubjectToEAR(
      mkInput("CN", [
        {
          nodeId: "L1",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 180_000,
        },
      ]),
    );
    const fullRationale = result.rationale.join("\n");
    expect(fullRationale).toMatch(/CN/);
    expect(fullRationale).toMatch(/734\.4\(a\)\(6\)\(i\)|carve-out/i);
  });
});

// ─── Blueprint 2 § 9.3 Example B — same sat to Brazil ──────────────

describe("Blueprint 2 § 9.3 Example B — same EU satellite to Brazil", () => {
  it("9A515.d + 9A515.x at 3.33% US content to Brazil → NOT subject_to_ear, 25% threshold", () => {
    const result = evaluateSubjectToEAR(
      mkInput(
        "BR",
        [
          {
            nodeId: "L1",
            usOrigin: true,
            eccn: "9A515.d",
            fairMarketValueEur: 180_000,
          },
          {
            nodeId: "L2",
            usOrigin: true,
            eccn: "9A515.x",
            fairMarketValueEur: 220_000,
          },
        ],
        { usControlledContentPercent: 3.33, totalValueEur: 12_000_000 },
      ),
    );
    expect(result.jurisdiction).toBe("NONE");
    expect(result.subjectToEar).toBe(false);
    expect(result.gateFired).toBe("NONE");
    expect(result.appliedThresholdPercent).toBe(25);
    expect(result.deMinimisCarveOuts).toHaveLength(0);
  });

  it("Example B obligations: 5y recordkeeping but NO DCS (item not subject to EAR)", () => {
    const result = evaluateSubjectToEAR(
      mkInput("BR", [{ nodeId: "L1", usOrigin: true, eccn: "9A515.d" }], {
        usControlledContentPercent: 3.33,
      }),
    );
    expect(result.obligations.destinationControlStatementRequired).toBe(false);
    expect(result.obligations.recordkeepingYears).toBe(5);
  });
});

// ─── Blueprint 2 § 9.3 Example E — TT&C ground station to Türkiye ──

describe("Blueprint 2 § 9.3 Example E — TT&C ground station with US 9A515.b to Türkiye", () => {
  it("9A515.b at 6% US content to Türkiye (B/A:5) → NOT subject_to_ear", () => {
    const result = evaluateSubjectToEAR(
      mkInput(
        "TR",
        [
          {
            nodeId: "GS-1",
            usOrigin: true,
            eccn: "9A515.b",
            fairMarketValueEur: 120_000,
          },
        ],
        { usControlledContentPercent: 6.0, totalValueEur: 2_000_000 },
      ),
    );
    expect(result.subjectToEar).toBe(false);
    expect(result.appliedThresholdPercent).toBe(25);
    expect(result.gateFired).toBe("NONE");
  });
});

// ─── Percentage threshold edge cases ────────────────────────────────

describe("Gate 3b — Percentage threshold edge cases", () => {
  it("US content > 25% to Brazil → subject_to_ear via percentage exceedance", () => {
    const result = evaluateSubjectToEAR(
      mkInput(
        "BR",
        [
          {
            nodeId: "L1",
            usOrigin: true,
            eccn: "9A001", // not in any (a)-carve-out
            fairMarketValueEur: 4_000_000,
          },
        ],
        { usControlledContentPercent: 28.5, totalValueEur: 14_000_000 },
      ),
    );
    expect(result.subjectToEar).toBe(true);
    expect(result.gateFired).toBe("DE_MINIMIS_PERCENTAGE_EXCEEDED");
    expect(result.appliedThresholdPercent).toBe(25);
  });

  it("US content 10.1% to Iran (E:1) → exceeds 10% threshold → subject_to_ear", () => {
    const result = evaluateSubjectToEAR(
      mkInput(
        "IR",
        [
          {
            nodeId: "L1",
            usOrigin: true,
            eccn: "EAR99", // EAR99 to dodge OFAC (a)(7) trap for this test
            fairMarketValueEur: 100_000,
          },
        ],
        { usControlledContentPercent: 10.1 },
      ),
    );
    // Iran is E:1 → 10% threshold applies
    // But Iran is also D:5 → (a)(6)(ii) catches .y items + (a)(7) OFAC catches controlled content
    // With EAR99 the OFAC (a)(7) doesn't fire AND no 9x515 content so (a)(6) doesn't fire
    // So we're squarely in Gate 3b
    expect(result.appliedThresholdPercent).toBe(10);
    expect(result.subjectToEar).toBe(true);
  });

  it("US content 9.9% to Iran (E:1) → at threshold, NOT subject_to_ear", () => {
    const result = evaluateSubjectToEAR(
      mkInput("IR", [{ nodeId: "L1", usOrigin: true, eccn: "EAR99" }], {
        usControlledContentPercent: 9.9,
      }),
    );
    expect(result.appliedThresholdPercent).toBe(10);
    expect(result.subjectToEar).toBe(false);
  });

  it("No usControlledContentPercent supplied → gateFired=NONE with rationale about Supplement No. 2", () => {
    const result = evaluateSubjectToEAR(
      mkInput("BR", [{ nodeId: "L1", usOrigin: true, eccn: "9A001" }]),
    );
    expect(result.usControlledContentPercent).toBeNull();
    const fullRationale = result.rationale.join("\n");
    expect(fullRationale).toMatch(/Supplement No\.?\s*2/i);
  });
});

// ─── Gate 2 FDPR wiring (Z20a — 3 of 8 scenarios) ──────────────────

describe("Gate 2 — FDPR engine wired (3 of 8 scenarios; Z20a)", () => {
  it("Every result includes fdprHits + fdprNotYetEvaluatedRules", () => {
    const result = evaluateSubjectToEAR(
      mkInput("BR", [{ nodeId: "L1", usOrigin: true, eccn: "EAR99" }]),
    );
    expect(result.fdprHits).toBeDefined();
    expect(Array.isArray(result.fdprHits)).toBe(true);
    expect(result.fdprNotYetEvaluatedRules).toBeDefined();
    expect(Array.isArray(result.fdprNotYetEvaluatedRules)).toBe(true);
    // 5 scenarios are not yet evaluated (e/f/g/h/i + sub-paragraphs)
    expect(result.fdprNotYetEvaluatedRules.length).toBeGreaterThanOrEqual(5);
  });

  it("Foreign 9A515 + US 9E515 tech to PRC → Gate 2 fires, FDPR_APPLICABLE", () => {
    const result = evaluateSubjectToEAR({
      destinationCountry: "CN",
      foreignItemEccn: "9A515.a.1",
      totalValueEur: 12_000_000,
      bom: [
        {
          nodeId: "L1",
          usOrigin: false, // no physical US content
          eccn: "EAR99",
          fairMarketValueEur: 5_000_000,
          madeWithUSTechnology: true,
          usTechnologyEccns: ["9E515"],
        },
      ],
    });
    expect(result.gateFired).toBe("FDPR_APPLICABLE");
    expect(result.subjectToEar).toBe(true);
    expect(result.fdprHits.some((h) => h.ruleId === "734.9(c)-9x515")).toBe(
      true,
    );
  });

  it("0% physical US content + 9E515 plant → FDPR still fires (orthogonal to de-minimis)", () => {
    // The catastrophic FDPR-at-0% case. No US content in the BOM at all,
    // but the foreign manufacturer's plant is a direct product of 9E515.
    // De-minimis math would pass (0% US content); FDPR captures anyway.
    const result = evaluateSubjectToEAR({
      destinationCountry: "CN",
      foreignItemEccn: "9A515.a.1",
      totalValueEur: 12_000_000,
      usControlledContentPercent: 0, // would clear de-minimis 25%
      bom: [
        {
          nodeId: "PLANT",
          usOrigin: false,
          eccn: "EAR99",
          fairMarketValueEur: 5_000_000,
          producedByPlantThatIsUSDirectProduct: true,
          plantTechEccns: ["9E515"],
        },
      ],
    });
    expect(result.gateFired).toBe("FDPR_APPLICABLE");
    expect(result.subjectToEar).toBe(true);
    // de-minimis percentage was NEVER evaluated because Gate 2 stopped first
    expect(result.appliedThresholdPercent).toBeNull();
  });

  it("Foreign 9A515 + US 9E515 to Brazil → FDPR does NOT fire (B group); cascade proceeds to Gate 3", () => {
    const result = evaluateSubjectToEAR({
      destinationCountry: "BR",
      foreignItemEccn: "9A515.a.1",
      totalValueEur: 12_000_000,
      usControlledContentPercent: 3.33,
      bom: [
        {
          nodeId: "L1",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 180_000,
          madeWithUSTechnology: true,
          usTechnologyEccns: ["9E515"],
        },
      ],
    });
    expect(result.gateFired).toBe("NONE");
    expect(result.subjectToEar).toBe(false);
    expect(result.fdprHits).toHaveLength(0);
  });

  it("Disclaimer references 3 of 8 FDPR scenarios + queued Z20b-d", () => {
    const result = evaluateSubjectToEAR(
      mkInput("BR", [{ nodeId: "L1", usOrigin: true, eccn: "EAR99" }]),
    );
    expect(result.disclaimer).toMatch(/3 of 8|three of (the )?eight/i);
    expect(result.disclaimer).toMatch(/Z20[bd]|Entity-List|Russia/i);
  });
});

// ─── Cascade ordering (critical: gates must fire in order) ──────────

describe("Cascade ordering — gates fire in strict sequence", () => {
  it("ITAR + 9A515.d carve-out trigger present → Gate 1 wins (ITAR), Gate 3a never evaluated", () => {
    // Defense-in-depth: even if a (a)(6)(i) carve-out WOULD fire on
    // the 9A515.d content, the ITAR line stops the cascade first.
    const result = evaluateSubjectToEAR(
      mkInput("CN", [
        {
          nodeId: "ITAR-1",
          usOrigin: true,
          eccn: "USML:XV(a)(7)(i)",
          isUSML: true,
          fairMarketValueEur: 100_000,
        },
        {
          nodeId: "EAR-1",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 180_000,
        },
      ]),
    );
    expect(result.jurisdiction).toBe("ITAR");
    expect(result.gateFired).toBe("ITAR_SEE_THROUGH");
    // The (a)(6)(i) carve-out result is empty because Gate 1 short-
    // circuited before Gate 3a ran.
    expect(result.deMinimisCarveOuts).toHaveLength(0);
  });

  it("Carve-out fires → percentage threshold never evaluated", () => {
    const result = evaluateSubjectToEAR(
      mkInput(
        "CN",
        [
          {
            nodeId: "L1",
            usOrigin: true,
            eccn: "9A515.d",
            fairMarketValueEur: 180_000,
          },
        ],
        { usControlledContentPercent: 1.5 }, // Would pass 25% AND 10%
      ),
    );
    expect(result.gateFired).toBe("DE_MINIMIS_CARVE_OUT");
    // Even though usPct=1.5% is well below ANY threshold, the carve-
    // out fires first and subject_to_ear=true.
    expect(result.subjectToEar).toBe(true);
  });
});

// ─── Clean-pass sanity ──────────────────────────────────────────────

describe("Clean-pass sanity — all gates pass", () => {
  it("Civilian EU sat with 5% US content to Brazil → NOT subject_to_ear", () => {
    const result = evaluateSubjectToEAR(
      mkInput(
        "BR",
        [
          {
            nodeId: "L1",
            usOrigin: true,
            eccn: "EAR99",
            fairMarketValueEur: 500_000,
          },
          {
            nodeId: "L2",
            usOrigin: false,
            eccn: "9A004",
            fairMarketValueEur: 9_500_000,
          },
        ],
        { usControlledContentPercent: 5.0 },
      ),
    );
    expect(result.subjectToEar).toBe(false);
    expect(result.jurisdiction).toBe("NONE");
    expect(result.gateFired).toBe("NONE");
  });

  it("Disclaimer always present", () => {
    const result = evaluateSubjectToEAR(mkInput("BR", []));
    expect(result.disclaimer).toMatch(/SCREENING-LEVEL/);
  });

  it("Rationale always non-empty (at minimum: country group resolution)", () => {
    const result = evaluateSubjectToEAR(mkInput("BR", []));
    expect(result.rationale.length).toBeGreaterThanOrEqual(1);
    expect(result.rationale[0]).toMatch(/Destination BR/);
  });
});
