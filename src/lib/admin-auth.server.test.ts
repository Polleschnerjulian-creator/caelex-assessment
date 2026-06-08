/**
 * Unit tests for the server-only super-admin gate + access audit.
 *
 * The allowlist itself (lib/super-admin) is exercised by its own suite; here we
 * verify the GATE behaviour: identity resolution, the 403 API response, the
 * page redirects, and that the audit write is genuinely best-effort.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
  getRequestContext: vi.fn(() => ({ ipAddress: "1.2.3.4", userAgent: "UA" })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { NextResponse } from "next/server";
import {
  getSuperAdminIdentity,
  requireSuperAdminApi,
  requireSuperAdminPage,
  logSuperAdminAccess,
} from "./admin-auth.server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockLogAuditEvent = logAuditEvent as unknown as ReturnType<typeof vi.fn>;

// A hardcoded company base super-admin — true without any env configuration.
const SUPER = "julian@caelex.eu";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SUPERADMIN_EMAILS;
});

describe("getSuperAdminIdentity", () => {
  it("returns null when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getSuperAdminIdentity()).toBeNull();
  });

  it("returns null when authenticated but not a super-admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "nobody@example.com" },
    });
    expect(await getSuperAdminIdentity()).toBeNull();
  });

  it("returns the identity for a super-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: SUPER } });
    expect(await getSuperAdminIdentity()).toEqual({
      userId: "u1",
      email: SUPER,
    });
  });

  it("returns null for a super-admin whose MFA is required but unverified", async () => {
    // The /api/admin/v2 routes are outside the page MFA gate, so this guard
    // must reject a partial session itself.
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: SUPER, mfaRequired: true, mfaVerified: false },
    });
    expect(await getSuperAdminIdentity()).toBeNull();
  });

  it("returns the identity once MFA is verified", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: SUPER, mfaRequired: true, mfaVerified: true },
    });
    expect(await getSuperAdminIdentity()).toEqual({
      userId: "u1",
      email: SUPER,
    });
  });
});

describe("requireSuperAdminApi", () => {
  it("returns a 403 NextResponse for a non-super-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "x@example.com" } });
    const r = await requireSuperAdminApi();
    expect(r).toBeInstanceOf(NextResponse);
    expect((r as NextResponse).status).toBe(403);
  });

  it("returns the identity for a super-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: SUPER } });
    const r = await requireSuperAdminApi();
    expect(r).not.toBeInstanceOf(NextResponse);
    expect(r).toEqual({ userId: "u1", email: SUPER });
  });
});

describe("requireSuperAdminPage", () => {
  it("redirects anonymous users to the login with an /admin callback", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireSuperAdminPage()).rejects.toThrow(
      "REDIRECT:/login?callbackUrl=%2Fadmin",
    );
  });

  it("redirects authenticated non-super-admins to /dashboard", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "x@example.com" } });
    await expect(requireSuperAdminPage()).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });

  it("redirects a super-admin with unverified MFA to the TOTP challenge", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: SUPER, mfaRequired: true, mfaVerified: false },
    });
    await expect(requireSuperAdminPage()).rejects.toThrow(
      "REDIRECT:/auth/mfa-challenge?callbackUrl=%2Fadmin",
    );
  });

  it("returns the identity for a super-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: SUPER } });
    expect(await requireSuperAdminPage()).toEqual({
      userId: "u1",
      email: SUPER,
    });
  });
});

describe("logSuperAdminAccess", () => {
  it("writes a hash-chained audit entry with the surface + identity", async () => {
    mockLogAuditEvent.mockResolvedValue(undefined);
    await logSuperAdminAccess({
      userId: "u1",
      email: SUPER,
      surface: "admin:cockpit",
    });
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent.mock.calls[0][0]).toMatchObject({
      userId: "u1",
      action: "superadmin_access",
      entityType: "admin_surface",
      entityId: "admin:cockpit",
    });
  });

  it("never throws when the audit write fails (best-effort)", async () => {
    mockLogAuditEvent.mockRejectedValue(new Error("db down"));
    await expect(
      logSuperAdminAccess({
        userId: "u1",
        email: SUPER,
        surface: "admin:cockpit",
      }),
    ).resolves.toBeUndefined();
  });
});
