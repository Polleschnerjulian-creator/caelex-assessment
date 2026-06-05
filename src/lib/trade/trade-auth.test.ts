/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Unit tests for the getTradeAuth() shared session + org + product-access helper.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/middleware/organization-guard", () => ({
  getCurrentOrganization: vi.fn(),
}));
vi.mock("@/lib/products", () => ({ hasProductAccess: vi.fn() }));
vi.mock("@/lib/super-admin", () => ({ isSuperAdmin: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { organization: { findFirst: vi.fn() } },
}));

// server-only guard would throw in test environment; mock it away
vi.mock("server-only", () => ({}));

// ─── Imports (after mocks are registered) ────────────────────────────────────

import { getTradeAuth } from "./trade-auth";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { isSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/prisma";

const mockAuth = auth as Mock;
const mockGetCurrentOrganization = getCurrentOrganization as Mock;
const mockHasProductAccess = hasProductAccess as Mock;
const mockIsSuperAdmin = isSuperAdmin as Mock;
const mockOrgFindFirst = prisma.organization.findFirst as Mock;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_SESSION = { user: { id: "user-abc" } };
const MOCK_ORG = {
  userId: "user-abc",
  organizationId: "org-xyz",
  role: "MEMBER" as const,
  permissions: [],
  organization: {
    id: "org-xyz",
    name: "Test Org",
    slug: "test-org",
    plan: "STARTER",
    isActive: true,
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getTradeAuth()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: ordinary (non-super-admin) user, so the existing membership +
    // entitlement tests below exercise the normal gate unchanged.
    mockIsSuperAdmin.mockReturnValue(false);
  });

  it("returns null when auth() resolves null (no session)", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getTradeAuth();

    expect(result).toBeNull();
    expect(mockGetCurrentOrganization).not.toHaveBeenCalled();
    expect(mockHasProductAccess).not.toHaveBeenCalled();
  });

  it("returns null when session has no user.id", async () => {
    mockAuth.mockResolvedValue({ user: {} });

    const result = await getTradeAuth();

    expect(result).toBeNull();
    expect(mockGetCurrentOrganization).not.toHaveBeenCalled();
    expect(mockHasProductAccess).not.toHaveBeenCalled();
  });

  it("returns null when getCurrentOrganization returns null (no org membership)", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION);
    mockGetCurrentOrganization.mockResolvedValue(null);

    const result = await getTradeAuth();

    expect(result).toBeNull();
    expect(mockHasProductAccess).not.toHaveBeenCalled();
  });

  it("returns null when hasProductAccess returns false (no TRADE entitlement)", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION);
    mockGetCurrentOrganization.mockResolvedValue(MOCK_ORG);
    mockHasProductAccess.mockResolvedValue(false);

    const result = await getTradeAuth();

    expect(result).toBeNull();
    expect(mockHasProductAccess).toHaveBeenCalledWith("org-xyz", "TRADE");
  });

  it("returns TradeAuthContext when all three checks pass", async () => {
    mockAuth.mockResolvedValue(MOCK_SESSION);
    mockGetCurrentOrganization.mockResolvedValue(MOCK_ORG);
    mockHasProductAccess.mockResolvedValue(true);

    const result = await getTradeAuth();

    expect(result).toEqual({
      userId: "user-abc",
      organizationId: "org-xyz",
      role: "MEMBER",
    });
    expect(mockHasProductAccess).toHaveBeenCalledWith("org-xyz", "TRADE");
  });

  it("passes the org's organizationId (not user id) to hasProductAccess", async () => {
    const orgWithDifferentIds = {
      ...MOCK_ORG,
      userId: "user-111",
      organizationId: "org-999",
    };
    mockAuth.mockResolvedValue({ user: { id: "user-111" } });
    mockGetCurrentOrganization.mockResolvedValue(orgWithDifferentIds);
    mockHasProductAccess.mockResolvedValue(true);

    await getTradeAuth();

    expect(mockHasProductAccess).toHaveBeenCalledWith("org-999", "TRADE");
  });

  // ─── Super-admin bypass ──────────────────────────────────────────────────
  // Parity with the (trade) layout, resolveActionContext(), resolveTradeOrgId(),
  // and getAtlasAuth(): platform owners reach Trade APIs regardless of org
  // membership or TRADE entitlement. Without this, a super-admin sees the Trade
  // UI (the layout lets them in) but every /api/trade/* call 403s.

  it("bypasses membership + entitlement for a super-admin, resolving the oldest active org as OWNER", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "owner-1", email: "founder@caelex.eu" },
    });
    mockIsSuperAdmin.mockReturnValue(true);
    mockOrgFindFirst.mockResolvedValue({ id: "org-oldest" });

    const result = await getTradeAuth();

    expect(result).toEqual({
      userId: "owner-1",
      organizationId: "org-oldest",
      role: "OWNER",
    });
    // Same query the (trade) layout + resolveActionContext use → the API
    // operates on the SAME org the shell displays.
    expect(mockOrgFindFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    // Must NOT fall through to the membership / entitlement gate.
    expect(mockGetCurrentOrganization).not.toHaveBeenCalled();
    expect(mockHasProductAccess).not.toHaveBeenCalled();
  });

  it("returns null for a super-admin when no active org exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "owner-1", email: "founder@caelex.eu" },
    });
    mockIsSuperAdmin.mockReturnValue(true);
    mockOrgFindFirst.mockResolvedValue(null);

    const result = await getTradeAuth();

    expect(result).toBeNull();
    expect(mockGetCurrentOrganization).not.toHaveBeenCalled();
  });

  it("does NOT bypass for a non-super-admin with a valid email (still hits the entitlement gate)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-abc", email: "member@example.com" },
    });
    mockIsSuperAdmin.mockReturnValue(false);
    mockGetCurrentOrganization.mockResolvedValue(MOCK_ORG);
    mockHasProductAccess.mockResolvedValue(false);

    const result = await getTradeAuth();

    expect(result).toBeNull();
    expect(mockOrgFindFirst).not.toHaveBeenCalled();
    expect(mockHasProductAccess).toHaveBeenCalledWith("org-xyz", "TRADE");
  });
});
