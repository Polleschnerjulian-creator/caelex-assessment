import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSignature, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listEucRequests } from "@/lib/trade/euc-service";
import { EucListPanel } from "./_components/EucListPanel";

export const metadata = {
  title: "End-Use Certificates — Caelex Trade",
};

interface TradeEucPageProps {
  searchParams: Promise<{ party?: string }>;
}

/**
 * /trade/euc — list of every TradeEUCRequest in the org (Sprint E5b).
 *
 * Sprint E5c — accepts `?party=<id>` to filter to one counterparty;
 * the filter badge at the top shows the party name + a clear link.
 *
 * Read-only for VIEWER + MEMBER roles. MANAGER+ can create new EUCs
 * and advance lifecycle.
 */
export default async function TradeEucPage({
  searchParams,
}: TradeEucPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Feuc");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const { party: partyFilter } = await searchParams;

  // Load + filter. We do the org-scope check on the party row itself so
  // a hand-crafted ?party=<otherOrg> query never leaks rows.
  const filterParty = partyFilter
    ? await prisma.tradeParty.findFirst({
        where: { id: partyFilter, organizationId: orgId },
        select: { id: true, canonicalName: true, countryCode: true },
      })
    : null;

  const eucs = await listEucRequests(orgId);
  const filteredEucs = filterParty
    ? eucs.filter((e) => e.partyId === filterParty.id)
    : eucs;
  const parties = canEdit
    ? await prisma.tradeParty.findMany({
        where: { organizationId: orgId },
        select: { id: true, canonicalName: true, countryCode: true },
        orderBy: { canonicalName: "asc" },
      })
    : [];
  const operations = canEdit
    ? await prisma.tradeOperation.findMany({
        where: { organizationId: orgId },
        select: { id: true, reference: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Caelex Trade — Documents
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <FileSignature size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              End-Use Certificates
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            Lifecycle of BAFA / BIS / DDTC end-use certificates per
            counterparty. Required to evidence end-use commitments under §22
            AWV, 15 CFR §744, and ITAR §126.4(d).
            {canEdit
              ? " Add new EUCs and advance lifecycle from this view."
              : " Read-only view — MANAGER+ role required to manage."}
          </p>
        </div>
      </header>

      {filterParty && (
        <div className="flex items-center gap-2 rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[12.5px] text-trade-text-secondary">
          Filtered to{" "}
          <strong className="text-trade-text-primary">
            {filterParty.canonicalName}
          </strong>{" "}
          <span className="text-trade-text-muted">
            ({filterParty.countryCode})
          </span>
          <Link
            href="/trade/euc"
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium text-trade-accent-strong hover:bg-trade-accent-soft"
          >
            <X size={12} />
            Clear filter
          </Link>
        </div>
      )}

      <EucListPanel
        eucs={filteredEucs}
        parties={parties}
        operations={operations}
        canEdit={canEdit}
      />
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
