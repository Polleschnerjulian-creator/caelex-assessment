import "server-only";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
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
