import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import { server } from "../../../../tests/mocks/server";

// ── Hoisted mocks ───────────────────────────────────────────────────────────
const mockSafeLog = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: mockSafeLog,
}));
vi.mock("../core/constants", () => ({
  F107_REFERENCE: 150,
}));

// Disable MSW for this test file so our fetch mock works
beforeAll(() => {
  server.close();
  vi.stubGlobal("fetch", mockFetch);
});

afterAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Import module once for proper v8 function coverage tracking
import { getCurrentF107 } from "./solar-flux-adapter";

describe("solar-flux-adapter", () => {
  const TTL = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    mockFetch.mockReset();
    mockSafeLog.mockReset();
    vi.useFakeTimers();
  });

  // ─── No cache → fallback paths ────────────────────────────────────────────

  it("returns F107_REFERENCE (150) when fetch throws error and no cache", async () => {
    vi.setSystemTime(new Date("2090-01-01T00:00:00Z"));
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await getCurrentF107();
    expect(result).toBe(150);
    vi.useRealTimers();
  });

  it("returns F107_REFERENCE (150) when response is not ok and no cache", async () => {
    vi.setSystemTime(new Date("2091-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await getCurrentF107();
    expect(result).toBe(150);
    vi.useRealTimers();
  });

  it("returns F107_REFERENCE (150) when records array is empty", async () => {
    vi.setSystemTime(new Date("2092-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await getCurrentF107();
    expect(result).toBe(150);
    vi.useRealTimers();
  });

  it("returns F107_REFERENCE (150) when records is null", async () => {
    vi.setSystemTime(new Date("2093-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => null,
    });

    const result = await getCurrentF107();
    expect(result).toBe(150);
    vi.useRealTimers();
  });

  it("returns F107_REFERENCE when no records have valid f10_7", async () => {
    vi.setSystemTime(new Date("2094-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          "time-tag": "2025-01",
          ssn: 100,
          smoothed_ssn: 90,
          observed_swpc_ssn: 95,
          smoothed_swpc_ssn: 88,
          f10_7: 0,
          "smoothed_f10.7": 135,
        },
        {
          "time-tag": "2025-02",
          ssn: 110,
          smoothed_ssn: 95,
          observed_swpc_ssn: 100,
          smoothed_swpc_ssn: 92,
          f10_7: -5,
          "smoothed_f10.7": 155,
        },
      ],
    });

    const result = await getCurrentF107();
    expect(result).toBe(150);
    vi.useRealTimers();
  });

  // ─── Successful fetch ──────────────────────────────────────────────────────

  it("returns latest f10_7 value from fresh fetch", async () => {
    vi.setSystemTime(new Date("2095-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          "time-tag": "2025-01",
          ssn: 100,
          smoothed_ssn: 90,
          observed_swpc_ssn: 95,
          smoothed_swpc_ssn: 88,
          f10_7: 140,
          "smoothed_f10.7": 135,
        },
        {
          "time-tag": "2025-02",
          ssn: 110,
          smoothed_ssn: 95,
          observed_swpc_ssn: 100,
          smoothed_swpc_ssn: 92,
          f10_7: 160,
          "smoothed_f10.7": 155,
        },
      ],
    });

    const result = await getCurrentF107();
    expect(result).toBe(160);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("picks last valid f10_7, skipping invalid trailing entries", async () => {
    vi.setSystemTime(new Date("2096-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          "time-tag": "2025-01",
          ssn: 100,
          smoothed_ssn: 90,
          observed_swpc_ssn: 95,
          smoothed_swpc_ssn: 88,
          f10_7: 140,
          "smoothed_f10.7": 135,
        },
        {
          "time-tag": "2025-03",
          ssn: 120,
          smoothed_ssn: 100,
          observed_swpc_ssn: 105,
          smoothed_swpc_ssn: 95,
          f10_7: 175,
          "smoothed_f10.7": 170,
        },
        {
          "time-tag": "2025-04",
          ssn: 130,
          smoothed_ssn: 105,
          observed_swpc_ssn: 110,
          smoothed_swpc_ssn: 98,
          f10_7: -1,
          "smoothed_f10.7": 180,
        },
      ],
    });

    const result = await getCurrentF107();
    expect(result).toBe(175);
    vi.useRealTimers();
  });

  it("returns cached value within TTL without re-fetching", async () => {
    vi.setSystemTime(new Date("2097-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          "time-tag": "2025-01",
          ssn: 100,
          smoothed_ssn: 90,
          observed_swpc_ssn: 95,
          smoothed_swpc_ssn: 88,
          f10_7: 200,
          "smoothed_f10.7": 190,
        },
      ],
    });

    const result1 = await getCurrentF107();
    expect(result1).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance 1h (within 24h TTL)
    vi.advanceTimersByTime(60 * 60 * 1000);

    const result2 = await getCurrentF107();
    expect(result2).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("returns cached value (not F107_REFERENCE) when fetch fails after cache", async () => {
    vi.setSystemTime(new Date("2098-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          "time-tag": "2025-01",
          ssn: 100,
          smoothed_ssn: 90,
          observed_swpc_ssn: 95,
          smoothed_swpc_ssn: 88,
          f10_7: 180,
          "smoothed_f10.7": 175,
        },
      ],
    });

    const result1 = await getCurrentF107();
    expect(result1).toBe(180);

    // Expire cache
    vi.advanceTimersByTime(TTL + 60000);

    // Fetch fails
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result2 = await getCurrentF107();
    // getCachedOrDefault returns cached 180
    expect(result2).toBe(180);
    vi.useRealTimers();
  });

  it("handles fetch timeout (abort controller fires)", async () => {
    vi.setSystemTime(new Date("2098-06-01T00:00:00Z"));

    // Make fetch return a promise that never resolves, simulating a hang
    mockFetch.mockImplementation(
      (_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          // Listen for abort signal
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            });
          }
        });
      },
    );

    // Start the call (don't await yet)
    const promise = getCurrentF107();

    // Advance timers past the 15s timeout to trigger controller.abort()
    vi.advanceTimersByTime(16000);

    const result = await promise;
    // Should fall back to getCachedOrDefault (cache has 180 from previous test)
    expect(typeof result).toBe("number");
    vi.useRealTimers();
  });

  it("returns cached value when non-ok after cache", async () => {
    vi.setSystemTime(new Date("2099-01-01T00:00:00Z"));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          "time-tag": "2025-01",
          ssn: 100,
          smoothed_ssn: 90,
          observed_swpc_ssn: 95,
          smoothed_swpc_ssn: 88,
          f10_7: 190,
          "smoothed_f10.7": 185,
        },
      ],
    });

    const result1 = await getCurrentF107();
    expect(result1).toBe(190);

    // Expire cache
    vi.advanceTimersByTime(TTL + 60000);

    // Non-ok
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    const result2 = await getCurrentF107();
    // getCachedOrDefault returns cached 190
    expect(result2).toBe(190);
    vi.useRealTimers();
  });
});
