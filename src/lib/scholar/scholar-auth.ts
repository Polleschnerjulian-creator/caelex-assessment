import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { isSuperAdmin } from "@/lib/super-admin";
import type { OrganizationRole } from "@prisma/client";

export interface ScholarAuthContext {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
}

/**
 * Resolve the caller's Scholar context, or null if they may not use Scholar.
 * Mirrors getTradeAuth(): session → active org → SCHOLAR product entitlement.
 */
export async function getScholarAuth(): Promise<ScholarAuthContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // MFA gate (defense-in-depth): a credentials user who completed step-1
  // (password) but NOT step-2 (TOTP) carries mfaRequired=true / mfaVerified=false
  // on the session. Refuse Scholar access until the second factor is satisfied —
  // mirrors the middleware /dashboard gate (middleware.ts). This is the single
  // choke point for all 3 /api/scholar/* routes AND every server action that
  // resolves the user via getScholarAuth(), so the second factor can no longer
  // be skipped by deep-linking into /scholar. ScholarLayout performs the
  // matching page-level redirect to /auth/mfa-challenge.
  if (session.user.mfaRequired && !session.user.mfaVerified) return null;

  // Super-admin god-mode (mirrors (scholar)/layout.tsx + getTradeAuth):
  // platform owners skip the SCHOLAR entitlement gate and resolve to the
  // OLDEST active org with a synthetic OWNER role. WITHOUT this, an admin is
  // let into the Scholar UI by the layout but every /api/scholar/* call would
  // return 403 — the page renders, the data calls fail.
  if (isSuperAdmin(session.user.email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!anyOrg) return null;
    return {
      userId: session.user.id,
      organizationId: anyOrg.id,
      role: "OWNER",
    };
  }

  const org = await getCurrentOrganization(session.user.id);
  if (!org) return null;

  const ok = await hasProductAccess(org.organizationId, "SCHOLAR");
  if (!ok) return null;

  return {
    userId: org.userId,
    organizationId: org.organizationId,
    role: org.role,
  };
}
