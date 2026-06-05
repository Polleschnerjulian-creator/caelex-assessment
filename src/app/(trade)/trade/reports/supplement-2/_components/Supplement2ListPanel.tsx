"use client";

import Link from "next/link";
import { TradeSupplement2Status } from "@prisma/client";
import type { Supplement2ReportWithItems } from "@/lib/trade/supplement-2/supplement-2-service";

/**
 * Supplement No. 2 list panel (Z29, Tier 4).
 *
 * Server page fetches reports; this client wrapper renders the table
 * and (eventually) owns the file-as-FILED action drawer. Initial
 * MVP is read-only render + drill-down link.
 */
interface Supplement2ListPanelProps {
  reports: Supplement2ReportWithItems[];
  canEdit: boolean;
}

const STATUS_LABELS: Record<TradeSupplement2Status, string> = {
  DRAFT: "Draft",
  FILED: "Filed",
  OVERDUE: "Overdue",
  AMENDED: "Amended",
};

export function Supplement2ListPanel({
  reports,
  canEdit,
}: Supplement2ListPanelProps) {
  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All reports
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            {reports.length} {reports.length === 1 ? "report" : "reports"}
          </p>
        </div>
      </header>

      {reports.length === 0 ? (
        <p className="text-[13px] italic text-trade-text-muted">
          No Supplement No. 2 reports yet. DRAFTs are auto-generated on Jan 1
          and Jul 1 (UTC) for the just-closed reporting period.
          {canEdit
            ? ""
            : " Ask a MANAGER+ teammate to manually trigger a regeneration if needed."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                <th className="pb-2 pr-4 font-medium">Period</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Items</th>
                <th className="pb-2 pr-4 font-medium">Due</th>
                <th className="pb-2 pr-4 font-medium">Filed</th>
                <th className="pb-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trade-border-subtle">
              {reports.map((r) => {
                const totalItems = r.items.length;
                const filedLabel = r.filedAt
                  ? new Date(r.filedAt).toISOString().slice(0, 10)
                  : "—";
                return (
                  <tr key={r.id}>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/trade/reports/supplement-2/${r.id}`}
                        className="font-medium text-trade-text-primary hover:text-trade-accent-strong hover:underline"
                      >
                        {r.reportingPeriod}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="py-3 pr-4 font-mono text-[11.5px] text-trade-text-secondary">
                      {totalItems}
                    </td>
                    <td className="py-3 pr-4 text-trade-text-secondary">
                      {new Date(r.dueDate).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 pr-4 text-trade-text-secondary">
                      {filedLabel}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link
                        href={`/trade/reports/supplement-2/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-trade-border bg-trade-bg-page px-2 py-1 text-[11px] font-medium text-trade-text-secondary transition-colors hover:border-trade-accent hover:text-trade-accent-strong"
                      >
                        Details
                      </Link>
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

// ─── Status pill ────────────────────────────────────────────────────

function StatusPill({ status }: { status: TradeSupplement2Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneFor(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function toneFor(status: TradeSupplement2Status): string {
  switch (status) {
    case "DRAFT":
      return "trade-chip-neutral";
    case "FILED":
      return "trade-chip-success";
    case "OVERDUE":
      return "trade-chip-danger";
    case "AMENDED":
      return "trade-chip-warn";
  }
}
