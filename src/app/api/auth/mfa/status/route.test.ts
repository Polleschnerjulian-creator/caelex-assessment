/**
 * MFA Status Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockGetMfaStatus = vi.fn();
vi.mock("@/lib/mfa.server", () => ({
  getMfaStatus: (...a: unknown[]) => mockGetMfaStatus(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

describe("GET /api/auth/mfa/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockGetMfaStatus.mockReset();
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns MFA status on valid request", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetMfaStatus.mockResolvedValue({
      enabled: true,
      verified: true,
      backupCodesRemaining: 8,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.backupCodesRemaining).toBe(8);
  });

  it("returns disabled status when MFA not set up", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetMfaStatus.mockResolvedValue({ enabled: false, verified: false });
    const body = await (await GET()).json();
    expect(body.enabled).toBe(false);
  });

  it("returns 500 on error without leaking details", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockGetMfaStatus.mockRejectedValue(new Error("DB fail"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("DB fail");
  });
});
