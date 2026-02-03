import { faker } from "@faker-js/faker";

// User factory
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: "USER",
    organizationName: faker.company.name(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN" | "AUTHORITY";
  organizationName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document factory
export function createMockDocument(
  overrides?: Partial<MockDocument>,
): MockDocument {
  const categories = [
    "LICENSE",
    "PERMIT",
    "AUTHORIZATION",
    "CERTIFICATE",
    "INSURANCE_POLICY",
    "COMPLIANCE_REPORT",
    "TECHNICAL_SPEC",
  ] as const;

  const statuses = [
    "DRAFT",
    "PENDING_REVIEW",
    "UNDER_REVIEW",
    "APPROVED",
    "ACTIVE",
    "EXPIRED",
  ] as const;

  const isExpired = faker.datatype.boolean({ probability: 0.2 });
  const expiryDate = isExpired ? faker.date.past() : faker.date.future();

  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    fileName: `${faker.system.fileName()}.pdf`,
    fileSize: faker.number.int({ min: 1024, max: 10485760 }),
    mimeType: "application/pdf",
    category: faker.helpers.arrayElement(categories),
    subcategory: faker.lorem.word(),
    status: isExpired ? "EXPIRED" : faker.helpers.arrayElement(statuses),
    tags: faker.helpers.multiple(() => faker.lorem.word(), {
      count: { min: 1, max: 5 },
    }),
    issueDate: faker.date.past(),
    expiryDate,
    isExpired,
    isLatest: true,
    version: 1,
    moduleType: faker.helpers.arrayElement([
      "AUTHORIZATION",
      "CYBERSECURITY",
      "INSURANCE",
      "DEBRIS",
      "ENVIRONMENTAL",
    ]),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export interface MockDocument {
  id: string;
  userId: string;
  name: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  subcategory?: string;
  status: string;
  tags: string[];
  issueDate?: Date;
  expiryDate?: Date;
  isExpired: boolean;
  isLatest: boolean;
  version: number;
  moduleType?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Deadline factory
export function createMockDeadline(
  overrides?: Partial<MockDeadline>,
): MockDeadline {
  const categories = [
    "AUTHORIZATION",
    "REPORTING",
    "COMPLIANCE",
    "TECHNICAL",
    "ADMINISTRATIVE",
  ] as const;
  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
  const statuses = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "OVERDUE",
    "CANCELLED",
  ] as const;

  const dueDate = faker.date.future();

  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    title: faker.lorem.words(4),
    description: faker.lorem.sentence(),
    dueDate,
    category: faker.helpers.arrayElement(categories),
    priority: faker.helpers.arrayElement(priorities),
    status: faker.helpers.arrayElement(statuses),
    moduleType: faker.helpers.arrayElement([
      "AUTHORIZATION",
      "CYBERSECURITY",
      "INSURANCE",
      "DEBRIS",
      "SUPERVISION",
    ]),
    regulatoryRef: `Art. ${faker.number.int({ min: 1, max: 119 })}`,
    isRecurring: faker.datatype.boolean({ probability: 0.3 }),
    recurrenceRule: null,
    reminderDays: [30, 14, 7, 1],
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export interface MockDeadline {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: Date;
  category: string;
  priority: string;
  status: string;
  moduleType?: string;
  regulatoryRef?: string;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  reminderDays: number[];
  createdAt: Date;
  updatedAt: Date;
}

// Assessment state factory
export function createMockAssessmentState(
  overrides?: Partial<MockAssessmentState>,
): MockAssessmentState {
  return {
    currentStep: faker.number.int({ min: 1, max: 8 }),
    answers: {
      activityType: faker.helpers.arrayElement([
        "spacecraft",
        "launch",
        "launch_site",
        "isos",
        "data_provider",
        null,
      ]),
      isDefenseOnly: faker.datatype.boolean(),
      allAssetsPreLaunch: faker.datatype.boolean(),
      isEUEstablished: faker.datatype.boolean(),
      entitySize: faker.helpers.arrayElement([
        "small",
        "research",
        "medium",
        "large",
        null,
      ]),
      operatesConstellation: faker.datatype.boolean(),
      constellationSize: faker.number.int({ min: 1, max: 100 }),
      primaryOrbit: faker.helpers.arrayElement([
        "LEO",
        "MEO",
        "GEO",
        "beyond",
        null,
      ]),
      offersEUServices: faker.datatype.boolean(),
    },
    isComplete: false,
    isOutOfScope: false,
    outOfScopeReason: null,
    ...overrides,
  };
}

export interface MockAssessmentState {
  currentStep: number;
  answers: {
    activityType:
      | "spacecraft"
      | "launch"
      | "launch_site"
      | "isos"
      | "data_provider"
      | null;
    isDefenseOnly: boolean | null;
    allAssetsPreLaunch: boolean | null;
    isEUEstablished: boolean | null;
    entitySize: "small" | "research" | "medium" | "large" | null;
    operatesConstellation: boolean | null;
    constellationSize: number | null;
    primaryOrbit: "LEO" | "MEO" | "GEO" | "beyond" | null;
    offersEUServices: boolean | null;
  };
  isComplete: boolean;
  isOutOfScope: boolean;
  outOfScopeReason: string | null;
}

// Compliance result factory
export function createMockComplianceResult(
  overrides?: Partial<MockComplianceResult>,
): MockComplianceResult {
  return {
    operatorType: "spacecraft_operator",
    operatorTypeLabel: "Spacecraft Operator",
    isEU: true,
    isThirdCountry: false,
    regime: faker.helpers.arrayElement(["standard", "light"]),
    regimeReason: "Based on entity size assessment",
    entitySize: faker.helpers.arrayElement([
      "small_enterprise",
      "medium_enterprise",
      "large_enterprise",
    ]),
    constellationTier: faker.helpers.arrayElement([
      "single_satellite",
      "small_constellation",
      "medium_constellation",
      null,
    ]),
    orbit: faker.helpers.arrayElement(["LEO", "MEO", "GEO"]),
    applicableArticles: [],
    totalArticles: 119,
    applicableCount: faker.number.int({ min: 20, max: 60 }),
    moduleStatuses: [],
    checklist: [],
    keyDates: [],
    estimatedAuthorizationCost: "€75,000 - €150,000",
    authorizationPath: "National Authority → EUSPA",
    ...overrides,
  };
}

export interface MockComplianceResult {
  operatorType: string;
  operatorTypeLabel: string;
  isEU: boolean;
  isThirdCountry: boolean;
  regime: "standard" | "light" | "out_of_scope";
  regimeReason: string;
  entitySize: string;
  constellationTier: string | null;
  orbit: string;
  applicableArticles: unknown[];
  totalArticles: number;
  applicableCount: number;
  moduleStatuses: unknown[];
  checklist: unknown[];
  keyDates: unknown[];
  estimatedAuthorizationCost: string;
  authorizationPath: string;
}

// Environmental data factory
export function createMockEnvironmentalData(
  overrides?: Partial<MockEnvironmentalData>,
): MockEnvironmentalData {
  return {
    missionPhase: faker.helpers.arrayElement([
      "design",
      "manufacturing",
      "launch",
      "operations",
      "disposal",
    ]),
    satelliteMass: faker.number.float({
      min: 50,
      max: 5000,
      fractionDigits: 1,
    }),
    propellantType: faker.helpers.arrayElement([
      "hydrazine",
      "xenon",
      "hall_effect",
      "none",
    ]),
    solarPanelArea: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
    launchVehicle: faker.helpers.arrayElement([
      "Falcon 9",
      "Ariane 6",
      "Vega C",
      "Soyuz",
    ]),
    targetOrbit: faker.helpers.arrayElement(["LEO", "MEO", "GEO", "SSO"]),
    operationalLifetime: faker.number.int({ min: 1, max: 15 }),
    disposalMethod: faker.helpers.arrayElement([
      "controlled_reentry",
      "graveyard_orbit",
      "passive_decay",
    ]),
    ...overrides,
  };
}

export interface MockEnvironmentalData {
  missionPhase: string;
  satelliteMass: number;
  propellantType: string;
  solarPanelArea: number;
  launchVehicle: string;
  targetOrbit: string;
  operationalLifetime: number;
  disposalMethod: string;
}

// Cybersecurity assessment factory
export function createMockCybersecurityAssessment(
  overrides?: Partial<MockCybersecurityAssessment>,
): MockCybersecurityAssessment {
  return {
    assetType: faker.helpers.arrayElement([
      "satellite",
      "ground_station",
      "data_center",
      "network",
    ]),
    dataClassification: faker.helpers.arrayElement([
      "public",
      "internal",
      "confidential",
      "restricted",
    ]),
    encryptionLevel: faker.helpers.arrayElement([
      "none",
      "standard",
      "high",
      "military",
    ]),
    accessControls: faker.helpers.arrayElements(
      ["mfa", "rbac", "biometric", "ip_whitelist"],
      { min: 1, max: 4 },
    ),
    incidentResponsePlan: faker.datatype.boolean(),
    securityAudits: faker.helpers.arrayElement([
      "none",
      "annual",
      "quarterly",
      "continuous",
    ]),
    vulnerabilityScanFrequency: faker.helpers.arrayElement([
      "none",
      "monthly",
      "weekly",
      "daily",
    ]),
    ...overrides,
  };
}

export interface MockCybersecurityAssessment {
  assetType: string;
  dataClassification: string;
  encryptionLevel: string;
  accessControls: string[];
  incidentResponsePlan: boolean;
  securityAudits: string;
  vulnerabilityScanFrequency: string;
}

// Insurance calculation input factory
export function createMockInsuranceInput(
  overrides?: Partial<MockInsuranceInput>,
): MockInsuranceInput {
  return {
    missionType: faker.helpers.arrayElement([
      "communication",
      "earth_observation",
      "navigation",
      "scientific",
    ]),
    orbitType: faker.helpers.arrayElement(["LEO", "MEO", "GEO"]),
    satelliteValue: faker.number.int({ min: 1000000, max: 500000000 }),
    launchVehicle: faker.helpers.arrayElement([
      "Falcon 9",
      "Ariane 6",
      "Vega C",
    ]),
    operationalLifetime: faker.number.int({ min: 1, max: 15 }),
    hasThirdPartyLiability: faker.datatype.boolean(),
    constellationSize: faker.number.int({ min: 1, max: 50 }),
    countryOfRegistry: faker.location.countryCode(),
    ...overrides,
  };
}

export interface MockInsuranceInput {
  missionType: string;
  orbitType: string;
  satelliteValue: number;
  launchVehicle: string;
  operationalLifetime: number;
  hasThirdPartyLiability: boolean;
  constellationSize: number;
  countryOfRegistry: string;
}

// Batch factory helpers
export function createMockDocuments(
  count: number,
  overrides?: Partial<MockDocument>,
): MockDocument[] {
  return Array.from({ length: count }, () => createMockDocument(overrides));
}

export function createMockDeadlines(
  count: number,
  overrides?: Partial<MockDeadline>,
): MockDeadline[] {
  return Array.from({ length: count }, () => createMockDeadline(overrides));
}

export function createMockUsers(
  count: number,
  overrides?: Partial<MockUser>,
): MockUser[] {
  return Array.from({ length: count }, () => createMockUser(overrides));
}
