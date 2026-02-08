/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Country Codes for 10 Priority Jurisdictions ───

export type SpaceLawCountryCode =
  | "FR"
  | "UK"
  | "BE"
  | "NL"
  | "LU"
  | "AT"
  | "DK"
  | "DE"
  | "IT"
  | "NO";

export const SPACE_LAW_COUNTRY_CODES: SpaceLawCountryCode[] = [
  "FR",
  "UK",
  "BE",
  "NL",
  "LU",
  "AT",
  "DK",
  "DE",
  "IT",
  "NO",
];

// ─── Activity Types ───

export type SpaceLawActivityType =
  | "spacecraft_operation"
  | "launch_vehicle"
  | "launch_site"
  | "in_orbit_services"
  | "earth_observation"
  | "satellite_communications"
  | "space_resources";

// ─── Licensing Status ───

export type LicensingStatus =
  | "new_application"
  | "existing_license"
  | "renewal"
  | "pre_assessment";

// ─── Entity Nationality Category ───

export type EntityNationality =
  | "domestic"
  | "eu_other"
  | "non_eu"
  | "esa_member";

// ─── Licensing Requirement Categories ───

export type LicensingRequirementCategory =
  | "technical_assessment"
  | "financial_guarantee"
  | "insurance"
  | "debris_plan"
  | "safety_assessment"
  | "environmental_assessment"
  | "corporate_governance"
  | "security_clearance"
  | "frequency_coordination"
  | "data_handling"
  | "end_of_life_plan"
  | "liability_coverage"
  | "operational_plan"
  | "notification";

// ─── Licensing Requirement ───

export interface LicensingRequirement {
  id: string;
  category: LicensingRequirementCategory;
  title: string;
  description: string;
  mandatory: boolean;
  applicableTo: SpaceLawActivityType[];
  details?: string[];
  articleRef?: string;
}

// ─── Applicability Rule ───

export interface ApplicabilityRule {
  id: string;
  description: string;
  condition: string;
  applies: boolean;
  activityTypes?: SpaceLawActivityType[];
  entityTypes?: EntityNationality[];
  articleRef?: string;
}

// ─── Jurisdiction Data Model ───

export interface JurisdictionLaw {
  countryCode: SpaceLawCountryCode;
  countryName: string;
  flagEmoji: string;

  // Legislation
  legislation: {
    name: string;
    nameLocal: string;
    yearEnacted: number;
    yearAmended?: number;
    status: "enacted" | "draft" | "pending" | "none";
    officialUrl?: string;
    keyArticles?: string;
  };

  // Licensing Authority
  licensingAuthority: {
    name: string;
    nameLocal: string;
    website: string;
    contactEmail: string;
    parentMinistry?: string;
  };

  // Licensing Requirements
  licensingRequirements: LicensingRequirement[];

  // Applicability Rules
  applicabilityRules: ApplicabilityRule[];

  // Insurance & Liability
  insuranceLiability: {
    mandatoryInsurance: boolean;
    minimumCoverage?: string;
    coverageFormula?: string;
    governmentIndemnification: boolean;
    indemnificationCap?: string;
    liabilityRegime: "unlimited" | "capped" | "tiered" | "negotiable";
    liabilityCap?: string;
    thirdPartyRequired: boolean;
  };

  // Debris Mitigation
  debrisMitigation: {
    deorbitRequirement: boolean;
    deorbitTimeline?: string;
    passivationRequired: boolean;
    debrisMitigationPlan: boolean;
    collisionAvoidance: boolean;
    standards?: string[];
  };

  // Data & Remote Sensing
  dataSensing: {
    remoteSensingLicense: boolean;
    dataDistributionRestrictions: boolean;
    resolutionRestrictions?: string;
    dataPolicyUrl?: string;
  };

  // Timeline & Costs
  timeline: {
    typicalProcessingWeeks: { min: number; max: number };
    applicationFee?: string;
    annualFee?: string;
    otherCosts?: string[];
  };

  // Registration
  registration: {
    nationalRegistryExists: boolean;
    registryName?: string;
    unRegistrationRequired: boolean;
  };

  // EU Space Act Cross-Reference
  euSpaceActCrossRef: {
    relationship: "superseded" | "complementary" | "parallel" | "gap";
    description: string;
    keyArticles?: string[];
    transitionNotes?: string;
  };

  // Additional Notes
  notes?: string[];
  lastUpdated: string;
}

// ─── Assessment Answers ───

export interface SpaceLawAssessmentAnswers {
  selectedJurisdictions: SpaceLawCountryCode[];
  activityType: SpaceLawActivityType | null;
  entityNationality: EntityNationality | null;
  entitySize: "small" | "medium" | "large" | null;
  primaryOrbit: "LEO" | "MEO" | "GEO" | "beyond" | null;
  constellationSize: number | null;
  licensingStatus: LicensingStatus | null;
}

// ─── Compliance Result ───

export interface SpaceLawComplianceResult {
  jurisdictions: JurisdictionResult[];
  comparisonMatrix: ComparisonMatrix;
  euSpaceActPreview: EUSpaceActPreview;
  recommendations: string[];
}

export interface JurisdictionResult {
  countryCode: SpaceLawCountryCode;
  countryName: string;
  flagEmoji: string;

  isApplicable: boolean;
  applicabilityReason: string;

  totalRequirements: number;
  mandatoryRequirements: number;
  applicableRequirements: LicensingRequirement[];

  authority: {
    name: string;
    website: string;
    contactEmail: string;
  };

  estimatedTimeline: { min: number; max: number };
  estimatedCost: string;

  insurance: {
    mandatory: boolean;
    minimumCoverage: string;
    governmentIndemnification: boolean;
  };

  debris: {
    deorbitRequired: boolean;
    deorbitTimeline: string;
    mitigationPlan: boolean;
  };

  legislation: {
    name: string;
    status: string;
    yearEnacted: number;
  };

  favorabilityScore: number;
  favorabilityFactors: string[];
}

// ─── Comparison Matrix ───

export interface ComparisonMatrix {
  criteria: ComparisonCriterion[];
}

export interface ComparisonCriterion {
  id: string;
  label: string;
  category:
    | "timeline"
    | "cost"
    | "insurance"
    | "debris"
    | "regulatory"
    | "liability";
  jurisdictionValues: Record<
    string,
    {
      value: string;
      score: number; // 1-5, 5 = most favorable
      notes?: string;
    }
  >;
}

// ─── EU Space Act Preview ───

export interface EUSpaceActPreview {
  overallRelationship: string;
  jurisdictionNotes: Record<
    string,
    {
      relationship: string;
      description: string;
      keyChanges: string[];
    }
  >;
}

// ─── Redacted Result (for public API) ───

export interface RedactedSpaceLawResult {
  jurisdictions: Array<
    Omit<JurisdictionResult, "applicableRequirements"> & {
      requirementCount: number;
    }
  >;
  comparisonMatrix: ComparisonMatrix;
  euSpaceActPreview: EUSpaceActPreview;
  recommendations: string[];
}
