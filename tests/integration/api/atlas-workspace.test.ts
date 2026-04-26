/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Smoke tests for /api/atlas/workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findFirstMember: vi.fn(),
  createSm: vi.fn(),
  rl: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: mocks.findFirstMember },
  },
}));
vi.mock("@/lib/legal-network/matter-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/legal-network/matter-service")
  >("@/lib/legal-network/matter-service");
  return {
    ...actual,
    createStandaloneMatter: mocks.createSm,
  };
});
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mocks.rl,
  getIdentifier: () => "ip:test",
}));

import { POST } from "@/app/api/atlas/workspace/route";

function makeReq(body: unknown = {}) {
  return new Request("http://test/api/atlas/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/atlas/workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rl.mockResolvedValue({ success: true, reset: 0 });
  });

  it("returns 401 without session", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no active membership at all", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u_1" } });
    // Both LAW_FIRM-filter and isActive-fallback queries return null.
    mocks.findFirstMember.mockResolvedValue(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
  });

  it("falls back to any active membership when no LAW_FIRM/BOTH exists", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u_1" } });
    // First call (LAW_FIRM/BOTH filter) returns null, second call
    // (isActive-only fallback) returns the user's only membership.
    mocks.findFirstMember
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ organizationId: "op_1" });
    mocks.createSm.mockResolvedValue({ matterId: "m_solo_x" });

    const res = await POST(makeReq());
    expect(res.status).toBe(201);
    expect(mocks.createSm).toHaveBeenCalledWith({
      lawFirmOrgId: "op_1",
      createdBy: "u_1",
      name: undefined,
    });
  });

  it("creates a standalone matter for LAW_FIRM org", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "u_1" } });
    mocks.findFirstMember.mockResolvedValue({ organizationId: "lf_1" });
    mocks.createSm.mockResolvedValue({ matterId: "m_solo_1" });

    const res = await POST(makeReq({ name: "Test Workspace" }));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.matterId).toBe("m_solo_1");
    expect(mocks.createSm).toHaveBeenCalledWith({
      lawFirmOrgId: "lf_1",
      createdBy: "u_1",
      name: "Test Workspace",
    });
  });
});
