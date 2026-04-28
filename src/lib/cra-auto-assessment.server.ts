/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
import { prisma } from "@/lib/prisma";

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

export async function generateNIS2PropagatedAssessments(
  requirements: CRARequirement[],
  nis2AssessmentId: string,
): Promise<CRAAutoAssessmentResult[]> {
  // Fetch all NIS2 requirement statuses for the linked assessment
  const nis2Statuses = await prisma.nIS2RequirementStatus.findMany({
    where: { assessmentId: nis2AssessmentId },
  });

  const nis2StatusMap = new Map(nis2Statuses.map((s) => [s.requirementId, s]));

  const results: CRAAutoAssessmentResult[] = [];

  for (const req of requirements) {
    if (!req.nis2RequirementIds || req.nis2RequirementIds.length === 0) {
      continue;
    }

    // Find the best NIS2 status among overlapping requirements
    const overlappingStatuses = req.nis2RequirementIds
      .map((id) => nis2StatusMap.get(id))
      .filter(Boolean);

    const bestStatus =
      overlappingStatuses.find((s) => s!.status === "compliant") ||
      overlappingStatuses.find((s) => s!.status === "partial");

    if (!bestStatus) continue;

    const nis2Status = bestStatus.status;
    const nis2ReqId = bestStatus.requirementId;

    results.push({
      requirementId: req.id,
      suggestedStatus: "partial",
      reason: `[Auto-propagated] Teilerfüllt durch NIS2-Compliance: ${nis2ReqId} (Status: ${nis2Status}). ${
        nis2Status === "compliant"
          ? "NIS2 entity-level compliance provides strong evidence for this CRA product-level requirement."
          : "NIS2 partial compliance provides initial evidence. Product-level verification still needed."
      }${req.nis2Ref ? ` Referenz: ${req.nis2Ref}.` : ""}`,
      priorityFlags: ["nis2_propagated"],
    });
  }

  return results;
}
