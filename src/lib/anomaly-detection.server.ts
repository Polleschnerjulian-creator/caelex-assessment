/**
 * IP-Based Anomaly Detection Service
 *
 * Detects suspicious login patterns including:
 * - Impossible travel: User logs in from two locations that are too far apart
 *   given the time elapsed between logins
 * - Unusual location: Login from a country/region the user has never used before
 *
 * Uses Haversine formula for distance calculation and assumes max travel speed.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import { SecurityAuditEventType, RiskLevel } from "@prisma/client";

// ─── Constants ───

/**
 * Maximum realistic travel speed in km/h
 * Commercial flights average ~900 km/h, supersonic ~2,000 km/h
 * Using 1000 km/h as a reasonable threshold that accounts for:
 * - Flight time + airport procedures
 * - Some buffer for edge cases
 */
const MAX_TRAVEL_SPEED_KMH = 1000;

/**
 * Minimum distance in km to consider for impossible travel detection
 * Ignores nearby locations that could be VPN hops or mobile network changes
 */
const MIN_DISTANCE_KM = 100;

/**
 * Minimum time difference in seconds to consider
 * Ignores very rapid successive logins (likely same session)
 */
const MIN_TIME_DIFF_SECONDS = 60;

/**
 * Earth radius in kilometers (for Haversine formula)
 */
const EARTH_RADIUS_KM = 6371;

// ─── Types ───

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  countryCode?: string;
}

export interface LoginLocation {
  ipAddress: string;
  location?: GeoLocation;
  timestamp: Date;
}

export interface AnomalyCheckResult {
  isAnomalous: boolean;
  anomalyType?:
    | "impossible_travel"
    | "unusual_location"
    | "rapid_country_change";
  riskLevel: RiskLevel;
  details?: {
    distanceKm?: number;
    timeDiffMinutes?: number;
    requiredTravelTimeMinutes?: number;
    previousLocation?: string;
    currentLocation?: string;
    previousCountry?: string;
    currentCountry?: string;
  };
  message?: string;
}

// ─── Haversine Distance Calculation ───

/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ─── Impossible Travel Detection ───

/**
 * Check if a login shows signs of impossible travel
 * Compares with the user's most recent login to detect if they could have
 * realistically traveled between the two locations
 */
export async function checkImpossibleTravel(
  userId: string,
  currentLogin: LoginLocation,
): Promise<AnomalyCheckResult> {
  // Get the most recent login with location data
  const recentLogin = await getRecentLoginWithLocation(userId);

  if (!recentLogin || !recentLogin.location || !currentLogin.location) {
    // Can't compare - no previous login or missing location data
    return { isAnomalous: false, riskLevel: RiskLevel.LOW };
  }

  // Calculate time difference
  const timeDiffMs =
    currentLogin.timestamp.getTime() - recentLogin.timestamp.getTime();
  const timeDiffSeconds = timeDiffMs / 1000;
  const timeDiffMinutes = timeDiffSeconds / 60;
  const timeDiffHours = timeDiffMinutes / 60;

  // Ignore if too recent (likely same session)
  if (timeDiffSeconds < MIN_TIME_DIFF_SECONDS) {
    return { isAnomalous: false, riskLevel: RiskLevel.LOW };
  }

  // Calculate distance between locations
  const distanceKm = calculateDistance(
    recentLogin.location.latitude,
    recentLogin.location.longitude,
    currentLogin.location.latitude,
    currentLogin.location.longitude,
  );

  // Ignore short distances
  if (distanceKm < MIN_DISTANCE_KM) {
    return { isAnomalous: false, riskLevel: RiskLevel.LOW };
  }

  // Calculate minimum required travel time
  const requiredTravelTimeHours = distanceKm / MAX_TRAVEL_SPEED_KMH;
  const requiredTravelTimeMinutes = requiredTravelTimeHours * 60;

  // Check if travel is impossible
  if (timeDiffHours < requiredTravelTimeHours) {
    const previousLocation =
      recentLogin.location.city && recentLogin.location.country
        ? `${recentLogin.location.city}, ${recentLogin.location.country}`
        : recentLogin.ipAddress;
    const currentLocation =
      currentLogin.location.city && currentLogin.location.country
        ? `${currentLogin.location.city}, ${currentLogin.location.country}`
        : currentLogin.ipAddress;

    // Determine risk level based on distance and time ratio
    let riskLevel: RiskLevel = RiskLevel.HIGH;
    const travelTimeRatio = timeDiffHours / requiredTravelTimeHours;
    if (travelTimeRatio < 0.1) {
      riskLevel = RiskLevel.CRITICAL; // Extremely suspicious - less than 10% of required time
    } else if (travelTimeRatio < 0.5) {
      riskLevel = RiskLevel.HIGH; // Very suspicious - less than 50% of required time
    }

    return {
      isAnomalous: true,
      anomalyType: "impossible_travel",
      riskLevel,
      details: {
        distanceKm: Math.round(distanceKm),
        timeDiffMinutes: Math.round(timeDiffMinutes),
        requiredTravelTimeMinutes: Math.round(requiredTravelTimeMinutes),
        previousLocation,
        currentLocation,
      },
      message: `Login from ${currentLocation} only ${Math.round(timeDiffMinutes)} minutes after login from ${previousLocation} (${Math.round(distanceKm)} km apart, would require at least ${Math.round(requiredTravelTimeMinutes)} minutes to travel)`,
    };
  }

  return { isAnomalous: false, riskLevel: RiskLevel.LOW };
}

/**
 * Check if login is from an unusual location (new country)
 */
export async function checkUnusualLocation(
  userId: string,
  currentCountryCode?: string,
): Promise<AnomalyCheckResult> {
  if (!currentCountryCode) {
    return { isAnomalous: false, riskLevel: RiskLevel.LOW };
  }

  // Get all countries the user has logged in from
  const previousCountries = await getUserLoginCountries(userId);

  if (previousCountries.length === 0) {
    // First login - not anomalous
    return { isAnomalous: false, riskLevel: RiskLevel.LOW };
  }

  if (!previousCountries.includes(currentCountryCode)) {
    return {
      isAnomalous: true,
      anomalyType: "unusual_location",
      riskLevel: RiskLevel.MEDIUM,
      details: {
        currentCountry: currentCountryCode,
        previousCountry: previousCountries[0], // Most recent
      },
      message: `First login from ${currentCountryCode}. Previous logins were from: ${previousCountries.slice(0, 5).join(", ")}`,
    };
  }

  return { isAnomalous: false, riskLevel: RiskLevel.LOW };
}

// ─── Database Queries ───

/**
 * Get the most recent successful login with location data for a user
 */
async function getRecentLoginWithLocation(
  userId: string,
): Promise<LoginLocation | null> {
  const recentLog = await prisma.securityAuditLog.findFirst({
    where: {
      userId,
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

  if (!recentLog || !recentLog.ipAddress) {
    return null;
  }

  // Try to get coordinates from metadata
  const metadata = recentLog.metadata as Record<string, unknown> | null;
  let latitude: number | undefined;
  let longitude: number | undefined;
  let countryCode: string | undefined;

  if (metadata) {
    latitude =
      typeof metadata.latitude === "number" ? metadata.latitude : undefined;
    longitude =
      typeof metadata.longitude === "number" ? metadata.longitude : undefined;
    countryCode =
      typeof metadata.countryCode === "string"
        ? metadata.countryCode
        : undefined;
  }

  // If no coordinates in metadata, we can't do distance calculation
  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  return {
    ipAddress: recentLog.ipAddress,
    location: {
      latitude,
      longitude,
      city: recentLog.city || undefined,
      country: recentLog.country || undefined,
      countryCode,
    },
    timestamp: recentLog.createdAt,
  };
}

/**
 * Get all unique country codes the user has logged in from
 * Note: countryCode is stored in metadata since SecurityAuditLog doesn't have a dedicated field
 */
async function getUserLoginCountries(userId: string): Promise<string[]> {
  const logs = await prisma.securityAuditLog.findMany({
    where: {
      userId,
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
    take: 50, // Get recent logins to extract unique countries
  });

  // Extract country codes from metadata or use country as fallback
  const countryCodes = new Set<string>();
  for (const log of logs) {
    const metadata = log.metadata as Record<string, unknown> | null;
    const countryCode = metadata?.countryCode as string | undefined;
    if (countryCode) {
      countryCodes.add(countryCode);
    } else if (log.country) {
      // Use first 2 chars of country name as a rough approximation if no code
      countryCodes.add(log.country.substring(0, 2).toUpperCase());
    }
  }

  return Array.from(countryCodes);
}

// ─── Main Entry Point ───

/**
 * Perform all anomaly checks for a login event
 * Call this when a user successfully logs in
 */
export async function checkLoginAnomalies(
  userId: string,
  loginData: {
    ipAddress: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
    countryCode?: string;
    userAgent?: string;
  },
): Promise<AnomalyCheckResult[]> {
  const anomalies: AnomalyCheckResult[] = [];

  const currentLogin: LoginLocation = {
    ipAddress: loginData.ipAddress,
    timestamp: new Date(),
    location:
      loginData.latitude !== undefined && loginData.longitude !== undefined
        ? {
            latitude: loginData.latitude,
            longitude: loginData.longitude,
            city: loginData.city,
            country: loginData.country,
            countryCode: loginData.countryCode,
          }
        : undefined,
  };

  // Check for impossible travel
  const travelCheck = await checkImpossibleTravel(userId, currentLogin);
  if (travelCheck.isAnomalous) {
    anomalies.push(travelCheck);

    // Log the anomaly
    await logSecurityEvent({
      event: SecurityAuditEventType.SUSPICIOUS_ACTIVITY,
      description: travelCheck.message || "Impossible travel detected",
      userId,
      ipAddress: loginData.ipAddress,
      city: loginData.city,
      country: loginData.country,
      riskLevel: travelCheck.riskLevel,
      metadata: {
        anomalyType: travelCheck.anomalyType,
        ...travelCheck.details,
      },
    });
  }

  // Check for unusual location
  const locationCheck = await checkUnusualLocation(
    userId,
    loginData.countryCode,
  );
  if (locationCheck.isAnomalous) {
    anomalies.push(locationCheck);

    // Log the anomaly
    await logSecurityEvent({
      event: SecurityAuditEventType.UNUSUAL_LOCATION,
      description: locationCheck.message || "Login from unusual location",
      userId,
      ipAddress: loginData.ipAddress,
      city: loginData.city,
      country: loginData.country,
      riskLevel: locationCheck.riskLevel,
      metadata: {
        anomalyType: locationCheck.anomalyType,
        ...locationCheck.details,
      },
    });
  }

  return anomalies;
}

// ─── Utility Exports ───

/**
 * Format anomaly results for API response
 */
export function formatAnomalyResponse(anomalies: AnomalyCheckResult[]): {
  hasAnomalies: boolean;
  highestRisk: RiskLevel;
  anomalies: Array<{
    type: string;
    risk: string;
    message: string;
  }>;
} {
  if (anomalies.length === 0) {
    return {
      hasAnomalies: false,
      highestRisk: RiskLevel.LOW,
      anomalies: [],
    };
  }

  const riskOrder: RiskLevel[] = [
    RiskLevel.LOW,
    RiskLevel.MEDIUM,
    RiskLevel.HIGH,
    RiskLevel.CRITICAL,
  ];
  let highestRisk: RiskLevel = RiskLevel.LOW;
  for (const anomaly of anomalies) {
    const currentIndex = riskOrder.indexOf(anomaly.riskLevel);
    const highestIndex = riskOrder.indexOf(highestRisk);
    if (currentIndex > highestIndex) {
      highestRisk = anomaly.riskLevel;
    }
  }

  return {
    hasAnomalies: true,
    highestRisk,
    anomalies: anomalies.map((a) => ({
      type: a.anomalyType || "unknown",
      risk: a.riskLevel,
      message: a.message || "Anomaly detected",
    })),
  };
}
