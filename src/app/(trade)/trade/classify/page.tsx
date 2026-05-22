import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listDrafts } from "@/lib/trade/classification-draft-service";

import { ClassifyPageClient } from "./_components/ClassifyPageClient";

export const metadata = {
  title: "AI Classification Copilot — Caelex Trade",
  description:
    "Drop a datasheet PDF or paste vendor text. Get a defensible ECCN / USML / EU Annex I classification draft for operator review.",
};

/**
 * /trade/classify — AI Classification Copilot landing (Sprint Z4d).
 *
 * Server component: resolves the org gate (mirroring /trade/euc), loads
 * the org's existing drafts, then hands them to the client component
 * that owns the upload UI + review modal.
 *
 * Editor gate: MEMBER+ can run new drafts and decide. VIEWER reads.
 */
export default async function TradeClassifyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Fclassify");
  }

  const { orgId, userId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  // Org-scoped read. The service enforces the boundary too, but we
  // pre-fetch here so the page is rendered server-side.
  const drafts = await listDrafts(
    { organizationId: orgId, userId },
    { take: 50 },
  );

  return (
    <ClassifyPageClient
      canEdit={canEdit}
      initialDrafts={drafts.map(serialiseDraftRow)}
    />
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

const EDITOR_ROLES: ReadonlyArray<string> = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "MEMBER",
];

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string; userId: string; canEdit: boolean }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return {
      orgId: anyOrg?.id ?? "super-admin-no-org",
      userId,
      canEdit: true,
    };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } }, role: true },
    orderBy: { joinedAt: "asc" },
  });
  return {
    orgId: membership?.organization.id ?? "no-org",
    userId,
    canEdit: membership ? EDITOR_ROLES.includes(membership.role) : false,
  };
}

/**
 * Convert a Prisma row into the serialisable client-side shape — Date
 * → ISO string + cast the JSON fields to the application type.
 */
function serialiseDraftRow(
  row: Awaited<ReturnType<typeof listDrafts>>[number],
) {
  return {
    id: row.id,
    proposedEccn: row.proposedEccn,
    proposedRegime: row.proposedRegime,
    confidence: row.confidence,
    decision: row.decision,
    sourceFilename: row.sourceFilename,
    tradeItemId: row.tradeItemId,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    evidence: row.evidence as unknown,
  };
}
