/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * CRA (EU) 2024/2847 compliance type definitions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { NIS2SpaceSubSector } from "./nis2-types";
import type { AssessmentField, ComplianceRule } from "@/lib/compliance/types";

// ─── CRA Product Classification ───

export type CRAProductClass = "default" | "class_I" | "class_II";

export type CRAConformityRoute =
  | "self_assessment"
  | "harmonised_standard"
  | "third_party_type_exam"
  | "full_quality_assurance";

export type CRAEconomicOperatorRole =
  | "manufacturer"
  | "importer"
  | "distributor";

// ─── Space Product Segment ───

export type SpaceProductSegment = "space" | "ground" | "link" | "user";

// ─── Classification Reasoning Chain ───

export interface ClassificationStep {
  criterion: string;
  legalBasis: string;
  annexRef: string;
  annexCategory?: string;
  satisfied: boolean;
  reasoning: string;
}

// ─── Space Product Taxonomy Entry ───

export interface CRASpaceProductType {
  id: string;
  name: string;
  segments: SpaceProductSegment[];
  description: string;
  classification: CRAProductClass;
  conformityRoute: CRAConformityRoute;
  classificationReasoning: ClassificationStep[];
  nis2SubSectors: NIS2SpaceSubSector[];
}

// ─── Classification Conflict ───

export interface ClassificationConflict {
  taxonomyClass: CRAProductClass;
  ruleEngineClass: CRAProductClass;
  conflictingSteps: ClassificationStep[];
  recommendation: string;
}

// ─── Assessment Input ───

export interface CRAAssessmentAnswers {
  economicOperatorRole: CRAEconomicOperatorRole;
  isEUEstablished: boolean | null;

  spaceProductTypeId: string | null;
  productName: string;
  productVersion?: string;

  hasNetworkFunction: boolean | null;
  processesAuthData: boolean | null;
  usedInCriticalInfra: boolean | null;
  performsCryptoOps: boolean | null;
  controlsPhysicalSystem: boolean | null;
  hasMicrocontroller: boolean | null;
  isOSSComponent: boolean | null;
  isCommerciallySupplied: boolean | null;

  segments: SpaceProductSegment[];
  isSafetyCritical: boolean | null;
  hasRedundancy: boolean | null;
  processesClassifiedData: boolean | null;

  hasIEC62443: boolean | null;
  hasETSIEN303645: boolean | null;
  hasCommonCriteria: boolean | null;
  hasISO27001: boolean | null;
}

// ─── CRA Requirement Categories (Annex I structure) ───

export type CRARequirementCategory =
  | "security_by_design"
  | "vulnerability_handling"
  | "documentation"
  | "conformity_assessment"
  | "incident_reporting"
  | "post_market_obligations"
  | "software_update"
  | "sbom"
  | "support_period";

export type CRARequirementSeverity = "critical" | "major" | "minor";

// ─── CRA Requirement ───

export interface CRARequirement {
  id: string;
  articleRef: string;
  category: CRARequirementCategory;
  title: string;
  description: string;
  complianceQuestion: string;
  spaceSpecificGuidance: string;
  applicableTo: {
    productClasses?: CRAProductClass[];
    segments?: SpaceProductSegment[];
    roles?: CRAEconomicOperatorRole[];
  };
  nis2Ref?: string;
  nis2RequirementIds?: string[];
  crossRefIds?: string[];
  iso27001Ref?: string;
  iec62443Ref?: string;
  ecssRef?: string;
  assessmentFields: AssessmentField[];
  complianceRule: ComplianceRule;
  severity: CRARequirementSeverity;
  implementationTimeWeeks: number;
  canBeSimplified: boolean;
}

// ─── Engine Output ───

export interface CRAComplianceResult {
  productClassification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  conflict?: ClassificationConflict;
  applicableRequirements: CRARequirement[];
  nis2Overlap: {
    overlappingRequirementCount: number;
    overlappingRequirements: Array<{
      craRequirementId: string;
      nis2RequirementId: string;
      relationship: "implements" | "overlaps" | "extends";
    }>;
    estimatedSavingsRange: { min: number; max: number };
    disclaimer: string;
  };
  supportPeriodYears: number;
  reportingTimeline: {
    activelyExploitedVuln: string;
    severeIncident: string;
    patchRelease: string;
  };
  penalties: {
    maxFine: string;
    calculationBasis: string;
  };
  keyDates: Array<{ date: string; description: string; articleRef: string }>;
}

export interface RedactedCRAComplianceResult {
  productClassification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  applicableRequirementCount: number;
  nis2OverlapCount: number;
}

// ─── Auto-Assessment Types ───

export interface CRAAutoAssessmentResult {
  requirementId: string;
  suggestedStatus: "partial" | "not_assessed";
  reason: string;
  proportionalityNote?: string;
  priorityFlags: string[];
}
