/**
 * Unified Assessment Questions
 * Comprehensive questions covering EU Space Act, NIS2, and National Space Laws
 */

import {
  UnifiedQuestion,
  UnifiedAssessmentAnswers,
  ACTIVITY_TYPE_LABELS,
  ORBITAL_REGIME_LABELS,
  SERVICE_TYPE_LABELS,
  ENTITY_SIZE_LABELS,
  JURISDICTION_NAMES,
  SPACE_LAW_JURISDICTIONS,
  EU_MEMBER_STATES,
} from "./unified-assessment-types";

// ============================================================================
// PHASE 1: COMPANY PROFILE
// ============================================================================

const PHASE_1_QUESTIONS: UnifiedQuestion[] = [
  {
    id: "companyName",
    phase: 1,
    phaseName: "Company Profile",
    title: "What is your organization's name?",
    subtitle: "Optional - helps personalize your compliance profile",
    type: "text",
    required: false,
  },
  {
    id: "establishmentCountry",
    phase: 1,
    phaseName: "Company Profile",
    title: "Where is your organization established?",
    subtitle: "Primary place of establishment or headquarters",
    helpText:
      "This determines which national space law applies and your EU Space Act obligations",
    type: "single",
    required: true,
    options: [
      // EU Member States
      ...EU_MEMBER_STATES.map((code) => ({
        id: code.toLowerCase(),
        value: code,
        label: JURISDICTION_NAMES[code] || code,
        description: "EU Member State",
        flag: code,
      })),
      // EEA Countries
      {
        id: "no",
        value: "NO",
        label: "Norway",
        description: "EEA Member",
        flag: "NO",
      },
      {
        id: "is",
        value: "IS",
        label: "Iceland",
        description: "EEA Member",
        flag: "IS",
      },
      {
        id: "li",
        value: "LI",
        label: "Liechtenstein",
        description: "EEA Member",
        flag: "LI",
      },
      // Other European
      {
        id: "uk",
        value: "UK",
        label: "United Kingdom",
        description: "Third Country",
        flag: "UK",
      },
      {
        id: "ch",
        value: "CH",
        label: "Switzerland",
        description: "Third Country",
        flag: "CH",
      },
      // Major Space Nations
      {
        id: "us",
        value: "US",
        label: "United States",
        description: "Third Country",
        flag: "US",
      },
      {
        id: "jp",
        value: "JP",
        label: "Japan",
        description: "Third Country",
        flag: "JP",
      },
      {
        id: "in",
        value: "IN",
        label: "India",
        description: "Third Country",
        flag: "IN",
      },
      {
        id: "cn",
        value: "CN",
        label: "China",
        description: "Third Country",
        flag: "CN",
      },
      {
        id: "other",
        value: "OTHER",
        label: "Other Country",
        description: "Third Country",
      },
    ],
  },
  {
    id: "entitySize",
    phase: 1,
    phaseName: "Company Profile",
    title: "What is your organization's size?",
    subtitle: "Based on EU SME definition",
    helpText:
      "This affects Light Regime eligibility under EU Space Act and NIS2 thresholds",
    type: "single",
    required: true,
    options: [
      {
        id: "micro",
        value: "micro",
        label: "Micro Enterprise",
        description: "< 10 employees and < €2M annual turnover",
        icon: "Users",
      },
      {
        id: "small",
        value: "small",
        label: "Small Enterprise",
        description: "< 50 employees and < €10M annual turnover",
        icon: "Building",
      },
      {
        id: "medium",
        value: "medium",
        label: "Medium Enterprise",
        description: "< 250 employees and < €50M annual turnover",
        icon: "Building2",
      },
      {
        id: "large",
        value: "large",
        label: "Large Enterprise",
        description: "≥ 250 employees or ≥ €50M annual turnover",
        icon: "Landmark",
      },
    ],
  },
  {
    id: "turnoverRange",
    phase: 1,
    phaseName: "Company Profile",
    title: "What is your annual turnover?",
    subtitle: "Approximate range for compliance assessment",
    type: "single",
    required: true,
    options: [
      {
        id: "under_2m",
        value: "under_2m",
        label: "Under €2 million",
        description: "Micro enterprise threshold",
      },
      {
        id: "2m_10m",
        value: "2m_10m",
        label: "€2M - €10M",
        description: "Small enterprise range",
      },
      {
        id: "10m_50m",
        value: "10m_50m",
        label: "€10M - €50M",
        description: "Medium enterprise range",
      },
      {
        id: "50m_250m",
        value: "50m_250m",
        label: "€50M - €250M",
        description: "Large enterprise range",
      },
      {
        id: "over_250m",
        value: "over_250m",
        label: "Over €250 million",
        description: "Major enterprise",
      },
    ],
  },
  {
    id: "employeeRange",
    phase: 1,
    phaseName: "Company Profile",
    title: "How many employees does your organization have?",
    type: "single",
    required: true,
    options: [
      {
        id: "1_9",
        value: "1_9",
        label: "1-9 employees",
        description: "Micro enterprise",
      },
      {
        id: "10_49",
        value: "10_49",
        label: "10-49 employees",
        description: "Small enterprise",
      },
      {
        id: "50_249",
        value: "50_249",
        label: "50-249 employees",
        description: "Medium enterprise",
      },
      {
        id: "250_999",
        value: "250_999",
        label: "250-999 employees",
        description: "Large enterprise",
      },
      {
        id: "1000_plus",
        value: "1000_plus",
        label: "1,000+ employees",
        description: "Major enterprise",
      },
    ],
  },
  {
    id: "isResearchInstitution",
    phase: 1,
    phaseName: "Company Profile",
    title: "Is your organization a research or academic institution?",
    subtitle: "Universities, research centers, and scientific organizations",
    helpText:
      "Research institutions may qualify for simplified Light Regime under EU Space Act",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "University, research center, or academic institution",
        icon: "GraduationCap",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "Commercial or government entity",
        icon: "Building2",
      },
    ],
  },
  {
    id: "isStartup",
    phase: 1,
    phaseName: "Company Profile",
    title: "Is your organization a startup or new entrant?",
    subtitle: "Founded within the last 5 years",
    helpText: "New entrants may have different compliance pathways",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Founded within the last 5 years",
        icon: "Rocket",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "Established organization",
        icon: "Building",
      },
    ],
  },
];

// ============================================================================
// PHASE 2: ACTIVITY TYPES
// ============================================================================

const PHASE_2_QUESTIONS: UnifiedQuestion[] = [
  {
    id: "activityTypes",
    phase: 2,
    phaseName: "Activity Types",
    title: "What space activities does your organization perform?",
    subtitle: "Select all that apply",
    helpText: "Each activity type has specific regulatory requirements",
    type: "multi",
    required: true,
    maxSelections: 7,
    minSelections: 1,
    options: [
      {
        id: "sco",
        value: "SCO",
        label: "Spacecraft Operator (SCO)",
        description: "Command, control, and manage spacecraft in orbit",
        icon: "Satellite",
      },
      {
        id: "lo",
        value: "LO",
        label: "Launch Operator (LO)",
        description: "Provide launch services to place objects in space",
        icon: "Rocket",
      },
      {
        id: "lso",
        value: "LSO",
        label: "Launch Site Operator (LSO)",
        description: "Operate spaceports or launch facilities",
        icon: "Building2",
      },
      {
        id: "isos",
        value: "ISOS",
        label: "In-Space Service Operator (ISOS)",
        description: "Provide on-orbit servicing, refueling, or debris removal",
        icon: "Wrench",
      },
      {
        id: "cap",
        value: "CAP",
        label: "Collision Avoidance Provider (CAP)",
        description:
          "Provide collision avoidance or conjunction analysis services",
        icon: "Shield",
      },
      {
        id: "pdp",
        value: "PDP",
        label: "Positional Data Provider (PDP)",
        description: "Provide space object tracking or positional data",
        icon: "Radar",
      },
      {
        id: "tco",
        value: "TCO",
        label: "Third Country Operator (TCO)",
        description: "Non-EU operator providing services in EU market",
        icon: "Globe",
      },
    ],
  },
  {
    id: "isDefenseOnly",
    phase: 2,
    phaseName: "Activity Types",
    title: "Are your space activities exclusively for defense purposes?",
    subtitle: "Military-only operations under national defense authority",
    helpText:
      "Defense-only operations are exempt from EU Space Act (Art. 2(3))",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes, defense only",
        description: "Exclusively military operations",
        icon: "Shield",
      },
      {
        id: "no",
        value: false,
        label: "No, commercial/civil",
        description: "Commercial, civil, or dual-use",
        icon: "Building2",
      },
    ],
  },
  {
    id: "hasPostLaunchResponsibility",
    phase: 2,
    phaseName: "Activity Types",
    title: "Do you retain responsibility for space objects after launch?",
    subtitle: "Command & control, debris mitigation, end-of-life management",
    type: "boolean",
    required: true,
    showIf: (answers) =>
      answers.activityTypes?.includes("SCO") ||
      answers.activityTypes?.includes("LO"),
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Retain post-launch responsibility",
        icon: "CheckCircle",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "Transfer responsibility after launch",
        icon: "ArrowRight",
      },
    ],
  },
  {
    id: "providesServicesToEU",
    phase: 2,
    phaseName: "Activity Types",
    title: "Do you provide space-related services to EU customers?",
    subtitle: "Including government agencies, commercial entities, or citizens",
    helpText:
      "Third country operators serving EU market are subject to EU Space Act",
    type: "boolean",
    required: true,
    showIf: (answers) =>
      !EU_MEMBER_STATES.includes(
        answers.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
      ),
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Serve EU market or customers",
        icon: "Globe",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No EU market presence",
        icon: "X",
      },
    ],
  },
];

// ============================================================================
// PHASE 3: OPERATIONS DETAILS
// ============================================================================

const PHASE_3_QUESTIONS: UnifiedQuestion[] = [
  {
    id: "spacecraftCount",
    phase: 3,
    phaseName: "Operations",
    title: "How many spacecraft do you operate or plan to operate?",
    type: "single",
    required: true,
    showIf: (answers) => answers.activityTypes?.includes("SCO"),
    options: [
      {
        id: "1",
        value: 1,
        label: "1 spacecraft",
        description: "Single mission",
      },
      {
        id: "2_5",
        value: 5,
        label: "2-5 spacecraft",
        description: "Small fleet",
      },
      {
        id: "6_10",
        value: 10,
        label: "6-10 spacecraft",
        description: "Medium fleet",
      },
      {
        id: "11_50",
        value: 50,
        label: "11-50 spacecraft",
        description: "Large fleet",
      },
      {
        id: "51_100",
        value: 100,
        label: "51-100 spacecraft",
        description: "Small constellation",
      },
      {
        id: "100_plus",
        value: 1000,
        label: "100+ spacecraft",
        description: "Large constellation",
      },
    ],
  },
  {
    id: "operatesConstellation",
    phase: 3,
    phaseName: "Operations",
    title: "Do you operate a satellite constellation?",
    subtitle: "Multiple coordinated spacecraft providing a service",
    helpText:
      "Constellation operators have additional requirements under EU Space Act Chapter V",
    type: "boolean",
    required: true,
    showIf: (answers) =>
      answers.activityTypes?.includes("SCO") &&
      (answers.spacecraftCount || 0) > 1,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Coordinated multi-satellite system",
        icon: "Network",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "Independent spacecraft",
        icon: "Satellite",
      },
    ],
  },
  {
    id: "constellationSize",
    phase: 3,
    phaseName: "Operations",
    title: "What is the size of your constellation?",
    helpText:
      "Larger constellations (>100 objects) have enhanced debris mitigation requirements",
    type: "single",
    required: true,
    showIf: (answers) => answers.operatesConstellation === true,
    options: [
      {
        id: "small",
        value: "small",
        label: "Small (2-10 satellites)",
        description: "Tier 1 constellation",
      },
      {
        id: "medium",
        value: "medium",
        label: "Medium (11-100 satellites)",
        description: "Tier 2 constellation",
      },
      {
        id: "large",
        value: "large",
        label: "Large (101-1,000 satellites)",
        description: "Tier 3 constellation",
      },
      {
        id: "mega",
        value: "mega",
        label: "Mega (1,000+ satellites)",
        description: "Tier 4 mega-constellation",
      },
    ],
  },
  {
    id: "primaryOrbitalRegime",
    phase: 3,
    phaseName: "Operations",
    title: "What is your primary orbital regime?",
    helpText: "Different orbits have different debris mitigation requirements",
    type: "single",
    required: true,
    showIf: (answers) =>
      answers.activityTypes?.includes("SCO") ||
      answers.activityTypes?.includes("ISOS"),
    options: [
      {
        id: "leo",
        value: "LEO",
        label: "Low Earth Orbit (LEO)",
        description: "< 2,000 km altitude",
        icon: "CircleDot",
      },
      {
        id: "meo",
        value: "MEO",
        label: "Medium Earth Orbit (MEO)",
        description: "2,000 - 35,786 km",
        icon: "Circle",
      },
      {
        id: "geo",
        value: "GEO",
        label: "Geostationary Orbit (GEO)",
        description: "35,786 km equatorial",
        icon: "Target",
      },
      {
        id: "heo",
        value: "HEO",
        label: "Highly Elliptical Orbit (HEO)",
        description: "Molniya, Tundra orbits",
        icon: "Orbit",
      },
      {
        id: "sso",
        value: "SSO",
        label: "Sun-Synchronous Orbit (SSO)",
        description: "Polar LEO variant",
        icon: "Sun",
      },
      {
        id: "cislunar",
        value: "CISLUNAR",
        label: "Cislunar / Deep Space",
        description: "Beyond GEO",
        icon: "Moon",
      },
      {
        id: "multiple",
        value: "MULTIPLE",
        label: "Multiple Regimes",
        description: "Operations in multiple orbits",
        icon: "Layers",
      },
    ],
  },
  {
    id: "hasDebrisMitigationPlan",
    phase: 3,
    phaseName: "Operations",
    title: "Do you have a debris mitigation plan?",
    subtitle:
      "Documented plan for collision avoidance and end-of-life disposal",
    helpText:
      "Required under EU Space Act Art. 55-60 and most national space laws",
    type: "boolean",
    required: true,
    showIf: (answers) =>
      answers.activityTypes?.includes("SCO") ||
      answers.activityTypes?.includes("LO"),
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have documented debris mitigation plan",
        icon: "FileCheck",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No formal plan in place",
        icon: "FileX",
      },
    ],
  },
  {
    id: "missionDuration",
    phase: 3,
    phaseName: "Operations",
    title: "What is your planned mission duration?",
    helpText:
      "Longer missions have stricter reliability and debris requirements",
    type: "single",
    required: true,
    showIf: (answers) => answers.activityTypes?.includes("SCO"),
    options: [
      {
        id: "short",
        value: "short",
        label: "Short (< 2 years)",
        description: "Technology demonstration, IOD",
      },
      {
        id: "medium",
        value: "medium",
        label: "Medium (2-7 years)",
        description: "Standard commercial mission",
      },
      {
        id: "long",
        value: "long",
        label: "Long (7-25 years)",
        description: "Extended operational life",
      },
      {
        id: "extended",
        value: "extended",
        label: "Extended (> 25 years)",
        description: "GEO or long-duration mission",
      },
    ],
  },
];

// ============================================================================
// PHASE 4: SERVICES & MARKET
// ============================================================================

const PHASE_4_QUESTIONS: UnifiedQuestion[] = [
  {
    id: "serviceTypes",
    phase: 4,
    phaseName: "Services & Market",
    title: "What services does your organization provide?",
    subtitle: "Select all that apply",
    type: "multi",
    required: true,
    maxSelections: 12,
    options: [
      {
        id: "satcom",
        value: "SATCOM",
        label: "Satellite Communications",
        description: "Voice, data, broadband services",
        icon: "Radio",
      },
      {
        id: "eo",
        value: "EO",
        label: "Earth Observation",
        description: "Imagery, remote sensing, monitoring",
        icon: "Eye",
      },
      {
        id: "nav",
        value: "NAV",
        label: "Navigation / GNSS",
        description: "Positioning, timing, navigation",
        icon: "Navigation",
      },
      {
        id: "isr",
        value: "ISR",
        label: "ISR Services",
        description: "Intelligence, surveillance, reconnaissance",
        icon: "Radar",
      },
      {
        id: "ssa",
        value: "SSA",
        label: "Space Situational Awareness",
        description: "Tracking, conjunction analysis",
        icon: "Telescope",
      },
      {
        id: "relay",
        value: "RELAY",
        label: "Data Relay",
        description: "Inter-satellite links, ground relay",
        icon: "Network",
      },
      {
        id: "iod",
        value: "IOD",
        label: "In-Orbit Demonstration",
        description: "Technology validation missions",
        icon: "FlaskConical",
      },
      {
        id: "manufacturing",
        value: "MANUFACTURING",
        label: "In-Space Manufacturing",
        description: "On-orbit production",
        icon: "Factory",
      },
      {
        id: "tourism",
        value: "TOURISM",
        label: "Space Tourism",
        description: "Human spaceflight services",
        icon: "Users",
      },
      {
        id: "debris",
        value: "DEBRIS_REMOVAL",
        label: "Active Debris Removal",
        description: "ADR services",
        icon: "Trash2",
      },
      {
        id: "servicing",
        value: "SERVICING",
        label: "On-Orbit Servicing",
        description: "RPO, refueling, repair",
        icon: "Wrench",
      },
      {
        id: "other",
        value: "OTHER",
        label: "Other Services",
        description: "Other space-related services",
        icon: "MoreHorizontal",
      },
    ],
  },
  {
    id: "servesEUCustomers",
    phase: 4,
    phaseName: "Services & Market",
    title: "Do you serve customers in the European Union?",
    subtitle: "Including commercial, government, or consumer customers",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Serve EU market",
        icon: "Globe",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No EU customers",
        icon: "X",
      },
    ],
  },
  {
    id: "servesCriticalInfrastructure",
    phase: 4,
    phaseName: "Services & Market",
    title: "Do your services support critical infrastructure?",
    subtitle: "Energy, transport, financial, healthcare, or government systems",
    helpText:
      "Critical infrastructure support triggers NIS2 essential entity classification",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Support critical infrastructure",
        icon: "AlertTriangle",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No critical infrastructure dependency",
        icon: "CheckCircle",
      },
    ],
  },
  {
    id: "isEssentialServiceProvider",
    phase: 4,
    phaseName: "Services & Market",
    title: "Are you designated as an essential service provider?",
    subtitle: "By a Member State or under EU regulations",
    helpText: "Essential service designation affects NIS2 obligations",
    type: "boolean",
    required: true,
    showIf: (answers) => answers.servesCriticalInfrastructure === true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Designated essential service provider",
        icon: "Shield",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "Not designated",
        icon: "Circle",
      },
      {
        id: "unknown",
        value: false,
        label: "Unknown",
        description: "Not sure of designation status",
        icon: "HelpCircle",
      },
    ],
  },
  {
    id: "governmentContracts",
    phase: 4,
    phaseName: "Services & Market",
    title: "Do you have government or defense contracts?",
    subtitle: "With EU Member States or EU institutions",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have government/defense contracts",
        icon: "FileText",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No government contracts",
        icon: "X",
      },
    ],
  },
  {
    id: "partOfSupplyChain",
    phase: 4,
    phaseName: "Services & Market",
    title: "Are you part of a space industry supply chain?",
    subtitle:
      "Supplier to spacecraft manufacturers, operators, or service providers",
    helpText: "Supply chain position affects NIS2 requirements",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Part of space supply chain",
        icon: "Link",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "Not a supply chain participant",
        icon: "X",
      },
    ],
  },
];

// ============================================================================
// PHASE 5: CYBERSECURITY READINESS (NIS2)
// ============================================================================

const PHASE_5_QUESTIONS: UnifiedQuestion[] = [
  {
    id: "hasCybersecurityPolicy",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you have a formal cybersecurity policy?",
    subtitle: "Documented security policies approved by management",
    helpText: "Required under NIS2 Art. 21(2)(a)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have documented cybersecurity policy",
        icon: "FileCheck",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No formal policy",
        icon: "FileX",
      },
    ],
  },
  {
    id: "hasRiskManagement",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you conduct regular cybersecurity risk assessments?",
    subtitle: "Systematic identification and evaluation of cyber risks",
    helpText: "Required under NIS2 Art. 21(2)(a)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Regular risk assessments",
        icon: "Search",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No systematic assessment",
        icon: "X",
      },
    ],
  },
  {
    id: "hasIncidentResponsePlan",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you have an incident response plan?",
    subtitle: "Documented procedures for handling security incidents",
    helpText:
      "Required under NIS2 Art. 21(2)(b) - incidents must be reported within 24h/72h",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have incident response plan",
        icon: "AlertTriangle",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No formal plan",
        icon: "X",
      },
    ],
  },
  {
    id: "hasBusinessContinuityPlan",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you have business continuity and disaster recovery plans?",
    subtitle: "Including backup management and crisis procedures",
    helpText: "Required under NIS2 Art. 21(2)(c)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have BC/DR plans",
        icon: "RefreshCw",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No formal plans",
        icon: "X",
      },
    ],
  },
  {
    id: "hasSupplyChainSecurity",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you assess cybersecurity of your supply chain?",
    subtitle: "Security requirements for suppliers and service providers",
    helpText: "Required under NIS2 Art. 21(2)(d)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Assess supply chain security",
        icon: "Link",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No supply chain assessment",
        icon: "X",
      },
    ],
  },
  {
    id: "hasSecurityTraining",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you provide cybersecurity training to employees?",
    subtitle: "Regular security awareness and training programs",
    helpText: "Required under NIS2 Art. 21(2)(g)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Regular security training",
        icon: "GraduationCap",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No formal training",
        icon: "X",
      },
    ],
  },
  {
    id: "hasEncryption",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you use encryption for data protection?",
    subtitle: "Encryption of data at rest and in transit",
    helpText: "Required under NIS2 Art. 21(2)(h)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Use encryption",
        icon: "Lock",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No encryption",
        icon: "Unlock",
      },
    ],
  },
  {
    id: "hasAccessControl",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you have access control and identity management?",
    subtitle: "Authentication, authorization, and access policies",
    helpText: "Required under NIS2 Art. 21(2)(i)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have access controls",
        icon: "Key",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No formal controls",
        icon: "X",
      },
    ],
  },
  {
    id: "hasVulnerabilityManagement",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you have a vulnerability management program?",
    subtitle: "Regular scanning, patching, and vulnerability remediation",
    helpText: "Required under NIS2 Art. 21(2)(e)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have vulnerability management",
        icon: "Bug",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No formal program",
        icon: "X",
      },
    ],
  },
  {
    id: "conductsPenetrationTesting",
    phase: 5,
    phaseName: "Cybersecurity",
    title: "Do you conduct regular penetration testing?",
    subtitle: "External security assessments and red team exercises",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Regular pen testing",
        icon: "Target",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No pen testing",
        icon: "X",
      },
    ],
  },
];

// ============================================================================
// PHASE 6: LICENSING & JURISDICTION
// ============================================================================

const PHASE_6_QUESTIONS: UnifiedQuestion[] = [
  {
    id: "currentLicenses",
    phase: 6,
    phaseName: "Licensing",
    title: "Where do you currently hold space licenses?",
    subtitle: "Select all jurisdictions where you are licensed",
    type: "multi",
    required: false,
    maxSelections: 10,
    options: SPACE_LAW_JURISDICTIONS.map((code) => ({
      id: code.toLowerCase(),
      value: code,
      label: JURISDICTION_NAMES[code] || code,
      flag: code,
    })),
  },
  {
    id: "interestedJurisdictions",
    phase: 6,
    phaseName: "Licensing",
    title: "Which jurisdictions are you interested in for licensing?",
    subtitle: "Select up to 3 for detailed comparison",
    helpText:
      "We'll provide a detailed comparison of requirements, fees, and processing times",
    type: "multi",
    required: true,
    maxSelections: 3,
    minSelections: 1,
    options: SPACE_LAW_JURISDICTIONS.map((code) => ({
      id: code.toLowerCase(),
      value: code,
      label: JURISDICTION_NAMES[code] || code,
      description:
        code === "LU"
          ? "Popular for NewSpace"
          : code === "UK"
            ? "Post-Brexit regime"
            : code === "FR"
              ? "CNES expertise"
              : undefined,
      flag: code,
    })),
  },
  {
    id: "licensingTimeline",
    phase: 6,
    phaseName: "Licensing",
    title: "What is your timeline for obtaining a license?",
    type: "single",
    required: true,
    options: [
      {
        id: "immediate",
        value: "immediate",
        label: "Immediate (ASAP)",
        description: "Need license urgently",
        icon: "Zap",
      },
      {
        id: "6_months",
        value: "6_months",
        label: "Within 6 months",
        description: "Short-term planning",
        icon: "Clock",
      },
      {
        id: "1_year",
        value: "1_year",
        label: "Within 1 year",
        description: "Medium-term planning",
        icon: "Calendar",
      },
      {
        id: "2_years",
        value: "2_years",
        label: "Within 2 years",
        description: "Long-term planning",
        icon: "CalendarDays",
      },
      {
        id: "planning",
        value: "planning",
        label: "Just planning",
        description: "Research phase only",
        icon: "Search",
      },
    ],
  },
  {
    id: "requiresEnglishProcess",
    phase: 6,
    phaseName: "Licensing",
    title: "Do you require an English-language licensing process?",
    subtitle: "Some jurisdictions require local language documentation",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes, English required",
        description: "Need English documentation",
        icon: "Globe",
      },
      {
        id: "no",
        value: false,
        label: "No, any language",
        description: "Can handle local languages",
        icon: "Languages",
      },
    ],
  },
  {
    id: "prefersFastProcessing",
    phase: 6,
    phaseName: "Licensing",
    title: "Is fast processing time a priority?",
    subtitle: "Some jurisdictions have faster turnaround times",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes, speed matters",
        description: "Prioritize fast processing",
        icon: "Zap",
      },
      {
        id: "no",
        value: false,
        label: "No, not critical",
        description: "Can wait for thorough review",
        icon: "Clock",
      },
    ],
  },
];

// ============================================================================
// PHASE 7: INSURANCE & LIABILITY
// ============================================================================

const PHASE_7_QUESTIONS: UnifiedQuestion[] = [
  {
    id: "hasInsurance",
    phase: 7,
    phaseName: "Insurance",
    title: "Do you currently have space insurance coverage?",
    subtitle: "Launch insurance, in-orbit insurance, or third-party liability",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have space insurance",
        icon: "Shield",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No current insurance",
        icon: "X",
      },
    ],
  },
  {
    id: "insuranceCoverage",
    phase: 7,
    phaseName: "Insurance",
    title: "What is your current insurance coverage level?",
    showIf: (answers) => answers.hasInsurance === true,
    type: "single",
    required: true,
    options: [
      {
        id: "under_10m",
        value: "under_10m",
        label: "Under €10M",
        description: "Basic coverage",
      },
      {
        id: "10m_60m",
        value: "10m_60m",
        label: "€10M - €60M",
        description: "Standard coverage",
      },
      {
        id: "60m_100m",
        value: "60m_100m",
        label: "€60M - €100M",
        description: "Enhanced coverage",
      },
      {
        id: "100m_500m",
        value: "100m_500m",
        label: "€100M - €500M",
        description: "Major mission coverage",
      },
      {
        id: "over_500m",
        value: "over_500m",
        label: "Over €500M",
        description: "Mega constellation coverage",
      },
    ],
  },
  {
    id: "hasThirdPartyLiability",
    phase: 7,
    phaseName: "Insurance",
    title: "Do you have third-party liability coverage?",
    subtitle:
      "Coverage for damage to third parties (required by most jurisdictions)",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have TPL coverage",
        icon: "Shield",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No TPL coverage",
        icon: "X",
      },
    ],
  },
];

// ============================================================================
// PHASE 8: COMPLIANCE STATUS
// ============================================================================

const PHASE_8_QUESTIONS: UnifiedQuestion[] = [
  {
    id: "hasExistingCompliance",
    phase: 8,
    phaseName: "Compliance Status",
    title: "Do you have existing compliance programs in place?",
    subtitle:
      "Quality management, security certifications, regulatory compliance",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have compliance programs",
        icon: "CheckCircle",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No formal programs",
        icon: "X",
      },
    ],
  },
  {
    id: "existingCertifications",
    phase: 8,
    phaseName: "Compliance Status",
    title: "Which certifications do you currently hold?",
    subtitle: "Select all that apply",
    showIf: (answers) => answers.hasExistingCompliance === true,
    type: "multi",
    required: false,
    maxSelections: 10,
    options: [
      {
        id: "iso27001",
        value: "ISO27001",
        label: "ISO 27001",
        description: "Information Security Management",
      },
      {
        id: "iso9001",
        value: "ISO9001",
        label: "ISO 9001",
        description: "Quality Management System",
      },
      {
        id: "soc2",
        value: "SOC2",
        label: "SOC 2",
        description: "Service Organization Controls",
      },
      {
        id: "ecss",
        value: "ECSS",
        label: "ECSS Standards",
        description: "European Space Standards",
      },
      {
        id: "itar",
        value: "ITAR",
        label: "ITAR Compliant",
        description: "US Export Control",
      },
      {
        id: "ear",
        value: "EAR",
        label: "EAR Compliant",
        description: "Export Administration Regulations",
      },
      {
        id: "cyber_essentials",
        value: "CYBER_ESSENTIALS",
        label: "Cyber Essentials",
        description: "UK Cyber Certification",
      },
      {
        id: "other",
        value: "OTHER",
        label: "Other Certifications",
        description: "Other relevant certifications",
      },
    ],
  },
  {
    id: "hasLegalCounsel",
    phase: 8,
    phaseName: "Compliance Status",
    title: "Do you have access to space law legal counsel?",
    subtitle: "Internal or external legal expertise in space regulations",
    type: "boolean",
    required: true,
    options: [
      {
        id: "yes",
        value: true,
        label: "Yes",
        description: "Have legal counsel",
        icon: "Scale",
      },
      {
        id: "no",
        value: false,
        label: "No",
        description: "No space law expertise",
        icon: "X",
      },
    ],
  },
  {
    id: "complianceBudget",
    phase: 8,
    phaseName: "Compliance Status",
    title: "What is your approximate compliance budget?",
    subtitle: "For regulatory compliance activities over the next 2 years",
    type: "single",
    required: true,
    options: [
      {
        id: "minimal",
        value: "minimal",
        label: "Minimal (< €50k)",
        description: "Limited budget",
        icon: "Wallet",
      },
      {
        id: "moderate",
        value: "moderate",
        label: "Moderate (€50k - €250k)",
        description: "Standard budget",
        icon: "CreditCard",
      },
      {
        id: "substantial",
        value: "substantial",
        label: "Substantial (€250k - €1M)",
        description: "Significant investment",
        icon: "Banknote",
      },
      {
        id: "enterprise",
        value: "enterprise",
        label: "Enterprise (> €1M)",
        description: "Major program",
        icon: "Building2",
      },
    ],
  },
];

// ============================================================================
// COMBINED QUESTIONS
// ============================================================================

export const UNIFIED_QUESTIONS: UnifiedQuestion[] = [
  ...PHASE_1_QUESTIONS,
  ...PHASE_2_QUESTIONS,
  ...PHASE_3_QUESTIONS,
  ...PHASE_4_QUESTIONS,
  ...PHASE_5_QUESTIONS,
  ...PHASE_6_QUESTIONS,
  ...PHASE_7_QUESTIONS,
  ...PHASE_8_QUESTIONS,
];

export const TOTAL_PHASES = 8;

export function getQuestionsForPhase(phase: number): UnifiedQuestion[] {
  return UNIFIED_QUESTIONS.filter((q) => q.phase === phase);
}

export function getVisibleQuestions(
  answers: Partial<UnifiedAssessmentAnswers>,
): UnifiedQuestion[] {
  return UNIFIED_QUESTIONS.filter((q) => {
    if (!q.showIf) return true;
    return q.showIf(answers) === true;
  });
}

export function getCurrentQuestion(
  answers: Partial<UnifiedAssessmentAnswers>,
  step: number,
): UnifiedQuestion | null {
  const visibleQuestions = getVisibleQuestions(answers);
  return visibleQuestions[step - 1] || null;
}

export function getTotalQuestions(
  answers: Partial<UnifiedAssessmentAnswers>,
): number {
  return getVisibleQuestions(answers).length;
}

export function getPhaseProgress(
  answers: Partial<UnifiedAssessmentAnswers>,
  currentStep: number,
): {
  phase: number;
  phaseName: string;
  phaseProgress: number;
  overallProgress: number;
} {
  const visibleQuestions = getVisibleQuestions(answers);
  const currentQuestion = visibleQuestions[currentStep - 1];

  if (!currentQuestion) {
    return {
      phase: 8,
      phaseName: "Complete",
      phaseProgress: 100,
      overallProgress: 100,
    };
  }

  const phase = currentQuestion.phase;
  const phaseName = currentQuestion.phaseName;

  const phaseQuestions = visibleQuestions.filter((q) => q.phase === phase);
  const currentPhaseIndex = phaseQuestions.findIndex(
    (q) => q.id === currentQuestion.id,
  );
  const phaseProgress = ((currentPhaseIndex + 1) / phaseQuestions.length) * 100;

  const overallProgress = (currentStep / visibleQuestions.length) * 100;

  return { phase, phaseName, phaseProgress, overallProgress };
}

export function isQuestionAnswered(
  question: UnifiedQuestion,
  answers: Partial<UnifiedAssessmentAnswers>,
): boolean {
  const value = answers[question.id];

  if (question.type === "multi") {
    return (
      Array.isArray(value) && value.length >= (question.minSelections || 1)
    );
  }

  if (question.type === "text") {
    return (
      !question.required || (typeof value === "string" && value.trim() !== "")
    );
  }

  return value !== null && value !== undefined;
}
