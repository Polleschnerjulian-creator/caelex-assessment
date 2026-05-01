/**
 * /api/cron/pulse-nurture — auth + dispatch tests.
 *
 * Coverage:
 *
 *   1. 503 when CRON_SECRET unset
 *   2. 401 without auth
 *   3. 401 on wrong / same-length secret (timing-safe)
 *   4. enabled:false default — no candidate query, no sends
 *   5. enabled:true → queries candidates per stage, dispatches sendPulseEmail
 *   6. 500 on candidate-query throw
 *   7. truncated:true when MAX_EMAILS_PER_TICK reached
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPulseLead, mockSendPulseEmail } = vi.hoisted(() => ({
  mockPulseLead: { findMany: vi.fn() },
  mockSendPulseEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { pulseLead: mockPulseLead },
}));

vi.mock("@/lib/email/pulse/dispatcher.server", () => ({
  sendPulseEmail: mockSendPulseEmail,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request("https://app.caelex.com/api/cron/pulse-nurture", {
    headers: h,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  delete process.env.PULSE_NURTURE_ENABLED;
  mockPulseLead.findMany.mockResolvedValue([]);
  mockSendPulseEmail.mockResolvedValue({ sent: true });
});

// ─── Auth ──────────────────────────────────────────────────────────────────

describe("GET /api/cron/pulse-nurture — auth", () => {
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

  it("uses timing-safe equality (rejects same-length wrong)", async () => {
    process.env.CRON_SECRET = "abcdefgh";
    const res = await GET(makeRequest("Bearer 11111111"));
    expect(res.status).toBe(401);
  });
});

// ─── Disabled by default ──────────────────────────────────────────────────

describe("GET /api/cron/pulse-nurture — disabled by default", () => {
  it("returns enabled:false and skips the tick when env-flag is unset", async () => {
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.sent).toBe(0);
    expect(mockPulseLead.findMany).not.toHaveBeenCalled();
  });
});

// ─── Enabled ───────────────────────────────────────────────────────────────

describe("GET /api/cron/pulse-nurture — enabled", () => {
  beforeEach(() => {
    process.env.PULSE_NURTURE_ENABLED = "1";
  });

  it("queries day-1, day-3, and day-7 candidates separately", async () => {
    await GET(makeRequest("Bearer test-secret"));
    expect(mockPulseLead.findMany).toHaveBeenCalledTimes(3);
  });

  it("dispatches sendPulseEmail with the correct stage per row", async () => {
    mockPulseLead.findMany
      .mockResolvedValueOnce([{ id: "lead_a" }, { id: "lead_b" }]) // day-1
      .mockResolvedValueOnce([{ id: "lead_c" }]) // day-3
      .mockResolvedValueOnce([]); // day-7

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.totalCandidates).toBe(3);
    expect(body.byStage).toEqual({ day1: 2, day3: 1, day7: 0 });
    expect(mockSendPulseEmail).toHaveBeenCalledWith("lead_a", "day1");
    expect(mockSendPulseEmail).toHaveBeenCalledWith("lead_b", "day1");
    expect(mockSendPulseEmail).toHaveBeenCalledWith("lead_c", "day3");
    expect(body.sent).toBe(3);
  });

  it("counts skipped sends (already-sent / unsubscribed)", async () => {
    mockPulseLead.findMany
      .mockResolvedValueOnce([{ id: "lead_a" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockSendPulseEmail.mockResolvedValueOnce({
      sent: false,
      reason: "already-sent",
    });
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
  });

  it("counts failures from sendPulseEmail throws", async () => {
    mockPulseLead.findMany
      .mockResolvedValueOnce([{ id: "lead_a" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockSendPulseEmail.mockRejectedValueOnce(new Error("provider down"));
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.failed).toBe(1);
  });

  it("flags truncated when MAX_EMAILS_PER_TICK is reached", async () => {
    const fullPage = Array.from({ length: 200 }, (_, i) => ({
      id: `lead_${i}`,
    }));
    mockPulseLead.findMany.mockResolvedValue(fullPage);
    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();
    expect(body.truncated).toBe(true);
  });

  it("returns 500 on candidate-query throw", async () => {
    mockPulseLead.findMany.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(500);
  });
});
