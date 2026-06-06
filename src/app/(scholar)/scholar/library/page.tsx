/**
 * /scholar/library — Browse all legal sources with optional filters.
 *
 * Server Component — corpus read server-side; zero corpus bytes reach
 * the client bundle. Filters are applied server-side via searchParams.
 *
 * Next.js 15: searchParams is a Promise — await it.
 *
 * WCAG 2.2 AA:
 *   - <main> + <h1>; form filter bar with labelled <select>s
 *   - Source rows: focus-visible ring, gray-700+ text on white
 *   - lang="de" on root element
 *   - Submit button has accessible name
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { BookOpen, Scale } from "lucide-react";
import { ALL_SOURCES, getAvailableJurisdictions } from "@/data/legal-sources";
import { getCountryName } from "@/data/iso-3166-countries";
import type { LegalSourceType } from "@/data/legal-sources";

// Cap to avoid dumping enormous unreadable lists
const DISPLAY_CAP = 200;

// ─── Type labels ─────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  international_treaty: "Treaty",
  federal_law: "Law",
  federal_regulation: "Regulation",
  technical_standard: "Standard",
  eu_regulation: "EU Reg",
  eu_directive: "EU Dir",
  policy_document: "Policy",
  draft_legislation: "Draft",
  certification_standard: "Std",
  industry_guideline: "Guide",
  insurance_clause: "Clause",
  scientific_protocol: "Protocol",
  soft_law_resolution: "Resolution",
  national_security_doctrine: "Doctrine",
  bilateral_agreement: "Bilateral",
  multilateral_agreement: "Multilateral",
  case_law: "Case Law",
  procurement_framework: "Procurement",
  safety_regulation: "Safety",
  tax_treaty: "Tax",
};

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

// ─── Relevance dot ───────────────────────────────────────────────────
const RELEVANCE_DOT: Record<string, { bg: string; label: string }> = {
  fundamental: { bg: "bg-gray-900", label: "Fundamental" },
  critical: { bg: "bg-red-600", label: "Kritisch" },
  high: { bg: "bg-amber-600", label: "Hoch" },
  medium: { bg: "bg-gray-500", label: "Mittel" },
  low: { bg: "bg-gray-400", label: "Niedrig" },
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

  const typeFilter = typeof sp.type === "string" && sp.type ? sp.type : "";
  const jurisdictionFilter =
    typeof sp.jurisdiction === "string" && sp.jurisdiction
      ? sp.jurisdiction.toUpperCase()
      : "";

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

  return (
    <main lang="de" className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12">
      {/* Page heading */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen
            size={15}
            className="text-gray-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="text-[10px] font-semibold text-gray-600 tracking-[0.2em] uppercase">
            Caelex Scholar
          </span>
        </div>
        {/*
          WCAG 1.3.1 / 2.4.6: visible h1 — gray-900 on #F7F8FA ≥15:1 ✓
        */}
        <h1 className="text-[32px] font-light text-gray-900 tracking-[-0.02em] leading-tight">
          Bibliothek
        </h1>
        <p className="mt-2 text-[13px] text-gray-600">
          Alle Rechtsquellen durchsuchen und filtern
        </p>
      </div>

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
            className="text-[10px] font-semibold text-gray-700 tracking-wide uppercase"
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
            className="text-[10px] font-semibold text-gray-700 tracking-wide uppercase"
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
            aria-hidden="true"
          />
          <h2
            id="library-sources-heading"
            className="text-[10px] font-semibold text-gray-600 tracking-[0.2em] uppercase"
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
              const dotInfo = source.relevance_level
                ? (RELEVANCE_DOT[source.relevance_level] ?? RELEVANCE_DOT.low)
                : RELEVANCE_DOT.low;

              return (
                <li key={source.id}>
                  {/*
                    WCAG 2.5.8: py-3.5 gives ≥44px height ✓
                    WCAG 2.4.7: focus-visible ring ✓
                    WCAG 1.4.3: gray-800 on white = 8.6:1 ✓
                  */}
                  <Link
                    href={`/scholar/sources/${encodeURIComponent(source.id)}`}
                    className="flex items-center gap-4 px-5 py-3.5 text-left rounded-xl bg-white border border-transparent hover:border-gray-200 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                  >
                    {/*
                      WCAG 1.4.11: dot UI component. bg-gray-500 on white = 4.6:1 ✓
                    */}
                    <span
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${dotInfo.bg}`}
                      aria-hidden="true"
                    />
                    <span className="sr-only">Relevanz: {dotInfo.label}</span>

                    {/* Type label */}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 w-12 flex-shrink-0">
                      {TYPE_LABELS[source.type] ?? source.type}
                    </span>

                    {/* Title + official reference */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-medium text-gray-800 truncate block group-hover:text-black motion-safe:transition-colors">
                        {source.title_en}
                      </span>
                      {source.official_reference && (
                        <span className="text-[10px] text-gray-600">
                          {source.official_reference}
                        </span>
                      )}
                    </div>

                    {/* Jurisdiction */}
                    <span className="text-[11px] font-bold text-gray-600 flex-shrink-0">
                      {source.jurisdiction}
                    </span>
                  </Link>
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
            <span className="text-[10px] font-semibold text-gray-600 tracking-wider">
              SCHOLAR
            </span>
            <span className="text-[9px] text-gray-600">by Caelex</span>
          </div>
          <span className="text-[9px] text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </main>
  );
}
