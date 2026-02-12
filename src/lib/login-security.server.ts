/**
 * Login Security Service
 * Handles suspicious login detection, account lockout, and login events
 */

import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendSuspiciousLoginEmail } from "@/lib/email/suspicious-login";
import type { AuthMethod } from "@prisma/client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const UNLOCK_TOKEN_EXPIRY_HOURS = 1;

// Parse user agent to extract device info
export function parseUserAgent(userAgent: string | null): {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: "desktop" | "mobile" | "tablet";
} {
  if (!userAgent) {
    return {
      browser: "Unknown",
      browserVersion: "",
      os: "Unknown",
      osVersion: "",
      deviceType: "desktop",
    };
  }

  // Simple UA parsing (in production, use a library like ua-parser-js)
  let browser = "Unknown";
  let browserVersion = "";
  let os = "Unknown";
  let osVersion = "";
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";

  // Browser detection
  if (userAgent.includes("Firefox/")) {
    browser = "Firefox";
    const match = userAgent.match(/Firefox\/(\d+)/);
    browserVersion = match?.[1] || "";
  } else if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) {
    browser = "Chrome";
    const match = userAgent.match(/Chrome\/(\d+)/);
    browserVersion = match?.[1] || "";
  } else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) {
    browser = "Safari";
    const match = userAgent.match(/Version\/(\d+)/);
    browserVersion = match?.[1] || "";
  } else if (userAgent.includes("Edg/")) {
    browser = "Edge";
    const match = userAgent.match(/Edg\/(\d+)/);
    browserVersion = match?.[1] || "";
  }

  // OS detection
  if (userAgent.includes("Windows NT")) {
    os = "Windows";
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    osVersion = match?.[1] || "";
  } else if (userAgent.includes("Mac OS X")) {
    os = "macOS";
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match?.[1]?.replace(/_/g, ".") || "";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
    const match = userAgent.match(/OS (\d+_\d+)/);
    osVersion = match?.[1]?.replace(/_/g, ".") || "";
  } else if (userAgent.includes("Android")) {
    os = "Android";
    const match = userAgent.match(/Android (\d+\.?\d*)/);
    osVersion = match?.[1] || "";
  }

  // Device type detection
  if (userAgent.includes("Mobile") || userAgent.includes("iPhone")) {
    deviceType = "mobile";
  } else if (userAgent.includes("iPad") || userAgent.includes("Tablet")) {
    deviceType = "tablet";
  }

  return { browser, browserVersion, os, osVersion, deviceType };
}

// Get geolocation from IP (simplified - in production, use a service like MaxMind)
export async function getGeoFromIP(ipAddress: string): Promise<{
  city: string | null;
  country: string | null;
  countryCode: string | null;
  latitude?: number;
  longitude?: number;
}> {
  // Skip for localhost/private IPs
  if (
    !ipAddress ||
    ipAddress === "127.0.0.1" ||
    ipAddress === "::1" ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("172.")
  ) {
    return { city: null, country: null, countryCode: null };
  }

  try {
    // Using ip-api.com free service (rate limited - in production use MaxMind GeoIP2)
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?fields=status,city,country,countryCode,lat,lon`,
      { next: { revalidate: 86400 } }, // Cache for 24 hours
    );

    if (!response.ok) {
      return { city: null, country: null, countryCode: null };
    }

    const data = await response.json();
    if (data.status === "success") {
      return {
        city: data.city || null,
        country: data.country || null,
        countryCode: data.countryCode || null,
        latitude: typeof data.lat === "number" ? data.lat : undefined,
        longitude: typeof data.lon === "number" ? data.lon : undefined,
      };
    }
  } catch {
    console.error("Failed to get geo from IP");
  }

  return { city: null, country: null, countryCode: null };
}

// Check if login is suspicious
export async function checkSuspiciousLogin(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<{
  isSuspicious: boolean;
  reasons: string[];
}> {
  const reasons: string[] = [];

  if (!ipAddress) {
    return { isSuspicious: false, reasons };
  }

  // Get last 10 successful logins
  const recentLogins = await prisma.loginEvent.findMany({
    where: {
      userId,
      eventType: "LOGIN_SUCCESS",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (recentLogins.length === 0) {
    // First login - not suspicious
    return { isSuspicious: false, reasons };
  }

  const currentGeo = await getGeoFromIP(ipAddress);
  const currentDevice = parseUserAgent(userAgent);

  // Check for new country
  const previousCountries = new Set(
    recentLogins.map((l) => l.countryCode).filter(Boolean),
  );
  if (
    currentGeo.countryCode &&
    previousCountries.size > 0 &&
    !previousCountries.has(currentGeo.countryCode)
  ) {
    reasons.push(`New country: ${currentGeo.country}`);
  }

  // Check for new device/browser combination
  const previousDevices = new Set(
    recentLogins.map((l) => `${l.browser}-${l.os}`).filter(Boolean),
  );
  const currentDeviceKey = `${currentDevice.browser}-${currentDevice.os}`;
  if (previousDevices.size > 0 && !previousDevices.has(currentDeviceKey)) {
    reasons.push(`New device: ${currentDevice.browser} on ${currentDevice.os}`);
  }

  // Check for new IP
  const previousIPs = new Set(
    recentLogins.map((l) => l.ipAddress).filter(Boolean),
  );
  if (previousIPs.size > 0 && !previousIPs.has(ipAddress)) {
    reasons.push(`New IP address`);
  }

  // Check for rapid location change (impossible travel) using distance calculation
  const lastLogin = recentLogins[0];
  if (lastLogin) {
    // Get last login coordinates from metadata if available
    const lastLoginMeta = lastLogin.metadata as Record<string, unknown> | null;
    const lastLat = lastLoginMeta?.latitude as number | undefined;
    const lastLon = lastLoginMeta?.longitude as number | undefined;

    // If we have coordinates for both locations, use distance-based calculation
    if (
      currentGeo.latitude !== undefined &&
      currentGeo.longitude !== undefined &&
      lastLat !== undefined &&
      lastLon !== undefined
    ) {
      const { calculateDistance } = await import("./anomaly-detection.server");
      const distanceKm = calculateDistance(
        lastLat,
        lastLon,
        currentGeo.latitude,
        currentGeo.longitude,
      );
      const timeDiffHours =
        (Date.now() - new Date(lastLogin.createdAt).getTime()) / 1000 / 60 / 60;

      // Max realistic travel speed: 1000 km/h (allows for flights + some buffer)
      const maxTravelSpeed = 1000;
      const requiredHours = distanceKm / maxTravelSpeed;

      if (distanceKm > 100 && timeDiffHours < requiredHours) {
        const lastLocation =
          lastLogin.city && lastLogin.country
            ? `${lastLogin.city}, ${lastLogin.country}`
            : lastLogin.country || "unknown location";
        const currentLocation =
          currentGeo.city && currentGeo.country
            ? `${currentGeo.city}, ${currentGeo.country}`
            : currentGeo.country || "unknown location";
        reasons.push(
          `Impossible travel: ${Math.round(distanceKm)} km from ${lastLocation} to ${currentLocation} in ${timeDiffHours.toFixed(1)} hours (would need ${requiredHours.toFixed(1)} hours)`,
        );
      }
    } else if (
      currentGeo.countryCode &&
      lastLogin.countryCode &&
      currentGeo.countryCode !== lastLogin.countryCode
    ) {
      // Fallback to simple country-based check if no coordinates
      const timeDiff =
        (Date.now() - new Date(lastLogin.createdAt).getTime()) / 1000 / 60 / 60;
      if (timeDiff < 2) {
        reasons.push(
          `Rapid location change: ${lastLogin.country} to ${currentGeo.country} in ${timeDiff.toFixed(1)} hours`,
        );
      }
    }
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

// Record login event
export async function recordLoginEvent(
  userId: string,
  eventType:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "LOGIN_BLOCKED"
    | "MFA_REQUIRED"
    | "MFA_SUCCESS"
    | "MFA_FAILED"
    | "PASSKEY_SUCCESS"
    | "PASSKEY_FAILED"
    | "BACKUP_CODE_USED"
    | "ACCOUNT_LOCKED"
    | "ACCOUNT_UNLOCKED"
    | "SUSPICIOUS_LOGIN",
  ipAddress: string | null,
  userAgent: string | null,
  authMethod: AuthMethod = "PASSWORD",
  sessionId?: string,
): Promise<void> {
  const deviceInfo = parseUserAgent(userAgent);
  const geoInfo = ipAddress
    ? await getGeoFromIP(ipAddress)
    : { city: null, country: null, countryCode: null };

  // Check for suspicious activity
  const suspiciousCheck =
    eventType === "LOGIN_SUCCESS"
      ? await checkSuspiciousLogin(userId, ipAddress, userAgent)
      : { isSuspicious: false, reasons: [] };

  await prisma.loginEvent.create({
    data: {
      userId,
      eventType: suspiciousCheck.isSuspicious ? "SUSPICIOUS_LOGIN" : eventType,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      browserVersion: deviceInfo.browserVersion,
      os: deviceInfo.os,
      osVersion: deviceInfo.osVersion,
      ipAddress,
      city: geoInfo.city,
      country: geoInfo.country,
      countryCode: geoInfo.countryCode,
      authMethod,
      isSuspicious: suspiciousCheck.isSuspicious,
      suspiciousReasons:
        suspiciousCheck.reasons.length > 0
          ? JSON.stringify(suspiciousCheck.reasons)
          : null,
      sessionId,
      // Store coordinates for impossible travel detection
      metadata:
        geoInfo.latitude !== undefined && geoInfo.longitude !== undefined
          ? { latitude: geoInfo.latitude, longitude: geoInfo.longitude }
          : undefined,
    },
  });

  // Send suspicious login email if needed
  if (suspiciousCheck.isSuspicious) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (user?.email) {
      await sendSuspiciousLoginEmail({
        email: user.email,
        name: user.name || undefined,
        device: `${deviceInfo.browser} on ${deviceInfo.os}`,
        location: geoInfo.country
          ? `${geoInfo.city ? geoInfo.city + ", " : ""}${geoInfo.country}`
          : "Unknown location",
        ipAddress: ipAddress || "Unknown",
        time: new Date(),
        reasons: suspiciousCheck.reasons,
      });
    }
  }
}

// Check if account is locked
export async function isAccountLocked(userId: string): Promise<{
  locked: boolean;
  lockedUntil: Date | null;
  remainingMinutes: number | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  });

  if (!user?.lockedUntil) {
    return { locked: false, lockedUntil: null, remainingMinutes: null };
  }

  if (user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 1000 / 60);
    return { locked: true, lockedUntil: user.lockedUntil, remainingMinutes };
  }

  // Lock expired - clear it
  await prisma.user.update({
    where: { id: userId },
    data: { lockedUntil: null, failedLoginAttempts: 0 },
  });

  return { locked: false, lockedUntil: null, remainingMinutes: null };
}

// Record failed login attempt
export async function recordFailedAttempt(userId: string): Promise<{
  locked: boolean;
  attemptsRemaining: number;
}> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: { increment: 1 },
    },
    select: { failedLoginAttempts: true },
  });

  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    // Lock the account
    const lockedUntil = new Date(
      Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
    );

    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil },
    });

    return { locked: true, attemptsRemaining: 0 };
  }

  return {
    locked: false,
    attemptsRemaining: MAX_FAILED_ATTEMPTS - user.failedLoginAttempts,
  };
}

// Clear failed attempts on successful login
export async function clearFailedAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      unlockToken: null,
      unlockTokenExpires: null,
    },
  });
}

// Generate unlock token
export async function generateUnlockToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(
    Date.now() + UNLOCK_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      unlockToken: token,
      unlockTokenExpires: expires,
    },
  });

  return token;
}

// Verify and use unlock token
export async function verifyUnlockToken(token: string): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { unlockToken: token },
    select: { id: true, unlockTokenExpires: true },
  });

  if (!user) {
    return { success: false, error: "Invalid token" };
  }

  if (!user.unlockTokenExpires || user.unlockTokenExpires < new Date()) {
    return { success: false, error: "Token expired" };
  }

  // Unlock the account
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      unlockToken: null,
      unlockTokenExpires: null,
    },
  });

  return { success: true, userId: user.id };
}

// Get recent login events for user
export async function getRecentLoginEvents(userId: string, limit: number = 20) {
  return prisma.loginEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Get suspicious login events
export async function getSuspiciousLoginEvents(
  userId: string,
  limit: number = 10,
) {
  return prisma.loginEvent.findMany({
    where: { userId, isSuspicious: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
