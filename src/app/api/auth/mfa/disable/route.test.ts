/**
 * MFA Disable Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockDisableMfa = vi.fn();
vi.mock("@/lib/mfa.server", () => ({
  disableMfa: (...a: unknown[]) => mockDisableMfa(...a),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

const mockLogAuditEvent = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...a: unknown[]) => mockLogAuditEvent(...a),
  getRequestContext: vi
    .fn()
    .mockReturnValue({ ipAddress: "1.2.3.4", userAgent: "test" }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { DELETE } from "./route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
};
const mockBcrypt = bcrypt as unknown as {
  compare: ReturnType<typeof vi.fn>;
};

function makeDel(body: unknown): Request {
  return new Request("https://app.caelex.com/api/auth/mfa/disable", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/auth/mfa/disable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockDisableMfa.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockBcrypt.compare.mockReset();
    mockCheckRateLimit.mockReset();
    mockLogAuditEvent.mockReset();
    mockCheckRateLimit.mockResolvedValue({ success: true });
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ success: false });
    expect((await DELETE(makeDel({}))).status).toBe(429);
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await DELETE(makeDel({}))).status).toBe(401);
  });

  it("returns 400 without password", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    expect((await DELETE(makeDel({}))).status).toBe(400);
  });

  it("returns 400 for OAuth-only accounts (no password)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ password: null });
    const res = await DELETE(makeDel({ password: "test123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("OAuth");
  });

  it("returns 400 when password is invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ password: "hashed" });
    mockBcrypt.compare.mockResolvedValue(false);
    const res = await DELETE(makeDel({ password: "wrong" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid password");
  });

  it("disables MFA on valid request", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ password: "hashed" });
    mockBcrypt.compare.mockResolvedValue(true);
    mockDisableMfa.mockResolvedValue(undefined);
    const res = await DELETE(makeDel({ password: "correct" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MFA_DISABLED" }),
    );
  });

  it("returns 500 on error without leaking details", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB crash"));
    const res = await DELETE(makeDel({ password: "test" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("DB crash");
  });
});
