/**
 * Tests for Sprint Z34c — Extended Parametric Attributes (Tier 4).
 *
 * Validates the 19 new typed BOM/Item attributes (10 Z25 + 19 Z34c = 29
 * tier-3+ attributes; combined with the original Z3a + Z3e typed
 * columns the matcher vocabulary is now 44+ attributes total).
 *
 *   Tier 1 — spacecraft hardware (7 attributes)
 *     1.  solarCellEfficiencyPercent
 *     2.  batterySpecificEnergyWhPerKg
 *     3.  peakPowerWatts
 *     4.  antennaGainDbi
 *     5.  frequencyBandsGhz  (array — uses new `contains` operator)
 *     6.  polarisationType   (string enum — uses `in`)
 *     7.  thermalCycleCount
 *
 *   Tier 2 — propulsion (4 attributes)
 *     8.  propellantType                (string enum)
 *     9.  thrustNewtons
 *     10. nozzleExpansionRatio
 *     11. specificImpulseSecondsVacuum  (distinct from Z3a IspSeconds)
 *
 *   Tier 3 — mission ops (4 attributes)
 *     12. missionDurationYears
 *     13. inclinationDegrees
 *     14. apogeeKm   (duplicate-check vs Z25 maxOrbitAltitudeKm)
 *     15. perigeeKm  (duplicate-check vs Z25 minOrbitAltitudeKm)
 *
 *   Tier 4 — imaging payloads (4 attributes)
 *     16. swirSpectralBands
 *     17. mwirSpectralBands
 *     18. lwirSpectralBands
 *     19. hyperspectralBandCount
 *
 * Test coverage per attribute:
 *   - true-match: predicate fires when attribute satisfies the threshold
 *   - false-miss: predicate refutes when attribute fails the threshold
 *   - UNKNOWN  : predicate routes to PossibleMatch when attribute absent
 *
 * Plus integration tests against the production cross-walk demo entries,
 * a regression check on the new `contains` operator, and backwards-
 * compatibility verification of the schema + matcher.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  classifyTradeItemParametric,
  itemToAttributeBag,
  type TradeItemParametricSnapshot,
} from "./item-parametric-classification";
import { matchAgainstCrossWalk } from "@/lib/comply-v2/trade/classification/parametric-matcher";
import {
  CONTROL_LIST_CROSS_WALK,
  type ControlListEntry,
  type ParametricPredicate,
} from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

// ─── Synthetic test cross-walk ──────────────────────────────────────
//
// Mirror the Z25 test strategy: build a synthetic mini cross-walk so
// each Z34c attribute is exercised in isolation without bleeding into
// the production cross-walk evaluation.

function makeTestEntry(
  id: string,
  predicates: ParametricPredicate[],
): ControlListEntry {
  return {
    canonicalId: id,
    regime: "OTHER",
    category: "TEST",
    productGroup: "X",
    entryNumber: "000",
    title: `Synthetic Z34c test entry ${id}`,
    predicates,
    reasonsForControl: ["TEST"],
    seeAlso: [],
    citation: "test-only",
    validFrom: "2026-05-23",
  };
}

const Z34C_TEST_CROSS_WALK: ControlListEntry[] = [
  // Tier 1
  makeTestEntry("TEST:solarCellEfficiencyPercent", [
    { attribute: "solarCellEfficiencyPercent", op: "gte", value: 28 },
  ]),
  makeTestEntry("TEST:batterySpecificEnergyWhPerKg", [
    { attribute: "batterySpecificEnergyWhPerKg", op: "gte", value: 130 },
  ]),
  makeTestEntry("TEST:peakPowerWatts", [
    { attribute: "peakPowerWatts", op: "gte", value: 15_000 },
  ]),
  makeTestEntry("TEST:antennaGainDbi", [
    { attribute: "antennaGainDbi", op: "gte", value: 30 },
  ]),
  makeTestEntry("TEST:frequencyBandsGhz", [
    { attribute: "frequencyBandsGhz", op: "contains", value: 28 },
  ]),
  makeTestEntry("TEST:polarisationType", [
    {
      attribute: "polarisationType",
      op: "in",
      value: ["RHCP", "LHCP", "dual"],
    },
  ]),
  makeTestEntry("TEST:thermalCycleCount", [
    { attribute: "thermalCycleCount", op: "gte", value: 5_000 },
  ]),
  // Tier 2
  makeTestEntry("TEST:propellantType", [
    { attribute: "propellantType", op: "eq", value: "electric" },
  ]),
  makeTestEntry("TEST:thrustNewtons", [
    { attribute: "thrustNewtons", op: "gte", value: 5_000 },
  ]),
  makeTestEntry("TEST:nozzleExpansionRatio", [
    { attribute: "nozzleExpansionRatio", op: "gte", value: 80 },
  ]),
  makeTestEntry("TEST:specificImpulseSecondsVacuum", [
    { attribute: "specificImpulseSecondsVacuum", op: "gte", value: 1_000 },
  ]),
  // Tier 3
  makeTestEntry("TEST:missionDurationYears", [
    { attribute: "missionDurationYears", op: "gte", value: 15 },
  ]),
  makeTestEntry("TEST:inclinationDegrees", [
    { attribute: "inclinationDegrees", op: "between", value: [80, 100] },
  ]),
  makeTestEntry("TEST:apogeeKm", [
    { attribute: "apogeeKm", op: "gte", value: 35_000 },
  ]),
  makeTestEntry("TEST:perigeeKm", [
    { attribute: "perigeeKm", op: "lte", value: 5_000 },
  ]),
  // Tier 4
  makeTestEntry("TEST:swirSpectralBands", [
    { attribute: "swirSpectralBands", op: "gte", value: 4 },
  ]),
  makeTestEntry("TEST:mwirSpectralBands", [
    { attribute: "mwirSpectralBands", op: "gte", value: 3 },
  ]),
  makeTestEntry("TEST:lwirSpectralBands", [
    { attribute: "lwirSpectralBands", op: "gte", value: 3 },
  ]),
  makeTestEntry("TEST:hyperspectralBandCount", [
    { attribute: "hyperspectralBandCount", op: "gte", value: 20 },
  ]),
];

// Helper: assert id is in matcher candidates (typing convenience).
function expectCandidate(
  result: ReturnType<typeof matchAgainstCrossWalk>,
  id: string,
): void {
  expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(id);
}

function expectNotCandidate(
  result: ReturnType<typeof matchAgainstCrossWalk>,
  id: string,
): void {
  expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(id);
}

function expectPossible(
  result: ReturnType<typeof matchAgainstCrossWalk>,
  id: string,
): void {
  expect(result.possibleMatches.map((p) => p.entry.canonicalId)).toContain(id);
}

// ─── Tier 1 — Spacecraft hardware ─────────────────────────────────

describe("Z34c — solarCellEfficiencyPercent predicate (≥ 28%)", () => {
  it("efficiency 30% → predicate matches (triple-junction)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { solarCellEfficiencyPercent: 30 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:solarCellEfficiencyPercent");
  });

  it("efficiency 22% → predicate refutes (single-junction silicon)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { solarCellEfficiencyPercent: 22 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:solarCellEfficiencyPercent");
  });

  it("efficiency absent → UNKNOWN (PossibleMatch lane)", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft.power.solar" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:solarCellEfficiencyPercent");
  });
});

describe("Z34c — batterySpecificEnergyWhPerKg predicate (≥ 130 Wh/kg)", () => {
  it("specific energy 165 Wh/kg → matches (Saft VES180-class)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { batterySpecificEnergyWhPerKg: 165 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:batterySpecificEnergyWhPerKg");
  });

  it("specific energy 80 Wh/kg → refutes (commodity Li-ion)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { batterySpecificEnergyWhPerKg: 80 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:batterySpecificEnergyWhPerKg");
  });

  it("specific energy absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft.power.battery" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:batterySpecificEnergyWhPerKg");
  });
});

describe("Z34c — peakPowerWatts predicate (≥ 15 kW)", () => {
  it("peak power 20 000 W → matches (GEO comsat class)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { peakPowerWatts: 20_000 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:peakPowerWatts");
  });

  it("peak power 500 W → refutes (smallsat)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { peakPowerWatts: 500 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:peakPowerWatts");
  });

  it("peak power absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft.power" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:peakPowerWatts");
  });
});

describe("Z34c — antennaGainDbi predicate (≥ 30 dBi)", () => {
  it("gain 45 dBi → matches (HTS Ka-band reflector)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { antennaGainDbi: 45 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:antennaGainDbi");
  });

  it("gain 12 dBi → refutes (UHF telemetry patch)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { antennaGainDbi: 12 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:antennaGainDbi");
  });

  it("gain absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "rf.antenna" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:antennaGainDbi");
  });
});

describe("Z34c — frequencyBandsGhz predicate (contains 28 GHz)", () => {
  it("bands [12.5, 28, 30] → matches (multi-band Ka feed)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { frequencyBandsGhz: [12.5, 28, 30] } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:frequencyBandsGhz");
  });

  it("bands [1.5, 2.4, 5.8] → refutes (S/L-band only)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { frequencyBandsGhz: [1.5, 2.4, 5.8] } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:frequencyBandsGhz");
  });

  it("non-array bands → refutes gracefully (no throw)", () => {
    // Defensive: even if a corrupt datasheet ships a scalar instead of
    // an array, the `contains` op must refute, not throw.
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { frequencyBandsGhz: 28 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:frequencyBandsGhz");
  });

  it("bands absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "rf" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:frequencyBandsGhz");
  });
});

describe("Z34c — polarisationType predicate (∈ {RHCP, LHCP, dual})", () => {
  it("polarisation RHCP → matches", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { polarisationType: "RHCP" } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:polarisationType");
  });

  it("polarisation LP → refutes (linear)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { polarisationType: "LP" } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:polarisationType");
  });

  it("polarisation absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "rf.antenna" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:polarisationType");
  });
});

describe("Z34c — thermalCycleCount predicate (≥ 5000)", () => {
  it("cycles 6000 → matches (long-LEO qual)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { thermalCycleCount: 6_000 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:thermalCycleCount");
  });

  it("cycles 200 → refutes (lab prototype)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { thermalCycleCount: 200 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:thermalCycleCount");
  });

  it("cycles absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft.component" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:thermalCycleCount");
  });
});

// ─── Tier 2 — Propulsion ─────────────────────────────────────────

describe("Z34c — propellantType predicate (eq 'electric')", () => {
  it("propellantType electric → matches", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { propellantType: "electric" } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:propellantType");
  });

  it("propellantType chemical → refutes", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { propellantType: "chemical" } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:propellantType");
  });

  it("propellantType absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "propulsion" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:propellantType");
  });
});

describe("Z34c — thrustNewtons predicate (≥ 5000 N)", () => {
  it("thrust 845 000 N → matches (Merlin-1D class)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { thrustNewtons: 845_000 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:thrustNewtons");
  });

  it("thrust 1 N → refutes (ACS thruster)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { thrustNewtons: 1 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:thrustNewtons");
  });

  it("thrust absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "propulsion.engine" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:thrustNewtons");
  });
});

describe("Z34c — nozzleExpansionRatio predicate (≥ 80)", () => {
  it("ratio 240 → matches (Vinci upper-stage vacuum nozzle)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { nozzleExpansionRatio: 240 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:nozzleExpansionRatio");
  });

  it("ratio 22 → refutes (Merlin-1D sea-level)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { nozzleExpansionRatio: 22 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:nozzleExpansionRatio");
  });

  it("ratio absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "propulsion.nozzle" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:nozzleExpansionRatio");
  });
});

describe("Z34c — specificImpulseSecondsVacuum predicate (≥ 1000 s)", () => {
  it("vacuum Isp 4170 s → matches (NEXT ion thruster)", () => {
    const result = matchAgainstCrossWalk(
      {
        parametricAttributes: { specificImpulseSecondsVacuum: 4_170 },
      },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:specificImpulseSecondsVacuum");
  });

  it("vacuum Isp 310 s → refutes (chemical bipropellant)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { specificImpulseSecondsVacuum: 310 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:specificImpulseSecondsVacuum");
  });

  it("vacuum Isp absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "propulsion" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:specificImpulseSecondsVacuum");
  });
});

// ─── Tier 3 — Mission ops ────────────────────────────────────────

describe("Z34c — missionDurationYears predicate (≥ 15 yr)", () => {
  it("duration 18 yr → matches (GEO comsat)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { missionDurationYears: 18 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:missionDurationYears");
  });

  it("duration 3 yr → refutes (cubesat)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { missionDurationYears: 3 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:missionDurationYears");
  });

  it("duration absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:missionDurationYears");
  });
});

describe("Z34c — inclinationDegrees predicate (between 80-100°)", () => {
  it("inclination 98.4° → matches (SSO)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { inclinationDegrees: 98.4 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:inclinationDegrees");
  });

  it("inclination 0° → refutes (equatorial GEO)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { inclinationDegrees: 0 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:inclinationDegrees");
  });

  it("inclination absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:inclinationDegrees");
  });
});

describe("Z34c — apogeeKm predicate (≥ 35 000 km)", () => {
  it("apogee 40 000 km → matches (Molniya)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { apogeeKm: 40_000 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:apogeeKm");
  });

  it("apogee 700 km → refutes (LEO)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { apogeeKm: 700 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:apogeeKm");
  });

  it("apogee absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:apogeeKm");
  });
});

describe("Z34c — perigeeKm predicate (≤ 5 000 km)", () => {
  it("perigee 1000 km → matches (Molniya low arm)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { perigeeKm: 1_000 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:perigeeKm");
  });

  it("perigee 24 000 km → refutes (Tundra high perigee)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { perigeeKm: 24_000 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:perigeeKm");
  });

  it("perigee absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:perigeeKm");
  });
});

// ─── Tier 4 — Imaging payloads ───────────────────────────────────

describe("Z34c — swirSpectralBands predicate (≥ 4 bands)", () => {
  it("8 SWIR bands → matches (WorldView-3)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { swirSpectralBands: 8 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:swirSpectralBands");
  });

  it("3 SWIR bands → refutes (Sentinel-2)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { swirSpectralBands: 3 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:swirSpectralBands");
  });

  it("SWIR bands absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "sensor.imager" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:swirSpectralBands");
  });
});

describe("Z34c — mwirSpectralBands predicate (≥ 3 bands)", () => {
  it("5 MWIR bands → matches", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { mwirSpectralBands: 5 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:mwirSpectralBands");
  });

  it("1 MWIR band → refutes (single-channel radiometric)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { mwirSpectralBands: 1 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:mwirSpectralBands");
  });

  it("MWIR bands absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "sensor.imager" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:mwirSpectralBands");
  });
});

describe("Z34c — lwirSpectralBands predicate (≥ 3 bands)", () => {
  it("5 LWIR bands → matches (ECOSTRESS)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { lwirSpectralBands: 5 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:lwirSpectralBands");
  });

  it("2 LWIR bands → refutes (Landsat TIRS)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { lwirSpectralBands: 2 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:lwirSpectralBands");
  });

  it("LWIR bands absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "sensor.imager" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:lwirSpectralBands");
  });
});

describe("Z34c — hyperspectralBandCount predicate (≥ 20)", () => {
  it("240 bands → matches (PRISMA)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { hyperspectralBandCount: 240 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectCandidate(result, "TEST:hyperspectralBandCount");
  });

  it("13 bands → refutes (Sentinel-2 MSI — multispectral, not hyperspectral)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { hyperspectralBandCount: 13 } },
      Z34C_TEST_CROSS_WALK,
    );
    expectNotCandidate(result, "TEST:hyperspectralBandCount");
  });

  it("hyperspectral bands absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "sensor.imager" },
      Z34C_TEST_CROSS_WALK,
    );
    expectPossible(result, "TEST:hyperspectralBandCount");
  });
});

// ─── Production cross-walk demo entries ─────────────────────────

describe("Z34c production cross-walk — demo entries fire end-to-end", () => {
  it("9A515.e.solar-array fires on 30% cells + specially designed", () => {
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.power.solar.array",
      solarCellEfficiencyPercent: 30,
      isSpeciallyDesigned: true,
    });
    expectCandidate(result, "ECCN:9A515.e.solar-array");
  });

  it("9A515.x.battery fires on 165 Wh/kg + specially designed", () => {
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.power.battery.li-ion",
      batterySpecificEnergyWhPerKg: 165,
      isSpeciallyDesigned: true,
    });
    expectCandidate(result, "ECCN:9A515.x.battery");
  });

  it("9A515.x.power-bus fires on 18 kW peak", () => {
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.power.bus",
      peakPowerWatts: 18_000,
    });
    expectCandidate(result, "ECCN:9A515.x.power-bus");
  });

  it("5A001.b.3 fires on 45 dBi gain antenna", () => {
    const result = classifyTradeItemParametric({
      itemClass: "rf.antenna.reflector",
      antennaGainDbi: 45,
    });
    expectCandidate(result, "ECCN:5A001.b.3");
  });

  it("5A001.b.ka-band fires when frequencyBandsGhz contains 28", () => {
    const result = classifyTradeItemParametric({
      itemClass: "rf.transponder",
      frequencyBandsGhz: [12.5, 20, 28],
    });
    expectCandidate(result, "ECCN:5A001.b.ka-band");
  });

  it("5A001.b.cp-antenna fires on RHCP polarisation", () => {
    const result = classifyTradeItemParametric({
      itemClass: "rf.antenna.feed",
      polarisationType: "RHCP",
    });
    expectCandidate(result, "ECCN:5A001.b.cp-antenna");
  });

  it("9A515.x.thermal-qual fires on 6000 cycles + specially designed", () => {
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.bus.thermal",
      thermalCycleCount: 6_000,
      isSpeciallyDesigned: true,
    });
    expectCandidate(result, "ECCN:9A515.x.thermal-qual");
  });

  it("9A005.chemical-engine fires on chemical, 845 kN", () => {
    const result = classifyTradeItemParametric({
      itemClass: "propulsion.liquid_rocket.merlin",
      propellantType: "chemical",
      thrustNewtons: 845_000,
    });
    expectCandidate(result, "ECCN:9A005.chemical-engine");
  });

  it("9A515.g.electric-propulsion fires on electric + Isp 4170 s", () => {
    const result = classifyTradeItemParametric({
      itemClass: "propulsion.electric.ion",
      propellantType: "electric",
      specificImpulseSecondsVacuum: 4_170,
    });
    expectCandidate(result, "ECCN:9A515.g.electric-propulsion");
  });

  it("MTCR:Item-3.A.3.nozzle fires on expansion ratio 240", () => {
    const result = classifyTradeItemParametric({
      itemClass: "propulsion.nozzle.vacuum",
      nozzleExpansionRatio: 240,
    });
    expectCandidate(result, "MTCR:Item-3.A.3.nozzle");
  });

  it("9A515.long-mission fires on 18-yr design life + specially designed", () => {
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.geo",
      missionDurationYears: 18,
      isSpeciallyDesigned: true,
    });
    expectCandidate(result, "ECCN:9A515.long-mission");
  });

  it("EU:9A004.sso fires on inclination 98.4°", () => {
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.eo",
      inclinationDegrees: 98.4,
    });
    expectCandidate(result, "EU:9A004.sso");
  });

  it("EU:9A004.heo fires on apogee 40 000 + perigee 1000", () => {
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.molniya",
      apogeeKm: 40_000,
      perigeeKm: 1_000,
    });
    expectCandidate(result, "EU:9A004.heo");
  });

  it("EU:6A002.b.5.swir fires on 8 SWIR bands", () => {
    const result = classifyTradeItemParametric({
      itemClass: "sensor.imager.worldview-3",
      swirSpectralBands: 8,
    });
    expectCandidate(result, "EU:6A002.b.5.swir");
  });

  it("EU:6A002.b.6.mwir fires on 5 MWIR bands", () => {
    const result = classifyTradeItemParametric({
      itemClass: "sensor.imager.mwir-multiband",
      mwirSpectralBands: 5,
    });
    expectCandidate(result, "EU:6A002.b.6.mwir");
  });

  it("EU:6A002.b.7.lwir fires on 5 LWIR bands (ECOSTRESS)", () => {
    const result = classifyTradeItemParametric({
      itemClass: "sensor.imager.ecostress",
      lwirSpectralBands: 5,
    });
    expectCandidate(result, "EU:6A002.b.7.lwir");
  });

  it("EU:6A002.b.4.hyperspectral fires on 240 bands (PRISMA)", () => {
    const result = classifyTradeItemParametric({
      itemClass: "sensor.imager.prisma",
      hyperspectralBandCount: 240,
    });
    expectCandidate(result, "EU:6A002.b.4.hyperspectral");
  });
});

// ─── Cross-walk integrity ────────────────────────────────────────

describe("Z34c — production cross-walk contains all 17 Z34c demo entries", () => {
  const z34cEntryIds = [
    "ECCN:9A515.e.solar-array",
    "ECCN:9A515.x.battery",
    "ECCN:9A515.x.power-bus",
    "ECCN:5A001.b.3",
    "ECCN:5A001.b.ka-band",
    "ECCN:5A001.b.cp-antenna",
    "ECCN:9A515.x.thermal-qual",
    "ECCN:9A005.chemical-engine",
    "ECCN:9A515.g.electric-propulsion",
    "MTCR:Item-3.A.3.nozzle",
    "ECCN:9A515.long-mission",
    "EU:9A004.sso",
    "EU:9A004.heo",
    "EU:6A002.b.5.swir",
    "EU:6A002.b.6.mwir",
    "EU:6A002.b.7.lwir",
    "EU:6A002.b.4.hyperspectral",
  ];

  it.each(z34cEntryIds)("CONTROL_LIST_CROSS_WALK includes %s", (id) => {
    const entry = CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === id);
    expect(entry).toBeDefined();
    expect(entry?.predicates.length).toBeGreaterThan(0);
  });
});

// ─── Schema acceptance & merge semantics ─────────────────────────

describe("Z34c — TradeItemParametricSnapshot accepts new attributes", () => {
  it("all 19 new attributes accepted as undefined (no-op)", () => {
    const snapshot: TradeItemParametricSnapshot = {};
    expect(() => itemToAttributeBag(snapshot)).not.toThrow();
    const bag = itemToAttributeBag(snapshot);
    // No Z34c key should leak into the bag when the snapshot is empty.
    expect(
      bag.parametricAttributes?.solarCellEfficiencyPercent,
    ).toBeUndefined();
    expect(bag.parametricAttributes?.frequencyBandsGhz).toBeUndefined();
    expect(bag.parametricAttributes?.hyperspectralBandCount).toBeUndefined();
  });

  it("all 19 new attributes accepted as null (no-op, three-valued logic preserved)", () => {
    const snapshot: TradeItemParametricSnapshot = {
      solarCellEfficiencyPercent: null,
      batterySpecificEnergyWhPerKg: null,
      peakPowerWatts: null,
      antennaGainDbi: null,
      frequencyBandsGhz: null,
      polarisationType: null,
      thermalCycleCount: null,
      propellantType: null,
      thrustNewtons: null,
      nozzleExpansionRatio: null,
      specificImpulseSecondsVacuum: null,
      missionDurationYears: null,
      inclinationDegrees: null,
      apogeeKm: null,
      perigeeKm: null,
      swirSpectralBands: null,
      mwirSpectralBands: null,
      lwirSpectralBands: null,
      hyperspectralBandCount: null,
    };
    expect(() => itemToAttributeBag(snapshot)).not.toThrow();
    const bag = itemToAttributeBag(snapshot);
    expect(
      bag.parametricAttributes?.solarCellEfficiencyPercent,
    ).toBeUndefined();
    expect(bag.parametricAttributes?.frequencyBandsGhz).toBeUndefined();
  });

  it("populated Z34c attributes flow into parametricAttributes JSON bag", () => {
    const snapshot: TradeItemParametricSnapshot = {
      solarCellEfficiencyPercent: 30,
      batterySpecificEnergyWhPerKg: 165,
      peakPowerWatts: 18_000,
      antennaGainDbi: 45,
      frequencyBandsGhz: [12.5, 28, 30],
      polarisationType: "RHCP",
      thermalCycleCount: 6_000,
      propellantType: "electric",
      thrustNewtons: 845_000,
      nozzleExpansionRatio: 240,
      specificImpulseSecondsVacuum: 4_170,
      missionDurationYears: 18,
      inclinationDegrees: 98.4,
      apogeeKm: 40_000,
      perigeeKm: 1_000,
      swirSpectralBands: 8,
      mwirSpectralBands: 5,
      lwirSpectralBands: 5,
      hyperspectralBandCount: 240,
    };
    const bag = itemToAttributeBag(snapshot);
    expect(bag.parametricAttributes?.solarCellEfficiencyPercent).toBe(30);
    expect(bag.parametricAttributes?.frequencyBandsGhz).toEqual([12.5, 28, 30]);
    expect(bag.parametricAttributes?.polarisationType).toBe("RHCP");
    expect(bag.parametricAttributes?.thrustNewtons).toBe(845_000);
    expect(bag.parametricAttributes?.hyperspectralBandCount).toBe(240);
  });

  it("Z34c typed columns take precedence over parametricAttributes JSON for the same key", () => {
    const snapshot: TradeItemParametricSnapshot = {
      antennaGainDbi: 45, // typed
      parametricAttributes: {
        antennaGainDbi: 12, // pre-existing JSON entry — should be overridden
      },
    };
    const bag = itemToAttributeBag(snapshot);
    expect(bag.parametricAttributes?.antennaGainDbi).toBe(45);
  });
});

// ─── Backwards compatibility ─────────────────────────────────────

describe("Z34c — backwards compatibility (Z25 + Z3a still work)", () => {
  it("Z25: EU:6A002.a.1 still fires on apertureMM 400", () => {
    const result = classifyTradeItemParametric({
      apertureMM: 400,
      itemClass: "sensor.optical.telescope",
    });
    expectCandidate(result, "EU:6A002.a.1");
  });

  it("Z3a: ECCN:9A515.a.1 still fires on 0.4 m aperture", () => {
    const result = classifyTradeItemParametric({
      apertureMeters: 0.4,
      itemClass: "spacecraft.remote_sensing.eo",
    });
    expectCandidate(result, "ECCN:9A515.a.1");
  });

  it("Z3a: MTCR:Item-1.A.1 still fires on (300 km, 500 kg)", () => {
    const result = classifyTradeItemParametric({
      rangeKm: 300,
      payloadKg: 500,
      itemClass: "missile.system",
    });
    expectCandidate(result, "MTCR:Item-1.A.1");
  });
});

// ─── `contains` operator regression ──────────────────────────────

describe("Z34c — `contains` predicate (regression test)", () => {
  it("matches when value is a member of the actual array", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { frequencyBandsGhz: [12.5, 28, 30] } },
      [
        makeTestEntry("TEST:contains-pos", [
          { attribute: "frequencyBandsGhz", op: "contains", value: 28 },
        ]),
      ],
    );
    expectCandidate(result, "TEST:contains-pos");
  });

  it("refutes when value is not in the actual array", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { frequencyBandsGhz: [1.5, 5.8] } },
      [
        makeTestEntry("TEST:contains-neg", [
          { attribute: "frequencyBandsGhz", op: "contains", value: 28 },
        ]),
      ],
    );
    expectNotCandidate(result, "TEST:contains-neg");
  });

  it("refutes (no throw) when actual is not an array", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { frequencyBandsGhz: "scalar-bad-shape" } },
      [
        makeTestEntry("TEST:contains-bad-shape", [
          { attribute: "frequencyBandsGhz", op: "contains", value: 28 },
        ]),
      ],
    );
    expectNotCandidate(result, "TEST:contains-bad-shape");
  });

  it("works with string scalars too (polarisation cross-check)", () => {
    const result = matchAgainstCrossWalk(
      {
        parametricAttributes: {
          // Mock an unusual case where polarisation is an array of
          // supported modes. The matcher should still resolve it.
          polarisationType: ["LP", "RHCP"],
        },
      },
      [
        makeTestEntry("TEST:contains-str", [
          { attribute: "polarisationType", op: "contains", value: "RHCP" },
        ]),
      ],
    );
    expectCandidate(result, "TEST:contains-str");
  });
});

// ─── Attribute count audit (target: 30+) ─────────────────────────

describe("Z34c — typed attribute vocabulary now ≥ 30 attrs", () => {
  it("TradeItemParametricSnapshot exposes ≥ 30 typed parametric fields", () => {
    // Count by enumerating keys on a fully-populated snapshot.
    const fullSnapshot: TradeItemParametricSnapshot = {
      // Z3a tier-1 (14)
      apertureMeters: 1,
      payloadKg: 1,
      rangeKm: 1,
      IspSeconds: 1,
      deltaVMetersPerSecond: 1,
      gsdMeters: 1,
      transmitPowerW: 1,
      frequencyGhz: 1,
      radHardTidKrad: 1,
      seuRateErrorsPerBitDay: 1,
      isRadHardened: true,
      isMilSpec: false,
      isAntiJam: false,
      itemClass: "x",
      // Z3e extended (14)
      spectralBandCount: 1,
      peakWavelengthNm: 1,
      radarCenterFreqGhz: 1,
      radarBandwidthMhz: 1,
      antennaDiameterM: 1,
      starTrackerAccuracyArcsec: 1,
      starTrackerSlewRateDegPerS: 1,
      totalImpulseNs: 1,
      neutronFluenceNPerCm2: 1,
      selLetThresholdMevCm2Mg: 1,
      doseRateUpsetRadSiPerS: 1,
      gnssMaxVelocityMPerS: 1,
      antennaActiveScanning: false,
      antennaAdaptiveBeamforming: false,
      isSpeciallyDesigned: true,
      // Z25 (10)
      apertureMM: 1,
      groundResolutionMeters: 1,
      signalBandwidthMHz: 1,
      focalLengthMM: 1,
      pixelPitchMicrons: 1,
      maxOrbitAltitudeKm: 1,
      minOrbitAltitudeKm: 1,
      crossLinkBandwidthMbps: 1,
      radHardenedTID_krad: 1,
      temperatureRangeCelsius: 1,
      // Z34c (19)
      solarCellEfficiencyPercent: 1,
      batterySpecificEnergyWhPerKg: 1,
      peakPowerWatts: 1,
      antennaGainDbi: 1,
      frequencyBandsGhz: [1],
      polarisationType: "RHCP",
      thermalCycleCount: 1,
      propellantType: "electric",
      thrustNewtons: 1,
      nozzleExpansionRatio: 1,
      specificImpulseSecondsVacuum: 1,
      missionDurationYears: 1,
      inclinationDegrees: 1,
      apogeeKm: 1,
      perigeeKm: 1,
      swirSpectralBands: 1,
      mwirSpectralBands: 1,
      lwirSpectralBands: 1,
      hyperspectralBandCount: 1,
    };
    // Strip the catch-all `parametricAttributes` from the audit count
    // — the metric is the *typed* attribute surface, not the JSON bag.
    const fields = Object.keys(fullSnapshot).filter(
      (k) => k !== "parametricAttributes",
    );
    // 14 (Z3a) + 15 (Z3e incl. isSpeciallyDesigned) + 10 (Z25) + 19 (Z34c) = 58
    // Target is ≥ 30, so an audit floor of 40 is comfortable.
    expect(fields.length).toBeGreaterThanOrEqual(40);
  });
});
