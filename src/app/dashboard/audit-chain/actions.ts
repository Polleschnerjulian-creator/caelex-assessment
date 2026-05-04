"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAuditChainSegment,
  type AuditChainSegment,
} from "@/lib/comply-v2/audit-chain-view.server";

/**
 * Server Action — load the next older segment for the current
 * user's primary org. Refuses if the requested orgId doesn't match
 * the caller's primary-org membership; the action authenticates
 * itself rather than trusting the client-supplied id.
 *
 * Returns either the next segment OR an error shape — the visualizer
 * surfaces errors as a small inline banner without crashing the
 * already-rendered chain.
 */
export async function loadMoreAuditChainSegment(
  organizationId: string,
  afterId: string,
): Promise<
  { ok: true; segment: AuditChainSegment } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthenticated" };
  }
  // Re-resolve the caller's primary org rather than trusting the
  // client-supplied organizationId. If the supplied id doesn't match,
  // the action returns "forbidden" — a leaked id from another tab
  // can't be used to read someone else's chain.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      organizationMemberships: {
        take: 1,
        orderBy: { joinedAt: "asc" },
        select: { organizationId: true },
      },
    },
  });
  const trueOrg = user?.organizationMemberships[0]?.organizationId ?? null;
  if (!trueOrg || trueOrg !== organizationId) {
    return { ok: false, error: "forbidden" };
  }
  const segment = await getAuditChainSegment(trueOrg, {
    afterId,
    limit: 50,
  });
  return { ok: true, segment };
}
