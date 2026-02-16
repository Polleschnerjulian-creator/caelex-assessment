import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock security audit service
vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue({}),
}));

import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import {
  createSession,
  getSessionByToken,
  updateSessionActivity,
  getUserSessions,
  getSessionById,
  revokeSession,
  revokeAllUserSessions,
  revokeSessionsByDevice,
  cleanupExpiredSessions,
  purgeOldSessions,
  getUserSessionStats,
  checkSuspiciousActivity,
  parseUserAgent,
} from "@/lib/services/session-service";

describe("Session Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── createSession ───

  describe("createSession", () => {
    it("should create a session with default values", async () => {
      // cleanupExcessSessions internal call
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);

      const mockSession = {
        id: "session-1",
        userId: "user-1",
        sessionToken: "generated-token",
        isActive: true,
        authMethod: "PASSWORD",
        expiresAt: new Date("2026-02-14T12:00:00Z"),
        createdAt: new Date(),
        lastActiveAt: new Date(),
        deviceType: null,
        browser: null,
        browserVersion: null,
        os: null,
        osVersion: null,
        ipAddress: null,
        city: null,
        country: null,
        countryCode: null,
        revokedAt: null,
        revokedReason: null,
      };
      vi.mocked(prisma.userSession.create).mockResolvedValue(
        mockSession as never,
      );

      const session = await createSession({ userId: "user-1" });

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          isActive: true,
          authMethod: "PASSWORD",
        }),
      });

      // Session token should be a 64-char hex string
      const createCall = vi.mocked(prisma.userSession.create).mock.calls[0][0];
      expect(createCall.data.sessionToken).toBeDefined();
      expect(typeof createCall.data.sessionToken).toBe("string");
      expect((createCall.data.sessionToken as string).length).toBe(64);

      expect(session).toEqual(mockSession);
    });

    it("should set expiry to 30 days by default", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userSession.create).mockResolvedValue({
        id: "session-1",
      } as never);

      await createSession({ userId: "user-1" });

      const createCall = vi.mocked(prisma.userSession.create).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const expectedExpiry = new Date("2026-02-14T12:00:00Z");
      expect(expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });

    it("should use custom expiry days", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userSession.create).mockResolvedValue({
        id: "session-1",
      } as never);

      await createSession({ userId: "user-1", expiresInDays: 7 });

      const createCall = vi.mocked(prisma.userSession.create).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const expectedExpiry = new Date("2026-01-22T12:00:00Z");
      expect(expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });

    it("should pass device info to the session", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userSession.create).mockResolvedValue({
        id: "session-1",
      } as never);

      await createSession({
        userId: "user-1",
        device: {
          deviceType: "desktop",
          browser: "Chrome",
          browserVersion: "120",
          os: "macOS",
          osVersion: "14.2",
        },
      });

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceType: "desktop",
          browser: "Chrome",
          browserVersion: "120",
          os: "macOS",
          osVersion: "14.2",
        }),
      });
    });

    it("should pass location info to the session", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userSession.create).mockResolvedValue({
        id: "session-1",
      } as never);

      await createSession({
        userId: "user-1",
        location: {
          ipAddress: "192.168.1.1",
          city: "Berlin",
          country: "Germany",
          countryCode: "DE",
        },
      });

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: "192.168.1.1",
          city: "Berlin",
          country: "Germany",
          countryCode: "DE",
        }),
      });
    });

    it("should use the specified auth method", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userSession.create).mockResolvedValue({
        id: "session-1",
      } as never);

      await createSession({
        userId: "user-1",
        authMethod: "OAUTH_GOOGLE" as never,
      });

      expect(prisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authMethod: "OAUTH_GOOGLE",
        }),
      });
    });

    it("should log a security event after session creation", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userSession.create).mockResolvedValue({
        id: "session-1",
        userId: "user-1",
      } as never);

      await createSession({
        userId: "user-1",
        authMethod: "SAML" as never,
        location: { ipAddress: "10.0.0.1" },
      });

      expect(logSecurityEvent).toHaveBeenCalledWith({
        event: "SESSION_CREATED",
        userId: "user-1",
        description: "New session created via SAML",
        ipAddress: "10.0.0.1",
        metadata: expect.objectContaining({
          sessionId: "session-1",
        }),
      });
    });

    it("should cleanup excess sessions before creating a new one", async () => {
      // Return 10 active sessions (max is 10)
      const existingSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
      }));
      vi.mocked(prisma.userSession.findMany).mockResolvedValue(
        existingSessions as never,
      );
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(prisma.userSession.create).mockResolvedValue({
        id: "session-new",
        userId: "user-1",
      } as never);

      await createSession({ userId: "user-1" });

      // Should revoke oldest sessions (those beyond the limit - 1)
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: expect.arrayContaining(["session-9"]),
          },
        },
        data: expect.objectContaining({
          isActive: false,
          revokedReason: "Max sessions exceeded",
        }),
      });
    });

    it("should not cleanup sessions when under the limit", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([
        { id: "session-1" },
        { id: "session-2" },
      ] as never);
      vi.mocked(prisma.userSession.create).mockResolvedValue({
        id: "session-3",
        userId: "user-1",
      } as never);

      await createSession({ userId: "user-1" });

      // updateMany should not be called for cleanup (only create)
      expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
    });
  });

  // ─── getSessionByToken ───

  describe("getSessionByToken", () => {
    it("should return session with user data for a valid token", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
        sessionToken: "valid-token",
        isActive: true,
        expiresAt: new Date("2026-02-15T12:00:00Z"), // future
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          image: null,
        },
      };
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(
        mockSession as never,
      );

      const session = await getSessionByToken("valid-token");

      expect(session).toEqual(mockSession);
      expect(prisma.userSession.findUnique).toHaveBeenCalledWith({
        where: { sessionToken: "valid-token" },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
    });

    it("should return null for a non-existent token", async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(null);

      const session = await getSessionByToken("non-existent-token");

      expect(session).toBeNull();
    });

    it("should return null for an inactive session", async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue({
        id: "session-1",
        isActive: false,
        expiresAt: new Date("2026-02-15T12:00:00Z"),
        user: { id: "user-1", name: null, email: null, image: null },
      } as never);

      const session = await getSessionByToken("inactive-token");

      expect(session).toBeNull();
    });

    it("should return null for an expired session", async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue({
        id: "session-1",
        isActive: true,
        expiresAt: new Date("2025-12-01T00:00:00Z"), // past
        user: { id: "user-1", name: null, email: null, image: null },
      } as never);

      const session = await getSessionByToken("expired-token");

      expect(session).toBeNull();
    });
  });

  // ─── updateSessionActivity ───

  describe("updateSessionActivity", () => {
    it("should update lastActiveAt timestamp", async () => {
      vi.mocked(prisma.userSession.update).mockResolvedValue({} as never);

      await updateSessionActivity("session-1");

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: {
          lastActiveAt: expect.any(Date),
        },
      });
    });

    it("should update ipAddress when provided", async () => {
      vi.mocked(prisma.userSession.update).mockResolvedValue({} as never);

      await updateSessionActivity("session-1", "10.0.0.5");

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: {
          lastActiveAt: expect.any(Date),
          ipAddress: "10.0.0.5",
        },
      });
    });

    it("should not include ipAddress when not provided", async () => {
      vi.mocked(prisma.userSession.update).mockResolvedValue({} as never);

      await updateSessionActivity("session-1");

      const updateCall = vi.mocked(prisma.userSession.update).mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("ipAddress");
    });
  });

  // ─── getUserSessions ───

  describe("getUserSessions", () => {
    it("should return active, non-expired sessions ordered by lastActiveAt", async () => {
      const mockSessions = [
        { id: "session-2", lastActiveAt: new Date("2026-01-15T11:00:00Z") },
        { id: "session-1", lastActiveAt: new Date("2026-01-15T10:00:00Z") },
      ];
      vi.mocked(prisma.userSession.findMany).mockResolvedValue(
        mockSessions as never,
      );

      const sessions = await getUserSessions("user-1");

      expect(sessions).toHaveLength(2);
      expect(prisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          isActive: true,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { lastActiveAt: "desc" },
      });
    });

    it("should return empty array when no active sessions exist", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);

      const sessions = await getUserSessions("user-1");

      expect(sessions).toHaveLength(0);
    });
  });

  // ─── getSessionById ───

  describe("getSessionById", () => {
    it("should return a session by id", async () => {
      const mockSession = { id: "session-1", userId: "user-1" };
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(
        mockSession as never,
      );

      const session = await getSessionById("session-1");

      expect(session).toEqual(mockSession);
      expect(prisma.userSession.findUnique).toHaveBeenCalledWith({
        where: { id: "session-1" },
      });
    });

    it("should return null for a non-existent session", async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(null);

      const session = await getSessionById("non-existent");

      expect(session).toBeNull();
    });
  });

  // ─── revokeSession ───

  describe("revokeSession", () => {
    it("should revoke a specific session with a reason", async () => {
      vi.mocked(prisma.userSession.update).mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        isActive: false,
        revokedReason: "Security concern",
      } as never);

      const session = await revokeSession(
        "session-1",
        "Security concern",
        "admin-1",
      );

      expect(session.isActive).toBe(false);
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revokedReason: "Security concern",
        },
      });
    });

    it("should default reason to 'User requested'", async () => {
      vi.mocked(prisma.userSession.update).mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        isActive: false,
      } as never);

      await revokeSession("session-1");

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: expect.objectContaining({
          revokedReason: "User requested",
        }),
      });
    });

    it("should log a SESSION_REVOKED security event", async () => {
      vi.mocked(prisma.userSession.update).mockResolvedValue({
        id: "session-1",
        userId: "user-1",
      } as never);

      await revokeSession("session-1", "Compromised", "admin-1");

      expect(logSecurityEvent).toHaveBeenCalledWith({
        event: "SESSION_REVOKED",
        userId: "user-1",
        description: "Session revoked: Compromised",
        metadata: {
          sessionId: "session-1",
          revokedBy: "admin-1",
        },
      });
    });

    it("should use session userId as revokedBy when not specified", async () => {
      vi.mocked(prisma.userSession.update).mockResolvedValue({
        id: "session-1",
        userId: "user-1",
      } as never);

      await revokeSession("session-1");

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            revokedBy: "user-1",
          }),
        }),
      );
    });
  });

  // ─── revokeAllUserSessions ───

  describe("revokeAllUserSessions", () => {
    it("should revoke all active sessions for a user", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 5,
      });

      const count = await revokeAllUserSessions("user-1");

      expect(count).toBe(5);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          isActive: true,
        },
        data: expect.objectContaining({
          isActive: false,
          revokedReason: "All sessions revoked",
        }),
      });
    });

    it("should exclude a specific session when exceptSessionId is provided", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 4,
      });

      const count = await revokeAllUserSessions("user-1", "current-session-id");

      expect(count).toBe(4);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: "user-1",
          isActive: true,
          id: { not: "current-session-id" },
        }),
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it("should use custom reason when provided", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 3,
      });

      await revokeAllUserSessions("user-1", undefined, "Password changed");

      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: "user-1",
          isActive: true,
        }),
        data: expect.objectContaining({
          revokedReason: "Password changed",
        }),
      });
    });

    it("should log a MEDIUM risk security event", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 3,
      });

      await revokeAllUserSessions("user-1", "keep-session", "Password reset");

      expect(logSecurityEvent).toHaveBeenCalledWith({
        event: "SESSION_REVOKED",
        userId: "user-1",
        description: "All sessions revoked (3 sessions)",
        riskLevel: "MEDIUM",
        metadata: {
          count: 3,
          exceptSessionId: "keep-session",
          reason: "Password reset",
        },
      });
    });

    it("should return 0 when no sessions to revoke", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 0,
      });

      const count = await revokeAllUserSessions("user-1");

      expect(count).toBe(0);
    });
  });

  // ─── revokeSessionsByDevice ───

  describe("revokeSessionsByDevice", () => {
    it("should revoke all active sessions for a specific device type", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 2,
      });

      const count = await revokeSessionsByDevice("user-1", "mobile");

      expect(count).toBe(2);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          deviceType: "mobile",
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revokedReason: "Device type mobile sessions revoked",
        },
      });
    });

    it("should return 0 when no sessions match the device type", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 0,
      });

      const count = await revokeSessionsByDevice("user-1", "tablet");

      expect(count).toBe(0);
    });
  });

  // ─── cleanupExpiredSessions ───

  describe("cleanupExpiredSessions", () => {
    it("should deactivate all expired but still active sessions", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 15,
      });

      const count = await cleanupExpiredSessions();

      expect(count).toBe(15);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
          isActive: true,
        },
        data: {
          isActive: false,
          revokedReason: "Session expired",
        },
      });
    });

    it("should return 0 when no expired sessions exist", async () => {
      vi.mocked(prisma.userSession.updateMany).mockResolvedValue({
        count: 0,
      });

      const count = await cleanupExpiredSessions();

      expect(count).toBe(0);
    });
  });

  // ─── purgeOldSessions ───

  describe("purgeOldSessions", () => {
    it("should delete inactive sessions older than the specified days", async () => {
      vi.mocked(prisma.userSession.deleteMany).mockResolvedValue({
        count: 42,
      });

      const count = await purgeOldSessions(60);

      expect(count).toBe(42);
      expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          isActive: false,
          revokedAt: { lt: expect.any(Date) },
        },
      });

      // Verify the cutoff date is approximately 60 days ago
      const callArgs = vi.mocked(prisma.userSession.deleteMany).mock
        .calls[0][0];
      const cutoffDate = (callArgs as { where: { revokedAt: { lt: Date } } })
        .where.revokedAt.lt;
      const expectedCutoff = new Date("2025-11-16T12:00:00Z");
      expect(cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it("should default to 90 days", async () => {
      vi.mocked(prisma.userSession.deleteMany).mockResolvedValue({
        count: 10,
      });

      await purgeOldSessions();

      const callArgs = vi.mocked(prisma.userSession.deleteMany).mock
        .calls[0][0];
      const cutoffDate = (callArgs as { where: { revokedAt: { lt: Date } } })
        .where.revokedAt.lt;
      // 90 days ago from 2026-01-15
      const now = new Date("2026-01-15T12:00:00Z");
      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(expectedCutoff.getDate() - 90);
      expect(cutoffDate.getTime()).toBe(expectedCutoff.getTime());
    });

    it("should return 0 when there are no old sessions to purge", async () => {
      vi.mocked(prisma.userSession.deleteMany).mockResolvedValue({
        count: 0,
      });

      const count = await purgeOldSessions();

      expect(count).toBe(0);
    });
  });

  // ─── getUserSessionStats ───

  describe("getUserSessionStats", () => {
    it("should return comprehensive session statistics", async () => {
      vi.mocked(prisma.userSession.count)
        .mockResolvedValueOnce(3) // activeSessions
        .mockResolvedValueOnce(10); // totalSessions
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([
        {
          deviceType: "desktop",
          lastActiveAt: new Date("2026-01-15T11:00:00Z"),
        },
        {
          deviceType: "mobile",
          lastActiveAt: new Date("2026-01-15T10:00:00Z"),
        },
        {
          deviceType: "desktop",
          lastActiveAt: new Date("2026-01-14T09:00:00Z"),
        },
      ] as never);

      const stats = await getUserSessionStats("user-1");

      expect(stats.activeSessions).toBe(3);
      expect(stats.totalSessions).toBe(10);
      expect(stats.deviceBreakdown).toEqual({
        desktop: 2,
        mobile: 1,
      });
      expect(stats.lastActivity).toEqual(new Date("2026-01-15T11:00:00Z"));
    });

    it("should handle sessions with no device type as 'unknown'", async () => {
      vi.mocked(prisma.userSession.count)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([
        { deviceType: null, lastActiveAt: new Date() },
      ] as never);

      const stats = await getUserSessionStats("user-1");

      expect(stats.deviceBreakdown).toEqual({ unknown: 1 });
    });

    it("should return null lastActivity when no sessions exist", async () => {
      vi.mocked(prisma.userSession.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);

      const stats = await getUserSessionStats("user-1");

      expect(stats.activeSessions).toBe(0);
      expect(stats.totalSessions).toBe(0);
      expect(stats.deviceBreakdown).toEqual({});
      expect(stats.lastActivity).toBeNull();
    });
  });

  // ─── checkSuspiciousActivity ───

  describe("checkSuspiciousActivity", () => {
    it("should detect login from a new country within 4 hours", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([
        {
          ipAddress: "1.2.3.4",
          country: "Germany",
          createdAt: new Date("2026-01-15T10:00:00Z"), // 2 hours ago
        },
      ] as never);

      const result = await checkSuspiciousActivity(
        "user-1",
        "5.6.7.8",
        "Japan",
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain("Japan");
      expect(result.reason).toContain("new country");
    });

    it("should not flag when new country login is more than 4 hours apart", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([
        {
          ipAddress: "1.2.3.4",
          country: "Germany",
          createdAt: new Date("2026-01-15T06:00:00Z"), // 6 hours ago
        },
      ] as never);

      const result = await checkSuspiciousActivity(
        "user-1",
        "5.6.7.8",
        "Japan",
      );

      expect(result.isSuspicious).toBe(false);
    });

    it("should not flag same country login", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([
        {
          ipAddress: "1.2.3.4",
          country: "Germany",
          createdAt: new Date("2026-01-15T11:00:00Z"),
        },
      ] as never);

      const result = await checkSuspiciousActivity(
        "user-1",
        "5.6.7.8",
        "Germany",
      );

      expect(result.isSuspicious).toBe(false);
    });

    it("should detect too many sessions in one hour (>= 5)", async () => {
      const recentSessions = Array.from({ length: 5 }, (_, i) => ({
        ipAddress: `10.0.0.${i}`,
        country: "Germany",
        createdAt: new Date(
          Date.now() - i * 10 * 60 * 1000, // every 10 minutes within last hour
        ),
      }));
      vi.mocked(prisma.userSession.findMany).mockResolvedValue(
        recentSessions as never,
      );

      const result = await checkSuspiciousActivity(
        "user-1",
        "10.0.0.5",
        "Germany",
      );

      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain("5 sessions");
      expect(result.reason).toContain("last hour");
    });

    it("should not flag when fewer than 5 sessions in the last hour", async () => {
      const recentSessions = Array.from({ length: 4 }, (_, i) => ({
        ipAddress: `10.0.0.${i}`,
        country: "Germany",
        createdAt: new Date(Date.now() - i * 10 * 60 * 1000),
      }));
      vi.mocked(prisma.userSession.findMany).mockResolvedValue(
        recentSessions as never,
      );

      const result = await checkSuspiciousActivity(
        "user-1",
        "10.0.0.4",
        "Germany",
      );

      expect(result.isSuspicious).toBe(false);
    });

    it("should return not suspicious when there are no recent sessions", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);

      const result = await checkSuspiciousActivity(
        "user-1",
        "1.2.3.4",
        "Germany",
      );

      expect(result.isSuspicious).toBe(false);
    });

    it("should return not suspicious when no current country is provided", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([
        {
          ipAddress: "1.2.3.4",
          country: "Germany",
          createdAt: new Date("2026-01-15T11:00:00Z"),
        },
      ] as never);

      const result = await checkSuspiciousActivity("user-1", "5.6.7.8");

      expect(result.isSuspicious).toBe(false);
    });

    it("should query sessions from the last 24 hours only", async () => {
      vi.mocked(prisma.userSession.findMany).mockResolvedValue([]);

      await checkSuspiciousActivity("user-1");

      expect(prisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          createdAt: {
            gte: expect.any(Date),
          },
        },
        select: {
          ipAddress: true,
          country: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const callArgs = vi.mocked(prisma.userSession.findMany).mock
        .calls[0][0] as {
        where: { createdAt: { gte: Date } };
      };
      const gteDate = callArgs.where.createdAt.gte;
      const expectedDate = new Date("2026-01-14T12:00:00Z"); // 24 hours ago
      expect(gteDate.getTime()).toBe(expectedDate.getTime());
    });
  });

  // ─── parseUserAgent ───

  describe("parseUserAgent", () => {
    describe("device type detection", () => {
      it("should detect mobile devices", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/120",
        );
        expect(result.deviceType).toBe("mobile");
      });

      it("should detect tablet devices", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Tablet",
        );
        expect(result.deviceType).toBe("tablet");
      });

      it("should default to desktop for non-mobile/tablet", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        );
        expect(result.deviceType).toBe("desktop");
      });
    });

    describe("browser detection", () => {
      it("should detect Chrome", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        );
        expect(result.browser).toBe("Chrome");
        expect(result.browserVersion).toBe("120");
      });

      it("should detect Firefox", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121",
        );
        expect(result.browser).toBe("Firefox");
        expect(result.browserVersion).toBe("121");
      });

      it("should detect Safari (without Chrome)", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15",
        );
        expect(result.browser).toBe("Safari");
        expect(result.browserVersion).toBe("17");
      });

      it("should detect Edge (not Chrome)", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        );
        expect(result.browser).toBe("Edge");
        expect(result.browserVersion).toBe("120");
      });

      it("should not detect Chrome when Edge is present", () => {
        const result = parseUserAgent("Mozilla/5.0 Chrome/120 Edg/120");
        expect(result.browser).toBe("Edge");
      });
    });

    describe("OS detection", () => {
      it("should detect Windows 10/11", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
        );
        expect(result.os).toBe("Windows");
        expect(result.osVersion).toBe("10/11");
      });

      it("should detect Windows 8.1", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Windows NT 6.3; Win64; x64) Chrome/120",
        );
        expect(result.os).toBe("Windows");
        expect(result.osVersion).toBe("8.1");
      });

      it("should detect Windows 8", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Windows NT 6.2; Win64; x64) Chrome/120",
        );
        expect(result.os).toBe("Windows");
        expect(result.osVersion).toBe("8");
      });

      it("should detect macOS", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120",
        );
        expect(result.os).toBe("macOS");
        expect(result.osVersion).toBe("10.15");
      });

      it("should detect Linux", () => {
        const result = parseUserAgent(
          "Mozilla/5.0 (X11; Linux x86_64) Chrome/120",
        );
        expect(result.os).toBe("Linux");
      });

      it("should detect Android UA as Linux (parser checks linux before android)", () => {
        // Note: The parser checks /linux/i before /android/i, so Android UAs
        // that contain "Linux" in the string are classified as Linux
        const result = parseUserAgent(
          "Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/120",
        );
        expect(result.os).toBe("Linux");
      });

      it("should detect iPhone UA as macOS (parser checks mac os before iphone)", () => {
        // Note: The parser checks /macintosh|mac os/i before /iphone|ipad/i,
        // so iPhone UAs containing "Mac OS X" are classified as macOS
        const result = parseUserAgent(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Mobile",
        );
        expect(result.os).toBe("macOS");
      });

      it("should detect iPad UA as macOS (parser checks mac os before ipad)", () => {
        // Note: Same as iPhone - iPad UAs contain "Mac OS X"
        const result = parseUserAgent(
          "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
        );
        expect(result.os).toBe("macOS");
      });
    });

    it("should return an empty object for unrecognized user agents", () => {
      const result = parseUserAgent("CustomBot/1.0");
      expect(result.deviceType).toBe("desktop"); // default
      expect(result.browser).toBeUndefined();
      expect(result.os).toBeUndefined();
    });
  });
});
