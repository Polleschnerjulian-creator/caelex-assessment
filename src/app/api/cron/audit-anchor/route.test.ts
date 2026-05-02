/**
 * /api/cron/audit-anchor — Sprint 8A tests.
 *
 * Coverage:
 *
 *   1. 503 when CRON_SECRET unset
 *   2. 401 without auth header
 *   3. 401 with wrong secret
 *   4. enabled:false default — no anchoring, no service call
 *   5. enabled:true → calls submitAuditAnchorsForAllActiveOrgs and
 *      reports counts in the response
 *   6. 500 on submitAuditAnchorsForAllActiveOrgs throw
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSubmitAll } = vi.hoisted(() => ({ mockSubmitAll: vi.fn() }));

vi.mock("@/lib/audit-anchor.server", () => ({
  submitAuditAnchorsForAllActiveOrgs: mockSubmitAll,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "./route";

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request("https://app.caelex.com/api/cron/audit-anchor", {
    headers: h,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  delete process.env.AUDIT_ANCHOR_ENABLED;
  mockSubmitAll.mockResolvedValue([]);
});

// ─── Auth ────────────────────────────────────────────────────────────────

describe("audit-anchor cron — auth", () => {
  it("returns 503 when CRON_SECRET unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(503);
  });

  it("returns 401 without auth header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });
});

// ─── Disabled ────────────────────────────────────────────────────────────

describe("audit-anchor cron — disabled by default", () => {
  it("returns enabled:false and skips the tick when env-flag is unset", async () => {
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.orgsAnchored).toBe(0);
    expect(mockSubmitAll).not.toHaveBeenCalled();
  });
});

// ─── Enabled ─────────────────────────────────────────────────────────────

describe("audit-anchor cron — enabled", () => {
  beforeEach(() => {
    process.env.AUDIT_ANCHOR_ENABLED = "1";
  });

  it("calls submitAuditAnchorsForAllActiveOrgs and reports counts", async () => {
    mockSubmitAll.mockResolvedValueOnce([
      {
        organizationId: "org_a",
        anchors: [
          { id: "a1", calendarUrl: "c1", status: "PENDING", proofBytes: 100 },
          { id: "a2", calendarUrl: "c2", status: "PENDING", proofBytes: 100 },
          { id: "a3", calendarUrl: "c3", status: "FAILED", error: "x" },
        ],
      },
      {
        organizationId: "org_b",
        anchors: [
          { id: "b1", calendarUrl: "c1", status: "PENDING", proofBytes: 100 },
        ],
      },
    ]);
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.orgsAnchored).toBe(2);
    expect(body.anchorsCreated).toBe(3);
    expect(body.anchorsFailed).toBe(1);
    expect(mockSubmitAll).toHaveBeenCalledOnce();
  });

  it("returns 500 when the service throws", async () => {
    mockSubmitAll.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
  });
});
