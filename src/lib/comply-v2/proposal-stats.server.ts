import "server-only";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";

/**
 * Count of pending Astra proposals visible to the current user.
 *
 * - Returns 0 for unauthenticated requests.
 * - Super-admins see the global pending count (everyone's proposals).
 * - Everyone else sees their own.
 *
 * Used by V2Shell to render a pending-count badge in the preview
 * banner so users know they have proposals to review.
 */
export async function getPendingProposalCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;
  const showAll = isSuperAdmin(session.user.email);
  return prisma.astraProposal.count({
    where: {
      status: "PENDING",
      expiresAt: { gt: new Date() },
      ...(showAll ? {} : { userId: session.user.id }),
    },
  });
}
