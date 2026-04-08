/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY NIS2 Compliance Calculation Engine
 *
 * This file contains the NIS2 Directive scoping and classification logic
 * for space sector entities. It MUST NOT be imported by client-side code.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized reproduction or reverse-engineering is strictly prohibited.
 */

import "server-only";

import {
  NIS2AssessmentAnswers,
  NIS2ComplianceResult,
  NIS2EntityClassification,
  NIS2Requirement,
  NIS2RequirementCategory,
  RedactedNIS2ComplianceResult,
  RedactedNIS2Requirement,
} from "./nis2-types";
import { CROSS_REFERENCES } from "@/data/cross-references";
import { EngineDataError } from "@/lib/engines/shared.server";

// ─── Lazy import for NIS2 requirements (loaded when first needed) ───
// We use dynamic import pattern to avoid loading the full requirements data
// until it's actually needed.
let _nis2RequirementsModule: typeof import("@/data/nis2-requirements") | null =
  null;

async function getNIS2RequirementsModule() {
  if (!_nis2RequirementsModule) {
    try {
      _nis2RequirementsModule = await import("@/data/nis2-requirements");
    } catch (error) {
      throw new EngineDataError("NIS2 requirements data could not be loaded", {
        engine: "nis2",
        dataFile: "nis2-requirements.ts",
        cause: error,
      });
    }
  }
  return _nis2RequirementsModule;
}

// ─── Entity Classification Logic ───

/**
 * Canonical NIS2 entity classifier. THIS IS THE SINGLE SOURCE OF TRUTH.
 *
 * Grounded in NIS2 Directive (EU) 2022/2555:
 *
 *   Art. 2(1)   General size-capped scope: entities meeting or exceeding the
 *               ceilings for medium-sized enterprises under Annex to Rec.
 *               2003/361/EC (≥ 50 employees OR ≥ €10M turnover/BS) that fall
 *               under sectors in Annex I or II.
 *   Art. 2(2)   Size-cap exceptions that bring small/micro entities into scope
 *               regardless of size: sole providers (a), essential-to-society
 *               providers (b), public administration (c), DNS root (d),
 *               trust-service providers (e).
 *   Art. 2(4)   NIS2 applies to entities established in the Union.
 *   Art. 26     Jurisdiction and registration for non-EU entities providing
 *               services in the Union.
 *   Art. 3(1)   Essential entities list (includes large entities in Annex I).
 *   Art. 3(2)   Important entities = all other entities within the size cap.
 *
 * Priority of rules (checked in order):
 *
 *   1. Insufficient data → out_of_scope
 *   2. Member state designation (Art. 2(2)) → always in scope
 *   3. Non-EU + no EU services → out_of_scope (Art. 2(4))
 *   4. Non-EU + offers EU services → important + Art. 26 obligation
 *   5. Large + Annex I sector → essential (Art. 3(1)(a))
 *   6. Large + Annex I + digital infrastructure → essential
 *   7. Medium + Annex I → important (Art. 3(2)) — NEVER auto-essential
 *   8. Small/micro + Annex I → out_of_scope by default unless designated
 */
export function classifyNIS2Entity(answers: NIS2AssessmentAnswers): {
  classification: NIS2EntityClassification;
  reason: string;
  articleRef: string;
} {
  // ── Rule 1: insufficient data ───────────────────────────────────────────
  if (answers.entitySize == null) {
    return {
      classification: "out_of_scope",
      reason:
        "Entity size is required to determine NIS2 classification. Please complete the assessment.",
      articleRef: "NIS2 Art. 2",
    };
  }

  // ── Rule 2: member state designation overrides everything ──────────────
  // Art. 2(2)(a)–(e) — member states can bring entities into scope
  // regardless of size. Default such entities to "essential" for safety.
  if (answers.designatedByMemberState === true) {
    return {
      classification: "essential",
      reason:
        "Your entity has been designated by a member state as subject to NIS2 under Art. 2(2), which brings you into scope regardless of the general size cap. Designation typically targets sole providers, entities whose disruption would have significant impact on public safety or security, public administration, DNS root operators, or qualified trust service providers. Classification defaults to essential for planning purposes — confirm your designated tier with your competent authority.",
      articleRef: "NIS2 Art. 2(2)",
    };
  }

  // ── Rule 3: non-EU entities ─────────────────────────────────────────────
  // Art. 2(4): NIS2 applies to entities established in the Union.
  // Art. 26: non-EU entities providing services in the Union are in scope
  //          (typically classified as important) and must designate a
  //          representative in the EU.
  if (answers.isEUEstablished === false) {
    if (answers.offersServicesInEU === true) {
      return {
        classification: "important",
        reason:
          "You are not established in the EU, but you offer services in the Union. Under NIS2 Art. 26, you fall within the scope of this directive, must designate a representative in one of the member states where your services are offered, and are treated as an important entity by default. Your representative is the point of contact with national competent authorities for all NIS2 obligations.",
        articleRef: "NIS2 Art. 2(4), Art. 26",
      };
    }
    return {
      classification: "out_of_scope",
      reason:
        "You are not established in the EU and do not offer services within the Union. NIS2 does not apply to your entity under Art. 2(4). If you later provide services to customers in the EU, you will fall within scope under Art. 26 and must designate an EU representative.",
      articleRef: "NIS2 Art. 2(4)",
    };
  }

  // The entity is either EU-established or we don't know (treat as EU for safety).
  // Sector check: Caelex is space-focused, but the engine must still handle cross-
  // sector cases (e.g., a space operator that also provides DNS / digital infra).
  const sector = answers.sector || "space";
  const isSpaceOrAnnexI =
    sector === "space" ||
    sector === "energy" ||
    sector === "transport" ||
    sector === "banking" ||
    sector === "financial_market" ||
    sector === "health" ||
    sector === "drinking_water" ||
    sector === "waste_water" ||
    sector === "digital_infrastructure" ||
    sector === "ict_service_management" ||
    sector === "public_administration" ||
    answers.providesDigitalInfrastructure === true;

  if (!isSpaceOrAnnexI) {
    return {
      classification: "out_of_scope",
      reason:
        "Your entity does not operate in a sector listed under NIS2 Annex I (high criticality) or Annex II (other critical sectors). NIS2 does not apply. If you later expand into a covered sector, reassess your classification.",
      articleRef: "NIS2 Art. 2, Annex I/II",
    };
  }

  // ── Rule 5: Large entity in Annex I → essential (Art. 3(1)(a)) ─────────
  if (answers.entitySize === "large") {
    return {
      classification: "essential",
      reason:
        "Large entities (at least 250 employees, or exceeding €50M annual turnover or €43M annual balance sheet total, per Commission Recommendation 2003/361/EC) operating in the space sector (NIS2 Annex I, Sector 11 — high criticality) are classified as essential entities under Art. 3(1)(a). You are subject to the full set of NIS2 cybersecurity risk management measures and ex-ante supervision.",
      articleRef: "NIS2 Art. 3(1)(a), Annex I § 11",
    };
  }

  // ── Rule 7: Medium entity in Annex I → important (Art. 3(2)) ───────────
  // DO NOT auto-upgrade medium entities to essential based on ground infra
  // or SATCOM alone. Essential upgrade requires explicit member state
  // designation via Art. 3(1)(b)–(f). Default to important for accuracy.
  if (answers.entitySize === "medium") {
    return {
      classification: "important",
      reason:
        "As a medium-sized entity (50–249 employees with turnover €10M–50M) operating in the space sector (NIS2 Annex I, Sector 11), your organisation is classified as an important entity under Art. 3(2). You must implement the cybersecurity risk management measures of Art. 21 and the incident reporting obligations of Art. 23, with ex-post supervisory measures. Member states may upgrade specific operators of ground-based infrastructure, SATCOM, or sole providers to essential via Art. 3(1)(b)–(f). Confirm with your national competent authority whether such a designation applies to you.",
      articleRef: "NIS2 Art. 3(2)",
    };
  }

  // ── Rule 8: Small / micro entity in Annex I — out of scope by default ─
  // Per Art. 2(1), only entities meeting the size cap are automatically in
  // scope. Small/micro entities are in scope only via Art. 2(2) designation,
  // which is handled by Rule 2 above.
  if (answers.entitySize === "small" || answers.entitySize === "micro") {
    return {
      classification: "out_of_scope",
      reason:
        answers.entitySize === "small"
          ? "Small enterprises (10–49 employees, €2M–10M turnover or balance sheet) operating in space (NIS2 Annex I) are generally outside NIS2 scope per Art. 2(1) because they do not meet the medium-enterprise size cap. However, member states may designate specific small entities as essential or important via Art. 2(2)(a)–(e) — for example, sole providers of a critical space service, or providers whose disruption would have significant impact on public safety. If you have received such a designation, update the 'designated by member state' answer. Monitor your national competent authority's designations list."
          : "Micro enterprises (fewer than 10 employees with turnover and balance sheet below €2M) are generally outside NIS2 scope per Art. 2(1). Member states retain the power under Art. 2(2) to designate critical space operators regardless of size — if your entity is a sole provider of a critical service or your disruption would have significant public-safety impact, confirm designation status with your national competent authority.",
      articleRef: "NIS2 Art. 2(1), Art. 2(2)",
    };
  }

  // Fallback (should be unreachable given the exhaustive checks above)
  return {
    classification: "out_of_scope",
    reason:
      "Your entity profile does not map to any recognised NIS2 classification path. Consult your national competent authority to confirm your status.",
    articleRef: "NIS2 Art. 2",
  };
}

// ─── Incident Reporting Timeline ───

function getIncidentReportingTimeline(): NIS2ComplianceResult["incidentReportingTimeline"] {
  return {
    earlyWarning: {
      deadline: "24 hours",
      description:
        "Submit an early warning to the CSIRT or competent authority without undue delay and in any event within 24 hours of becoming aware of the significant incident. Must indicate whether the incident is suspected to be caused by unlawful or malicious acts and whether it could have a cross-border impact.",
    },
    notification: {
      deadline: "72 hours",
      description:
        "Submit an incident notification updating the early warning with an initial assessment of the significant incident, including its severity and impact, and indicators of compromise where available.",
    },
    intermediateReport: {
      deadline: "Upon request",
      description:
        "Submit an intermediate report upon the request of the CSIRT or competent authority, providing relevant status updates.",
    },
    finalReport: {
      deadline: "1 month",
      description:
        "Submit a final report no later than one month after the incident notification, including: (a) detailed description of the incident; (b) type of threat or root cause; (c) applied and ongoing mitigation measures; (d) cross-border impact if applicable.",
    },
  };
}

// ─── EU Space Act Overlap Configuration ───

const OVERLAP_CONFIG = {
  supersedes: {
    estimatedSavingsWeeks: 3,
    confidenceLevel: "estimated" as const,
    source:
      "Internal estimate — not empirically validated. Based on assumption that superseding requirement eliminates full duplication.",
  },
  overlaps: {
    estimatedSavingsWeeks: 1.5,
    confidenceLevel: "estimated" as const,
    source:
      "Internal estimate — not empirically validated. Based on assumption that overlapping requirements share ~50% implementation effort.",
  },
};

// ─── EU Space Act Overlap Calculation ───

function calculateEUSpaceActOverlap(
  classification: NIS2EntityClassification,
): NIS2ComplianceResult["euSpaceActOverlap"] {
  if (classification === "out_of_scope") {
    return {
      count: 0,
      totalPotentialSavingsWeeks: 0,
      overlappingRequirements: [],
      confidenceLevel: OVERLAP_CONFIG.supersedes.confidenceLevel,
      estimationSource: OVERLAP_CONFIG.supersedes.source,
    };
  }

  const nis2ToSpaceAct = CROSS_REFERENCES.filter(
    (ref) =>
      (ref.sourceRegulation === "nis2" &&
        ref.targetRegulation === "eu_space_act") ||
      (ref.sourceRegulation === "eu_space_act" &&
        ref.targetRegulation === "nis2"),
  );

  const overlappingRequirements = nis2ToSpaceAct
    .filter(
      (ref) =>
        ref.relationship === "overlaps" || ref.relationship === "supersedes",
    )
    .map((ref) => {
      const isNIS2Source = ref.sourceRegulation === "nis2";
      return {
        nis2RequirementId: "", // Populated when cross-referencing with requirements
        nis2Article: isNIS2Source ? ref.sourceArticle : ref.targetArticle,
        euSpaceActArticle: isNIS2Source ? ref.targetArticle : ref.sourceArticle,
        description: ref.description,
        effortType:
          ref.relationship === "supersedes"
            ? ("single_implementation" as const)
            : ("partial_overlap" as const),
      };
    });

  // Estimate savings per overlapping requirement (see OVERLAP_CONFIG for methodology notes)
  const totalPotentialSavingsWeeks =
    overlappingRequirements.filter(
      (r) => r.effortType === "single_implementation",
    ).length *
      OVERLAP_CONFIG.supersedes.estimatedSavingsWeeks +
    overlappingRequirements.filter((r) => r.effortType === "partial_overlap")
      .length *
      OVERLAP_CONFIG.overlaps.estimatedSavingsWeeks;

  return {
    count: overlappingRequirements.length,
    totalPotentialSavingsWeeks: Math.round(totalPotentialSavingsWeeks),
    overlappingRequirements,
    confidenceLevel: OVERLAP_CONFIG.supersedes.confidenceLevel,
    estimationSource: OVERLAP_CONFIG.supersedes.source,
  };
}

// ─── Supervisory Authority Determination ───

function getSupervisoryAuthority(answers: NIS2AssessmentAnswers): {
  authority: string;
  note: string;
} {
  const memberStateCount = answers.memberStateCount || 1;

  if (memberStateCount > 1) {
    return {
      authority:
        "Primary: Member state of main establishment. Additional: coordination with other member state authorities.",
      note: "Under NIS2 Art. 26(1), if you operate in multiple member states, the competent authority of your main establishment has primary jurisdiction. However, you must also comply with any additional requirements of other member states where you operate.",
    };
  }

  return {
    authority:
      "National competent authority of your member state of establishment.",
    note: "Each EU member state has designated (or will designate) a competent authority for NIS2 supervision. For space sector entities, this is typically the national cybersecurity agency or the entity also responsible for critical infrastructure protection. Check ENISA's NIS2 implementation tracker for your country.",
  };
}

// ─── Penalties Calculation ───

function getPenalties(
  classification: NIS2EntityClassification,
): NIS2ComplianceResult["penalties"] {
  return {
    essential:
      "Up to €10,000,000 or 2% of total annual worldwide turnover (whichever is higher)",
    important:
      "Up to €7,000,000 or 1.4% of total annual worldwide turnover (whichever is higher)",
    applicable:
      classification === "essential"
        ? "Up to €10,000,000 or 2% of total annual worldwide turnover (whichever is higher)"
        : classification === "important"
          ? "Up to €7,000,000 or 1.4% of total annual worldwide turnover (whichever is higher)"
          : "N/A — out of scope",
  };
}

// ─── Key Dates ───

function getKeyDates(
  classification: NIS2EntityClassification,
): NIS2ComplianceResult["keyDates"] {
  const dates = [
    {
      date: "17 October 2024",
      description:
        "NIS2 Directive transposition deadline — member states must have national laws in place",
    },
    {
      date: "17 April 2025",
      description:
        "Member states must establish list of essential and important entities (Art. 3(3))",
    },
  ];

  if (classification !== "out_of_scope") {
    dates.push(
      {
        date: "17 October 2024 onwards",
        description:
          "NIS2 obligations apply — entities must comply with national transposition laws",
      },
      {
        date: "1 January 2030",
        description:
          "EU Space Act enters into force — will become lex specialis for space sector, partially superseding NIS2",
      },
    );
  }

  return dates;
}

// ─── Main NIS2 Compliance Calculation ───

/**
 * Calculate NIS2 compliance result for a space sector entity.
 * This is the main entry point called by the API route.
 */
export async function calculateNIS2Compliance(
  answers: NIS2AssessmentAnswers,
): Promise<NIS2ComplianceResult> {
  // 1. Classify entity
  const { classification, reason, articleRef } = classifyNIS2Entity(answers);

  // 2. Get applicable requirements (lazy load the data file)
  let applicableRequirements: NIS2Requirement[] = [];
  let totalNIS2Requirements = 0;

  const reqModule = await getNIS2RequirementsModule();
  if (reqModule.NIS2_REQUIREMENTS) {
    totalNIS2Requirements = reqModule.NIS2_REQUIREMENTS.length;
    if (classification !== "out_of_scope") {
      applicableRequirements = reqModule.getApplicableNIS2Requirements
        ? reqModule.getApplicableNIS2Requirements(classification, answers)
        : reqModule.NIS2_REQUIREMENTS;
    }
  }

  // 3. Calculate EU Space Act overlap
  const euSpaceActOverlap = calculateEUSpaceActOverlap(classification);

  // 4. Get incident reporting timeline
  const incidentReportingTimeline = getIncidentReportingTimeline();

  // 5. Get supervisory authority
  const { authority, note } = getSupervisoryAuthority(answers);

  // 6. Get penalties
  const penalties = getPenalties(classification);

  // 7. Get key dates
  const keyDates = getKeyDates(classification);

  return {
    entityClassification: classification,
    classificationReason: reason,
    classificationArticleRef: articleRef,
    sector: "space", // Caelex is space-only
    subSector: answers.spaceSubSector || null,
    organizationSize: answers.entitySize || "unknown",
    applicableRequirements,
    totalNIS2Requirements,
    applicableCount: applicableRequirements.length,
    incidentReportingTimeline,
    euSpaceActOverlap,
    supervisoryAuthority: authority,
    supervisoryAuthorityNote: note,
    penalties,
    registrationRequired: classification !== "out_of_scope",
    registrationDeadline:
      classification !== "out_of_scope"
        ? "Without undue delay — entities must register with their competent authority under Art. 3(4)"
        : "N/A",
    keyDates,
  };
}

/**
 * Redact sensitive proprietary fields from NIS2 requirements before sending to client.
 * Strips: description, spaceSpecificGuidance, tips, evidenceRequired, cross-references
 */
export function redactNIS2ResultForClient(
  result: NIS2ComplianceResult,
): RedactedNIS2ComplianceResult {
  const redactedRequirements: RedactedNIS2Requirement[] =
    result.applicableRequirements.map((req) => ({
      id: req.id,
      articleRef: req.articleRef,
      category: req.category,
      title: req.title,
      severity: req.severity,
      // Deliberately omit: description, spaceSpecificGuidance, tips,
      // evidenceRequired, euSpaceActRef, enisaControlIds, iso27001Ref
    }));

  return {
    entityClassification: result.entityClassification,
    classificationReason: result.classificationReason,
    sector: result.sector,
    subSector: result.subSector,
    organizationSize: result.organizationSize,
    applicableRequirements: redactedRequirements,
    totalNIS2Requirements: result.totalNIS2Requirements,
    applicableCount: result.applicableCount,
    incidentReportingTimeline: result.incidentReportingTimeline,
    euSpaceActOverlap: {
      count: result.euSpaceActOverlap.count,
      totalPotentialSavingsWeeks:
        result.euSpaceActOverlap.totalPotentialSavingsWeeks,
      // Deliberately omit: overlappingRequirements details
    },
    penalties: result.penalties,
    registrationRequired: result.registrationRequired,
    keyDates: result.keyDates,
  };
}
