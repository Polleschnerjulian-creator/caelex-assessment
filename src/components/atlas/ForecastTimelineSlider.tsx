"use client";

/**
 * ForecastTimelineSlider — quarter-granularity date picker above the
 * comparator. Range: today → 2032-Q1. Snap-points labelled by year.
 *
 * Accessibility: native `<input type="range">` with proper ARIA
 * labelling. Keyboard users get arrow-key quarter-stepping for free.
 */

import { useMemo } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface ForecastTimelineSliderProps {
  /** Currently selected date. Value is always the first day of the
   *  chosen quarter. */
  value: Date;
  /** Called with a Date pinned to the first day of the selected quarter. */
  onChange: (date: Date) => void;
}

/** Generate the list of quarter-start dates from today → 2032-Q1. */
function buildQuarterRange(): Date[] {
  const out: Date[] = [];
  const now = new Date();
  // Round today down to the start of its quarter.
  const startY = now.getFullYear();
  const startQ = Math.floor(now.getMonth() / 3);
  let year = startY;
  let q = startQ;
  while (year < 2032 || (year === 2032 && q === 0)) {
    out.push(new Date(Date.UTC(year, q * 3, 1)));
    q++;
    if (q === 4) {
      q = 0;
      year++;
    }
  }
  return out;
}

function toQuarterStart(date: Date): Date {
  const y = date.getFullYear();
  const q = Math.floor(date.getMonth() / 3);
  return new Date(Date.UTC(y, q * 3, 1));
}

function formatQuarterLabel(date: Date): string {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${q} ${y}`;
}

export default function ForecastTimelineSlider({
  value,
  onChange,
}: ForecastTimelineSliderProps) {
  const { t } = useLanguage();
  const range = useMemo(buildQuarterRange, []);
  const today = range[0]!;
  const valueQuarter = toQuarterStart(value);
  // Find the index corresponding to the current value.
  const index = Math.max(
    0,
    range.findIndex(
      (d) =>
        d.toISOString().slice(0, 10) ===
        valueQuarter.toISOString().slice(0, 10),
    ),
  );

  const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const i = parseInt(evt.target.value, 10);
    const next = range[i];
    if (next) onChange(next);
  };

  const handleReset = () => onChange(today);

  const isToday = index === 0;
  const selectedLabel = formatQuarterLabel(valueQuarter);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4">
      <div className="flex-shrink-0 text-[11px] font-medium tracking-wide uppercase text-gray-500">
        {t("atlas.forecast_target_date")}
      </div>
      <div className="flex-1 relative">
        <input
          type="range"
          min={0}
          max={range.length - 1}
          value={index}
          step={1}
          onChange={handleChange}
          aria-label={t("atlas.forecast_target_date")}
          className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
        {/* Year tick marks */}
        <div className="absolute inset-x-0 top-full mt-1 flex justify-between text-[9px] text-gray-400 pointer-events-none select-none">
          {Array.from({ length: 7 }, (_, i) => 2026 + i).map((year) => (
            <span key={year}>{year}</span>
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-900 tabular-nums min-w-[5ch] text-right">
          {isToday ? t("atlas.forecast_today") : selectedLabel}
        </span>
        {!isToday && (
          <button
            onClick={handleReset}
            className="text-[11px] tracking-wide uppercase text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Reset to today"
          >
            {t("atlas.forecast_reset")}
          </button>
        )}
      </div>
    </div>
  );
}
