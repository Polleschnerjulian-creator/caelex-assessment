"use client";

/**
 * ForecastBadge — per-cell indicator shown next to a comparator value
 * when a future-dated regulatory change affects that row's concept at
 * or before the user-selected target date.
 *
 * Visual: small uppercase label with a coloured leading dot encoding
 * the confidence. Hover reveals the event label + summary.
 *
 * Design choice: overlay, not replace. The existing cell value stays
 * authoritative for "today"; the badge only adds the upcoming-change
 * context. This keeps the comparator legible for users who never
 * move the slider.
 */

import type { ForecastEvent } from "@/lib/atlas/forecast-engine";

interface ForecastBadgeProps {
  event: ForecastEvent;
}

const confidenceDot: Record<ForecastEvent["confidence"], string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-gray-400",
};

const confidenceLabel: Record<ForecastEvent["confidence"], string> = {
  high: "HIGH CONF.",
  medium: "MEDIUM CONF.",
  low: "LOW CONF.",
};

/** Short ISO-date → "Q2 '27" style label for compact chips. */
function formatQuarterYear(iso: string): string {
  const [y, m] = iso.split("-");
  const month = parseInt(m!, 10);
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} '${y!.slice(2)}`;
}

export default function ForecastBadge({ event }: ForecastBadgeProps) {
  const tooltip = `${event.label} — ${event.effectiveDate} (${confidenceLabel[event.confidence]}) — ${event.summary}`;
  return (
    <span
      className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wider uppercase bg-gray-50 border border-gray-200 text-gray-700 select-none cursor-help align-middle"
      title={tooltip}
      aria-label={tooltip}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${confidenceDot[event.confidence]}`}
        aria-hidden="true"
      />
      <span>→ {formatQuarterYear(event.effectiveDate)}</span>
    </span>
  );
}
