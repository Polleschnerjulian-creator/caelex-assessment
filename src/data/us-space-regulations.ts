/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * US Space Regulatory Framework:
 * - FCC Part 25 (Satellite Communications Licensing)
 * - FCC Orbital Debris Rule 2024 (5-Year Deorbit for LEO)
 * - FCC Spectrum Licensing Requirements
 * - FAA/AST 14 CFR Part 450 (Launch & Reentry Licensing)
 * - NOAA Remote Sensing Licensing (15 CFR Part 960)
 * - ORBITS Act 2025 (Uniform Debris Standards)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ───

export type UsAgency = "FCC" | "FAA" | "NOAA";

export type UsOperatorType =
  | "satellite_operator"
  | "launch_operator"
  | "reentry_operator"
  | "remote_sensing_operator"
  | "spectrum_user"
  | "spaceport_operator";

export type UsActivityType =
  | "satellite_communications"
  | "earth_observation"
  | "scientific_research"
  | "commercial_launch"
  | "commercial_reentry"
  | "spectrum_operations"
  | "remote_sensing"
  | "navigation"
  | "broadband"
  | "direct_broadcast";

export type UsLicenseType =
  | "fcc_space_station"
  | "fcc_earth_station"
  | "fcc_spectrum"
  | "fcc_experimental"
  | "faa_launch"
  | "faa_reentry"
  | "faa_spaceport"
  | "faa_safety_approval"
  | "noaa_remote_sensing";

export type UsRequirementCategory =
  | "licensing"
  | "spectrum"
  | "orbital_debris"
  | "launch_safety"
  | "reentry_safety"
  | "remote_sensing"
  | "financial_responsibility"
  | "environmental"
  | "national_security"
  | "coordination"
  | "reporting";

export type UsComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

export type BindingLevel = "mandatory" | "recommended" | "guidance";

export interface UsOperatorProfile {
  operatorTypes: UsOperatorType[];
  activityTypes: UsActivityType[];
  agencies: UsAgency[];
  isUsEntity: boolean;
  usNexus: "us_licensed" | "us_operated" | "us_launched" | "us_market_access";
  orbitRegime?: "LEO" | "MEO" | "GEO" | "HEO" | "cislunar" | "deep_space";
  altitudeKm?: number;
  frequencyBands?: string[];
  satelliteCount?: number;
  hasManeuverability?: boolean;
  hasPropulsion?: boolean;
  missionDurationYears?: number;
  isConstellation?: boolean;
  isSmallSatellite?: boolean; // < 180 kg
  isNGSO?: boolean; // Non-Geostationary
  providesRemoteSensing?: boolean;
  remotesensingResolutionM?: number;
  hasNationalSecurityImplications?: boolean;
}

export interface UsRequirement {
  id: string;
  cfrReference: string;
  title: string;
  description: string;
  agency: UsAgency;
  category: UsRequirementCategory;
  bindingLevel: BindingLevel;
  applicability: {
    operatorTypes?: UsOperatorType[];
    activityTypes?: UsActivityType[];
    agencies?: UsAgency[];
    orbitRegimes?: (
      | "LEO"
      | "MEO"
      | "GEO"
      | "HEO"
      | "cislunar"
      | "deep_space"
    )[];
    ngsOnly?: boolean;
    leoOnly?: boolean;
    constellationOnly?: boolean;
    remoteSensingOnly?: boolean;
    smallSatOnly?: boolean;
  };
  complianceQuestion: string;
  evidenceRequired: string[];
  implementationGuidance: string[];
  severity: "critical" | "major" | "minor";
  licenseTypes: UsLicenseType[];
  euSpaceActCrossRef?: string[];
  copuosCrossRef?: string[];
  penalties?: {
    description: string;
    maxFine?: number;
    perViolation?: boolean;
  };
}

export interface UsEuComparison {
  usRequirement: string;
  euEquivalent: string | null;
  comparisonNotes: string;
  harmonizationStatus: "aligned" | "partial" | "divergent";
}

// ─── Configuration ───

export const agencyConfig: Record<
  UsAgency,
  { label: string; fullName: string; description: string; color: string }
> = {
  FCC: {
    label: "FCC",
    fullName: "Federal Communications Commission",
    description: "Regulates satellite communications and spectrum",
    color: "blue",
  },
  FAA: {
    label: "FAA/AST",
    fullName:
      "Federal Aviation Administration - Office of Commercial Space Transportation",
    description: "Regulates commercial launch and reentry",
    color: "orange",
  },
  NOAA: {
    label: "NOAA",
    fullName: "National Oceanic and Atmospheric Administration",
    description: "Regulates commercial remote sensing",
    color: "green",
  },
};

export const operatorTypeConfig: Record<
  UsOperatorType,
  { label: string; description: string; icon: string; agencies: UsAgency[] }
> = {
  satellite_operator: {
    label: "Satellite Operator",
    description:
      "Operates satellites for communications, EO, or other purposes",
    icon: "Satellite",
    agencies: ["FCC", "NOAA"],
  },
  launch_operator: {
    label: "Launch Operator",
    description: "Conducts commercial space launches",
    icon: "Rocket",
    agencies: ["FAA"],
  },
  reentry_operator: {
    label: "Reentry Operator",
    description: "Conducts controlled vehicle reentry",
    icon: "ArrowDownCircle",
    agencies: ["FAA"],
  },
  remote_sensing_operator: {
    label: "Remote Sensing Operator",
    description: "Operates commercial Earth observation systems",
    icon: "Eye",
    agencies: ["NOAA"],
  },
  spectrum_user: {
    label: "Spectrum User",
    description: "Uses RF spectrum for space operations",
    icon: "Radio",
    agencies: ["FCC"],
  },
  spaceport_operator: {
    label: "Spaceport Operator",
    description: "Operates licensed launch/reentry site",
    icon: "Building2",
    agencies: ["FAA"],
  },
};

export const activityTypeConfig: Record<
  UsActivityType,
  { label: string; description: string }
> = {
  satellite_communications: {
    label: "Satellite Communications",
    description: "Fixed or mobile satellite services",
  },
  earth_observation: {
    label: "Earth Observation",
    description: "Remote sensing and imaging",
  },
  scientific_research: {
    label: "Scientific Research",
    description: "Space-based research activities",
  },
  commercial_launch: {
    label: "Commercial Launch",
    description: "Launch services for commercial payloads",
  },
  commercial_reentry: {
    label: "Commercial Reentry",
    description: "Vehicle reentry operations",
  },
  spectrum_operations: {
    label: "Spectrum Operations",
    description: "Radio frequency spectrum use",
  },
  remote_sensing: {
    label: "Remote Sensing",
    description: "Commercial Earth imaging",
  },
  navigation: {
    label: "Navigation Services",
    description: "Position, navigation, timing services",
  },
  broadband: {
    label: "Broadband Services",
    description: "Internet and data services from space",
  },
  direct_broadcast: {
    label: "Direct Broadcast",
    description: "Direct-to-home satellite services",
  },
};

export const licenseTypeConfig: Record<
  UsLicenseType,
  { label: string; agency: UsAgency; cfrPart: string }
> = {
  fcc_space_station: {
    label: "Space Station License",
    agency: "FCC",
    cfrPart: "47 CFR Part 25",
  },
  fcc_earth_station: {
    label: "Earth Station License",
    agency: "FCC",
    cfrPart: "47 CFR Part 25",
  },
  fcc_spectrum: {
    label: "Spectrum License",
    agency: "FCC",
    cfrPart: "47 CFR Part 2/25",
  },
  fcc_experimental: {
    label: "Experimental License",
    agency: "FCC",
    cfrPart: "47 CFR Part 5",
  },
  faa_launch: {
    label: "Launch License",
    agency: "FAA",
    cfrPart: "14 CFR Part 450",
  },
  faa_reentry: {
    label: "Reentry License",
    agency: "FAA",
    cfrPart: "14 CFR Part 450",
  },
  faa_spaceport: {
    label: "Launch Site License",
    agency: "FAA",
    cfrPart: "14 CFR Part 420",
  },
  faa_safety_approval: {
    label: "Safety Element Approval",
    agency: "FAA",
    cfrPart: "14 CFR Part 414",
  },
  noaa_remote_sensing: {
    label: "Remote Sensing License",
    agency: "NOAA",
    cfrPart: "15 CFR Part 960",
  },
};

export const categoryConfig: Record<
  UsRequirementCategory,
  { label: string; color: string; icon: string }
> = {
  licensing: { label: "Licensing", color: "blue", icon: "FileCheck" },
  spectrum: { label: "Spectrum Management", color: "purple", icon: "Radio" },
  orbital_debris: { label: "Orbital Debris", color: "orange", icon: "Trash2" },
  launch_safety: { label: "Launch Safety", color: "red", icon: "Shield" },
  reentry_safety: {
    label: "Reentry Safety",
    color: "rose",
    icon: "ArrowDownCircle",
  },
  remote_sensing: { label: "Remote Sensing", color: "green", icon: "Eye" },
  financial_responsibility: {
    label: "Financial Responsibility",
    color: "amber",
    icon: "DollarSign",
  },
  environmental: { label: "Environmental", color: "emerald", icon: "Leaf" },
  national_security: {
    label: "National Security",
    color: "slate",
    icon: "Lock",
  },
  coordination: { label: "Coordination", color: "cyan", icon: "Users" },
  reporting: { label: "Reporting", color: "indigo", icon: "FileText" },
};

export const complianceStatusConfig: Record<
  UsComplianceStatus,
  { label: string; color: string; icon: string }
> = {
  compliant: { label: "Compliant", color: "green", icon: "CheckCircle2" },
  partial: { label: "Partial", color: "amber", icon: "AlertTriangle" },
  non_compliant: { label: "Non-Compliant", color: "red", icon: "XCircle" },
  not_assessed: { label: "Not Assessed", color: "slate", icon: "HelpCircle" },
  not_applicable: { label: "N/A", color: "gray", icon: "MinusCircle" },
};

// ─── US Space Regulatory Requirements ───

export const usSpaceRequirements: UsRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════
  // FCC Part 25 - Satellite Communications Licensing
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "fcc-part25-license",
    cfrReference: "47 CFR § 25.102",
    title: "Space Station Authorization Required",
    description:
      "No person shall operate a space station from the United States or provide service in the United States using a non-U.S.-licensed space station without prior FCC authorization.",
    agency: "FCC",
    category: "licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "spectrum_user"],
      activityTypes: [
        "satellite_communications",
        "broadband",
        "direct_broadcast",
      ],
    },
    complianceQuestion:
      "Do you hold a valid FCC space station license or market access grant for your satellite operations?",
    evidenceRequired: [
      "FCC space station license (Form 312)",
      "Market access petition (if non-US licensed)",
      "ITU coordination documentation",
    ],
    implementationGuidance: [
      "File Form 312 for US-licensed satellites",
      "File market access petition for foreign-licensed satellites",
      "Complete ITU coordination through FCC",
      "Allow 12-18 months for processing",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station"],
    euSpaceActCrossRef: ["Art. 4", "Art. 5"],
    copuosCrossRef: ["LTS-1"],
    penalties: {
      description: "Operating without authorization",
      maxFine: 2382178,
      perViolation: true,
    },
  },
  {
    id: "fcc-part25-ngso-processing",
    cfrReference: "47 CFR § 25.157",
    title: "NGSO-like Satellite Processing Rules",
    description:
      "Applications for NGSO satellite systems must demonstrate spectrum sharing capabilities and comply with processing round requirements.",
    agency: "FCC",
    category: "licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
      ngsOnly: true,
    },
    complianceQuestion:
      "Does your NGSO satellite system application comply with processing round requirements?",
    evidenceRequired: [
      "Spectrum sharing technical analysis",
      "Processing round compliance documentation",
      "Interference mitigation plan",
    ],
    implementationGuidance: [
      "Monitor FCC processing round announcements",
      "Prepare spectrum sharing technical studies",
      "Submit during open processing windows",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station"],
    euSpaceActCrossRef: ["Art. 56"],
  },
  {
    id: "fcc-part25-technical-standards",
    cfrReference: "47 CFR § 25.202-25.228",
    title: "Technical Standards Compliance",
    description:
      "Space stations must meet technical standards including power flux density limits, out-of-band emissions limits, and antenna performance requirements.",
    agency: "FCC",
    category: "spectrum",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "spectrum_user"],
    },
    complianceQuestion:
      "Does your satellite meet all applicable FCC technical standards for power, emissions, and antenna performance?",
    evidenceRequired: [
      "Technical specifications showing PFD compliance",
      "Out-of-band emission measurements",
      "Antenna pattern analysis",
      "Link budget calculations",
    ],
    implementationGuidance: [
      "Design satellite RF systems to meet Part 25 limits",
      "Conduct pre-launch RF testing",
      "Document compliance in license application",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station", "fcc_spectrum"],
    euSpaceActCrossRef: ["Art. 55", "Art. 56"],
  },
  {
    id: "fcc-part25-coordination",
    cfrReference: "47 CFR § 25.111",
    title: "ITU Coordination Requirements",
    description:
      "Applicants must complete international coordination through ITU and notify FCC of any coordination agreements or interference issues.",
    agency: "FCC",
    category: "coordination",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "spectrum_user"],
    },
    complianceQuestion:
      "Have you completed required ITU coordination for your satellite system?",
    evidenceRequired: [
      "ITU filing documentation",
      "Coordination status reports",
      "Coordination agreements with affected administrations",
    ],
    implementationGuidance: [
      "File ITU advance publication information (API)",
      "Complete ITU coordination process",
      "Submit coordination agreements to FCC",
      "Maintain coordination records",
    ],
    severity: "major",
    licenseTypes: ["fcc_space_station", "fcc_spectrum"],
    copuosCrossRef: ["LTS-7"],
  },
  {
    id: "fcc-part25-bond-requirement",
    cfrReference: "47 CFR § 25.165",
    title: "Performance Bond Requirement (NGSO)",
    description:
      "NGSO satellite system licensees must post a performance bond to ensure timely deployment of authorized systems.",
    agency: "FCC",
    category: "financial_responsibility",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
      ngsOnly: true,
    },
    complianceQuestion:
      "Have you posted the required performance bond for your NGSO system?",
    evidenceRequired: [
      "Performance bond certificate",
      "Bond amount calculation",
      "Bond custodian documentation",
    ],
    implementationGuidance: [
      "Calculate bond amount per FCC formula",
      "Obtain bond from approved surety",
      "Submit bond to FCC before launch",
      "Maintain bond until milestone compliance",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station"],
  },
  {
    id: "fcc-part25-milestone",
    cfrReference: "47 CFR § 25.164",
    title: "Deployment Milestones",
    description:
      "Licensees must meet deployment milestones: non-GSO systems must deploy 50% within 6 years, 100% within 9 years of authorization.",
    agency: "FCC",
    category: "licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
    },
    complianceQuestion:
      "Do you have a plan to meet FCC deployment milestones for your satellite system?",
    evidenceRequired: [
      "Deployment schedule",
      "Milestone compliance plan",
      "Launch contracts/agreements",
    ],
    implementationGuidance: [
      "Develop realistic deployment timeline",
      "Secure launch contracts early",
      "Monitor milestone deadlines",
      "Request extensions if needed (with justification)",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station"],
    penalties: {
      description:
        "Failure to meet milestones may result in license revocation",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // FCC Orbital Debris Rule 2024 (5-Year Deorbit for LEO)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "fcc-debris-5year-rule",
    cfrReference: "47 CFR § 25.114(d)(14)(iv)",
    title: "5-Year Post-Mission Disposal Rule (LEO)",
    description:
      "Satellites in LEO (below 2,000 km) must be disposed of within 5 years of mission completion. This rule applies to all new applications filed after September 2024.",
    agency: "FCC",
    category: "orbital_debris",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
      leoOnly: true,
    },
    complianceQuestion:
      "Does your LEO satellite mission plan comply with the 5-year post-mission disposal requirement?",
    evidenceRequired: [
      "Orbital lifetime analysis",
      "Active deorbit capability description",
      "Disposal maneuver fuel budget",
      "End-of-life operational plan",
    ],
    implementationGuidance: [
      "Design satellite with active deorbit capability",
      "Reserve propellant for disposal maneuver",
      "Calculate disposal timeline from end-of-mission",
      "Implement automated deorbit triggers if possible",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station"],
    euSpaceActCrossRef: ["Art. 72"],
    copuosCrossRef: ["LTS-19", "IADC-6.1"],
  },
  {
    id: "fcc-debris-mitigation-plan",
    cfrReference: "47 CFR § 25.114(d)(14)",
    title: "Orbital Debris Mitigation Plan",
    description:
      "All space station applications must include a detailed debris mitigation plan addressing collision avoidance, passivation, and disposal.",
    agency: "FCC",
    category: "orbital_debris",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
    },
    complianceQuestion:
      "Have you submitted a comprehensive orbital debris mitigation plan with your FCC application?",
    evidenceRequired: [
      "Debris mitigation plan document",
      "Collision probability assessment",
      "Passivation procedures",
      "Disposal methodology",
      "Design for demise analysis (if applicable)",
    ],
    implementationGuidance: [
      "Follow FCC Debris Mitigation Order requirements",
      "Address all 9 categories in 47 CFR § 25.114(d)(14)",
      "Include quantitative collision risk assessment",
      "Demonstrate compliance with international guidelines",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station"],
    euSpaceActCrossRef: ["Art. 67", "Art. 72", "Art. 73"],
    copuosCrossRef: ["LTS-18", "LTS-19", "LTS-20", "IADC-5", "IADC-6"],
  },
  {
    id: "fcc-debris-collision-avoidance",
    cfrReference: "47 CFR § 25.114(d)(14)(i)",
    title: "Collision Avoidance Capability",
    description:
      "Satellites must have capability to perform collision avoidance maneuvers and demonstrate procedures for responding to conjunction warnings.",
    agency: "FCC",
    category: "orbital_debris",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
    },
    complianceQuestion:
      "Does your satellite have collision avoidance capability and documented procedures?",
    evidenceRequired: [
      "Collision avoidance concept of operations",
      "Maneuver capability specifications",
      "SSA data provider agreement",
      "Conjunction assessment procedures",
    ],
    implementationGuidance: [
      "Contract with SSA data provider (18 SDS, commercial)",
      "Develop conjunction response procedures",
      "Ensure sufficient propellant for avoidance maneuvers",
      "Establish 24/7 operational capability for warnings",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station"],
    euSpaceActCrossRef: ["Art. 70", "Art. 71"],
    copuosCrossRef: ["LTS-16", "LTS-17"],
  },
  {
    id: "fcc-debris-passivation",
    cfrReference: "47 CFR § 25.114(d)(14)(ii)",
    title: "End-of-Life Passivation",
    description:
      "All stored energy sources must be depleted or safed at end of mission to minimize risk of explosion or fragmentation.",
    agency: "FCC",
    category: "orbital_debris",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
    },
    complianceQuestion:
      "Do you have a passivation plan for all energy sources at end-of-mission?",
    evidenceRequired: [
      "Passivation procedure documentation",
      "Energy source inventory (batteries, propellant, pressurants)",
      "Safing sequence description",
    ],
    implementationGuidance: [
      "Identify all stored energy sources",
      "Design passivation procedures for each source",
      "Test passivation capability pre-launch",
      "Include in end-of-life operations plan",
    ],
    severity: "major",
    licenseTypes: ["fcc_space_station"],
    copuosCrossRef: ["IADC-5.2.3", "ISO-24113"],
  },
  {
    id: "fcc-debris-casualty-risk",
    cfrReference: "47 CFR § 25.114(d)(14)(v)",
    title: "Reentry Casualty Risk Assessment",
    description:
      "If satellite will reenter atmosphere, human casualty expectation must be calculated and demonstrated to be below 1:10,000.",
    agency: "FCC",
    category: "orbital_debris",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
    },
    complianceQuestion:
      "Does your reentry casualty risk assessment demonstrate compliance with the 1:10,000 threshold?",
    evidenceRequired: [
      "Demisability analysis",
      "Debris footprint analysis",
      "Casualty expectation calculation",
      "Controlled reentry plan (if required)",
    ],
    implementationGuidance: [
      "Conduct demise analysis using NASA DAS or equivalent",
      "Design for demise where possible",
      "Calculate casualty expectation",
      "Consider controlled reentry if Ec > 1:10,000",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station"],
    euSpaceActCrossRef: ["Art. 73"],
    copuosCrossRef: ["LTS-20", "IADC-6.2"],
  },
  {
    id: "fcc-debris-trackability",
    cfrReference: "47 CFR § 25.114(d)(14)(vi)",
    title: "Trackability Requirements",
    description:
      "Satellites must be trackable by US Space Surveillance Network and share orbital data with 18th Space Defense Squadron.",
    agency: "FCC",
    category: "orbital_debris",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
    },
    complianceQuestion:
      "Is your satellite designed to be trackable and do you share orbital data with 18 SDS?",
    evidenceRequired: [
      "Radar cross-section analysis",
      "18 SDS data sharing agreement",
      "Ephemeris sharing procedures",
    ],
    implementationGuidance: [
      "Ensure minimum trackable size or add tracking aids",
      "Register with 18th Space Defense Squadron",
      "Establish ephemeris sharing procedures",
      "Consider GPS receivers for precise positioning",
    ],
    severity: "major",
    licenseTypes: ["fcc_space_station"],
    copuosCrossRef: ["LTS-16"],
  },
  {
    id: "fcc-debris-indemnification",
    cfrReference: "47 CFR § 25.114(d)(14)(viii)",
    title: "Debris-Related Indemnification",
    description:
      "Applicants must describe third-party liability coverage and indemnification arrangements related to orbital debris risks.",
    agency: "FCC",
    category: "financial_responsibility",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
    },
    complianceQuestion:
      "Do you have adequate third-party liability coverage for debris-related incidents?",
    evidenceRequired: [
      "Insurance policy documentation",
      "Coverage amount confirmation",
      "Indemnification agreements",
    ],
    implementationGuidance: [
      "Obtain third-party liability insurance",
      "Coverage should address collision and debris risks",
      "Consider coverage through mission lifetime",
    ],
    severity: "major",
    licenseTypes: ["fcc_space_station"],
    euSpaceActCrossRef: ["Art. 39", "Art. 40"],
  },

  // ═══════════════════════════════════════════════════════════════════
  // FCC Spectrum Licensing Requirements
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "fcc-spectrum-allocation",
    cfrReference: "47 CFR Part 2",
    title: "Spectrum Allocation Compliance",
    description:
      "Satellite systems must operate within allocated spectrum bands and comply with US Table of Frequency Allocations.",
    agency: "FCC",
    category: "spectrum",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "spectrum_user"],
    },
    complianceQuestion:
      "Does your satellite operate within appropriately allocated spectrum bands?",
    evidenceRequired: [
      "Frequency band analysis",
      "Allocation footnote compliance",
      "Band plan documentation",
    ],
    implementationGuidance: [
      "Review Part 2 allocations for intended frequencies",
      "Ensure primary/secondary status understood",
      "Consider sharing obligations",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station", "fcc_spectrum"],
  },
  {
    id: "fcc-spectrum-interference",
    cfrReference: "47 CFR § 25.140",
    title: "Interference Protection",
    description:
      "NGSO systems must accept interference from and not cause harmful interference to GSO systems in shared bands.",
    agency: "FCC",
    category: "spectrum",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
      ngsOnly: true,
    },
    complianceQuestion:
      "Does your NGSO system comply with GSO protection requirements?",
    evidenceRequired: [
      "EPFD analysis",
      "GSO arc avoidance procedures",
      "Interference mitigation measures",
    ],
    implementationGuidance: [
      "Conduct equivalent power flux density (EPFD) analysis",
      "Implement GSO arc avoidance if required",
      "Design for acceptable interference levels",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station", "fcc_spectrum"],
  },
  {
    id: "fcc-spectrum-earth-stations",
    cfrReference: "47 CFR § 25.115",
    title: "Earth Station Authorization",
    description:
      "Earth stations communicating with space stations must be individually licensed or operate under blanket license authority.",
    agency: "FCC",
    category: "licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "spectrum_user"],
      activityTypes: ["satellite_communications", "broadband"],
    },
    complianceQuestion:
      "Are your earth stations properly authorized under FCC rules?",
    evidenceRequired: [
      "Earth station licenses or blanket authority",
      "Antenna specifications",
      "EIRP and power levels",
    ],
    implementationGuidance: [
      "File Form 312 for individual earth stations",
      "Consider blanket licensing for user terminals",
      "Ensure coordination with terrestrial services",
    ],
    severity: "major",
    licenseTypes: ["fcc_earth_station"],
  },

  // ═══════════════════════════════════════════════════════════════════
  // FAA/AST 14 CFR Part 450 - Launch & Reentry Licensing
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "faa-launch-license",
    cfrReference: "14 CFR § 450.3",
    title: "Launch License Requirement",
    description:
      "No person may conduct a launch in the United States or by a US person anywhere without a license from the FAA.",
    agency: "FAA",
    category: "licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator"],
      activityTypes: ["commercial_launch"],
    },
    complianceQuestion:
      "Do you hold a valid FAA launch license for your launch operations?",
    evidenceRequired: [
      "FAA launch license",
      "License application package",
      "Financial responsibility documentation",
    ],
    implementationGuidance: [
      "Submit license application to FAA/AST",
      "Allow minimum 180 days for processing",
      "Engage FAA early in vehicle development",
      "Consider pre-application consultation",
    ],
    severity: "critical",
    licenseTypes: ["faa_launch"],
    euSpaceActCrossRef: ["Art. 4", "Art. 5"],
    copuosCrossRef: ["LTS-1"],
    penalties: {
      description: "Civil penalty for unauthorized launch",
      maxFine: 282670,
      perViolation: true,
    },
  },
  {
    id: "faa-reentry-license",
    cfrReference: "14 CFR § 450.3",
    title: "Reentry License Requirement",
    description:
      "No person may conduct a reentry in the United States or by a US person anywhere without a license from the FAA.",
    agency: "FAA",
    category: "licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["reentry_operator"],
      activityTypes: ["commercial_reentry"],
    },
    complianceQuestion:
      "Do you hold a valid FAA reentry license for your reentry operations?",
    evidenceRequired: [
      "FAA reentry license",
      "Reentry vehicle safety analysis",
      "Landing site agreements",
    ],
    implementationGuidance: [
      "Submit reentry license application",
      "Conduct reentry safety analysis",
      "Coordinate with landing site operators",
    ],
    severity: "critical",
    licenseTypes: ["faa_reentry"],
    euSpaceActCrossRef: ["Art. 4", "Art. 5"],
  },
  {
    id: "faa-safety-analysis",
    cfrReference: "14 CFR § 450.101-450.187",
    title: "Flight Safety Analysis",
    description:
      "Licensees must conduct flight safety analysis demonstrating acceptable risk to the public from launch/reentry operations.",
    agency: "FAA",
    category: "launch_safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "reentry_operator"],
    },
    complianceQuestion:
      "Have you conducted a flight safety analysis demonstrating acceptable public risk?",
    evidenceRequired: [
      "Flight safety analysis report",
      "Trajectory analysis",
      "Debris analysis",
      "Blast effects analysis",
      "Toxic release analysis (if applicable)",
    ],
    implementationGuidance: [
      "Analyze all failure modes and debris generation",
      "Calculate collective and individual risk",
      "Demonstrate EC < 1:10,000 per flight",
      "Identify hazard areas and flight corridors",
    ],
    severity: "critical",
    licenseTypes: ["faa_launch", "faa_reentry"],
    euSpaceActCrossRef: ["Art. 58", "Art. 59"],
  },
  {
    id: "faa-ec-threshold",
    cfrReference: "14 CFR § 450.101(a)(1)",
    title: "Collective Risk Threshold (EC < 1:10,000)",
    description:
      "Expected casualty (EC) for any one flight must not exceed 1:10,000 for all persons exposed to hazardous debris.",
    agency: "FAA",
    category: "launch_safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "reentry_operator"],
    },
    complianceQuestion:
      "Does your flight safety analysis demonstrate EC below 1:10,000?",
    evidenceRequired: [
      "EC calculation methodology",
      "Population exposure analysis",
      "Risk acceptance documentation",
    ],
    implementationGuidance: [
      "Use FAA-accepted risk analysis tools",
      "Include all mission phases in analysis",
      "Consider both land and maritime populations",
      "Document all assumptions",
    ],
    severity: "critical",
    licenseTypes: ["faa_launch", "faa_reentry"],
  },
  {
    id: "faa-individual-risk",
    cfrReference: "14 CFR § 450.101(a)(2)",
    title: "Individual Risk Threshold",
    description:
      "Risk to any individual must not exceed 1:1,000,000 per launch/reentry for members of the public.",
    agency: "FAA",
    category: "launch_safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "reentry_operator"],
    },
    complianceQuestion:
      "Does individual risk to any member of the public remain below 1:1,000,000?",
    evidenceRequired: [
      "Individual risk analysis",
      "Maximum exposure point identification",
    ],
    implementationGuidance: [
      "Identify maximum individual risk locations",
      "Implement protective measures if needed",
      "Consider both acute and chronic exposures",
    ],
    severity: "critical",
    licenseTypes: ["faa_launch", "faa_reentry"],
  },
  {
    id: "faa-hazard-areas",
    cfrReference: "14 CFR § 450.133",
    title: "Flight Hazard Area Requirements",
    description:
      "Licensees must establish and enforce flight hazard areas to protect the public during launch and reentry.",
    agency: "FAA",
    category: "launch_safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "reentry_operator"],
    },
    complianceQuestion:
      "Have you defined and implemented controls for all required flight hazard areas?",
    evidenceRequired: [
      "Flight hazard area analysis",
      "Hazard area maps and coordinates",
      "Public notification procedures",
      "Surveillance and clearance procedures",
    ],
    implementationGuidance: [
      "Calculate hazard areas for all mission phases",
      "Coordinate with FAA, Coast Guard, and relevant authorities",
      "Establish real-time surveillance capability",
      "Develop contingency procedures",
    ],
    severity: "critical",
    licenseTypes: ["faa_launch", "faa_reentry"],
  },
  {
    id: "faa-fts",
    cfrReference: "14 CFR § 450.145",
    title: "Flight Safety System (Flight Termination)",
    description:
      "Launch vehicles must have a flight safety system capable of terminating propulsive flight if the vehicle deviates from acceptable parameters.",
    agency: "FAA",
    category: "launch_safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator"],
    },
    complianceQuestion:
      "Does your launch vehicle have an FAA-approved flight safety system?",
    evidenceRequired: [
      "Flight safety system design documentation",
      "System qualification testing results",
      "Failure mode analysis",
      "Command and control procedures",
    ],
    implementationGuidance: [
      "Design FTS per FAA/NASA standards",
      "Conduct comprehensive qualification testing",
      "Establish redundant command links",
      "Train flight safety officers",
    ],
    severity: "critical",
    licenseTypes: ["faa_launch"],
  },
  {
    id: "faa-financial-responsibility",
    cfrReference: "14 CFR Part 440",
    title: "Financial Responsibility Requirements",
    description:
      "Licensees must obtain and maintain third-party liability insurance or demonstrate financial responsibility for potential damages.",
    agency: "FAA",
    category: "financial_responsibility",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "reentry_operator",
        "spaceport_operator",
      ],
    },
    complianceQuestion:
      "Do you have adequate financial responsibility coverage as required by FAA?",
    evidenceRequired: [
      "Insurance certificate(s)",
      "MPL determination from FAA",
      "Cross-waiver agreements",
    ],
    implementationGuidance: [
      "Request MPL determination from FAA",
      "Obtain insurance for determined amount",
      "Statutory maximum is $500M (2024)",
      "Maintain coverage through license period",
    ],
    severity: "critical",
    licenseTypes: ["faa_launch", "faa_reentry"],
    euSpaceActCrossRef: ["Art. 39", "Art. 40", "Art. 41"],
  },
  {
    id: "faa-environmental",
    cfrReference: "14 CFR § 450.35",
    title: "Environmental Review Requirements",
    description:
      "Launch license applications must include environmental documentation per NEPA requirements.",
    agency: "FAA",
    category: "environmental",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "launch_operator",
        "reentry_operator",
        "spaceport_operator",
      ],
    },
    complianceQuestion:
      "Have you completed required environmental documentation for your operations?",
    evidenceRequired: [
      "Environmental Assessment (EA) or EIS",
      "Finding of No Significant Impact (FONSI) or ROD",
      "Environmental mitigation measures",
    ],
    implementationGuidance: [
      "Prepare environmental documentation early",
      "Coordinate with FAA on scope of review",
      "Address air quality, noise, and biological impacts",
      "Consider cumulative impacts",
    ],
    severity: "major",
    licenseTypes: ["faa_launch", "faa_reentry", "faa_spaceport"],
    euSpaceActCrossRef: ["Art. 67"],
  },
  {
    id: "faa-operations-manual",
    cfrReference: "14 CFR § 450.45",
    title: "Launch Operator License Requirements - Operator Manual",
    description:
      "Licensees must maintain operations manuals covering all aspects of launch operations, safety procedures, and contingency responses.",
    agency: "FAA",
    category: "launch_safety",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["launch_operator", "reentry_operator"],
    },
    complianceQuestion:
      "Do you maintain comprehensive operations manuals for your launch/reentry activities?",
    evidenceRequired: [
      "Operations manual",
      "Safety procedures",
      "Contingency response plans",
      "Training records",
    ],
    implementationGuidance: [
      "Develop detailed operations manual",
      "Include all safety-critical procedures",
      "Establish training program",
      "Conduct regular drills and exercises",
    ],
    severity: "major",
    licenseTypes: ["faa_launch", "faa_reentry"],
  },
  {
    id: "faa-site-license",
    cfrReference: "14 CFR Part 420",
    title: "Launch Site License",
    description:
      "Operation of a launch or reentry site requires a separate FAA license demonstrating public safety protections.",
    agency: "FAA",
    category: "licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["spaceport_operator"],
    },
    complianceQuestion:
      "Do you hold a valid FAA launch site or reentry site license?",
    evidenceRequired: [
      "Site license application",
      "Site safety analysis",
      "Environmental documentation",
      "Land use agreements",
    ],
    implementationGuidance: [
      "Submit site license application separately",
      "Conduct explosive siting analysis",
      "Address public access controls",
      "Coordinate with state and local authorities",
    ],
    severity: "critical",
    licenseTypes: ["faa_spaceport"],
    euSpaceActCrossRef: ["Art. 5"],
  },
  {
    id: "faa-safety-approval",
    cfrReference: "14 CFR Part 414",
    title: "Safety Element Approval",
    description:
      "Safety-critical elements and systems may be pre-approved through the Safety Element Approval process for use across multiple licenses.",
    agency: "FAA",
    category: "launch_safety",
    bindingLevel: "recommended",
    applicability: {
      operatorTypes: ["launch_operator", "reentry_operator"],
    },
    complianceQuestion:
      "Have you obtained Safety Element Approvals for reusable safety-critical components?",
    evidenceRequired: [
      "Safety element approval application",
      "Component qualification data",
      "Configuration management documentation",
    ],
    implementationGuidance: [
      "Consider SEA for reusable elements",
      "Reduces per-launch licensing burden",
      "Maintains configuration control",
    ],
    severity: "minor",
    licenseTypes: ["faa_safety_approval"],
  },

  // ═══════════════════════════════════════════════════════════════════
  // NOAA Remote Sensing Licensing (15 CFR Part 960)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "noaa-remote-sensing-license",
    cfrReference: "15 CFR § 960.4",
    title: "Private Remote Sensing License Requirement",
    description:
      "No person may operate a private remote sensing space system without a license from NOAA/CRSRA.",
    agency: "NOAA",
    category: "remote_sensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["remote_sensing_operator", "satellite_operator"],
      activityTypes: ["earth_observation", "remote_sensing"],
      remoteSensingOnly: true,
    },
    complianceQuestion:
      "Do you hold a valid NOAA license for your remote sensing operations?",
    evidenceRequired: [
      "NOAA remote sensing license",
      "License application",
      "System capability description",
      "Data distribution plan",
    ],
    implementationGuidance: [
      "Submit application to NOAA CRSRA",
      "Allow 120 days for processing",
      "Describe imaging capabilities precisely",
      "Include data policy information",
    ],
    severity: "critical",
    licenseTypes: ["noaa_remote_sensing"],
    penalties: {
      description: "Operating without license",
      maxFine: 100000,
      perViolation: true,
    },
  },
  {
    id: "noaa-tier-classification",
    cfrReference: "15 CFR § 960.6",
    title: "System Tier Classification",
    description:
      "Remote sensing systems are classified into three tiers based on capabilities, with different license conditions for each tier.",
    agency: "NOAA",
    category: "remote_sensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["remote_sensing_operator"],
      remoteSensingOnly: true,
    },
    complianceQuestion:
      "Has your remote sensing system been classified into the appropriate tier?",
    evidenceRequired: [
      "System capability documentation",
      "NOAA tier determination",
      "Tier-specific compliance documentation",
    ],
    implementationGuidance: [
      "Tier 1: Unenhanced data, minimal restrictions",
      "Tier 2: Enhanced capabilities, operational restrictions possible",
      "Tier 3: Advanced capabilities, may require specific conditions",
      "Tier classification drives license conditions",
    ],
    severity: "major",
    licenseTypes: ["noaa_remote_sensing"],
  },
  {
    id: "noaa-data-distribution",
    cfrReference: "15 CFR § 960.8",
    title: "Data Distribution Requirements",
    description:
      "Licensees must comply with any conditions on distribution of remote sensing data, particularly for higher-tier systems.",
    agency: "NOAA",
    category: "remote_sensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["remote_sensing_operator"],
      remoteSensingOnly: true,
    },
    complianceQuestion:
      "Do your data distribution practices comply with NOAA license conditions?",
    evidenceRequired: [
      "Data distribution policy",
      "Customer vetting procedures (if required)",
      "Data handling procedures",
    ],
    implementationGuidance: [
      "Review license conditions on data distribution",
      "Implement required data handling procedures",
      "Maintain records of data distribution",
    ],
    severity: "major",
    licenseTypes: ["noaa_remote_sensing"],
  },
  {
    id: "noaa-operations-reporting",
    cfrReference: "15 CFR § 960.10",
    title: "Operations and Reporting Requirements",
    description:
      "Licensees must notify NOAA of significant events, maintain operational records, and allow inspections.",
    agency: "NOAA",
    category: "reporting",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["remote_sensing_operator"],
      remoteSensingOnly: true,
    },
    complianceQuestion:
      "Do you maintain required operational records and comply with reporting requirements?",
    evidenceRequired: [
      "Operational logs",
      "Event notification records",
      "Annual reports",
    ],
    implementationGuidance: [
      "Report significant events within required timeframes",
      "Maintain operational records",
      "Prepare annual status reports",
      "Facilitate any NOAA inspections",
    ],
    severity: "major",
    licenseTypes: ["noaa_remote_sensing"],
  },
  {
    id: "noaa-foreign-agreements",
    cfrReference: "15 CFR § 960.9",
    title: "Foreign Agreement Notifications",
    description:
      "Licensees must notify NOAA of significant agreements with foreign entities and comply with any resulting conditions.",
    agency: "NOAA",
    category: "national_security",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["remote_sensing_operator"],
      remoteSensingOnly: true,
    },
    complianceQuestion:
      "Have you notified NOAA of all significant foreign agreements?",
    evidenceRequired: [
      "Foreign agreement notifications",
      "NOAA acknowledgments",
      "Compliance with any additional conditions",
    ],
    implementationGuidance: [
      "Notify NOAA before entering significant foreign agreements",
      "Allow time for NOAA review",
      "Comply with any conditions imposed",
    ],
    severity: "critical",
    licenseTypes: ["noaa_remote_sensing"],
  },
  {
    id: "noaa-shutter-control",
    cfrReference: "15 CFR § 960.11",
    title: "Shutter Control Authority",
    description:
      "The US Government retains authority to limit collection and/or distribution during periods affecting national security or foreign policy.",
    agency: "NOAA",
    category: "national_security",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["remote_sensing_operator"],
      remoteSensingOnly: true,
    },
    complianceQuestion:
      "Do you have procedures to comply with shutter control directives if issued?",
    evidenceRequired: [
      "Shutter control compliance procedures",
      "Communication protocols with NOAA",
      "System capability for compliance",
    ],
    implementationGuidance: [
      "Design system to respond to control directives",
      "Establish 24/7 communication capability",
      "Train operators on procedures",
      "Note: Shutter control rarely invoked",
    ],
    severity: "critical",
    licenseTypes: ["noaa_remote_sensing"],
  },

  // ═══════════════════════════════════════════════════════════════════
  // ORBITS Act 2025 - Uniform Debris Standards
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "orbits-uniform-standards",
    cfrReference: "ORBITS Act § 3",
    title: "Uniform Orbital Debris Standards",
    description:
      "The ORBITS Act of 2025 requires agencies to apply consistent orbital debris mitigation standards across FCC, FAA, and NOAA licenses.",
    agency: "FCC",
    category: "orbital_debris",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "satellite_operator",
        "launch_operator",
        "remote_sensing_operator",
      ],
    },
    complianceQuestion:
      "Does your debris mitigation approach comply with ORBITS Act uniform standards?",
    evidenceRequired: [
      "Unified debris mitigation plan",
      "Cross-agency compliance documentation",
    ],
    implementationGuidance: [
      "Prepare single debris mitigation plan for all agencies",
      "Ensure consistency across FCC and FAA requirements",
      "Reference NASA Orbital Debris Mitigation Standard Practices",
      "Monitor implementation regulations",
    ],
    severity: "major",
    licenseTypes: ["fcc_space_station", "faa_launch", "noaa_remote_sensing"],
    euSpaceActCrossRef: ["Art. 67", "Art. 72"],
    copuosCrossRef: ["LTS-18", "LTS-19", "IADC"],
  },
  {
    id: "orbits-inter-agency-coordination",
    cfrReference: "ORBITS Act § 4",
    title: "Inter-Agency Coordination",
    description:
      "Agencies must coordinate on debris requirements and avoid conflicting conditions across licenses.",
    agency: "FAA",
    category: "coordination",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "launch_operator"],
    },
    complianceQuestion:
      "Have you engaged with all relevant agencies on debris mitigation requirements?",
    evidenceRequired: [
      "Agency coordination documentation",
      "Consistent debris plans across applications",
    ],
    implementationGuidance: [
      "Submit consistent debris plans to all agencies",
      "Reference same technical standards",
      "Address any agency-specific requirements",
    ],
    severity: "major",
    licenseTypes: ["fcc_space_station", "faa_launch"],
  },
  {
    id: "orbits-5year-alignment",
    cfrReference: "ORBITS Act § 5",
    title: "5-Year Rule Alignment",
    description:
      "The ORBITS Act codifies the FCC 5-year deorbit rule and requires FAA/NOAA alignment for LEO operations.",
    agency: "FCC",
    category: "orbital_debris",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator"],
      leoOnly: true,
    },
    complianceQuestion:
      "Does your LEO mission comply with the ORBITS Act 5-year disposal alignment?",
    evidenceRequired: [
      "5-year disposal compliance across all licenses",
      "Unified disposal plan",
    ],
    implementationGuidance: [
      "Design for 5-year post-mission disposal",
      "Include in all agency applications",
      "Monitor regulatory implementation",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station", "faa_launch"],
    copuosCrossRef: ["LTS-19"],
  },

  // ═══════════════════════════════════════════════════════════════════
  // Additional Cross-Cutting Requirements
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "us-registration-requirement",
    cfrReference: "51 USC § 50112",
    title: "US Registry of Space Objects",
    description:
      "Space objects launched from the United States or by US persons must be registered with the US registry maintained by DoD.",
    agency: "FAA",
    category: "licensing",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "launch_operator"],
    },
    complianceQuestion:
      "Is your space object registered in the US Registry of Space Objects?",
    evidenceRequired: [
      "Registration documentation",
      "NORAD catalog number",
      "International designator",
    ],
    implementationGuidance: [
      "FAA coordinates registration for licensed launches",
      "Ensure data provided to 18th SDS",
      "Update registration for status changes",
    ],
    severity: "major",
    licenseTypes: ["fcc_space_station", "faa_launch"],
    euSpaceActCrossRef: ["Art. 52", "Art. 53"],
    copuosCrossRef: ["LTS-1"],
  },
  {
    id: "us-export-control",
    cfrReference: "22 CFR Part 121 / 15 CFR Part 774",
    title: "Export Control Compliance (ITAR/EAR)",
    description:
      "Space systems and components are subject to US export controls. Compliance with ITAR and EAR is required for international activities.",
    agency: "FAA",
    category: "national_security",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: [
        "satellite_operator",
        "launch_operator",
        "remote_sensing_operator",
      ],
    },
    complianceQuestion:
      "Do you maintain compliance with applicable export control requirements (ITAR/EAR)?",
    evidenceRequired: [
      "Export control classification",
      "Technology control plan",
      "Export licenses (if applicable)",
      "Compliance program documentation",
    ],
    implementationGuidance: [
      "Classify all items per USML/CCL",
      "Obtain required export licenses",
      "Implement technology control procedures",
      "Train employees on export compliance",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station", "faa_launch", "noaa_remote_sensing"],
    penalties: {
      description: "Export control violations",
      maxFine: 1000000,
      perViolation: true,
    },
  },
  {
    id: "us-ssa-sharing",
    cfrReference: "10 USC § 2274",
    title: "Space Situational Awareness Data Sharing",
    description:
      "Operators should establish SSA data sharing agreements with 18th Space Defense Squadron for conjunction warnings and catalog maintenance.",
    agency: "FAA",
    category: "coordination",
    bindingLevel: "recommended",
    applicability: {
      operatorTypes: ["satellite_operator"],
    },
    complianceQuestion:
      "Do you have an SSA data sharing agreement with 18th Space Defense Squadron?",
    evidenceRequired: [
      "18 SDS sharing agreement",
      "Ephemeris sharing procedures",
      "Conjunction screening service enrollment",
    ],
    implementationGuidance: [
      "Register at space-track.org",
      "Establish conjunction services agreement",
      "Share precise ephemerides for conjunction screening",
      "Consider commercial SSA providers for enhanced service",
    ],
    severity: "major",
    licenseTypes: ["fcc_space_station", "faa_launch"],
    euSpaceActCrossRef: ["Art. 70", "Art. 71"],
    copuosCrossRef: ["LTS-16", "LTS-17"],
  },
  {
    id: "us-spectrum-authorization",
    cfrReference: "47 USC § 301",
    title: "Spectrum Authorization Requirement",
    description:
      "All radio frequency transmissions from space stations require FCC authorization or coordination.",
    agency: "FCC",
    category: "spectrum",
    bindingLevel: "mandatory",
    applicability: {
      operatorTypes: ["satellite_operator", "spectrum_user"],
    },
    complianceQuestion:
      "Do you have FCC authorization for all RF transmissions from your space station?",
    evidenceRequired: [
      "FCC space station license with frequency authorization",
      "Frequency coordination documentation",
    ],
    implementationGuidance: [
      "Include all frequencies in license application",
      "Complete ITU coordination for international frequencies",
      "Maintain authorization current",
    ],
    severity: "critical",
    licenseTypes: ["fcc_space_station", "fcc_spectrum"],
    penalties: {
      description: "Unauthorized spectrum use",
      maxFine: 100000,
      perViolation: true,
    },
  },
];

// ─── US-EU Regulatory Comparison ───

export const usEuComparisons: UsEuComparison[] = [
  {
    usRequirement: "FCC Space Station License (47 CFR Part 25)",
    euEquivalent: "EU Space Act Art. 4-8 Authorization",
    comparisonNotes:
      "Both require authorization for satellite operations. FCC process more spectrum-focused; EU framework broader in scope.",
    harmonizationStatus: "partial",
  },
  {
    usRequirement: "FCC 5-Year Deorbit Rule (47 CFR § 25.114)",
    euEquivalent: "EU Space Act Art. 72 (25-year rule)",
    comparisonNotes:
      "FCC adopted stricter 5-year rule in 2024; EU Space Act maintains 25-year standard. US rule sets global precedent.",
    harmonizationStatus: "divergent",
  },
  {
    usRequirement: "FAA Launch License (14 CFR Part 450)",
    euEquivalent: "EU Space Act Art. 4-6 + National Laws",
    comparisonNotes:
      "FAA provides single federal authority; EU relies on member state national space laws with EU coordination.",
    harmonizationStatus: "partial",
  },
  {
    usRequirement: "FAA Financial Responsibility (14 CFR Part 440)",
    euEquivalent: "EU Space Act Art. 39-41 Insurance",
    comparisonNotes:
      "Both require third-party liability coverage. US statutory cap at $500M; EU allows national variation.",
    harmonizationStatus: "partial",
  },
  {
    usRequirement: "NOAA Remote Sensing License (15 CFR Part 960)",
    euEquivalent: "EU Space Act Art. 16-19 (COPERNICUS)",
    comparisonNotes:
      "US regulates commercial remote sensing specifically; EU integrates into broader Copernicus/space data framework.",
    harmonizationStatus: "partial",
  },
  {
    usRequirement: "FCC Debris Mitigation (47 CFR § 25.114(d)(14))",
    euEquivalent: "EU Space Act Art. 67 Debris Mitigation",
    comparisonNotes:
      "Both require debris mitigation plans. Requirements largely aligned with IADC/ISO standards.",
    harmonizationStatus: "aligned",
  },
  {
    usRequirement: "US Registry of Space Objects (51 USC § 50112)",
    euEquivalent: "EU Space Act Art. 52-54 Registration",
    comparisonNotes:
      "Both implement Registration Convention. US registers via DoD; EU through member state registries.",
    harmonizationStatus: "aligned",
  },
  {
    usRequirement: "ITAR/EAR Export Controls",
    euEquivalent: "EU Dual-Use Regulation",
    comparisonNotes:
      "Significant divergence. US ITAR more restrictive for space items; EU unified dual-use approach.",
    harmonizationStatus: "divergent",
  },
];

// ─── Helper Functions ───

export function getAgencyRequirements(agency: UsAgency): UsRequirement[] {
  return usSpaceRequirements.filter((r) => r.agency === agency);
}

export function getRequirementsByCategory(
  category: UsRequirementCategory,
): UsRequirement[] {
  return usSpaceRequirements.filter((r) => r.category === category);
}

export function getRequirementsByLicenseType(
  licenseType: UsLicenseType,
): UsRequirement[] {
  return usSpaceRequirements.filter((r) =>
    r.licenseTypes.includes(licenseType),
  );
}

export function getApplicableRequirements(
  profile: UsOperatorProfile,
): UsRequirement[] {
  return usSpaceRequirements.filter((req) => {
    const app = req.applicability;

    // Check operator types
    if (
      app.operatorTypes &&
      !profile.operatorTypes.some((ot) => app.operatorTypes!.includes(ot))
    ) {
      return false;
    }

    // Check activity types
    if (
      app.activityTypes &&
      !profile.activityTypes.some((at) => app.activityTypes!.includes(at))
    ) {
      return false;
    }

    // Check agencies
    if (
      app.agencies &&
      !profile.agencies.some((a) => app.agencies!.includes(a))
    ) {
      return false;
    }

    // Check orbit regimes
    if (
      app.orbitRegimes &&
      profile.orbitRegime &&
      !app.orbitRegimes.includes(profile.orbitRegime)
    ) {
      return false;
    }

    // Check NGSO-only requirements
    if (app.ngsOnly && !profile.isNGSO) {
      return false;
    }

    // Check LEO-only requirements
    if (app.leoOnly && profile.orbitRegime !== "LEO") {
      return false;
    }

    // Check constellation-only requirements
    if (app.constellationOnly && !profile.isConstellation) {
      return false;
    }

    // Check remote sensing requirements
    if (app.remoteSensingOnly && !profile.providesRemoteSensing) {
      return false;
    }

    return true;
  });
}

export function determineRequiredAgencies(
  profile: UsOperatorProfile,
): UsAgency[] {
  const agencies = new Set<UsAgency>();

  for (const opType of profile.operatorTypes) {
    const config = operatorTypeConfig[opType];
    if (config) {
      config.agencies.forEach((a) => agencies.add(a));
    }
  }

  // Remote sensing always requires NOAA
  if (profile.providesRemoteSensing) {
    agencies.add("NOAA");
  }

  return Array.from(agencies);
}

export function determineRequiredLicenses(
  profile: UsOperatorProfile,
): UsLicenseType[] {
  const licenses = new Set<UsLicenseType>();

  // FCC licenses for satellite/spectrum operators
  if (
    profile.operatorTypes.includes("satellite_operator") ||
    profile.operatorTypes.includes("spectrum_user")
  ) {
    licenses.add("fcc_space_station");
    licenses.add("fcc_spectrum");
  }

  // FAA licenses for launch/reentry operators
  if (profile.operatorTypes.includes("launch_operator")) {
    licenses.add("faa_launch");
  }
  if (profile.operatorTypes.includes("reentry_operator")) {
    licenses.add("faa_reentry");
  }
  if (profile.operatorTypes.includes("spaceport_operator")) {
    licenses.add("faa_spaceport");
  }

  // NOAA license for remote sensing
  if (
    profile.operatorTypes.includes("remote_sensing_operator") ||
    profile.providesRemoteSensing
  ) {
    licenses.add("noaa_remote_sensing");
  }

  return Array.from(licenses);
}

export function getMandatoryRequirements(): UsRequirement[] {
  return usSpaceRequirements.filter((r) => r.bindingLevel === "mandatory");
}

export function getCriticalRequirements(): UsRequirement[] {
  return usSpaceRequirements.filter((r) => r.severity === "critical");
}

export function getRequirementsWithEuCrossRef(): UsRequirement[] {
  return usSpaceRequirements.filter(
    (r) => r.euSpaceActCrossRef && r.euSpaceActCrossRef.length > 0,
  );
}

export function getRequirementsWithCopuosCrossRef(): UsRequirement[] {
  return usSpaceRequirements.filter(
    (r) => r.copuosCrossRef && r.copuosCrossRef.length > 0,
  );
}

export function getUsEuComparison(
  usRequirementRef: string,
): UsEuComparison | undefined {
  return usEuComparisons.find((c) =>
    c.usRequirement.toLowerCase().includes(usRequirementRef.toLowerCase()),
  );
}

/**
 * Calculate deorbit timeline for LEO satellite
 * Returns years remaining before required disposal
 */
export function calculateDeorbitDeadline(
  launchDate: Date,
  missionDurationYears: number,
  isLeo: boolean,
): {
  endOfMissionDate: Date;
  disposalDeadline: Date;
  yearsRemaining: number;
  compliant: boolean;
} {
  const now = new Date();
  const endOfMissionDate = new Date(launchDate);
  endOfMissionDate.setFullYear(
    endOfMissionDate.getFullYear() + missionDurationYears,
  );

  // FCC 5-year rule for LEO, 25-year for others
  const disposalYears = isLeo ? 5 : 25;
  const disposalDeadline = new Date(endOfMissionDate);
  disposalDeadline.setFullYear(disposalDeadline.getFullYear() + disposalYears);

  const yearsRemaining =
    (disposalDeadline.getTime() - now.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  return {
    endOfMissionDate,
    disposalDeadline,
    yearsRemaining,
    compliant: yearsRemaining > 0,
  };
}

// Export all requirements
export const allUsSpaceRequirements = usSpaceRequirements;
