/**
 * MFA Backup Codes Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockValidateMfaCode = vi.fn();
const mockRegenerateBackupCodes = vi.fn();
vi.mock("@/lib/mfa.server", () => ({
  validateMfaCode: (...a: unknown[]) => mockValidateMfaCode(...a),
  regenerateBackupCodes: (...a: unknown[]) => mockRegenerateBackupCodes(...a),
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

import { POST } from "./route";

function makePost(body: unknown): Request {
  return new Request("https://app.caelex.com/api/auth/mfa/backup-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/mfa/backup-codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockValidateMfaCode.mockReset();
    mockRegenerateBackupCodes.mockReset();
    mockLogAuditEvent.mockReset();
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST(makePost({}))).status).toBe(401);
  });

  it("returns 400 on invalid code format (non-digits)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(makePost({ code: "abcdef" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid code");
  });

  it("returns 400 on invalid code format (wrong length)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    expect((await POST(makePost({ code: "123" }))).status).toBe(400);
  });

  it("returns 400 when MFA code is invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockValidateMfaCode.mockResolvedValue(false);
    const res = await POST(makePost({ code: "123456" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid verification code");
  });

  it("regenerates backup codes on valid request", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockValidateMfaCode.mockResolvedValue(true);
    mockRegenerateBackupCodes.mockResolvedValue(["code1", "code2", "code3"]);
    const res = await POST(makePost({ code: "123456" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.backupCodes).toEqual(["code1", "code2", "code3"]);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MFA_BACKUP_CODES_GENERATED" }),
    );
  });

  it("returns 500 on error without leaking details", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockValidateMfaCode.mockRejectedValue(new Error("DB crash"));
    const res = await POST(makePost({ code: "123456" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("DB crash");
  });
});
