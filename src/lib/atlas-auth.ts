import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const isPlatformAdmin = (session.user as { role?: string }).role === "admin";

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
      },
    },
    user: { select: { name: true, email: true, language: true } },
  } as const;

  const membership = targetOrgId
    ? await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId: targetOrgId },
        include,
      })
    : await prisma.organizationMember.findFirst({
        where: { userId: session.user.id },
        orderBy: { joinedAt: "asc" }, // deterministic: oldest first
        include,
      });

  if (!membership || !membership.organization.isActive) return null;

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
 */
export async function requirePlatformAdmin(): Promise<{
  userId: string;
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return { userId: session.user.id };
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
