/**
 * Tests for ASTRA Context Builder
 *
 * context-builder.ts imports "server-only" and prisma.
 * We mock both, then test detectTopics, buildUserContext,
 * buildTopicContext, and buildCompleteContext.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      organization: {
        findUnique: vi.fn(),
      },
      debrisAssessment: {
        findFirst: vi.fn(),
      },
      cybersecurityAssessment: {
        findFirst: vi.fn(),
      },
      insuranceAssessment: {
        findFirst: vi.fn(),
      },
      nIS2Assessment: {
        findFirst: vi.fn(),
      },
      deadline: {
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// ─── Import after mocks ───

import {
  detectTopics,
  buildUserContext,
  buildTopicContext,
  buildCompleteContext,
} from "./context-builder";
import type { AstraUserContext, AstraContext, AstraMissionData } from "./types";

// ─── detectTopics ───

describe("detectTopics", () => {
  it("detects debris topic from keyword 'debris'", () => {
    expect(detectTopics("How do debris mitigation rules work?")).toContain(
      "debris",
    );
  });

  it("detects debris topic from keyword 'deorbit'", () => {
    expect(detectTopics("What is the deorbit requirement?")).toContain(
      "debris",
    );
  });

  it("detects debris topic from keyword '25-year'", () => {
    expect(detectTopics("Is there a 25-year rule?")).toContain("debris");
  });

  it("detects debris topic from article ref 'art. 31'", () => {
    expect(detectTopics("Explain Art. 31")).toContain("debris");
  });

  it("detects cybersecurity topic from keyword 'cyber'", () => {
    expect(detectTopics("What are the cyber requirements?")).toContain(
      "cybersecurity",
    );
  });

  it("detects cybersecurity topic from keyword 'nis2'", () => {
    const topics = detectTopics("What does NIS2 require?");
    expect(topics).toContain("cybersecurity");
    expect(topics).toContain("nis2");
  });

  it("detects cybersecurity from 'encryption'", () => {
    expect(detectTopics("What about encryption standards?")).toContain(
      "cybersecurity",
    );
  });

  it("detects insurance topic from keyword 'insurance'", () => {
    expect(detectTopics("What insurance do I need?")).toContain("insurance");
  });

  it("detects insurance topic from keyword 'liability'", () => {
    expect(detectTopics("Third-party liability requirements")).toContain(
      "insurance",
    );
  });

  it("detects insurance from 'art. 58'", () => {
    expect(detectTopics("What does Art. 58 say?")).toContain("insurance");
  });

  it("detects authorization topic from keyword 'authorization'", () => {
    expect(
      detectTopics("How do I get authorization for my satellite?"),
    ).toContain("authorization");
  });

  it("detects authorization topic from keyword 'licence'", () => {
    expect(detectTopics("How to apply for a licence?")).toContain(
      "authorization",
    );
  });

  it("detects authorization from 'nca'", () => {
    expect(detectTopics("Which NCA should I apply to?")).toContain(
      "authorization",
    );
  });

  it("detects registration topic", () => {
    expect(detectTopics("How does registration work?")).toContain(
      "registration",
    );
  });

  it("detects registration from 'urso'", () => {
    expect(detectTopics("What is the URSO registry?")).toContain(
      "registration",
    );
  });

  it("detects nis2 topic from 'nis2'", () => {
    expect(detectTopics("NIS2 entity classification")).toContain("nis2");
  });

  it("detects nis2 from 'essential entity'", () => {
    expect(detectTopics("Am I an essential entity?")).toContain("nis2");
  });

  it("detects nis2 from 'directive 2022/2555'", () => {
    expect(detectTopics("Directive 2022/2555 requirements")).toContain("nis2");
  });

  it("detects jurisdiction topic from 'france'", () => {
    expect(detectTopics("How does France handle licensing?")).toContain(
      "jurisdiction",
    );
  });

  it("detects jurisdiction from 'compare'", () => {
    expect(detectTopics("Compare the different national laws")).toContain(
      "jurisdiction",
    );
  });

  it("detects operator_type topic from 'operator type'", () => {
    expect(detectTopics("What is my operator type?")).toContain(
      "operator_type",
    );
  });

  it("detects operator_type from 'sco'", () => {
    expect(detectTopics("SCO requirements")).toContain("operator_type");
  });

  it("detects multiple topics at once", () => {
    const topics = detectTopics(
      "What are the debris and insurance requirements for France?",
    );
    expect(topics).toContain("debris");
    expect(topics).toContain("insurance");
    expect(topics).toContain("jurisdiction");
  });

  it("returns ['general'] when no specific topic detected", () => {
    expect(detectTopics("Good morning, nice weather today")).toEqual([
      "general",
    ]);
  });

  it("returns ['general'] for empty string", () => {
    expect(detectTopics("")).toEqual(["general"]);
  });

  it("is case-insensitive", () => {
    expect(detectTopics("DEBRIS")).toContain("debris");
    expect(detectTopics("Insurance")).toContain("insurance");
  });
});

// ─── buildUserContext ───

describe("buildUserContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    mockPrisma.debrisAssessment.findFirst.mockResolvedValue(null);
    mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValue(null);
    mockPrisma.insuranceAssessment.findFirst.mockResolvedValue(null);
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValue(null);
    mockPrisma.deadline.findMany.mockResolvedValue([]);
  });

  it("returns minimal context when organization not found", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    const result = await buildUserContext("user-1", "org-1");
    expect(result.userId).toBe("user-1");
    expect(result.organizationId).toBe("org-1");
    expect(result.organizationName).toBe("Unknown Organization");
  });

  it("returns full context when organization found", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });

    const result = await buildUserContext("user-1", "org-1");
    expect(result.organizationName).toBe("SpaceCorp");
    expect(result.userId).toBe("user-1");
    expect(result.organizationId).toBe("org-1");
  });

  it("populates debris assessment data", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    mockPrisma.debrisAssessment.findFirst.mockResolvedValue({
      complianceScore: 85,
      orbitType: "LEO",
    });

    const result = await buildUserContext("user-1", "org-1");
    expect(result.complianceScores?.debris).toBe(85);
    expect(result.assessments?.debris?.completed).toBe(true);
    expect(result.assessments?.debris?.orbitRegime).toBe("LEO");
  });

  it("populates cybersecurity assessment data", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValue({
      maturityScore: 3,
    });

    const result = await buildUserContext("user-1", "org-1");
    expect(result.complianceScores?.cybersecurity).toBe(3);
    expect(result.assessments?.cybersecurity?.completed).toBe(true);
    expect(result.assessments?.cybersecurity?.maturityLevel).toBe(3);
  });

  it("populates insurance assessment data", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    mockPrisma.insuranceAssessment.findFirst.mockResolvedValue({
      complianceScore: 92,
      calculatedTPL: 60000000,
    });

    const result = await buildUserContext("user-1", "org-1");
    expect(result.complianceScores?.insurance).toBe(92);
    expect(result.assessments?.insurance?.completed).toBe(true);
    expect(result.assessments?.insurance?.tplAmount).toBe(60000000);
  });

  it("populates NIS2 assessment data", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
      entityClassification: "essential",
    });

    const result = await buildUserContext("user-1", "org-1");
    expect(result.assessments?.nis2?.completed).toBe(true);
    expect(result.assessments?.nis2?.entityType).toBe("essential");
  });

  it("populates upcoming deadlines", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    mockPrisma.deadline.findMany.mockResolvedValue([
      {
        title: "Submit application",
        dueDate: futureDate,
        priority: "high",
        category: "authorization",
      },
    ]);

    const result = await buildUserContext("user-1", "org-1");
    expect(result.upcomingDeadlines).toBeDefined();
    expect(result.upcomingDeadlines!.length).toBe(1);
    expect(result.upcomingDeadlines![0].title).toBe("Submit application");
    expect(result.upcomingDeadlines![0].module).toBe("authorization");
  });

  it("returns undefined for assessments when none exist", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });

    const result = await buildUserContext("user-1", "org-1");
    expect(result.assessments).toBeUndefined();
    expect(result.complianceScores).toBeUndefined();
  });

  it("handles null complianceScore in debris assessment", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    mockPrisma.debrisAssessment.findFirst.mockResolvedValue({
      complianceScore: null,
      orbitType: "LEO",
    });

    const result = await buildUserContext("user-1", "org-1");
    // complianceScore null -> not added
    expect(result.complianceScores?.debris).toBeUndefined();
    // But assessment still completed
    expect(result.assessments?.debris?.completed).toBe(true);
  });

  it("handles error in deadline query gracefully", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    mockPrisma.deadline.findMany.mockRejectedValue(new Error("DB error"));

    const result = await buildUserContext("user-1", "org-1");
    // Should not throw, deadlines should be empty or undefined
    expect(result.organizationName).toBe("SpaceCorp");
    expect(result.upcomingDeadlines).toBeUndefined();
  });

  it("handles general error gracefully", async () => {
    mockPrisma.organization.findUnique.mockRejectedValue(
      new Error("Connection failed"),
    );

    const result = await buildUserContext("user-1", "org-1");
    expect(result.organizationName).toBe("Unknown Organization");
    expect(result.userId).toBe("user-1");
  });

  it("handles deadline without category and priority", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    mockPrisma.deadline.findMany.mockResolvedValue([
      {
        title: "Task",
        dueDate: futureDate,
        priority: null,
        category: null,
      },
    ]);

    const result = await buildUserContext("user-1", "org-1");
    expect(result.upcomingDeadlines![0].module).toBe("general");
    expect(result.upcomingDeadlines![0].priority).toBe("medium");
  });
});

// ─── buildTopicContext ───

describe("buildTopicContext", () => {
  const baseUserContext: AstraUserContext = {
    userId: "user-1",
    organizationId: "org-1",
    organizationName: "SpaceCorp",
  };

  it("returns empty string for empty topics", async () => {
    const result = await buildTopicContext(baseUserContext, []);
    expect(result).toBe("");
  });

  it("includes page context for article mode", async () => {
    const pageContext: AstraContext = {
      mode: "article",
      articleId: "art-58",
      articleRef: "Art. 58",
      title: "Insurance Requirements",
      severity: "mandatory",
      regulationType: "EU Space Act",
    };
    const result = await buildTopicContext(
      baseUserContext,
      ["insurance"],
      pageContext,
    );
    expect(result).toContain("Current Article Context");
    expect(result).toContain("Art. 58");
    expect(result).toContain("Insurance Requirements");
    expect(result).toContain("mandatory");
  });

  it("includes page context for category mode", async () => {
    const pageContext: AstraContext = {
      mode: "category",
      category: "debris",
      categoryLabel: "Debris Mitigation",
      articles: [
        {
          id: "art-31",
          articleRef: "Art. 31",
          title: "Debris Requirements",
          severity: "mandatory",
        },
      ],
      regulationType: "EU Space Act",
    };
    const result = await buildTopicContext(
      baseUserContext,
      ["debris"],
      pageContext,
    );
    expect(result).toContain("Current Category Context");
    expect(result).toContain("Debris Mitigation");
  });

  it("includes page context for module mode", async () => {
    const pageContext: AstraContext = {
      mode: "module",
      moduleId: "debris",
      moduleName: "Debris Mitigation",
    };
    const result = await buildTopicContext(
      baseUserContext,
      ["debris"],
      pageContext,
    );
    expect(result).toContain("Current Module Context");
    expect(result).toContain("Debris Mitigation");
  });

  it("includes mission data when provided", async () => {
    const missionData: AstraMissionData = {
      missionName: "LEO-SAT-1",
      orbitType: "LEO",
      altitudeKm: 550,
    };
    const result = await buildTopicContext(
      baseUserContext,
      ["debris"],
      undefined,
      missionData,
    );
    expect(result).toContain("Mission Profile");
    expect(result).toContain("LEO-SAT-1");
    expect(result).toContain("550");
  });

  it("skips mission data when empty object provided", async () => {
    const result = await buildTopicContext(
      baseUserContext,
      ["debris"],
      undefined,
      {},
    );
    expect(result).not.toContain("Mission Profile");
  });

  it("includes debris assessment status when present", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      assessments: {
        debris: {
          completed: true,
          orbitRegime: "LEO",
        },
      },
      complianceScores: { debris: 85 },
    };
    const result = await buildTopicContext(userContext, ["debris"]);
    expect(result).toContain("Debris Assessment Status");
    expect(result).toContain("Assessment completed: Yes");
    expect(result).toContain("LEO");
    expect(result).toContain("85");
  });

  it("includes debris not-completed status when no assessment", async () => {
    const result = await buildTopicContext(baseUserContext, ["debris"]);
    expect(result).toContain("not completed a debris mitigation assessment");
  });

  it("includes cybersecurity assessment status when present", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      assessments: {
        cybersecurity: {
          completed: true,
          maturityLevel: 3,
          framework: "NIST CSF",
        },
      },
      complianceScores: { cybersecurity: 65 },
    };
    const result = await buildTopicContext(userContext, ["cybersecurity"]);
    expect(result).toContain("Cybersecurity Assessment Status");
    expect(result).toContain("Maturity level: 3");
  });

  it("includes NIS2 status in cybersecurity topic context", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      assessments: {
        nis2: {
          completed: true,
          entityType: "essential",
        },
      },
    };
    const result = await buildTopicContext(userContext, ["cybersecurity"]);
    expect(result).toContain("NIS2 Status");
    expect(result).toContain("essential");
  });

  it("includes insurance assessment status", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      assessments: {
        insurance: {
          completed: true,
          coverageAdequate: true,
          tplAmount: 60000000,
        },
      },
    };
    const result = await buildTopicContext(userContext, ["insurance"]);
    expect(result).toContain("Insurance Assessment Status");
    expect(result).toContain("Coverage adequate: Yes");
  });

  it("includes insurance status with inadequate coverage", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      assessments: {
        insurance: {
          completed: true,
          coverageAdequate: false,
        },
      },
    };
    const result = await buildTopicContext(userContext, ["insurance"]);
    expect(result).toContain("Coverage adequate: No");
  });

  it("includes authorization workflow status", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      authorizationStatus: {
        state: "in_progress",
        currentStep: "document_submission",
        completedDocuments: 5,
        totalDocuments: 12,
      },
    };
    const result = await buildTopicContext(userContext, ["authorization"]);
    expect(result).toContain("Authorization Workflow Status");
    expect(result).toContain("in_progress");
    expect(result).toContain("document_submission");
    expect(result).toContain("5/12");
  });

  it("includes jurisdiction context", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      jurisdiction: "France",
    };
    const result = await buildTopicContext(userContext, ["jurisdiction"]);
    expect(result).toContain("Current Jurisdiction");
    expect(result).toContain("France");
  });

  it("includes operator type context", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      operatorType: "SCO",
    };
    const result = await buildTopicContext(userContext, ["operator_type"]);
    expect(result).toContain("Operator Classification");
    expect(result).toContain("SCO");
  });

  it("includes upcoming deadlines", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      upcomingDeadlines: [
        {
          title: "Submit NCA application",
          date: new Date("2025-06-01"),
          module: "authorization",
          priority: "high",
        },
      ],
    };
    const result = await buildTopicContext(userContext, ["general"]);
    expect(result).toContain("Upcoming Deadlines");
    expect(result).toContain("Submit NCA application");
  });

  it("includes document summary alert", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      documentSummary: {
        totalDocuments: 10,
        expiringWithin30Days: 3,
        missingRequired: 2,
      },
    };
    const result = await buildTopicContext(userContext, ["general"]);
    expect(result).toContain("Document Alert");
    expect(result).toContain("3 document(s) expiring within 30 days");
  });

  it("does not include document alert when no documents expiring", async () => {
    const userContext: AstraUserContext = {
      ...baseUserContext,
      documentSummary: {
        totalDocuments: 10,
        expiringWithin30Days: 0,
        missingRequired: 0,
      },
    };
    const result = await buildTopicContext(userContext, ["general"]);
    expect(result).not.toContain("Document Alert");
  });

  it("handles multiple topics", async () => {
    const result = await buildTopicContext(baseUserContext, [
      "debris",
      "insurance",
    ]);
    expect(result).toContain("Debris Assessment Status");
  });

  it("skips unrecognized topics without error", async () => {
    const result = await buildTopicContext(baseUserContext, [
      "unknown_topic" as string,
    ]);
    // Should not throw
    expect(typeof result).toBe("string");
  });
});

// ─── buildCompleteContext ───

describe("buildCompleteContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "SpaceCorp",
      plan: "pro",
    });
    mockPrisma.debrisAssessment.findFirst.mockResolvedValue(null);
    mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValue(null);
    mockPrisma.insuranceAssessment.findFirst.mockResolvedValue(null);
    mockPrisma.nIS2Assessment.findFirst.mockResolvedValue(null);
    mockPrisma.deadline.findMany.mockResolvedValue([]);
  });

  it("returns userContext, contextString, and estimatedTokens", async () => {
    const result = await buildCompleteContext(
      "user-1",
      "org-1",
      "Tell me about debris requirements",
    );
    expect(result.userContext).toBeDefined();
    expect(result.userContext.organizationName).toBe("SpaceCorp");
    expect(typeof result.contextString).toBe("string");
    expect(typeof result.estimatedTokens).toBe("number");
    expect(result.estimatedTokens).toBeGreaterThanOrEqual(0);
  });

  it("includes topic-detected context in contextString", async () => {
    const result = await buildCompleteContext(
      "user-1",
      "org-1",
      "What insurance do I need?",
    );
    expect(result.contextString).toBeDefined();
  });

  it("passes pageContext through to buildTopicContext", async () => {
    const pageContext: AstraContext = {
      mode: "article",
      articleId: "art-58",
      articleRef: "Art. 58",
      title: "Insurance",
      severity: "mandatory",
      regulationType: "EU Space Act",
    };
    const result = await buildCompleteContext(
      "user-1",
      "org-1",
      "Tell me about this article",
      pageContext,
    );
    expect(result.contextString).toContain("Current Article Context");
  });

  it("passes missionData through to buildTopicContext", async () => {
    const missionData: AstraMissionData = {
      missionName: "Test Mission",
      orbitType: "LEO",
    };
    const result = await buildCompleteContext(
      "user-1",
      "org-1",
      "debris requirements",
      undefined,
      missionData,
    );
    expect(result.contextString).toContain("Mission Profile");
  });
});
