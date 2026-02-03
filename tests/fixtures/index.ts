/**
 * Test Fixtures
 *
 * Pre-defined test data for consistent testing across the suite.
 */

// Assessment fixtures
export const assessmentFixtures = {
  euSpacecraftOperator: {
    activityType: "spacecraft" as const,
    isDefenseOnly: false,
    allAssetsPreLaunch: false,
    establishment: "eu" as const,
    entitySize: "medium" as const,
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO" as const,
    offersEUServices: true,
  },

  thirdCountryOperator: {
    activityType: "spacecraft" as const,
    isDefenseOnly: false,
    allAssetsPreLaunch: false,
    establishment: "third_country_eu_services" as const,
    entitySize: "large" as const,
    operatesConstellation: true,
    constellationSize: 500,
    primaryOrbit: "LEO" as const,
    offersEUServices: true,
  },

  smallEnterprise: {
    activityType: "spacecraft" as const,
    isDefenseOnly: false,
    allAssetsPreLaunch: false,
    establishment: "eu" as const,
    entitySize: "small" as const,
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO" as const,
    offersEUServices: true,
  },

  researchInstitution: {
    activityType: "spacecraft" as const,
    isDefenseOnly: false,
    allAssetsPreLaunch: false,
    establishment: "eu" as const,
    entitySize: "research" as const,
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO" as const,
    offersEUServices: true,
  },

  launchOperator: {
    activityType: "launch_vehicle" as const,
    isDefenseOnly: false,
    allAssetsPreLaunch: false,
    establishment: "eu" as const,
    entitySize: "large" as const,
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO" as const,
    offersEUServices: true,
  },

  defenseOnly: {
    activityType: "spacecraft" as const,
    isDefenseOnly: true,
    allAssetsPreLaunch: false,
    establishment: "eu" as const,
    entitySize: "large" as const,
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO" as const,
    offersEUServices: false,
  },

  megaConstellation: {
    activityType: "spacecraft" as const,
    isDefenseOnly: false,
    allAssetsPreLaunch: false,
    establishment: "eu" as const,
    entitySize: "large" as const,
    operatesConstellation: true,
    constellationSize: 5000,
    primaryOrbit: "LEO" as const,
    offersEUServices: true,
  },
};

// Document fixtures
export const documentFixtures = {
  license: {
    name: "Space Operations License",
    description: "Operating license for satellite operations",
    category: "LICENSE" as const,
    subcategory: "Operating",
    status: "ACTIVE" as const,
    moduleType: "AUTHORIZATION" as const,
    tags: ["authorization", "license"],
    issueDate: new Date("2024-01-01"),
    expiryDate: new Date("2027-01-01"),
    regulatoryRef: "Art. 6",
  },

  insurance: {
    name: "Third Party Liability Insurance",
    description: "TPL insurance certificate",
    category: "INSURANCE_CERT" as const,
    status: "ACTIVE" as const,
    moduleType: "INSURANCE" as const,
    tags: ["insurance", "liability"],
    issueDate: new Date("2024-01-01"),
    expiryDate: new Date("2025-01-01"),
  },

  securityCert: {
    name: "ISO 27001 Certificate",
    description: "Information security management certification",
    category: "SECURITY_CERT" as const,
    status: "ACTIVE" as const,
    moduleType: "CYBERSECURITY" as const,
    tags: ["cybersecurity", "iso27001"],
    issueDate: new Date("2024-01-01"),
    expiryDate: new Date("2027-01-01"),
  },

  expiredDocument: {
    name: "Expired License",
    description: "This document has expired",
    category: "LICENSE" as const,
    status: "EXPIRED" as const,
    isExpired: true,
    issueDate: new Date("2020-01-01"),
    expiryDate: new Date("2023-01-01"),
  },

  draftDocument: {
    name: "Draft Compliance Report",
    description: "Annual compliance report in progress",
    category: "COMPLIANCE_REPORT" as const,
    status: "DRAFT" as const,
    moduleType: "SUPERVISION" as const,
    tags: ["compliance", "draft"],
  },
};

// Deadline fixtures
export const deadlineFixtures = {
  authorizationDeadline: {
    title: "Submit Authorization Application",
    description: "Submit space activity authorization application to NCA",
    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    category: "AUTHORIZATION" as const,
    priority: "HIGH" as const,
    status: "PENDING" as const,
    moduleType: "AUTHORIZATION" as const,
    regulatoryRef: "Art. 6",
    reminderDays: [30, 14, 7],
  },

  reportingDeadline: {
    title: "Annual Compliance Report",
    description: "Submit annual compliance status report",
    dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    category: "REPORTING" as const,
    priority: "MEDIUM" as const,
    status: "PENDING" as const,
    moduleType: "SUPERVISION" as const,
    reminderDays: [14, 7, 1],
  },

  overdueDeadline: {
    title: "Overdue Task",
    description: "This deadline has passed",
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    category: "COMPLIANCE" as const,
    priority: "CRITICAL" as const,
    status: "OVERDUE" as const,
    reminderDays: [],
  },

  recurringDeadline: {
    title: "Monthly Status Report",
    description: "Monthly operational status report",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    category: "REPORTING" as const,
    priority: "MEDIUM" as const,
    status: "PENDING" as const,
    isRecurring: true,
    recurrenceRule: "FREQ=MONTHLY;INTERVAL=1",
    reminderDays: [7, 1],
  },
};

// User fixtures
export const userFixtures = {
  standardUser: {
    email: "user@example.com",
    name: "Test User",
    role: "USER" as const,
    organizationName: "Test Space Corp",
  },

  adminUser: {
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN" as const,
    organizationName: "Space Authority",
  },

  authorityUser: {
    email: "authority@gov.eu",
    name: "Authority User",
    role: "AUTHORITY" as const,
    organizationName: "National Space Agency",
  },
};

// Environmental assessment fixtures
export const environmentalFixtures = {
  standardMission: {
    operatorType: "spacecraft" as const,
    missionType: "commercial" as const,
    spacecraftMassKg: 500,
    spacecraftCount: 1,
    orbitType: "LEO" as const,
    altitudeKm: 550,
    missionDurationYears: 5,
    launchVehicle: "Falcon 9",
    launchSharePercent: 100,
    groundStationCount: 3,
    dailyContactHours: 8,
    deorbitStrategy: "controlled_deorbit" as const,
  },

  smallSat: {
    operatorType: "spacecraft" as const,
    missionType: "research" as const,
    spacecraftMassKg: 25,
    spacecraftCount: 1,
    orbitType: "LEO" as const,
    altitudeKm: 400,
    missionDurationYears: 2,
    launchVehicle: "Rocket Lab Electron",
    launchSharePercent: 50,
    groundStationCount: 1,
    dailyContactHours: 4,
    deorbitStrategy: "passive_decay" as const,
    isSmallEnterprise: true,
  },

  geoMission: {
    operatorType: "spacecraft" as const,
    missionType: "commercial" as const,
    spacecraftMassKg: 3500,
    spacecraftCount: 1,
    orbitType: "GEO" as const,
    altitudeKm: 35786,
    missionDurationYears: 15,
    launchVehicle: "Ariane 6",
    launchSharePercent: 100,
    groundStationCount: 5,
    dailyContactHours: 24,
    deorbitStrategy: "graveyard_orbit" as const,
  },
};

// Cybersecurity assessment fixtures
export const cybersecurityFixtures = {
  smallOperator: {
    organizationSize: "small" as const,
    spaceSegmentComplexity: "single_satellite" as const,
    dataSensitivityLevel: "internal" as const,
    hasSecurityTeam: false,
  },

  largeOperator: {
    organizationSize: "large" as const,
    spaceSegmentComplexity: "large_constellation" as const,
    dataSensitivityLevel: "restricted" as const,
    processesPersonalData: true,
    handlesGovData: true,
    existingCertifications: ["ISO27001", "SOC2"],
    hasSecurityTeam: true,
    securityTeamSize: 10,
    hasIncidentResponsePlan: true,
    hasBCP: true,
    criticalSupplierCount: 15,
    supplierSecurityAssessed: true,
  },
};

// Insurance assessment fixtures
export const insuranceFixtures = {
  standardMission: {
    primaryJurisdiction: "DE",
    operatorType: "spacecraft" as const,
    companySize: "medium" as const,
    orbitRegime: "LEO" as const,
    satelliteCount: 1,
    satelliteValueEur: 10000000,
    totalMissionValueEur: 15000000,
    missionDurationYears: 5,
    hasFlightHeritage: true,
    launchVehicle: "Falcon 9",
    hasPropulsion: true,
  },

  constellationOperator: {
    primaryJurisdiction: "FR",
    operatorType: "spacecraft" as const,
    companySize: "large" as const,
    orbitRegime: "LEO" as const,
    satelliteCount: 100,
    satelliteValueEur: 500000000,
    totalMissionValueEur: 750000000,
    isConstellationOperator: true,
    hasManeuverability: true,
    missionDurationYears: 10,
    hasFlightHeritage: true,
    crossBorderOps: true,
    annualRevenueEur: 100000000,
  },
};

// API response fixtures
export const apiResponseFixtures = {
  successResponse: {
    success: true,
    data: {},
  },

  errorResponse: {
    error: "An error occurred",
    details: {},
  },

  unauthorizedResponse: {
    error: "Unauthorized",
  },

  notFoundResponse: {
    error: "Not found",
  },

  validationErrorResponse: {
    error: "Validation Error",
    details: {
      field: ["Error message"],
    },
  },
};
