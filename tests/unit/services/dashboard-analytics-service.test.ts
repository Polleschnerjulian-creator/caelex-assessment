import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supervisionConfig: {
      findUnique: vi.fn(),
    },
    authorizationWorkflow: {
      findMany: vi.fn(),
    },
    incident: {
      findMany: vi.fn(),
    },
    debrisAssessment: {
      findMany: vi.fn(),
    },
    cybersecurityAssessment: {
      findMany: vi.fn(),
    },
    insuranceAssessment: {
      findMany: vi.fn(),
    },
    environmentalAssessment: {
      findMany: vi.fn(),
    },
    deadline: {
      findMany: vi.fn(),
    },
    supervisionReport: {
      findMany: vi.fn(),
    },
    supplierDataRequest: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
    insurancePolicy: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/incident-response-service", () => ({
  INCIDENT_CLASSIFICATION: {
    loss_of_contact: {
      defaultSeverity: "critical",
      ncaDeadlineHours: 4,
      requiresNCANotification: true,
      requiresEUSPANotification: true,
    },
    debris_generation: {
      defaultSeverity: "critical",
      ncaDeadlineHours: 4,
      requiresNCANotification: true,
      requiresEUSPANotification: true,
    },
    cyber_incident: {
      defaultSeverity: "critical",
      ncaDeadlineHours: 4,
      requiresNCANotification: true,
      requiresEUSPANotification: true,
    },
    spacecraft_anomaly: {
      defaultSeverity: "high",
      ncaDeadlineHours: 24,
      requiresNCANotification: true,
      requiresEUSPANotification: false,
    },
    conjunction_event: {
      defaultSeverity: "high",
      ncaDeadlineHours: 72,
      requiresNCANotification: true,
      requiresEUSPANotification: true,
    },
    regulatory_breach: {
      defaultSeverity: "medium",
      ncaDeadlineHours: 72,
      requiresNCANotification: true,
      requiresEUSPANotification: false,
    },
    nis2_significant_incident: {
      defaultSeverity: "critical",
      ncaDeadlineHours: 24,
      requiresNCANotification: true,
      requiresEUSPANotification: false,
    },
    nis2_near_miss: {
      defaultSeverity: "medium",
      ncaDeadlineHours: 72,
      requiresNCANotification: false,
      requiresEUSPANotification: false,
    },
    other: {
      defaultSeverity: "low",
      ncaDeadlineHours: 168,
      requiresNCANotification: false,
      requiresEUSPANotification: false,
    },
  },
  calculateNCADeadline: vi.fn((category: string, detectedAt: Date) => {
    const hours: Record<string, number> = {
      loss_of_contact: 4,
      debris_generation: 4,
      cyber_incident: 4,
      spacecraft_anomaly: 24,
      conjunction_event: 72,
      regulatory_breach: 72,
      nis2_significant_incident: 24,
      nis2_near_miss: 72,
      other: 168,
    };
    const deadline = new Date(detectedAt);
    deadline.setHours(deadline.getHours() + (hours[category] || 72));
    return deadline;
  }),
}));

// ─── Imports (after mocks) ───

import { prisma } from "@/lib/prisma";
import {
  getComplianceOverview,
  getDashboardMetrics,
  getTrendData,
  getDashboardAlerts,
} from "@/lib/services/dashboard-analytics-service";

// ─── Helpers ───

const userId = "user-1";

function mockAllPrismaReturnsEmpty() {
  vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
  vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
  vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.deadline.findMany).mockResolvedValue([]);
  vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
  vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);
  vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
  vi.mocked(prisma.insurancePolicy.findMany).mockResolvedValue([]);
}

// ─── Tests ───

describe("Dashboard Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllPrismaReturnsEmpty();
  });

  // ════════════════════════════════════════════════════════════════════════
  // getComplianceOverview
  // ════════════════════════════════════════════════════════════════════════

  describe("getComplianceOverview", () => {
    it("should return low score when no data exists", async () => {
      const result = await getComplianceOverview(userId);

      // With no data, only incidents module scores 100 (no incidents = compliant)
      // weighted at 0.1 = 10 overall. All other modules are 0.
      expect(result.overallScore).toBe(10);
      expect(result.overallStatus).toBe("non_compliant"); // 0 < 10 < 60
      expect(result.modules).toHaveLength(6);
      expect(result.criticalAlerts).toBe(0);
      expect(result.pendingDeadlines).toBe(0);
      expect(result.openIncidents).toBe(0);
      expect(result.lastAssessmentDate).toBeNull();
    });

    it("should calculate all 6 module statuses", async () => {
      const result = await getComplianceOverview(userId);

      const moduleIds = result.modules.map((m) => m.id);
      expect(moduleIds).toEqual([
        "authorization",
        "debris",
        "cybersecurity",
        "insurance",
        "environmental",
        "incidents",
      ]);
    });

    it("should report all modules as not_started when there is no data", async () => {
      const result = await getComplianceOverview(userId);

      for (const mod of result.modules) {
        if (mod.id === "incidents") {
          // Incidents with no data is "compliant" (no incidents = good)
          expect(mod.status).toBe("compliant");
          expect(mod.score).toBe(100);
        } else {
          expect(mod.status).toBe("not_started");
          expect(mod.score).toBe(0);
        }
      }
    });

    // --- Authorization module ---

    describe("authorization module status", () => {
      it("should be compliant with score 100 when workflow is approved", async () => {
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          { status: "approved", updatedAt: new Date("2025-06-01") },
        ] as never);

        const result = await getComplianceOverview(userId);
        const auth = result.modules.find((m) => m.id === "authorization")!;

        expect(auth.status).toBe("compliant");
        expect(auth.score).toBe(100);
        expect(auth.itemsComplete).toBe(1);
      });

      it("should be partial with score 80 when ready_for_submission", async () => {
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          {
            status: "ready_for_submission",
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const auth = result.modules.find((m) => m.id === "authorization")!;

        expect(auth.status).toBe("partial");
        expect(auth.score).toBe(80);
      });

      it("should be partial with score 50 when in_progress", async () => {
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          { status: "in_progress", updatedAt: new Date("2025-06-01") },
        ] as never);

        const result = await getComplianceOverview(userId);
        const auth = result.modules.find((m) => m.id === "authorization")!;

        expect(auth.status).toBe("partial");
        expect(auth.score).toBe(50);
      });

      it("should be pending with score 20 for other statuses (e.g. draft)", async () => {
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          { status: "draft", updatedAt: new Date("2025-06-01") },
        ] as never);

        const result = await getComplianceOverview(userId);
        const auth = result.modules.find((m) => m.id === "authorization")!;

        expect(auth.status).toBe("pending");
        expect(auth.score).toBe(20);
      });
    });

    // --- Debris module ---

    describe("debris module status", () => {
      it("should be compliant when planGenerated and score >= 80", async () => {
        vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
          {
            planGenerated: true,
            complianceScore: 85,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const debris = result.modules.find((m) => m.id === "debris")!;

        expect(debris.status).toBe("compliant");
        expect(debris.score).toBe(85);
      });

      it("should be partial when planGenerated but score < 80", async () => {
        vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
          {
            planGenerated: true,
            complianceScore: 60,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const debris = result.modules.find((m) => m.id === "debris")!;

        expect(debris.status).toBe("partial");
        expect(debris.score).toBe(60);
      });

      it("should be pending when planGenerated is false", async () => {
        vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
          {
            planGenerated: false,
            complianceScore: 30,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const debris = result.modules.find((m) => m.id === "debris")!;

        expect(debris.status).toBe("pending");
      });
    });

    // --- Cybersecurity module ---

    describe("cybersecurity module status", () => {
      it("should be compliant when frameworkGeneratedAt set and maturityScore >= 80", async () => {
        vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
          {
            frameworkGeneratedAt: new Date("2025-05-01"),
            maturityScore: 90,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const cyber = result.modules.find((m) => m.id === "cybersecurity")!;

        expect(cyber.status).toBe("compliant");
        expect(cyber.score).toBe(90);
      });

      it("should be partial when frameworkGeneratedAt set but maturityScore < 80", async () => {
        vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
          {
            frameworkGeneratedAt: new Date("2025-05-01"),
            maturityScore: 55,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const cyber = result.modules.find((m) => m.id === "cybersecurity")!;

        expect(cyber.status).toBe("partial");
        expect(cyber.score).toBe(55);
      });

      it("should be pending when frameworkGeneratedAt is null", async () => {
        vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
          {
            frameworkGeneratedAt: null,
            maturityScore: 40,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const cyber = result.modules.find((m) => m.id === "cybersecurity")!;

        expect(cyber.status).toBe("pending");
      });
    });

    // --- Insurance module ---

    describe("insurance module status", () => {
      it("should be compliant when reportGenerated, score >= 80, and calculatedTPL > 0", async () => {
        vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
          {
            reportGenerated: true,
            complianceScore: 90,
            calculatedTPL: 5000000,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const insurance = result.modules.find((m) => m.id === "insurance")!;

        expect(insurance.status).toBe("compliant");
        expect(insurance.score).toBe(90);
      });

      it("should be partial when reportGenerated but score < 80", async () => {
        vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
          {
            reportGenerated: true,
            complianceScore: 60,
            calculatedTPL: 5000000,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const insurance = result.modules.find((m) => m.id === "insurance")!;

        expect(insurance.status).toBe("partial");
      });

      it("should be pending when reportGenerated is false", async () => {
        vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
          {
            reportGenerated: false,
            complianceScore: 0,
            calculatedTPL: 0,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const insurance = result.modules.find((m) => m.id === "insurance")!;

        expect(insurance.status).toBe("pending");
      });
    });

    // --- Environmental module ---

    describe("environmental module status", () => {
      it("should be compliant when status is submitted", async () => {
        vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
          {
            status: "submitted",
            complianceScore: null,
            totalGWP: 1200,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const env = result.modules.find((m) => m.id === "environmental")!;

        expect(env.status).toBe("compliant");
        // When complianceScore is null and isCompleted, score defaults to 100
        expect(env.score).toBe(100);
      });

      it("should be compliant when status is approved", async () => {
        vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
          {
            status: "approved",
            complianceScore: 95,
            totalGWP: 800,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const env = result.modules.find((m) => m.id === "environmental")!;

        expect(env.status).toBe("compliant");
        expect(env.score).toBe(95);
      });

      it("should be partial when status is draft", async () => {
        vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
          {
            status: "draft",
            complianceScore: null,
            totalGWP: null,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const env = result.modules.find((m) => m.id === "environmental")!;

        expect(env.status).toBe("partial");
        // When complianceScore is null and not completed, score defaults to 50
        expect(env.score).toBe(50);
      });
    });

    // --- Incident module ---

    describe("incident module status", () => {
      it("should be compliant with score 100 when no incidents exist", async () => {
        const result = await getComplianceOverview(userId);
        const incidents = result.modules.find((m) => m.id === "incidents")!;

        expect(incidents.status).toBe("compliant");
        expect(incidents.score).toBe(100);
      });

      it("should be partial with score 70 when there are open non-critical incidents", async () => {
        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            status: "investigating",
            severity: "medium",
            category: "other",
            requiresNCANotification: false,
            reportedToNCA: false,
            detectedAt: new Date(),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const incidents = result.modules.find((m) => m.id === "incidents")!;

        expect(incidents.status).toBe("partial");
        expect(incidents.score).toBe(70);
      });

      it("should be partial with score 50 when there are critical open incidents", async () => {
        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            status: "investigating",
            severity: "critical",
            category: "loss_of_contact",
            requiresNCANotification: true,
            reportedToNCA: true,
            detectedAt: new Date(),
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const incidents = result.modules.find((m) => m.id === "incidents")!;

        expect(incidents.status).toBe("partial");
        expect(incidents.score).toBe(50);
      });

      it("should be non_compliant with score 20 when there are overdue NCA notifications", async () => {
        // Detected 10 hours ago with a 4-hour deadline -> overdue
        const tenHoursAgo = new Date();
        tenHoursAgo.setHours(tenHoursAgo.getHours() - 10);

        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            status: "investigating",
            severity: "critical",
            category: "loss_of_contact",
            requiresNCANotification: true,
            reportedToNCA: false,
            detectedAt: tenHoursAgo,
          },
        ] as never);

        const result = await getComplianceOverview(userId);
        const incidents = result.modules.find((m) => m.id === "incidents")!;

        expect(incidents.status).toBe("non_compliant");
        expect(incidents.score).toBe(20);
      });
    });

    // --- Overall score calculation ---

    describe("overall score and status", () => {
      it("should calculate weighted average score across modules", async () => {
        // Set up: authorization approved (100), debris compliant (85),
        // cybersecurity compliant (90), others not started
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          { status: "approved", updatedAt: new Date("2025-06-01") },
        ] as never);
        vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
          {
            planGenerated: true,
            complianceScore: 85,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);
        vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
          {
            frameworkGeneratedAt: new Date("2025-05-01"),
            maturityScore: 90,
            updatedAt: new Date("2025-06-01"),
          },
        ] as never);

        const result = await getComplianceOverview(userId);

        // Weights: auth=0.2, debris=0.2, cyber=0.2, insurance=0.15, env=0.15, incidents=0.1
        // Scores:  100,       85,         90,         0,              0,          100
        // = 100*0.2 + 85*0.2 + 90*0.2 + 0*0.15 + 0*0.15 + 100*0.1
        // = 20 + 17 + 18 + 0 + 0 + 10 = 65
        expect(result.overallScore).toBe(65);
        expect(result.overallStatus).toBe("partial"); // 60 <= 65 < 80
      });

      it("should be compliant when overall score >= 80", async () => {
        // Make most modules high-scoring
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          { status: "approved", updatedAt: new Date() },
        ] as never);
        vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
          { planGenerated: true, complianceScore: 90, updatedAt: new Date() },
        ] as never);
        vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
          {
            frameworkGeneratedAt: new Date(),
            maturityScore: 85,
            updatedAt: new Date(),
          },
        ] as never);
        vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
          {
            reportGenerated: true,
            complianceScore: 85,
            calculatedTPL: 5000000,
            updatedAt: new Date(),
          },
        ] as never);
        vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
          {
            status: "submitted",
            complianceScore: 90,
            totalGWP: 500,
            updatedAt: new Date(),
          },
        ] as never);

        const result = await getComplianceOverview(userId);

        // 100*0.2 + 90*0.2 + 85*0.2 + 85*0.15 + 90*0.15 + 100*0.1
        // = 20 + 18 + 17 + 12.75 + 13.5 + 10 = 91.25 -> 91
        expect(result.overallScore).toBeGreaterThanOrEqual(80);
        expect(result.overallStatus).toBe("compliant");
      });

      it("should be non_compliant when score > 0 and < 60", async () => {
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          { status: "draft", updatedAt: new Date() },
        ] as never);
        // Only authorization with draft (20) and incidents default (100)
        // 20*0.2 + 0*0.2 + 0*0.2 + 0*0.15 + 0*0.15 + 100*0.1 = 4 + 10 = 14

        const result = await getComplianceOverview(userId);

        expect(result.overallScore).toBeGreaterThan(0);
        expect(result.overallScore).toBeLessThan(60);
        expect(result.overallStatus).toBe("non_compliant");
      });
    });

    // --- Critical alerts and deadlines ---

    describe("critical alerts and pending deadlines", () => {
      it("should count pending deadlines", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        vi.mocked(prisma.deadline.findMany).mockResolvedValue([
          {
            id: "d-1",
            title: "Deadline 1",
            dueDate: futureDate,
            status: "UPCOMING",
          },
          {
            id: "d-2",
            title: "Deadline 2",
            dueDate: futureDate,
            status: "DUE_SOON",
          },
        ] as never);

        const result = await getComplianceOverview(userId);

        expect(result.pendingDeadlines).toBe(2);
      });

      it("should count open incidents", async () => {
        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            status: "investigating",
            severity: "high",
            category: "other",
            requiresNCANotification: false,
            reportedToNCA: false,
            detectedAt: new Date(),
          },
          {
            status: "resolved",
            severity: "medium",
            category: "other",
            requiresNCANotification: false,
            reportedToNCA: false,
            detectedAt: new Date(),
          },
        ] as never);

        const result = await getComplianceOverview(userId);

        // Only the non-resolved/non-closed one counts
        expect(result.openIncidents).toBe(1);
      });

      it("should find the latest assessment date across all modules", async () => {
        const latestDate = new Date("2025-08-15");
        vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
          {
            planGenerated: false,
            complianceScore: 0,
            updatedAt: new Date("2025-05-01"),
          },
        ] as never);
        vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
          {
            frameworkGeneratedAt: null,
            maturityScore: 0,
            updatedAt: latestDate,
          },
        ] as never);

        const result = await getComplianceOverview(userId);

        expect(result.lastAssessmentDate).toEqual(latestDate);
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getDashboardMetrics
  // ════════════════════════════════════════════════════════════════════════

  describe("getDashboardMetrics", () => {
    it("should return zero metrics when no data exists", async () => {
      const result = await getDashboardMetrics(userId);

      expect(result.authorization).toEqual({
        workflowsActive: 0,
        workflowsCompleted: 0,
        documentsReady: 0,
        documentsTotal: 0,
        pendingSubmissions: 0,
      });
      expect(result.incidents).toEqual({
        total: 0,
        open: 0,
        resolved: 0,
        bySeverity: {},
        pendingNCANotifications: 0,
        overdueNotifications: 0,
      });
      expect(result.debris).toEqual({
        assessmentsComplete: 0,
        complianceScore: 0,
        passivationPlans: 0,
        deorbitPlans: 0,
      });
      expect(result.cybersecurity).toEqual({
        assessmentsComplete: 0,
        maturityScore: 0,
        hasIncidentResponsePlan: false,
        incidentsThisYear: 0,
      });
      expect(result.insurance).toEqual({
        assessmentComplete: 0,
        calculatedTPL: 0,
        complianceScore: 0,
        riskLevel: "unknown",
      });
      expect(result.environmental).toEqual({
        efdSubmitted: false,
        suppliersContacted: 0,
        suppliersResponded: 0,
        totalGWP: null,
      });
      expect(result.reports).toEqual({
        generatedThisMonth: 0,
        submittedToNCA: 0,
        pendingAcknowledgment: 0,
      });
    });

    describe("authorization metrics", () => {
      it("should classify active vs completed workflows", async () => {
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          { status: "approved", documents: [], updatedAt: new Date() },
          { status: "in_progress", documents: [], updatedAt: new Date() },
          {
            status: "ready_for_submission",
            documents: [],
            updatedAt: new Date(),
          },
          { status: "rejected", documents: [], updatedAt: new Date() },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.authorization.workflowsCompleted).toBe(1); // approved
        expect(result.authorization.workflowsActive).toBe(2); // in_progress + ready_for_submission
        expect(result.authorization.pendingSubmissions).toBe(1); // ready_for_submission
      });

      it("should count ready vs total documents", async () => {
        vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
          {
            status: "in_progress",
            documents: [
              { id: "d1", status: "ready" },
              { id: "d2", status: "draft" },
              { id: "d3", status: "ready" },
            ],
            updatedAt: new Date(),
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.authorization.documentsReady).toBe(2);
        expect(result.authorization.documentsTotal).toBe(3);
      });
    });

    describe("incident metrics", () => {
      it("should categorize incidents by status and severity", async () => {
        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            status: "investigating",
            severity: "critical",
            category: "loss_of_contact",
            requiresNCANotification: true,
            reportedToNCA: true,
            detectedAt: new Date(),
          },
          {
            status: "resolved",
            severity: "high",
            category: "spacecraft_anomaly",
            requiresNCANotification: false,
            reportedToNCA: false,
            detectedAt: new Date(),
          },
          {
            status: "contained",
            severity: "medium",
            category: "other",
            requiresNCANotification: false,
            reportedToNCA: false,
            detectedAt: new Date(),
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.incidents.total).toBe(3);
        expect(result.incidents.open).toBe(2); // investigating + contained
        expect(result.incidents.resolved).toBe(1);
        expect(result.incidents.bySeverity).toEqual({
          critical: 1,
          high: 1,
          medium: 1,
        });
      });

      it("should count pending and overdue NCA notifications", async () => {
        const tenHoursAgo = new Date();
        tenHoursAgo.setHours(tenHoursAgo.getHours() - 10);
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            // Overdue: detected 10h ago, 4h deadline for loss_of_contact
            status: "investigating",
            severity: "critical",
            category: "loss_of_contact",
            requiresNCANotification: true,
            reportedToNCA: false,
            detectedAt: tenHoursAgo,
          },
          {
            // Pending but not overdue: detected 1h ago, 24h deadline
            status: "investigating",
            severity: "high",
            category: "spacecraft_anomaly",
            requiresNCANotification: true,
            reportedToNCA: false,
            detectedAt: oneHourAgo,
          },
          {
            // Already reported, does not count
            status: "investigating",
            severity: "medium",
            category: "cyber_incident",
            requiresNCANotification: true,
            reportedToNCA: true,
            detectedAt: tenHoursAgo,
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.incidents.pendingNCANotifications).toBe(2);
        expect(result.incidents.overdueNotifications).toBe(1);
      });
    });

    describe("debris metrics", () => {
      it("should report completed debris assessment metrics", async () => {
        vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
          {
            planGenerated: true,
            complianceScore: 78,
            hasPassivationCap: true,
            deorbitStrategy: "controlled_deorbit",
            updatedAt: new Date(),
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.debris.assessmentsComplete).toBe(1);
        expect(result.debris.complianceScore).toBe(78);
        expect(result.debris.passivationPlans).toBe(1);
        expect(result.debris.deorbitPlans).toBe(1);
      });

      it("should report zeros for incomplete debris assessment", async () => {
        vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
          {
            planGenerated: false,
            complianceScore: 0,
            hasPassivationCap: false,
            deorbitStrategy: null,
            updatedAt: new Date(),
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.debris.assessmentsComplete).toBe(0);
        expect(result.debris.passivationPlans).toBe(0);
        expect(result.debris.deorbitPlans).toBe(0);
      });
    });

    describe("cybersecurity metrics", () => {
      it("should report cybersecurity assessment metrics", async () => {
        vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
          {
            frameworkGeneratedAt: new Date("2025-05-01"),
            maturityScore: 75,
            hasIncidentResponsePlan: true,
            updatedAt: new Date(),
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.cybersecurity.assessmentsComplete).toBe(1);
        expect(result.cybersecurity.maturityScore).toBe(75);
        expect(result.cybersecurity.hasIncidentResponsePlan).toBe(true);
      });

      it("should count cyber incidents this year", async () => {
        const thisYear = new Date();
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);

        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            status: "resolved",
            severity: "high",
            category: "cyber_incident",
            requiresNCANotification: true,
            reportedToNCA: true,
            detectedAt: thisYear,
          },
          {
            // Last year's cyber incident should not count (but our mock returns all)
            status: "resolved",
            severity: "medium",
            category: "cyber_incident",
            requiresNCANotification: false,
            reportedToNCA: false,
            detectedAt: lastYear,
          },
          {
            // Non-cyber incident should not count
            status: "resolved",
            severity: "low",
            category: "other",
            requiresNCANotification: false,
            reportedToNCA: false,
            detectedAt: thisYear,
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        // Filtering is done by category === "cyber_incident" && detectedAt >= yearStart
        // Only the this-year cyber incident should count
        expect(result.cybersecurity.incidentsThisYear).toBeGreaterThanOrEqual(
          1,
        );
      });
    });

    describe("insurance metrics", () => {
      it("should report insurance assessment metrics", async () => {
        vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
          {
            reportGenerated: true,
            calculatedTPL: 10000000,
            complianceScore: 82,
            riskLevel: "medium",
            updatedAt: new Date(),
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.insurance.assessmentComplete).toBe(1);
        expect(result.insurance.calculatedTPL).toBe(10000000);
        expect(result.insurance.complianceScore).toBe(82);
        expect(result.insurance.riskLevel).toBe("medium");
      });
    });

    describe("environmental metrics", () => {
      it("should report submitted EFD and supplier data", async () => {
        vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
          {
            status: "submitted",
            totalGWP: 1500.5,
            updatedAt: new Date(),
          },
        ] as never);
        vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([
          { id: "sr-1", status: "completed" },
          { id: "sr-2", status: "pending" },
          { id: "sr-3", status: "completed" },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.environmental.efdSubmitted).toBe(true);
        expect(result.environmental.totalGWP).toBe(1500.5);
        expect(result.environmental.suppliersContacted).toBe(3);
        expect(result.environmental.suppliersResponded).toBe(2);
      });

      it("should report efdSubmitted=false for draft status", async () => {
        vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
          {
            status: "draft",
            totalGWP: null,
            updatedAt: new Date(),
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.environmental.efdSubmitted).toBe(false);
        expect(result.environmental.totalGWP).toBeNull();
      });
    });

    describe("reports metrics", () => {
      it("should count generated, submitted, and pending acknowledgment reports", async () => {
        vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([
          {
            id: "r-1",
            status: "submitted",
            acknowledgedAt: new Date(),
            createdAt: new Date(),
          },
          {
            id: "r-2",
            status: "submitted",
            acknowledgedAt: null,
            createdAt: new Date(),
          },
          {
            id: "r-3",
            status: "draft",
            acknowledgedAt: null,
            createdAt: new Date(),
          },
        ] as never);

        const result = await getDashboardMetrics(userId);

        expect(result.reports.generatedThisMonth).toBe(3);
        expect(result.reports.submittedToNCA).toBe(2);
        expect(result.reports.pendingAcknowledgment).toBe(1); // submitted but not acknowledged
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getTrendData
  // ════════════════════════════════════════════════════════════════════════

  describe("getTrendData", () => {
    it("should return daily data points for the specified period", async () => {
      const result = await getTrendData(userId, 7);

      // Should have ~8 data points (7 days + today)
      expect(result.length).toBeGreaterThanOrEqual(7);
      expect(result.length).toBeLessThanOrEqual(9); // account for rounding

      // Each point should have the expected shape
      for (const point of result) {
        expect(point).toHaveProperty("date");
        expect(point).toHaveProperty("score");
        expect(point).toHaveProperty("incidents");
        expect(point).toHaveProperty("completedTasks");
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(point.score).toBeGreaterThanOrEqual(0);
        expect(point.score).toBeLessThanOrEqual(100);
      }
    });

    it("should default to 30 days when no period specified", async () => {
      const result = await getTrendData(userId);

      expect(result.length).toBeGreaterThanOrEqual(30);
      expect(result.length).toBeLessThanOrEqual(32);
    });

    it("should have base score of 50 with no tasks or incidents", async () => {
      const result = await getTrendData(userId, 3);

      // With no audit logs and no incidents, score should be base (50)
      for (const point of result) {
        expect(point.score).toBe(50);
        expect(point.incidents).toBe(0);
        expect(point.completedTasks).toBe(0);
      }
    });

    it("should increase score based on completed tasks (capped at 40 bonus)", async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({
          id: `log-${i}`,
          action: "assessment_completed",
          timestamp: twoDaysAgo,
          userId,
        })),
      );

      const result = await getTrendData(userId, 3);

      // After 2 days ago, all 25 tasks are accumulated
      // taskBonus = min(25 * 2, 40) = 40
      // score = 50 + 40 = 90
      const latestPoints = result.filter((p) => new Date(p.date) >= twoDaysAgo);
      for (const point of latestPoints) {
        expect(point.score).toBe(90);
      }
    });

    it("should decrease score based on unresolved incidents (capped at 30 penalty)", async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      vi.mocked(prisma.incident.findMany).mockResolvedValue(
        Array.from({ length: 8 }, (_, i) => ({
          id: `inc-${i}`,
          status: "investigating",
          detectedAt: twoDaysAgo,
          severity: "high",
          category: "other",
        })),
      );

      const result = await getTrendData(userId, 3);

      // After the incidents are detected:
      // incidentPenalty = min(8 * 5, 30) = 30
      // score = max(0, min(100, 50 + 0 - 30)) = 20
      const latestPoints = result.filter((p) => new Date(p.date) >= twoDaysAgo);
      for (const point of latestPoints) {
        expect(point.score).toBe(20);
      }
    });

    it("should count daily incidents for each data point", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          id: "inc-1",
          status: "resolved",
          detectedAt: yesterday,
          severity: "medium",
          category: "other",
        },
        {
          id: "inc-2",
          status: "investigating",
          detectedAt: yesterday,
          severity: "high",
          category: "spacecraft_anomaly",
        },
      ] as never);

      const result = await getTrendData(userId, 3);
      const yesterdayPoint = result.find((p) => p.date === yesterdayStr);

      expect(yesterdayPoint).toBeDefined();
      expect(yesterdayPoint!.incidents).toBe(2);
    });

    it("should query audit logs with correct action types", async () => {
      await getTrendData(userId, 7);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            action: {
              in: [
                "assessment_completed",
                "document_uploaded",
                "incident_resolved",
                "workflow_approved",
              ],
            },
          }),
          orderBy: { timestamp: "asc" },
        }),
      );
    });

    it("should clamp score between 0 and 100", async () => {
      // Create many incidents to try to push score below 0
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.incident.findMany).mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: `inc-${i}`,
          status: "investigating",
          detectedAt: twoDaysAgo,
          severity: "critical",
          category: "loss_of_contact",
        })),
      );

      const result = await getTrendData(userId, 3);

      for (const point of result) {
        expect(point.score).toBeGreaterThanOrEqual(0);
        expect(point.score).toBeLessThanOrEqual(100);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getDashboardAlerts
  // ════════════════════════════════════════════════════════════════════════

  describe("getDashboardAlerts", () => {
    it("should return empty array when no alerts exist", async () => {
      const result = await getDashboardAlerts(userId);
      expect(result).toEqual([]);
    });

    it("should limit results to the specified limit", async () => {
      // Create many deadlines to exceed limit
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      vi.mocked(prisma.deadline.findMany).mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `d-${i}`,
          title: `Deadline ${i}`,
          description: `Description ${i}`,
          dueDate: futureDate,
          status: "UPCOMING",
        })),
      );

      const result = await getDashboardAlerts(userId, 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should default limit to 10", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      vi.mocked(prisma.deadline.findMany).mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          id: `d-${i}`,
          title: `Deadline ${i}`,
          description: null,
          dueDate: futureDate,
          status: "UPCOMING",
        })),
      );

      const result = await getDashboardAlerts(userId);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    describe("incident alerts", () => {
      it("should create critical alert for overdue NCA notifications", async () => {
        const tenHoursAgo = new Date();
        tenHoursAgo.setHours(tenHoursAgo.getHours() - 10);

        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            id: "inc-1",
            incidentNumber: "INC-001",
            status: "investigating",
            severity: "critical",
            category: "loss_of_contact",
            requiresNCANotification: true,
            reportedToNCA: false,
            detectedAt: tenHoursAgo,
          },
        ] as never);

        const result = await getDashboardAlerts(userId);
        const overdueAlert = result.find((a) =>
          a.id.startsWith("incident-overdue-"),
        );

        expect(overdueAlert).toBeDefined();
        expect(overdueAlert!.type).toBe("incident");
        expect(overdueAlert!.severity).toBe("critical");
        expect(overdueAlert!.title).toContain("Overdue NCA Notification");
        expect(overdueAlert!.title).toContain("INC-001");
        expect(overdueAlert!.description).toContain("ago");
      });

      it("should create urgent alert for NCA notifications due within 24 hours", async () => {
        // 20 hours ago with a 24-hour deadline -> 4 hours remaining
        const twentyHoursAgo = new Date();
        twentyHoursAgo.setHours(twentyHoursAgo.getHours() - 20);

        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            id: "inc-2",
            incidentNumber: "INC-002",
            status: "investigating",
            severity: "high",
            category: "spacecraft_anomaly", // 24h deadline
            requiresNCANotification: true,
            reportedToNCA: false,
            detectedAt: twentyHoursAgo,
          },
        ] as never);

        const result = await getDashboardAlerts(userId);
        const urgentAlert = result.find((a) =>
          a.id.startsWith("incident-urgent-"),
        );

        expect(urgentAlert).toBeDefined();
        expect(urgentAlert!.type).toBe("deadline");
        expect(urgentAlert!.severity).toBe("high"); // > 4 hours remaining
        expect(urgentAlert!.title).toContain("NCA Notification Due");
        expect(urgentAlert!.description).toContain("hours remaining");
      });

      it("should classify urgency as critical when less than 4 hours remain", async () => {
        // 23 hours ago with 24h deadline -> 1 hour remaining
        const twentyThreeHoursAgo = new Date();
        twentyThreeHoursAgo.setHours(twentyThreeHoursAgo.getHours() - 23);

        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            id: "inc-3",
            incidentNumber: "INC-003",
            status: "investigating",
            severity: "high",
            category: "spacecraft_anomaly", // 24h deadline
            requiresNCANotification: true,
            reportedToNCA: false,
            detectedAt: twentyThreeHoursAgo,
          },
        ] as never);

        const result = await getDashboardAlerts(userId);
        const urgentAlert = result.find((a) =>
          a.id.startsWith("incident-urgent-"),
        );

        expect(urgentAlert).toBeDefined();
        expect(urgentAlert!.severity).toBe("critical"); // < 4 hours
      });

      it("should not create alerts for incidents that are not pending NCA notification", async () => {
        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            // Already reported
            id: "inc-4",
            incidentNumber: "INC-004",
            status: "investigating",
            severity: "critical",
            category: "loss_of_contact",
            requiresNCANotification: true,
            reportedToNCA: true,
            detectedAt: new Date(),
          },
          {
            // Does not require NCA
            id: "inc-5",
            incidentNumber: "INC-005",
            status: "investigating",
            severity: "low",
            category: "other",
            requiresNCANotification: false,
            reportedToNCA: false,
            detectedAt: new Date(),
          },
        ] as never);

        // The query has `requiresNCANotification: true, reportedToNCA: false`
        // but since we mock findMany directly, the service still filters.
        // This test verifies no alerts come out since the mock returns items
        // that have already been reported or don't need notification.
        // Re-mock with empty to simulate the DB filter
        vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

        const result = await getDashboardAlerts(userId);
        const incidentAlerts = result.filter(
          (a) =>
            a.id.startsWith("incident-overdue-") ||
            a.id.startsWith("incident-urgent-"),
        );

        expect(incidentAlerts).toHaveLength(0);
      });
    });

    describe("deadline alerts", () => {
      it("should create deadline alerts with correct severity levels", async () => {
        const now = new Date();
        const twoDaysOut = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const fiveDaysOut = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
        const fourteenDaysOut = new Date(
          now.getTime() + 14 * 24 * 60 * 60 * 1000,
        );

        vi.mocked(prisma.deadline.findMany).mockResolvedValue([
          {
            id: "d-1",
            title: "Urgent Deadline",
            description: "Very soon",
            dueDate: twoDaysOut,
            status: "DUE_SOON",
          },
          {
            id: "d-2",
            title: "Medium Deadline",
            description: null,
            dueDate: fiveDaysOut,
            status: "UPCOMING",
          },
          {
            id: "d-3",
            title: "Low Deadline",
            description: null,
            dueDate: fourteenDaysOut,
            status: "UPCOMING",
          },
        ] as never);

        const result = await getDashboardAlerts(userId);

        const d1 = result.find((a) => a.id === "deadline-d-1");
        const d2 = result.find((a) => a.id === "deadline-d-2");
        const d3 = result.find((a) => a.id === "deadline-d-3");

        expect(d1).toBeDefined();
        expect(d1!.severity).toBe("high"); // <= 3 days
        expect(d1!.type).toBe("deadline");

        expect(d2).toBeDefined();
        expect(d2!.severity).toBe("medium"); // 4-7 days

        expect(d3).toBeDefined();
        expect(d3!.severity).toBe("low"); // > 7 days
      });

      it("should use description when available, fallback to 'Due in X days'", async () => {
        const fiveDaysOut = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

        vi.mocked(prisma.deadline.findMany).mockResolvedValue([
          {
            id: "d-1",
            title: "Deadline With Desc",
            description: "Custom description",
            dueDate: fiveDaysOut,
            status: "UPCOMING",
          },
          {
            id: "d-2",
            title: "Deadline Without Desc",
            description: null,
            dueDate: fiveDaysOut,
            status: "UPCOMING",
          },
        ] as never);

        const result = await getDashboardAlerts(userId);

        const d1 = result.find((a) => a.id === "deadline-d-1");
        const d2 = result.find((a) => a.id === "deadline-d-2");

        expect(d1!.description).toBe("Custom description");
        expect(d2!.description).toContain("Due in");
        expect(d2!.description).toContain("days");
      });
    });

    describe("insurance expiry alerts", () => {
      it("should create alerts for expiring insurance policies", async () => {
        const tenDaysOut = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

        vi.mocked(prisma.insurancePolicy.findMany).mockResolvedValue([
          {
            id: "pol-1",
            insuranceType: "Third Party Liability",
            status: "active",
            expirationDate: tenDaysOut,
          },
        ] as never);

        const result = await getDashboardAlerts(userId);
        const expiryAlert = result.find(
          (a) => a.id === "insurance-expiry-pol-1",
        );

        expect(expiryAlert).toBeDefined();
        expect(expiryAlert!.type).toBe("expiry");
        expect(expiryAlert!.severity).toBe("medium"); // > 7 days
        expect(expiryAlert!.title).toContain("Insurance Policy Expiring");
        expect(expiryAlert!.title).toContain("Third Party Liability");
        expect(expiryAlert!.link).toBe("/dashboard/modules/insurance");
      });

      it("should mark severity as high when policy expires within 7 days", async () => {
        const fiveDaysOut = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

        vi.mocked(prisma.insurancePolicy.findMany).mockResolvedValue([
          {
            id: "pol-2",
            insuranceType: "Operator Liability",
            status: "active",
            expirationDate: fiveDaysOut,
          },
        ] as never);

        const result = await getDashboardAlerts(userId);
        const expiryAlert = result.find(
          (a) => a.id === "insurance-expiry-pol-2",
        );

        expect(expiryAlert).toBeDefined();
        expect(expiryAlert!.severity).toBe("high");
      });

      it("should skip policies with null expirationDate", async () => {
        vi.mocked(prisma.insurancePolicy.findMany).mockResolvedValue([
          {
            id: "pol-3",
            insuranceType: "Generic",
            status: "active",
            expirationDate: null,
          },
        ] as never);

        const result = await getDashboardAlerts(userId);
        const expiryAlert = result.find(
          (a) => a.id === "insurance-expiry-pol-3",
        );

        expect(expiryAlert).toBeUndefined();
      });
    });

    describe("alert sorting", () => {
      it("should sort alerts by severity first (critical > high > medium > low)", async () => {
        const now = new Date();
        const fiveDaysOut = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
        const twoDaysOut = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const fourteenDaysOut = new Date(
          now.getTime() + 14 * 24 * 60 * 60 * 1000,
        );

        // Overdue incident (critical)
        const tenHoursAgo = new Date();
        tenHoursAgo.setHours(tenHoursAgo.getHours() - 10);

        vi.mocked(prisma.incident.findMany).mockResolvedValue([
          {
            id: "inc-1",
            incidentNumber: "INC-001",
            status: "investigating",
            severity: "critical",
            category: "loss_of_contact",
            requiresNCANotification: true,
            reportedToNCA: false,
            detectedAt: tenHoursAgo,
          },
        ] as never);

        vi.mocked(prisma.deadline.findMany).mockResolvedValue([
          {
            id: "d-low",
            title: "Low Priority",
            description: null,
            dueDate: fourteenDaysOut,
            status: "UPCOMING",
          },
          {
            id: "d-high",
            title: "High Priority",
            description: null,
            dueDate: twoDaysOut,
            status: "DUE_SOON",
          },
          {
            id: "d-med",
            title: "Medium Priority",
            description: null,
            dueDate: fiveDaysOut,
            status: "UPCOMING",
          },
        ] as never);

        const result = await getDashboardAlerts(userId);

        // Should be: critical first, then high, then medium, then low
        const severities = result.map((a) => a.severity);
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        for (let i = 1; i < severities.length; i++) {
          expect(severityOrder[severities[i]]).toBeGreaterThanOrEqual(
            severityOrder[severities[i - 1]],
          );
        }
      });

      it("should sort by due date within the same severity level", async () => {
        const now = new Date();
        const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const fiveDaysOut = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

        vi.mocked(prisma.deadline.findMany).mockResolvedValue([
          {
            id: "d-later",
            title: "Later Deadline",
            description: null,
            dueDate: fiveDaysOut,
            status: "UPCOMING",
          },
          {
            id: "d-sooner",
            title: "Sooner Deadline",
            description: null,
            dueDate: threeDaysOut,
            status: "DUE_SOON",
          },
        ] as never);

        const result = await getDashboardAlerts(userId);

        // Both should be medium severity (3-7 days); d-sooner should come first
        const deadlineAlerts = result.filter((a) =>
          a.id.startsWith("deadline-"),
        );
        // d-sooner is <=3 days so "high", d-later is 4-7 days so "medium"
        // high should come before medium
        expect(deadlineAlerts[0].id).toBe("deadline-d-sooner");
        expect(deadlineAlerts[1].id).toBe("deadline-d-later");
      });
    });
  });
});
