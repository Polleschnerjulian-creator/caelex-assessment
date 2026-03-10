/**
 * Generate 2.0 — Context Panel Utilities
 *
 * Client-side logic for the Generation Intelligence Hub:
 * - Field status tracking (present/missing per document type)
 * - Gap prediction (which sections will have ACTION REQUIRED markers)
 * - Related document discovery (shared data fields)
 * - Next document recommendation
 *
 * All computations are deterministic — no API calls needed.
 */

import type { NCADocumentType, ReadinessResult } from "./types";
import { READINESS_SCHEMAS } from "./readiness-schemas";
import { SECTION_DEFINITIONS } from "./section-definitions";
import { NCA_DOC_TYPE_MAP } from "./types";

// ─── Human-readable field labels ───

const FIELD_LABELS: Record<string, string> = {
  // Debris
  orbitType: "Orbit Type",
  altitudeKm: "Orbital Altitude",
  satelliteCount: "Satellite Count",
  deorbitStrategy: "Deorbit Strategy",
  plannedDurationYears: "Mission Duration",
  hasManeuverability: "Maneuverability",
  hasPropulsion: "Propulsion System",
  hasPassivationCap: "Passivation Capability",
  deorbitTimelineYears: "Deorbit Timeline",
  caServiceProvider: "CA Service Provider",
  constellationTier: "Constellation Tier",
  complianceScore: "Compliance Score",
  // Cybersecurity
  organizationSize: "Organization Size",
  dataSensitivityLevel: "Data Sensitivity",
  hasSecurityTeam: "Security Team",
  hasIncidentResponsePlan: "Incident Response Plan",
  hasBCP: "Business Continuity Plan",
  existingCertifications: "Certifications",
  spaceSegmentComplexity: "Space Segment Complexity",
  maturityScore: "Maturity Score",
  employeeCount: "Employee Count",
  criticalSupplierCount: "Critical Suppliers",
  // User / Organization
  operatorType: "Operator Type",
  name: "Organization Name",
  // Spacecraft
  "length>=1": "Spacecraft Registered",
};

// ─── Field → section keyword matching for gap prediction ───

const FIELD_SECTION_KEYWORDS: Record<string, string[]> = {
  orbitType: ["orbital", "orbit", "mission overview", "mission profile"],
  altitudeKm: ["orbital", "atmospheric", "altitude", "decay", "brightness"],
  satelliteCount: ["spacecraft", "mission", "asset", "constellation"],
  deorbitStrategy: [
    "disposal",
    "end-of-life",
    "re-entry",
    "deorbit",
    "reentry",
  ],
  plannedDurationYears: ["lifetime", "25-year", "duration"],
  hasManeuverability: ["collision", "avoidance", "maneuver"],
  hasPropulsion: ["propellant", "fuel", "disposal", "passivation"],
  hasPassivationCap: ["passivation", "energy", "safing", "battery", "pressure"],
  deorbitTimelineYears: ["disposal", "end-of-life"],
  caServiceProvider: ["collision", "avoidance", "conjunction", "data sources"],
  constellationTier: ["supply chain", "constellation"],
  complianceScore: ["compliance", "gap analysis"],
  organizationSize: [
    "scope",
    "policy",
    "roles",
    "organization",
    "business impact",
  ],
  dataSensitivityLevel: [
    "classification",
    "information",
    "data",
    "sensitivity",
    "asset",
  ],
  hasSecurityTeam: ["roles", "responsibilities", "team", "privileged"],
  hasIncidentResponsePlan: ["incident", "notification", "detection", "eusrn"],
  hasBCP: ["business impact", "continuity", "recovery"],
  existingCertifications: [
    "compliance",
    "certification",
    "evidence",
    "verification",
  ],
  spaceSegmentComplexity: ["asset", "inventory", "threat", "vulnerability"],
  maturityScore: ["gap analysis", "assessment", "readiness", "remediation"],
  employeeCount: ["access control", "identity", "privileged"],
  criticalSupplierCount: ["supply chain", "supplier"],
  operatorType: ["operator", "profile", "cover"],
  name: ["cover", "operator profile", "organization"],
  "length>=1": ["spacecraft", "asset", "registration"],
};

// ─── Types ───

export interface FieldStatus {
  name: string;
  label: string;
  weight: 3 | 2 | 1;
  isMissing: boolean;
  source: string;
}

export interface GapPrediction {
  sectionNumber: number;
  sectionTitle: string;
  missingFields: string[];
}

export interface RelatedDocument {
  type: NCADocumentType;
  code: string;
  shortTitle: string;
  sharedFields: number;
  isCompleted: boolean;
  score: number;
}

// ─── Functions ───

/**
 * Get field statuses for a document type.
 * Missing critical (weight=3) fields come from the readiness result.
 * Non-critical fields are assumed present (no granular server data).
 */
export function getFieldStatuses(
  documentType: NCADocumentType,
  missingCritical: string[],
): FieldStatus[] {
  const schema = READINESS_SCHEMAS[documentType];
  if (!schema) return [];

  const missingSet = new Set(missingCritical);

  return schema.fields.map((f) => ({
    name: f.field,
    label: FIELD_LABELS[f.field] || f.field,
    weight: f.weight as 3 | 2 | 1,
    isMissing: f.weight === 3 ? missingSet.has(f.field) : false,
    source: f.source,
  }));
}

/**
 * Predict which sections will have gaps based on missing critical fields.
 * Uses keyword matching between field names and section titles.
 */
export function predictGaps(
  documentType: NCADocumentType,
  missingCritical: string[],
): GapPrediction[] {
  const sections = SECTION_DEFINITIONS[documentType];
  if (!sections || missingCritical.length === 0) return [];

  const sectionGaps = new Map<number, Set<string>>();

  for (const field of missingCritical) {
    const keywords = FIELD_SECTION_KEYWORDS[field];
    if (!keywords) continue;

    for (const section of sections) {
      const titleLower = section.title.toLowerCase();
      const matches = keywords.some((kw) => titleLower.includes(kw));

      if (matches) {
        const existing = sectionGaps.get(section.number) || new Set();
        existing.add(FIELD_LABELS[field] || field);
        sectionGaps.set(section.number, existing);
      }
    }
  }

  return Array.from(sectionGaps.entries())
    .map(([num, fields]) => {
      const section = sections.find((s) => s.number === num);
      return {
        sectionNumber: num,
        sectionTitle: section?.title || `Section ${num}`,
        missingFields: Array.from(fields),
      };
    })
    .sort((a, b) => a.sectionNumber - b.sectionNumber);
}

/**
 * Find related documents that share data fields with the selected document.
 */
export function getRelatedDocuments(
  documentType: NCADocumentType,
  allReadiness: ReadinessResult[],
  completedDocs: Set<NCADocumentType>,
): RelatedDocument[] {
  const currentSchema = READINESS_SCHEMAS[documentType];
  if (!currentSchema) return [];

  const currentFields = new Set(
    currentSchema.fields.map((f) => `${f.source}:${f.field}`),
  );

  const related: RelatedDocument[] = [];

  for (const [type, schema] of Object.entries(READINESS_SCHEMAS)) {
    if (type === documentType) continue;

    const schemaFields = schema.fields.map((f) => `${f.source}:${f.field}`);
    const shared = schemaFields.filter((f) => currentFields.has(f)).length;

    if (shared >= 2) {
      const meta = NCA_DOC_TYPE_MAP[type as NCADocumentType];
      const readinessEntry = allReadiness.find((r) => r.documentType === type);

      related.push({
        type: type as NCADocumentType,
        code: meta?.code || "",
        shortTitle: meta?.shortTitle || type.replace(/_/g, " "),
        sharedFields: shared,
        isCompleted: completedDocs.has(type as NCADocumentType),
        score: readinessEntry?.score || 0,
      });
    }
  }

  return related.sort((a, b) => b.sharedFields - a.sharedFields).slice(0, 6);
}

/**
 * Recommend the next document to generate based on readiness score.
 * Picks the highest-readiness pending document.
 */
export function getRecommendedNext(
  allReadiness: ReadinessResult[],
  completedDocs: Set<NCADocumentType>,
): {
  type: NCADocumentType;
  code: string;
  shortTitle: string;
  score: number;
} | null {
  const pending = allReadiness
    .filter((r) => !completedDocs.has(r.documentType))
    .sort((a, b) => b.score - a.score);

  if (pending.length === 0) return null;

  const meta = NCA_DOC_TYPE_MAP[pending[0].documentType];
  return {
    type: pending[0].documentType,
    code: meta?.code || "",
    shortTitle: meta?.shortTitle || pending[0].documentType,
    score: pending[0].score,
  };
}

/**
 * Estimate ACTION REQUIRED markers based on missing critical fields.
 * Heuristic: ~1.5 markers per missing critical field.
 */
export function estimateActionMarkers(missingCritical: string[]): number {
  if (missingCritical.length === 0) return 0;
  return Math.max(1, Math.ceil(missingCritical.length * 1.5));
}
