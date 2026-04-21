"use client";

/**
 * ProgressStrip — the thin horizontal meter above the body.
 *
 * A single 4-segment bar (not_assessed / non_compliant / partial /
 * compliant) that adds up to 100%. Cleaner than 4 separate pills.
 *
 * No monospace, no tabular-nums — the counts are small enough to not
 * need alignment tricks.
 */

import type { WorkflowQueue } from "@/lib/provenance/workflow-queue";

interface ProgressStripProps {
  counts: WorkflowQueue["counts"];
}

export function ProgressStrip({ counts }: ProgressStripProps) {
  const total = counts.total || 1; // Guard against div-by-zero
  const pct = (n: number) => Math.round((n / total) * 100);

  const segments = [
    {
      key: "compliant",
      label: "Compliant",
      count: counts.compliant,
      color: "bg-emerald-500",
      dot: "bg-emerald-500",
    },
    {
      key: "partial",
      label: "Partial",
      count: counts.partial,
      color: "bg-amber-400",
      dot: "bg-amber-400",
    },
    {
      key: "non_compliant",
      label: "Non-compliant",
      count: counts.nonCompliant,
      color: "bg-red-500",
      dot: "bg-red-500",
    },
    {
      key: "not_assessed",
      label: "Not assessed",
      count: counts.notAssessed,
      color: "bg-[var(--surface-sunken)]",
      dot: "bg-[var(--text-tertiary)]",
    },
  ];

  return (
    <div>
      {/* Bar */}
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-[var(--surface-sunken)]">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.key}
              className={s.color}
              style={{ width: `${pct(s.count)}%` }}
              role="presentation"
              aria-label={`${s.label} ${s.count}`}
            />
          ) : null,
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} aria-hidden />
            <span>{s.label}</span>
            <span className="text-[var(--text-tertiary)]">{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default ProgressStrip;
