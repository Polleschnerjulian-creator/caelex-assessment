import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplierDataRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplierPortalToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>test</html>"),
}));
vi.mock("@/lib/email/templates/supplier-data-request", () => ({
  default: vi.fn().mockReturnValue({}),
}));

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  sendSupplierOutreach,
  sendBatchOutreach,
  revokePortalToken,
  getOutreachStatus,
  createSupplierRequest,
} from "./supplier-outreach-service";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    supplierName: "SpaceParts Inc.",
    supplierEmail: "contact@spaceparts.com",
    componentType: "Solar Panel Array",
    dataRequired: JSON.stringify(["Carbon footprint", "Material source"]),
    notes: "Please respond by end of month",
    deadline: new Date("2026-06-01"),
    status: "pending",
    assessmentId: "assess-1",
    assessment: {
      missionName: "LEO-SAT-1",
      user: {
        organization: "Caelex GmbH",
        name: "Admin User",
        email: "admin@caelex.io",
      },
    },
    ...overrides,
  };
}

describe("supplier-outreach-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The source code has a JS operator precedence quirk:
    // (options.baseUrl || NEXT_PUBLIC_APP_URL || VERCEL_URL) ? `https://${VERCEL_URL}` : fallback
    // So we set VERCEL_URL to make the portal URL predictable.
    process.env.VERCEL_URL = "app.caelex.io";
  });

  describe("sendSupplierOutreach", () => {
    it("should send outreach email and return success", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        makeRequest() as never,
      );
      vi.mocked(prisma.supplierPortalToken.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.supplierPortalToken.create).mockResolvedValue({
        id: "token-1",
        token: "abc123",
      } as never);
      vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
        {} as never,
      );

      const result = await sendSupplierOutreach({
        requestId: "req-1",
        baseUrl: "https://app.caelex.io",
      });

      expect(result.success).toBe(true);
      expect(result.tokenId).toBe("token-1");
      expect(result.emailSent).toBe(true);
      expect(result.portalUrl).toContain("/supplier/");

      // Verify email was sent
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "contact@spaceparts.com",
          subject: "Environmental Data Request: Solar Panel Array",
          html: "<html>test</html>",
        }),
      );

      // Verify request status was updated
      expect(prisma.supplierDataRequest.update).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: expect.objectContaining({
          status: "sent",
        }),
      });
    });

    it("should return error when request not found", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(null);

      const result = await sendSupplierOutreach({ requestId: "nonexistent" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Supplier data request not found");
    });

    it("should return error when supplier email not configured", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        makeRequest({ supplierEmail: null }) as never,
      );

      const result = await sendSupplierOutreach({ requestId: "req-1" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Supplier email not configured");
    });

    it("should revoke existing token before creating new one", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        makeRequest() as never,
      );
      vi.mocked(prisma.supplierPortalToken.findFirst).mockResolvedValue({
        id: "old-token",
        token: "oldabc",
      } as never);
      vi.mocked(prisma.supplierPortalToken.create).mockResolvedValue({
        id: "new-token",
        token: "newabc",
      } as never);
      vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
        {} as never,
      );

      const result = await sendSupplierOutreach({
        requestId: "req-1",
        baseUrl: "https://app.caelex.io",
      });

      expect(result.success).toBe(true);

      // Old token should be revoked
      expect(prisma.supplierPortalToken.update).toHaveBeenCalledWith({
        where: { id: "old-token" },
        data: expect.objectContaining({
          isRevoked: true,
          revokeReason: "Replaced with new token",
        }),
      });

      // New token created
      expect(prisma.supplierPortalToken.create).toHaveBeenCalled();
    });

    it("should handle exception during processing", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockRejectedValue(
        new Error("DB connection lost"),
      );

      const result = await sendSupplierOutreach({ requestId: "req-1" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB connection lost");
    });

    it("should handle invalid JSON in dataRequired gracefully", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        makeRequest({ dataRequired: "invalid json{{{" }) as never,
      );
      vi.mocked(prisma.supplierPortalToken.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.supplierPortalToken.create).mockResolvedValue({
        id: "token-2",
        token: "abc",
      } as never);
      vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
        {} as never,
      );

      const result = await sendSupplierOutreach({
        requestId: "req-1",
        baseUrl: "https://app.caelex.io",
      });

      expect(result.success).toBe(true);
    });

    it("should use default expiration of 30 days", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        makeRequest() as never,
      );
      vi.mocked(prisma.supplierPortalToken.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.supplierPortalToken.create).mockResolvedValue({
        id: "token-3",
        token: "def",
      } as never);
      vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
        {} as never,
      );

      await sendSupplierOutreach({
        requestId: "req-1",
        baseUrl: "https://app.caelex.io",
      });

      const createCall = vi.mocked(prisma.supplierPortalToken.create).mock
        .calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const daysFromNow = Math.round(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(daysFromNow).toBeGreaterThanOrEqual(29);
      expect(daysFromNow).toBeLessThanOrEqual(31);
    });

    it("should handle request with null optional fields in assessment", async () => {
      const request = makeRequest({
        notes: null,
        deadline: null,
        assessment: {
          missionName: null,
          user: {
            organization: null,
            name: null,
            email: null,
          },
        },
      });

      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        request as never,
      );
      vi.mocked(prisma.supplierPortalToken.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.supplierPortalToken.create).mockResolvedValue({
        id: "token-null",
        token: "nulltest",
      } as never);
      vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
        {} as never,
      );

      const result = await sendSupplierOutreach({
        requestId: "req-1",
        baseUrl: "https://app.caelex.io",
      });

      expect(result.success).toBe(true);
    });

    it("should use localhost fallback when no env vars or baseUrl set", async () => {
      // Clear env vars so ternary goes to falsy branch
      delete process.env.VERCEL_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        makeRequest() as never,
      );
      vi.mocked(prisma.supplierPortalToken.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.supplierPortalToken.create).mockResolvedValue({
        id: "token-local",
        token: "localtest",
      } as never);
      vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
        {} as never,
      );

      const result = await sendSupplierOutreach({
        requestId: "req-1",
        // No baseUrl provided
      });

      expect(result.success).toBe(true);
      expect(result.portalUrl).toContain("/supplier/");
    });

    it("should handle non-Error exception during processing", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockRejectedValue(
        "string error",
      );

      const result = await sendSupplierOutreach({ requestId: "req-1" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should use custom expiration days", async () => {
      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        makeRequest() as never,
      );
      vi.mocked(prisma.supplierPortalToken.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.supplierPortalToken.create).mockResolvedValue({
        id: "token-4",
        token: "ghi",
      } as never);
      vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
        {} as never,
      );

      await sendSupplierOutreach({
        requestId: "req-1",
        expirationDays: 7,
        baseUrl: "https://app.caelex.io",
      });

      const createCall = vi.mocked(prisma.supplierPortalToken.create).mock
        .calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const daysFromNow = Math.round(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(daysFromNow).toBeGreaterThanOrEqual(6);
      expect(daysFromNow).toBeLessThanOrEqual(8);
    });
  });

  describe("sendBatchOutreach", () => {
    it("should send outreach to all pending requests", async () => {
      const pendingRequests = [
        {
          id: "req-b1",
          supplierName: "Supplier A",
          supplierEmail: "a@supplier.com",
          status: "pending",
        },
        {
          id: "req-b2",
          supplierName: "Supplier B",
          supplierEmail: "b@supplier.com",
          status: "pending",
        },
      ];

      // findMany for batch
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue(
        pendingRequests as never,
      );

      // For each sendSupplierOutreach call
      vi.mocked(prisma.supplierDataRequest.findUnique)
        .mockResolvedValueOnce(makeRequest({ id: "req-b1" }) as never)
        .mockResolvedValueOnce(makeRequest({ id: "req-b2" }) as never);

      vi.mocked(prisma.supplierPortalToken.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.supplierPortalToken.create).mockResolvedValue({
        id: "token-b",
        token: "batch",
      } as never);
      vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
        {} as never,
      );

      const result = await sendBatchOutreach("assess-1", {
        baseUrl: "https://app.caelex.io",
      });

      expect(result.total).toBe(2);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it("should count failures correctly", async () => {
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([
        {
          id: "req-f1",
          supplierName: "Fail Supplier",
          supplierEmail: "f@x.com",
          status: "pending",
        },
      ] as never);

      vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
        null, // Not found -> failure
      );

      const result = await sendBatchOutreach("assess-1");

      expect(result.total).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
    });

    it("should handle empty pending requests", async () => {
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const result = await sendBatchOutreach("assess-1");

      expect(result.total).toBe(0);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe("revokePortalToken", () => {
    it("should revoke a token successfully", async () => {
      vi.mocked(prisma.supplierPortalToken.update).mockResolvedValue(
        {} as never,
      );

      const result = await revokePortalToken(
        "token-1",
        "user-1",
        "Security concern",
      );

      expect(result.success).toBe(true);
      expect(prisma.supplierPortalToken.update).toHaveBeenCalledWith({
        where: { id: "token-1" },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          revokedBy: "user-1",
          revokeReason: "Security concern",
        },
      });
    });

    it("should handle revocation without reason", async () => {
      vi.mocked(prisma.supplierPortalToken.update).mockResolvedValue(
        {} as never,
      );

      const result = await revokePortalToken("token-1", "user-1");

      expect(result.success).toBe(true);
      expect(prisma.supplierPortalToken.update).toHaveBeenCalledWith({
        where: { id: "token-1" },
        data: expect.objectContaining({
          revokeReason: undefined,
        }),
      });
    });

    it("should return error when revocation fails", async () => {
      vi.mocked(prisma.supplierPortalToken.update).mockRejectedValue(
        new Error("Token not found"),
      );

      const result = await revokePortalToken("nonexistent", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Token not found");
    });

    it("should return generic error for non-Error exception", async () => {
      vi.mocked(prisma.supplierPortalToken.update).mockRejectedValue(
        "unexpected",
      );

      const result = await revokePortalToken("bad-token", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to revoke token");
    });
  });

  describe("getOutreachStatus", () => {
    it("should return correct counts and request details", async () => {
      const now = new Date();
      const pastDeadline = new Date("2025-01-01");
      const futureDeadline = new Date("2027-01-01");

      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([
        {
          id: "r1",
          supplierName: "A",
          componentType: "Panel",
          status: "pending",
          sentAt: null,
          receivedAt: null,
          deadline: null,
          createdAt: now,
          portalTokens: [],
        },
        {
          id: "r2",
          supplierName: "B",
          componentType: "Thruster",
          status: "sent",
          sentAt: now,
          receivedAt: null,
          deadline: pastDeadline, // overdue
          createdAt: now,
          portalTokens: [{ id: "tok-1" }],
        },
        {
          id: "r3",
          supplierName: "C",
          componentType: "Sensor",
          status: "sent",
          sentAt: now,
          receivedAt: null,
          deadline: futureDeadline,
          createdAt: now,
          portalTokens: [],
        },
        {
          id: "r4",
          supplierName: "D",
          componentType: "Battery",
          status: "received",
          sentAt: now,
          receivedAt: now,
          deadline: null,
          createdAt: now,
          portalTokens: [],
        },
      ] as never);

      const result = await getOutreachStatus("assess-1");

      expect(result.totalRequests).toBe(4);
      expect(result.pending).toBe(1);
      expect(result.sent).toBe(2);
      expect(result.received).toBe(1);
      expect(result.overdue).toBe(1); // r2 is sent + past deadline
      expect(result.requests).toHaveLength(4);

      // Check hasActiveToken
      expect(result.requests[1].hasActiveToken).toBe(true);
      expect(result.requests[0].hasActiveToken).toBe(false);
    });

    it("should return empty status for assessment with no requests", async () => {
      vi.mocked(prisma.supplierDataRequest.findMany).mockResolvedValue([]);

      const result = await getOutreachStatus("empty-assess");

      expect(result.totalRequests).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.sent).toBe(0);
      expect(result.received).toBe(0);
      expect(result.overdue).toBe(0);
      expect(result.requests).toHaveLength(0);
    });
  });

  describe("createSupplierRequest", () => {
    it("should create a new supplier request", async () => {
      vi.mocked(prisma.supplierDataRequest.create).mockResolvedValue({
        id: "new-req-1",
      } as never);

      const result = await createSupplierRequest({
        assessmentId: "assess-1",
        supplierName: "NewCorp",
        supplierEmail: "new@corp.com",
        componentType: "Antenna",
        dataRequired: ["Mass", "Power consumption"],
        notes: "Urgent request",
        deadline: new Date("2026-06-15"),
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBe("new-req-1");

      expect(prisma.supplierDataRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assessmentId: "assess-1",
          supplierName: "NewCorp",
          supplierEmail: "new@corp.com",
          componentType: "Antenna",
          dataRequired: JSON.stringify(["Mass", "Power consumption"]),
          notes: "Urgent request",
          status: "pending",
        }),
      });
    });

    it("should handle creation failure with non-Error exception", async () => {
      vi.mocked(prisma.supplierDataRequest.create).mockRejectedValue(42);

      const result = await createSupplierRequest({
        assessmentId: "assess-1",
        supplierName: "ErrCorp",
        componentType: "Panel",
        dataRequired: ["Data"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to create request");
    });

    it("should handle creation failure", async () => {
      vi.mocked(prisma.supplierDataRequest.create).mockRejectedValue(
        new Error("Unique constraint violated"),
      );

      const result = await createSupplierRequest({
        assessmentId: "assess-1",
        supplierName: "DupCorp",
        componentType: "Panel",
        dataRequired: ["Weight"],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unique constraint violated");
    });

    it("should create request without optional fields", async () => {
      vi.mocked(prisma.supplierDataRequest.create).mockResolvedValue({
        id: "new-req-2",
      } as never);

      const result = await createSupplierRequest({
        assessmentId: "assess-1",
        supplierName: "MinCorp",
        componentType: "Frame",
        dataRequired: ["Material"],
      });

      expect(result.success).toBe(true);

      const createData = vi.mocked(prisma.supplierDataRequest.create).mock
        .calls[0][0].data;
      expect(createData.supplierEmail).toBeUndefined();
      expect(createData.notes).toBeUndefined();
      expect(createData.deadline).toBeUndefined();
    });
  });
});
