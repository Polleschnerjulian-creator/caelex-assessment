/**
 * /api/cron/audit-anchor-upgrade — Sprint 8B tests.
 *
 * Coverage:
 *
 *   1. Auth: 503 / 401 / 401-wrong
 *   2. Disabled by env flag — no service call
 *   3. Enabled — service called, counts in body
 *   4. 500 on service throw
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpgradeAll } = vi.hoisted(() => ({ mockUpgradeAll: vi.fn() }));

vi.mock("@/lib/audit-anchor.server", () => ({
  upgradeAllPendingAnchors: mockUpgradeAll,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "./route";

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request("https://app.caelex.com/api/cron/audit-anchor-upgrade", {
    headers: h,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  delete process.env.AUDIT_ANCHOR_ENABLED;
  mockUpgradeAll.mockResolvedValue({
    scanned: 0,
    upgraded: 0,
    stillPending: 0,
    gaveUp: 0,
    errored: 0,
  });
});

describe("audit-anchor-upgrade — auth", () => {
  it("503 when CRON_SECRET unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(503);
  });

  it("401 without auth header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("401 with wrong secret", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });
});

describe("audit-anchor-upgrade — disabled by default", () => {
  it("returns enabled:false and skips the service call", async () => {
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.upgraded).toBe(0);
    expect(mockUpgradeAll).not.toHaveBeenCalled();
  });
});

describe("audit-anchor-upgrade — enabled", () => {
  beforeEach(() => {
    process.env.AUDIT_ANCHOR_ENABLED = "1";
  });

  it("calls upgradeAllPendingAnchors and forwards counts", async () => {
    mockUpgradeAll.mockResolvedValueOnce({
      scanned: 12,
      upgraded: 8,
      stillPending: 3,
      gaveUp: 1,
      errored: 0,
    });
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.scanned).toBe(12);
    expect(body.upgraded).toBe(8);
    expect(body.stillPending).toBe(3);
    expect(body.gaveUp).toBe(1);
    expect(body.errored).toBe(0);
    expect(mockUpgradeAll).toHaveBeenCalledOnce();
  });

  it("returns 500 when the service throws", async () => {
    mockUpgradeAll.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
  });
});
