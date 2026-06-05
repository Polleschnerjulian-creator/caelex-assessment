"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, RefreshCcw, AlertTriangle } from "lucide-react";
import { TradeSupplement2Status } from "@prisma/client";
import type { Supplement2ReportWithItems } from "@/lib/trade/supplement-2/supplement-2-service";
import {
  markReportFiled,
  regenerateReport,
} from "@/lib/trade/supplement-2/supplement-2-actions";

/**
 * Supplement No. 2 detail panel (Z29, Tier 4).
 *
 * Renders the snapshot items + offers two actions for editors:
 *   1. Mark FILED (DRAFT / OVERDUE) or AMENDED (FILED) — captures
 *      optional BIS reference number + free-text notes.
 *   2. Regenerate snapshot (DRAFT only) — re-runs eligibility.
 *
 * PDF generation is a follow-up sprint; the button is a no-op stub.
 */
interface Supplement2DetailPanelProps {
  report: Supplement2ReportWithItems;
  canEdit: boolean;
  currentUserId: string;
}

const STATUS_LABELS: Record<TradeSupplement2Status, string> = {
  DRAFT: "Draft",
  FILED: "Filed",
  OVERDUE: "Overdue",
  AMENDED: "Amended",
};

export function Supplement2DetailPanel({
  report,
  canEdit,
}: Supplement2DetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showFileForm, setShowFileForm] = useState(false);
  const [bisRef, setBisRef] = useState(report.bisReferenceNumber ?? "");
  const [notes, setNotes] = useState(report.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isImmutable = report.status === "FILED" || report.status === "AMENDED";
  const canFile =
    canEdit && (report.status === "DRAFT" || report.status === "OVERDUE");
  const canAmend = canEdit && isImmutable;
  const canRegenerate = canEdit && report.status === "DRAFT";

  const handleFile = () => {
    setError(null);
    startTransition(async () => {
      const result = await markReportFiled({
        reportId: report.id,
        bisReferenceNumber: bisRef.trim() || null,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowFileForm(false);
    });
  };

  const handleRegenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await regenerateReport({
        reportingPeriod: report.reportingPeriod,
      });
      if (!result.ok) setError(result.error);
    });
  };

  const totalValue = report.items.reduce(
    (sum, item) => sum + item.totalValue,
    0,
  );
  const currencies = new Set(report.items.map((i) => i.currency));
  const currencyLabel =
    currencies.size === 1 ? Array.from(currencies)[0] : "mixed";

  return (
    <div className="space-y-5">
      {/* ── Action bar ─────────────────────────────────────────────── */}
      {canEdit && (
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-4 py-3">
          <StatusPill status={report.status} />
          <span className="text-[12px] text-trade-text-muted">
            {report.items.length}{" "}
            {report.items.length === 1 ? "qualifying op" : "qualifying ops"} ·
            total {totalValue.toLocaleString("en-US")} {currencyLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {canFile && (
              <button
                type="button"
                onClick={() => setShowFileForm((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong"
              >
                <CheckCircle2 size={13} />
                Mark filed
              </button>
            )}
            {canAmend && (
              <button
                type="button"
                onClick={() => setShowFileForm((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-page px-3 py-1.5 text-[12.5px] font-semibold text-trade-text-secondary transition-colors hover:border-trade-accent hover:text-trade-accent-strong"
              >
                <AlertTriangle size={13} />
                File amendment
              </button>
            )}
            {canRegenerate && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-page px-3 py-1.5 text-[12.5px] font-semibold text-trade-text-secondary transition-colors hover:border-trade-accent hover:text-trade-accent-strong disabled:opacity-50"
              >
                <RefreshCcw
                  size={13}
                  className={isPending ? "animate-spin" : undefined}
                />
                Regenerate
              </button>
            )}
            <button
              type="button"
              disabled
              title="PDF generation coming soon"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-page px-3 py-1.5 text-[12.5px] font-semibold text-trade-text-muted opacity-50"
            >
              Generate PDF
            </button>
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-md border trade-chip-danger px-3 py-2 text-[12.5px]">
          {error}
        </div>
      )}

      {/* ── File form ──────────────────────────────────────────────── */}
      {showFileForm && (canFile || canAmend) && (
        <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-4 py-4">
          <h3 className="mb-2 text-[14px] font-semibold text-trade-text-primary">
            {canFile ? "Mark report as filed" : "File amendment"}
          </h3>
          <p className="mb-3 text-[12px] text-trade-text-muted">
            After submitting the report to BIS via SNAP-R, record the
            confirmation reference here. The status will transition to{" "}
            <strong>{canFile ? "FILED" : "AMENDED"}</strong>.
          </p>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted">
                BIS reference number (optional)
              </span>
              <input
                type="text"
                value={bisRef}
                onChange={(e) => setBisRef(e.target.value)}
                className="w-full rounded-md border border-trade-border bg-trade-bg-page px-3 py-1.5 text-[13px] text-trade-text-primary outline-none focus:border-trade-accent"
                placeholder="e.g. BIS-2026-08-12345"
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted">
                Notes (optional)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-trade-border bg-trade-bg-page px-3 py-1.5 text-[13px] text-trade-text-primary outline-none focus:border-trade-accent"
                rows={3}
                maxLength={4000}
                placeholder="Filing context, scope decisions, amendment rationale, etc."
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFile}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowFileForm(false)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-page px-3 py-1.5 text-[12.5px] font-semibold text-trade-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Snapshot items table ───────────────────────────────────── */}
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <header className="mb-4">
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            Covered operations
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            Snapshot of qualifying TradeOperation rows at aggregation time.
            Re-aggregation refreshes this list while the report is in DRAFT.
          </p>
        </header>

        {report.items.length === 0 ? (
          <p className="text-[13px] italic text-trade-text-muted">
            No qualifying operations were shipped in this period.{" "}
            {canEdit
              ? "Mark this report FILED-no-activity to discharge the obligation."
              : "Ask a MANAGER+ teammate to file a no-activity report."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-trade-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                  <th className="pb-2 pr-4 font-medium">Operation</th>
                  <th className="pb-2 pr-4 font-medium">ECCN</th>
                  <th className="pb-2 pr-4 font-medium">Dest.</th>
                  <th className="pb-2 pr-4 font-medium">Qty</th>
                  <th className="pb-2 pr-4 font-medium">Value</th>
                  <th className="pb-2 pr-4 font-medium">Ship date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-trade-border-subtle">
                {report.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-4 font-mono text-[11.5px] text-trade-text-primary">
                      {item.operationReference}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[11.5px] text-trade-text-secondary">
                      {item.eccn}
                    </td>
                    <td className="py-2.5 pr-4 text-trade-text-secondary">
                      {item.destinationCountry}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[11.5px] text-trade-text-secondary">
                      {item.quantity.toLocaleString("en-US")}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[11.5px] text-trade-text-secondary">
                      {item.totalValue.toLocaleString("en-US")} {item.currency}
                    </td>
                    <td className="py-2.5 pr-4 text-trade-text-secondary">
                      {new Date(item.shipDate).toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Filing metadata ────────────────────────────────────────── */}
      {(report.filedAt ||
        report.amendedAt ||
        report.bisReferenceNumber ||
        report.notes) && (
        <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
          <h2 className="mb-3 text-[15px] font-semibold text-trade-text-primary">
            Filing metadata
          </h2>
          <dl className="grid grid-cols-1 gap-y-2 text-[12.5px] sm:grid-cols-2 sm:gap-x-6">
            {report.filedAt && (
              <>
                <dt className="text-trade-text-muted">Filed at</dt>
                <dd className="font-mono text-trade-text-primary">
                  {new Date(report.filedAt).toISOString()}
                </dd>
              </>
            )}
            {report.amendedAt && (
              <>
                <dt className="text-trade-text-muted">Amended at</dt>
                <dd className="font-mono text-trade-text-primary">
                  {new Date(report.amendedAt).toISOString()}
                </dd>
              </>
            )}
            {report.bisReferenceNumber && (
              <>
                <dt className="text-trade-text-muted">BIS reference</dt>
                <dd className="font-mono text-trade-text-primary">
                  {report.bisReferenceNumber}
                </dd>
              </>
            )}
            {report.notes && (
              <>
                <dt className="text-trade-text-muted">Notes</dt>
                <dd className="whitespace-pre-wrap text-trade-text-secondary">
                  {report.notes}
                </dd>
              </>
            )}
          </dl>
        </section>
      )}
    </div>
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
