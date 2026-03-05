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
vi.mock("@/lib/satellites/types", () => ({}));
vi.mock("../core/constants", () => ({
  EARTH_RADIUS_KM: 6371,
}));

// Disable MSW so our fetch mock works properly
beforeAll(() => {
  server.close();
  vi.stubGlobal("fetch", mockFetch);
});

afterAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

// Static import for proper v8 function coverage tracking
import { getOrbitalElements, getCelesTrakStatus } from "./celestrak-adapter";

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeGPRecord(overrides: Record<string, unknown> = {}) {
  return {
    OBJECT_NAME: "ISS (ZARYA)",
    OBJECT_ID: "1998-067A",
    NORAD_CAT_ID: 25544,
    OBJECT_TYPE: "PAYLOAD",
    COUNTRY_CODE: "ISS",
    LAUNCH_DATE: "1998-11-20",
    DECAY_DATE: null,
    EPOCH: "2025-06-01T12:00:00.000Z",
    MEAN_MOTION: 15.5,
    ECCENTRICITY: 0.0001,
    INCLINATION: 51.6,
    RA_OF_ASC_NODE: 200.0,
    ARG_OF_PERICENTER: 100.0,
    MEAN_ANOMALY: 250.0,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: "U",
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 40000,
    BSTAR: 0.00005,
    MEAN_MOTION_DOT: 0.0001,
    MEAN_MOTION_DDOT: 0,
    SEMIMAJOR_AXIS: 6771,
    PERIOD: 92.5,
    APOAPSIS: 420,
    PERIAPSIS: 418,
    RCS_SIZE: "LARGE",
    ...overrides,
  };
}

describe("celestrak-adapter", () => {
  const GP_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours (matches source)

  beforeEach(() => {
    mockFetch.mockReset();
    mockSafeLog.mockReset();
    vi.useFakeTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getOrbitalElements
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getOrbitalElements", () => {
    it("returns correct OrbitalElements on successful fetch", async () => {
      vi.setSystemTime(new Date("2090-01-01T00:00:00Z"));
      const gp = makeGPRecord();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [gp],
      });

      const result = await getOrbitalElements("25544");

      expect(result).not.toBeNull();
      expect(result!.noradId).toBe("25544");
      expect(result!.epoch).toBe("2025-06-01T12:00:00.000Z");
      expect(result!.semiMajorAxisKm).toBe(6771);
      expect(result!.eccentricity).toBe(0.0001);
      expect(result!.inclinationDeg).toBe(51.6);
      expect(result!.raanDeg).toBe(200.0);
      expect(result!.argPerigeeDeg).toBe(100.0);
      expect(result!.meanAnomalyDeg).toBe(250.0);
      expect(result!.meanMotion).toBe(15.5);
      expect(result!.bstar).toBe(0.00005);
      expect(result!.altitudeKm).toBe(6771 - 6371); // 400
      expect(result!.periodMinutes).toBe(92.5);
      vi.useRealTimers();
    });

    it("returns null when fetch fails (network error)", async () => {
      vi.setSystemTime(new Date("2091-01-01T00:00:00Z"));
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await getOrbitalElements("25544");

      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it("returns null when fetch returns empty array", async () => {
      vi.setSystemTime(new Date("2092-01-01T00:00:00Z"));
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await getOrbitalElements("25544");

      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it("returns null when fetch returns non-ok response", async () => {
      vi.setSystemTime(new Date("2093-01-01T00:00:00Z"));
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await getOrbitalElements("25544");

      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it("returns null on abort/timeout", async () => {
      vi.setSystemTime(new Date("2094-01-01T00:00:00Z"));
      mockFetch.mockRejectedValue(new DOMException("Aborted", "AbortError"));

      const result = await getOrbitalElements("25544");

      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it("handles fetch timeout (abort controller fires after 15s)", async () => {
      vi.setSystemTime(new Date("2094-06-01T00:00:00Z"));

      // Make fetch hang until abort
      mockFetch.mockImplementation(
        (_url: string, options: { signal: AbortSignal }) => {
          return new Promise((_resolve, reject) => {
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

      const promise = getOrbitalElements("25544");
      vi.advanceTimersByTime(16000);

      const result = await promise;
      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it("returns cached result without fetching again", async () => {
      vi.setSystemTime(new Date("2095-01-01T00:00:00Z"));
      const gp = makeGPRecord();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [gp],
      });

      // First call — fetches
      const result1 = await getOrbitalElements("25544");
      expect(result1).not.toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance 1 hour (within 4h TTL)
      vi.advanceTimersByTime(60 * 60 * 1000);

      // Second call — should use cache
      const result2 = await getOrbitalElements("25544");
      expect(result2).not.toBeNull();
      expect(result2!.semiMajorAxisKm).toBe(6771);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
      vi.useRealTimers();
    });

    it("returns null from cache for unknown noradId after cache populated", async () => {
      vi.setSystemTime(new Date("2096-01-01T00:00:00Z"));
      const gp = makeGPRecord();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [gp],
      });

      // Populate cache with "25544"
      await getOrbitalElements("25544");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance slightly within TTL
      vi.advanceTimersByTime(60 * 1000);

      // Different norad ID — cache exists but no entry
      const result = await getOrbitalElements("99999");
      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getCelesTrakStatus
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getCelesTrakStatus", () => {
    it("returns lastTle and tleAge for valid record", async () => {
      const epochStr = "2025-06-01T12:00:00.000Z";
      const gp = makeGPRecord({ EPOCH: epochStr });

      // Set time to 2 hours after the epoch
      vi.setSystemTime(new Date("2097-01-01T00:00:00Z"));
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [gp],
      });

      // Need to control Date.now for the tleAge calculation
      vi.useRealTimers();
      const fakeNow = new Date("2025-06-01T14:00:00.000Z").getTime();
      vi.spyOn(Date, "now").mockReturnValue(fakeNow);

      const result = await getCelesTrakStatus("25544");

      expect(result.lastTle).toBe(epochStr);
      expect(result.tleAge).toBe(120); // 2 hours = 120 minutes
    });

    it("returns null values when no record found", async () => {
      vi.setSystemTime(new Date("2098-01-01T00:00:00Z"));
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await getCelesTrakStatus("99999");

      expect(result).toEqual({ lastTle: null, tleAge: null });
      vi.useRealTimers();
    });

    it("returns null values when fetch fails", async () => {
      vi.setSystemTime(new Date("2099-01-01T00:00:00Z"));
      mockFetch.mockRejectedValue(new Error("Fetch error"));

      const result = await getCelesTrakStatus("25544");

      expect(result).toEqual({ lastTle: null, tleAge: null });
      vi.useRealTimers();
    });
  });
});
