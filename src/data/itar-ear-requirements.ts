/**
 * ITAR/EAR Export Control Requirements Data
 *
 * IMPORTANT LEGAL DISCLAIMER:
 * This module is for COMPLIANCE TRACKING AND EDUCATIONAL PURPOSES ONLY.
 * It does NOT constitute legal advice and should NOT be relied upon for
 * export control compliance decisions. Violations of ITAR and EAR can result
 * in criminal penalties including imprisonment up to 20 years and fines up
 * to $1,000,000 per violation. ALWAYS consult with qualified export control
 * counsel and/or the appropriate government agencies (DDTC, BIS) before
 * making any export control decisions.
 *
 * Sources:
 * - International Traffic in Arms Regulations (ITAR): 22 CFR 120-130
 * - Export Administration Regulations (EAR): 15 CFR 730-774
 * - U.S. Munitions List (USML): 22 CFR 121
 * - Commerce Control List (CCL): 15 CFR 774, Supplement No. 1
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ExportControlRegulation = "ITAR" | "EAR";

export type ITARCategory =
  | "USML_IV" // Launch Vehicles, Guided Missiles, Ballistic Vehicles
  | "USML_XV" // Spacecraft and Related Articles
  | "USML_XI" // Military Electronics
  | "USML_XII" // Fire Control, Laser, Imaging, Guidance Equipment
  | "USML_XVI"; // Nuclear Weapons Related Articles

export type EARCategory =
  | "CCL_9A" // Aerospace and Propulsion
  | "CCL_9B" // Aerospace Test, Inspection, Production Equipment
  | "CCL_9D" // Aerospace Software
  | "CCL_9E" // Aerospace Technology
  | "CCL_3A" // Electronics
  | "CCL_5A" // Telecommunications
  | "EAR99"; // Items not on CCL but subject to EAR

export type LicenseType =
  // ITAR License Types
  | "DSP_5" // Permanent export of unclassified defense articles
  | "DSP_73" // Temporary export of unclassified defense articles
  | "DSP_61" // Temporary import of unclassified defense articles
  | "DSP_85" // Re-export/retransfer
  | "TAA" // Technical Assistance Agreement
  | "MLA" // Manufacturing License Agreement
  | "WDA" // Warehouse and Distribution Agreement
  // EAR License Types
  | "BIS_LICENSE"
  | "LICENSE_EXCEPTION";

export type LicenseException =
  | "TMP" // Temporary Exports
  | "RPL" // Servicing and Replacement of Parts
  | "GOV" // Government, International Organizations
  | "TSR" // Technology and Software Unrestricted
  | "BAG" // Baggage
  | "AVS" // Aircraft, Vessels, Spacecraft
  | "APR" // Additional Permissive Reexports
  | "STA" // Strategic Trade Authorization
  | "LVS" // Limited Value Shipments
  | "ENC" // Encryption Items
  | "NLR"; // No License Required

export type DeniedPartyList =
  | "SDN" // Specially Designated Nationals (OFAC)
  | "ENTITY_LIST" // BIS Entity List
  | "DPL" // Denied Persons List (BIS)
  | "UNVERIFIED" // Unverified List (BIS)
  | "DEBARRED" // ITAR Debarred Parties (DDTC)
  | "ISN"; // Nonproliferation Sanctions;

export type RiskLevel = "critical" | "high" | "medium" | "low";

export type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

export type JurisdictionDetermination =
  | "itar_only" // Clearly ITAR-controlled
  | "ear_only" // Clearly EAR-controlled
  | "dual_use" // Could be either, needs CJ request
  | "itar_with_ear_parts" // ITAR item with EAR components
  | "ear99"; // Commercial, not controlled

// ============================================================================
// REQUIREMENT INTERFACES
// ============================================================================

export interface ExportControlRequirement {
  id: string;
  title: string;
  description: string;
  regulation: ExportControlRegulation;
  category:
    | ITARCategory
    | EARCategory
    | "GENERAL"
    | "SCREENING"
    | "DEEMED_EXPORT";
  cfrReference: string;
  riskLevel: RiskLevel;
  isMandatory: boolean;
  applicableTo: ExportControlApplicability[];
  penaltyInfo: PenaltyInfo;
  complianceActions: string[];
  documentationRequired: string[];
  relatedRequirements?: string[];
  euEquivalent?: string;
}

export interface PenaltyInfo {
  maxCivilPenalty: number;
  maxCriminalPenalty: number;
  maxImprisonment: number; // in years
  additionalConsequences: string[];
}

export type ExportControlApplicability =
  | "spacecraft_manufacturer"
  | "satellite_operator"
  | "launch_provider"
  | "component_supplier"
  | "software_developer"
  | "technology_provider"
  | "defense_contractor"
  | "research_institution"
  | "university"
  | "foreign_subsidiary"
  | "all";

export interface DeemedExportRule {
  id: string;
  title: string;
  description: string;
  regulation: ExportControlRegulation;
  cfrReference: string;
  riskLevel: RiskLevel;
  applicableScenarios: string[];
  exemptions: string[];
  requiredActions: string[];
}

export interface ScreeningRequirement {
  id: string;
  listName: string;
  listCode: DeniedPartyList;
  managingAgency: string;
  description: string;
  updateFrequency: string;
  screeningRequired: "all_transactions" | "export_only" | "financial_only";
  consequences: string[];
}

export interface USMLCategoryDetail {
  category: ITARCategory;
  romanNumeral: string;
  title: string;
  description: string;
  keyArticles: string[];
  relatedECCNs: string[];
  commonItems: string[];
  technicalDataCovered: string[];
  defensiveServices: string[];
}

export interface CCLCategoryDetail {
  category: EARCategory;
  eccnPrefix: string;
  title: string;
  description: string;
  controlReasons: string[];
  keyItems: string[];
  licenseExceptions: LicenseException[];
  deControlNotes?: string;
}

export interface ExportControlProfile {
  companyType: ExportControlApplicability[];
  hasITARItems: boolean;
  hasEARItems: boolean;
  hasForeignNationals: boolean;
  foreignNationalCountries?: string[];
  exportsToCountries: string[];
  hasTechnologyTransfer: boolean;
  hasDefenseContracts: boolean;
  hasManufacturingAbroad: boolean;
  hasJointVentures: boolean;
  annualExportValue?: number;
  registeredWithDDTC: boolean;
  hasTCP: boolean; // Technology Control Plan
  hasECL: boolean; // Export Control Licensing
}

export interface ExportControlAssessmentResult {
  overallRisk: RiskLevel;
  jurisdictionDetermination: JurisdictionDetermination;
  requiredRegistrations: string[];
  requiredLicenses: LicenseType[];
  applicableRequirements: ExportControlRequirement[];
  screeningRequired: ScreeningRequirement[];
  deemedExportRisks: DeemedExportRule[];
  gapAnalysis: ExportControlGap[];
  recommendations: ExportControlRecommendation[];
  complianceScore: number;
}

export interface ExportControlGap {
  requirementId: string;
  requirement: string;
  gap: string;
  riskLevel: RiskLevel;
  regulation: ExportControlRegulation;
  recommendation: string;
  estimatedEffort: "days" | "weeks" | "months";
  potentialPenalty: string;
}

export interface ExportControlRecommendation {
  priority: number;
  title: string;
  description: string;
  category:
    | "registration"
    | "licensing"
    | "screening"
    | "training"
    | "tcp"
    | "documentation"
    | "audit";
  timeframe: string;
  resources?: string[];
}

// ============================================================================
// USML CATEGORY DETAILS (Space-Relevant)
// ============================================================================

export const usmlCategories: USMLCategoryDetail[] = [
  {
    category: "USML_IV",
    romanNumeral: "IV",
    title:
      "Launch Vehicles, Guided Missiles, Ballistic Missiles, Rockets, Torpedoes, Bombs, and Mines",
    description:
      "Covers launch vehicles, space launch vehicles (SLVs), sounding rockets, and related articles, components, and technical data. This category includes virtually all items specifically designed for launch vehicle applications.",
    keyArticles: [
      "(a) Launch vehicles, missiles, and rockets",
      "(b) Launch vehicle powerplants and propulsion systems",
      "(c) Individual rocket stages",
      "(d) Reentry vehicles and warheads",
      "(e) Safing, arming, fuzing components",
      "(f) Ground support equipment for (a)",
      "(g) Launch vehicle structural components",
      "(h) Technical data and defense services",
    ],
    relatedECCNs: ["9A004", "9A104", "9A005", "9A105", "9A006", "9A106"],
    commonItems: [
      "Complete launch vehicles",
      "Launch vehicle stages",
      "Solid and liquid rocket motors",
      "Guidance systems for launch vehicles",
      "Thrust vector control systems",
      "Staging mechanisms",
      "Payload fairings designed for LVs",
      "Launch vehicle structural components",
    ],
    technicalDataCovered: [
      "Launch vehicle design data",
      "Propulsion system specifications",
      "Guidance and navigation algorithms",
      "Mission planning software",
      "Test and evaluation procedures",
      "Manufacturing processes",
    ],
    defensiveServices: [
      "Launch vehicle integration support",
      "Launch operations assistance",
      "Mission analysis services",
      "Systems engineering support",
      "Training on LV operations",
    ],
  },
  {
    category: "USML_XV",
    romanNumeral: "XV",
    title: "Spacecraft and Related Articles",
    description:
      "Covers spacecraft, including communications satellites, remote sensing satellites, and scientific satellites, as well as specifically designed components, parts, accessories, attachments, and associated equipment. Note: Many commercial communications satellites were moved to EAR in 2014-2017 reforms.",
    keyArticles: [
      "(a) Spacecraft and satellites for military, intelligence, or dual-use applications",
      "(b) Ground control stations specifically designed for defense articles in (a)",
      "(c) GPS receivers with military-grade accuracy",
      "(d) Radiation-hardened microelectronics for (a)",
      "(e) Specifically designed components for (a)",
      "(f) Technical data and defense services",
    ],
    relatedECCNs: ["9A515", "9A004", "9D515", "9E515", "3A001", "5A001"],
    commonItems: [
      "Military satellites",
      "Intelligence/surveillance satellites",
      "Satellite buses designed for USML payloads",
      "Satellite propulsion systems for (a)",
      "Star trackers for (a)",
      "Radiation-hardened components for (a)",
      "Encrypted command and control systems",
      "Advanced imaging payloads",
    ],
    technicalDataCovered: [
      "Satellite design and specifications",
      "Orbital mechanics calculations",
      "Command and control protocols",
      "Encryption specifications",
      "Radiation hardening specifications",
      "Ground station designs",
    ],
    defensiveServices: [
      "Satellite integration services",
      "Orbital operations support",
      "Anomaly resolution assistance",
      "Systems engineering for defense satellites",
      "Training on satellite operations",
    ],
  },
  {
    category: "USML_XI",
    romanNumeral: "XI",
    title: "Military Electronics",
    description:
      "Electronics specifically designed or modified for military applications, including certain space-qualified electronics.",
    keyArticles: [
      "(a) Countermeasure and counter-countermeasure equipment",
      "(b) Underwater sound projecting equipment",
      "(c) Acoustic systems, equipment, and components",
      "(d) Electronic warfare equipment",
    ],
    relatedECCNs: ["3A001", "3A002", "5A001", "5A002"],
    commonItems: [
      "Military-grade signal processors",
      "Electronic countermeasure systems",
      "Jamming equipment",
      "Direction finding equipment",
    ],
    technicalDataCovered: [
      "Circuit designs",
      "Signal processing algorithms",
      "Electromagnetic warfare specifications",
    ],
    defensiveServices: [
      "Electronic warfare support",
      "Signal intelligence assistance",
      "Integration services",
    ],
  },
  {
    category: "USML_XII",
    romanNumeral: "XII",
    title: "Fire Control, Laser, Imaging, and Guidance Equipment",
    description:
      "Fire control, range finder, optical and guidance systems with military applications, including space-based sensors.",
    keyArticles: [
      "(a) Fire control systems",
      "(b) Range finders, optical targeting systems",
      "(c) Lasers for military applications",
      "(d) Imaging systems for surveillance/reconnaissance",
      "(e) Guidance and navigation equipment",
    ],
    relatedECCNs: ["6A002", "6A004", "6A008", "7A003", "7A103"],
    commonItems: [
      "Military-grade imaging sensors",
      "Targeting systems",
      "Laser range finders",
      "Inertial navigation units for munitions",
    ],
    technicalDataCovered: [
      "Sensor specifications",
      "Targeting algorithms",
      "Guidance system designs",
    ],
    defensiveServices: [
      "Sensor integration",
      "Targeting system support",
      "Calibration services",
    ],
  },
  {
    category: "USML_XVI",
    romanNumeral: "XVI",
    title: "Nuclear Weapons Related Articles",
    description:
      "Articles, technical data, and defense services specifically designed or modified for nuclear weapons and nuclear weapons effects testing.",
    keyArticles: [
      "(a) Nuclear weapons design and testing articles",
      "(b) Weapons effects simulation",
      "(c) Safing, arming, and fuzing for nuclear weapons",
    ],
    relatedECCNs: ["0A001", "0B001"],
    commonItems: [
      "Nuclear weapon design equipment",
      "Weapons effects simulators",
      "Nuclear safing devices",
    ],
    technicalDataCovered: [
      "Nuclear device specifications",
      "Weapons effects data",
      "Safety mechanisms",
    ],
    defensiveServices: ["Nuclear stockpile support", "Effects testing support"],
  },
];

// ============================================================================
// CCL CATEGORY DETAILS (Space-Relevant)
// ============================================================================

export const cclCategories: CCLCategoryDetail[] = [
  {
    category: "CCL_9A",
    eccnPrefix: "9A",
    title: "Aerospace and Propulsion - Equipment, Assemblies, and Components",
    description:
      "Spacecraft, launch vehicles, and related equipment not controlled under ITAR. Includes commercial communications satellites and their components.",
    controlReasons: [
      "National Security (NS)",
      "Missile Technology (MT)",
      "Regional Stability (RS)",
      "Anti-terrorism (AT)",
    ],
    keyItems: [
      "9A515 - Spacecraft (non-ITAR)",
      "9A004 - Space launch vehicles",
      "9A005 - Liquid rocket propulsion systems",
      "9A006 - Spacecraft systems and components",
      "9A007 - Guidance systems",
      "9A008 - Turboprop engines",
    ],
    licenseExceptions: ["TMP", "RPL", "GOV", "STA"],
    deControlNotes:
      "Commercial communications satellites transferred from USML to CCL in 2014-2017 reforms. Most now under 9A515.",
  },
  {
    category: "CCL_9B",
    eccnPrefix: "9B",
    title:
      "Aerospace and Propulsion - Test, Inspection, and Production Equipment",
    description:
      "Equipment for testing, inspecting, and producing aerospace articles.",
    controlReasons: ["National Security (NS)", "Missile Technology (MT)"],
    keyItems: [
      "9B001 - Production equipment for gas turbine engines",
      "9B002 - Environmental and anechoic chambers",
      "9B003 - Dimensional inspection machines",
      "9B004 - Rocket motor test equipment",
      "9B005 - Vibration test systems",
      "9B006 - Acoustic test equipment",
    ],
    licenseExceptions: ["TMP", "RPL", "GOV"],
  },
  {
    category: "CCL_9D",
    eccnPrefix: "9D",
    title: "Aerospace and Propulsion - Software",
    description:
      "Software for development, production, or use of aerospace articles.",
    controlReasons: ["National Security (NS)", "Missile Technology (MT)"],
    keyItems: [
      "9D001 - Software for FADEC systems",
      "9D002 - Software for hot section repair",
      "9D003 - Software specially designed for propulsion",
      "9D004 - Software for spacecraft control",
      "9D515 - Software for 9A515 spacecraft",
    ],
    licenseExceptions: ["TSR", "GOV"],
  },
  {
    category: "CCL_9E",
    eccnPrefix: "9E",
    title: "Aerospace and Propulsion - Technology",
    description:
      "Technology for development, production, or use of aerospace articles.",
    controlReasons: ["National Security (NS)", "Missile Technology (MT)"],
    keyItems: [
      "9E001 - Technology for gas turbine engines",
      "9E002 - Technology for thermal barrier coatings",
      "9E003 - Specific aerospace technologies",
      "9E515 - Technology for 9A515 spacecraft",
    ],
    licenseExceptions: ["TSR", "GOV"],
  },
  {
    category: "CCL_3A",
    eccnPrefix: "3A",
    title: "Electronics - Equipment, Assemblies, and Components",
    description:
      "Electronic components relevant to space applications including radiation-hardened parts.",
    controlReasons: [
      "National Security (NS)",
      "Missile Technology (MT)",
      "Nuclear Nonproliferation (NP)",
    ],
    keyItems: [
      "3A001 - Electronic components",
      "3A002 - General purpose electronic equipment",
      "3A003 - Spray cooling thermal management",
      "3A611 - Radiation-hardened electronics",
    ],
    licenseExceptions: ["TMP", "RPL", "GOV", "TSR", "STA"],
  },
  {
    category: "CCL_5A",
    eccnPrefix: "5A",
    title: "Telecommunications and Information Security - Equipment",
    description:
      "Telecommunications equipment including satellite communications systems.",
    controlReasons: [
      "National Security (NS)",
      "Anti-terrorism (AT)",
      "Encryption Items (EI)",
    ],
    keyItems: [
      "5A001 - Telecommunications equipment",
      "5A002 - Information security equipment",
      "5A003 - ECCM equipment",
      "5A004 - Cryptographic activation equipment",
    ],
    licenseExceptions: ["TMP", "RPL", "GOV", "ENC", "TSR"],
  },
  {
    category: "EAR99",
    eccnPrefix: "EAR99",
    title: "Items Subject to EAR but Not Listed on CCL",
    description:
      "Commercial items subject to the Export Administration Regulations but not specifically listed on the Commerce Control List. Generally lowest control level.",
    controlReasons: ["Anti-terrorism (AT) - for all destinations"],
    keyItems: [
      "Commercial electronic components",
      "Standard commercial software",
      "Non-controlled aerospace parts",
      "General purpose test equipment",
    ],
    licenseExceptions: ["NLR"],
    deControlNotes:
      "EAR99 items generally can be exported without a license except to embargoed countries, denied parties, or for prohibited end-uses.",
  },
];

// ============================================================================
// EXPORT CONTROL REQUIREMENTS
// ============================================================================

export const exportControlRequirements: ExportControlRequirement[] = [
  // ============================================================================
  // ITAR REGISTRATION AND LICENSING
  // ============================================================================
  {
    id: "ITAR-REG-001",
    title: "DDTC Registration Requirement",
    description:
      "Any U.S. person who engages in the business of manufacturing, exporting, or brokering defense articles or defense services must register with the Directorate of Defense Trade Controls (DDTC).",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 122.1",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "launch_provider",
      "component_supplier",
      "defense_contractor",
    ],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Debarment from government contracts",
        "Denial of export privileges",
        "Loss of security clearances",
        "Reputational damage",
      ],
    },
    complianceActions: [
      "Submit SF-328 (DDTC Registration Statement)",
      "Pay registration fee (tiered based on activities)",
      "Renew annually",
      "Update within 60 days of material changes",
      "Designate empowered official",
    ],
    documentationRequired: [
      "DDTC Registration Certificate",
      "Empowered Official designation letter",
      "Corporate ownership disclosure",
      "Foreign ownership/control documentation",
    ],
    relatedRequirements: ["ITAR-LIC-001", "ITAR-TAA-001"],
    euEquivalent: "Dual-Use Regulation (EU) 2021/821 registration requirements",
  },
  {
    id: "ITAR-LIC-001",
    title: "DSP-5 Export License Requirement",
    description:
      "Permanent export of unclassified defense articles requires a DSP-5 license from DDTC. This includes spacecraft, components, and technical data controlled under USML Categories IV and XV.",
    regulation: "ITAR",
    category: "USML_XV",
    cfrReference: "22 CFR § 123.1",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "satellite_operator",
      "launch_provider",
      "component_supplier",
    ],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "License denial for future applications",
        "Enhanced scrutiny on all applications",
        "Mandatory compliance program audits",
      ],
    },
    complianceActions: [
      "Classify item on USML",
      "Obtain required supporting documents",
      "Screen all parties against restricted lists",
      "Submit DSP-5 application via DECCS",
      "Obtain Congressional notification if required",
      "Implement provisos and conditions",
    ],
    documentationRequired: [
      "DSP-5 Application",
      "Technical specifications",
      "End-use/end-user certificates",
      "Non-transfer/non-re-export assurances",
      "Purchase orders/contracts",
      "Transportation routing plan",
    ],
    relatedRequirements: ["ITAR-REG-001", "ITAR-SCREEN-001"],
  },
  {
    id: "ITAR-TAA-001",
    title: "Technical Assistance Agreement (TAA) Requirement",
    description:
      "Export of technical data or provision of defense services to foreign persons requires a Technical Assistance Agreement approved by DDTC. Critical for joint development programs and technical collaboration.",
    regulation: "ITAR",
    category: "USML_XV",
    cfrReference: "22 CFR § 124.1",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "launch_provider",
      "technology_provider",
      "research_institution",
    ],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Termination of cooperative programs",
        "Loss of classified access",
        "Mandatory enhanced compliance measures",
      ],
    },
    complianceActions: [
      "Draft TAA with all required provisions",
      "Include scope limitations and end-use restrictions",
      "Specify all parties and their roles",
      "Address third-party transfers",
      "Implement Technology Control Plan",
      "Submit for DDTC approval",
      "Obtain Congressional notification if required (>$50M)",
    ],
    documentationRequired: [
      "Technical Assistance Agreement",
      "Scope of technical data to be shared",
      "Technology Control Plan",
      "Foreign party due diligence records",
      "Government-to-government assurances (if applicable)",
      "List of authorized personnel",
    ],
    relatedRequirements: ["ITAR-REG-001", "ITAR-DEEMED-001", "ITAR-TCP-001"],
  },
  {
    id: "ITAR-MLA-001",
    title: "Manufacturing License Agreement (MLA) Requirement",
    description:
      "Manufacturing of USML items abroad requires an MLA approved by DDTC. Applies to establishing production facilities, co-production, or licensed manufacturing outside the United States.",
    regulation: "ITAR",
    category: "USML_XV",
    cfrReference: "22 CFR § 124.1",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "component_supplier",
      "defense_contractor",
    ],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Seizure of unauthorized production",
        "International legal complications",
        "Loss of manufacturing capabilities",
      ],
    },
    complianceActions: [
      "Conduct detailed assessment of manufacturing scope",
      "Draft MLA with manufacturing provisions",
      "Include quality control requirements",
      "Specify production quantities and locations",
      "Address third-country re-exports",
      "Implement comprehensive compliance program",
    ],
    documentationRequired: [
      "Manufacturing License Agreement",
      "Production facility details",
      "Quality control procedures",
      "Technology protection measures",
      "Supply chain mapping",
      "Re-export provisions",
    ],
    relatedRequirements: ["ITAR-TAA-001", "ITAR-TCP-001"],
  },
  {
    id: "ITAR-TCP-001",
    title: "Technology Control Plan (TCP) Requirement",
    description:
      "Implementation of a Technology Control Plan to protect controlled technical data from unauthorized access, including access by foreign nationals.",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 125.4",
    riskLevel: "high",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "launch_provider",
      "component_supplier",
      "research_institution",
      "university",
    ],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Deemed export violations",
        "Program termination",
        "Facility access restrictions",
      ],
    },
    complianceActions: [
      "Identify all controlled technical data",
      "Map data storage and access points",
      "Implement physical access controls",
      "Establish IT security controls",
      "Create personnel screening procedures",
      "Document visitor control procedures",
      "Conduct regular audits",
    ],
    documentationRequired: [
      "Written Technology Control Plan",
      "Physical security protocols",
      "IT access control documentation",
      "Personnel clearance records",
      "Visitor logs",
      "Training records",
      "Audit reports",
    ],
    relatedRequirements: ["ITAR-DEEMED-001", "ITAR-TAA-001"],
  },
  {
    id: "ITAR-BROKERING-001",
    title: "Brokering Registration and Licensing",
    description:
      "Engaging in brokering activities involving defense articles or defense services requires registration and, for most transactions, a license from DDTC.",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 129",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: [
      "component_supplier",
      "technology_provider",
      "foreign_subsidiary",
    ],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Criminal prosecution for undisclosed brokering",
        "Debarment from defense trade",
        "Asset forfeiture",
      ],
    },
    complianceActions: [
      "Determine if activities constitute brokering",
      "Register as broker with DDTC",
      "Apply for brokering approval",
      "Maintain transaction records",
      "Report suspected violations",
    ],
    documentationRequired: [
      "Broker registration",
      "Brokering approval documentation",
      "Transaction records",
      "End-user documentation",
      "Commission/fee agreements",
    ],
    relatedRequirements: ["ITAR-REG-001"],
  },

  // ============================================================================
  // EAR LICENSING AND COMPLIANCE
  // ============================================================================
  {
    id: "EAR-CLASS-001",
    title: "Item Classification Requirement",
    description:
      "All items subject to EAR must be properly classified to determine licensing requirements. This includes determining the applicable ECCN or EAR99 status.",
    regulation: "EAR",
    category: "GENERAL",
    cfrReference: "15 CFR § 738",
    riskLevel: "high",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "satellite_operator",
      "component_supplier",
      "software_developer",
      "all",
    ],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Denial of export privileges",
        "Mandatory compliance audit",
        "Enhanced licensing requirements",
      ],
    },
    complianceActions: [
      "Review CCL for applicable ECCN",
      "Apply ECCN selection criteria",
      "Document classification rationale",
      "Submit CJ request if uncertain",
      "Maintain classification records",
      "Review periodically for regulatory changes",
    ],
    documentationRequired: [
      "Product technical specifications",
      "Classification determination record",
      "CJ (Commodity Jurisdiction) decision (if applicable)",
      "ECCN assignment rationale",
      "Periodic review records",
    ],
    relatedRequirements: ["EAR-LIC-001", "EAR-SCREEN-001"],
  },
  {
    id: "EAR-LIC-001",
    title: "BIS Export License Requirement",
    description:
      "Export of items on the CCL generally requires a license from BIS, depending on the ECCN, destination country, end-user, and end-use. License requirements are determined using the Commerce Country Chart.",
    regulation: "EAR",
    category: "CCL_9A",
    cfrReference: "15 CFR § 742",
    riskLevel: "high",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "satellite_operator",
      "component_supplier",
      "technology_provider",
    ],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Temporary denial order",
        "Export privilege revocation",
        "Enhanced compliance requirements",
      ],
    },
    complianceActions: [
      "Determine ECCN classification",
      "Check Commerce Country Chart",
      "Screen parties against denied/restricted lists",
      "Evaluate license exceptions",
      "Submit license application if required",
      "Implement license conditions",
    ],
    documentationRequired: [
      "BIS License Application (BIS-748P)",
      "Technical specifications",
      "End-user certificate",
      "Transaction value documentation",
      "Destination control statement",
      "License determination record",
    ],
    relatedRequirements: ["EAR-CLASS-001", "EAR-SCREEN-001", "EAR-EXC-001"],
  },
  {
    id: "EAR-EXC-001",
    title: "License Exception Eligibility Assessment",
    description:
      "Determine if a license exception may be used in lieu of a BIS license. Common exceptions for space-related exports include TMP, RPL, GOV, TSR, and STA.",
    regulation: "EAR",
    category: "GENERAL",
    cfrReference: "15 CFR § 740",
    riskLevel: "medium",
    isMandatory: false,
    applicableTo: [
      "spacecraft_manufacturer",
      "satellite_operator",
      "component_supplier",
      "software_developer",
    ],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Loss of license exception privileges",
        "Mandatory licensing for all exports",
        "Enhanced scrutiny on future applications",
      ],
    },
    complianceActions: [
      "Review all available license exceptions",
      "Verify item eligibility for exception",
      "Confirm destination eligibility",
      "Check end-user restrictions",
      "Document exception justification",
      "Comply with exception conditions",
    ],
    documentationRequired: [
      "License exception determination record",
      "Exception eligibility analysis",
      "STA certification (if using STA)",
      "Destination Control Statement",
      "Record of export using exception",
    ],
    relatedRequirements: ["EAR-CLASS-001", "EAR-LIC-001"],
  },
  {
    id: "EAR-TECH-001",
    title: "Technology and Software Export Controls",
    description:
      "Export of technology (9E) and software (9D) related to spacecraft requires classification and may require a license. 'Deemed exports' occur when technology is released to foreign nationals in the U.S.",
    regulation: "EAR",
    category: "CCL_9E",
    cfrReference: "15 CFR § 772",
    riskLevel: "high",
    isMandatory: true,
    applicableTo: [
      "technology_provider",
      "software_developer",
      "research_institution",
      "university",
    ],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Research restrictions",
        "International collaboration limitations",
        "Academic program restrictions",
      ],
    },
    complianceActions: [
      "Classify all technology and software",
      "Identify foreign nationals with access",
      "Obtain deemed export licenses if required",
      "Implement access controls",
      "Screen all recipients",
      "Document all technology transfers",
    ],
    documentationRequired: [
      "Technology classification records",
      "Foreign national access records",
      "Deemed export license (if required)",
      "Technology control procedures",
      "Training records",
    ],
    relatedRequirements: ["EAR-DEEMED-001", "EAR-CLASS-001"],
  },
  {
    id: "EAR-ENCRYPTION-001",
    title: "Encryption Item Controls",
    description:
      "Export of items incorporating encryption requires classification under Category 5, Part 2 and may require BIS notification, registration, or license.",
    regulation: "EAR",
    category: "CCL_5A",
    cfrReference: "15 CFR § 740.17",
    riskLevel: "medium",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "satellite_operator",
      "software_developer",
      "technology_provider",
    ],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Product seizure",
        "Market access restrictions",
        "Compliance program mandates",
      ],
    },
    complianceActions: [
      "Identify encryption functionality",
      "Classify under ECCN 5A002 or 5D002",
      "Determine mass market eligibility",
      "Submit encryption classification request if needed",
      "File annual self-classification report",
    ],
    documentationRequired: [
      "Encryption classification",
      "Technical specifications of encryption",
      "Self-classification report",
      "Mass market eligibility analysis",
      "BIS classification (CCATS) if obtained",
    ],
    relatedRequirements: ["EAR-CLASS-001"],
  },

  // ============================================================================
  // DEEMED EXPORT REQUIREMENTS
  // ============================================================================
  {
    id: "ITAR-DEEMED-001",
    title: "ITAR Deemed Export - Foreign Person Access",
    description:
      "Release of technical data or provision of defense services to foreign persons in the United States is considered an export to that person's country of citizenship. Authorization is required prior to such release.",
    regulation: "ITAR",
    category: "DEEMED_EXPORT",
    cfrReference: "22 CFR § 120.54",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "launch_provider",
      "research_institution",
      "university",
      "all",
    ],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Program termination",
        "Personnel termination",
        "Facility access revocation",
        "Academic program restrictions",
      ],
    },
    complianceActions: [
      "Identify all foreign nationals in workforce",
      "Document nationality/citizenship",
      "Obtain DDTC approval before access",
      "Implement Technology Control Plan",
      "Conduct regular access audits",
      "Terminate access when no longer authorized",
    ],
    documentationRequired: [
      "Foreign national employee records",
      "DDTC authorization (DSP-5 or TAA)",
      "Technology Control Plan",
      "Access control logs",
      "Training completion records",
    ],
    relatedRequirements: ["ITAR-TCP-001", "ITAR-TAA-001"],
  },
  {
    id: "EAR-DEEMED-001",
    title: "EAR Deemed Export - Technology Release to Foreign Nationals",
    description:
      "Release of technology or source code subject to EAR to a foreign national in the United States is considered an export requiring a license determination for that person's home country.",
    regulation: "EAR",
    category: "DEEMED_EXPORT",
    cfrReference: "15 CFR § 734.13",
    riskLevel: "high",
    isMandatory: true,
    applicableTo: [
      "spacecraft_manufacturer",
      "satellite_operator",
      "technology_provider",
      "research_institution",
      "university",
    ],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Research program restrictions",
        "Personnel restrictions",
        "Enhanced compliance requirements",
      ],
    },
    complianceActions: [
      "Classify technology to be shared",
      "Identify nationality of recipients",
      "Check license requirements for country",
      "Apply for deemed export license if needed",
      "Evaluate Fundamental Research Exclusion",
      "Implement access controls",
    ],
    documentationRequired: [
      "Technology classification",
      "Foreign national information",
      "License determination record",
      "Deemed export license (if required)",
      "Access control procedures",
      "Fundamental Research documentation (if applicable)",
    ],
    relatedRequirements: ["EAR-TECH-001", "EAR-CLASS-001"],
  },

  // ============================================================================
  // SCREENING REQUIREMENTS
  // ============================================================================
  {
    id: "ITAR-SCREEN-001",
    title: "ITAR Party Screening",
    description:
      "All parties to ITAR transactions must be screened against DDTC debarred parties list and other applicable restricted party lists.",
    regulation: "ITAR",
    category: "SCREENING",
    cfrReference: "22 CFR § 127.7",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Transaction unwinding",
        "Enhanced scrutiny",
        "License application delays",
      ],
    },
    complianceActions: [
      "Screen all parties before transaction",
      "Screen against DDTC debarred list",
      "Screen against OFAC SDN list",
      "Screen against BIS denied parties",
      "Document all screening results",
      "Implement automated screening",
      "Re-screen for ongoing relationships",
    ],
    documentationRequired: [
      "Screening results documentation",
      "Red flag resolution records",
      "Screening procedure documentation",
      "Automated screening system records",
      "Training records",
    ],
    relatedRequirements: ["EAR-SCREEN-001"],
  },
  {
    id: "EAR-SCREEN-001",
    title: "EAR Restricted Party Screening",
    description:
      "All parties to EAR transactions must be screened against BIS and OFAC restricted party lists including the Entity List, Denied Persons List, and Unverified List.",
    regulation: "EAR",
    category: "SCREENING",
    cfrReference: "15 CFR § 744",
    riskLevel: "high",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Denial of export privileges",
        "Transaction unwinding",
        "Enhanced compliance requirements",
      ],
    },
    complianceActions: [
      "Screen against Entity List",
      "Screen against Denied Persons List",
      "Screen against Unverified List",
      "Screen against OFAC SDN List",
      "Resolve any potential matches",
      "Document screening results",
      "Implement periodic re-screening",
    ],
    documentationRequired: [
      "Screening results",
      "Match resolution documentation",
      "Screening procedures",
      "System/vendor documentation",
      "Training records",
    ],
    relatedRequirements: ["ITAR-SCREEN-001", "EAR-END-USE-001"],
  },
  {
    id: "EAR-END-USE-001",
    title: "End-Use and End-User Due Diligence",
    description:
      "Exporters must exercise due diligence to ensure items are not diverted to prohibited end-uses (nuclear, missile, chemical/biological weapons) or prohibited end-users.",
    regulation: "EAR",
    category: "SCREENING",
    cfrReference: "15 CFR § 744.6",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Criminal prosecution for willful violation",
        "Enhanced licensing requirements",
        "Mandatory compliance programs",
      ],
    },
    complianceActions: [
      "Conduct end-user due diligence",
      "Verify legitimacy of end-user",
      "Confirm stated end-use is accurate",
      "Evaluate red flags",
      "Obtain end-use certificates",
      "Document diligence performed",
    ],
    documentationRequired: [
      "End-user questionnaire/certificate",
      "Company verification records",
      "Red flag evaluation",
      "Site visit records (if conducted)",
      "Ongoing monitoring records",
    ],
    relatedRequirements: ["EAR-SCREEN-001", "EAR-LIC-001"],
  },

  // ============================================================================
  // JURISDICTION DETERMINATION
  // ============================================================================
  {
    id: "JURIS-001",
    title: "Jurisdiction Determination - ITAR vs EAR",
    description:
      "Determine whether an item is subject to ITAR (USML) or EAR (CCL/EAR99). Critical first step as it determines which regulatory regime applies.",
    regulation: "ITAR", // Primary consideration
    category: "GENERAL",
    cfrReference: "22 CFR § 120.4 / 15 CFR § 734.3",
    riskLevel: "critical",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Wrong regime = all exports potentially unlicensed",
        "Retroactive violations",
        "Mandatory disclosure obligations",
      ],
    },
    complianceActions: [
      "Review USML for specific enumeration",
      "Review 600-series ECCNs",
      "Submit Commodity Jurisdiction (CJ) request if uncertain",
      "Document determination rationale",
      "Monitor regulatory changes",
      "Re-evaluate for modified items",
    ],
    documentationRequired: [
      "Jurisdiction determination record",
      "Technical specifications",
      "CJ request/determination (if filed)",
      "USML/CCL comparison analysis",
      "Regulatory review records",
    ],
    relatedRequirements: ["ITAR-REG-001", "EAR-CLASS-001"],
  },
  {
    id: "CJ-001",
    title: "Commodity Jurisdiction (CJ) Request Process",
    description:
      "When jurisdiction is unclear, a CJ request to DDTC determines whether an item is USML-controlled (ITAR) or CCL-controlled (EAR).",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 120.4",
    riskLevel: "high",
    isMandatory: false,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Export delays pending determination",
        "Uncertainty in license applications",
      ],
    },
    complianceActions: [
      "Prepare detailed technical description",
      "Explain military vs commercial application",
      "Submit CJ request to DDTC",
      "Await determination (typically 60-90 days)",
      "Implement determination",
    ],
    documentationRequired: [
      "CJ Request (Form DS-4076)",
      "Technical specifications",
      "Marketing materials",
      "Military/commercial application analysis",
      "CJ determination letter",
    ],
    relatedRequirements: ["JURIS-001"],
  },

  // ============================================================================
  // RECORD KEEPING AND REPORTING
  // ============================================================================
  {
    id: "ITAR-RECORDS-001",
    title: "ITAR Record Keeping Requirements",
    description:
      "Maintain records of all defense trade activities for 5 years from expiration of license or completion of transaction.",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 122.5",
    riskLevel: "high",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Inability to demonstrate compliance",
        "Adverse audit findings",
        "Presumption of violation",
      ],
    },
    complianceActions: [
      "Implement document retention system",
      "Maintain all license documentation",
      "Preserve transaction records",
      "Retain compliance training records",
      "Secure records from unauthorized access",
      "Establish destruction procedures",
    ],
    documentationRequired: [
      "License applications and approvals",
      "Shipping documents",
      "End-user certificates",
      "Transaction communications",
      "Compliance training records",
      "Audit records",
    ],
    relatedRequirements: ["EAR-RECORDS-001"],
  },
  {
    id: "EAR-RECORDS-001",
    title: "EAR Record Keeping Requirements",
    description:
      "Maintain records of all EAR transactions for 5 years from export date or license expiration.",
    regulation: "EAR",
    category: "GENERAL",
    cfrReference: "15 CFR § 762",
    riskLevel: "medium",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 353534,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Audit failures",
        "Inability to claim license exceptions",
        "Adverse inferences",
      ],
    },
    complianceActions: [
      "Implement record retention system",
      "Maintain export documentation",
      "Preserve classification records",
      "Retain screening results",
      "Document license exception use",
      "Establish secure storage",
    ],
    documentationRequired: [
      "Export/reexport records",
      "License applications and approvals",
      "License exception records",
      "Screening documentation",
      "Classification records",
      "Correspondence with BIS",
    ],
    relatedRequirements: ["ITAR-RECORDS-001"],
  },
  {
    id: "ITAR-REPORT-001",
    title: "ITAR Voluntary Disclosure",
    description:
      "Violations of ITAR should be voluntarily disclosed to DDTC. Voluntary disclosure is considered a mitigating factor in enforcement actions.",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 127.12",
    riskLevel: "critical",
    isMandatory: false,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 1227364, // Can be significantly reduced with VD
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Significant penalty mitigation with disclosure",
        "Enhanced penalties without disclosure",
        "Potential criminal referral without disclosure",
      ],
    },
    complianceActions: [
      "Investigate potential violations promptly",
      "Stop ongoing violations immediately",
      "Prepare detailed disclosure narrative",
      "Submit initial notification within 60 days",
      "Implement remedial measures",
      "Cooperate with DDTC review",
    ],
    documentationRequired: [
      "Voluntary disclosure narrative",
      "Root cause analysis",
      "Remedial action plan",
      "Supporting documentation",
      "Compliance program updates",
    ],
    relatedRequirements: ["EAR-REPORT-001"],
  },
  {
    id: "EAR-REPORT-001",
    title: "EAR Voluntary Self-Disclosure",
    description:
      "Violations of EAR may be voluntarily self-disclosed to BIS-OEE. VSD is a significant mitigating factor in enforcement.",
    regulation: "EAR",
    category: "GENERAL",
    cfrReference: "15 CFR § 764.5",
    riskLevel: "high",
    isMandatory: false,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 353534, // Typically reduced 50% or more with VSD
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Significant penalty mitigation",
        "Faster resolution",
        "Demonstrates good faith",
      ],
    },
    complianceActions: [
      "Investigate potential violations",
      "Cease ongoing violations",
      "Prepare VSD narrative",
      "Submit to BIS-OEE",
      "Implement corrective actions",
      "Cooperate with investigation",
    ],
    documentationRequired: [
      "VSD narrative",
      "Supporting documentation",
      "Corrective action plan",
      "Compliance program enhancements",
    ],
    relatedRequirements: ["ITAR-REPORT-001"],
  },

  // ============================================================================
  // TRAINING AND COMPLIANCE PROGRAM
  // ============================================================================
  {
    id: "COMP-PROGRAM-001",
    title: "Export Compliance Program",
    description:
      "Establish and maintain a comprehensive export compliance program including policies, procedures, training, auditing, and corrective action processes.",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 120.1 (implied)",
    riskLevel: "high",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "No compliance program = aggravating factor",
        "Strong program = mitigating factor",
        "Required for voluntary disclosure credit",
      ],
    },
    complianceActions: [
      "Designate Empowered Official/compliance officer",
      "Develop written procedures",
      "Implement classification processes",
      "Establish screening procedures",
      "Conduct regular training",
      "Perform internal audits",
      "Maintain corrective action process",
    ],
    documentationRequired: [
      "Written export compliance manual",
      "Organization chart showing compliance function",
      "Training materials and records",
      "Audit procedures and results",
      "Corrective action records",
      "Management certifications",
    ],
    relatedRequirements: ["TRAINING-001", "AUDIT-001"],
  },
  {
    id: "TRAINING-001",
    title: "Export Control Training",
    description:
      "Provide regular export control training to all personnel involved in export activities.",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 120.1 (implied)",
    riskLevel: "medium",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Untrained employees = compliance risk",
        "Training gaps = enforcement consideration",
      ],
    },
    complianceActions: [
      "Develop training curriculum",
      "Provide initial training to new employees",
      "Conduct annual refresher training",
      "Document all training completion",
      "Update training for regulatory changes",
      "Provide role-specific training",
    ],
    documentationRequired: [
      "Training materials",
      "Attendance records",
      "Completion certificates",
      "Training schedule",
      "Competency assessments",
    ],
    relatedRequirements: ["COMP-PROGRAM-001"],
  },
  {
    id: "AUDIT-001",
    title: "Export Compliance Auditing",
    description:
      "Conduct regular internal audits of export compliance procedures and transactions.",
    regulation: "ITAR",
    category: "GENERAL",
    cfrReference: "22 CFR § 120.1 (implied)",
    riskLevel: "medium",
    isMandatory: true,
    applicableTo: ["all"],
    penaltyInfo: {
      maxCivilPenalty: 1227364,
      maxCriminalPenalty: 1000000,
      maxImprisonment: 20,
      additionalConsequences: [
        "Undetected violations",
        "Increased enforcement risk",
        "Missed disclosure opportunities",
      ],
    },
    complianceActions: [
      "Develop audit program",
      "Conduct annual compliance audits",
      "Review sample transactions",
      "Test screening processes",
      "Evaluate training effectiveness",
      "Document findings and remediation",
    ],
    documentationRequired: [
      "Audit procedures",
      "Audit reports",
      "Findings documentation",
      "Corrective action plans",
      "Management responses",
      "Follow-up verification",
    ],
    relatedRequirements: ["COMP-PROGRAM-001"],
  },
];

// ============================================================================
// DEEMED EXPORT RULES
// ============================================================================

export const deemedExportRules: DeemedExportRule[] = [
  {
    id: "DEEMED-ITAR-001",
    title: "ITAR Deemed Export - Visual Access",
    description:
      "Visual access to defense articles by a foreign person constitutes a deemed export.",
    regulation: "ITAR",
    cfrReference: "22 CFR § 120.54",
    riskLevel: "critical",
    applicableScenarios: [
      "Foreign national employee access to ITAR facilities",
      "Visitor tours of manufacturing areas",
      "Trade show demonstrations",
      "Virtual meetings showing ITAR items",
    ],
    exemptions: [
      "Fundamental research at universities (limited)",
      "Publicly available information",
    ],
    requiredActions: [
      "Obtain DSP-5 or TAA authorization",
      "Implement physical access controls",
      "Badge foreign nationals distinctly",
      "Escort visitors in controlled areas",
    ],
  },
  {
    id: "DEEMED-ITAR-002",
    title: "ITAR Deemed Export - Technical Data Disclosure",
    description:
      "Oral, written, or electronic disclosure of technical data to foreign persons is a deemed export.",
    regulation: "ITAR",
    cfrReference: "22 CFR § 120.54",
    riskLevel: "critical",
    applicableScenarios: [
      "Technical discussions with foreign engineers",
      "Sharing design documents",
      "Email containing technical data",
      "Training foreign personnel",
      "Conference presentations",
    ],
    exemptions: [
      "Publicly available information",
      "Basic marketing materials",
      "General system descriptions",
    ],
    requiredActions: [
      "Obtain TAA covering disclosure scope",
      "Mark all technical data with classification",
      "Control distribution of technical documents",
      "Implement email screening",
    ],
  },
  {
    id: "DEEMED-EAR-001",
    title: "EAR Deemed Export - Technology Release",
    description:
      "Release of technology or source code to a foreign national is a deemed export to that person's most recent country of citizenship or permanent residency.",
    regulation: "EAR",
    cfrReference: "15 CFR § 734.13",
    riskLevel: "high",
    applicableScenarios: [
      "Employment of foreign nationals in technical roles",
      "University research with foreign students",
      "Joint ventures with foreign partners",
      "Technical collaboration",
    ],
    exemptions: [
      "Fundamental Research Exclusion (15 CFR § 734.8)",
      "Educational information (15 CFR § 734.9)",
      "U.S. persons (citizens, permanent residents, protected individuals)",
      "Publicly available technology",
    ],
    requiredActions: [
      "Determine ECCN of technology",
      "Check license requirements for country",
      "Apply for deemed export license if required",
      "Document FRE applicability if claimed",
    ],
  },
  {
    id: "DEEMED-EAR-002",
    title: "EAR Deemed Export - Foreign National Categories",
    description:
      "License requirements vary based on the foreign national's country of citizenship/permanent residency. Multiple nationalities require checking all.",
    regulation: "EAR",
    cfrReference: "15 CFR § 734.13",
    riskLevel: "high",
    applicableScenarios: [
      "Hiring decisions for technical positions",
      "Student access to controlled technology",
      "Temporary worker assignments",
      "Consulting arrangements",
    ],
    exemptions: [
      "U.S. citizens",
      "U.S. permanent residents (green card holders)",
      "Protected individuals (refugees/asylees)",
    ],
    requiredActions: [
      "Verify citizenship/residency status",
      "For multiple nationalities, assess most restrictive",
      "Determine license requirements for each country",
      "Maintain documentation of status",
    ],
  },
];

// ============================================================================
// SCREENING REQUIREMENTS (DENIED PARTY LISTS)
// ============================================================================

export const screeningRequirements: ScreeningRequirement[] = [
  {
    id: "SCREEN-SDN",
    listName: "Specially Designated Nationals and Blocked Persons List (SDN)",
    listCode: "SDN",
    managingAgency: "OFAC (Treasury Department)",
    description:
      "Individuals and entities owned or controlled by targeted countries, narcotics traffickers, terrorists, and others. U.S. persons generally prohibited from dealing with SDNs, and SDN assets are blocked.",
    updateFrequency: "Frequently (multiple times per week)",
    screeningRequired: "all_transactions",
    consequences: [
      "Asset blocking/freezing",
      "Transaction prohibition",
      "Civil penalties up to $330,947 per violation",
      "Criminal penalties up to $1M and 20 years",
    ],
  },
  {
    id: "SCREEN-ENTITY",
    listName: "Entity List",
    listCode: "ENTITY_LIST",
    managingAgency: "BIS (Commerce Department)",
    description:
      "Entities for which there is reasonable cause to believe have been, are, or may be involved in activities contrary to U.S. national security or foreign policy interests. License required for most exports.",
    updateFrequency: "Periodically (as threats identified)",
    screeningRequired: "export_only",
    consequences: [
      "License requirement for all EAR items",
      "License applications presumptively denied",
      "No license exceptions available",
      "Civil and criminal penalties",
    ],
  },
  {
    id: "SCREEN-DPL",
    listName: "Denied Persons List",
    listCode: "DPL",
    managingAgency: "BIS (Commerce Department)",
    description:
      "Individuals and entities denied export privileges by BIS. No exports or reexports of any items subject to EAR.",
    updateFrequency: "As denial orders issued",
    screeningRequired: "export_only",
    consequences: [
      "Complete export prohibition",
      "No license available",
      "Criminal liability for dealing with denied persons",
    ],
  },
  {
    id: "SCREEN-UVL",
    listName: "Unverified List",
    listCode: "UNVERIFIED",
    managingAgency: "BIS (Commerce Department)",
    description:
      "Parties for which BIS was unable to verify end-use in prior transactions. Enhanced due diligence required; UVL statement must be obtained.",
    updateFrequency: "Periodically updated",
    screeningRequired: "export_only",
    consequences: [
      "No license exceptions available",
      "Enhanced due diligence required",
      "UVL statement required from party",
      "Potential for Entity List upgrade",
    ],
  },
  {
    id: "SCREEN-DEBARRED",
    listName: "ITAR Debarred Parties",
    listCode: "DEBARRED",
    managingAgency: "DDTC (State Department)",
    description:
      "Persons convicted of ITAR violations or otherwise debarred from defense trade activities. No defense articles or services.",
    updateFrequency: "As debarments occur",
    screeningRequired: "export_only",
    consequences: [
      "Prohibited from all ITAR activities",
      "Criminal liability for transactions",
      "License applications denied",
    ],
  },
  {
    id: "SCREEN-ISN",
    listName: "Nonproliferation Sanctions",
    listCode: "ISN",
    managingAgency: "State Department",
    description:
      "Entities sanctioned for proliferation activities under various nonproliferation statutes.",
    updateFrequency: "As sanctions imposed",
    screeningRequired: "all_transactions",
    consequences: [
      "Prohibited transactions",
      "No U.S. government contracts",
      "Import/export restrictions",
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all applicable requirements for a given profile
 */
export function getApplicableExportControlRequirements(
  profile: ExportControlProfile,
): ExportControlRequirement[] {
  return exportControlRequirements.filter((req) => {
    // Check if requirement applies to any of the company types
    const appliesToCompany =
      req.applicableTo.includes("all") ||
      req.applicableTo.some((type) => profile.companyType.includes(type));

    if (!appliesToCompany) return false;

    // Filter by regulation type based on profile
    if (req.regulation === "ITAR" && !profile.hasITARItems) {
      // Still include general ITAR requirements if registered with DDTC
      if (!profile.registeredWithDDTC && req.category !== "SCREENING") {
        return false;
      }
    }

    if (
      req.regulation === "EAR" &&
      !profile.hasEARItems &&
      !profile.hasITARItems
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Determine jurisdiction (ITAR vs EAR)
 */
export function determineJurisdiction(
  itemDescription: string,
  isSpecificallyDesignedForMilitary: boolean,
  hasCommercialEquivalent: boolean,
  isOnUSML: boolean,
): JurisdictionDetermination {
  // If specifically enumerated on USML, it's ITAR
  if (isOnUSML) {
    return "itar_only";
  }

  // If specifically designed for military with no commercial equivalent
  if (isSpecificallyDesignedForMilitary && !hasCommercialEquivalent) {
    return "itar_only";
  }

  // If dual-use with military and commercial applications
  if (isSpecificallyDesignedForMilitary && hasCommercialEquivalent) {
    return "dual_use";
  }

  // If purely commercial, likely EAR or EAR99
  if (!isSpecificallyDesignedForMilitary && hasCommercialEquivalent) {
    return "ear_only";
  }

  // Default to dual_use to require CJ determination
  return "dual_use";
}

/**
 * Get applicable screening requirements
 */
export function getRequiredScreeningLists(
  hasITARActivities: boolean,
  hasEARActivities: boolean,
  hasFinancialTransactions: boolean,
): ScreeningRequirement[] {
  return screeningRequirements.filter((screen) => {
    if (screen.screeningRequired === "all_transactions") {
      return hasFinancialTransactions || hasITARActivities || hasEARActivities;
    }
    if (screen.screeningRequired === "export_only") {
      return hasITARActivities || hasEARActivities;
    }
    if (screen.screeningRequired === "financial_only") {
      return hasFinancialTransactions;
    }
    return false;
  });
}

/**
 * Get deemed export rules applicable to profile
 */
export function getApplicableDeemedExportRules(
  profile: ExportControlProfile,
): DeemedExportRule[] {
  if (!profile.hasForeignNationals) {
    return [];
  }

  return deemedExportRules.filter((rule) => {
    if (rule.regulation === "ITAR" && !profile.hasITARItems) {
      return false;
    }
    if (rule.regulation === "EAR" && !profile.hasEARItems) {
      return false;
    }
    return true;
  });
}

/**
 * Calculate max potential penalty for a profile
 */
export function calculateMaxPenaltyExposure(profile: ExportControlProfile): {
  civil: number;
  criminal: number;
  imprisonment: number;
} {
  let maxCivil = 0;
  let maxCriminal = 0;
  let maxImprisonment = 0;

  const requirements = getApplicableExportControlRequirements(profile);

  for (const req of requirements) {
    if (req.penaltyInfo.maxCivilPenalty > maxCivil) {
      maxCivil = req.penaltyInfo.maxCivilPenalty;
    }
    if (req.penaltyInfo.maxCriminalPenalty > maxCriminal) {
      maxCriminal = req.penaltyInfo.maxCriminalPenalty;
    }
    if (req.penaltyInfo.maxImprisonment > maxImprisonment) {
      maxImprisonment = req.penaltyInfo.maxImprisonment;
    }
  }

  return {
    civil: maxCivil,
    criminal: maxCriminal,
    imprisonment: maxImprisonment,
  };
}

/**
 * Get required registrations for profile
 */
export function getRequiredRegistrations(
  profile: ExportControlProfile,
): string[] {
  const registrations: string[] = [];

  if (profile.hasITARItems) {
    registrations.push("DDTC Registration (22 CFR § 122.1)");
  }

  return registrations;
}

/**
 * Get required licenses based on activities
 */
export function getRequiredLicenseTypes(
  profile: ExportControlProfile,
): LicenseType[] {
  const licenses: LicenseType[] = [];

  if (profile.hasITARItems) {
    licenses.push("DSP_5"); // Permanent export
    if (profile.hasTechnologyTransfer) {
      licenses.push("TAA");
    }
    if (profile.hasManufacturingAbroad) {
      licenses.push("MLA");
    }
  }

  if (profile.hasEARItems) {
    licenses.push("BIS_LICENSE");
  }

  return licenses;
}

/**
 * Determine overall risk level
 */
export function determineOverallRisk(profile: ExportControlProfile): RiskLevel {
  // Critical risk factors
  if (profile.hasITARItems && profile.hasForeignNationals && !profile.hasTCP) {
    return "critical";
  }

  if (profile.hasITARItems && !profile.registeredWithDDTC) {
    return "critical";
  }

  // High risk factors
  if (profile.hasITARItems && profile.hasManufacturingAbroad) {
    return "high";
  }

  if (profile.hasITARItems && profile.hasForeignNationals) {
    return "high";
  }

  if (profile.hasEARItems && profile.hasJointVentures) {
    return "high";
  }

  // Medium risk
  if (profile.hasITARItems || profile.hasEARItems) {
    return "medium";
  }

  return "low";
}

/**
 * Get USML category details by category
 */
export function getUSMLCategoryDetail(
  category: ITARCategory,
): USMLCategoryDetail | undefined {
  return usmlCategories.find((c) => c.category === category);
}

/**
 * Get CCL category details by category
 */
export function getCCLCategoryDetail(
  category: EARCategory,
): CCLCategoryDetail | undefined {
  return cclCategories.find((c) => c.category === category);
}

/**
 * Get requirements by regulation type
 */
export function getRequirementsByRegulation(
  regulation: ExportControlRegulation,
): ExportControlRequirement[] {
  return exportControlRequirements.filter((r) => r.regulation === regulation);
}

/**
 * Get mandatory requirements only
 */
export function getMandatoryRequirements(): ExportControlRequirement[] {
  return exportControlRequirements.filter((r) => r.isMandatory);
}

/**
 * Get requirements by risk level
 */
export function getRequirementsByRiskLevel(
  riskLevel: RiskLevel,
): ExportControlRequirement[] {
  return exportControlRequirements.filter((r) => r.riskLevel === riskLevel);
}

/**
 * Format penalty amount for display
 */
export function formatPenalty(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${amount.toLocaleString()}`;
}

// ============================================================================
// EU COMPARISON (For cross-reference with EU Space Act module)
// ============================================================================

export interface ExportControlEUComparison {
  usRequirement: string;
  euEquivalent: string;
  keyDifference: string;
  harmonizationStatus: "aligned" | "partial" | "divergent";
}

export const exportControlEUComparisons: ExportControlEUComparison[] = [
  {
    usRequirement: "ITAR USML Category XV (Spacecraft)",
    euEquivalent: "EU Dual-Use Regulation (EU) 2021/821 - Category 9",
    keyDifference:
      "ITAR controls many commercial satellites still on USML; EU treats most as dual-use",
    harmonizationStatus: "partial",
  },
  {
    usRequirement: "EAR ECCN 9A515 (Commercial Spacecraft)",
    euEquivalent: "EU Dual-Use Category 9A004",
    keyDifference: "Similar scope but different license exception availability",
    harmonizationStatus: "aligned",
  },
  {
    usRequirement: "ITAR Deemed Export Rules",
    euEquivalent: "EU Dual-Use Intangible Transfer Controls",
    keyDifference:
      "US has more comprehensive deemed export regime; EU focuses on intangible transfers",
    harmonizationStatus: "partial",
  },
  {
    usRequirement: "BIS Entity List",
    euEquivalent: "EU Autonomous Sanctions Lists",
    keyDifference:
      "Different entities listed; US list more extensive for space sector",
    harmonizationStatus: "divergent",
  },
  {
    usRequirement: "DDTC Registration",
    euEquivalent: "EU Member State Export License Registration",
    keyDifference: "US has centralized registration; EU varies by member state",
    harmonizationStatus: "divergent",
  },
];
