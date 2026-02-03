// Insurance Navigator Data for EU Space Act Compliance
// Strategic: EU Space Act does NOT harmonize insurance - this is national law territory

// ═══════════════════════════════════════════════════════════════
// INSURANCE MODULE TYPES
// ═══════════════════════════════════════════════════════════════

export type InsuranceType =
  | "pre_launch"
  | "launch"
  | "in_orbit"
  | "third_party_liability"
  | "contingent_liability"
  | "loss_of_revenue"
  | "launch_plus_life";

export type PolicyStatus =
  | "not_started"
  | "quote_requested"
  | "quote_received"
  | "under_review"
  | "bound"
  | "active"
  | "expiring_soon" // < 90 days
  | "expired"
  | "not_required";

export type JurisdictionCode =
  | "FR"
  | "DE"
  | "IT"
  | "UK"
  | "ES"
  | "NL"
  | "BE"
  | "LU"
  | "AT"
  | "PL"
  | "SE"
  | "NO"
  | "DK"
  | "FI"
  | "PT"
  | "IE"
  | "CZ"
  | "RO"
  | "GR"
  | "HU"
  | "CH"
  | "OTHER_EU"
  | "NON_EU";

export type CompanySize = "micro" | "small" | "medium" | "large";
// micro: <10 employees, <€2M revenue
// small: <50 employees, <€10M revenue
// medium: <250 employees, <€50M revenue
// large: ≥250 employees or ≥€50M revenue

export type MissionRiskLevel = "low" | "medium" | "high" | "very_high";

export type OrbitRegime =
  | "LEO"
  | "MEO"
  | "GEO"
  | "HEO"
  | "cislunar"
  | "deep_space";

export type OperatorType = "spacecraft" | "launch" | "launch_site";

// ═══════════════════════════════════════════════════════════════
// MISSION RISK PROFILE
// ═══════════════════════════════════════════════════════════════

export interface InsuranceRiskProfile {
  // Jurisdiction
  primaryJurisdiction: JurisdictionCode;

  // Operator Profile
  operatorType: OperatorType;
  companySize: CompanySize;

  // Mission Parameters
  orbitRegime: OrbitRegime;
  satelliteCount: number;
  satelliteValueEur: number;
  totalMissionValueEur: number;

  // Operations
  isConstellationOperator: boolean;
  hasManeuverability: boolean;
  missionDurationYears: number;
  hasFlightHeritage: boolean;

  // Launch Details
  launchVehicle?: string;
  launchProvider?: string;

  // Risk Factors
  hasADR: boolean;
  hasPropulsion: boolean;
  hasHazardousMaterials: boolean;
  crossBorderOps: boolean;

  // Financial
  annualRevenueEur?: number;
  turnoversShareSpace?: number;
}

// ═══════════════════════════════════════════════════════════════
// NATIONAL REQUIREMENTS DATABASE
// ═══════════════════════════════════════════════════════════════

export interface NationalInsuranceRequirement {
  jurisdictionCode: JurisdictionCode;
  country: string;
  flag: string;

  // Legal Framework
  hasSpaceLaw: boolean;
  lawName?: string;
  lawYear?: number;
  relevantLegislation?: string[];

  // TPL Requirements
  insuranceRequired: boolean;
  minimumTPL: number;
  tplCap?: number;
  tplFormula?: string;
  tplVariableBySize?: boolean;
  tplVariableByRisk?: boolean;

  // Size-based TPL (if applicable)
  tplBySize?: {
    micro?: number;
    small?: number;
    medium?: number;
    large?: number;
  };

  // State Indemnification
  governmentGuarantee: boolean;
  governmentGuaranteeDetails?: string;

  // Coverage Details
  coverageScope: string;

  // Launch Site Insurance
  launchSiteInsurance: boolean;

  // Financial Guarantee Alternative
  financialGuaranteeAccepted: boolean;
  financialGuaranteeTypes?: string[];

  // Registration Requirements
  mustRegisterPolicy: boolean;
  registrationAuthority?: string;

  // Special Notes
  notes: string[];
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════
// INSURANCE POLICY TRACKING
// ═══════════════════════════════════════════════════════════════

export interface InsurancePolicy {
  id: string;
  type: InsuranceType;

  // Policy Details
  policyNumber?: string;
  insurer?: string;
  broker?: string;

  // Coverage
  coverageAmountEur: number;
  deductibleEur?: number;
  premiumEur?: number;
  premiumFrequency?: "annual" | "single";

  // Dates
  inceptionDate?: string;
  expirationDate?: string;
  renewalDate?: string;

  // Status
  status: PolicyStatus;

  // Documents
  documents?: {
    type: "policy" | "certificate" | "endorsement" | "quote" | "claim";
    fileName?: string;
    uploadedAt?: string;
  }[];

  // Compliance
  meetsNationalRequirement: boolean;
  complianceNotes?: string;
}

// ═══════════════════════════════════════════════════════════════
// INSURANCE TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface InsuranceTypeDefinition {
  type: InsuranceType;
  name: string;
  label: string;
  description: string;
  phase: "pre_launch" | "launch" | "in_orbit" | "all";
  typicalCoveragePercent: number; // of satellite value
  typicalPremiumPercent: number; // of coverage
  isMandatory: boolean;
  mandatoryFor?: OperatorType[];
  applicableOrbitRegimes?: OrbitRegime[];
  tips: string[];
  keyProviders: string[];
}

// ═══════════════════════════════════════════════════════════════
// NATIONAL REQUIREMENTS DATA
// ═══════════════════════════════════════════════════════════════

export const nationalInsuranceRequirements: NationalInsuranceRequirement[] = [
  {
    jurisdictionCode: "FR",
    country: "France",
    flag: "🇫🇷",
    hasSpaceLaw: true,
    lawName: "Loi relative aux Opérations Spatiales (FSOA)",
    lawYear: 2008,
    relevantLegislation: ["Article 6", "Decree 2009-643 Art. 16-18"],
    insuranceRequired: true,
    minimumTPL: 60_000_000,
    tplCap: 60_000_000,
    tplVariableBySize: false,
    tplVariableByRisk: false,
    governmentGuarantee: true,
    governmentGuaranteeDetails:
      "French state covers third-party liability above €60M cap during both launch and in-orbit phases.",
    coverageScope:
      "State, ESA, ESA Member States, operator, and mission participants",
    launchSiteInsurance: true,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: [
      "Bank guarantee",
      "Parent company guarantee",
      "Escrow account",
    ],
    mustRegisterPolicy: true,
    registrationAuthority: "CNES",
    notes: [
      "Coverage must include: State, ESA, ESA Member States, operator, and mission participants",
      "Minister may grant temporary exemption if market coverage unavailable",
      "In-orbit phase: only Earth-surface damage, not in-orbit collisions",
    ],
    lastUpdated: "2024-01-15",
  },
  {
    jurisdictionCode: "IT",
    country: "Italy",
    flag: "🇮🇹",
    hasSpaceLaw: true,
    lawName: "Legge sull'Economia dello Spazio",
    lawYear: 2025,
    relevantLegislation: ["Article 8"],
    insuranceRequired: true,
    minimumTPL: 100_000_000,
    tplCap: 100_000_000,
    tplVariableBySize: true,
    tplVariableByRisk: false,
    tplBySize: {
      micro: 20_000_000,
      small: 20_000_000,
      medium: 50_000_000,
      large: 100_000_000,
    },
    governmentGuarantee: true,
    governmentGuaranteeDetails:
      "Italian state may cover amounts above cap on case-by-case basis.",
    coverageScope: "Third-party liability for space activities",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Bank guarantee", "Insurance bond"],
    mustRegisterPolicy: true,
    registrationAuthority: "ASI (Agenzia Spaziale Italiana)",
    notes: [
      "Coverage amounts reduced for SMEs (€50M medium, €20M micro/small)",
      "Strict liability regime applies",
      "Recent law - implementing regulations still being developed",
    ],
    lastUpdated: "2025-06-15",
  },
  {
    jurisdictionCode: "DE",
    country: "Germany",
    flag: "🇩🇪",
    hasSpaceLaw: false,
    lawName: "Weltraumgesetz (Draft)",
    lawYear: 2024,
    relevantLegislation: ["Draft §15-17"],
    insuranceRequired: true,
    minimumTPL: 50_000_000,
    tplCap: 50_000_000,
    tplFormula: "10% of average annual turnover (3 years), max €50M",
    tplVariableBySize: true,
    tplVariableByRisk: false,
    governmentGuarantee: false,
    governmentGuaranteeDetails:
      "Draft law does not provide for state indemnification.",
    coverageScope: "Third-party liability",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Liability insurance", "Financial guarantee"],
    mustRegisterPolicy: true,
    registrationAuthority: "LBA (Luftfahrt-Bundesamt) - proposed",
    notes: [
      "CURRENT: No specific space law - general Air Traffic Act applies",
      "PROPOSED: Dedicated Space Act in legislative process",
      "Liability cap formula: 10% of turnover, max €50M",
      "Until new law passes, contractual arrangements apply",
    ],
    lastUpdated: "2024-09-01",
  },
  {
    jurisdictionCode: "UK",
    country: "United Kingdom",
    flag: "🇬🇧",
    hasSpaceLaw: true,
    lawName: "Space Industry Act 2018 / Outer Space Act 1986",
    lawYear: 2018,
    relevantLegislation: ["SIA 2018 s.36", "OSA 1986 s.10"],
    insuranceRequired: true,
    minimumTPL: 60_000_000,
    tplCap: 60_000_000,
    tplFormula:
      "Modelled Insurance Requirement (MIR) based on Maximum Probable Loss",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: true,
    governmentGuaranteeDetails:
      "UK Government covers amounts above operator cap under Liability Convention.",
    coverageScope: "Third-party liability, property damage",
    launchSiteInsurance: true,
    financialGuaranteeAccepted: false,
    financialGuaranteeTypes: [],
    mustRegisterPolicy: true,
    registrationAuthority: "UK Space Agency / CAA",
    notes: [
      "Uses Modelled Insurance Requirement (MIR) approach",
      "Insurance amount tailored to risk profile",
      "Strict liability for UK-based damage",
      "Favorable terms for sustainable, compliant missions",
      "May require higher/lower than €60M based on MIR",
    ],
    lastUpdated: "2024-06-01",
  },
  {
    jurisdictionCode: "NL",
    country: "Netherlands",
    flag: "🇳🇱",
    hasSpaceLaw: true,
    lawName: "Space Activities Act",
    lawYear: 2007,
    relevantLegislation: ["Article 7"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "As determined by Minister based on risk assessment",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    governmentGuaranteeDetails:
      "No cap - operator fully liable. State may seek recourse.",
    coverageScope: "Third-party liability, no fixed cap",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Financial guarantee"],
    mustRegisterPolicy: true,
    registrationAuthority: "Ministry of Economic Affairs",
    notes: [
      "No fixed liability cap - potentially unlimited operator liability",
      "Insurance requirement determined case-by-case",
      "Higher risk for operators without cap",
      "Consider establishing in jurisdiction with cap",
    ],
    lastUpdated: "2024-03-01",
  },
  {
    jurisdictionCode: "LU",
    country: "Luxembourg",
    flag: "🇱🇺",
    hasSpaceLaw: true,
    lawName: "Space Resources Act / Space Activities Act",
    lawYear: 2020,
    relevantLegislation: ["Article 13"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Appropriate to nature and risk of activities",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Proportional to risk",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Other financial guarantee"],
    mustRegisterPolicy: true,
    registrationAuthority: "Luxembourg Space Agency (LSA)",
    notes: [
      "Flexible approach - coverage proportional to risk",
      "Attractive for commercial operators",
      "Space Resources Act enables in-situ resource utilization",
      "Growing space hub status",
    ],
    lastUpdated: "2024-04-01",
  },
  {
    jurisdictionCode: "BE",
    country: "Belgium",
    flag: "🇧🇪",
    hasSpaceLaw: true,
    lawName: "Belgian Space Act",
    lawYear: 2005,
    relevantLegislation: ["Article 10"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Determined by licensing authority",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: true,
    governmentGuaranteeDetails:
      "State may cover if operator cannot pay, but retains recourse rights.",
    coverageScope: "Third-party liability per license",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Financial guarantee"],
    mustRegisterPolicy: true,
    registrationAuthority: "BELSPO",
    notes: [
      "No fixed liability cap",
      "Requirements set per license",
      "ESA headquarters location - strong space ecosystem",
    ],
    lastUpdated: "2024-02-01",
  },
  {
    jurisdictionCode: "ES",
    country: "Spain",
    flag: "🇪🇸",
    hasSpaceLaw: true,
    lawName: "Royal Decree on Space Activities",
    lawYear: 2023,
    relevantLegislation: ["Article 12"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Based on risk assessment",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Third-party liability",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Financial guarantee", "Other"],
    mustRegisterPolicy: true,
    registrationAuthority: "AEE (Agencia Espacial Española)",
    notes: [
      "New Spanish Space Agency (AEE) established 2023",
      "Relatively new regulatory framework",
      "Growing launch capability ambitions",
    ],
    lastUpdated: "2024-05-01",
  },
  {
    jurisdictionCode: "AT",
    country: "Austria",
    flag: "🇦🇹",
    hasSpaceLaw: true,
    lawName: "Austrian Outer Space Act",
    lawYear: 2011,
    relevantLegislation: ["Section 4"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Adequate insurance required",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Third-party liability",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Financial guarantee"],
    mustRegisterPolicy: true,
    registrationAuthority: "FFG (Austrian Research Promotion Agency)",
    notes: [
      "No fixed liability limit",
      "Insurance adequacy determined per application",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "SE",
    country: "Sweden",
    flag: "🇸🇪",
    hasSpaceLaw: true,
    lawName: "Act on Space Activities",
    lawYear: 1982,
    relevantLegislation: ["Section 7"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Appropriate level determined by authority",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Third-party liability",
    launchSiteInsurance: true,
    financialGuaranteeAccepted: false,
    financialGuaranteeTypes: [],
    mustRegisterPolicy: true,
    registrationAuthority: "Swedish National Space Agency",
    notes: [
      "One of oldest national space laws in Europe",
      "Esrange launch site in Kiruna",
      "Strong small satellite industry",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "NO",
    country: "Norway",
    flag: "🇳🇴",
    hasSpaceLaw: true,
    lawName:
      "Act on Launching Objects from Norwegian Territory into Outer Space",
    lawYear: 1969,
    relevantLegislation: ["Section 2"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "As specified in license conditions",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Third-party liability",
    launchSiteInsurance: true,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Bank guarantee"],
    mustRegisterPolicy: true,
    registrationAuthority: "Norwegian Space Agency (NOSA)",
    notes: [
      "Andoya Space Center - northernmost launch site",
      "Strong polar orbit launch capability",
      "Svalbard ground station",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "DK",
    country: "Denmark",
    flag: "🇩🇰",
    hasSpaceLaw: true,
    lawName: "Danish Outer Space Act",
    lawYear: 2016,
    relevantLegislation: ["Section 10"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Based on assessment of activities",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Third-party liability",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Financial guarantee"],
    mustRegisterPolicy: true,
    registrationAuthority: "Danish Agency for Science and Higher Education",
    notes: [
      "Growing NewSpace ecosystem",
      "Strong in maritime/AIS applications",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "FI",
    country: "Finland",
    flag: "🇫🇮",
    hasSpaceLaw: true,
    lawName: "Act on Space Activities",
    lawYear: 2018,
    relevantLegislation: ["Section 8"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Adequate and appropriate insurance",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Third-party liability",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: [
      "Insurance",
      "Other appropriate financial guarantee",
    ],
    mustRegisterPolicy: true,
    registrationAuthority: "Ministry of Economic Affairs and Employment",
    notes: [
      "Strong small satellite sector (ICEYE, Kuva Space)",
      "Arctic monitoring focus",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "PT",
    country: "Portugal",
    flag: "🇵🇹",
    hasSpaceLaw: true,
    lawName: "Portuguese Space Act",
    lawYear: 2019,
    relevantLegislation: ["Article 15"],
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Based on risk assessment",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Third-party liability",
    launchSiteInsurance: true,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Financial guarantee"],
    mustRegisterPolicy: true,
    registrationAuthority: "Portugal Space",
    notes: ["Azores launch site under development", "Growing space sector"],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "IE",
    country: "Ireland",
    flag: "🇮🇪",
    hasSpaceLaw: false,
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "No specific space law - general liability applies",
    tplVariableBySize: false,
    tplVariableByRisk: false,
    governmentGuarantee: false,
    coverageScope: "General liability",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance"],
    mustRegisterPolicy: false,
    notes: [
      "No dedicated space law yet",
      "Space activities covered under general liability",
      "Growing space tech sector",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "PL",
    country: "Poland",
    flag: "🇵🇱",
    hasSpaceLaw: false,
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "No specific requirements - contact POLSA",
    tplVariableBySize: false,
    tplVariableByRisk: false,
    governmentGuarantee: false,
    coverageScope: "To be determined",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance"],
    mustRegisterPolicy: false,
    registrationAuthority: "POLSA (Polish Space Agency)",
    notes: [
      "Space law under development",
      "Growing space sector",
      "POLSA established 2014",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "CH",
    country: "Switzerland",
    flag: "🇨🇭",
    hasSpaceLaw: false,
    insuranceRequired: true,
    minimumTPL: 0,
    tplFormula: "Contractual arrangements apply",
    tplVariableBySize: false,
    tplVariableByRisk: false,
    governmentGuarantee: false,
    coverageScope: "Contractual",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance", "Financial guarantee"],
    mustRegisterPolicy: false,
    notes: [
      "No dedicated space law",
      "ESA member state",
      "Strong space tech sector (EPFL, ETH)",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "OTHER_EU",
    country: "Other EU Member State",
    flag: "🇪🇺",
    hasSpaceLaw: false,
    insuranceRequired: true,
    minimumTPL: 60_000_000,
    tplFormula: "Contact NCA for specific requirements",
    tplVariableBySize: false,
    tplVariableByRisk: true,
    governmentGuarantee: false,
    coverageScope: "Varies by jurisdiction",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance"],
    mustRegisterPolicy: true,
    notes: [
      "Requirements vary significantly",
      "Contact national authority for specific guidance",
      "Consider establishing in jurisdiction with clear framework",
    ],
    lastUpdated: "2024-01-01",
  },
  {
    jurisdictionCode: "NON_EU",
    country: "Non-EU Country",
    flag: "🌍",
    hasSpaceLaw: false,
    insuranceRequired: true,
    minimumTPL: 60_000_000,
    tplFormula: "Varies by country - consult local counsel",
    tplVariableBySize: false,
    tplVariableByRisk: false,
    governmentGuarantee: false,
    coverageScope: "Varies by jurisdiction",
    launchSiteInsurance: false,
    financialGuaranteeAccepted: true,
    financialGuaranteeTypes: ["Insurance"],
    mustRegisterPolicy: false,
    notes: [
      "If operating in EU market, must designate EU representative",
      "Subject to EU Space Act requirements for EU services",
      "May need to comply with multiple jurisdictions",
    ],
    lastUpdated: "2024-01-01",
  },
];

// ═══════════════════════════════════════════════════════════════
// INSURANCE TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const insuranceTypeDefinitions: Record<
  InsuranceType,
  InsuranceTypeDefinition
> = {
  pre_launch: {
    type: "pre_launch",
    name: "Pre-Launch Insurance",
    label: "Pre-Launch Insurance",
    description:
      "All-risks coverage for satellite from manufacturing facility to launch site, through integration and launch preparation.",
    phase: "pre_launch",
    typicalCoveragePercent: 100,
    typicalPremiumPercent: 0.5,
    isMandatory: false,
    tips: [
      "Coverage typically terminates at ignition (T-0)",
      "Includes transportation, storage, integration",
      "Consider manufacturer's insurance overlap",
      "Ownership transfer timing is critical",
    ],
    keyProviders: ["AXA XL", "Allianz", "Munich Re", "Swiss Re", "Lloyds"],
  },
  launch: {
    type: "launch",
    name: "Launch Insurance",
    label: "Launch Insurance",
    description:
      "Coverage from launch through orbit positioning and in-orbit testing, typically up to 365 days.",
    phase: "launch",
    typicalCoveragePercent: 100,
    typicalPremiumPercent: 8,
    isMandatory: false,
    tips: [
      "Premium varies heavily by launch vehicle heritage",
      "Proven vehicles: 5-8%, new vehicles: 12-15%+",
      "Rideshare launches may have different terms",
      "Includes deployment, orbit raising, commissioning",
    ],
    keyProviders: [
      "AXA XL",
      "Allianz",
      "Munich Re",
      "Lloyds syndicates",
      "Arch Insurance",
    ],
  },
  in_orbit: {
    type: "in_orbit",
    name: "In-Orbit Insurance",
    label: "In-Orbit Insurance",
    description:
      "Coverage for satellite operations including malfunctions, debris impact, and partial/total loss.",
    phase: "in_orbit",
    typicalCoveragePercent: 100,
    typicalPremiumPercent: 1.5,
    isMandatory: false,
    applicableOrbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    tips: [
      "Can be purchased annually or for satellite lifetime",
      "Partial loss coverage common (e.g., 50% capacity loss)",
      "Premium decreases with satellite age for proven designs",
      "Debris collision risk increasing LEO premiums",
    ],
    keyProviders: ["AXA XL", "Munich Re", "Swiss Re", "Lloyds", "Assure Space"],
  },
  third_party_liability: {
    type: "third_party_liability",
    name: "Third-Party Liability (TPL)",
    label: "Third-Party Liability (TPL)",
    description:
      "MANDATORY in most jurisdictions. Covers bodily injury and property damage to third parties from ground, launch, and in-orbit operations.",
    phase: "all",
    typicalCoveragePercent: 0,
    typicalPremiumPercent: 0.5,
    isMandatory: true,
    mandatoryFor: ["spacecraft", "launch", "launch_site"],
    tips: [
      "MANDATORY in most EU jurisdictions",
      "Coverage amount determined by national law",
      "Must cover entire mission lifetime",
      "Typically 60-100M minimum in EU",
      "Average premium: <1% of coverage",
    ],
    keyProviders: [
      "AXA XL",
      "Allianz",
      "Munich Re",
      "Global Aerospace",
      "Starr Insurance",
    ],
  },
  contingent_liability: {
    type: "contingent_liability",
    name: "Contingent Liability",
    label: "Contingent Liability",
    description:
      "Coverage for liability arising from supplier or contractor failures that impact your operations.",
    phase: "all",
    typicalCoveragePercent: 50,
    typicalPremiumPercent: 0.3,
    isMandatory: false,
    tips: [
      "Covers you if supplier negligence causes third-party claims",
      "Important for complex supply chains",
      "Check flow-down of liability in supplier contracts",
      "Consider for launch service agreements",
    ],
    keyProviders: ["Specialty markets", "Lloyds syndicates"],
  },
  loss_of_revenue: {
    type: "loss_of_revenue",
    name: "Loss of Revenue / Business Interruption",
    label: "Loss of Revenue / Business Interruption",
    description:
      "Coverage for income loss if satellite cannot provide services due to covered damage.",
    phase: "in_orbit",
    typicalCoveragePercent: 0,
    typicalPremiumPercent: 2,
    isMandatory: false,
    applicableOrbitRegimes: ["GEO", "MEO"],
    tips: [
      "Critical for revenue-generating satellites",
      "Waiting periods typically 30-90 days",
      "Coverage period usually 12-24 months",
      "Most relevant for GEO telecom operators",
    ],
    keyProviders: ["AXA XL", "Munich Re", "Specialty markets"],
  },
  launch_plus_life: {
    type: "launch_plus_life",
    name: "Launch Plus Life",
    label: "Launch Plus Life",
    description:
      "Combined launch and in-orbit coverage for entire satellite lifetime, up to 15 years.",
    phase: "all",
    typicalCoveragePercent: 100,
    typicalPremiumPercent: 15,
    isMandatory: false,
    tips: [
      "Locks in coverage for satellite lifetime",
      "Protection against market price increases",
      "Requires thorough heritage/redundancy analysis",
      "Best for proven designs with long mission life",
    ],
    keyProviders: ["AXA XL", "Munich Re", "Allianz", "Major reinsurers"],
  },
};

// ═══════════════════════════════════════════════════════════════
// NATIONAL REQUIREMENTS LOOKUP
// ═══════════════════════════════════════════════════════════════

// Create a lookup object from the array
export const nationalRequirementsLookup: Record<
  JurisdictionCode,
  NationalInsuranceRequirement
> = nationalInsuranceRequirements.reduce(
  (acc, req) => {
    acc[req.jurisdictionCode] = req;
    return acc;
  },
  {} as Record<JurisdictionCode, NationalInsuranceRequirement>,
);

// ═══════════════════════════════════════════════════════════════
// CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate minimum TPL requirement based on profile
 */
export function calculateTPLRequirement(profile: InsuranceRiskProfile): {
  amount: number;
  currency: string;
  basis: string;
  explanation: string;
  notes: string[];
} {
  const req = nationalRequirementsLookup[profile.primaryJurisdiction];

  if (!req) {
    return {
      amount: 60_000_000,
      currency: "EUR",
      basis: "default",
      explanation:
        "Default EU requirement - jurisdiction-specific rules unknown",
      notes: ["Contact national authority for specific requirements"],
    };
  }

  let amount = req.minimumTPL || 60_000_000;
  const notes: string[] = [];

  // Check for size-based variations (e.g., Italy)
  if (req.tplVariableBySize && req.tplBySize) {
    const sizeAmount = req.tplBySize[profile.companySize];
    if (sizeAmount) {
      amount = sizeAmount;
      notes.push(`Coverage adjusted for ${profile.companySize} enterprises`);
    }
  }

  // Check for turnover-based formula (e.g., Germany)
  if (req.tplFormula?.includes("turnover") && profile.annualRevenueEur) {
    const calculatedAmount = Math.min(
      profile.annualRevenueEur * 0.1,
      50_000_000,
    );
    amount = calculatedAmount;
    notes.push(`Based on 10% of annual turnover`);
  }

  // Add state indemnification note
  if (req.governmentGuarantee) {
    notes.push(
      `${req.country} provides state indemnification above liability cap`,
    );
  }

  // Add registration requirement
  if (req.mustRegisterPolicy && req.registrationAuthority) {
    notes.push(`Policy must be registered with ${req.registrationAuthority}`);
  }

  const explanation =
    req.tplFormula ||
    (amount
      ? `Fixed minimum: €${amount.toLocaleString()}`
      : "Determined on case-by-case basis");

  return {
    amount,
    currency: "EUR",
    basis: req.tplVariableBySize
      ? "size_based"
      : req.tplVariableByRisk
        ? "risk_based"
        : "fixed",
    explanation,
    notes,
  };
}

/**
 * Determine which insurance types are required for a mission
 * Returns a simple array of required insurance types
 */
export function getRequiredInsuranceTypes(
  profile: InsuranceRiskProfile,
): InsuranceType[] {
  const required: InsuranceType[] = [];

  // TPL is always required
  required.push("third_party_liability");

  // Launch insurance for spacecraft operators
  if (
    profile.operatorType === "spacecraft" ||
    profile.operatorType === "launch"
  ) {
    required.push("launch");
  }

  // In-orbit for long missions or high value
  if (
    profile.missionDurationYears > 3 ||
    profile.totalMissionValueEur > 10_000_000
  ) {
    required.push("in_orbit");
  }

  // Pre-launch for high-value missions
  if (
    profile.satelliteValueEur > 5_000_000 ||
    profile.operatorType === "launch"
  ) {
    required.push("pre_launch");
  }

  return required;
}

/**
 * Get detailed insurance recommendations for a mission
 */
export function getInsuranceRecommendations(profile: InsuranceRiskProfile): {
  type: InsuranceType;
  requirement:
    | "mandatory"
    | "strongly_recommended"
    | "recommended"
    | "optional";
  rationale: string;
}[] {
  const results: {
    type: InsuranceType;
    requirement:
      | "mandatory"
      | "strongly_recommended"
      | "recommended"
      | "optional";
    rationale: string;
  }[] = [];

  // TPL is always mandatory
  results.push({
    type: "third_party_liability",
    requirement: "mandatory",
    rationale: "Required by national law in most EU jurisdictions",
  });

  // Launch insurance for operators using launch services
  if (
    profile.operatorType === "spacecraft" ||
    profile.operatorType === "launch"
  ) {
    results.push({
      type: "launch",
      requirement:
        profile.totalMissionValueEur > 10_000_000
          ? "strongly_recommended"
          : "recommended",
      rationale: profile.hasFlightHeritage
        ? "Recommended to protect satellite investment during high-risk launch phase"
        : "Strongly recommended for unproven satellite designs",
    });
  }

  // Pre-launch for high-value missions
  if (profile.satelliteValueEur > 5_000_000) {
    results.push({
      type: "pre_launch",
      requirement: "recommended",
      rationale: "High satellite value warrants pre-launch coverage",
    });
  }

  // In-orbit for long missions
  if (profile.missionDurationYears > 3) {
    results.push({
      type: "in_orbit",
      requirement:
        profile.orbitRegime === "LEO" && !profile.hasManeuverability
          ? "strongly_recommended"
          : "recommended",
      rationale:
        profile.orbitRegime === "LEO"
          ? "LEO debris environment increasing collision risk"
          : "Long mission duration warrants in-orbit protection",
    });
  }

  // Loss of revenue for GEO telecom
  if (profile.orbitRegime === "GEO") {
    results.push({
      type: "loss_of_revenue",
      requirement: "recommended",
      rationale: "GEO operators typically have significant revenue exposure",
    });
  }

  // Contingent liability for complex supply chains
  if (profile.isConstellationOperator || profile.satelliteCount > 5) {
    results.push({
      type: "contingent_liability",
      requirement: "optional",
      rationale:
        "Consider for complex supply chains and constellation operations",
    });
  }

  // Launch plus life for proven, long-duration missions
  if (profile.hasFlightHeritage && profile.missionDurationYears > 10) {
    results.push({
      type: "launch_plus_life",
      requirement: "optional",
      rationale: "Consider for cost certainty over satellite lifetime",
    });
  }

  return results;
}

/**
 * Calculate mission risk level for insurance purposes
 */
export function calculateMissionRiskLevel(
  profile: InsuranceRiskProfile,
): MissionRiskLevel {
  let riskScore = 0;

  // Orbit regime risk
  if (profile.orbitRegime === "LEO") riskScore += 2;
  if (profile.orbitRegime === "GEO") riskScore += 1;
  if (
    profile.orbitRegime === "cislunar" ||
    profile.orbitRegime === "deep_space"
  )
    riskScore += 4;

  // Constellation risk
  if (profile.isConstellationOperator) riskScore += 2;
  if (profile.satelliteCount > 100) riskScore += 2;

  // Maneuverability
  if (!profile.hasManeuverability) riskScore += 2;

  // Heritage
  if (!profile.hasFlightHeritage) riskScore += 3;

  // Hazardous materials
  if (profile.hasHazardousMaterials) riskScore += 3;

  // ADR operations (high risk)
  if (profile.hasADR) riskScore += 2;

  // Cross-border operations
  if (profile.crossBorderOps) riskScore += 1;

  if (riskScore <= 3) return "low";
  if (riskScore <= 6) return "medium";
  if (riskScore <= 10) return "high";
  return "very_high";
}

/**
 * Estimate premium ranges for all required insurance types
 */
export function estimatePremiumRange(
  profile: InsuranceRiskProfile,
  requiredTypes: InsuranceType[],
): {
  total: { min: number; max: number };
  breakdown: Record<string, { min: number; max: number }>;
} {
  const riskLevel = calculateMissionRiskLevel(profile);
  const breakdown: Record<string, { min: number; max: number }> = {};
  let totalMin = 0;
  let totalMax = 0;

  // Risk multiplier based on risk level
  let riskMultiplier = 1;
  switch (riskLevel) {
    case "low":
      riskMultiplier = 0.8;
      break;
    case "medium":
      riskMultiplier = 1;
      break;
    case "high":
      riskMultiplier = 1.3;
      break;
    case "very_high":
      riskMultiplier = 1.6;
      break;
  }

  for (const type of requiredTypes) {
    const typeDef = insuranceTypeDefinitions[type];
    if (!typeDef) continue;

    let coverageAmount: number;
    let basePremiumPercent = typeDef.typicalPremiumPercent;

    // Determine coverage amount
    switch (type) {
      case "third_party_liability":
        coverageAmount = calculateTPLRequirement(profile).amount;
        break;
      case "launch":
      case "in_orbit":
      case "pre_launch":
        coverageAmount =
          profile.totalMissionValueEur ||
          profile.satelliteValueEur * profile.satelliteCount;
        break;
      default:
        coverageAmount =
          profile.satelliteValueEur * profile.satelliteCount * 0.5;
    }

    // Apply risk multiplier
    basePremiumPercent *= riskMultiplier;

    // Launch vehicle heritage adjustment
    if (type === "launch" && !profile.hasFlightHeritage) {
      basePremiumPercent *= 1.5;
    }

    // LEO debris environment
    if (type === "in_orbit" && profile.orbitRegime === "LEO") {
      basePremiumPercent *= 1.2;
    }

    // Constellation discount for volume
    if (profile.isConstellationOperator && profile.satelliteCount > 10) {
      basePremiumPercent *= 0.9;
    }

    const min = Math.round(coverageAmount * (basePremiumPercent / 100) * 0.8);
    const max = Math.round(coverageAmount * (basePremiumPercent / 100) * 1.2);

    breakdown[type] = { min, max };
    totalMin += min;
    totalMax += max;
  }

  return {
    total: { min: totalMin, max: totalMax },
    breakdown,
  };
}

/**
 * Estimate premium for a single insurance type
 */
export function estimateSinglePremium(
  type: InsuranceType,
  coverageEur: number,
  profile: InsuranceRiskProfile,
): {
  lowEstimateEur: number;
  highEstimateEur: number;
  factors: string[];
} {
  const typeDef = insuranceTypeDefinitions[type];
  if (!typeDef) {
    return { lowEstimateEur: 0, highEstimateEur: 0, factors: [] };
  }

  let basePremiumPercent = typeDef.typicalPremiumPercent;
  const factors: string[] = [];

  // Adjust for risk factors
  const riskLevel = calculateMissionRiskLevel(profile);

  switch (riskLevel) {
    case "low":
      basePremiumPercent *= 0.8;
      factors.push("Low risk profile (-20%)");
      break;
    case "high":
      basePremiumPercent *= 1.3;
      factors.push("High risk profile (+30%)");
      break;
    case "very_high":
      basePremiumPercent *= 1.6;
      factors.push("Very high risk profile (+60%)");
      break;
    default:
      factors.push("Standard risk profile");
  }

  // Launch vehicle heritage adjustment
  if (type === "launch" && !profile.hasFlightHeritage) {
    basePremiumPercent *= 1.5;
    factors.push("Unproven design (+50%)");
  }

  // LEO debris environment
  if (type === "in_orbit" && profile.orbitRegime === "LEO") {
    basePremiumPercent *= 1.2;
    factors.push("LEO debris environment (+20%)");
  }

  // Constellation discount for volume
  if (profile.isConstellationOperator && profile.satelliteCount > 10) {
    basePremiumPercent *= 0.9;
    factors.push("Fleet volume discount (-10%)");
  }

  const lowEstimateEur = Math.round(
    coverageEur * (basePremiumPercent / 100) * 0.8,
  );
  const highEstimateEur = Math.round(
    coverageEur * (basePremiumPercent / 100) * 1.2,
  );

  return { lowEstimateEur, highEstimateEur, factors };
}

/**
 * Calculate overall compliance score for insurance based on required types and their statuses
 */
export function calculateInsuranceComplianceScore(
  requiredTypes: InsuranceType[],
  statusMap: Record<string, PolicyStatus>,
): number {
  if (requiredTypes.length === 0) return 100;

  let score = 0;
  let maxScore = requiredTypes.length * 100;

  for (const type of requiredTypes) {
    const status = statusMap[type] || "not_started";

    switch (status) {
      case "active":
      case "bound":
        score += 100;
        break;
      case "under_review":
        score += 60;
        break;
      case "quote_received":
        score += 40;
        break;
      case "quote_requested":
        score += 20;
        break;
      case "expiring_soon":
        score += 80; // Still active but needs attention
        break;
      case "not_required":
        // Doesn't count toward score
        maxScore -= 100;
        break;
      case "expired":
      case "not_started":
      default:
        score += 0;
        break;
    }
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
}

/**
 * Get detailed compliance analysis for insurance
 */
export function getInsuranceComplianceAnalysis(
  profile: InsuranceRiskProfile,
  policies: InsurancePolicy[],
): {
  score: number;
  gaps: string[];
  warnings: string[];
  compliant: string[];
} {
  const gaps: string[] = [];
  const warnings: string[] = [];
  const compliant: string[] = [];
  let score = 0;
  let maxScore = 0;

  // Check TPL compliance
  const tplRequirement = calculateTPLRequirement(profile);

  const tplPolicy = policies.find(
    (p) => p.type === "third_party_liability" && p.status === "active",
  );
  maxScore += 40; // TPL is worth 40 points

  if (tplPolicy) {
    if (tplPolicy.coverageAmountEur >= tplRequirement.amount) {
      score += 40;
      compliant.push(
        `TPL coverage (€${tplPolicy.coverageAmountEur.toLocaleString()}) meets requirement (€${tplRequirement.amount.toLocaleString()})`,
      );
    } else {
      score += 20;
      gaps.push(
        `TPL coverage (€${tplPolicy.coverageAmountEur.toLocaleString()}) below requirement (€${tplRequirement.amount.toLocaleString()})`,
      );
    }
  } else {
    gaps.push("No active Third-Party Liability insurance");
  }

  // Check required insurance types
  const recommendations = getInsuranceRecommendations(profile);

  for (const req of recommendations) {
    if (req.type === "third_party_liability") continue; // Already checked

    const policy = policies.find(
      (p) =>
        p.type === req.type && (p.status === "active" || p.status === "bound"),
    );
    const points =
      req.requirement === "mandatory"
        ? 20
        : req.requirement === "strongly_recommended"
          ? 15
          : 10;
    maxScore += points;

    if (policy) {
      score += points;
      compliant.push(
        `${insuranceTypeDefinitions[req.type]?.label} coverage in place`,
      );
    } else if (req.requirement === "mandatory") {
      gaps.push(
        `Missing mandatory ${insuranceTypeDefinitions[req.type]?.label}`,
      );
    } else if (req.requirement === "strongly_recommended") {
      warnings.push(
        `No ${insuranceTypeDefinitions[req.type]?.label} (strongly recommended)`,
      );
    }
  }

  // Check for expiring policies
  const expiringPolicies = policies.filter((p) => {
    if (!p.expirationDate || p.status === "expired") return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(p.expirationDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
  });

  for (const policy of expiringPolicies) {
    const typeDef = insuranceTypeDefinitions[policy.type as InsuranceType];
    const daysUntilExpiry = Math.ceil(
      (new Date(policy.expirationDate!).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    warnings.push(
      `${typeDef?.label} policy expiring in ${daysUntilExpiry} days`,
    );
  }

  return {
    score: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    gaps,
    warnings,
    compliant,
  };
}

// ═══════════════════════════════════════════════════════════════
// UI CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const policyStatusConfig: Record<
  PolicyStatus,
  { label: string; color: string; icon: string }
> = {
  not_started: { label: "Not Started", color: "gray", icon: "Circle" },
  quote_requested: { label: "Quote Requested", color: "blue", icon: "Send" },
  quote_received: {
    label: "Quote Received",
    color: "purple",
    icon: "FileText",
  },
  under_review: { label: "Under Review", color: "yellow", icon: "Eye" },
  bound: { label: "Bound", color: "green", icon: "CheckCircle2" },
  active: { label: "Active", color: "green", icon: "Shield" },
  expiring_soon: {
    label: "Expiring Soon",
    color: "orange",
    icon: "AlertTriangle",
  },
  expired: { label: "Expired", color: "red", icon: "XCircle" },
  not_required: { label: "Not Required", color: "slate", icon: "Minus" },
};

export const riskLevelConfig: Record<
  MissionRiskLevel,
  { label: string; color: string; description: string }
> = {
  low: {
    label: "Low Risk",
    color: "green",
    description: "Proven technology, favorable orbit, strong heritage",
  },
  medium: {
    label: "Medium Risk",
    color: "blue",
    description: "Typical commercial mission profile",
  },
  high: {
    label: "High Risk",
    color: "orange",
    description: "Some risk factors present",
  },
  very_high: {
    label: "Very High Risk",
    color: "red",
    description: "Multiple risk factors or unproven technology",
  },
};

export const insuranceTypeIcons: Record<InsuranceType, string> = {
  pre_launch: "Package",
  launch: "Rocket",
  in_orbit: "Satellite",
  third_party_liability: "Shield",
  contingent_liability: "Link",
  loss_of_revenue: "TrendingDown",
  launch_plus_life: "Infinity",
};

export const companySizeConfig: Record<
  CompanySize,
  { label: string; description: string }
> = {
  micro: {
    label: "Micro Enterprise",
    description: "<10 employees, <€2M revenue",
  },
  small: {
    label: "Small Enterprise",
    description: "<50 employees, <€10M revenue",
  },
  medium: {
    label: "Medium Enterprise",
    description: "<250 employees, <€50M revenue",
  },
  large: {
    label: "Large Enterprise",
    description: "≥250 employees or ≥€50M revenue",
  },
};

export const orbitRegimeConfig: Record<
  OrbitRegime,
  { label: string; altitudeRange: string }
> = {
  LEO: { label: "Low Earth Orbit", altitudeRange: "200-2,000 km" },
  MEO: { label: "Medium Earth Orbit", altitudeRange: "2,000-35,786 km" },
  GEO: { label: "Geostationary Orbit", altitudeRange: "35,786 km" },
  HEO: { label: "Highly Elliptical Orbit", altitudeRange: "Variable" },
  cislunar: { label: "Cislunar Space", altitudeRange: "Earth-Moon system" },
  deep_space: { label: "Deep Space", altitudeRange: "Beyond Moon" },
};

export const operatorTypeConfig: Record<
  OperatorType,
  { label: string; description: string }
> = {
  spacecraft: {
    label: "Spacecraft Operator",
    description: "Operates satellites in orbit",
  },
  launch: {
    label: "Launch Service Provider",
    description: "Provides launch services",
  },
  launch_site: {
    label: "Launch Site Operator",
    description: "Operates launch facilities",
  },
};

// Launch providers for reference
export const commonLaunchProviders = [
  "SpaceX",
  "Arianespace",
  "Rocket Lab",
  "ISRO/NSIL",
  "ULA",
  "Relativity Space",
  "Firefly",
  "Isar Aerospace",
  "PLD Space",
  "RFA",
  "Orbex",
  "Virgin Orbit",
  "Other",
];

// Common insurers for reference
export const commonInsurers = [
  "AXA XL",
  "Allianz",
  "Munich Re",
  "Swiss Re",
  "Lloyds of London",
  "Global Aerospace",
  "Starr Insurance",
  "Arch Insurance",
  "Assure Space",
  "Other",
];
