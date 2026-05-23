/**
 * Tests for the supplement-2-period-open cron handler (Z29, Tier 4).
 *
 * Coverage (6 cases):
 *   1. Returns 500 when CRON_SECRET is unset
 *   2. Returns 401 on missing / mismatched Bearer header
 *   3. Skips on non-period-open day (no service call)
 *   4. Runs the service on Jan 1 (H2 of prior year)
 *   5. Runs the service on Jul 1 (H1 of current year)
 *   6. ?force=1 query param bypasses the date gate
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOpenPeriod } = vi.hoisted(() => ({
  mockOpenPeriod: vi.fn(),
}));

vi.mock("@/lib/trade/supplement-2/supplement-2-service", () => ({
  openPeriodForAllOrganisations: mockOpenPeriod,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET, isPeriodOpenDay } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mockOpenPeriod.mockResolvedValue({
    periodId: "2026-H1",
    organisationsScanned: 5,
    reportsCreated: 3,
    reportsUpdated: 2,
    totalEligibleOperations: 10,
    errors: [],
  });
  vi.useFakeTimers();
  // Default to Jul 1, 2026 — a period-open day
  vi.setSystemTime(new Date("2026-07-01T02:00:00.000Z"));
  process.env.CRON_SECRET = "test-secret-1234";
});

function makeRequest(
  headers: Record<string, string> = {},
  url = "https://app.example.com/api/cron/supplement-2-period-open",
) {
  return new Request(url, {
    method: "GET",
    headers: new Headers(headers),
  });
}

describe("isPeriodOpenDay", () => {
  it("is true on Jan 1 (UTC)", () => {
    expect(isPeriodOpenDay(new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("is true on Jul 1 (UTC)", () => {
    expect(isPeriodOpenDay(new Date("2026-07-01T00:00:00.000Z"))).toBe(true);
  });

  it("is false on Jan 2", () => {
    expect(isPeriodOpenDay(new Date("2026-01-02T00:00:00.000Z"))).toBe(false);
  });

  it("is false on a random mid-month date", () => {
    expect(isPeriodOpenDay(new Date("2026-04-15T00:00:00.000Z"))).toBe(false);
  });
});

describe("supplement-2-period-open GET", () => {
  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest({ authorization: "Bearer x" }));
    expect(res.status).toBe(500);
  });

  it("returns 401 when authorization header is missing or wrong", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(mockOpenPeriod).not.toHaveBeenCalled();
  });

  it("skips on non-period-open day without calling the service", async () => {
    vi.setSystemTime(new Date("2026-03-15T02:00:00.000Z"));
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret-1234" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
    expect(mockOpenPeriod).not.toHaveBeenCalled();
  });

  it("runs the service on Jul 1 and opens H1 of current year", async () => {
    vi.setSystemTime(new Date("2026-07-01T02:00:00.000Z"));
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret-1234" }),
    );
    expect(res.status).toBe(200);
    expect(mockOpenPeriod).toHaveBeenCalledOnce();
    const callArg = mockOpenPeriod.mock.calls[0][0];
    expect(callArg.id).toBe("2026-H1");
    const body = await res.json();
    expect(body.periodId).toBe("2026-H1");
  });

  it("runs the service on Jan 1 and opens H2 of prior year", async () => {
    vi.setSystemTime(new Date("2026-01-01T02:00:00.000Z"));
    mockOpenPeriod.mockResolvedValueOnce({
      periodId: "2025-H2",
      organisationsScanned: 5,
      reportsCreated: 3,
      reportsUpdated: 2,
      totalEligibleOperations: 10,
      errors: [],
    });
    const res = await GET(
      makeRequest({ authorization: "Bearer test-secret-1234" }),
    );
    expect(res.status).toBe(200);
    const callArg = mockOpenPeriod.mock.calls[0][0];
    expect(callArg.id).toBe("2025-H2");
  });

  it("?force=1 bypasses the date gate", async () => {
    vi.setSystemTime(new Date("2026-03-15T02:00:00.000Z"));
    const res = await GET(
      makeRequest(
        { authorization: "Bearer test-secret-1234" },
        "https://app.example.com/api/cron/supplement-2-period-open?force=1",
      ),
    );
    expect(res.status).toBe(200);
    expect(mockOpenPeriod).toHaveBeenCalledOnce();
  });
});
