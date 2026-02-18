/**
 * Generate 2.0 — Types
 *
 * NCA-submission-ready document generation types.
 */

import type { ReportSection } from "@/lib/pdf/types";

// ─── Document Types (mirrors Prisma NCADocumentType) ───

export type NCADocumentType =
  | "DMP"
  | "ORBITAL_LIFETIME"
  | "COLLISION_AVOIDANCE"
  | "EOL_DISPOSAL"
  | "PASSIVATION"
  | "REENTRY_RISK"
  | "DEBRIS_SUPPLY_CHAIN"
  | "LIGHT_RF_POLLUTION"
  | "CYBER_POLICY"
  | "CYBER_RISK_ASSESSMENT"
  | "INCIDENT_RESPONSE"
  | "BCP_RECOVERY"
  | "ACCESS_CONTROL"
  | "SUPPLY_CHAIN_SECURITY"
  | "EUSRN_PROCEDURES"
  | "COMPLIANCE_MATRIX";

export type NCADocumentStatus =
  | "DRAFT"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED"
  | "EXPORTED";

export type NCAPackageStatus =
  | "CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

// ─── Category & Priority ───

export type DocumentCategory = "debris" | "cybersecurity";
export type DocumentPriority = "P0" | "P1" | "P2";

export interface DocumentTypeMeta {
  id: NCADocumentType;
  code: string; // A1, A2, ..., B8
  title: string;
  shortTitle: string;
  category: DocumentCategory;
  priority: DocumentPriority;
  articleRef: string;
  description: string;
  estimatedSections: number;
}

// ─── All 16 Document Type Metadata ───

export const NCA_DOCUMENT_TYPES: DocumentTypeMeta[] = [
  // Category A — Debris Mitigation
  {
    id: "DMP",
    code: "A1",
    title: "Debris Mitigation Plan",
    shortTitle: "DMP",
    category: "debris",
    priority: "P0",
    articleRef: "Art. 67, ISO 24113",
    description:
      "Comprehensive debris mitigation plan per EU Space Act Art. 67 and IADC guidelines",
    estimatedSections: 11,
  },
  {
    id: "ORBITAL_LIFETIME",
    code: "A2",
    title: "Orbital Lifetime Analysis",
    shortTitle: "Orbital Lifetime",
    category: "debris",
    priority: "P0",
    articleRef: "Art. 72",
    description:
      "25-year orbital lifetime analysis with decay modeling and compliance assessment",
    estimatedSections: 9,
  },
  {
    id: "COLLISION_AVOIDANCE",
    code: "A3",
    title: "Collision Avoidance Operations Plan",
    shortTitle: "Collision Avoidance",
    category: "debris",
    priority: "P1",
    articleRef: "Art. 64",
    description:
      "Conjunction assessment process, maneuver criteria, and operator coordination",
    estimatedSections: 10,
  },
  {
    id: "EOL_DISPOSAL",
    code: "A4",
    title: "End-of-Life Disposal Plan",
    shortTitle: "EOL Disposal",
    category: "debris",
    priority: "P0",
    articleRef: "Art. 72",
    description:
      "Disposal strategy, maneuver design, fuel budget analysis, and contingency procedures",
    estimatedSections: 9,
  },
  {
    id: "PASSIVATION",
    code: "A5",
    title: "Passivation Procedure",
    shortTitle: "Passivation",
    category: "debris",
    priority: "P1",
    articleRef: "Art. 67(d)",
    description:
      "Energy source passivation sequence including battery, propellant, and pressure systems",
    estimatedSections: 10,
  },
  {
    id: "REENTRY_RISK",
    code: "A6",
    title: "Re-Entry Casualty Risk Assessment",
    shortTitle: "Re-Entry Risk",
    category: "debris",
    priority: "P1",
    articleRef: "Art. 72",
    description:
      "Demise analysis, surviving fragments, ground impact footprint, and casualty risk",
    estimatedSections: 9,
  },
  {
    id: "DEBRIS_SUPPLY_CHAIN",
    code: "A7",
    title: "Supply Chain Compliance (Debris)",
    shortTitle: "Debris Supply Chain",
    category: "debris",
    priority: "P2",
    articleRef: "Art. 73",
    description:
      "Supply chain mapping, debris mitigation flow-down, and supplier compliance",
    estimatedSections: 8,
  },
  {
    id: "LIGHT_RF_POLLUTION",
    code: "A8",
    title: "Light & RF Pollution Mitigation",
    shortTitle: "Light & RF Pollution",
    category: "debris",
    priority: "P2",
    articleRef: "Art. 68",
    description:
      "Brightness analysis, anti-reflective measures, and RF interference assessment",
    estimatedSections: 9,
  },
  // Category B — Cybersecurity
  {
    id: "CYBER_POLICY",
    code: "B1",
    title: "Cybersecurity Policy",
    shortTitle: "Cyber Policy",
    category: "cybersecurity",
    priority: "P0",
    articleRef: "Art. 74",
    description:
      "Organization-wide cybersecurity policy with roles, objectives, and governance",
    estimatedSections: 9,
  },
  {
    id: "CYBER_RISK_ASSESSMENT",
    code: "B2",
    title: "Cybersecurity Risk Assessment",
    shortTitle: "Cyber Risk",
    category: "cybersecurity",
    priority: "P0",
    articleRef: "Art. 77-78",
    description:
      "Threat landscape, vulnerability assessment, risk evaluation, and treatment plan",
    estimatedSections: 9,
  },
  {
    id: "INCIDENT_RESPONSE",
    code: "B3",
    title: "Incident Response Plan",
    shortTitle: "Incident Response",
    category: "cybersecurity",
    priority: "P0",
    articleRef: "Art. 89-92",
    description:
      "Incident classification, detection, containment, recovery, and 24h/72h/1mo notification",
    estimatedSections: 10,
  },
  {
    id: "BCP_RECOVERY",
    code: "B4",
    title: "Business Continuity & Recovery Plan",
    shortTitle: "BCP & Recovery",
    category: "cybersecurity",
    priority: "P1",
    articleRef: "Art. 85",
    description:
      "Business impact analysis, RTO/RPO, continuity strategies, and recovery procedures",
    estimatedSections: 9,
  },
  {
    id: "ACCESS_CONTROL",
    code: "B5",
    title: "Access Control & Authentication Policy",
    shortTitle: "Access Control",
    category: "cybersecurity",
    priority: "P1",
    articleRef: "Art. 79",
    description:
      "Access control policy, identity management, authentication, and privileged access",
    estimatedSections: 9,
  },
  {
    id: "SUPPLY_CHAIN_SECURITY",
    code: "B6",
    title: "Supply Chain Security Plan",
    shortTitle: "Supply Chain Security",
    category: "cybersecurity",
    priority: "P2",
    articleRef: "Art. 78",
    description:
      "Supply chain mapping, supplier risk assessment, security requirements, and monitoring",
    estimatedSections: 9,
  },
  {
    id: "EUSRN_PROCEDURES",
    code: "B7",
    title: "EUSRN Notification Procedures",
    shortTitle: "EUSRN Procedures",
    category: "cybersecurity",
    priority: "P1",
    articleRef: "Art. 93-95",
    description:
      "EUSRN notification triggers, process, timelines, and internal coordination",
    estimatedSections: 9,
  },
  {
    id: "COMPLIANCE_MATRIX",
    code: "B8",
    title: "Compliance Verification Matrix",
    shortTitle: "Compliance Matrix",
    category: "cybersecurity",
    priority: "P1",
    articleRef: "Art. 74-95",
    description:
      "Full requirement-by-requirement verification matrix with evidence inventory",
    estimatedSections: 8,
  },
];

export const NCA_DOC_TYPE_MAP: Record<NCADocumentType, DocumentTypeMeta> =
  Object.fromEntries(NCA_DOCUMENT_TYPES.map((d) => [d.id, d])) as Record<
    NCADocumentType,
    DocumentTypeMeta
  >;

export const ALL_NCA_DOC_TYPES: NCADocumentType[] = NCA_DOCUMENT_TYPES.map(
  (d) => d.id,
);

// ─── Data Bundle (enriched assessment data for generation) ───

export interface Generate2DataBundle {
  operator: {
    organizationName: string;
    operatorType?: string | null;
    establishmentCountry?: string | null;
    userId: string;
  };
  debris?: {
    assessment: {
      id: string;
      missionName?: string | null;
      orbitType: string;
      altitudeKm?: number | null;
      satelliteCount: number;
      constellationTier: string;
      hasManeuverability: string;
      hasPropulsion: boolean;
      hasPassivationCap: boolean;
      plannedDurationYears: number;
      deorbitStrategy: string;
      deorbitTimelineYears?: number | null;
      caServiceProvider?: string | null;
      complianceScore?: number | null;
    };
    requirements: Array<{
      requirementId: string;
      status: string;
      notes?: string | null;
      responses?: Record<string, unknown> | null;
    }>;
  } | null;
  cybersecurity?: {
    assessment: {
      id: string;
      assessmentName?: string | null;
      organizationSize: string;
      employeeCount?: number | null;
      spaceSegmentComplexity: string;
      satelliteCount?: number | null;
      dataSensitivityLevel: string;
      existingCertifications?: string | null;
      hasSecurityTeam: boolean;
      securityTeamSize?: number | null;
      hasIncidentResponsePlan: boolean;
      hasBCP: boolean;
      criticalSupplierCount?: number | null;
      maturityScore?: number | null;
      isSimplifiedRegime: boolean;
    };
    requirements: Array<{
      requirementId: string;
      status: string;
      notes?: string | null;
      responses?: Record<string, unknown> | null;
    }>;
  } | null;
  spacecraft: Array<{
    name: string;
    noradId?: string | null;
    missionType?: string | null;
  }>;
}

// ─── Section Definition ───

export interface SectionDefinition {
  number: number;
  title: string;
}

// ─── Readiness ───

export interface ReadinessField {
  source: "debris" | "cybersecurity" | "user" | "spacecraft" | "organization";
  field: string;
  weight: 3 | 2 | 1; // Critical / Important / Nice-to-have
}

export interface ReadinessSchema {
  documentType: NCADocumentType;
  fields: ReadinessField[];
}

export interface ReadinessResult {
  documentType: NCADocumentType;
  score: number; // 0-100
  level: "ready" | "partial" | "insufficient";
  presentFields: number;
  totalFields: number;
  missingCritical: string[];
}

// ─── Generation ───

export interface Generate2InitResult {
  documentId: string;
  sections: SectionDefinition[];
  readinessScore: number;
  readinessLevel: "ready" | "partial" | "insufficient";
}

export interface Generate2SectionResult {
  content: string;
  sectionIndex: number;
  inputTokens: number;
  outputTokens: number;
}

export interface Generate2CompleteResult {
  content: ReportSection[];
  actionRequiredCount: number;
  evidencePlaceholderCount: number;
}
