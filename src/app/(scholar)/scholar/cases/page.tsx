/**
 * /scholar/cases — Browse all case law with optional filters.
 *
 * Server Component — corpus read server-side; nothing reaches the bundle.
 * Next.js 15: searchParams is a Promise — await it.
 *
 * WCAG 2.2 AA:
 *   - <main> + <h1>; filter form with labelled <select>s
 *   - Case rows: focus-visible ring, gray-700+ text on white
 *   - lang="de" on root element
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { Scale } from "lucide-react";
import {
  ATLAS_CASES,
  CASES_BY_JURISDICTION,
  CASES_BY_FORUM,
} from "@/data/legal-cases";
import type { CaseForum } from "@/data/legal-cases";
import { getCountryName } from "@/data/iso-3166-countries";

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

// Status labels
const STATUS_LABELS: Record<string, string> = {
  decided: "Entschieden",
  settled: "Vergleich",
  pending: "Ausstehend",
  withdrawn: "Zurückgezogen",
  vacated: "Aufgehoben",
  appeal_pending: "Berufung",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CasesPage({ searchParams }: Props) {
  const sp = await searchParams;

  const jurisdictionFilter =
    typeof sp.jurisdiction === "string" && sp.jurisdiction
      ? sp.jurisdiction.toUpperCase()
      : "";
  const forumFilter = typeof sp.forum === "string" && sp.forum ? sp.forum : "";

  // Derive distinct filter options
  const allJurisdictions = Object.keys(CASES_BY_JURISDICTION).sort((a, b) => {
    if (a === "INT") return -1;
    if (b === "INT") return 1;
    if (a === "EU") return -1;
    if (b === "EU") return 1;
    return getJurisdictionLabel(a).localeCompare(getJurisdictionLabel(b), "de");
  });

  const allForums = Object.keys(CASES_BY_FORUM) as CaseForum[];

  // Apply server-side filters
  const filtered = ATLAS_CASES.filter((c) => {
    if (jurisdictionFilter && c.jurisdiction !== jurisdictionFilter)
      return false;
    if (forumFilter && c.forum !== forumFilter) return false;
    return true;
  });

  return (
    <main lang="de" className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12">
      {/* Page heading */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Scale
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
          Rechtsprechung
        </h1>
        <p className="mt-2 text-[13px] text-gray-600">
          Urteile, Entscheidungen und Durchsetzungsmaßnahmen im Weltraumrecht
        </p>
      </div>

      {/* ─── Filter bar ─── */}
      {/*
        WCAG 1.3.1 / 3.3.2: labelled <select>s.
        WCAG 2.4.7: focus-visible ring.
      */}
      <form
        method="get"
        action="/scholar/cases"
        aria-label="Fälle filtern"
        className="flex flex-wrap items-end gap-4 mb-8 pb-8 border-b border-gray-100"
      >
        {/* Jurisdiction filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="cases-jurisdiction"
            className="text-[10px] font-semibold text-gray-700 tracking-wide uppercase"
          >
            Jurisdiktion
          </label>
          <select
            id="cases-jurisdiction"
            name="jurisdiction"
            defaultValue={jurisdictionFilter}
            className="text-[12px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-[200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] motion-safe:transition-colors hover:border-gray-300"
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
        <div className="flex flex-col gap-1">
          <label
            htmlFor="cases-forum"
            className="text-[10px] font-semibold text-gray-700 tracking-wide uppercase"
          >
            Forum
          </label>
          <select
            id="cases-forum"
            name="forum"
            defaultValue={forumFilter}
            className="text-[12px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-[200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] motion-safe:transition-colors hover:border-gray-300"
          >
            <option value="">Alle Foren</option>
            {allForums.map((f) => (
              <option key={f} value={f}>
                {FORUM_LABELS[f] ?? f}
              </option>
            ))}
          </select>
        </div>

        {/*
          WCAG 2.5.8: button height ≥44px via py-2.5 ✓
        */}
        <button
          type="submit"
          className="text-[12px] font-medium text-white bg-gray-900 hover:bg-gray-700 rounded-lg px-4 py-2.5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
        >
          Filtern
        </button>

        {(jurisdictionFilter || forumFilter) && (
          <Link
            href="/scholar/cases"
            className="text-[11px] text-gray-600 hover:text-gray-900 underline underline-offset-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded py-1"
          >
            Filter zurücksetzen
          </Link>
        )}
      </form>

      {/* Result count */}
      <div className="mb-4" aria-live="polite" aria-atomic="true">
        <span className="text-[11px] text-gray-600">
          {filtered.length} {filtered.length === 1 ? "Fall" : "Fälle"}
          {jurisdictionFilter || forumFilter ? " (gefiltert)" : ""}
        </span>
      </div>

      {/* Cases list */}
      <section aria-labelledby="cases-list-heading">
        <div className="flex items-center gap-2 mb-2">
          <Scale
            size={13}
            className="text-gray-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2
            id="cases-list-heading"
            className="text-[10px] font-semibold text-gray-600 tracking-[0.2em] uppercase"
          >
            Fälle
          </h2>
        </div>

        {filtered.length === 0 ? (
          <p className="text-[13px] text-gray-600 py-8">
            Keine Fälle für die gewählten Filter gefunden.
          </p>
        ) : (
          <ul className="space-y-1" role="list">
            {filtered.map((c) => (
              <li key={c.id}>
                {/*
                  WCAG 2.5.8: py-3.5 gives ≥44px height ✓
                  WCAG 2.4.7: focus-visible ring ✓
                  WCAG 1.4.3: gray-800 on white = 8.6:1 ✓
                */}
                <Link
                  href={`/scholar/cases/${encodeURIComponent(c.id)}`}
                  className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white border border-transparent hover:border-gray-200 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                >
                  {/* Forum label — WCAG 1.4.3: gray-600 on white ≈ 5.7:1 ✓ */}
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 w-16 flex-shrink-0">
                    {FORUM_LABELS[c.forum]?.split(" ")[0] ?? c.forum}
                  </span>

                  {/* Title + parties */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-medium text-gray-800 truncate block group-hover:text-black motion-safe:transition-colors">
                      {c.title}
                    </span>
                    <span className="text-[10px] text-gray-600 truncate block">
                      {c.forum_name}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-[10px] text-gray-600 flex-shrink-0 whitespace-nowrap">
                    {c.date_decided}
                  </span>

                  {/* Status badge */}
                  <span className="text-[9px] font-semibold text-gray-600 bg-gray-100 rounded-md px-2 py-0.5 flex-shrink-0 whitespace-nowrap">
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>

                  {/* Jurisdiction */}
                  <span className="text-[11px] font-bold text-gray-600 flex-shrink-0">
                    {c.jurisdiction}
                  </span>
                </Link>
              </li>
            ))}
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
