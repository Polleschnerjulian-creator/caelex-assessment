/**
 * Server-only super-admin gate + access audit for the cross-product /admin
 * analytics center.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This is the SERVER half of the super-admin tier. The client-safe allowlist
 * check lives in `lib/super-admin.ts` (no Prisma, importable from client
 * components); everything here touches the session and the audit trail and is
 * therefore `server-only`.
 *
 * THREE-LAYER GATE (defence in depth) for /admin:
 *   1. middleware     — coarse "is this an authenticated request to /admin?"
 *                       (redirects anonymous visitors before any RSC runs).
 *   2. (admin) layout — `requireSuperAdminPage()` re-checks server-side and
 *                       redirects non-super-admins; nothing renders otherwise.
 *   3. every /api/admin/v2/* route — `requireSuperAdminApi()` returns a 403
 *                       Response unless the caller is a super-admin.
 * Layers 2 and 3 are the AUTHORITATIVE checks (middleware alone is never
 * trusted for authz). Both resolve through the same `isSuperAdmin` allowlist.
 *
 * Every authorized cross-tenant access is recorded with `logSuperAdminAccess()`
 * (DPA § 5 / § 4.3) — a best-effort, hash-chained AuditLog entry that the
 * customer can review on request.
 */

import "server-only";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { logger } from "@/lib/logger";

/** The authenticated super-admin identity resolved from the session. */
export interface SuperAdminIdentity {
  userId: string;
  email: string;
}

/**
 * Resolve the current request's super-admin identity, or `null` when the caller
 * is unauthenticated OR not on the super-admin allowlist. This is the single
 * authorization primitive both the API and page guards build on, so the rule is
 * defined in exactly one place.
 */
export async function getSuperAdminIdentity(): Promise<SuperAdminIdentity | null> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!session?.user?.id || !isSuperAdmin(email)) return null;
  // MFA invariant — enforced at the AUTHORITATIVE layer, not only in middleware.
  // The /api/admin/v2 routes live under /api, so they are NOT covered by the
  // page-level MFA gate; a super-admin with a partial (mfaRequired && not yet
  // verified) session must therefore be rejected HERE, or the cross-tenant API
  // would be reachable by skipping the TOTP challenge.
  if (session.user.mfaRequired && !session.user.mfaVerified) return null;
  return { userId: session.user.id, email: email as string };
}

/**
 * API guard. Returns the {@link SuperAdminIdentity} on success, or a ready-to-
 * return `NextResponse` (401/403) the route should return immediately. Usage:
 *
 *   const gate = await requireSuperAdminApi();
 *   if (gate instanceof NextResponse) return gate;
 *   // gate.userId / gate.email are now safe to use
 *
 * 401 vs 403 is intentionally NOT distinguished in the body (both say
 * "Forbidden") so an attacker can't probe which emails are super-admins.
 */
export async function requireSuperAdminApi(): Promise<
  SuperAdminIdentity | NextResponse
> {
  const identity = await getSuperAdminIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return identity;
}

/**
 * Page/layout guard for the (admin) route group. Returns the
 * {@link SuperAdminIdentity} on success; otherwise performs a Next.js
 * `redirect()` (which throws, so this never returns for unauthorized callers).
 * Anonymous users go to the login with a callback; authenticated-but-not-
 * super-admin users go to /dashboard (no hint that /admin exists).
 */
export async function requireSuperAdminPage(): Promise<SuperAdminIdentity> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fadmin");
  }
  const email = session.user.email ?? null;
  if (!isSuperAdmin(email)) {
    redirect("/dashboard");
  }
  // Super-admin but MFA not yet satisfied → send through the TOTP challenge
  // (mirrors the middleware page gate; re-checked here so the page guard is
  // self-sufficient and never renders for a partial session).
  if (session.user.mfaRequired && !session.user.mfaVerified) {
    redirect("/auth/mfa-challenge?callbackUrl=%2Fadmin");
  }
  return { userId: session.user.id, email: email as string };
}

/**
 * Record a super-admin accessing a cross-tenant admin surface (DPA § 5).
 * BEST-EFFORT: a logging failure must never break the page or API response, so
 * all errors are swallowed (and logged to the app logger, not re-thrown). The
 * underlying `logAuditEvent` writes a hash-chained, tamper-evident entry.
 *
 * @param surface  a stable slug for what was accessed, e.g. "admin:cockpit",
 *                 "admin:retention", "admin:api/cockpit". NEVER free user text.
 */
export async function logSuperAdminAccess(opts: {
  userId: string;
  email: string;
  surface: string;
  request?: Request;
}): Promise<void> {
  try {
    const ctx = opts.request
      ? getRequestContext(opts.request)
      : { ipAddress: undefined, userAgent: undefined };
    await logAuditEvent({
      userId: opts.userId,
      action: "superadmin_access",
      entityType: "admin_surface",
      entityId: opts.surface,
      description: `Super-admin ${opts.email} accessed ${opts.surface}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  } catch (err) {
    // Never let an audit-write failure break the admin surface it guards.
    logger.warn("logSuperAdminAccess failed", {
      surface: opts.surface,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
