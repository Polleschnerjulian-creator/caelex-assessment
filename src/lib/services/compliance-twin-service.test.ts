/**
 * Compliance Digital Twin Service Tests
 *
 * Tests: main aggregation (getComplianceTwinState), framework comparison,
 * risk matrix, evidence gap analysis, timeline data, and alert generation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    nIS2Assessment: { findFirst: vi.fn() },
    debrisAssessment: { findFirst: vi.fn() },
    cybersecurityAssessment: { findFirst: vi.fn() },
    insuranceAssessment: { findFirst: vi.fn() },
    environmentalAssessment: { findFirst: vi.fn() },
    complianceSnapshot: { findMany: vi.fn() },
    organizationMember: { findFirst: vi.fn() },
    complianceEvidence: { findMany: vi.fn(), count: vi.fn() },
    deadline: { count: vi.fn(), findMany: vi.fn() },
    incident: { count: vi.fn(), findMany: vi.fn() },
    incidentNIS2Phase: { count: vi.fn() },
    missionPhase: { findMany: vi.fn() },
    debrisRequirementStatus: { findMany: vi.fn() },
    cybersecurityRequirementStatus: { findMany: vi.fn() },
    nIS2RequirementStatus: { findMany: vi.fn() },
  },
}));

vi.mock("./compliance-scoring-service", () => ({
  calculateComplianceScore: vi.fn(),
  MODULE_WEIGHTS: {
    authorization: 0.2,
    debris: 0.2,
    cybersecurity: 0.2,
    insurance: 0.15,
    environmental: 0.15,
    reporting: 0.1,
  },
}));

vi.mock("./ace-evidence-service.server", () => ({
  getModuleEvidencePctMap: vi.fn().mockResolvedValue({}),
  calculateRegulationEvidencePct: vi.fn().mockResolvedValue(0),
}));

import {
  getComplianceTwinState,
  getFrameworkComparison,
  getRiskMatrix,
  getEvidenceGapAnalysis,
  getTimelineData,
} from "./compliance-twin-service";
import { prisma } from "@/lib/prisma";
import { calculateComplianceScore } from "./compliance-scoring-service";
import { getModuleEvidencePctMap } from "./ace-evidence-service.server";

const mockPrisma = prisma as unknown as {
  nIS2Assessment: { findFirst: ReturnType<typeof vi.fn> };
  debrisAssessment: { findFirst: ReturnType<typeof vi.fn> };
  cybersecurityAssessment: { findFirst: ReturnType<typeof vi.fn> };
  insuranceAssessment: { findFirst: ReturnType<typeof vi.fn> };
  environmentalAssessment: { findFirst: ReturnType<typeof vi.fn> };
  complianceSnapshot: { findMany: ReturnType<typeof vi.fn> };
  organizationMember: { findFirst: ReturnType<typeof vi.fn> };
  complianceEvidence: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  deadline: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  incident: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  incidentNIS2Phase: { count: ReturnType<typeof vi.fn> };
  missionPhase: { findMany: ReturnType<typeof vi.fn> };
  debrisRequirementStatus: { findMany: ReturnType<typeof vi.fn> };
  cybersecurityRequirementStatus: { findMany: ReturnType<typeof vi.fn> };
  nIS2RequirementStatus: { findMany: ReturnType<typeof vi.fn> };
};

const mockCalculateComplianceScore = calculateComplianceScore as ReturnType<
  typeof vi.fn
>;
const mockGetModuleEvidencePctMap = getModuleEvidencePctMap as ReturnType<
  typeof vi.fn
>;

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const baseComplianceScore = {
  overall: 75,
  grade: "B",
  status: "partial",
  lastCalculated: new Date("2025-06-01T00:00:00.000Z"),
  breakdown: {
    authorization: {
      score: 80,
      weight: 0.2,
      status: "partial",
      factors: [
        { id: "f1", earnedPoints: 10, maxPoints: 10 },
        { id: "f2", earnedPoints: 5, maxPoints: 10 },
      ],
    },
    debris: {
      score: 70,
      weight: 0.2,
      status: "partial",
      factors: [{ id: "f3", earnedPoints: 7, maxPoints: 10 }],
    },
    cybersecurity: {
      score: 60,
      weight: 0.2,
      status: "partial",
      factors: [{ id: "f4", earnedPoints: 6, maxPoints: 10 }],
    },
    insurance: {
      score: 90,
      weight: 0.15,
      status: "compliant",
      factors: [{ id: "f5", earnedPoints: 9, maxPoints: 10 }],
    },
    environmental: {
      score: 85,
      weight: 0.15,
      status: "compliant",
      factors: [{ id: "f6", earnedPoints: 10, maxPoints: 10 }],
    },
    reporting: {
      score: 50,
      weight: 0.1,
      status: "non_compliant",
      factors: [{ id: "f7", earnedPoints: 0, maxPoints: 10 }],
    },
  },
  recommendations: [],
};

function setupDefaultMocks() {
  mockCalculateComplianceScore.mockResolvedValue(baseComplianceScore);

  mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
    complianceScore: 65,
    entityClassification: "essential",
    updatedAt: new Date("2025-05-01T00:00:00.000Z"),
    requirements: [
      { status: "compliant" },
      { status: "partial" },
      { status: "non_compliant" },
    ],
  });

  // Evidence data — the internal getEvidenceData queries organizationMember twice
  // (once in the main Promise.all, once inside getEvidenceData)
  mockPrisma.organizationMember.findFirst.mockResolvedValue({
    organizationId: "org-001",
  });

  mockPrisma.complianceEvidence.count
    .mockResolvedValueOnce(20) // total
    .mockResolvedValueOnce(15) // accepted
    .mockResolvedValueOnce(2); // expired

  // Deadline data
  mockPrisma.deadline.count
    .mockResolvedValueOnce(10) // total
    .mockResolvedValueOnce(1) // overdue
    .mockResolvedValueOnce(2) // dueSoon
    .mockResolvedValueOnce(5); // completed
  mockPrisma.deadline.findMany.mockResolvedValue([
    {
      moduleSource: "AUTHORIZATION",
      dueDate: new Date("2025-07-01T00:00:00.000Z"),
    },
  ]);

  // Incident data
  mockPrisma.incident.count
    .mockResolvedValueOnce(3) // open
    .mockResolvedValueOnce(1); // critical
  mockPrisma.incident.findMany.mockResolvedValue([
    {
      detectedAt: new Date("2025-05-01T00:00:00.000Z"),
      resolvedAt: new Date("2025-05-02T00:00:00.000Z"),
    },
  ]);

  // NCA overdue
  mockPrisma.incidentNIS2Phase.count.mockResolvedValue(0);

  // Snapshots
  mockPrisma.complianceSnapshot.findMany.mockResolvedValue([]);

  // Module evidence pct map
  mockGetModuleEvidencePctMap.mockResolvedValue({
    authorization: 80,
    debris: 60,
    cybersecurity: 40,
    insurance: 90,
    environmental: 70,
    reporting: 20,
  });
}

describe("Compliance Twin Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // getComplianceTwinState
  // ==========================================================================

  describe("getComplianceTwinState", () => {
    it("returns a complete state object with all required fields", async () => {
      setupDefaultMocks();

      const state = await getComplianceTwinState("user-001");

      // Score section
      expect(state.score).toBeDefined();
      expect(state.score.overall).toBe(75);
      expect(state.score.grade).toBe("B");
      expect(state.score.nis2).toBe(65);
      expect(state.score.maturityLevel).toBeGreaterThanOrEqual(1);
      expect(state.score.maturityLevel).toBeLessThanOrEqual(5);
      expect(state.score.maturityLabel).toBeDefined();

      // Modules
      expect(state.modules).toBeDefined();
      expect(Array.isArray(state.modules)).toBe(true);
      expect(state.modules.length).toBe(6); // 6 breakdown modules

      // Evidence
      expect(state.evidence).toBeDefined();
      expect(state.evidence.total).toBe(20);
      expect(state.evidence.accepted).toBe(15);
      expect(state.evidence.expired).toBe(2);
      expect(state.evidence.completePct).toBe(75); // 15/20 = 75%

      // Deadlines
      expect(state.deadlines).toBeDefined();
      expect(state.deadlines.total).toBe(10);
      expect(state.deadlines.overdue).toBe(1);
      expect(state.deadlines.dueSoon).toBe(2);
      expect(state.deadlines.completed).toBe(5);
      expect(state.deadlines.healthScore).toBe(90); // (10-1)/10 * 100

      // Incidents
      expect(state.incidents).toBeDefined();
      expect(state.incidents.open).toBe(3);
      expect(state.incidents.critical).toBe(1);
      expect(state.incidents.mttrHours).toBeDefined();
      expect(state.incidents.ncaOverdue).toBe(0);

      // Risk
      expect(state.risk).toBeDefined();
      expect(state.risk.maxPenaltyExposure).toBeGreaterThan(0);
      expect(state.risk.estimatedRiskEur).toBeGreaterThan(0);

      // Velocity
      expect(state.velocity).toBeDefined();
      expect(["improving", "stable", "declining"]).toContain(
        state.velocity.trend,
      );

      // Requirements
      expect(state.requirements).toBeDefined();
      expect(state.requirements.total).toBeGreaterThan(0);

      // History & forecast
      expect(Array.isArray(state.history)).toBe(true);
      expect(Array.isArray(state.forecast)).toBe(true);

      // Alerts
      expect(Array.isArray(state.alerts)).toBe(true);

      // Timestamp
      expect(state.lastUpdated).toBeDefined();
    });

    it("handles null NIS2 assessment gracefully", async () => {
      setupDefaultMocks();
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue(null);

      const state = await getComplianceTwinState("user-001");

      expect(state.score.nis2).toBeNull();
      // Risk should use EU Space Act penalty only (no NIS2 penalty)
      expect(state.risk.maxPenaltyExposure).toBe(5_000_000);
    });

    it("computes maturity level 3 for score=75 with overdue deadlines", async () => {
      setupDefaultMocks();
      // score=75, evidencePct=75%, but overdue=1 -> level 3
      // (level 4 requires overdueDeadlines === 0)

      const state = await getComplianceTwinState("user-001");

      // With score 75 and 1 overdue deadline, maturity should be 3
      expect(state.score.maturityLevel).toBe(3);
      expect(state.score.maturityLabel).toBe("Defined");
    });

    it("computes maturity level correctly based on score thresholds", async () => {
      setupDefaultMocks();

      // Low score scenario: score < 20 -> maturity 1
      const lowScore = {
        ...baseComplianceScore,
        overall: 15,
        breakdown: {
          ...baseComplianceScore.breakdown,
        },
      };
      mockCalculateComplianceScore.mockResolvedValue(lowScore);
      mockPrisma.deadline.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.deadline.findMany.mockResolvedValue([]);

      const state = await getComplianceTwinState("user-001");
      expect(state.score.maturityLevel).toBe(1);
      expect(state.score.maturityLabel).toBe("Initial");
    });

    it("computes requirements totals from breakdown + NIS2", async () => {
      setupDefaultMocks();

      const state = await getComplianceTwinState("user-001");

      // Breakdown factors: 2 (auth) + 1 (debris) + 1 (cyber) + 1 (ins) + 1 (env) + 1 (rep) = 7
      // NIS2 requirements: 3
      // Total: 10
      expect(state.requirements.total).toBe(10);

      // Compliant: f1(10/10) + f6(10/10) = 2 from breakdown + 1 NIS2 compliant = 3
      expect(state.requirements.compliant).toBe(3);

      // Partial: f2(5/10), f3(7/10), f4(6/10), f5(9/10) = 4 from breakdown + 1 NIS2 partial = 5
      expect(state.requirements.partial).toBe(5);

      // Non-compliant: f7(0/10) = 1 from breakdown + 1 NIS2 non_compliant = 2
      expect(state.requirements.nonCompliant).toBe(2);
    });

    it("builds module statuses with evidence percentages from ACE", async () => {
      setupDefaultMocks();

      const state = await getComplianceTwinState("user-001");

      const authModule = state.modules.find((m) => m.id === "authorization");
      expect(authModule).toBeDefined();
      expect(authModule!.name).toBe("Authorization");
      expect(authModule!.score).toBe(80);
      expect(authModule!.weight).toBe(0.2);
      expect(authModule!.evidencePct).toBe(80);
      expect(authModule!.articleRefs).toEqual(["Art. 6-27"]);

      const reportingModule = state.modules.find((m) => m.id === "reporting");
      expect(reportingModule).toBeDefined();
      expect(reportingModule!.evidencePct).toBe(20);
    });

    it("returns empty modules evidence when no organization membership", async () => {
      setupDefaultMocks();
      // Override organizationMember to return null for the second call
      // (first call is in getEvidenceData, second in main function)
      mockPrisma.organizationMember.findFirst
        .mockResolvedValueOnce({ organizationId: "org-001" }) // getEvidenceData
        .mockResolvedValueOnce(null); // main function

      const state = await getComplianceTwinState("user-001");

      // Modules should still be built, but evidencePct defaults to 0
      // because getModuleEvidencePctMap won't be called when orgMember is null
      for (const mod of state.modules) {
        expect(mod.evidencePct).toBe(0);
      }
    });

    // Alert generation tests (via getComplianceTwinState)

    it("generates alert for overdue deadlines", async () => {
      setupDefaultMocks();

      const state = await getComplianceTwinState("user-001");

      const overdueAlert = state.alerts.find(
        (a) => a.id === "alert-overdue-deadlines",
      );
      expect(overdueAlert).toBeDefined();
      expect(overdueAlert!.type).toBe("deadline");
      expect(overdueAlert!.severity).toBe("critical");
      expect(overdueAlert!.title).toContain("1 overdue deadline");
    });

    it("generates alert for expired evidence", async () => {
      setupDefaultMocks();

      const state = await getComplianceTwinState("user-001");

      const expiredAlert = state.alerts.find(
        (a) => a.id === "alert-expired-evidence",
      );
      expect(expiredAlert).toBeDefined();
      expect(expiredAlert!.type).toBe("evidence");
      expect(expiredAlert!.severity).toBe("high");
      expect(expiredAlert!.title).toContain("2 expired evidence items");
    });

    it("generates alert for critical incidents", async () => {
      setupDefaultMocks();

      const state = await getComplianceTwinState("user-001");

      const criticalAlert = state.alerts.find(
        (a) => a.id === "alert-critical-incidents",
      );
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert!.type).toBe("incident");
      expect(criticalAlert!.severity).toBe("critical");
    });

    it("generates alert for non-compliant modules", async () => {
      setupDefaultMocks();

      const state = await getComplianceTwinState("user-001");

      // reporting module has status "non_compliant"
      const reportingAlert = state.alerts.find(
        (a) => a.id === "alert-module-reporting",
      );
      expect(reportingAlert).toBeDefined();
      expect(reportingAlert!.type).toBe("compliance");
      expect(reportingAlert!.title).toContain(
        "Supervision & Reporting module non-compliant",
      );
      expect(reportingAlert!.description).toContain("50/100");
    });

    it("generates NCA overdue alert when NCA phases are overdue", async () => {
      setupDefaultMocks();
      mockPrisma.incidentNIS2Phase.count.mockResolvedValue(2);

      const state = await getComplianceTwinState("user-001");

      const ncaAlert = state.alerts.find((a) => a.id === "alert-nca-overdue");
      expect(ncaAlert).toBeDefined();
      expect(ncaAlert!.type).toBe("nca");
      expect(ncaAlert!.severity).toBe("critical");
      expect(ncaAlert!.title).toContain("2 NCA notifications overdue");
    });

    it("generates no overdue/expired alerts when there are none", async () => {
      setupDefaultMocks();
      // Override: 0 overdue, 0 expired, 0 critical incidents, 0 NCA
      mockPrisma.deadline.count
        .mockReset()
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(0) // overdue
        .mockResolvedValueOnce(0) // dueSoon
        .mockResolvedValueOnce(5); // completed
      mockPrisma.complianceEvidence.count
        .mockReset()
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(10) // accepted
        .mockResolvedValueOnce(0); // expired
      mockPrisma.incident.count
        .mockReset()
        .mockResolvedValueOnce(0) // open
        .mockResolvedValueOnce(0); // critical
      mockPrisma.incident.findMany.mockResolvedValue([]);

      const state = await getComplianceTwinState("user-001");

      expect(
        state.alerts.find((a) => a.id === "alert-overdue-deadlines"),
      ).toBeUndefined();
      expect(
        state.alerts.find((a) => a.id === "alert-expired-evidence"),
      ).toBeUndefined();
      expect(
        state.alerts.find((a) => a.id === "alert-critical-incidents"),
      ).toBeUndefined();
    });

    it("sorts alerts by severity (critical first)", async () => {
      setupDefaultMocks();
      mockPrisma.incidentNIS2Phase.count.mockResolvedValue(1);

      const state = await getComplianceTwinState("user-001");

      // Verify ordering: all critical alerts before high alerts
      const severities = state.alerts.map((a) => a.severity);
      const criticalEnd = severities.lastIndexOf("critical");
      const highStart = severities.indexOf("high");

      if (criticalEnd >= 0 && highStart >= 0) {
        expect(criticalEnd).toBeLessThan(highStart);
      }
    });
  });

  // ==========================================================================
  // getFrameworkComparison
  // ==========================================================================

  describe("getFrameworkComparison", () => {
    beforeEach(() => {
      mockCalculateComplianceScore.mockResolvedValue(baseComplianceScore);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        organizationId: "org-001",
      });
      mockGetModuleEvidencePctMap.mockResolvedValue({
        authorization: 80,
        debris: 60,
        cybersecurity: 40,
        insurance: 90,
        environmental: 70,
        nis2: 30,
      });
    });

    it("returns frameworks array and radarData", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
        complianceScore: 65,
        entityClassification: "essential",
        updatedAt: new Date("2025-05-01T00:00:00.000Z"),
        requirements: [{ status: "compliant" }, { status: "partial" }],
      });
      mockPrisma.debrisAssessment.findFirst.mockResolvedValue({
        updatedAt: new Date("2025-04-01T00:00:00.000Z"),
        requirements: [{ status: "compliant" }],
      });
      mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValue({
        updatedAt: new Date("2025-04-15T00:00:00.000Z"),
        requirements: [{ status: "compliant" }, { status: "partial" }],
      });
      mockPrisma.insuranceAssessment.findFirst.mockResolvedValue({
        updatedAt: new Date("2025-03-01T00:00:00.000Z"),
      });
      mockPrisma.environmentalAssessment.findFirst.mockResolvedValue({
        updatedAt: new Date("2025-03-15T00:00:00.000Z"),
      });

      const result = await getFrameworkComparison("user-001");

      expect(result.frameworks).toBeDefined();
      expect(Array.isArray(result.frameworks)).toBe(true);
      expect(result.radarData).toBeDefined();
      expect(Array.isArray(result.radarData)).toBe(true);

      // EU Space Act is always included
      const euSpaceAct = result.frameworks.find((f) => f.id === "eu_space_act");
      expect(euSpaceAct).toBeDefined();
      expect(euSpaceAct!.name).toBe("EU Space Act");
      expect(euSpaceAct!.score).toBe(75);

      // NIS2 should be present
      const nis2 = result.frameworks.find((f) => f.id === "nis2");
      expect(nis2).toBeDefined();
      expect(nis2!.score).toBe(65);
      expect(nis2!.evidencePct).toBe(30);

      // Debris should be present
      const debris = result.frameworks.find((f) => f.id === "debris");
      expect(debris).toBeDefined();
      expect(debris!.score).toBe(70);

      // radarData should match frameworks
      expect(result.radarData.length).toBe(result.frameworks.length);
      for (const rd of result.radarData) {
        expect(rd.framework).toBeDefined();
        expect(typeof rd.score).toBe("number");
      }
    });

    it("excludes frameworks without assessments", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue(null);
      mockPrisma.debrisAssessment.findFirst.mockResolvedValue(null);
      mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mockPrisma.insuranceAssessment.findFirst.mockResolvedValue(null);
      mockPrisma.environmentalAssessment.findFirst.mockResolvedValue(null);

      const result = await getFrameworkComparison("user-001");

      // Only EU Space Act (always present)
      expect(result.frameworks.length).toBe(1);
      expect(result.frameworks[0].id).toBe("eu_space_act");
    });

    it("calculates EU Space Act evidence pct as average of component modules", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue(null);
      mockPrisma.debrisAssessment.findFirst.mockResolvedValue(null);
      mockPrisma.cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mockPrisma.insuranceAssessment.findFirst.mockResolvedValue(null);
      mockPrisma.environmentalAssessment.findFirst.mockResolvedValue(null);

      const result = await getFrameworkComparison("user-001");

      // Average of auth(80) + debris(60) + cyber(40) + insurance(90) + environmental(70) = 340/5 = 68
      expect(result.frameworks[0].evidencePct).toBe(68);
    });
  });

  // ==========================================================================
  // getRiskMatrix
  // ==========================================================================

  describe("getRiskMatrix", () => {
    beforeEach(() => {
      mockCalculateComplianceScore.mockResolvedValue(baseComplianceScore);
    });

    it("returns risk entries for all breakdown modules", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue(null);

      const entries = await getRiskMatrix("user-001");

      // 6 EU Space Act modules, no NIS2
      expect(entries.length).toBe(6);

      for (const entry of entries) {
        expect(entry.id).toBeDefined();
        expect(entry.name).toBeDefined();
        expect(entry.readiness).toBeGreaterThanOrEqual(0);
        expect(entry.readiness).toBeLessThanOrEqual(100);
        expect(entry.riskFactor).toBeGreaterThanOrEqual(0);
        expect(["low", "medium", "high", "critical"]).toContain(entry.riskZone);
        expect(entry.financialExposure).toBeGreaterThanOrEqual(0);
        expect(entry.maxPenalty).toBeGreaterThan(0);
      }
    });

    it("includes NIS2 entry when NIS2 assessment exists", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "essential",
        complianceScore: 40,
      });

      const entries = await getRiskMatrix("user-001");

      // 6 modules + NIS2 = 7
      expect(entries.length).toBe(7);

      const nis2Entry = entries.find((e) => e.id === "nis2");
      expect(nis2Entry).toBeDefined();
      expect(nis2Entry!.name).toBe("NIS2 Directive");
      expect(nis2Entry!.readiness).toBe(40);
      expect(nis2Entry!.maxPenalty).toBe(10_000_000); // essential entity
      expect(nis2Entry!.criticality).toBe(90);
    });

    it("uses correct NIS2 penalty for important entity", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "important",
        complianceScore: 60,
      });

      const entries = await getRiskMatrix("user-001");

      const nis2Entry = entries.find((e) => e.id === "nis2");
      expect(nis2Entry).toBeDefined();
      expect(nis2Entry!.maxPenalty).toBe(7_000_000); // important entity
    });

    it("assigns correct risk zones based on score", async () => {
      // Override with extreme scores to test zone boundaries
      const extremeScore = {
        ...baseComplianceScore,
        breakdown: {
          authorization: {
            score: 100,
            weight: 0.2,
            status: "compliant",
            factors: [],
          },
          debris: { score: 80, weight: 0.2, status: "partial", factors: [] },
          cybersecurity: {
            score: 55,
            weight: 0.2,
            status: "partial",
            factors: [],
          },
          insurance: {
            score: 20,
            weight: 0.15,
            status: "non_compliant",
            factors: [],
          },
          environmental: {
            score: 0,
            weight: 0.15,
            status: "non_compliant",
            factors: [],
          },
          reporting: {
            score: 50,
            weight: 0.1,
            status: "non_compliant",
            factors: [],
          },
        },
      };
      mockCalculateComplianceScore.mockResolvedValue(extremeScore);
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue(null);

      const entries = await getRiskMatrix("user-001");

      const auth = entries.find((e) => e.id === "authorization");
      expect(auth!.riskZone).toBe("low"); // score 100 -> riskFactor 0

      const debris = entries.find((e) => e.id === "debris");
      expect(debris!.riskZone).toBe("low"); // score 80 -> riskFactor 0.2

      const insurance = entries.find((e) => e.id === "insurance");
      expect(insurance!.riskZone).toBe("critical"); // score 20 -> riskFactor 0.8

      const environmental = entries.find((e) => e.id === "environmental");
      expect(environmental!.riskZone).toBe("critical"); // score 0 -> riskFactor 1.0
    });

    it("calculates financial exposure correctly", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "essential",
        complianceScore: 50,
      });

      const entries = await getRiskMatrix("user-001");

      // cybersecurity module: essential entity -> NIS2_PENALTY_ESSENTIAL = 10M
      // score 60 -> riskFactor = (100-60)/100 = 0.4
      // financialExposure = 10_000_000 * 0.4 = 4_000_000
      const cyber = entries.find((e) => e.id === "cybersecurity");
      expect(cyber).toBeDefined();
      expect(cyber!.maxPenalty).toBe(10_000_000);
      expect(cyber!.financialExposure).toBe(4_000_000);
    });
  });

  // ==========================================================================
  // getEvidenceGapAnalysis
  // ==========================================================================

  describe("getEvidenceGapAnalysis", () => {
    it("returns sorted gaps by criticality (critical first)", async () => {
      mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([
        { requirementId: "dr-1", status: "partial" },
      ]);
      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([
        { requirementId: "cr-1", status: "non_compliant" },
      ]);
      mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([
        { requirementId: "nr-1", status: "non_compliant" },
        { requirementId: "nr-2", status: "partial" },
      ]);
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([]);

      const gaps = await getEvidenceGapAnalysis("user-001", "org-001");

      expect(gaps.length).toBe(4);

      // Verify sorted by criticality
      const criticalityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < gaps.length; i++) {
        expect(criticalityOrder[gaps[i].criticality]).toBeGreaterThanOrEqual(
          criticalityOrder[gaps[i - 1].criticality],
        );
      }

      // Critical gaps should come first (cyber non_compliant and NIS2 non_compliant)
      const criticalGaps = gaps.filter((g) => g.criticality === "critical");
      expect(criticalGaps.length).toBe(2);
      expect(
        criticalGaps.every(
          (g) => g.framework === "cybersecurity" || g.framework === "nis2",
        ),
      ).toBe(true);
    });

    it("handles empty evidence map (null organizationId)", async () => {
      mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([
        { requirementId: "dr-1", status: "compliant" },
      ]);
      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([]);

      // null organizationId -> no evidence fetched
      const gaps = await getEvidenceGapAnalysis("user-001", null);

      // Even compliant requirements without approved evidence are flagged
      expect(gaps.length).toBe(1);
      expect(gaps[0].hasEvidence).toBe(false);
      expect(gaps[0].framework).toBe("debris");
    });

    it("marks evidence as expired correctly", async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([
        { requirementId: "dr-1", status: "partial" },
      ]);
      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([
        {
          requirementId: "dr-1",
          status: "APPROVED",
          validUntil: pastDate,
        },
      ]);

      const gaps = await getEvidenceGapAnalysis("user-001", "org-001");

      // dr-1 is partial status and has APPROVED evidence but expired
      // Still a gap because status is not "compliant"
      expect(gaps.length).toBe(1);
      expect(gaps[0].hasEvidence).toBe(true);
      expect(gaps[0].evidenceExpired).toBe(true);
    });

    it("does not flag compliant requirements with approved evidence", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([
        { requirementId: "dr-1", status: "compliant" },
      ]);
      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([
        {
          requirementId: "dr-1",
          status: "APPROVED",
          validUntil: futureDate,
        },
      ]);

      const gaps = await getEvidenceGapAnalysis("user-001", "org-001");

      // Compliant + APPROVED evidence -> no gap
      expect(gaps.length).toBe(0);
    });

    it("returns empty array when no requirements exist", async () => {
      mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([]);

      const gaps = await getEvidenceGapAnalysis("user-001", "org-001");

      expect(gaps).toEqual([]);
    });

    it("assigns correct criticality per framework", async () => {
      mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([
        { requirementId: "dr-1", status: "non_compliant" },
        { requirementId: "dr-2", status: "partial" },
      ]);
      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([
        { requirementId: "cr-1", status: "non_compliant" },
        { requirementId: "cr-2", status: "partial" },
      ]);
      mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([
        { requirementId: "nr-1", status: "non_compliant" },
        { requirementId: "nr-2", status: "partial" },
      ]);
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([]);

      const gaps = await getEvidenceGapAnalysis("user-001", "org-001");

      // debris non_compliant -> high, debris partial -> medium
      const debrisNonCompliant = gaps.find(
        (g) => g.framework === "debris" && g.status === "non_compliant",
      );
      expect(debrisNonCompliant!.criticality).toBe("high");

      const debrisPartial = gaps.find(
        (g) => g.framework === "debris" && g.status === "partial",
      );
      expect(debrisPartial!.criticality).toBe("medium");

      // cybersecurity non_compliant -> critical, cybersecurity partial -> high
      const cyberNonCompliant = gaps.find(
        (g) => g.framework === "cybersecurity" && g.status === "non_compliant",
      );
      expect(cyberNonCompliant!.criticality).toBe("critical");

      const cyberPartial = gaps.find(
        (g) => g.framework === "cybersecurity" && g.status === "partial",
      );
      expect(cyberPartial!.criticality).toBe("high");

      // NIS2 non_compliant -> critical, NIS2 partial -> high
      const nis2NonCompliant = gaps.find(
        (g) => g.framework === "nis2" && g.status === "non_compliant",
      );
      expect(nis2NonCompliant!.criticality).toBe("critical");
    });
  });

  // ==========================================================================
  // getTimelineData
  // ==========================================================================

  describe("getTimelineData", () => {
    it("returns timeline entries sorted by date", async () => {
      const now = new Date();
      const in30Days = new Date(now);
      in30Days.setDate(in30Days.getDate() + 30);
      const in60Days = new Date(now);
      in60Days.setDate(in60Days.getDate() + 60);
      const in90Days = new Date(now);
      in90Days.setDate(in90Days.getDate() + 90);

      mockPrisma.deadline.findMany.mockResolvedValue([
        {
          id: "dl-1",
          title: "Submit Authorization",
          dueDate: in60Days,
          priority: "HIGH",
          status: "UPCOMING",
          moduleSource: "authorization",
        },
        {
          id: "dl-2",
          title: "NIS2 Compliance Deadline",
          dueDate: in30Days,
          priority: "CRITICAL",
          status: "UPCOMING",
          moduleSource: "nis2",
        },
      ]);

      mockPrisma.missionPhase.findMany.mockResolvedValue([
        {
          id: "mp-1",
          startDate: now,
          milestones: [
            {
              id: "ms-1",
              name: "Launch Window",
              targetDate: in90Days,
              status: "pending",
            },
          ],
        },
      ]);

      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        organizationId: "org-001",
      });

      mockPrisma.complianceEvidence.findMany.mockResolvedValue([
        {
          id: "ev-1",
          title: "Insurance Certificate",
          validUntil: in60Days,
        },
      ]);

      const entries = await getTimelineData("user-001");

      expect(entries.length).toBeGreaterThanOrEqual(3);

      // Verify sorted by date
      for (let i = 1; i < entries.length; i++) {
        expect(new Date(entries[i].date).getTime()).toBeGreaterThanOrEqual(
          new Date(entries[i - 1].date).getTime(),
        );
      }

      // First entry should be the 30-day deadline
      expect(entries[0].id).toBe("dl-2");
      expect(entries[0].type).toBe("deadline");
    });

    it("includes evidence expiry entries when organization exists", async () => {
      const in45Days = new Date();
      in45Days.setDate(in45Days.getDate() + 45);

      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.missionPhase.findMany.mockResolvedValue([]);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        organizationId: "org-001",
      });
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([
        {
          id: "ev-1",
          title: "Security Audit Report",
          validUntil: in45Days,
        },
      ]);

      const entries = await getTimelineData("user-001");

      expect(entries.length).toBe(1);
      expect(entries[0].type).toBe("evidence_expiry");
      expect(entries[0].title).toContain("Security Audit Report");
      expect(entries[0].priority).toBe("MEDIUM");
    });

    it("excludes evidence expiry when no organization membership", async () => {
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.missionPhase.findMany.mockResolvedValue([]);
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      const entries = await getTimelineData("user-001");

      expect(entries.length).toBe(0);
    });

    it("includes mission milestones within the 6-month window", async () => {
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);

      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      mockPrisma.missionPhase.findMany.mockResolvedValue([
        {
          id: "mp-1",
          startDate: new Date(),
          milestones: [
            {
              id: "ms-1",
              name: "Orbit Insertion",
              targetDate: in30Days,
              status: "pending",
            },
            {
              id: "ms-2",
              name: "Decommission",
              targetDate: new Date("2030-01-01T00:00:00.000Z"), // far future, outside window
              status: "planned",
            },
          ],
        },
      ]);

      const entries = await getTimelineData("user-001");

      // Only the milestone within 6 months should be included
      expect(entries.length).toBe(1);
      expect(entries[0].type).toBe("milestone");
      expect(entries[0].title).toBe("Orbit Insertion");
    });

    it("returns empty array when no data exists", async () => {
      mockPrisma.deadline.findMany.mockResolvedValue([]);
      mockPrisma.missionPhase.findMany.mockResolvedValue([]);
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      const entries = await getTimelineData("user-001");

      expect(entries).toEqual([]);
    });
  });

  // ==========================================================================
  // Snapshot-dependent code paths (history, velocity, forecast, module trends)
  // ==========================================================================

  describe("getComplianceTwinState with snapshots", () => {
    function buildSnapshotDaysAgo(daysAgo: number, overallScore: number) {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return {
        snapshotDate: d,
        overallScore,
        velocityDaily: 0.5,
        moduleScores: JSON.stringify({
          authorization: 70,
          debris: 60,
          cybersecurity: 50,
          insurance: 80,
          environmental: 75,
          reporting: 40,
        }),
      };
    }

    it("builds history from snapshots via .map callback", async () => {
      setupDefaultMocks();
      const snapshots = [
        buildSnapshotDaysAgo(0, 75),
        buildSnapshotDaysAgo(1, 73),
        buildSnapshotDaysAgo(2, 70),
      ];
      mockPrisma.complianceSnapshot.findMany.mockResolvedValue(snapshots);

      const state = await getComplianceTwinState("user-001");

      // History is snapshots reversed then mapped to { date, score }
      expect(state.history.length).toBe(3);
      expect(state.history[0].score).toBe(70); // oldest first after reverse
      expect(state.history[2].score).toBe(75); // newest last
      for (const h of state.history) {
        expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof h.score).toBe("number");
      }
    });

    it("computes velocity from snapshots via .find callback", async () => {
      setupDefaultMocks();
      // Create snapshots at 1, 7, and 30 days ago so the find callback matches
      const snapshots = [
        buildSnapshotDaysAgo(1, 73),
        buildSnapshotDaysAgo(7, 65),
        buildSnapshotDaysAgo(30, 50),
      ];
      mockPrisma.complianceSnapshot.findMany.mockResolvedValue(snapshots);

      const state = await getComplianceTwinState("user-001");

      // daily = currentScore(75) - score1d(73) = 2
      expect(state.velocity.daily).toBe(2);
      // sevenDay = currentScore(75) - score7d(65) = 10
      expect(state.velocity.sevenDay).toBe(10);
      // thirtyDay = currentScore(75) - score30d(50) = 25
      expect(state.velocity.thirtyDay).toBe(25);
      // 25 > 2, so trend is "improving"
      expect(state.velocity.trend).toBe("improving");
    });

    it("computes module trend from old snapshot via buildModuleStatuses .find callback", async () => {
      setupDefaultMocks();
      // Create a snapshot ~7 days ago so the find callback in buildModuleStatuses matches
      const snapshots = [buildSnapshotDaysAgo(7, 65)];
      mockPrisma.complianceSnapshot.findMany.mockResolvedValue(snapshots);

      const state = await getComplianceTwinState("user-001");

      // Module trend = current score - old module score from 7 days ago
      const authModule = state.modules.find((m) => m.id === "authorization");
      expect(authModule).toBeDefined();
      // authorization current score = 80, old = 70
      expect(authModule!.trend).toBe(10);

      const debrisModule = state.modules.find((m) => m.id === "debris");
      expect(debrisModule).toBeDefined();
      // debris current score = 70, old = 60
      expect(debrisModule!.trend).toBe(10);
    });

    it("computes forecast via linear regression when 3+ snapshots exist", async () => {
      setupDefaultMocks();
      // Need at least 3 snapshots for the linear regression path
      const snapshots = [
        buildSnapshotDaysAgo(0, 75),
        buildSnapshotDaysAgo(1, 73),
        buildSnapshotDaysAgo(2, 70),
        buildSnapshotDaysAgo(3, 68),
        buildSnapshotDaysAgo(7, 60),
      ];
      mockPrisma.complianceSnapshot.findMany.mockResolvedValue(snapshots);

      const state = await getComplianceTwinState("user-001");

      // Forecast should have ~13 entries (90 days / 7 day intervals)
      expect(state.forecast.length).toBeGreaterThan(0);
      for (const f of state.forecast) {
        expect(f.isForecast).toBe(true);
        expect(f.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.score).toBeGreaterThanOrEqual(0);
        expect(f.score).toBeLessThanOrEqual(100);
      }
    });

    it("computes flat forecast when fewer than 3 snapshots", async () => {
      setupDefaultMocks();
      const snapshots = [
        buildSnapshotDaysAgo(0, 75),
        buildSnapshotDaysAgo(1, 73),
      ];
      mockPrisma.complianceSnapshot.findMany.mockResolvedValue(snapshots);

      const state = await getComplianceTwinState("user-001");

      // Flat forecast: all scores should equal the current score (75)
      expect(state.forecast.length).toBeGreaterThan(0);
      for (const f of state.forecast) {
        expect(f.score).toBe(75);
        expect(f.isForecast).toBe(true);
      }
    });
  });
});
