/**
 * /scholar/cases — Browse all case law with keyword search, sort + filters.
 *
 * Server Component — corpus read server-side; nothing reaches the bundle.
 * Next.js 15: searchParams is a Promise — await it.
 *
 * URL-param model (all filters URL-driven → server-rendered + shareable):
 *   ?q=<keyword>            keyword search over caption / forum / parties
 *   ?area=<ComplianceArea>  Thema (compliance-area) filter
 *   ?jurisdiction=<code>    jurisdiction filter (ISO-alpha-2, INT, EU)
 *   ?forum=<CaseForum>      forum filter
 *   ?sort=newest|oldest     date sort by date_decided (default newest)
 * Removable active-filter chips link to the SAME url minus that one param.
 *
 * STRICTLY MONOCHROME: only black / white / gray-* — zero other hues.
 * Type sizes come from the shared SCHOLAR_TYPE tokens (existing
 * tailwind.config.ts semantic scale) — never ad-hoc text-[Npx].
 *
 * WCAG 2.2 AA:
 *   - <main> landmark + <h1> via ScholarPage / PageHeader; <h2> section heads
 *   - Labelled search <input> + <select>s (1.3.1 / 3.3.2)
 *   - focus-visible ring on every interactive element (2.4.7)
 *   - ≥44px primary controls, ≥24px chips/links (2.5.8)
 *   - Removable chips expose an sr-only "entfernen" verb (1.1.1 / 2.4.4)
 *   - Result count in an aria-live region; motion-safe transitions
 *   - lang="de" on root element (ScholarPage)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { Scale, Search, X } from "lucide-react";
import {
  ATLAS_CASES,
  CASES_BY_JURISDICTION,
  CASES_BY_FORUM,
} from "@/data/legal-cases";
import type { CaseForum } from "@/data/legal-cases";
import { auth } from "@/lib/auth";
import { getCountryName } from "@/data/iso-3166-countries";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { CaseRow } from "../_components/CaseRow";
import type { CaseRowData } from "../_components/CaseRow";
import { SCHOLAR_TYPE } from "../_components/scholar-type";
import { t, type ScholarLocale } from "../_i18n/core";
import { CASES } from "../_i18n/cases";
import { getScholarLocale } from "../_i18n/locale.server";

// Special jurisdiction display names not in ISO-3166. These resolve to
// English-language place names (corpus data, not UI chrome) and so are not
// translated — getCountryName likewise returns canonical names. The BCP-47
// tag used for localeCompare ordering is derived from the UI locale below.
const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function getJurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

// CaseForum → CASES-namespace key (full dropdown names; the compact row
// labels live in the SOURCE namespace and are applied inside CaseRow).
const FORUM_LABEL_KEYS: Record<CaseForum, keyof (typeof CASES)["en"]> = {
  court: "forumCourt",
  regulator_order: "forumRegulatorOrder",
  regulator_settlement: "forumRegulatorSettlement",
  criminal_settlement: "forumCriminalSettlement",
  civil_settlement: "forumCivilSettlement",
  treaty_award: "forumTreatyAward",
  administrative_appeal: "forumAdministrativeAppeal",
  arbitral_award: "forumArbitralAward",
};

function getForumLabel(forum: string, locale: ScholarLocale): string {
  const key = FORUM_LABEL_KEYS[forum as CaseForum];
  return key ? t(locale, CASES, key) : forum;
}

// ComplianceArea → CASES-namespace key. Covers every ComplianceArea value that
// appears in the case corpus; unknown keys fall back to a humanised form so the
// dropdown never shows a raw enum.
const AREA_LABEL_KEYS: Record<string, keyof (typeof CASES)["en"]> = {
  licensing: "areaLicensing",
  registration: "areaRegistration",
  liability: "areaLiability",
  insurance: "areaInsurance",
  cybersecurity: "areaCybersecurity",
  export_control: "areaExportControl",
  data_security: "areaDataSecurity",
  frequency_spectrum: "areaFrequencySpectrum",
  environmental: "areaEnvironmental",
  debris_mitigation: "areaDebrisMitigation",
  space_traffic_management: "areaSpaceTrafficManagement",
  human_spaceflight: "areaHumanSpaceflight",
  military_dual_use: "areaMilitaryDualUse",
  competition_antitrust: "areaCompetitionAntitrust",
  state_aid: "areaStateAid",
  procurement: "areaProcurement",
  tax_customs: "areaTaxCustoms",
  sanctions_compliance: "areaSanctionsCompliance",
  ip_patents: "areaIpPatents",
  product_liability: "areaProductLiability",
  fdi_screening: "areaFdiScreening",
  ai_compliance: "areaAiCompliance",
  aml_kyc: "areaAmlKyc",
  consumer_protection: "areaConsumerProtection",
  employment_labor: "areaEmploymentLabor",
  scientific_research: "areaScientificResearch",
  media_broadcasting: "areaMediaBroadcasting",
  critical_infrastructure: "areaCriticalInfrastructure",
  sustainability_reporting: "areaSustainabilityReporting",
};

function humaniseKey(raw: string): string {
  const spaced = raw.replace(/_/g, " ").trim();
  if (spaced.length === 0) return raw;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function getAreaLabel(area: string, locale: ScholarLocale): string {
  const key = AREA_LABEL_KEYS[area];
  return key ? t(locale, CASES, key) : humaniseKey(area);
}

// UI locale → BCP-47 tag for locale-aware option ordering (mirrors the
// source lane). Falls back to en-GB collation.
const COLLATION_LOCALE: Record<ScholarLocale, string> = {
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  fr: "fr-FR",
  es: "es-ES",
};

// Cap rendered rows so a future corpus growth can't produce a runaway
// DOM. The full corpus is 82 cases today; the cap is a safety ceiling
// and surfaces an honest notice + a narrowing hint when it bites.
const RESULT_CAP = 200;

type SortKey = "newest" | "oldest";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CasesPage({ searchParams }: Props) {
  const sp = await searchParams;

  // Resolve the UI locale once and thread it to every localised label /
  // string below. Defaults to "en" when unauthenticated.
  const session = await auth();
  const locale = await getScholarLocale(session?.user?.id);
  const collation = COLLATION_LOCALE[locale];

  // ─── Parse URL params (all filters are URL-driven) ────────────────
  const firstParam = (v: string | string[] | undefined): string =>
    (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

  const query = firstParam(sp.q);
  const queryLower = query.toLowerCase();
  const areaFilter = firstParam(sp.area);
  const jurisdictionFilter = firstParam(sp.jurisdiction).toUpperCase();
  const forumFilter = firstParam(sp.forum);
  const sort: SortKey = firstParam(sp.sort) === "oldest" ? "oldest" : "newest";

  const hasActiveFilter = Boolean(
    query || areaFilter || jurisdictionFilter || forumFilter,
  );

  // ─── Derive distinct filter options (only what the corpus contains) ─
  const allJurisdictions = Object.keys(CASES_BY_JURISDICTION).sort((a, b) => {
    if (a === "INT") return -1;
    if (b === "INT") return 1;
    if (a === "EU") return -1;
    if (b === "EU") return 1;
    return getJurisdictionLabel(a).localeCompare(
      getJurisdictionLabel(b),
      collation,
    );
  });

  const allForums = Object.keys(CASES_BY_FORUM) as CaseForum[];

  // Compliance areas present in the corpus, sorted by frequency then label.
  const areaCounts = new Map<string, number>();
  for (const c of ATLAS_CASES) {
    for (const a of c.compliance_areas) {
      areaCounts.set(a, (areaCounts.get(a) ?? 0) + 1);
    }
  }
  const allAreas = [...areaCounts.keys()].sort((a, b) => {
    const diff = (areaCounts.get(b) ?? 0) - (areaCounts.get(a) ?? 0);
    if (diff !== 0) return diff;
    return getAreaLabel(a, locale).localeCompare(
      getAreaLabel(b, locale),
      collation,
    );
  });

  // ─── Apply filters server-side ────────────────────────────────────
  const filtered = ATLAS_CASES.filter((c) => {
    if (jurisdictionFilter && c.jurisdiction !== jurisdictionFilter)
      return false;
    if (forumFilter && c.forum !== forumFilter) return false;
    if (areaFilter && !c.compliance_areas.includes(areaFilter as never))
      return false;
    if (queryLower) {
      // Keyword over caption / forum / parties.
      const haystack = [
        c.title,
        c.forum_name,
        c.plaintiff,
        c.defendant,
        ...(c.parties_mentioned ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(queryLower)) return false;
    }
    return true;
  });

  // ─── Sort by date_decided (ISO YYYY-MM-DD → string compare is safe) ─
  const sorted = [...filtered].sort((a, b) => {
    const cmp = a.date_decided.localeCompare(b.date_decided);
    return sort === "oldest" ? cmp : -cmp;
  });

  const total = sorted.length;
  const capped = total > RESULT_CAP;
  const visible = capped ? sorted.slice(0, RESULT_CAP) : sorted;

  // ─── Build "current URL minus one param" hrefs for removable chips ─
  const removeParamHref = (drop: string): string => {
    const params = new URLSearchParams();
    if (query && drop !== "q") params.set("q", query);
    if (areaFilter && drop !== "area") params.set("area", areaFilter);
    if (jurisdictionFilter && drop !== "jurisdiction")
      params.set("jurisdiction", jurisdictionFilter);
    if (forumFilter && drop !== "forum") params.set("forum", forumFilter);
    // Preserve the chosen sort across chip removals (default omitted).
    if (sort === "oldest") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/scholar/cases?${qs}` : "/scholar/cases";
  };

  const fieldClass =
    "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 motion-safe:transition-colors hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] " +
    SCHOLAR_TYPE.body;

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title={t(locale, CASES, "pageTitle")}
        subtitle={t(locale, CASES, "pageSubtitle")}
        icon={Scale}
      />

      {/* ─── Filter + search bar (GET form → URL-driven, shareable) ─── */}
      {/*
        WCAG 1.3.1 / 3.3.2: labelled input + selects.
        WCAG 2.4.7: focus-visible ring on every control.
        Native GET form: works without JS; server renders the result.
      */}
      <form
        method="get"
        action="/scholar/cases"
        aria-label={t(locale, CASES, "formAriaLabel")}
        className="mb-8 pb-8 border-b border-gray-300"
      >
        {/* Keyword search */}
        <div className="mb-4">
          <label
            htmlFor="cases-q"
            className={`mb-1 block ${SCHOLAR_TYPE.metaLabel}`}
          >
            {t(locale, CASES, "searchLabel")}
          </label>
          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.5}
              aria-hidden={true}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              id="cases-q"
              type="search"
              name="q"
              defaultValue={query}
              placeholder={t(locale, CASES, "searchPlaceholder")}
              autoComplete="off"
              className={
                "w-full bg-white border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 placeholder:text-gray-500 motion-safe:transition-colors hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] " +
                SCHOLAR_TYPE.body
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {/* Thema (compliance-area) filter */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label htmlFor="cases-area" className={SCHOLAR_TYPE.metaLabel}>
              {t(locale, CASES, "areaLabel")}
            </label>
            <select
              id="cases-area"
              name="area"
              defaultValue={areaFilter}
              className={fieldClass}
            >
              <option value="">{t(locale, CASES, "areaAll")}</option>
              {allAreas.map((area) => (
                <option key={area} value={area}>
                  {getAreaLabel(area, locale)} ({areaCounts.get(area)})
                </option>
              ))}
            </select>
          </div>

          {/* Jurisdiction filter */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label
              htmlFor="cases-jurisdiction"
              className={SCHOLAR_TYPE.metaLabel}
            >
              {t(locale, CASES, "jurisdictionLabel")}
            </label>
            <select
              id="cases-jurisdiction"
              name="jurisdiction"
              defaultValue={jurisdictionFilter}
              className={fieldClass}
            >
              <option value="">{t(locale, CASES, "jurisdictionAll")}</option>
              {allJurisdictions.map((code) => (
                <option key={code} value={code}>
                  {code} — {getJurisdictionLabel(code)}
                </option>
              ))}
            </select>
          </div>

          {/* Forum filter */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label htmlFor="cases-forum" className={SCHOLAR_TYPE.metaLabel}>
              {t(locale, CASES, "forumLabel")}
            </label>
            <select
              id="cases-forum"
              name="forum"
              defaultValue={forumFilter}
              className={fieldClass}
            >
              <option value="">{t(locale, CASES, "forumAll")}</option>
              {allForums.map((f) => (
                <option key={f} value={f}>
                  {getForumLabel(f, locale)}
                </option>
              ))}
            </select>
          </div>

          {/* Date sort */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label htmlFor="cases-sort" className={SCHOLAR_TYPE.metaLabel}>
              {t(locale, CASES, "sortLabel")}
            </label>
            <select
              id="cases-sort"
              name="sort"
              defaultValue={sort}
              className={fieldClass}
            >
              <option value="newest">{t(locale, CASES, "sortNewest")}</option>
              <option value="oldest">{t(locale, CASES, "sortOldest")}</option>
            </select>
          </div>

          {/*
            WCAG 2.5.8: button height ≥44px via py-2.5 ✓
          */}
          <button
            type="submit"
            className={
              "rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-700 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] " +
              SCHOLAR_TYPE.body
            }
          >
            {t(locale, CASES, "apply")}
          </button>
        </div>
      </form>

      {/* ─── Active-filter chips (each removes ONE param) ─── */}
      {hasActiveFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={`sr-only`}>
            {t(locale, CASES, "activeFiltersSr")}
          </span>
          {query && (
            <FilterChip
              label={t(locale, CASES, "chipSearch")}
              value={`„${query}“`}
              href={removeParamHref("q")}
              removeLabel={t(locale, CASES, "removeChip")}
            />
          )}
          {areaFilter && (
            <FilterChip
              label={t(locale, CASES, "chipTopic")}
              value={getAreaLabel(areaFilter, locale)}
              href={removeParamHref("area")}
              removeLabel={t(locale, CASES, "removeChip")}
            />
          )}
          {jurisdictionFilter && (
            <FilterChip
              label={t(locale, CASES, "chipJurisdiction")}
              value={getJurisdictionLabel(jurisdictionFilter)}
              href={removeParamHref("jurisdiction")}
              removeLabel={t(locale, CASES, "removeChip")}
            />
          )}
          {forumFilter && (
            <FilterChip
              label={t(locale, CASES, "chipForum")}
              value={getForumLabel(forumFilter, locale)}
              href={removeParamHref("forum")}
              removeLabel={t(locale, CASES, "removeChip")}
            />
          )}
          <Link
            href="/scholar/cases"
            className={`rounded px-1 py-1 underline underline-offset-2 text-gray-600 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] ${SCHOLAR_TYPE.meta}`}
          >
            {t(locale, CASES, "resetAll")}
          </Link>
        </div>
      )}

      {/* Result count */}
      <div className="mb-4" aria-live="polite" aria-atomic="true">
        <span className={SCHOLAR_TYPE.meta}>
          {total}{" "}
          {total === 1
            ? t(locale, CASES, "decisionOne")
            : t(locale, CASES, "decisionMany")}
          {hasActiveFilter ? ` ${t(locale, CASES, "filteredSuffix")}` : ""}
          {capped
            ? ` · ${t(locale, CASES, "capNotice").replace("{cap}", String(RESULT_CAP))}`
            : ""}
        </span>
      </div>

      {/* Cases list */}
      <section aria-labelledby="cases-list-heading">
        <div className="mb-2 flex items-center gap-2">
          <Scale
            size={13}
            className="text-gray-500"
            strokeWidth={1.5}
            aria-hidden={true}
          />
          <h2 id="cases-list-heading" className={SCHOLAR_TYPE.metaLabel}>
            {t(locale, CASES, "casesHeading")}
          </h2>
        </div>

        {visible.length === 0 ? (
          <p className={`py-8 ${SCHOLAR_TYPE.bodyMuted}`}>
            {t(locale, CASES, "noResults")}
          </p>
        ) : (
          <ul className="space-y-1" role="list">
            {visible.map((c) => {
              const rowData: CaseRowData = {
                id: c.id,
                jurisdiction: c.jurisdiction,
                forum: c.forum,
                forum_name: c.forum_name,
                title: c.title,
                plaintiff: c.plaintiff,
                defendant: c.defendant,
                date_decided: c.date_decided,
                status: c.status,
              };
              return (
                <li key={c.id}>
                  <CaseRow c={rowData} locale={locale} />
                </li>
              );
            })}
          </ul>
        )}

        {capped && (
          <p className={`mt-4 ${SCHOLAR_TYPE.meta}`}>
            {t(locale, CASES, "capHidden").replace(
              "{hidden}",
              String(total - RESULT_CAP),
            )}
          </p>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-gray-300 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={SCHOLAR_TYPE.metaLabel}>Scholar</span>
            <span className={SCHOLAR_TYPE.meta}>
              {t(locale, CASES, "footerBrandBy")}
            </span>
          </div>
          <span className={SCHOLAR_TYPE.meta}>
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}

/**
 * A single removable active-filter chip. Renders as a link to the URL
 * with this one param dropped; the whole chip is the target.
 *
 * Monochrome outlined pill, ≥24px target (py-1 + text + icon). The
 * X glyph is decorative (aria-hidden); an sr-only "entfernen" verb
 * gives screen-reader users the action. Load-bearing border = gray-300.
 */
function FilterChip({
  label,
  value,
  href,
  removeLabel,
}: {
  label: string;
  value: string;
  href: string;
  removeLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-gray-700 hover:border-gray-400 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
    >
      <span className={SCHOLAR_TYPE.meta}>
        <span className="text-gray-500">{label}:</span>{" "}
        <span className="font-medium text-gray-900">{value}</span>
      </span>
      <span className="sr-only">{removeLabel}</span>
      <X
        size={13}
        strokeWidth={2}
        aria-hidden={true}
        className="text-gray-500 group-hover:text-gray-900 motion-safe:transition-colors"
      />
    </Link>
  );
}
