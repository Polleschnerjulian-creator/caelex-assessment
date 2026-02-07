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

// ─── Lazy import for NIS2 requirements (loaded when first needed) ───
// We use dynamic import pattern to avoid loading the full requirements data
// until it's actually needed.
let _nis2RequirementsModule: typeof import("@/data/nis2-requirements") | null =
  null;

async function getNIS2RequirementsModule() {
  if (!_nis2RequirementsModule) {
    _nis2RequirementsModule = await import("@/data/nis2-requirements");
  }
  return _nis2RequirementsModule;
}

// ─── Entity Classification Logic ───

/**
 * Classify an entity under NIS2 based on their assessment answers.
 *
 * NIS2 classification rules (simplified):
 * - Annex I (high criticality sectors, including Space) + large entity = "essential"
 * - Annex I + medium entity = "important" (unless specific criteria make them essential)
 * - Annex I + small/micro = generally out of scope (unless member state designation)
 * - Space operators providing critical infrastructure services may be "essential" regardless of size
 */
export function classifyNIS2Entity(answers: NIS2AssessmentAnswers): {
  classification: NIS2EntityClassification;
  reason: string;
  articleRef: string;
} {
  // Non-EU entities are generally out of scope (unless providing services in EU)
  if (answers.isEUEstablished === false) {
    return {
      classification: "out_of_scope",
      reason:
        "NIS2 primarily applies to entities established in EU member states. Non-EU entities providing services in the EU may need to designate an EU representative under Art. 26.",
      articleRef: "NIS2 Art. 2, Art. 26",
    };
  }

  // Caelex is space-only — always treat as space sector (Annex I, Sector 11)
  const sector = answers.sector || "space";

  // Micro enterprises are generally excluded (Art. 2(1))
  if (answers.entitySize === "micro") {
    // Exception: Space operators providing SATCOM for government or critical infra
    if (answers.operatesSatComms) {
      return {
        classification: "important",
        reason:
          "Although micro enterprises are generally excluded, satellite communications providers may be designated as important entities by member states under Art. 2(2)(b) due to the critical nature of SATCOM services.",
        articleRef: "NIS2 Art. 2(2)(b)",
      };
    }
    return {
      classification: "out_of_scope",
      reason:
        "Micro enterprises (< 10 employees, < €2M turnover) are generally excluded from NIS2 scope under Art. 2(1). However, member states may designate critical space operators regardless of size under Art. 2(2).",
      articleRef: "NIS2 Art. 2(1)",
    };
  }

  // Space sector classification (Annex I, high criticality)
  // Large entities in Annex I sectors = essential
  if (answers.entitySize === "large") {
    return {
      classification: "essential",
      reason:
        "Large entities (> 250 employees or > €50M turnover) operating in the space sector (NIS2 Annex I, Sector 11) are classified as essential entities under Art. 3(1).",
      articleRef: "NIS2 Art. 3(1)(a)",
    };
  }

  // Medium entities in Annex I sectors = important (default)
  if (answers.entitySize === "medium") {
    // Exception: Ground infrastructure operators or SATCOM for government
    if (answers.operatesGroundInfra || answers.operatesSatComms) {
      return {
        classification: "essential",
        reason:
          "Medium entities operating critical space infrastructure (ground stations, SATCOM) may be classified as essential entities by member states under Art. 3(1)(e) due to the criticality of space infrastructure services.",
        articleRef: "NIS2 Art. 3(1)(e)",
      };
    }
    return {
      classification: "important",
      reason:
        "Medium entities (50-250 employees) in the space sector (NIS2 Annex I) are classified as important entities under Art. 3(2). This means full NIS2 compliance is required, with lighter supervisory measures than essential entities.",
      articleRef: "NIS2 Art. 3(2)",
    };
  }

  // Small entities in Annex I — generally out of scope unless designated
  if (answers.entitySize === "small") {
    if (
      answers.operatesGroundInfra ||
      answers.operatesSatComms ||
      answers.providesLaunchServices
    ) {
      return {
        classification: "important",
        reason:
          "Small entities providing critical space services (ground infrastructure, SATCOM, launch services) may be designated as important entities by member states under Art. 2(2)(b), as disruption could have significant impact on public safety or national security.",
        articleRef: "NIS2 Art. 2(2)(b)",
      };
    }
    return {
      classification: "out_of_scope",
      reason:
        "Small enterprises (< 50 employees, < €10M turnover) are generally excluded from NIS2 under Art. 2(1), unless designated by a member state under Art. 2(2). Monitor your national authority's designations.",
      articleRef: "NIS2 Art. 2(1), Art. 2(2)",
    };
  }

  // Fallback
  return {
    classification: "out_of_scope",
    reason:
      "Based on your organization's profile, you do not appear to fall within the scope of NIS2. However, member states may designate additional space operators under Art. 2(2). Consult your national competent authority.",
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

// ─── EU Space Act Overlap Calculation ───

function calculateEUSpaceActOverlap(
  classification: NIS2EntityClassification,
): NIS2ComplianceResult["euSpaceActOverlap"] {
  if (classification === "out_of_scope") {
    return {
      count: 0,
      totalPotentialSavingsWeeks: 0,
      overlappingRequirements: [],
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

  // Estimate ~2 weeks saved per overlapping requirement
  const totalPotentialSavingsWeeks =
    overlappingRequirements.filter(
      (r) => r.effortType === "single_implementation",
    ).length *
      3 +
    overlappingRequirements.filter((r) => r.effortType === "partial_overlap")
      .length *
      1.5;

  return {
    count: overlappingRequirements.length,
    totalPotentialSavingsWeeks: Math.round(totalPotentialSavingsWeeks),
    overlappingRequirements,
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

  try {
    const reqModule = await getNIS2RequirementsModule();
    if (reqModule.NIS2_REQUIREMENTS) {
      totalNIS2Requirements = reqModule.NIS2_REQUIREMENTS.length;
      if (classification !== "out_of_scope") {
        applicableRequirements = reqModule.getApplicableNIS2Requirements
          ? reqModule.getApplicableNIS2Requirements(classification, answers)
          : reqModule.NIS2_REQUIREMENTS;
      }
    }
  } catch {
    // If requirements file not yet available, return empty
    applicableRequirements = [];
    totalNIS2Requirements = 0;
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
