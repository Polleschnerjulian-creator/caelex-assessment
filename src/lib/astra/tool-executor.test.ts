import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

const { mockLogAuditEvent, mockPrisma } = vi.hoisted(() => {
  return {
    mockLogAuditEvent: vi.fn().mockResolvedValue(undefined),
    mockPrisma: {
      debrisAssessment: { findFirst: vi.fn().mockResolvedValue(null) },
      cybersecurityAssessment: { findFirst: vi.fn().mockResolvedValue(null) },
      insuranceAssessment: { findFirst: vi.fn().mockResolvedValue(null) },
      nIS2Assessment: { findFirst: vi.fn().mockResolvedValue(null) },
      environmentalAssessment: { findFirst: vi.fn().mockResolvedValue(null) },
      organization: {
        findUnique: vi.fn().mockResolvedValue({ name: "Test Org" }),
      },
      deadline: { findMany: vi.fn().mockResolvedValue([]) },
      document: { findMany: vi.fn().mockResolvedValue([]) },
      nCASubmission: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      organizationMember: { findFirst: vi.fn().mockResolvedValue(null) },
      supervisionConfig: { findUnique: vi.fn().mockResolvedValue(null) },
      incident: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      incidentNIS2Phase: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      nCACorrespondence: { findMany: vi.fn().mockResolvedValue([]) },
    },
  };
});

vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock dynamic imports
vi.mock("@/lib/generate", () => ({
  initGeneration: vi.fn().mockResolvedValue({
    documentId: "doc-123",
    readinessScore: 75,
    readinessLevel: "ready",
  }),
}));

vi.mock("@/lib/services/incident-autopilot", () => ({
  createIncidentWithAutopilot: vi.fn().mockResolvedValue({
    success: true,
    incidentId: "inc-123",
    incidentNumber: "INC-2026-001",
    severity: "high",
    nis2Phases: [],
  }),
  getIncidentCommandData: vi.fn().mockResolvedValue(null),
  listActiveIncidents: vi.fn().mockResolvedValue([]),
  advanceIncidentWorkflow: vi.fn().mockResolvedValue({
    success: true,
    previousState: "triage",
    currentState: "investigating",
    availableTransitions: [],
  }),
}));

vi.mock("@/lib/services/incident-notification-templates", () => ({
  generateNCANotificationDraft: vi.fn().mockReturnValue({
    title: "Draft Title",
    content: "Draft content",
    legalBasis: "Art. 23(4)(a)",
  }),
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn((val: string) => Promise.resolve(val)),
  isEncrypted: vi.fn(() => false),
}));

vi.mock("@/lib/services/nca-portal-service", () => ({
  assemblePackage: vi.fn().mockResolvedValue({
    completenessScore: 85,
    requiredDocuments: ["doc1", "doc2"],
    missingDocuments: [],
    documents: [],
  }),
}));

vi.mock("@/lib/services/compliance-twin-service", () => ({
  getComplianceTwinState: vi.fn().mockResolvedValue({
    score: {
      overall: 72,
      grade: "B",
      euSpaceAct: 70,
      nis2: 75,
      maturityLevel: 3,
      maturityLabel: "Managed",
    },
    evidence: { completePct: 65, accepted: 13, total: 20, expired: 2 },
    deadlines: {
      healthScore: 80,
      overdue: 1,
      dueSoon: 3,
      completed: 10,
      total: 14,
    },
    incidents: { active: 0 },
    risk: { estimatedRiskEur: 2_500_000, maxPenaltyExposure: 10_000_000 },
    velocity: { daily: 0.5, sevenDay: 3, thirtyDay: 8, trend: "improving" },
    requirements: {},
    modules: [
      { name: "Cybersecurity", score: 80 },
      { name: "Debris", score: 65 },
    ],
    alerts: [{ message: "Overdue deadline" }],
  }),
  getEvidenceGapAnalysis: vi.fn().mockResolvedValue([
    { framework: "debris", criticality: "high", evidenceExpired: false },
    {
      framework: "cybersecurity",
      criticality: "critical",
      evidenceExpired: true,
    },
    { framework: "nis2", criticality: "medium", evidenceExpired: false },
  ]),
}));

vi.mock("@/lib/services/whatif-simulation-service", () => ({
  simulateScenario: vi.fn().mockResolvedValue({
    baselineScore: 72,
    projectedScore: 65,
    scoreDelta: -7,
    newRequirements: [{ title: "New req 1" }, { title: "New req 2" }],
    financialImpact: { delta: 500_000 },
    riskAssessment: { level: "medium" },
    recommendations: ["Do this", "Do that"],
  }),
}));

vi.mock("@/lib/services/incident-response-service", () => ({}));

import { executeTool, TOOL_HANDLERS } from "./tool-executor";
import type { AstraToolCall, AstraUserContext } from "./types";

// ─── Test Helpers ───

const defaultUserContext: AstraUserContext = {
  userId: "user-1",
  organizationId: "org-1",
  organizationName: "Test Org",
};

function makeToolCall(
  name: string,
  input: Record<string, unknown> = {},
): AstraToolCall {
  return { id: `call-${name}`, name, input };
}

// ─── executeTool main function ───

describe("executeTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success:false for unknown tool", async () => {
    const result = await executeTool(
      makeToolCall("nonexistent_tool"),
      defaultUserContext,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown tool");
    expect(result.error).toContain("nonexistent_tool");
    expect(result.toolCallId).toBe("call-nonexistent_tool");
  });

  it("logs audit events on tool call", async () => {
    await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    expect(mockLogAuditEvent).toHaveBeenCalled();
    const firstCall = mockLogAuditEvent.mock.calls[0][0];
    expect(firstCall.action).toBe("ASTRA_TOOL_CALL");
    expect(firstCall.entityType).toBe("astra");
    expect(firstCall.userId).toBe("user-1");
  });

  it("logs success audit event on successful execution", async () => {
    await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    // Should have ASTRA_TOOL_CALL and ASTRA_TOOL_RESULT
    const actions = mockLogAuditEvent.mock.calls.map(
      (c: unknown[]) => (c[0] as Record<string, unknown>).action,
    );
    expect(actions).toContain("ASTRA_TOOL_CALL");
    expect(actions).toContain("ASTRA_TOOL_RESULT");
  });

  it("returns success:true with data for valid tool", async () => {
    const result = await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.toolCallId).toBe("call-check_compliance_status");
  });

  it("catches errors and returns error result", async () => {
    // Force an error by making prisma throw
    mockPrisma.debrisAssessment.findFirst.mockRejectedValueOnce(
      new Error("DB Error"),
    );
    const result = await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("DB Error");
  });

  it("handles non-Error throw gracefully", async () => {
    mockPrisma.debrisAssessment.findFirst.mockRejectedValueOnce("string error");
    const result = await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown error");
  });

  it("logs error audit event on failure", async () => {
    mockPrisma.debrisAssessment.findFirst.mockRejectedValueOnce(
      new Error("DB fail"),
    );
    await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    const actions = mockLogAuditEvent.mock.calls.map(
      (c: unknown[]) => (c[0] as Record<string, unknown>).action,
    );
    expect(actions).toContain("ASTRA_TOOL_ERROR");
  });
});

// ─── TOOL_HANDLERS export ───

describe("TOOL_HANDLERS", () => {
  it("is exported and contains handler functions", () => {
    expect(TOOL_HANDLERS).toBeDefined();
    expect(typeof TOOL_HANDLERS).toBe("object");
    expect(Object.keys(TOOL_HANDLERS).length).toBeGreaterThan(0);
  });

  it("has handler for check_compliance_status", () => {
    expect(typeof TOOL_HANDLERS["check_compliance_status"]).toBe("function");
  });

  it("has handler for get_article_requirements", () => {
    expect(typeof TOOL_HANDLERS["get_article_requirements"]).toBe("function");
  });

  it("has handler for explain_term", () => {
    expect(typeof TOOL_HANDLERS["explain_term"]).toBe("function");
  });
});

// ─── check_compliance_status handler ───

describe("check_compliance_status handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns module scores and overall score", async () => {
    const result = await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.organizationName).toBe("Test Org");
    expect(data.overallScore).toBeDefined();
    expect(data.modules).toBeDefined();
    expect(data.summary).toBeTruthy();
  });

  it("filters to specific module", async () => {
    const result = await executeTool(
      makeToolCall("check_compliance_status", { module: "debris" }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    const modules = data.modules as Record<string, unknown>;
    expect(modules.debris).toBeDefined();
    // Other modules should NOT be present when filtering
    expect(modules.cybersecurity).toBeUndefined();
  });

  it("includes details when requested", async () => {
    mockPrisma.debrisAssessment.findFirst.mockResolvedValueOnce({
      complianceScore: 75,
      updatedAt: new Date(),
      orbitType: "LEO",
    });
    const result = await executeTool(
      makeToolCall("check_compliance_status", {
        module: "debris",
        includeDetails: true,
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const modules = data.modules as Record<string, Record<string, unknown>>;
    expect(modules.debris.details).toBeDefined();
  });

  it("shows not_started for missing assessments", async () => {
    const result = await executeTool(
      makeToolCall("check_compliance_status", { module: "nis2" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const modules = data.modules as Record<string, Record<string, unknown>>;
    expect(modules.nis2.status).toBe("not_started");
    expect(modules.nis2.score).toBe(0);
  });
});

// ─── get_article_requirements handler ───

describe("get_article_requirements handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns article details for known article", async () => {
    const result = await executeTool(
      makeToolCall("get_article_requirements", { articleNumber: "6" }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.applicable).toBe(true);
    const article = data.article as Record<string, unknown>;
    expect(article.number).toBe("6");
    expect(article.title).toBe("Authorization Requirement");
  });

  it("extracts base number from composite reference", async () => {
    const result = await executeTool(
      makeToolCall("get_article_requirements", { articleNumber: "58(2)(a)" }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
  });

  it("returns not found for unknown article", async () => {
    const result = await executeTool(
      makeToolCall("get_article_requirements", { articleNumber: "999" }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(false);
  });

  it("returns suggestions when search matches", async () => {
    const result = await executeTool(
      makeToolCall("get_article_requirements", {
        articleNumber: "insurance",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(false);
    // searchArticles("insurance") should find matching articles
    if (data.suggestions) {
      expect(Array.isArray(data.suggestions)).toBe(true);
    }
  });

  it("filters by operator type", async () => {
    // Art. 10 only applies to SCO
    const result = await executeTool(
      makeToolCall("get_article_requirements", {
        articleNumber: "10",
        operatorType: "TCO",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.applicable).toBe(false);
  });
});

// ─── compare_jurisdictions handler ───

describe("compare_jurisdictions handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("compares two valid jurisdictions", async () => {
    const result = await executeTool(
      makeToolCall("compare_jurisdictions", {
        jurisdictions: ["FR", "DE"],
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.comparison).toBeDefined();
    expect((data.comparison as unknown[]).length).toBe(2);
    expect(data.recommendation).toBeDefined();
  });

  it("returns error for less than 2 jurisdictions", async () => {
    const result = await executeTool(
      makeToolCall("compare_jurisdictions", {
        jurisdictions: ["FR"],
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("At least 2 jurisdictions");
  });

  it("returns error for unknown jurisdictions", async () => {
    const result = await executeTool(
      makeToolCall("compare_jurisdictions", {
        jurisdictions: ["FR", "XX"],
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Unknown jurisdiction");
  });

  it("accepts specific comparison factors", async () => {
    const result = await executeTool(
      makeToolCall("compare_jurisdictions", {
        jurisdictions: ["FR", "LU"],
        comparisonFactors: ["processingTime", "fees"],
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    const comparison = data.comparison as Array<Record<string, unknown>>;
    expect(comparison[0].processingTimeDays).toBeDefined();
    expect(comparison[0].fees).toBeDefined();
    // favorabilityScore should NOT be present since not requested
    expect(comparison[0].favorabilityScore).toBeUndefined();
  });
});

// ─── explain_term handler ───

describe("explain_term handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns term info for known abbreviation", async () => {
    const result = await executeTool(
      makeToolCall("explain_term", { term: "SCO" }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.abbreviation).toBe("SCO");
    expect(data.fullName).toBe("Spacecraft Operator");
    expect(data.definition).toBeTruthy();
    expect(data.examples).toBeDefined();
  });

  it("excludes examples when includeExamples is false", async () => {
    const result = await executeTool(
      makeToolCall("explain_term", { term: "SCO", includeExamples: false }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.examples).toBeUndefined();
  });

  it("returns not found for unknown term", async () => {
    const result = await executeTool(
      makeToolCall("explain_term", { term: "ZZZZZ" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(false);
    expect(data.message).toContain("not found");
  });

  it("finds term by search if abbreviation fails", async () => {
    const result = await executeTool(
      makeToolCall("explain_term", { term: "Spacecraft Operator" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
  });
});

// ─── search_regulation handler ───

describe("search_regulation handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns search results", async () => {
    const result = await executeTool(
      makeToolCall("search_regulation", { query: "insurance" }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.query).toBe("insurance");
    expect(data.results).toBeDefined();
    expect(data.totalResults).toBeDefined();
  });

  it("respects maxResults limit", async () => {
    const result = await executeTool(
      makeToolCall("search_regulation", { query: "security", maxResults: 2 }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const results = data.results as Record<string, unknown[]>;
    expect(results.euSpaceActArticles.length).toBeLessThanOrEqual(2);
    expect(results.nis2Requirements.length).toBeLessThanOrEqual(2);
    expect(results.glossaryTerms.length).toBeLessThanOrEqual(2);
  });

  it("caps maxResults at 10", async () => {
    const result = await executeTool(
      makeToolCall("search_regulation", { query: "security", maxResults: 100 }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const results = data.results as Record<string, unknown[]>;
    expect(results.euSpaceActArticles.length).toBeLessThanOrEqual(10);
  });
});

// ─── get_article_detail handler ───

describe("get_article_detail handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns EU Space Act article details", async () => {
    const result = await executeTool(
      makeToolCall("get_article_detail", {
        regulation: "eu_space_act",
        article: "6",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.regulation).toBe("eu_space_act");
  });

  it("returns not found for unknown EU Space Act article", async () => {
    const result = await executeTool(
      makeToolCall("get_article_detail", {
        regulation: "eu_space_act",
        article: "999",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(false);
  });

  it("returns placeholder for non-EU Space Act regulations", async () => {
    const result = await executeTool(
      makeToolCall("get_article_detail", {
        regulation: "nis2",
        article: "21",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.message).toBeTruthy();
  });
});

// ─── check_cross_regulation_overlap handler ───

describe("check_cross_regulation_overlap handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("analyzes overlap between two regulations", async () => {
    const result = await executeTool(
      makeToolCall("check_cross_regulation_overlap", {
        sourceRegulation: "NIS2",
        targetRegulation: "EU Space Act",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.analysis).toBeDefined();
    expect(data.mappings).toBeDefined();
    expect(data.summary).toBeTruthy();
  });

  it("returns all overlaps for source regulation only", async () => {
    const result = await executeTool(
      makeToolCall("check_cross_regulation_overlap", {
        sourceRegulation: "NIS2",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.sourceRegulation).toBe("NIS2");
    expect(data.overlaps).toBeDefined();
  });
});

// ─── get_assessment_results handler ───

describe("get_assessment_results handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not found when no assessment exists", async () => {
    const result = await executeTool(
      makeToolCall("get_assessment_results", { assessmentType: "debris" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(false);
  });

  it("returns assessment data when found", async () => {
    mockPrisma.debrisAssessment.findFirst.mockResolvedValueOnce({
      id: "assess-1",
      complianceScore: 80,
    });
    const result = await executeTool(
      makeToolCall("get_assessment_results", { assessmentType: "debris" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.assessmentType).toBe("debris");
  });

  it("returns error for unknown assessment type", async () => {
    const result = await executeTool(
      makeToolCall("get_assessment_results", { assessmentType: "unknown" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Unknown assessment type");
  });
});

// ─── get_operator_classification handler ───

describe("get_operator_classification handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not classified when no operator type", async () => {
    const result = await executeTool(
      makeToolCall("get_operator_classification"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.classified).toBe(false);
  });

  it("returns classification for known operator type", async () => {
    const ctx: AstraUserContext = {
      ...defaultUserContext,
      operatorType: "SCO",
    };
    const result = await executeTool(
      makeToolCall("get_operator_classification"),
      ctx,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.classified).toBe(true);
    expect(data.operatorType).toBe("SCO");
    expect(data.name).toBe("Spacecraft Operator");
    expect(data.keyObligations).toBeDefined();
  });

  it("returns articles when includeApplicableArticles is true", async () => {
    const ctx: AstraUserContext = {
      ...defaultUserContext,
      operatorType: "SCO",
    };
    const result = await executeTool(
      makeToolCall("get_operator_classification", {
        includeApplicableArticles: true,
      }),
      ctx,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.applicableArticles).toBeDefined();
    expect(data.articleCount).toBeGreaterThan(0);
  });

  it("handles unknown operator type", async () => {
    const ctx: AstraUserContext = {
      ...defaultUserContext,
      operatorType: "UNKNOWN_TYPE",
    };
    const result = await executeTool(
      makeToolCall("get_operator_classification"),
      ctx,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.classified).toBe(true);
    expect(data.message).toContain("Unknown operator type");
  });
});

// ─── estimate_compliance_cost_time handler ───

describe("estimate_compliance_cost_time handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cost estimates for known step", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "authorization_application",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.complianceStep).toBe("authorization_application");
    expect(data.estimatedTime).toBeTruthy();
    expect(data.estimatedCost).toBeDefined();
    expect(data.disclaimer).toBeTruthy();
  });

  it("scales costs for startup", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "authorization_application",
        organizationSize: "startup",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const cost = data.estimatedCost as Record<string, unknown>;
    expect(cost.min as number).toBeLessThan(10000);
  });

  it("scales costs for large_enterprise", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "authorization_application",
        organizationSize: "large_enterprise",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const cost = data.estimatedCost as Record<string, unknown>;
    expect(cost.min as number).toBeGreaterThan(10000);
  });

  it("returns error for unknown step", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "unknown_step",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Unknown compliance step");
  });
});

// ─── assess_regulatory_impact handler ───

describe("assess_regulatory_impact handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns impacts for known scenario type", async () => {
    const result = await executeTool(
      makeToolCall("assess_regulatory_impact", {
        scenarioType: "orbit_change",
        scenarioDetails: { currentState: "LEO", proposedChange: "GEO" },
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.scenarioType).toBe("orbit_change");
    expect(Array.isArray(data.impacts)).toBe(true);
    expect((data.impacts as string[]).length).toBeGreaterThan(0);
  });

  it("returns generic impact for unknown scenario type", async () => {
    const result = await executeTool(
      makeToolCall("assess_regulatory_impact", {
        scenarioType: "unknown_type",
        scenarioDetails: {},
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect((data.impacts as string[]).length).toBe(1);
    expect((data.impacts as string[])[0]).toContain("analysis required");
  });
});

// ─── suggest_compliance_path handler ───

describe("suggest_compliance_path handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns path for full_authorization", async () => {
    const result = await executeTool(
      makeToolCall("suggest_compliance_path", { goal: "full_authorization" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.goal).toBe("full_authorization");
    expect(Array.isArray(data.path)).toBe(true);
    expect((data.path as unknown[]).length).toBeGreaterThan(0);
  });

  it("returns path for nis2_compliance", async () => {
    const result = await executeTool(
      makeToolCall("suggest_compliance_path", { goal: "nis2_compliance" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.goal).toBe("nis2_compliance");
    expect((data.path as unknown[]).length).toBeGreaterThan(0);
  });

  it("returns fallback for unknown goal", async () => {
    const result = await executeTool(
      makeToolCall("suggest_compliance_path", { goal: "unknown_goal" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect((data.path as unknown[]).length).toBe(1);
  });
});

// ─── get_cross_references handler ───

describe("get_cross_references handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cross references for known article", async () => {
    const result = await executeTool(
      makeToolCall("get_cross_references", {
        sourceRegulation: "NIS2",
        sourceArticle: "Art. 21(2)(a)",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.sourceRegulation).toBe("NIS2");
    expect(data.sourceArticle).toBe("Art. 21(2)(a)");
    expect(data.total).toBeGreaterThan(0);
    expect(Array.isArray(data.crossReferences)).toBe(true);
  });
});

// ─── run_gap_analysis handler ───

describe("run_gap_analysis handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns gaps for not_started modules", async () => {
    const result = await executeTool(
      makeToolCall("run_gap_analysis"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.totalGaps).toBeGreaterThan(0);
    expect(Array.isArray(data.gaps)).toBe(true);
  });

  it("filters by priority", async () => {
    const result = await executeTool(
      makeToolCall("run_gap_analysis", { priorityFilter: "critical" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const gaps = data.gaps as Array<Record<string, unknown>>;
    for (const gap of gaps) {
      expect(gap.priority).toBe("critical");
    }
  });

  it("includes recommendations by default", async () => {
    const result = await executeTool(
      makeToolCall("run_gap_analysis"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const gaps = data.gaps as Array<Record<string, unknown>>;
    if (gaps.length > 0) {
      expect(gaps[0].recommendation).toBeTruthy();
    }
  });

  it("excludes recommendations when disabled", async () => {
    const result = await executeTool(
      makeToolCall("run_gap_analysis", { includeRecommendations: false }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const gaps = data.gaps as Array<Record<string, unknown>>;
    if (gaps.length > 0) {
      expect(gaps[0].recommendation).toBeUndefined();
    }
  });
});

// ─── query_compliance_twin handler ───

describe("query_compliance_twin handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full twin state with no focus area", async () => {
    const result = await executeTool(
      makeToolCall("query_compliance_twin"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.score).toBeDefined();
    expect(data.evidence).toBeDefined();
    expect(data.deadlines).toBeDefined();
    expect(data.summary).toBeTruthy();
  });

  it("returns score focus area", async () => {
    const result = await executeTool(
      makeToolCall("query_compliance_twin", { focusArea: "score" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.overallScore).toBe(72);
    expect(data.grade).toBe("B");
    expect(data.summary).toBeTruthy();
  });

  it("returns evidence focus area", async () => {
    const result = await executeTool(
      makeToolCall("query_compliance_twin", { focusArea: "evidence" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.completePct).toBe(65);
    expect(data.summary).toBeTruthy();
  });

  it("returns deadlines focus area", async () => {
    const result = await executeTool(
      makeToolCall("query_compliance_twin", { focusArea: "deadlines" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.healthScore).toBe(80);
  });

  it("returns risk focus area", async () => {
    const result = await executeTool(
      makeToolCall("query_compliance_twin", { focusArea: "risk" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.estimatedRiskEur).toBe(2_500_000);
  });

  it("returns velocity focus area", async () => {
    const result = await executeTool(
      makeToolCall("query_compliance_twin", { focusArea: "velocity" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.trend).toBe("improving");
  });

  it("returns modules focus area", async () => {
    const result = await executeTool(
      makeToolCall("query_compliance_twin", { focusArea: "modules" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.modules).toBeDefined();
    expect(data.summary).toBeTruthy();
  });
});

// ─── get_evidence_gaps handler ───

describe("get_evidence_gaps handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all evidence gaps", async () => {
    const result = await executeTool(
      makeToolCall("get_evidence_gaps"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.totalGaps).toBe(3);
    expect(data.byCriticality).toBeDefined();
  });

  it("filters by framework", async () => {
    const result = await executeTool(
      makeToolCall("get_evidence_gaps", { framework: "debris" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.totalGaps).toBe(1);
  });

  it("filters by onlyCritical", async () => {
    const result = await executeTool(
      makeToolCall("get_evidence_gaps", { onlyCritical: true }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.totalGaps).toBe(2); // critical + high
  });
});

// ─── get_deadline_timeline handler ───

describe("get_deadline_timeline handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty deadlines when none exist", async () => {
    const result = await executeTool(
      makeToolCall("get_deadline_timeline"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.deadlines).toEqual([]);
    expect(data.summary).toContain("0 deadlines");
  });

  it("returns deadlines with days remaining", async () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    mockPrisma.deadline.findMany.mockResolvedValueOnce([
      {
        id: "dl-1",
        title: "Submit report",
        description: "Annual report",
        dueDate: futureDate,
        priority: "high",
        status: "pending",
        category: "authorization",
      },
    ]);
    const result = await executeTool(
      makeToolCall("get_deadline_timeline", { daysAhead: 30 }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    const deadlines = data.deadlines as Array<Record<string, unknown>>;
    expect(deadlines.length).toBe(1);
    expect(deadlines[0].title).toBe("Submit report");
    expect(deadlines[0].module).toBe("authorization");
    expect(deadlines[0].daysRemaining).toBeGreaterThan(0);
  });

  it("caps daysAhead at 365", async () => {
    await executeTool(
      makeToolCall("get_deadline_timeline", { daysAhead: 999 }),
      defaultUserContext,
    );
    // verify prisma was called; daysAhead should be capped at 365
    expect(mockPrisma.deadline.findMany).toHaveBeenCalled();
  });

  it("defaults daysAhead to 90", async () => {
    const result = await executeTool(
      makeToolCall("get_deadline_timeline"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.summary).toContain("90 days");
  });
});

// ─── get_nis2_classification handler ───

describe("get_nis2_classification handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not classified when no assessment and no context", async () => {
    const result = await executeTool(
      makeToolCall("get_nis2_classification"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.classified).toBe(false);
    expect(data.message).toContain("not yet determined");
  });

  it("returns classification from assessment", async () => {
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValueOnce({
      entityClassification: "essential",
      complianceScore: 60,
    });
    const result = await executeTool(
      makeToolCall("get_nis2_classification"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.classified).toBe(true);
    expect(data.entityClassification).toBe("essential");
    expect(data.description).toContain("Essential entity");
  });

  it("returns classification from user context when no assessment", async () => {
    const ctx: AstraUserContext = {
      ...defaultUserContext,
      nis2Classification: "important",
    };
    const result = await executeTool(
      makeToolCall("get_nis2_classification"),
      ctx,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.classified).toBe(true);
    expect(data.entityClassification).toBe("important");
    expect(data.description).toContain("Important entity");
  });

  it("includes requirements for essential entity", async () => {
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValueOnce({
      entityClassification: "essential",
    });
    const result = await executeTool(
      makeToolCall("get_nis2_classification", { includeRequirements: true }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.requirements).toBeDefined();
    expect(data.requirementCount).toBeGreaterThan(0);
  });

  it("includes timeline and penalties", async () => {
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValueOnce({
      entityClassification: "essential",
    });
    const result = await executeTool(
      makeToolCall("get_nis2_classification", { includeTimelines: true }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.incidentTimeline).toBeDefined();
    expect(data.penalties).toBeDefined();
  });

  it("excludes requirements when disabled", async () => {
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValueOnce({
      entityClassification: "essential",
    });
    const result = await executeTool(
      makeToolCall("get_nis2_classification", { includeRequirements: false }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.requirements).toBeUndefined();
  });

  it("excludes timelines when disabled", async () => {
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValueOnce({
      entityClassification: "essential",
    });
    const result = await executeTool(
      makeToolCall("get_nis2_classification", { includeTimelines: false }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.incidentTimeline).toBeUndefined();
    expect(data.penalties).toBeUndefined();
  });

  it("handles out_of_scope classification (no requirements)", async () => {
    const ctx: AstraUserContext = {
      ...defaultUserContext,
      nis2Classification: "out_of_scope",
    };
    const result = await executeTool(
      makeToolCall("get_nis2_classification", { includeRequirements: true }),
      ctx,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.classified).toBe(true);
    expect(data.entityClassification).toBe("out_of_scope");
    // out_of_scope should NOT have requirements
    expect(data.requirements).toBeUndefined();
  });
});

// ─── list_documents handler ───

describe("list_documents handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns documents for user", async () => {
    mockPrisma.document.findMany.mockResolvedValueOnce([
      {
        id: "doc-1",
        name: "Insurance cert",
        category: "insurance",
        status: "ACTIVE",
        expiryDate: null,
        createdAt: new Date(),
        fileSize: 1024,
      },
    ]);
    const result = await executeTool(
      makeToolCall("list_documents"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.total).toBe(1);
    expect((data.documents as unknown[]).length).toBe(1);
  });

  it("filters by category", async () => {
    mockPrisma.document.findMany.mockResolvedValueOnce([]);
    await executeTool(
      makeToolCall("list_documents", { category: "insurance" }),
      defaultUserContext,
    );
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "insurance" }),
      }),
    );
  });

  it("filters by status", async () => {
    mockPrisma.document.findMany.mockResolvedValueOnce([]);
    await executeTool(
      makeToolCall("list_documents", { status: "ACTIVE" }),
      defaultUserContext,
    );
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("filters by expiringWithinDays", async () => {
    mockPrisma.document.findMany.mockResolvedValueOnce([]);
    await executeTool(
      makeToolCall("list_documents", { expiringWithinDays: 30 }),
      defaultUserContext,
    );
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          expiryDate: expect.objectContaining({
            lte: expect.any(Date),
            gte: expect.any(Date),
          }),
        }),
      }),
    );
  });
});

// ─── check_document_completeness handler ───

describe("check_document_completeness handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns completeness for authorization_application", async () => {
    mockPrisma.document.findMany.mockResolvedValueOnce([]);
    const result = await executeTool(
      makeToolCall("check_document_completeness", {
        module: "authorization_application",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.module).toBe("authorization_application");
    expect(data.required).toBe(6);
    expect(data.present).toBe(0);
    expect(data.complete).toBe(false);
    expect(data.completenessPercent).toBe(0);
  });

  it("returns complete when all docs present", async () => {
    mockPrisma.document.findMany.mockResolvedValueOnce([
      { name: "TPL Insurance Certificate", category: "insurance" },
      { name: "Policy Schedule Document", category: "insurance" },
    ]);
    const result = await executeTool(
      makeToolCall("check_document_completeness", { module: "insurance" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.complete).toBe(true);
    expect(data.completenessPercent).toBe(100);
  });

  it("handles unknown module gracefully (empty required list)", async () => {
    mockPrisma.document.findMany.mockResolvedValueOnce([]);
    const result = await executeTool(
      makeToolCall("check_document_completeness", { module: "unknown_module" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.required).toBe(0);
    expect(data.complete).toBe(true);
    expect(data.completenessPercent).toBe(100);
  });
});

// ─── generate_compliance_report handler ───

describe("generate_compliance_report handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes gap_analysis report", async () => {
    const result = await executeTool(
      makeToolCall("generate_compliance_report", {
        reportType: "gap_analysis",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("initialized");
    expect(data.documentId).toBe("doc-123");
    expect(data.reportType).toBe("gap_analysis");
    expect(data.readinessScore).toBe(75);
  });

  it("initializes nis2_status report", async () => {
    const result = await executeTool(
      makeToolCall("generate_compliance_report", { reportType: "nis2_status" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("initialized");
    expect(data.reportType).toBe("nis2_status");
  });

  it("returns redirect for unknown report type", async () => {
    const result = await executeTool(
      makeToolCall("generate_compliance_report", {
        reportType: "custom_report",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("redirect");
    expect(data.viewUrl).toBe("/dashboard/generate");
  });

  it("handles initGeneration error", async () => {
    const { initGeneration } = await import("@/lib/generate");
    (initGeneration as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Gen failed"),
    );
    const result = await executeTool(
      makeToolCall("generate_compliance_report", {
        reportType: "gap_analysis",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Failed to initialize document");
    expect(data.error).toContain("Gen failed");
  });
});

// ─── generate_authorization_application handler ───

describe("generate_authorization_application handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes authorization application for valid jurisdiction", async () => {
    const result = await executeTool(
      makeToolCall("generate_authorization_application", {
        jurisdiction: "FR",
        applicationType: "new",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("initialized");
    expect(data.jurisdiction).toBe("FR");
    expect(data.documentId).toBe("doc-123");
    expect(data.notes).toBeDefined();
    expect((data.notes as string[]).length).toBeGreaterThan(0);
  });

  it("returns error for unknown jurisdiction", async () => {
    const result = await executeTool(
      makeToolCall("generate_authorization_application", {
        jurisdiction: "XX",
        applicationType: "new",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Unknown jurisdiction");
  });

  it("handles initGeneration error", async () => {
    const { initGeneration } = await import("@/lib/generate");
    (initGeneration as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Init error"),
    );
    const result = await executeTool(
      makeToolCall("generate_authorization_application", {
        jurisdiction: "FR",
        applicationType: "new",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Failed to initialize document");
  });
});

// ─── generate_debris_mitigation_plan handler ───

describe("generate_debris_mitigation_plan handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes debris mitigation plan", async () => {
    const result = await executeTool(
      makeToolCall("generate_debris_mitigation_plan", { format: "pdf" }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("initialized");
    expect(data.documentId).toBe("doc-123");
    expect(data.format).toBe("pdf");
  });

  it("handles initGeneration error", async () => {
    const { initGeneration } = await import("@/lib/generate");
    (initGeneration as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("DMP fail"),
    );
    const result = await executeTool(
      makeToolCall("generate_debris_mitigation_plan"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Failed to initialize document");
  });
});

// ─── generate_cybersecurity_framework handler ───

describe("generate_cybersecurity_framework handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes cybersecurity framework", async () => {
    const result = await executeTool(
      makeToolCall("generate_cybersecurity_framework"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("initialized");
    expect(data.documentId).toBe("doc-123");
    expect(data.readinessLevel).toBe("ready");
  });

  it("handles initGeneration error", async () => {
    const { initGeneration } = await import("@/lib/generate");
    (initGeneration as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Cyber fail"),
    );
    const result = await executeTool(
      makeToolCall("generate_cybersecurity_framework"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Failed to initialize document");
  });
});

// ─── generate_environmental_report handler ───

describe("generate_environmental_report handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes environmental report", async () => {
    const result = await executeTool(
      makeToolCall("generate_environmental_report"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("initialized");
    expect(data.documentId).toBe("doc-123");
  });

  it("handles initGeneration error", async () => {
    const { initGeneration } = await import("@/lib/generate");
    (initGeneration as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Env fail"),
    );
    const result = await executeTool(
      makeToolCall("generate_environmental_report"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Failed to initialize document");
  });
});

// ─── generate_insurance_report handler ───

describe("generate_insurance_report handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes insurance report", async () => {
    const result = await executeTool(
      makeToolCall("generate_insurance_report"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("initialized");
    expect(data.documentId).toBe("doc-123");
  });

  it("handles initGeneration error", async () => {
    const { initGeneration } = await import("@/lib/generate");
    (initGeneration as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Ins fail"),
    );
    const result = await executeTool(
      makeToolCall("generate_insurance_report"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Failed to initialize document");
  });
});

// ─── generate_nis2_report handler ───

describe("generate_nis2_report handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes NIS2 report", async () => {
    const result = await executeTool(
      makeToolCall("generate_nis2_report"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.status).toBe("initialized");
    expect(data.documentId).toBe("doc-123");
  });

  it("handles initGeneration error", async () => {
    const { initGeneration } = await import("@/lib/generate");
    (initGeneration as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("NIS2 fail"),
    );
    const result = await executeTool(
      makeToolCall("generate_nis2_report"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Failed to initialize document");
  });
});

// ─── get_nca_submissions handler ───

describe("get_nca_submissions handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty submissions list", async () => {
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([]);
    const result = await executeTool(
      makeToolCall("get_nca_submissions"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.totalFound).toBe(0);
    expect(data.submissions).toEqual([]);
  });

  it("returns submissions with details", async () => {
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([
      {
        id: "sub-1",
        ncaAuthority: "CNES",
        ncaAuthorityName: "CNES France",
        status: "SUBMITTED",
        priority: "high",
        submittedAt: new Date("2026-01-15"),
        ncaReference: "REF-001",
        report: { title: "Compliance Report", reportType: "gap_analysis" },
        _count: { correspondence: 2 },
        followUpRequired: true,
        followUpDeadline: new Date("2026-04-01"),
        slaDeadline: new Date("2026-05-01"),
      },
    ]);
    const result = await executeTool(
      makeToolCall("get_nca_submissions"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.totalFound).toBe(1);
    const subs = data.submissions as Array<Record<string, unknown>>;
    expect(subs[0].ncaAuthority).toBe("CNES");
    expect(subs[0].correspondenceCount).toBe(2);
    expect(subs[0].followUpRequired).toBe(true);
  });

  it("filters by ncaAuthority", async () => {
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([]);
    await executeTool(
      makeToolCall("get_nca_submissions", { ncaAuthority: "CNES" }),
      defaultUserContext,
    );
    expect(mockPrisma.nCASubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ncaAuthority: "CNES" }),
      }),
    );
  });

  it("filters by status", async () => {
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([]);
    await executeTool(
      makeToolCall("get_nca_submissions", { status: "SUBMITTED" }),
      defaultUserContext,
    );
    expect(mockPrisma.nCASubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "SUBMITTED" }),
      }),
    );
  });

  it("filters activeOnly (excludes terminal statuses)", async () => {
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([]);
    await executeTool(
      makeToolCall("get_nca_submissions", { activeOnly: true }),
      defaultUserContext,
    );
    expect(mockPrisma.nCASubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ["APPROVED", "REJECTED", "WITHDRAWN"] },
        }),
      }),
    );
  });
});

// ─── get_submission_detail handler ───

describe("get_submission_detail handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not found when no submission", async () => {
    mockPrisma.nCASubmission.findFirst.mockResolvedValueOnce(null);
    const result = await executeTool(
      makeToolCall("get_submission_detail", { submissionId: "sub-999" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(false);
  });

  it("returns submission by ID", async () => {
    mockPrisma.nCASubmission.findFirst.mockResolvedValueOnce({
      id: "sub-1",
      ncaAuthority: "CNES",
      ncaAuthorityName: "CNES France",
      status: "SUBMITTED",
      priority: "high",
      submittedAt: new Date("2026-01-15"),
      ncaReference: "REF-001",
      report: { title: "Report", reportType: "gap", status: "COMPLETED" },
      correspondence: [
        {
          direction: "outgoing",
          subject: "Initial submission",
          createdAt: new Date("2026-01-15"),
          requiresResponse: false,
        },
      ],
      package: {
        packageName: "Authorization Package",
        completenessScore: 85,
        missingDocuments: [],
      },
      followUpRequired: false,
      followUpDeadline: null,
      slaDeadline: null,
      statusHistory: JSON.stringify([
        { status: "SUBMITTED", timestamp: "2026-01-15" },
      ]),
    });
    const result = await executeTool(
      makeToolCall("get_submission_detail", { submissionId: "sub-1" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    const sub = data.submission as Record<string, unknown>;
    expect(sub.id).toBe("sub-1");
    expect(sub.correspondenceCount).toBe(1);
    expect(sub.package).toBeDefined();
  });

  it("looks up by ncaAuthority when no submissionId", async () => {
    mockPrisma.nCASubmission.findFirst.mockResolvedValueOnce({
      id: "sub-2",
      ncaAuthority: "BNetzA",
      ncaAuthorityName: "BNetzA Germany",
      status: "IN_REVIEW",
      priority: "medium",
      submittedAt: new Date("2026-02-01"),
      ncaReference: "REF-002",
      report: { title: "Report", reportType: "cyber", status: "COMPLETED" },
      correspondence: [],
      package: null,
      followUpRequired: false,
      followUpDeadline: null,
      slaDeadline: null,
      statusHistory: "[]",
    });
    const result = await executeTool(
      makeToolCall("get_submission_detail", { ncaAuthority: "BNetzA" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
  });

  it("handles invalid JSON in statusHistory", async () => {
    mockPrisma.nCASubmission.findFirst.mockResolvedValueOnce({
      id: "sub-3",
      ncaAuthority: "CNES",
      ncaAuthorityName: "CNES",
      status: "SUBMITTED",
      priority: "low",
      submittedAt: new Date(),
      ncaReference: null,
      report: { title: "R", reportType: "t", status: "s" },
      correspondence: [],
      package: null,
      followUpRequired: false,
      followUpDeadline: null,
      slaDeadline: null,
      statusHistory: "INVALID JSON",
    });
    const result = await executeTool(
      makeToolCall("get_submission_detail", { submissionId: "sub-3" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    const sub = data.submission as Record<string, unknown>;
    // Should have empty statusHistory because of invalid JSON
    expect(sub.statusHistory).toEqual([]);
  });
});

// ─── check_package_completeness handler ───

describe("check_package_completeness handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when no org membership", async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValueOnce(null);
    const result = await executeTool(
      makeToolCall("check_package_completeness", { ncaAuthority: "CNES" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("No organization found");
  });

  it("returns package completeness when membership exists", async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValueOnce({
      organizationId: "org-1",
    });
    const result = await executeTool(
      makeToolCall("check_package_completeness", { ncaAuthority: "CNES" }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.completenessScore).toBe(85);
    expect(data.readyToSubmit).toBe(true);
    expect(data.recommendation).toContain("substantially complete");
  });
});

// ─── get_nca_deadlines handler ───

describe("get_nca_deadlines handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns no deadlines message when empty", async () => {
    mockPrisma.nCASubmission.findMany.mockResolvedValue([]);
    mockPrisma.nCACorrespondence.findMany.mockResolvedValueOnce([]);
    const result = await executeTool(
      makeToolCall("get_nca_deadlines"),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.summary).toContain("No upcoming NCA deadlines");
  });

  it("returns upcoming deadlines", async () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    // Single combined query returns all relevant submissions
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([
      {
        id: "sub-1",
        ncaAuthority: "CNES",
        ncaAuthorityName: "CNES France",
        status: "SUBMITTED",
        followUpDeadline: futureDate,
        slaDeadline: null,
        followUpRequired: true,
      },
    ]);
    mockPrisma.nCACorrespondence.findMany.mockResolvedValueOnce([]);

    const result = await executeTool(
      makeToolCall("get_nca_deadlines"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const deadlines = data.upcomingDeadlines as Array<Record<string, unknown>>;
    expect(deadlines.length).toBe(1);
    expect(deadlines[0].type).toBe("follow_up");
    expect(data.summary).toContain("1 upcoming deadline");
  });

  it("returns overdue items", async () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    // Single combined query returns overdue submission
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([
      {
        id: "sub-2",
        ncaAuthority: "BNetzA",
        ncaAuthorityName: "BNetzA Germany",
        status: "SUBMITTED",
        followUpDeadline: pastDate,
        slaDeadline: null,
        followUpRequired: true,
      },
    ]);
    mockPrisma.nCACorrespondence.findMany.mockResolvedValueOnce([]);

    const result = await executeTool(
      makeToolCall("get_nca_deadlines"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.overdueCount).toBe(1);
    expect(data.summary).toContain("overdue follow-up");
  });

  it("returns sla deadlines", async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    // Single combined query returns SLA deadline submission
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([
      {
        id: "sub-3",
        ncaAuthority: "CNES",
        ncaAuthorityName: "CNES France",
        status: "IN_REVIEW",
        followUpDeadline: null,
        slaDeadline: futureDate,
        followUpRequired: false,
      },
    ]);
    mockPrisma.nCACorrespondence.findMany.mockResolvedValueOnce([]);

    const result = await executeTool(
      makeToolCall("get_nca_deadlines"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const deadlines = data.upcomingDeadlines as Array<Record<string, unknown>>;
    expect(deadlines.length).toBe(1);
    expect(deadlines[0].type).toBe("sla");
    expect(deadlines[0].urgency).toBe("urgent");
  });

  it("returns pending responses", async () => {
    mockPrisma.nCASubmission.findMany.mockResolvedValueOnce([]);
    mockPrisma.nCACorrespondence.findMany.mockResolvedValueOnce([
      {
        id: "corr-1",
        subject: "Follow-up required",
        responseDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        submission: { ncaAuthorityName: "CNES France" },
      },
    ]);

    const result = await executeTool(
      makeToolCall("get_nca_deadlines"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const pending = data.pendingResponses as Array<Record<string, unknown>>;
    expect(pending.length).toBe(1);
    expect(pending[0].subject).toBe("Follow-up required");
  });
});

// ─── report_incident handler ───

describe("report_incident handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when no supervision config", async () => {
    mockPrisma.supervisionConfig.findUnique.mockResolvedValueOnce(null);
    const result = await executeTool(
      makeToolCall("report_incident", {
        category: "cyber_attack",
        title: "Test Incident",
        description: "Test description",
        detectedBy: "SOC team",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("No supervision configuration found");
  });

  it("creates incident when supervision config exists", async () => {
    mockPrisma.supervisionConfig.findUnique.mockResolvedValueOnce({
      id: "config-1",
      userId: "user-1",
    });
    const result = await executeTool(
      makeToolCall("report_incident", {
        category: "cyber_attack",
        title: "Test Incident",
        description: "Test description",
        detectedBy: "SOC team",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.incidentId).toBe("inc-123");
    expect(data.incidentNumber).toBe("INC-2026-001");
    expect(data.severity).toBe("high");
    expect(data.summary).toContain("INC-2026-001");
    expect(data.dashboardUrl).toBe("/dashboard/incidents");
  });

  it("returns error when createIncidentWithAutopilot fails", async () => {
    mockPrisma.supervisionConfig.findUnique.mockResolvedValueOnce({
      id: "config-1",
    });
    const { createIncidentWithAutopilot } =
      await import("@/lib/services/incident-autopilot");
    (
      createIncidentWithAutopilot as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      success: false,
      error: "Creation failed",
    });
    const result = await executeTool(
      makeToolCall("report_incident", {
        category: "cyber_attack",
        title: "Test",
        description: "Desc",
        detectedBy: "SOC",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Creation failed");
  });
});

// ─── get_incident_status handler ───

describe("get_incident_status handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when no id or number provided", async () => {
    const result = await executeTool(
      makeToolCall("get_incident_status"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("incidentId or incidentNumber");
  });

  it("returns error when incident not found by number", async () => {
    mockPrisma.incident.findFirst.mockResolvedValueOnce(null);
    const result = await executeTool(
      makeToolCall("get_incident_status", { incidentNumber: "INC-9999" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("INC-9999 not found");
  });

  it("returns error when command data is null", async () => {
    const result = await executeTool(
      makeToolCall("get_incident_status", { incidentId: "inc-1" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBe("Incident not found.");
  });

  it("returns incident data when found by ID", async () => {
    const { getIncidentCommandData } =
      await import("@/lib/services/incident-autopilot");
    (getIncidentCommandData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      incident: { incidentNumber: "INC-001", severity: "high" },
      workflow: { stateName: "investigating" },
      nis2Phases: [
        { countdown: { isSubmitted: false } },
        { countdown: { isSubmitted: true } },
      ],
    });
    const result = await executeTool(
      makeToolCall("get_incident_status", { incidentId: "inc-1" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.summary).toContain("INC-001");
    expect(data.summary).toContain("investigating");
  });

  it("looks up by incident number and returns data", async () => {
    mockPrisma.incident.findFirst.mockResolvedValueOnce({ id: "inc-2" });
    const { getIncidentCommandData } =
      await import("@/lib/services/incident-autopilot");
    (getIncidentCommandData as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      incident: { incidentNumber: "INC-002", severity: "critical" },
      workflow: { stateName: "triage" },
      nis2Phases: [],
    });
    const result = await executeTool(
      makeToolCall("get_incident_status", { incidentNumber: "INC-002" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.summary).toContain("INC-002");
  });
});

// ─── list_active_incidents handler ───

describe("list_active_incidents handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when no supervision config", async () => {
    mockPrisma.supervisionConfig.findUnique.mockResolvedValueOnce(null);
    const result = await executeTool(
      makeToolCall("list_active_incidents"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("No supervision configuration found");
    expect(data.incidents).toEqual([]);
  });

  it("returns empty list when no active incidents", async () => {
    mockPrisma.supervisionConfig.findUnique.mockResolvedValueOnce({
      id: "config-1",
    });
    const result = await executeTool(
      makeToolCall("list_active_incidents"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.total).toBe(0);
    expect(data.summary).toContain("No active incidents");
  });

  it("returns active incidents with overdue count", async () => {
    mockPrisma.supervisionConfig.findUnique.mockResolvedValueOnce({
      id: "config-1",
    });
    const { listActiveIncidents } =
      await import("@/lib/services/incident-autopilot");
    (listActiveIncidents as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "inc-1", nis2PhasesSummary: { overdue: 2 } },
      { id: "inc-2", nis2PhasesSummary: { overdue: 0 } },
    ]);
    const result = await executeTool(
      makeToolCall("list_active_incidents"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.total).toBe(2);
    expect(data.overduePhases).toBe(2);
    expect(data.summary).toContain("2 active incident(s)");
    expect(data.summary).toContain("2 overdue NIS2 phase(s)");
  });
});

// ─── draft_nca_notification handler ───

describe("draft_nca_notification handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when incident not found", async () => {
    mockPrisma.incident.findUnique.mockResolvedValueOnce(null);
    const result = await executeTool(
      makeToolCall("draft_nca_notification", {
        incidentId: "inc-999",
        phase: "early_warning",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toBe("Incident not found.");
  });

  it("generates draft when incident found", async () => {
    mockPrisma.incident.findUnique.mockResolvedValueOnce({
      id: "inc-1",
      incidentNumber: "INC-001",
      category: "cyber_attack",
      severity: "high",
      title: "Data Breach",
      description: "A description",
      detectedAt: new Date("2026-01-15"),
      detectedBy: "SOC",
      detectionMethod: "automated",
      rootCause: null,
      impactAssessment: null,
      immediateActions: null,
      containmentMeasures: null,
      resolutionSteps: null,
      lessonsLearned: null,
      affectedAssets: [],
      reportedToNCA: false,
      ncaReferenceNumber: null,
      resolvedAt: null,
    });
    const result = await executeTool(
      makeToolCall("draft_nca_notification", {
        incidentId: "inc-1",
        phase: "early_warning",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.title).toBe("Draft Title");
    expect(data.content).toBe("Draft content");
    expect(data.legalBasis).toBe("Art. 23(4)(a)");
    expect(data.instructions).toContain("review and submission");
    // Verify phase update was called
    expect(mockPrisma.incidentNIS2Phase.updateMany).toHaveBeenCalledWith({
      where: { incidentId: "inc-1", phase: "early_warning" },
      data: { draftContent: "Draft content", status: "draft_ready" },
    });
  });
});

// ─── advance_incident_workflow handler ───

describe("advance_incident_workflow handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("advances workflow successfully", async () => {
    const result = await executeTool(
      makeToolCall("advance_incident_workflow", {
        incidentId: "inc-1",
        event: "start_investigation",
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.previousState).toBe("triage");
    expect(data.currentState).toBe("investigating");
    expect(data.summary).toContain("triage");
    expect(data.summary).toContain("investigating");
  });

  it("returns error when workflow advance fails", async () => {
    const { advanceIncidentWorkflow } =
      await import("@/lib/services/incident-autopilot");
    (advanceIncidentWorkflow as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      {
        success: false,
        error: "Invalid transition",
      },
    );
    const result = await executeTool(
      makeToolCall("advance_incident_workflow", {
        incidentId: "inc-1",
        event: "invalid_event",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.error).toContain("Invalid transition");
  });
});

// ─── run_whatif_scenario handler ───

describe("run_whatif_scenario handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs scenario simulation and returns results", async () => {
    const result = await executeTool(
      makeToolCall("run_whatif_scenario", {
        scenarioType: "add_jurisdiction",
        parameters: { jurisdiction: "DE" },
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.baselineScore).toBe(72);
    expect(data.projectedScore).toBe(65);
    expect(data.scoreDelta).toBe(-7);
    expect(data.newRequirementsCount).toBe(2);
    expect(data.riskLevel).toBe("medium");
    expect(data.recommendations).toBeDefined();
    expect(data.summary).toContain("add_jurisdiction");
  });
});

// ─── Additional branch coverage tests ───

describe("check_compliance_status additional branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes cybersecurity module with assessment data", async () => {
    mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValueOnce({
      maturityScore: 65,
      updatedAt: new Date(),
    });
    const result = await executeTool(
      makeToolCall("check_compliance_status", { module: "cybersecurity" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const modules = data.modules as Record<string, Record<string, unknown>>;
    expect(modules.cybersecurity.status).toBe("assessed");
    expect(modules.cybersecurity.score).toBe(65);
  });

  it("includes insurance module with assessment data", async () => {
    mockPrisma.insuranceAssessment.findFirst.mockResolvedValueOnce({
      complianceScore: 90,
      updatedAt: new Date(),
    });
    const result = await executeTool(
      makeToolCall("check_compliance_status", { module: "insurance" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const modules = data.modules as Record<string, Record<string, unknown>>;
    expect(modules.insurance.status).toBe("assessed");
    expect(modules.insurance.score).toBe(90);
  });

  it("includes nis2 module with assessment data and entityClassification", async () => {
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValueOnce({
      complianceScore: 55,
      entityClassification: "essential",
      updatedAt: new Date(),
    });
    const result = await executeTool(
      makeToolCall("check_compliance_status", { module: "nis2" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const modules = data.modules as Record<string, Record<string, unknown>>;
    expect(modules.nis2.status).toBe("assessed");
    expect(modules.nis2.score).toBe(55);
    expect(modules.nis2.entityClassification).toBe("essential");
  });

  it("returns all modules when no filter", async () => {
    const result = await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const modules = data.modules as Record<string, unknown>;
    expect(modules.debris).toBeDefined();
    expect(modules.cybersecurity).toBeDefined();
    expect(modules.insurance).toBeDefined();
    expect(modules.nis2).toBeDefined();
  });

  it("uses org name from context when org query returns null", async () => {
    mockPrisma.organization.findUnique.mockResolvedValueOnce(null);
    const result = await executeTool(
      makeToolCall("check_compliance_status"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.organizationName).toBe("Test Org");
  });
});

describe("get_assessment_results additional types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cybersecurity assessment", async () => {
    mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValueOnce({
      id: "cyber-1",
      maturityScore: 70,
    });
    const result = await executeTool(
      makeToolCall("get_assessment_results", {
        assessmentType: "cybersecurity",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.assessmentType).toBe("cybersecurity");
  });

  it("returns insurance assessment", async () => {
    mockPrisma.insuranceAssessment.findFirst.mockResolvedValueOnce({
      id: "ins-1",
      complianceScore: 88,
    });
    const result = await executeTool(
      makeToolCall("get_assessment_results", { assessmentType: "insurance" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.assessmentType).toBe("insurance");
  });

  it("returns nis2 assessment", async () => {
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValueOnce({
      id: "nis2-1",
      complianceScore: 60,
    });
    const result = await executeTool(
      makeToolCall("get_assessment_results", { assessmentType: "nis2" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.assessmentType).toBe("nis2");
  });

  it("returns environmental assessment", async () => {
    mockPrisma.environmentalAssessment.findFirst.mockResolvedValueOnce({
      id: "env-1",
    });
    const result = await executeTool(
      makeToolCall("get_assessment_results", {
        assessmentType: "environmental",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.found).toBe(true);
    expect(data.assessmentType).toBe("environmental");
  });
});

describe("get_operator_classification additional branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes obligations when includeObligations is false", async () => {
    const ctx: AstraUserContext = {
      ...defaultUserContext,
      operatorType: "SCO",
    };
    const result = await executeTool(
      makeToolCall("get_operator_classification", {
        includeObligations: false,
      }),
      ctx,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.classified).toBe(true);
    expect(data.keyObligations).toBeUndefined();
    expect(data.applicableChapters).toBeUndefined();
  });
});

describe("suggest_compliance_path additional branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns path for launch_readiness", async () => {
    const result = await executeTool(
      makeToolCall("suggest_compliance_path", { goal: "launch_readiness" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.goal).toBe("launch_readiness");
    expect((data.path as unknown[]).length).toBeGreaterThan(0);
    expect(data.estimatedTotalDuration).toBe("2-6 months");
  });

  it("includes targetDate when provided", async () => {
    const result = await executeTool(
      makeToolCall("suggest_compliance_path", {
        goal: "full_authorization",
        targetDate: "2026-12-01",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.targetDate).toBe("2026-12-01");
  });
});

describe("assess_regulatory_impact additional scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns impacts for new_market scenario", async () => {
    const result = await executeTool(
      makeToolCall("assess_regulatory_impact", {
        scenarioType: "new_market",
        scenarioDetails: {},
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.scenarioType).toBe("new_market");
    expect((data.impacts as string[]).length).toBe(3);
  });

  it("returns impacts for constellation_expansion scenario", async () => {
    const result = await executeTool(
      makeToolCall("assess_regulatory_impact", {
        scenarioType: "constellation_expansion",
        scenarioDetails: {},
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect((data.impacts as string[]).length).toBe(3);
  });

  it("returns impacts for payload_change scenario", async () => {
    const result = await executeTool(
      makeToolCall("assess_regulatory_impact", {
        scenarioType: "payload_change",
        scenarioDetails: {},
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect((data.impacts as string[]).length).toBe(3);
  });

  it("returns impacts for ownership_change scenario", async () => {
    const result = await executeTool(
      makeToolCall("assess_regulatory_impact", {
        scenarioType: "ownership_change",
        scenarioDetails: {},
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect((data.impacts as string[]).length).toBe(3);
  });

  it("returns impacts for jurisdiction_change scenario", async () => {
    const result = await executeTool(
      makeToolCall("assess_regulatory_impact", {
        scenarioType: "jurisdiction_change",
        scenarioDetails: {},
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect((data.impacts as string[]).length).toBe(3);
  });
});

describe("check_cross_regulation_overlap additional branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes effort estimates when disabled", async () => {
    const result = await executeTool(
      makeToolCall("check_cross_regulation_overlap", {
        sourceRegulation: "NIS2",
        targetRegulation: "EU Space Act",
        includeEffortEstimates: false,
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    const mappings = data.mappings as Array<Record<string, unknown>>;
    if (mappings.length > 0) {
      expect(mappings[0].timeSavings).toBeUndefined();
    }
  });
});

describe("compare_jurisdictions additional branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes liabilityRegime when specified in factors", async () => {
    const result = await executeTool(
      makeToolCall("compare_jurisdictions", {
        jurisdictions: ["FR", "DE"],
        comparisonFactors: ["liabilityRegime"],
      }),
      defaultUserContext,
    );
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    const comparison = data.comparison as Array<Record<string, unknown>>;
    expect(comparison[0].liabilityRegime).toBeDefined();
    // processingTime should NOT be present
    expect(comparison[0].processingTimeDays).toBeUndefined();
  });

  it("includes insuranceMinimums and languageRequirements when specified", async () => {
    const result = await executeTool(
      makeToolCall("compare_jurisdictions", {
        jurisdictions: ["FR", "LU"],
        comparisonFactors: ["insuranceMinimums", "languageRequirements"],
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const comparison = data.comparison as Array<Record<string, unknown>>;
    expect(comparison[0].insuranceMinimums).toBeDefined();
    expect(comparison[0].languageRequirements).toBeDefined();
  });
});

describe("run_gap_analysis additional branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects debris partial compliance gap (score < 70)", async () => {
    mockPrisma.debrisAssessment.findFirst.mockResolvedValueOnce({
      complianceScore: 50,
      updatedAt: new Date(),
      orbitType: "LEO",
    });
    const result = await executeTool(
      makeToolCall("run_gap_analysis", { module: "debris" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const gaps = data.gaps as Array<Record<string, unknown>>;
    expect(gaps.length).toBe(1);
    expect(gaps[0].status).toBe("partial");
    expect(gaps[0].priority).toBe("medium");
  });

  it("shows no gaps when all modules are compliant (score >= 70)", async () => {
    mockPrisma.debrisAssessment.findFirst.mockResolvedValueOnce({
      complianceScore: 85,
      updatedAt: new Date(),
    });
    mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValueOnce({
      maturityScore: 80,
      updatedAt: new Date(),
    });
    mockPrisma.insuranceAssessment.findFirst.mockResolvedValueOnce({
      complianceScore: 90,
      updatedAt: new Date(),
    });
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValueOnce({
      complianceScore: 75,
      updatedAt: new Date(),
    });
    const result = await executeTool(
      makeToolCall("run_gap_analysis"),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.totalGaps).toBe(0);
    expect(data.summary).toContain("No compliance gaps identified");
  });

  it("filters by specific module", async () => {
    const result = await executeTool(
      makeToolCall("run_gap_analysis", { module: "insurance" }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    const gaps = data.gaps as Array<Record<string, unknown>>;
    expect(gaps.every((g) => g.module === "Insurance")).toBe(true);
  });
});

describe("estimate_compliance_cost_time additional steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns estimates for nis2_assessment", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "nis2_assessment",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.complianceStep).toBe("nis2_assessment");
    expect(data.estimatedTime).toBe("2-4 weeks");
  });

  it("returns estimates for debris_assessment", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "debris_assessment",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.complianceStep).toBe("debris_assessment");
  });

  it("returns estimates for cybersecurity_audit", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "cybersecurity_audit",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.complianceStep).toBe("cybersecurity_audit");
  });

  it("returns estimates for insurance_procurement", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "insurance_procurement",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.complianceStep).toBe("insurance_procurement");
  });

  it("returns estimates for iso_27001_certification", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "iso_27001_certification",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.complianceStep).toBe("iso_27001_certification");
  });

  it("returns estimates for penetration_testing", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "penetration_testing",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.complianceStep).toBe("penetration_testing");
  });

  it("defaults organizationSize to sme", async () => {
    const result = await executeTool(
      makeToolCall("estimate_compliance_cost_time", {
        complianceStep: "authorization_application",
      }),
      defaultUserContext,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.organizationSize).toBe("sme");
    const cost = data.estimatedCost as Record<string, unknown>;
    expect(cost.min).toBe(10000);
    expect(cost.max).toBe(50000);
  });
});
