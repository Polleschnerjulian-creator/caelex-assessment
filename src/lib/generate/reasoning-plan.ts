/**
 * Generate 2.0 — Reasoning Plan Computation Engine
 *
 * Deterministic pre-generation engine that analyzes a Generate2DataBundle
 * and produces a structured ReasoningPlan: per-section verdict, confidence,
 * strategy, and warnings. No AI call. ~200ms.
 */

import "server-only";

import type { NCADocumentType, Generate2DataBundle } from "./types";
import { SECTION_DEFINITIONS } from "./section-definitions";
import {
  getSectionDataFields,
  type SectionDataField,
} from "./section-data-map";
import type {
  ReasoningPlan,
  SectionPlan,
  DataPoint,
  MissingDataPoint,
  PlanWarning,
  CrossReference,
  ComplianceVerdict,
  ConfidenceLevel,
} from "./reasoning-types";

// ─── Field Presence Check ────────────────────────────────────────────────────

/**
 * Returns true when a field carries a meaningful (non-empty) value in the
 * data bundle.  Mirrors the logic in readiness.ts so both engines agree.
 */
function isFieldPresent(
  field: SectionDataField,
  data: Generate2DataBundle,
): boolean {
  const { source, field: fieldName } = field;

  if (source === "spacecraft") {
    return data.spacecraft.length >= 1;
  }

  if (source === "user") {
    const value = data.operator[fieldName as keyof typeof data.operator];
    return value !== null && value !== undefined && value !== "";
  }

  if (source === "organization") {
    if (fieldName === "name") return !!data.operator.organizationName;
    return false;
  }

  if (source === "debris") {
    const assessment = data.debris?.assessment;
    if (!assessment) return false;
    const value = assessment[fieldName as keyof typeof assessment];
    return isMeaningful(
      value,
      fieldName,
      assessment as Record<string, unknown>,
    );
  }

  if (source === "cybersecurity") {
    const assessment = data.cybersecurity?.assessment;
    if (!assessment) return false;
    const value = assessment[fieldName as keyof typeof assessment];
    return isMeaningful(
      value,
      fieldName,
      assessment as Record<string, unknown>,
    );
  }

  return false;
}

function isMeaningful(
  value: unknown,
  fieldName: string,
  assessment: Record<string, unknown>,
): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return true;
  if (value === "" || value === 0) return false;
  return fieldName in assessment && !!value;
}

/** Retrieves the raw value of a field from the bundle (used for DataPoint.value). */
function getFieldValue(
  field: SectionDataField,
  data: Generate2DataBundle,
): string | number | boolean {
  const { source, field: fieldName } = field;

  if (source === "spacecraft") return data.spacecraft.length;
  if (source === "user") {
    const v = data.operator[fieldName as keyof typeof data.operator];
    return String(v ?? "");
  }
  if (source === "organization") {
    return data.operator.organizationName ?? "";
  }
  if (source === "debris") {
    const a = data.debris?.assessment;
    if (!a) return "";
    const v = a[fieldName as keyof typeof a];
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v;
    return String(v ?? "");
  }
  if (source === "cybersecurity") {
    const a = data.cybersecurity?.assessment;
    if (!a) return "";
    const v = a[fieldName as keyof typeof a];
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v;
    return String(v ?? "");
  }
  return "";
}

// ─── Section Plan Computation ────────────────────────────────────────────────

function computeSectionPlan(
  docType: NCADocumentType,
  sectionIndex: number,
  sectionTitle: string,
  data: Generate2DataBundle,
): SectionPlan {
  const fields = getSectionDataFields(docType, sectionIndex);

  const availableData: DataPoint[] = [];
  const missingData: MissingDataPoint[] = [];
  const warnings: PlanWarning[] = [];

  for (const field of fields) {
    const present = isFieldPresent(field, data);

    if (present) {
      availableData.push({
        source: field.source,
        field: field.field,
        value: getFieldValue(field, data),
        articleRef: field.articleRef ?? "",
      });
    } else {
      missingData.push({
        source: field.source,
        field: field.field,
        weight: field.weight,
        articleRef: field.articleRef ?? "",
        defaultAssumption: field.defaultAssumption ?? null,
      });

      if (field.weight === 3) {
        warnings.push({
          type: "missing_critical_data",
          message: `Critical field "${field.source}.${field.field}" is missing for section "${sectionTitle}".`,
          actionable: true,
          suggestion: field.defaultAssumption
            ? `Default assumption will be used: ${field.defaultAssumption}`
            : `Provide ${field.source} assessment data to improve this section.`,
        });
      } else if (field.defaultAssumption) {
        warnings.push({
          type: "default_assumption",
          message: `Field "${field.source}.${field.field}" not provided; default will be used.`,
          actionable: false,
          suggestion: field.defaultAssumption,
        });
      }
    }
  }

  // ── Verdict ──────────────────────────────────────────────────────────────

  const criticalFields = fields.filter((f) => f.weight === 3);
  const criticalPresent = criticalFields.every((f) => isFieldPresent(f, data));
  const missingCriticalCount = criticalFields.filter(
    (f) => !isFieldPresent(f, data),
  ).length;

  let complianceVerdict: ComplianceVerdict;
  if (fields.length === 0) {
    complianceVerdict = "not_applicable";
  } else if (criticalPresent && missingData.length === 0) {
    complianceVerdict = "compliant";
  } else if (criticalPresent) {
    complianceVerdict = "substantially_compliant";
  } else if (missingCriticalCount <= Math.ceil(criticalFields.length / 2)) {
    complianceVerdict = "partially_compliant";
  } else {
    complianceVerdict = "non_compliant";
  }

  // ── Confidence ────────────────────────────────────────────────────────────

  const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
  const presentWeight = availableData.reduce((sum, dp) => {
    const field = fields.find(
      (f) => f.field === dp.field && f.source === dp.source,
    );
    return sum + (field?.weight ?? 0);
  }, 0);

  const completeness = totalWeight > 0 ? presentWeight / totalWeight : 0;

  let confidenceLevel: ConfidenceLevel;
  if (completeness >= 0.8) {
    confidenceLevel = "high";
  } else if (completeness >= 0.4) {
    confidenceLevel = "medium";
  } else {
    confidenceLevel = "low";
  }

  // ── Rationale & Strategy ─────────────────────────────────────────────────

  const verdictRationale = buildVerdictRationale(
    complianceVerdict,
    availableData.length,
    missingData.length,
    criticalFields.length,
    missingCriticalCount,
  );

  const writingStrategy = buildWritingStrategy(
    complianceVerdict,
    confidenceLevel,
    sectionTitle,
  );

  // ── Estimated action required (0–5 scale) ────────────────────────────────

  const estimatedActionRequired = computeActionRequired(
    complianceVerdict,
    confidenceLevel,
  );

  return {
    sectionIndex,
    sectionTitle,
    availableData,
    missingData,
    complianceVerdict,
    confidenceLevel,
    verdictRationale,
    writingStrategy,
    warnings,
    estimatedActionRequired,
  };
}

function buildVerdictRationale(
  verdict: ComplianceVerdict,
  present: number,
  missing: number,
  totalCritical: number,
  missingCritical: number,
): string {
  if (verdict === "not_applicable")
    return "No data fields mapped to this section.";
  if (verdict === "compliant")
    return `All ${present} required data fields are present; ${totalCritical} critical field(s) confirmed.`;
  if (verdict === "substantially_compliant")
    return `All ${totalCritical} critical field(s) present; ${missing} non-critical field(s) missing.`;
  if (verdict === "partially_compliant")
    return `${missingCritical} of ${totalCritical} critical field(s) missing; ${present} fields available.`;
  return `${missingCritical} critical field(s) missing out of ${totalCritical}; only ${present} fields available.`;
}

function buildWritingStrategy(
  verdict: ComplianceVerdict,
  confidence: ConfidenceLevel,
  sectionTitle: string,
): string {
  if (verdict === "not_applicable") {
    return `Write ${sectionTitle} using standard boilerplate; no assessment data required.`;
  }
  if (verdict === "compliant" && confidence === "high") {
    return `Write ${sectionTitle} assertively using available data. Reference specific values and demonstrate full compliance.`;
  }
  if (verdict === "substantially_compliant") {
    return `Write ${sectionTitle} with high confidence for critical aspects. Flag minor gaps with placeholders for operator review.`;
  }
  if (verdict === "partially_compliant") {
    return `Write ${sectionTitle} cautiously. Use default assumptions for missing critical fields and clearly mark evidence placeholders.`;
  }
  if (verdict === "non_compliant") {
    return `Write ${sectionTitle} minimally. Document known gaps, list required actions, and insert prominent evidence placeholders.`;
  }
  // compliant + medium or low confidence (shouldn't normally occur but handle it)
  return `Write ${sectionTitle} using available data; supplement with standard language where data is sparse.`;
}

function computeActionRequired(
  verdict: ComplianceVerdict,
  confidence: ConfidenceLevel,
): number {
  const verdictScore: Record<ComplianceVerdict, number> = {
    compliant: 0,
    substantially_compliant: 1,
    partially_compliant: 2,
    non_compliant: 4,
    not_applicable: 0,
  };
  const confidencePenalty: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return Math.min(5, verdictScore[verdict] + confidencePenalty[confidence]);
}

// ─── Cross-References ────────────────────────────────────────────────────────

const CROSS_REFERENCE_MAP: Partial<
  Record<NCADocumentType, Array<Omit<CrossReference, "fromSection">>>
> = {
  DMP: [
    {
      toDocumentType: "ORBITAL_LIFETIME",
      toSection: null,
      relationship: "references",
      description:
        "DMP references orbital lifetime analysis (A2) for 25-year rule compliance.",
    },
    {
      toDocumentType: "EOL_DISPOSAL",
      toSection: null,
      relationship: "references",
      description:
        "DMP references end-of-life disposal plan (A4) for disposal strategy.",
    },
    {
      toDocumentType: "PASSIVATION",
      toSection: null,
      relationship: "references",
      description:
        "DMP references passivation procedure (A5) for energy source safing.",
    },
    {
      toDocumentType: "COLLISION_AVOIDANCE",
      toSection: null,
      relationship: "references",
      description:
        "DMP references collision avoidance plan (A3) for CA strategy.",
    },
  ],
  ORBITAL_LIFETIME: [
    {
      toDocumentType: "DMP",
      toSection: null,
      relationship: "depends_on",
      description:
        "Orbital Lifetime Analysis feeds into the DMP 25-year rule section.",
    },
  ],
  EOL_DISPOSAL: [
    {
      toDocumentType: "DMP",
      toSection: null,
      relationship: "depends_on",
      description: "EOL Disposal Plan feeds into the DMP disposal section.",
    },
    {
      toDocumentType: "PASSIVATION",
      toSection: null,
      relationship: "references",
      description:
        "EOL Disposal references passivation as part of disposal sequence.",
    },
  ],
  PASSIVATION: [
    {
      toDocumentType: "DMP",
      toSection: null,
      relationship: "depends_on",
      description: "Passivation Procedure feeds into DMP passivation section.",
    },
  ],
  COLLISION_AVOIDANCE: [
    {
      toDocumentType: "DMP",
      toSection: null,
      relationship: "depends_on",
      description:
        "Collision Avoidance Plan supports the DMP CA strategy section.",
    },
  ],
  CYBER_RISK_ASSESSMENT: [
    {
      toDocumentType: "CYBER_POLICY",
      toSection: null,
      relationship: "depends_on",
      description: "Risk Assessment builds on top-level Cybersecurity Policy.",
    },
    {
      toDocumentType: "INCIDENT_RESPONSE",
      toSection: null,
      relationship: "references",
      description: "Risk findings feed into Incident Response Plan.",
    },
  ],
  INCIDENT_RESPONSE: [
    {
      toDocumentType: "EUSRN_PROCEDURES",
      toSection: null,
      relationship: "references",
      description: "Incident Response references EUSRN notification timelines.",
    },
    {
      toDocumentType: "BCP_RECOVERY",
      toSection: null,
      relationship: "references",
      description: "Incident Response is linked to BCP recovery procedures.",
    },
  ],
  COMPLIANCE_MATRIX: [
    {
      toDocumentType: "CYBER_POLICY",
      toSection: null,
      relationship: "references",
      description: "Compliance Matrix verifies Cyber Policy requirements.",
    },
    {
      toDocumentType: "CYBER_RISK_ASSESSMENT",
      toSection: null,
      relationship: "references",
      description: "Compliance Matrix verifies Risk Assessment requirements.",
    },
  ],
  AUTHORIZATION_APPLICATION: [
    {
      toDocumentType: "DMP",
      toSection: null,
      relationship: "depends_on",
      description: "Authorization application requires a completed DMP.",
    },
    {
      toDocumentType: "CYBER_POLICY",
      toSection: null,
      relationship: "depends_on",
      description:
        "Authorization application requires cybersecurity policy evidence.",
    },
  ],
};

function buildCrossReferences(docType: NCADocumentType): CrossReference[] {
  const refs = CROSS_REFERENCE_MAP[docType] ?? [];
  return refs.map((r) => ({ ...r, fromSection: 0 }));
}

// ─── Overall Strategy & Compliance Level ─────────────────────────────────────

function computeOverallStrategy(
  docType: NCADocumentType,
  sections: SectionPlan[],
): string {
  const highCount = sections.filter((s) => s.confidenceLevel === "high").length;
  const lowCount = sections.filter((s) => s.confidenceLevel === "low").length;
  const compliantCount = sections.filter(
    (s) =>
      s.complianceVerdict === "compliant" ||
      s.complianceVerdict === "substantially_compliant",
  ).length;

  const totalSections = sections.length;

  if (highCount >= totalSections * 0.8) {
    return `Generate ${docType} with high confidence. Data coverage is strong across ${highCount}/${totalSections} sections. Focus on detail and regulatory precision.`;
  }
  if (lowCount >= totalSections * 0.5) {
    return `Generate ${docType} with placeholder-heavy strategy. Data is sparse (${lowCount}/${totalSections} sections have low confidence). Use default assumptions and clearly flag evidence gaps.`;
  }
  return `Generate ${docType} with mixed strategy. ${compliantCount}/${totalSections} sections have sufficient data; use standard language for weaker sections and highlight outstanding action items.`;
}

function computeEstimatedComplianceLevel(
  sections: SectionPlan[],
): "high" | "medium" | "low" {
  const verdictScores: Record<ComplianceVerdict, number> = {
    compliant: 3,
    substantially_compliant: 2,
    partially_compliant: 1,
    non_compliant: 0,
    not_applicable: 3, // N/A sections don't penalise
  };

  const relevant = sections.filter(
    (s) => s.complianceVerdict !== "not_applicable",
  );
  if (relevant.length === 0) return "high";

  const totalScore = relevant.reduce(
    (sum, s) => sum + verdictScores[s.complianceVerdict],
    0,
  );
  const maxScore = relevant.length * 3;
  const ratio = totalScore / maxScore;

  if (ratio >= 0.75) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Computes the full ReasoningPlan for a given document type and data bundle.
 *
 * The plan is **purely deterministic** — no AI call, typically <200ms.
 *
 * @param documentType  NCA document type to plan for.
 * @param dataBundle    Operator + assessment data bundle.
 * @param _userNotes    Reserved for future user-supplied hints (unused).
 */
export function computeReasoningPlan(
  documentType: NCADocumentType,
  dataBundle: Generate2DataBundle,
  _userNotes: string[],
): ReasoningPlan {
  const sectionDefs = SECTION_DEFINITIONS[documentType] ?? [];

  const sections: SectionPlan[] = sectionDefs.map((def, idx) =>
    computeSectionPlan(documentType, idx, def.title, dataBundle),
  );

  const overallStrategy = computeOverallStrategy(documentType, sections);
  const estimatedComplianceLevel = computeEstimatedComplianceLevel(sections);
  const crossReferences = buildCrossReferences(documentType);

  return {
    documentType,
    targetNCA: dataBundle.operator.establishmentCountry ?? null,
    overallStrategy,
    estimatedComplianceLevel,
    sections,
    crossReferences,
    userModified: false,
  };
}
