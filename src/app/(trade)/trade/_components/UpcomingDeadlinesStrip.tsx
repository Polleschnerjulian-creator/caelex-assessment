/**
 * Caelex Trade — Welcome dashboard Upcoming Deadlines strip.
 *
 * Horizontal scroll list of compliance deadlines within the next 30
 * days, sorted by date ASC. Sources:
 *   - EUCs expiring (validUntil ≤ 30d, status VALIDATED)
 *   - Re-export consents expiring (status APPROVED)
 *   - Sammelgenehmigungen expiring (status ACTIVE)
 *   - VSD deadlines (DISCOVERED / INVESTIGATING / DRAFTED with imminent
 *     authority clocks)
 *   - Supplement 2 due dates (DRAFT, dueDate ≤ 30d)
 *
 * Color coding:
 *   < 7 days  red    urgent
 *   < 14 days amber  warning
 *   < 30 days slate  upcoming
 *
 * Each chip is a Link to the entity detail page.
 *
 * Server component. The parent renders it with a pre-aggregated list
 * of `UpcomingDeadline` items.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import {
  CalendarClock,
  FileSignature,
  AlertOctagon,
  Layers,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type DeadlineKind =
  | "EUC_EXPIRY"
  | "REEXPORT_EXPIRY"
  | "SAMMELGENEHMIGUNG_EXPIRY"
  | "VSD_AUTHORITY_DEADLINE"
  | "SUPPLEMENT_2_DUE";

export interface UpcomingDeadline {
  id: string;
  kind: DeadlineKind;
  /** Pre-formatted display label, e.g. "BAFA C1 — Acme GmbH". */
  label: string;
  /** Secondary descriptor, e.g. "Re-export consent for JP". */
  description?: string;
  /** Date the deadline falls on. Used for sort + label. */
  dueAt: Date;
  /** Click-through path. */
  href: string;
}

interface UpcomingDeadlinesStripProps {
  deadlines: UpcomingDeadline[];
  /** Optional `now` override for deterministic rendering in tests. */
  now?: Date;
}

export function UpcomingDeadlinesStrip({
  deadlines,
  now,
}: UpcomingDeadlinesStripProps) {
  if (deadlines.length === 0) {
    return null;
  }
  const ref = now ?? new Date();
  // Pre-sort ASC by dueAt (closest first).
  const sorted = [...deadlines].sort(
    (a, b) => a.dueAt.getTime() - b.dueAt.getTime(),
  );

  return (
    <section className="mb-8" data-testid="upcoming-deadlines-strip">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          Upcoming deadlines
        </h2>
        <p className="text-[12px] text-trade-text-muted">
          Next 30 days · {sorted.length} item
          {sorted.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {sorted.map((deadline) => (
          <DeadlineChip key={deadline.id} deadline={deadline} now={ref} />
        ))}
      </div>
    </section>
  );
}

// ─── Chip primitive ─────────────────────────────────────────────────

function DeadlineChip({
  deadline,
  now,
}: {
  deadline: UpcomingDeadline;
  now: Date;
}) {
  const daysRemaining = Math.floor(
    (deadline.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const urgency = urgencyForDays(daysRemaining);
  const Icon = iconForKind(deadline.kind);

  const urgencyClasses = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    slate: "border-trade-border-subtle bg-trade-bg-panel",
  }[urgency];

  const labelClass = {
    red: "text-red-700",
    amber: "text-amber-700",
    slate: "text-trade-text-secondary",
  }[urgency];

  const iconClass = {
    red: "text-red-600",
    amber: "text-amber-600",
    slate: "text-trade-text-muted",
  }[urgency];

  return (
    <Link
      href={deadline.href}
      className={`group min-w-[220px] shrink-0 rounded-md border p-3 transition hover:border-trade-accent ${urgencyClasses}`}
    >
      <div className={`flex items-center gap-1.5 ${iconClass}`}>
        <Icon size={12} />
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {kindLabel(deadline.kind)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-snug text-trade-text-primary group-hover:text-trade-accent-strong">
        {deadline.label}
      </p>
      {deadline.description && (
        <p className="mt-0.5 line-clamp-1 text-[11px] text-trade-text-muted">
          {deadline.description}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className={`font-semibold tabular-nums ${labelClass}`}>
          {daysLabel(daysRemaining)}
        </span>
        <time
          dateTime={deadline.dueAt.toISOString()}
          className="font-mono text-trade-text-muted"
        >
          {deadline.dueAt.toLocaleDateString("en-GB")}
        </time>
      </div>
    </Link>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function urgencyForDays(days: number): "red" | "amber" | "slate" {
  if (days < 7) return "red";
  if (days < 14) return "amber";
  return "slate";
}

function iconForKind(kind: DeadlineKind): LucideIcon {
  switch (kind) {
    case "EUC_EXPIRY":
    case "REEXPORT_EXPIRY":
      return FileSignature;
    case "SAMMELGENEHMIGUNG_EXPIRY":
      return Layers;
    case "VSD_AUTHORITY_DEADLINE":
      return AlertOctagon;
    case "SUPPLEMENT_2_DUE":
      return ClipboardList;
    default:
      return CalendarClock;
  }
}

function kindLabel(kind: DeadlineKind): string {
  switch (kind) {
    case "EUC_EXPIRY":
      return "EUC expiry";
    case "REEXPORT_EXPIRY":
      return "Re-export expiry";
    case "SAMMELGENEHMIGUNG_EXPIRY":
      return "Sammelgenehmigung";
    case "VSD_AUTHORITY_DEADLINE":
      return "VSD deadline";
    case "SUPPLEMENT_2_DUE":
      return "Supplement 2";
  }
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

/**
 * Helper for the welcome page server component to assemble the
 * deadlines list from raw Prisma rows. Centralised here so the page
 * stays slim.
 */
export interface DeadlineSourceRows {
  eucs: Array<{
    id: string;
    validUntil: Date | null;
    formType: string;
    party: { legalName: string } | null;
  }>;
  reexports: Array<{
    id: string;
    validUntil: Date | null;
    newDestinationCountry: string;
    newEndUserName: string;
  }>;
  sammelgenehmigungen: Array<{
    id: string;
    validUntil: Date;
    title: string;
    bafaReference: string | null;
  }>;
  supplement2: Array<{
    id: string;
    dueDate: Date;
    reportingPeriod: string;
  }>;
  vsdDeadlines: Array<{
    id: string;
    title: string;
    authority: string;
    /** Already-resolved deadline date (e.g. discoveredAt + 60 days). */
    deadlineAt: Date;
  }>;
}

export function assembleDeadlines(
  rows: DeadlineSourceRows,
): UpcomingDeadline[] {
  const out: UpcomingDeadline[] = [];

  for (const euc of rows.eucs) {
    if (!euc.validUntil) continue;
    const partyName = euc.party?.legalName ?? "(unknown party)";
    out.push({
      id: `EUC:${euc.id}`,
      kind: "EUC_EXPIRY",
      label: `${euc.formType.replace(/_/g, " ")} — ${partyName}`,
      description: "End-Use Certificate expiring",
      dueAt: euc.validUntil,
      href: `/trade/euc/${euc.id}`,
    });
  }

  for (const rec of rows.reexports) {
    if (!rec.validUntil) continue;
    out.push({
      id: `REEXPORT:${rec.id}`,
      kind: "REEXPORT_EXPIRY",
      label: `${rec.newEndUserName} (${rec.newDestinationCountry})`,
      description: "Re-export consent expiring",
      dueAt: rec.validUntil,
      href: `/trade/reexport-consents/${rec.id}`,
    });
  }

  for (const sag of rows.sammelgenehmigungen) {
    out.push({
      id: `SAG:${sag.id}`,
      kind: "SAMMELGENEHMIGUNG_EXPIRY",
      label: sag.title,
      description: sag.bafaReference ?? "BAFA bulk authorization",
      dueAt: sag.validUntil,
      href: `/trade/sammelgenehmigungen/${sag.id}`,
    });
  }

  for (const sup of rows.supplement2) {
    out.push({
      id: `SUP2:${sup.id}`,
      kind: "SUPPLEMENT_2_DUE",
      label: `Supplement 2 — ${sup.reportingPeriod}`,
      description: "BIS Part 743 filing due",
      dueAt: sup.dueDate,
      href: `/trade/reports`,
    });
  }

  for (const vsd of rows.vsdDeadlines) {
    out.push({
      id: `VSD:${vsd.id}`,
      kind: "VSD_AUTHORITY_DEADLINE",
      label: vsd.title,
      description: `${vsd.authority} disclosure clock`,
      dueAt: vsd.deadlineAt,
      href: `/trade/vsd/${vsd.id}`,
    });
  }

  return out;
}
