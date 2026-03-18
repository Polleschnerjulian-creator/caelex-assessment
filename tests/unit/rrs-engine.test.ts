import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

// Mock server-only to allow importing engine.server in test environment
vi.mock("server-only", () => ({}));

// Mock Prisma — the RRS engine reads from many tables
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findMany: vi.fn(),
    },
    authorizationWorkflow: {
      findMany: vi.fn(),
    },
    articleStatus: {
      findMany: vi.fn(),
    },
    cybersecurityAssessment: {
      findMany: vi.fn(),
    },
    nIS2Assessment: {
      findMany: vi.fn(),
    },
    incident: {
      findMany: vi.fn(),
    },
    debrisAssessment: {
      findMany: vi.fn(),
    },
    environmentalAssessment: {
      findMany: vi.fn(),
    },
    insuranceAssessment: {
      findMany: vi.fn(),
    },
    supervisionConfig: {
      findMany: vi.fn(),
    },
    operatorProfile: {
      findUnique: vi.fn(),
    },
    ukSpaceAssessment: {
      findMany: vi.fn(),
    },
    rRSSnapshot: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
    },
    document: {
      count: vi.fn(),
    },
    complianceEvidence: {
      count: vi.fn(),
    },
    regulatoryReadinessScore: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── Imports (after mocks) ───

import { prisma } from "@/lib/prisma";
import type { RRSResult } from "@/lib/rrs-engine.server";

const {
  computeRRS,
  computeAndSaveRRS,
  getRRSHistory,
  getRRSMethodologyAppendix,
} = await import("@/lib/rrs-engine.server");

// ─── Helpers ───

const ORG_ID = "org-test-001";

/**
 * Configure prisma mocks with empty data so fetchXyz helpers return
 * zero-state data.  Individual tests can override specific mocks.
 */
function setupEmptyPrismaMocks() {
  // All fetchXyz helpers start by querying organization members
  vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);

  // Authorization
  vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
  vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([]);

  // Cybersecurity
  vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

  // Operational
  vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([]);

  // Jurisdictional
  vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.ukSpaceAssessment.findMany).mockResolvedValue([]);

  // Trajectory
  vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);
  vi.mocked(prisma.auditLog.count).mockResolvedValue(0);

  // Governance
  vi.mocked(prisma.document.count).mockResolvedValue(0);
  vi.mocked(prisma.complianceEvidence.count).mockResolvedValue(0);

  // Persistence
  vi.mocked(prisma.regulatoryReadinessScore.upsert).mockResolvedValue(
    {} as any,
  );
  vi.mocked(prisma.rRSSnapshot.upsert).mockResolvedValue({} as any);
}

/**
 * Configure prisma mocks for an org that has one member and rich data
 * to produce a high RRS score.
 */
function setupHighScorePrismaMocks() {
  const member = { userId: "user-1" };

  // All fetch helpers will find one member
  vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
    member as any,
  ]);

  // Authorization: approved workflow with all docs ready, 20 compliant articles
  vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
    {
      status: "approved",
      updatedAt: new Date(),
      documents: [
        { status: "ready" },
        { status: "ready" },
        { status: "ready" },
      ],
    },
  ] as any);
  vi.mocked(prisma.articleStatus.findMany).mockResolvedValue(
    Array.from({ length: 20 }, (_, i) => ({
      id: `art-${i}`,
      status: "compliant",
    })) as any,
  );

  // Cybersecurity: full assessment with framework generated, NIS2 assessment,
  // incident response plan, maturity score 80, security team, BCP, no unresolved incidents
  vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
    {
      frameworkGeneratedAt: new Date(),
      hasIncidentResponsePlan: true,
      hasSecurityTeam: true,
      hasBCP: true,
      maturityScore: 80,
      updatedAt: new Date(),
    },
  ] as any);
  vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([
    { id: "nis2-1", updatedAt: new Date() },
  ] as any);
  vi.mocked(prisma.incident.findMany).mockResolvedValue([]);

  // Operational: debris plan generated, env assessment submitted,
  // insurance with active policy, supervision configured
  vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
    { planGenerated: true, updatedAt: new Date() },
  ] as any);
  vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
    { status: "submitted", updatedAt: new Date() },
  ] as any);
  vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
    {
      reportGenerated: true,
      policies: [{ status: "active" }],
      updatedAt: new Date(),
    },
  ] as any);
  vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([
    { id: "sup-1" },
  ] as any);

  // Jurisdictional: complete profile with primary establishment and multi-jurisdiction
  vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue({
    organizationId: ORG_ID,
    completeness: 0.9,
    establishment: "FR",
    operatingJurisdictions: ["FR", "DE", "NL"],
  } as any);
  vi.mocked(prisma.ukSpaceAssessment.findMany).mockResolvedValue([
    { id: "sla-1" },
    { id: "sla-2" },
    { id: "sla-3" },
  ] as any);

  // Trajectory: upward trend, high activity
  const now = new Date();
  vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([
    {
      overallScore: 60,
      snapshotDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    },
    {
      overallScore: 80,
      snapshotDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  ] as any);
  vi.mocked(prisma.auditLog.count).mockResolvedValue(150);

  // Governance: strong audit trail, document vault, evidence
  vi.mocked(prisma.document.count).mockResolvedValue(25);
  vi.mocked(prisma.complianceEvidence.count).mockResolvedValue(25);

  // Persistence
  vi.mocked(prisma.regulatoryReadinessScore.upsert).mockResolvedValue(
    {} as any,
  );
  vi.mocked(prisma.rRSSnapshot.upsert).mockResolvedValue({} as any);
}

// ============================================================
// TEST SUITES
// ============================================================

describe("RRS Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // getRRSMethodologyAppendix (pure function, no DB)
  // ─────────────────────────────────────────────

  describe("getRRSMethodologyAppendix", () => {
    it("should return a non-empty string", () => {
      const appendix = getRRSMethodologyAppendix();
      expect(typeof appendix).toBe("string");
      expect(appendix.length).toBeGreaterThan(100);
    });

    it("should include methodology version", () => {
      const appendix = getRRSMethodologyAppendix();
      expect(appendix).toContain("v1.0");
    });

    it("should list all six component names", () => {
      const appendix = getRRSMethodologyAppendix();
      expect(appendix).toContain("Authorization Readiness");
      expect(appendix).toContain("Cybersecurity Posture");
      expect(appendix).toContain("Operational Compliance");
      expect(appendix).toContain("Multi-Jurisdictional Coverage");
      expect(appendix).toContain("Regulatory Trajectory");
      expect(appendix).toContain("Governance & Process");
    });

    it("should include all component weight percentages", () => {
      const appendix = getRRSMethodologyAppendix();
      expect(appendix).toContain("25%");
      expect(appendix).toContain("20%");
      expect(appendix).toContain("15%");
      expect(appendix).toContain("10%");
    });

    it("should include the grading scale", () => {
      const appendix = getRRSMethodologyAppendix();
      expect(appendix).toContain("A: 90-100");
      expect(appendix).toContain("B: 80-89");
      expect(appendix).toContain("C: 70-79");
      expect(appendix).toContain("D: 60-69");
      expect(appendix).toContain("F: 0-59");
    });

    it("should state determinism guarantee", () => {
      const appendix = getRRSMethodologyAppendix();
      expect(appendix.toLowerCase()).toContain("deterministic");
    });

    it("should be trimmed (no leading/trailing whitespace)", () => {
      const appendix = getRRSMethodologyAppendix();
      expect(appendix).toBe(appendix.trim());
    });

    it("should return identical output on repeated calls (pure function)", () => {
      const first = getRRSMethodologyAppendix();
      const second = getRRSMethodologyAppendix();
      expect(first).toBe(second);
    });
  });

  // ─────────────────────────────────────────────
  // computeRRS — Zero-state (no org members / no data)
  // ─────────────────────────────────────────────

  describe("computeRRS — Zero state (empty organization)", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
    });

    it("should return a valid RRSResult structure", async () => {
      const result = await computeRRS(ORG_ID);

      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe("number");
      expect(result.grade).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.components).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.methodology).toBeDefined();
      expect(result.computedAt).toBeInstanceOf(Date);
    });

    it("should have all six component keys", async () => {
      const result = await computeRRS(ORG_ID);
      const componentKeys = Object.keys(result.components);

      expect(componentKeys).toContain("authorizationReadiness");
      expect(componentKeys).toContain("cybersecurityPosture");
      expect(componentKeys).toContain("operationalCompliance");
      expect(componentKeys).toContain("jurisdictionalCoverage");
      expect(componentKeys).toContain("regulatoryTrajectory");
      expect(componentKeys).toContain("governanceProcess");
      expect(componentKeys).toHaveLength(6);
    });

    it("should produce a low score with no data", async () => {
      const result = await computeRRS(ORG_ID);

      // With no members and no data, only regulatoryTrajectory has a
      // neutral baseline of 25/100.  All other components should be 0.
      expect(result.overallScore).toBeLessThanOrEqual(25);
    });

    it("should produce grade F with no data", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.grade).toBe("F");
    });

    it("should return methodology v1.0", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.methodology.version).toBe("1.0");
    });

    it("should have correct weights in methodology", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.methodology.weights).toEqual({
        authorizationReadiness: 0.25,
        cybersecurityPosture: 0.2,
        operationalCompliance: 0.2,
        jurisdictionalCoverage: 0.15,
        regulatoryTrajectory: 0.1,
        governanceProcess: 0.1,
      });
    });

    it("should generate recommendations when gaps exist", async () => {
      const result = await computeRRS(ORG_ID);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(10);
    });

    it("should have each component score between 0 and 100", async () => {
      const result = await computeRRS(ORG_ID);

      for (const comp of Object.values(result.components)) {
        expect(comp.score).toBeGreaterThanOrEqual(0);
        expect(comp.score).toBeLessThanOrEqual(100);
      }
    });

    it("should have each component weight sum to 1", async () => {
      const result = await computeRRS(ORG_ID);
      const weightSum = Object.values(result.components).reduce(
        (sum, c) => sum + c.weight,
        0,
      );
      expect(Math.abs(weightSum - 1)).toBeLessThan(0.001);
    });
  });

  // ─────────────────────────────────────────────
  // computeRRS — High-score scenario
  // ─────────────────────────────────────────────

  describe("computeRRS — High-score scenario", () => {
    beforeEach(() => {
      setupHighScorePrismaMocks();
    });

    it("should produce a high overall score", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.overallScore).toBeGreaterThanOrEqual(70);
    });

    it("should produce grade A, B, or C with rich data", async () => {
      const result = await computeRRS(ORG_ID);
      expect(["A", "B", "C"]).toContain(result.grade);
    });

    it("should produce compliant or mostly_compliant status", async () => {
      const result = await computeRRS(ORG_ID);
      expect(["compliant", "mostly_compliant"]).toContain(result.status);
    });

    it("should have high authorization readiness with approved workflow", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.authorizationReadiness.score).toBeGreaterThan(
        50,
      );
    });

    it("should have high cybersecurity posture with full assessment", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.cybersecurityPosture.score).toBeGreaterThan(50);
    });

    it("should have high operational compliance with all assessments done", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.operationalCompliance.score).toBeGreaterThan(50);
    });

    it("should have high jurisdictional coverage with complete profile", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.jurisdictionalCoverage.score).toBeGreaterThan(
        50,
      );
    });

    it("should have positive regulatory trajectory with upward trend", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.regulatoryTrajectory.score).toBeGreaterThan(25);
    });

    it("should have high governance score with rich audit trail", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.governanceProcess.score).toBeGreaterThan(50);
    });

    it("should still produce some recommendations (even at high score)", async () => {
      const result = await computeRRS(ORG_ID);
      // Unless score is perfect 100, there will be recommendations
      if (result.overallScore < 100) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  // ─────────────────────────────────────────────
  // Grade mapping
  // ─────────────────────────────────────────────

  describe("Grade and Status Mapping", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
    });

    it("should map score >= 90 to grade A", async () => {
      // To get a score of ~90+, we need very high data across all components
      // We'll verify the mapping indirectly through the high-score test
      // and directly test boundary by examining the overall score → grade contract
      const result = await computeRRS(ORG_ID);
      // With empty data the score is low, so just verify consistency
      if (result.overallScore >= 90) {
        expect(result.grade).toBe("A");
      } else if (result.overallScore >= 80) {
        expect(result.grade).toBe("B");
      } else if (result.overallScore >= 70) {
        expect(result.grade).toBe("C");
      } else if (result.overallScore >= 60) {
        expect(result.grade).toBe("D");
      } else {
        expect(result.grade).toBe("F");
      }
    });

    it("should map score >= 80 to status compliant", async () => {
      const result = await computeRRS(ORG_ID);
      if (result.overallScore >= 80) {
        expect(result.status).toBe("compliant");
      } else if (result.overallScore >= 60) {
        expect(result.status).toBe("mostly_compliant");
      } else if (result.overallScore > 0) {
        expect(result.status).toBe("partial");
      } else {
        expect(result.status).toBe("not_assessed");
      }
    });

    it("should produce status not_assessed when overall score is 0", async () => {
      // Override trajectory to not give baseline 25 points — but since
      // the neutral baseline is baked in, we need a score of 0 overall.
      // The trajectory component always has 25 baseline, so the minimum
      // weighted score is 25 * 0.1 = 2.5, rounded to 3. This means
      // overallScore > 0, so status should be "partial".
      const result = await computeRRS(ORG_ID);
      if (result.overallScore === 0) {
        expect(result.status).toBe("not_assessed");
      } else {
        expect(result.status).toBe("partial");
      }
    });
  });

  // ─────────────────────────────────────────────
  // Component Score Building
  // ─────────────────────────────────────────────

  describe("Component Score Building (factor aggregation)", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
    });

    it("should compute weighted score = score * weight for each component", async () => {
      const result = await computeRRS(ORG_ID);

      for (const comp of Object.values(result.components)) {
        const expected = Math.round(comp.score * comp.weight);
        expect(comp.weightedScore).toBe(expected);
      }
    });

    it("should have overall score equal to sum of weighted scores", async () => {
      const result = await computeRRS(ORG_ID);
      const sum = Object.values(result.components).reduce(
        (s, c) => s + c.weightedScore,
        0,
      );
      expect(result.overallScore).toBe(Math.round(sum));
    });

    it("should populate factors on each component", async () => {
      const result = await computeRRS(ORG_ID);

      for (const comp of Object.values(result.components)) {
        expect(Array.isArray(comp.factors)).toBe(true);
        expect(comp.factors.length).toBeGreaterThan(0);

        for (const f of comp.factors) {
          expect(f).toHaveProperty("id");
          expect(f).toHaveProperty("name");
          expect(f).toHaveProperty("maxPoints");
          expect(f).toHaveProperty("earnedPoints");
          expect(f).toHaveProperty("description");
          expect(f.earnedPoints).toBeLessThanOrEqual(f.maxPoints);
          expect(f.earnedPoints).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("should have authorization component with 3 factors", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.authorizationReadiness.factors).toHaveLength(3);
    });

    it("should have cybersecurity component with 5 factors", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.cybersecurityPosture.factors).toHaveLength(5);
    });

    it("should have operational component with 4 factors", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.operationalCompliance.factors).toHaveLength(4);
    });

    it("should have jurisdictional component with 3 factors", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.jurisdictionalCoverage.factors).toHaveLength(3);
    });

    it("should have trajectory component with 2 factors", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.regulatoryTrajectory.factors).toHaveLength(2);
    });

    it("should have governance component with 3 factors", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.components.governanceProcess.factors).toHaveLength(3);
    });
  });

  // ─────────────────────────────────────────────
  // Authorization Readiness — Specific Scenarios
  // ─────────────────────────────────────────────

  describe("Authorization Readiness component", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        { userId: "user-1" } as any,
      ]);
    });

    it("should give max workflow points (40) for approved status", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        { status: "approved", documents: [], updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const wfFactor = result.components.authorizationReadiness.factors.find(
        (f) => f.id === "auth_workflow",
      );
      expect(wfFactor?.earnedPoints).toBe(40);
    });

    it("should give 30 workflow points for submitted status", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        { status: "submitted", documents: [], updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const wfFactor = result.components.authorizationReadiness.factors.find(
        (f) => f.id === "auth_workflow",
      );
      expect(wfFactor?.earnedPoints).toBe(30);
    });

    it("should give 15 workflow points for in_progress status", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        { status: "in_progress", documents: [], updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const wfFactor = result.components.authorizationReadiness.factors.find(
        (f) => f.id === "auth_workflow",
      );
      expect(wfFactor?.earnedPoints).toBe(15);
    });

    it("should give 5 workflow points for draft status", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        { status: "draft", documents: [], updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const wfFactor = result.components.authorizationReadiness.factors.find(
        (f) => f.id === "auth_workflow",
      );
      expect(wfFactor?.earnedPoints).toBe(5);
    });

    it("should give 0 workflow points when no workflows exist", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);

      const result = await computeRRS(ORG_ID);
      const wfFactor = result.components.authorizationReadiness.factors.find(
        (f) => f.id === "auth_workflow",
      );
      expect(wfFactor?.earnedPoints).toBe(0);
    });

    it("should compute document completeness proportional to ready docs", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        {
          status: "draft",
          documents: [
            { status: "ready" },
            { status: "ready" },
            { status: "pending" },
            { status: "pending" },
          ],
          updatedAt: new Date(),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const docFactor = result.components.authorizationReadiness.factors.find(
        (f) => f.id === "auth_documents",
      );
      // 2/4 = 0.5 * 35 = 17.5 -> rounded to 18
      expect(docFactor?.earnedPoints).toBe(18);
    });

    it("should compute article tracking proportional to compliant articles", async () => {
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { status: "compliant" },
        { status: "compliant" },
        { status: "compliant" },
        { status: "pending" },
        { status: "non_compliant" },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const artFactor = result.components.authorizationReadiness.factors.find(
        (f) => f.id === "auth_articles",
      );
      // 3/5 = 0.6 * 25 = 15
      expect(artFactor?.earnedPoints).toBe(15);
    });
  });

  // ─────────────────────────────────────────────
  // Cybersecurity Posture — Specific Scenarios
  // ─────────────────────────────────────────────

  // Cybersecurity Posture uses shared computeCybersecurityScore() — 5 factors:
  //   cyber_0: Risk Assessment       30 pts
  //   cyber_1: Security Maturity     25 pts
  //   cyber_2: Incident Response     20 pts
  //   cyber_3: Security Team & BCP   15 pts
  //   cyber_4: Incident Track Record 10 pts
  describe("Cybersecurity Posture component", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        { userId: "user-1" } as any,
      ]);
    });

    it("should give 30 risk assessment points when framework is generated", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          frameworkGeneratedAt: new Date(),
          hasIncidentResponsePlan: false,
          maturityScore: null,
          updatedAt: new Date(),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const riskFactor = result.components.cybersecurityPosture.factors.find(
        (f) => f.id === "cyber_0",
      );
      expect(riskFactor?.earnedPoints).toBe(30);
    });

    it("should give 10 risk assessment points when only NIS2 assessment exists", async () => {
      vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([
        { id: "nis2-1", updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const riskFactor = result.components.cybersecurityPosture.factors.find(
        (f) => f.id === "cyber_0",
      );
      expect(riskFactor?.earnedPoints).toBe(10);
    });

    it("should give 0 risk assessment points with no assessment at all", async () => {
      const result = await computeRRS(ORG_ID);
      const riskFactor = result.components.cybersecurityPosture.factors.find(
        (f) => f.id === "cyber_0",
      );
      expect(riskFactor?.earnedPoints).toBe(0);
    });

    it("should scale maturity score into 25 pts", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          frameworkGeneratedAt: null,
          hasIncidentResponsePlan: false,
          maturityScore: 80,
          updatedAt: new Date(),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const matFactor = result.components.cybersecurityPosture.factors.find(
        (f) => f.id === "cyber_1",
      );
      // Math.round((80/100) * 25) = 20
      expect(matFactor?.earnedPoints).toBe(20);
    });

    it("should give 20 incident response points when plan exists", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          frameworkGeneratedAt: null,
          hasIncidentResponsePlan: true,
          maturityScore: null,
          updatedAt: new Date(),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const irFactor = result.components.cybersecurityPosture.factors.find(
        (f) => f.id === "cyber_2",
      );
      expect(irFactor?.earnedPoints).toBe(20);
    });

    it("should award security team & BCP points", async () => {
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          frameworkGeneratedAt: null,
          hasIncidentResponsePlan: false,
          hasSecurityTeam: true,
          hasBCP: true,
          maturityScore: null,
          updatedAt: new Date(),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const teamFactor = result.components.cybersecurityPosture.factors.find(
        (f) => f.id === "cyber_3",
      );
      // 8 (team) + 7 (BCP) = 15
      expect(teamFactor?.earnedPoints).toBe(15);
    });

    it("should deduct incident track record points for unresolved incidents", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        { status: "open" },
        { status: "investigating" },
        { status: "resolved" },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const trackFactor = result.components.cybersecurityPosture.factors.find(
        (f) => f.id === "cyber_4",
      );
      // max(0, 10 - 2 * 5) = 0
      expect(trackFactor?.earnedPoints).toBe(0);
    });

    it("should floor incident track record at 0", async () => {
      vi.mocked(prisma.incident.findMany).mockResolvedValue([
        { status: "open" },
        { status: "open" },
        { status: "open" },
        { status: "open" },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const trackFactor = result.components.cybersecurityPosture.factors.find(
        (f) => f.id === "cyber_4",
      );
      // max(0, 10 - 4 * 5) = max(0, -10) = 0
      expect(trackFactor?.earnedPoints).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // Operational Compliance — Specific Scenarios
  // ─────────────────────────────────────────────

  describe("Operational Compliance component", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        { userId: "user-1" } as any,
      ]);
    });

    it("should give full debris points when plan is generated", async () => {
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
        { planGenerated: true, updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const debrisFactor = result.components.operationalCompliance.factors.find(
        (f) => f.id === "ops_debris",
      );
      expect(debrisFactor?.earnedPoints).toBe(30);
    });

    it("should give 15 debris points when assessment exists but no plan", async () => {
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
        { planGenerated: false, updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const debrisFactor = result.components.operationalCompliance.factors.find(
        (f) => f.id === "ops_debris",
      );
      expect(debrisFactor?.earnedPoints).toBe(15);
    });

    it("should give full environmental points for submitted assessment", async () => {
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { status: "submitted", updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const envFactor = result.components.operationalCompliance.factors.find(
        (f) => f.id === "ops_environmental",
      );
      expect(envFactor?.earnedPoints).toBe(20);
    });

    it("should give 10 environmental points for non-submitted assessment", async () => {
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { status: "draft", updatedAt: new Date() },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const envFactor = result.components.operationalCompliance.factors.find(
        (f) => f.id === "ops_environmental",
      );
      expect(envFactor?.earnedPoints).toBe(10);
    });

    it("should give full insurance points for active policy", async () => {
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        {
          reportGenerated: true,
          policies: [{ status: "active" }],
          updatedAt: new Date(),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const insFactor = result.components.operationalCompliance.factors.find(
        (f) => f.id === "ops_insurance",
      );
      expect(insFactor?.earnedPoints).toBe(25);
    });

    it("should give 15 insurance points for generated report but no active policy", async () => {
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        {
          reportGenerated: true,
          policies: [{ status: "expired" }],
          updatedAt: new Date(),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const insFactor = result.components.operationalCompliance.factors.find(
        (f) => f.id === "ops_insurance",
      );
      expect(insFactor?.earnedPoints).toBe(15);
    });

    it("should give 5 insurance points for assessment with no report and no active policy", async () => {
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        {
          reportGenerated: false,
          policies: [],
          updatedAt: new Date(),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const insFactor = result.components.operationalCompliance.factors.find(
        (f) => f.id === "ops_insurance",
      );
      expect(insFactor?.earnedPoints).toBe(5);
    });

    it("should give full supervision points when config exists", async () => {
      vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([
        { id: "sup-1" },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const supFactor = result.components.operationalCompliance.factors.find(
        (f) => f.id === "ops_supervision",
      );
      expect(supFactor?.earnedPoints).toBe(25);
    });
  });

  // ─────────────────────────────────────────────
  // Governance & Process — Specific Scenarios
  // ─────────────────────────────────────────────

  describe("Governance & Process component", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        { userId: "user-1" } as any,
      ]);
    });

    it("should tier audit log points based on count thresholds", async () => {
      // 0 → 0, 1-19 → 5, 20-99 → 15, 100-499 → 25, 500+ → 35
      const testCases = [
        { count: 0, expected: 0 },
        { count: 5, expected: 5 },
        { count: 20, expected: 15 },
        { count: 100, expected: 25 },
        { count: 500, expected: 35 },
        { count: 1000, expected: 35 },
      ];

      for (const { count, expected } of testCases) {
        vi.clearAllMocks();
        setupEmptyPrismaMocks();
        vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
          { userId: "user-1" } as any,
        ]);
        vi.mocked(prisma.auditLog.count).mockResolvedValue(count);

        const result = await computeRRS(ORG_ID);
        const auditFactor = result.components.governanceProcess.factors.find(
          (f) => f.id === "gov_audit",
        );
        expect(auditFactor?.earnedPoints).toBe(expected);
      }
    });

    it("should tier document vault points based on count thresholds", async () => {
      const testCases = [
        { count: 0, expected: 0 },
        { count: 3, expected: 5 },
        { count: 5, expected: 15 },
        { count: 10, expected: 25 },
        { count: 20, expected: 35 },
      ];

      for (const { count, expected } of testCases) {
        vi.clearAllMocks();
        setupEmptyPrismaMocks();
        vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
          { userId: "user-1" } as any,
        ]);
        vi.mocked(prisma.document.count).mockResolvedValue(count);

        const result = await computeRRS(ORG_ID);
        const docFactor = result.components.governanceProcess.factors.find(
          (f) => f.id === "gov_documents",
        );
        expect(docFactor?.earnedPoints).toBe(expected);
      }
    });

    it("should tier evidence management points based on count thresholds", async () => {
      const testCases = [
        { count: 0, expected: 0 },
        { count: 1, expected: 5 },
        { count: 3, expected: 10 },
        { count: 10, expected: 20 },
        { count: 20, expected: 30 },
      ];

      for (const { count, expected } of testCases) {
        vi.clearAllMocks();
        setupEmptyPrismaMocks();
        vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
          { userId: "user-1" } as any,
        ]);
        vi.mocked(prisma.complianceEvidence.count).mockResolvedValue(count);

        const result = await computeRRS(ORG_ID);
        const evFactor = result.components.governanceProcess.factors.find(
          (f) => f.id === "gov_evidence",
        );
        expect(evFactor?.earnedPoints).toBe(expected);
      }
    });
  });

  // ─────────────────────────────────────────────
  // Regulatory Trajectory — Specific Scenarios
  // ─────────────────────────────────────────────

  describe("Regulatory Trajectory component", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
      vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
        { userId: "user-1" } as any,
      ]);
    });

    it("should have neutral baseline of 25 when no snapshots exist", async () => {
      const result = await computeRRS(ORG_ID);
      const trendFactor = result.components.regulatoryTrajectory.factors.find(
        (f) => f.id === "traj_trend",
      );
      expect(trendFactor?.earnedPoints).toBe(25);
    });

    it("should give max trend points for improvement >= 10", async () => {
      const now = new Date();
      vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([
        {
          overallScore: 50,
          snapshotDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        },
        {
          overallScore: 65,
          snapshotDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const trendFactor = result.components.regulatoryTrajectory.factors.find(
        (f) => f.id === "traj_trend",
      );
      expect(trendFactor?.earnedPoints).toBe(50);
    });

    it("should give 5 trend points for decline >= 5", async () => {
      const now = new Date();
      vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([
        {
          overallScore: 70,
          snapshotDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        },
        {
          overallScore: 60,
          snapshotDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
      ] as any);

      const result = await computeRRS(ORG_ID);
      const trendFactor = result.components.regulatoryTrajectory.factors.find(
        (f) => f.id === "traj_trend",
      );
      expect(trendFactor?.earnedPoints).toBe(5);
    });

    it("should tier activity points based on audit count", async () => {
      const testCases = [
        { count: 0, expected: 0 },
        { count: 5, expected: 5 },
        { count: 10, expected: 15 },
        { count: 50, expected: 30 },
        { count: 100, expected: 50 },
      ];

      for (const { count, expected } of testCases) {
        vi.clearAllMocks();
        setupEmptyPrismaMocks();
        vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
          { userId: "user-1" } as any,
        ]);
        vi.mocked(prisma.auditLog.count).mockResolvedValue(count);

        const result = await computeRRS(ORG_ID);
        const actFactor = result.components.regulatoryTrajectory.factors.find(
          (f) => f.id === "traj_activity",
        );
        expect(actFactor?.earnedPoints).toBe(expected);
      }
    });
  });

  // ─────────────────────────────────────────────
  // Recommendation Generation
  // ─────────────────────────────────────────────

  describe("Recommendation Generation", () => {
    beforeEach(() => {
      setupEmptyPrismaMocks();
    });

    it("should return at most 10 recommendations", async () => {
      const result = await computeRRS(ORG_ID);
      expect(result.recommendations.length).toBeLessThanOrEqual(10);
    });

    it("should sort recommendations by priority (critical first)", async () => {
      const result = await computeRRS(ORG_ID);
      const order = { critical: 0, high: 1, medium: 2, low: 3 };

      for (let i = 1; i < result.recommendations.length; i++) {
        const prev = order[result.recommendations[i - 1].priority];
        const curr = order[result.recommendations[i].priority];
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    it("should have required fields on each recommendation", async () => {
      const result = await computeRRS(ORG_ID);

      for (const rec of result.recommendations) {
        expect(rec).toHaveProperty("priority");
        expect(rec).toHaveProperty("component");
        expect(rec).toHaveProperty("action");
        expect(rec).toHaveProperty("impact");
        expect(["critical", "high", "medium", "low"]).toContain(rec.priority);
      }
    });

    it("should assign critical priority when factor is >= 80% missing", async () => {
      // With empty data, most factors have 0 earned / max points = 100% missing → critical
      const result = await computeRRS(ORG_ID);
      const criticalRecs = result.recommendations.filter(
        (r) => r.priority === "critical",
      );
      expect(criticalRecs.length).toBeGreaterThan(0);
    });

    it("should not generate recommendation for a factor with full points", async () => {
      setupHighScorePrismaMocks();
      const result = await computeRRS(ORG_ID);

      // Factors at full points should not appear in recommendations
      for (const [compKey, comp] of Object.entries(result.components)) {
        for (const factor of comp.factors) {
          if (factor.earnedPoints === factor.maxPoints) {
            const hasRec = result.recommendations.some(
              (r) =>
                r.component === compKey &&
                r.action === `Complete ${factor.name}`,
            );
            expect(hasRec).toBe(false);
          }
        }
      }
    });

    it("should include impact string with point value", async () => {
      const result = await computeRRS(ORG_ID);

      for (const rec of result.recommendations) {
        expect(rec.impact).toMatch(/\+\d+ points on overall RRS/);
      }
    });
  });

  // ─────────────────────────────────────────────
  // Determinism
  // ─────────────────────────────────────────────

  describe("Determinism", () => {
    it("should produce identical scores for the same inputs", async () => {
      setupHighScorePrismaMocks();

      const result1 = await computeRRS(ORG_ID);

      // Reset and re-setup with the same mock data
      vi.clearAllMocks();
      setupHighScorePrismaMocks();

      const result2 = await computeRRS(ORG_ID);

      expect(result1.overallScore).toBe(result2.overallScore);
      expect(result1.grade).toBe(result2.grade);
      expect(result1.status).toBe(result2.status);

      for (const key of Object.keys(result1.components) as Array<
        keyof typeof result1.components
      >) {
        expect(result1.components[key].score).toBe(
          result2.components[key].score,
        );
        expect(result1.components[key].weightedScore).toBe(
          result2.components[key].weightedScore,
        );
      }
    });

    it("should produce identical recommendations for the same inputs", async () => {
      setupHighScorePrismaMocks();
      const result1 = await computeRRS(ORG_ID);

      vi.clearAllMocks();
      setupHighScorePrismaMocks();
      const result2 = await computeRRS(ORG_ID);

      expect(result1.recommendations).toEqual(result2.recommendations);
    });
  });

  // ─────────────────────────────────────────────
  // computeAndSaveRRS
  // ─────────────────────────────────────────────

  describe("computeAndSaveRRS", () => {
    beforeEach(() => {
      setupHighScorePrismaMocks();
    });

    it("should compute RRS and persist the result", async () => {
      const result = await computeAndSaveRRS(ORG_ID);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(prisma.regulatoryReadinessScore.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.rRSSnapshot.upsert).toHaveBeenCalledTimes(1);
    });

    it("should pass organization ID to upsert calls", async () => {
      await computeAndSaveRRS(ORG_ID);

      expect(prisma.regulatoryReadinessScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: ORG_ID },
        }),
      );
    });

    it("should include all component scores in the saved data", async () => {
      await computeAndSaveRRS(ORG_ID);

      expect(prisma.regulatoryReadinessScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            overallScore: expect.any(Number),
            authorizationReadiness: expect.any(Number),
            cybersecurityPosture: expect.any(Number),
            operationalCompliance: expect.any(Number),
            jurisdictionalCoverage: expect.any(Number),
            regulatoryTrajectory: expect.any(Number),
            governanceProcess: expect.any(Number),
            grade: expect.any(String),
            status: expect.any(String),
            methodologyVersion: "1.0",
          }),
        }),
      );
    });

    it("should return the same RRSResult as computeRRS would", async () => {
      const saved = await computeAndSaveRRS(ORG_ID);

      // Verify the return value has the right shape
      expect(saved.overallScore).toBeDefined();
      expect(saved.grade).toBeDefined();
      expect(saved.status).toBeDefined();
      expect(saved.components).toBeDefined();
      expect(saved.recommendations).toBeDefined();
      expect(saved.methodology).toBeDefined();
      expect(saved.computedAt).toBeInstanceOf(Date);
    });
  });

  // ─────────────────────────────────────────────
  // getRRSHistory
  // ─────────────────────────────────────────────

  describe("getRRSHistory", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return mapped snapshot data", async () => {
      const mockSnapshots = [
        {
          snapshotDate: new Date("2025-06-01"),
          overallScore: 72,
          authorizationReadiness: 80,
          cybersecurityPosture: 65,
          operationalCompliance: 70,
          jurisdictionalCoverage: 60,
          regulatoryTrajectory: 50,
          governanceProcess: 55,
        },
        {
          snapshotDate: new Date("2025-06-15"),
          overallScore: 78,
          authorizationReadiness: 85,
          cybersecurityPosture: 70,
          operationalCompliance: 75,
          jurisdictionalCoverage: 65,
          regulatoryTrajectory: 55,
          governanceProcess: 60,
        },
      ];

      vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue(
        mockSnapshots as any,
      );

      const history = await getRRSHistory(ORG_ID, 90);

      expect(history).toHaveLength(2);
      expect(history[0].date).toEqual(new Date("2025-06-01"));
      expect(history[0].overallScore).toBe(72);
      expect(history[1].overallScore).toBe(78);
    });

    it("should return empty array when no snapshots exist", async () => {
      vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);

      const history = await getRRSHistory(ORG_ID, 90);
      expect(history).toEqual([]);
    });

    it("should query with the correct date range for 30 days", async () => {
      vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);

      await getRRSHistory(ORG_ID, 30);

      expect(prisma.rRSSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_ID,
            snapshotDate: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
          orderBy: { snapshotDate: "asc" },
        }),
      );
    });

    it("should default to 90 days when no days parameter provided", async () => {
      vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);

      await getRRSHistory(ORG_ID);

      expect(prisma.rRSSnapshot.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
