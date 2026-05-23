/**
 * Cyber Baseline Compliance Engine
 *
 * Takes a `CyberPostureProfile` (the operator's cybersecurity attributes —
 * segments, vulnerability disclosure, default-credential removal, signed
 * firmware, TLS, incident-reporting cadence, supply-chain plan, COMSEC,
 * PNT integrity, jurisdictions, operator type, NIS2 essential-entity
 * status, US-Gov-contractor status, penetration-testing frequency) and
 * evaluates compliance against the ETSI EN 303 645 + NIS2 + NIST SP
 * 800-53 + SPD-5 + ENISA + BSI + CISA + industry-consensus requirements
 * from `cyber-baseline-space-iot.ts`.
 *
 * Status output per requirement:
 *   - COMPLIANT       — Profile satisfies the threshold or qualitative rule
 *   - NON_COMPLIANT   — Profile violates the threshold or required clause
 *   - NOT_APPLICABLE  — Rule does not apply to this segment/regime/jurisdiction
 *   - UNKNOWN         — Profile lacks the data needed to evaluate
 *
 * Returns a structured report that the UI / API layer can render or the
 * Astra tool can consume.
 *
 * The engine is jurisdiction-aware: it filters MANDATORY + HARMONISED +
 * BASELINE requirements to those that bind operators in the declared
 * jurisdiction(s). Industry consensus + ENISA + CISA guidelines are
 * advisory and surface across all jurisdictions where the regime
 * applies, but never break overall compliance.
 *
 * Special path — **NIS2 essential-entity gating**: NIS2 rules only
 * apply when `isNIS2Essential=true`; otherwise the entry resolves to
 * NOT_APPLICABLE. This protects out-of-scope operators (e.g. a hobby
 * cubesat builder that's not on the Annex II.6 list) from being
 * flagged as non-compliant against an obligation that does not bind
 * them. The threshold-based NIS2 rules (24h, 72h, 1mo) collapse to
 * NOT_APPLICABLE when this flag is false.
 *
 * Special path — **SPD-5 US-Gov-Contractor gating**: SPD-5 rules only
 * apply when `isUsGovContractor=true`. SPD-5 binds USG missions
 * directly + commercial integrators ONLY through FAR / DFARS flow-
 * down clauses. A purely-commercial operator without USG contracts
 * sees SPD-5 entries as NOT_APPLICABLE.
 *
 * Special path — **Incident-reporting timeline check**: the NIS2 24h
 * early-warning rule is evaluated against `incidentReportingPlannedHours`;
 * the operator's planned cadence MUST be ≤24 hours. Values >24 are
 * NON_COMPLIANT. The 72h follow-up uses `incidentFollowupPlannedHours`
 * (must ≤72); the 1-month final report uses
 * `incidentFinalReportPlannedMonths` (must ≤1).
 *
 * Special path — **Segment scoping**: rules scoped only to GROUND_SEGMENT
 * return NOT_APPLICABLE when the operator declares NO ground-segment
 * applicability (e.g. spectrum-only resellers). Similarly for
 * SPACE_SEGMENT, LINK_SEGMENT, USER_SEGMENT, SUPPLY_CHAIN. If the
 * operator's `applicableSegments` intersects with the rule's
 * `applicableSegments`, the rule is in scope.
 *
 * Pure function — no side effects, no DB access. Test-friendly. Server-
 * only since it consumes the regulatory dataset only on the server.
 */

import "server-only";

import {
  CYBER_BASELINE_REQUIREMENTS,
  type CyberRegime,
  type CyberRequirementEntry,
  type SpaceSegment,
} from "@/data/comply/cyber-baseline-space-iot";

/** Inputs — the operator's cyber posture profile. */
export interface CyberPostureProfile {
  /**
   * Segments to which the operator's system is exposed. A rule is
   * in scope only when this set intersects with the rule's
   * `applicableSegments` set.
   */
  applicableSegments: ReadonlyArray<SpaceSegment>;

  /**
   * Whether the operator publishes a coordinated vulnerability
   * disclosure policy (ETSI § 5.2).
   */
  hasVulnerabilityDisclosurePolicy?: boolean;

  /**
   * Whether the operator's devices ship with universal default
   * credentials removed (ETSI § 5.1).
   */
  defaultCredentialsRemoved?: boolean;

  /**
   * Whether the operator's firmware update path is signed +
   * verified at boot (ETSI § 5.3 + § 5.7).
   */
  firmwareSignatureVerification?: boolean;

  /**
   * Whether the operator enforces TLS 1.2+ on all device-to-cloud +
   * device-to-device communications (ETSI § 5.5).
   */
  tlsEnabled?: boolean;

  /**
   * Operator's planned cadence for the NIS2 24-hour early-warning
   * notification, in hours from incident awareness. Must be ≤ 24.
   */
  incidentReportingPlannedHours?: number;

  /**
   * Operator's planned cadence for the NIS2 72-hour follow-up
   * notification, in hours. Must be ≤ 72. Defaults to undefined
   * (UNKNOWN).
   */
  incidentFollowupPlannedHours?: number;

  /**
   * Operator's planned cadence for the NIS2 1-month final report,
   * in months from incident awareness. Must be ≤ 1.
   */
  incidentFinalReportPlannedMonths?: number;

  /**
   * Whether the operator has a documented supply-chain risk-
   * management plan (SPD-5 § 4(f) / NIS2 Art. 21).
   */
  supplyChainRiskMgmtPlan?: boolean;

  /**
   * Whether COMSEC encryption is enabled on all TT&C + command
   * channels (SPD-5 § 4(d) / BSI SYS.4.3).
   */
  comsecEnabled?: boolean;

  /**
   * Whether the operator implements PNT-integrity checks (anti-
   * spoofing, multi-source correlation, SBAS-aided, RAIM) for any
   * PNT consumption (NIST IR 8270, SPD-5 § 4(e)).
   */
  pntIntegrityChecks?: boolean;

  /** Jurisdictions under which the operator is licensed (ISO-2 codes). */
  jurisdictions: ReadonlyArray<string>;

  /** Operator type. */
  operatorType: "COMMERCIAL" | "GOVERNMENT" | "ACADEMIC" | "CRITICAL_INFRA";

  /**
   * Whether the operator is designated as an Essential or Important
   * entity under NIS2 transposition. False / undefined means out-of-
   * scope; NIS2 rules will resolve NOT_APPLICABLE.
   */
  isNIS2Essential?: boolean;

  /**
   * Whether the operator is a US Government contractor whose space
   * system is incorporated into a USG mission via FAR / DFARS flow-
   * down. False / undefined means SPD-5 NOT_APPLICABLE.
   */
  isUsGovContractor?: boolean;

  /**
   * Operator's penetration-testing frequency in months between
   * tests. Used as a NIS2 Art. 21 quality proxy + CISA RESPOND
   * proxy. Typical industry benchmark is ≤12 months.
   */
  penetrationTestingFrequencyMonths?: number;

  /**
   * Number of ETSI EN 303 645 mandatory provisions implemented (out
   * of 33). Used to evaluate the ETSI-303-645-PROVISION-COUNT rule.
   */
  etsiMandatoryProvisionsImplemented?: number;

  /**
   * Whether the operator has registered with the national CSIRT /
   * ENISA registry (NIS2 Art. 27 / BSI IT-SiG § 8b).
   */
  hasCSIRTRegistration?: boolean;

  /**
   * Whether the operator participates in threat-intel sharing
   * (Space-ISAC / ENISA TIS / BSI MICS).
   */
  participatesInThreatIntelSharing?: boolean;
}

/** Per-requirement evaluation result. */
export type CyberRequirementStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export interface CyberRequirementResult {
  requirement: CyberRequirementEntry;
  status: CyberRequirementStatus;
  rationale: string;
}

export interface CyberComplianceReport {
  profile: CyberPostureProfile;
  /** All requirements evaluated, in dataset order. */
  results: ReadonlyArray<CyberRequirementResult>;
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

// ============================================================================
// Jurisdiction scoping
// ============================================================================

/**
 * Map a jurisdiction ISO-2 to the cyber regimes that bind operators
 * there. Industry-consensus standards and ENISA / CISA guidelines
 * are advisory; their applicability flows through here only as
 * relevant to the operator's primary cyber footprint.
 */
const JURISDICTION_TO_REGIMES: Record<string, ReadonlyArray<CyberRegime>> = {
  US: ["NIST-SP-800-53", "US-SPD-5", "CISA-SSCC", "INDUSTRY-CONSENSUS"],
  GB: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  UK: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  DE: [
    "ETSI-EN-303-645",
    "NIS2",
    "BSI-IT-GRUNDSCHUTZ",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  FR: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  IT: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  ES: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  NL: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  BE: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  SE: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  PL: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  AT: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  FI: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  DK: [
    "ETSI-EN-303-645",
    "NIS2",
    "ENISA-THREAT-LANDSCAPE",
    "INDUSTRY-CONSENSUS",
  ],
  CH: ["ETSI-EN-303-645", "INDUSTRY-CONSENSUS"],
  NO: ["ETSI-EN-303-645", "INDUSTRY-CONSENSUS"],
  JP: ["INDUSTRY-CONSENSUS"],
};

/**
 * Check whether this requirement is "in scope" for this operator's
 * jurisdiction set. ENISA + CISA + industry-consensus standards
 * surface where jurisdictions match, but their advisory nature is
 * reflected in `bindingNature` rather than scope.
 */
function inScopeForJurisdictions(
  requirement: CyberRequirementEntry,
  jurisdictions: ReadonlyArray<string>,
): boolean {
  if (jurisdictions.length === 0) {
    // No jurisdictions declared → include everything (most conservative).
    return true;
  }
  const applicableRegimes = new Set<CyberRegime>();
  for (const j of jurisdictions) {
    const regimes = JURISDICTION_TO_REGIMES[j.toUpperCase()] ?? [];
    for (const r of regimes) {
      applicableRegimes.add(r);
    }
  }
  return applicableRegimes.has(requirement.regime);
}

/** Check whether the requirement applies to this operator type. */
function appliesToOperator(
  requirement: CyberRequirementEntry,
  operatorType: CyberPostureProfile["operatorType"],
): boolean {
  return (
    requirement.operatorScope.includes("ALL") ||
    requirement.operatorScope.includes(operatorType)
  );
}

/**
 * Check whether the requirement's segment scope intersects with the
 * operator's declared segments. A rule applies if at least one of
 * its `applicableSegments` is in the operator's profile.
 */
function appliesToSegments(
  requirement: CyberRequirementEntry,
  applicableSegments: ReadonlyArray<SpaceSegment>,
): boolean {
  if (applicableSegments.length === 0) {
    // No segments declared → conservative include
    return true;
  }
  const operatorSet = new Set(applicableSegments);
  return requirement.applicableSegments.some((seg) => operatorSet.has(seg));
}

// ============================================================================
// Special-path rule evaluators
// ============================================================================

/**
 * NIS2 essential-entity gating: NIS2 rules apply ONLY when
 * `isNIS2Essential=true`. If the operator is out-of-scope (false /
 * undefined), the rule resolves to NOT_APPLICABLE.
 */
function evaluateNIS2Gating(
  requirement: CyberRequirementEntry,
  profile: CyberPostureProfile,
): CyberRequirementResult | undefined {
  if (requirement.regime !== "NIS2") return undefined;
  if (!profile.isNIS2Essential) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale:
        "NIS2 rules apply only to designated essential / important " +
        "entities (per national Annex II.6 transposition). Operator " +
        "is not flagged as isNIS2Essential.",
    };
  }
  return undefined;
}

/**
 * SPD-5 US-Gov-Contractor gating: SPD-5 rules apply ONLY when the
 * operator is a USG contractor whose space system flows through FAR
 * / DFARS clauses. Otherwise NOT_APPLICABLE.
 */
function evaluateSPD5Gating(
  requirement: CyberRequirementEntry,
  profile: CyberPostureProfile,
): CyberRequirementResult | undefined {
  if (requirement.regime !== "US-SPD-5") return undefined;
  if (!profile.isUsGovContractor) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale:
        "SPD-5 binds US Government missions + flow-down contractors only. " +
        "Operator is not flagged as isUsGovContractor.",
    };
  }
  return undefined;
}

/**
 * Evaluate a boolean attestation flag — returns UNKNOWN if undefined,
 * else COMPLIANT/NON_COMPLIANT per truthiness.
 */
function evaluateBooleanFlag(
  requirement: CyberRequirementEntry,
  flagValue: boolean | undefined,
  flagDescription: string,
  positiveOutcome: string,
  negativeOutcome: string,
): CyberRequirementResult {
  if (flagValue === undefined) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale: `Cannot evaluate: ${flagDescription} not declared in cyber posture profile.`,
    };
  }
  return {
    requirement,
    status: flagValue ? "COMPLIANT" : "NON_COMPLIANT",
    rationale: flagValue ? positiveOutcome : negativeOutcome,
  };
}

// ============================================================================
// Core evaluator
// ============================================================================

/**
 * Evaluate a single cyber requirement against the profile.
 * Returns COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE / UNKNOWN.
 */
export function evaluateCyberRequirement(
  requirement: CyberRequirementEntry,
  profile: CyberPostureProfile,
): CyberRequirementResult {
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

  // Segment scoping
  if (!appliesToSegments(requirement, profile.applicableSegments)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule scoped to segments [${requirement.applicableSegments.join(", ")}]; operator declares segments [${profile.applicableSegments.join(", ")}].`,
    };
  }

  // Special path — NIS2 essential-entity gating
  const nis2Result = evaluateNIS2Gating(requirement, profile);
  if (nis2Result) return nis2Result;

  // Special path — SPD-5 US-Gov-Contractor gating
  const spd5Result = evaluateSPD5Gating(requirement, profile);
  if (spd5Result) return spd5Result;

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
        rationale: `Cannot evaluate: cyber posture profile is missing field "${param}".`,
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
    case "VULNERABILITY_DISCLOSURE":
      return evaluateBooleanFlag(
        requirement,
        profile.hasVulnerabilityDisclosurePolicy,
        "vulnerability disclosure policy",
        "Coordinated vulnerability disclosure policy published + maintained.",
        "Vulnerability disclosure policy NOT published — ETSI § 5.2 violation.",
      );

    case "PASSWORD_MGMT":
      return evaluateBooleanFlag(
        requirement,
        profile.defaultCredentialsRemoved,
        "removal of universal default credentials",
        "Default credentials removed; per-device unique credentials in use.",
        "Universal default credentials present — ETSI § 5.1 violation.",
      );

    case "SOFTWARE_UPDATES":
    case "INTEGRITY_VERIFICATION":
      return evaluateBooleanFlag(
        requirement,
        profile.firmwareSignatureVerification,
        "firmware signature verification (secure boot + signed updates)",
        "Signed firmware updates + secure-boot chain validated at startup.",
        "Firmware signature verification NOT enabled — ETSI § 5.3 / § 5.7 violation.",
      );

    case "SECURE_COMMS":
      return evaluateBooleanFlag(
        requirement,
        profile.tlsEnabled,
        "TLS 1.2+ on device-to-cloud + device-to-device communications",
        "Best-practice cryptography (TLS 1.2+) enforced on all comms channels.",
        "TLS not enforced (or weak / deprecated cipher in use) — ETSI § 5.5 violation.",
      );

    case "COMSEC":
      return evaluateBooleanFlag(
        requirement,
        profile.comsecEnabled,
        "COMSEC encryption on TT&C + command channels",
        "COMSEC encryption + authentication enforced on all command channels.",
        "COMSEC NOT enforced on TT&C / command channels — SPD-5 § 4(d) violation.",
      );

    case "PNT_INTEGRITY":
      return evaluateBooleanFlag(
        requirement,
        profile.pntIntegrityChecks,
        "PNT-integrity / anti-spoofing checks",
        "PNT integrity checks (multi-source correlation, RAIM, anti-spoofing) implemented.",
        "PNT integrity checks NOT implemented — NIST IR 8270 / SPD-5 § 4(e) violation.",
      );

    case "SUPPLY_CHAIN":
      return evaluateBooleanFlag(
        requirement,
        profile.supplyChainRiskMgmtPlan,
        "supply-chain risk-management plan",
        "Supply-chain risk-management plan documented + maintained.",
        "Supply-chain risk-management plan NOT documented — SPD-5 § 4(f) / NIS2 Art. 21(2)(d) violation.",
      );

    case "REGISTRATION":
      return evaluateBooleanFlag(
        requirement,
        profile.hasCSIRTRegistration,
        "national CSIRT / ENISA registration",
        "Operator registered with national CSIRT + ENISA registry.",
        "CSIRT / ENISA registration NOT declared — NIS2 Art. 27 obligation.",
      );

    case "THREAT_INTEL":
      // ENISA threat-landscape entries are advisory; we evaluate as
      // COMPLIANT when the operator participates in threat-intel
      // sharing, UNKNOWN otherwise.
      if (profile.participatesInThreatIntelSharing === undefined) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Threat-intel-sharing participation not declared (Space-ISAC / ENISA TIS / BSI MICS); ENISA advisory.",
        };
      }
      return {
        requirement,
        status: profile.participatesInThreatIntelSharing
          ? "COMPLIANT"
          : "NON_COMPLIANT",
        rationale: profile.participatesInThreatIntelSharing
          ? "Operator participates in threat-intel sharing fora (Space-ISAC / ENISA TIS / BSI MICS)."
          : "Operator does NOT participate in threat-intel sharing — ENISA advisory recommendation unmet.",
      };

    case "RISK_MGMT":
    case "ACCESS_CONTROL":
    case "AUDIT_LOGGING":
    case "CONFIG_MGMT":
    case "CONTINGENCY":
    case "IDENTIFICATION_AUTH":
    case "INCIDENT_RESPONSE":
    case "PHYSICAL_PROTECTION":
    case "SYSTEM_INTEGRITY":
    case "GROUND_STATION_PROTECTION":
    case "TT_AND_C_SECURITY":
      // These are doctrinal / process rules. We use penetration-testing
      // frequency as a proxy when available; otherwise UNKNOWN.
      if (profile.penetrationTestingFrequencyMonths === undefined) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale: `Qualitative ${requirement.category} rule cannot be auto-evaluated; declare penetrationTestingFrequencyMonths or perform expert review.`,
        };
      }
      // Industry benchmark: pen-test ≤12 months
      if (profile.penetrationTestingFrequencyMonths > 12) {
        return {
          requirement,
          status: "NON_COMPLIANT",
          rationale: `Pen-testing frequency ${profile.penetrationTestingFrequencyMonths} months exceeds 12-month industry benchmark; ${requirement.category} attestation insufficient.`,
        };
      }
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `Pen-testing frequency ${profile.penetrationTestingFrequencyMonths} months ≤ 12-month benchmark; ${requirement.category} attestation accepted (proxy).`,
      };

    case "DATA_PROTECTION":
      // GDPR-alignment proxy: declared TLS + signed firmware combined
      // = baseline data-protection. Treat as UNKNOWN if either is undef.
      if (
        profile.tlsEnabled === undefined ||
        profile.firmwareSignatureVerification === undefined
      ) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate data-protection: tlsEnabled and/or firmwareSignatureVerification not declared.",
        };
      }
      if (profile.tlsEnabled && profile.firmwareSignatureVerification) {
        return {
          requirement,
          status: "COMPLIANT",
          rationale:
            "Data-protection baseline met: TLS + signed firmware enabled (proxy for ETSI § 5.8 + GDPR Art. 32).",
        };
      }
      return {
        requirement,
        status: "NON_COMPLIANT",
        rationale:
          "Data-protection baseline NOT met: TLS or signed firmware missing (ETSI § 5.8 / GDPR Art. 32 violation).",
      };

    case "RESILIENCE":
      // Resilience is a design-level rule. We use participation in
      // threat-intel + signed firmware as a proxy; UNKNOWN otherwise.
      if (profile.firmwareSignatureVerification === undefined) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate resilience: firmwareSignatureVerification not declared.",
        };
      }
      return {
        requirement,
        status: profile.firmwareSignatureVerification
          ? "COMPLIANT"
          : "NON_COMPLIANT",
        rationale: profile.firmwareSignatureVerification
          ? "Resilience baseline met: signed firmware + verified boot enables graceful recovery."
          : "Resilience baseline NOT met: signed firmware + verified boot are prerequisites (ETSI § 5.9).",
      };

    case "TELEMETRY_MONITORING":
      // Telemetry monitoring proxy: pen-testing frequency + threat-
      // intel sharing both present indicates active monitoring.
      if (
        profile.penetrationTestingFrequencyMonths === undefined ||
        profile.participatesInThreatIntelSharing === undefined
      ) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate telemetry monitoring: penTestingFrequencyMonths / participatesInThreatIntelSharing not declared.",
        };
      }
      if (
        profile.penetrationTestingFrequencyMonths <= 12 &&
        profile.participatesInThreatIntelSharing
      ) {
        return {
          requirement,
          status: "COMPLIANT",
          rationale:
            "Telemetry monitoring baseline met: pen-testing ≤12mo + threat-intel sharing active (ETSI § 5.10 / NIST SI-4).",
        };
      }
      return {
        requirement,
        status: "NON_COMPLIANT",
        rationale:
          "Telemetry monitoring baseline NOT met: pen-testing frequency >12mo or threat-intel sharing inactive.",
      };

    case "ATTACK_SURFACE_REDUCTION":
      // ETSI § 5.6 — disable unused interfaces. Proxy via TLS + firmware
      // signature combined; truly required is hardening attestation
      // outside profile scope.
      if (
        profile.firmwareSignatureVerification === undefined ||
        profile.tlsEnabled === undefined
      ) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate attack-surface reduction: firmwareSignatureVerification / tlsEnabled not declared.",
        };
      }
      if (profile.firmwareSignatureVerification && profile.tlsEnabled) {
        return {
          requirement,
          status: "COMPLIANT",
          rationale:
            "Attack-surface baseline met (proxy): hardened firmware + TLS narrows exposure.",
        };
      }
      return {
        requirement,
        status: "NON_COMPLIANT",
        rationale:
          "Attack-surface baseline NOT met: open debug / unencrypted comms suggest unhardened surface (ETSI § 5.6).",
      };

    case "INPUT_VALIDATION":
      // No direct profile field for input validation; UNKNOWN unless
      // signed firmware + TLS both true (proxy for hardened API).
      if (
        profile.firmwareSignatureVerification === undefined ||
        profile.tlsEnabled === undefined
      ) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate input validation: profile lacks attestation; expert code-review required.",
        };
      }
      if (profile.firmwareSignatureVerification && profile.tlsEnabled) {
        return {
          requirement,
          status: "COMPLIANT",
          rationale:
            "Input-validation baseline met (proxy): signed firmware + TLS suggest hardened API surface.",
        };
      }
      return {
        requirement,
        status: "NON_COMPLIANT",
        rationale:
          "Input-validation baseline NOT met: unsigned firmware / no TLS indicate uncontrolled input paths.",
      };

    case "KEY_STORAGE":
      // ETSI § 5.4 — secure storage of credentials. Proxy via signed
      // firmware (implies hardware-root-of-trust availability).
      if (profile.firmwareSignatureVerification === undefined) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate key storage: firmwareSignatureVerification not declared.",
        };
      }
      return {
        requirement,
        status: profile.firmwareSignatureVerification
          ? "COMPLIANT"
          : "NON_COMPLIANT",
        rationale: profile.firmwareSignatureVerification
          ? "Key-storage baseline met (proxy): hardware-rooted boot implies secure-element availability."
          : "Key-storage baseline NOT met: without hardware-rooted secure boot, sensitive parameters at risk.",
      };

    case "PENALTIES":
      // PENALTIES rules are doctrinal (set the fine ceiling, not an
      // attestation). They surface as informational; if NIS2 gating
      // already filtered them out for non-essential operators, this
      // branch never runs.
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `${requirement.regime} ${requirement.category} doctrinal ceiling applies by operation of law; operator's exposure is a matter of NIS2 essential-entity designation.`,
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
 * Run a full cyber-baseline compliance check across all rules in the
 * dataset.
 */
export function checkCyberCompliance(
  profile: CyberPostureProfile,
): CyberComplianceReport {
  const results = CYBER_BASELINE_REQUIREMENTS.map((requirement) =>
    evaluateCyberRequirement(requirement, profile),
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
  // HARMONISED + BASELINE failures do NOT break overall compliance
  // (they're proxy-attestations); only hard-MANDATORY (NIS2, SPD-5,
  // IT-SiG) failures count. The semantic of HARMONISED is "presumption
  // of conformity", which is recovered by implementing the missing
  // provisions, not by a regulator's fine.
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
