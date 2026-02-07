/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Cross-Regulation Compliance Service
 *
 * This is the core differentiator — maps requirements across NIS2, EU Space Act,
 * ENISA Space Threat Landscape, and ISO 27001, showing operators which obligations
 * overlap and where they can save effort by implementing once.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import {
  CrossReference,
  RegulationType,
  NIS2Requirement,
  UnifiedComplianceCategory,
  OverlapSavingsReport,
} from "@/lib/nis2-types";
import { CROSS_REFERENCES } from "@/data/cross-references";

// Lazy-load heavy data files
let _nis2RequirementsModule: typeof import("@/data/nis2-requirements") | null =
  null;
let _enisaControlsModule: typeof import("@/data/enisa-space-controls") | null =
  null;

async function getNIS2Requirements() {
  if (!_nis2RequirementsModule) {
    _nis2RequirementsModule = await import("@/data/nis2-requirements");
  }
  return _nis2RequirementsModule;
}

async function getENISAControls() {
  if (!_enisaControlsModule) {
    _enisaControlsModule = await import("@/data/enisa-space-controls");
  }
  return _enisaControlsModule;
}

// ─── Category Label Mapping ───

const CATEGORY_LABELS: Record<string, string> = {
  policies_risk_analysis: "Risk Analysis & Security Policies",
  incident_handling: "Incident Handling",
  business_continuity: "Business Continuity & Crisis Management",
  supply_chain: "Supply Chain Security",
  network_acquisition: "Network & System Security",
  effectiveness_assessment: "Security Effectiveness Assessment",
  cyber_hygiene: "Cyber Hygiene & Training",
  cryptography: "Cryptography & Encryption",
  hr_access_asset: "HR Security & Access Control",
  mfa_authentication: "Multi-Factor Authentication",
  governance: "Governance & Accountability",
  registration: "Registration & Notification",
  reporting: "Incident Reporting",
  information_sharing: "Information Sharing",
};

// ─── Core Functions ───

/**
 * Build a unified compliance matrix grouping requirements across
 * NIS2, EU Space Act, ENISA, and ISO 27001 by category.
 *
 * This is the key visualization data — shows operators how obligations
 * map across frameworks so they can implement once and satisfy many.
 */
export async function buildUnifiedComplianceMatrix(
  applicableRequirements: NIS2Requirement[],
): Promise<UnifiedComplianceCategory[]> {
  const { ENISA_SPACE_CONTROLS } = await getENISAControls();

  // Group NIS2 requirements by category
  const byCategory = new Map<string, NIS2Requirement[]>();
  for (const req of applicableRequirements) {
    const existing = byCategory.get(req.category) || [];
    existing.push(req);
    byCategory.set(req.category, existing);
  }

  const matrix: UnifiedComplianceCategory[] = [];

  for (const [category, requirements] of byCategory) {
    // Collect all EU Space Act articles referenced by these requirements
    const euSpaceActArticles = new Set<string>();
    const enisaControlIds = new Set<string>();
    const iso27001Refs = new Set<string>();

    for (const req of requirements) {
      if (req.euSpaceActRef) {
        euSpaceActArticles.add(req.euSpaceActRef);
      }
      if (req.enisaControlIds) {
        req.enisaControlIds.forEach((id) => enisaControlIds.add(id));
      }
      if (req.iso27001Ref) {
        iso27001Refs.add(req.iso27001Ref);
      }
    }

    // Also find ENISA controls that map to this NIS2 category via cross-references
    const categoryNis2Articles = requirements.map((r) => r.articleRef);
    for (const control of ENISA_SPACE_CONTROLS) {
      if (
        control.nis2Mapping &&
        categoryNis2Articles.some((art) =>
          control.nis2Mapping?.includes(art.replace("NIS2 ", "")),
        )
      ) {
        enisaControlIds.add(control.id);
      }
    }

    // Determine overlap effort type
    const hasEUSpaceActOverlap = euSpaceActArticles.size > 0;
    const hasMultipleFrameworks =
      hasEUSpaceActOverlap &&
      (enisaControlIds.size > 0 || iso27001Refs.size > 0);

    let complianceEffort: UnifiedComplianceCategory["complianceEffort"];
    if (hasMultipleFrameworks) {
      complianceEffort = "single_implementation";
    } else if (hasEUSpaceActOverlap) {
      complianceEffort = "partial_overlap";
    } else {
      complianceEffort = "separate_effort";
    }

    // Build description
    const primaryReq = requirements[0];
    const overlapNote =
      complianceEffort === "single_implementation"
        ? ` Implementing this for NIS2 also satisfies EU Space Act ${Array.from(euSpaceActArticles).join(", ")} and ${enisaControlIds.size} ENISA control(s).`
        : complianceEffort === "partial_overlap"
          ? ` Partial overlap with EU Space Act ${Array.from(euSpaceActArticles).join(", ")}.`
          : "";

    matrix.push({
      category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      nis2Requirement: primaryReq,
      euSpaceActArticles: Array.from(euSpaceActArticles),
      enisaControls: Array.from(enisaControlIds),
      iso27001Refs: Array.from(iso27001Refs),
      complianceEffort,
      description: `${requirements.length} NIS2 requirement(s) in this category.${overlapNote}`,
    });
  }

  // Sort by effort type (single_implementation first — show value)
  const effortOrder: Record<string, number> = {
    single_implementation: 0,
    partial_overlap: 1,
    separate_effort: 2,
  };
  matrix.sort(
    (a, b) => effortOrder[a.complianceEffort] - effortOrder[b.complianceEffort],
  );

  return matrix;
}

/**
 * Calculate overlap savings between NIS2 and EU Space Act.
 *
 * This answers the key business question:
 * "If I'm already preparing for the EU Space Act, how much of NIS2 is already covered?"
 */
export async function calculateOverlapSavings(
  applicableRequirements: NIS2Requirement[],
): Promise<OverlapSavingsReport> {
  const totalNIS2 = applicableRequirements.length;

  let satisfiedByEUSpaceAct = 0;
  let partiallySatisfied = 0;
  let additionalEffortRequired = 0;
  let weeksSaved = 0;

  for (const req of applicableRequirements) {
    // Check cross-references for this NIS2 requirement
    const xrefs = CROSS_REFERENCES.filter(
      (ref) =>
        (ref.sourceRegulation === "nis2" &&
          ref.sourceArticle === req.articleRef.replace("NIS2 ", "")) ||
        (ref.targetRegulation === "nis2" &&
          ref.targetArticle === req.articleRef.replace("NIS2 ", "")),
    );

    const hasEUSpaceActOverlap = xrefs.some(
      (ref) =>
        ref.sourceRegulation === "eu_space_act" ||
        ref.targetRegulation === "eu_space_act",
    );

    if (!hasEUSpaceActOverlap) {
      additionalEffortRequired++;
      continue;
    }

    // Check relationship type
    const superseded = xrefs.some((ref) => ref.relationship === "supersedes");
    const overlaps = xrefs.some((ref) => ref.relationship === "overlaps");

    if (superseded) {
      satisfiedByEUSpaceAct++;
      weeksSaved += req.implementationTimeWeeks || 2;
    } else if (overlaps) {
      partiallySatisfied++;
      weeksSaved += Math.ceil((req.implementationTimeWeeks || 2) * 0.5);
    } else {
      additionalEffortRequired++;
    }
  }

  const savingsPercentage =
    totalNIS2 > 0
      ? Math.round(
          ((satisfiedByEUSpaceAct + partiallySatisfied * 0.5) / totalNIS2) *
            100,
        )
      : 0;

  return {
    totalNIS2Requirements: totalNIS2,
    satisfiedByEUSpaceAct,
    partiallySatisfied,
    additionalEffortRequired,
    estimatedWeeksSaved: weeksSaved,
    savingsPercentage,
  };
}

/**
 * Get all overlapping requirements between NIS2 and EU Space Act.
 * Returns detailed breakdown for the crosswalk visualization.
 */
export async function getOverlappingRequirements(
  applicableRequirements: NIS2Requirement[],
): Promise<
  {
    nis2RequirementId: string;
    nis2Article: string;
    nis2Title: string;
    euSpaceActArticle: string;
    relationship: string;
    description: string;
    effortType: "single_implementation" | "partial_overlap" | "separate_effort";
  }[]
> {
  const overlaps: {
    nis2RequirementId: string;
    nis2Article: string;
    nis2Title: string;
    euSpaceActArticle: string;
    relationship: string;
    description: string;
    effortType: "single_implementation" | "partial_overlap" | "separate_effort";
  }[] = [];

  for (const req of applicableRequirements) {
    const articleShort = req.articleRef.replace("NIS2 ", "");

    const xrefs = CROSS_REFERENCES.filter(
      (ref) =>
        (ref.sourceRegulation === "nis2" &&
          ref.sourceArticle === articleShort &&
          ref.targetRegulation === "eu_space_act") ||
        (ref.sourceRegulation === "eu_space_act" &&
          ref.targetRegulation === "nis2" &&
          ref.targetArticle === articleShort),
    );

    for (const xref of xrefs) {
      const euArticle =
        xref.sourceRegulation === "eu_space_act"
          ? xref.sourceArticle
          : xref.targetArticle;

      let effortType:
        | "single_implementation"
        | "partial_overlap"
        | "separate_effort";
      if (
        xref.relationship === "supersedes" ||
        xref.relationship === "implements"
      ) {
        effortType = "single_implementation";
      } else if (xref.relationship === "overlaps") {
        effortType = "partial_overlap";
      } else {
        effortType = "separate_effort";
      }

      overlaps.push({
        nis2RequirementId: req.id,
        nis2Article: req.articleRef,
        nis2Title: req.title,
        euSpaceActArticle: euArticle,
        relationship: xref.relationship,
        description: xref.description,
        effortType,
      });
    }
  }

  return overlaps;
}

/**
 * Get cross-references for a specific NIS2 requirement.
 * Shows all related EU Space Act articles, ENISA controls, and ISO 27001 references.
 */
export function getCrossReferencesForRequirement(
  requirement: NIS2Requirement,
): {
  euSpaceAct: CrossReference[];
  enisa: CrossReference[];
  iso27001: CrossReference[];
  total: number;
} {
  const articleShort = requirement.articleRef.replace("NIS2 ", "");

  const allRefs = CROSS_REFERENCES.filter(
    (ref) =>
      (ref.sourceRegulation === "nis2" && ref.sourceArticle === articleShort) ||
      (ref.targetRegulation === "nis2" && ref.targetArticle === articleShort),
  );

  const euSpaceAct = allRefs.filter(
    (ref) =>
      ref.sourceRegulation === "eu_space_act" ||
      ref.targetRegulation === "eu_space_act",
  );
  const enisa = allRefs.filter(
    (ref) =>
      ref.sourceRegulation === "enisa_space" ||
      ref.targetRegulation === "enisa_space",
  );
  const iso27001 = allRefs.filter(
    (ref) =>
      ref.sourceRegulation === "iso27001" ||
      ref.targetRegulation === "iso27001",
  );

  return {
    euSpaceAct,
    enisa,
    iso27001,
    total: allRefs.length,
  };
}

/**
 * Get a summary of cross-regulation coverage for the dashboard.
 * Used to show a high-level "compliance synergy" overview.
 */
export async function getCrossRegulationSummary(): Promise<{
  totalCrossReferences: number;
  byRelationship: Record<string, number>;
  bySourceRegulation: Record<string, number>;
  nis2ToEUSpaceAct: { total: number; overlapping: number; superseded: number };
}> {
  const byRelationship: Record<string, number> = {};
  const bySourceRegulation: Record<string, number> = {};

  for (const ref of CROSS_REFERENCES) {
    byRelationship[ref.relationship] =
      (byRelationship[ref.relationship] || 0) + 1;
    bySourceRegulation[ref.sourceRegulation] =
      (bySourceRegulation[ref.sourceRegulation] || 0) + 1;
  }

  const nis2ToSpaceAct = CROSS_REFERENCES.filter(
    (ref) =>
      (ref.sourceRegulation === "nis2" &&
        ref.targetRegulation === "eu_space_act") ||
      (ref.sourceRegulation === "eu_space_act" &&
        ref.targetRegulation === "nis2"),
  );

  return {
    totalCrossReferences: CROSS_REFERENCES.length,
    byRelationship,
    bySourceRegulation,
    nis2ToEUSpaceAct: {
      total: nis2ToSpaceAct.length,
      overlapping: nis2ToSpaceAct.filter(
        (ref) => ref.relationship === "overlaps",
      ).length,
      superseded: nis2ToSpaceAct.filter(
        (ref) => ref.relationship === "supersedes",
      ).length,
    },
  };
}
