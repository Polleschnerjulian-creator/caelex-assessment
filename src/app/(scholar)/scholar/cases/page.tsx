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
import { getCountryName } from "@/data/iso-3166-countries";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { CaseRow } from "../_components/CaseRow";
import type { CaseRowData } from "../_components/CaseRow";
import { SCHOLAR_TYPE } from "../_components/scholar-type";

// Special jurisdiction display names not in ISO-3166
const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function getJurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

// Human-readable forum names for the filter dropdown
const FORUM_LABELS: Record<CaseForum, string> = {
  court: "Gericht",
  regulator_order: "Behördliche Anordnung",
  regulator_settlement: "Behördlicher Vergleich",
  criminal_settlement: "Strafvergleich",
  civil_settlement: "Zivilvergleich",
  treaty_award: "Vertragsschiedsspruch",
  administrative_appeal: "Verwaltungsbeschwerde",
  arbitral_award: "Schiedsspruch",
};

// German labels for the compliance-area (Thema) filter. Covers every
// ComplianceArea value that appears in the case corpus; unknown keys
// fall back to a humanised form so the dropdown never shows a raw enum.
const AREA_LABELS: Record<string, string> = {
  licensing: "Zulassung & Genehmigung",
  registration: "Registrierung",
  liability: "Haftung",
  insurance: "Versicherung",
  cybersecurity: "Cybersicherheit",
  export_control: "Exportkontrolle",
  data_security: "Datensicherheit",
  frequency_spectrum: "Frequenzen & Spektrum",
  environmental: "Umwelt",
  debris_mitigation: "Weltraumschrott",
  space_traffic_management: "Weltraumverkehr",
  human_spaceflight: "Bemannte Raumfahrt",
  military_dual_use: "Militärisch / Dual-Use",
  competition_antitrust: "Wettbewerb & Kartellrecht",
  state_aid: "Beihilfen",
  procurement: "Vergabe",
  tax_customs: "Steuern & Zoll",
  sanctions_compliance: "Sanktionen",
  ip_patents: "Geistiges Eigentum",
  product_liability: "Produkthaftung",
  fdi_screening: "Investitionskontrolle",
  ai_compliance: "KI-Konformität",
  aml_kyc: "Geldwäsche & KYC",
  consumer_protection: "Verbraucherschutz",
  employment_labor: "Arbeitsrecht",
  scientific_research: "Wissenschaft & Forschung",
  media_broadcasting: "Medien & Rundfunk",
  critical_infrastructure: "Kritische Infrastruktur",
  sustainability_reporting: "Nachhaltigkeitsberichte",
};

function humaniseKey(raw: string): string {
  const spaced = raw.replace(/_/g, " ").trim();
  if (spaced.length === 0) return raw;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function getAreaLabel(area: string): string {
  return AREA_LABELS[area] ?? humaniseKey(area);
}

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
    return getJurisdictionLabel(a).localeCompare(getJurisdictionLabel(b), "de");
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
    return getAreaLabel(a).localeCompare(getAreaLabel(b), "de");
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
        title="Rechtsprechung"
        subtitle="Urteile, Entscheidungen und Durchsetzungsmaßnahmen im Weltraumrecht"
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
        aria-label="Rechtsprechung durchsuchen und filtern"
        className="mb-8 pb-8 border-b border-gray-300"
      >
        {/* Keyword search */}
        <div className="mb-4">
          <label
            htmlFor="cases-q"
            className={`mb-1 block ${SCHOLAR_TYPE.metaLabel}`}
          >
            Suche
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
              placeholder="Fallname, Forum oder Beteiligte…"
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
              Thema
            </label>
            <select
              id="cases-area"
              name="area"
              defaultValue={areaFilter}
              className={fieldClass}
            >
              <option value="">Alle Themen</option>
              {allAreas.map((area) => (
                <option key={area} value={area}>
                  {getAreaLabel(area)} ({areaCounts.get(area)})
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
              Jurisdiktion
            </label>
            <select
              id="cases-jurisdiction"
              name="jurisdiction"
              defaultValue={jurisdictionFilter}
              className={fieldClass}
            >
              <option value="">Alle Jurisdiktionen</option>
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
              Forum
            </label>
            <select
              id="cases-forum"
              name="forum"
              defaultValue={forumFilter}
              className={fieldClass}
            >
              <option value="">Alle Foren</option>
              {allForums.map((f) => (
                <option key={f} value={f}>
                  {FORUM_LABELS[f] ?? f}
                </option>
              ))}
            </select>
          </div>

          {/* Date sort */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label htmlFor="cases-sort" className={SCHOLAR_TYPE.metaLabel}>
              Sortierung
            </label>
            <select
              id="cases-sort"
              name="sort"
              defaultValue={sort}
              className={fieldClass}
            >
              <option value="newest">Neueste zuerst</option>
              <option value="oldest">Älteste zuerst</option>
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
            Anwenden
          </button>
        </div>
      </form>

      {/* ─── Active-filter chips (each removes ONE param) ─── */}
      {hasActiveFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={`sr-only`}>Aktive Filter:</span>
          {query && (
            <FilterChip
              label="Suche"
              value={`„${query}“`}
              href={removeParamHref("q")}
            />
          )}
          {areaFilter && (
            <FilterChip
              label="Thema"
              value={getAreaLabel(areaFilter)}
              href={removeParamHref("area")}
            />
          )}
          {jurisdictionFilter && (
            <FilterChip
              label="Jurisdiktion"
              value={getJurisdictionLabel(jurisdictionFilter)}
              href={removeParamHref("jurisdiction")}
            />
          )}
          {forumFilter && (
            <FilterChip
              label="Forum"
              value={FORUM_LABELS[forumFilter as CaseForum] ?? forumFilter}
              href={removeParamHref("forum")}
            />
          )}
          <Link
            href="/scholar/cases"
            className={`rounded px-1 py-1 underline underline-offset-2 text-gray-600 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] ${SCHOLAR_TYPE.meta}`}
          >
            Alle zurücksetzen
          </Link>
        </div>
      )}

      {/* Result count */}
      <div className="mb-4" aria-live="polite" aria-atomic="true">
        <span className={SCHOLAR_TYPE.meta}>
          {total} {total === 1 ? "Entscheidung" : "Entscheidungen"}
          {hasActiveFilter ? " (gefiltert)" : ""}
          {capped ? ` · erste ${RESULT_CAP} angezeigt` : ""}
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
            Fälle
          </h2>
        </div>

        {visible.length === 0 ? (
          <p className={`py-8 ${SCHOLAR_TYPE.bodyMuted}`}>
            Keine Entscheidungen für die gewählten Kriterien gefunden.
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
                  <CaseRow c={rowData} />
                </li>
              );
            })}
          </ul>
        )}

        {capped && (
          <p className={`mt-4 ${SCHOLAR_TYPE.meta}`}>
            {total - RESULT_CAP} weitere Entscheidungen ausgeblendet — bitte die
            Suche oder Filter verfeinern.
          </p>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-gray-300 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={SCHOLAR_TYPE.metaLabel}>Scholar</span>
            <span className={SCHOLAR_TYPE.meta}>by Caelex</span>
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
}: {
  label: string;
  value: string;
  href: string;
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
      <span className="sr-only">entfernen</span>
      <X
        size={13}
        strokeWidth={2}
        aria-hidden={true}
        className="text-gray-500 group-hover:text-gray-900 motion-safe:transition-colors"
      />
    </Link>
  );
}
