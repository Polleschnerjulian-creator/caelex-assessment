import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    stakeholderEngagement: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    stakeholderAccessLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    dataRoom: {
      count: vi.fn(),
    },
    complianceAttestation: {
      count: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Mock activity service
vi.mock("@/lib/services/activity-service", () => ({
  createActivity: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { createActivity } from "@/lib/services/activity-service";
import {
  createEngagement,
  getEngagements,
  getEngagement,
  updateEngagement,
  revokeEngagement,
  rotateToken,
  validateToken,
  logStakeholderAccess,
  getAccessLogs,
  getNetworkStats,
} from "@/lib/services/stakeholder-engagement";

describe("Stakeholder Engagement Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════
  // createEngagement
  // ═══════════════════════════════════════════════

  describe("createEngagement", () => {
    it("should create engagement with access token", async () => {
      const mockEngagement = {
        id: "eng-1",
        companyName: "Supplier Corp",
        type: "SUPPLIER",
        accessTokenHash: "hashed-token",
        tokenExpiresAt: new Date(),
        dataRooms: [],
        attestations: [],
        _count: { dataRooms: 0, attestations: 0, accessLogs: 0 },
      };

      vi.mocked(prisma.stakeholderEngagement.create).mockResolvedValue(
        mockEngagement as any,
      );

      const result = await createEngagement(
        {
          organizationId: "org-1",
          type: "SUPPLIER" as any,
          companyName: "Supplier Corp",
          contactName: "Jane Doe",
          contactEmail: "jane@supplier.com",
          scope: "Data processing",
        },
        "user-1",
      );

      expect(result.engagement.id).toBe("eng-1");
      expect(result.accessToken).toBeDefined();
      expect(result.accessToken.startsWith("stkn_")).toBe(true);
    });

    it("should set default token expiry to 90 days", async () => {
      vi.mocked(prisma.stakeholderEngagement.create).mockResolvedValue({
        id: "eng-1",
        companyName: "Test",
        dataRooms: [],
        attestations: [],
        _count: { dataRooms: 0, attestations: 0, accessLogs: 0 },
      } as any);

      await createEngagement(
        {
          organizationId: "org-1",
          type: "SUPPLIER" as any,
          companyName: "Test",
          contactName: "Test",
          contactEmail: "test@test.com",
          scope: "Test",
        },
        "user-1",
      );

      const createCall = vi.mocked(prisma.stakeholderEngagement.create).mock
        .calls[0][0];
      const expiresAt = createCall.data.tokenExpiresAt as Date;
      const now = new Date();
      const diffDays = Math.round(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(91);
    });

    it("should accept custom token expiry", async () => {
      vi.mocked(prisma.stakeholderEngagement.create).mockResolvedValue({
        id: "eng-1",
        companyName: "Test",
        dataRooms: [],
        attestations: [],
        _count: { dataRooms: 0, attestations: 0, accessLogs: 0 },
      } as any);

      await createEngagement(
        {
          organizationId: "org-1",
          type: "SUPPLIER" as any,
          companyName: "Test",
          contactName: "Test",
          contactEmail: "test@test.com",
          scope: "Test",
          tokenExpiryDays: 30,
        },
        "user-1",
      );

      const createCall = vi.mocked(prisma.stakeholderEngagement.create).mock
        .calls[0][0];
      const expiresAt = createCall.data.tokenExpiresAt as Date;
      const now = new Date();
      const diffDays = Math.round(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(31);
    });

    it("should log audit event on creation", async () => {
      vi.mocked(prisma.stakeholderEngagement.create).mockResolvedValue({
        id: "eng-1",
        companyName: "Acme",
        dataRooms: [],
        attestations: [],
        _count: { dataRooms: 0, attestations: 0, accessLogs: 0 },
      } as any);

      await createEngagement(
        {
          organizationId: "org-1",
          type: "SUPPLIER" as any,
          companyName: "Acme",
          contactName: "Test",
          contactEmail: "test@acme.com",
          scope: "Test",
        },
        "user-1",
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "stakeholder_invited",
          entityType: "stakeholder_engagement",
          userId: "user-1",
        }),
      );
    });

    it("should create activity on creation", async () => {
      vi.mocked(prisma.stakeholderEngagement.create).mockResolvedValue({
        id: "eng-1",
        companyName: "Acme",
        dataRooms: [],
        attestations: [],
        _count: { dataRooms: 0, attestations: 0, accessLogs: 0 },
      } as any);

      await createEngagement(
        {
          organizationId: "org-1",
          type: "SUPPLIER" as any,
          companyName: "Acme",
          contactName: "Test",
          contactEmail: "test@acme.com",
          scope: "Test",
        },
        "user-1",
      );

      expect(createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          action: "created",
          entityType: "stakeholder_engagement",
          entityName: "Acme",
        }),
      );
    });

    it("should set default ipAllowlist to empty array", async () => {
      vi.mocked(prisma.stakeholderEngagement.create).mockResolvedValue({
        id: "eng-1",
        dataRooms: [],
        attestations: [],
        _count: { dataRooms: 0, attestations: 0, accessLogs: 0 },
      } as any);

      await createEngagement(
        {
          organizationId: "org-1",
          type: "SUPPLIER" as any,
          companyName: "Test",
          contactName: "Test",
          contactEmail: "test@test.com",
          scope: "Test",
        },
        "user-1",
      );

      expect(prisma.stakeholderEngagement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAllowlist: [],
            mfaRequired: false,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getEngagements
  // ═══════════════════════════════════════════════

  describe("getEngagements", () => {
    it("should return paginated engagements", async () => {
      vi.mocked(prisma.stakeholderEngagement.findMany).mockResolvedValue([
        { id: "eng-1" },
        { id: "eng-2" },
      ] as any);
      vi.mocked(prisma.stakeholderEngagement.count).mockResolvedValue(2);

      const result = await getEngagements("org-1");

      expect(result.engagements).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it("should apply search filter", async () => {
      vi.mocked(prisma.stakeholderEngagement.findMany).mockResolvedValue([]);
      vi.mocked(prisma.stakeholderEngagement.count).mockResolvedValue(0);

      await getEngagements("org-1", { search: "Acme" });

      expect(prisma.stakeholderEngagement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                companyName: { contains: "Acme", mode: "insensitive" },
              }),
            ]),
          }),
        }),
      );
    });

    it("should apply type filter", async () => {
      vi.mocked(prisma.stakeholderEngagement.findMany).mockResolvedValue([]);
      vi.mocked(prisma.stakeholderEngagement.count).mockResolvedValue(0);

      await getEngagements("org-1", { type: "SUPPLIER" as any });

      expect(prisma.stakeholderEngagement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "SUPPLIER",
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getEngagement
  // ═══════════════════════════════════════════════

  describe("getEngagement", () => {
    it("should return engagement by id and org", async () => {
      vi.mocked(prisma.stakeholderEngagement.findFirst).mockResolvedValue({
        id: "eng-1",
        companyName: "Acme",
      } as any);

      const result = await getEngagement("eng-1", "org-1");

      expect(result?.companyName).toBe("Acme");
      expect(prisma.stakeholderEngagement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "eng-1", organizationId: "org-1" },
        }),
      );
    });

    it("should return null for nonexistent engagement", async () => {
      vi.mocked(prisma.stakeholderEngagement.findFirst).mockResolvedValue(null);

      const result = await getEngagement("nonexistent", "org-1");
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════
  // updateEngagement
  // ═══════════════════════════════════════════════

  describe("updateEngagement", () => {
    it("should update engagement and log audit event", async () => {
      vi.mocked(prisma.stakeholderEngagement.update).mockResolvedValue({
        id: "eng-1",
        companyName: "Updated Corp",
        _count: { dataRooms: 0, attestations: 0, accessLogs: 0 },
      } as any);

      const result = await updateEngagement(
        "eng-1",
        "org-1",
        { companyName: "Updated Corp" },
        "user-1",
      );

      expect(result.companyName).toBe("Updated Corp");
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "stakeholder_updated",
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // revokeEngagement
  // ═══════════════════════════════════════════════

  describe("revokeEngagement", () => {
    it("should revoke engagement and log events", async () => {
      vi.mocked(prisma.stakeholderEngagement.update).mockResolvedValue({
        id: "eng-1",
        companyName: "Revoked Corp",
        status: "REVOKED",
        isRevoked: true,
      } as any);

      const result = await revokeEngagement("eng-1", "org-1", "user-1");

      expect(result.status).toBe("REVOKED");
      expect(result.isRevoked).toBe(true);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "stakeholder_revoked",
        }),
      );
      expect(createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "deleted",
          entityType: "stakeholder_engagement",
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // rotateToken
  // ═══════════════════════════════════════════════

  describe("rotateToken", () => {
    it("should generate new token and update engagement", async () => {
      vi.mocked(prisma.stakeholderEngagement.update).mockResolvedValue({
        id: "eng-1",
        companyName: "Test Corp",
      } as any);

      const result = await rotateToken("eng-1", "org-1", "user-1");

      expect(result.accessToken).toBeDefined();
      expect(result.accessToken.startsWith("stkn_")).toBe(true);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "stakeholder_token_rotated",
        }),
      );
    });

    it("should accept custom expiry for rotated token", async () => {
      vi.mocked(prisma.stakeholderEngagement.update).mockResolvedValue({
        id: "eng-1",
        companyName: "Test Corp",
      } as any);

      await rotateToken("eng-1", "org-1", "user-1", 45);

      const updateCall = vi.mocked(prisma.stakeholderEngagement.update).mock
        .calls[0][0];
      const tokenExpiresAt = updateCall.data.tokenExpiresAt as Date;
      const now = new Date();
      const diffDays = Math.round(
        (tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(44);
      expect(diffDays).toBeLessThanOrEqual(46);
    });
  });

  // ═══════════════════════════════════════════════
  // validateToken
  // ═══════════════════════════════════════════════

  describe("validateToken", () => {
    it("should return invalid for unknown token", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue(
        null,
      );

      const result = await validateToken("invalid-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token");
    });

    it("should return invalid for revoked engagement", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: true,
        status: "REVOKED",
      } as any);

      const result = await validateToken("some-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Access has been revoked");
    });

    it("should return invalid for expired token", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: false,
        status: "ACTIVE",
        tokenExpiresAt: new Date("2020-01-01"),
        ipAllowlist: [],
      } as any);

      const result = await validateToken("some-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token has expired");
    });

    it("should return invalid for suspended engagement", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: false,
        status: "SUSPENDED",
        tokenExpiresAt: new Date("2030-01-01"),
        ipAllowlist: [],
      } as any);

      const result = await validateToken("some-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Engagement is suspended");
    });

    it("should return invalid for completed engagement", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: false,
        status: "COMPLETED",
        tokenExpiresAt: new Date("2030-01-01"),
        ipAllowlist: [],
      } as any);

      const result = await validateToken("some-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Engagement is completed");
    });

    it("should enforce IP allowlist", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: false,
        status: "ACTIVE",
        tokenExpiresAt: new Date("2030-01-01"),
        ipAllowlist: ["10.0.0.1", "10.0.0.2"],
      } as any);

      const result = await validateToken("some-token", "192.168.1.1");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("IP address not allowed");
    });

    it("should reject when IP allowlist set but no IP provided", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: false,
        status: "ACTIVE",
        tokenExpiresAt: new Date("2030-01-01"),
        ipAllowlist: ["10.0.0.1"],
      } as any);

      const result = await validateToken("some-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("IP address not allowed");
    });

    it("should validate successfully for valid token", async () => {
      const mockEngagement = {
        id: "eng-1",
        isRevoked: false,
        status: "ACTIVE",
        tokenExpiresAt: new Date("2030-01-01"),
        ipAllowlist: [],
        organization: { id: "org-1", name: "Test Org" },
      };

      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue(
        mockEngagement as any,
      );
      vi.mocked(prisma.stakeholderEngagement.update).mockResolvedValue(
        mockEngagement as any,
      );

      const result = await validateToken("valid-token");

      expect(result.valid).toBe(true);
      expect((result as any).engagement).toBeDefined();
    });

    it("should update access tracking on valid token", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: false,
        status: "ACTIVE",
        tokenExpiresAt: new Date("2030-01-01"),
        ipAllowlist: [],
        organization: { id: "org-1", name: "Test" },
      } as any);
      vi.mocked(prisma.stakeholderEngagement.update).mockResolvedValue(
        {} as any,
      );

      await validateToken("valid-token");

      expect(prisma.stakeholderEngagement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessCount: { increment: 1 },
          }),
        }),
      );
    });

    it("should transition INVITED to ACTIVE on first valid access", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: false,
        status: "INVITED",
        tokenExpiresAt: new Date("2030-01-01"),
        ipAllowlist: [],
        organization: { id: "org-1", name: "Test" },
      } as any);
      vi.mocked(prisma.stakeholderEngagement.update).mockResolvedValue(
        {} as any,
      );

      await validateToken("valid-token");

      expect(prisma.stakeholderEngagement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "ACTIVE",
          }),
        }),
      );
    });

    it("should allow access when IP is in allowlist", async () => {
      vi.mocked(prisma.stakeholderEngagement.findUnique).mockResolvedValue({
        id: "eng-1",
        isRevoked: false,
        status: "ACTIVE",
        tokenExpiresAt: new Date("2030-01-01"),
        ipAllowlist: ["10.0.0.1", "10.0.0.2"],
        organization: { id: "org-1", name: "Test" },
      } as any);
      vi.mocked(prisma.stakeholderEngagement.update).mockResolvedValue(
        {} as any,
      );

      const result = await validateToken("valid-token", "10.0.0.1");

      expect(result.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════
  // logStakeholderAccess
  // ═══════════════════════════════════════════════

  describe("logStakeholderAccess", () => {
    it("should create access log entry", async () => {
      vi.mocked(prisma.stakeholderAccessLog.create).mockResolvedValue({
        id: "log-1",
      } as any);

      await logStakeholderAccess("eng-1", "login", {
        ipAddress: "1.2.3.4",
        userAgent: "Mozilla/5.0",
      });

      expect(prisma.stakeholderAccessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            engagementId: "eng-1",
            action: "login",
            ipAddress: "1.2.3.4",
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════
  // getAccessLogs
  // ═══════════════════════════════════════════════

  describe("getAccessLogs", () => {
    it("should return paginated access logs", async () => {
      vi.mocked(prisma.stakeholderAccessLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.stakeholderAccessLog.count).mockResolvedValue(0);

      const result = await getAccessLogs("eng-1");

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════
  // getNetworkStats
  // ═══════════════════════════════════════════════

  describe("getNetworkStats", () => {
    it("should return network statistics", async () => {
      vi.mocked(prisma.stakeholderEngagement.count)
        .mockResolvedValueOnce(10) // totalEngagements
        .mockResolvedValueOnce(6) // activeEngagements
        .mockResolvedValueOnce(3); // pendingAttestations (5th call)
      vi.mocked(prisma.dataRoom.count).mockResolvedValue(4);
      vi.mocked(prisma.complianceAttestation.count).mockResolvedValue(8);

      const result = await getNetworkStats("org-1");

      expect(result.totalEngagements).toBe(10);
      expect(result.activeEngagements).toBe(6);
      expect(result.openDataRooms).toBe(4);
      expect(result.totalAttestations).toBe(8);
      expect(result.pendingAttestations).toBe(3);
    });
  });
});
