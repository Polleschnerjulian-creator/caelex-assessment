/**
 * AI Document Generation Types
 */

import type { ReportSection } from "@/lib/pdf/types";

// ─── Enums (mirroring Prisma) ───

export type DocumentGenerationType =
  | "DEBRIS_MITIGATION_PLAN"
  | "CYBERSECURITY_FRAMEWORK"
  | "ENVIRONMENTAL_FOOTPRINT"
  | "INSURANCE_COMPLIANCE"
  | "NIS2_ASSESSMENT"
  | "AUTHORIZATION_APPLICATION";

export type DocumentGenerationStatus =
  | "PENDING"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED";

// ─── Input/Output ───

export interface DocumentGenerationParams {
  userId: string;
  organizationId: string;
  organizationName: string;
  documentType: DocumentGenerationType;
  assessmentId?: string;
  language?: string;
}

export interface DocumentGenerationResult {
  documentId: string;
  sections: ReportSection[];
  rawContent: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  generationTimeMs: number;
}

// ─── Streaming Events ───

export type DocumentStreamEvent =
  | { type: "generation_start"; documentId: string; title: string }
  | { type: "section_start"; sectionIndex: number; title: string }
  | { type: "section_content"; sectionIndex: number; content: string }
  | { type: "section_complete"; sectionIndex: number }
  | {
      type: "generation_complete";
      documentId: string;
      totalSections: number;
      generationTimeMs: number;
    }
  | { type: "error"; message: string };

// ─── Assessment Data Bundles ───

export interface DebrisDataBundle {
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
  }>;
  spacecraft: Array<{
    name: string;
    noradId?: string | null;
    type?: string | null;
  }>;
  organization: { name: string; slug: string };
}

export interface CybersecurityDataBundle {
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
  }>;
  organization: { name: string; slug: string };
}

export interface EnvironmentalDataBundle {
  assessment: {
    id: string;
    assessmentName?: string | null;
    missionName?: string | null;
    operatorType: string;
    missionType: string;
    spacecraftMassKg: number;
    spacecraftCount: number;
    orbitType: string;
    altitudeKm?: number | null;
    launchVehicle: string;
    launchSharePercent: number;
    spacecraftPropellant?: string | null;
    propellantMassKg?: number | null;
    deorbitStrategy: string;
    totalGWP?: number | null;
    totalODP?: number | null;
    carbonIntensity?: number | null;
    efdGrade?: string | null;
    complianceScore?: number | null;
  };
  impactResults: Array<{
    category: string;
    subcategory?: string | null;
    value: number;
    unit: string;
  }>;
  supplierRequests: Array<{
    supplierName: string;
    status: string;
  }>;
  organization: { name: string; slug: string };
}

export interface InsuranceDataBundle {
  assessment: {
    id: string;
    assessmentName?: string | null;
    primaryJurisdiction: string;
    operatorType: string;
    companySize: string;
    orbitRegime: string;
    satelliteCount: number;
    satelliteValueEur?: number | null;
    totalMissionValueEur?: number | null;
    calculatedTPL?: number | null;
    riskLevel?: string | null;
    complianceScore?: number | null;
  };
  policies: Array<{
    insuranceType: string;
    status: string;
    isRequired: boolean;
    insurer?: string | null;
    coverageAmount?: number | null;
    premium?: number | null;
  }>;
  organization: { name: string; slug: string };
}

export interface NIS2DataBundle {
  assessment: {
    id: string;
    assessmentName?: string | null;
    entityClassification?: string | null;
    classificationReason?: string | null;
    sector?: string | null;
    organizationSize?: string | null;
    employeeCount?: number | null;
    existingCertifications?: string | null;
    hasISO27001: boolean;
    hasExistingCSIRT: boolean;
    hasRiskManagement: boolean;
    complianceScore?: number | null;
    maturityScore?: number | null;
    riskLevel?: string | null;
    euSpaceActOverlapCount?: number | null;
  };
  requirements: Array<{
    requirementId: string;
    status: string;
    notes?: string | null;
  }>;
  organization: { name: string; slug: string };
}

export interface AuthorizationDataBundle {
  debrisAssessment?: DebrisDataBundle["assessment"] | null;
  cybersecurityAssessment?: CybersecurityDataBundle["assessment"] | null;
  environmentalAssessment?: EnvironmentalDataBundle["assessment"] | null;
  insuranceAssessment?: InsuranceDataBundle["assessment"] | null;
  nis2Assessment?: NIS2DataBundle["assessment"] | null;
  spacecraft: Array<{
    name: string;
    noradId?: string | null;
    type?: string | null;
    orbitType?: string | null;
  }>;
  documents: Array<{
    name: string;
    category: string;
    status: string;
  }>;
  workflow?: {
    status: string;
    currentStep?: string | null;
  } | null;
  organization: { name: string; slug: string };
}

export type AssessmentDataBundle =
  | { type: "DEBRIS_MITIGATION_PLAN"; data: DebrisDataBundle }
  | { type: "CYBERSECURITY_FRAMEWORK"; data: CybersecurityDataBundle }
  | { type: "ENVIRONMENTAL_FOOTPRINT"; data: EnvironmentalDataBundle }
  | { type: "INSURANCE_COMPLIANCE"; data: InsuranceDataBundle }
  | { type: "NIS2_ASSESSMENT"; data: NIS2DataBundle }
  | { type: "AUTHORIZATION_APPLICATION"; data: AuthorizationDataBundle };

// ─── Document Type Metadata ───

export const DOCUMENT_TYPE_META: Record<
  DocumentGenerationType,
  {
    title: string;
    description: string;
    icon: string;
    estimatedPages: number;
  }
> = {
  DEBRIS_MITIGATION_PLAN: {
    title: "Debris Mitigation Plan",
    description:
      "Comprehensive plan compliant with EU Space Act Art. 31-37 and IADC guidelines",
    icon: "Trash2",
    estimatedPages: 15,
  },
  CYBERSECURITY_FRAMEWORK: {
    title: "Cybersecurity Framework",
    description:
      "Security architecture and implementation plan per EU Space Act Art. 27-30",
    icon: "Shield",
    estimatedPages: 20,
  },
  ENVIRONMENTAL_FOOTPRINT: {
    title: "Environmental Footprint Declaration",
    description:
      "Lifecycle environmental assessment per EU Space Act Art. 44-46",
    icon: "Leaf",
    estimatedPages: 12,
  },
  INSURANCE_COMPLIANCE: {
    title: "Insurance Compliance Report",
    description:
      "TPL analysis and coverage assessment per EU Space Act Art. 47-50",
    icon: "Scale",
    estimatedPages: 10,
  },
  NIS2_ASSESSMENT: {
    title: "NIS2 Compliance Assessment",
    description:
      "Entity classification and requirement implementation status per NIS2 Directive",
    icon: "ShieldCheck",
    estimatedPages: 18,
  },
  AUTHORIZATION_APPLICATION: {
    title: "Authorization Application Package",
    description:
      "Complete NCA submission package with all supporting documentation",
    icon: "FileCheck",
    estimatedPages: 25,
  },
};
