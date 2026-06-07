/**
 * Scholar — account security server helper.
 *
 * Handles password change for credentials accounts.
 * SSO/OAuth users (null password + Account provider row) have no
 * password managed by Caelex — they must change credentials at their
 * identity provider. This helper enforces that boundary.
 *
 * Constraints:
 *   - Minimum 8 characters
 *   - Must differ from current password
 *   - Current password must verify against stored bcrypt hash
 *   - bcrypt cost = 12 (matches platform convention)
 */

import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChangePasswordResult =
  | { success: true }
  | { success: false; field: "current" | "new" | "general"; message: string };

// ─── Password change ──────────────────────────────────────────────────────────

/**
 * Change the password for a credentials account.
 *
 * Returns a typed result union — never throws to the caller so Server
 * Actions can render inline errors without a try/catch.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  // 1. Load the stored hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    return {
      success: false,
      field: "general",
      message: "Benutzer nicht gefunden.",
    };
  }

  if (!user.password) {
    // OAuth/SSO account — no password managed by Caelex
    return {
      success: false,
      field: "general",
      message: "Dein Konto wird über einen externen Anbieter verwaltet.",
    };
  }

  // 2. Verify the current password
  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    return {
      success: false,
      field: "current",
      message: "Das aktuelle Passwort ist falsch.",
    };
  }

  // 3. Validate the new password
  if (newPassword.length < 8) {
    return {
      success: false,
      field: "new",
      message: "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
    };
  }

  // Prevent changing to the same password
  const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
  if (sameAsCurrent) {
    return {
      success: false,
      field: "new",
      message: "Das neue Passwort muss sich vom aktuellen unterscheiden.",
    };
  }

  // 4. Hash and persist
  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: newHash },
  });

  return { success: true };
}

// ─── Account-type detection ───────────────────────────────────────────────────

/**
 * Returns true when the user has a credentials (password-based) account.
 * OAuth/SSO users have password = null and/or only Account provider rows.
 */
export async function isCredentialsAccount(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  return Boolean(user?.password);
}

// ─── Login history ────────────────────────────────────────────────────────────

export interface LoginHistoryEntry {
  id: string;
  eventType: string;
  createdAt: Date;
  ipMasked: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  isSuspicious: boolean;
  authMethod: string;
}

/**
 * Fetch the last N login events for a user, masking the IP for privacy.
 * Only the first two octets of an IPv4 (or the /32 prefix of an IPv6)
 * are exposed — enough to detect geographic anomalies without revealing
 * the full address.
 */
export async function getLoginHistory(
  userId: string,
  limit = 10,
): Promise<LoginHistoryEntry[]> {
  const rows = await prisma.loginEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      eventType: true,
      createdAt: true,
      ipAddress: true,
      browser: true,
      os: true,
      country: true,
      isSuspicious: true,
      authMethod: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType as string,
    createdAt: r.createdAt,
    ipMasked: maskIp(r.ipAddress),
    browser: r.browser,
    os: r.os,
    country: r.country,
    isSuspicious: r.isSuspicious,
    authMethod: r.authMethod as string,
  }));
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Mask an IP address to reduce PII exposure.
 * IPv4: keep first two octets → "192.168.x.x"
 * IPv6: keep first group    → "2001:xxxx:…"
 * null  → null
 */
function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(":")) {
    // IPv6 — keep only the first 16-bit group
    const first = ip.split(":")[0];
    return `${first}:xxxx:…`;
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  return "x.x.x.x";
}
