/**
 * Demo Follow-Up Cron Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    demoRequest: { findMany: vi.fn(), update: vi.fn() },
  },
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_: unknown, fb: string) => fb),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  demoRequest: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request("https://app.caelex.com/api/cron/demo-followup", {
    headers: h,
  });
}

describe("GET /api/cron/demo-followup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.demoRequest.findMany.mockReset();
    mockPrisma.demoRequest.update.mockReset();
    mockSendEmail.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  it("returns 503 when CRON_SECRET not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(503);
  });

  it("returns 401 without auth", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("returns success with 0 processed when no pending follow-ups", async () => {
    mockPrisma.demoRequest.findMany.mockResolvedValue([]);
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(0);
  });

  it("processes follow-ups, sends emails, updates status", async () => {
    mockPrisma.demoRequest.findMany.mockResolvedValue([
      {
        id: "d1",
        email: "user@test.com",
        name: "Test",
        followUpAt: new Date(),
      },
    ]);
    mockPrisma.demoRequest.update.mockResolvedValue({});
    mockSendEmail.mockResolvedValue({ success: true });

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(mockPrisma.demoRequest.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { status: "CONTACTED" },
    });
  });

  it("counts failed emails", async () => {
    mockPrisma.demoRequest.findMany.mockResolvedValue([
      {
        id: "d1",
        email: "user@test.com",
        name: "Test",
        followUpAt: new Date(),
      },
    ]);
    mockPrisma.demoRequest.update.mockResolvedValue({});
    mockSendEmail.mockResolvedValue({ success: false, error: "SMTP error" });

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(1);
  });

  it("returns 500 on database error without leaking details", async () => {
    mockPrisma.demoRequest.findMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(JSON.stringify(body)).not.toContain("DB down");
  });
});
