"use client";

/**
 * ForecastTimelineRibbon — horizontal visualisation of upcoming
 * regulatory events for the currently-selected jurisdictions.
 *
 * Layout: one row per jurisdiction; dots placed along the time axis
 * at their effective dates. Hovering a dot reveals the event label +
 * confidence + summary. Clicking jumps the slider to that date.
 *
 * Design choice: pure visual overlay — the ribbon doesn't own state,
 * it only reflects `jurisdictions` + emits `onEventClick` upward.
 */

import { useMemo } from "react";
import type { ForecastEvent } from "@/lib/atlas/forecast-engine";
import { getJurisdictionTimeline } from "@/lib/atlas/forecast-engine";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getJurisdictionNames } from "@/app/(atlas)/atlas/i18n-labels";

interface ForecastTimelineRibbonProps {
  jurisdictions: string[]; // ISO codes (from SpaceLawCountryCode)
  /** Called when the user clicks a dot, with the event's effectiveDate
   *  as a Date object (pinned to quarter start). */
  onEventClick?: (date: Date) => void;
}

const TIMELINE_START_YEAR = 2026;
const TIMELINE_END_YEAR = 2032;

const confidenceColor: Record<ForecastEvent["confidence"], string> = {
  high: "bg-emerald-500 hover:bg-emerald-600",
  medium: "bg-amber-500 hover:bg-amber-600",
  low: "bg-gray-400 hover:bg-gray-500",
};

/** Compute the horizontal position (0-1) of an ISO date within the
 *  timeline window. Clamps to [0, 1]. */
function positionOf(iso: string): number {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return 0;
  const totalYears = TIMELINE_END_YEAR - TIMELINE_START_YEAR;
  const decimalYear = y + (m - 1) / 12 + (d - 1) / 365.25 - TIMELINE_START_YEAR;
  return Math.max(0, Math.min(1, decimalYear / totalYears));
}

function quarterStart(iso: string): Date {
  const [y, m] = iso.split("-").map((n) => parseInt(n, 10));
  const q = Math.floor(((m ?? 1) - 1) / 3);
  return new Date(Date.UTC(y!, q * 3, 1));
}

export default function ForecastTimelineRibbon({
  jurisdictions,
  onEventClick,
}: ForecastTimelineRibbonProps) {
  const { t } = useLanguage();
  const jurisdictionNames = useMemo(() => getJurisdictionNames(t), [t]);

  const perJurisdiction = useMemo(
    () =>
      jurisdictions.map((code) => ({
        code,
        events: getJurisdictionTimeline(code),
      })),
    [jurisdictions],
  );

  const hasAnyEvents = perJurisdiction.some((r) => r.events.length > 0);

  if (!hasAnyEvents) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-400">
        {t("atlas.forecast_ribbon_empty_state")}
      </div>
    );
  }

  const years = Array.from(
    { length: TIMELINE_END_YEAR - TIMELINE_START_YEAR + 1 },
    (_, i) => TIMELINE_START_YEAR + i,
  );

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-medium tracking-wide uppercase text-gray-500">
          {t("atlas.forecast_ribbon_title")}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("atlas.forecast_confidence_high")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t("atlas.forecast_confidence_medium")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            {t("atlas.forecast_confidence_low")}
          </span>
        </div>
      </div>
      {/* Axis */}
      <div className="relative h-4 ml-16 mb-2 border-b border-gray-100">
        {years.map((year, i) => (
          <span
            key={year}
            className="absolute top-0 text-[9px] text-gray-400 -translate-x-1/2"
            style={{ left: `${(i / (years.length - 1)) * 100}%` }}
          >
            {year}
          </span>
        ))}
      </div>
      {/* Per-jurisdiction rows */}
      <div className="space-y-2">
        {perJurisdiction.map(({ code, events }) => (
          <div key={code} className="flex items-center gap-3">
            <div className="w-12 flex-shrink-0 text-[11px] font-medium text-gray-700 tabular-nums">
              {code}
            </div>
            <div className="flex-1 relative h-5 bg-gray-50 rounded">
              {events.map((event) => {
                const left = positionOf(event.effectiveDate);
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() =>
                      onEventClick?.(quarterStart(event.effectiveDate))
                    }
                    className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${
                      confidenceColor[event.confidence]
                    } transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-gray-900/20`}
                    style={{ left: `calc(${left * 100}% - 5px)` }}
                    title={`${event.label} — ${event.effectiveDate} — ${event.summary}`}
                    aria-label={`${event.label} effective ${event.effectiveDate}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Avoid unused variable warning if we don't render jurisdiction names */}
      <span hidden aria-hidden="true">
        {jurisdictionNames[jurisdictions[0] ?? ""] ?? ""}
      </span>
    </div>
  );
}
