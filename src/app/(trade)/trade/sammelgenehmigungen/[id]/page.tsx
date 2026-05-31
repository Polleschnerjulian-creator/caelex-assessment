import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { TradeSammelgenehmigungStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  getSammelgenehmigung,
  getAvailableCapacity,
} from "@/lib/trade/sammelgenehmigung/sammelgenehmigung-service";
import { fromCents } from "@/lib/trade/money";

export const metadata = {
  title: "Sammelgenehmigung — Caelex Trade",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /trade/sammelgenehmigungen/[id] — detail view (Z11c).
 *
 * Shows the BAFA grant terms, current status, remaining capacity bar,
 * and the per-operation draw-down ledger ordered most-recent-first.
 *
 * Read-only MVP — DRAFT → ACTIVE activation and record-draw-down move
 * into action drawers in a later sprint (Z11d).
 */
export default async function SammelgenehmigungDetailPage({
  params,
}: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Fsammelgenehmigungen");
  }

  const { id } = await params;
  const { orgId } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const row = await getSammelgenehmigung(orgId, id);
  if (!row) notFound();

  const remaining = await getAvailableCapacity(orgId, id);
  // Convert bigint cents → euros numbers for display
  const cap = fromCents(row.totalValueCapEur);
  const drawn = fromCents(row.drawnDownValueEur);
  const pct = cap > 0 ? Math.min(100, (drawn / cap) * 100) : 0;
  let barTone = "bg-emerald-500";
  if (pct >= 90) barTone = "bg-red-500";
  else if (pct >= 70) barTone = "bg-amber-500";

  return (
    <div className="space-y-6 px-8 py-10">
      <div>
        <Link
          href="/trade/sammelgenehmigungen"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-trade-text-secondary hover:text-trade-accent-strong"
        >
          <ArrowLeft size={12} />
          Back to list
        </Link>
      </div>

      <header className="mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
          Caelex Trade — Authorization
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <Layers size={16} />
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-trade-text-primary">
            {row.title}
          </h1>
          <StatusPill status={row.status} />
        </div>
        <p className="mt-1 font-mono text-[12px] text-trade-text-muted">
          {row.bafaReference ?? "(no BAFA reference)"}
        </p>
      </header>

      {/* ── Summary grid ── */}
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Valid from" value={formatDate(row.validFrom)} />
        <SummaryCard label="Valid until" value={formatDate(row.validUntil)} />
        <SummaryCard
          label="Allowed destinations"
          value={
            row.allowedDestinations.length === 0
              ? "—"
              : row.allowedDestinations.join(", ")
          }
        />
        <SummaryCard
          label="Allowed ECCNs"
          value={
            row.allowedECCNs.length === 0 ? "—" : row.allowedECCNs.join(", ")
          }
        />
        <SummaryCard label="Total cap" value={formatEur(cap)} />
        <SummaryCard
          label="Remaining"
          value={formatEur(remaining ?? cap - drawn)}
          tone="text-emerald-700"
        />
      </section>

      {/* ── Capacity bar ── */}
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            Capacity
          </h2>
          <span className="text-[12px] text-trade-text-secondary">
            {formatEur(drawn)} of {formatEur(cap)} drawn ({pct.toFixed(1)}%)
          </span>
        </header>
        <div className="h-3 w-full overflow-hidden rounded-sm bg-slate-200">
          <div className={`h-full ${barTone}`} style={{ width: `${pct}%` }} />
        </div>
      </section>

      {/* ── End-users ── */}
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <h2 className="mb-3 text-[15px] font-semibold text-trade-text-primary">
          Allowed end-users
        </h2>
        {row.allowedEndUsers.length === 0 ? (
          <p className="text-[12.5px] text-trade-text-muted">
            No specific end-users listed (any end-user allowed within the SAG
            scope).
          </p>
        ) : (
          <ul className="space-y-1.5">
            {row.allowedEndUsers.map((eu) => (
              <li
                key={eu.id}
                className="flex items-center gap-2 text-[13px] text-trade-text-secondary"
              >
                <Link
                  href={`/trade/parties/${eu.id}`}
                  className="font-medium text-trade-text-primary hover:text-trade-accent-strong hover:underline"
                >
                  {eu.canonicalName}
                </Link>
                <span className="text-[11px] text-trade-text-muted">
                  ({eu.countryCode})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Draw-down ledger ── */}
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            Draw-down history
          </h2>
          <span className="text-[12px] text-trade-text-muted">
            {row.drawDowns.length}{" "}
            {row.drawDowns.length === 1 ? "entry" : "entries"}
          </span>
        </header>

        {row.drawDowns.length === 0 ? (
          <p className="rounded-md border border-dashed border-trade-border bg-trade-bg-page px-4 py-6 text-[12.5px] text-trade-text-muted">
            No draw-downs recorded yet. When an operation ships under this
            Sammelgenehmigung, the value consumed will appear here.
          </p>
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border text-left text-[11px] uppercase tracking-wider text-trade-text-muted">
                <th className="py-2 pr-4 font-medium">Operation</th>
                <th className="py-2 pr-4 font-medium">Drawn at</th>
                <th className="py-2 pr-4 text-right font-medium">
                  Value (EUR)
                </th>
                <th className="py-2 pr-4 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {row.drawDowns.map((dd) => (
                <tr
                  key={dd.id}
                  className="border-b border-trade-border-subtle last:border-0"
                >
                  <td className="py-2 pr-4 font-mono text-[11.5px] text-trade-text-secondary">
                    {dd.operationId ? (
                      <Link
                        href={`/trade/operations/${dd.operationId}`}
                        className="hover:text-trade-accent-strong hover:underline"
                      >
                        {dd.operationReference}
                      </Link>
                    ) : (
                      dd.operationReference
                    )}
                  </td>
                  <td className="py-2 pr-4 text-trade-text-secondary">
                    {new Date(dd.drawnDownAt).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-trade-text-primary">
                    {formatEur(fromCents(dd.valueEur))}
                  </td>
                  <td className="py-2 pr-4 text-trade-text-muted">
                    {dd.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {row.notes && (
        <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
          <h2 className="mb-2 text-[15px] font-semibold text-trade-text-primary">
            Notes
          </h2>
          <pre className="whitespace-pre-wrap text-[12.5px] text-trade-text-secondary">
            {row.notes}
          </pre>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-trade-text-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-[14px] font-semibold ${tone ?? "text-trade-text-primary"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: TradeSammelgenehmigungStatus }) {
  const tone = {
    DRAFT: "bg-slate-100 text-slate-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    EXHAUSTED: "bg-amber-100 text-amber-800",
    EXPIRED: "bg-slate-200 text-slate-500",
    REVOKED: "bg-red-100 text-red-700",
  }[status];
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tone}`}
    >
      {status}
    </span>
  );
}

function formatDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

function formatEur(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return { orgId: anyOrg?.id ?? "super-admin-no-org" };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return { orgId: membership?.organization.id ?? "no-org" };
}
