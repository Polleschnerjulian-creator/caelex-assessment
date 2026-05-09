"use client";

/**
 * ForecastTimelineSlider — quarter-granularity date picker above the
 * comparator. Range: today → 2032-Q1. Snap-points labelled by year.
 *
 * Accessibility: native `<input type="range">` with proper ARIA
 * labelling. Keyboard users get arrow-key quarter-stepping for free.
 */

import { useEffect, useMemo, useState } from "react";
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
  /* BUG-A7: was `useMemo(buildQuarterRange, [])` — `range[0]` then
     pointed at the QUARTER-START of the day the component mounted.
     A long-lived dashboard kept open across Mar 31 → Apr 1 would
     never update its "today" label. Now we anchor on a `nowKey`
     state that ticks when the wall-clock crosses a quarter boundary
     (cheap polled check every 30 min — quarters are 90+ days, so a
     half-hour interval is fine and doesn't spam re-renders). */
  const [quarterAnchor, setQuarterAnchor] = useState(() =>
    toQuarterStart(new Date()).toISOString().slice(0, 10),
  );
  useEffect(() => {
    const tick = () => {
      const next = toQuarterStart(new Date()).toISOString().slice(0, 10);
      setQuarterAnchor((prev) => (prev === next ? prev : next));
    };
    const id = window.setInterval(tick, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const range = useMemo(
    buildQuarterRange,
    [quarterAnchor], // recompute when wall-clock has crossed a quarter
  );
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

  /* BUG-B4: most users never discover the time-travel mechanic
     because the slider parks at index 0 with the "Today" label and
     no visual hint that it moves. One-shot tutorial bubble (localStorage
     flag `atlas-comparator-tutorial-seen`) hovers next to the slider
     on first visit; auto-dismisses on first interaction or click. */
  const TUTORIAL_FLAG = "atlas-comparator-tutorial-seen";
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(TUTORIAL_FLAG) !== "yes") {
        setShowTutorial(true);
      }
    } catch {
      /* private browsing — skip the bubble. */
    }
  }, []);
  const dismissTutorial = () => {
    setShowTutorial(false);
    try {
      window.localStorage.setItem(TUTORIAL_FLAG, "yes");
    } catch {
      /* see above. */
    }
  };
  /* Auto-dismiss when the user actually interacts with the slider —
     they've discovered the mechanic, no need to keep the hint around. */
  const handleChangeWithTutorialDismiss = (
    evt: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (showTutorial) dismissTutorial();
    handleChange(evt);
  };

  // Progress percentage (0–100) for the filled portion behind the
  // thumb. We paint the filled range as a gradient stop so the track
  // renders like an Apple / iOS slider — dark-fill left of the thumb,
  // translucent track to the right.
  const progressPct = ((index / Math.max(1, range.length - 1)) * 100).toFixed(
    2,
  );
  /* BUG-B10: was hard-coded `#111827` (gray-900 fill) and
     `rgba(229,231,235,0.7)` (gray-200 track) — both light-mode
     tokens. In dark mode the dark fill blended with the dark
     background, the slider became "dark fill on slightly-darker
     track" — invisible. Now uses CSS vars `--atlas-text-primary`
     and `--atlas-border` which Atlas defines per-theme. */
  const trackStyle: React.CSSProperties = {
    background: `linear-gradient(to right, var(--atlas-text-primary) 0%, var(--atlas-text-primary) ${progressPct}%, var(--atlas-border) ${progressPct}%, var(--atlas-border) 100%)`,
  };

  return (
    <div className="w-full flex items-center gap-3 relative">
      {/* BUG-B4: tutorial bubble */}
      {showTutorial && (
        <div
          role="tooltip"
          className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10.5px] font-medium shadow-md whitespace-nowrap animate-pulse"
        >
          <span aria-hidden>↓</span>
          Drag to see future regulatory changes
          <button
            type="button"
            onClick={dismissTutorial}
            aria-label="Dismiss hint"
            className="ml-1 opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}
      <span className="flex-shrink-0 text-[10px] font-semibold tracking-widest uppercase text-[var(--atlas-text-muted)]">
        {t("atlas.forecast_target_date")}
      </span>
      <div className="flex-1 min-w-[140px] px-1">
        <input
          type="range"
          min={0}
          max={range.length - 1}
          value={index}
          step={1}
          onChange={handleChangeWithTutorialDismiss}
          aria-label={t("atlas.forecast_target_date")}
          style={trackStyle}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
        {/* Year tick row — normal flow, directly below the bar. */}
        <div className="mt-1.5 flex justify-between text-[8px] tabular-nums text-[var(--atlas-text-faint)] select-none">
          {Array.from({ length: 7 }, (_, i) => 2026 + i).map((year) => (
            <span key={year}>{year}</span>
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">
        <span
          className={`text-[12px] font-medium tabular-nums min-w-[4ch] text-right ${isToday ? "text-[var(--atlas-text-muted)]" : "text-[var(--atlas-text-primary)]"}`}
        >
          {isToday ? t("atlas.forecast_today") : selectedLabel}
        </span>
        {!isToday && (
          <button
            onClick={handleReset}
            className="text-[10px] tracking-wide uppercase text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--atlas-bg-inset)]/70"
            aria-label="Reset to today"
          >
            {t("atlas.forecast_reset")}
          </button>
        )}
      </div>
    </div>
  );
}
