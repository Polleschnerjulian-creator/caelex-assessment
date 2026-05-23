/**
 * Cross-walk data integrity tests — Sprint Z3u.
 *
 * The CONTROL_LIST_CROSS_WALK seed is now non-trivial (24 entries
 * post Z3t, hand-curated across multiple sprints). Without integrity
 * checks, a careless edit can introduce silent bugs:
 *
 *   - Duplicate canonical IDs (Z3d hit this exactly — two 9A515.a.3
 *     entries fought each other on itemClass; the older one won
 *     because it was earlier in the array, masking the new radar
 *     predicates).
 *   - Empty predicate arrays (entries that match on nothing).
 *   - Misspelled attribute names (the predicate refers to an
 *     attribute the AttributeName union doesn't cover).
 *   - seeAlso self-links (an entry pointing to itself).
 *   - Stale relationship enum values (e.g. someone adds
 *     `narrower_than` without extending the union — Z3i hit this).
 *
 * These tests run in CI and lock in the data contract. A future
 * sprint adding a new entry must keep them green.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  CONTROL_LIST_CROSS_WALK,
  type AttributeName,
  type CrossWalkRelationship,
  type RegimeName,
} from "./control-list-cross-walk";

// ─── Authoritative type-derived sets ────────────────────────────────

const VALID_ATTRIBUTES: readonly AttributeName[] = [
  // Z3a tier-1
  "apertureMeters",
  "payloadKg",
  "rangeKm",
  "IspSeconds",
  "deltaVMetersPerSecond",
  "gsdMeters",
  "transmitPowerW",
  "frequencyGhz",
  "radHardTidKrad",
  "seuRateErrorsPerBitDay",
  "isRadHardened",
  "isMilSpec",
  "isAntiJam",
  "itemClass",
  // Z3e extended
  "spectralBandCount",
  "peakWavelengthNm",
  "radarCenterFreqGhz",
  "radarBandwidthMhz",
  "antennaDiameterM",
  "starTrackerAccuracyArcsec",
  "starTrackerSlewRateDegPerS",
  "totalImpulseNs",
  "neutronFluenceNPerCm2",
  "selLetThresholdMevCm2Mg",
  "doseRateUpsetRadSiPerS",
  "gnssMaxVelocityMPerS",
  "antennaActiveScanning",
  "antennaAdaptiveBeamforming",
  // Z3g
  "isSpeciallyDesigned",
  // Z25 — extended parametric attributes (tier-3, 2026-05-22)
  "apertureMM",
  "groundResolutionMeters",
  "signalBandwidthMHz",
  "focalLengthMM",
  "pixelPitchMicrons",
  "maxOrbitAltitudeKm",
  "minOrbitAltitudeKm",
  "crossLinkBandwidthMbps",
  "radHardenedTID_krad",
  "temperatureRangeCelsius",
  // Z34c — extended parametric attributes (tier-4, 2026-05-23)
  // Tier 1 — spacecraft hardware
  "solarCellEfficiencyPercent",
  "batterySpecificEnergyWhPerKg",
  "peakPowerWatts",
  "antennaGainDbi",
  "frequencyBandsGhz",
  "polarisationType",
  "thermalCycleCount",
  // Tier 2 — propulsion
  "propellantType",
  "thrustNewtons",
  "nozzleExpansionRatio",
  "specificImpulseSecondsVacuum",
  // Tier 3 — mission ops
  "missionDurationYears",
  "inclinationDegrees",
  "apogeeKm",
  "perigeeKm",
  // Tier 4 — imaging payloads
  "swirSpectralBands",
  "mwirSpectralBands",
  "lwirSpectralBands",
  "hyperspectralBandCount",
];

const VALID_REGIMES: readonly RegimeName[] = [
  "EAR-CCL",
  "ITAR-USML",
  "EU-ANNEX-I",
  "DE-AL-TEIL-IB",
  "JP-METI",
  "MTCR-ANNEX",
  "WASSENAAR",
  "NSG",
  "NSG-TRIGGER",
  "NSG-DU",
  "OTHER",
];

const VALID_RELATIONSHIPS: readonly CrossWalkRelationship[] = [
  "analogous",
  "predecessor",
  "successor",
  "superset_of",
  "subset_of",
  "derived_from",
  "components_of",
];

const VALID_PREDICATE_OPS = new Set([
  "lt",
  "lte",
  "gt",
  "gte",
  "eq",
  "between",
  "prefix",
  "in",
  // Z34c — `contains` (value ∈ attribute[]) for array-valued attributes
  // like frequencyBandsGhz.
  "contains",
]);

// ─── Integrity tests ────────────────────────────────────────────────

describe("Cross-walk integrity — uniqueness", () => {
  it("every entry has a UNIQUE canonicalId (no shadowing)", () => {
    const ids = CONTROL_LIST_CROSS_WALK.map((e) => e.canonicalId);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("regime + category + entryNumber + subpara form a stable composite", () => {
    // Less strict than canonicalId uniqueness — checks the structured
    // fields don't accidentally collide on a key that's not the
    // canonical ID.
    const composites = CONTROL_LIST_CROSS_WALK.map(
      (e) =>
        `${e.regime}:${e.category}:${e.productGroup}:${e.entryNumber}:${e.subpara ?? ""}`,
    );
    const dupes = composites.filter((c, i) => composites.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  });
});

describe("Cross-walk integrity — required fields", () => {
  it("every entry has a non-empty title", () => {
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty citation", () => {
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      expect(entry.citation.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has at least one reasonsForControl code", () => {
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      expect(entry.reasonsForControl.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a parseable validFrom date", () => {
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      const d = new Date(entry.validFrom);
      expect(Number.isNaN(d.getTime())).toBe(false);
    }
  });
});

describe("Cross-walk integrity — predicates", () => {
  it("every entry has at least one predicate (no zero-predicate entries)", () => {
    // Zero predicates → an entry that can never match. We've seen this
    // happen on stale ITAR placeholder entries; the matcher silently
    // drops them anyway, but ban them outright for clarity.
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      expect(entry.predicates.length).toBeGreaterThan(0);
    }
  });

  it("every predicate attribute is in the AttributeName union", () => {
    const validSet = new Set(VALID_ATTRIBUTES);
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      for (const pred of entry.predicates) {
        expect(validSet.has(pred.attribute)).toBe(true);
      }
    }
  });

  it("every predicate op is a valid PredicateOp", () => {
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      for (const pred of entry.predicates) {
        expect(VALID_PREDICATE_OPS.has(pred.op)).toBe(true);
      }
    }
  });

  it("between predicates have [lo, hi] arrays with lo ≤ hi", () => {
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      for (const pred of entry.predicates) {
        if (pred.op !== "between") continue;
        expect(Array.isArray(pred.value)).toBe(true);
        const [lo, hi] = pred.value as [unknown, unknown];
        expect(typeof lo).toBe("number");
        expect(typeof hi).toBe("number");
        expect(lo as number).toBeLessThanOrEqual(hi as number);
      }
    }
  });

  it("prefix predicates have string values", () => {
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      for (const pred of entry.predicates) {
        if (pred.op !== "prefix") continue;
        expect(typeof pred.value).toBe("string");
      }
    }
  });
});

describe("Cross-walk integrity — seeAlso graph", () => {
  it("seeAlso links reference valid regimes", () => {
    const validSet = new Set(VALID_REGIMES);
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      for (const link of entry.seeAlso) {
        expect(validSet.has(link.regime)).toBe(true);
      }
    }
  });

  it("seeAlso relationships are in the union", () => {
    const validSet = new Set(VALID_RELATIONSHIPS);
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      for (const link of entry.seeAlso) {
        expect(validSet.has(link.relationship)).toBe(true);
      }
    }
  });

  it("no entry links to itself (self-link is meaningless)", () => {
    for (const entry of CONTROL_LIST_CROSS_WALK) {
      for (const link of entry.seeAlso) {
        // Compare the link target to the entry's local id portion.
        // The id field on a CrossWalkLink is the canonical sub-id
        // (e.g. "9A515.a.1") not the full canonicalId. We check
        // that the entry doesn't point to its own sub-id within the
        // same regime.
        if (entry.regime === link.regime) {
          // Extract local id from the canonical (after the colon).
          const localId = entry.canonicalId.split(":").slice(1).join(":");
          expect(link.id).not.toBe(localId);
        }
      }
    }
  });
});

describe("Cross-walk integrity — see-through-rule discoverability", () => {
  it("at least one entry carries a see-through warning in notes", () => {
    // Z3r's banner depends on at least one entry triggering the
    // detection regex. If a refactor accidentally strips the notes
    // from all 4 known see-through entries (9A515.x-rw, USML XV(b),
    // USML XV(e)(13), USML XV(e)(17)), this guards against silently
    // disabling the safety banner.
    const seeThroughCount = CONTROL_LIST_CROSS_WALK.filter((e) =>
      /see-through|§\s*123\.1\(b\)|retransfer/i.test(e.notes ?? ""),
    ).length;
    expect(seeThroughCount).toBeGreaterThanOrEqual(2);
  });
});

describe("Cross-walk integrity — coverage snapshot", () => {
  it("at least 20 entries (the moat is non-trivial)", () => {
    // Statistical lower bound — protects against accidental array-
    // truncation refactors. Update if entries are intentionally
    // removed.
    expect(CONTROL_LIST_CROSS_WALK.length).toBeGreaterThanOrEqual(20);
  });

  it("covers all four primary regimes (USML, CCL, EU, MTCR)", () => {
    const regimes = new Set(CONTROL_LIST_CROSS_WALK.map((e) => e.regime));
    expect(regimes.has("ITAR-USML")).toBe(true);
    expect(regimes.has("EAR-CCL")).toBe(true);
    expect(regimes.has("EU-ANNEX-I")).toBe(true);
    expect(regimes.has("MTCR-ANNEX")).toBe(true);
  });
});
