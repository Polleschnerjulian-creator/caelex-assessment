/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY CRA Compliance Calculation Engine
 *
 * Three-phase pipeline:
 * 1. Scope check (OSS, EU establishment, economic operator role)
 * 2. Product classification (taxonomy + rule engine validation)
 * 3. Compliance calculation (requirements, NIS2 overlap, timelines)
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

import type {
  CRAAssessmentAnswers,
  CRAProductClass,
  CRAConformityRoute,
  CRAComplianceResult,
  CRARequirement,
  ClassificationStep,
  ClassificationConflict,
  RedactedCRAComplianceResult,
} from "./cra-types";
import { getSpaceProductById } from "@/data/cra-taxonomy";
import {
  classifyByRules,
  detectClassificationConflict,
} from "./cra-rule-engine.server";
import { CROSS_REFERENCES } from "@/data/cross-references";
import { EngineDataError } from "@/lib/engines/shared.server";

// ─── Lazy import for CRA requirements ───

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — cra-requirements.ts is created in Task 6; lazy import compiles fine at runtime
let _craRequirementsModule: typeof import("@/data/cra-requirements") | null =
  null;

async function getCRARequirementsModule() {
  if (!_craRequirementsModule) {
    try {
      // @ts-expect-error — cra-requirements.ts created in Task 6
      _craRequirementsModule = await import("@/data/cra-requirements");
    } catch (error) {
      throw new EngineDataError("CRA requirements data could not be loaded", {
        engine: "cra",
        dataFile: "cra-requirements.ts",
        cause: error,
      });
    }
  }
  return _craRequirementsModule;
}

// ─── Phase 1: Scope Check ───

function checkScope(answers: CRAAssessmentAnswers): {
  isOutOfScope: boolean;
  outOfScopeReason?: string;
  scopeSteps: ClassificationStep[];
  flags: string[];
} {
  const scopeSteps: ClassificationStep[] = [];
  const flags: string[] = [];

  // OSS check
  if (
    answers.isOSSComponent === true &&
    answers.isCommerciallySupplied !== true
  ) {
    scopeSteps.push({
      criterion: "Non-commercially supplied open-source software",
      legalBasis: "Art. 3 Nr. 12-14, Recital 18-20 CRA (EU) 2024/2847",
      annexRef: "N/A",
      satisfied: true,
      reasoning: "Product is non-commercial OSS — excluded from CRA scope.",
    });
    return {
      isOutOfScope: true,
      outOfScopeReason:
        "Non-commercially supplied open-source software is excluded from CRA scope (Art. 3 Nr. 12-14, Recital 18-20).",
      scopeSteps,
      flags,
    };
  }

  // EU establishment check
  if (answers.isEUEstablished === false) {
    flags.push("authorized_representative_required");
    scopeSteps.push({
      criterion: "Non-EU manufacturer placing product on EU market",
      legalBasis: "Art. 4(2) CRA (EU) 2024/2847",
      annexRef: "N/A",
      satisfied: true,
      reasoning:
        "Manufacturer is established outside the EU. CRA still applies to products placed on the EU market, but an authorized representative in the EU is required under Art. 4(2).",
    });
  }

  // Economic operator role check (Phase 1: manufacturer only)
  if (answers.economicOperatorRole !== "manufacturer") {
    return {
      isOutOfScope: true,
      outOfScopeReason: `CRA assessment for ${answers.economicOperatorRole} role is planned for Phase 2. Phase 1 covers manufacturer obligations only.`,
      scopeSteps,
      flags,
    };
  }

  return { isOutOfScope: false, scopeSteps, flags };
}

// ─── Phase 2: Product Classification ───

export function classifyCRAProduct(answers: CRAAssessmentAnswers): {
  classification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  conflict?: ClassificationConflict;
  isOutOfScope: boolean;
  outOfScopeReason?: string;
} {
  // Phase 1: Scope check
  const scope = checkScope(answers);
  if (scope.isOutOfScope) {
    return {
      classification: "default",
      classificationReasoning: scope.scopeSteps,
      conformityRoute: "self_assessment",
      isOutOfScope: true,
      outOfScopeReason: scope.outOfScopeReason,
    };
  }

  // Phase 2a: Taxonomy path
  if (answers.spaceProductTypeId) {
    const taxonomyProduct = getSpaceProductById(answers.spaceProductTypeId);
    if (taxonomyProduct) {
      // Run rule engine as validation
      const ruleResult = classifyByRules(answers);
      const conflict = detectClassificationConflict(
        taxonomyProduct.classification,
        ruleResult,
      );

      return {
        classification: taxonomyProduct.classification,
        classificationReasoning: taxonomyProduct.classificationReasoning,
        conformityRoute: taxonomyProduct.conformityRoute,
        conflict,
        isOutOfScope: false,
      };
    }
    // Taxonomy ID not found — fall through to rule engine
  }

  // Phase 2b: Rule engine path
  const ruleResult = classifyByRules(answers);
  return {
    classification: ruleResult.classification,
    classificationReasoning: ruleResult.steps,
    conformityRoute: ruleResult.conformityRoute,
    isOutOfScope: ruleResult.isOutOfScope,
    outOfScopeReason: ruleResult.outOfScopeReason,
  };
}

// ─── Phase 3: Compliance Calculation ───

export async function calculateCRACompliance(
  answers: CRAAssessmentAnswers,
): Promise<CRAComplianceResult> {
  // Classify
  const classification = classifyCRAProduct(answers);

  // Load requirements
  const reqModule = await getCRARequirementsModule();
  const applicableRequirements = reqModule.getApplicableCRARequirements(
    classification.classification,
    answers,
  );

  // Calculate NIS2 overlap
  const nis2Overlap = calculateNIS2Overlap(applicableRequirements);

  return {
    productClassification: classification.classification,
    classificationReasoning: classification.classificationReasoning,
    conformityRoute: classification.conformityRoute,
    conflict: classification.conflict,
    applicableRequirements,
    nis2Overlap,
    supportPeriodYears: 5,
    reportingTimeline: {
      activelyExploitedVuln: "24h to ENISA (Art. 14(2)(a))",
      severeIncident: "72h to ENISA (Art. 14(2)(b))",
      patchRelease: "14 days after patch availability (Art. 14(2)(c))",
    },
    penalties: {
      maxFine: "EUR 15,000,000 or 2.5% of worldwide annual turnover",
      calculationBasis:
        "Art. 64(1) CRA — for non-compliance with essential requirements in Annex I",
    },
    keyDates: [
      {
        date: "2024-12-10",
        description: "CRA entered into force",
        articleRef: "Art. 71",
      },
      {
        date: "2026-09-11",
        description:
          "Reporting obligations for actively exploited vulnerabilities apply",
        articleRef: "Art. 14, Art. 71(2)",
      },
      {
        date: "2027-12-11",
        description: "Full application of all CRA requirements",
        articleRef: "Art. 71(2)",
      },
    ],
  };
}

// ─── NIS2 Overlap Calculation ───

function calculateNIS2Overlap(
  requirements: CRARequirement[],
): CRAComplianceResult["nis2Overlap"] {
  const overlapping: CRAComplianceResult["nis2Overlap"]["overlappingRequirements"] =
    [];
  let savingsMin = 0;
  let savingsMax = 0;

  // Build xref lookup by ID for O(1) access — no string parsing
  const xrefById = new Map(CROSS_REFERENCES.map((ref) => [ref.id, ref]));

  for (const req of requirements) {
    if (!req.nis2RequirementIds || req.nis2RequirementIds.length === 0)
      continue;

    // Use direct crossRefIds for relationship lookup
    const reqXrefs = (req.crossRefIds ?? [])
      .map((id) => xrefById.get(id))
      .filter(Boolean);

    // Determine relationship from cross-references, fallback to "overlaps"
    const relationship: "implements" | "overlaps" | "extends" =
      (reqXrefs[0]?.relationship as "implements" | "overlaps" | "extends") ??
      "overlaps";

    for (const nis2Id of req.nis2RequirementIds) {
      overlapping.push({
        craRequirementId: req.id,
        nis2RequirementId: nis2Id,
        relationship,
      });
    }

    // Calculate savings range based on relationship (per requirement, not per nis2Id)
    const weeks = req.implementationTimeWeeks;
    switch (relationship) {
      case "implements":
        savingsMin += weeks * 0.7;
        savingsMax += weeks * 0.9;
        break;
      case "overlaps":
        savingsMin += weeks * 0.4;
        savingsMax += weeks * 0.6;
        break;
      case "extends":
        savingsMin += weeks * 0.1;
        savingsMax += weeks * 0.3;
        break;
    }
  }

  return {
    overlappingRequirementCount: overlapping.length,
    overlappingRequirements: overlapping,
    estimatedSavingsRange: {
      min: Math.round(savingsMin),
      max: Math.round(savingsMax),
    },
    disclaimer:
      "Schätzung basierend auf typischen Implementierungsaufwänden. Tatsächliche Einsparungen hängen von der Tiefe Ihrer bestehenden NIS2-Compliance ab.",
  };
}

// ─── Redaction for Public API ───

export function redactCRAResultForClient(
  result: CRAComplianceResult,
): RedactedCRAComplianceResult {
  return {
    productClassification: result.productClassification,
    classificationReasoning: result.classificationReasoning,
    conformityRoute: result.conformityRoute,
    applicableRequirementCount: result.applicableRequirements.length,
    nis2OverlapCount: result.nis2Overlap.overlappingRequirementCount,
  };
}
