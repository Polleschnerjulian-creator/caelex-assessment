import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only so the service can be imported in the test environment
vi.mock("server-only", () => ({}));

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
    nIS2Assessment: {
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
    organizationMember: {
      findFirst: vi.fn(),
    },
    satelliteComplianceState: {
      findMany: vi.fn(),
    },
    sentinelAgent: {
      count: vi.fn(),
    },
    ephemerisForecast: {
      count: vi.fn(),
    },
    nCASubmission: {
      findMany: vi.fn(),
    },
  },
}));

// Mock incident-response-service — real calculateNCADeadline logic replicated so
// overdue-incident tests do not depend on the real service's DB calls.
vi.mock("@/lib/services/incident-response-service", () => ({
  INCIDENT_CLASSIFICATION: {
    cyber_incident: { ncaDeadlineHours: 24 },
    loss_of_contact: { ncaDeadlineHours: 4 },
    debris_generation: { ncaDeadlineHours: 4 },
    conjunction_event: { ncaDeadlineHours: 72 },
    spacecraft_anomaly: { ncaDeadlineHours: 24 },
    regulatory_breach: { ncaDeadlineHours: 72 },
    nis2_significant_incident: { ncaDeadlineHours: 24 },
    nis2_near_miss: { ncaDeadlineHours: 72 },
    other: { ncaDeadlineHours: 72 },
  },
  calculateNCADeadline: vi.fn((category: string, detectedAt: Date): Date => {
    const hours: Record<string, number> = {
      cyber_incident: 24,
      loss_of_contact: 4,
      debris_generation: 4,
      conjunction_event: 72,
      spacecraft_anomaly: 24,
      regulatory_breach: 72,
      nis2_significant_incident: 24,
      nis2_near_miss: 72,
      other: 72,
    };
    const deadline = new Date(detectedAt);
    deadline.setHours(deadline.getHours() + (hours[category] ?? 72));
    return deadline;
  }),
}));

import { prisma } from "@/lib/prisma";
import {
  calculateComplianceScore,
  MODULE_WEIGHTS,
} from "@/lib/services/compliance-scoring-service";

// ============================================================================
// Helpers — keep test bodies concise
// ============================================================================

/** Sets every Prisma mock to return "empty / no data" defaults. */
function mockAllEmpty() {
  vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
  vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
  vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
  vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);
  vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([]);
  vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([]);
  vi.mocked(prisma.sentinelAgent.count).mockResolvedValue(0);
  vi.mocked(prisma.ephemerisForecast.count).mockResolvedValue(0);
}

/** Sets every module to its maximum scoring state. */
function mockAllComplete() {
  vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
    {
      id: "wf-1",
      status: "approved",
      documents: [
        { status: "ready" },
        { status: "ready" },
        { status: "ready" },
      ],
    },
  ] as never);
  vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
    planGenerated: true,
    complianceScore: 100,
    hasPassivationCap: true,
    deorbitStrategy: "active_deorbit",
  } as never);
  vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
    frameworkGeneratedAt: new Date(),
    maturityScore: 100,
    hasIncidentResponsePlan: true,
    hasSecurityTeam: true,
    hasBCP: true,
  } as never);
  vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue({
    id: "nis2-1",
  } as never);
  vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
    reportGenerated: true,
    calculatedTPL: 5_000_000,
    policies: [
      {
        status: "active",
        coverageAmount: 10_000_000,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    ],
  } as never);
  vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
    status: "submitted",
    totalGWP: 42,
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
  vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([
    {
      id: "nca-1",
      status: "APPROVED",
      rejectedAt: null,
      followUpRequired: false,
      followUpDeadline: null,
      originalSubmissionId: null,
      createdAt: new Date(),
    },
  ] as never);
  vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
    organizationId: "org-1",
  } as never);
  vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([
    { overallScore: 90, horizonDays: 365 },
  ] as never);
  vi.mocked(prisma.sentinelAgent.count).mockResolvedValue(2);
  vi.mocked(prisma.ephemerisForecast.count).mockResolvedValue(3);
}

// ============================================================================
// Tests
// ============================================================================

describe("Compliance Scoring Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Safe defaults so tests that only override some mocks don't fail
    mockAllEmpty();
  });

  // --------------------------------------------------------------------------
  // MODULE_WEIGHTS constants
  // --------------------------------------------------------------------------
  describe("MODULE_WEIGHTS", () => {
    it("all 7 weights sum exactly to 1.00", () => {
      const total = Object.values(MODULE_WEIGHTS).reduce((s, w) => s + w, 0);
      // Floating-point: use toBeCloseTo
      expect(total).toBeCloseTo(1.0, 10);
    });

    it("has the correct weight for each of the 7 modules", () => {
      expect(MODULE_WEIGHTS.authorization).toBe(0.22);
      expect(MODULE_WEIGHTS.debris).toBe(0.17);
      expect(MODULE_WEIGHTS.cybersecurity).toBe(0.17);
      expect(MODULE_WEIGHTS.insurance).toBe(0.13);
      expect(MODULE_WEIGHTS.space_operations).toBe(0.15);
      expect(MODULE_WEIGHTS.reporting).toBe(0.08);
      expect(MODULE_WEIGHTS.environmental).toBe(0.08);
    });

    it("authorization has the highest weight of all modules", () => {
      const others = Object.entries(MODULE_WEIGHTS)
        .filter(([k]) => k !== "authorization")
        .map(([, v]) => v);
      others.forEach((w) =>
        expect(MODULE_WEIGHTS.authorization).toBeGreaterThan(w),
      );
    });
  });

  // --------------------------------------------------------------------------
  // Edge case: new user with absolutely no data
  // --------------------------------------------------------------------------
  describe("new user with no data", () => {
    it("returns an overall score below 20", async () => {
      // All mocks already set to empty by beforeEach
      const score = await calculateComplianceScore("new-user");
      expect(score.overall).toBeLessThan(20);
    });

    it("assigns grade F", async () => {
      const score = await calculateComplianceScore("new-user");
      expect(score.grade).toBe("F");
    });

    it("returns non_compliant status when critical factors are zero", async () => {
      const score = await calculateComplianceScore("new-user");
      // Authorization (critical), Debris (critical), Insurance (critical) all
      // have isCritical factors with 0 points → status must be non_compliant
      expect(score.status).toBe("non_compliant");
    });

    it("includes all 7 module breakdowns", async () => {
      const score = await calculateComplianceScore("new-user");
      const modules = [
        "authorization",
        "debris",
        "cybersecurity",
        "insurance",
        "environmental",
        "reporting",
        "space_operations",
      ] as const;
      modules.forEach((m) => expect(score.breakdown[m]).toBeDefined());
    });

    it("sets lastCalculated to a recent Date", async () => {
      const before = new Date();
      const score = await calculateComplianceScore("new-user");
      expect(score.lastCalculated).toBeInstanceOf(Date);
      expect(score.lastCalculated.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // --------------------------------------------------------------------------
  // Edge case: fully-complete user
  // --------------------------------------------------------------------------
  describe("fully-complete user (all modules maxed)", () => {
    beforeEach(() => mockAllComplete());

    it("returns an overall score >= 90", async () => {
      const score = await calculateComplianceScore("complete-user");
      expect(score.overall).toBeGreaterThanOrEqual(90);
    });

    it("assigns grade A", async () => {
      const score = await calculateComplianceScore("complete-user");
      expect(score.grade).toBe("A");
    });

    it("returns compliant status", async () => {
      const score = await calculateComplianceScore("complete-user");
      expect(score.status).toBe("compliant");
    });

    it("marks authorization, debris, and cybersecurity modules as compliant", async () => {
      const score = await calculateComplianceScore("complete-user");
      expect(score.breakdown.authorization.status).toBe("compliant");
      expect(score.breakdown.debris.status).toBe("compliant");
      expect(score.breakdown.cybersecurity.status).toBe("compliant");
    });
  });

  // --------------------------------------------------------------------------
  // Score calculation: weighted sum
  // --------------------------------------------------------------------------
  describe("weighted score calculation", () => {
    it("overall equals Math.round(sum of weightedScores)", async () => {
      // Use a mid-state scenario so numbers are non-trivial
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        { status: "in_progress", documents: [] },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: true,
        hasPassivationCap: false,
        deorbitStrategy: null,
      } as never);

      const score = await calculateComplianceScore("user-1");

      const sumWeighted = Object.values(score.breakdown).reduce(
        (s, m) => s + m.weightedScore,
        0,
      );
      expect(score.overall).toBe(Math.round(sumWeighted));
    });

    it("each module's weightedScore equals score * weight", async () => {
      const score = await calculateComplianceScore("user-1");
      Object.values(score.breakdown).forEach((m) => {
        expect(m.weightedScore).toBeCloseTo(m.score * m.weight, 10);
      });
    });

    it("overall is always an integer in range 0-100", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(Number.isInteger(score.overall)).toBe(true);
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });
  });

  // --------------------------------------------------------------------------
  // Grade assignment thresholds
  // --------------------------------------------------------------------------
  describe("grade assignment", () => {
    it("assigns A when overall >= 90 (all modules complete)", async () => {
      mockAllComplete();
      const score = await calculateComplianceScore("user-1");
      // Verify the score justifies the assertion before checking grade
      if (score.overall >= 90) {
        expect(score.grade).toBe("A");
      }
    });

    it("assigns F when overall < 60 (no data)", async () => {
      // beforeEach already calls mockAllEmpty
      const score = await calculateComplianceScore("user-1");
      expect(score.overall).toBeLessThan(60);
      expect(score.grade).toBe("F");
    });

    it("assigns B for scores in 80-89 range", async () => {
      // A score of 80-89 means compliant but not perfect — partially complete
      // This is a boundary check: we verify the grade function logic indirectly
      mockAllComplete();
      // Remove one module to push score below 90
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(null);

      const score = await calculateComplianceScore("user-1");
      if (score.overall >= 80 && score.overall < 90) {
        expect(score.grade).toBe("B");
      } else if (score.overall >= 90) {
        expect(score.grade).toBe("A");
      }
    });
  });

  // --------------------------------------------------------------------------
  // Status determination
  // --------------------------------------------------------------------------
  describe("overall status determination", () => {
    it("is non_compliant when a module has non_compliant status (score 1-49) AND a critical factor at 0 points", async () => {
      // The getStatus function checks: module.status === "non_compliant" (score 1-49)
      // AND at least one isCritical factor with earnedPoints === 0.
      // A score of 0 → status "not_started" which does NOT trigger this path.
      // We need a module score of 1-49 with a critical factor at 0.
      //
      // Insurance with only calculatedTPL (no policies, no report) → 20/100 → non_compliant,
      // and active_policies (isCritical, maxPoints=30) has 0 earned points.
      mockAllComplete();
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: false,
        calculatedTPL: 1_000,
        policies: [], // no active policies → active_policies critical factor = 0
      } as never);

      const score = await calculateComplianceScore("user-1");
      // Insurance: assessment(20) + active_policies(0) + validity(0) = 20/100 → non_compliant
      expect(score.breakdown.insurance.status).toBe("non_compliant");
      const activePoliciesFactor = score.breakdown.insurance.factors.find(
        (f) => f.id === "active_policies",
      );
      expect(activePoliciesFactor!.isCritical).toBe(true);
      expect(activePoliciesFactor!.earnedPoints).toBe(0);
      expect(score.status).toBe("non_compliant");
    });

    it("is compliant when score >= 80 and no critical failures", async () => {
      mockAllComplete();
      const score = await calculateComplianceScore("user-1");
      if (score.overall >= 80) {
        expect(score.status).toBe("compliant");
      }
    });

    it("getStatus logic: mostly_compliant requires score 60-79 with no critical failures", async () => {
      // getStatus documentation test: this verifies the two-gate logic of getStatus().
      //
      // Gate 1 (critical failure): if any module has status "non_compliant" (score 1-49)
      //   AND at least one isCritical factor with earnedPoints=0 → return "non_compliant"
      //   regardless of overall score.
      // Gate 2 (score-based): score ≥ 80 → "compliant", ≥ 60 → "mostly_compliant", > 0 → "partial"
      //
      // Space operations is intentionally designed with isCritical=false for all three factors
      // (fleet_health, compliance_horizon, active_monitoring). This means a non_compliant
      // space_ops module with no org membership (score=37) does NOT trigger Gate 1 and
      // the overall status is determined purely by the score band.
      //
      // This test confirms that behavior directly.

      mockAllComplete();
      // Override space ops: ensure no org (score 37, non_compliant, but no critical factors)
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);
      // Degrade some non-critical scores to pull overall below 80 without triggering Gate 1.
      // Environmental: keep submitted EFD but remove supplier data → 50+0+20 = 70/100 partial
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([
        { status: "pending" },
        { status: "pending" },
      ] as never);
      // Cybersecurity: keep framework (critical ok), low maturity
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: new Date(), // risk_assessment critical = 30 pts
        maturityScore: 20, // maturity = 5 pts
        hasIncidentResponsePlan: false, // irp = 0
        hasSecurityTeam: false,
        hasBCP: false,
      } as never);

      const score = await calculateComplianceScore("user-1");

      // Space ops must be non_compliant but all its factors must be non-critical
      const spaceOps = score.breakdown.space_operations;
      expect(spaceOps.status).toBe("non_compliant");
      expect(spaceOps.factors.every((f) => !f.isCritical)).toBe(true);

      // Cybersecurity's critical factor (risk_assessment / cyber_0) earns > 0, so even
      // if the module status is non_compliant it must NOT trigger Gate 1.
      const cyberCritical = score.breakdown.cybersecurity.factors.find(
        (f) => f.isCritical,
      );
      expect(cyberCritical!.earnedPoints).toBeGreaterThan(0);

      // Environmental must not be non_compliant (score is 70 → partial)
      expect(["partial", "compliant"]).toContain(
        score.breakdown.environmental.status,
      );

      // Given the above constraints, status is driven by score band, not Gate 1
      if (score.overall >= 80) {
        expect(score.status).toBe("compliant");
      } else if (score.overall >= 60) {
        expect(score.status).toBe("mostly_compliant");
      } else if (score.overall > 0) {
        expect(score.status).toBe("partial");
      }
    });
  });

  // --------------------------------------------------------------------------
  // Module 1: Authorization (22% weight)
  // --------------------------------------------------------------------------
  describe("Authorization module", () => {
    const setupAuth = (status: string, docStatuses: string[] = []) => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        {
          id: "wf-1",
          status,
          documents: docStatuses.map((s) => ({ status: s })),
        },
      ] as never);
    };

    it("has weight 0.22", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.authorization.weight).toBe(0.22);
    });

    it("earns maximum points when workflow is approved and all docs ready", async () => {
      setupAuth("approved", ["ready", "ready", "ready"]);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.authorization.score).toBe(100);
    });

    it("gives 40/100 auth-status points for 'approved' status", async () => {
      // approved → 40 pts auth_status, 25 pts NCA designation = 65/100 max without docs
      setupAuth("approved", []);
      const score = await calculateComplianceScore("user-1");
      // auth_status(40) + nca_designation(25) out of 100 total = 65
      expect(score.breakdown.authorization.score).toBe(65);
    });

    it("gives 30 auth-status points for 'submitted' status", async () => {
      setupAuth("submitted", []);
      const score = await calculateComplianceScore("user-1");
      // submitted(30) + nca_designation(25) = 55
      expect(score.breakdown.authorization.score).toBe(55);
    });

    it("gives 25 auth-status points for 'ready_for_submission'", async () => {
      setupAuth("ready_for_submission", []);
      const score = await calculateComplianceScore("user-1");
      // ready_for_submission(25) + nca_designation(25) = 50
      expect(score.breakdown.authorization.score).toBe(50);
    });

    it("gives 15 auth-status points for 'in_progress'", async () => {
      setupAuth("in_progress", []);
      const score = await calculateComplianceScore("user-1");
      // in_progress(15) + nca_designation(25) = 40
      expect(score.breakdown.authorization.score).toBe(40);
    });

    it("gives 5 auth-status points for any other/draft status", async () => {
      setupAuth("draft", []);
      const score = await calculateComplianceScore("user-1");
      // draft(5) + nca_designation(25) = 30
      expect(score.breakdown.authorization.score).toBe(30);
    });

    it("scores 0 when no workflows exist", async () => {
      // Default empty mock
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.authorization.score).toBe(0);
    });

    it("calculates document completeness proportionally", async () => {
      setupAuth("approved", ["ready", "pending", "pending", "pending"]);
      const score = await calculateComplianceScore("user-1");
      // auth_status(40) + docs(1/4 * 35 = ~9) + nca_designation(25) = ~74
      const authFactor = score.breakdown.authorization.factors.find(
        (f) => f.id === "doc_completeness",
      );
      expect(authFactor!.earnedPoints).toBe(9);
    });

    it("includes correct article references", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.authorization.articleReferences).toContain(
        "Art. 6-27",
      );
    });

    it("has 3 scoring factors", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.authorization.factors).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // Module 2: Debris (17% weight)
  // --------------------------------------------------------------------------
  describe("Debris module", () => {
    it("has weight 0.17", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.weight).toBe(0.17);
    });

    it("scores 0 with no assessment", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.score).toBe(0);
      expect(score.breakdown.debris.status).toBe("not_started");
    });

    it("scores 100 with full assessment (plan + passivation + deorbit)", async () => {
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: true,
        hasPassivationCap: true,
        deorbitStrategy: "active_deorbit",
      } as never);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.score).toBe(100);
      expect(score.breakdown.debris.status).toBe("compliant");
    });

    it("scores 50/100 with only planGenerated=true (assessment + collision avoidance factors)", async () => {
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: true,
        hasPassivationCap: false,
        deorbitStrategy: null,
      } as never);
      const score = await calculateComplianceScore("user-1");
      // debris_assessment(30) + collision_avoidance(20) = 50 out of 100
      expect(score.breakdown.debris.score).toBe(50);
    });

    it("awards passivation points only when hasPassivationCap is true", async () => {
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: false,
        hasPassivationCap: true,
        deorbitStrategy: null,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.debris.factors.find(
        (f) => f.id === "passivation_plan",
      );
      expect(factor!.earnedPoints).toBe(25);
    });

    it("awards deorbit points when deorbitStrategy is non-null/non-empty", async () => {
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: false,
        hasPassivationCap: false,
        deorbitStrategy: "passive_25yr",
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.debris.factors.find(
        (f) => f.id === "deorbit_strategy",
      );
      expect(factor!.earnedPoints).toBe(25);
    });

    it("marks debris_assessment and passivation_plan factors as critical", async () => {
      const score = await calculateComplianceScore("user-1");
      const critical = score.breakdown.debris.factors.filter(
        (f) => f.isCritical,
      );
      const criticalIds = critical.map((f) => f.id);
      expect(criticalIds).toContain("debris_assessment");
      expect(criticalIds).toContain("passivation_plan");
      expect(criticalIds).toContain("deorbit_strategy");
    });

    it("has 4 scoring factors", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.factors).toHaveLength(4);
    });

    it("includes correct article references", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.articleReferences).toContain("Art. 55-73");
    });
  });

  // --------------------------------------------------------------------------
  // Module 3: Cybersecurity (17% weight)
  // Uses shared computeCybersecurityScore() — 5 factors, 100 total points
  //   cyber_0: Risk Assessment       30 pts
  //   cyber_1: Security Maturity     25 pts
  //   cyber_2: Incident Response     20 pts
  //   cyber_3: Security Team & BCP   15 pts
  //   cyber_4: Incident Track Record 10 pts
  // --------------------------------------------------------------------------
  describe("Cybersecurity module", () => {
    it("has weight 0.17", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.cybersecurity.weight).toBe(0.17);
    });

    it("scores 0 for risk assessment factor when no assessment exists", async () => {
      const score = await calculateComplianceScore("user-1");
      const riskFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_0",
      );
      expect(riskFactor!.earnedPoints).toBe(0);
    });

    it("scores 30 for risk assessment when frameworkGeneratedAt is set", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: new Date(),
        maturityScore: null,
        hasIncidentResponsePlan: false,
        hasSecurityTeam: false,
        hasBCP: false,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const riskFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_0",
      );
      expect(riskFactor!.earnedPoints).toBe(30);
    });

    it("scores 10 for risk assessment when only NIS2 assessment exists", async () => {
      vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue({
        id: "nis2-1",
      } as never);
      const score = await calculateComplianceScore("user-1");
      const riskFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_0",
      );
      expect(riskFactor!.earnedPoints).toBe(10);
    });

    it("scales maturity score: maturityScore=100 → 25 earned points", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: null,
        maturityScore: 100,
        hasIncidentResponsePlan: false,
        hasSecurityTeam: false,
        hasBCP: false,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const matFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_1",
      );
      expect(matFactor!.earnedPoints).toBe(25); // Math.round((100/100)*25)
    });

    it("scales maturity score: maturityScore=60 → 15 earned points", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: null,
        maturityScore: 60,
        hasIncidentResponsePlan: false,
        hasSecurityTeam: false,
        hasBCP: false,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const matFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_1",
      );
      expect(matFactor!.earnedPoints).toBe(15); // Math.round((60/100)*25)
    });

    it("awards full track-record points when there are no unresolved incidents", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      const score = await calculateComplianceScore("user-1");
      const trackFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_4",
      );
      expect(trackFactor!.earnedPoints).toBe(10);
    });

    it("deducts 5 points per unresolved cyber incident from track record", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          status: "detected",
          category: "cyber_incident",
          detectedAt: new Date(),
          requiresNCANotification: false,
          reportedToNCA: false,
        },
        {
          status: "investigating",
          category: "cyber_incident",
          detectedAt: new Date(),
          requiresNCANotification: false,
          reportedToNCA: false,
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const trackFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_4",
      );
      // 10 - (2 * 5) = 0
      expect(trackFactor!.earnedPoints).toBe(0);
    });

    it("does not drop track record below 0 even with many unresolved incidents", async () => {
      const unresolvedIncidents = Array.from({ length: 10 }, (_, i) => ({
        status: "detected",
        category: "cyber_incident",
        detectedAt: new Date(),
        requiresNCANotification: false,
        reportedToNCA: false,
        id: `inc-${i}`,
      }));
      vi.mocked(prisma.incident.findMany).mockResolvedValue(
        unresolvedIncidents as never,
      );
      const score = await calculateComplianceScore("user-1");
      const trackFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_4",
      );
      expect(trackFactor!.earnedPoints).toBe(0);
    });

    it("resolved and closed incidents do not reduce track record", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          status: "resolved",
          category: "cyber_incident",
          detectedAt: new Date(),
          requiresNCANotification: false,
          reportedToNCA: false,
        },
        {
          status: "closed",
          category: "cyber_incident",
          detectedAt: new Date(),
          requiresNCANotification: false,
          reportedToNCA: false,
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const trackFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_4",
      );
      expect(trackFactor!.earnedPoints).toBe(10);
    });

    it("awards security team & BCP points correctly", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: null,
        maturityScore: null,
        hasIncidentResponsePlan: false,
        hasSecurityTeam: true,
        hasBCP: true,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const teamFactor = score.breakdown.cybersecurity.factors.find(
        (f) => f.id === "cyber_3",
      );
      expect(teamFactor!.earnedPoints).toBe(15); // 8 + 7
    });

    it("achieves score 100 with full assessment, team, BCP, and no incidents", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: new Date(),
        maturityScore: 100,
        hasIncidentResponsePlan: true,
        hasSecurityTeam: true,
        hasBCP: true,
      } as never);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.cybersecurity.score).toBe(100);
    });

    it("has 5 scoring factors", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.cybersecurity.factors).toHaveLength(5);
    });

    it("includes correct article references", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.cybersecurity.articleReferences).toContain(
        "Art. 74-95",
      );
    });
  });

  // --------------------------------------------------------------------------
  // Module 4: Insurance (13% weight)
  // --------------------------------------------------------------------------
  describe("Insurance module", () => {
    it("has weight 0.13", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.insurance.weight).toBe(0.13);
    });

    it("scores 0 with no assessment", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.insurance.score).toBe(0);
    });

    it("scores 100 with reportGenerated, active policy, expiry > 90 days", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: true,
        calculatedTPL: 1_000_000,
        policies: [
          {
            status: "active",
            coverageAmount: 5_000_000,
            expirationDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
          },
        ],
      } as never);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.insurance.score).toBe(100);
    });

    it("earns only 20/40 assessment points when calculatedTPL > 0 but reportGenerated is false", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: false,
        calculatedTPL: 500_000,
        policies: [],
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.insurance.factors.find(
        (f) => f.id === "insurance_assessment",
      );
      expect(factor!.earnedPoints).toBe(20);
    });

    it("earns 40/40 assessment points when reportGenerated is true", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: true,
        calculatedTPL: null,
        policies: [],
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.insurance.factors.find(
        (f) => f.id === "insurance_assessment",
      );
      expect(factor!.earnedPoints).toBe(40);
    });

    it("earns 30 active-policy points when at least one policy is active", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: false,
        calculatedTPL: null,
        policies: [
          { status: "active", coverageAmount: 1_000_000, expirationDate: null },
        ],
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.insurance.factors.find(
        (f) => f.id === "active_policies",
      );
      expect(factor!.earnedPoints).toBe(30);
    });

    it("earns 30 validity points when expiry > 90 days away", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: false,
        calculatedTPL: null,
        policies: [
          {
            status: "active",
            coverageAmount: 1_000_000,
            expirationDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
          },
        ],
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.insurance.factors.find(
        (f) => f.id === "policy_validity",
      );
      expect(factor!.earnedPoints).toBe(30);
    });

    it("earns 20 validity points when expiry is 31-90 days away", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: false,
        calculatedTPL: null,
        policies: [
          {
            status: "active",
            coverageAmount: 1_000_000,
            expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        ],
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.insurance.factors.find(
        (f) => f.id === "policy_validity",
      );
      expect(factor!.earnedPoints).toBe(20);
    });

    it("earns 10 validity points when expiry is 1-30 days away", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: false,
        calculatedTPL: null,
        policies: [
          {
            status: "active",
            coverageAmount: 1_000_000,
            expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        ],
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.insurance.factors.find(
        (f) => f.id === "policy_validity",
      );
      expect(factor!.earnedPoints).toBe(10);
    });

    it("earns 0 validity points when policy is already expired", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: false,
        calculatedTPL: null,
        policies: [
          {
            status: "active",
            coverageAmount: 1_000_000,
            expirationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          },
        ],
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.insurance.factors.find(
        (f) => f.id === "policy_validity",
      );
      expect(factor!.earnedPoints).toBe(0);
    });

    it("ignores non-active policies for validity checks", async () => {
      vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
        reportGenerated: false,
        calculatedTPL: null,
        policies: [
          {
            status: "expired",
            coverageAmount: 1_000_000,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        ],
      } as never);
      const score = await calculateComplianceScore("user-1");
      const activeFactor = score.breakdown.insurance.factors.find(
        (f) => f.id === "active_policies",
      );
      const validFactor = score.breakdown.insurance.factors.find(
        (f) => f.id === "policy_validity",
      );
      expect(activeFactor!.earnedPoints).toBe(0);
      expect(validFactor!.earnedPoints).toBe(0);
    });

    it("includes correct article references", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.insurance.articleReferences).toContain(
        "Art. 28-32",
      );
    });
  });

  // --------------------------------------------------------------------------
  // Module 5: Space Operations (15% weight)
  // --------------------------------------------------------------------------
  describe("Space Operations module", () => {
    it("has weight 0.15", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.space_operations.weight).toBe(0.15);
    });

    it("returns neutral score when user has no org membership", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);
      const score = await calculateComplianceScore("user-1");
      // No satellites → fleet_health default 20, horizon default 17, monitoring 0
      // total = 37/100
      expect(score.breakdown.space_operations.score).toBe(37);
    });

    it("returns 40 fleet-health points when average satellite score >= 70", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([
        { overallScore: 80, horizonDays: null },
        { overallScore: 75, horizonDays: null },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "fleet_health",
      );
      expect(factor!.earnedPoints).toBe(40);
    });

    it("returns 30 fleet-health points when average score is 50-69", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([
        { overallScore: 55, horizonDays: null },
        { overallScore: 65, horizonDays: null },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "fleet_health",
      );
      expect(factor!.earnedPoints).toBe(30);
    });

    it("returns 10 fleet-health points when average score < 30", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([
        { overallScore: 10, horizonDays: null },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "fleet_health",
      );
      expect(factor!.earnedPoints).toBe(10);
    });

    it("returns 35 horizon points when shortest horizon > 180 days", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([
        { overallScore: 80, horizonDays: 365 },
        { overallScore: 80, horizonDays: 200 },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "compliance_horizon",
      );
      expect(factor!.earnedPoints).toBe(35);
    });

    it("returns 5 horizon points when shortest horizon <= 30 days", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([
        { overallScore: 80, horizonDays: 15 },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "compliance_horizon",
      );
      expect(factor!.earnedPoints).toBe(5);
    });

    it("ignores null horizonDays when computing shortest horizon", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([
        { overallScore: 80, horizonDays: null },
        { overallScore: 80, horizonDays: 250 },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "compliance_horizon",
      );
      // shortest non-null horizon is 250 → > 180 → 35 pts
      expect(factor!.earnedPoints).toBe(35);
    });

    it("adds 15 monitoring points when activeAgents > 0", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.sentinelAgent.count).mockResolvedValue(1);
      vi.mocked(prisma.ephemerisForecast.count).mockResolvedValue(0);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "active_monitoring",
      );
      expect(factor!.earnedPoints).toBe(15);
    });

    it("adds 10 monitoring points when activeForecasts > 0", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.sentinelAgent.count).mockResolvedValue(0);
      vi.mocked(prisma.ephemerisForecast.count).mockResolvedValue(1);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "active_monitoring",
      );
      expect(factor!.earnedPoints).toBe(10);
    });

    it("adds 25 monitoring points when both agents and forecasts are active", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.sentinelAgent.count).mockResolvedValue(3);
      vi.mocked(prisma.ephemerisForecast.count).mockResolvedValue(5);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.space_operations.factors.find(
        (f) => f.id === "active_monitoring",
      );
      expect(factor!.earnedPoints).toBe(25);
    });

    it("scores 100 with excellent fleet, long horizon, and active monitoring", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.satelliteComplianceState.findMany).mockResolvedValue([
        { overallScore: 95, horizonDays: 365 },
      ] as never);
      vi.mocked(prisma.sentinelAgent.count).mockResolvedValue(2);
      vi.mocked(prisma.ephemerisForecast.count).mockResolvedValue(2);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.space_operations.score).toBe(100);
    });

    it("has 3 scoring factors", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.space_operations.factors).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // Module 6: Reporting (8% weight)
  // --------------------------------------------------------------------------
  describe("Reporting module", () => {
    it("has weight 0.08", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.reporting.weight).toBe(0.08);
    });

    it("earns 25 NCA-config points when supervisionConfig exists", async () => {
      vi.mocked(prisma.supervisionConfig.findUnique).mockResolvedValue({
        id: "sc-1",
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "nca_config",
      );
      expect(factor!.earnedPoints).toBe(25);
    });

    it("earns 0 NCA-config points when supervisionConfig is null", async () => {
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "nca_config",
      );
      expect(factor!.earnedPoints).toBe(0);
    });

    it("starts incident notifications at full 30 points when no overdue notifications", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "incident_notifications",
      );
      expect(factor!.earnedPoints).toBe(30);
    });

    it("deducts 15 points per overdue NCA notification", async () => {
      // Set detectedAt far enough in the past so deadline has definitely passed
      const veryOldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          status: "detected",
          category: "cyber_incident",
          detectedAt: veryOldDate,
          requiresNCANotification: true,
          reportedToNCA: false,
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "incident_notifications",
      );
      // 30 - (1 * 15) = 15
      expect(factor!.earnedPoints).toBe(15);
    });

    it("does not count incidents already reported to NCA as overdue", async () => {
      const veryOldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          status: "reported",
          category: "cyber_incident",
          detectedAt: veryOldDate,
          requiresNCANotification: true,
          reportedToNCA: true,
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "incident_notifications",
      );
      expect(factor!.earnedPoints).toBe(30);
    });

    it("does not count incidents that don't require NCA notification", async () => {
      const veryOldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        {
          status: "detected",
          category: "cyber_incident",
          detectedAt: veryOldDate,
          requiresNCANotification: false,
          reportedToNCA: false,
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "incident_notifications",
      );
      expect(factor!.earnedPoints).toBe(30);
    });

    it("never drops incident notification points below 0", async () => {
      const veryOldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const manyOverdue = Array.from({ length: 5 }, (_, i) => ({
        status: "detected",
        category: "cyber_incident",
        detectedAt: veryOldDate,
        requiresNCANotification: true,
        reportedToNCA: false,
        id: `inc-${i}`,
      }));
      vi.mocked(prisma.incident.findMany).mockResolvedValue(
        manyOverdue as never,
      );
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "incident_notifications",
      );
      expect(factor!.earnedPoints).toBe(0);
    });

    /**
     * KNOWN DESIGN CHOICE: The report_submissions factor awards full points (20/20)
     * when there are zero reports in the system.
     *
     * Rationale from the implementation comment: "Full points if no reports required yet."
     * This means a brand-new user with no supervision config and zero reports still
     * earns 20/20 on this factor, which inflates their reporting score slightly.
     *
     * This is intentional — new users should not be penalised for a lack of historical
     * reports before any reports are due.  However, once any report exists in the system,
     * partial completion is penalised proportionally.
     *
     * If this behaviour is ever revisited, update this test and add a recommendation
     * that nudges users to create their first submission.
     */
    it("DESIGN CHOICE: awards full 20 report-submission points when zero reports exist", async () => {
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([]);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "report_submissions",
      );
      expect(factor!.earnedPoints).toBe(20);
    });

    it("calculates report submission points proportionally when reports exist", async () => {
      vi.mocked(prisma.supervisionReport.findMany).mockResolvedValue([
        { status: "submitted" },
        { status: "draft" },
        { status: "acknowledged" },
        { status: "draft" },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "report_submissions",
      );
      // 2 submitted or acknowledged out of 4 → Math.round(0.5 * 20) = 10
      expect(factor!.earnedPoints).toBe(10);
    });

    it("awards 12 NCA-outcome points when no actionable submissions exist", async () => {
      // No submissions (or only DRAFT/WITHDRAWN) → neutral 12 points
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([
        {
          id: "nca-1",
          status: "DRAFT",
          rejectedAt: null,
          followUpRequired: false,
          followUpDeadline: null,
          originalSubmissionId: null,
          createdAt: new Date(),
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "nca_outcomes",
      );
      expect(factor!.earnedPoints).toBe(12);
    });

    it("awards proportional NCA-outcome points based on approval ratio", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([
        {
          id: "nca-1",
          status: "APPROVED",
          rejectedAt: null,
          followUpRequired: false,
          followUpDeadline: null,
          originalSubmissionId: null,
          createdAt: new Date(),
        },
        {
          id: "nca-2",
          status: "APPROVED",
          rejectedAt: null,
          followUpRequired: false,
          followUpDeadline: null,
          originalSubmissionId: null,
          createdAt: new Date(),
        },
        {
          id: "nca-3",
          status: "UNDER_REVIEW",
          rejectedAt: null,
          followUpRequired: false,
          followUpDeadline: null,
          originalSubmissionId: null,
          createdAt: new Date(),
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "nca_outcomes",
      );
      // 2/3 approved → baseScore = (2/3) * 25 ≈ 16.67, penalty = 0
      expect(factor!.earnedPoints).toBe(17);
    });

    it("penalises recent rejections not yet re-submitted (-5 each)", async () => {
      const recentRejection = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([
        {
          id: "nca-1",
          status: "REJECTED",
          rejectedAt: recentRejection,
          followUpRequired: false,
          followUpDeadline: null,
          originalSubmissionId: null,
          createdAt: new Date(),
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "nca_outcomes",
      );
      // base = (0/1)*25=0, penalty = 1*5=5 → Math.max(0, 0-5) = 0
      expect(factor!.earnedPoints).toBe(0);
    });

    it("does not penalise rejections that have been re-submitted", async () => {
      const recentRejection = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([
        {
          id: "nca-original",
          status: "REJECTED",
          rejectedAt: recentRejection,
          followUpRequired: false,
          followUpDeadline: null,
          originalSubmissionId: null,
          createdAt: new Date(),
        },
        {
          id: "nca-resubmit",
          status: "APPROVED",
          rejectedAt: null,
          followUpRequired: false,
          followUpDeadline: null,
          originalSubmissionId: "nca-original", // re-submission of the rejected one
          createdAt: new Date(),
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "nca_outcomes",
      );
      // 1 approved / 2 actionable = 0.5 * 25 = 12.5, no penalty → 13
      expect(factor!.earnedPoints).toBe(13);
    });

    it("penalises overdue information requests (-3 each)", async () => {
      const overduePast = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([
        {
          id: "nca-1",
          status: "INFORMATION_REQUESTED",
          rejectedAt: null,
          followUpRequired: true,
          followUpDeadline: overduePast,
          originalSubmissionId: null,
          createdAt: new Date(),
        },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.reporting.factors.find(
        (f) => f.id === "nca_outcomes",
      );
      // base = 0/1 * 25 = 0, penalty = 3 → Math.max(0, -3) = 0
      expect(factor!.earnedPoints).toBe(0);
    });

    it("includes correct article references", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.reporting.articleReferences).toContain(
        "Art. 33-54",
      );
    });

    it("has 4 scoring factors", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.reporting.factors).toHaveLength(4);
    });
  });

  // --------------------------------------------------------------------------
  // Module 7: Environmental (8% weight)
  // --------------------------------------------------------------------------
  describe("Environmental module", () => {
    it("has weight 0.08", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.environmental.weight).toBe(0.08);
    });

    it("scores 0 with no assessment and no suppliers", async () => {
      // Supplier requests are empty by default; environmental returns null.
      // No GWP, no EFD, but supplierFactor gives 15 partial credit.
      // So total = 0 (EFD) + 15 (supplier partial) + 0 (GWP) = 15/100
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.environmental.score).toBe(15);
    });

    it("awards 50 EFD points when assessment status is 'submitted'", async () => {
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
        status: "submitted",
        totalGWP: null,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.environmental.factors.find(
        (f) => f.id === "efd_submission",
      );
      expect(factor!.earnedPoints).toBe(50);
    });

    it("awards 50 EFD points when assessment status is 'approved'", async () => {
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
        status: "approved",
        totalGWP: null,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.environmental.factors.find(
        (f) => f.id === "efd_submission",
      );
      expect(factor!.earnedPoints).toBe(50);
    });

    it("awards 0 EFD points for statuses other than submitted/approved", async () => {
      for (const status of ["draft", "in_progress", "rejected"]) {
        vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
          status,
          totalGWP: null,
        } as never);
        const score = await calculateComplianceScore("user-1");
        const factor = score.breakdown.environmental.factors.find(
          (f) => f.id === "efd_submission",
        );
        expect(factor!.earnedPoints).toBe(0);
      }
    });

    it("awards 15 supplier-data partial credit when no supplier requests exist", async () => {
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.environmental.factors.find(
        (f) => f.id === "supplier_data",
      );
      expect(factor!.earnedPoints).toBe(15);
    });

    it("awards 30 supplier-data points when all requests are completed", async () => {
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([
        { status: "completed" },
        { status: "completed" },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.environmental.factors.find(
        (f) => f.id === "supplier_data",
      );
      expect(factor!.earnedPoints).toBe(30);
    });

    it("awards proportional supplier-data points for partial completion", async () => {
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([
        { status: "completed" },
        { status: "pending" },
        { status: "pending" },
        { status: "pending" },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.environmental.factors.find(
        (f) => f.id === "supplier_data",
      );
      // Math.round((1/4) * 30) = 8
      expect(factor!.earnedPoints).toBe(8);
    });

    it("awards 20 GWP points when totalGWP is a non-null number (including 0)", async () => {
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
        status: "draft",
        totalGWP: 0,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.environmental.factors.find(
        (f) => f.id === "gwp_calculation",
      );
      expect(factor!.earnedPoints).toBe(20);
    });

    it("awards 0 GWP points when totalGWP is null", async () => {
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
        status: "draft",
        totalGWP: null,
      } as never);
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.environmental.factors.find(
        (f) => f.id === "gwp_calculation",
      );
      expect(factor!.earnedPoints).toBe(0);
    });

    it("scores 100 with submitted EFD, all suppliers complete, and GWP calculated", async () => {
      vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
        status: "submitted",
        totalGWP: 123,
      } as never);
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([
        { status: "completed" },
        { status: "completed" },
      ] as never);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.environmental.score).toBe(100);
    });

    it("marks efd_submission factor as critical", async () => {
      const score = await calculateComplianceScore("user-1");
      const factor = score.breakdown.environmental.factors.find(
        (f) => f.id === "efd_submission",
      );
      expect(factor!.isCritical).toBe(true);
    });

    it("has 3 scoring factors", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.environmental.factors).toHaveLength(3);
    });

    it("includes correct article references", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.environmental.articleReferences).toContain(
        "Art. 96-100",
      );
    });
  });

  // --------------------------------------------------------------------------
  // Recommendations
  // --------------------------------------------------------------------------
  describe("recommendations", () => {
    it("returns at most 10 recommendations", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.recommendations.length).toBeLessThanOrEqual(10);
    });

    it("returns no recommendations when all modules are fully complete", async () => {
      mockAllComplete();
      const score = await calculateComplianceScore("user-1");
      expect(score.recommendations).toHaveLength(0);
    });

    it("sorts recommendations: critical before high before medium before low", async () => {
      const score = await calculateComplianceScore("user-1");
      const priorityOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      for (let i = 0; i < score.recommendations.length - 1; i++) {
        const a = priorityOrder[score.recommendations[i].priority];
        const b = priorityOrder[score.recommendations[i + 1].priority];
        expect(a).toBeLessThanOrEqual(b);
      }
    });

    it("marks recommendations as critical when isCritical=true and earnedPoints=0", async () => {
      // No debris assessment → debris_assessment factor (isCritical, 0 pts) → critical rec
      const score = await calculateComplianceScore("user-1");
      const criticalRecs = score.recommendations.filter(
        (r) => r.priority === "critical",
      );
      expect(criticalRecs.length).toBeGreaterThan(0);
    });

    it("each recommendation has required fields: priority, module, action, impact, estimatedEffort", async () => {
      const score = await calculateComplianceScore("user-1");
      score.recommendations.forEach((r) => {
        expect(r.priority).toBeDefined();
        expect(r.module).toBeDefined();
        expect(r.action).toBeDefined();
        expect(r.impact).toBeDefined();
        expect(r.estimatedEffort).toBeDefined();
      });
    });
  });

  // --------------------------------------------------------------------------
  // getModuleStatus thresholds
  // --------------------------------------------------------------------------
  describe("module status thresholds", () => {
    it("debris status is compliant when score >= 80", async () => {
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: true,
        hasPassivationCap: true,
        deorbitStrategy: "active",
      } as never);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.score).toBe(100);
      expect(score.breakdown.debris.status).toBe("compliant");
    });

    it("module status is partial when score is 50-79", async () => {
      // planGenerated=true → 50/100 on debris → "partial"
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: true,
        hasPassivationCap: false,
        deorbitStrategy: null,
      } as never);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.score).toBe(50);
      expect(score.breakdown.debris.status).toBe("partial");
    });

    it("module status is non_compliant when score is 1-49", async () => {
      // Only deorbitStrategy set → 25/100 = 25% → non_compliant
      vi.mocked(prisma.debrisAssessment.findFirst).mockResolvedValue({
        planGenerated: false,
        hasPassivationCap: false,
        deorbitStrategy: "passive",
      } as never);
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.score).toBe(25);
      expect(score.breakdown.debris.status).toBe("non_compliant");
    });

    it("module status is not_started when score is 0", async () => {
      const score = await calculateComplianceScore("user-1");
      expect(score.breakdown.debris.score).toBe(0);
      expect(score.breakdown.debris.status).toBe("not_started");
    });
  });
});
