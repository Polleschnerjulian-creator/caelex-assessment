/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY CRA Auto-Assessment Engine
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

import type {
  CRAAssessmentAnswers,
  CRARequirement,
  CRAAutoAssessmentResult,
} from "./cra-types";

export function generateCRAAutoAssessments(
  requirements: CRARequirement[],
  answers: CRAAssessmentAnswers,
): CRAAutoAssessmentResult[] {
  const results: CRAAutoAssessmentResult[] = [];

  for (const req of requirements) {
    let suggestedStatus: "partial" | "not_assessed" = "not_assessed";
    const reasons: string[] = [];
    let proportionalityNote: string | undefined;
    const priorityFlags: string[] = [];

    // Rule 1: IEC 62443 coverage
    if (answers.hasIEC62443 && req.iec62443Ref) {
      suggestedStatus = "partial";
      reasons.push(
        `IEC 62443 certification provides partial coverage for ${req.iec62443Ref}. Review product-specific applicability.`,
      );
    }

    // Rule 2: Common Criteria coverage
    if (
      answers.hasCommonCriteria &&
      (req.category === "security_by_design" ||
        req.category === "vulnerability_handling")
    ) {
      suggestedStatus = "partial";
      reasons.push(
        "Common Criteria evaluation covers design assurance and vulnerability analysis relevant to this requirement.",
      );
    }

    // Rule 3: ISO 27001 coverage
    if (answers.hasISO27001 && req.iso27001Ref) {
      suggestedStatus = "partial";
      reasons.push(
        `ISO 27001 certification provides organizational-level coverage for ${req.iso27001Ref}. Product-level evidence still needed.`,
      );
    }

    // Rule 4: NIS2 overlap (requirement-level, not assessment-level)
    if (req.nis2RequirementIds && req.nis2RequirementIds.length > 0) {
      priorityFlags.push("nis2_overlap");
    }

    // Rule 5: Proportionality for default-class products
    if (req.canBeSimplified) {
      proportionalityNote =
        "Default-class products may use simplified self-assessment under Annex VIII. Proportionate implementation measures apply.";
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
