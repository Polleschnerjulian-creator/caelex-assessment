/**
 * In-Orbit Servicing (IOS) / Rendezvous & Proximity Operations (RPO)
 * Compliance Engine
 *
 * Takes an `IosMissionProfile` (the IOS mission's key attributes —
 * mission type, target consent, abort capability, proximity range,
 * jurisdictions, etc.) and evaluates compliance against the FCC + FAA
 * + NASA + DARPA/CONFERS + ESA + UK CAA + JAXA/METI + CONFERS BP
 * requirements from `in-orbit-servicing-rpo.ts`.
 *
 * Status output per requirement:
 *   - COMPLIANT       — Profile satisfies the threshold or qualitative rule
 *   - NON_COMPLIANT   — Profile violates the threshold
 *   - NOT_APPLICABLE  — Rule does not apply to this regime/operator/jurisdiction
 *   - UNKNOWN         — Profile lacks the data needed to evaluate
 *
 * Returns a structured report that the UI / API layer can render or
 * the Astra tool can consume.
 *
 * The engine is jurisdiction-aware: it filters MANDATORY requirements
 * to those that bind operators in the declared jurisdiction(s). BEST_
 * PRACTICE and STANDARD requirements appear across all jurisdictions
 * for advisory purposes.
 *
 * Pure function — no side effects, no DB access. Test-friendly. Server-
 * only since it consumes the regulatory dataset only on the server.
 */

import "server-only";

import {
  IOS_RPO_REQUIREMENTS,
  type IosOperationalRegime,
  type IosRegime,
  type IosRequirementEntry,
} from "@/data/comply/in-orbit-servicing-rpo";

/** IOS mission type — what the servicer is doing to the client. */
export type IosMissionType =
  | "SERVICING" // refurbishment / repair / lifetime extension
  | "REFUELING" // on-orbit refuelling
  | "INSPECTION" // close-flyby / inspection only (no docking)
  | "ACTIVE_DEBRIS_REMOVAL" // ADR of non-cooperative target
  | "MANUFACTURING" // in-space manufacturing / assembly
  | "DOCKING_TRANSFER"; // cargo / crew transfer (non-ISS)

/** Inputs — the IOS mission's compliance-relevant profile. */
export interface IosMissionProfile {
  /** What the mission is doing. */
  missionType: IosMissionType;

  /**
   * Whether the target spacecraft's owner has consented to the
   * proximity operations. For ADR of non-cooperative targets, set to
   * `false` and rely on regulator authorisation in lieu of consent.
   */
  targetSpacecraftConsent?: boolean;

  /**
   * Whether the servicer has documented + tested abort capability for
   * every RPO phase.
   */
  abortCapability?: boolean;

  /**
   * Closest planned proximity range to the client, in metres. Used by
   * notification + consent threshold rules.
   */
  proximityRangeMeters?: number;

  /**
   * Final-approach corridor closing velocity, in m/s. Compared against
   * the 2-m/s CONFERS / NASA OS-DM / JAXA threshold.
   */
  finalApproachClosingVelocityMps?: number;

  /** Manoeuvre accuracy 3-sigma at proximity, in metres. */
  manoeuvreAccuracyMeters?: number;

  /**
   * Mean altitude in km (used to derive operational regime if not
   * explicitly given).
   */
  altitudeKm?: number;

  /**
   * Operational regime — if known, takes precedence over altitude.
   */
  operationalRegime?: IosOperationalRegime;

  /** Jurisdictions under which the mission is authorised (ISO-2 codes). */
  jurisdictions: ReadonlyArray<string>;

  /** Operator type. */
  operatorType: "COMMERCIAL" | "GOVERNMENT" | "ACADEMIC";

  /**
   * Third-party liability insurance coverage carried by the operator,
   * in millions USD. Compared against FAA / UK CAA $100M+ floors.
   */
  insuranceCoverageMillionUSD?: number;

  /**
   * Number of redundant communications links available during
   * mission-critical RPO phases. Compared against CONFERS BP-5
   * (3-link) and JAXA (2-link) thresholds.
   */
  communicationsLinkRedundancy?: number;

  /**
   * Inspection-phase duration the servicer plans to spend in stand-off
   * before docking, in hours. Compared against DARPA RSGS 24h floor.
   */
  inspectionPhaseHours?: number;

  /**
   * Lead time provided to the responsible regulator before close-
   * approach RPO manoeuvres, in hours.
   */
  regulatorNotificationLeadTimeHours?: number;

  /** Whether RF spectrum coordination has been completed (FCC IBFS / similar). */
  rfSpectrumCoordinationComplete?: boolean;

  /** Whether the capture mechanism has been ground-qualified. */
  captureMechanismQualified?: boolean;

  /** Whether docking verification protocol uses ≥ 2 independent sensors. */
  multiSensorDockingVerification?: boolean;

  /** Whether the mission has completed export-control review. */
  exportControlReviewComplete?: boolean;

  /** Whether debris-mitigation overlay for IOS has been documented. */
  debrisMitigationDocumented?: boolean;
}

/** Per-requirement evaluation result. */
export type IosRequirementStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export interface IosRequirementResult {
  requirement: IosRequirementEntry;
  status: IosRequirementStatus;
  rationale: string;
}

export interface IosComplianceReport {
  mission: IosMissionProfile;
  /** All requirements evaluated, in dataset order. */
  results: ReadonlyArray<IosRequirementResult>;
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
 * Derive operational regime from altitude if not explicitly given.
 * GEO band is ±200 km from 35,786 km. Above HEO → CISLUNAR.
 */
export function deriveOperationalRegime(
  altitudeKm: number | undefined,
): IosOperationalRegime | undefined {
  if (altitudeKm === undefined) return undefined;
  if (altitudeKm <= 2000) return "LEO";
  if (altitudeKm < 35586) return "MEO";
  if (altitudeKm <= 35986) return "GEO";
  if (altitudeKm > 35986 && altitudeKm < 250000) return "HEO";
  return "CISLUNAR";
}

/**
 * Check whether a requirement's operational scope matches the mission's.
 */
function appliesToRegime(
  requirement: IosRequirementEntry,
  missionRegime: IosOperationalRegime | undefined,
): boolean {
  if (missionRegime === undefined) return false;
  return (
    requirement.operationalRegimes.includes(missionRegime) ||
    requirement.operationalRegimes.includes("ANY")
  );
}

/**
 * Check whether the requirement applies to this operator type.
 */
function appliesToOperator(
  requirement: IosRequirementEntry,
  operatorType: IosMissionProfile["operatorType"],
): boolean {
  return (
    requirement.operatorScope.includes("ALL") ||
    requirement.operatorScope.includes(operatorType)
  );
}

/**
 * Map a jurisdiction ISO-2 to the IOS regimes that bind operators
 * there. Used to scope MANDATORY rules to relevant operators.
 *
 * BEST_PRACTICE and STANDARD rules (CONFERS, NASA OS-DM, etc.) are
 * available across all jurisdictions because they're cited advisory
 * sources rather than nation-bound law.
 */
const JURISDICTION_TO_REGIMES: Record<string, ReadonlyArray<IosRegime>> = {
  US: ["FCC-ISAM", "FAA-AST-450", "NASA-OS-DM", "DARPA-CONFERS", "CONFERS-BP"],
  GB: ["UK-CAA-IOA", "CONFERS-BP", "DARPA-CONFERS"],
  UK: ["UK-CAA-IOA", "CONFERS-BP", "DARPA-CONFERS"],
  DE: ["ESA-RAMSES", "CONFERS-BP"],
  FR: ["ESA-RAMSES", "CONFERS-BP"],
  IT: ["ESA-RAMSES", "CONFERS-BP"],
  ES: ["ESA-RAMSES", "CONFERS-BP"],
  NL: ["ESA-RAMSES", "CONFERS-BP"],
  BE: ["ESA-RAMSES", "CONFERS-BP"],
  SE: ["ESA-RAMSES", "CONFERS-BP"],
  PL: ["ESA-RAMSES", "CONFERS-BP"],
  AT: ["ESA-RAMSES", "CONFERS-BP"],
  FI: ["ESA-RAMSES", "CONFERS-BP"],
  DK: ["ESA-RAMSES", "CONFERS-BP"],
  CH: ["ESA-RAMSES", "CONFERS-BP"], // ESA member, non-EU
  NO: ["ESA-RAMSES", "CONFERS-BP"], // ESA member, non-EU
  JP: ["JAXA-METI", "CONFERS-BP"],
};

/**
 * Check whether this requirement is "in scope" for this operator's
 * jurisdiction set.
 */
function inScopeForJurisdictions(
  requirement: IosRequirementEntry,
  jurisdictions: ReadonlyArray<string>,
): boolean {
  if (jurisdictions.length === 0) {
    // No jurisdictions declared → include everything (most conservative)
    return true;
  }
  const applicableRegimes = new Set<IosRegime>();
  for (const j of jurisdictions) {
    const regimes = JURISDICTION_TO_REGIMES[j.toUpperCase()] ?? [];
    for (const r of regimes) {
      applicableRegimes.add(r);
    }
  }
  return applicableRegimes.has(requirement.regime);
}

/**
 * Evaluate a qualitative-rule outcome based on a boolean profile flag.
 * Returns UNKNOWN if the flag is undefined.
 */
function evaluateBooleanFlag(
  requirement: IosRequirementEntry,
  flagValue: boolean | undefined,
  flagDescription: string,
  positiveOutcome: string,
  negativeOutcome: string,
): IosRequirementResult {
  if (flagValue === undefined) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale: `Cannot evaluate: ${flagDescription} not declared in mission profile.`,
    };
  }
  return {
    requirement,
    status: flagValue ? "COMPLIANT" : "NON_COMPLIANT",
    rationale: flagValue ? positiveOutcome : negativeOutcome,
  };
}

/**
 * Evaluate a single IOS / RPO requirement against the mission profile.
 * Returns COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE / UNKNOWN.
 */
export function evaluateIosRequirement(
  requirement: IosRequirementEntry,
  mission: IosMissionProfile,
): IosRequirementResult {
  const missionRegime =
    mission.operationalRegime ?? deriveOperationalRegime(mission.altitudeKm);

  // Operational regime scoping
  if (!appliesToRegime(requirement, missionRegime)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule does not apply to ${missionRegime ?? "unknown"} regime; rule scoped to ${requirement.operationalRegimes.join(", ")}.`,
    };
  }

  // Operator scoping
  if (!appliesToOperator(requirement, mission.operatorType)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule scoped to ${requirement.operatorScope.join(", ")}; operator is ${mission.operatorType}.`,
    };
  }

  // Jurisdiction scoping
  if (!inScopeForJurisdictions(requirement, mission.jurisdictions)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule from regime ${requirement.regime} is not binding in operator's declared jurisdictions (${mission.jurisdictions.join(", ")}).`,
    };
  }

  // ADR (Active Debris Removal) special path for CLIENT_CONSENT rules:
  // ADR missions rely on national-regulator authorisation rather than
  // client consent. Mark all CLIENT_CONSENT rules COMPLIANT for ADR
  // missions before threshold evaluation runs.
  if (
    requirement.category === "CLIENT_CONSENT" &&
    mission.missionType === "ACTIVE_DEBRIS_REMOVAL"
  ) {
    return {
      requirement,
      status: "COMPLIANT",
      rationale:
        "Active-debris-removal mission relies on regulator authorisation in lieu of client consent.",
    };
  }

  // Threshold evaluation
  if (requirement.threshold) {
    const param = requirement.threshold.parameter;
    const actual = (mission as unknown as Record<string, number | undefined>)[
      param
    ];

    if (actual === undefined || actual === null) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Cannot evaluate: mission profile is missing field "${param}".`,
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
    case "CLIENT_CONSENT":
      // ADR special-case is handled before threshold evaluation above;
      // cooperative-mission CLIENT_CONSENT rules use the consent flag.
      return evaluateBooleanFlag(
        requirement,
        mission.targetSpacecraftConsent,
        "target-spacecraft consent",
        "Client / target spacecraft consent is documented.",
        "Client / target spacecraft consent is not documented.",
      );

    case "ABORT_PROCEDURES":
      return evaluateBooleanFlag(
        requirement,
        mission.abortCapability,
        "abort capability status",
        "Abort capability is documented and tested for every RPO phase.",
        "Abort capability is not documented for all RPO phases.",
      );

    case "COMMUNICATIONS_LINK":
      // Threshold rules handled above; remaining COMMUNICATIONS_LINK
      // qualitative rules look at RF coordination flag.
      return evaluateBooleanFlag(
        requirement,
        mission.rfSpectrumCoordinationComplete,
        "RF spectrum coordination",
        "RF spectrum coordination is complete (FCC IBFS or equivalent).",
        "RF spectrum coordination is not complete.",
      );

    case "DOCKING_VERIFICATION":
      // Mission-design-level docking verification (capture qual + multi-sensor)
      if (
        mission.captureMechanismQualified === undefined &&
        mission.multiSensorDockingVerification === undefined
      ) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate: neither capture-mechanism qualification nor multi-sensor docking verification declared.",
        };
      }
      // For ESA RAMSES capture qual rule, use captureMechanismQualified
      // For CONFERS BP-6, use multiSensorDockingVerification (≥2 sensors)
      if (requirement.code === "ESA-RAMSES-CAPTURE") {
        return evaluateBooleanFlag(
          requirement,
          mission.captureMechanismQualified,
          "capture mechanism ground-qualification",
          "Capture mechanism has been ground-qualified.",
          "Capture mechanism has not been ground-qualified.",
        );
      }
      return evaluateBooleanFlag(
        requirement,
        mission.multiSensorDockingVerification,
        "multi-sensor docking verification",
        "Docking verification uses ≥ 2 independent sensors.",
        "Docking verification does not meet the multi-sensor requirement.",
      );

    case "EXPORT_CONTROL_OVERLAY":
      return evaluateBooleanFlag(
        requirement,
        mission.exportControlReviewComplete,
        "export-control review",
        "Export-control review is complete for cross-border IOS hardware/operations.",
        "Export-control review is not complete; ITAR/EAR risk may remain.",
      );

    case "DEBRIS_OVERLAY":
      return evaluateBooleanFlag(
        requirement,
        mission.debrisMitigationDocumented,
        "debris-mitigation overlay status",
        "Debris-mitigation overlay for IOS is documented.",
        "Debris-mitigation overlay for IOS is not documented.",
      );

    default:
      // For other qualitative rules we don't have explicit data for,
      // mark UNKNOWN (the safer answer; UI can flag for expert review).
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Qualitative rule (${requirement.category}) requires expert evaluation; no automated check encoded.`,
      };
  }
}

/**
 * Run a full IOS / RPO compliance check across all rules in scope.
 */
export function checkIosCompliance(
  mission: IosMissionProfile,
): IosComplianceReport {
  const results = IOS_RPO_REQUIREMENTS.map((requirement) =>
    evaluateIosRequirement(requirement, mission),
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
    mission,
    results,
    summary,
    overallCompliant,
  };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
