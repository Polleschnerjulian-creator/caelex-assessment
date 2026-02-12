/**
 * Spectrum Management & ITU Compliance Requirements Data
 *
 * This module covers:
 * - ITU Radio Regulations (RR) for satellite communications
 * - ITU Frequency Filing Process (API, CR/C, Notification, Recording)
 * - ITU-R Recommendations for satellite services
 * - Multi-jurisdiction spectrum licensing (FCC, Ofcom, BNetzA, CEPT)
 * - WRC (World Radiocommunication Conference) Decisions
 * - Frequency bands and service types
 *
 * Sources:
 * - ITU Radio Regulations (2020 Edition)
 * - ITU-R Recommendations (S Series - Satellite)
 * - FCC 47 CFR Part 25
 * - Ofcom Space Spectrum Strategy
 * - BNetzA Frequenzplan
 * - CEPT/ECC Decisions
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SpectrumSource =
  | "ITU"
  | "FCC"
  | "OFCOM"
  | "BNETZA"
  | "CEPT"
  | "WRC";

export type RequirementCategory =
  | "filing"
  | "coordination"
  | "licensing"
  | "interference"
  | "technical"
  | "environmental";

export type ServiceType =
  | "FSS" // Fixed-Satellite Service
  | "MSS" // Mobile-Satellite Service
  | "BSS" // Broadcasting-Satellite Service
  | "EESS" // Earth Exploration-Satellite Service
  | "SRS" // Space Research Service
  | "RNS" // Radionavigation-Satellite Service
  | "AMSS" // Aeronautical Mobile-Satellite Service
  | "MMSS" // Maritime Mobile-Satellite Service
  | "ISL"; // Inter-Satellite Links

export type FrequencyBand =
  | "L" // 1-2 GHz
  | "S" // 2-4 GHz
  | "C" // 4-8 GHz
  | "X" // 8-12 GHz
  | "Ku" // 12-18 GHz
  | "Ka" // 26.5-40 GHz
  | "V" // 40-75 GHz
  | "Q" // 33-50 GHz
  | "W" // 75-110 GHz
  | "O" // Optical (experimental)
  | "UHF" // 300 MHz - 1 GHz
  | "VHF"; // 30-300 MHz

export type OrbitType =
  | "GEO" // Geostationary
  | "NGSO" // Non-Geostationary (LEO/MEO/HEO)
  | "LEO" // Low Earth Orbit
  | "MEO" // Medium Earth Orbit
  | "HEO"; // Highly Elliptical Orbit

export type FilingPhase =
  | "API" // Advance Publication Information
  | "CR_C" // Coordination Request / Coordination
  | "NOTIFICATION" // Notification for Recording
  | "RECORDING"; // Recording in MIFR

export type FilingStatus =
  | "not_started"
  | "in_preparation"
  | "submitted"
  | "under_review"
  | "coordination_ongoing"
  | "favorable"
  | "unfavorable"
  | "recorded"
  | "expired";

export type CoordinationStatus =
  | "not_required"
  | "pending"
  | "in_progress"
  | "completed"
  | "disputed";

export type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

export type RiskLevel = "critical" | "high" | "medium" | "low";

// ============================================================================
// INTERFACES
// ============================================================================

export interface FrequencyBandInfo {
  band: FrequencyBand;
  name: string;
  rangeGHz: { min: number; max: number };
  primaryServices: ServiceType[];
  typicalUses: string[];
  geoAllocation: boolean;
  ngsoAllocation: boolean;
  coordinationRequired: boolean;
  ituRegion: (1 | 2 | 3)[];
  keyRestrictions: string[];
}

export interface SpectrumRequirement {
  id: string;
  title: string;
  description: string;
  source: SpectrumSource;
  category: RequirementCategory;
  frequencyBands: FrequencyBand[];
  serviceTypes: ServiceType[];
  orbitTypes: OrbitType[];
  riskLevel: RiskLevel;
  isMandatory: boolean;
  reference: string; // Article/Section number
  complianceActions: string[];
  documentationRequired: string[];
  deadlines?: string;
  relatedRequirements?: string[];
  euSpaceActRef?: string;
}

export interface ITUFilingRequirement {
  phase: FilingPhase;
  name: string;
  description: string;
  timelineMonths: {
    beforeLaunch: number;
    processingTime: number;
    validityPeriod?: number;
  };
  requiredDocuments: string[];
  fees: {
    baseFee: number;
    perFrequency?: number;
    currency: string;
  };
  ruleReference: string;
  coordinationRequired: boolean;
  publicationRequired: boolean;
}

export interface JurisdictionLicense {
  jurisdiction: SpectrumSource;
  licenseName: string;
  description: string;
  applicableTo: ServiceType[];
  frequencyBands: FrequencyBand[];
  processingTimeDays: number;
  validityYears: number;
  renewalRequired: boolean;
  requirements: string[];
  fees: {
    application: number;
    annual?: number;
    currency: string;
  };
  contactAuthority: string;
}

export interface WRCDecision {
  id: string;
  conference: string; // e.g., "WRC-23"
  agendaItem: string;
  title: string;
  description: string;
  impactedBands: FrequencyBand[];
  impactedServices: ServiceType[];
  effectiveDate: string;
  implications: string[];
  actionRequired: string[];
}

export interface SpectrumProfile {
  serviceTypes: ServiceType[];
  frequencyBands: FrequencyBand[];
  orbitType: OrbitType;
  numberOfSatellites: number;
  isConstellation: boolean;
  primaryJurisdiction: SpectrumSource;
  additionalJurisdictions: SpectrumSource[];
  hasExistingFilings: boolean;
  targetLaunchDate?: Date;
  uplinkBands: FrequencyBand[];
  downlinkBands: FrequencyBand[];
  intersatelliteLinks: boolean;
  gsoProximity?: number; // km from GEO arc (for NGSO)
}

export interface FilingTimeline {
  phase: FilingPhase;
  startDate: Date;
  deadline: Date;
  status: FilingStatus;
  submittedDate?: Date;
  completedDate?: Date;
  notes?: string;
}

export interface SpectrumAssessmentResult {
  profile: SpectrumProfile;
  applicableRequirements: SpectrumRequirement[];
  filingTimeline: FilingTimeline[];
  requiredLicenses: JurisdictionLicense[];
  coordinationStatus: {
    ituCoordination: CoordinationStatus;
    bilateralCoordination: { country: string; status: CoordinationStatus }[];
  };
  complianceScore: {
    overall: number;
    bySource: Record<SpectrumSource, number>;
    byCategory: Partial<Record<RequirementCategory, number>>;
  };
  gapAnalysis: SpectrumGap[];
  recommendations: SpectrumRecommendation[];
  wrcImpacts: WRCDecision[];
}

export interface SpectrumGap {
  requirementId: string;
  requirement: string;
  gap: string;
  source: SpectrumSource;
  riskLevel: RiskLevel;
  recommendation: string;
  estimatedEffort: "days" | "weeks" | "months" | "years";
  deadline?: Date;
}

export interface SpectrumRecommendation {
  priority: number;
  title: string;
  description: string;
  category: "filing" | "licensing" | "coordination" | "technical" | "planning";
  timeframe: string;
  resources?: string[];
}

// ============================================================================
// FREQUENCY BAND DEFINITIONS
// ============================================================================

export const frequencyBands: FrequencyBandInfo[] = [
  {
    band: "L",
    name: "L-Band",
    rangeGHz: { min: 1.0, max: 2.0 },
    primaryServices: ["MSS", "RNS", "AMSS", "MMSS"],
    typicalUses: [
      "Mobile satellite communications",
      "Maritime communications (Inmarsat)",
      "Aeronautical communications",
      "GPS/GNSS signals",
      "Satellite phone services",
    ],
    geoAllocation: true,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Heavy coordination with terrestrial mobile",
      "GNSS protection requirements",
      "Limited bandwidth availability",
    ],
  },
  {
    band: "S",
    name: "S-Band",
    rangeGHz: { min: 2.0, max: 4.0 },
    primaryServices: ["MSS", "BSS", "SRS", "EESS"],
    typicalUses: [
      "Mobile satellite services",
      "Weather satellites (downlink)",
      "Space research",
      "ISS communications",
      "Satellite radio (XM/Sirius)",
    ],
    geoAllocation: true,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Shared with radar systems",
      "IMT (5G) expansion pressures",
      "Regional variations in allocation",
    ],
  },
  {
    band: "C",
    name: "C-Band",
    rangeGHz: { min: 4.0, max: 8.0 },
    primaryServices: ["FSS"],
    typicalUses: [
      "Traditional satellite TV distribution",
      "Broadcast backhaul",
      "Telecommunication trunking",
      "VSAT services",
      "Government/military",
    ],
    geoAllocation: true,
    ngsoAllocation: false,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "5G reallocation (3.4-3.8 GHz)",
      "Large antenna requirements",
      "Terrestrial interference issues",
      "Declining availability in some regions",
    ],
  },
  {
    band: "X",
    name: "X-Band",
    rangeGHz: { min: 8.0, max: 12.0 },
    primaryServices: ["FSS", "EESS", "SRS"],
    typicalUses: [
      "Military satellite communications",
      "Government applications",
      "Earth observation data downlink",
      "Deep space communications",
      "Radar applications",
    ],
    geoAllocation: true,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Primarily government/military",
      "Limited commercial availability",
      "Security clearance may be required",
    ],
  },
  {
    band: "Ku",
    name: "Ku-Band",
    rangeGHz: { min: 12.0, max: 18.0 },
    primaryServices: ["FSS", "BSS"],
    typicalUses: [
      "Direct-to-Home (DTH) TV",
      "VSAT networks",
      "Maritime broadband",
      "Aeronautical connectivity",
      "News gathering (SNG)",
      "Enterprise networks",
    ],
    geoAllocation: true,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Rain fade susceptibility",
      "Congested orbital arc",
      "BSS/FSS band plan complexity",
      "NGSO-GSO coordination requirements",
    ],
  },
  {
    band: "Ka",
    name: "Ka-Band",
    rangeGHz: { min: 26.5, max: 40.0 },
    primaryServices: ["FSS", "MSS", "BSS", "ISL"],
    typicalUses: [
      "High-throughput satellites (HTS)",
      "Broadband internet (Starlink, OneWeb)",
      "Military wideband",
      "Inter-satellite links",
      "5G backhaul",
      "Next-gen VSAT",
    ],
    geoAllocation: true,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Severe rain fade",
      "Requires adaptive coding",
      "Complex NGSO-GSO sharing",
      "EPFD limits for NGSO",
    ],
  },
  {
    band: "V",
    name: "V-Band",
    rangeGHz: { min: 40.0, max: 75.0 },
    primaryServices: ["FSS", "ISL"],
    typicalUses: [
      "Future ultra-high capacity",
      "Inter-satellite links",
      "Experimental services",
      "Next-generation HTS",
    ],
    geoAllocation: true,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Atmospheric absorption",
      "Limited ground infrastructure",
      "Experimental/emerging",
      "Technology maturity challenges",
    ],
  },
  {
    band: "Q",
    name: "Q-Band",
    rangeGHz: { min: 33.0, max: 50.0 },
    primaryServices: ["FSS", "SRS"],
    typicalUses: [
      "Feeder links for HTS",
      "Gateway connectivity",
      "Space research",
      "High-capacity backhaul",
    ],
    geoAllocation: true,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Atmospheric effects",
      "Limited deployed systems",
      "High equipment costs",
    ],
  },
  {
    band: "UHF",
    name: "UHF Band",
    rangeGHz: { min: 0.3, max: 1.0 },
    primaryServices: ["MSS", "AMSS", "MMSS"],
    typicalUses: [
      "Military tactical satellites",
      "Search and rescue (COSPAS-SARSAT)",
      "Low-data-rate IoT",
      "AIS maritime tracking",
      "ARGOS data collection",
    ],
    geoAllocation: true,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Severely congested",
      "Terrestrial interference",
      "Limited bandwidth",
      "Military priority",
    ],
  },
  {
    band: "VHF",
    name: "VHF Band",
    rangeGHz: { min: 0.03, max: 0.3 },
    primaryServices: ["MSS"],
    typicalUses: [
      "Legacy satellite systems",
      "Orbcomm-type messaging",
      "AIS relay",
      "ADS-B relay",
    ],
    geoAllocation: false,
    ngsoAllocation: true,
    coordinationRequired: true,
    ituRegion: [1, 2, 3],
    keyRestrictions: [
      "Very limited allocations",
      "Ionospheric effects",
      "Legacy systems only",
    ],
  },
];

// ============================================================================
// ITU FILING PROCESS
// ============================================================================

export const ituFilingPhases: ITUFilingRequirement[] = [
  {
    phase: "API",
    name: "Advance Publication Information",
    description:
      "Initial filing to inform other administrations of planned satellite network. " +
      "Required minimum 2 years (GEO FSS) to 7 years (GEO BSS) before bringing into use. " +
      "Triggers coordination rights and starts regulatory clock.",
    timelineMonths: {
      beforeLaunch: 84, // 7 years for GEO, less for NGSO
      processingTime: 6,
      validityPeriod: undefined, // Until superseded
    },
    requiredDocuments: [
      "ITU API submission form (Appendix 4)",
      "Orbital characteristics",
      "Frequency assignments (preliminary)",
      "Coverage area description",
      "Technical characteristics",
    ],
    fees: {
      baseFee: 18790, // CHF
      perFrequency: 94,
      currency: "CHF",
    },
    ruleReference: "RR Article 9.1, Appendix 4",
    coordinationRequired: false,
    publicationRequired: true,
  },
  {
    phase: "CR_C",
    name: "Coordination Request / Coordination",
    description:
      "Request for coordination with affected administrations. " +
      "Must be submitted 2-5 years before bringing into use depending on service. " +
      "Bilateral/multilateral coordination with potentially affected networks.",
    timelineMonths: {
      beforeLaunch: 60, // 5 years typical
      processingTime: 4,
      validityPeriod: undefined,
    },
    requiredDocuments: [
      "Coordination request form (Appendix 4)",
      "Detailed technical parameters",
      "Interference analysis",
      "Coordination contour/arc",
      "Affected network identification",
    ],
    fees: {
      baseFee: 28180, // CHF
      perFrequency: 141,
      currency: "CHF",
    },
    ruleReference: "RR Article 9.7, Appendix 4",
    coordinationRequired: true,
    publicationRequired: true,
  },
  {
    phase: "NOTIFICATION",
    name: "Notification for Recording",
    description:
      "Formal notification to ITU for recording in Master International Frequency Register (MIFR). " +
      "Submitted after successful coordination or when coordination period expires.",
    timelineMonths: {
      beforeLaunch: 24, // Can be 0-24 months before or after
      processingTime: 4,
      validityPeriod: undefined,
    },
    requiredDocuments: [
      "Notification form (Appendix 4)",
      "Final technical characteristics",
      "Coordination agreements/outcomes",
      "Bringing-into-use plan",
      "Due diligence information",
    ],
    fees: {
      baseFee: 28180, // CHF
      perFrequency: 141,
      currency: "CHF",
    },
    ruleReference: "RR Article 11, Appendix 4",
    coordinationRequired: false,
    publicationRequired: true,
  },
  {
    phase: "RECORDING",
    name: "Recording in MIFR",
    description:
      "Final recording in Master International Frequency Register. " +
      "Provides international recognition and protection. " +
      "Must bring into use within regulatory deadline to maintain rights.",
    timelineMonths: {
      beforeLaunch: 0, // After launch/BIU
      processingTime: 3,
      validityPeriod: undefined, // Until network decommissioned
    },
    requiredDocuments: [
      "Bringing-into-use confirmation",
      "Satellite launch/operation confirmation",
      "Final technical parameters",
      "Updated coordination status",
    ],
    fees: {
      baseFee: 0, // Included in notification
      currency: "CHF",
    },
    ruleReference: "RR Article 11",
    coordinationRequired: false,
    publicationRequired: false,
  },
];

// ============================================================================
// JURISDICTION LICENSES
// ============================================================================

export const jurisdictionLicenses: JurisdictionLicense[] = [
  // ITU (International)
  {
    jurisdiction: "ITU",
    licenseName: "Master International Frequency Register (MIFR) Recording",
    description:
      "International frequency registration providing recognition and interference protection " +
      "under the ITU Radio Regulations. Administered through national administrations.",
    applicableTo: ["FSS", "MSS", "BSS", "EESS", "SRS", "RNS"],
    frequencyBands: ["L", "S", "C", "X", "Ku", "Ka", "V", "Q"],
    processingTimeDays: 730, // ~2 years for full process
    validityYears: 0, // Until decommissioning
    renewalRequired: false,
    requirements: [
      "Complete API-CR/C-Notification process",
      "Coordination agreements with affected administrations",
      "Bringing-into-use within regulatory deadline",
      "Compliance with EPFD limits (NGSO)",
      "Due diligence demonstration",
    ],
    fees: {
      application: 75000, // Approximate total CHF
      currency: "CHF",
    },
    contactAuthority: "ITU Radiocommunication Bureau (BR)",
  },

  // FCC (United States)
  {
    jurisdiction: "FCC",
    licenseName: "FCC Part 25 Space Station License",
    description:
      "Authorization to operate a satellite system using U.S. spectrum allocations. " +
      "Required for U.S. market access and U.S.-licensed satellites.",
    applicableTo: ["FSS", "MSS", "BSS"],
    frequencyBands: ["L", "S", "C", "Ku", "Ka", "V"],
    processingTimeDays: 365, // 12-18 months typical
    validityYears: 15,
    renewalRequired: true,
    requirements: [
      "Complete FCC Form 312",
      "Technical showing (Schedule S)",
      "Legal/financial qualifications",
      "ITU coordination status",
      "Orbital debris mitigation plan",
      "Bond requirement for large systems",
    ],
    fees: {
      application: 502450, // $502,450 for GEO
      annual: 125000, // Regulatory fees vary
      currency: "USD",
    },
    contactAuthority: "FCC International Bureau, Satellite Division",
  },
  {
    jurisdiction: "FCC",
    licenseName: "FCC Market Access (Non-U.S. Licensed)",
    description:
      "Authorization for non-U.S. licensed satellites to serve the U.S. market. " +
      "Requires ITU coordination and home country license.",
    applicableTo: ["FSS", "MSS", "BSS"],
    frequencyBands: ["C", "Ku", "Ka"],
    processingTimeDays: 180, // 6 months typical
    validityYears: 15,
    renewalRequired: true,
    requirements: [
      "Home country license demonstration",
      "ITU filing status",
      "Technical compatibility showing",
      "Legal/financial qualifications",
    ],
    fees: {
      application: 115910,
      currency: "USD",
    },
    contactAuthority: "FCC International Bureau, Satellite Division",
  },

  // Ofcom (United Kingdom)
  {
    jurisdiction: "OFCOM",
    licenseName: "Ofcom Satellite (Spacecraft) Licence",
    description:
      "UK authorization to operate satellite radio equipment. Required for UK-licensed " +
      "satellites and UK spectrum access.",
    applicableTo: ["FSS", "MSS", "BSS", "EESS"],
    frequencyBands: ["L", "S", "C", "Ku", "Ka"],
    processingTimeDays: 120, // 4 months typical
    validityYears: 20,
    renewalRequired: true,
    requirements: [
      "Application form OfW597",
      "Technical parameters",
      "ITU coordination status",
      "UK Space Agency license (if UK operator)",
      "Financial standing demonstration",
    ],
    fees: {
      application: 5000, // GBP, varies by complexity
      annual: 2500,
      currency: "GBP",
    },
    contactAuthority: "Ofcom Spectrum Licensing",
  },
  {
    jurisdiction: "OFCOM",
    licenseName: "Ofcom Earth Station Licence",
    description:
      "UK authorization to operate satellite earth station equipment. Required for " +
      "ground segment operating in UK.",
    applicableTo: ["FSS", "MSS", "BSS"],
    frequencyBands: ["C", "Ku", "Ka"],
    processingTimeDays: 60,
    validityYears: 20,
    renewalRequired: true,
    requirements: [
      "Application form",
      "Site information",
      "Technical parameters",
      "Coordination with existing users",
    ],
    fees: {
      application: 500,
      annual: 250,
      currency: "GBP",
    },
    contactAuthority: "Ofcom Spectrum Licensing",
  },

  // BNetzA (Germany)
  {
    jurisdiction: "BNETZA",
    licenseName: "Frequenzzuteilung (Frequency Assignment)",
    description:
      "German frequency assignment for satellite services. Required for satellites " +
      "licensed through Germany or operating German ground stations.",
    applicableTo: ["FSS", "MSS", "BSS", "EESS"],
    frequencyBands: ["L", "S", "C", "Ku", "Ka"],
    processingTimeDays: 90,
    validityYears: 10,
    renewalRequired: true,
    requirements: [
      "Formal application (Antrag auf Frequenzzuteilung)",
      "Technical documentation",
      "ITU coordination status",
      "Proof of financial capability",
      "German space law compliance (if applicable)",
    ],
    fees: {
      application: 3000, // EUR, varies
      annual: 1500,
      currency: "EUR",
    },
    contactAuthority: "Bundesnetzagentur, Referat 226",
  },
  {
    jurisdiction: "BNETZA",
    licenseName: "Satellite Earth Station License",
    description: "German authorization for satellite earth station operation.",
    applicableTo: ["FSS", "MSS"],
    frequencyBands: ["C", "Ku", "Ka"],
    processingTimeDays: 60,
    validityYears: 10,
    renewalRequired: true,
    requirements: [
      "Application form",
      "Site coordinates and technical parameters",
      "Interference analysis",
      "Coordination with adjacent services",
    ],
    fees: {
      application: 500,
      annual: 200,
      currency: "EUR",
    },
    contactAuthority: "Bundesnetzagentur, Referat 226",
  },
];

// ============================================================================
// WRC DECISIONS
// ============================================================================

export const wrcDecisions: WRCDecision[] = [
  {
    id: "WRC23-1",
    conference: "WRC-23",
    agendaItem: "1.2",
    title: "IMT Identification in 6 GHz Band",
    description:
      "Identification of 6425-7125 MHz for IMT in Region 1. Requires careful coordination " +
      "with existing FSS and fixed service operations.",
    impactedBands: ["C"],
    impactedServices: ["FSS"],
    effectiveDate: "2024-01-01",
    implications: [
      "Potential interference from terrestrial 5G/6G",
      "Need to protect existing satellite services",
      "Regional variations in implementation",
      "Transition period for existing systems",
    ],
    actionRequired: [
      "Assess impact on C-band operations in Region 1",
      "Coordinate with national regulators",
      "Plan for potential band migration",
      "Monitor national implementation",
    ],
  },
  {
    id: "WRC23-2",
    conference: "WRC-23",
    agendaItem: "1.17",
    title: "NGSO FSS in Ka-band (17.7-18.6 GHz)",
    description:
      "Developed regulatory framework for NGSO FSS systems sharing with GSO networks " +
      "in the 17.7-18.6 GHz band.",
    impactedBands: ["Ka"],
    impactedServices: ["FSS"],
    effectiveDate: "2024-01-01",
    implications: [
      "New EPFD limits for NGSO systems",
      "Enhanced GSO protection requirements",
      "Coordination procedures clarified",
      "Milestone-based authorization approach",
    ],
    actionRequired: [
      "Verify compliance with new EPFD limits",
      "Update coordination strategy",
      "Review milestone commitments",
      "Assess system design implications",
    ],
  },
  {
    id: "WRC19-1",
    conference: "WRC-19",
    agendaItem: "1.6",
    title: "NGSO FSS Protection of GSO Networks",
    description:
      "Established EPFD limits and operational requirements for NGSO FSS systems " +
      "to protect GSO FSS networks.",
    impactedBands: ["Ku", "Ka"],
    impactedServices: ["FSS"],
    effectiveDate: "2020-01-01",
    implications: [
      "Stringent EPFD compliance required",
      "Operational constraints for NGSO",
      "GSO protection mechanisms mandated",
      "System-wide coordination required",
    ],
    actionRequired: [
      "Implement EPFD mitigation techniques",
      "Document compliance methodology",
      "Coordinate with GSO operators",
      "Regular compliance verification",
    ],
  },
  {
    id: "WRC19-2",
    conference: "WRC-19",
    agendaItem: "7",
    title: "Milestone-Based Approach for NGSO",
    description:
      "Established deployment milestones and due diligence requirements for " +
      "NGSO satellite constellations to prevent spectrum warehousing.",
    impactedBands: ["Ku", "Ka", "V"],
    impactedServices: ["FSS", "MSS"],
    effectiveDate: "2020-01-01",
    implications: [
      "Mandatory deployment milestones",
      "10% deployed within 2 years of BIU deadline",
      "50% within 5 years, 100% within 7 years",
      "Failure results in capacity reduction",
    ],
    actionRequired: [
      "Establish milestone tracking system",
      "Plan deployment schedule accordingly",
      "Document due diligence compliance",
      "Report progress to national administration",
    ],
  },
  {
    id: "WRC15-1",
    conference: "WRC-15",
    agendaItem: "1.1",
    title: "C-Band Reallocation for IMT",
    description:
      "Identified portions of C-band (3400-3600 MHz) for terrestrial mobile (IMT) " +
      "services, requiring satellite operators to relocate.",
    impactedBands: ["C"],
    impactedServices: ["FSS"],
    effectiveDate: "2016-01-01",
    implications: [
      "Loss of satellite spectrum in 3.4-3.8 GHz",
      "Migration to higher portions of C-band",
      "Interference management required",
      "Some operators received compensation",
    ],
    actionRequired: [
      "Plan migration from affected spectrum",
      "Coordinate with IMT operators",
      "Upgrade filtering on earth stations",
      "Seek compensation where applicable",
    ],
  },
];

// ============================================================================
// SPECTRUM REQUIREMENTS
// ============================================================================

export const spectrumRequirements: SpectrumRequirement[] = [
  // ITU Filing Requirements
  {
    id: "ITU-FILE-001",
    title: "ITU Advance Publication Information (API)",
    description:
      "Submission of Advance Publication Information to ITU before satellite network deployment. " +
      "Required 2-7 years before bringing into use depending on service and band.",
    source: "ITU",
    category: "filing",
    frequencyBands: ["L", "S", "C", "X", "Ku", "Ka", "V", "Q"],
    serviceTypes: ["FSS", "MSS", "BSS", "EESS", "SRS"],
    orbitTypes: ["GEO", "NGSO", "LEO", "MEO", "HEO"],
    riskLevel: "critical",
    isMandatory: true,
    reference: "RR Article 9.1, Appendix 4",
    complianceActions: [
      "Prepare API submission per Appendix 4 format",
      "Submit through national administration",
      "Pay applicable ITU cost recovery fees",
      "Monitor publication in BR IFIC",
      "Respond to comments from other administrations",
    ],
    documentationRequired: [
      "Completed API form (Appendix 4)",
      "Orbital parameters",
      "Frequency plan (preliminary)",
      "Coverage description",
      "Interference protection criteria",
    ],
    deadlines:
      "Minimum 2 years (FSS) to 7 years (BSS) before bringing into use",
    relatedRequirements: ["ITU-FILE-002", "ITU-FILE-003"],
    euSpaceActRef: "Art. 7 - Authorization requirements",
  },
  {
    id: "ITU-FILE-002",
    title: "ITU Coordination Request (CR/C)",
    description:
      "Submission of coordination request and completion of coordination with affected " +
      "administrations. Critical step for obtaining interference protection.",
    source: "ITU",
    category: "coordination",
    frequencyBands: ["L", "S", "C", "X", "Ku", "Ka", "V", "Q"],
    serviceTypes: ["FSS", "MSS", "BSS", "EESS", "SRS"],
    orbitTypes: ["GEO", "NGSO", "LEO", "MEO", "HEO"],
    riskLevel: "critical",
    isMandatory: true,
    reference: "RR Article 9.7, Appendix 4",
    complianceActions: [
      "Prepare detailed coordination request",
      "Identify affected networks via BR IFIC",
      "Initiate bilateral coordination",
      "Conduct interference analysis",
      "Negotiate coordination agreements",
      "Document coordination outcomes",
    ],
    documentationRequired: [
      "Coordination request (Appendix 4)",
      "Detailed technical parameters",
      "Interference calculations",
      "Coordination correspondence",
      "Signed coordination agreements",
    ],
    deadlines: "Must complete coordination before notification",
    relatedRequirements: ["ITU-FILE-001", "ITU-FILE-003"],
  },
  {
    id: "ITU-FILE-003",
    title: "ITU Notification and Recording",
    description:
      "Notification of frequency assignments for recording in Master International " +
      "Frequency Register (MIFR), providing international recognition and protection.",
    source: "ITU",
    category: "filing",
    frequencyBands: ["L", "S", "C", "X", "Ku", "Ka", "V", "Q"],
    serviceTypes: ["FSS", "MSS", "BSS", "EESS", "SRS"],
    orbitTypes: ["GEO", "NGSO", "LEO", "MEO", "HEO"],
    riskLevel: "critical",
    isMandatory: true,
    reference: "RR Article 11, Appendix 4",
    complianceActions: [
      "Prepare notification filing",
      "Include coordination outcomes",
      "Submit bringing-into-use plan",
      "Provide due diligence information",
      "Monitor BR examination",
      "Respond to any deficiencies",
    ],
    documentationRequired: [
      "Notification form (Appendix 4)",
      "Final technical characteristics",
      "Coordination agreement references",
      "Due diligence demonstration",
      "BIU confirmation (when applicable)",
    ],
    relatedRequirements: ["ITU-FILE-001", "ITU-FILE-002"],
  },
  {
    id: "ITU-EPFD-001",
    title: "EPFD Limits Compliance (NGSO)",
    description:
      "Non-geostationary systems must comply with equivalent power flux density (EPFD) " +
      "limits to protect GSO networks from aggregate interference.",
    source: "ITU",
    category: "interference",
    frequencyBands: ["Ku", "Ka"],
    serviceTypes: ["FSS"],
    orbitTypes: ["NGSO", "LEO", "MEO"],
    riskLevel: "critical",
    isMandatory: true,
    reference: "RR Article 22, Appendix 5",
    complianceActions: [
      "Calculate system EPFD contribution",
      "Implement mitigation techniques",
      "Document compliance methodology",
      "Verify via simulation",
      "Coordinate with GSO operators",
      "File compliance demonstration",
    ],
    documentationRequired: [
      "EPFD analysis report",
      "Mitigation strategy documentation",
      "Simulation methodology and results",
      "Validation test results",
    ],
    relatedRequirements: ["ITU-COORD-001"],
  },
  {
    id: "ITU-COORD-001",
    title: "NGSO-GSO Coordination",
    description:
      "Mandatory coordination between NGSO and GSO systems to ensure protection of " +
      "existing GSO networks and orderly spectrum sharing.",
    source: "ITU",
    category: "coordination",
    frequencyBands: ["Ku", "Ka", "V"],
    serviceTypes: ["FSS"],
    orbitTypes: ["NGSO", "LEO", "MEO"],
    riskLevel: "high",
    isMandatory: true,
    reference: "RR Article 9.7B, Resolution 76 (WRC-19)",
    complianceActions: [
      "Identify GSO networks in coordination arc",
      "Request coordination with affected operators",
      "Provide technical data for analysis",
      "Negotiate operational constraints if needed",
      "Document coordination agreements",
    ],
    documentationRequired: [
      "List of affected GSO networks",
      "Coordination request letters",
      "Technical data exchange",
      "Coordination agreement records",
    ],
    relatedRequirements: ["ITU-EPFD-001"],
  },
  {
    id: "ITU-REC-001",
    title: "ITU-R S.1003 GSO Protection (Environmental)",
    description:
      "Compliance with ITU-R Recommendation S.1003 for environmental protection of " +
      "the geostationary-satellite orbit from potential interference.",
    source: "ITU",
    category: "environmental",
    frequencyBands: ["C", "Ku", "Ka"],
    serviceTypes: ["FSS", "BSS"],
    orbitTypes: ["GEO"],
    riskLevel: "medium",
    isMandatory: false,
    reference: "ITU-R S.1003-2",
    complianceActions: [
      "Assess orbital position planning",
      "Implement station-keeping requirements",
      "Plan end-of-life disposal to graveyard orbit",
      "Document compliance approach",
    ],
    documentationRequired: [
      "Orbital maintenance plan",
      "End-of-life disposal plan",
      "Station-keeping capability demonstration",
    ],
  },
  {
    id: "ITU-MILESTONE-001",
    title: "NGSO Deployment Milestones",
    description:
      "NGSO systems must meet deployment milestones: 10% within 2 years, 50% within 5 years, " +
      "100% within 7 years of bringing-into-use deadline.",
    source: "ITU",
    category: "filing",
    frequencyBands: ["Ku", "Ka", "V"],
    serviceTypes: ["FSS", "MSS"],
    orbitTypes: ["NGSO", "LEO", "MEO"],
    riskLevel: "critical",
    isMandatory: true,
    reference: "RR No. 11.44C (WRC-19)",
    complianceActions: [
      "Establish deployment tracking system",
      "Plan manufacturing and launch schedule",
      "Report milestone achievement to administration",
      "Document deployment progress",
      "Plan capacity adjustments if behind schedule",
    ],
    documentationRequired: [
      "Deployment schedule",
      "Milestone tracking reports",
      "Launch manifests",
      "Capacity utilization reports",
    ],
    deadlines:
      "10% at 2 years, 50% at 5 years, 100% at 7 years from BIU deadline",
  },

  // FCC Requirements
  {
    id: "FCC-LIC-001",
    title: "FCC Part 25 Space Station Authorization",
    description:
      "FCC authorization required for U.S.-licensed satellites or satellites providing " +
      "service to/from the United States.",
    source: "FCC",
    category: "licensing",
    frequencyBands: ["L", "S", "C", "Ku", "Ka", "V"],
    serviceTypes: ["FSS", "MSS", "BSS"],
    orbitTypes: ["GEO", "NGSO", "LEO", "MEO"],
    riskLevel: "critical",
    isMandatory: true,
    reference: "47 CFR Part 25",
    complianceActions: [
      "Prepare and file Form 312",
      "Complete Schedule S technical appendix",
      "Demonstrate legal/financial qualifications",
      "Submit orbital debris mitigation plan",
      "Comply with ITU coordination requirements",
      "Post performance bond if required",
    ],
    documentationRequired: [
      "FCC Form 312",
      "Schedule S",
      "Legal narrative",
      "Financial documentation",
      "Orbital debris mitigation plan",
      "Bond letter (if applicable)",
    ],
    deadlines: "License valid for 15 years; renewal required",
    relatedRequirements: ["FCC-DEBRIS-001", "FCC-COORD-001"],
    euSpaceActRef: "Art. 10 - Third country market access provisions",
  },
  {
    id: "FCC-DEBRIS-001",
    title: "FCC Orbital Debris Mitigation",
    description:
      "Compliance with FCC orbital debris mitigation rules including 5-year post-mission " +
      "disposal requirement for LEO satellites.",
    source: "FCC",
    category: "technical",
    frequencyBands: ["L", "S", "C", "Ku", "Ka", "V"],
    serviceTypes: ["FSS", "MSS", "BSS"],
    orbitTypes: ["LEO", "MEO", "GEO"],
    riskLevel: "critical",
    isMandatory: true,
    reference: "47 CFR § 25.114(d)(14)",
    complianceActions: [
      "Prepare orbital debris mitigation plan",
      "Demonstrate 5-year deorbit (LEO) or graveyard (GEO)",
      "Document collision avoidance capability",
      "Provide casualty risk assessment",
      "Establish SSA data sharing",
    ],
    documentationRequired: [
      "Orbital debris mitigation plan",
      "Deorbit analysis",
      "Casualty risk assessment",
      "SSA data sharing agreement",
    ],
    relatedRequirements: ["FCC-LIC-001"],
  },
  {
    id: "FCC-COORD-001",
    title: "FCC Coordination with Federal Users",
    description:
      "Coordination with federal government users for shared spectrum bands. Required " +
      "for certain X-band and other government-shared allocations.",
    source: "FCC",
    category: "coordination",
    frequencyBands: ["X", "Ka"],
    serviceTypes: ["FSS", "EESS"],
    orbitTypes: ["GEO", "NGSO"],
    riskLevel: "high",
    isMandatory: true,
    reference: "47 CFR § 25.117",
    complianceActions: [
      "Identify federal sharing requirements",
      "Submit for NTIA coordination",
      "Respond to federal agency concerns",
      "Implement agreed operational constraints",
    ],
    documentationRequired: [
      "Federal coordination request",
      "Technical coordination data",
      "Coordination agreement documentation",
    ],
    relatedRequirements: ["FCC-LIC-001"],
  },
  {
    id: "FCC-PROCESS-001",
    title: "FCC Processing Round Participation",
    description:
      "For spectrum subject to processing rounds, participation in FCC processing round " +
      "procedures for NGSO applications.",
    source: "FCC",
    category: "filing",
    frequencyBands: ["Ka", "V"],
    serviceTypes: ["FSS"],
    orbitTypes: ["NGSO", "LEO", "MEO"],
    riskLevel: "high",
    isMandatory: true,
    reference: "47 CFR § 25.157",
    complianceActions: [
      "Monitor FCC processing round announcements",
      "Prepare application during window",
      "Complete all required documentation",
      "Respond to any petitions/comments",
      "Participate in band-sharing discussions",
    ],
    documentationRequired: [
      "Complete Form 312 application",
      "Technical showing per processing round rules",
      "Response to comments/petitions",
    ],
  },

  // Ofcom Requirements
  {
    id: "OFCOM-LIC-001",
    title: "Ofcom Satellite Licence",
    description:
      "UK authorization for satellite radio equipment operation. Required for UK-licensed " +
      "satellites or satellites serving UK market.",
    source: "OFCOM",
    category: "licensing",
    frequencyBands: ["L", "S", "C", "Ku", "Ka"],
    serviceTypes: ["FSS", "MSS", "BSS", "EESS"],
    orbitTypes: ["GEO", "NGSO", "LEO", "MEO"],
    riskLevel: "high",
    isMandatory: true,
    reference: "Wireless Telegraphy Act 2006",
    complianceActions: [
      "Submit application via Ofcom online system",
      "Provide technical parameters",
      "Demonstrate ITU coordination status",
      "Obtain UK Space Agency license (if UK operator)",
      "Pay applicable fees",
    ],
    documentationRequired: [
      "Ofcom licence application form",
      "Technical specification",
      "ITU filing status",
      "UK Space Agency licence (if applicable)",
    ],
    deadlines: "Processing time approximately 4 months",
    euSpaceActRef: "Art. 7 - Member state authorization framework",
  },
  {
    id: "OFCOM-ES-001",
    title: "Ofcom Earth Station Network Licence",
    description:
      "UK authorization for satellite earth station operation. Required for ground segment " +
      "operating in UK territory.",
    source: "OFCOM",
    category: "licensing",
    frequencyBands: ["C", "Ku", "Ka"],
    serviceTypes: ["FSS", "MSS"],
    orbitTypes: ["GEO", "NGSO"],
    riskLevel: "medium",
    isMandatory: true,
    reference: "Wireless Telegraphy Act 2006",
    complianceActions: [
      "Submit earth station application",
      "Provide site coordinates",
      "Demonstrate coordination with existing services",
      "Pay licence fees",
    ],
    documentationRequired: [
      "Earth station application form",
      "Site information",
      "Antenna characteristics",
      "Coordination analysis",
    ],
  },
  {
    id: "OFCOM-COORD-001",
    title: "Ofcom Spectrum Coordination",
    description:
      "Coordination with existing UK spectrum users to ensure interference-free operation.",
    source: "OFCOM",
    category: "coordination",
    frequencyBands: ["C", "Ku", "Ka"],
    serviceTypes: ["FSS", "MSS", "BSS"],
    orbitTypes: ["GEO", "NGSO"],
    riskLevel: "medium",
    isMandatory: true,
    reference: "Ofcom Spectrum Coordination Framework",
    complianceActions: [
      "Identify existing users in coordination zone",
      "Conduct interference analysis",
      "Negotiate with affected parties",
      "Document coordination outcomes",
    ],
    documentationRequired: [
      "Coordination contour analysis",
      "Interference calculations",
      "Coordination agreement records",
    ],
    relatedRequirements: ["OFCOM-LIC-001"],
  },

  // BNetzA Requirements
  {
    id: "BNETZA-LIC-001",
    title: "BNetzA Frequenzzuteilung",
    description:
      "German frequency assignment for satellite services. Required for German-licensed " +
      "satellites or operations involving German ground stations.",
    source: "BNETZA",
    category: "licensing",
    frequencyBands: ["L", "S", "C", "Ku", "Ka"],
    serviceTypes: ["FSS", "MSS", "BSS", "EESS"],
    orbitTypes: ["GEO", "NGSO", "LEO", "MEO"],
    riskLevel: "high",
    isMandatory: true,
    reference: "Telekommunikationsgesetz (TKG)",
    complianceActions: [
      "Submit formal application (Antrag auf Frequenzzuteilung)",
      "Provide technical documentation",
      "Demonstrate ITU coordination status",
      "Pay applicable fees",
      "Comply with German space law if applicable",
    ],
    documentationRequired: [
      "Frequency assignment application",
      "Technical parameters",
      "ITU filing references",
      "Financial capability proof",
    ],
    deadlines: "Processing time approximately 3 months",
    euSpaceActRef: "Art. 7 - Member state authorization framework",
  },
  {
    id: "BNETZA-ES-001",
    title: "BNetzA Erdfunkstellengenehmigung",
    description: "German authorization for satellite earth station operation.",
    source: "BNETZA",
    category: "licensing",
    frequencyBands: ["C", "Ku", "Ka"],
    serviceTypes: ["FSS", "MSS"],
    orbitTypes: ["GEO", "NGSO"],
    riskLevel: "medium",
    isMandatory: true,
    reference: "TKG, FreqV",
    complianceActions: [
      "Submit earth station application",
      "Provide site and technical data",
      "Coordinate with adjacent services",
      "Pay licence fees",
    ],
    documentationRequired: [
      "Earth station application",
      "Site coordinates",
      "Technical specifications",
      "Coordination documentation",
    ],
  },

  // CEPT Requirements
  {
    id: "CEPT-HARM-001",
    title: "CEPT Harmonized Satellite Allocations",
    description:
      "Compliance with CEPT/ECC harmonized frequency arrangements for satellite services " +
      "across European countries.",
    source: "CEPT",
    category: "technical",
    frequencyBands: ["L", "S", "Ku", "Ka"],
    serviceTypes: ["FSS", "MSS", "BSS"],
    orbitTypes: ["GEO", "NGSO"],
    riskLevel: "medium",
    isMandatory: false,
    reference: "ECC Decisions and Recommendations",
    complianceActions: [
      "Review applicable ECC Decisions",
      "Ensure technical conformity",
      "Document compliance with harmonized conditions",
      "Consider pan-European licensing benefits",
    ],
    documentationRequired: [
      "ECC Decision compliance matrix",
      "Technical conformity assessment",
    ],
    relatedRequirements: ["OFCOM-LIC-001", "BNETZA-LIC-001"],
    euSpaceActRef: "Art. 52 - Spectrum harmonization provisions",
  },
  {
    id: "CEPT-MSS-001",
    title: "ECC Decision on MSS (2 GHz)",
    description:
      "Compliance with ECC Decision (09)02 on harmonized conditions for MSS in 2 GHz band " +
      "supporting the deployment of complementary ground components.",
    source: "CEPT",
    category: "licensing",
    frequencyBands: ["S"],
    serviceTypes: ["MSS"],
    orbitTypes: ["GEO", "NGSO"],
    riskLevel: "medium",
    isMandatory: true,
    reference: "ECC/DEC/(09)02",
    complianceActions: [
      "Verify frequency plan compliance",
      "Implement CGC coordination requirements",
      "Document harmonized operation",
    ],
    documentationRequired: [
      "Frequency plan showing compliance",
      "CGC deployment plan (if applicable)",
      "Coordination with terrestrial operators",
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get frequency band information
 */
export function getFrequencyBandInfo(
  band: FrequencyBand,
): FrequencyBandInfo | undefined {
  return frequencyBands.find((b) => b.band === band);
}

/**
 * Get applicable requirements for a profile
 */
export function getApplicableSpectrumRequirements(
  profile: SpectrumProfile,
): SpectrumRequirement[] {
  return spectrumRequirements.filter((req) => {
    // Check service type match
    const serviceMatch =
      req.serviceTypes.length === 0 ||
      req.serviceTypes.some((st) => profile.serviceTypes.includes(st));

    // Check frequency band match
    const bandMatch =
      req.frequencyBands.length === 0 ||
      req.frequencyBands.some((fb) => profile.frequencyBands.includes(fb));

    // Check orbit type match
    const orbitMatch =
      req.orbitTypes.length === 0 ||
      req.orbitTypes.includes(profile.orbitType) ||
      (profile.orbitType === "LEO" && req.orbitTypes.includes("NGSO")) ||
      (profile.orbitType === "MEO" && req.orbitTypes.includes("NGSO"));

    // Check jurisdiction match
    const jurisdictionMatch =
      req.source === "ITU" || // ITU always applies
      req.source === profile.primaryJurisdiction ||
      profile.additionalJurisdictions.includes(req.source);

    return serviceMatch && bandMatch && orbitMatch && jurisdictionMatch;
  });
}

/**
 * Get requirements by source
 */
export function getRequirementsBySource(
  source: SpectrumSource,
): SpectrumRequirement[] {
  return spectrumRequirements.filter((r) => r.source === source);
}

/**
 * Get requirements by category
 */
export function getRequirementsByCategory(
  category: RequirementCategory,
): SpectrumRequirement[] {
  return spectrumRequirements.filter((r) => r.category === category);
}

/**
 * Get ITU filing phases
 */
export function getITUFilingPhases(): ITUFilingRequirement[] {
  return ituFilingPhases;
}

/**
 * Get applicable licenses for a profile
 */
export function getApplicableLicenses(
  profile: SpectrumProfile,
): JurisdictionLicense[] {
  const jurisdictions = [
    profile.primaryJurisdiction,
    ...profile.additionalJurisdictions,
  ];

  return jurisdictionLicenses.filter((license) => {
    const jurisdictionMatch = jurisdictions.includes(license.jurisdiction);
    const serviceMatch = license.applicableTo.some((st) =>
      profile.serviceTypes.includes(st),
    );
    const bandMatch = license.frequencyBands.some((fb) =>
      profile.frequencyBands.includes(fb),
    );

    return jurisdictionMatch && serviceMatch && bandMatch;
  });
}

/**
 * Get WRC decisions impacting a profile
 */
export function getImpactingWRCDecisions(
  profile: SpectrumProfile,
): WRCDecision[] {
  return wrcDecisions.filter((decision) => {
    const bandImpact = decision.impactedBands.some((b) =>
      profile.frequencyBands.includes(b),
    );
    const serviceImpact = decision.impactedServices.some((s) =>
      profile.serviceTypes.includes(s),
    );
    return bandImpact || serviceImpact;
  });
}

/**
 * Calculate ITU filing timeline for a target launch date
 */
export function calculateITUFilingTimeline(
  targetLaunchDate: Date,
  orbitType: OrbitType,
  serviceTypes: ServiceType[],
): FilingTimeline[] {
  const timelines: FilingTimeline[] = [];

  // Determine required lead time based on orbit and service
  const isGEO = orbitType === "GEO";
  const isBSS = serviceTypes.includes("BSS");

  // API phase
  const apiLeadMonths = isBSS ? 84 : isGEO ? 60 : 36; // 7/5/3 years
  const apiStart = new Date(targetLaunchDate);
  apiStart.setMonth(apiStart.getMonth() - apiLeadMonths - 6); // Extra buffer
  const apiDeadline = new Date(targetLaunchDate);
  apiDeadline.setMonth(apiDeadline.getMonth() - apiLeadMonths);

  timelines.push({
    phase: "API",
    startDate: apiStart,
    deadline: apiDeadline,
    status: "not_started",
  });

  // CR/C phase
  const crcLeadMonths = isGEO ? 48 : 24; // 4/2 years
  const crcStart = new Date(apiDeadline);
  crcStart.setMonth(crcStart.getMonth() + 3);
  const crcDeadline = new Date(targetLaunchDate);
  crcDeadline.setMonth(crcDeadline.getMonth() - crcLeadMonths);

  timelines.push({
    phase: "CR_C",
    startDate: crcStart,
    deadline: crcDeadline,
    status: "not_started",
  });

  // Notification phase
  const notificationStart = new Date(crcDeadline);
  notificationStart.setMonth(notificationStart.getMonth() + 6);
  const notificationDeadline = new Date(targetLaunchDate);
  notificationDeadline.setMonth(notificationDeadline.getMonth() - 12);

  timelines.push({
    phase: "NOTIFICATION",
    startDate: notificationStart,
    deadline: notificationDeadline,
    status: "not_started",
  });

  // Recording phase
  const recordingStart = new Date(targetLaunchDate);
  const recordingDeadline = new Date(targetLaunchDate);
  recordingDeadline.setMonth(recordingDeadline.getMonth() + 3);

  timelines.push({
    phase: "RECORDING",
    startDate: recordingStart,
    deadline: recordingDeadline,
    status: "not_started",
  });

  return timelines;
}

/**
 * Get bands typically used for a service type
 */
export function getBandsForService(serviceType: ServiceType): FrequencyBand[] {
  const serviceBandMap: Record<ServiceType, FrequencyBand[]> = {
    FSS: ["C", "Ku", "Ka", "V", "Q"],
    MSS: ["L", "S", "UHF"],
    BSS: ["Ku", "Ka", "S"],
    EESS: ["X", "Ka", "S"],
    SRS: ["X", "S", "Ka"],
    RNS: ["L", "S"],
    AMSS: ["L", "Ku", "Ka"],
    MMSS: ["L", "C"],
    ISL: ["Ka", "V"],
  };

  return serviceBandMap[serviceType] || [];
}

/**
 * Determine risk level based on profile characteristics
 */
export function determineSpectrumRisk(profile: SpectrumProfile): RiskLevel {
  // Critical: No ITU filings for GEO
  if (profile.orbitType === "GEO" && !profile.hasExistingFilings) {
    return "critical";
  }

  // Critical: Large NGSO constellation without filings
  if (
    profile.isConstellation &&
    profile.numberOfSatellites > 100 &&
    !profile.hasExistingFilings
  ) {
    return "critical";
  }

  // High: Ka-band NGSO without coordination
  if (
    profile.frequencyBands.includes("Ka") &&
    (profile.orbitType === "LEO" || profile.orbitType === "MEO")
  ) {
    return "high";
  }

  // High: Multiple jurisdictions
  if (profile.additionalJurisdictions.length >= 3) {
    return "high";
  }

  // Medium: Standard operations
  if (profile.hasExistingFilings) {
    return "medium";
  }

  return "medium";
}

/**
 * Calculate total estimated fees for licenses
 */
export function calculateEstimatedFees(licenses: JurisdictionLicense[]): {
  total: number;
  byCurrency: Record<string, number>;
} {
  const byCurrency: Record<string, number> = {};

  for (const license of licenses) {
    const currency = license.fees.currency;
    const total =
      license.fees.application +
      (license.fees.annual || 0) * license.validityYears;

    if (!byCurrency[currency]) {
      byCurrency[currency] = 0;
    }
    byCurrency[currency] += total;
  }

  // Rough conversion to USD for total
  const conversionRates: Record<string, number> = {
    USD: 1,
    CHF: 1.1,
    GBP: 1.25,
    EUR: 1.08,
  };

  let totalUSD = 0;
  for (const [currency, amount] of Object.entries(byCurrency)) {
    totalUSD += amount * (conversionRates[currency] || 1);
  }

  return { total: totalUSD, byCurrency };
}

/**
 * Get service type full name
 */
export function getServiceTypeName(serviceType: ServiceType): string {
  const names: Record<ServiceType, string> = {
    FSS: "Fixed-Satellite Service",
    MSS: "Mobile-Satellite Service",
    BSS: "Broadcasting-Satellite Service",
    EESS: "Earth Exploration-Satellite Service",
    SRS: "Space Research Service",
    RNS: "Radionavigation-Satellite Service",
    AMSS: "Aeronautical Mobile-Satellite Service",
    MMSS: "Maritime Mobile-Satellite Service",
    ISL: "Inter-Satellite Links",
  };
  return names[serviceType] || serviceType;
}

/**
 * Get orbit type full name
 */
export function getOrbitTypeName(orbitType: OrbitType): string {
  const names: Record<OrbitType, string> = {
    GEO: "Geostationary Orbit",
    NGSO: "Non-Geostationary Orbit",
    LEO: "Low Earth Orbit",
    MEO: "Medium Earth Orbit",
    HEO: "Highly Elliptical Orbit",
  };
  return names[orbitType] || orbitType;
}

/**
 * Get source authority full name
 */
export function getSourceAuthorityName(source: SpectrumSource): string {
  const names: Record<SpectrumSource, string> = {
    ITU: "International Telecommunication Union",
    FCC: "Federal Communications Commission (USA)",
    OFCOM: "Office of Communications (UK)",
    BNETZA: "Bundesnetzagentur (Germany)",
    CEPT: "European Conference of Postal and Telecommunications Administrations",
    WRC: "World Radiocommunication Conference",
  };
  return names[source] || source;
}
