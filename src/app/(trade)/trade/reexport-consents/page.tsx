import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSignature, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listReexportConsents } from "@/lib/trade/reexport-service";
import { ReexportListPanel } from "./_components/ReexportListPanel";

export const metadata = {
  title: "Re-Export Consents — Caelex Trade",
};

interface ReexportPageProps {
  searchParams: Promise<{ party?: string }>;
}

/**
 * /trade/reexport-consents — list of every TradeReexportConsent row
 * in the org (Sprint E4b). Mirrors /trade/euc structurally.
 *
 * ?party=<id> filter scopes the list to one counterparty + adds a
 * filter chip; the filter is enforced server-side via the org-scoped
 * party lookup.
 */
export default async function ReexportConsentsPage({
  searchParams,
}: ReexportPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Freexport-consents");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const { party: partyFilter } = await searchParams;
  const filterParty = partyFilter
    ? await prisma.tradeParty.findFirst({
        where: { id: partyFilter, organizationId: orgId },
        select: { id: true, canonicalName: true, countryCode: true },
      })
    : null;

  const consents = await listReexportConsents(orgId);
  const filteredConsents = filterParty
    ? consents.filter((c) => c.requestingPartyId === filterParty.id)
    : consents;

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
              Re-Export Consents
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            Authorisations from the original exporter allowing a re-export to a
            new destination. Required under §17 AWV, 15 CFR §734.16, and Art. 11
            EU 2021/821 (Annex IV).
            {canEdit
              ? " Add new requests and advance lifecycle from this view."
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
            href="/trade/reexport-consents"
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium text-trade-accent-strong hover:bg-trade-accent-soft"
          >
            <X size={12} />
            Clear filter
          </Link>
        </div>
      )}

      <ReexportListPanel
        consents={filteredConsents}
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
