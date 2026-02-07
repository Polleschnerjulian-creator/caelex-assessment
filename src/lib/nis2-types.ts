/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * Unauthorized reproduction, distribution, reverse-engineering, or use
 * of this data to build competing products or services is strictly prohibited
 * and may result in legal action.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── NIS2 Entity Classification ───

export type NIS2EntityClassification =
  | "essential"
  | "important"
  | "out_of_scope";

// ─── NIS2 Sectors (Annex I = high criticality, Annex II = other critical) ───

export type NIS2Sector =
  | "space" // Annex I, Sector 11
  | "energy"
  | "transport"
  | "banking"
  | "financial_market"
  | "health"
  | "drinking_water"
  | "waste_water"
  | "digital_infrastructure"
  | "ict_service_management"
  | "public_administration"
  | "postal_courier" // Annex II
  | "waste_management"
  | "chemicals"
  | "food"
  | "manufacturing"
  | "digital_providers"
  | "research"
  | "other";

export type NIS2SpaceSubSector =
  | "ground_infrastructure" // Ground stations, TT&C, mission control
  | "satellite_communications" // Satcom operators
  | "spacecraft_manufacturing" // Satellite/component manufacturers
  | "launch_services" // Launch providers
  | "earth_observation" // EO data providers
  | "navigation" // GNSS augmentation services
  | "space_situational_awareness"; // SSA/STM providers

// ─── NIS2 Art. 21 Measure Categories ───

export type NIS2RequirementCategory =
  | "policies_risk_analysis" // Art. 21(2)(a): Policies on risk analysis and IS security
  | "incident_handling" // Art. 21(2)(b): Incident handling
  | "business_continuity" // Art. 21(2)(c): Business continuity and crisis management
  | "supply_chain" // Art. 21(2)(d): Supply chain security
  | "network_acquisition" // Art. 21(2)(e): Network/IS acquisition, development, maintenance
  | "effectiveness_assessment" // Art. 21(2)(f): Assessment of effectiveness of measures
  | "cyber_hygiene" // Art. 21(2)(g): Basic cyber hygiene and training
  | "cryptography" // Art. 21(2)(h): Cryptography and encryption
  | "hr_access_asset" // Art. 21(2)(i): HR security, access control, asset management
  | "mfa_authentication" // Art. 21(2)(j): MFA and continuous authentication
  | "governance" // Art. 20: Governance and accountability
  | "registration" // Art. 3(4), Art. 27: Registration with authority
  | "reporting" // Art. 23: Incident reporting obligations
  | "information_sharing"; // Art. 29: Voluntary information sharing

// ─── NIS2 Requirement Severity ───

export type NIS2RequirementSeverity = "critical" | "major" | "minor";

// ─── NIS2 Requirement Interface ───

export interface NIS2Requirement {
  id: string;
  articleRef: string; // e.g., "NIS2 Art. 21(2)(a)"
  category: NIS2RequirementCategory;
  title: string;
  description: string;
  complianceQuestion: string; // Yes/No question for assessment
  spaceSpecificGuidance: string; // Space sector interpretation
  applicableTo: {
    entityClassifications?: NIS2EntityClassification[];
    sectors?: NIS2Sector[];
    subSectors?: NIS2SpaceSubSector[];
    organizationSizes?: ("micro" | "small" | "medium" | "large")[];
  };
  // Cross-regulation references
  euSpaceActRef?: string; // e.g., "Art. 76"
  euSpaceActArticleNumbers?: number[]; // [76, 77, 78]
  enisaControlIds?: string[]; // e.g., ["3.1.1", "3.1.2"]
  iso27001Ref?: string; // e.g., "A.5.1"
  // Implementation guidance
  tips: string[];
  evidenceRequired: string[];
  severity: NIS2RequirementSeverity;
  implementationTimeWeeks?: number;
  // Proportionality
  canBeSimplified: boolean; // Can be reduced for smaller entities under Art. 21(1)
}

// ─── ENISA Space Control Interface ───

export interface ENISASpaceControl {
  id: string; // e.g., "ENISA-SPACE-3.1.1"
  category: ENISAControlCategory;
  subcategory: string;
  title: string;
  description: string;
  threatAddressed: string;
  // Cross-regulation mappings
  nis2Mapping?: string; // NIS2 Art. reference
  euSpaceActMapping?: string; // EU Space Act Art. reference
  iso27001Mapping?: string; // ISO 27001 Annex A reference
  priority: "essential" | "important" | "recommended";
  implementationComplexity: "low" | "medium" | "high";
  spaceSegment: ("space" | "ground" | "user" | "link")[];
}

export type ENISAControlCategory =
  | "governance_risk" // Governance & Risk Management
  | "asset_management" // Asset Management
  | "access_control" // Access Control
  | "cryptography" // Cryptography
  | "physical_security" // Physical Security
  | "operations_security" // Operations Security
  | "communications_security" // Communications Security
  | "system_acquisition" // System Acquisition & Development
  | "supplier_management" // Supplier Relationship Management
  | "incident_management" // Incident Management
  | "business_continuity" // Business Continuity
  | "compliance_audit" // Compliance & Audit
  | "space_specific"; // Space-specific controls (RF, TT&C, etc.)

// ─── Cross-Reference Types ───

export type RegulationType =
  | "eu_space_act"
  | "nis2"
  | "enisa_space"
  | "iso27001"
  | "iso24113"
  | "ecss";

export type CrossReferenceRelationship =
  | "implements" // Source implements target's requirement
  | "overlaps" // Source and target cover the same area
  | "extends" // Source adds requirements beyond target
  | "supersedes" // Source will replace target (e.g., EU Space Act supersedes NIS2 for space)
  | "references"; // Source references target without direct obligation

export type CrossReferenceConfidence =
  | "confirmed" // Based on explicit legal text
  | "interpreted" // Based on regulatory analysis
  | "potential"; // Likely relationship, needs legal confirmation

export interface CrossReference {
  id: string;
  sourceRegulation: RegulationType;
  sourceArticle: string;
  sourceTitle?: string;
  targetRegulation: RegulationType;
  targetArticle: string;
  targetTitle?: string;
  relationship: CrossReferenceRelationship;
  description: string;
  confidence: CrossReferenceConfidence;
}

// ─── NIS2 Assessment Answers (from scoping wizard) ───

export interface NIS2AssessmentAnswers {
  // Sector
  sector: NIS2Sector | null;
  spaceSubSector: NIS2SpaceSubSector | null;

  // Space activities (multi-select)
  operatesGroundInfra: boolean | null;
  operatesSatComms: boolean | null;
  manufacturesSpacecraft: boolean | null;
  providesLaunchServices: boolean | null;
  providesEOData: boolean | null;

  // Organization
  entitySize: "micro" | "small" | "medium" | "large" | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  memberStateCount: number | null;

  // EU establishment
  isEUEstablished: boolean | null;

  // Existing compliance
  hasISO27001: boolean | null;
  hasExistingCSIRT: boolean | null;
  hasRiskManagement: boolean | null;
}

// ─── NIS2 Compliance Result ───

export interface NIS2ComplianceResult {
  // Classification
  entityClassification: NIS2EntityClassification;
  classificationReason: string;
  classificationArticleRef: string;

  // Profile
  sector: NIS2Sector;
  subSector: NIS2SpaceSubSector | null;
  organizationSize: string;

  // Applicable requirements
  applicableRequirements: NIS2Requirement[];
  totalNIS2Requirements: number;
  applicableCount: number;

  // Incident reporting timeline
  incidentReportingTimeline: {
    earlyWarning: { deadline: string; description: string }; // 24 hours
    notification: { deadline: string; description: string }; // 72 hours
    intermediateReport: { deadline: string; description: string }; // upon request
    finalReport: { deadline: string; description: string }; // 1 month
  };

  // EU Space Act overlap
  euSpaceActOverlap: {
    count: number;
    totalPotentialSavingsWeeks: number;
    overlappingRequirements: {
      nis2RequirementId: string;
      nis2Article: string;
      euSpaceActArticle: string;
      description: string;
      effortType:
        | "single_implementation"
        | "partial_overlap"
        | "separate_effort";
    }[];
  };

  // Supervisory authority
  supervisoryAuthority: string;
  supervisoryAuthorityNote: string;

  // Penalties
  penalties: {
    essential: string; // "€10M or 2% of global annual turnover"
    important: string; // "€7M or 1.4% of global annual turnover"
    applicable: string; // Based on classification
  };

  // Registration
  registrationRequired: boolean;
  registrationDeadline: string;

  // Key dates
  keyDates: {
    date: string;
    description: string;
  }[];
}

// ─── Redacted NIS2 Result (for public API) ───

export interface RedactedNIS2Requirement {
  id: string;
  articleRef: string;
  category: NIS2RequirementCategory;
  title: string;
  severity: NIS2RequirementSeverity;
  // Stripped: description, spaceSpecificGuidance, tips, evidenceRequired, cross-refs
}

export interface RedactedNIS2ComplianceResult {
  entityClassification: NIS2EntityClassification;
  classificationReason: string;
  sector: NIS2Sector;
  subSector: NIS2SpaceSubSector | null;
  organizationSize: string;
  applicableRequirements: RedactedNIS2Requirement[];
  totalNIS2Requirements: number;
  applicableCount: number;
  incidentReportingTimeline: NIS2ComplianceResult["incidentReportingTimeline"];
  euSpaceActOverlap: {
    count: number;
    totalPotentialSavingsWeeks: number;
  };
  penalties: NIS2ComplianceResult["penalties"];
  registrationRequired: boolean;
  keyDates: NIS2ComplianceResult["keyDates"];
}

// ─── Unified Compliance View (Cross-regulation matrix) ───

export interface UnifiedComplianceCategory {
  category: string;
  categoryLabel: string;
  nis2Requirement: NIS2Requirement | null;
  euSpaceActArticles: string[];
  enisaControls: string[];
  iso27001Refs: string[];
  complianceEffort:
    | "single_implementation"
    | "partial_overlap"
    | "separate_effort";
  description: string;
}

export interface OverlapSavingsReport {
  totalNIS2Requirements: number;
  satisfiedByEUSpaceAct: number;
  partiallySatisfied: number;
  additionalEffortRequired: number;
  estimatedWeeksSaved: number;
  savingsPercentage: number;
}
