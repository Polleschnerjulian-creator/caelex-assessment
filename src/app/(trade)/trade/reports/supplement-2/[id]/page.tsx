import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileBarChart } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { getReport } from "@/lib/trade/supplement-2/supplement-2-service";
import { Supplement2DetailPanel } from "../_components/Supplement2DetailPanel";

export const metadata = {
  title: "Supplement No. 2 Report — Caelex Trade",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TradeSupplement2DetailPage({
  params,
}: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Freports%2Fsupplement-2");
  }

  const { id } = await params;
  const { orgId, canEdit, userId } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const report = await getReport(orgId, id);
  if (!report) {
    // null = not in this org → 404 to avoid leaking cross-org existence
    notFound();
  }

  return (
    <div className="space-y-5 px-8 py-10">
      <Link
        href="/trade/reports/supplement-2"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-trade-text-secondary hover:text-trade-accent-strong"
      >
        <ArrowLeft size={12} />
        All reports
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Caelex Trade — Report
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <FileBarChart size={16} />
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-trade-text-primary">
              Supplement No. 2 — {report.reportingPeriod}
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            Period: {new Date(report.periodStart).toISOString().slice(0, 10)} –{" "}
            {new Date(report.periodEnd).toISOString().slice(0, 10)} · Due{" "}
            {new Date(report.dueDate).toISOString().slice(0, 10)} · Status{" "}
            <strong className="text-trade-text-primary">{report.status}</strong>
            .
          </p>
        </div>
      </header>

      <Supplement2DetailPanel
        report={report}
        canEdit={canEdit}
        currentUserId={userId}
      />
    </div>
  );
}

const EDITOR_ROLES: ReadonlyArray<string> = ["OWNER", "ADMIN", "MANAGER"];

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string; canEdit: boolean; userId: string }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return {
      orgId: anyOrg?.id ?? "super-admin-no-org",
      canEdit: true,
      userId,
    };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } }, role: true },
    orderBy: { joinedAt: "asc" },
  });
  return {
    orgId: membership?.organization.id ?? "no-org",
    canEdit: membership ? EDITOR_ROLES.includes(membership.role) : false,
    userId,
  };
}
