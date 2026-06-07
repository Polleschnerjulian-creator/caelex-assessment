/**
 * RelevanceGlyph — monochrome relevance indicator.
 *
 * Replaces the red/amber relevance dots in SourceRow with a 4-segment
 * filled-bar glyph (▮▮▮▯). Darkness conveys strength purely in grayscale —
 * no hue is used, so the signal survives both color-blindness and a
 * strictly monochrome canvas.
 *
 * Presentational only: no hooks, no data imports, no interactivity →
 * server component (NO "use client").
 *
 * WCAG 1.4.11: filled (gray-900) and empty (gray-300) bars are both ≥3:1
 *   against the white/#F7F8FA canvas, and meaning is carried by the
 *   sr-only label — the bars are aria-hidden ✓
 * WCAG 1.4.1: strength is encoded by fill-count + sr-only text, not by
 *   color alone ✓
 */

import { DEFAULT_SCHOLAR_LOCALE, t, type ScholarLocale } from "../_i18n/core";
import { SOURCE } from "../_i18n/source";

// ─── Level → filled-bar count (0–4) ──────────────────────────────────
// Darkness/length conveys strength. Normalised to lowercase before lookup.
const RELEVANCE_BARS: Record<string, number> = {
  fundamental: 4,
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

// ─── Level → SOURCE-namespace screen-reader-word key ─────────────────
const RELEVANCE_LABEL_KEY: Record<string, keyof (typeof SOURCE)["en"]> = {
  fundamental: "relevanceFundamental",
  critical: "relevanceCritical",
  high: "relevanceHigh",
  medium: "relevanceMedium",
  low: "relevanceLow",
};

const TOTAL_BARS = 4;

interface RelevanceGlyphProps {
  level: string;
  className?: string;
  locale?: ScholarLocale;
}

export function RelevanceGlyph({
  level,
  className,
  locale = DEFAULT_SCHOLAR_LOCALE,
}: RelevanceGlyphProps) {
  const key = level.toLowerCase();
  const filledCount = RELEVANCE_BARS[key] ?? 0;
  const labelKey = RELEVANCE_LABEL_KEY[key];
  const humanLevel = labelKey
    ? t(locale, SOURCE, labelKey)
    : t(locale, SOURCE, "relevanceUnknown");

  return (
    <span
      className={
        "inline-flex items-center gap-0.5 flex-shrink-0" +
        (className ? " " + className : "")
      }
    >
      {/* Decorative bars — WCAG 1.4.11: meaning carried by sr-only text */}
      {Array.from({ length: TOTAL_BARS }, (_, i) => (
        <span
          key={i}
          className={
            "h-3 w-1 rounded-full " +
            (i < filledCount ? "bg-gray-900" : "bg-gray-300")
          }
          aria-hidden={true}
        />
      ))}
      <span className="sr-only">
        {t(locale, SOURCE, "relevancePrefix")} {humanLevel}
      </span>
    </span>
  );
}
