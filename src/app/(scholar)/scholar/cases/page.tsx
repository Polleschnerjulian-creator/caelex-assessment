/**
 * /scholar/cases — Browse all case law with optional filters.
 *
 * Server Component — corpus read server-side; nothing reaches the bundle.
 * Next.js 15: searchParams is a Promise — await it.
 *
 * WCAG 2.2 AA:
 *   - <main> landmark provided by ScholarPage; <h1> via PageHeader
 *   - Filter form with labelled <select>s
 *   - Case rows rendered via shared CaseRow (overlap fixed, focus ring)
 *   - lang="de" on root element (ScholarPage)
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
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { CaseRow } from "../_components/CaseRow";
import type { CaseRowData } from "../_components/CaseRow";

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
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title="Rechtsprechung"
        subtitle="Urteile, Entscheidungen und Durchsetzungsmaßnahmen im Weltraumrecht"
        icon={Scale}
      />

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
            className="text-[12px] font-semibold text-gray-700 tracking-[-0.01em]"
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
            className="text-[12px] font-semibold text-gray-700 tracking-[-0.01em]"
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
            aria-hidden={true}
          />
          <h2
            id="cases-list-heading"
            className="text-[12px] font-semibold text-gray-500 tracking-[-0.01em]"
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
            {filtered.map((c) => {
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
