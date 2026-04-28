import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import type { OrganizationRole } from "@prisma/client";

/** Cookie key for the user's currently-selected Atlas organisation. */
export const ACTIVE_ORG_COOKIE = "atlas_active_org";

export interface AtlasAuthResult {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userLanguage: string | null;
  organizationId: string;
  organizationName: string;
  organizationLogo: string | null;
  organizationSlug: string;
  role: OrganizationRole;
  /** True if the current user has platform-level admin rights. */
  isPlatformAdmin: boolean;
}

interface GetAtlasAuthOptions {
  /** Explicit organisation to scope to. When omitted, falls back to
   *  the `atlas_active_org` cookie and then to the oldest membership
   *  (deterministic ordering so behaviour is predictable). */
  orgId?: string;
}

/**
 * Resolves the current Atlas session with explicit organisation scoping.
 *
 * Resolution order for the active organisation:
 *   1. `options.orgId` (explicit argument, e.g. from a route param)
 *   2. `atlas_active_org` cookie (set by the org-switcher UI)
 *   3. oldest joined membership (deterministic fallback)
 *
 * Returns null if any check fails (no session, no active membership,
 * explicit org not a membership of the user, organisation inactive).
 */
export async function getAtlasAuth(
  options: GetAtlasAuthOptions = {},
): Promise<AtlasAuthResult | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Super-admin emails always carry platform-admin rights, even if the
  // DB row's role hasn't been promoted yet (e.g. fresh deploy where
  // seed-admin.ts hasn't been run). Both `User.role === "admin"` and
  // the hardcoded super-admin allowlist count.
  const superAdminBypass = isSuperAdmin(session.user.email);
  const isPlatformAdmin =
    superAdminBypass || (session.user as { role?: string }).role === "admin";

  // Determine which organisation to scope to
  let targetOrgId = options.orgId;
  if (!targetOrgId) {
    try {
      const cookieStore = await cookies();
      targetOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
    } catch {
      // cookies() can throw in certain edge contexts — safe to ignore
    }
  }

  const include = {
    organization: {
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        isActive: true,
        orgType: true,
      },
    },
    user: { select: { name: true, email: true, language: true } },
  } as const;

  // Atlas is gated to LAW_FIRM and BOTH org types — see (atlas)/atlas/
  // layout.tsx for the page-level gate. Without filtering here, a user
  // who's a member of both an OPERATOR org and a LAW_FIRM org would be
  // resolved to whichever joined first — potentially scoping data calls
  // to the OPERATOR org while the layout believed they were in the
  // LAW_FIRM (cross-org data leak risk).
  //
  // Super-admin override: platform owners can scope to ANY org so they
  // can debug customer issues. They still need to belong to the org
  // (or be passing an explicit `orgId` they have access to) — this
  // doesn't grant arbitrary cross-org data access without consent.
  const ATLAS_ORG_TYPES = ["LAW_FIRM", "BOTH"] as const;
  const orgTypeFilter = superAdminBypass
    ? undefined
    : { orgType: { in: [...ATLAS_ORG_TYPES] } };

  const membership = targetOrgId
    ? await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          organizationId: targetOrgId,
          ...(orgTypeFilter && { organization: orgTypeFilter }),
        },
        include,
      })
    : await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          ...(orgTypeFilter && { organization: orgTypeFilter }),
        },
        orderBy: { joinedAt: "asc" }, // deterministic: oldest first
        include,
      });

  if (!membership || !membership.organization.isActive) return null;

  // ─── DPA § 5 audit-trail for super-admin cross-tenant access ───
  // When a platform owner uses the super-admin bypass to scope into
  // an org they are NOT a regular member of, write a tamper-evident
  // audit-log entry the customer can review on request. Skip when
  // the super-admin is also a regular member of the target org —
  // that's normal usage, not "Restricted Administrative Access" in
  // the DPA TOM sense.
  if (superAdminBypass) {
    try {
      const isRegularMember = !!(await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          organizationId: membership.organization.id,
        },
        select: { id: true },
      }));
      if (!isRegularMember) {
        const { logAuditEvent } = await import("@/lib/audit");
        await logAuditEvent({
          userId: session.user.id,
          organizationId: membership.organization.id,
          action: "super_admin_cross_tenant_access",
          entityType: "organization",
          entityId: membership.organization.id,
          description:
            "Platform-owner administrative scope-resolution into a non-member organisation. " +
            "See /legal/privacy § 5 and /legal/dpa § 4.3.",
          newValue: {
            super_admin_email: session.user.email,
            target_org_slug: membership.organization.slug ?? null,
          },
        });
      }
    } catch {
      // Best-effort — never block scope-resolution on audit failure.
      // The audit-chain integrity check will surface gaps in routine
      // monthly review anyway.
    }
  }

  return {
    userId: session.user.id,
    userName: membership.user.name,
    userEmail: membership.user.email,
    userLanguage: membership.user.language,
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    organizationLogo: membership.organization.logoUrl,
    organizationSlug: membership.organization.slug,
    role: membership.role,
    isPlatformAdmin,
  };
}

/**
 * Require the caller to be a platform-level administrator (user.role === "admin").
 * Returns the userId on success, null otherwise — route handlers should
 * respond with 401/403 on null.
 *
 * C5 fix: re-fetches role + isActive from the DB instead of trusting the
 * JWT. A demoted or deactivated admin loses admin access immediately on
 * the next request instead of the 5-minute JWT refresh window.
 */
export async function requirePlatformAdmin(): Promise<{
  userId: string;
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  // Two paths to platform-admin: (a) hardcoded super-admin allowlist
  // (lib/super-admin.ts) — the platform owners, always trusted; or
  // (b) DB-backed `User.role === "admin"` — promoted staff via
  // prisma/seed-admin.ts. Either qualifies.
  if (!isSuperAdmin(user.email) && user.role !== "admin") return null;
  return { userId: user.id };
}

/**
 * Require the caller to be an organisation-level admin or owner for the
 * scoped organisation.
 */
export async function requireAtlasOrgAdmin(
  options: GetAtlasAuthOptions = {},
): Promise<AtlasAuthResult | null> {
  const ctx = await getAtlasAuth(options);
  if (!ctx) return null;
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") return null;
  return ctx;
}

/**
 * Check if a role is OWNER (for team management actions).
 */
export function isOwner(role: OrganizationRole): boolean {
  return role === "OWNER";
}
