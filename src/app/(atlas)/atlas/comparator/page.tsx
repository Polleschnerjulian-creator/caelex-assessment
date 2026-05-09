"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Download,
  FileText,
  Link as LinkIcon,
  Check,
  Sparkles,
} from "lucide-react";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import CountrySelector from "@/components/atlas/CountrySelector";
import ComparisonTable from "@/components/atlas/ComparisonTable";
/* PERF-C3: ComparatorExport is ~700 LOC of mostly-dormant DOM
   (display: none on screen, only used during window.print()). Static
   import shipped it in the comparator client bundle on every load.
   Lazy via next/dynamic with ssr:false + null loading shaves ~25-40 KB
   gzipped from initial JS — the screen never shows this until the
   user invokes print, by which point the latency is dwarfed by the
   browser's print-dialog overhead. */
const ComparatorExport = dynamic(
  () => import("@/components/atlas/ComparatorExport"),
  { ssr: false, loading: () => null },
);
import ForecastTimelineSlider from "@/components/atlas/ForecastTimelineSlider";
import CrossBorderQuickRef from "@/components/atlas/CrossBorderQuickRef";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  buildClientBriefing,
  buildComparisonMarkdown,
  type ComparatorDimension,
} from "@/lib/atlas/comparator-export-md";
import { exportDraftAsWord } from "@/lib/atlas/draft-export";
import {
  getEffectiveEventsAt,
  type ForecastEvent,
} from "@/lib/atlas/forecast-engine";
import { EU_MEMBER_STATES_SET } from "@/lib/space-law-types";
/* PERF/test-gap: extracted parsing + share-URL building to a pure
   testable module. See `comparator-state.test.ts` for the locked
   contracts. */
import {
  DEFAULT_COUNTRIES,
  parseStateFromQuery,
  buildShareableUrl,
} from "@/lib/atlas/comparator-state";
import {
  countDifferingRowsByDimension,
  type ComparatorDimensionKey,
} from "@/lib/atlas/comparator-diff-counts";
import { CountryPalette } from "./CountryPalette";
import { SavedSetsMenu } from "./SavedSetsMenu";
import { CellSourcePanel } from "./CellSourcePanel";
import type { JurisdictionLaw } from "@/lib/space-law-types";

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

/* PERF/test-gap fix: VALID_COUNTRIES, VALID_DIMENSIONS,
   DEFAULT_COUNTRIES, parseStateFromQuery, and buildShareableUrl all
   moved to `src/lib/atlas/comparator-state.ts` for testability +
   reuse. The module is the source of truth; this file just consumes. */

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
  /* D1 (BOLD): "Show only differences" toggle. Hides rows where every
     selected jurisdiction has the same value, plus rows whose RowDef
     opted out of difference-highlighting. URL-synced via `?diff=1`
     so the filtered view is shareable. */
  const [differencesOnly, setDifferencesOnly] = useState(
    () => searchParams.get("diff") === "1",
  );
  const { t, language } = useLanguage();

  /* BUG-B1: dimension switch resets table scrollTop. Marie scrolled
     into row 8 of `liability`, switched to `debris`, lost her place.
     Persist window.scrollY per dimension in a ref-map and restore on
     switch. Window-scroll (not table-internal) is the right scope:
     the table itself isn't an overflow-container, the page is. */
  const scrollByDimensionRef = useRef<Record<string, number>>({});
  const handleDimensionChange = useCallback(
    (next: string) => {
      if (typeof window !== "undefined") {
        scrollByDimensionRef.current[dimension] = window.scrollY;
      }
      setDimension(next);
    },
    [dimension],
  );
  /* Restore on dimension change. instant-jump (not smooth) so the
     view feels like "remembering" rather than "animating". */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = scrollByDimensionRef.current[dimension];
    if (saved === undefined) return;
    window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior });
  }, [dimension]);

  /* BUG-B5: aggregate forecast ribbon. The user has the slider in the
     future and sees scattered per-cell badges, but no summary of "N
     changes between today and your target date". Computing here at
     the page level makes the count visible alongside the slider —
     users learn that the time-travel feature has teeth before they
     scan the table for badges. We filter to events that touch the
     selected jurisdictions (or are EU/INT meta-tagged) so the count
     reflects what's relevant to the current view, not the whole feed. */
  const forecastEventsAhead = useMemo<ForecastEvent[]>(() => {
    const drift = targetDate.getTime() - Date.now();
    if (drift <= 24 * 60 * 60 * 1000) return [];
    const all = getEffectiveEventsAt(targetDate);
    if (selected.length === 0) return all;
    const sel = new Set<string>(selected);
    return all.filter((e) =>
      e.jurisdictions.some(
        (j) =>
          sel.has(j) ||
          j === "INT" ||
          (j === "EU" && selected.some((c) => EU_MEMBER_STATES_SET.has(c))),
      ),
    );
  }, [selected, targetDate]);

  /* BUG-A5: ref-guard the first-render URL-sync so that a user who
     lands on the bare `/atlas/comparator` doesn't immediately see
     `?j=FR,DE,UK` slammed into the address bar before they've done
     anything. The URL becomes dirty only AFTER the first user
     interaction changes state.
     BUG-A6: also dedupe — only push to router when the computed
     query-string actually differs from the current URL. Without
     this, a parent re-render that bumps `targetDate`'s reference
     identity (Date is non-value-equal) re-fires router.replace
     even when the canonical URL is unchanged. */
  const initialSyncRef = useRef(true);
  const lastSyncedQsRef = useRef<string>(searchParams.toString());
  useEffect(() => {
    const params = new URLSearchParams();
    if (selected.length > 0) params.set("j", selected.join(","));
    if (dimension !== "all") params.set("dim", dimension);
    const drift = Math.abs(targetDate.getTime() - Date.now());
    if (drift > 24 * 60 * 60 * 1000) {
      params.set("t", targetDate.toISOString().slice(0, 10));
    }
    /* D1: encode the differences-only toggle. Omitted when off
       (default) to keep the URL short for the common case. */
    if (differencesOnly) params.set("diff", "1");
    const qs = params.toString();
    if (initialSyncRef.current) {
      initialSyncRef.current = false;
      lastSyncedQsRef.current = qs;
      return;
    }
    if (qs === lastSyncedQsRef.current) return;
    lastSyncedQsRef.current = qs;
    router.replace(`/atlas/comparator${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [selected, dimension, targetDate, differencesOnly, router, searchParams]);

  /* BUG-B11: a fast double-click started two parallel setTimeouts.
     The second one's `setLinkCopied(false)` fired AFTER the first's
     window had already lapsed and we'd re-set true again — net
     effect: the icon could flip back to its idle state mid-flash and
     stay there until the next click. Now a ref tracks the active
     timer so each new click clears the previous one. */
  const linkCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (linkCopyTimerRef.current) clearTimeout(linkCopyTimerRef.current);
    },
    [],
  );
  const handleCopyLink = useCallback(async () => {
    const url = buildShareableUrl(
      selected,
      dimension,
      targetDate,
      {
        origin:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
      Date.now(),
      differencesOnly,
    );
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      if (linkCopyTimerRef.current) clearTimeout(linkCopyTimerRef.current);
      linkCopyTimerRef.current = setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      // Clipboard can fail on iOS without a user gesture; silent.
    }
  }, [selected, dimension, targetDate, differencesOnly]);

  /* D7: dimension count badges. For each per-dimension tab, render a
     subscript "(N)" showing how many rows DIFFER across the selected
     jurisdictions. Helps the user spot where the variance is before
     clicking through. Cheap per-render so no memo. */
  const diffCounts = useMemo(
    () => countDifferingRowsByDimension(selected),
    [selected],
  );

  /* D5: derive the current canonical query-string so SavedSetsMenu
     can capture it. Re-uses the same encoding as the URL-sync
     effect — kept as a single source of truth via a small builder
     here to avoid drift. */
  const currentQs = useMemo(() => {
    const params = new URLSearchParams();
    if (selected.length > 0) params.set("j", selected.join(","));
    if (dimension !== "all") params.set("dim", dimension);
    const drift = Math.abs(targetDate.getTime() - Date.now());
    if (drift > 24 * 60 * 60 * 1000) {
      params.set("t", targetDate.toISOString().slice(0, 10));
    }
    if (differencesOnly) params.set("diff", "1");
    return params.toString();
  }, [selected, dimension, targetDate, differencesOnly]);

  /* D4: cell-source-panel state — opens when the user clicks a
     comparison cell. Captures the row label, value, and jurisdiction
     so the panel can render primary-source context without re-deriving. */
  const [sourceCell, setSourceCell] = useState<{
    rowLabel: string;
    value: string;
    jurisdiction: JurisdictionLaw;
  } | null>(null);

  /* D6: ⌘K palette state. Global listener mounts once; meta+K /
     ctrl+K toggle. Skips when user is typing in another input so
     we don't hijack form interactions. */
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "k" && e.key !== "K") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      setPaletteOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  /* F-COMP-1 — Word export. Resolves the selected country codes to
     full JurisdictionLaw records (skipping any unknown codes
     defensively), serialises the comparison to markdown via
     buildComparisonMarkdown(), then hands off to exportDraftAsWord
     which wraps with chrome (header, footer, page numbers) +
     legal-review disclaimer back-stop. The pilot is bilingual, so
     we collapse fr/es to en for the export locale (chrome-only —
     full FR/ES wiring would mean adding a third locale to the
     ComparatorLocale union). */
  const handleExportWord = useCallback(() => {
    if (selected.length === 0) return;
    const countries = selected
      .map((code) => JURISDICTION_DATA.get(code))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
    if (countries.length === 0) return;
    const exportLocale: "en" | "de" = language === "de" ? "de" : "en";
    const { markdown, title } = buildComparisonMarkdown({
      countries,
      dimension: dimension as ComparatorDimension,
      locale: exportLocale,
    });
    exportDraftAsWord({
      markdown,
      title,
      locale: exportLocale,
    });
  }, [selected, dimension, language]);

  /* D2 (BOLD): Generate-Briefing handler. Picks the most-distinguishing
     differentiator per dimension via buildClientBriefing, then exports
     as Word — the lawyer can paste into a memo template or send to
     the client as a one-pager. Differs from handleExportWord (the
     comparator-grid export) by emitting an executive-summary memo
     instead of the raw table. */
  const handleGenerateBriefing = useCallback(() => {
    if (selected.length === 0) return;
    const countries = selected
      .map((code) => JURISDICTION_DATA.get(code))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
    if (countries.length < 2) return;
    const exportLocale: "en" | "de" = language === "de" ? "de" : "en";
    const { markdown, title } = buildClientBriefing({
      countries,
      locale: exportLocale,
    });
    exportDraftAsWord({
      markdown,
      title,
      locale: exportLocale,
    });
  }, [selected, language]);

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
            {/* D5: saved comparisons menu. Renders even at 0
                selections — empty saved-sets state is a fine place
                to teach the feature. */}
            <SavedSetsMenu currentQs={currentQs} language={language} />
            {/* BUG-B7: action-buttons used to vanish when selected.length
                === 0 — Marie clicked Clear, read the empty-state, wanted
                to share that empty state but the button was gone.
                Disabled-but-visible affordance is consistent. */}
            <>
              <button
                onClick={handleCopyLink}
                disabled={selected.length === 0}
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                  text-[11px] font-medium text-[var(--atlas-text-muted)]
                  hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-inset)]
                  disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--atlas-text-muted)] disabled:cursor-not-allowed
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
                disabled={selected.length === 0}
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                  text-[11px] font-medium text-[var(--atlas-text-muted)]
                  hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-inset)]
                  disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--atlas-text-muted)] disabled:cursor-not-allowed
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
              {/* F-COMP-1: Word-export sibling to the PDF button.
                  Same chrome (icon + label + hover) so the user
                  learns the affordance once. The Word output is
                  the comparator data as a markdown table inside
                  Word-flavoured HTML — pastes cleanly into a memo
                  without screenshot+OCR. */}
              <button
                onClick={handleExportWord}
                disabled={selected.length === 0}
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                  text-[11px] font-medium text-[var(--atlas-text-muted)]
                  hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-inset)]
                  disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--atlas-text-muted)] disabled:cursor-not-allowed
                  transition-colors duration-150
                "
                aria-label={
                  language === "de"
                    ? "Vergleich als Word exportieren"
                    : "Export comparison as Word"
                }
                title={
                  language === "de"
                    ? "Vergleich als Word (.doc) exportieren"
                    : "Export comparison as Word (.doc)"
                }
              >
                <FileText
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                  strokeWidth={1.5}
                />
                <span>{language === "de" ? "Word" : "Word"}</span>
              </button>
              {/* D2 (BOLD): Generate-Briefing button. Disabled when
                  fewer than 2 jurisdictions selected — a single-
                  jurisdiction "differentiator memo" doesn't make
                  sense. Emerald accent so the user understands this
                  is the high-value AI-flavoured action vs the
                  raw-data exports. */}
              <button
                onClick={handleGenerateBriefing}
                disabled={selected.length < 2}
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                  text-[11px] font-medium text-emerald-700 dark:text-emerald-400
                  hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10
                  disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed
                  transition-colors duration-150
                "
                aria-label={
                  language === "de"
                    ? "Mandanten-Briefing generieren"
                    : "Generate client briefing"
                }
                title={
                  selected.length < 2
                    ? language === "de"
                      ? "Mindestens 2 Jurisdiktionen für einen Briefing-Vergleich nötig"
                      : "Pick at least 2 jurisdictions for a comparison briefing"
                    : language === "de"
                      ? "Ein-Seiten-Briefing mit den wichtigsten Unterschieden generieren"
                      : "Generate a one-page briefing with the most-material differences"
                }
              >
                <Sparkles
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                  strokeWidth={1.8}
                />
                <span>{language === "de" ? "Briefing" : "Briefing"}</span>
              </button>
            </>
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
              eventsAheadCount={forecastEventsAhead.length}
            />
          </div>
        </div>

        {/* BUG-B5: aggregate forecast ribbon. Renders only when the
            slider is in the future AND there are events that affect
            the user's selected jurisdictions. Sits between the
            controls and the tabs so it's the first thing the eye
            lands on after picking a future date. Click on the count
            scrolls the table to the first cell with a badge — D8
            partial fold-in for free affordance. */}
        {forecastEventsAhead.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 text-[11.5px]"
            role="status"
            aria-live="polite"
          >
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              {language === "de"
                ? `${forecastEventsAhead.length} ${forecastEventsAhead.length === 1 ? "Änderung" : "Änderungen"} zwischen heute und Ihrem Zieldatum`
                : `${forecastEventsAhead.length} ${forecastEventsAhead.length === 1 ? "change" : "changes"} between today and your target date`}
            </span>
            <span className="ml-auto text-amber-700/70 dark:text-amber-300/70 text-[10px]">
              {language === "de"
                ? "Markierte Zeilen unten zeigen, welche Konzepte betroffen sind."
                : "Highlighted rows below show which concepts are affected."}
            </span>
          </div>
        )}

        {/* ─── Dimension Tabs + D1 toggle ─── */}
        {/* BUG-B6: were not sticky, so once Marie scrolled 200px down
            she couldn't switch dimension without scrolling back to the
            top. Now sticky right below the controls panel (top-[88px]
            roughly accounts for the controls panel height + the
            optional ribbon). Background fill prevents table content
            from bleeding through. z-20 keeps them below the controls
            (which sit at z-30). */}
        <div
          role="tablist"
          className="sticky top-[88px] z-20 -mx-1 px-1 flex items-center gap-4 overflow-x-auto pb-0.5 border-b border-[var(--atlas-border)] bg-[var(--atlas-bg-page)]"
        >
          {/* D1 toggle — right-aligned in the tab row. Disabled when
              there are <2 jurisdictions (no variance to filter). */}
          <button
            type="button"
            onClick={() => setDifferencesOnly((v) => !v)}
            disabled={selected.length < 2}
            aria-pressed={differencesOnly}
            title={
              language === "de"
                ? "Nur Zeilen anzeigen, in denen sich die ausgewählten Jurisdiktionen unterscheiden"
                : "Show only rows where the selected jurisdictions differ"
            }
            className={`order-last ml-auto flex-shrink-0 inline-flex items-center gap-1.5 pb-2 text-[11px] font-medium transition-colors duration-150 ${
              differencesOnly
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)]"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full border ${
                differencesOnly
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-[var(--atlas-border-strong)]"
              }`}
              aria-hidden="true"
            />
            {language === "de" ? "Nur Unterschiede" : "Only differences"}
          </button>
          {dimensions.map((dim) => {
            /* D7 — only the per-dimension tabs get a diff-count badge
               (the "all" tab would just show the sum, which is noisy). */
            const count =
              dim.key !== "all"
                ? diffCounts[dim.key as ComparatorDimensionKey]
                : 0;
            return (
              <button
                key={dim.key}
                role="tab"
                aria-selected={dimension === dim.key}
                onClick={() => handleDimensionChange(dim.key)}
                title={
                  count > 0
                    ? language === "de"
                      ? `${count} Zeile${count === 1 ? "" : "n"} unterscheid${count === 1 ? "et" : "en"} sich`
                      : `${count} row${count === 1 ? "" : "s"} differ${count === 1 ? "s" : ""} across selected jurisdictions`
                    : undefined
                }
                className={`
                  flex-shrink-0 pb-2 text-[11px] font-medium
                  transition-all duration-150 border-b-2 -mb-[1px]
                  inline-flex items-baseline gap-1
                  ${
                    dimension === dim.key
                      ? "border-[var(--atlas-text-primary)] text-[var(--atlas-text-primary)]"
                      : "border-transparent text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)]"
                  }
                `}
              >
                <span>{dim.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] font-mono tabular-nums ${
                      dimension === dim.key
                        ? "text-[var(--atlas-text-muted)]"
                        : "text-[var(--atlas-text-faint)]"
                    }`}
                    aria-hidden="true"
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Comparison Table ─── */}
        <div className="flex-1 rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
          <ComparisonTable
            countries={selected}
            dimension={dimension}
            targetDate={targetDate}
            differencesOnly={differencesOnly}
            onCellClick={setSourceCell}
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

      {/* D6: ⌘K country palette */}
      <CountryPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onApply={(next) => setSelected(next)}
        language={language}
      />

      {/* D4: cell-source slide-over */}
      <CellSourcePanel
        open={sourceCell !== null}
        onClose={() => setSourceCell(null)}
        cell={sourceCell}
        language={language}
      />
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
