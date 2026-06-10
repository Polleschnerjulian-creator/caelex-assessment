/**
 * Route-gate tests for POST+DELETE /api/trade/demo-workspace (I1 convention).
 *
 * Focus: getTradeAuth() null → 403 for every exported method; VIEWER → 403
 * (write route); valid MANAGER does not trip the gate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module stubs ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/trade/trade-auth", () => ({
  getTradeAuth: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-user"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/trade/demo-workspace.server", () => ({
  loadDemoWorkspace: vi.fn().mockResolvedValue({
    alreadyLoaded: false,
    created: { items: 3, parties: 2, operations: 1, sammelgenehmigungen: 1 },
  }),
  removeDemoWorkspace: vi.fn().mockResolvedValue({
    removed: { items: 3, parties: 2, operations: 1, sammelgenehmigungen: 1 },
  }),
}));

import { POST, DELETE } from "./route";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { loadDemoWorkspace } from "@/lib/trade/demo-workspace.server";

function makeReq(method: string): Request {
  return new Request("http://localhost/api/trade/demo-workspace", { method });
}

const managerAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

beforeEach(() => {
  vi.mocked(getTradeAuth).mockReset();
});

describe("demo-workspace route gate", () => {
  it("POST without trade auth → 403", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(null);
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(403);
  });

  it("DELETE without trade auth → 403", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE"));
    expect(res.status).toBe(403);
  });

  it("VIEWER role → 403 (write route)", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue({
      ...managerAuth,
      role: "VIEWER" as import("@prisma/client").OrganizationRole,
    });
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(403);
  });

  it("MANAGER passes the gate and seeds", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(managerAuth);
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(200);
    expect(vi.mocked(loadDemoWorkspace)).toHaveBeenCalledWith(
      "org-1",
      "user-1",
    );
  });

  it("second load → 409 (already loaded)", async () => {
    vi.mocked(getTradeAuth).mockResolvedValue(managerAuth);
    vi.mocked(loadDemoWorkspace).mockResolvedValueOnce({
      alreadyLoaded: true,
    });
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(409);
  });
});
