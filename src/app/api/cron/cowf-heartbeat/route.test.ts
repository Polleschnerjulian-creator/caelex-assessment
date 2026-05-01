/**
 * COWF Heartbeat Cron — auth + dispatch tests.
 *
 * Coverage:
 *
 *   1. 503 when CRON_SECRET unset
 *   2. 401 without auth header
 *   3. 401 on wrong secret
 *   4. 401 on same-length wrong secret (timing-safe)
 *   5. 200 + { enabled:false } when env-flag is OFF (default)
 *   6. 200 + { enabled:true, result } when env-flag is ON
 *   7. 500 + success:false when tick throws
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRunHeartbeat } = vi.hoisted(() => ({
  mockRunHeartbeat: vi.fn(),
}));

vi.mock("@/lib/cowf/heartbeat.server", () => ({
  runHeartbeatTick: mockRunHeartbeat,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request("https://app.caelex.com/api/cron/cowf-heartbeat", {
    headers: h,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  delete process.env.COWF_HEARTBEAT_ENABLED;
  mockRunHeartbeat.mockResolvedValue({
    tickedAt: "2026-04-30T10:00:00.000Z",
    totalDue: 0,
    fired: 0,
    failed: 0,
    retryQueued: 0,
    durationMs: 5,
    sample: [],
  });
});

describe("GET /api/cron/cowf-heartbeat — auth", () => {
  it("returns 503 when CRON_SECRET is unset", async () => {
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

  it("uses timing-safe equality (same-length wrong secret rejected)", async () => {
    process.env.CRON_SECRET = "abcdefgh";
    const res = await GET(makeRequest("Bearer 11111111"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/cron/cowf-heartbeat — disabled by default", () => {
  it("returns enabled:false and skips the tick when env-flag is unset", async () => {
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.success).toBe(true);
    expect(body.result).toBeUndefined();
    expect(mockRunHeartbeat).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/cowf-heartbeat — enabled", () => {
  beforeEach(() => {
    process.env.COWF_HEARTBEAT_ENABLED = "1";
  });

  it("invokes runHeartbeatTick and returns the result", async () => {
    mockRunHeartbeat.mockResolvedValueOnce({
      tickedAt: "2026-04-30T10:00:00.000Z",
      totalDue: 7,
      fired: 5,
      failed: 1,
      retryQueued: 1,
      durationMs: 23,
      sample: [],
    });
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.enabled).toBe(true);
    expect(body.result.totalDue).toBe(7);
    expect(body.result.fired).toBe(5);
  });

  it("returns 500 + success:false when the tick throws", async () => {
    mockRunHeartbeat.mockRejectedValueOnce(new Error("DB outage"));
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("DB outage");
  });
});
