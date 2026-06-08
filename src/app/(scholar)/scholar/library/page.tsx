/**
 * /scholar/library — Faceted browse over the full legal-source corpus.
 *
 * Server Component — the corpus is read + filtered + counted server-side; zero
 * corpus bytes reach the client bundle. Every facet is URL-driven via
 * searchParams, so each filtered view is server-rendered AND shareable.
 *
 * Facet model (see src/lib/scholar/browse-facets.server.ts):
 *   • Quellentyp (type)          — OR within group
 *   • Jurisdiktion               — OR within group
 *   • Thema (compliance_areas)   — OR within group
 *   • Chronologie (decade)       — OR within group, + a date/relevance sort
 *   Groups combine with AND. Counts per option exclude that option's own group
 *   (standard faceted-search behaviour), so the corpus stays explorable.
 *
 * Next.js 15: searchParams is a Promise — await it.
 *
 * WCAG 2.2 AA:
 *   - <main> landmark + <h1> via ScholarPage / PageHeader
 *   - Facet groups are <nav> regions with headings; each option is a Link
 *     (≥24px target, focus-visible ring, selection announced via sr-only)
 *   - Active filters are removable chips (each a Link to the URL minus that param)
 *   - Result count uses aria-live; sources rendered via the monochrome SourceRow
 *   - Strictly monochrome: black / white / gray-* only — zero other hue
 *   - No ad-hoc text-[Npx]: all type from SCHOLAR_TYPE tokens / Eyebrow
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { BookOpen, Check, X } from "lucide-react";
import { getTranslatedSource } from "@/data/legal-sources";
import { getCountryName } from "@/data/iso-3166-countries";
import { auth } from "@/lib/auth";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
import {
  buildBrowse,
  parseBrowseSelection,
  selectionToQuery,
  selectionToggle,
  selectionWithout,
  selectionWithSort,
  hasActiveFilters,
  labelForValue,
  groupHeading,
  type BrowseSelection,
  type FacetGroup,
  type FacetGroupKey,
  type SortKey,
} from "@/lib/scholar/browse-facets.server";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { SourceRow } from "../_components/SourceRow";
import type { SourceRowData } from "../_components/SourceRow";
import { SCHOLAR_TYPE } from "../_components/scholar-type";
import { Eyebrow } from "../_components/Eyebrow";
import { getScholarLocale } from "../_i18n/locale.server";
import { t, type ScholarLocale } from "../_i18n/core";
import { COMMON } from "../_i18n/common";
import { BROWSE } from "../_i18n/browse";

// Hard upper cap — safety rail regardless of user pref.
const HARD_CAP = 200;

// Special jurisdiction display names not in ISO-3166. INT/EU are handled
// centrally (locale-aware) by browse-facets.server.ts; this resolver is only
// invoked for real ISO-3166 codes, with INT/EU kept as a localised fallback.
function makeJurisdictionLabel(
  locale: ScholarLocale,
): (code: string) => string {
  return (code: string) => {
    if (code === "INT") return t(locale, BROWSE, "jurisdictionINT");
    if (code === "EU") return t(locale, BROWSE, "jurisdictionEU");
    return getCountryName(code);
  };
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ─── Sort control options (labels resolved per-locale at render) ───────────────
const SORT_OPTIONS: {
  value: SortKey;
  labelKey: keyof (typeof BROWSE)["en"];
}[] = [
  { value: "relevance", labelKey: "sortRelevance" },
  { value: "date_desc", labelKey: "sortNewest" },
  { value: "date_asc", labelKey: "sortOldest" },
];

export default async function LibraryPage({ searchParams }: Props) {
  // Next.js 15: searchParams is a Promise.
  const sp = await searchParams;

  // Load user preferences for default jurisdiction + results-per-page cap.
  // Falls back gracefully when unauthenticated (layout redirects, but be safe).
  const session = await auth();
  const prefs = session?.user?.id
    ? await getScholarPreferences(session.user.id)
    : null;

  // Resolve the UI locale once and thread it into the facet engine + render.
  const locale = await getScholarLocale(session?.user?.id);
  const getJurisdictionLabel = makeJurisdictionLabel(locale);

  // Parse the URL-driven facet selection.
  const selection = parseBrowseSelection(sp);

  // Seed the jurisdiction facet from the saved defaultJurisdiction pref ONLY
  // when the URL specifies no jurisdiction (preserves pre-facet behaviour
  // without overriding an explicit, shareable URL).
  if (
    selection.jurisdictions.length === 0 &&
    prefs?.defaultJurisdiction &&
    typeof sp.jurisdiction === "undefined"
  ) {
    selection.jurisdictions = [prefs.defaultJurisdiction.toUpperCase()];
  }

  // Effective results-per-page: URL ?limit > saved pref > default 20.
  const prefLimit = prefs?.resultsPerPage ?? 20;
  const urlLimit = typeof sp.limit === "string" ? parseInt(sp.limit, 10) : NaN;
  const DISPLAY_CAP = Math.min(
    HARD_CAP,
    isNaN(urlLimit) ? prefLimit : urlLimit,
  );

  // Build facet groups (with counts) + the filtered, sorted result list.
  const { groups, sources, totalCount } = buildBrowse(
    selection,
    getJurisdictionLabel,
    locale,
  );

  const capped = sources.slice(0, DISPLAY_CAP);
  const isCapped = totalCount > DISPLAY_CAP;
  const filtersActive = hasActiveFilters(selection);

  // Resolve display language for source titles (mirror previous behaviour).
  const sourceLanguage = prefs?.sourceLanguage ?? "original";
  const displayLang = sourceLanguage === "original" ? "en" : sourceLanguage;

  // ── Active-filter chips (every active facet value across all groups) ──────
  const activeChips: {
    group: FacetGroupKey;
    value: string;
    label: string;
  }[] = [];
  for (const group of groups) {
    const field =
      group.key === "type"
        ? selection.types
        : group.key === "jurisdiction"
          ? selection.jurisdictions
          : group.key === "area"
            ? selection.areas
            : selection.decades;
    for (const value of field) {
      activeChips.push({
        group: group.key,
        value,
        label: labelForValue(group.key, value, getJurisdictionLabel, locale),
      });
    }
  }

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title={t(locale, BROWSE, "libraryTitle")}
        subtitle={t(locale, BROWSE, "librarySubtitle")}
        icon={BookOpen}
      />

      {/* ─────────────────────────────────────────────────────────────────
          Two-column layout: facet rail (left) + results (right).
          Stacks to a single column below lg.
         ───────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* ─── Facet rail ─────────────────────────────────────────────── */}
        <aside
          className="lg:w-72 lg:flex-shrink-0"
          aria-label={t(locale, BROWSE, "ariaFacetFilter")}
        >
          <div className="rounded-2xl bg-white border border-gray-200/70 shadow-sm p-5 lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className={SCHOLAR_TYPE.sectionHeading}>
                {t(locale, BROWSE, "filter")}
              </h2>
              {filtersActive && (
                <Link
                  href="/scholar/library"
                  className="text-small text-gray-700 hover:text-gray-900 underline underline-offset-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded px-1 py-1"
                >
                  {t(locale, BROWSE, "reset")}
                </Link>
              )}
            </div>

            <div className="space-y-6">
              {groups.map((group) => (
                <FacetGroupBlock
                  key={group.key}
                  group={group}
                  selection={selection}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ─── Results column ─────────────────────────────────────────── */}
        <section
          className="flex-1 min-w-0"
          aria-label={t(locale, BROWSE, "ariaResults")}
        >
          {/* Active-filter chips */}
          {activeChips.length > 0 && (
            <div className="mb-5">
              <h3 className="sr-only">{t(locale, BROWSE, "activeFilters")}</h3>
              <ul className="flex flex-wrap items-center gap-2" role="list">
                {activeChips.map((chip) => {
                  const without = selectionWithout(
                    selection,
                    chip.group,
                    chip.value,
                  );
                  return (
                    <li key={`${chip.group}:${chip.value}`}>
                      <Link
                        href={`/scholar/library${selectionToQuery(without)}`}
                        className="inline-flex items-center gap-1.5 border border-gray-300 rounded-full pl-3 pr-2 py-1 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                      >
                        <span className="text-small">
                          <span className="text-gray-600">
                            {groupHeading(chip.group, locale)}:
                          </span>{" "}
                          <span className="font-medium text-gray-900">
                            {chip.label}
                          </span>
                        </span>
                        <X
                          size={13}
                          strokeWidth={2}
                          className="text-gray-600"
                          aria-hidden={true}
                        />
                        <span className="sr-only">
                          {t(locale, BROWSE, "removeFilterPrefix")}
                          {chip.label}
                          {t(locale, BROWSE, "removeFilterSuffix")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Count + sort row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div aria-live="polite" aria-atomic="true">
              <span className={SCHOLAR_TYPE.meta}>
                <span className="font-semibold text-gray-900">
                  {totalCount}
                </span>{" "}
                {totalCount === 1
                  ? t(locale, COMMON, "source")
                  : t(locale, COMMON, "sources")}
                {filtersActive ? t(locale, BROWSE, "filteredSuffix") : ""}
              </span>
            </div>
            <SortControl selection={selection} locale={locale} />
          </div>

          {/* Cap notice — render {n} (bold) and {total} from the localised template */}
          {isCapped && (
            <p
              className="mb-4 rounded-xl bg-gray-50 px-3 py-2 text-small text-gray-700"
              role="note"
            >
              <CapNotice
                template={t(locale, BROWSE, "capNotice")}
                displayCap={DISPLAY_CAP}
                total={totalCount}
              />
            </p>
          )}

          {/* Results list */}
          {capped.length === 0 ? (
            <p className={`${SCHOLAR_TYPE.bodyMuted} py-10`}>
              {t(locale, BROWSE, "emptyFilters")}
            </p>
          ) : (
            <ul className="space-y-1" role="list">
              {capped.map((source) => {
                // Apply source-language translation if user opted in.
                // When sourceLanguage == "original", use title_local (if set)
                // then title_en — preserving pre-facet behaviour.
                const tx = getTranslatedSource(source, displayLang);
                const displayTitle =
                  sourceLanguage === "original"
                    ? (source.title_local ?? source.title_en)
                    : tx.title;
                const displayScope =
                  tx.scopeDescription ?? source.scope_description ?? null;

                const rowData: SourceRowData = {
                  id: source.id,
                  jurisdiction: source.jurisdiction,
                  type: source.type,
                  status: source.status,
                  title: displayTitle,
                  officialReference: source.official_reference ?? null,
                  relevanceLevel: source.relevance_level ?? null,
                  scopeDescription: displayScope,
                };
                return (
                  <li key={source.id}>
                    <SourceRow source={rowData} locale={locale} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-gray-200 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-micro font-semibold uppercase tracking-[0.08em] text-gray-600">
              Scholar
            </span>
            <span className="text-caption text-gray-600">
              {t(locale, BROWSE, "footerBy")}
            </span>
          </div>
          <span className="text-caption text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}

// ─── Facet group block (one column of toggleable options) ─────────────────────

function FacetGroupBlock({
  group,
  selection,
  locale,
}: {
  group: FacetGroup;
  selection: BrowseSelection;
  locale: ScholarLocale;
}) {
  if (group.options.length === 0) return null;

  // The currently-selected values for THIS group.
  const selected =
    group.key === "type"
      ? selection.types
      : group.key === "jurisdiction"
        ? selection.jurisdictions
        : group.key === "area"
          ? selection.areas
          : selection.decades;

  const headingId = `facet-${group.key}`;

  return (
    <nav aria-labelledby={headingId}>
      <Eyebrow className="mb-2">
        <span id={headingId}>{group.heading}</span>
      </Eyebrow>
      <ul className="space-y-0.5" role="list">
        {group.options.map((opt) => {
          const isOn = selected.includes(opt.value);
          const next = selectionToggle(selection, group.key, opt.value);
          return (
            <li key={opt.value}>
              <Link
                href={`/scholar/library${selectionToQuery(next)}`}
                className={
                  "group flex items-center gap-2 min-h-[28px] px-2 py-1 rounded-lg motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] " +
                  (isOn ? "bg-gray-900" : "hover:bg-gray-100")
                }
              >
                {/* Checkbox-style indicator (shape, not colour, conveys state) */}
                <span
                  className={
                    "flex items-center justify-center w-4 h-4 flex-shrink-0 rounded border " +
                    (isOn
                      ? "bg-white border-white"
                      : "bg-white border-gray-400 group-hover:border-gray-600")
                  }
                  aria-hidden={true}
                >
                  {isOn && (
                    <Check
                      size={11}
                      strokeWidth={3}
                      className="text-gray-900"
                    />
                  )}
                </span>

                {/* Option label */}
                <span
                  className={
                    "flex-1 min-w-0 truncate text-small " +
                    (isOn
                      ? "font-medium text-white"
                      : "text-gray-700 group-hover:text-gray-900")
                  }
                >
                  {opt.label}
                </span>

                {/* Count */}
                <span
                  className={
                    "flex-shrink-0 text-caption tabular-nums " +
                    (isOn ? "text-gray-300" : "text-gray-500")
                  }
                >
                  {opt.count}
                </span>

                {/* Screen-reader selection state */}
                <span className="sr-only">
                  {isOn
                    ? t(locale, BROWSE, "srSelectedRemove")
                    : t(locale, BROWSE, "srUnselectedSelect").replace(
                        "{count}",
                        String(opt.count),
                      )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── Sort control (URL-driven segmented links) ────────────────────────────────

function SortControl({
  selection,
  locale,
}: {
  selection: BrowseSelection;
  locale: ScholarLocale;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`${SCHOLAR_TYPE.metaLabel} hidden sm:inline`}
        id="sort-label"
      >
        {t(locale, BROWSE, "sortLabel")}
      </span>
      <div
        className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-0.5"
        role="group"
        aria-labelledby="sort-label"
      >
        {SORT_OPTIONS.map((opt) => {
          const isActive = selection.sort === opt.value;
          const next = selectionWithSort(selection, opt.value);
          return (
            <Link
              key={opt.value}
              href={`/scholar/library${selectionToQuery(next)}`}
              aria-current={isActive ? "true" : undefined}
              className={
                "px-2.5 py-1 rounded-md text-small motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] " +
                (isActive
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100")
              }
            >
              {t(locale, BROWSE, opt.labelKey)}
              {isActive && (
                <span className="sr-only">
                  {t(locale, BROWSE, "sortActiveSuffix")}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cap notice (renders a localised template with a bold {n} and plain {total}) ─
// The template carries {n} and {total} placeholders (any order). We tokenise on
// both, render {n} inside a bold span (matching the previous emphasis) and
// {total} as plain text, so the sentence stays correct in every locale.
function CapNotice({
  template,
  displayCap,
  total,
}: {
  template: string;
  displayCap: number;
  total: number;
}) {
  const parts = template.split(/(\{n\}|\{total\})/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "{n}") {
          return (
            <span key={i} className="font-semibold text-gray-900">
              {displayCap}
            </span>
          );
        }
        if (part === "{total}") {
          return <span key={i}>{total}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
