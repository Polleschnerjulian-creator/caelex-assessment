vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} })); // Not used in generateCRAAutoAssessments

import { generateCRAAutoAssessments } from "./cra-auto-assessment.server";
import type { CRARequirement, CRAAssessmentAnswers } from "./cra-types";

// Create a minimal mock requirement
function makeReq(overrides: Partial<CRARequirement> = {}): CRARequirement {
  return {
    id: "cra-001",
    articleRef: "Annex I",
    category: "security_by_design",
    title: "Test",
    description: "Test",
    complianceQuestion: "Test?",
    spaceSpecificGuidance: "Test guidance",
    applicableTo: {},
    assessmentFields: [],
    complianceRule: {},
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: false,
    ...overrides,
  } as CRARequirement;
}

function makeAnswers(
  overrides: Partial<CRAAssessmentAnswers> = {},
): CRAAssessmentAnswers {
  return {
    economicOperatorRole: "manufacturer",
    isEUEstablished: true,
    spaceProductTypeId: null,
    productName: "Test",
    segments: ["space"],
    hasNetworkFunction: null,
    processesAuthData: null,
    usedInCriticalInfra: null,
    performsCryptoOps: null,
    controlsPhysicalSystem: null,
    hasMicrocontroller: null,
    isOSSComponent: null,
    isCommerciallySupplied: null,
    isSafetyCritical: null,
    hasRedundancy: null,
    processesClassifiedData: null,
    hasIEC62443: null,
    hasETSIEN303645: null,
    hasCommonCriteria: null,
    hasISO27001: null,
    ...overrides,
  };
}

describe("generateCRAAutoAssessments", () => {
  it("marks as partial when IEC 62443 covers requirement", () => {
    const reqs = [makeReq({ iec62443Ref: "IEC 62443-4-1" })];
    const answers = makeAnswers({ hasIEC62443: true });
    const results = generateCRAAutoAssessments(reqs, answers);
    expect(results[0].suggestedStatus).toBe("partial");
    expect(results[0].reason).toContain("IEC 62443");
  });

  it("marks as partial when Common Criteria covers security_by_design", () => {
    const reqs = [makeReq({ category: "security_by_design" })];
    const answers = makeAnswers({ hasCommonCriteria: true });
    const results = generateCRAAutoAssessments(reqs, answers);
    expect(results[0].suggestedStatus).toBe("partial");
    expect(results[0].reason).toContain("Common Criteria");
  });

  it("marks as partial when ISO 27001 covers requirement", () => {
    const reqs = [makeReq({ iso27001Ref: "A.5.1" })];
    const answers = makeAnswers({ hasISO27001: true });
    const results = generateCRAAutoAssessments(reqs, answers);
    expect(results[0].suggestedStatus).toBe("partial");
  });

  it("flags NIS2 overlap when nis2RequirementIds present", () => {
    const reqs = [makeReq({ nis2RequirementIds: ["nis2-001"] })];
    const results = generateCRAAutoAssessments(reqs, makeAnswers());
    expect(results[0].priorityFlags).toContain("nis2_overlap");
  });

  it("flags critical severity", () => {
    const reqs = [makeReq({ severity: "critical" })];
    const results = generateCRAAutoAssessments(reqs, makeAnswers());
    expect(results[0].priorityFlags).toContain("critical_severity");
  });

  it("returns not_assessed when no certifications match", () => {
    const reqs = [makeReq()];
    const results = generateCRAAutoAssessments(reqs, makeAnswers());
    expect(results[0].suggestedStatus).toBe("not_assessed");
    expect(results[0].reason).toBe("");
  });
});
