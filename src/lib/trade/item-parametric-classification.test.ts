/**
 * Tests for src/lib/trade/item-parametric-classification.ts — Z3l.
 *
 * Bridge service between TradeItem rows and the parametric matcher.
 * Tests verify:
 *   - Tier-1 typed columns flow through to matcher correctly
 *   - Z3e extended attributes flow through via parametricAttributes JSON
 *   - Typed-column-wins semantics work end-to-end
 *   - Empty snapshot → no candidates, noAttributesPopulated=true
 *   - Concrete real-world scenarios end up in the right result lane
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  classifyTradeItemParametric,
  itemToAttributeBag,
  type TradeItemParametricSnapshot,
} from "./item-parametric-classification";

describe("itemToAttributeBag — typed column marshalling", () => {
  it("Z3a tier-1 typed columns flow into the bag", () => {
    const snapshot: TradeItemParametricSnapshot = {
      apertureMeters: 0.4,
      payloadKg: 500,
      rangeKm: 300,
      IspSeconds: 1500,
      itemClass: "spacecraft.remote_sensing.eo",
      isRadHardened: true,
      isMilSpec: false,
      isAntiJam: true,
    };
    const bag = itemToAttributeBag(snapshot);
    expect(bag.apertureMeters).toBe(0.4);
    expect(bag.payloadKg).toBe(500);
    expect(bag.rangeKm).toBe(300);
    expect(bag.IspSeconds).toBe(1500);
    expect(bag.itemClass).toBe("spacecraft.remote_sensing.eo");
    expect(bag.isRadHardened).toBe(true);
    expect(bag.isAntiJam).toBe(true);
  });

  it("Z3e extended columns flow into parametricAttributes JSON bag", () => {
    const snapshot: TradeItemParametricSnapshot = {
      peakWavelengthNm: 1500,
      radarCenterFreqGhz: 5,
      radarBandwidthMhz: 200,
      antennaDiameterM: 30,
    };
    const bag = itemToAttributeBag(snapshot);
    // These attributes don't have typed positions on ItemAttributeBag.
    // They must appear in parametricAttributes so the matcher's
    // readAttribute fallback picks them up.
    expect(bag.parametricAttributes?.peakWavelengthNm).toBe(1500);
    expect(bag.parametricAttributes?.radarCenterFreqGhz).toBe(5);
    expect(bag.parametricAttributes?.radarBandwidthMhz).toBe(200);
    expect(bag.parametricAttributes?.antennaDiameterM).toBe(30);
  });

  it("isSpeciallyDesigned (Z3g universal qualifier) flows as typed boolean", () => {
    const snapshot: TradeItemParametricSnapshot = { isSpeciallyDesigned: true };
    const bag = itemToAttributeBag(snapshot);
    expect(bag.isSpeciallyDesigned).toBe(true);
  });

  it("Null values stay null — three-valued logic preserved", () => {
    const snapshot: TradeItemParametricSnapshot = {
      apertureMeters: null,
      peakWavelengthNm: null,
      isSpeciallyDesigned: null,
    };
    const bag = itemToAttributeBag(snapshot);
    expect(bag.apertureMeters).toBeNull();
    expect(bag.isSpeciallyDesigned).toBeNull();
    // Null Z3e attributes are NOT emitted into parametricAttributes —
    // the matcher reads them as missing rather than as null.
    expect(bag.parametricAttributes?.peakWavelengthNm).toBeUndefined();
  });

  it("Operator-supplied parametricAttributes JSON merges with typed columns", () => {
    const snapshot: TradeItemParametricSnapshot = {
      peakWavelengthNm: 1500, // typed Z3e column wins
      parametricAttributes: {
        peakWavelengthNm: 1700, // pre-existing JSON entry — overridden
        customAttribute: "foo", // pass-through
      },
    };
    const bag = itemToAttributeBag(snapshot);
    expect(bag.parametricAttributes?.peakWavelengthNm).toBe(1500);
    expect(bag.parametricAttributes?.customAttribute).toBe("foo");
  });
});

describe("classifyTradeItemParametric — end-to-end classification", () => {
  it("empty snapshot → no candidates, noAttributesPopulated=true", () => {
    const result = classifyTradeItemParametric({});
    expect(result.candidates).toHaveLength(0);
    expect(result.possibleMatches).toHaveLength(0);
    expect(result.nearMisses).toHaveLength(0);
    expect(result.noAttributesPopulated).toBe(true);
    expect(result.disclaimer).toMatch(/screening-level/i);
  });

  it("EO spacecraft with 0.40m aperture → 9A515.a.1 HIGH confidence", () => {
    const result = classifyTradeItemParametric({
      apertureMeters: 0.4,
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const ccl = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.a.1",
    );
    expect(ccl).toBeDefined();
    expect(ccl?.confidence).toBe("HIGH");
  });

  it("SAR satellite via Z3e radar attributes → 9A515.a.3", () => {
    // Tests that the Z3e attributes route through parametricAttributes
    // end-to-end and the matcher finds them.
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.remote_sensing.sar",
      radarCenterFreqGhz: 5,
      radarBandwidthMhz: 200,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.a.3");
  });

  it("Rad-hard IC with TID+SEU only (3 criteria missing) → PossibleMatch for 9A515.d", () => {
    // Three-valued logic via the bridge: missing criteria don't
    // refute, they surface as PossibleMatch.
    const result = classifyTradeItemParametric({
      isRadHardened: true,
      itemClass: "ic.radhard.processor",
      radHardTidKrad: 600,
      seuRateErrorsPerBitDay: 1e-11,
      // doseRateUpsetRadSiPerS, neutronFluenceNPerCm2,
      // selLetThresholdMevCm2Mg intentionally not set
    });
    const possibleIds = result.possibleMatches.map((p) => p.entry.canonicalId);
    expect(possibleIds).toContain("ECCN:9A515.d");
    const candidateIds = result.candidates.map((c) => c.entry.canonicalId);
    expect(candidateIds).not.toContain("ECCN:9A515.d");
  });

  it("EO spacecraft with 0.51m aperture → 9A515.a.1 as near-miss (Z3k)", () => {
    const result = classifyTradeItemParametric({
      apertureMeters: 0.51,
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const nmIds = result.nearMisses.map((nm) => nm.entry.canonicalId);
    expect(nmIds).toContain("ECCN:9A515.a.1");
  });

  it("Civilian TT&C ground station (SD=false) → 9A515.b, NOT USML XV(b) (Z3j)", () => {
    const result = classifyTradeItemParametric({
      itemClass: "ground.station.ttc.commercial",
      isSpeciallyDesigned: false,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.b");
    expect(ids).not.toContain("USML:XV(b)");
  });

  it("MTCR Cat I missile profile (range 300, payload 500) → MTCR Item 1.A.1 candidate", () => {
    const result = classifyTradeItemParametric({
      itemClass: "missile.system",
      rangeKm: 300,
      payloadKg: 500,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("MTCR:Item-1.A.1");
  });

  it("Disclaimer always present", () => {
    const result = classifyTradeItemParametric({
      itemClass: "anything",
    });
    expect(result.disclaimer).toBeTruthy();
    expect(result.disclaimer).toMatch(/compliance officer/i);
  });
});

describe("classifyTradeItemParametric — boundary scenarios", () => {
  it("Total impulse 1.2×10⁶ N·s → USML IV(d)(2) MTCR Cat I propulsion", () => {
    const result = classifyTradeItemParametric({
      itemClass: "propulsion.chemical.solid_rocket",
      totalImpulseNs: 1.2e6,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:IV(d)(2)");
  });

  it("Star tracker with arcsec accuracy AND high slew rate → USML XV(e)(16)", () => {
    const result = classifyTradeItemParametric({
      itemClass: "spacecraft.adcs.star_tracker",
      starTrackerAccuracyArcsec: 0.8, // ≤ 1 arcsec
      starTrackerSlewRateDegPerS: 5, // ≥ 3 deg/s
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(e)(16)");
  });
});
