/**
 * NOAA CRSRA + EU/UK Remote-Sensing Compliance Engine
 *
 * Takes a `RemoteSensingOperatorProfile` (the EO satellite operator's
 * regulatory-relevant attributes — sensor types, resolution, tier
 * classification, jurisdictions, personal-data risk, etc.) and
 * evaluates compliance against the NOAA CRSRA + NOAA tier + ITAR XV(e)
 * + EU GDPR + UK GISA-SIA + FR LOA + DE SatDSiG + IT Codice Privacy
 * requirements from `noaa-crsra-remote-sensing.ts`.
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
 * The engine is jurisdiction-aware: US → NOAA + ITAR; GB → UK-GISA-SIA
 * + (UK)GDPR; DE → DE-SATDSIG + EU-GDPR-EO; FR → FR-LOA-EO + EU-GDPR-
 * EO; IT → IT-CODICE-PRIVACY + EU-GDPR-EO. Other EU member states get
 * EU-GDPR-EO only.
 *
 * **Special path — Tier classification logic**:
 *   - If `hasNOAATier` is null/undefined AND operator is COMMERCIAL US,
 *     mark NOAA-960-6-TIER as NON_COMPLIANT with "missing classification"
 *     rationale. Tier is mandatory at application time.
 *   - If `hasNOAATier === 3` BUT `supportsShutterControl === false`,
 *     mark NOAA-960-SHUTTER-CONTROL as NON_COMPLIANT. Tier 3 operators
 *     must have shutter-control capability.
 *
 * **Special path — GDPR conditional rule**:
 *   - EU-GDPR-EO rules return NOT_APPLICABLE when
 *     `capturesPersonalData === false` (e.g. SAR-only or RF-only mission).
 *   - When `capturesPersonalData === true`, EU-GDPR-EO rules are
 *     evaluated as binding.
 *   - When high-res (≤30 cm) AND `capturesPersonalData === true` AND
 *     no documented Art. 6 lawful basis, EU-GDPR-EO-ART6-LAWFUL is
 *     NON_COMPLIANT.
 *
 * **Special path — ITAR overlay**:
 *   - Triggers when `itarOverlayPresent === true` (i.e. the operator
 *     exports controlled imaging hardware or technical data). When
 *     itarOverlayPresent is false, ITAR-XV-E rules are NOT_APPLICABLE.
 *
 * Pure function — no side effects, no DB access. Test-friendly. Server-
 * only since it consumes the regulatory dataset only on the server.
 */

import "server-only";

import {
  REMOTE_SENSING_REQUIREMENTS,
  type RemoteSensingRegime,
  type RemoteSensingRequirementEntry,
  type SensorType,
} from "@/data/trade/noaa-crsra-remote-sensing";

/** Inputs — the EO operator's regulatory-relevant profile. */
export interface RemoteSensingOperatorProfile {
  /** Sensor types the operator deploys (one or more). */
  sensorTypes: ReadonlyArray<SensorType>;

  /** Best ground sample distance achievable, in metres. */
  resolutionMeters: number;

  /** Whether the operator is commercial (vs government/academic). */
  isCommercialOperator: boolean;

  /**
   * For Tier 3 operators, the publication-delay applied to sensitive-
   * area imagery in hours. 0 = no delay applied; 24+ = compliant if
   * Tier 3 delay-only condition selected.
   */
  dataPublicationDelayHours?: number;

  /**
   * Whether the operator implements + enforces a documented sensitive-
   * area-exclusion (geofencing) policy.
   */
  hasSensitiveAreaExclusionPolicy?: boolean;

  /**
   * Whether the operator has technical + procedural shutter-control
   * capability (required for Tier 3 + NOAA-960-SHUTTER-CONTROL).
   */
  supportsShutterControl?: boolean;

  /**
   * Whether the operator publishes imagery globally (vs through
   * controlled channels). Used for foreign-sales review evaluation.
   */
  willPublishGloballly?: boolean;

  /**
   * Whether the operator will sell data to foreign-government buyers.
   * Used for NOAA + SatDSiG sensitivity-check evaluation.
   */
  willSellToForeignBuyers?: boolean;

  /** Jurisdictions where the operator is authorised (ISO-2 codes). */
  jurisdictions: ReadonlyArray<string>;

  /** Operator type. */
  operatorType: "COMMERCIAL" | "GOVERNMENT" | "ACADEMIC";

  /**
   * Whether the operator's data products contain personal data per
   * GDPR Art. 4(1). Required for GDPR analysis — true triggers Art. 6
   * + 9 analysis; false short-circuits GDPR rules as NOT_APPLICABLE.
   */
  capturesPersonalData: boolean;

  /**
   * Countries where the operator has ground stations / data-processing
   * facilities. Used for ITAR + UK + EU regime applicability.
   */
  groundStationCountries: ReadonlyArray<string>;

  /**
   * Declared NOAA tier classification (1, 2, 3, or null).
   * Null = no classification yet (triggers warning for US commercial
   * operators).
   */
  hasNOAATier: 1 | 2 | 3 | null;

  /**
   * Whether the operator's payload + tech-data is subject to ITAR XV(e)
   * controls (e.g. exports to non-US territory or non-US-person access).
   */
  itarOverlayPresent: boolean;

  /**
   * Whether the operator has documented an Art. 6 lawful basis
   * (legitimate interest assessment or other). Required for GDPR
   * Art. 6 evaluation when capturesPersonalData = true.
   */
  hasDocumentedArt6Basis?: boolean;

  /**
   * Whether the operator has performed + retained a GDPR Art. 35 DPIA
   * for the EO operations. Required for GDPR Art. 35 evaluation.
   */
  hasDPIA?: boolean;

  /**
   * Whether the operator has a documented data-retention policy + SOP
   * (required for IT-CODICE-PRIVACY-RETENTION + GDPR Art. 5(1)(e)).
   */
  hasRetentionPolicy?: boolean;

  /**
   * Data retention period applied to EO archives, in years. Used by
   * IT-CODICE-PRIVACY-RETENTION (≤2 years default cap).
   */
  dataRetentionYears?: number;
}

/** Per-requirement evaluation result. */
export type RemoteSensingRequirementStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export interface RemoteSensingRequirementResult {
  requirement: RemoteSensingRequirementEntry;
  status: RemoteSensingRequirementStatus;
  rationale: string;
}

export interface RemoteSensingComplianceReport {
  profile: RemoteSensingOperatorProfile;
  /** All requirements evaluated, in dataset order. */
  results: ReadonlyArray<RemoteSensingRequirementResult>;
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
 * Map a jurisdiction ISO-2 to the remote-sensing regimes that bind
 * operators there.
 */
const JURISDICTION_TO_REGIMES: Record<
  string,
  ReadonlyArray<RemoteSensingRegime>
> = {
  US: ["NOAA-CRSRA", "NOAA-TIER", "ITAR-XV-E"],
  GB: ["UK-GISA-SIA"],
  UK: ["UK-GISA-SIA"],
  DE: ["DE-SATDSIG", "EU-GDPR-EO"],
  FR: ["FR-LOA-EO", "EU-GDPR-EO"],
  IT: ["IT-CODICE-PRIVACY", "EU-GDPR-EO"],
  ES: ["EU-GDPR-EO"],
  NL: ["EU-GDPR-EO"],
  BE: ["EU-GDPR-EO"],
  SE: ["EU-GDPR-EO"],
  PL: ["EU-GDPR-EO"],
  AT: ["EU-GDPR-EO"],
  FI: ["EU-GDPR-EO"],
  DK: ["EU-GDPR-EO"],
};

/**
 * Check whether this requirement is "in scope" for this operator's
 * jurisdiction set.
 */
function inScopeForJurisdictions(
  requirement: RemoteSensingRequirementEntry,
  jurisdictions: ReadonlyArray<string>,
): boolean {
  if (jurisdictions.length === 0) {
    // No jurisdictions declared → include everything (most conservative).
    return true;
  }
  const applicableRegimes = new Set<RemoteSensingRegime>();
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
  requirement: RemoteSensingRequirementEntry,
  operatorType: RemoteSensingOperatorProfile["operatorType"],
): boolean {
  return (
    requirement.operatorScope.includes("ALL") ||
    requirement.operatorScope.includes(operatorType)
  );
}

/**
 * Check whether the requirement's sensor-type scope matches the
 * operator's sensor set.
 */
function appliesToSensors(
  requirement: RemoteSensingRequirementEntry,
  operatorSensors: ReadonlyArray<SensorType>,
): boolean {
  for (const s of operatorSensors) {
    if (requirement.applicableSensorTypes.includes(s)) return true;
  }
  return false;
}

/**
 * Special path — NOAA-960-6-TIER classification gating.
 * If operator is COMMERCIAL US and hasNOAATier is null, the rule fires
 * NON_COMPLIANT with a "missing classification" rationale. Tier
 * classification is required at application time.
 */
function evaluateTierClassificationRule(
  requirement: RemoteSensingRequirementEntry,
  profile: RemoteSensingOperatorProfile,
): RemoteSensingRequirementResult | undefined {
  if (requirement.code !== "NOAA-960-6-TIER") return undefined;

  const isCommercialUS =
    profile.jurisdictions.map((j) => j.toUpperCase()).includes("US") &&
    profile.operatorType === "COMMERCIAL";

  if (!isCommercialUS) {
    // Already handled by upstream jurisdiction/operator scoping. Let
    // the default flow continue.
    return undefined;
  }

  if (profile.hasNOAATier === null || profile.hasNOAATier === undefined) {
    return {
      requirement,
      status: "NON_COMPLIANT",
      rationale:
        "Commercial US operator has no declared NOAA tier classification — Tier 1/2/3 determination is required at application time per 15 CFR § 960.6.",
    };
  }

  return {
    requirement,
    status: "COMPLIANT",
    rationale: `NOAA Tier ${profile.hasNOAATier} classification declared.`,
  };
}

/**
 * Special path — shutter-control capability for Tier 3 operators.
 * If hasNOAATier === 3 AND supportsShutterControl === false → NON_COMPLIANT.
 */
function evaluateShutterControlRule(
  requirement: RemoteSensingRequirementEntry,
  profile: RemoteSensingOperatorProfile,
): RemoteSensingRequirementResult | undefined {
  if (requirement.code !== "NOAA-960-SHUTTER-CONTROL") return undefined;

  // Tier 3 operators must support shutter control.
  if (profile.hasNOAATier === 3) {
    if (profile.supportsShutterControl === false) {
      return {
        requirement,
        status: "NON_COMPLIANT",
        rationale:
          "Tier 3 operator does not have shutter-control capability — Tier 3 conditions mandate technical + procedural controls to comply with a shutter-control order on demand.",
      };
    }
    if (profile.supportsShutterControl === undefined) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale: "Tier 3 operator: shutter-control capability not declared.",
      };
    }
    return {
      requirement,
      status: "COMPLIANT",
      rationale: "Tier 3 operator with shutter-control capability declared.",
    };
  }

  // Non-Tier-3: shutter-control is a licence condition; without explicit
  // capability flag we return UNKNOWN as it's still expected as a
  // contingency reservation.
  if (profile.supportsShutterControl === undefined) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale: "Shutter-control capability not declared in operator profile.",
    };
  }
  return {
    requirement,
    status: profile.supportsShutterControl ? "COMPLIANT" : "NON_COMPLIANT",
    rationale: profile.supportsShutterControl
      ? "Shutter-control capability declared."
      : "Shutter-control capability NOT declared — required as a licence-condition reservation.",
  };
}

/**
 * Special path — Tier 3 conditional rules (resolution cap + delay +
 * exclusion). These only apply when the operator declares Tier 3.
 * If hasNOAATier !== 3, return NOT_APPLICABLE.
 */
function evaluateTier3ConditionalRule(
  requirement: RemoteSensingRequirementEntry,
  profile: RemoteSensingOperatorProfile,
): RemoteSensingRequirementResult | undefined {
  const tier3Codes = [
    "NOAA-TIER-3-CONDITIONS",
    "NOAA-TIER-3-RESOLUTION-CAP",
    "NOAA-TIER-3-DELAY",
    "NOAA-TIER-3-EXCLUSION",
  ];
  if (!tier3Codes.includes(requirement.code)) return undefined;

  // Non-Tier-3 operators don't trigger Tier 3 conditional rules.
  if (profile.hasNOAATier !== 3) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Tier 3 condition does not apply: operator is Tier ${profile.hasNOAATier ?? "(unclassified)"}.`,
    };
  }

  // Tier 3 specific evaluations
  if (requirement.code === "NOAA-TIER-3-DELAY") {
    if (profile.dataPublicationDelayHours === undefined) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale:
          "Tier 3 publication-delay rule: dataPublicationDelayHours not declared.",
      };
    }
    const pass = profile.dataPublicationDelayHours >= 24;
    return {
      requirement,
      status: pass ? "COMPLIANT" : "NON_COMPLIANT",
      rationale: pass
        ? `Tier 3 publication delay = ${profile.dataPublicationDelayHours} h meets ≥24 h condition.`
        : `Tier 3 publication delay = ${profile.dataPublicationDelayHours} h violates the ≥24 h licence condition.`,
    };
  }

  if (requirement.code === "NOAA-TIER-3-RESOLUTION-CAP") {
    // If resolution is at or below 25 cm (i.e. ≥0.25 m number-wise but
    // we use the >= operator since the rule fires at resolution ≥0.25 m
    // i.e. the operator's resolution number is small + sensitive).
    // The threshold is "applies when resolutionMeters ≥ 0.25" in the
    // sense "fine-resolution operators trigger the rule"; semantic
    // direction in this dataset is: operator must apply additional
    // mitigation when resolution is at or finer than 25 cm.
    // We treat:
    //   - resolutionMeters > 0.25 → rule NOT actively triggered → COMPLIANT
    //   - resolutionMeters ≤ 0.25 → rule triggered → operator needs either
    //     a delay or an exclusion policy declared.
    if (profile.resolutionMeters > 0.25) {
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `Resolution ${profile.resolutionMeters} m > 25 cm — Tier 3 resolution-cap mitigation not triggered.`,
      };
    }
    // Below 25 cm: need either delay OR exclusion.
    const hasDelay =
      profile.dataPublicationDelayHours !== undefined &&
      profile.dataPublicationDelayHours >= 24;
    const hasExclusion = profile.hasSensitiveAreaExclusionPolicy === true;
    if (hasDelay || hasExclusion) {
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `Resolution ${profile.resolutionMeters} m at or finer than 25 cm — mitigation in place (${hasDelay ? "delay" : ""}${hasDelay && hasExclusion ? " + " : ""}${hasExclusion ? "exclusion policy" : ""}).`,
      };
    }
    return {
      requirement,
      status: "NON_COMPLIANT",
      rationale: `Resolution ${profile.resolutionMeters} m at or finer than 25 cm but no Tier 3 mitigation declared (no ≥24 h delay AND no sensitive-area-exclusion policy).`,
    };
  }

  if (requirement.code === "NOAA-TIER-3-EXCLUSION") {
    if (profile.hasSensitiveAreaExclusionPolicy === undefined) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale:
          "Tier 3 sensitive-area exclusion policy: not declared in profile.",
      };
    }
    return {
      requirement,
      status: profile.hasSensitiveAreaExclusionPolicy
        ? "COMPLIANT"
        : "NON_COMPLIANT",
      rationale: profile.hasSensitiveAreaExclusionPolicy
        ? "Tier 3 sensitive-area-exclusion policy declared."
        : "Tier 3 operator without declared sensitive-area-exclusion policy — required per Tier 3 specific conditions.",
    };
  }

  // NOAA-TIER-3-CONDITIONS umbrella rule: apply if operator is Tier 3.
  return {
    requirement,
    status: "COMPLIANT",
    rationale:
      "Tier 3 conditions framework acknowledged; individual conditions evaluated separately.",
  };
}

/**
 * Special path — GDPR conditional rules.
 * EU-GDPR-EO rules return NOT_APPLICABLE when capturesPersonalData=false.
 * When personal-data + Art.6 not documented + high-res, return
 * NON_COMPLIANT.
 */
function evaluateGdprRule(
  requirement: RemoteSensingRequirementEntry,
  profile: RemoteSensingOperatorProfile,
): RemoteSensingRequirementResult | undefined {
  if (requirement.regime !== "EU-GDPR-EO") return undefined;

  // If sensor cannot capture personal data, GDPR doesn't apply.
  if (!profile.capturesPersonalData) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale:
        "Sensor configuration / mission profile does not capture personal data — GDPR processing rules not engaged.",
    };
  }

  // Personal-data threshold check
  if (requirement.code === "EU-GDPR-EO-PERSONAL-DATA") {
    const isHighRes = profile.resolutionMeters <= 0.3;
    return {
      requirement,
      status: isHighRes ? "NON_COMPLIANT" : "COMPLIANT",
      rationale: isHighRes
        ? `Resolution ${profile.resolutionMeters} m ≤ 30 cm + personal data captured — high re-identification risk per EDPB Guidelines 03/2024; full GDPR framework required (notice, ROPA, Art. 5-7 principles).`
        : `Resolution ${profile.resolutionMeters} m > 30 cm — below personal-data re-identification threshold.`,
    };
  }

  // Art. 6 lawful basis
  if (requirement.code === "EU-GDPR-EO-ART6-LAWFUL") {
    if (profile.hasDocumentedArt6Basis === undefined) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale:
          "hasDocumentedArt6Basis not declared; cannot evaluate Art. 6 lawful basis.",
      };
    }
    // High-res + personal data + no documented Art.6 basis → NON_COMPLIANT.
    if (
      profile.resolutionMeters <= 0.3 &&
      profile.hasDocumentedArt6Basis === false
    ) {
      return {
        requirement,
        status: "NON_COMPLIANT",
        rationale: `Resolution ${profile.resolutionMeters} m ≤ 30 cm + personal data captured + no documented Art. 6 lawful basis (LIA) — direct GDPR Art. 6 violation.`,
      };
    }
    return {
      requirement,
      status: profile.hasDocumentedArt6Basis ? "COMPLIANT" : "NON_COMPLIANT",
      rationale: profile.hasDocumentedArt6Basis
        ? "Documented Art. 6 lawful basis (LIA or other) present."
        : "No documented Art. 6 lawful basis — required for any GDPR processing of personal data.",
    };
  }

  // Art. 9 biometric — only triggered at high-res + personal data
  if (requirement.code === "EU-GDPR-EO-ART9-BIOMETRIC") {
    if (profile.resolutionMeters > 0.3) {
      return {
        requirement,
        status: "NOT_APPLICABLE",
        rationale: `Resolution ${profile.resolutionMeters} m > 30 cm — biometric inference not feasible; Art. 9 not engaged.`,
      };
    }
    return {
      requirement,
      status: "NON_COMPLIANT",
      rationale: `Resolution ${profile.resolutionMeters} m ≤ 30 cm + personal-data capture risk — high biometric-inference risk per EDPB Guidelines 03/2024; Art. 9 explicit-consent / substantial-public-interest basis required. Defaults to NON_COMPLIANT pending Art. 9(2) lawful basis declaration.`,
    };
  }

  // DPIA — required when high-risk processing
  if (requirement.code === "EU-GDPR-EO-DPIA") {
    if (profile.hasDPIA === undefined) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale: "hasDPIA not declared in profile.",
      };
    }
    return {
      requirement,
      status: profile.hasDPIA ? "COMPLIANT" : "NON_COMPLIANT",
      rationale: profile.hasDPIA
        ? "Art. 35 DPIA performed + retained."
        : "No Art. 35 DPIA performed — required for systematic large-scale EO monitoring.",
    };
  }

  return undefined;
}

/**
 * Special path — ITAR XV(e) overlay.
 * ITAR-XV-E rules return NOT_APPLICABLE if itarOverlayPresent === false.
 */
function evaluateItarRule(
  requirement: RemoteSensingRequirementEntry,
  profile: RemoteSensingOperatorProfile,
): RemoteSensingRequirementResult | undefined {
  if (requirement.regime !== "ITAR-XV-E") return undefined;

  if (!profile.itarOverlayPresent) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale:
        "ITAR XV(e) overlay does not apply: itarOverlayPresent=false in operator profile.",
    };
  }

  // ITAR present + relevant sensor → COMPLIANT (we assume the operator
  // maintains DDTC licensing infrastructure if itarOverlayPresent=true).
  // A more granular profile could carry license-status flags.
  return {
    requirement,
    status: "COMPLIANT",
    rationale: `ITAR XV(e) overlay declared; DDTC licensing infrastructure assumed in place for ${requirement.code}.`,
  };
}

/**
 * Special path — DE SatDSiG sensitivity check.
 * DE-SATDSIG-1-LICENSE has a threshold of 2.5 m: when resolution is
 * finer than 2.5 m, the operator falls into the "high-grade" regime
 * requiring SatDSiG licence.
 */
function evaluateSatDsigRule(
  requirement: RemoteSensingRequirementEntry,
  profile: RemoteSensingOperatorProfile,
): RemoteSensingRequirementResult | undefined {
  if (requirement.code !== "DE-SATDSIG-1-LICENSE") return undefined;

  // Threshold semantic: resolution ≤ 2.5 m = high-grade = licence required.
  if (profile.resolutionMeters <= 2.5) {
    return {
      requirement,
      status: "COMPLIANT",
      rationale: `Resolution ${profile.resolutionMeters} m ≤ 2.5 m falls into high-grade SatDSiG scope — licence required + assumed obtained for German operator.`,
    };
  }
  return {
    requirement,
    status: "NOT_APPLICABLE",
    rationale: `Resolution ${profile.resolutionMeters} m > 2.5 m — outside SatDSiG high-grade scope.`,
  };
}

/**
 * Special path — IT data-retention rule.
 */
function evaluateItRetentionRule(
  requirement: RemoteSensingRequirementEntry,
  profile: RemoteSensingOperatorProfile,
): RemoteSensingRequirementResult | undefined {
  if (requirement.code !== "IT-CODICE-PRIVACY-RETENTION") return undefined;

  if (!profile.capturesPersonalData) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale:
        "Italian retention cap does not apply: no personal data captured.",
    };
  }
  if (profile.dataRetentionYears === undefined) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale: "dataRetentionYears not declared in profile.",
    };
  }
  const pass = profile.dataRetentionYears <= 2;
  return {
    requirement,
    status: pass ? "COMPLIANT" : "NON_COMPLIANT",
    rationale: pass
      ? `Retention ${profile.dataRetentionYears} y ≤ 2 y Italian default cap.`
      : `Retention ${profile.dataRetentionYears} y > 2 y Italian default cap — requires explicit re-justification (Garante Decision 9982214/2024).`,
  };
}

/**
 * Evaluate a single remote-sensing requirement against the operator
 * profile. Returns COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE / UNKNOWN.
 */
export function evaluateRemoteSensingRequirement(
  requirement: RemoteSensingRequirementEntry,
  profile: RemoteSensingOperatorProfile,
): RemoteSensingRequirementResult {
  // Operator-type scoping
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

  // Sensor-type scoping
  if (!appliesToSensors(requirement, profile.sensorTypes)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule scoped to sensors [${requirement.applicableSensorTypes.join(", ")}]; operator deploys [${profile.sensorTypes.join(", ")}].`,
    };
  }

  // Special paths (evaluated in order — first non-undefined wins)
  const itarResult = evaluateItarRule(requirement, profile);
  if (itarResult) return itarResult;

  const gdprResult = evaluateGdprRule(requirement, profile);
  if (gdprResult) return gdprResult;

  const tierClassResult = evaluateTierClassificationRule(requirement, profile);
  if (tierClassResult) return tierClassResult;

  const shutterResult = evaluateShutterControlRule(requirement, profile);
  if (shutterResult) return shutterResult;

  const tier3Result = evaluateTier3ConditionalRule(requirement, profile);
  if (tier3Result) return tier3Result;

  const satDsigResult = evaluateSatDsigRule(requirement, profile);
  if (satDsigResult) return satDsigResult;

  const itRetentionResult = evaluateItRetentionRule(requirement, profile);
  if (itRetentionResult) return itRetentionResult;

  // Generic threshold evaluation (for any remaining threshold-bearing
  // rules not specially handled).
  if (requirement.threshold) {
    const param = requirement.threshold.parameter;
    const actual = (profile as unknown as Record<string, number | undefined>)[
      param
    ];
    if (actual === undefined || actual === null) {
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Cannot evaluate: operator profile is missing field "${param}".`,
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

  // Qualitative fallback by category
  switch (requirement.category) {
    case "LICENSE_REQUIRED":
      // We assume the operator has the licence if jurisdiction + sensor
      // scope match. A more granular profile could carry licence-status
      // flags per regime.
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `Licence regime ${requirement.regime} applicable; assumed obtained for in-scope operator.`,
      };

    case "INTERAGENCY_REVIEW":
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `Interagency review path acknowledged; review conducted at licensing stage by ${requirement.regime}.`,
      };

    case "FOREIGN_SALES_REVIEW":
      if (profile.willSellToForeignBuyers === undefined) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale: "willSellToForeignBuyers not declared in profile.",
        };
      }
      if (!profile.willSellToForeignBuyers) {
        return {
          requirement,
          status: "NOT_APPLICABLE",
          rationale:
            "Foreign-sales review not engaged: operator does not sell to foreign buyers.",
        };
      }
      return {
        requirement,
        status: "COMPLIANT",
        rationale:
          "Foreign-sales review path acknowledged; DOS/BMWK/ASI concurrence assumed at sales stage.",
      };

    case "NOTIFICATION_REQ":
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `Notification requirement acknowledged for ${requirement.regime}.`,
      };

    case "EXPORT_OVERLAY":
      // ITAR-XV-E export-overlay handled by evaluateItarRule above.
      // FR-LOA-EXPORT-OVERLAY and similar: applies when operator
      // exports beyond home jurisdiction.
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `Export-overlay regime ${requirement.regime} acknowledged; licensing assumed in place at export stage.`,
      };

    case "DATA_PUBLICATION_DELAY":
    case "SENSITIVE_AREA_EXCLUSION":
    case "SHUTTER_CONTROL":
      // Handled by Tier 3 + shutter-control special paths above.
      // Falling through here means the rule wasn't a Tier 3 entry and
      // wasn't shutter-control — generic acknowledgement.
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `${requirement.category} acknowledged for ${requirement.regime}.`,
      };

    case "MODIFICATION_TRANSFER":
    case "ENFORCEMENT_PENALTY":
      // Operator-facing rules: penalty is a backstop, not actively-met
      // by the operator profile. Always COMPLIANT-by-default.
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `${requirement.category} provision acknowledged; operator subject to authority of ${requirement.regime}.`,
      };

    default:
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Qualitative rule (${requirement.category}) requires expert evaluation; no automated check encoded.`,
      };
  }
}

/**
 * Run a full remote-sensing compliance check across all rules in the
 * dataset.
 */
export function checkRemoteSensingCompliance(
  profile: RemoteSensingOperatorProfile,
): RemoteSensingComplianceReport {
  const results = REMOTE_SENSING_REQUIREMENTS.map((requirement) =>
    evaluateRemoteSensingRequirement(requirement, profile),
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
