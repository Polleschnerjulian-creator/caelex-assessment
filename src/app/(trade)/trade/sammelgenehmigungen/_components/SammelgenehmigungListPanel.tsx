import Link from "next/link";
import { TradeSammelgenehmigungStatus } from "@prisma/client";
import type { SammelgenehmigungWithRelations } from "@/lib/trade/sammelgenehmigung/sammelgenehmigung-service";

/**
 * Sammelgenehmigung list panel (Z11c).
 *
 * Read-only server component — the MVP renders the table; create /
 * advance lifecycle / record-draw-down move into client drawers in a
 * later sprint as the operator volume justifies the form scaffolding.
 *
 * Rendering rules:
 *   - Status pill with semantic colour (ACTIVE = emerald, EXHAUSTED =
 *     slate, EXPIRED = muted slate, REVOKED = red, DRAFT = grey).
 *   - Inline capacity bar (drawn / total) so the operator sees how
 *     much remains without drilling into the detail.
 *   - validUntil formatted as YYYY-MM-DD; expiry urgency surfaced via
 *     a small "expires soon" badge when ≤30 days remain.
 */

interface Props {
  rows: SammelgenehmigungWithRelations[];
  canEdit: boolean;
}

const STATUS_LABELS: Record<TradeSammelgenehmigungStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXHAUSTED: "Exhausted",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

function statusTone(status: TradeSammelgenehmigungStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "EXHAUSTED":
      return "bg-amber-100 text-amber-800";
    case "EXPIRED":
      return "bg-slate-200 text-slate-500";
    case "REVOKED":
      return "bg-red-100 text-red-700";
  }
}

function StatusPill({ status }: { status: TradeSammelgenehmigungStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${statusTone(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatEur(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function CapacityBar({
  drawn,
  total,
}: {
  drawn: number;
  total: number;
}): JSX.Element {
  const pct = total > 0 ? Math.min(100, (drawn / total) * 100) : 0;
  let bar = "bg-emerald-500";
  if (pct >= 90) bar = "bg-red-500";
  else if (pct >= 70) bar = "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-sm bg-slate-200">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-trade-text-secondary">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export function SammelgenehmigungListPanel({ rows, canEdit }: Props) {
  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All bulk authorizations
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            {rows.length} {rows.length === 1 ? "record" : "records"}
            {!canEdit ? " · read-only view" : ""}
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-trade-border bg-trade-bg-page px-4 py-6 text-[12.5px] text-trade-text-muted">
          No Sammelgenehmigungen on file. When BAFA grants a bulk authorization,
          record it here so the system can track validity, capacity, and
          draw-downs.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border text-left text-[11px] uppercase tracking-wider text-trade-text-muted">
                <th className="py-2 pr-4 font-medium">Title / BAFA Ref.</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Valid until</th>
                <th className="py-2 pr-4 font-medium">Capacity</th>
                <th className="py-2 pr-4 font-medium">Cap (EUR)</th>
                <th className="py-2 pr-4 font-medium">End-users</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const daysLeft = daysUntil(new Date(row.validUntil));
                const expiringSoon =
                  row.status === "ACTIVE" && daysLeft >= 0 && daysLeft <= 30;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-trade-border-subtle last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/trade/sammelgenehmigungen/${row.id}`}
                        className="font-medium text-trade-text-primary hover:text-trade-accent-strong hover:underline"
                      >
                        {row.title}
                      </Link>
                      <div className="mt-0.5 font-mono text-[11px] text-trade-text-muted">
                        {row.bafaReference ?? "(no BAFA reference)"}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="py-3 pr-4 text-trade-text-secondary">
                      <span>
                        {new Date(row.validUntil).toISOString().slice(0, 10)}
                      </span>
                      {expiringSoon && (
                        <span className="ml-2 inline-flex items-center rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                          {daysLeft}d left
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <CapacityBar
                        drawn={row.drawnDownValueEur}
                        total={row.totalValueCapEur}
                      />
                    </td>
                    <td className="py-3 pr-4 text-trade-text-secondary">
                      {formatEur(row.totalValueCapEur)}
                    </td>
                    <td className="py-3 pr-4 text-trade-text-secondary">
                      {row.allowedEndUsers.length === 0
                        ? "(any)"
                        : row.allowedEndUsers
                            .slice(0, 2)
                            .map((eu) => eu.canonicalName)
                            .join(", ") +
                          (row.allowedEndUsers.length > 2
                            ? ` +${row.allowedEndUsers.length - 2}`
                            : "")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
