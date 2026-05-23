import { redirect } from "next/navigation";
import { FileBarChart } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listReports } from "@/lib/trade/supplement-2/supplement-2-service";
import { Supplement2ListPanel } from "./_components/Supplement2ListPanel";

export const metadata = {
  title: "Supplement No. 2 Reports — Caelex Trade",
};

/**
 * /trade/reports/supplement-2 — 15 CFR Part 743 Supplement No. 2
 * one-time report dashboard (Z29, Tier 4).
 *
 * Lists every TradeSupplement2Report in the org, ordered by reporting
 * period descending. Cron-created DRAFT rows + operator-filed rows
 * + any auto-flipped OVERDUE rows.
 *
 * Read-only for VIEWER + MEMBER roles. MANAGER+ can mark a draft
 * as FILED.
 */
export default async function TradeSupplement2Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Freports%2Fsupplement-2");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const reports = await listReports(orgId);

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Caelex Trade — Reports
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <FileBarChart size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              Supplement No. 2 One-Time Reports
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            15 CFR § 743.2 + Supplement No. 2 to Part 743 — semi-annual
            reporting of qualifying Wassenaar-controlled HPC and dual-use
            exports. Reports cover H1 (Jan-Jun, due Jul 31) and H2 (Jul- Dec,
            due Jan 31 of the following year).
            {canEdit
              ? " DRAFTs are auto-generated on Jan 1 and Jul 1 — review and mark FILED after submitting to BIS."
              : " Read-only view — MANAGER+ role required to mark reports FILED."}
          </p>
        </div>
      </header>

      <Supplement2ListPanel reports={reports} canEdit={canEdit} />
    </div>
  );
}

const EDITOR_ROLES: ReadonlyArray<string> = ["OWNER", "ADMIN", "MANAGER"];

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string; canEdit: boolean }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return { orgId: anyOrg?.id ?? "super-admin-no-org", canEdit: true };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } }, role: true },
    orderBy: { joinedAt: "asc" },
  });
  return {
    orgId: membership?.organization.id ?? "no-org",
    canEdit: membership ? EDITOR_ROLES.includes(membership.role) : false,
  };
}
