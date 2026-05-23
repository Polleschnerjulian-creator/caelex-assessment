/**
 * Launch Insurance + Third-Party Liability Compliance Engine
 *
 * Takes a `LaunchInsuranceProfile` (the mission's insurance + liability
 * attributes — phase, coverage amounts, state indemnification, launching
 * states, jurisdictions, operator type, cross-waiver clauses, MPL
 * determination, coverage-period dates, treaty acknowledgements) and
 * evaluates compliance against the Liability Convention + OST + US-CSLA
 * + FR-LOA + UK-SIA + DE-WELTRAUM + IT-CODICE-CIVILE + EU Space Act
 * requirements from `launch-insurance-liability.ts`.
 *
 * Status output per requirement:
 *   - COMPLIANT       — Profile satisfies the threshold or qualitative rule
 *   - NON_COMPLIANT   — Profile violates the threshold or required clause
 *   - NOT_APPLICABLE  — Rule does not apply to this phase/regime/jurisdiction
 *   - UNKNOWN         — Profile lacks the data needed to evaluate
 *
 * Returns a structured report that the UI / API layer can render or the
 * Astra tool can consume.
 *
 * The engine is jurisdiction-aware: it filters MANDATORY requirements
 * to those that bind operators in the declared jurisdiction(s). The
 * Liability Convention + OST Art. VI/VII are international treaties
 * and bind operators in every ratifying State; national regimes layer
 * on top.
 *
 * Special path — **MPL gating**: if `jurisdictions` includes US and
 * `missionPhase` is LAUNCH or REENTRY, `mplDeterminedUSD` MUST be
 * defined; if the insurance amount is less than MPL, the rule is
 * NON_COMPLIANT regardless of the static $500M ceiling check.
 *
 * Special path — **Phase scoping**: rules scoped only to LAUNCH return
 * NOT_APPLICABLE for IN_ORBIT phase profiles; rules scoped only to
 * IN_ORBIT return NOT_APPLICABLE for LAUNCH phase profiles. The UK
 * SIA in-orbit £20M floor is a key example.
 *
 * Special path — **Currency**: thresholds annotate currency (USD, EUR,
 * GBP) in their unit; the engine compares directly against the matching
 * profile field (`insuranceCoverageThirdPartyUSD` /
 * `insuranceCoverageThirdPartyEUR` / `insuranceCoverageThirdPartyGBP`),
 * letting the UI manage conversions.
 *
 * Pure function — no side effects, no DB access. Test-friendly. Server-
 * only since it consumes the regulatory dataset only on the server.
 */

import "server-only";

import {
  LAUNCH_INSURANCE_REQUIREMENTS,
  type InsurancePhase,
  type InsuranceRegime,
  type InsuranceRequirementEntry,
} from "@/data/comply/launch-insurance-liability";

/** Inputs — the mission's insurance + liability profile. */
export interface LaunchInsuranceProfile {
  /**
   * Current mission phase — used for phase-scoping rules. UK SIA's
   * in-orbit £20M floor only applies to IN_ORBIT; the US MPL rules
   * apply to LAUNCH + REENTRY. POST_MISSION is treated as IN_ORBIT
   * for ongoing-coverage purposes.
   */
  missionPhase: InsurancePhase;

  /**
   * Insured amount for third-party liability, in USD. Compared
   * against US CSLA / EU Space Act USD-denominated thresholds.
   */
  insuranceCoverageThirdPartyUSD?: number;

  /**
   * Insured amount for third-party liability, in EUR. Compared
   * against French LOA / German draft / EU Space Act EUR thresholds.
   */
  insuranceCoverageThirdPartyEUR?: number;

  /**
   * Insured amount for third-party liability, in GBP. Compared
   * against UK SIA GBP thresholds.
   */
  insuranceCoverageThirdPartyGBP?: number;

  /** Insured amount for Government / Member-State property, in USD. */
  insuranceCoveragePropertyUSD?: number;

  /** Insured amount for Government / Member-State property, in EUR. */
  insuranceCoveragePropertyEUR?: number;

  /**
   * Whether the operator has a State indemnification arrangement
   * (US § 50914(b) / French Art. 14 / draft German law / EU Art. 43).
   */
  hasStateIndemnification?: boolean;

  /**
   * Co-launching States for joint + several liability evaluation
   * (Liability Convention Art. V). ISO-2 codes.
   */
  launchingStateParties: ReadonlyArray<string>;

  /** Jurisdictions under which the mission is authorised (ISO-2 codes). */
  jurisdictions: ReadonlyArray<string>;

  /** Operator type. */
  operatorType: "COMMERCIAL" | "GOVERNMENT" | "ACADEMIC";

  /**
   * Whether the operator has executed reciprocal cross-waiver clauses
   * with all participants (US § 50914(a)(4) / EU Art. 42).
   */
  hasCrossWaiver?: boolean;

  /**
   * For US operations, the MPL determined by FAA AST for the mission.
   * The insurance amount must equal or exceed this value (subject to
   * the $500M ceiling). Required for US LAUNCH/REENTRY phases.
   */
  mplDeterminedUSD?: number;

  /**
   * ISO 8601 start of the insurance coverage period (e.g. start of
   * pre-flight hazardous operations).
   */
  coveragePeriodStart?: string;

  /**
   * ISO 8601 end of the insurance coverage period (e.g. landing + 30
   * days, or end-of-life disposal).
   */
  coveragePeriodEnd?: string;

  /**
   * Whether the operator's home State has ratified the Liability
   * Convention. (Defaults true in practice — 95+ ratifying States.)
   */
  capturedLiabilityConvention?: boolean;

  /** Whether the operator's home State has ratified the Outer Space Treaty. */
  capturedOuterSpaceTreaty?: boolean;

  /**
   * Number of years from damage occurrence within which a claim can
   * still be presented (for claim-window rules).
   */
  claimWindowYears?: number;
}

/** Per-requirement evaluation result. */
export type InsuranceRequirementStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export interface InsuranceRequirementResult {
  requirement: InsuranceRequirementEntry;
  status: InsuranceRequirementStatus;
  rationale: string;
}

export interface InsuranceComplianceReport {
  profile: LaunchInsuranceProfile;
  /** All requirements evaluated, in dataset order. */
  results: ReadonlyArray<InsuranceRequirementResult>;
  /** Aggregate counts. */
  summary: {
    compliantCount: number;
    nonCompliantCount: number;
    notApplicableCount: number;
    unknownCount: number;
    totalEvaluated: number;
  };
  /** Overall verdict — false if ANY MANDATORY or TREATY rule is NON_COMPLIANT. */
  overallCompliant: boolean;
}

// ============================================================================
// Jurisdiction scoping
// ============================================================================

/**
 * Map a jurisdiction ISO-2 to the insurance regimes that bind operators
 * there. The Liability Convention + OST apply universally (treaty);
 * national regimes layer on top. EU Member States additionally see the
 * proposed EU Space Act.
 */
const JURISDICTION_TO_REGIMES: Record<
  string,
  ReadonlyArray<InsuranceRegime>
> = {
  US: ["LIABILITY_CONVENTION", "OST_VI_VII", "US-CSLA"],
  GB: ["LIABILITY_CONVENTION", "OST_VI_VII", "UK-SIA"],
  UK: ["LIABILITY_CONVENTION", "OST_VI_VII", "UK-SIA"],
  DE: ["LIABILITY_CONVENTION", "OST_VI_VII", "DE-WELTRAUM", "EU-SPACE-ACT"],
  FR: ["LIABILITY_CONVENTION", "OST_VI_VII", "FR-LOA", "EU-SPACE-ACT"],
  IT: [
    "LIABILITY_CONVENTION",
    "OST_VI_VII",
    "IT-CODICE-CIVILE",
    "EU-SPACE-ACT",
  ],
  ES: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
  NL: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
  BE: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
  SE: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
  PL: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
  AT: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
  FI: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
  DK: ["LIABILITY_CONVENTION", "OST_VI_VII", "EU-SPACE-ACT"],
  CH: ["LIABILITY_CONVENTION", "OST_VI_VII"],
  NO: ["LIABILITY_CONVENTION", "OST_VI_VII"],
  JP: ["LIABILITY_CONVENTION", "OST_VI_VII"],
};

/**
 * Check whether this requirement is "in scope" for this operator's
 * jurisdiction set. The Liability Convention + OST apply universally
 * and are always in scope; national regimes are scoped to declared
 * jurisdictions.
 */
function inScopeForJurisdictions(
  requirement: InsuranceRequirementEntry,
  jurisdictions: ReadonlyArray<string>,
): boolean {
  // Treaty regimes apply universally
  if (
    requirement.regime === "LIABILITY_CONVENTION" ||
    requirement.regime === "OST_VI_VII"
  ) {
    return true;
  }
  if (jurisdictions.length === 0) {
    // No jurisdictions declared → include everything (most conservative).
    return true;
  }
  const applicableRegimes = new Set<InsuranceRegime>();
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
  requirement: InsuranceRequirementEntry,
  operatorType: LaunchInsuranceProfile["operatorType"],
): boolean {
  return (
    requirement.operatorScope.includes("ALL") ||
    requirement.operatorScope.includes(operatorType)
  );
}

/**
 * Check whether the requirement's phase scope matches the mission's
 * current phase. Treaty + cross-cutting rules with all phases declared
 * always pass.
 */
function appliesToPhase(
  requirement: InsuranceRequirementEntry,
  missionPhase: InsurancePhase,
): boolean {
  return requirement.applicablePhases.includes(missionPhase);
}

// ============================================================================
// Special-path rule evaluators
// ============================================================================

/**
 * Evaluate the US MPL rule. Implements the special gating: if the
 * operator is licensed under US-CSLA for a LAUNCH or REENTRY phase
 * mission, the MPL determination must be present AND the insurance
 * amount must equal or exceed MPL.
 *
 * Returns undefined to let normal evaluation continue for non-MPL
 * requirements.
 */
function evaluateMplGating(
  requirement: InsuranceRequirementEntry,
  profile: LaunchInsuranceProfile,
): InsuranceRequirementResult | undefined {
  if (requirement.code !== "US-CSLA-MPL") return undefined;

  // Phase-gating: MPL only applies to LAUNCH / REENTRY phases
  if (profile.missionPhase !== "LAUNCH" && profile.missionPhase !== "REENTRY") {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `MPL rule applies to LAUNCH/REENTRY phases only; current phase is ${profile.missionPhase}.`,
    };
  }

  // Must have insurance amount to evaluate
  if (profile.insuranceCoverageThirdPartyUSD === undefined) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale:
        "Cannot evaluate MPL rule: insuranceCoverageThirdPartyUSD is not declared.",
    };
  }

  // MPL value must be determined for US ops
  if (profile.mplDeterminedUSD === undefined) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale:
        "Cannot evaluate MPL rule: mplDeterminedUSD is not declared (FAA AST must determine MPL per 51 U.S.C. § 50914(a)).",
    };
  }

  // Hard fail: insurance < MPL
  if (profile.insuranceCoverageThirdPartyUSD < profile.mplDeterminedUSD) {
    return {
      requirement,
      status: "NON_COMPLIANT",
      rationale: `Insurance amount $${profile.insuranceCoverageThirdPartyUSD.toLocaleString()} is BELOW MPL of $${profile.mplDeterminedUSD.toLocaleString()} — § 50914(a) violation.`,
    };
  }

  // Compliant: insurance ≥ MPL (and MPL must be capped at $500M per statute,
  // which the dataset threshold encodes, but the rule itself is mpl-met).
  return {
    requirement,
    status: "COMPLIANT",
    rationale: `Insurance amount $${profile.insuranceCoverageThirdPartyUSD.toLocaleString()} meets or exceeds MPL of $${profile.mplDeterminedUSD.toLocaleString()}.`,
  };
}

/**
 * Evaluate a boolean attestation flag — returns UNKNOWN if undefined,
 * else COMPLIANT/NON_COMPLIANT per truthiness.
 */
function evaluateBooleanFlag(
  requirement: InsuranceRequirementEntry,
  flagValue: boolean | undefined,
  flagDescription: string,
  positiveOutcome: string,
  negativeOutcome: string,
): InsuranceRequirementResult {
  if (flagValue === undefined) {
    return {
      requirement,
      status: "UNKNOWN",
      rationale: `Cannot evaluate: ${flagDescription} not declared in insurance profile.`,
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
 * Evaluate a single insurance requirement against the profile.
 * Returns COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE / UNKNOWN.
 */
export function evaluateInsuranceRequirement(
  requirement: InsuranceRequirementEntry,
  profile: LaunchInsuranceProfile,
): InsuranceRequirementResult {
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

  // Phase scoping — applies to all rules including treaties
  if (!appliesToPhase(requirement, profile.missionPhase)) {
    return {
      requirement,
      status: "NOT_APPLICABLE",
      rationale: `Rule scoped to phases [${requirement.applicablePhases.join(", ")}]; mission is in phase ${profile.missionPhase}.`,
    };
  }

  // Special path — MPL gating (handles US-CSLA-MPL entirely)
  const mplResult = evaluateMplGating(requirement, profile);
  if (mplResult) return mplResult;

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
        rationale: `Cannot evaluate: insurance profile is missing field "${param}".`,
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
    case "CROSS_WAIVER":
      return evaluateBooleanFlag(
        requirement,
        profile.hasCrossWaiver,
        "cross-waiver of liability arrangement",
        "Reciprocal cross-waiver clauses executed across participants.",
        "Cross-waiver clauses NOT executed — § 50914(a)(4) / Art. 42 violation.",
      );

    case "STATE_INDEMNIFICATION":
      return evaluateBooleanFlag(
        requirement,
        profile.hasStateIndemnification,
        "State indemnification arrangement",
        "State indemnification arrangement attested by operator.",
        "State indemnification arrangement NOT attested by operator.",
      );

    case "AUTHORIZATION_INSURANCE_LINK": {
      // Authorisation-insurance link rules require positive declaration of
      // insurance amount in any currency. Treat lack of declarations as
      // UNKNOWN.
      const hasAnyCoverage =
        profile.insuranceCoverageThirdPartyUSD !== undefined ||
        profile.insuranceCoverageThirdPartyEUR !== undefined ||
        profile.insuranceCoverageThirdPartyGBP !== undefined;
      if (!hasAnyCoverage) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate authorisation-insurance link: no insurance coverage amount declared.",
        };
      }
      return {
        requirement,
        status: "COMPLIANT",
        rationale:
          "Operator authorisation-insurance link satisfied (positive coverage declared).",
      };
    }

    case "LIABILITY_ABSOLUTE":
    case "LIABILITY_FAULT":
      // Treaty + national absolute / fault liability rules are doctrinal —
      // they describe the standard of liability, not an attestation. A
      // mission that has acknowledged the relevant treaty is COMPLIANT.
      if (requirement.regime === "LIABILITY_CONVENTION") {
        return evaluateBooleanFlag(
          requirement,
          profile.capturedLiabilityConvention,
          "Liability Convention acknowledgement",
          `${requirement.code} acknowledged — operator's launching State is ratifying Party.`,
          `${requirement.code} NOT acknowledged — launching State Party status undeclared.`,
        );
      }
      if (requirement.regime === "OST_VI_VII") {
        return evaluateBooleanFlag(
          requirement,
          profile.capturedOuterSpaceTreaty,
          "Outer Space Treaty acknowledgement",
          `${requirement.code} acknowledged — operator's launching State is OST Party.`,
          `${requirement.code} NOT acknowledged — launching State Party status undeclared.`,
        );
      }
      // National strict / fault liability rules (Codice Civile 2050, BGB)
      // describe a standard that applies by operation of law; we treat
      // them as COMPLIANT once jurisdiction is matched. The operator
      // bears the burden in actual litigation, not in pre-launch
      // compliance.
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `${requirement.regime} liability standard applies by operation of law; operator's exposure is a matter of insurance + due diligence.`,
      };

    case "STATE_RESPONSIBILITY":
      // OST Art. VI — state responsibility doctrine. Compliant if the
      // operator acknowledges OST.
      return evaluateBooleanFlag(
        requirement,
        profile.capturedOuterSpaceTreaty,
        "Outer Space Treaty Art. VI acknowledgement",
        "Operator's launching State acknowledges OST Art. VI authorisation + supervision duty.",
        "Operator's launching State has not acknowledged OST Art. VI (or status undeclared).",
      );

    case "JOINT_LIABILITY":
      // Liability Convention Art. V — joint + several. Compliant if the
      // operator has declared launchingStateParties (proxy for awareness
      // of joint exposure).
      if (profile.launchingStateParties.length === 0) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate joint-liability rule: launchingStateParties not declared.",
        };
      }
      if (profile.launchingStateParties.length === 1) {
        return {
          requirement,
          status: "COMPLIANT",
          rationale: `Single launching State declared (${profile.launchingStateParties[0]}); no joint-launch exposure to apportion.`,
        };
      }
      return {
        requirement,
        status: "COMPLIANT",
        rationale: `${profile.launchingStateParties.length} co-launching States declared (${profile.launchingStateParties.join(", ")}) — joint + several exposure acknowledged.`,
      };

    case "DATA_LIABILITY":
      // SatDSiG data-side liability — no automated attestation
      // mechanism; expert review required.
      return {
        requirement,
        status: "UNKNOWN",
        rationale:
          "Data-side liability (SatDSiG §§ 11-13) attestation not encoded in profile; expert review required for earth-observation data operators.",
      };

    case "COVERAGE_PERIOD":
      // Coverage period rules require both start + end dates to be
      // present. If start > end, NON_COMPLIANT; otherwise COMPLIANT.
      if (
        profile.coveragePeriodStart === undefined ||
        profile.coveragePeriodEnd === undefined
      ) {
        return {
          requirement,
          status: "UNKNOWN",
          rationale:
            "Cannot evaluate coverage-period rule: coveragePeriodStart and/or coveragePeriodEnd not declared.",
        };
      }
      {
        const startMs = new Date(profile.coveragePeriodStart).getTime();
        const endMs = new Date(profile.coveragePeriodEnd).getTime();
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
          return {
            requirement,
            status: "UNKNOWN",
            rationale: `Coverage-period date format invalid: start=${profile.coveragePeriodStart}, end=${profile.coveragePeriodEnd}.`,
          };
        }
        if (endMs <= startMs) {
          return {
            requirement,
            status: "NON_COMPLIANT",
            rationale: `Coverage period end (${profile.coveragePeriodEnd}) is not after start (${profile.coveragePeriodStart}).`,
          };
        }
        return {
          requirement,
          status: "COMPLIANT",
          rationale: `Coverage period ${profile.coveragePeriodStart} → ${profile.coveragePeriodEnd} declared and validly ordered.`,
        };
      }

    case "MPL_DETERMINATION":
      // Generic MPL-determination requirement (UK CAA modelled-loss).
      // We use the presence of `mplDeterminedUSD` as a proxy for US;
      // for UK we treat the rule as COMPLIANT if the operator has
      // declared a threshold-bearing insurance amount in the relevant
      // currency. The US-specific MPL is handled by evaluateMplGating.
      if (requirement.regime === "UK-SIA") {
        if (profile.insuranceCoverageThirdPartyGBP === undefined) {
          return {
            requirement,
            status: "UNKNOWN",
            rationale:
              "UK modelled-loss evaluation cannot proceed: insuranceCoverageThirdPartyGBP not declared.",
          };
        }
        return {
          requirement,
          status: "COMPLIANT",
          rationale:
            "UK CAA modelled-loss evaluation proxy: insurance amount declared.",
        };
      }
      // Fallback for other regimes — UNKNOWN
      return {
        requirement,
        status: "UNKNOWN",
        rationale: `Modelled-loss evaluation for regime ${requirement.regime} requires regulator review.`,
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
 * Run a full launch-insurance compliance check across all rules in the
 * dataset.
 */
export function checkInsuranceCompliance(
  profile: LaunchInsuranceProfile,
): InsuranceComplianceReport {
  const results = LAUNCH_INSURANCE_REQUIREMENTS.map((requirement) =>
    evaluateInsuranceRequirement(requirement, profile),
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

  // Overall compliance: false if any MANDATORY or TREATY rule is NON_COMPLIANT.
  const overallCompliant = !results.some(
    (r) =>
      r.status === "NON_COMPLIANT" &&
      (r.requirement.bindingNature === "MANDATORY" ||
        r.requirement.bindingNature === "TREATY"),
  );

  return {
    profile,
    results,
    summary,
    overallCompliant,
  };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
