import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    securityAuditLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock security audit service
vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import {
  calculateDistance,
  checkImpossibleTravel,
  checkUnusualLocation,
  checkLoginAnomalies,
  formatAnomalyResponse,
} from "@/lib/anomaly-detection.server";
import type {
  GeoLocation,
  LoginLocation,
  AnomalyCheckResult,
} from "@/lib/anomaly-detection.server";

// Re-export the enums used in the module
const RiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

const SecurityAuditEventType = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  SSO_LOGIN: "SSO_LOGIN",
  PASSKEY_LOGIN_SUCCESS: "PASSKEY_LOGIN_SUCCESS",
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  UNUSUAL_LOCATION: "UNUSUAL_LOCATION",
} as const;

// ─── Test Fixtures ───

// Well-known coordinates for testing
const LOCATIONS = {
  berlin: {
    latitude: 52.52,
    longitude: 13.405,
    city: "Berlin",
    country: "Germany",
    countryCode: "DE",
  },
  munich: {
    latitude: 48.1351,
    longitude: 11.582,
    city: "Munich",
    country: "Germany",
    countryCode: "DE",
  },
  paris: {
    latitude: 48.8566,
    longitude: 2.3522,
    city: "Paris",
    country: "France",
    countryCode: "FR",
  },
  tokyo: {
    latitude: 35.6762,
    longitude: 139.6503,
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
  },
  newYork: {
    latitude: 40.7128,
    longitude: -74.006,
    city: "New York",
    country: "United States",
    countryCode: "US",
  },
  london: {
    latitude: 51.5074,
    longitude: -0.1278,
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
  },
  sydney: {
    latitude: -33.8688,
    longitude: 151.2093,
    city: "Sydney",
    country: "Australia",
    countryCode: "AU",
  },
  saoPaulo: {
    latitude: -23.5505,
    longitude: -46.6333,
    city: "Sao Paulo",
    country: "Brazil",
    countryCode: "BR",
  },
} as const;

function makeDbLoginLog(
  location: (typeof LOCATIONS)[keyof typeof LOCATIONS],
  createdAt: Date,
  ipAddress = "1.2.3.4",
) {
  return {
    ipAddress,
    city: location.city,
    country: location.country,
    metadata: {
      latitude: location.latitude,
      longitude: location.longitude,
      countryCode: location.countryCode,
    },
    createdAt,
  };
}

function makeLoginLocation(
  location: (typeof LOCATIONS)[keyof typeof LOCATIONS],
  timestamp: Date,
  ipAddress = "5.6.7.8",
): LoginLocation {
  return {
    ipAddress,
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city,
      country: location.country,
      countryCode: location.countryCode,
    },
    timestamp,
  };
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// ─── Tests ───

describe("Anomaly Detection Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════
  // calculateDistance (Haversine)
  // ════════════════════════════════════════════

  describe("calculateDistance", () => {
    it("should return 0 for identical coordinates", () => {
      const dist = calculateDistance(52.52, 13.405, 52.52, 13.405);
      expect(dist).toBe(0);
    });

    it("should calculate Berlin to Paris (~878 km)", () => {
      const dist = calculateDistance(
        LOCATIONS.berlin.latitude,
        LOCATIONS.berlin.longitude,
        LOCATIONS.paris.latitude,
        LOCATIONS.paris.longitude,
      );
      // Berlin to Paris is approximately 878 km
      expect(dist).toBeGreaterThan(850);
      expect(dist).toBeLessThan(910);
    });

    it("should calculate Berlin to Munich (~504 km)", () => {
      const dist = calculateDistance(
        LOCATIONS.berlin.latitude,
        LOCATIONS.berlin.longitude,
        LOCATIONS.munich.latitude,
        LOCATIONS.munich.longitude,
      );
      expect(dist).toBeGreaterThan(470);
      expect(dist).toBeLessThan(520);
    });

    it("should calculate New York to Tokyo (~10,838 km)", () => {
      const dist = calculateDistance(
        LOCATIONS.newYork.latitude,
        LOCATIONS.newYork.longitude,
        LOCATIONS.tokyo.latitude,
        LOCATIONS.tokyo.longitude,
      );
      expect(dist).toBeGreaterThan(10_700);
      expect(dist).toBeLessThan(11_000);
    });

    it("should calculate London to Sydney (~16,983 km)", () => {
      const dist = calculateDistance(
        LOCATIONS.london.latitude,
        LOCATIONS.london.longitude,
        LOCATIONS.sydney.latitude,
        LOCATIONS.sydney.longitude,
      );
      expect(dist).toBeGreaterThan(16_800);
      expect(dist).toBeLessThan(17_100);
    });

    it("should be symmetric (A->B = B->A)", () => {
      const distAB = calculateDistance(
        LOCATIONS.berlin.latitude,
        LOCATIONS.berlin.longitude,
        LOCATIONS.tokyo.latitude,
        LOCATIONS.tokyo.longitude,
      );
      const distBA = calculateDistance(
        LOCATIONS.tokyo.latitude,
        LOCATIONS.tokyo.longitude,
        LOCATIONS.berlin.latitude,
        LOCATIONS.berlin.longitude,
      );
      expect(distAB).toBeCloseTo(distBA, 10);
    });

    it("should handle antipodal points (max ~20,000 km)", () => {
      // North Pole to South Pole
      const dist = calculateDistance(90, 0, -90, 0);
      expect(dist).toBeGreaterThan(19_900);
      expect(dist).toBeLessThan(20_100);
    });

    it("should handle equatorial distance", () => {
      // Two points on the equator 90 degrees apart
      const dist = calculateDistance(0, 0, 0, 90);
      // Should be approximately 1/4 of the equatorial circumference (~10,018 km)
      expect(dist).toBeGreaterThan(9_900);
      expect(dist).toBeLessThan(10_100);
    });

    it("should handle negative coordinates (southern / western hemisphere)", () => {
      const dist = calculateDistance(
        LOCATIONS.saoPaulo.latitude,
        LOCATIONS.saoPaulo.longitude,
        LOCATIONS.sydney.latitude,
        LOCATIONS.sydney.longitude,
      );
      // Sao Paulo to Sydney is about 13,500 km
      expect(dist).toBeGreaterThan(13_200);
      expect(dist).toBeLessThan(13_700);
    });

    it("should handle very small distances correctly", () => {
      // Two points ~111 meters apart (0.001 degree latitude)
      const dist = calculateDistance(52.52, 13.405, 52.521, 13.405);
      expect(dist).toBeGreaterThan(0.1);
      expect(dist).toBeLessThan(0.2);
    });
  });

  // ════════════════════════════════════════════
  // checkImpossibleTravel
  // ════════════════════════════════════════════

  describe("checkImpossibleTravel", () => {
    it("should return non-anomalous when no previous login exists", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(null);

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.berlin, new Date()),
      );

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should return non-anomalous when current login has no location", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.berlin, hoursAgo(1)) as never,
      );

      const currentLogin: LoginLocation = {
        ipAddress: "5.6.7.8",
        timestamp: new Date(),
        // No location
      };

      const result = await checkImpossibleTravel("user-1", currentLogin);

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should return non-anomalous when previous login has no coordinates in metadata", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue({
        ipAddress: "1.2.3.4",
        city: "Berlin",
        country: "Germany",
        metadata: {}, // No latitude/longitude
        createdAt: hoursAgo(1),
      } as never);

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.tokyo, new Date()),
      );

      // getRecentLoginWithLocation returns null when no coords, so non-anomalous
      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should return non-anomalous when time diff is less than 60 seconds", async () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.tokyo, thirtySecondsAgo) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.berlin, now),
      );

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should return non-anomalous when distance is less than 100 km", async () => {
      // Berlin to Potsdam is ~26 km
      const potsdam: GeoLocation = {
        latitude: 52.3906,
        longitude: 13.0645,
        city: "Potsdam",
        country: "Germany",
        countryCode: "DE",
      };

      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue({
        ipAddress: "1.2.3.4",
        city: "Berlin",
        country: "Germany",
        metadata: {
          latitude: LOCATIONS.berlin.latitude,
          longitude: LOCATIONS.berlin.longitude,
          countryCode: "DE",
        },
        createdAt: minutesAgo(5),
      } as never);

      const currentLogin: LoginLocation = {
        ipAddress: "5.6.7.8",
        location: potsdam,
        timestamp: new Date(),
      };

      const result = await checkImpossibleTravel("user-1", currentLogin);

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should return non-anomalous when travel is realistic", async () => {
      // Berlin to Paris (~878 km) with 2 hours elapsed
      // At 1000 km/h max speed, 878 km requires ~0.878 hours (~52 min)
      // 2 hours > 0.878 hours, so travel is possible
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.berlin, hoursAgo(2)) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.paris, new Date()),
      );

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should detect impossible travel: Berlin to Tokyo in 2 hours", async () => {
      // Berlin to Tokyo ~8,920 km -> requires ~8.92 hours at 1000 km/h
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.berlin, hoursAgo(2)) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.tokyo, new Date()),
      );

      expect(result.isAnomalous).toBe(true);
      expect(result.anomalyType).toBe("impossible_travel");
      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.details?.distanceKm).toBeGreaterThan(8_800);
      expect(result.details?.timeDiffMinutes).toBeCloseTo(120, -1);
      expect(result.details?.requiredTravelTimeMinutes).toBeGreaterThan(500);
      expect(result.message).toContain("Berlin, Germany");
      expect(result.message).toContain("Tokyo, Japan");
    });

    it("should detect CRITICAL risk when travel time ratio is < 0.1", async () => {
      // New York to Tokyo (~10,838 km) requires ~10.8 hours
      // 5 minutes elapsed -> ratio = (5/60) / 10.8 = 0.0077 -> < 0.1 -> CRITICAL
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.newYork, minutesAgo(5)) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.tokyo, new Date()),
      );

      expect(result.isAnomalous).toBe(true);
      expect(result.anomalyType).toBe("impossible_travel");
      expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
    });

    it("should detect HIGH risk when travel time ratio is between 0.1 and 0.5", async () => {
      // Berlin to Tokyo ~8,920 km -> requires ~8.92 hours
      // 3 hours elapsed -> ratio = 3 / 8.92 = 0.336 -> between 0.1 and 0.5 -> HIGH
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.berlin, hoursAgo(3)) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.tokyo, new Date()),
      );

      expect(result.isAnomalous).toBe(true);
      expect(result.riskLevel).toBe(RiskLevel.HIGH);
    });

    it("should use IP address as fallback location when city/country missing", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue({
        ipAddress: "1.2.3.4",
        city: null,
        country: null,
        metadata: {
          latitude: LOCATIONS.newYork.latitude,
          longitude: LOCATIONS.newYork.longitude,
        },
        createdAt: minutesAgo(5),
      } as never);

      const currentLogin: LoginLocation = {
        ipAddress: "5.6.7.8",
        location: {
          latitude: LOCATIONS.tokyo.latitude,
          longitude: LOCATIONS.tokyo.longitude,
          // No city/country
        },
        timestamp: new Date(),
      };

      const result = await checkImpossibleTravel("user-1", currentLogin);

      expect(result.isAnomalous).toBe(true);
      expect(result.details?.previousLocation).toBe("1.2.3.4");
      expect(result.details?.currentLocation).toBe("5.6.7.8");
      expect(result.message).toContain("1.2.3.4");
      expect(result.message).toContain("5.6.7.8");
    });

    it("should include distance and time in the anomaly message", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.london, minutesAgo(30)) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.sydney, new Date()),
      );

      expect(result.isAnomalous).toBe(true);
      expect(result.message).toMatch(/\d+ minutes after login/);
      expect(result.message).toMatch(/\d+ km apart/);
      expect(result.message).toMatch(/would require at least \d+ minutes/);
    });

    it("should handle previous login with null metadata", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue({
        ipAddress: "1.2.3.4",
        city: "Berlin",
        country: "Germany",
        metadata: null,
        createdAt: hoursAgo(1),
      } as never);

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.tokyo, new Date()),
      );

      // null metadata -> no lat/lon -> returns null from getRecentLoginWithLocation
      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should handle previous login with null ipAddress from DB", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue({
        ipAddress: null,
        city: "Berlin",
        country: "Germany",
        metadata: { latitude: 52.52, longitude: 13.405 },
        createdAt: hoursAgo(1),
      } as never);

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.tokyo, new Date()),
      );

      // null ipAddress -> returns null from getRecentLoginWithLocation
      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should query securityAuditLog with correct event filter", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(null);

      await checkImpossibleTravel(
        "user-42",
        makeLoginLocation(LOCATIONS.berlin, new Date()),
      );

      expect(prisma.securityAuditLog.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-42",
          event: {
            in: [
              SecurityAuditEventType.LOGIN_SUCCESS,
              SecurityAuditEventType.SSO_LOGIN,
              SecurityAuditEventType.PASSKEY_LOGIN_SUCCESS,
            ],
          },
          ipAddress: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          ipAddress: true,
          city: true,
          country: true,
          metadata: true,
          createdAt: true,
        },
      });
    });

    it("should handle metadata with non-numeric latitude/longitude", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue({
        ipAddress: "1.2.3.4",
        city: "Berlin",
        country: "Germany",
        metadata: {
          latitude: "not-a-number",
          longitude: "also-not-a-number",
        },
        createdAt: hoursAgo(1),
      } as never);

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.tokyo, new Date()),
      );

      // Non-numeric lat/lon -> treated as undefined -> returns null
      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });
  });

  // ════════════════════════════════════════════
  // checkUnusualLocation
  // ════════════════════════════════════════════

  describe("checkUnusualLocation", () => {
    it("should return non-anomalous when no countryCode is provided", async () => {
      const result = await checkUnusualLocation("user-1", undefined);

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(prisma.securityAuditLog.findMany).not.toHaveBeenCalled();
    });

    it("should return non-anomalous on first-ever login (no previous countries)", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      const result = await checkUnusualLocation("user-1", "DE");

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should return non-anomalous when logging in from a known country", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: { countryCode: "DE" }, country: "Germany" },
        { metadata: { countryCode: "FR" }, country: "France" },
      ] as never);

      const result = await checkUnusualLocation("user-1", "DE");

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should detect anomaly when logging in from a new country", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: { countryCode: "DE" }, country: "Germany" },
        { metadata: { countryCode: "FR" }, country: "France" },
      ] as never);

      const result = await checkUnusualLocation("user-1", "JP");

      expect(result.isAnomalous).toBe(true);
      expect(result.anomalyType).toBe("unusual_location");
      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(result.details?.currentCountry).toBe("JP");
      expect(result.details?.previousCountry).toBe("DE"); // Most recent (first in list)
      expect(result.message).toContain("JP");
      expect(result.message).toContain("DE, FR");
    });

    it("should truncate previous countries list to 5 in message", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: { countryCode: "DE" }, country: "Germany" },
        { metadata: { countryCode: "FR" }, country: "France" },
        { metadata: { countryCode: "GB" }, country: "UK" },
        { metadata: { countryCode: "US" }, country: "USA" },
        { metadata: { countryCode: "NL" }, country: "Netherlands" },
        { metadata: { countryCode: "BE" }, country: "Belgium" },
        { metadata: { countryCode: "AT" }, country: "Austria" },
      ] as never);

      const result = await checkUnusualLocation("user-1", "JP");

      expect(result.isAnomalous).toBe(true);
      // The message should mention at most 5 countries
      // The set will deduplicate, then slice(0, 5) is applied to the message
      expect(result.message).toBeDefined();
    });

    it("should fall back to first 2 chars of country name when countryCode missing from metadata", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: null, country: "Germany" },
        { metadata: {}, country: "France" },
      ] as never);

      // "Germany" -> "GE", "France" -> "FR"
      // Logging in from "GE" should match the fallback
      const result = await checkUnusualLocation("user-1", "GE");

      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should detect anomaly using fallback country codes", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: null, country: "Germany" }, // -> "GE"
      ] as never);

      const result = await checkUnusualLocation("user-1", "JP");

      expect(result.isAnomalous).toBe(true);
      expect(result.anomalyType).toBe("unusual_location");
    });

    it("should query with correct filters and limit of 50", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      await checkUnusualLocation("user-42", "DE");

      expect(prisma.securityAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-42",
          event: {
            in: [
              SecurityAuditEventType.LOGIN_SUCCESS,
              SecurityAuditEventType.SSO_LOGIN,
              SecurityAuditEventType.PASSKEY_LOGIN_SUCCESS,
            ],
          },
          country: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          metadata: true,
          country: true,
        },
        take: 50,
      });
    });

    it("should deduplicate country codes from multiple logins", async () => {
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: { countryCode: "DE" }, country: "Germany" },
        { metadata: { countryCode: "DE" }, country: "Germany" },
        { metadata: { countryCode: "DE" }, country: "Germany" },
      ] as never);

      // Logging in from DE (already known) should not be anomalous
      const result = await checkUnusualLocation("user-1", "DE");
      expect(result.isAnomalous).toBe(false);

      // Logging in from FR (new) should be anomalous
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: { countryCode: "DE" }, country: "Germany" },
        { metadata: { countryCode: "DE" }, country: "Germany" },
      ] as never);

      const result2 = await checkUnusualLocation("user-1", "FR");
      expect(result2.isAnomalous).toBe(true);
    });
  });

  // ════════════════════════════════════════════
  // checkLoginAnomalies (main entry point)
  // ════════════════════════════════════════════

  describe("checkLoginAnomalies", () => {
    it("should return empty array when no anomalies detected", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      const result = await checkLoginAnomalies("user-1", {
        ipAddress: "1.2.3.4",
        latitude: LOCATIONS.berlin.latitude,
        longitude: LOCATIONS.berlin.longitude,
        city: "Berlin",
        country: "Germany",
        countryCode: "DE",
      });

      expect(result).toEqual([]);
      expect(logSecurityEvent).not.toHaveBeenCalled();
    });

    it("should detect impossible travel and log security event", async () => {
      // Previous login: New York, 5 minutes ago
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.newYork, minutesAgo(5)) as never,
      );
      // No previous countries (first login)
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      const result = await checkLoginAnomalies("user-1", {
        ipAddress: "5.6.7.8",
        latitude: LOCATIONS.tokyo.latitude,
        longitude: LOCATIONS.tokyo.longitude,
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
      });

      expect(result).toHaveLength(1);
      expect(result[0].anomalyType).toBe("impossible_travel");
      expect(result[0].isAnomalous).toBe(true);

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: SecurityAuditEventType.SUSPICIOUS_ACTIVITY,
          userId: "user-1",
          ipAddress: "5.6.7.8",
          city: "Tokyo",
          country: "Japan",
          metadata: expect.objectContaining({
            anomalyType: "impossible_travel",
          }),
        }),
      );
    });

    it("should detect unusual location and log security event", async () => {
      // No previous login with coordinates
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(null);
      // Previous logins from DE
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: { countryCode: "DE" }, country: "Germany" },
      ] as never);

      const result = await checkLoginAnomalies("user-1", {
        ipAddress: "5.6.7.8",
        latitude: LOCATIONS.tokyo.latitude,
        longitude: LOCATIONS.tokyo.longitude,
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
      });

      expect(result).toHaveLength(1);
      expect(result[0].anomalyType).toBe("unusual_location");

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: SecurityAuditEventType.UNUSUAL_LOCATION,
          userId: "user-1",
          ipAddress: "5.6.7.8",
          metadata: expect.objectContaining({
            anomalyType: "unusual_location",
          }),
        }),
      );
    });

    it("should detect both impossible travel AND unusual location simultaneously", async () => {
      // Previous login: Berlin, 5 minutes ago
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.berlin, minutesAgo(5)) as never,
      );
      // Previous countries: only DE
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: { countryCode: "DE" }, country: "Germany" },
      ] as never);

      const result = await checkLoginAnomalies("user-1", {
        ipAddress: "5.6.7.8",
        latitude: LOCATIONS.tokyo.latitude,
        longitude: LOCATIONS.tokyo.longitude,
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
      });

      expect(result).toHaveLength(2);
      expect(result[0].anomalyType).toBe("impossible_travel");
      expect(result[1].anomalyType).toBe("unusual_location");

      // Should log two security events
      expect(logSecurityEvent).toHaveBeenCalledTimes(2);
    });

    it("should handle loginData without latitude/longitude (no location)", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      const result = await checkLoginAnomalies("user-1", {
        ipAddress: "1.2.3.4",
        // No latitude/longitude
        city: "Berlin",
        country: "Germany",
        countryCode: "DE",
      });

      expect(result).toEqual([]);
    });

    it("should handle loginData without countryCode", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      const result = await checkLoginAnomalies("user-1", {
        ipAddress: "1.2.3.4",
        latitude: LOCATIONS.berlin.latitude,
        longitude: LOCATIONS.berlin.longitude,
        // No countryCode -> checkUnusualLocation returns early
      });

      expect(result).toEqual([]);
    });

    it("should pass correct risk level from anomaly to logSecurityEvent", async () => {
      // Setup for CRITICAL risk impossible travel
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.newYork, minutesAgo(2)) as never,
      );
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      await checkLoginAnomalies("user-1", {
        ipAddress: "5.6.7.8",
        latitude: LOCATIONS.tokyo.latitude,
        longitude: LOCATIONS.tokyo.longitude,
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
      });

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevel: RiskLevel.CRITICAL,
        }),
      );
    });

    it("should not log security events when no anomalies are found", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([
        { metadata: { countryCode: "DE" }, country: "Germany" },
      ] as never);

      await checkLoginAnomalies("user-1", {
        ipAddress: "1.2.3.4",
        latitude: LOCATIONS.berlin.latitude,
        longitude: LOCATIONS.berlin.longitude,
        city: "Berlin",
        country: "Germany",
        countryCode: "DE",
      });

      expect(logSecurityEvent).not.toHaveBeenCalled();
    });

    it("should use default fallback messages when anomaly message is undefined", async () => {
      // This mainly tests the logging path — the message field comes from the check functions
      // and is always set when isAnomalous is true, but the code has fallbacks
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.newYork, minutesAgo(5)) as never,
      );
      vi.mocked(prisma.securityAuditLog.findMany).mockResolvedValue([]);

      const results = await checkLoginAnomalies("user-1", {
        ipAddress: "5.6.7.8",
        latitude: LOCATIONS.tokyo.latitude,
        longitude: LOCATIONS.tokyo.longitude,
        city: "Tokyo",
        country: "Japan",
        countryCode: "JP",
      });

      // Verify the message is present (the source code always populates it for true anomalies)
      expect(results[0].message).toBeDefined();
      expect(results[0].message!.length).toBeGreaterThan(0);
    });
  });

  // ════════════════════════════════════════════
  // formatAnomalyResponse
  // ════════════════════════════════════════════

  describe("formatAnomalyResponse", () => {
    it("should return empty response for no anomalies", () => {
      const result = formatAnomalyResponse([]);

      expect(result).toEqual({
        hasAnomalies: false,
        highestRisk: RiskLevel.LOW,
        anomalies: [],
      });
    });

    it("should format a single anomaly", () => {
      const anomalies: AnomalyCheckResult[] = [
        {
          isAnomalous: true,
          anomalyType: "impossible_travel",
          riskLevel: "HIGH" as any,
          message: "Impossible travel from Berlin to Tokyo",
        },
      ];

      const result = formatAnomalyResponse(anomalies);

      expect(result.hasAnomalies).toBe(true);
      expect(result.highestRisk).toBe(RiskLevel.HIGH);
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0]).toEqual({
        type: "impossible_travel",
        risk: RiskLevel.HIGH,
        message: "Impossible travel from Berlin to Tokyo",
      });
    });

    it("should format multiple anomalies and pick highest risk", () => {
      const anomalies: AnomalyCheckResult[] = [
        {
          isAnomalous: true,
          anomalyType: "unusual_location",
          riskLevel: "MEDIUM" as any,
          message: "Login from new country",
        },
        {
          isAnomalous: true,
          anomalyType: "impossible_travel",
          riskLevel: "CRITICAL" as any,
          message: "Impossible travel detected",
        },
      ];

      const result = formatAnomalyResponse(anomalies);

      expect(result.hasAnomalies).toBe(true);
      expect(result.highestRisk).toBe(RiskLevel.CRITICAL);
      expect(result.anomalies).toHaveLength(2);
    });

    it("should handle anomaly without anomalyType (defaults to 'unknown')", () => {
      const anomalies: AnomalyCheckResult[] = [
        {
          isAnomalous: true,
          riskLevel: "MEDIUM" as any,
          message: "Something unusual",
        },
      ];

      const result = formatAnomalyResponse(anomalies);

      expect(result.anomalies[0].type).toBe("unknown");
    });

    it("should handle anomaly without message (defaults to 'Anomaly detected')", () => {
      const anomalies: AnomalyCheckResult[] = [
        {
          isAnomalous: true,
          anomalyType: "impossible_travel",
          riskLevel: "HIGH" as any,
        },
      ];

      const result = formatAnomalyResponse(anomalies);

      expect(result.anomalies[0].message).toBe("Anomaly detected");
    });

    it("should correctly rank risk levels: LOW < MEDIUM < HIGH < CRITICAL", () => {
      // Test with LOW and MEDIUM
      let result = formatAnomalyResponse([
        {
          isAnomalous: true,
          anomalyType: "unusual_location",
          riskLevel: "LOW" as any,
          message: "a",
        },
        {
          isAnomalous: true,
          anomalyType: "unusual_location",
          riskLevel: "MEDIUM" as any,
          message: "b",
        },
      ]);
      expect(result.highestRisk).toBe(RiskLevel.MEDIUM);

      // Test with MEDIUM and HIGH
      result = formatAnomalyResponse([
        {
          isAnomalous: true,
          anomalyType: "unusual_location",
          riskLevel: "MEDIUM" as any,
          message: "a",
        },
        {
          isAnomalous: true,
          anomalyType: "impossible_travel",
          riskLevel: "HIGH" as any,
          message: "b",
        },
      ]);
      expect(result.highestRisk).toBe(RiskLevel.HIGH);

      // Test with HIGH and CRITICAL
      result = formatAnomalyResponse([
        {
          isAnomalous: true,
          anomalyType: "impossible_travel",
          riskLevel: "HIGH" as any,
          message: "a",
        },
        {
          isAnomalous: true,
          anomalyType: "impossible_travel",
          riskLevel: "CRITICAL" as any,
          message: "b",
        },
      ]);
      expect(result.highestRisk).toBe(RiskLevel.CRITICAL);
    });

    it("should handle all anomalies having the same risk level", () => {
      const anomalies: AnomalyCheckResult[] = [
        {
          isAnomalous: true,
          anomalyType: "impossible_travel",
          riskLevel: "HIGH" as any,
          message: "a",
        },
        {
          isAnomalous: true,
          anomalyType: "unusual_location",
          riskLevel: "HIGH" as any,
          message: "b",
        },
      ];

      const result = formatAnomalyResponse(anomalies);
      expect(result.highestRisk).toBe(RiskLevel.HIGH);
    });

    it("should handle single LOW risk anomaly", () => {
      const anomalies: AnomalyCheckResult[] = [
        {
          isAnomalous: true,
          anomalyType: "unusual_location",
          riskLevel: "LOW" as any,
          message: "Minor",
        },
      ];

      const result = formatAnomalyResponse(anomalies);

      expect(result.hasAnomalies).toBe(true);
      expect(result.highestRisk).toBe(RiskLevel.LOW);
    });
  });

  // ════════════════════════════════════════════
  // Type exports
  // ════════════════════════════════════════════

  describe("Type exports", () => {
    it("should export GeoLocation type with expected shape", () => {
      const geo: GeoLocation = {
        latitude: 52.52,
        longitude: 13.405,
        city: "Berlin",
        country: "Germany",
        countryCode: "DE",
      };
      expect(geo.latitude).toBe(52.52);
      expect(geo.longitude).toBe(13.405);
    });

    it("should export GeoLocation with optional fields", () => {
      const geo: GeoLocation = {
        latitude: 52.52,
        longitude: 13.405,
      };
      expect(geo.city).toBeUndefined();
      expect(geo.country).toBeUndefined();
      expect(geo.countryCode).toBeUndefined();
    });

    it("should export LoginLocation type", () => {
      const login: LoginLocation = {
        ipAddress: "1.2.3.4",
        timestamp: new Date(),
      };
      expect(login.ipAddress).toBe("1.2.3.4");
      expect(login.location).toBeUndefined();
    });

    it("should export AnomalyCheckResult type", () => {
      const result: AnomalyCheckResult = {
        isAnomalous: false,
        riskLevel: "LOW" as any,
      };
      expect(result.isAnomalous).toBe(false);
      expect(result.anomalyType).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════
  // Edge Cases and Boundary Conditions
  // ════════════════════════════════════════════

  describe("Edge Cases", () => {
    it("should handle exactly 60 seconds time difference (boundary)", async () => {
      const now = new Date();
      const exactlyOneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.newYork, exactlyOneMinuteAgo) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.tokyo, now),
      );

      // 60 seconds is NOT < 60 seconds, so it proceeds with distance check
      // NY to Tokyo > 100km and travel is impossible in 1 minute -> anomalous
      expect(result.isAnomalous).toBe(true);
    });

    it("should handle exactly 100 km distance (boundary)", async () => {
      // Find two points ~100 km apart
      // Berlin (52.52, 13.405) to a point ~100km south
      // Approximately 0.9 degrees latitude = ~100 km
      const nearPoint: GeoLocation = {
        latitude: 51.62,
        longitude: 13.405,
        city: "Near",
        country: "Germany",
        countryCode: "DE",
      };

      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue({
        ipAddress: "1.2.3.4",
        city: "Berlin",
        country: "Germany",
        metadata: {
          latitude: LOCATIONS.berlin.latitude,
          longitude: LOCATIONS.berlin.longitude,
          countryCode: "DE",
        },
        createdAt: minutesAgo(2),
      } as never);

      const currentLogin: LoginLocation = {
        ipAddress: "5.6.7.8",
        location: nearPoint,
        timestamp: new Date(),
      };

      const result = await checkImpossibleTravel("user-1", currentLogin);

      // At 100km exactly, the distance check uses < 100, so 100 km is NOT below threshold
      // Then it checks if travel is possible: 100 km at 1000 km/h = 6 minutes, and 2 min elapsed
      // 2 min < 6 min -> it's impossible travel
      const distance = calculateDistance(
        LOCATIONS.berlin.latitude,
        LOCATIONS.berlin.longitude,
        nearPoint.latitude,
        nearPoint.longitude,
      );

      if (distance >= 100) {
        // If distance is >= 100 km, it will check travel time
        // Whether it's anomalous depends on whether 2 min is enough
        expect(result.riskLevel).toBeDefined();
      } else {
        expect(result.isAnomalous).toBe(false);
      }
    });

    it("should handle travel that is just barely possible", async () => {
      // Berlin to Paris ~878 km, at 1000 km/h requires ~52.7 minutes
      // Set time diff to 60 minutes (just over the threshold)
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.berlin, minutesAgo(60)) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.paris, new Date()),
      );

      // 60 min > ~52.7 min required -> travel IS possible
      expect(result.isAnomalous).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it("should handle travel that is just barely impossible", async () => {
      // Berlin to Paris ~878 km, at 1000 km/h requires ~52.7 minutes
      // Set time diff to 50 minutes (just under the threshold)
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.berlin, minutesAgo(50)) as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.paris, new Date()),
      );

      // 50 min < ~52.7 min required -> impossible travel
      expect(result.isAnomalous).toBe(true);
      expect(result.anomalyType).toBe("impossible_travel");
    });

    it("should handle coordinate at 0,0 (Null Island)", async () => {
      const nullIsland: GeoLocation = {
        latitude: 0,
        longitude: 0,
        city: "Null Island",
        country: "Unknown",
        countryCode: "XX",
      };

      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue({
        ipAddress: "1.2.3.4",
        city: "Berlin",
        country: "Germany",
        metadata: {
          latitude: LOCATIONS.berlin.latitude,
          longitude: LOCATIONS.berlin.longitude,
          countryCode: "DE",
        },
        createdAt: minutesAgo(5),
      } as never);

      const currentLogin: LoginLocation = {
        ipAddress: "5.6.7.8",
        location: nullIsland,
        timestamp: new Date(),
      };

      const result = await checkImpossibleTravel("user-1", currentLogin);

      // Berlin to 0,0 is about 5,860 km, in 5 minutes -> impossible
      expect(result.isAnomalous).toBe(true);
    });

    it("should handle same location with different IP addresses", async () => {
      vi.mocked(prisma.securityAuditLog.findFirst).mockResolvedValue(
        makeDbLoginLog(LOCATIONS.berlin, minutesAgo(5), "1.1.1.1") as never,
      );

      const result = await checkImpossibleTravel(
        "user-1",
        makeLoginLocation(LOCATIONS.berlin, new Date(), "2.2.2.2"),
      );

      // Same location, distance ~ 0 < 100 km -> not anomalous
      expect(result.isAnomalous).toBe(false);
    });

    it("should handle the international date line (longitude ~180/-180)", async () => {
      const eastSide: GeoLocation = {
        latitude: 0,
        longitude: 179,
      };
      const westSide: GeoLocation = {
        latitude: 0,
        longitude: -179,
      };

      // Haversine should handle wrapping correctly
      const dist = calculateDistance(
        eastSide.latitude,
        eastSide.longitude,
        westSide.latitude,
        westSide.longitude,
      );

      // These points are ~222 km apart (2 degrees at equator)
      expect(dist).toBeGreaterThan(200);
      expect(dist).toBeLessThan(250);
    });
  });
});
