import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customerHealthScore: {
      findMany: vi.fn(),
    },
    churnIntervention: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock email
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { detectAtRiskOrganizations } from "./churn-intervention-service";

function makeHealthScore(overrides: Record<string, unknown> = {}) {
  return {
    id: "hs-1",
    organizationId: "org-1",
    score: 30,
    trend: "declining",
    riskLevel: "high",
    lastLoginAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    organization: {
      members: [
        {
          user: {
            id: "owner-1",
            name: "Org Owner",
            email: "owner@example.com",
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("Churn Intervention Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectAtRiskOrganizations", () => {
    it("should return empty results when no at-risk orgs found", async () => {
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue(
        [] as never,
      );

      const results = await detectAtRiskOrganizations();

      expect(results.processed).toBe(0);
      expect(results.interventionsCreated).toBe(0);
      expect(results.emailsSent).toBe(0);
      expect(results.errors).toHaveLength(0);
    });

    it("should skip org with existing active intervention", async () => {
      const hs = makeHealthScore();
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue({
        id: "existing-intervention",
        status: "PENDING",
      } as never);

      const results = await detectAtRiskOrganizations();

      expect(results.processed).toBe(1);
      expect(results.interventionsCreated).toBe(0);
      expect(prisma.churnIntervention.create).not.toHaveBeenCalled();
    });

    it("should create intervention and send email for at-risk org", async () => {
      const hs = makeHealthScore();
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      const results = await detectAtRiskOrganizations();

      expect(results.processed).toBe(1);
      expect(results.interventionsCreated).toBe(1);
      expect(results.emailsSent).toBe(1);
      expect(prisma.churnIntervention.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          healthScore: 30,
          status: "PENDING",
        }),
      });
    });

    it("should update intervention to IN_PROGRESS after successful email", async () => {
      const hs = makeHealthScore();
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      await detectAtRiskOrganizations();

      expect(prisma.churnIntervention.update).toHaveBeenCalledWith({
        where: { id: "intervention-1" },
        data: {
          status: "IN_PROGRESS",
          actionTaken: "Automated re-engagement email sent",
        },
      });
    });

    it("should send email to org owner with correct content", async () => {
      const hs = makeHealthScore();
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      await detectAtRiskOrganizations();

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "owner@example.com",
          subject: "We're here to help — Let's get you back on track",
        }),
      );
      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("Org Owner");
      expect(emailCall.html).toContain("Return to Dashboard");
    });

    it("should use 'there' when owner has no name", async () => {
      const hs = makeHealthScore({
        organization: {
          members: [
            {
              user: { id: "owner-1", name: null, email: "owner@example.com" },
            },
          ],
        },
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      await detectAtRiskOrganizations();

      const emailCall = vi.mocked(sendEmail).mock.calls[0][0] as {
        html: string;
      };
      expect(emailCall.html).toContain("there");
    });

    it("should not send email when owner has no email", async () => {
      const hs = makeHealthScore({
        organization: {
          members: [
            {
              user: { id: "owner-1", name: "Owner", email: null },
            },
          ],
        },
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);

      const results = await detectAtRiskOrganizations();

      expect(results.interventionsCreated).toBe(1);
      expect(results.emailsSent).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should not send email when org has no members", async () => {
      const hs = makeHealthScore({
        organization: { members: [] },
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);

      const results = await detectAtRiskOrganizations();

      expect(results.interventionsCreated).toBe(1);
      expect(results.emailsSent).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should push error when email send throws", async () => {
      const hs = makeHealthScore();
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockRejectedValue(new Error("SMTP down"));

      const results = await detectAtRiskOrganizations();

      expect(results.interventionsCreated).toBe(1);
      expect(results.emailsSent).toBe(0);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Email failed for org org-1");
      expect(results.errors[0]).toContain("SMTP down");
    });

    it("should push error with 'Unknown' when non-Error is thrown in email", async () => {
      const hs = makeHealthScore();
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockRejectedValue("string error");

      const results = await detectAtRiskOrganizations();

      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Unknown");
    });

    it("should catch top-level error and push to results", async () => {
      vi.mocked(prisma.customerHealthScore.findMany).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const results = await detectAtRiskOrganizations();

      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Detection failed");
      expect(results.errors[0]).toContain("DB connection failed");
    });

    it("should catch top-level non-Error and push 'Unknown'", async () => {
      vi.mocked(prisma.customerHealthScore.findMany).mockRejectedValue(null);

      const results = await detectAtRiskOrganizations();

      expect(results.errors).toHaveLength(1);
      expect(results.errors[0]).toContain("Detection failed");
      expect(results.errors[0]).toContain("Unknown");
    });

    // Trigger reason determination tests
    it("should set trigger reason to 'Health score declining rapidly' for declining trend", async () => {
      const hs = makeHealthScore({
        trend: "declining",
        riskLevel: "high",
        lastLoginAt: new Date(), // recent login, so no "14+ days" override
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      await detectAtRiskOrganizations();

      // Note: declining + recent login -> "Health score declining rapidly"
      // But the code checks conditions sequentially: declining, then no login, then critical
      // With a recent login, the "no login" check won't override
      expect(prisma.churnIntervention.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerReason: "Health score declining rapidly",
        }),
      });
    });

    it("should set trigger reason to 'No login in 14+ days' when lastLoginAt is null", async () => {
      const hs = makeHealthScore({
        trend: "stable",
        riskLevel: "high",
        lastLoginAt: null,
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      await detectAtRiskOrganizations();

      expect(prisma.churnIntervention.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerReason: "No login in 14+ days",
        }),
      });
    });

    it("should set trigger reason to 'No login in 14+ days' when lastLoginAt > 14 days ago", async () => {
      const hs = makeHealthScore({
        trend: "stable",
        riskLevel: "high",
        lastLoginAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      await detectAtRiskOrganizations();

      expect(prisma.churnIntervention.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerReason: "No login in 14+ days",
        }),
      });
    });

    it("should set trigger reason to 'Critical risk level detected' for critical risk", async () => {
      const hs = makeHealthScore({
        trend: "stable",
        riskLevel: "critical",
        lastLoginAt: new Date(), // recent login
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      await detectAtRiskOrganizations();

      expect(prisma.churnIntervention.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerReason: "Critical risk level detected",
        }),
      });
    });

    it("should default trigger reason to 'Health score below threshold'", async () => {
      const hs = makeHealthScore({
        trend: "stable",
        riskLevel: "high",
        lastLoginAt: new Date(), // recent login, not critical, not declining
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      await detectAtRiskOrganizations();

      expect(prisma.churnIntervention.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          triggerReason: "Health score below threshold",
        }),
      });
    });

    it("should not update intervention when email fails (no success)", async () => {
      const hs = makeHealthScore({
        trend: "stable",
        riskLevel: "high",
        lastLoginAt: new Date(),
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create).mockResolvedValue({
        id: "intervention-1",
      } as never);
      vi.mocked(sendEmail).mockResolvedValue({
        success: false,
        error: "Bounced",
      } as never);

      const results = await detectAtRiskOrganizations();

      expect(results.interventionsCreated).toBe(1);
      expect(results.emailsSent).toBe(0);
      expect(prisma.churnIntervention.update).not.toHaveBeenCalled();
    });

    it("should process multiple at-risk orgs", async () => {
      const hs1 = makeHealthScore({ organizationId: "org-1" });
      const hs2 = makeHealthScore({
        id: "hs-2",
        organizationId: "org-2",
        organization: {
          members: [
            {
              user: {
                id: "owner-2",
                name: "Owner2",
                email: "owner2@example.com",
              },
            },
          ],
        },
      });
      vi.mocked(prisma.customerHealthScore.findMany).mockResolvedValue([
        hs1,
        hs2,
      ] as never);
      vi.mocked(prisma.churnIntervention.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.churnIntervention.create)
        .mockResolvedValueOnce({ id: "int-1" } as never)
        .mockResolvedValueOnce({ id: "int-2" } as never);
      vi.mocked(sendEmail).mockResolvedValue({ success: true } as never);
      vi.mocked(prisma.churnIntervention.update).mockResolvedValue({} as never);

      const results = await detectAtRiskOrganizations();

      expect(results.processed).toBe(2);
      expect(results.interventionsCreated).toBe(2);
      expect(results.emailsSent).toBe(2);
    });
  });
});
