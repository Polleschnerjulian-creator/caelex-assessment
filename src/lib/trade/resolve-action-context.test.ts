/**
 * Tests for src/lib/trade/resolve-action-context.ts — Sprint F2.
 *
 * Pins the behaviour of the shared throwing auth-resolver that replaces
 * the ten inline `resolveSessionContext()` copies across the trade
 * server-action modules.
 *
 * Mock pattern mirrors classification-draft-actions.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockPrisma, mockAuth, mockIsSuperAdmin } = vi.hoisted(() => ({
  mockPrisma: {
    organization: { findFirst: vi.fn() },
    organizationMember: { findFirst: vi.fn() },
  },
  mockAuth: vi.fn(),
  mockIsSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/super-admin", () => ({ isSuperAdmin: mockIsSuperAdmin }));

import {
  resolveActionContext,
  TradeActionError,
} from "./resolve-action-context";

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSuperAdmin.mockReturnValue(false);
});

// ─── Happy path ──────────────────────────────────────────────────────

describe("resolveActionContext — happy path", () => {
  it("returns userId, orgId and role for a valid org member", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "member@example.com" },
    });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
      role: "MANAGER",
    });

    const ctx = await resolveActionContext();

    expect(ctx).toEqual({ userId: "user-1", orgId: "org-1", role: "MANAGER" });
    expect(mockPrisma.organizationMember.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", organization: { isActive: true } },
      select: { organizationId: true, role: true },
      orderBy: { joinedAt: "asc" },
    });
  });
});

// ─── Unauthenticated ─────────────────────────────────────────────────

describe("resolveActionContext — no session", () => {
  it("throws TradeActionError with 'Not signed in' when session is null", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(resolveActionContext()).rejects.toThrow(TradeActionError);
    await expect(resolveActionContext()).rejects.toThrow("Not signed in");
  });

  it("throws TradeActionError when session exists but user.id is missing", async () => {
    mockAuth.mockResolvedValue({ user: { email: "anon@example.com" } });

    await expect(resolveActionContext()).rejects.toThrow(TradeActionError);
    await expect(resolveActionContext()).rejects.toThrow("Not signed in");
  });
});

// ─── No org membership ───────────────────────────────────────────────

describe("resolveActionContext — no org membership", () => {
  it("throws TradeActionError with 'No active organisation membership' when membership is null", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-2", email: "nomember@example.com" },
    });
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

    await expect(resolveActionContext()).rejects.toThrow(TradeActionError);
    await expect(resolveActionContext()).rejects.toThrow(
      "No active organisation membership",
    );
  });
});

// ─── Super-admin special case ────────────────────────────────────────

describe("resolveActionContext — super-admin", () => {
  it("resolves to first active org with synthetic OWNER role for a super-admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "superadmin@caelex.io" },
    });
    mockIsSuperAdmin.mockReturnValue(true);
    mockPrisma.organization.findFirst.mockResolvedValue({ id: "org-first" });

    const ctx = await resolveActionContext();

    expect(ctx).toEqual({
      userId: "admin-1",
      orgId: "org-first",
      role: "OWNER",
    });
    expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    // Must NOT touch organizationMember for super-admins.
    expect(mockPrisma.organizationMember.findFirst).not.toHaveBeenCalled();
  });

  it("throws TradeActionError when no active org exists (super-admin)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", email: "superadmin@caelex.io" },
    });
    mockIsSuperAdmin.mockReturnValue(true);
    mockPrisma.organization.findFirst.mockResolvedValue(null);

    await expect(resolveActionContext()).rejects.toThrow(TradeActionError);
    await expect(resolveActionContext()).rejects.toThrow(
      "No active organisation found",
    );
  });
});

// ─── Error class contract ────────────────────────────────────────────

describe("TradeActionError", () => {
  it("is an instanceof Error", () => {
    const e = new TradeActionError("test");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(TradeActionError);
  });

  it("exposes publicMessage and message identically", () => {
    const e = new TradeActionError("my message");
    expect(e.publicMessage).toBe("my message");
    expect(e.message).toBe("my message");
    expect(e.name).toBe("TradeActionError");
  });
});
