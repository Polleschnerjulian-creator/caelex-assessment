import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    organizationInvitation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock audit logging
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  generateSlug,
  getDefaultPermissionsForRole,
  hasPermission,
  getPlanLimits,
  isSlugAvailable,
  generateUniqueSlug,
  createOrganization,
  getOrganization,
  getOrganizationBySlug,
  updateOrganization,
  deleteOrganization,
  getUserOrganizations,
  getUserRole,
  addMember,
  updateMemberRole,
  removeMember,
  createInvitation,
  getInvitation,
  getOrganizationInvitations,
  acceptInvitation,
  cancelInvitation,
  resendInvitation,
  cleanupExpiredInvitations,
} from "@/lib/services/organization-service";

const mockPrisma = vi.mocked(prisma);
const mockLogAudit = vi.mocked(logAuditEvent);

describe("Organization Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Pure Functions ───

  describe("generateSlug", () => {
    it("should convert name to lowercase slug", () => {
      expect(generateSlug("Test Organization")).toBe("test-organization");
    });

    it("should replace spaces with hyphens", () => {
      expect(generateSlug("My Space Company")).toBe("my-space-company");
    });

    it("should remove special characters", () => {
      const result = generateSlug("Test & Co.");
      expect(result).not.toContain("&");
      expect(result).not.toContain(".");
    });

    it("should collapse multiple consecutive hyphens", () => {
      expect(generateSlug("Test---Company")).toBe("test-company");
    });

    it("should truncate to 50 characters", () => {
      const longName = "A".repeat(100);
      expect(generateSlug(longName).length).toBeLessThanOrEqual(50);
    });

    it("should handle numbers", () => {
      expect(generateSlug("Company 123")).toBe("company-123");
    });

    it("should handle empty strings", () => {
      expect(generateSlug("")).toBe("");
    });
  });

  describe("getDefaultPermissionsForRole", () => {
    it("should return wildcard for OWNER", () => {
      const perms = getDefaultPermissionsForRole("OWNER");
      expect(perms).toEqual(["*"]);
    });

    it("should return admin permissions for ADMIN", () => {
      const perms = getDefaultPermissionsForRole("ADMIN");
      expect(perms).toContain("org:read");
      expect(perms).toContain("org:update");
      expect(perms).toContain("members:invite");
      expect(perms).toContain("compliance:delete");
      expect(perms.length).toBeGreaterThan(5);
    });

    it("should return manager permissions for MANAGER", () => {
      const perms = getDefaultPermissionsForRole("MANAGER");
      expect(perms).toContain("org:read");
      expect(perms).toContain("compliance:write");
      expect(perms).toContain("reports:generate");
      expect(perms).not.toContain("org:update");
    });

    it("should return member permissions for MEMBER", () => {
      const perms = getDefaultPermissionsForRole("MEMBER");
      expect(perms).toContain("org:read");
      expect(perms).toContain("compliance:read");
      expect(perms).toContain("compliance:write");
      expect(perms).not.toContain("compliance:delete");
    });

    it("should return viewer (read-only) permissions for VIEWER", () => {
      const perms = getDefaultPermissionsForRole("VIEWER");
      expect(perms).toContain("org:read");
      expect(perms).toContain("compliance:read");
      expect(perms).not.toContain("compliance:write");
      expect(perms).not.toContain("compliance:delete");
    });
  });

  describe("hasPermission", () => {
    it("should return true for wildcard permission", () => {
      expect(hasPermission(["*"], "compliance:read")).toBe(true);
    });

    it("should return true for direct permission match", () => {
      expect(
        hasPermission(
          ["compliance:read", "compliance:write"],
          "compliance:read",
        ),
      ).toBe(true);
    });

    it("should return false when permission is missing", () => {
      expect(hasPermission(["compliance:read"], "compliance:write")).toBe(
        false,
      );
    });

    it("should support category wildcard (e.g., compliance:*)", () => {
      expect(hasPermission(["compliance:*"], "compliance:read")).toBe(true);
      expect(hasPermission(["compliance:*"], "compliance:write")).toBe(true);
      expect(hasPermission(["compliance:*"], "reports:read")).toBe(false);
    });

    it("should return false for empty permissions", () => {
      expect(hasPermission([], "compliance:read")).toBe(false);
    });
  });

  describe("getPlanLimits", () => {
    it("should return FREE plan limits", () => {
      const limits = getPlanLimits("FREE");
      expect(limits.maxUsers).toBe(3);
      expect(limits.maxSpacecraft).toBe(5);
      expect(limits.features).toContain("basic_compliance");
    });

    it("should return STARTER plan limits", () => {
      const limits = getPlanLimits("STARTER");
      expect(limits.maxUsers).toBe(10);
      expect(limits.maxSpacecraft).toBe(20);
      expect(limits.features).toContain("scheduled_reports");
    });

    it("should return PROFESSIONAL plan limits", () => {
      const limits = getPlanLimits("PROFESSIONAL");
      expect(limits.maxUsers).toBe(50);
      expect(limits.maxSpacecraft).toBe(100);
      expect(limits.features).toContain("api_access");
      expect(limits.features).toContain("webhooks");
    });

    it("should return ENTERPRISE plan limits (unlimited)", () => {
      const limits = getPlanLimits("ENTERPRISE");
      expect(limits.maxUsers).toBe(-1);
      expect(limits.maxSpacecraft).toBe(-1);
      expect(limits.features).toContain("sso");
      expect(limits.features).toContain("dedicated_support");
      expect(limits.features).toContain("custom_integrations");
    });
  });

  // ─── Async Functions ───

  describe("isSlugAvailable", () => {
    it("should return true when slug is available", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null as never);
      const result = await isSlugAvailable("new-company");
      expect(result).toBe(true);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: "new-company" },
        select: { id: true },
      });
    });

    it("should return false when slug is taken", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "existing-id",
      } as never);
      const result = await isSlugAvailable("existing-company");
      expect(result).toBe(false);
    });
  });

  describe("generateUniqueSlug", () => {
    it("should return original slug if available", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null as never);
      const result = await generateUniqueSlug("Test Company");
      expect(result).toBe("test-company");
    });

    it("should append suffix if slug is taken", async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({ id: "1" } as never)
        .mockResolvedValueOnce(null as never);
      const result = await generateUniqueSlug("Test Company");
      expect(result).toBe("test-company-1");
    });

    it("should increment suffix until unique", async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({ id: "1" } as never)
        .mockResolvedValueOnce({ id: "2" } as never)
        .mockResolvedValueOnce({ id: "3" } as never)
        .mockResolvedValueOnce(null as never);
      const result = await generateUniqueSlug("Test Company");
      expect(result).toBe("test-company-3");
    });
  });

  describe("createOrganization", () => {
    it("should create organization and add owner via transaction", async () => {
      const mockOrg = { id: "org-123", name: "Test Org", slug: "test-org" };

      mockPrisma.organization.findUnique.mockResolvedValue(null as never);
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          organization: { create: vi.fn().mockResolvedValue(mockOrg) },
          organizationMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        };
        return (cb as (tx: typeof tx) => unknown)(tx);
      });

      const result = await createOrganization("user-1", {
        name: "Test Org",
        slug: "test-org",
      });

      expect(result.id).toBe("org-123");
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          action: "organization_created",
          entityType: "organization",
          entityId: "org-123",
        }),
      );
    });

    it("should throw if slug is taken", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "existing",
      } as never);

      await expect(
        createOrganization("user-1", {
          name: "Test Org",
          slug: "existing-slug",
        }),
      ).rejects.toThrow("Organization slug is already taken");
    });

    it("should use default timezone and language", async () => {
      const mockOrg = {
        id: "org-123",
        name: "Test Org",
        slug: "test-org",
        timezone: "Europe/Berlin",
        defaultLanguage: "en",
      };

      mockPrisma.organization.findUnique.mockResolvedValue(null as never);
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          organization: {
            create: vi.fn().mockResolvedValue(mockOrg),
          },
          organizationMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        };
        return (cb as (tx: typeof tx) => unknown)(tx);
      });

      const result = await createOrganization("user-1", {
        name: "Test Org",
        slug: "test-org",
      });
      expect(result.timezone).toBe("Europe/Berlin");
      expect(result.defaultLanguage).toBe("en");
    });
  });

  describe("getOrganization", () => {
    it("should return organization with members and counts", async () => {
      const mockOrg = {
        id: "org-1",
        name: "Org",
        members: [],
        _count: { members: 0, spacecraft: 0, invitations: 0 },
      };
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg as never);

      const result = await getOrganization("org-1");

      expect(result).toEqual(mockOrg);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "org-1" },
          include: expect.objectContaining({
            members: expect.any(Object),
            _count: expect.any(Object),
          }),
        }),
      );
    });

    it("should return null when organization not found", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null as never);
      const result = await getOrganization("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getOrganizationBySlug", () => {
    it("should find by slug with members included", async () => {
      const mockOrg = {
        id: "org-1",
        slug: "test-org",
        members: [],
        _count: { members: 0, spacecraft: 0, invitations: 0 },
      };
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg as never);

      const result = await getOrganizationBySlug("test-org");
      expect(result).toEqual(mockOrg);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: "test-org" } }),
      );
    });

    it("should return null when slug not found", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null as never);
      const result = await getOrganizationBySlug("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("updateOrganization", () => {
    it("should update and log audit event", async () => {
      const previous = { id: "org-1", name: "Old Name" };
      const updated = { id: "org-1", name: "New Name" };

      mockPrisma.organization.findUnique.mockResolvedValue(previous as never);
      mockPrisma.organization.update.mockResolvedValue(updated as never);

      const result = await updateOrganization("org-1", "user-1", {
        name: "New Name",
      });

      expect(result.name).toBe("New Name");
      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "org-1" },
          data: { name: "New Name" },
        }),
      );
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "organization_updated",
          entityId: "org-1",
        }),
      );
    });

    it("should only include defined fields in update data", async () => {
      const previous = { id: "org-1", name: "Org" };
      const updated = { id: "org-1", name: "Org", timezone: "UTC" };

      mockPrisma.organization.findUnique.mockResolvedValue(previous as never);
      mockPrisma.organization.update.mockResolvedValue(updated as never);

      await updateOrganization("org-1", "user-1", { timezone: "UTC" });

      const updateCall = mockPrisma.organization.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(updateCall.data).toEqual({ timezone: "UTC" });
      expect(updateCall.data).not.toHaveProperty("name");
    });
  });

  describe("deleteOrganization", () => {
    it("should soft-delete (set isActive false) and log audit", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        name: "Org",
        slug: "org",
      } as never);
      mockPrisma.organization.update.mockResolvedValue({} as never);

      await deleteOrganization("org-1", "user-1");

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { isActive: false },
      });
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "organization_deleted",
          entityId: "org-1",
        }),
      );
    });

    it("should throw if organization not found", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null as never);

      await expect(deleteOrganization("nonexistent", "user-1")).rejects.toThrow(
        "Organization not found",
      );
    });
  });

  describe("getUserOrganizations", () => {
    it("should find member records with org include", async () => {
      const mockMembers = [
        {
          id: "m1",
          organization: {
            id: "org-1",
            name: "Org",
            _count: { members: 1, spacecraft: 0 },
          },
        },
      ];
      mockPrisma.organizationMember.findMany.mockResolvedValue(
        mockMembers as never,
      );

      const result = await getUserOrganizations("user-1");

      expect(result).toEqual(mockMembers);
      expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", organization: { isActive: true } },
        }),
      );
    });
  });

  describe("getUserRole", () => {
    it("should return the role when membership exists", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: "ADMIN",
      } as never);

      const result = await getUserRole("org-1", "user-1");
      expect(result).toBe("ADMIN");
    });

    it("should return null when no membership", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null as never);

      const result = await getUserRole("org-1", "user-1");
      expect(result).toBeNull();
    });
  });

  describe("addMember", () => {
    it("should create member with default permissions and log audit", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        maxUsers: 10,
        name: "Org",
        _count: { members: 2 },
      } as never);
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null as never);
      const mockMember = { id: "m1", role: "MEMBER" };
      mockPrisma.organizationMember.create.mockResolvedValue(
        mockMember as never,
      );

      const result = await addMember("org-1", "user-2", "MEMBER", "user-1");

      expect(result).toEqual(mockMember);
      expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "user-2",
          role: "MEMBER",
          invitedBy: "user-1",
          permissions: getDefaultPermissionsForRole("MEMBER"),
        }),
      });
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "member_added" }),
      );
    });

    it("should throw when organization not found", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null as never);

      await expect(addMember("org-1", "user-2", "MEMBER")).rejects.toThrow(
        "Organization not found",
      );
    });

    it("should throw when member limit reached", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        maxUsers: 3,
        name: "Org",
        _count: { members: 3 },
      } as never);

      await expect(addMember("org-1", "user-2", "MEMBER")).rejects.toThrow(
        "maximum user limit",
      );
    });

    it("should throw when user is already a member", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        maxUsers: 10,
        name: "Org",
        _count: { members: 1 },
      } as never);
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: "existing",
      } as never);

      await expect(addMember("org-1", "user-2", "MEMBER")).rejects.toThrow(
        "already a member",
      );
    });

    it("should not log audit when invitedBy is not provided", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        maxUsers: 10,
        name: "Org",
        _count: { members: 1 },
      } as never);
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null as never);
      mockPrisma.organizationMember.create.mockResolvedValue({
        id: "m1",
      } as never);

      await addMember("org-1", "user-2", "MEMBER");

      expect(mockLogAudit).not.toHaveBeenCalled();
    });
  });

  describe("updateMemberRole", () => {
    it("should update role and permissions", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: "MEMBER",
      } as never);
      const updated = { role: "ADMIN" };
      mockPrisma.organizationMember.update.mockResolvedValue(updated as never);

      const result = await updateMemberRole(
        "org-1",
        "user-2",
        "ADMIN",
        "user-1",
      );

      expect(result.role).toBe("ADMIN");
      expect(mockPrisma.organizationMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            role: "ADMIN",
            permissions: getDefaultPermissionsForRole("ADMIN"),
          },
        }),
      );
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "member_role_updated",
        }),
      );
    });

    it("should throw when user is not a member", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null as never);

      await expect(
        updateMemberRole("org-1", "user-2", "ADMIN", "user-1"),
      ).rejects.toThrow("not a member");
    });

    it("should prevent removing the last owner", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: "OWNER",
      } as never);
      mockPrisma.organizationMember.count.mockResolvedValue(1 as never);

      await expect(
        updateMemberRole("org-1", "user-1", "ADMIN", "user-2"),
      ).rejects.toThrow("must have at least one owner");
    });

    it("should allow downgrading owner when multiple owners exist", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: "OWNER",
      } as never);
      mockPrisma.organizationMember.count.mockResolvedValue(2 as never);
      mockPrisma.organizationMember.update.mockResolvedValue({
        role: "ADMIN",
      } as never);

      const result = await updateMemberRole(
        "org-1",
        "user-2",
        "ADMIN",
        "user-1",
      );
      expect(result.role).toBe("ADMIN");
    });
  });

  describe("removeMember", () => {
    it("should delete member and log audit", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: "MEMBER",
        organization: { name: "Org" },
        user: { name: "John", email: "john@test.com" },
      } as never);
      mockPrisma.organizationMember.delete.mockResolvedValue({} as never);

      await removeMember("org-1", "user-2", "user-1");

      expect(mockPrisma.organizationMember.delete).toHaveBeenCalledWith({
        where: {
          organizationId_userId: { organizationId: "org-1", userId: "user-2" },
        },
      });
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "member_removed" }),
      );
    });

    it("should throw when user is not a member", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null as never);

      await expect(removeMember("org-1", "user-2", "user-1")).rejects.toThrow(
        "not a member",
      );
    });

    it("should prevent removing the last owner", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: "OWNER",
        organization: { name: "Org" },
        user: { name: "Admin", email: "a@b.com" },
      } as never);
      mockPrisma.organizationMember.count.mockResolvedValue(1 as never);

      await expect(removeMember("org-1", "user-1", "user-1")).rejects.toThrow(
        "must have at least one owner",
      );
    });
  });

  describe("createInvitation", () => {
    it("should create invitation with token and 7-day expiry", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null as never);
      mockPrisma.organizationInvitation.findFirst.mockResolvedValue(
        null as never,
      );
      const mockInvitation = {
        id: "inv-1",
        email: "new@test.com",
        role: "MEMBER",
        token: "sometoken",
        organization: { name: "Org" },
      };
      mockPrisma.organizationInvitation.create.mockResolvedValue(
        mockInvitation as never,
      );

      const result = await createInvitation(
        "org-1",
        { email: "new@test.com" },
        "user-1",
      );

      expect(result).toEqual(mockInvitation);
      expect(mockPrisma.organizationInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org-1",
            email: "new@test.com",
            role: "MEMBER",
            token: expect.any(String),
            invitedBy: "user-1",
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "invitation_created" }),
      );
    });

    it("should use custom role when provided", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null as never);
      mockPrisma.organizationInvitation.findFirst.mockResolvedValue(
        null as never,
      );
      mockPrisma.organizationInvitation.create.mockResolvedValue({
        id: "inv-1",
        organization: { name: "Org" },
      } as never);

      await createInvitation(
        "org-1",
        { email: "admin@test.com", role: "ADMIN" },
        "user-1",
      );

      const createCall = mockPrisma.organizationInvitation.create.mock
        .calls[0][0] as { data: Record<string, unknown> };
      expect(createCall.data.role).toBe("ADMIN");
    });

    it("should throw if user is already a member", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-2" } as never);
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: "existing",
      } as never);

      await expect(
        createInvitation("org-1", { email: "existing@test.com" }, "user-1"),
      ).rejects.toThrow("already a member");
    });

    it("should throw if pending invitation already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null as never);
      mockPrisma.organizationInvitation.findFirst.mockResolvedValue({
        id: "inv-existing",
      } as never);

      await expect(
        createInvitation("org-1", { email: "pending@test.com" }, "user-1"),
      ).rejects.toThrow("already been sent");
    });
  });

  describe("getInvitation", () => {
    it("should return invitation by token with organization", async () => {
      const mockInv = {
        id: "inv-1",
        token: "abc",
        organization: { id: "org-1", name: "Org", logoUrl: null },
      };
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(
        mockInv as never,
      );

      const result = await getInvitation("abc");
      expect(result).toEqual(mockInv);
    });

    it("should return null when token not found", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(
        null as never,
      );
      const result = await getInvitation("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getOrganizationInvitations", () => {
    it("should return pending non-expired invitations", async () => {
      const mockInvs = [{ id: "inv-1" }, { id: "inv-2" }];
      mockPrisma.organizationInvitation.findMany.mockResolvedValue(
        mockInvs as never,
      );

      const result = await getOrganizationInvitations("org-1");

      expect(result).toEqual(mockInvs);
      expect(mockPrisma.organizationInvitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            acceptedAt: null,
            expiresAt: { gt: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe("acceptInvitation", () => {
    it("should accept invitation and create member via transaction", async () => {
      const invitation = {
        id: "inv-1",
        organizationId: "org-1",
        role: "MEMBER",
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        invitedBy: "user-1",
        organization: { id: "org-1", name: "Org" },
      };
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(
        invitation as never,
      );

      const mockMember = { id: "m1", role: "MEMBER" };
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          organizationInvitation: { update: vi.fn().mockResolvedValue({}) },
          organizationMember: { create: vi.fn().mockResolvedValue(mockMember) },
        };
        return (cb as (tx: typeof tx) => unknown)(tx);
      });

      const result = await acceptInvitation("token-abc", "user-2");

      expect(result).toEqual(mockMember);
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "invitation_accepted" }),
      );
    });

    it("should throw for invalid token", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(
        null as never,
      );

      await expect(acceptInvitation("bad-token", "user-1")).rejects.toThrow(
        "Invalid invitation token",
      );
    });

    it("should throw if already accepted", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        organization: { id: "org-1", name: "Org" },
      } as never);

      await expect(acceptInvitation("token", "user-1")).rejects.toThrow(
        "already been accepted",
      );
    });

    it("should throw if invitation expired", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        acceptedAt: null,
        expiresAt: new Date("2020-01-01"),
        organization: { id: "org-1", name: "Org" },
      } as never);

      await expect(acceptInvitation("token", "user-1")).rejects.toThrow(
        "expired",
      );
    });
  });

  describe("cancelInvitation", () => {
    it("should delete invitation and log audit", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-1",
        email: "cancel@test.com",
        role: "MEMBER",
        organization: { id: "org-1", name: "Org" },
      } as never);
      mockPrisma.organizationInvitation.delete.mockResolvedValue({} as never);

      await cancelInvitation("inv-1", "user-1", "org-1");

      expect(mockPrisma.organizationInvitation.delete).toHaveBeenCalledWith({
        where: { id: "inv-1" },
      });
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "invitation_cancelled" }),
      );
    });

    it("should throw if invitation not found", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(
        null as never,
      );

      await expect(
        cancelInvitation("inv-bad", "user-1", "org-1"),
      ).rejects.toThrow("Invitation not found");
    });

    it("should throw if invitation belongs to different organization", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-other",
        organization: { id: "org-other", name: "Other" },
      } as never);

      await expect(
        cancelInvitation("inv-1", "user-1", "org-1"),
      ).rejects.toThrow("Invitation not found");
    });
  });

  describe("resendInvitation", () => {
    it("should generate new token, extend expiry, and log audit", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-1",
        email: "resend@test.com",
        acceptedAt: null,
      } as never);
      const updatedInv = {
        id: "inv-1",
        token: "newtoken",
        organization: { name: "Org" },
      };
      mockPrisma.organizationInvitation.update.mockResolvedValue(
        updatedInv as never,
      );

      const result = await resendInvitation("inv-1", "user-1", "org-1");

      expect(result).toEqual(updatedInv);
      expect(mockPrisma.organizationInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "inv-1" },
          data: expect.objectContaining({
            token: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "invitation_resent" }),
      );
    });

    it("should throw if invitation not found", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(
        null as never,
      );

      await expect(
        resendInvitation("inv-bad", "user-1", "org-1"),
      ).rejects.toThrow("Invitation not found");
    });

    it("should throw if invitation belongs to different org", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-other",
        acceptedAt: null,
      } as never);

      await expect(
        resendInvitation("inv-1", "user-1", "org-1"),
      ).rejects.toThrow("Invitation not found");
    });

    it("should throw if invitation already accepted", async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-1",
        acceptedAt: new Date(),
      } as never);

      await expect(
        resendInvitation("inv-1", "user-1", "org-1"),
      ).rejects.toThrow("already been accepted");
    });
  });

  describe("cleanupExpiredInvitations", () => {
    it("should delete expired invitations and return count", async () => {
      mockPrisma.organizationInvitation.deleteMany.mockResolvedValue({
        count: 5,
      } as never);

      const result = await cleanupExpiredInvitations();

      expect(result).toBe(5);
      expect(mockPrisma.organizationInvitation.deleteMany).toHaveBeenCalledWith(
        {
          where: {
            acceptedAt: null,
            expiresAt: { lt: expect.any(Date) },
          },
        },
      );
    });
  });
});
