/**
 * Spectrum / ITU Coordination Compliance Engine
 *
 * Takes a `SatelliteSpectrumProfile` (the satellite mission's spectrum-
 * relevant attributes — frequency bands, ITU notification date, EIRP
 * density, EPFD attestation, ground earth-station countries,
 * jurisdictions, etc.) and evaluates compliance against the ITU + FCC
 * + BNetzA + Ofcom + ANFR/ARCEP + ETSI + CEPT/ECC requirements from
 * `spectrum-itu-coordination.ts`.
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
 * to those that bind operators in the declared jurisdiction(s). ITU-RR
 * binds operators in every country; national regimes layer on top.
 * HARMONISED (ETSI) and GUIDELINE (CEPT, IARU) requirements are scoped
 * to the EU and EU-adjacent regimes.
 *
 * Special path — **7-year bringing-into-use deadline**: if
 * `bringingIntoUseDate` is past `itnNotificationDate + 7 years` without
 * BIU attested, the ITU Resolution 32 / Article 11.44.1 rule is
 * NON_COMPLIANT regardless of any other input. This is the single
 * highest-impact spectrum-regulatory hard edge.
 *
 * Pure function — no side effects, no DB access. Test-friendly. Server-
 * only since it consumes the regulatory dataset only on the server.
 */

import "server-only";

import {
  SPECTRUM_REQUIREMENTS,
  type SpectrumBand,
  type SpectrumRegime,
  type SpectrumRequirementEntry,
} from "@/data/trade/spectrum-itu-coordination";

/** Orbital regime — used to scope NGSO-specific rules. */
export type SpectrumOrbitalRegime =
  | "LEO" // ≤ 2000 km altitude
  | "MEO" // 2000 – 35,786 km
  | "GEO" // 35,786 km ± 200 km
  | "HEO" // Highly elliptical orbit
  | "NGSO" // any non-geostationary regime (alias-style)
  | "ANY";

/** Inputs — the satellite mission's spectrum-relevant profile. */
export interface SatelliteSpectrumProfile {
  /** Spectrum bands the satellite operates in (uplink + downlink + ISL). */
  frequencyBands: ReadonlyArray<SpectrumBand>;

  /**
   * Orbital regime — used to scope EPFD (NGSO-only) and GEO-specific rules.
   * If "GEO" the EPFD NGSO rules are NOT_APPLICABLE; everything else is
   * treated as NGSO for EPFD purposes.
   */
  orbitalRegime: SpectrumOrbitalRegime;

  /**
   * Date the satellite's frequency assignment was notified to the ITU BR.
   * ISO 8601. Used together with `bringingIntoUseDate` for the 7-year
   * Resolution 32 / Article 11.44.1 deadline check.
   */
  itnNotificationDate?: string;

  /**
   * Date the satellite was first brought into use (BIU). ISO 8601.
   * If omitted but `itnNotificationDate` is past the 7-year deadline,
   * the rule fires NON_COMPLIANT.
   */
  bringingIntoUseDate?: string;

  /**
   * Off-axis EIRP density in dBW per 4 kHz. Compared against FCC §
   * 25.218 +18 dBW/4kHz cap (or band-specific limit).
   */
  offAxisEirpDensityDbw4kHz?: number;

  /**
   * Out-of-band emission attenuation in dB. Compared against FCC Part
   * 25 Subpart C / ITU-R SM.1541 ≥60 dB baseline.
   */
  outOfBandEmissionAttenuationDb?: number;

  /**
   * Cross-polarisation isolation in dB. Compared against ETSI ≥27 dB
   * (Ku-band) baseline.
   */
  crossPolarizationIsolationDb?: number;

  /**
   * For NGSO operators, whether the operator has attested compliance with
   * the Article 22 EPFD limits via the ITU-R S.1503 software.
   */
  epfdComplianceAttested?: boolean;

  /**
   * For NGSO constellations, % of the planned constellation deployed by
   * year 7. Compared against WRC-23 Resolution 32 100% milestone.
   */
  milestone7yearDeploymentPercent?: number;

  /**
   * ITU coordination ΔT/T metric. If ≤ 6%, mandatory coordination has
   * been completed; if > 6% additional Article 9 process required.
   */
  coordinationTriggerDeltaTOverTPercent?: number;

  /**
   * Countries where the operator has ground earth stations or gateways
   * that require national spectrum authorisation. ISO-2 codes.
   */
  groundEarthStationCountries: ReadonlyArray<string>;

  /** Whether the mission is under a Part 5 experimental authorisation. */
  isExperimental: boolean;

  /** Whether the mission operates in an amateur band (Part 97 path). */
  isAmateurBand: boolean;

  /** Jurisdictions under which the mission is authorised (ISO-2 codes). */
  jurisdictions: ReadonlyArray<string>;

  /** Operator type. */
  operatorType: "COMMERCIAL" | "GOVERNMENT" | "ACADEMIC" | "AMATEUR";

  /** Whether the mission includes an NGSO sub-system. */
  hasNGSOSystem: boolean;

  /**
   * Whether the earth-station antennas demonstrably meet the ITU-R
   * S.580-6 sidelobe envelope.
   */
  antennaPatternMeetsItuR580?: boolean;

  /** Whether ITU BR coordination has been completed (Article 9). */
  ituCoordinationComplete?: boolean;

  /** Whether the satellite has been notified to ITU BR (Article 11). */
  ituNotificationFiled?: boolean;
}

/** Per-requirement evaluation result. */
export type SpectrumRequirementStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export interface SpectrumRequirementResult {
  requirement: SpectrumRequirementEntry;
  status: SpectrumRequirementStatus;
  rationale: string;
}

export interface SpectrumComplianceReport {
  profile: SatelliteSpectrumProfile;
  /** All requirements evaluated, in dataset order. */
  results: ReadonlyArray<SpectrumRequirementResult>;
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
 * Check if `dateA` is at least `years` years before `dateB`.
 * Returns true if (dateB - dateA) >= years (i.e. dateA is the older date).
 */
function isAtLeastYearsApart(
  olderIso: string,
  newerIso: string,
  years: number,
): boolean {
  const older = new Date(olderIso).getTime();
  const newer = new Date(newerIso).getTime();
  if (!Number.isFinite(older) || !Number.isFinite(newer)) {
    return false;
  }
  const yearsMs = years * 365.25 * 24 * 60 * 60 * 1000;
  return newer - older >= yearsMs;
}

/**
 * Map a jurisdiction ISO-2 to the spectrum regimes that bind operators
 * there. Used to scope MANDATORY rules to relevant operators.
 *
 * ITU-RR is the international treaty and binds operators in every
 * country; national regimes layer on top.
 */
const JURISDICTION_TO_REGIMES: Record<string, ReadonlyArray<SpectrumRegime>> = {
  US: ["ITU-RR", "FCC-PART-25", "FCC-PART-5", "FCC-PART-97"],
  GB: ["ITU-RR", "OFCOM-UK", "ETSI", "CEPT-ECC"],
  UK: ["ITU-RR", "OFCOM-UK", "ETSI", "CEPT-ECC"],
  DE: ["ITU-RR", "BNETZA", "ETSI", "CEPT-ECC"],
  FR: ["ITU-RR", "ANFR-ARCEP", "ETSI", "CEPT-ECC"],
  IT: ["ITU-RR", "ETSI", "CEPT-ECC"],
  ES: ["ITU-RR", "ETSI", "CEPT-ECC"],
  NL: ["ITU-RR", "ETSI", "CEPT-ECC"],
  BE: ["ITU-RR", "ETSI", "CEPT-ECC"],
  SE: ["ITU-RR", "ETSI", "CEPT-ECC"],
  PL: ["ITU-RR", "ETSI", "CEPT-ECC"],
  AT: ["ITU-RR", "ETSI", "CEPT-ECC"],
  FI: ["ITU-RR", "ETSI", "CEPT-ECC"],
  DK: ["ITU-RR", "ETSI", "CEPT-ECC"],
  CH: ["ITU-RR", "ETSI", "CEPT-ECC"],
  NO: ["ITU-RR", "ETSI", "CEPT-ECC"],
  JP: ["ITU-RR"],
};

/**
 * Check whether this requirement is "in scope" for this operator's
 * jurisdiction set.
 */
function inScopeForJurisdictions(
  requirement: SpectrumRequirementEntry,
  jurisdictions: ReadonlyArray<string>,
): boolean {
  if (jurisdictions.length === 0) {
    // No jurisdictions declared → include everything (most conservative).
    // ITU-RR applies everywhere by treaty so it's always in scope.
    return true;
  }
  // ITU-RR is the international treaty and binds operators in every
  // country; always in scope regardless of jurisdiction map entries.
  if (requirement.regime === "ITU-RR") {
    return true;
  }
  const applicableRegimes = new Set<SpectrumRegime>();
  for (const j of jurisdictions) {
    const regimes = JURISDICTION_TO_REGIMES[j.toUpperCase()] ?? [];
    for (const r of regimes) {
      applicableRegimes.add(r);
    }
  }
  return applicableRegimes.has(requirement.regime);
}

/**
 * Check whether the requirement applies to this operator type.
 */
function appliesToOperator(
  requirement: SpectrumRequirementEntry,
  operatorType: SatelliteSpectrumProfile["operatorType"],
): boolean {
  return (
    requirement.operatorScope.includes("ALL") ||
    requirement.operatorScope.includes(operatorType)
  );
}

/**
 * Check whether the requirement's band scope matches the satellite's
 * frequency bands. "ANY"-band rules apply across all bands.
 */
function appliesToBands(
  requirement: SpectrumRequirementEntry,
  satelliteBands: ReadonlyArray<SpectrumBand>,
): boolean {
  if (requirement.applicableBands.includes("ANY")) return true;
  for (const band of satelliteBands) {
    if (requirement.applicableBands.includes(band)) return true;
  }
  return false;
}

/**
 * Evaluate a qualitative-rule outcome based on a boolean profile flag.
 * Returns UNKNOWN if the flag is undefined.
 */
function evaluateBooleanFlag(
  requirement: SpectrumRequirementEntry,
  flagValue: boolean | undefined,
  flagDescription: string,
  positiveOutcome: string,
  negativeOutcome: string,
): SpectrumRequirementResult {
  if (flagValue === undefined) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale: `Cannot evaluate: ${flagDescription} not declared in spectrum profile.`,
    };
  }
  return {
    requirement,
    status: flagValue ? "COMPLIANT" : "NON_COMPLIANT",
    rationale: flagValue ? positiveOutcome : negativeOutcome,
  };
}

/**
 * Evaluate the special 7-year bringing-into-use rule.
 * Returns the result if this requirement is the BIU rule, otherwise
 * returns undefined to let normal evaluation continue.
 */
function evaluateBringingIntoUseRule(
  requirement: SpectrumRequirementEntry,
  profile: SatelliteSpectrumProfile,
): SpectrumRequirementResult | undefined {
  if (requirement.code !== "ITU-RR-RES32-BIU") return undefined;

  if (!profile.itnNotificationDate) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale:
        "Cannot evaluate 7-year bringing-into-use rule: itnNotificationDate not declared.",
    };
  }

  // Path 1: BIU attested — check whether it landed within 7 years.
  if (profile.bringingIntoUseDate) {
    const biuInTime = !isAtLeastYearsApart(
      profile.itnNotificationDate,
      profile.bringingIntoUseDate,
      7,
    );
    return {
      requirement,
      status: biuInTime ? "COMPLIANT" : "NON_COMPLIANT",
      rationale: biuInTime
        ? `Bringing-into-use (${profile.bringingIntoUseDate}) attested within 7 years of notification (${profile.itnNotificationDate}).`
        : `Bringing-into-use (${profile.bringingIntoUseDate}) attested AFTER the 7-year deadline from notification (${profile.itnNotificationDate}) — Resolution 32 / Article 11.44.1 violation.`,
    };
  }

  // Path 2: No BIU date. Check if 7+ years have already passed since
  // notification — if so, the deadline is missed regardless.
  const nowIso = new Date().toISOString();
  const sevenYearsHavePassed = isAtLeastYearsApart(
    profile.itnNotificationDate,
    nowIso,
    7,
  );

  if (sevenYearsHavePassed) {
    return {
      requirement,
      status: "NON_COMPLIANT",
      rationale: `7+ years since ITN notification (${profile.itnNotificationDate}) with no bringingIntoUseDate attested — Resolution 32 / Article 11.44.1 violation.`,
    };
  }

  // Still within the 7-year window, BIU not yet required.
  return {
    requirement,
    status: "COMPLIANT",
    rationale: `Within 7-year bringing-into-use window from ITN notification (${profile.itnNotificationDate}).`,
  };
}

/**
 * Evaluate a single spectrum requirement against the profile.
 * Returns COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE / UNKNOWN.
 */
export function evaluateSpectrumRequirement(
  requirement: SpectrumRequirementEntry,
  profile: SatelliteSpectrumProfile,
): SpectrumRequirementResult {
  // Operator scoping
  if (!appliesToOperator(requirement, profile.operatorType)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule scoped to ${requirement.operatorScope.join(", ")}; operator is ${profile.operatorType}.`,
    };
  }

  // Jurisdiction scoping
  if (!inScopeForJurisdictions(requirement, profile.jurisdictions)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule from regime ${requirement.regime} is not binding in operator's declared jurisdictions (${profile.jurisdictions.join(", ")}).`,
    };
  }

  // Amateur-band gating: Part 97 rules apply only when isAmateurBand is true.
  if (
    (requirement.regime === "FCC-PART-97" ||
      requirement.code.startsWith("FCC-97")) &&
    !profile.isAmateurBand
  ) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale:
        "Amateur-band Part 97 rule does not apply: mission is not flagged amateur.",
    };
  }

  // Experimental-licence gating: Part 5 rules apply only when isExperimental is true.
  if (requirement.regime === "FCC-PART-5" && !profile.isExperimental) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale:
        "Experimental Part 5 rule does not apply: mission is not flagged experimental.",
    };
  }

  // NGSO-only EPFD gating: EPFD rules apply only to non-GSO orbits.
  if (
    requirement.category === "EPFD_NGSO_LIMITS" &&
    profile.orbitalRegime === "GEO"
  ) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: "EPFD NGSO limit does not apply: orbital regime is GEO.",
    };
  }

  // Band-scoping for band-specific rules
  if (!appliesToBands(requirement, profile.frequencyBands)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule scoped to bands [${requirement.applicableBands.join(", ")}]; satellite operates in [${profile.frequencyBands.join(", ")}].`,
    };
  }

  // Special path — 7-year bringing-into-use rule
  const biuResult = evaluateBringingIntoUseRule(requirement, profile);
  if (biuResult) return biuResult;

  // Threshold evaluation
  if (requirement.threshold) {
    const param = requirement.threshold.parameter;
    const actual = (profile as unknown as Record<string, number | undefined>)[
      param
    ];

    if (actual === undefined || actual === null) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Cannot evaluate: spectrum profile is missing field "${param}".`,
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

  // Qualitative rules — evaluate based on category + code
  switch (requirement.category) {
    case "EPFD_NGSO_LIMITS":
      // Threshold cases handled above; qualitative EPFD = attestation flag.
      return evaluateBooleanFlag(
        requirement,
        profile.epfdComplianceAttested,
        "EPFD attestation status",
        "EPFD compliance attested via ITU-R S.1503 calculation.",
        "EPFD compliance not attested — Article 22 violation potential.",
      );

    case "COORDINATION":
      return evaluateBooleanFlag(
        requirement,
        profile.ituCoordinationComplete,
        "ITU Article 9 coordination",
        "ITU Article 9 coordination is complete.",
        "ITU Article 9 coordination is not complete.",
      );

    case "NOTIFICATION_FILING":
      return evaluateBooleanFlag(
        requirement,
        profile.ituNotificationFiled,
        "ITU Article 11 notification",
        "ITU notification filed and on track for MIFR recording.",
        "ITU notification not filed — international protection unavailable.",
      );

    case "ANTENNA_PATTERN_COMPLIANCE":
      // ETSI standards rely on the S.580-6 sidelobe envelope; for entries
      // without an explicit X-pol threshold, fall back to the antenna flag.
      return evaluateBooleanFlag(
        requirement,
        profile.antennaPatternMeetsItuR580,
        "antenna pattern conformity to ITU-R S.580-6",
        "Earth-station antenna pattern meets ITU-R S.580-6 sidelobe envelope.",
        "Earth-station antenna pattern does not meet ITU-R S.580-6 envelope.",
      );

    case "EARTH_STATION_AUTH": // Earth-station auth requires presence of the relevant jurisdiction
    // in groundEarthStationCountries; if no ground equipment in scope
    // (e.g. all-orbit mission with no national gateway), the rule is
    // NOT_APPLICABLE; otherwise we require an explicit attestation.
    // We approximate via jurisdiction overlap.
    {
      const regimeCountries = mapRegimeToCountry(requirement.regime);
      const hasGroundStation = profile.groundEarthStationCountries.some((c) =>
        regimeCountries.includes(c.toUpperCase()),
      );
      if (!hasGroundStation) {
        return {
          requirement,
          status: "NOT_APPLICABLE",
          rationale: `${requirement.regime} earth-station auth does not apply: no ground earth station in ${regimeCountries.join("/")}.`,
        };
      }
      // We assume earth-station applications require an explicit licence;
      // pragmatically we return UNKNOWN unless the profile attests
      // antenna-pattern conformity, which is a strong proxy.
      return evaluateBooleanFlag(
        requirement,
        profile.antennaPatternMeetsItuR580,
        "earth-station antenna conformity",
        `Earth station in ${regimeCountries.join("/")} attests antenna conformity per ${requirement.regime}.`,
        `Earth station in ${regimeCountries.join("/")} does not attest antenna conformity per ${requirement.regime}.`,
      );
    }

    case "FREQUENCY_ALLOCATION":
      // No automated check; assumed-COMPLIANT if the operator declared
      // frequency bands at all (positive declaration of intent).
      if (profile.frequencyBands.length === 0) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate frequency-allocation conformity: no frequency bands declared.",
        };
      }
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `Frequency bands ${profile.frequencyBands.join(", ")} declared; allocation review assumed during licensing.`,
      };

    case "MILESTONE_DEPLOYMENT":
      // Threshold handled above; if no threshold defined, fall back to
      // requiring NGSO operators to attest milestone progress.
      if (!profile.hasNGSOSystem) {
        return {
          requirement,
          status: "NOT_APPLICABLE",
          rationale:
            "Milestone rule does not apply: no NGSO sub-system declared.",
        };
      }
      return {
        requirement,
        status: "UNKNOWN",
        rationale:
          "Milestone progress requires year-2/5/7 deployment data; not encoded in profile.",
      };

    case "AMATEUR_BAND_USE":
      // Reached only if Part 97 gate above let it through (isAmateurBand).
      return {
        requirement,
        status: "COMPLIANT",
        rationale:
          "Amateur-band operations declared; assumes licensee holds amateur radio operator licence and complies with IARU coordination.",
      };

    case "EXPERIMENTAL_LICENSE":
      // Reached only when isExperimental is true.
      return {
        requirement,
        status: "COMPLIANT",
        rationale:
          "Experimental Part 5 path declared; assumes 2-year licence with FCC and no commercial revenue operations.",
      };

    case "CYBER_HARDENING":
      // ETSI EN 303 645 — we don't have an explicit attestation flag,
      // so return UNKNOWN; UI can flag for expert review.
      return {
        requirement,
        status: "UNKNOWN",
        rationale:
          "Cyber-hardening (ETSI EN 303 645) attestation not encoded in profile; expert review required.",
      };

    default:
      // Other qualitative rules — UNKNOWN.
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Qualitative rule (${requirement.category}) requires expert evaluation; no automated check encoded.`,
      };
  }
}

/**
 * Best-effort regime→country mapping for earth-station auth checks.
 */
function mapRegimeToCountry(regime: SpectrumRegime): ReadonlyArray<string> {
  switch (regime) {
    case "FCC-PART-25":
    case "FCC-PART-5":
    case "FCC-PART-97":
      return ["US"];
    case "OFCOM-UK":
      return ["GB", "UK"];
    case "BNETZA":
      return ["DE"];
    case "ANFR-ARCEP":
      return ["FR"];
    case "ETSI":
    case "CEPT-ECC":
      return [
        "DE",
        "FR",
        "IT",
        "ES",
        "NL",
        "BE",
        "SE",
        "PL",
        "AT",
        "FI",
        "DK",
        "CH",
        "NO",
        "GB",
        "UK",
      ];
    default:
      return [];
  }
}

/**
 * Run a full spectrum / ITU coordination compliance check across all
 * rules in the dataset.
 */
export function checkSpectrumCompliance(
  profile: SatelliteSpectrumProfile,
): SpectrumComplianceReport {
  const results = SPECTRUM_REQUIREMENTS.map((requirement) =>
    evaluateSpectrumRequirement(requirement, profile),
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

  // Overall compliance: false if any MANDATORY rule is NON_COMPLIANT.
  const overallCompliant = !results.some(
    (r) =>
      r.status === "NON_COMPLIANT" &&
      r.requirement.bindingNature === "MANDATORY",
  );

  return {
    profile,
    results,
    summary,
    overallCompliant,
  };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
