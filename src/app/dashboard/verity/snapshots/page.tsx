/**
 * /dashboard/verity/snapshots — full history of signed Profile Snapshots.
 *
 * Server-rendered list view. Authorized to the caller's org only —
 * filtering happens in listProfileSnapshots(orgId). The row-level copy
 * + verify interactions live in the client SnapshotListView.
 *
 * Behind the same FEAT_PROVENANCE_V1 flag as the rest of Phase 4+. When
 * disabled, the page shows an empty-state explaining the feature.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listProfileSnapshots } from "@/lib/services/profile-snapshot-service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { SnapshotListView } from "./SnapshotListView";

export const metadata = {
  title: "Profile Snapshots — Caelex",
  description:
    "Signed, frozen records of your operator profile for audit and due-diligence sharing.",
};

export const dynamic = "force-dynamic";

export default async function SnapshotsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "desc" },
    include: {
      organization: { select: { id: true, isActive: true } },
    },
  });

  if (!membership?.organization?.isActive) {
    redirect("/get-started?reason=no-organization");
  }

  const enabled = isFeatureEnabled("provenance_v1");

  // When the flag is off, we deliberately don't even query — the feature
  // is intended to be dark by default until the org opts in.
  const snapshots = enabled
    ? await listProfileSnapshots(membership.organization.id, 50)
    : [];

  return (
    <SnapshotListView
      enabled={enabled}
      snapshots={snapshots.map((s) => ({
        id: s.id,
        snapshotHash: s.snapshotHash,
        issuerKeyId: s.issuerKeyId,
        frozenAt: s.frozenAt.toISOString(),
        frozenBy: s.frozenBy,
        purpose: s.purpose,
      }))}
    />
  );
}
