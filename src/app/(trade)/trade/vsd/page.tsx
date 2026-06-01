import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertOctagon, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listVsds } from "@/lib/trade/vsd-service";
import { VsdListPanel } from "./_components/VsdListPanel";

export const metadata = {
  title: "Voluntary Self-Disclosures — Passage",
};

interface VsdPageProps {
  searchParams: Promise<{ party?: string; item?: string; operation?: string }>;
}

/**
 * /trade/vsd — list of every TradeVoluntaryDisclosure (Sprint E1b).
 *
 * Sprint Y2 — accepts `?party=<id>`, `?item=<id>`, `?operation=<id>`
 * to filter the list to disclosures touching a specific entity.
 * Each filter is enforced server-side via an org-scoped lookup so a
 * hand-crafted ID from another org returns no rows.
 */
export default async function VsdPage({ searchParams }: VsdPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Fvsd");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const sp = await searchParams;

  // Resolve filter entities against the org-scope so cross-org IDs
  // return nothing (defence in depth — listVsds is already filtered).
  const [filterParty, filterItem, filterOperation] = await Promise.all([
    sp.party
      ? prisma.tradeParty.findFirst({
          where: { id: sp.party, organizationId: orgId },
          select: { id: true, canonicalName: true, countryCode: true },
        })
      : Promise.resolve(null),
    sp.item
      ? prisma.tradeItem.findFirst({
          where: { id: sp.item, organizationId: orgId },
          select: { id: true, name: true, internalSku: true },
        })
      : Promise.resolve(null),
    sp.operation
      ? prisma.tradeOperation.findFirst({
          where: { id: sp.operation, organizationId: orgId },
          select: { id: true, reference: true },
        })
      : Promise.resolve(null),
  ]);

  const allVsds = await listVsds(orgId);
  const vsds = allVsds.filter((v) => {
    if (filterParty && v.partyId !== filterParty.id) return false;
    if (filterItem && v.itemId !== filterItem.id) return false;
    if (filterOperation && v.operationId !== filterOperation.id) return false;
    return true;
  });

  // Load supporting lists only when the operator can create
  const operations = canEdit
    ? await prisma.tradeOperation.findMany({
        where: { organizationId: orgId },
        select: { id: true, reference: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];
  const items = canEdit
    ? await prisma.tradeItem.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, internalSku: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];
  const parties = canEdit
    ? await prisma.tradeParty.findMany({
        where: { organizationId: orgId },
        select: { id: true, canonicalName: true, countryCode: true },
        orderBy: { canonicalName: "asc" },
      })
    : [];

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Passage — Disclosures
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <AlertOctagon size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              Voluntary Self-Disclosures
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            Track formal disclosures to BIS (§764.5), DDTC (ITAR §127.12), OFAC
            (31 CFR §501.805(c)), BAFA and EU authorities. Prompt VSDs typically
            reduce penalties by 60-80% and demonstrate good-faith compliance.
            {canEdit
              ? " Add new disclosures and advance lifecycle here."
              : " Read-only view — MANAGER+ role required to manage."}
          </p>
        </div>
      </header>

      {(filterParty || filterItem || filterOperation) && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[12.5px] text-trade-text-secondary">
          <span>Filtered to</span>
          {filterParty && (
            <strong className="text-trade-text-primary">
              party: {filterParty.canonicalName} ({filterParty.countryCode})
            </strong>
          )}
          {filterItem && (
            <strong className="text-trade-text-primary">
              item: {filterItem.name}
            </strong>
          )}
          {filterOperation && (
            <strong className="text-trade-text-primary">
              operation: {filterOperation.reference}
            </strong>
          )}
          <Link
            href="/trade/vsd"
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium text-trade-accent-strong hover:bg-trade-accent-soft"
          >
            <X size={12} />
            Clear filter
          </Link>
        </div>
      )}

      <VsdListPanel
        vsds={vsds}
        operations={operations}
        items={items}
        parties={parties}
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
