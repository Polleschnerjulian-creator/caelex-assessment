import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: vi.fn(),
}));

import { getAssessmentData, getAssessmentStatus } from "./assessment-adapter";

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
function createMockPrisma() {
  return {
    debrisAssessment: { findFirst: vi.fn() },
    cybersecurityAssessment: { findFirst: vi.fn() },
    insuranceAssessment: { findFirst: vi.fn() },
    insurancePolicy: { findFirst: vi.fn() },
    environmentalAssessment: { findFirst: vi.fn() },
    nIS2Assessment: { findFirst: vi.fn() },
  } as unknown as import("@prisma/client").PrismaClient;
}

// helper to reach the mock fns
function mocks(prisma: ReturnType<typeof createMockPrisma>) {
  const p = prisma as unknown as {
    debrisAssessment: { findFirst: ReturnType<typeof vi.fn> };
    cybersecurityAssessment: { findFirst: ReturnType<typeof vi.fn> };
    insuranceAssessment: { findFirst: ReturnType<typeof vi.fn> };
    insurancePolicy: { findFirst: ReturnType<typeof vi.fn> };
    environmentalAssessment: { findFirst: ReturnType<typeof vi.fn> };
    nIS2Assessment: { findFirst: ReturnType<typeof vi.fn> };
  };
  return p;
}

describe("assessment-adapter", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAssessmentData
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getAssessmentData", () => {
    it("returns full bundle when all assessments exist", async () => {
      const now = new Date("2025-06-01T12:00:00Z");

      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue({
        deorbitStrategy: "controlled",
        hasPassivationCap: true,
        updatedAt: now,
      });
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue({
        maturityScore: 3,
        hasIncidentResponsePlan: true,
        updatedAt: now,
      });
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue({
        id: "ins-1",
        calculatedTPL: 5_000_000,
        updatedAt: now,
      });
      mocks(prisma).insurancePolicy.findFirst.mockResolvedValue({
        coverageAmount: 10_000_000,
        expirationDate: new Date("2026-06-01T00:00:00Z"),
      });
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue({
        status: "submitted",
        updatedAt: now,
      });
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "essential",
        complianceScore: 72,
        updatedAt: now,
      });

      const result = await getAssessmentData(prisma, "org-1");

      expect(result.debris).toEqual({
        deorbitPlanExists: true,
        passivationPlanExists: true,
        lastUpdated: now.toISOString(),
      });
      expect(result.cyber).toEqual({
        patchCompliancePct: null,
        mfaAdoptionPct: null,
        criticalVulns: null,
        lastUpdated: now.toISOString(),
      });
      expect(result.insurance).toEqual({
        hasActivePolicy: true,
        coverageEur: 10_000_000,
        expiresAt: "2026-06-01T00:00:00.000Z",
        lastUpdated: now.toISOString(),
      });
      expect(result.environmental).toEqual({
        impactAssessed: true,
        lastUpdated: now.toISOString(),
      });
      expect(result.nis2).toEqual({
        isEssential: true,
        complianceScore: 72,
        lastUpdated: now.toISOString(),
      });
    });

    it("returns all null when no assessments exist", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");

      expect(result.debris).toBeNull();
      expect(result.cyber).toBeNull();
      expect(result.insurance).toBeNull();
      expect(result.environmental).toBeNull();
      expect(result.nis2).toBeNull();
    });

    // ─── Debris ──────────────────────────────────────────────────────────────

    it("debris with deorbitStrategy returns deorbitPlanExists: true", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue({
        deorbitStrategy: "controlled",
        hasPassivationCap: false,
        updatedAt: new Date("2025-01-01"),
      });
      // rest null
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.debris!.deorbitPlanExists).toBe(true);
      expect(result.debris!.passivationPlanExists).toBe(false);
    });

    it("debris without deorbitStrategy returns deorbitPlanExists: false", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue({
        deorbitStrategy: null,
        hasPassivationCap: true,
        updatedAt: new Date("2025-01-01"),
      });
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.debris!.deorbitPlanExists).toBe(false);
      expect(result.debris!.passivationPlanExists).toBe(true);
    });

    // ─── Insurance ───────────────────────────────────────────────────────────

    it("insurance with active policy returns hasActivePolicy: true and coverageEur from policy", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue({
        id: "ins-1",
        calculatedTPL: 5_000_000,
        updatedAt: new Date("2025-01-01"),
      });
      mocks(prisma).insurancePolicy.findFirst.mockResolvedValue({
        coverageAmount: 10_000_000,
        expirationDate: new Date("2026-12-31"),
      });
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.insurance!.hasActivePolicy).toBe(true);
      expect(result.insurance!.coverageEur).toBe(10_000_000);
      expect(result.insurance!.expiresAt).toBe("2026-12-31T00:00:00.000Z");
    });

    it("insurance without active policy returns hasActivePolicy: false and coverageEur from calculatedTPL", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue({
        id: "ins-1",
        calculatedTPL: 5_000_000,
        updatedAt: new Date("2025-01-01"),
      });
      mocks(prisma).insurancePolicy.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.insurance!.hasActivePolicy).toBe(false);
      expect(result.insurance!.coverageEur).toBe(5_000_000);
      expect(result.insurance!.expiresAt).toBeNull();
    });

    // ─── Environmental ───────────────────────────────────────────────────────

    it("environmental status 'submitted' returns impactAssessed: true", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue({
        status: "submitted",
        updatedAt: new Date("2025-03-01"),
      });
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.environmental!.impactAssessed).toBe(true);
    });

    it("environmental status 'approved' returns impactAssessed: true", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue({
        status: "approved",
        updatedAt: new Date("2025-03-01"),
      });
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.environmental!.impactAssessed).toBe(true);
    });

    it("environmental status 'draft' returns impactAssessed: false", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue({
        status: "draft",
        updatedAt: new Date("2025-03-01"),
      });
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.environmental!.impactAssessed).toBe(false);
    });

    // ─── NIS2 ────────────────────────────────────────────────────────────────

    it("NIS2 entityClassification 'essential' returns isEssential: true", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "essential",
        complianceScore: 80,
        updatedAt: new Date("2025-01-01"),
      });

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.nis2!.isEssential).toBe(true);
    });

    it("NIS2 entityClassification 'important' returns isEssential: false", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "important",
        complianceScore: 60,
        updatedAt: new Date("2025-01-01"),
      });

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.nis2!.isEssential).toBe(false);
    });

    it("NIS2 complianceScore is a number — passed through", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "essential",
        complianceScore: 42,
        updatedAt: new Date("2025-01-01"),
      });

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.nis2!.complianceScore).toBe(42);
    });

    it("NIS2 complianceScore not a number returns null", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "essential",
        complianceScore: "invalid",
        updatedAt: new Date("2025-01-01"),
      });

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.nis2!.complianceScore).toBeNull();
    });

    // ─── Error handling ──────────────────────────────────────────────────────

    it("debris loader error returns null for debris", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockRejectedValue(
        new Error("DB error"),
      );
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.debris).toBeNull();
    });

    it("cyber loader error returns null for cyber", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockRejectedValue(
        new Error("DB error"),
      );
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.cyber).toBeNull();
    });

    it("insurance loader error returns null for insurance", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockRejectedValue(
        new Error("DB error"),
      );
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.insurance).toBeNull();
    });

    it("environmental loader error returns null for environmental", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockRejectedValue(
        new Error("DB error"),
      );
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.environmental).toBeNull();
    });

    it("NIS2 loader error returns null for nis2", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await getAssessmentData(prisma, "org-1");
      expect(result.nis2).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAssessmentStatus
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getAssessmentStatus", () => {
    it("counts completedModules correctly when 3 of 5 have data", async () => {
      const d1 = new Date("2025-01-01");
      const d2 = new Date("2025-06-15");
      const d3 = new Date("2025-03-10");

      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue({
        deorbitStrategy: "controlled",
        hasPassivationCap: true,
        updatedAt: d1,
      });
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue({
        id: "ins-1",
        calculatedTPL: 1_000_000,
        updatedAt: d2,
      });
      mocks(prisma).insurancePolicy.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue({
        status: "draft",
        updatedAt: d3,
      });
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const status = await getAssessmentStatus(prisma, "org-1");

      expect(status.completedModules).toBe(3);
      expect(status.totalModules).toBe(5);
    });

    it("lastUpdated is the most recent date", async () => {
      const d1 = new Date("2025-01-01");
      const d2 = new Date("2025-06-15");
      const d3 = new Date("2025-03-10");

      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue({
        deorbitStrategy: "controlled",
        hasPassivationCap: true,
        updatedAt: d1,
      });
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue({
        id: "ins-1",
        calculatedTPL: 1_000_000,
        updatedAt: d2,
      });
      mocks(prisma).insurancePolicy.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue({
        status: "draft",
        updatedAt: d3,
      });
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const status = await getAssessmentStatus(prisma, "org-1");

      // d2 is the most recent
      expect(status.lastUpdated).toBe(d2.toISOString());
    });

    it("returns completedModules: 0 and lastUpdated: null when no modules have data", async () => {
      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue(null);
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue(null);

      const status = await getAssessmentStatus(prisma, "org-1");

      expect(status.completedModules).toBe(0);
      expect(status.totalModules).toBe(5);
      expect(status.lastUpdated).toBeNull();
    });

    it("returns completedModules: 5 when all modules exist", async () => {
      const now = new Date("2025-06-01T12:00:00Z");

      mocks(prisma).debrisAssessment.findFirst.mockResolvedValue({
        deorbitStrategy: "controlled",
        hasPassivationCap: true,
        updatedAt: now,
      });
      mocks(prisma).cybersecurityAssessment.findFirst.mockResolvedValue({
        maturityScore: 3,
        hasIncidentResponsePlan: true,
        updatedAt: now,
      });
      mocks(prisma).insuranceAssessment.findFirst.mockResolvedValue({
        id: "ins-1",
        calculatedTPL: 5_000_000,
        updatedAt: now,
      });
      mocks(prisma).insurancePolicy.findFirst.mockResolvedValue(null);
      mocks(prisma).environmentalAssessment.findFirst.mockResolvedValue({
        status: "submitted",
        updatedAt: now,
      });
      mocks(prisma).nIS2Assessment.findFirst.mockResolvedValue({
        entityClassification: "essential",
        complianceScore: 72,
        updatedAt: now,
      });

      const status = await getAssessmentStatus(prisma, "org-1");
      expect(status.completedModules).toBe(5);
    });
  });
});
