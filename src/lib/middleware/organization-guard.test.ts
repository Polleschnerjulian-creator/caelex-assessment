/**
 * Organization Guard Middleware Tests
 *
 * Tests: getOrganizationMembership, verifyOrganizationAccess, withOrganizationGuard,
 * requirePermissions, requireAnyPermission, requireRole, getCurrentOrganization,
 * isOrganizationOwner, isOrganizationMember
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findUnique: vi.fn(), findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(),
}));

import {
  getOrganizationMembership,
  verifyOrganizationAccess,
  withOrganizationGuard,
  requirePermissions,
  requireAnyPermission,
  requireRole,
  getCurrentOrganization,
  isOrganizationOwner,
  isOrganizationMember,
} from "./organization-guard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  organizationMember: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
};
const mockHasPermission = hasPermission as ReturnType<typeof vi.fn>;

const mockOrganization = {
  id: "org-1",
  name: "Test Org",
  slug: "test-org",
  plan: "PRO",
  isActive: true,
};

const mockMembership = {
  role: "ADMIN" as const,
  permissions: ["compliance:read", "compliance:write"],
  organization: mockOrganization,
  organizationId: "org-1",
};

describe("Organization Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getOrganizationMembership ────────────────────────────────────────────

  describe("getOrganizationMembership", () => {
    it("returns context when membership is found", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );

      const result = await getOrganizationMembership("org-1", "user-1");

      expect(result).toEqual({
        userId: "user-1",
        organizationId: "org-1",
        role: "ADMIN",
        permissions: ["compliance:read", "compliance:write"],
        organization: mockOrganization,
      });

      expect(mockPrisma.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: "org-1",
            userId: "user-1",
          },
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              isActive: true,
            },
          },
        },
      });
    });

    it("returns null when membership is not found", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await getOrganizationMembership("org-1", "user-99");

      expect(result).toBeNull();
    });
  });

  // ─── verifyOrganizationAccess ─────────────────────────────────────────────

  describe("verifyOrganizationAccess", () => {
    it("returns success for a valid member", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );

      const result = await verifyOrganizationAccess("org-1", "user-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.role).toBe("ADMIN");
      }
    });

    it("returns 403 for non-member", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await verifyOrganizationAccess("org-1", "user-99");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toContain("not a member");
      }
    });

    it("returns 403 for inactive org without allowInactive", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        ...mockMembership,
        organization: { ...mockOrganization, isActive: false },
      });

      const result = await verifyOrganizationAccess("org-1", "user-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toContain("deactivated");
      }
    });

    it("allows inactive org when allowInactive is true", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        ...mockMembership,
        organization: { ...mockOrganization, isActive: false },
      });

      const result = await verifyOrganizationAccess("org-1", "user-1", {
        allowInactive: true,
      });

      expect(result.success).toBe(true);
    });

    it("checks all required permissions (AND logic)", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );
      // First permission check passes, second fails
      mockHasPermission.mockReturnValueOnce(true).mockReturnValueOnce(false);

      const result = await verifyOrganizationAccess("org-1", "user-1", {
        requiredPermissions: ["compliance:read", "compliance:delete"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
        expect(result.error).toContain("permission");
      }
    });

    it("checks any required permission (OR logic) with requireAny", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );
      // First permission fails, second passes
      mockHasPermission.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = await verifyOrganizationAccess("org-1", "user-1", {
        requiredPermissions: ["compliance:delete", "compliance:read"],
        requireAny: true,
      });

      expect(result.success).toBe(true);
    });

    it("returns 403 when no required permissions match with requireAny", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );
      mockHasPermission.mockReturnValue(false);

      const result = await verifyOrganizationAccess("org-1", "user-1", {
        requiredPermissions: ["compliance:delete", "org:delete"],
        requireAny: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.status).toBe(403);
      }
    });
  });

  // ─── withOrganizationGuard ────────────────────────────────────────────────

  describe("withOrganizationGuard", () => {
    const createMockRequest = () =>
      new Request("http://localhost/api/test", { method: "GET" });

    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const handler = vi.fn();
      const guarded = withOrganizationGuard(handler);

      const response = await guarded(createMockRequest(), {
        params: Promise.resolve({ orgId: "org-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 400 when no orgId in params", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });

      const handler = vi.fn();
      const guarded = withOrganizationGuard(handler);

      const response = await guarded(createMockRequest(), {
        params: Promise.resolve({ orgId: "" }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Organization ID");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 403 when user has no access", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      const handler = vi.fn();
      const guarded = withOrganizationGuard(handler);

      const response = await guarded(createMockRequest(), {
        params: Promise.resolve({ orgId: "org-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toContain("not a member");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 500 on unexpected error", async () => {
      mockAuth.mockRejectedValue(new Error("Auth service down"));

      const handler = vi.fn();
      const guarded = withOrganizationGuard(handler);

      const response = await guarded(createMockRequest(), {
        params: Promise.resolve({ orgId: "org-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });

    it("passes org context to handler on success", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );

      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      const guarded = withOrganizationGuard(handler);

      await guarded(createMockRequest(), {
        params: Promise.resolve({ orgId: "org-1" }),
      });

      expect(handler).toHaveBeenCalledTimes(1);
      const handlerCall = handler.mock.calls[0];
      expect(handlerCall[1].org).toBeDefined();
      expect(handlerCall[1].org.organizationId).toBe("org-1");
      expect(handlerCall[1].org.role).toBe("ADMIN");
    });
  });

  // ─── requirePermissions ───────────────────────────────────────────────────

  describe("requirePermissions", () => {
    it("creates a guard that requires all specified permissions", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );
      // Both permission checks fail
      mockHasPermission.mockReturnValue(false);

      const handler = vi.fn();
      const guarded = requirePermissions(
        "compliance:read" as never,
        "compliance:write" as never,
      )(handler);

      const response = await guarded(new Request("http://localhost/api/test"), {
        params: Promise.resolve({ orgId: "org-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toContain("permission");
    });
  });

  // ─── requireAnyPermission ─────────────────────────────────────────────────

  describe("requireAnyPermission", () => {
    it("creates a guard that requires any of the specified permissions", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );
      // First fails, second succeeds
      mockHasPermission.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      const guarded = requireAnyPermission(
        "compliance:delete" as never,
        "compliance:read" as never,
      )(handler);

      const response = await guarded(new Request("http://localhost/api/test"), {
        params: Promise.resolve({ orgId: "org-1" }),
      });

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });
  });

  // ─── requireRole ──────────────────────────────────────────────────────────

  describe("requireRole", () => {
    it("returns 403 for wrong role", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        ...mockMembership,
        role: "MEMBER",
      });

      const handler = vi.fn();
      const guarded = requireRole("OWNER" as never)(handler);

      const response = await guarded(new Request("http://localhost/api/test"), {
        params: Promise.resolve({ orgId: "org-1" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toContain("roles");
      expect(handler).not.toHaveBeenCalled();
    });

    it("passes for correct role", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        ...mockMembership,
        role: "OWNER",
      });

      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      const guarded = requireRole("OWNER" as never)(handler);

      const response = await guarded(new Request("http://localhost/api/test"), {
        params: Promise.resolve({ orgId: "org-1" }),
      });

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });
  });

  // ─── getCurrentOrganization ───────────────────────────────────────────────

  describe("getCurrentOrganization", () => {
    it("returns preferred org when it exists and is active", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(
        mockMembership,
      );

      const result = await getCurrentOrganization("user-1", "org-1");

      expect(result).not.toBeNull();
      expect(result!.organizationId).toBe("org-1");
    });

    it("falls back to first active org when preferred is not found", async () => {
      // Preferred org not found
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
      // Fallback query
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMembership,
        organizationId: "org-2",
        organization: { ...mockOrganization, id: "org-2" },
      });

      const result = await getCurrentOrganization("user-1", "org-missing");

      expect(result).not.toBeNull();
      expect(result!.organizationId).toBe("org-2");
    });

    it("falls back to first active org when no preferred org provided", async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMembership,
        organizationId: "org-1",
      });

      const result = await getCurrentOrganization("user-1");

      expect(result).not.toBeNull();
      expect(result!.organizationId).toBe("org-1");
    });

    it("returns null when user has no memberships", async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      const result = await getCurrentOrganization("user-1");

      expect(result).toBeNull();
    });

    it("skips preferred org if it is inactive", async () => {
      // Preferred org exists but is inactive
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        ...mockMembership,
        organization: { ...mockOrganization, isActive: false },
      });
      // Fallback
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMembership,
        organizationId: "org-active",
        organization: {
          ...mockOrganization,
          id: "org-active",
          isActive: true,
        },
      });

      const result = await getCurrentOrganization("user-1", "org-1");

      expect(result).not.toBeNull();
      expect(result!.organizationId).toBe("org-active");
    });
  });

  // ─── isOrganizationOwner ──────────────────────────────────────────────────

  describe("isOrganizationOwner", () => {
    it("returns true for OWNER role", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: "OWNER",
      });

      const result = await isOrganizationOwner("org-1", "user-1");

      expect(result).toBe(true);
    });

    it("returns false for MEMBER role", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        role: "MEMBER",
      });

      const result = await isOrganizationOwner("org-1", "user-1");

      expect(result).toBe(false);
    });

    it("returns false when membership does not exist", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await isOrganizationOwner("org-1", "user-99");

      expect(result).toBe(false);
    });
  });

  // ─── isOrganizationMember ─────────────────────────────────────────────────

  describe("isOrganizationMember", () => {
    it("returns true when membership exists", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: "member-1",
      });

      const result = await isOrganizationMember("org-1", "user-1");

      expect(result).toBe(true);
    });

    it("returns false when membership does not exist", async () => {
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);

      const result = await isOrganizationMember("org-1", "user-99");

      expect(result).toBe(false);
    });
  });
});
