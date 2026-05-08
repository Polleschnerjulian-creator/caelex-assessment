import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getAuditChainSegment } from "@/lib/comply-v2/audit-chain-view.server";
import { AuditChainVisualizer } from "@/components/dashboard/v2/AuditChainVisualizer";
import {
  PageContainer,
  PageHeader,
  CountBadge,
} from "@/components/dashboard/v2/ui/PageChrome";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit Chain — Caelex Comply",
  description:
    "Tamper-evident audit-log chain visualization with OpenTimestamps Bitcoin anchors.",
};

/**
 * Audit Chain Visualizer — Sprint 10A (Wow-Pattern #7)
 *
 * Renders the operator's per-org audit-log hash chain as a vertical
 * blockchain-style visualization. Each row is a "block" linked to
 * its predecessor via SHA-256; rows that have been anchored to
 * Bitcoin via Sprint 8A+B show a colored anchor marker.
 *
 * The page itself does the auth + V2 gate + initial fetch; the
 * visualizer is a client island that handles "load more" pagination
 * via the same getAuditChainSegment endpoint.
 */
export default async function AuditChainPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/audit-chain");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

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
  const orgId = user?.organizationMemberships[0]?.organizationId ?? null;

  const initialSegment = orgId
    ? await getAuditChainSegment(orgId, { limit: 50 })
    : { totalEntries: 0, hasMore: false, nextCursor: null, blocks: [] };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Audit chain"
        eyebrowIcon={Link2}
        title="Tamper-evident audit chain"
        description={
          <>
            Every audit-log row is a SHA-256-linked block. The chain is{" "}
            <strong className="font-semibold text-slate-200">
              tamper-evident
            </strong>{" "}
            — modifying any row breaks the hash link to its successor. Quarterly
            OpenTimestamps anchors commit chain heads to Bitcoin so the timeline
            can&apos;t be silently rewritten.
          </>
        }
        actions={<CountBadge count={initialSegment.totalEntries} />}
      />

      <AuditChainVisualizer
        organizationId={orgId}
        initialSegment={initialSegment}
      />
    </PageContainer>
  );
}
