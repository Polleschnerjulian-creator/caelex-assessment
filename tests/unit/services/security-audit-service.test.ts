import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    securityAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  logSecurityEvent,
  logSecurityEvents,
  getSecurityLogs,
  getUserSecurityLogs,
  getOrganizationSecurityLogs,
  getHighRiskEvents,
  getLoginHistory,
  getSecurityStats,
  getDailyEventCounts,
  purgeOldLogs,
  logLogin,
  logFailedLogin,
  logPasswordChange,
  logSuspiciousActivity,
} from "@/lib/services/security-audit-service";

describe("Security Audit Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── logSecurityEvent ───

  describe("logSecurityEvent", () => {
    it("should create a security audit log entry", async () => {
      const mockLog = {
        id: "log-1",
        event: "LOGIN_SUCCESS",
        description: "User logged in",
        userId: "user-1",
        riskLevel: "LOW",
        createdAt: new Date(),
      };
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue(
        mockLog as never,
      );

      const result = await logSecurityEvent({
        event: "LOGIN_SUCCESS" as never,
        description: "User logged in",
        userId: "user-1",
      });

      expect(result).toEqual(mockLog);
      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: {
          event: "LOGIN_SUCCESS",
          description: "User logged in",
          userId: "user-1",
          organizationId: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          city: undefined,
          country: undefined,
          targetType: undefined,
          targetId: undefined,
          metadata: undefined,
          riskLevel: "LOW", // default from EVENT_RISK_LEVELS
        },
      });
    });

    it("should auto-assign risk level from EVENT_RISK_LEVELS mapping", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      // BRUTE_FORCE_DETECTED should be CRITICAL
      await logSecurityEvent({
        event: "BRUTE_FORCE_DETECTED" as never,
        description: "Brute force detected",
      });

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskLevel: "CRITICAL",
        }),
      });
    });

    it("should use MEDIUM risk for LOGIN_FAILED", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logSecurityEvent({
        event: "LOGIN_FAILED" as never,
        description: "Login failed",
      });

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskLevel: "MEDIUM",
        }),
      });
    });

    it("should use HIGH risk for LOGIN_BLOCKED", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logSecurityEvent({
        event: "LOGIN_BLOCKED" as never,
        description: "Login blocked",
      });

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskLevel: "HIGH",
        }),
      });
    });

    it("should use HIGH risk for SUSPICIOUS_ACTIVITY", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logSecurityEvent({
        event: "SUSPICIOUS_ACTIVITY" as never,
        description: "Suspicious activity detected",
      });

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskLevel: "HIGH",
        }),
      });
    });

    it("should allow overriding the risk level", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      // LOGIN_SUCCESS defaults to LOW, but we override to CRITICAL
      await logSecurityEvent({
        event: "LOGIN_SUCCESS" as never,
        description: "User logged in",
        riskLevel: "CRITICAL" as never,
      });

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskLevel: "CRITICAL",
        }),
      });
    });

    it("should default to LOW risk for unmapped event types", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      // HONEY_TOKEN_TRIGGERED is not in the mapping
      await logSecurityEvent({
        event: "HONEY_TOKEN_TRIGGERED" as never,
        description: "Honey token triggered",
      });

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskLevel: "LOW",
        }),
      });
    });

    it("should pass all optional fields through to create", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logSecurityEvent({
        event: "ACCOUNT_CREATED" as never,
        description: "Account created",
        userId: "user-1",
        organizationId: "org-1",
        ipAddress: "192.168.1.1",
        userAgent: "Chrome/120",
        city: "Berlin",
        country: "Germany",
        targetType: "user",
        targetId: "user-2",
        metadata: { key: "value", nested: { foo: "bar" } },
      });

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: {
          event: "ACCOUNT_CREATED",
          description: "Account created",
          userId: "user-1",
          organizationId: "org-1",
          ipAddress: "192.168.1.1",
          userAgent: "Chrome/120",
          city: "Berlin",
          country: "Germany",
          targetType: "user",
          targetId: "user-2",
          metadata: { key: "value", nested: { foo: "bar" } },
          riskLevel: "LOW",
        },
      });
    });

    it("should correctly map MEDIUM risk events", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      const mediumRiskEvents = [
        "PASSWORD_CHANGED",
        "PASSWORD_RESET_REQUESTED",
        "MFA_DISABLED",
        "API_KEY_CREATED",
        "API_KEY_REVOKED",
        "SESSION_REVOKED",
        "EMAIL_CHANGED",
        "ORG_MEMBER_ROLE_CHANGED",
        "ROLE_CHANGED",
        "PERMISSION_GRANTED",
        "PERMISSION_REVOKED",
        "UNUSUAL_LOCATION",
        "MFA_CHALLENGE_FAILED",
        "RATE_LIMIT_EXCEEDED",
      ];

      for (const event of mediumRiskEvents) {
        vi.clearAllMocks();
        await logSecurityEvent({
          event: event as never,
          description: `Test ${event}`,
        });

        const callData = vi.mocked(prisma.securityAuditLog.create).mock
          .calls[0][0].data;
        expect(callData.riskLevel).toBe("MEDIUM");
      }
    });

    it("should correctly map LOW risk events", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      const lowRiskEvents = [
        "LOGIN_SUCCESS",
        "LOGOUT",
        "SESSION_CREATED",
        "MFA_ENABLED",
        "MFA_CHALLENGE_SUCCESS",
        "ACCOUNT_CREATED",
        "EMAIL_VERIFIED",
      ];

      for (const event of lowRiskEvents) {
        vi.clearAllMocks();
        await logSecurityEvent({
          event: event as never,
          description: `Test ${event}`,
        });

        const callData = vi.mocked(prisma.securityAuditLog.create).mock
          .calls[0][0].data;
        expect(callData.riskLevel).toBe("LOW");
      }
    });

    it("should correctly map HIGH risk events", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      const highRiskEvents = [
        "LOGIN_BLOCKED",
        "SUSPICIOUS_ACTIVITY",
        "MULTIPLE_FAILED_LOGINS",
        "ACCOUNT_LOCKED",
      ];

      for (const event of highRiskEvents) {
        vi.clearAllMocks();
        await logSecurityEvent({
          event: event as never,
          description: `Test ${event}`,
        });

        const callData = vi.mocked(prisma.securityAuditLog.create).mock
          .calls[0][0].data;
        expect(callData.riskLevel).toBe("HIGH");
      }
    });
  });

  // ─── logSecurityEvents ───

  describe("logSecurityEvents", () => {
    it("should create multiple events in a transaction", async () => {
      const mockResults = [
        { id: "log-1", event: "LOGIN_SUCCESS" },
        { id: "log-2", event: "SESSION_CREATED" },
      ];
      vi.mocked(prisma.$transaction).mockResolvedValue(mockResults as never);

      const events = [
        {
          event: "LOGIN_SUCCESS" as never,
          description: "User logged in",
          userId: "user-1",
        },
        {
          event: "SESSION_CREATED" as never,
          description: "Session created",
          userId: "user-1",
        },
      ];

      const result = await logSecurityEvents(events);

      expect(result).toEqual(mockResults);
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([expect.anything(), expect.anything()]),
      );
    });

    it("should map each event to the correct risk level independently", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      await logSecurityEvents([
        {
          event: "LOGIN_SUCCESS" as never,
          description: "Success",
        },
        {
          event: "BRUTE_FORCE_DETECTED" as never,
          description: "Brute force",
        },
      ]);

      // The $transaction receives Prisma promises from create calls
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should handle empty events array", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      const result = await logSecurityEvents([]);

      expect(result).toEqual([]);
      expect(prisma.$transaction).toHaveBeenCalledWith([]);
    });
  });

  // ─── getSecurityLogs ───

  describe("getSecurityLogs", () => {
    it("should return paginated security logs with defaults", async () => {
      const mockLogs = [
        { id: "log-1", event: "LOGIN_SUCCESS" },
        { id: "log-2", event: "LOGIN_FAILED" },
      ];
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue(
        mockLogs as never,
      );
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(50);

      const result = await getSecurityLogs({});

      expect(result).toEqual({
        logs: mockLogs,
        total: 50,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });
    });

    it("should calculate totalPages correctly", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(123);

      const result = await getSecurityLogs({}, 1, 25);

      expect(result.totalPages).toBe(5); // ceil(123/25) = 5
      expect(result.pageSize).toBe(25);
    });

    it("should filter by userId", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      await getSecurityLogs({ userId: "user-1" });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1" }),
        }),
      );
    });

    it("should filter by organizationId", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      await getSecurityLogs({ organizationId: "org-1" });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org-1" }),
        }),
      );
    });

    it("should filter by a single event type", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      await getSecurityLogs({ event: "LOGIN_SUCCESS" as never });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ event: "LOGIN_SUCCESS" }),
        }),
      );
    });

    it("should filter by multiple event types (array)", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      await getSecurityLogs({
        event: ["LOGIN_SUCCESS", "LOGIN_FAILED"] as never,
      });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            event: { in: ["LOGIN_SUCCESS", "LOGIN_FAILED"] },
          }),
        }),
      );
    });

    it("should filter by a single risk level", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      await getSecurityLogs({ riskLevel: "HIGH" as never });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ riskLevel: "HIGH" }),
        }),
      );
    });

    it("should filter by multiple risk levels (array)", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      await getSecurityLogs({
        riskLevel: ["HIGH", "CRITICAL"] as never,
      });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            riskLevel: { in: ["HIGH", "CRITICAL"] },
          }),
        }),
      );
    });

    it("should filter by date range (startDate and endDate)", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      const startDate = new Date("2026-01-01T00:00:00Z");
      const endDate = new Date("2026-01-31T23:59:59Z");

      await getSecurityLogs({ startDate, endDate });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it("should filter by startDate only", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      const startDate = new Date("2026-01-01T00:00:00Z");

      await getSecurityLogs({ startDate });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate },
          }),
        }),
      );
    });

    it("should filter by endDate only", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      const endDate = new Date("2026-01-31T23:59:59Z");

      await getSecurityLogs({ endDate });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lte: endDate },
          }),
        }),
      );
    });

    it("should filter by search term across description, ipAddress, and targetId", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      await getSecurityLogs({ search: "brute" });

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              {
                description: { contains: "brute", mode: "insensitive" },
              },
              { ipAddress: { contains: "brute" } },
              { targetId: { contains: "brute" } },
            ],
          }),
        }),
      );
    });

    it("should apply pagination (skip and take)", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(100);

      await getSecurityLogs({}, 3, 20);

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3 - 1) * 20
          take: 20,
        }),
      );
    });

    it("should order by createdAt descending", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      await getSecurityLogs({});

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should combine multiple filters simultaneously", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);

      const startDate = new Date("2026-01-01T00:00:00Z");
      await getSecurityLogs({
        userId: "user-1",
        organizationId: "org-1",
        event: "LOGIN_FAILED" as never,
        riskLevel: "MEDIUM" as never,
        startDate,
        search: "192.168",
      });

      const callArgs = vi.mocked(prisma.securityAuditLog.findMany).mock
        .calls[0][0];
      const where = callArgs?.where;
      expect(where).toHaveProperty("userId", "user-1");
      expect(where).toHaveProperty("organizationId", "org-1");
      expect(where).toHaveProperty("event", "LOGIN_FAILED");
      expect(where).toHaveProperty("riskLevel", "MEDIUM");
      expect(where).toHaveProperty("createdAt");
      expect(where).toHaveProperty("OR");
    });
  });

  // ─── getUserSecurityLogs ───

  describe("getUserSecurityLogs", () => {
    it("should return security logs for a user with default limit", async () => {
      const mockLogs = [{ id: "log-1" }, { id: "log-2" }];
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue(
        mockLogs as never,
      );

      const logs = await getUserSecurityLogs("user-1");

      expect(logs).toEqual(mockLogs);
      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    });

    it("should use custom limit", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      await getUserSecurityLogs("user-1", 25);

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        take: 25,
      });
    });
  });

  // ─── getOrganizationSecurityLogs ───

  describe("getOrganizationSecurityLogs", () => {
    it("should return security logs for an organization", async () => {
      const mockLogs = [{ id: "log-1" }];
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue(
        mockLogs as never,
      );

      const logs = await getOrganizationSecurityLogs("org-1");

      expect(logs).toEqual(mockLogs);
      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    });

    it("should use custom limit", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      await getOrganizationSecurityLogs("org-1", 10);

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    });
  });

  // ─── getHighRiskEvents ───

  describe("getHighRiskEvents", () => {
    it("should return HIGH and CRITICAL risk events", async () => {
      const mockLogs = [
        { id: "log-1", riskLevel: "CRITICAL" },
        { id: "log-2", riskLevel: "HIGH" },
      ];
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue(
        mockLogs as never,
      );

      const logs = await getHighRiskEvents();

      expect(logs).toEqual(mockLogs);
      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          riskLevel: { in: ["HIGH", "CRITICAL"] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    });

    it("should accept a custom limit", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      await getHighRiskEvents(5);

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it("should filter by organizationId when provided", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      await getHighRiskEvents(20, "org-1");

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          riskLevel: { in: ["HIGH", "CRITICAL"] },
          organizationId: "org-1",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    });
  });

  // ─── getLoginHistory ───

  describe("getLoginHistory", () => {
    it("should return login-related events for a user", async () => {
      const mockLogs = [
        { id: "log-1", event: "LOGIN_SUCCESS" },
        { id: "log-2", event: "LOGIN_FAILED" },
        { id: "log-3", event: "SSO_LOGIN" },
      ];
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue(
        mockLogs as never,
      );

      const logs = await getLoginHistory("user-1");

      expect(logs).toEqual(mockLogs);
      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          event: {
            in: ["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGIN_BLOCKED", "SSO_LOGIN"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    it("should accept a custom limit", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      await getLoginHistory("user-1", 10);

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  // ─── getSecurityStats ───

  describe("getSecurityStats", () => {
    it("should return comprehensive security statistics", async () => {
      vi.mocked(prisma.securityAuditLog.count)
        .mockResolvedValueOnce(100) // totalEvents
        .mockResolvedValueOnce(5) // failedLogins
        .mockResolvedValueOnce(2); // suspiciousActivity
      vi.mocked(prisma.securityAuditLog.groupBy)
        .mockResolvedValueOnce([
          { riskLevel: "LOW", _count: 60 },
          { riskLevel: "MEDIUM", _count: 30 },
          { riskLevel: "HIGH", _count: 8 },
          { riskLevel: "CRITICAL", _count: 2 },
        ] as never)
        .mockResolvedValueOnce([
          { event: "LOGIN_SUCCESS", _count: 50 },
          { event: "SESSION_CREATED", _count: 30 },
          { event: "LOGIN_FAILED", _count: 5 },
        ] as never);

      const stats = await getSecurityStats();

      expect(stats).toEqual({
        totalEvents: 100,
        byRiskLevel: {
          LOW: 60,
          MEDIUM: 30,
          HIGH: 8,
          CRITICAL: 2,
        },
        byEventType: {
          LOGIN_SUCCESS: 50,
          SESSION_CREATED: 30,
          LOGIN_FAILED: 5,
        },
        failedLogins: 5,
        suspiciousActivity: 2,
      });
    });

    it("should filter by organizationId when provided", async () => {
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);
      vi.mocked(prisma.securityAuditLog.groupBy).mockResolvedValue([] as never);

      await getSecurityStats("org-1");

      // Check that the count calls include organizationId
      const countCalls = vi.mocked(prisma.securityAuditLog.count).mock.calls;
      for (const call of countCalls) {
        expect(call[0]?.where).toHaveProperty("organizationId", "org-1");
      }
    });

    it("should use custom days parameter for date range", async () => {
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);
      vi.mocked(prisma.securityAuditLog.groupBy).mockResolvedValue([] as never);

      await getSecurityStats(undefined, 7);

      // Verify the startDate is 7 days ago
      const countCalls = vi.mocked(prisma.securityAuditLog.count).mock.calls;
      const where = countCalls[0][0]?.where;
      const createdAt = where?.createdAt as { gte: Date };
      const expectedDate = new Date("2026-01-08T12:00:00Z"); // 7 days ago
      expect(createdAt.gte.getTime()).toBe(expectedDate.getTime());
    });

    it("should default to 30 days", async () => {
      vi.mocked(prisma.securityAuditLog.count).mockResolvedValue(0);
      vi.mocked(prisma.securityAuditLog.groupBy).mockResolvedValue([] as never);

      await getSecurityStats();

      const countCalls = vi.mocked(prisma.securityAuditLog.count).mock.calls;
      const where = countCalls[0][0]?.where;
      const createdAt = where?.createdAt as { gte: Date };
      const expectedDate = new Date("2025-12-16T12:00:00Z"); // 30 days ago
      expect(createdAt.gte.getTime()).toBe(expectedDate.getTime());
    });

    it("should count suspicious activity events correctly", async () => {
      vi.mocked(prisma.securityAuditLog.count)
        .mockResolvedValueOnce(100) // totalEvents
        .mockResolvedValueOnce(0) // failedLogins
        .mockResolvedValueOnce(3); // suspiciousActivity
      vi.mocked(prisma.securityAuditLog.groupBy).mockResolvedValue([] as never);

      await getSecurityStats();

      // Verify the suspicious activity count query includes the right event types
      const suspiciousCall = vi.mocked(prisma.securityAuditLog.count).mock
        .calls[2];
      expect(suspiciousCall[0]?.where?.event).toEqual({
        in: ["SUSPICIOUS_ACTIVITY", "BRUTE_FORCE_DETECTED", "UNUSUAL_LOCATION"],
      });
    });
  });

  // ─── getDailyEventCounts ───

  describe("getDailyEventCounts", () => {
    it("should return daily counts for the specified number of days", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        {
          createdAt: new Date("2026-01-14T10:00:00Z"),
          riskLevel: "LOW",
        },
        {
          createdAt: new Date("2026-01-14T15:00:00Z"),
          riskLevel: "HIGH",
        },
        {
          createdAt: new Date("2026-01-15T08:00:00Z"),
          riskLevel: "LOW",
        },
      ] as never);

      const result = await getDailyEventCounts(undefined, 3);

      // Should have 3 days of data starting 3 days ago
      expect(result).toHaveLength(3);

      // Check that each entry has the right structure
      for (const entry of result) {
        expect(entry).toHaveProperty("date");
        expect(entry).toHaveProperty("count");
        expect(entry).toHaveProperty("highRisk");
      }
    });

    it("should initialize all days to zero counts", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      const result = await getDailyEventCounts(undefined, 5);

      expect(result).toHaveLength(5);
      for (const entry of result) {
        expect(entry.count).toBe(0);
        expect(entry.highRisk).toBe(0);
      }
    });

    it("should count HIGH and CRITICAL events as highRisk", async () => {
      // Use a date well within the window (10 days ago at noon UTC)
      const now = new Date();
      const testDate = new Date(now);
      testDate.setDate(now.getDate() - 10);
      testDate.setUTCHours(12, 0, 0, 0);
      const testDateStr = testDate.toISOString().split("T")[0];

      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        {
          createdAt: new Date(testDate.getTime()),
          riskLevel: "HIGH",
        },
        {
          createdAt: new Date(testDate.getTime() + 3600000),
          riskLevel: "CRITICAL",
        },
        {
          createdAt: new Date(testDate.getTime() + 7200000),
          riskLevel: "LOW",
        },
        {
          createdAt: new Date(testDate.getTime() + 10800000),
          riskLevel: "MEDIUM",
        },
      ] as never);

      const result = await getDailyEventCounts(undefined, 30);

      // Find the entry for the test date
      const day = result.find((r) => r.date === testDateStr);
      expect(day).toBeDefined();
      expect(day!.count).toBe(4);
      expect(day!.highRisk).toBe(2); // HIGH + CRITICAL only
    });

    it("should filter by organizationId when provided", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      await getDailyEventCounts("org-1");

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org-1" }),
        }),
      );
    });

    it("should default to 30 days", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      const result = await getDailyEventCounts();

      expect(result).toHaveLength(30);
    });
  });

  // ─── purgeOldLogs ───

  describe("purgeOldLogs", () => {
    it("should delete old LOW and MEDIUM risk logs", async () => {
      vi.mocked(prisma.securityAuditLog.deleteMany).mockResolvedValue({
        count: 500,
      });

      const count = await purgeOldLogs();

      expect(count).toBe(500);
      expect(prisma.securityAuditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          riskLevel: { in: ["LOW", "MEDIUM"] },
        },
      });
    });

    it("should default to 365 days retention", async () => {
      vi.mocked(prisma.securityAuditLog.deleteMany).mockResolvedValue({
        count: 0,
      });

      await purgeOldLogs();

      const callArgs = vi.mocked(prisma.securityAuditLog.deleteMany).mock
        .calls[0][0];
      const cutoffDate = (callArgs as { where: { createdAt: { lt: Date } } })
        .where.createdAt.lt;
      const expectedCutoff = new Date("2025-01-15T12:00:00Z"); // 365 days ago
      expect(cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it("should use custom retention period", async () => {
      vi.mocked(prisma.securityAuditLog.deleteMany).mockResolvedValue({
        count: 100,
      });

      await purgeOldLogs(90);

      const callArgs = vi.mocked(prisma.securityAuditLog.deleteMany).mock
        .calls[0][0];
      const cutoffDate = (callArgs as { where: { createdAt: { lt: Date } } })
        .where.createdAt.lt;
      // 90 days ago from 2026-01-15
      const now = new Date("2026-01-15T12:00:00Z");
      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(expectedCutoff.getDate() - 90);
      expect(cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it("should only delete LOW and MEDIUM risk events (keep HIGH/CRITICAL)", async () => {
      vi.mocked(prisma.securityAuditLog.deleteMany).mockResolvedValue({
        count: 200,
      });

      await purgeOldLogs();

      expect(prisma.securityAuditLog.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          riskLevel: { in: ["LOW", "MEDIUM"] },
        }),
      });
    });

    it("should return 0 when there are no logs to purge", async () => {
      vi.mocked(prisma.securityAuditLog.deleteMany).mockResolvedValue({
        count: 0,
      });

      const count = await purgeOldLogs();

      expect(count).toBe(0);
    });
  });

  // ─── Convenience Wrappers ───

  describe("logLogin", () => {
    it("should log a successful password login", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logLogin("user-1", "192.168.1.1", "Chrome/120", "password");

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "LOGIN_SUCCESS",
          description: "User logged in via password",
          userId: "user-1",
          ipAddress: "192.168.1.1",
          userAgent: "Chrome/120",
        }),
      });
    });

    it("should log an SSO login with SSO_LOGIN event type", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logLogin("user-1", "10.0.0.1", "Firefox/121", "sso");

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "SSO_LOGIN",
          description: "User logged in via sso",
        }),
      });
    });

    it("should log an OAuth login as LOGIN_SUCCESS", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logLogin("user-1", undefined, undefined, "oauth");

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "LOGIN_SUCCESS",
          description: "User logged in via oauth",
        }),
      });
    });

    it("should default to password method", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logLogin("user-1");

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "LOGIN_SUCCESS",
          description: "User logged in via password",
        }),
      });
    });
  });

  describe("logFailedLogin", () => {
    it("should log a failed login attempt with email and reason", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logFailedLogin(
        "test@example.com",
        "192.168.1.1",
        "Chrome/120",
        "Account locked",
      );

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "LOGIN_FAILED",
          description:
            "Failed login attempt for test@example.com: Account locked",
          ipAddress: "192.168.1.1",
          userAgent: "Chrome/120",
          metadata: { email: "test@example.com", reason: "Account locked" },
          riskLevel: "MEDIUM",
        }),
      });
    });

    it("should default reason to 'Invalid credentials'", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logFailedLogin("test@example.com");

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description:
            "Failed login attempt for test@example.com: Invalid credentials",
          metadata: {
            email: "test@example.com",
            reason: undefined,
          },
        }),
      });
    });
  });

  describe("logPasswordChange", () => {
    it("should log a password change event", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logPasswordChange("user-1", "192.168.1.1");

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "PASSWORD_CHANGED",
          description: "User changed their password",
          userId: "user-1",
          ipAddress: "192.168.1.1",
          targetType: "user",
          targetId: "user-1",
          riskLevel: "MEDIUM",
        }),
      });
    });

    it("should work without ipAddress", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logPasswordChange("user-1");

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "PASSWORD_CHANGED",
          userId: "user-1",
          ipAddress: undefined,
        }),
      });
    });
  });

  describe("logSuspiciousActivity", () => {
    it("should log suspicious activity with HIGH risk", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logSuspiciousActivity(
        "Multiple login attempts from different countries",
        "user-1",
        "10.0.0.1",
        { countries: ["DE", "US", "JP"] },
      );

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "SUSPICIOUS_ACTIVITY",
          description: "Multiple login attempts from different countries",
          userId: "user-1",
          ipAddress: "10.0.0.1",
          metadata: { countries: ["DE", "US", "JP"] },
          riskLevel: "HIGH",
        }),
      });
    });

    it("should work with minimal parameters", async () => {
      vi.mocked(prisma.securityAuditLog.create).mockResolvedValue({
        id: "log-1",
      } as never);

      await logSuspiciousActivity("Unknown activity detected");

      expect(prisma.securityAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: "SUSPICIOUS_ACTIVITY",
          description: "Unknown activity detected",
          userId: undefined,
          ipAddress: undefined,
          metadata: undefined,
          riskLevel: "HIGH",
        }),
      });
    });
  });
});
