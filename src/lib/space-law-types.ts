/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Country Codes for Priority Jurisdictions ───
//
// This list covers every European country that has enacted a dedicated national
// space activities law, plus a few emerging jurisdictions with interim
// frameworks. The 10-jurisdiction product scope was expanded to 18 in the
// 2026-04 regulatory refresh to reflect enacted laws that Caelex must cover:
//
//   Core EU with dedicated space law: FR, DE, IT, UK, LU, NL, BE, ES, AT, PL
//   Nordic/Baltic:                    DK, NO, SE, FI
//   Other enacted:                    PT, GR, CZ, IE, CH (EEA / observer)
//
// Any change to this list must be mirrored in `SPACE_LAW_COUNTRY_CODES` below
// and in the corresponding `JURISDICTION_DATA` Map in national-space-laws.ts.

export type SpaceLawCountryCode =
  // Core EU space law jurisdictions
  | "FR" // France — Loi sur les Opérations Spatiales (LOS) 2008
  | "DE" // Germany — no comprehensive space law (SatDSiG for remote sensing only)
  | "IT" // Italy — Law 89/2025 "Legge sull'Economia dello Spazio"
  | "UK" // United Kingdom — Space Industry Act 2018
  | "LU" // Luxembourg — Law of 20 July 2017 on exploration and use of space resources
  | "NL" // Netherlands — Space Activities Act (SaRa) 2007
  | "BE" // Belgium — Law on Activities of Launching, Flight Operation or Guidance 2005
  | "ES" // Spain — Royal Decree 278/2024 (March 2024)
  | "AT" // Austria — Outer Space Act (Weltraumgesetz) 2011
  | "PL" // Poland — Act on Space Activities 2021 (Ustawa o działalności kosmicznej)
  // Nordics
  | "DK" // Denmark — Space Activities Act 2016
  | "NO" // Norway — Act on Launching Objects 1969 (amended 2019)
  | "SE" // Sweden — Act on Space Activities 1982 / Space Operations Act revision
  | "FI" // Finland — Act on Space Activities 63/2018
  // Other enacted
  | "PT" // Portugal — Decree-Law 16/2019 establishing the Portuguese Space Agency
  | "GR" // Greece — Law 4903/2022 on the National Space Policy and Space Activities
  | "CZ" // Czech Republic — Act 77/2024 on Space Activities
  | "IE" // Ireland — no dedicated law yet, interim framework via ESA / EIA
  | "CH" // Switzerland — Federal Ordinance on Space Objects (2019), non-EU/EEA
  | "EE" // Estonia — no dedicated space law, interim framework via MKM / sectoral laws
  | "RO" // Romania — no dedicated space law, ROSA coordination + sectoral framework
  | "HU" // Hungary — no dedicated space law, Hungarian Space Office + sectoral framework
  | "SI" // Slovenia — no dedicated space law, MGTS coordination + sectoral framework
  | "LV" // Latvia — no dedicated space law, IZM/ESA Associate + sectoral framework
  | "LT" // Lithuania — no dedicated space law, EIM/ESA Associate + sectoral framework
  | "SK" // Slovakia — no dedicated space law, MŠVVaM/ESA Associate + sectoral framework
  | "HR" // Croatia — no dedicated space law, MZO/ESA PECS + sectoral framework
  | "TR" // Turkey — no dedicated space law; TUA (2018) coordinates via Presidential Decree
  | "IS" // Iceland — EEA member, no domestic space activity or agency
  | "LI"; // Liechtenstein — EEA member, no space activity, SPV jurisdiction

export const SPACE_LAW_COUNTRY_CODES: SpaceLawCountryCode[] = [
  "FR",
  "DE",
  "IT",
  "UK",
  "LU",
  "NL",
  "BE",
  "ES",
  "AT",
  "PL",
  "DK",
  "NO",
  "SE",
  "FI",
  "PT",
  "GR",
  "CZ",
  "IE",
  "CH",
  "EE",
  "RO",
  "HU",
  "SI",
  "LV",
  "LT",
  "SK",
  "HR",
  "TR",
  "IS",
  "LI",
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
