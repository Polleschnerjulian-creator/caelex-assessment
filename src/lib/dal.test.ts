import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

// React cache must be mocked before dal.ts is imported so that
// getAuthenticatedUser is not memoised across test cases.
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    articleStatus: { findMany: vi.fn(), upsert: vi.fn() },
    checklistStatus: { findMany: vi.fn(), upsert: vi.fn() },
    authorizationWorkflow: { findMany: vi.fn(), findUnique: vi.fn() },
    debrisAssessment: { findMany: vi.fn() },
    cybersecurityAssessment: { findMany: vi.fn() },
    insuranceAssessment: { findMany: vi.fn() },
    environmentalAssessment: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    securityEvent: { findMany: vi.fn() },
  },
}));

// ─── Imports (after mocks) ───

import {
  UnauthorizedError,
  ForbiddenError,
  getAuthenticatedUser,
  requireRole,
  getCurrentUserProfile,
  getUserArticleStatuses,
  updateArticleStatus,
  getUserChecklistStatuses,
  updateChecklistStatus,
  getUserAuthorizationWorkflows,
  getAuthorizationWorkflowById,
  getUserDebrisAssessments,
  getUserCybersecurityAssessments,
  getUserInsuranceAssessments,
  getUserEnvironmentalAssessments,
  getAuditLogs,
  getSecurityEvents,
  toUserProfileDTO,
  toArticleStatusDTO,
} from "@/lib/dal";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Typed mock references ───

const mockAuth = vi.mocked(auth);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockArticleStatusFindMany = vi.mocked(prisma.articleStatus.findMany);
const mockArticleStatusUpsert = vi.mocked(prisma.articleStatus.upsert);
const mockChecklistStatusFindMany = vi.mocked(prisma.checklistStatus.findMany);
const mockChecklistStatusUpsert = vi.mocked(prisma.checklistStatus.upsert);
const mockAuthWorkflowFindMany = vi.mocked(
  prisma.authorizationWorkflow.findMany,
);
const mockAuthWorkflowFindUnique = vi.mocked(
  prisma.authorizationWorkflow.findUnique,
);
const mockDebrisFindMany = vi.mocked(prisma.debrisAssessment.findMany);
const mockCyberFindMany = vi.mocked(prisma.cybersecurityAssessment.findMany);
const mockInsuranceFindMany = vi.mocked(prisma.insuranceAssessment.findMany);
const mockEnvironmentalFindMany = vi.mocked(
  prisma.environmentalAssessment.findMany,
);
const mockAuditLogFindMany = vi.mocked(prisma.auditLog.findMany);
const mockSecurityEventFindMany = vi.mocked(prisma.securityEvent.findMany);

// ─── Helpers ───

/** Set up mocks so getAuthenticatedUser succeeds with the given user. */
function mockAuthenticatedUser(overrides: Record<string, unknown> = {}) {
  const user = {
    id: "user-1",
    email: "test@caelex.eu",
    name: "Test User",
    role: "user",
    isActive: true,
    ...overrides,
  };

  mockAuth.mockResolvedValue({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mfaRequired: false,
      mfaVerified: false,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as never);

  mockUserFindUnique.mockResolvedValue(user as never);

  return user;
}

/** Set up mocks so getAuthenticatedUser succeeds with an admin user. */
function mockAdminUser() {
  return mockAuthenticatedUser({ role: "admin" });
}

/** Set up mocks so getAuthenticatedUser succeeds with an auditor user. */
function mockAuditorUser() {
  return mockAuthenticatedUser({ role: "auditor" });
}

// ─── Tests ───

describe("dal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Error Classes ───

  describe("UnauthorizedError", () => {
    it("has the correct name", () => {
      const error = new UnauthorizedError();
      expect(error.name).toBe("UnauthorizedError");
    });

    it("has the default message UNAUTHORIZED", () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe("UNAUTHORIZED");
    });

    it("accepts a custom message", () => {
      const error = new UnauthorizedError("Custom message");
      expect(error.message).toBe("Custom message");
    });

    it("is an instance of Error", () => {
      const error = new UnauthorizedError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("ForbiddenError", () => {
    it("has the correct name", () => {
      const error = new ForbiddenError();
      expect(error.name).toBe("ForbiddenError");
    });

    it("has the default message FORBIDDEN", () => {
      const error = new ForbiddenError();
      expect(error.message).toBe("FORBIDDEN");
    });

    it("accepts a custom message", () => {
      const error = new ForbiddenError("No access");
      expect(error.message).toBe("No access");
    });

    it("is an instance of Error", () => {
      const error = new ForbiddenError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  // ─── getAuthenticatedUser ───

  describe("getAuthenticatedUser", () => {
    it("throws UnauthorizedError when there is no session", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getAuthenticatedUser()).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError when session has no user id", async () => {
      mockAuth.mockResolvedValue({ user: {} } as never);

      await expect(getAuthenticatedUser()).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError when MFA is required but not verified", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-1",
          mfaRequired: true,
          mfaVerified: false,
        },
      } as never);

      await expect(getAuthenticatedUser()).rejects.toThrow(
        "MFA verification required",
      );
    });

    it("throws UnauthorizedError when user is not found in DB", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-gone", mfaRequired: false },
      } as never);
      mockUserFindUnique.mockResolvedValue(null);

      await expect(getAuthenticatedUser()).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError when user is inactive", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", mfaRequired: false },
      } as never);
      mockUserFindUnique.mockResolvedValue({
        id: "user-1",
        email: "test@caelex.eu",
        name: "Test",
        role: "user",
        isActive: false,
      } as never);

      await expect(getAuthenticatedUser()).rejects.toThrow(
        "Account deactivated or not found",
      );
    });

    it("returns the authenticated user on success", async () => {
      const user = mockAuthenticatedUser();

      const result = await getAuthenticatedUser();

      expect(result).toEqual(
        expect.objectContaining({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: true,
        }),
      );
    });

    it("allows access when MFA is required and verified", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@caelex.eu",
          name: "Test",
          mfaRequired: true,
          mfaVerified: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      } as never);
      mockUserFindUnique.mockResolvedValue({
        id: "user-1",
        email: "test@caelex.eu",
        name: "Test",
        role: "user",
        isActive: true,
      } as never);

      const result = await getAuthenticatedUser();
      expect(result.id).toBe("user-1");
    });
  });

  // ─── requireRole ───

  describe("requireRole", () => {
    it("throws ForbiddenError when the user role is not in allowedRoles", async () => {
      mockAuthenticatedUser({ role: "user" });

      await expect(requireRole(["admin"])).rejects.toThrow(ForbiddenError);
    });

    it("returns the user when the role is in allowedRoles", async () => {
      const user = mockAuthenticatedUser({ role: "admin" });

      const result = await requireRole(["admin", "auditor"]);

      expect(result.id).toBe(user.id);
      expect(result.role).toBe("admin");
    });

    it("supports multiple allowed roles", async () => {
      mockAuthenticatedUser({ role: "auditor" });

      const result = await requireRole(["admin", "auditor"]);

      expect(result.role).toBe("auditor");
    });
  });

  // ─── getCurrentUserProfile ───

  describe("getCurrentUserProfile", () => {
    it("calls prisma.user.findUnique with the authenticated user id", async () => {
      const user = mockAuthenticatedUser();

      // After mockAuthenticatedUser set the first resolved value for the auth
      // check, queue a second resolved value for the profile query.
      const profileResult = {
        id: user.id,
        name: "Test",
        email: "test@caelex.eu",
        image: null,
        organization: "Caelex",
        operatorType: "SCO",
        establishmentCountry: "DE",
        isThirdCountry: false,
        createdAt: new Date(),
      };
      // The first findUnique call (from getAuthenticatedUser) is already set up
      // by mockAuthenticatedUser. Chain a second resolved value for the profile call.
      mockUserFindUnique.mockResolvedValueOnce(user as never);
      mockUserFindUnique.mockResolvedValueOnce(profileResult as never);

      await getCurrentUserProfile();

      // First call is from getAuthenticatedUser, second from getCurrentUserProfile
      expect(mockUserFindUnique).toHaveBeenCalledTimes(2);
      expect(mockUserFindUnique).toHaveBeenLastCalledWith({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          organization: true,
          operatorType: true,
          establishmentCountry: true,
          isThirdCountry: true,
          createdAt: true,
        },
      });
    });
  });

  // ─── getAuthorizationWorkflowById ───

  describe("getAuthorizationWorkflowById", () => {
    it("throws ForbiddenError when workflow belongs to a different user", async () => {
      mockAuthenticatedUser({ id: "user-1" });
      mockAuthWorkflowFindUnique.mockResolvedValue({
        id: "wf-1",
        userId: "user-other",
        documents: [],
      } as never);

      await expect(getAuthorizationWorkflowById("wf-1")).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("throws ForbiddenError when workflow does not exist", async () => {
      mockAuthenticatedUser({ id: "user-1" });
      mockAuthWorkflowFindUnique.mockResolvedValue(null);

      await expect(getAuthorizationWorkflowById("wf-missing")).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("returns the workflow when it belongs to the authenticated user", async () => {
      mockAuthenticatedUser({ id: "user-1" });
      const workflow = {
        id: "wf-1",
        userId: "user-1",
        documents: [{ id: "doc-1" }],
      };
      mockAuthWorkflowFindUnique.mockResolvedValue(workflow as never);

      const result = await getAuthorizationWorkflowById("wf-1");

      expect(result).toEqual(workflow);
    });
  });

  // ─── getAuditLogs ───

  describe("getAuditLogs", () => {
    it("throws ForbiddenError for a regular user", async () => {
      mockAuthenticatedUser({ role: "user" });

      await expect(getAuditLogs()).rejects.toThrow(ForbiddenError);
    });

    it("returns logs for an admin user", async () => {
      mockAdminUser();
      const logs = [{ id: "log-1", action: "CREATE" }];
      mockAuditLogFindMany.mockResolvedValue(logs as never);

      const result = await getAuditLogs();

      expect(result).toEqual(logs);
    });

    it("returns logs for an auditor user", async () => {
      mockAuditorUser();
      const logs = [{ id: "log-2", action: "UPDATE" }];
      mockAuditLogFindMany.mockResolvedValue(logs as never);

      const result = await getAuditLogs();

      expect(result).toEqual(logs);
    });

    it("caps the limit at 1000", async () => {
      mockAdminUser();
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditLogs({ limit: 5000 });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000,
        }),
      );
    });

    it("uses default limit of 100 when not specified", async () => {
      mockAdminUser();
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditLogs();

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it("passes filter options to prisma", async () => {
      mockAdminUser();
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditLogs({
        userId: "user-1",
        entityType: "Document",
        action: "CREATE",
        limit: 50,
        offset: 10,
      });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            entityType: "Document",
            action: "CREATE",
          },
          take: 50,
          skip: 10,
        }),
      );
    });
  });

  // ─── getSecurityEvents ───

  describe("getSecurityEvents", () => {
    it("throws ForbiddenError for a non-admin user", async () => {
      mockAuthenticatedUser({ role: "user" });

      await expect(getSecurityEvents()).rejects.toThrow(ForbiddenError);
    });

    it("throws ForbiddenError for an auditor (admin only)", async () => {
      mockAuditorUser();

      await expect(getSecurityEvents()).rejects.toThrow(ForbiddenError);
    });

    it("returns events for an admin user", async () => {
      mockAdminUser();
      const events = [{ id: "evt-1", type: "brute_force" }];
      mockSecurityEventFindMany.mockResolvedValue(events as never);

      const result = await getSecurityEvents();

      expect(result).toEqual(events);
    });
  });

  // ─── DTO Transformers ───

  describe("toUserProfileDTO", () => {
    it("maps all fields correctly", () => {
      const user = {
        id: "user-1",
        name: "Test User",
        email: "test@caelex.eu",
        organization: "Caelex GmbH",
        operatorType: "SCO",
      };

      const dto = toUserProfileDTO(user);

      expect(dto).toEqual({
        id: "user-1",
        name: "Test User",
        email: "test@caelex.eu",
        organization: "Caelex GmbH",
        operatorType: "SCO",
      });
    });

    it("handles null fields", () => {
      const user = {
        id: "user-2",
        name: null,
        email: null,
        organization: null,
        operatorType: null,
      };

      const dto = toUserProfileDTO(user);

      expect(dto).toEqual({
        id: "user-2",
        name: null,
        email: null,
        organization: null,
        operatorType: null,
      });
    });

    it("does not leak extra properties from the input", () => {
      const user = {
        id: "user-3",
        name: "Admin",
        email: "admin@caelex.eu",
        organization: "Caelex",
        operatorType: "LO",
        password: "secret-hash",
        isActive: true,
      } as Parameters<typeof toUserProfileDTO>[0] & {
        password: string;
        isActive: boolean;
      };

      const dto = toUserProfileDTO(user);

      expect(dto).not.toHaveProperty("password");
      expect(dto).not.toHaveProperty("isActive");
    });
  });

  describe("toArticleStatusDTO", () => {
    it("maps all fields correctly", () => {
      const now = new Date("2025-06-15T12:00:00Z");
      const status = {
        articleId: "art-42",
        status: "compliant",
        notes: "All good",
        updatedAt: now,
      };

      const dto = toArticleStatusDTO(status);

      expect(dto).toEqual({
        articleId: "art-42",
        status: "compliant",
        notes: "All good",
        updatedAt: now,
      });
    });

    it("handles null notes", () => {
      const dto = toArticleStatusDTO({
        articleId: "art-1",
        status: "not_started",
        notes: null,
        updatedAt: new Date(),
      });

      expect(dto.notes).toBeNull();
    });
  });

  // ─── Data Access Functions: Auth Verification ───

  describe("data access functions call getAuthenticatedUser", () => {
    it("getUserArticleStatuses calls auth", async () => {
      mockAuthenticatedUser();
      mockArticleStatusFindMany.mockResolvedValue([]);

      await getUserArticleStatuses();

      expect(mockAuth).toHaveBeenCalled();
      expect(mockUserFindUnique).toHaveBeenCalled();
    });

    it("getUserArticleStatuses throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getUserArticleStatuses()).rejects.toThrow(UnauthorizedError);
    });

    it("updateArticleStatus calls auth", async () => {
      mockAuthenticatedUser();
      mockArticleStatusUpsert.mockResolvedValue({} as never);

      await updateArticleStatus("art-1", { status: "compliant" });

      expect(mockAuth).toHaveBeenCalled();
    });

    it("updateArticleStatus throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(
        updateArticleStatus("art-1", { status: "compliant" }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("getUserChecklistStatuses calls auth", async () => {
      mockAuthenticatedUser();
      mockChecklistStatusFindMany.mockResolvedValue([]);

      await getUserChecklistStatuses();

      expect(mockAuth).toHaveBeenCalled();
    });

    it("getUserChecklistStatuses throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getUserChecklistStatuses()).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("updateChecklistStatus calls auth", async () => {
      mockAuthenticatedUser();
      mockChecklistStatusUpsert.mockResolvedValue({} as never);

      await updateChecklistStatus("cl-1", { completed: true });

      expect(mockAuth).toHaveBeenCalled();
    });

    it("updateChecklistStatus throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(
        updateChecklistStatus("cl-1", { completed: true }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("getUserAuthorizationWorkflows calls auth", async () => {
      mockAuthenticatedUser();
      mockAuthWorkflowFindMany.mockResolvedValue([]);

      await getUserAuthorizationWorkflows();

      expect(mockAuth).toHaveBeenCalled();
    });

    it("getUserAuthorizationWorkflows throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getUserAuthorizationWorkflows()).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("getUserDebrisAssessments calls auth", async () => {
      mockAuthenticatedUser();
      mockDebrisFindMany.mockResolvedValue([]);

      await getUserDebrisAssessments();

      expect(mockAuth).toHaveBeenCalled();
    });

    it("getUserDebrisAssessments throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getUserDebrisAssessments()).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("getUserCybersecurityAssessments calls auth", async () => {
      mockAuthenticatedUser();
      mockCyberFindMany.mockResolvedValue([]);

      await getUserCybersecurityAssessments();

      expect(mockAuth).toHaveBeenCalled();
    });

    it("getUserCybersecurityAssessments throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getUserCybersecurityAssessments()).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("getUserInsuranceAssessments calls auth", async () => {
      mockAuthenticatedUser();
      mockInsuranceFindMany.mockResolvedValue([]);

      await getUserInsuranceAssessments();

      expect(mockAuth).toHaveBeenCalled();
    });

    it("getUserInsuranceAssessments throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getUserInsuranceAssessments()).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("getUserEnvironmentalAssessments calls auth", async () => {
      mockAuthenticatedUser();
      mockEnvironmentalFindMany.mockResolvedValue([]);

      await getUserEnvironmentalAssessments();

      expect(mockAuth).toHaveBeenCalled();
    });

    it("getUserEnvironmentalAssessments throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getUserEnvironmentalAssessments()).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("getAuditLogs throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getAuditLogs()).rejects.toThrow(UnauthorizedError);
    });

    it("getSecurityEvents throws when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never);

      await expect(getSecurityEvents()).rejects.toThrow(UnauthorizedError);
    });
  });
});
