import Link from "next/link";
import {
  FileSignature,
  AlertOctagon,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { ComplianceHealthSummary } from "@/lib/trade/compliance-health-service";

/**
 * Compliance Health panel (Sprint X2).
 *
 * Three cards summarising the document workflow surfaces:
 *  - End-Use Certificates
 *  - Re-Export Consents
 *  - Voluntary Self-Disclosures
 *
 * Each card shows: total, a "needs action" badge (if > 0), and 2-3
 * mini-stats keyed off the relevant lifecycle states. Cards link
 * through to their respective list pages.
 */

interface ComplianceHealthPanelProps {
  summary: ComplianceHealthSummary;
}

export function ComplianceHealthPanel({ summary }: ComplianceHealthPanelProps) {
  return (
    <section className="mb-8">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          Compliance health
        </h2>
        <p className="text-[12px] text-trade-text-muted">
          Document workflow surfaces — what needs your attention today.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* EUC card */}
        <WorkflowCard
          icon={FileSignature}
          label="End-Use Certificates"
          href="/trade/euc"
          total={summary.euc.total}
          needsAction={summary.euc.needsAction}
          rows={[
            { label: "Requested", value: summary.euc.requested },
            { label: "Sent to party", value: summary.euc.sentToParty },
            {
              label: "Validated",
              value: summary.euc.validated,
              tone: "ok",
            },
            {
              label: "Expiring ≤90 days",
              value: summary.euc.expiringSoon,
              tone: summary.euc.expiringSoon > 0 ? "warn" : "muted",
            },
          ]}
        />

        {/* Re-Export card */}
        <WorkflowCard
          icon={FileSignature}
          label="Re-Export Consents"
          href="/trade/reexport-consents"
          total={summary.reexport.total}
          needsAction={summary.reexport.needsAction}
          rows={[
            { label: "Drafted", value: summary.reexport.drafted },
            { label: "Sent", value: summary.reexport.sent },
            {
              label: "Approved",
              value: summary.reexport.approved,
              tone: "ok",
            },
            {
              label: "Denied",
              value: summary.reexport.denied,
              tone: summary.reexport.denied > 0 ? "warn" : "muted",
            },
            {
              label: "Expiring ≤90 days",
              value: summary.reexport.expiringSoon,
              tone: summary.reexport.expiringSoon > 0 ? "warn" : "muted",
            },
          ]}
        />

        {/* VSD card */}
        <WorkflowCard
          icon={AlertOctagon}
          label="Self-Disclosures"
          href="/trade/vsd"
          total={summary.vsd.total}
          needsAction={summary.vsd.preFilingOpen}
          needsActionLabel={
            summary.vsd.preFilingOpen > 0 ? "pre-filing" : undefined
          }
          rows={[
            {
              label: "Discovered",
              value: summary.vsd.discovered,
              tone: summary.vsd.discovered > 0 ? "warn" : "muted",
            },
            {
              label: "Investigating",
              value: summary.vsd.investigating,
              tone: summary.vsd.investigating > 0 ? "warn" : "muted",
            },
            { label: "Submitted", value: summary.vsd.submitted },
            { label: "Acknowledged", value: summary.vsd.acknowledged },
            {
              label: "Resolved",
              value: summary.vsd.resolved,
              tone: "ok",
            },
          ]}
        />
      </div>
    </section>
  );
}

// ─── Card primitive ─────────────────────────────────────────────────

type RowTone = "ok" | "warn" | "muted";

interface CardRow {
  label: string;
  value: number;
  tone?: RowTone;
}

interface WorkflowCardProps {
  icon: LucideIcon;
  label: string;
  href: string;
  total: number;
  needsAction: number;
  needsActionLabel?: string;
  rows: CardRow[];
}

function WorkflowCard({
  icon: Icon,
  label,
  href,
  total,
  needsAction,
  needsActionLabel,
  rows,
}: WorkflowCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-5 transition-colors hover:border-trade-accent hover:bg-trade-bg-panel"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <Icon size={14} />
          </div>
          <h3 className="text-[13px] font-semibold text-trade-text-primary">
            {label}
          </h3>
        </div>
        <ArrowRight
          size={14}
          className="text-trade-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-trade-accent-strong"
        />
      </div>

      <div className="mb-4 flex items-baseline gap-3">
        <p className="font-mono text-[28px] font-bold tracking-tight text-trade-text-primary">
          {total}
        </p>
        {needsAction > 0 && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            {needsAction} {needsActionLabel ?? "need action"}
          </span>
        )}
      </div>

      <dl className="space-y-1.5 border-t border-trade-border-subtle pt-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between text-[12px]"
          >
            <dt className="text-trade-text-muted">{row.label}</dt>
            <dd
              className={`font-mono font-semibold ${toneClass(
                row.tone ?? "muted",
              )}`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

function toneClass(tone: RowTone): string {
  switch (tone) {
    case "ok":
      return "text-emerald-700";
    case "warn":
      return "text-amber-700";
    case "muted":
    default:
      return "text-trade-text-secondary";
  }
}
