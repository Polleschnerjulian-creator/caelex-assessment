"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Link as LinkIcon, Check } from "lucide-react";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import CountrySelector from "@/components/atlas/CountrySelector";
import ComparisonTable from "@/components/atlas/ComparisonTable";
import ComparatorExport from "@/components/atlas/ComparatorExport";
import ForecastTimelineSlider from "@/components/atlas/ForecastTimelineSlider";
import CrossBorderQuickRef from "@/components/atlas/CrossBorderQuickRef";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Shared Apple-like glass style used for the sticky control bar.
 * Matches the Generate2 document generator's inline-glass aesthetic:
 *   rgba(255,255,255,0.55) + backdrop-blur(24px) saturate(1.4) +
 *   0.45 inset highlight + layered 0_8px_40px shadow.
 * Surface feels like frosted sapphire over the content below.
 */
/**
 * Sticky controls bar styling. Was hard-coded white-72% which is
 * fine on the light Atlas page but invisible on the dark page —
 * gray text on near-white panel on a near-black bg becomes a
 * gray-on-gray smudge in dark mode. We switch to the Atlas-theme
 * tokens (`--atlas-bg-surface` is white-ish in light, navy in dark)
 * so the panel reads correctly in both themes.
 */
const stickyGlass: React.CSSProperties = {
  background: "var(--atlas-bg-surface)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid var(--atlas-border)",
  borderRadius: 16,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
};

const DEFAULT_COUNTRIES: SpaceLawCountryCode[] = ["FR", "DE", "UK"];

const VALID_DIMENSIONS = new Set([
  "all",
  "authorization",
  "liability",
  "debris",
  "registration",
  "timeline",
  "eu_readiness",
]);

const VALID_COUNTRIES = new Set<SpaceLawCountryCode>([
  "FR",
  "DE",
  "UK",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "NO",
  "SE",
  "FI",
  "DK",
  "AT",
  "CH",
  "PT",
  "IE",
  "GR",
  "CZ",
  "PL",
]);

function parseStateFromQuery(params: URLSearchParams): {
  countries: SpaceLawCountryCode[] | null;
  dimension: string | null;
  date: Date | null;
} {
  const j = params.get("j");
  let countries: SpaceLawCountryCode[] | null = null;
  if (j) {
    const parts = j
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is SpaceLawCountryCode =>
        VALID_COUNTRIES.has(s as SpaceLawCountryCode),
      );
    if (parts.length > 0) countries = parts.slice(0, 8);
  }
  const dim = params.get("dim");
  const dimension = dim && VALID_DIMENSIONS.has(dim) ? dim : null;
  const dateRaw = params.get("t");
  let date: Date | null = null;
  if (dateRaw) {
    const parsed = new Date(dateRaw);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  return { countries, dimension, date };
}

function buildShareableUrl(
  countries: SpaceLawCountryCode[],
  dimension: string,
  date: Date,
): string {
  const params = new URLSearchParams();
  if (countries.length > 0) params.set("j", countries.join(","));
  if (dimension !== "all") params.set("dim", dimension);
  // Only include the date if it's >24h away from "now" — saves the
  // shareable URL from carrying an irrelevant timestamp for the common
  // "current state" comparison.
  const drift = Math.abs(date.getTime() - Date.now());
  if (drift > 24 * 60 * 60 * 1000) {
    params.set("t", date.toISOString().slice(0, 10));
  }
  if (typeof window === "undefined") {
    return `/atlas/comparator${params.size > 0 ? `?${params.toString()}` : ""}`;
  }
  return `${window.location.origin}/atlas/comparator${params.size > 0 ? `?${params.toString()}` : ""}`;
}

function ComparatorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lazy initial-state from URL params. This is a one-shot read on
  // mount — afterwards the page is the source of truth and we sync
  // back to the URL via router.replace on change.
  const initial = useMemo(
    () => parseStateFromQuery(new URLSearchParams(searchParams.toString())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [selected, setSelected] = useState<SpaceLawCountryCode[]>(
    initial.countries ?? DEFAULT_COUNTRIES,
  );
  const [dimension, setDimension] = useState<string>(
    initial.dimension ?? "all",
  );
  // Forecast target date — defaults to today (or to the URL-supplied
  // date when present). Forecast badges only render when the slider
  // moves into the future, so the default-today path shows no change
  // from the pre-URL-state experience.
  const [targetDate, setTargetDate] = useState<Date>(
    () => initial.date ?? new Date(),
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const { t } = useLanguage();

  // Push state changes back into the URL — keeps reload + back-button
  // returning to the same view. router.replace (not push) so stepping
  // back doesn't fight the user's filter changes.
  useEffect(() => {
    const params = new URLSearchParams();
    if (selected.length > 0) params.set("j", selected.join(","));
    if (dimension !== "all") params.set("dim", dimension);
    const drift = Math.abs(targetDate.getTime() - Date.now());
    if (drift > 24 * 60 * 60 * 1000) {
      params.set("t", targetDate.toISOString().slice(0, 10));
    }
    const qs = params.toString();
    router.replace(`/atlas/comparator${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [selected, dimension, targetDate, router]);

  const handleCopyLink = useCallback(async () => {
    const url = buildShareableUrl(selected, dimension, targetDate);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      // Clipboard can fail on iOS without a user gesture; silent.
    }
  }, [selected, dimension, targetDate]);

  // ─── Dimension tabs (translated) ───
  const dimensions = useMemo(
    () => [
      { key: "all", label: t("atlas.all_dimensions") },
      { key: "authorization", label: t("atlas.authorization_licensing") },
      { key: "liability", label: t("atlas.liability_insurance") },
      { key: "debris", label: t("atlas.debris_mitigation") },
      { key: "registration", label: t("atlas.registration") },
      { key: "timeline", label: t("atlas.timeline_costs") },
      { key: "eu_readiness", label: t("atlas.eu_space_act_readiness") },
    ],
    [t],
  );

  const handleExport = useCallback(() => {
    // Defer to the next animation frame so any pending React commits
    // (URL-state sync via router.replace, hover state changes, etc.)
    // land BEFORE the browser snapshots the page for printing. Safari
    // sometimes calls print() synchronously without a microtask flush
    // — leading to a stale snapshot. Two RAFs guarantee a paint.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  }, []);

  return (
    <>
      <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3 print:hidden">
        {/* ─── Header ─── */}
        <header className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
              {t("atlas.comparator")}
            </h1>
            <span className="text-[10px]  text-[var(--atlas-text-muted)] tracking-wide">
              {t("atlas.jurisdictions_count", { count: 19 })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] text-[var(--atlas-text-muted)] ">
              <span>
                {selected.length} {t("atlas.selected")}
              </span>
              <span className="text-[var(--atlas-text-faint)]">|</span>
              <span>
                {dimensions.find((d) => d.key === dimension)?.label ||
                  t("atlas.all_dimensions")}
              </span>
            </div>
            {selected.length > 0 && (
              <>
                <button
                  onClick={handleCopyLink}
                  className="
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    text-[11px] font-medium text-[var(--atlas-text-muted)]
                    hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-inset)]
                    transition-colors duration-150
                  "
                  aria-label={t("atlas.share_comparison_link")}
                >
                  {linkCopied ? (
                    <Check
                      className="h-3.5 w-3.5 text-emerald-600"
                      aria-hidden="true"
                      strokeWidth={2}
                    />
                  ) : (
                    <LinkIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                      strokeWidth={1.5}
                    />
                  )}
                  <span>
                    {linkCopied
                      ? t("atlas.link_copied")
                      : t("atlas.share_comparison")}
                  </span>
                </button>
                <button
                  onClick={handleExport}
                  className="
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    text-[11px] font-medium text-[var(--atlas-text-muted)]
                    hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-inset)]
                    transition-colors duration-150
                  "
                >
                  <Download
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                    strokeWidth={1.5}
                  />
                  <span>{t("atlas.export_pdf_btn")}</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* ─── Sticky Floating Controls — Apple-like glass panel ─── */}
        {/*
          Consolidates the two most-used interactions (pick jurisdictions,
          move the forecast date) into a single frosted panel that stays
          pinned while the table scrolls. The `sticky top-3 z-30` keeps
          it reachable without blocking; the glass background (see
          `stickyGlass`) reads through content underneath so the table
          is never fully occluded.
        */}
        <div
          style={stickyGlass}
          className="sticky top-3 z-30 px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5"
        >
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <span className="text-[10px] font-semibold tracking-widest text-[var(--atlas-text-secondary)] uppercase flex-shrink-0">
              {t("atlas.jurisdictions")}
            </span>
            <div className="flex-1 min-w-0">
              <CountrySelector selected={selected} onChange={setSelected} />
            </div>
          </div>
          <div
            className="hidden lg:block h-8 w-px bg-[var(--atlas-border)]"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <ForecastTimelineSlider
              value={targetDate}
              onChange={setTargetDate}
            />
          </div>
        </div>

        {/* ─── Dimension Tabs ─── */}
        <div
          role="tablist"
          className="flex items-center gap-4 overflow-x-auto pb-0.5 -mx-1 px-1 border-b border-[var(--atlas-border)]"
        >
          {dimensions.map((dim) => (
            <button
              key={dim.key}
              role="tab"
              aria-selected={dimension === dim.key}
              onClick={() => setDimension(dim.key)}
              className={`
                flex-shrink-0 pb-2 text-[11px] font-medium
                transition-all duration-150 border-b-2 -mb-[1px]
                ${
                  dimension === dim.key
                    ? "border-gray-900 text-[var(--atlas-text-primary)]"
                    : "border-transparent text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)]"
                }
              `}
            >
              {dim.label}
            </button>
          ))}
        </div>

        {/* ─── Comparison Table ─── */}
        <div className="flex-1 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
          <ComparisonTable
            countries={selected}
            dimension={dimension}
            targetDate={targetDate}
          />
        </div>

        {/* ─── Extended-jurisdictions quick reference ───
            The deep ComparisonTable above only renders jurisdictions
            with full JurisdictionLaw entries (insurance, debris,
            timeline thresholds). The 11 strategic non-EU/non-UK
            jurisdictions added in 2026-04 don't have those — they're
            catalogue-only. Quick-ref surfaces them as cards with
            source counts, key authorities, and top compliance areas
            so cross-border lawyers can navigate to a JD's full
            Atlas page in one click. */}
        <CrossBorderQuickRef />
      </div>

      {/* ─── Print-only export view ─── */}
      <ComparatorExport countries={selected} dimension={dimension} />
    </>
  );
}

export default function ComparatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--atlas-bg-page)] p-4 animate-pulse">
          <div className="h-6 w-32 bg-[var(--atlas-bg-inset)] rounded mb-3" />
          <div className="h-16 bg-[var(--atlas-bg-inset)] rounded-xl" />
        </div>
      }
    >
      <ComparatorPageInner />
    </Suspense>
  );
}
