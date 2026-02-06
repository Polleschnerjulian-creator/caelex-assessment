/**
 * Session Service
 * Manages user sessions, device tracking, and session security
 */

import { prisma } from "@/lib/prisma";
import { UserSession, AuthMethod, Prisma } from "@prisma/client";
import crypto from "crypto";
import { logSecurityEvent } from "./security-audit-service";

// ─── Types ───

export interface DeviceInfo {
  deviceType?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
}

export interface LocationInfo {
  ipAddress?: string;
  city?: string;
  country?: string;
  countryCode?: string;
}

export interface CreateSessionInput {
  userId: string;
  authMethod?: AuthMethod;
  device?: DeviceInfo;
  location?: LocationInfo;
  expiresInDays?: number;
}

export interface SessionWithUser extends UserSession {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

// ─── Constants ───

const DEFAULT_SESSION_EXPIRY_DAYS = 30;
const MAX_SESSIONS_PER_USER = 10;

// ─── Session CRUD ───

/**
 * Create a new session for a user
 */
export async function createSession(
  input: CreateSessionInput,
): Promise<UserSession> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() + (input.expiresInDays || DEFAULT_SESSION_EXPIRY_DAYS),
  );

  // Check and cleanup excess sessions
  await cleanupExcessSessions(input.userId);

  const session = await prisma.userSession.create({
    data: {
      userId: input.userId,
      sessionToken,
      deviceType: input.device?.deviceType,
      browser: input.device?.browser,
      browserVersion: input.device?.browserVersion,
      os: input.device?.os,
      osVersion: input.device?.osVersion,
      ipAddress: input.location?.ipAddress,
      city: input.location?.city,
      country: input.location?.country,
      countryCode: input.location?.countryCode,
      authMethod: input.authMethod || AuthMethod.PASSWORD,
      expiresAt,
      isActive: true,
    },
  });

  // Log security event
  await logSecurityEvent({
    event: "SESSION_CREATED",
    userId: input.userId,
    description: `New session created via ${input.authMethod || "password"}`,
    ipAddress: input.location?.ipAddress,
    metadata: {
      sessionId: session.id,
      device: input.device,
      location: input.location,
    },
  });

  return session;
}

/**
 * Get session by token
 */
export async function getSessionByToken(
  sessionToken: string,
): Promise<SessionWithUser | null> {
  const session = await prisma.userSession.findUnique({
    where: { sessionToken },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!session) return null;

  // Check if session is valid
  if (!session.isActive || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(
  sessionId: string,
  ipAddress?: string,
): Promise<void> {
  await prisma.userSession.update({
    where: { id: sessionId },
    data: {
      lastActiveAt: new Date(),
      ...(ipAddress && { ipAddress }),
    },
  });
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  return prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActiveAt: "desc" },
  });
}

/**
 * Get session by ID
 */
export async function getSessionById(
  sessionId: string,
): Promise<UserSession | null> {
  return prisma.userSession.findUnique({
    where: { id: sessionId },
  });
}

// ─── Session Revocation ───

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string,
  reason?: string,
  revokedByUserId?: string,
): Promise<UserSession> {
  const session = await prisma.userSession.update({
    where: { id: sessionId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason || "User requested",
    },
  });

  // Log security event
  await logSecurityEvent({
    event: "SESSION_REVOKED",
    userId: session.userId,
    description: `Session revoked: ${reason || "User requested"}`,
    metadata: {
      sessionId,
      revokedBy: revokedByUserId || session.userId,
    },
  });

  return session;
}

/**
 * Revoke all sessions for a user (except optionally the current one)
 */
export async function revokeAllUserSessions(
  userId: string,
  exceptSessionId?: string,
  reason?: string,
): Promise<number> {
  const result = await prisma.userSession.updateMany({
    where: {
      userId,
      isActive: true,
      ...(exceptSessionId && { id: { not: exceptSessionId } }),
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason || "All sessions revoked",
    },
  });

  // Log security event
  await logSecurityEvent({
    event: "SESSION_REVOKED",
    userId,
    description: `All sessions revoked (${result.count} sessions)`,
    riskLevel: "MEDIUM",
    metadata: {
      count: result.count,
      exceptSessionId,
      reason,
    },
  });

  return result.count;
}

/**
 * Revoke sessions by device type
 */
export async function revokeSessionsByDevice(
  userId: string,
  deviceType: string,
): Promise<number> {
  const result = await prisma.userSession.updateMany({
    where: {
      userId,
      deviceType,
      isActive: true,
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: `Device type ${deviceType} sessions revoked`,
    },
  });

  return result.count;
}

// ─── Session Cleanup ───

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.userSession.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      isActive: true,
    },
    data: {
      isActive: false,
      revokedReason: "Session expired",
    },
  });

  return result.count;
}

/**
 * Clean up excess sessions for a user (keep most recent)
 */
async function cleanupExcessSessions(userId: string): Promise<void> {
  const sessions = await prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: { lastActiveAt: "desc" },
    select: { id: true },
  });

  if (sessions.length >= MAX_SESSIONS_PER_USER) {
    const sessionsToRevoke = sessions
      .slice(MAX_SESSIONS_PER_USER - 1)
      .map((s) => s.id);

    await prisma.userSession.updateMany({
      where: { id: { in: sessionsToRevoke } },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: "Max sessions exceeded",
      },
    });
  }
}

/**
 * Delete old inactive sessions (for data cleanup)
 */
export async function purgeOldSessions(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.userSession.deleteMany({
    where: {
      isActive: false,
      revokedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

// ─── Session Analytics ───

/**
 * Get session statistics for a user
 */
export async function getUserSessionStats(userId: string): Promise<{
  activeSessions: number;
  totalSessions: number;
  deviceBreakdown: Record<string, number>;
  lastActivity: Date | null;
}> {
  const [activeSessions, totalSessions, sessions] = await Promise.all([
    prisma.userSession.count({
      where: { userId, isActive: true, expiresAt: { gt: new Date() } },
    }),
    prisma.userSession.count({ where: { userId } }),
    prisma.userSession.findMany({
      where: { userId, isActive: true },
      select: { deviceType: true, lastActiveAt: true },
      orderBy: { lastActiveAt: "desc" },
    }),
  ]);

  const deviceBreakdown: Record<string, number> = {};
  sessions.forEach((s) => {
    const device = s.deviceType || "unknown";
    deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
  });

  return {
    activeSessions,
    totalSessions,
    deviceBreakdown,
    lastActivity: sessions[0]?.lastActiveAt || null,
  };
}

/**
 * Check for suspicious session activity
 */
export async function checkSuspiciousActivity(
  userId: string,
  currentIp?: string,
  currentCountry?: string,
): Promise<{
  isSuspicious: boolean;
  reason?: string;
}> {
  // Get recent sessions
  const recentSessions = await prisma.userSession.findMany({
    where: {
      userId,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    select: {
      ipAddress: true,
      country: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Check for logins from multiple countries in short time
  if (currentCountry && recentSessions.length > 0) {
    const countries = new Set(
      recentSessions.map((s) => s.country).filter(Boolean),
    );
    if (
      currentCountry &&
      !countries.has(currentCountry) &&
      countries.size > 0
    ) {
      // New country login
      const lastSession = recentSessions[0];
      const timeDiff = Date.now() - new Date(lastSession.createdAt).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 4) {
        return {
          isSuspicious: true,
          reason: `Login from new country (${currentCountry}) within ${Math.round(hoursDiff)} hours of previous session`,
        };
      }
    }
  }

  // Check for too many sessions in short time
  const sessionsInLastHour = recentSessions.filter(
    (s) => Date.now() - new Date(s.createdAt).getTime() < 60 * 60 * 1000,
  );
  if (sessionsInLastHour.length >= 5) {
    return {
      isSuspicious: true,
      reason: `${sessionsInLastHour.length} sessions created in the last hour`,
    };
  }

  return { isSuspicious: false };
}

// ─── Helpers ───

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const device: DeviceInfo = {};

  // Device type
  if (/mobile/i.test(userAgent)) {
    device.deviceType = "mobile";
  } else if (/tablet/i.test(userAgent)) {
    device.deviceType = "tablet";
  } else {
    device.deviceType = "desktop";
  }

  // Browser detection
  if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) {
    device.browser = "Chrome";
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) device.browserVersion = match[1];
  } else if (/firefox/i.test(userAgent)) {
    device.browser = "Firefox";
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) device.browserVersion = match[1];
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    device.browser = "Safari";
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) device.browserVersion = match[1];
  } else if (/edge|edg/i.test(userAgent)) {
    device.browser = "Edge";
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) device.browserVersion = match[1];
  }

  // OS detection
  if (/windows/i.test(userAgent)) {
    device.os = "Windows";
    if (/windows nt 10/i.test(userAgent)) device.osVersion = "10/11";
    else if (/windows nt 6.3/i.test(userAgent)) device.osVersion = "8.1";
    else if (/windows nt 6.2/i.test(userAgent)) device.osVersion = "8";
  } else if (/macintosh|mac os/i.test(userAgent)) {
    device.os = "macOS";
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    if (match) device.osVersion = match[1].replace("_", ".");
  } else if (/linux/i.test(userAgent)) {
    device.os = "Linux";
  } else if (/android/i.test(userAgent)) {
    device.os = "Android";
    const match = userAgent.match(/Android (\d+)/);
    if (match) device.osVersion = match[1];
  } else if (/iphone|ipad/i.test(userAgent)) {
    device.os = "iOS";
    const match = userAgent.match(/OS (\d+)/);
    if (match) device.osVersion = match[1];
  }

  return device;
}
