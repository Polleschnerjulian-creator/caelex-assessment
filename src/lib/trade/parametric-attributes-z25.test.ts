/**
 * Tests for Sprint Z25 — Extended Parametric Attributes (Tier 3).
 *
 * Validates that the 10 new typed BOM/Item attributes flow end-to-end
 * through the classification pipeline:
 *
 *   1. apertureMM             — telescope/sensor primary aperture (mm)
 *   2. groundResolutionMeters — ground sample distance for imaging sats
 *   3. signalBandwidthMHz     — RF bandwidth
 *   4. focalLengthMM          — optical focal length
 *   5. pixelPitchMicrons      — detector pixel pitch
 *   6. maxOrbitAltitudeKm     — apogee height
 *   7. minOrbitAltitudeKm     — perigee height
 *   8. crossLinkBandwidthMbps — inter-satellite link rate
 *   9. radHardenedTID_krad    — total ionizing dose tolerance
 *  10. temperatureRangeCelsius — operating temperature range
 *
 * Test coverage:
 *   - Each new attribute predicate behaves correctly (match / refute /
 *     UNKNOWN).
 *   - Demo cross-walk entry (6A002.a.1) fires on apertureMM ≥ 350.
 *   - Backwards compatibility: existing predicates still work unchanged.
 *   - Schema accepts undefined / null for new attributes.
 *
 * The Z25 attributes flow via the `parametricAttributes` JSON bag in
 * `ItemAttributeBag` — the matcher's `readAttribute` already falls
 * through to the bag when a typed field is missing, so no engine
 * changes are required. This test exercises the bridge layer
 * (`itemToAttributeBag`) plus the matcher's three-valued logic.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  classifyTradeItemParametric,
  itemToAttributeBag,
  type TradeItemParametricSnapshot,
} from "./item-parametric-classification";
import {
  matchAgainstCrossWalk,
  type ItemAttributeBag,
} from "@/lib/comply-v2/trade/classification/parametric-matcher";
import {
  CONTROL_LIST_CROSS_WALK,
  type ControlListEntry,
  type ParametricPredicate,
} from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

// ─── Synthetic test predicates ──────────────────────────────────────
//
// To exercise EACH new attribute in isolation without polluting the
// production cross-walk, we build a synthetic mini cross-walk for these
// unit tests and pass it to `matchAgainstCrossWalk` via the optional
// second argument.

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
    title: `Synthetic test entry ${id}`,
    predicates,
    reasonsForControl: ["TEST"],
    seeAlso: [],
    citation: "test-only",
    validFrom: "2026-05-22",
  };
}

const Z25_TEST_CROSS_WALK: ControlListEntry[] = [
  makeTestEntry("TEST:apertureMM", [
    { attribute: "apertureMM", op: "gte", value: 350 },
  ]),
  makeTestEntry("TEST:groundResolutionMeters", [
    { attribute: "groundResolutionMeters", op: "lte", value: 0.5 },
  ]),
  makeTestEntry("TEST:signalBandwidthMHz", [
    { attribute: "signalBandwidthMHz", op: "gte", value: 500 },
  ]),
  makeTestEntry("TEST:focalLengthMM", [
    { attribute: "focalLengthMM", op: "gte", value: 1000 },
  ]),
  makeTestEntry("TEST:pixelPitchMicrons", [
    { attribute: "pixelPitchMicrons", op: "lte", value: 5 },
  ]),
  makeTestEntry("TEST:maxOrbitAltitudeKm", [
    { attribute: "maxOrbitAltitudeKm", op: "gte", value: 1000 },
  ]),
  makeTestEntry("TEST:minOrbitAltitudeKm", [
    { attribute: "minOrbitAltitudeKm", op: "lte", value: 400 },
  ]),
  makeTestEntry("TEST:crossLinkBandwidthMbps", [
    { attribute: "crossLinkBandwidthMbps", op: "gte", value: 1000 },
  ]),
  makeTestEntry("TEST:radHardenedTID_krad", [
    { attribute: "radHardenedTID_krad", op: "gte", value: 100 },
  ]),
  makeTestEntry("TEST:temperatureRangeCelsius", [
    { attribute: "temperatureRangeCelsius", op: "gte", value: 150 },
  ]),
];

// ─── Per-attribute predicate behaviour ──────────────────────────────

describe("Z25 — apertureMM predicate (≥ 350 mm)", () => {
  it("aperture 400 mm → predicate matches", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { apertureMM: 400 } },
      Z25_TEST_CROSS_WALK,
    );
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("TEST:apertureMM");
  });

  it("aperture 300 mm → predicate refutes (below threshold)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { apertureMM: 300 } },
      Z25_TEST_CROSS_WALK,
    );
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("TEST:apertureMM");
    // 1 matched (would-have-matched), 1 refuted, 0 unknown → near-miss
    const nm = result.nearMisses.find(
      (n) => n.entry.canonicalId === "TEST:apertureMM",
    );
    // No predicates match for refuting cases with single-predicate
    // entries — they go straight to refute, not near-miss.
    expect(nm).toBeUndefined();
  });

  it("aperture absent → predicate UNKNOWN (PossibleMatch lane)", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "sensor.optical" },
      Z25_TEST_CROSS_WALK,
    );
    const possibleIds = result.possibleMatches.map((p) => p.entry.canonicalId);
    expect(possibleIds).toContain("TEST:apertureMM");
  });
});

describe("Z25 — groundResolutionMeters predicate (≤ 0.5 m)", () => {
  it("GSD 0.3 m → predicate matches (high-res imager)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { groundResolutionMeters: 0.3 } },
      Z25_TEST_CROSS_WALK,
    );
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("TEST:groundResolutionMeters");
  });

  it("GSD 2.0 m → predicate refutes (coarser than 0.5 m boundary)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { groundResolutionMeters: 2.0 } },
      Z25_TEST_CROSS_WALK,
    );
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("TEST:groundResolutionMeters");
  });

  it("GSD absent → predicate UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "sensor.imager" },
      Z25_TEST_CROSS_WALK,
    );
    const possibleIds = result.possibleMatches.map((p) => p.entry.canonicalId);
    expect(possibleIds).toContain("TEST:groundResolutionMeters");
  });
});

describe("Z25 — signalBandwidthMHz predicate (≥ 500 MHz)", () => {
  it("bandwidth 800 MHz → matches", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { signalBandwidthMHz: 800 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "TEST:signalBandwidthMHz",
    );
  });

  it("bandwidth 100 MHz → refutes", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { signalBandwidthMHz: 100 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(
      "TEST:signalBandwidthMHz",
    );
  });

  it("bandwidth absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "rf.transponder" },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.possibleMatches.map((p) => p.entry.canonicalId)).toContain(
      "TEST:signalBandwidthMHz",
    );
  });
});

describe("Z25 — focalLengthMM predicate (≥ 1000 mm)", () => {
  it("focal length 1200 mm → matches", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { focalLengthMM: 1200 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "TEST:focalLengthMM",
    );
  });

  it("focal length 500 mm → refutes", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { focalLengthMM: 500 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(
      "TEST:focalLengthMM",
    );
  });

  it("focal length absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk({}, Z25_TEST_CROSS_WALK);
    // Empty bag → noAttributesPopulated suppression kicks in. Verify the
    // attribute is recognized via a populated-bag form instead.
    expect(result.possibleMatches).toHaveLength(0);
    expect(result.noAttributesPopulated).toBe(true);
    // Re-run with one unrelated attribute so the bag isn't empty:
    const result2 = matchAgainstCrossWalk(
      { parametricAttributes: { unrelated: 1 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result2.possibleMatches.map((p) => p.entry.canonicalId)).toContain(
      "TEST:focalLengthMM",
    );
  });
});

describe("Z25 — pixelPitchMicrons predicate (≤ 5 µm)", () => {
  it("pitch 3 µm → matches (small-pixel CMOS)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { pixelPitchMicrons: 3 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "TEST:pixelPitchMicrons",
    );
  });

  it("pitch 10 µm → refutes (large-pixel detector)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { pixelPitchMicrons: 10 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(
      "TEST:pixelPitchMicrons",
    );
  });

  it("pitch absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "sensor.fpa" },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.possibleMatches.map((p) => p.entry.canonicalId)).toContain(
      "TEST:pixelPitchMicrons",
    );
  });
});

describe("Z25 — maxOrbitAltitudeKm predicate (≥ 1000 km apogee)", () => {
  it("apogee 1500 km → matches", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { maxOrbitAltitudeKm: 1500 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "TEST:maxOrbitAltitudeKm",
    );
  });

  it("apogee 500 km → refutes (LEO only)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { maxOrbitAltitudeKm: 500 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(
      "TEST:maxOrbitAltitudeKm",
    );
  });

  it("apogee absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft.bus" },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.possibleMatches.map((p) => p.entry.canonicalId)).toContain(
      "TEST:maxOrbitAltitudeKm",
    );
  });
});

describe("Z25 — minOrbitAltitudeKm predicate (≤ 400 km perigee)", () => {
  it("perigee 350 km → matches (VLEO)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { minOrbitAltitudeKm: 350 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "TEST:minOrbitAltitudeKm",
    );
  });

  it("perigee 500 km → refutes (above LEO floor)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { minOrbitAltitudeKm: 500 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(
      "TEST:minOrbitAltitudeKm",
    );
  });

  it("perigee absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft.bus" },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.possibleMatches.map((p) => p.entry.canonicalId)).toContain(
      "TEST:minOrbitAltitudeKm",
    );
  });
});

describe("Z25 — crossLinkBandwidthMbps predicate (≥ 1000 Mbps ISL)", () => {
  it("ISL 2500 Mbps → matches (high-rate constellation backbone)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { crossLinkBandwidthMbps: 2500 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "TEST:crossLinkBandwidthMbps",
    );
  });

  it("ISL 100 Mbps → refutes", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { crossLinkBandwidthMbps: 100 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(
      "TEST:crossLinkBandwidthMbps",
    );
  });

  it("ISL absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft.comms" },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.possibleMatches.map((p) => p.entry.canonicalId)).toContain(
      "TEST:crossLinkBandwidthMbps",
    );
  });
});

describe("Z25 — radHardenedTID_krad predicate (≥ 100 krad)", () => {
  it("TID 300 krad → matches (rad-hard part)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { radHardenedTID_krad: 300 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "TEST:radHardenedTID_krad",
    );
  });

  it("TID 50 krad → refutes (rad-tolerant only)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { radHardenedTID_krad: 50 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(
      "TEST:radHardenedTID_krad",
    );
  });

  it("TID absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "ic.processor" },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.possibleMatches.map((p) => p.entry.canonicalId)).toContain(
      "TEST:radHardenedTID_krad",
    );
  });
});

describe("Z25 — temperatureRangeCelsius predicate (≥ 150 °C span)", () => {
  it("temp range 200 °C → matches (wide-temp spacecraft component)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { temperatureRangeCelsius: 200 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "TEST:temperatureRangeCelsius",
    );
  });

  it("temp range 80 °C → refutes (consumer / industrial grade)", () => {
    const result = matchAgainstCrossWalk(
      { parametricAttributes: { temperatureRangeCelsius: 80 } },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.candidates.map((c) => c.entry.canonicalId)).not.toContain(
      "TEST:temperatureRangeCelsius",
    );
  });

  it("temp range absent → UNKNOWN", () => {
    const result = matchAgainstCrossWalk(
      { itemClass: "spacecraft.component" },
      Z25_TEST_CROSS_WALK,
    );
    expect(result.possibleMatches.map((p) => p.entry.canonicalId)).toContain(
      "TEST:temperatureRangeCelsius",
    );
  });
});

// ─── Demo cross-walk entry (6A002.a.1) ──────────────────────────────

describe("Z25 demo entry — EU 6A002.a.1 (apertureMM ≥ 350)", () => {
  it("aperture 400 mm + sensor.optical class → 6A002.a.1 candidate", () => {
    const result = classifyTradeItemParametric({
      apertureMM: 400,
      itemClass: "sensor.optical.telescope",
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("EU:6A002.a.1");
  });

  it("aperture 350 mm (at boundary) → 6A002.a.1 MEDIUM (boundary flag)", () => {
    const result = classifyTradeItemParametric({
      apertureMM: 350,
      itemClass: "sensor.optical.imager",
    });
    const m = result.candidates.find(
      (c) => c.entry.canonicalId === "EU:6A002.a.1",
    );
    expect(m).toBeDefined();
    expect(m!.confidence).toBe("MEDIUM");
    const aperturePred = m!.matchedPredicates.find(
      (p) => p.attribute === "apertureMM",
    );
    expect(aperturePred?.boundary).toBe(true);
  });

  it("aperture 300 mm + sensor.optical class → 6A002.a.1 near-miss (boundary refute)", () => {
    const result = classifyTradeItemParametric({
      apertureMM: 300,
      itemClass: "sensor.optical.telescope",
    });
    const nmIds = result.nearMisses.map((nm) => nm.entry.canonicalId);
    expect(nmIds).toContain("EU:6A002.a.1");
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("EU:6A002.a.1");
  });

  it("aperture supplied, itemClass missing → 6A002.a.1 PossibleMatch", () => {
    const result = classifyTradeItemParametric({
      apertureMM: 400,
      // itemClass intentionally omitted
    });
    const possibleIds = result.possibleMatches.map((p) => p.entry.canonicalId);
    expect(possibleIds).toContain("EU:6A002.a.1");
  });
});

// ─── Backwards compatibility ────────────────────────────────────────

describe("Z25 — backwards compatibility (existing predicates unchanged)", () => {
  it("9A515.a.1 still fires on 0.4m aperture (existing apertureMeters path)", () => {
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

  it("MTCR Cat I still fires on (range 300, payload 500)", () => {
    const result = classifyTradeItemParametric({
      rangeKm: 300,
      payloadKg: 500,
      itemClass: "missile.system",
    });
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "MTCR:Item-1.A.1",
    );
  });

  it("9A515.d still fires on full five-criteria rad-hard part", () => {
    const result = classifyTradeItemParametric({
      isRadHardened: true,
      itemClass: "ic.radhard.processor",
      radHardTidKrad: 600,
      doseRateUpsetRadSiPerS: 6e8,
      neutronFluenceNPerCm2: 1.5e14,
      seuRateErrorsPerBitDay: 1e-11,
      selLetThresholdMevCm2Mg: 100,
    });
    expect(result.candidates.map((c) => c.entry.canonicalId)).toContain(
      "ECCN:9A515.d",
    );
  });
});

// ─── Schema-level backwards compatibility ───────────────────────────

describe("Z25 — TradeItemParametricSnapshot accepts new attributes", () => {
  it("all 10 new attributes accepted as undefined (no-op)", () => {
    const snapshot: TradeItemParametricSnapshot = {};
    expect(() => itemToAttributeBag(snapshot)).not.toThrow();
    const bag = itemToAttributeBag(snapshot);
    expect(bag.parametricAttributes?.apertureMM).toBeUndefined();
    expect(bag.parametricAttributes?.groundResolutionMeters).toBeUndefined();
    expect(bag.parametricAttributes?.signalBandwidthMHz).toBeUndefined();
    expect(bag.parametricAttributes?.focalLengthMM).toBeUndefined();
    expect(bag.parametricAttributes?.pixelPitchMicrons).toBeUndefined();
    expect(bag.parametricAttributes?.maxOrbitAltitudeKm).toBeUndefined();
    expect(bag.parametricAttributes?.minOrbitAltitudeKm).toBeUndefined();
    expect(bag.parametricAttributes?.crossLinkBandwidthMbps).toBeUndefined();
    expect(bag.parametricAttributes?.radHardenedTID_krad).toBeUndefined();
    expect(bag.parametricAttributes?.temperatureRangeCelsius).toBeUndefined();
  });

  it("all 10 new attributes accepted as null (no-op, three-valued logic preserved)", () => {
    const snapshot: TradeItemParametricSnapshot = {
      apertureMM: null,
      groundResolutionMeters: null,
      signalBandwidthMHz: null,
      focalLengthMM: null,
      pixelPitchMicrons: null,
      maxOrbitAltitudeKm: null,
      minOrbitAltitudeKm: null,
      crossLinkBandwidthMbps: null,
      radHardenedTID_krad: null,
      temperatureRangeCelsius: null,
    };
    expect(() => itemToAttributeBag(snapshot)).not.toThrow();
    const bag = itemToAttributeBag(snapshot);
    // Null Z25 attrs are NOT emitted — matches existing Z3e semantics:
    // the matcher reads them as missing, not as null.
    expect(bag.parametricAttributes?.apertureMM).toBeUndefined();
    expect(bag.parametricAttributes?.crossLinkBandwidthMbps).toBeUndefined();
  });

  it("populated Z25 attributes flow into parametricAttributes JSON bag", () => {
    const snapshot: TradeItemParametricSnapshot = {
      apertureMM: 400,
      groundResolutionMeters: 0.3,
      signalBandwidthMHz: 800,
      focalLengthMM: 1200,
      pixelPitchMicrons: 3.5,
      maxOrbitAltitudeKm: 1500,
      minOrbitAltitudeKm: 350,
      crossLinkBandwidthMbps: 2500,
      radHardenedTID_krad: 300,
      temperatureRangeCelsius: 200,
    };
    const bag = itemToAttributeBag(snapshot);
    expect(bag.parametricAttributes?.apertureMM).toBe(400);
    expect(bag.parametricAttributes?.groundResolutionMeters).toBe(0.3);
    expect(bag.parametricAttributes?.signalBandwidthMHz).toBe(800);
    expect(bag.parametricAttributes?.focalLengthMM).toBe(1200);
    expect(bag.parametricAttributes?.pixelPitchMicrons).toBe(3.5);
    expect(bag.parametricAttributes?.maxOrbitAltitudeKm).toBe(1500);
    expect(bag.parametricAttributes?.minOrbitAltitudeKm).toBe(350);
    expect(bag.parametricAttributes?.crossLinkBandwidthMbps).toBe(2500);
    expect(bag.parametricAttributes?.radHardenedTID_krad).toBe(300);
    expect(bag.parametricAttributes?.temperatureRangeCelsius).toBe(200);
  });

  it("Z25 typed columns take precedence over parametricAttributes JSON for the same key", () => {
    const snapshot: TradeItemParametricSnapshot = {
      apertureMM: 400, // typed
      parametricAttributes: {
        apertureMM: 300, // pre-existing JSON entry — should be overridden
      },
    };
    const bag = itemToAttributeBag(snapshot);
    expect(bag.parametricAttributes?.apertureMM).toBe(400);
  });
});

// ─── Production cross-walk integrity ────────────────────────────────

describe("Z25 — production cross-walk includes the demo entry", () => {
  it("CONTROL_LIST_CROSS_WALK contains EU:6A002.a.1 (the Z25 demo)", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:6A002.a.1",
    );
    expect(entry).toBeDefined();
    expect(entry?.predicates.some((p) => p.attribute === "apertureMM")).toBe(
      true,
    );
  });

  it("EU:6A002.a.1 uses apertureMM predicate with gte 350", () => {
    const entry = CONTROL_LIST_CROSS_WALK.find(
      (e) => e.canonicalId === "EU:6A002.a.1",
    );
    const apertureMMPred = entry?.predicates.find(
      (p) => p.attribute === "apertureMM",
    );
    expect(apertureMMPred?.op).toBe("gte");
    expect(apertureMMPred?.value).toBe(350);
  });
});

// ─── Matcher engine sanity — bag empty detection works with Z25 ─────

describe("Z25 — noAttributesPopulated detection still works", () => {
  it("empty snapshot → noAttributesPopulated true (no Z25 leakage)", () => {
    const result = classifyTradeItemParametric({});
    expect(result.noAttributesPopulated).toBe(true);
  });

  it("only a Z25 attribute populated → noAttributesPopulated false", () => {
    // Verifies that the matcher's isBagEmpty check follows the JSON
    // bag — populating only a Z25 attribute (which routes via the
    // parametricAttributes bag) should still register as "operator
    // supplied something".
    const result = classifyTradeItemParametric({
      apertureMM: 400,
    });
    expect(result.noAttributesPopulated).toBe(false);
  });
});

// ─── Type-only assertion: AttributeName union includes Z25 keys ─────

describe("Z25 — AttributeName union exports Z25 keys (type-level)", () => {
  it("can construct a ParametricPredicate using each Z25 attribute", () => {
    // Compile-time check via type assertion. If the AttributeName
    // union dropped one of these keys, this would fail to compile.
    const preds: ParametricPredicate[] = [
      { attribute: "apertureMM", op: "gte", value: 1 },
      { attribute: "groundResolutionMeters", op: "lte", value: 1 },
      { attribute: "signalBandwidthMHz", op: "gte", value: 1 },
      { attribute: "focalLengthMM", op: "gte", value: 1 },
      { attribute: "pixelPitchMicrons", op: "lte", value: 1 },
      { attribute: "maxOrbitAltitudeKm", op: "gte", value: 1 },
      { attribute: "minOrbitAltitudeKm", op: "lte", value: 1 },
      { attribute: "crossLinkBandwidthMbps", op: "gte", value: 1 },
      { attribute: "radHardenedTID_krad", op: "gte", value: 1 },
      { attribute: "temperatureRangeCelsius", op: "gte", value: 1 },
    ];
    expect(preds).toHaveLength(10);
    // Use the synthetic mini-cross-walk to verify predicates evaluate.
    const result: MatcherResult_Shape = matchAgainstCrossWalk(
      { parametricAttributes: { apertureMM: 500 } },
      [makeTestEntry("TEST:Z25-types", preds.slice(0, 1))],
    );
    expect(result.candidates).toHaveLength(1);
  });
});

// Tiny type-only alias so the test file doesn't need a full
// MatcherResult import — the assertion above only needs the shape.
type MatcherResult_Shape = ReturnType<typeof matchAgainstCrossWalk>;

// Unused-but-kept-to-silence the linter for the type alias usage above
const _itemBagType: ItemAttributeBag = {};
void _itemBagType;
