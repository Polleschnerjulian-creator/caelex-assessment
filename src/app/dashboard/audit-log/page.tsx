import { redirect } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { prisma } from "@/lib/prisma";
import { getOrganizationAuditLog } from "@/lib/audit";
import {
  PageContainer,
  PageHeader,
  Card,
  EmptyState,
  CountBadge,
} from "@/components/dashboard/v2/ui/PageChrome";
import { AuditLogClient } from "./AuditLogClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit log — Caelex Comply",
  description:
    "Chronological filterable view of every audit event in your organization. 5+ year retention per §22 AWV / 15 CFR 762.",
};

interface PageProps {
  searchParams: Promise<{
    action?: string;
    entityType?: string;
    actor?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
}

/**
 * Audit Log viewer — Sprint E2.
 *
 * Org-wide chronological list of audit events with filters: free-text
 * search, action verb, entity type, actor, date range. Complements
 * /dashboard/audit-chain (Bitcoin-anchored hash-chain visualizer):
 * audit-chain shows tamper-evidence; audit-log is the operational
 * "what happened on Tuesday" surface auditors actually use.
 *
 * Permissions: every member of an org can view their org's audit
 * log. This is intentional — regulators expect transparency by
 * default. If a customer needs more granular access control later,
 * add an audit:read permission gate via getDefaultPermissionsForRole.
 */
export default async function AuditLogPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/audit-log");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "asc" },
    select: { organizationId: true },
  });
  if (!member) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Audit log"
          eyebrowIcon={Fingerprint}
          title="Audit Log"
          description="Chronological filterable view of every audit event in your organization. 5+ year retention per §22 AWV / 15 CFR 762."
        />
        <Card className="max-w-xl">
          <EmptyState
            icon={Fingerprint}
            title="You don't have an organization yet"
            description="Audit logs are scoped to organizations. Set up your org to start collecting an audit trail."
            cta={{ label: "Set up organization", href: "/onboarding" }}
          />
        </Card>
      </PageContainer>
    );
  }

  const sp = await searchParams;
  const startDate = sp.from ? new Date(sp.from) : undefined;
  const endDate = sp.to ? new Date(sp.to) : undefined;

  const result = await getOrganizationAuditLog(member.organizationId, {
    limit: 50,
    offset: 0,
    action: sp.action,
    entityType: sp.entityType,
    actorUserId: sp.actor,
    startDate,
    endDate,
    query: sp.q,
  });

  // Distinct actions + entity types in this org for the dropdowns. Pull
  // a small slice — these are stable across filter changes (would do
  // full-org scan but cap for performance).
  const [distinctActionsRaw, distinctEntityTypesRaw] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId: member.organizationId },
      distinct: ["action"],
      select: { action: true },
      take: 200,
    }),
    prisma.auditLog.findMany({
      where: { organizationId: member.organizationId },
      distinct: ["entityType"],
      select: { entityType: true },
      take: 100,
    }),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Audit log"
        eyebrowIcon={Fingerprint}
        title="Audit Log"
        helpTerm="Audit Log"
        description={
          <>
            Chronological filterable view of every audit event in your
            organization. Each entry is hash-chained for tamper-evidence (see{" "}
            <a
              className="font-medium text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
              href="/dashboard/audit-chain"
            >
              Audit chain
            </a>{" "}
            for the block visualization). 5+ year retention per §22 AWV / 15 CFR
            762.
          </>
        }
        actions={<CountBadge count={result.total} />}
      />

      <AuditLogClient
        initialLogs={result.logs.map((l) => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          description: l.description,
          ipAddress: l.ipAddress,
          userAgent: l.userAgent,
          timestamp: l.timestamp.toISOString(),
          entryHash: l.entryHash,
          previousHash: l.previousHash,
          actor: {
            userId: l.user?.id ?? null,
            name: l.user?.name ?? null,
            email: l.user?.email ?? null,
          },
        }))}
        initialTotal={result.total}
        distinctActors={result.distinctActors}
        distinctActions={distinctActionsRaw.map((r) => r.action).sort()}
        distinctEntityTypes={distinctEntityTypesRaw
          .map((r) => r.entityType)
          .sort()}
        initialFilters={{
          action: sp.action ?? null,
          entityType: sp.entityType ?? null,
          actor: sp.actor ?? null,
          from: sp.from ?? null,
          to: sp.to ?? null,
          q: sp.q ?? null,
        }}
      />
    </PageContainer>
  );
}
