/**
 * /scholar/library — Browse all legal sources with optional filters.
 *
 * Server Component — corpus read server-side; zero corpus bytes reach
 * the client bundle. Filters are applied server-side via searchParams.
 *
 * Next.js 15: searchParams is a Promise — await it.
 *
 * WCAG 2.2 AA:
 *   - <main> landmark provided by ScholarPage; <h1> via PageHeader
 *   - Filter form with labelled <select>s
 *   - Source rows rendered via shared SourceRow (focus ring, gray-700+ on white)
 *   - lang="de" on root element (ScholarPage)
 *   - Submit button has accessible name
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { BookOpen, Scale } from "lucide-react";
import {
  ALL_SOURCES,
  getAvailableJurisdictions,
  getTranslatedSource,
} from "@/data/legal-sources";
import { getCountryName } from "@/data/iso-3166-countries";
import type { LegalSourceType } from "@/data/legal-sources";
import { auth } from "@/lib/auth";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { SourceRow } from "../_components/SourceRow";
import type { SourceRowData } from "../_components/SourceRow";

// Hard upper cap — safety rail regardless of user pref.
const HARD_CAP = 200;

// Human-readable type labels for the filter <select>
const TYPE_DISPLAY_NAMES: Record<string, string> = {
  international_treaty: "Internationaler Vertrag",
  federal_law: "Bundesgesetz",
  federal_regulation: "Bundesverordnung",
  technical_standard: "Technischer Standard",
  eu_regulation: "EU-Verordnung",
  eu_directive: "EU-Richtlinie",
  policy_document: "Politikdokument",
  draft_legislation: "Gesetzentwurf",
  certification_standard: "Zertifizierungsstandard",
  industry_guideline: "Branchenrichtlinie",
  insurance_clause: "Versicherungsklausel",
  scientific_protocol: "Wissenschaftliches Protokoll",
  soft_law_resolution: "Soft-Law-Resolution",
  national_security_doctrine: "Nationale Sicherheitsdoktrin",
  bilateral_agreement: "Bilaterales Abkommen",
  multilateral_agreement: "Multilaterales Abkommen",
  case_law: "Rechtsprechung",
  procurement_framework: "Beschaffungsrahmen",
  safety_regulation: "Sicherheitsvorschrift",
  tax_treaty: "Doppelbesteuerungsabkommen",
};

// Special jurisdiction display names not in ISO-3166
const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function getJurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LibraryPage({ searchParams }: Props) {
  // Next.js 15: searchParams is a Promise
  const sp = await searchParams;

  // Load user preferences for default jurisdiction + results-per-page cap.
  // Falls back gracefully when unauthenticated (layout redirects, but be safe).
  const session = await auth();
  const prefs = session?.user?.id
    ? await getScholarPreferences(session.user.id)
    : null;

  const typeFilter = typeof sp.type === "string" && sp.type ? sp.type : "";

  // URL param takes precedence; fall back to saved defaultJurisdiction pref.
  const rawJurisdiction =
    typeof sp.jurisdiction === "string" && sp.jurisdiction
      ? sp.jurisdiction.toUpperCase()
      : (prefs?.defaultJurisdiction?.toUpperCase() ?? "");
  const jurisdictionFilter = rawJurisdiction;

  // Effective results-per-page: URL ?limit param > saved pref > default 20.
  const prefLimit = prefs?.resultsPerPage ?? 20;
  const urlLimit = typeof sp.limit === "string" ? parseInt(sp.limit, 10) : NaN;
  const DISPLAY_CAP = Math.min(
    HARD_CAP,
    isNaN(urlLimit) ? prefLimit : urlLimit,
  );

  // Derive distinct filter options from the full corpus (sorted alphabetically)
  const allTypes = Array.from(
    new Set(ALL_SOURCES.map((s) => s.type)),
  ).sort() as LegalSourceType[];

  // Use getAvailableJurisdictions() for the ordered list of valid codes
  const allCodes = getAvailableJurisdictions().sort((a, b) => {
    if (a === "INT") return -1;
    if (b === "INT") return 1;
    if (a === "EU") return -1;
    if (b === "EU") return 1;
    return getJurisdictionLabel(a).localeCompare(getJurisdictionLabel(b), "de");
  });

  // Apply server-side filters
  const filtered = ALL_SOURCES.filter((s) => {
    if (typeFilter && s.type !== typeFilter) return false;
    if (jurisdictionFilter && s.jurisdiction !== jurisdictionFilter)
      return false;
    return true;
  });

  const totalCount = filtered.length;
  const capped = filtered.slice(0, DISPLAY_CAP);
  const isCapped = totalCount > DISPLAY_CAP;

  // Resolve display language for source titles.
  // "original" → no translation overlay (title_local ?? title_en).
  const sourceLanguage = prefs?.sourceLanguage ?? "original";
  const displayLang = sourceLanguage === "original" ? "en" : sourceLanguage;

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title="Bibliothek"
        subtitle="Alle Rechtsquellen durchsuchen und filtern"
        icon={BookOpen}
      />

      {/* ─── Filter bar (accessible form, GET method) ─── */}
      {/*
        WCAG 1.3.1 / 3.3.2: each <select> has an associated <label>.
        WCAG 2.4.7: focus-visible ring on selects and button.
      */}
      <form
        method="get"
        action="/scholar/library"
        aria-label="Rechtsquellen filtern"
        className="flex flex-wrap items-end gap-4 mb-8 pb-8 border-b border-gray-100"
      >
        {/* Type filter */}
        <div className="flex flex-col gap-1">
          {/*
            WCAG 1.4.3: label text gray-700 on #F7F8FA ≈ 7.0:1 ✓
          */}
          <label
            htmlFor="library-type"
            className="text-[12px] font-semibold text-gray-700 tracking-[-0.01em]"
          >
            Quellentyp
          </label>
          <select
            id="library-type"
            name="type"
            defaultValue={typeFilter}
            className="text-[12px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-[180px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] motion-safe:transition-colors hover:border-gray-300"
          >
            <option value="">Alle Typen</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>
                {TYPE_DISPLAY_NAMES[t] ?? t}
              </option>
            ))}
          </select>
        </div>

        {/* Jurisdiction filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="library-jurisdiction"
            className="text-[12px] font-semibold text-gray-700 tracking-[-0.01em]"
          >
            Jurisdiktion
          </label>
          <select
            id="library-jurisdiction"
            name="jurisdiction"
            defaultValue={jurisdictionFilter}
            className="text-[12px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-[200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] motion-safe:transition-colors hover:border-gray-300"
          >
            <option value="">Alle Jurisdiktionen</option>
            {allCodes.map((code) => (
              <option key={code} value={code}>
                {code} — {getJurisdictionLabel(code)}
              </option>
            ))}
          </select>
        </div>

        {/*
          WCAG 2.5.8: button height ≥44px via py-2.5 ✓
          WCAG 2.4.7: focus-visible ring ✓
          Accessible name provided by button text content.
        */}
        <button
          type="submit"
          className="text-[12px] font-medium text-white bg-gray-900 hover:bg-gray-700 rounded-lg px-4 py-2.5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
        >
          Filtern
        </button>

        {/* Clear filters link — only shown when a filter is active */}
        {(typeFilter || jurisdictionFilter) && (
          <Link
            href="/scholar/library"
            className="text-[11px] text-gray-600 hover:text-gray-900 underline underline-offset-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded py-1"
          >
            Filter zurücksetzen
          </Link>
        )}
      </form>

      {/* Result count */}
      <div
        className="flex items-center gap-3 mb-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="text-[11px] text-gray-600">
          {totalCount} {totalCount === 1 ? "Quelle" : "Quellen"}
          {typeFilter || jurisdictionFilter ? " (gefiltert)" : ""}
        </span>
        {isCapped && (
          <span className="text-[10px] text-gray-500">
            — Es werden die ersten {DISPLAY_CAP} angezeigt. Bitte Filter
            verwenden.
          </span>
        )}
      </div>

      {/* Sources list */}
      <section aria-labelledby="library-sources-heading">
        <div className="flex items-center gap-2 mb-2">
          <Scale
            size={13}
            className="text-gray-500"
            strokeWidth={1.5}
            aria-hidden={true}
          />
          <h2
            id="library-sources-heading"
            className="text-[12px] font-semibold text-gray-500 tracking-[-0.01em]"
          >
            Rechtsquellen
          </h2>
        </div>

        {capped.length === 0 ? (
          <p className="text-[13px] text-gray-600 py-8">
            Keine Quellen für die gewählten Filter gefunden.
          </p>
        ) : (
          <ul className="space-y-1" role="list">
            {capped.map((source) => {
              // Apply source-language translation if user opted in.
              // When sourceLanguage == "original", use title_local (if set)
              // then title_en — preserving pre-Wave-1 behaviour.
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
                  <SourceRow source={rowData} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-gray-100 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-600 tracking-[-0.01em]">
              Scholar
            </span>
            <span className="text-[9px] text-gray-600">by Caelex</span>
          </div>
          <span className="text-[9px] text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}
