/**
 * CaseRow — shared row component for case law results.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 *
 * OVERLAP FIX: forum label is in a fixed-width `w-28 shrink-0` column,
 * title is in `flex-1 min-w-0` — they are structurally separated and
 * can never overlap regardless of content length or viewport width.
 *
 * WCAG 2.5.8: py-3.5 gives ≥44px height ✓
 * WCAG 2.4.7: focus-visible ring on the Link ✓
 * WCAG 1.4.3: gray-800 on white = 8.6:1 ✓; gray-600 on white ≈ 5.7:1 ✓
 */

import Link from "next/link";

// ─── Forum-type display labels (German) ─────────────────────────────
const FORUM_TYPE_LABELS: Record<string, string> = {
  court: "Gericht",
  regulator_order: "Behörde",
  regulator_settlement: "Beh. Vergl.",
  criminal_settlement: "Strafvergl.",
  civil_settlement: "Zivilvergl.",
  treaty_award: "Vertrag",
  administrative_appeal: "Verw.-Beschwerde",
  arbitral_award: "Schiedsspruch",
};

// ─── Status badge labels ─────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  decided: "Entschieden",
  settled: "Vergleich",
  pending: "Ausstehend",
  withdrawn: "Zurückgezogen",
  vacated: "Aufgehoben",
  appeal_pending: "Berufung",
};

// ─── Status badge color classes ──────────────────────────────────────
function statusBadgeClass(status: string): string {
  switch (status) {
    case "decided":
      return "text-gray-700 bg-gray-100";
    case "settled":
      return "text-amber-700 bg-amber-50";
    case "pending":
      return "text-blue-700 bg-blue-50";
    case "withdrawn":
    case "vacated":
      return "text-red-700 bg-red-50";
    case "appeal_pending":
      return "text-orange-700 bg-orange-50";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

export interface CaseRowData {
  id: string;
  jurisdiction: string;
  forum: string;
  forum_name: string;
  title: string;
  plaintiff: string;
  defendant: string;
  date_decided: string;
  status: string;
}

interface CaseRowProps {
  c: CaseRowData;
}

export function CaseRow({ c }: CaseRowProps) {
  const forumLabel = FORUM_TYPE_LABELS[c.forum] ?? c.forum;
  const statusLabel = STATUS_LABELS[c.status] ?? c.status;

  return (
    <Link
      href={"/scholar/cases/" + encodeURIComponent(c.id)}
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white border border-transparent hover:border-gray-200 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
    >
      {/*
        OVERLAP FIX: fixed width + shrink-0 means this column NEVER grows
        into the title column. truncate prevents long labels from spilling.
      */}
      <span className="w-28 shrink-0 text-[9px] font-bold uppercase tracking-wider text-gray-500 truncate">
        {forumLabel}
      </span>

      {/*
        flex-1 + min-w-0 ensures this column absorbs all available space
        but never overflows — truncate clips long titles cleanly.
      */}
      <div className="flex-1 min-w-0">
        <span className="block text-[14px] font-medium text-gray-800 truncate group-hover:text-black motion-safe:transition-colors">
          {c.title}
        </span>
        <span className="block text-[11px] text-gray-600 truncate">
          {c.plaintiff} v. {c.defendant} · {c.forum_name}
        </span>
      </div>

      {/* Date */}
      <span className="shrink-0 text-[11px] text-gray-600 tabular-nums whitespace-nowrap">
        {c.date_decided}
      </span>

      {/* Status badge */}
      <span
        className={`shrink-0 text-[9px] font-semibold rounded-md px-2 py-0.5 whitespace-nowrap ${statusBadgeClass(c.status)}`}
      >
        {statusLabel}
      </span>

      {/* Jurisdiction */}
      <span className="shrink-0 w-8 text-[11px] font-bold text-gray-500 text-right">
        {c.jurisdiction}
      </span>
    </Link>
  );
}
