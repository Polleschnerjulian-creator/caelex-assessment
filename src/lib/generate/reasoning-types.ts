/**
 * Generate 2.0 — Reasoning Plan Types
 *
 * Types for the pre-generation reasoning plan that gives Claude
 * precise per-section instructions instead of open-ended prompts.
 */

import type { NCADocumentType } from "./types";

// ─── Section Plan ───

export interface SectionPlan {
  sectionIndex: number;
  sectionTitle: string;
  availableData: DataPoint[];
  missingData: MissingDataPoint[];
  complianceVerdict: ComplianceVerdict;
  confidenceLevel: ConfidenceLevel;
  verdictRationale: string;
  writingStrategy: string;
  warnings: PlanWarning[];
  estimatedActionRequired: number;
}

export type ComplianceVerdict =
  | "compliant"
  | "substantially_compliant"
  | "partially_compliant"
  | "non_compliant"
  | "not_applicable";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface DataPoint {
  source: "debris" | "cybersecurity" | "spacecraft" | "user" | "organization";
  field: string;
  value: string | number | boolean;
  articleRef: string;
}

export interface MissingDataPoint {
  source: "debris" | "cybersecurity" | "spacecraft" | "user" | "organization";
  field: string;
  weight: 3 | 2 | 1;
  articleRef: string;
  defaultAssumption: string | null;
}

export interface PlanWarning {
  type:
    | "missing_critical_data"
    | "default_assumption"
    | "conflicting_data"
    | "nca_specific";
  message: string;
  actionable: boolean;
  suggestion: string | null;
}

// ─── Cross-References ───

export interface CrossReference {
  fromSection: number;
  toDocumentType: NCADocumentType;
  toSection: number | null;
  relationship: "references" | "depends_on" | "supersedes" | "conflicts_with";
  description: string;
}

// ─── Full Plan ───

export interface ReasoningPlan {
  id?: string;
  documentType: NCADocumentType;
  targetNCA: string | null;
  overallStrategy: string;
  estimatedComplianceLevel: "high" | "medium" | "low";
  sections: SectionPlan[];
  crossReferences: CrossReference[];
  userModified: boolean;
}
