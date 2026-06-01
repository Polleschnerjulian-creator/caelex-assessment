import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  listExpiringRecords,
  getRetentionSummary,
} from "@/lib/trade/recordkeeping/retention-list-service";
import { RetentionPanel } from "./_components/RetentionPanel";

export const metadata = {
  title: "Audit Center — Passage",
};

/**
 * /trade/audit-center — Recordkeeping + audit surface for Caelex Trade.
 *
 * Z32 (Tier 4) — initial scope is the 5-year retention panel:
 *
 *   1. Per 15 CFR § 762.6 (EAR) and 22 CFR § 122.5 (ITAR), exporters
 *      must retain export-control records for 5 years from the
 *      trigger event (export date, license expiration, EUC validation,
 *      VSD filing, NCA response, etc.).
 *   2. Caelex never auto-deletes — the panel flags records that are
 *      becoming eligible for archival OR are past the retention floor,
 *      and the operator's compliance officer decides what to do.
 *
 * Future expansion (Tier 5+):
 *   - Tamper-evident audit log viewer (the AuditLog hash chain is
 *     already live in lib/audit-hash.server.ts — UI follows here).
 *   - Bulk archival export to long-term storage with retention proof.
 *
 * Page is server-rendered with parallel Prisma reads (one for the
 * summary header, one for the per-type record groups). Org scope is
 * enforced inside the service layer.
 */
export default async function TradeAuditCenterPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Faudit-center");
  }

  const orgId = await resolveOrgId(session.user.id, session.user.email);

  const [summary, groups] = await Promise.all([
    getRetentionSummary(orgId),
    listExpiringRecords(orgId, {
      withinDays: 90,
      includeExpired: true,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-[24px] font-bold text-trade-text-primary">
          Audit Center
        </h1>
        <p className="mt-1 text-[13px] text-trade-text-muted">
          Recordkeeping obligations, retention windows, and tamper-evident trail
          for Passage.
        </p>
      </header>

      <RetentionPanel summary={summary} groups={groups} />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

async function resolveOrgId(
  userId: string,
  email: string | null | undefined,
): Promise<string> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return anyOrg?.id ?? "super-admin-no-org";
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return membership?.organization.id ?? "no-org";
}
