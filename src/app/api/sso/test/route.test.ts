/**
 * SSO Test Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/prisma", () => ({
  prisma: { organizationMember: { findFirst: vi.fn() } },
}));

const mockTestSSO = vi.fn();
vi.mock("@/lib/services/sso-service", () => ({
  testSSOConnection: (...a: unknown[]) => mockTestSSO(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  organizationMember: { findFirst: ReturnType<typeof vi.fn> };
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("https://app.caelex.com/api/sso/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/sso/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReset();
    mockPrisma.organizationMember.findFirst.mockReset();
    mockTestSSO.mockReset();
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await POST(makePost({}))).status).toBe(401);
  });

  it("returns 400 without organizationId", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    expect((await POST(makePost({}))).status).toBe(400);
  });

  it("returns 403 without admin role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      role: "MEMBER",
    });
    expect((await POST(makePost({ organizationId: "org-1" }))).status).toBe(
      403,
    );
  });

  it("returns test results on valid request", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      role: "ADMIN",
    });
    mockTestSSO.mockResolvedValue({ success: true, message: "Connection OK" });
    const res = await POST(makePost({ organizationId: "org-1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("returns 500 on error without leaking details", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      role: "ADMIN",
    });
    mockTestSSO.mockRejectedValue(new Error("Connection timeout"));
    const res = await POST(makePost({ organizationId: "org-1" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain(
      "Connection timeout",
    );
  });
});
