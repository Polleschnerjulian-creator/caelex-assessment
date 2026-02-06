import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/organization-service", () => ({
  getUserOrganizations: vi.fn(),
  createOrganization: vi.fn(),
  generateUniqueSlug: vi.fn(),
  isSlugAvailable: vi.fn(),
  getOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  getUserRole: vi.fn(),
  hasPermission: vi.fn(),
  getDefaultPermissionsForRole: vi.fn(),
  addMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  getOrganizationInvitations: vi.fn(),
  createInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  resendInvitation: vi.fn(),
}));

vi.mock("@/lib/middleware/organization-guard", () => ({
  verifyOrganizationAccess: vi.fn(),
}));

vi.mock("@/lib/services/spacecraft-service", () => ({
  getSpacecraftList: vi.fn(),
  createSpacecraft: vi.fn(),
  getSpacecraftStats: vi.fn(),
  getSpacecraft: vi.fn(),
  updateSpacecraft: vi.fn(),
  deleteSpacecraft: vi.fn(),
  updateSpacecraftStatus: vi.fn(),
  canTransitionStatus: vi.fn(),
  STATUS_CONFIG: {
    PRE_LAUNCH: { label: "Pre-Launch" },
    OPERATIONAL: { label: "Operational" },
    DECOMMISSIONED: { label: "Decommissioned" },
  },
  MISSION_TYPES: ["communication", "observation", "navigation"],
  ORBIT_TYPES: ["LEO", "MEO", "GEO"],
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
  ),
}));

// ─── Imports ───

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserOrganizations,
  createOrganization,
  generateUniqueSlug,
  isSlugAvailable,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getUserRole,
  hasPermission,
  getDefaultPermissionsForRole,
  addMember,
  updateMemberRole,
  removeMember,
  getOrganizationInvitations,
  createInvitation,
  cancelInvitation,
  resendInvitation,
} from "@/lib/services/organization-service";
import { verifyOrganizationAccess } from "@/lib/middleware/organization-guard";
import {
  getSpacecraftList,
  createSpacecraft,
  getSpacecraft,
  updateSpacecraft,
  deleteSpacecraft,
  updateSpacecraftStatus,
  canTransitionStatus,
  getSpacecraftStats,
} from "@/lib/services/spacecraft-service";

// Route handler imports
import {
  GET as listOrganizations,
  POST as createOrg,
} from "@/app/api/organizations/route";

import {
  GET as getOrgDetail,
  PATCH as updateOrg,
  DELETE as deleteOrg,
} from "@/app/api/organizations/[orgId]/route";

import {
  GET as listMembers,
  POST as addMemberRoute,
} from "@/app/api/organizations/[orgId]/members/route";

import {
  PATCH as updateMember,
  DELETE as removeMemberRoute,
} from "@/app/api/organizations/[orgId]/members/[userId]/route";

import {
  GET as listInvitations,
  POST as createInvitationRoute,
} from "@/app/api/organizations/[orgId]/invitations/route";

import {
  DELETE as cancelInvitationRoute,
  POST as resendInvitationRoute,
} from "@/app/api/organizations/[orgId]/invitations/[id]/route";

import {
  GET as listSpacecraft,
  POST as createSpacecraftRoute,
} from "@/app/api/organizations/[orgId]/spacecraft/route";

import {
  GET as getSpacecraftDetail,
  PATCH as updateSpacecraftRoute,
  DELETE as deleteSpacecraftRoute,
} from "@/app/api/organizations/[orgId]/spacecraft/[spacecraftId]/route";

// ─── Test Constants ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com", name: "Test User" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const mockOrgId = "org-abc";
const mockUserId = "user-456";
const mockInvitationId = "inv-789";
const mockSpacecraftId = "sc-001";

function makeParams<T>(data: T): { params: Promise<T> } {
  return { params: Promise.resolve(data) };
}

// ─── Test Suites ───

// =============================================
// 1. Organizations List & Create (route.ts)
// =============================================

describe("GET /api/organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await listOrganizations();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return organizations on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserOrganizations).mockResolvedValue([
      {
        id: "mem-1",
        organizationId: mockOrgId,
        userId: "user-123",
        role: "OWNER",
        permissions: ["*"],
        joinedAt: new Date(),
        invitedBy: null,
        organization: {
          id: mockOrgId,
          name: "Space Corp",
          slug: "space-corp",
          logoUrl: null,
          primaryColor: null,
          plan: "FREE",
          _count: { members: 3, spacecraft: 5 },
        },
      },
    ] as never);

    const response = await listOrganizations();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.organizations).toHaveLength(1);
    expect(data.organizations[0].id).toBe(mockOrgId);
    expect(data.organizations[0].name).toBe("Space Corp");
    expect(data.organizations[0].role).toBe("OWNER");
    expect(data.organizations[0].memberCount).toBe(3);
    expect(data.organizations[0].spacecraftCount).toBe(5);
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserOrganizations).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await listOrganizations();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch organizations");
  });
});

describe("POST /api/organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await createOrg(makeRequest({ name: "Test Org" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const response = await createOrg(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Organization name");
  });

  it("should return 400 when name is too short", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const response = await createOrg(makeRequest({ name: "A" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Organization name");
  });

  it("should return 400 for invalid slug format", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const response = await createOrg(
      makeRequest({ name: "Test Org", slug: "INVALID SLUG!" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Slug");
  });

  it("should return 400 when provided slug is already taken", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(isSlugAvailable).mockResolvedValue(false);

    const response = await createOrg(
      makeRequest({ name: "Test Org", slug: "taken-slug" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("slug is already taken");
  });

  it("should auto-generate slug and create organization on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(generateUniqueSlug).mockResolvedValue("test-org");
    vi.mocked(createOrganization).mockResolvedValue({
      id: mockOrgId,
      name: "Test Org",
      slug: "test-org",
      plan: "FREE",
    } as never);

    const response = await createOrg(makeRequest({ name: "Test Org" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.organization.id).toBe(mockOrgId);
    expect(data.organization.name).toBe("Test Org");
    expect(data.organization.slug).toBe("test-org");
    expect(data.message).toBe("Organization created successfully");
  });

  it("should use provided valid slug when given", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(isSlugAvailable).mockResolvedValue(true);
    vi.mocked(createOrganization).mockResolvedValue({
      id: mockOrgId,
      name: "Test Org",
      slug: "my-custom-slug",
      plan: "FREE",
    } as never);

    const response = await createOrg(
      makeRequest({ name: "Test Org", slug: "my-custom-slug" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.organization.slug).toBe("my-custom-slug");
    expect(generateUniqueSlug).not.toHaveBeenCalled();
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(generateUniqueSlug).mockResolvedValue("test-org");
    vi.mocked(createOrganization).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await createOrg(makeRequest({ name: "Test Org" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// =============================================
// 2. Organization Detail ([orgId]/route.ts)
// =============================================

describe("GET /api/organizations/[orgId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await getOrgDetail(
      new Request("http://localhost/api/organizations/org-abc"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await getOrgDetail(
      new Request("http://localhost/api/organizations/org-abc"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 404 when organization not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(getOrganization).mockResolvedValue(null);

    const response = await getOrgDetail(
      new Request("http://localhost/api/organizations/org-abc"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("should return 403 when user lacks org:read permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("VIEWER" as never);
    vi.mocked(getOrganization).mockResolvedValue({
      id: mockOrgId,
      name: "Space Corp",
      slug: "space-corp",
      members: [],
      _count: { members: 1, spacecraft: 0, invitations: 0 },
    } as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue([]);
    vi.mocked(hasPermission).mockReturnValue(false);

    const response = await getOrgDetail(
      new Request("http://localhost/api/organizations/org-abc"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should return organization details on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(getOrganization).mockResolvedValue({
      id: mockOrgId,
      name: "Space Corp",
      slug: "space-corp",
      logoUrl: null,
      primaryColor: null,
      timezone: "Europe/Berlin",
      defaultLanguage: "en",
      plan: "FREE",
      planExpiresAt: null,
      maxUsers: 3,
      maxSpacecraft: 5,
      billingEmail: null,
      vatNumber: null,
      billingAddress: null,
      isActive: true,
      createdAt: new Date(),
      members: [
        {
          id: "mem-1",
          userId: "user-123",
          user: {
            name: "Test User",
            email: "test@example.com",
            image: null,
          },
          role: "OWNER",
          joinedAt: new Date(),
        },
      ],
      _count: { members: 1, spacecraft: 2, invitations: 0 },
    } as never);

    const response = await getOrgDetail(
      new Request("http://localhost/api/organizations/org-abc"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.organization.id).toBe(mockOrgId);
    expect(data.organization.name).toBe("Space Corp");
    expect(data.userRole).toBe("OWNER");
    expect(data.organization.members).toHaveLength(1);
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockRejectedValue(new Error("Database error"));

    const response = await getOrgDetail(
      new Request("http://localhost/api/organizations/org-abc"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch organization");
  });
});

describe("PATCH /api/organizations/[orgId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/organizations/org-abc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await updateOrg(
      makeRequest({ name: "New Name" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await updateOrg(
      makeRequest({ name: "New Name" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks org:update permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("VIEWER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["org:read"]);
    vi.mocked(hasPermission).mockReturnValue(false);

    const response = await updateOrg(
      makeRequest({ name: "New Name" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should update organization on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(updateOrganization).mockResolvedValue({
      id: mockOrgId,
      name: "New Name",
      slug: "space-corp",
    } as never);

    const response = await updateOrg(
      makeRequest({ name: "New Name" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Organization updated successfully");
    expect(data.organization.name).toBe("New Name");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(updateOrganization).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await updateOrg(
      makeRequest({ name: "New Name" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

describe("DELETE /api/organizations/[orgId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await deleteOrg(
      new Request("http://localhost/api/organizations/org-abc", {
        method: "DELETE",
      }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await deleteOrg(
      new Request("http://localhost/api/organizations/org-abc", {
        method: "DELETE",
      }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user is not an OWNER", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);

    const response = await deleteOrg(
      new Request("http://localhost/api/organizations/org-abc", {
        method: "DELETE",
      }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("owners");
  });

  it("should delete organization when user is OWNER", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(deleteOrganization).mockResolvedValue(undefined);

    const response = await deleteOrg(
      new Request("http://localhost/api/organizations/org-abc", {
        method: "DELETE",
      }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Organization deleted successfully");
    expect(deleteOrganization).toHaveBeenCalledWith(mockOrgId, "user-123");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(deleteOrganization).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await deleteOrg(
      new Request("http://localhost/api/organizations/org-abc", {
        method: "DELETE",
      }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// =============================================
// 3. Members ([orgId]/members/route.ts)
// =============================================

describe("GET /api/organizations/[orgId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await listMembers(
      new Request("http://localhost/api/organizations/org-abc/members"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await listMembers(
      new Request("http://localhost/api/organizations/org-abc/members"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks members:read permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("VIEWER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["org:read"]);
    vi.mocked(hasPermission).mockReturnValue(false);

    const response = await listMembers(
      new Request("http://localhost/api/organizations/org-abc/members"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should return members list on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue([
      "members:read",
      "members:invite",
    ]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      {
        id: "mem-1",
        userId: "user-123",
        organizationId: mockOrgId,
        role: "OWNER",
        permissions: ["*"],
        joinedAt: new Date(),
        invitedBy: null,
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          image: null,
        },
      },
    ] as never);

    const response = await listMembers(
      new Request("http://localhost/api/organizations/org-abc/members"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.members).toHaveLength(1);
    expect(data.members[0].userId).toBe("user-123");
    expect(data.members[0].role).toBe("OWNER");
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:read"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(prisma.organizationMember.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await listMembers(
      new Request("http://localhost/api/organizations/org-abc/members"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch members");
  });
});

describe("POST /api/organizations/[orgId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/organizations/org-abc/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await addMemberRoute(
      makeRequest({ userId: mockUserId }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await addMemberRoute(
      makeRequest({ userId: mockUserId }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks members:invite permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("MEMBER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["org:read"]);
    vi.mocked(hasPermission).mockReturnValue(false);

    const response = await addMemberRoute(
      makeRequest({ userId: mockUserId }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should return 400 when userId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await addMemberRoute(
      makeRequest({}),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("User ID is required");
  });

  it("should return 400 for invalid role", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await addMemberRoute(
      makeRequest({ userId: mockUserId, role: "SUPERADMIN" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid role");
  });

  it("should return 403 when non-owner tries to add an OWNER", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await addMemberRoute(
      makeRequest({ userId: mockUserId, role: "OWNER" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Only owners");
  });

  it("should add member successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(addMember).mockResolvedValue({
      id: "mem-new",
      userId: mockUserId,
      role: "MEMBER",
      joinedAt: new Date(),
    } as never);

    const response = await addMemberRoute(
      makeRequest({ userId: mockUserId, role: "MEMBER" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.member.userId).toBe(mockUserId);
    expect(data.member.role).toBe("MEMBER");
    expect(data.message).toBe("Member added successfully");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(addMember).mockRejectedValue(new Error("User limit reached"));

    const response = await addMemberRoute(
      makeRequest({ userId: mockUserId }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// =============================================
// 4. Member Detail ([orgId]/members/[userId]/route.ts)
// =============================================

describe("PATCH /api/organizations/[orgId]/members/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request(
      "http://localhost/api/organizations/org-abc/members/user-456",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  }

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await updateMember(
      makeRequest({ role: "ADMIN" }),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await updateMember(
      makeRequest({ role: "ADMIN" }),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks members:role permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("MEMBER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["org:read"]);
    vi.mocked(hasPermission).mockReturnValue(false);

    const response = await updateMember(
      makeRequest({ role: "ADMIN" }),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should return 400 when role is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await updateMember(
      makeRequest({}),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Role is required");
  });

  it("should return 400 for invalid role value", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await updateMember(
      makeRequest({ role: "SUPERADMIN" }),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid role");
  });

  it("should return 403 when non-owner promotes to OWNER", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:role"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await updateMember(
      makeRequest({ role: "OWNER" }),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Only owners");
  });

  it("should return 400 when owner tries to demote themselves", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    // targetUserId === session.user.id
    const response = await updateMember(
      makeRequest({ role: "ADMIN" }),
      makeParams({ orgId: mockOrgId, userId: "user-123" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("cannot demote yourself");
  });

  it("should update member role on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(updateMemberRole).mockResolvedValue({
      id: "mem-1",
      userId: mockUserId,
      role: "ADMIN",
    } as never);

    const response = await updateMember(
      makeRequest({ role: "ADMIN" }),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.member.role).toBe("ADMIN");
    expect(data.message).toBe("Member role updated successfully");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("OWNER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["*"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(updateMemberRole).mockRejectedValue(new Error("Database error"));

    const response = await updateMember(
      makeRequest({ role: "ADMIN" }),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

describe("DELETE /api/organizations/[orgId]/members/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await removeMemberRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/members/user-456",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await removeMemberRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/members/user-456",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks members:remove permission for another user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("MEMBER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["org:read"]);
    vi.mocked(hasPermission).mockReturnValue(false);

    const response = await removeMemberRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/members/user-456",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should allow users to remove themselves without members:remove permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("MEMBER" as never);
    vi.mocked(removeMember).mockResolvedValue(undefined);

    // targetUserId === session.user.id, skips permission check
    const response = await removeMemberRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/members/user-123",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, userId: "user-123" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Member removed successfully");
  });

  it("should remove member on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:remove"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(removeMember).mockResolvedValue(undefined);

    const response = await removeMemberRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/members/user-456",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Member removed successfully");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:remove"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(removeMember).mockRejectedValue(new Error("Cannot remove owner"));

    const response = await removeMemberRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/members/user-456",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, userId: mockUserId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// =============================================
// 5. Invitations ([orgId]/invitations/route.ts)
// =============================================

describe("GET /api/organizations/[orgId]/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await listInvitations(
      new Request("http://localhost/api/organizations/org-abc/invitations"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await listInvitations(
      new Request("http://localhost/api/organizations/org-abc/invitations"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks members:invite permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("MEMBER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["org:read"]);
    vi.mocked(hasPermission).mockReturnValue(false);

    const response = await listInvitations(
      new Request("http://localhost/api/organizations/org-abc/invitations"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should return invitations on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(getOrganizationInvitations).mockResolvedValue([
      {
        id: mockInvitationId,
        email: "invited@example.com",
        role: "MEMBER",
        expiresAt: new Date(),
        createdAt: new Date(),
        invitedBy: "user-123",
      },
    ] as never);

    const response = await listInvitations(
      new Request("http://localhost/api/organizations/org-abc/invitations"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.invitations).toHaveLength(1);
    expect(data.invitations[0].email).toBe("invited@example.com");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(getOrganizationInvitations).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await listInvitations(
      new Request("http://localhost/api/organizations/org-abc/invitations"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch invitations");
  });
});

describe("POST /api/organizations/[orgId]/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request(
      "http://localhost/api/organizations/org-abc/invitations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  }

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await createInvitationRoute(
      makeRequest({ email: "new@example.com" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when email is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await createInvitationRoute(
      makeRequest({}),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Email is required");
  });

  it("should return 400 for invalid email format", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await createInvitationRoute(
      makeRequest({ email: "not-an-email" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid email");
  });

  it("should return 400 for OWNER role invitation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);

    const response = await createInvitationRoute(
      makeRequest({ email: "new@example.com", role: "OWNER" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Cannot invite as OWNER");
  });

  it("should create invitation on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(createInvitation).mockResolvedValue({
      id: mockInvitationId,
      email: "new@example.com",
      role: "MEMBER",
      expiresAt: new Date(),
      token: "secure-token-abc",
    } as never);

    const response = await createInvitationRoute(
      makeRequest({ email: "new@example.com" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.invitation.email).toBe("new@example.com");
    expect(data.invitation.role).toBe("MEMBER");
    expect(data.invitation.inviteUrl).toContain("secure-token-abc");
    expect(data.message).toBe("Invitation created successfully");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(createInvitation).mockRejectedValue(new Error("Already invited"));

    const response = await createInvitationRoute(
      makeRequest({ email: "new@example.com" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// =============================================
// 6. Invitation Detail ([orgId]/invitations/[id]/route.ts)
// =============================================

describe("DELETE /api/organizations/[orgId]/invitations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await cancelInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await cancelInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 403 when user lacks members:invite permission", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("MEMBER" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["org:read"]);
    vi.mocked(hasPermission).mockReturnValue(false);

    const response = await cancelInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should cancel invitation on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(cancelInvitation).mockResolvedValue(undefined);

    const response = await cancelInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Invitation cancelled successfully");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(cancelInvitation).mockRejectedValue(new Error("Not found"));

    const response = await cancelInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

describe("POST /api/organizations/[orgId]/invitations/[id] (resend)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await resendInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "POST" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not a member", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue(null);

    const response = await resendInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "POST" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should resend invitation on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(resendInvitation).mockResolvedValue({
      id: mockInvitationId,
      email: "invited@example.com",
      role: "MEMBER",
      expiresAt: new Date(),
      token: "new-token-xyz",
    } as never);

    const response = await resendInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "POST" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.invitation.inviteUrl).toContain("new-token-xyz");
    expect(data.message).toBe("Invitation resent successfully");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getUserRole).mockResolvedValue("ADMIN" as never);
    vi.mocked(getDefaultPermissionsForRole).mockReturnValue(["members:invite"]);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(resendInvitation).mockRejectedValue(
      new Error("Already accepted"),
    );

    const response = await resendInvitationRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/invitations/inv-789",
        { method: "POST" },
      ),
      makeParams({ orgId: mockOrgId, id: mockInvitationId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// =============================================
// 7. Spacecraft ([orgId]/spacecraft/route.ts)
// =============================================

describe("GET /api/organizations/[orgId]/spacecraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await listSpacecraft(
      new Request("http://localhost/api/organizations/org-abc/spacecraft"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when access is denied", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: false,
      error: "You are not a member of this organization",
      status: 403,
    });

    const response = await listSpacecraft(
      new Request("http://localhost/api/organizations/org-abc/spacecraft"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return spacecraft list on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(getSpacecraftList).mockResolvedValue({
      spacecraft: [
        {
          id: mockSpacecraftId,
          name: "Sat-1",
          missionType: "communication",
          orbitType: "LEO",
          status: "OPERATIONAL",
        },
      ],
      total: 1,
    } as never);

    const response = await listSpacecraft(
      new Request("http://localhost/api/organizations/org-abc/spacecraft"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.spacecraft).toHaveLength(1);
    expect(data.spacecraft[0].name).toBe("Sat-1");
    expect(data.total).toBe(1);
    expect(data.filterOptions).toBeDefined();
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(getSpacecraftList).mockRejectedValue(new Error("Database error"));

    const response = await listSpacecraft(
      new Request("http://localhost/api/organizations/org-abc/spacecraft"),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch spacecraft");
  });
});

describe("POST /api/organizations/[orgId]/spacecraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request(
      "http://localhost/api/organizations/org-abc/spacecraft",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  }

  const validSpacecraft = {
    name: "Sentinel-1A",
    missionType: "observation",
    orbitType: "LEO",
  };

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await createSpacecraftRoute(
      makeRequest(validSpacecraft),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when access is denied", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: false,
      error: "You don't have permission to perform this action",
      status: 403,
    });

    const response = await createSpacecraftRoute(
      makeRequest(validSpacecraft),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should return 400 when name is too short", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });

    const response = await createSpacecraftRoute(
      makeRequest({ ...validSpacecraft, name: "A" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("name");
  });

  it("should return 400 when missionType is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });

    const response = await createSpacecraftRoute(
      makeRequest({ name: "Sat-1", orbitType: "LEO" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Mission type");
  });

  it("should return 400 when orbitType is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });

    const response = await createSpacecraftRoute(
      makeRequest({ name: "Sat-1", missionType: "observation" }),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Orbit type");
  });

  it("should create spacecraft on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(createSpacecraft).mockResolvedValue({
      id: mockSpacecraftId,
      name: "Sentinel-1A",
      missionType: "observation",
      orbitType: "LEO",
      status: "PRE_LAUNCH",
    } as never);

    const response = await createSpacecraftRoute(
      makeRequest(validSpacecraft),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.spacecraft.name).toBe("Sentinel-1A");
    expect(data.message).toBe("Spacecraft created successfully");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(createSpacecraft).mockRejectedValue(new Error("Database error"));

    const response = await createSpacecraftRoute(
      makeRequest(validSpacecraft),
      makeParams({ orgId: mockOrgId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

// =============================================
// 8. Spacecraft Detail ([orgId]/spacecraft/[spacecraftId]/route.ts)
// =============================================

describe("GET /api/organizations/[orgId]/spacecraft/[spacecraftId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await getSpacecraftDetail(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when access is denied", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: false,
      error: "You are not a member of this organization",
      status: 403,
    });

    const response = await getSpacecraftDetail(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("not a member");
  });

  it("should return 404 when spacecraft not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(getSpacecraft).mockResolvedValue(null);

    const response = await getSpacecraftDetail(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("should return spacecraft details on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(getSpacecraft).mockResolvedValue({
      id: mockSpacecraftId,
      name: "Sat-1",
      status: "OPERATIONAL",
      missionType: "communication",
      orbitType: "LEO",
    } as never);
    vi.mocked(canTransitionStatus).mockReturnValue(true);

    const response = await getSpacecraftDetail(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.spacecraft.name).toBe("Sat-1");
    expect(data.availableTransitions).toBeDefined();
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(getSpacecraft).mockRejectedValue(new Error("Database error"));

    const response = await getSpacecraftDetail(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch spacecraft");
  });
});

describe("PATCH /api/organizations/[orgId]/spacecraft/[spacecraftId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request(
      "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  }

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await updateSpacecraftRoute(
      makeRequest({ name: "Updated Sat" }),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when access is denied", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: false,
      error: "You don't have permission to perform this action",
      status: 403,
    });

    const response = await updateSpacecraftRoute(
      makeRequest({ name: "Updated Sat" }),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should handle status-only update", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(updateSpacecraftStatus).mockResolvedValue({
      id: mockSpacecraftId,
      name: "Sat-1",
      status: "OPERATIONAL",
    } as never);

    const response = await updateSpacecraftRoute(
      makeRequest({ status: "OPERATIONAL" }),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Spacecraft status updated successfully");
    expect(updateSpacecraftStatus).toHaveBeenCalled();
    expect(updateSpacecraft).not.toHaveBeenCalled();
  });

  it("should handle full update", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(updateSpacecraft).mockResolvedValue({
      id: mockSpacecraftId,
      name: "Updated Sat",
      missionType: "observation",
    } as never);

    const response = await updateSpacecraftRoute(
      makeRequest({ name: "Updated Sat", missionType: "observation" }),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Spacecraft updated successfully");
    expect(updateSpacecraft).toHaveBeenCalled();
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(updateSpacecraft).mockRejectedValue(new Error("Database error"));

    const response = await updateSpacecraftRoute(
      makeRequest({ name: "Updated Sat" }),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

describe("DELETE /api/organizations/[orgId]/spacecraft/[spacecraftId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await deleteSpacecraftRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when access is denied", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: false,
      error: "You don't have permission to perform this action",
      status: 403,
    });

    const response = await deleteSpacecraftRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("permission");
  });

  it("should delete spacecraft on success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(deleteSpacecraft).mockResolvedValue(undefined as never);

    const response = await deleteSpacecraftRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Spacecraft deleted successfully");
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(verifyOrganizationAccess).mockResolvedValue({
      success: true,
      context: {} as never,
    });
    vi.mocked(deleteSpacecraft).mockRejectedValue(new Error("Database error"));

    const response = await deleteSpacecraftRoute(
      new Request(
        "http://localhost/api/organizations/org-abc/spacecraft/sc-001",
        { method: "DELETE" },
      ),
      makeParams({ orgId: mockOrgId, spacecraftId: mockSpacecraftId }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
