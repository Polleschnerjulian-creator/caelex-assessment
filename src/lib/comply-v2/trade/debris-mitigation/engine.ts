/**
 * Orbital Debris Mitigation Compliance Engine
 *
 * Takes a `SatelliteProfile` (the mission's key attributes — altitude,
 * mass, lifetime, jurisdiction, etc.) and evaluates compliance against
 * the IADC + FCC + ESA + NASA + ISO + UN COPUOS + EU + UK debris-
 * mitigation requirements from `iadc-fcc-orbital-debris.ts`.
 *
 * Status output per requirement:
 *   - COMPLIANT     — Profile satisfies the threshold or qualitative rule
 *   - NON_COMPLIANT — Profile violates the threshold
 *   - NOT_APPLICABLE — Rule does not apply to this orbital regime/operator
 *   - UNKNOWN       — Profile lacks the data needed to evaluate
 *
 * Returns a structured report that the UI / API layer can render or
 * the Astra tool can consume.
 *
 * The engine is jurisdiction-aware: it filters to MANDATORY requirements
 * for the operator's jurisdiction(s) by default, with optional inclusion
 * of GUIDELINE and STANDARD requirements for a "full coverage" view.
 *
 * Pure function — no side effects, no DB access. Test-friendly.
 */

import {
  DEBRIS_REQUIREMENTS,
  type DebrisOrbitalRegime,
  type DebrisRequirementEntry,
} from "@/data/trade/iadc-fcc-orbital-debris";

/** Inputs — the satellite's compliance-relevant profile. */
export interface SatelliteProfile {
  /** Mean altitude in km (used to derive orbital regime if not given). */
  altitudeKm?: number;

  /** Orbital regime — if known, takes precedence over altitude derivation. */
  orbitalRegime?: DebrisOrbitalRegime;

  /** Mass at end-of-mission, in kg. */
  massKg?: number;

  /** Whether the spacecraft has on-board propulsion / manoeuvre capability. */
  hasPropulsion?: boolean;

  /** Years from end-of-mission until orbital decay (must be ≤ regime PMD). */
  postMissionLifetimeYears?: number;

  /**
   * For GEO disposal — perigee altitude of the planned graveyard orbit,
   * expressed in km above GEO (e.g. 250 = 35,786 + 250 km perigee).
   */
  graveyardOrbitMarginKm?: number;

  /** Casualty risk factor on uncontrolled re-entry (e.g. 0.00008 = 8×10⁻⁵). */
  casualtyRiskFactor?: number;

  /** Probability of on-orbit break-up over operational phase. */
  operationalBreakUpProbability?: number;

  /** Probability of post-mission explosion (passivation failure). */
  explosionProbability?: number;

  /** Constellation size — how many sats in the operator's constellation. */
  constellationSize?: number;

  /** Whether passivation procedures are documented and verified. */
  passivationPlanned?: boolean;

  /** Whether the operator participates in conjunction-screening services. */
  collisionAvoidanceParticipation?: boolean;

  /** Whether the operator shares tracking data with 18 SDS / EUSST. */
  trackingDataSharing?: boolean;

  /** Jurisdictions under which the mission is authorised (ISO-2 codes). */
  jurisdictions: ReadonlyArray<string>;

  /** Operator scope. */
  operatorType: "COMMERCIAL" | "GOVERNMENT" | "ACADEMIC";
}

/** Per-requirement evaluation result. */
export type DebrisRequirementStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export interface DebrisRequirementResult {
  requirement: DebrisRequirementEntry;
  status: DebrisRequirementStatus;
  rationale: string;
}

export interface DebrisComplianceReport {
  satellite: SatelliteProfile;
  /** All requirements evaluated, in dataset order. */
  results: ReadonlyArray<DebrisRequirementResult>;
  /** Aggregate counts. */
  summary: {
    compliantCount: number;
    nonCompliantCount: number;
    notApplicableCount: number;
    unknownCount: number;
    totalEvaluated: number;
  };
  /** Overall verdict — false if ANY MANDATORY rule is NON_COMPLIANT. */
  overallCompliant: boolean;
}

/**
 * Derive orbital regime from altitude if not explicitly given.
 * GEO band is ±200 km from 35,786 km. Above that → BEYOND_EARTH.
 */
export function deriveOrbitalRegime(
  altitudeKm: number | undefined,
): DebrisOrbitalRegime | undefined {
  if (altitudeKm === undefined) return undefined;
  if (altitudeKm <= 2000) return "LEO";
  if (altitudeKm < 35586) return "MEO";
  if (altitudeKm <= 35986) return "GEO";
  if (altitudeKm > 35986 && altitudeKm < 250000) return "HEO";
  return "BEYOND_EARTH";
}

/**
 * Check whether a single requirement's orbital scope matches the satellite's.
 */
function appliesToOrbit(
  requirement: DebrisRequirementEntry,
  satelliteRegime: DebrisOrbitalRegime | undefined,
): boolean {
  if (satelliteRegime === undefined) return false;
  return (
    requirement.orbitalRegimes.includes(satelliteRegime) ||
    requirement.orbitalRegimes.includes("ANY")
  );
}

/**
 * Check whether the requirement applies to this operator type.
 */
function appliesToOperator(
  requirement: DebrisRequirementEntry,
  operatorType: SatelliteProfile["operatorType"],
): boolean {
  return (
    requirement.operatorScope.includes("ALL") ||
    requirement.operatorScope.includes(operatorType)
  );
}

/**
 * Map a jurisdiction ISO-2 to the debris regimes that bind operators
 * there. Used to scope MANDATORY rules to relevant operators.
 */
const JURISDICTION_TO_REGIMES: Record<string, ReadonlyArray<string>> = {
  US: ["FCC", "NASA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  GB: ["UK-SIA", "IADC", "UN-COPUOS", "ISO-24113", "ESA-STD"],
  UK: ["UK-SIA", "IADC", "UN-COPUOS", "ISO-24113", "ESA-STD"],
  DE: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  FR: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  IT: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  ES: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  NL: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  BE: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  SE: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  PL: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  AT: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  FI: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  DK: ["EU-SPACE-ACT", "ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"],
  CH: ["ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"], // ESA member, non-EU
  NO: ["ESA-STD", "IADC", "UN-COPUOS", "ISO-24113"], // ESA member, non-EU
  JP: ["IADC", "UN-COPUOS", "ISO-24113"], // JAXA defaults to IADC baseline
  CA: ["IADC", "UN-COPUOS", "ISO-24113"], // CSA defaults to IADC baseline
};

/**
 * Check whether this requirement is "in scope" for this operator's
 * jurisdiction set.
 */
function inScopeForJurisdictions(
  requirement: DebrisRequirementEntry,
  jurisdictions: ReadonlyArray<string>,
): boolean {
  if (jurisdictions.length === 0) {
    // No jurisdictions declared → include everything (most conservative)
    return true;
  }
  const applicableRegimes = new Set<string>();
  for (const j of jurisdictions) {
    const regimes = JURISDICTION_TO_REGIMES[j.toUpperCase()] ?? [];
    for (const r of regimes) {
      applicableRegimes.add(r);
    }
  }
  return applicableRegimes.has(requirement.regime);
}

/**
 * Evaluate a single requirement against the satellite profile.
 * Returns COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE / UNKNOWN.
 */
export function evaluateRequirement(
  requirement: DebrisRequirementEntry,
  satellite: SatelliteProfile,
): DebrisRequirementResult {
  const satelliteRegime =
    satellite.orbitalRegime ?? deriveOrbitalRegime(satellite.altitudeKm);

  // Orbit scoping
  if (!appliesToOrbit(requirement, satelliteRegime)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule does not apply to ${satelliteRegime ?? "unknown"} orbit; rule scoped to ${requirement.orbitalRegimes.join(", ")}.`,
    };
  }

  // Operator scoping
  if (!appliesToOperator(requirement, satellite.operatorType)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule scoped to ${requirement.operatorScope.join(", ")}; operator is ${satellite.operatorType}.`,
    };
  }

  // Jurisdiction scoping
  if (!inScopeForJurisdictions(requirement, satellite.jurisdictions)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule from regime ${requirement.regime} is not binding in operator's declared jurisdictions (${satellite.jurisdictions.join(", ")}).`,
    };
  }

  // Threshold evaluation
  if (requirement.threshold) {
    const param = requirement.threshold.parameter;
    const actual = (satellite as unknown as Record<string, number | undefined>)[
      param
    ];

    if (actual === undefined || actual === null) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Cannot evaluate: satellite profile is missing field "${param}".`,
      };
    }

    const { operator, value, unit } = requirement.threshold;
    let pass: boolean;
    switch (operator) {
      case "<=":
        pass = actual <= value;
        break;
      case ">=":
        pass = actual >= value;
        break;
      case "<":
        pass = actual < value;
        break;
      case ">":
        pass = actual > value;
        break;
      case "=":
        pass = actual === value;
        break;
    }

    return {
      requirement,
      status: pass ? "COMPLIANT" : "NON_COMPLIANT",
      rationale: pass
        ? `${param} = ${actual} ${unit} satisfies threshold (${operator} ${value} ${unit}).`
        : `${param} = ${actual} ${unit} violates threshold (${operator} ${value} ${unit}).`,
    };
  }

  // Qualitative rules — evaluate based on category
  switch (requirement.category) {
    case "PASSIVATION":
      if (satellite.passivationPlanned === undefined) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate: passivation plan status not declared in profile.",
        };
      }
      return {
        requirement,
        status: satellite.passivationPlanned ? "COMPLIANT" : "NON_COMPLIANT",
        rationale: satellite.passivationPlanned
          ? "Passivation plan is documented in profile."
          : "Passivation plan is not yet documented.",
      };

    case "COLLISION_AVOIDANCE":
      if (satellite.collisionAvoidanceParticipation === undefined) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate: collision-avoidance participation not declared.",
        };
      }
      return {
        requirement,
        status: satellite.collisionAvoidanceParticipation
          ? "COMPLIANT"
          : "NON_COMPLIANT",
        rationale: satellite.collisionAvoidanceParticipation
          ? "Operator participates in conjunction-screening services."
          : "Operator does not participate in conjunction-screening services.",
      };

    case "TRACKING_DATA":
      if (satellite.trackingDataSharing === undefined) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale: "Cannot evaluate: tracking-data sharing not declared.",
        };
      }
      return {
        requirement,
        status: satellite.trackingDataSharing ? "COMPLIANT" : "NON_COMPLIANT",
        rationale: satellite.trackingDataSharing
          ? "Operator shares tracking data with 18 SDS / EUSST."
          : "Operator does not share tracking data — rule violated.",
      };

    default:
      // For qualitative rules we don't have explicit data for, we mark UNKNOWN
      // (the safer answer; the UI can then flag for review)
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Qualitative rule (${requirement.category}) requires expert evaluation; no automated check encoded.`,
      };
  }
}

/**
 * Run a full debris-compliance check across all rules in scope.
 */
export function checkDebrisCompliance(
  satellite: SatelliteProfile,
): DebrisComplianceReport {
  const results = DEBRIS_REQUIREMENTS.map((requirement) =>
    evaluateRequirement(requirement, satellite),
  );

  const summary = {
    compliantCount: results.filter((r) => r.status === "COMPLIANT").length,
    nonCompliantCount: results.filter((r) => r.status === "NON_COMPLIANT")
      .length,
    notApplicableCount: results.filter((r) => r.status === "NOT_APPLICABLE")
      .length,
    unknownCount: results.filter((r) => r.status === "UNKNOWN").length,
    totalEvaluated: results.length,
  };

  // Overall compliance: false if any MANDATORY rule is NON_COMPLIANT
  const overallCompliant = !results.some(
    (r) =>
      r.status === "NON_COMPLIANT" &&
      r.requirement.bindingNature === "MANDATORY",
  );

  return {
    satellite,
    results,
    summary,
    overallCompliant,
  };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
