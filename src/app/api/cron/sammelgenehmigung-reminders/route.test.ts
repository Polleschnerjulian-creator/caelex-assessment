/**
 * Tests for the sammelgenehmigung-reminders cron handler (Z11b, Tier 5).
 *
 * Coverage (5 cases):
 *   1. Returns 500 when CRON_SECRET is unset
 *   2. Returns 401 on missing / mismatched Bearer header
 *   3. Calls the service on a valid Bearer header
 *   4. Returns 500 with safe error when service throws
 *   5. Truncates per-SAG results to 10 in the response payload
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRunReminders } = vi.hoisted(() => ({
  mockRunReminders: vi.fn(),
}));

vi.mock(
  "@/lib/trade/sammelgenehmigung/sammelgenehmigung-reminder-service",
  () => ({
    runSammelgenehmigungRemindersAndExpiry: mockRunReminders,
  }),
);

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockRunReminders.mockResolvedValue({
    expiredTransitions: 2,
    scanned: 5,
    emittedNotifications: 8,
    emittedEmails: 1,
    perSammelgenehmigung: [],
    totalElapsedMs: 42,
  });
  process.env.CRON_SECRET = "test-secret-1234";
});

function makeRequest(headers: Record<string, string> = {}) {
  return new Request(
    "https://app.example.com/api/cron/sammelgenehmigung-reminders",
    {
      method: "GET",
      headers: new Headers(headers),
    },
  );
}

describe("sammelgenehmigung-reminders GET", () => {
  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest({ authorization: "Bearer x" }));
    expect(res.status).toBe(500);
  });

  it("returns 401 when authorization header is missing or wrong", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(mockRunReminders).not.toHaveBeenCalled();
  });

  it("returns 200 + summary payload when Bearer matches", async () => {
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret-1234" }),
    );
    expect(res.status).toBe(200);
    expect(mockRunReminders).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.expiredTransitions).toBe(2);
    expect(body.scanned).toBe(5);
    expect(body.emittedNotifications).toBe(8);
    expect(body.emittedEmails).toBe(1);
  });

  it("returns 500 with safe error when service throws", async () => {
    mockRunReminders.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret-1234" }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal error");
  });

  it("truncates sampleResults to 10 in the response", async () => {
    const big = Array.from({ length: 25 }, (_, i) => ({
      sammelgenehmigungId: `sag_${i}`,
      organizationId: "org_1",
      title: `SAG ${i}`,
      bafaReference: null,
      validUntil: new Date("2026-07-01T00:00:00.000Z"),
      daysRemaining: 10,
      bucket: "INFO_14" as const,
      notificationsCreated: 1,
      emailsSent: 0,
      ok: true,
    }));
    mockRunReminders.mockResolvedValueOnce({
      expiredTransitions: 0,
      scanned: 25,
      emittedNotifications: 25,
      emittedEmails: 0,
      perSammelgenehmigung: big,
      totalElapsedMs: 100,
    });
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret-1234" }),
    );
    const body = await res.json();
    expect(body.sampleResults).toHaveLength(10);
  });
});
