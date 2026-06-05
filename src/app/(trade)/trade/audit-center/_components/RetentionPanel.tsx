import {
  Archive,
  Clock,
  AlertTriangle,
  FileSignature,
  FileCheck,
  Package,
  ScrollText,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type {
  ExpiringRecordsGroup,
  RetentionSummary,
} from "@/lib/trade/recordkeeping/retention-list-service";
import type { RetentionRecordType } from "@/lib/trade/recordkeeping/retention-policy";
import type { RetentionStatusKind } from "@/lib/trade/recordkeeping/retention-status";

/**
 * RetentionPanel — Audit-Center surface for the 5-year retention
 * policy (Z32, Tier 4).
 *
 * Server-component panel rendered into /trade/audit-center. Surfaces:
 *   - Header: aggregate counts across the four retention buckets
 *     (pending / active / expiring-soon / expired). Operators see at
 *     a glance whether anything needs archival action.
 *   - Per-type groups: one section per record type with the 50 most
 *     urgent rows (sorted by daysRemaining ascending — expired first,
 *     then expiring-soon). Each row shows the record label, days
 *     remaining, and the statutory basis (§ 762.6 / § 122.5 / EU
 *     2021/821).
 *
 * Light-theme matching the rest of the trade UI — trade-* tokens, no
 * glass classes (trade route group is light-mode-first).
 *
 * Sources cited:
 *   - 15 CFR § 762.6 (EAR — 5-year retention from trigger event)
 *   - 22 CFR § 122.5 (ITAR — 5 years from license expiration)
 *   - EU Reg 2021/821 Art. 27(3) (5 years from end of export year)
 */

const RECORD_TYPE_META: Record<
  RetentionRecordType,
  { label: string; icon: LucideIcon; href: string | null }
> = {
  OPERATION: {
    label: "Operations",
    icon: Package,
    href: "/trade/operations",
  },
  LICENSE: {
    label: "Licenses",
    icon: FileCheck,
    href: "/trade/licenses",
  },
  EUC: {
    label: "End-Use Certificates",
    icon: FileSignature,
    href: "/trade/euc",
  },
  REEXPORT_CONSENT: {
    label: "Re-Export Consents",
    icon: FileSignature,
    href: "/trade/reexport-consents",
  },
  VSD: {
    label: "Voluntary Self-Disclosures",
    icon: ShieldAlert,
    href: "/trade/vsd",
  },
  CLASSIFICATION_DRAFT: {
    label: "Classification Drafts",
    icon: ScrollText,
    href: "/trade/classify",
  },
  BAFA_SUBMISSION: {
    label: "BAFA Submissions",
    icon: ScrollText,
    href: null,
  },
  NCA_CORRESPONDENCE: {
    label: "NCA Correspondence",
    icon: ScrollText,
    href: null,
  },
};

interface RetentionPanelProps {
  summary: RetentionSummary;
  groups: ExpiringRecordsGroup[];
}

export function RetentionPanel({ summary, groups }: RetentionPanelProps) {
  return (
    <section className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Archive size={18} className="text-trade-accent-strong" />
          <h2 className="text-[16px] font-semibold text-trade-text-primary">
            Recordkeeping — 5-Year Retention
          </h2>
        </div>
        <p className="mt-1 text-[12px] text-trade-text-muted">
          Per 15 CFR § 762.6 (EAR) + 22 CFR § 122.5 (ITAR) + EU Reg 2021/821
          Art. 27(3), every export-control record is retained for at least 5
          years from its trigger event. Caelex never auto-deletes — this surface
          flags what is becoming eligible for archival or has passed the
          retention window.
        </p>
      </header>

      <SummaryRow summary={summary} />

      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard key={group.recordType} group={group} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Summary row ────────────────────────────────────────────────────

function SummaryRow({ summary }: { summary: RetentionSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <SummaryCard
        label="Active"
        value={summary.totalActive}
        helper="Within window"
        tone="ok"
      />
      <SummaryCard
        label="Expiring ≤ 90 days"
        value={summary.totalExpiringSoon}
        helper="Plan archival"
        tone={summary.totalExpiringSoon > 0 ? "warn" : "muted"}
      />
      <SummaryCard
        label="Expired"
        value={summary.totalExpired}
        helper="Past cutoff"
        tone={summary.totalExpired > 0 ? "alert" : "muted"}
      />
      <SummaryCard
        label="Pending trigger"
        value={summary.totalPending}
        helper="Clock not started"
        tone="muted"
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  helper: string;
  tone: "ok" | "warn" | "alert" | "muted";
}

function SummaryCard({ label, value, helper, tone }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-trade-border-subtle bg-trade-bg-elevated p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-trade-text-muted">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-[24px] font-bold tracking-tight ${valueTone(tone)}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-trade-text-muted">{helper}</p>
    </div>
  );
}

function valueTone(tone: SummaryCardProps["tone"]): string {
  switch (tone) {
    case "ok":
      return "text-trade-accent-success";
    case "warn":
      return "text-trade-accent-warn";
    case "alert":
      return "text-trade-accent-danger";
    case "muted":
    default:
      return "text-trade-text-primary";
  }
}

// ─── Per-type group ─────────────────────────────────────────────────

function GroupCard({ group }: { group: ExpiringRecordsGroup }) {
  const meta = RECORD_TYPE_META[group.recordType];
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated">
      <header className="flex items-center justify-between border-b border-trade-border-subtle px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <Icon size={14} />
          </div>
          <h3 className="text-[13px] font-semibold text-trade-text-primary">
            {meta.label}
          </h3>
          <span className="rounded-sm bg-trade-bg-panel px-2 py-0.5 font-mono text-[11px] font-semibold text-trade-text-secondary">
            {group.count}
          </span>
        </div>
      </header>

      <ul className="divide-y divide-trade-border-subtle">
        {group.records.map((record) => (
          <li
            key={record.recordId}
            className="flex items-center justify-between px-5 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-trade-text-primary">
                {record.label}
              </p>
              <p className="mt-0.5 text-[11px] text-trade-text-muted">
                {record.retention.basis}
              </p>
            </div>
            <div className="ml-4 flex flex-col items-end gap-1">
              <StatusBadge status={record.retention.status} />
              <p className="font-mono text-[11px] text-trade-text-secondary">
                {formatDaysRemaining(record.retention.daysRemaining)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Status badge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: RetentionStatusKind }) {
  switch (status) {
    case "expired":
      return (
        <span className="trade-chip-danger inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          <AlertTriangle size={10} />
          Expired
        </span>
      );
    case "expiring-soon":
      return (
        <span className="trade-chip-warn inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          <Clock size={10} />
          Expiring soon
        </span>
      );
    case "active":
      return (
        <span className="trade-chip-success inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          Active
        </span>
      );
    case "pending":
    default:
      return (
        <span className="trade-chip-neutral inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          Pending trigger
        </span>
      );
  }
}

function formatDaysRemaining(daysRemaining: number | null): string {
  if (daysRemaining === null) return "—";
  if (daysRemaining < 0) {
    return `${Math.abs(daysRemaining)} d overdue`;
  }
  if (daysRemaining === 0) return "due today";
  return `${daysRemaining} d remaining`;
}

// ─── Empty state ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-trade-border-subtle bg-trade-bg-elevated p-8 text-center">
      <Archive
        size={28}
        className="mx-auto mb-3 text-trade-text-muted opacity-60"
      />
      <p className="text-[13px] font-medium text-trade-text-primary">
        No records nearing the retention cutoff
      </p>
      <p className="mt-1 text-[12px] text-trade-text-muted">
        Operations, licenses, EUCs, and other export-control records will appear
        here as they approach their 5-year retention floor.
      </p>
    </div>
  );
}
