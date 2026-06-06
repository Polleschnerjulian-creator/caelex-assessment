import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { organization: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/middleware/organization-guard", () => ({
  getCurrentOrganization: vi.fn(),
}));
vi.mock("@/lib/products", () => ({ hasProductAccess: vi.fn() }));
vi.mock("@/lib/super-admin", () => ({ isSuperAdmin: vi.fn() }));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { isSuperAdmin } from "@/lib/super-admin";
import { getScholarAuth } from "./scholar-auth";

const mockAuth = vi.mocked(auth);
const mockFindFirst = vi.mocked(prisma.organization.findFirst);
const mockGetOrg = vi.mocked(getCurrentOrganization);
const mockHasAccess = vi.mocked(hasProductAccess);
const mockIsSuperAdmin = vi.mocked(isSuperAdmin);

const orgCtx = {
  userId: "u1",
  organizationId: "org1",
  role: "MEMBER",
  permissions: [],
  organization: {
    id: "org1",
    name: "Uni",
    slug: "uni",
    plan: "FREE",
    isActive: true,
  },
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSuperAdmin.mockReturnValue(false); // default: ordinary (non-admin) user
});

describe("getScholarAuth", () => {
  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    expect(await getScholarAuth()).toBeNull();
  });

  it("returns null when the user has no active org", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetOrg.mockResolvedValue(null);
    expect(await getScholarAuth()).toBeNull();
  });

  it("returns null when the org lacks SCHOLAR access", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetOrg.mockResolvedValue(orgCtx);
    mockHasAccess.mockResolvedValue(false);
    expect(await getScholarAuth()).toBeNull();
  });

  it("returns the context when SCHOLAR access is granted", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetOrg.mockResolvedValue(orgCtx);
    mockHasAccess.mockResolvedValue(true);
    expect(await getScholarAuth()).toEqual({
      userId: "u1",
      organizationId: "org1",
      role: "MEMBER",
    });
  });

  it("gates specifically on the SCHOLAR product", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never);
    mockGetOrg.mockResolvedValue(orgCtx);
    mockHasAccess.mockResolvedValue(true);
    await getScholarAuth();
    expect(mockHasAccess).toHaveBeenCalledWith("org1", "SCHOLAR");
  });

  it("super-admin bypasses the entitlement gate → oldest active org as OWNER", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin1", email: "julian@caelex.eu" },
    } as never);
    mockIsSuperAdmin.mockReturnValue(true);
    mockFindFirst.mockResolvedValue({ id: "org-oldest" } as never);

    expect(await getScholarAuth()).toEqual({
      userId: "admin1",
      organizationId: "org-oldest",
      role: "OWNER",
    });
    // membership + entitlement checks are skipped entirely for super-admins
    expect(mockGetOrg).not.toHaveBeenCalled();
    expect(mockHasAccess).not.toHaveBeenCalled();
  });

  it("super-admin with no active org anywhere → null", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin1", email: "julian@caelex.eu" },
    } as never);
    mockIsSuperAdmin.mockReturnValue(true);
    mockFindFirst.mockResolvedValue(null as never);

    expect(await getScholarAuth()).toBeNull();
  });
});
