/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * NIS2 Auto-Assessment Engine — server-only.
 *
 * Automatically pre-populates requirement statuses based on wizard answers
 * (ISO 27001, CSIRT, risk management, entity size, ground infrastructure)
 * and generates smart recommendations + gap analysis for the dashboard.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import type { NIS2Requirement, NIS2AssessmentAnswers } from "./nis2-types";

// ─── Auto-Assessment Types ───

export interface AutoAssessmentResult {
  requirementId: string;
  suggestedStatus: "partial" | "not_assessed";
  reason: string;
  proportionalityNote?: string;
  priorityFlags: string[];
}

export interface ImplementationPhaseRequirement {
  id: string;
  title: string;
  articleRef: string;
  severity: string;
  category: string;
  estimatedWeeks: number;
  rationale: string;
}

export interface ImplementationPhase {
  phase: number;
  name: string;
  description: string;
  totalWeeks: number;
  requirements: ImplementationPhaseRequirement[];
}

export interface SmartRecommendations {
  iso27001Coverage: {
    count: number;
    total: number;
    percentage: number;
  };
  criticalGaps: Array<{
    id: string;
    title: string;
    articleRef: string;
    implementationWeeks: number;
  }>;
  euSpaceActOverlap: {
    count: number;
    articles: string[];
  };
  totalImplementationWeeks: number;
  recommendations: string[];
  implementationPhases: ImplementationPhase[];
  autoAssessedCount: number;
}

// ─── Category Labels ───

const categoryLabels: Record<string, string> = {
  policies_risk_analysis: "Risk Analysis & Policies",
  incident_handling: "Incident Handling",
  business_continuity: "Business Continuity",
  supply_chain: "Supply Chain Security",
  network_acquisition: "Network & System Security",
  effectiveness_assessment: "Effectiveness Assessment",
  cyber_hygiene: "Cyber Hygiene & Training",
  cryptography: "Cryptography & Encryption",
  hr_access_asset: "HR, Access & Asset Management",
  mfa_authentication: "Authentication & MFA",
  governance: "Governance & Accountability",
  reporting: "Incident Reporting",
  registration: "Registration & Notification",
  information_sharing: "Information Sharing",
};

// ─── Function 1: Generate Auto-Assessments ───

export function generateAutoAssessments(
  applicableRequirements: NIS2Requirement[],
  answers: NIS2AssessmentAnswers,
): AutoAssessmentResult[] {
  const results: AutoAssessmentResult[] = [];

  for (const req of applicableRequirements) {
    let suggestedStatus: "partial" | "not_assessed" = "not_assessed";
    const reasons: string[] = [];
    const priorityFlags: string[] = [];
    let proportionalityNote: string | undefined;

    // Rule 1: ISO 27001 coverage
    if (answers.hasISO27001 && req.iso27001Ref) {
      suggestedStatus = "partial";
      reasons.push(
        `ISO 27001 ${req.iso27001Ref} partially covers this requirement. Review space-specific additions.`,
      );
    }

    // Rule 2: CSIRT / Incident Response
    if (
      answers.hasExistingCSIRT &&
      (req.category === "incident_handling" || req.category === "reporting")
    ) {
      suggestedStatus = "partial";
      reasons.push(
        req.category === "reporting"
          ? "Your CSIRT must align reporting procedures with NIS2 Art. 23 timelines (24h early warning, 72h notification)."
          : "Your existing incident response capability provides a foundation. Verify NIS2 timeline compliance.",
      );
    }

    // Rule 3: Risk Management
    if (
      answers.hasRiskManagement &&
      req.category === "policies_risk_analysis"
    ) {
      suggestedStatus = "partial";
      reasons.push(
        "Existing risk management framework detected. Integrate space-specific threats (jamming, RF interference, orbital debris).",
      );
    }

    // Rule 4: Proportionality for small/micro entities
    if (
      (answers.entitySize === "small" || answers.entitySize === "micro") &&
      req.canBeSimplified
    ) {
      proportionalityNote =
        "Proportionate implementation allowed under NIS2 Art. 21(1). Simplified measures may apply for your entity size.";
    }

    // Rule 5: Ground infrastructure priority flagging
    if (answers.operatesGroundInfra) {
      const guidance = req.spaceSpecificGuidance.toLowerCase();
      if (
        guidance.includes("ground station") ||
        guidance.includes("ground segment") ||
        guidance.includes("mission control") ||
        guidance.includes("tt&c")
      ) {
        priorityFlags.push("high_priority_ground_infra");
      }
    }

    // EU Space Act overlap flag
    if (req.euSpaceActRef) {
      priorityFlags.push("eu_space_act_overlap");
    }

    // Severity-based priority
    if (req.severity === "critical") {
      priorityFlags.push("critical_severity");
    }

    results.push({
      requirementId: req.id,
      suggestedStatus,
      reason: reasons.length > 0 ? `[Auto-assessed] ${reasons.join(" ")}` : "",
      proportionalityNote,
      priorityFlags,
    });
  }

  return results;
}

// ─── Function 2: Generate Recommendations & Gap Analysis ───

interface RequirementStatusRecord {
  requirementId: string;
  status: string;
  notes: string | null;
}

interface RequirementMetaRecord {
  title: string;
  articleRef: string;
  category: string;
  severity: string;
  iso27001Ref?: string;
  euSpaceActRef?: string;
  canBeSimplified?: boolean;
  implementationTimeWeeks?: number;
  complianceQuestion?: string;
}

interface AssessmentProfile {
  hasISO27001: boolean;
  hasExistingCSIRT: boolean;
  hasRiskManagement: boolean;
  operatesGroundInfra: boolean;
  operatesSatComms: boolean;
  organizationSize: string | null;
  entityClassification: string | null;
  subSector: string | null;
}

export function generateRecommendations(
  profile: AssessmentProfile,
  requirementStatuses: RequirementStatusRecord[],
  requirementMeta: Record<string, RequirementMetaRecord>,
): SmartRecommendations {
  const totalReqs = requirementStatuses.length;

  // ── ISO 27001 Coverage ──
  const iso27001Reqs = requirementStatuses.filter((rs) => {
    const meta = requirementMeta[rs.requirementId];
    return meta?.iso27001Ref;
  });
  const iso27001Coverage = {
    count: iso27001Reqs.length,
    total: totalReqs,
    percentage:
      totalReqs > 0 ? Math.round((iso27001Reqs.length / totalReqs) * 100) : 0,
  };

  // ── Critical Gaps ──
  const criticalGaps = requirementStatuses
    .filter((rs) => {
      const meta = requirementMeta[rs.requirementId];
      return (
        meta?.severity === "critical" &&
        (rs.status === "not_assessed" || rs.status === "non_compliant")
      );
    })
    .map((rs) => {
      const meta = requirementMeta[rs.requirementId];
      return {
        id: rs.requirementId,
        title: meta.title,
        articleRef: meta.articleRef,
        implementationWeeks: meta.implementationTimeWeeks || 0,
      };
    })
    .sort((a, b) => b.implementationWeeks - a.implementationWeeks);

  // ── EU Space Act Overlap ──
  const euOverlapReqs = requirementStatuses.filter((rs) => {
    const meta = requirementMeta[rs.requirementId];
    return meta?.euSpaceActRef;
  });
  const euArticles = [
    ...new Set(
      euOverlapReqs
        .map((rs) => requirementMeta[rs.requirementId]?.euSpaceActRef)
        .filter(Boolean) as string[],
    ),
  ];

  // ── Total Implementation Time (for gaps only) ──
  const gapReqs = requirementStatuses.filter(
    (rs) =>
      rs.status === "not_assessed" ||
      rs.status === "non_compliant" ||
      rs.status === "partial",
  );
  const totalImplementationWeeks = gapReqs.reduce((sum, rs) => {
    const meta = requirementMeta[rs.requirementId];
    return sum + (meta?.implementationTimeWeeks || 0);
  }, 0);

  // ── Auto-assessed count ──
  const autoAssessedCount = requirementStatuses.filter((rs) =>
    rs.notes?.startsWith("[Auto-assessed]"),
  ).length;

  // ── Context-Aware Recommendations ──
  const recommendations: string[] = [];

  if (profile.hasISO27001) {
    recommendations.push(
      `Your ISO 27001 certification covers ${iso27001Coverage.count} of ${totalReqs} requirements (${iso27001Coverage.percentage}%). Focus on the space-specific additions that go beyond your existing ISMS.`,
    );
  } else {
    recommendations.push(
      `Consider pursuing ISO 27001 certification — it would provide a foundation covering ${iso27001Coverage.count} of ${totalReqs} NIS2 requirements (${iso27001Coverage.percentage}%).`,
    );
  }

  if (criticalGaps.length > 0) {
    const topGap = criticalGaps[0];
    recommendations.push(
      `Priority: ${criticalGaps.length} critical gaps identified. Start with "${topGap.title}" (${topGap.articleRef}, ~${topGap.implementationWeeks} weeks).`,
    );
  } else {
    recommendations.push(
      "No critical gaps remaining — focus on achieving full compliance for major and minor requirements.",
    );
  }

  if (euOverlapReqs.length > 0) {
    recommendations.push(
      `${euOverlapReqs.length} requirements overlap with EU Space Act compliance. Coordinate with your existing Art. 74-85 measures to avoid duplicate work.`,
    );
  }

  if (profile.hasExistingCSIRT) {
    recommendations.push(
      "Your existing CSIRT reduces incident response implementation time. Ensure 24h early warning and 72h detailed reporting procedures are documented per Art. 23.",
    );
  } else {
    recommendations.push(
      "Establish an incident response capability (CSIRT/SOC) — NIS2 Art. 23 requires 24-hour early warning and 72-hour detailed notification to competent authorities.",
    );
  }

  if (profile.operatesGroundInfra) {
    recommendations.push(
      "As a ground infrastructure operator, prioritize physical security, TT&C link encryption, and network segmentation for mission control centres.",
    );
  }

  if (
    profile.organizationSize === "small" ||
    profile.organizationSize === "micro"
  ) {
    const simplifiableCount = requirementStatuses.filter((rs) => {
      const meta = requirementMeta[rs.requirementId];
      return meta?.canBeSimplified;
    }).length;
    recommendations.push(
      `As a ${profile.organizationSize} entity, ${simplifiableCount} of ${totalReqs} requirements allow proportionate implementation under Art. 21(1).`,
    );
  }

  if (autoAssessedCount > 0) {
    recommendations.push(
      `${autoAssessedCount} requirements were auto-assessed as "partial" based on your profile. Review and confirm or adjust each one.`,
    );
  }

  // ── Implementation Phases ──
  const implementationPhases = generateImplementationPhases(
    profile,
    requirementStatuses,
    requirementMeta,
  );

  return {
    iso27001Coverage,
    criticalGaps: criticalGaps.slice(0, 5),
    euSpaceActOverlap: {
      count: euOverlapReqs.length,
      articles: euArticles,
    },
    totalImplementationWeeks,
    recommendations,
    implementationPhases,
    autoAssessedCount,
  };
}

// ─── Implementation Phase Generator ───

function generateImplementationPhases(
  profile: AssessmentProfile,
  requirementStatuses: RequirementStatusRecord[],
  requirementMeta: Record<string, RequirementMetaRecord>,
): ImplementationPhase[] {
  const phases: ImplementationPhase[] = [];
  const usedReqIds = new Set<string>();

  // Helper to build phase requirement entries
  function toPhaseReq(
    rs: RequirementStatusRecord,
    rationale: string,
  ): ImplementationPhaseRequirement {
    const meta = requirementMeta[rs.requirementId];
    return {
      id: rs.requirementId,
      title: meta?.title || rs.requirementId,
      articleRef: meta?.articleRef || "",
      severity: meta?.severity || "minor",
      category: categoryLabels[meta?.category || ""] || meta?.category || "",
      estimatedWeeks: meta?.implementationTimeWeeks || 0,
      rationale,
    };
  }

  // ── Phase 1: Quick Wins ──
  // Already partial, ISO-covered, or simplifiable for small entities
  const quickWins = requirementStatuses
    .filter((rs) => {
      if (rs.status === "compliant" || rs.status === "not_applicable")
        return false;
      const meta = requirementMeta[rs.requirementId];
      if (!meta) return false;
      return (
        rs.status === "partial" ||
        (profile.hasISO27001 && meta.iso27001Ref) ||
        ((profile.organizationSize === "small" ||
          profile.organizationSize === "micro") &&
          meta.canBeSimplified)
      );
    })
    .map((rs) => {
      const meta = requirementMeta[rs.requirementId];
      let rationale = "Standard implementation";
      if (rs.status === "partial") {
        rationale = "Already partially implemented — complete remaining gaps";
      } else if (profile.hasISO27001 && meta?.iso27001Ref) {
        rationale = `Leverage ISO 27001 ${meta.iso27001Ref}`;
      } else if (meta?.canBeSimplified) {
        rationale = "Eligible for proportionate implementation";
      }
      return { rs, rationale };
    })
    .sort(
      (a, b) =>
        (requirementMeta[a.rs.requirementId]?.implementationTimeWeeks || 0) -
        (requirementMeta[b.rs.requirementId]?.implementationTimeWeeks || 0),
    );

  if (quickWins.length > 0) {
    const reqs = quickWins.map(({ rs, rationale }) => {
      usedReqIds.add(rs.requirementId);
      return toPhaseReq(rs, rationale);
    });
    phases.push({
      phase: 1,
      name: "Quick Wins",
      description:
        "Leverage existing certifications, partial implementations, and proportionate measures",
      totalWeeks: Math.max(...reqs.map((r) => r.estimatedWeeks), 0),
      requirements: reqs,
    });
  }

  // ── Phase 2: Critical Gaps ──
  const criticalGaps = requirementStatuses
    .filter((rs) => {
      if (usedReqIds.has(rs.requirementId)) return false;
      if (rs.status === "compliant" || rs.status === "not_applicable")
        return false;
      const meta = requirementMeta[rs.requirementId];
      return meta?.severity === "critical";
    })
    .map((rs) => {
      usedReqIds.add(rs.requirementId);
      return toPhaseReq(rs, "Critical for NIS2 baseline compliance");
    });

  if (criticalGaps.length > 0) {
    phases.push({
      phase: 2,
      name: "Critical Gaps",
      description:
        "Essential requirements that must be addressed first for NIS2 compliance",
      totalWeeks: Math.max(...criticalGaps.map((r) => r.estimatedWeeks), 0),
      requirements: criticalGaps,
    });
  }

  // ── Phase 3: Major Items ──
  const majorItems = requirementStatuses
    .filter((rs) => {
      if (usedReqIds.has(rs.requirementId)) return false;
      if (rs.status === "compliant" || rs.status === "not_applicable")
        return false;
      const meta = requirementMeta[rs.requirementId];
      return meta?.severity === "major";
    })
    .map((rs) => {
      usedReqIds.add(rs.requirementId);
      const meta = requirementMeta[rs.requirementId];
      return toPhaseReq(
        rs,
        `Category: ${categoryLabels[meta?.category || ""] || meta?.category || "General"}`,
      );
    });

  if (majorItems.length > 0) {
    phases.push({
      phase: 3,
      name: "Major Items",
      description:
        "Important requirements for comprehensive compliance coverage",
      totalWeeks: Math.max(...majorItems.map((r) => r.estimatedWeeks), 0),
      requirements: majorItems,
    });
  }

  // ── Phase 4: Minor Items ──
  const minorItems = requirementStatuses
    .filter((rs) => {
      if (usedReqIds.has(rs.requirementId)) return false;
      if (rs.status === "compliant" || rs.status === "not_applicable")
        return false;
      return true;
    })
    .map((rs) => {
      usedReqIds.add(rs.requirementId);
      return toPhaseReq(rs, "Documentation and continuous improvement");
    });

  if (minorItems.length > 0) {
    phases.push({
      phase: 4,
      name: "Minor Items",
      description:
        "Lower-priority requirements, documentation, and refinements",
      totalWeeks: Math.max(...minorItems.map((r) => r.estimatedWeeks), 0),
      requirements: minorItems,
    });
  }

  return phases;
}
