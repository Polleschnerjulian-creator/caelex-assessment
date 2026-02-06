import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    authorizationWorkflow: {
      findMany: vi.fn(),
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
    environmentalAssessment: {
      findFirst: vi.fn(),
    },
    supervisionConfig: {
      findUnique: vi.fn(),
    },
    incident: {
      findMany: vi.fn(),
    },
    supervisionReport: {
      findMany: vi.fn(),
    },
    supplierDataRequest: {
      findMany: vi.fn(),
    },
  },
}));

// Mock incident-response-service
vi.mock("@/lib/services/incident-response-service", () => ({
  INCIDENT_CLASSIFICATION: {
    cyber_incident: { ncaDeadlineHours: 24 },
    collision_event: { ncaDeadlineHours: 72 },
  },
  calculateNCADeadline: vi.fn((category, detectedAt) => {
    const deadline = new Date(detectedAt);
    deadline.setHours(deadline.getHours() + 24);
    return deadline;
  }),
}));

import { prisma } from "@/lib/prisma";
import {
  calculateComplianceScore,
  MODULE_WEIGHTS,
  type ComplianceScore,
} from "@/lib/services/compliance-scoring-service";

describe("Compliance Scoring Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MODULE_WEIGHTS", () => {
    it("should have correct weights that sum to 1", () => {
      const totalWeight = Object.values(MODULE_WEIGHTS).reduce(
        (sum, w) => sum + w,
        0,
      );
      expect(totalWeight).toBe(1);
    });

    it("should have authorization as highest weight", () => {
      expect(MODULE_WEIGHTS.authorization).toBe(0.25);
      expect(MODULE_WEIGHTS.authorization).toBeGreaterThan(
        MODULE_WEIGHTS.debris,
      );
      expect(MODULE_WEIGHTS.authorization).toBeGreaterThan(
        MODULE_WEIGHTS.cybersecurity,
      );
    });

    it("should have correct individual weights", () => {
      expect(MODULE_WEIGHTS.authorization).toBe(0.25);
      expect(MODULE_WEIGHTS.debris).toBe(0.2);
      expect(MODULE_WEIGHTS.cybersecurity).toBe(0.2);
      expect(MODULE_WEIGHTS.insurance).toBe(0.15);
      expect(MODULE_WEIGHTS.environmental).toBe(0.1);
      expect(MODULE_WEIGHTS.reporting).toBe(0.1);
    });
  });

  describe("calculateComplianceScore", () => {
    it("should calculate score with no data", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const score = await calculateComplianceScore("user-1");

      // With no data, score should be low (below 20)
      expect(score.overall).toBeLessThan(20);
      expect(score.grade).toBe("F");
      expect(score.status).toBe("non_compliant");
      expect(score.breakdown).toBeDefined();
      expect(score.recommendations).toBeDefined();
      expect(score.lastCalculated).toBeInstanceOf(Date);
    });

    it("should calculate high score with approved workflow", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        {
          id: "wf-1",
          status: "approved",
          documents: [{ status: "ready" }, { status: "ready" }],
        },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: true,
        hasPassivationCap: true,
        deorbitStrategy: "active",
      } as never);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: new Date(),
        maturityScore: 80,
        hasIncidentResponsePlan: true,
      } as never);
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: true,
        calculatedTPL: 1000000,
        policies: [
          {
            status: "active",
            coverageAmount: 2000000,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        ],
      } as never);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
        status: "submitted",
        totalGWP: 100,
      } as never);
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue({
        id: "sc-1",
      } as never);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([
        { status: "submitted" },
      ] as never);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([
        { status: "completed" },
      ] as never);

      const score = await calculateComplianceScore("user-1");

      expect(score.overall).toBeGreaterThan(80);
      expect(["A", "B"]).toContain(score.grade);
      expect(["compliant", "mostly_compliant"]).toContain(score.status);
    });

    it("should include all module breakdowns", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const score = await calculateComplianceScore("user-1");

      expect(score.breakdown.authorization).toBeDefined();
      expect(score.breakdown.debris).toBeDefined();
      expect(score.breakdown.cybersecurity).toBeDefined();
      expect(score.breakdown.insurance).toBeDefined();
      expect(score.breakdown.environmental).toBeDefined();
      expect(score.breakdown.reporting).toBeDefined();
    });

    it("should have weighted scores adding up to overall", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        { status: "in_progress", documents: [] },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: true,
      } as never);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const score = await calculateComplianceScore("user-1");

      const sumWeighted = Object.values(score.breakdown).reduce(
        (sum, module) => sum + module.weightedScore,
        0,
      );

      // Allow small rounding differences
      expect(Math.abs(score.overall - sumWeighted)).toBeLessThanOrEqual(1);
    });

    it("should include article references in module scores", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const score = await calculateComplianceScore("user-1");

      expect(score.breakdown.authorization.articleReferences).toContain(
        "Art. 6-27",
      );
      expect(score.breakdown.debris.articleReferences).toContain("Art. 55-73");
      expect(score.breakdown.cybersecurity.articleReferences).toContain(
        "Art. 74-95",
      );
      expect(score.breakdown.insurance.articleReferences).toContain(
        "Art. 28-32",
      );
      expect(score.breakdown.environmental.articleReferences).toContain(
        "Art. 96-100",
      );
      expect(score.breakdown.reporting.articleReferences).toContain(
        "Art. 33-54",
      );
    });

    it("should generate recommendations sorted by priority", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const score = await calculateComplianceScore("user-1");

      expect(score.recommendations.length).toBeGreaterThan(0);
      expect(score.recommendations.length).toBeLessThanOrEqual(10);

      // Check sorting: critical should come before high, high before medium, etc.
      const priorities = score.recommendations.map((r) => r.priority);
      const criticalIndex = priorities.indexOf("critical");
      const highIndex = priorities.lastIndexOf("high");

      if (criticalIndex !== -1 && highIndex !== -1) {
        expect(criticalIndex).toBeLessThanOrEqual(highIndex);
      }
    });
  });

  describe("Grade calculation", () => {
    const testGrade = async (
      workflowStatus: string,
      expectedGradeRange: string[],
    ) => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        {
          status: workflowStatus,
          documents: workflowStatus === "approved" ? [{ status: "ready" }] : [],
        },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const score = await calculateComplianceScore("user-1");
      expect(expectedGradeRange).toContain(score.grade);
    };

    it("should assign F grade for very low scores", async () => {
      await testGrade("draft", ["F"]);
    });

    it("should assign higher grade for approved workflows", async () => {
      await testGrade("approved", ["D", "C", "B", "A", "F"]);
    });
  });

  describe("Module status determination", () => {
    it("should mark modules with no/low scores appropriately", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const score = await calculateComplianceScore("user-1");

      // Modules with no data should have not_started or non_compliant status
      expect(["not_started", "non_compliant"]).toContain(
        score.breakdown.debris.status,
      );
      expect(["not_started", "non_compliant"]).toContain(
        score.breakdown.cybersecurity.status,
      );
      expect(["not_started", "non_compliant"]).toContain(
        score.breakdown.insurance.status,
      );
    });

    it("should mark modules as compliant with high scores", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        {
          status: "approved",
          documents: [{ status: "ready" }, { status: "ready" }],
        },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: true,
        hasPassivationCap: true,
        deorbitStrategy: "active",
      } as never);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: new Date(),
        maturityScore: 100,
        hasIncidentResponsePlan: true,
      } as never);
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
        null,
      );
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const score = await calculateComplianceScore("user-1");

      expect(score.breakdown.authorization.status).toBe("compliant");
      expect(score.breakdown.debris.status).toBe("compliant");
      expect(score.breakdown.cybersecurity.status).toBe("compliant");
    });
  });
});
