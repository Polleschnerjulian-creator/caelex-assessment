/**
 * Unified Assessment Types
 * Comprehensive types for the combined EU Space Act, NIS2, and National Space Laws assessment
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const ACTIVITY_TYPES = [
  "SCO", // Spacecraft Operator
  "LO", // Launch Operator
  "LSO", // Launch Site Operator
  "ISOS", // In-Space Service Operator
  "CAP", // Collision Avoidance Provider
  "PDP", // Positional Data Provider
  "TCO", // Third Country Operator
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  SCO: "Spacecraft Operator",
  LO: "Launch Operator",
  LSO: "Launch Site Operator",
  ISOS: "In-Space Service Operator",
  CAP: "Collision Avoidance Provider",
  PDP: "Positional Data Provider",
  TCO: "Third Country Operator",
};

export const EU_MEMBER_STATES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
] as const;

export const SPACE_LAW_JURISDICTIONS = [
  "FR",
  "UK",
  "DE",
  "LU",
  "NL",
  "BE",
  "AT",
  "DK",
  "IT",
  "NO",
] as const;

export type SpaceLawJurisdiction = (typeof SPACE_LAW_JURISDICTIONS)[number];

export const JURISDICTION_NAMES: Record<string, string> = {
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DK: "Denmark",
  EE: "Estonia",
  FI: "Finland",
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  LV: "Latvia",
  LT: "Lithuania",
  LU: "Luxembourg",
  MT: "Malta",
  NL: "Netherlands",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SK: "Slovakia",
  SI: "Slovenia",
  ES: "Spain",
  SE: "Sweden",
  UK: "United Kingdom",
  NO: "Norway",
  CH: "Switzerland",
  US: "United States",
  OTHER: "Other Third Country",
};

export const ORBITAL_REGIMES = [
  "LEO", // Low Earth Orbit
  "MEO", // Medium Earth Orbit
  "GEO", // Geostationary Orbit
  "HEO", // Highly Elliptical Orbit
  "SSO", // Sun-Synchronous Orbit
  "CISLUNAR", // Cislunar / Beyond Earth Orbit
  "MULTIPLE", // Multiple orbital regimes
] as const;

export type OrbitalRegime = (typeof ORBITAL_REGIMES)[number];

export const ORBITAL_REGIME_LABELS: Record<OrbitalRegime, string> = {
  LEO: "Low Earth Orbit (< 2,000 km)",
  MEO: "Medium Earth Orbit (2,000 - 35,786 km)",
  GEO: "Geostationary Orbit (35,786 km)",
  HEO: "Highly Elliptical Orbit",
  SSO: "Sun-Synchronous Orbit",
  CISLUNAR: "Cislunar / Beyond Earth Orbit",
  MULTIPLE: "Multiple Orbital Regimes",
};

export const SERVICE_TYPES = [
  "SATCOM", // Satellite Communications
  "EO", // Earth Observation
  "NAV", // Navigation / GNSS
  "ISR", // Intelligence, Surveillance, Reconnaissance
  "SSA", // Space Situational Awareness
  "RELAY", // Data Relay
  "IOD", // In-Orbit Demonstration
  "MANUFACTURING", // In-Space Manufacturing
  "TOURISM", // Space Tourism
  "DEBRIS_REMOVAL", // Active Debris Removal
  "SERVICING", // On-Orbit Servicing
  "OTHER", // Other Services
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  SATCOM: "Satellite Communications",
  EO: "Earth Observation / Remote Sensing",
  NAV: "Navigation / GNSS Services",
  ISR: "Intelligence, Surveillance, Reconnaissance",
  SSA: "Space Situational Awareness",
  RELAY: "Data Relay Services",
  IOD: "In-Orbit Demonstration / Validation",
  MANUFACTURING: "In-Space Manufacturing",
  TOURISM: "Space Tourism / Human Spaceflight",
  DEBRIS_REMOVAL: "Active Debris Removal",
  SERVICING: "On-Orbit Servicing / RPO",
  OTHER: "Other Space Services",
};

export const ENTITY_SIZES = [
  "micro", // < 10 employees, < €2M turnover
  "small", // < 50 employees, < €10M turnover
  "medium", // < 250 employees, < €50M turnover
  "large", // >= 250 employees or >= €50M turnover
] as const;

export type EntitySize = (typeof ENTITY_SIZES)[number];

export const ENTITY_SIZE_LABELS: Record<EntitySize, string> = {
  micro: "Micro (< 10 employees, < €2M turnover)",
  small: "Small (< 50 employees, < €10M turnover)",
  medium: "Medium (< 250 employees, < €50M turnover)",
  large: "Large (≥ 250 employees or ≥ €50M turnover)",
};

export const TURNOVER_RANGES = [
  "under_2m", // < €2M
  "2m_10m", // €2M - €10M
  "10m_50m", // €10M - €50M
  "50m_250m", // €50M - €250M
  "over_250m", // > €250M
] as const;

export type TurnoverRange = (typeof TURNOVER_RANGES)[number];

export const EMPLOYEE_RANGES = [
  "1_9", // 1-9
  "10_49", // 10-49
  "50_249", // 50-249
  "250_999", // 250-999
  "1000_plus", // 1000+
] as const;

export type EmployeeRange = (typeof EMPLOYEE_RANGES)[number];

export const CONSTELLATION_SIZES = [
  "none", // No constellation
  "small", // 2-10 satellites
  "medium", // 11-100 satellites
  "large", // 101-1000 satellites
  "mega", // > 1000 satellites
] as const;

export type ConstellationSize = (typeof CONSTELLATION_SIZES)[number];

export const INSURANCE_RANGES = [
  "none", // No insurance
  "under_10m", // < €10M
  "10m_60m", // €10M - €60M
  "60m_100m", // €60M - €100M
  "100m_500m", // €100M - €500M
  "over_500m", // > €500M
] as const;

export type InsuranceRange = (typeof INSURANCE_RANGES)[number];

export const TIMELINE_PREFERENCES = [
  "immediate", // ASAP
  "6_months", // Within 6 months
  "1_year", // Within 1 year
  "2_years", // Within 2 years
  "planning", // Just planning / research
] as const;

export type TimelinePreference = (typeof TIMELINE_PREFERENCES)[number];

// ============================================================================
// ASSESSMENT ANSWERS
// ============================================================================

export interface UnifiedAssessmentAnswers {
  // Phase 1: Company Profile
  companyName: string | null;
  establishmentCountry: string | null;
  entitySize: EntitySize | null;
  turnoverRange: TurnoverRange | null;
  employeeRange: EmployeeRange | null;
  isResearchInstitution: boolean | null;
  isStartup: boolean | null;

  // Phase 2: Activity Types
  activityTypes: ActivityType[];
  isDefenseOnly: boolean | null;
  hasPostLaunchResponsibility: boolean | null;
  providesServicesToEU: boolean | null;

  // Phase 3: Operations Details
  spacecraftCount: number | null;
  operatesConstellation: boolean | null;
  constellationSize: ConstellationSize | null;
  primaryOrbitalRegime: OrbitalRegime | null;
  additionalOrbits: OrbitalRegime[];
  hasDebrisMitigationPlan: boolean | null;
  hasActiveDebrisRemoval: boolean | null;
  missionDuration: string | null; // "short" (<2yr), "medium" (2-7yr), "long" (7-25yr), "extended" (>25yr)

  // Phase 4: Services & Market
  serviceTypes: ServiceType[];
  servesEUCustomers: boolean | null;
  servesCriticalInfrastructure: boolean | null;
  isEssentialServiceProvider: boolean | null;
  partOfSupplyChain: boolean | null;
  governmentContracts: boolean | null;

  // Phase 5: Cybersecurity Readiness (NIS2)
  hasCybersecurityPolicy: boolean | null;
  hasRiskManagement: boolean | null;
  hasIncidentResponsePlan: boolean | null;
  hasSupplyChainSecurity: boolean | null;
  hasBusinessContinuityPlan: boolean | null;
  hasSecurityTraining: boolean | null;
  hasEncryption: boolean | null;
  hasAccessControl: boolean | null;
  hasVulnerabilityManagement: boolean | null;
  conductsPenetrationTesting: boolean | null;

  // Phase 6: Licensing & Jurisdiction
  currentLicenses: string[]; // Countries where already licensed
  interestedJurisdictions: SpaceLawJurisdiction[];
  licensingTimeline: TimelinePreference | null;
  requiresEnglishProcess: boolean | null;
  prefersFastProcessing: boolean | null;

  // Phase 7: Insurance & Liability
  hasInsurance: boolean | null;
  insuranceCoverage: InsuranceRange | null;
  hasThirdPartyLiability: boolean | null;

  // Phase 8: Compliance Status
  hasExistingCompliance: boolean | null;
  existingCertifications: string[]; // ISO 27001, SOC2, etc.
  hasLegalCounsel: boolean | null;
  complianceBudget: string | null; // "minimal", "moderate", "substantial"
}

// ============================================================================
// ASSESSMENT RESULTS
// ============================================================================

export interface EUSpaceActResult {
  applies: boolean;
  operatorTypes: ActivityType[];
  regime: "standard" | "light" | "exempt";
  regimeReason: string;
  applicableArticles: ArticleReference[];
  moduleStatuses: ModuleStatus[];
  keyDeadlines: Deadline[];
  estimatedEffort: "low" | "medium" | "high" | "very_high";
  priorityActions: string[];
}

export interface ArticleReference {
  number: string;
  title: string;
  relevance: "mandatory" | "conditional" | "recommended";
  module: string;
  summary: string;
}

export interface ModuleStatus {
  id: string;
  name: string;
  status: "applicable" | "partial" | "exempt" | "not_applicable";
  articleCount: number;
  keyRequirements: string[];
}

export interface Deadline {
  date: string;
  description: string;
  regulation: "eu_space_act" | "nis2" | "national";
  priority: "critical" | "important" | "standard";
}

export interface NIS2Result {
  applies: boolean;
  entityClassification: "essential" | "important" | "out_of_scope";
  classificationReason: string;
  sector: string;
  subSector: string;
  applicableRequirements: NIS2Requirement[];
  complianceGaps: ComplianceGap[];
  reportingObligations: ReportingObligation[];
  estimatedReadiness: number; // 0-100%
  priorityActions: string[];
}

export interface NIS2Requirement {
  id: string;
  article: string;
  title: string;
  description: string;
  category: string;
  currentStatus: "compliant" | "partial" | "non_compliant" | "unknown";
}

export interface ComplianceGap {
  requirement: string;
  currentState: string;
  requiredState: string;
  effort: "low" | "medium" | "high";
  priority: "critical" | "high" | "medium" | "low";
}

export interface ReportingObligation {
  type: string;
  deadline: string;
  recipient: string;
  description: string;
}

export interface NationalSpaceLawResult {
  analyzedJurisdictions: JurisdictionAnalysis[];
  recommendedJurisdiction: SpaceLawJurisdiction | null;
  recommendationReason: string;
  comparisonMatrix: ComparisonMatrix;
  transitionToEUSpaceAct: TransitionInfo;
}

export interface JurisdictionAnalysis {
  country: SpaceLawJurisdiction;
  countryName: string;
  overallScore: number; // 0-100
  pros: string[];
  cons: string[];
  licensingProcess: {
    authority: string;
    processingTime: string;
    language: string;
    fees: string;
    complexity: "simple" | "moderate" | "complex";
  };
  insuranceRequirements: {
    minimum: string;
    thirdPartyLiability: boolean;
    governmentIndemnity: boolean;
  };
  debrisRequirements: {
    mitigationPlanRequired: boolean;
    deorbitTimeline: string;
    passivatonRequired: boolean;
  };
  specificRequirements: string[];
  euSpaceActAlignment: number; // 0-100%
}

export interface ComparisonMatrix {
  criteria: string[];
  scores: Record<SpaceLawJurisdiction, Record<string, number | string>>;
}

export interface TransitionInfo {
  currentLawExpiry: string;
  euSpaceActStart: string;
  transitionPeriod: string;
  keyChanges: string[];
  preparationSteps: string[];
}

// ============================================================================
// UNIFIED RESULT
// ============================================================================

export interface UnifiedComplianceProfile {
  // Metadata
  assessmentId: string;
  completedAt: string;
  version: string;

  // Company Summary
  companySummary: {
    name: string | null;
    establishment: string;
    establishmentName: string;
    isEU: boolean;
    size: EntitySize;
    sizeName: string;
    activities: ActivityType[];
    activityNames: string[];
    primaryService: ServiceType | null;
    serviceName: string | null;
  };

  // Framework Results
  euSpaceAct: EUSpaceActResult;
  nis2: NIS2Result;
  nationalSpaceLaw: NationalSpaceLawResult;

  // Cross-Framework Analysis
  crossFrameworkAnalysis: {
    totalRequirements: number;
    overlappingRequirements: number;
    uniqueByFramework: Record<string, number>;
    synergies: string[];
    conflicts: string[];
  };

  // Consolidated Timeline
  consolidatedTimeline: Deadline[];

  // Priority Actions (across all frameworks)
  priorityActions: PriorityAction[];

  // Risk Assessment
  riskAssessment: {
    overallRisk: "low" | "medium" | "high" | "critical";
    risksByFramework: Record<string, "low" | "medium" | "high" | "critical">;
    keyRisks: string[];
    mitigationStrategies: string[];
  };

  // Estimated Costs & Effort
  estimatedEffort: {
    totalMonths: number;
    byFramework: Record<string, number>;
    fteRequired: number;
    estimatedCost: string;
  };

  // Recommendations
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    optional: string[];
  };
}

export interface PriorityAction {
  id: string;
  title: string;
  description: string;
  framework: "eu_space_act" | "nis2" | "national" | "cross_framework";
  priority: "critical" | "high" | "medium" | "low";
  deadline: string | null;
  estimatedEffort: string;
  dependencies: string[];
}

// ============================================================================
// REDACTED RESULT (for client-side display)
// ============================================================================

export interface RedactedUnifiedResult {
  assessmentId: string;
  completedAt: string;

  companySummary: {
    name: string | null;
    establishment: string;
    isEU: boolean;
    size: string;
    activities: string[];
    primaryService: string | null;
  };

  euSpaceAct: {
    applies: boolean;
    operatorTypes: string[];
    regime: string;
    regimeReason: string;
    applicableArticleCount: number;
    moduleCount: number;
    keyDeadlines: { date: string; description: string }[];
    priorityActions: string[];
  };

  nis2: {
    applies: boolean;
    entityClassification: string;
    classificationReason: string;
    requirementCount: number;
    complianceGapCount: number;
    estimatedReadiness: number;
    priorityActions: string[];
  };

  nationalSpaceLaw: {
    analyzedCount: number;
    recommendedJurisdiction: string | null;
    recommendedJurisdictionName: string | null;
    recommendationReason: string;
    topScores: { country: string; name: string; score: number }[];
  };

  overallSummary: {
    totalRequirements: number;
    overallRisk: string;
    estimatedMonths: number;
    immediateActions: string[];
  };
}

// ============================================================================
// QUESTION TYPES
// ============================================================================

export interface UnifiedQuestion {
  id: keyof UnifiedAssessmentAnswers;
  phase: number;
  phaseName: string;
  title: string;
  subtitle?: string;
  helpText?: string;
  type: "single" | "multi" | "text" | "number" | "boolean";
  options?: UnifiedQuestionOption[];
  maxSelections?: number;
  minSelections?: number;
  required: boolean;
  showIf?: (answers: Partial<UnifiedAssessmentAnswers>) => boolean | undefined;
  validation?: (value: unknown) => string | null;
}

export interface UnifiedQuestionOption {
  id: string;
  value: string | boolean | number;
  label: string;
  description?: string;
  icon?: string;
  flag?: string; // For country flags
}

// ============================================================================
// ASSESSMENT STATE
// ============================================================================

export interface UnifiedAssessmentState {
  currentPhase: number;
  currentStep: number;
  totalSteps: number;
  answers: Partial<UnifiedAssessmentAnswers>;
  isComplete: boolean;
  startedAt: number;
}

export const PHASE_NAMES = [
  "Company Profile",
  "Activity Types",
  "Operations",
  "Services & Market",
  "Cybersecurity",
  "Licensing",
  "Insurance",
  "Compliance Status",
] as const;

export const getDefaultUnifiedAnswers =
  (): Partial<UnifiedAssessmentAnswers> => ({
    companyName: null,
    establishmentCountry: null,
    entitySize: null,
    turnoverRange: null,
    employeeRange: null,
    isResearchInstitution: null,
    isStartup: null,
    activityTypes: [],
    isDefenseOnly: null,
    hasPostLaunchResponsibility: null,
    providesServicesToEU: null,
    spacecraftCount: null,
    operatesConstellation: null,
    constellationSize: null,
    primaryOrbitalRegime: null,
    additionalOrbits: [],
    hasDebrisMitigationPlan: null,
    hasActiveDebrisRemoval: null,
    missionDuration: null,
    serviceTypes: [],
    servesEUCustomers: null,
    servesCriticalInfrastructure: null,
    isEssentialServiceProvider: null,
    partOfSupplyChain: null,
    governmentContracts: null,
    hasCybersecurityPolicy: null,
    hasRiskManagement: null,
    hasIncidentResponsePlan: null,
    hasSupplyChainSecurity: null,
    hasBusinessContinuityPlan: null,
    hasSecurityTraining: null,
    hasEncryption: null,
    hasAccessControl: null,
    hasVulnerabilityManagement: null,
    conductsPenetrationTesting: null,
    currentLicenses: [],
    interestedJurisdictions: [],
    licensingTimeline: null,
    requiresEnglishProcess: null,
    prefersFastProcessing: null,
    hasInsurance: null,
    insuranceCoverage: null,
    hasThirdPartyLiability: null,
    hasExistingCompliance: null,
    existingCertifications: [],
    hasLegalCounsel: null,
    complianceBudget: null,
  });
