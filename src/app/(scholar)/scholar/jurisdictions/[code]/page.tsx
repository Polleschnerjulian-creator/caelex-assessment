/**
 * /scholar/jurisdictions/[code] — Legal sources for one jurisdiction.
 *
 * Server Component — corpus read server-side; nothing reaches the bundle.
 * Next.js 15: params is a Promise — await it.
 *
 * WCAG 2.2 AA:
 *   - <main> + <h1>; logical heading structure
 *   - Source rows: focus-visible ring, gray-700+ text on white
 *   - lang="de" on root element
 *   - Back link has py-1 for ≥24px target
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import {
  getAvailableJurisdictions,
  getLegalSourcesByJurisdiction,
} from "@/data/legal-sources";
import { getCountryName } from "@/data/iso-3166-countries";

// Special jurisdiction display names not in ISO-3166
const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function getJurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

// ─── Type labels (matches search page) ──────────────────────────────
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

// ─── Relevance dot ───────────────────────────────────────────────────
// WCAG 1.4.11: ≥3:1 for UI components conveying information.
const RELEVANCE_DOT: Record<string, { bg: string; label: string }> = {
  fundamental: { bg: "bg-gray-900", label: "Fundamental" },
  critical: { bg: "bg-red-600", label: "Kritisch" },
  high: { bg: "bg-amber-600", label: "Hoch" },
  medium: { bg: "bg-gray-500", label: "Mittel" },
  low: { bg: "bg-gray-400", label: "Niedrig" },
};

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JurisdictionDetailPage({ params }: Props) {
  // Next.js 15: params is a Promise
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  // Validate that this code is in our corpus
  const validCodes = getAvailableJurisdictions();
  if (!validCodes.includes(code)) {
    notFound();
  }

  const sources = getLegalSourcesByJurisdiction(code);
  if (sources.length === 0) {
    notFound();
  }

  const label = getJurisdictionLabel(code);

  return (
    <main lang="de" className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12">
      {/* Back link
          WCAG 2.5.8: py-1 gives ≥24px height ✓
          WCAG 2.4.7: focus-visible ring ✓
          WCAG 1.4.3: gray-700 on #F7F8FA ≈ 7.0:1 ✓
      */}
      <Link
        href="/scholar/jurisdictions"
        className="inline-flex items-center gap-1.5 py-1 mb-8 text-[12px] text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Zurück zu Jurisdiktionen
      </Link>

      {/* Page heading */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
            {code}
          </span>
        </div>
        {/*
          WCAG 1.3.1: h1 = country name. gray-900 on #F7F8FA ≥15:1 ✓
        */}
        <h1 className="text-[32px] font-light text-gray-900 tracking-[-0.02em] leading-tight">
          {label}
        </h1>
        {/* WCAG 1.4.3: gray-600 on #F7F8FA ≈ 6.0:1 ✓ */}
        <p className="mt-2 text-[13px] text-gray-600">
          {sources.length}{" "}
          {sources.length === 1 ? "Rechtsquelle" : "Rechtsquellen"}
        </p>
      </div>

      {/* Sources section */}
      <section aria-labelledby="sources-heading">
        <div className="flex items-center gap-2 mb-2">
          <Scale
            size={13}
            className="text-gray-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {/* WCAG 1.3.1: h2 for section heading */}
          <h2
            id="sources-heading"
            className="text-[10px] font-semibold text-gray-600 tracking-[0.2em] uppercase"
          >
            Rechtsquellen
          </h2>
        </div>

        {/* WCAG 1.3.1: list semantics for result items */}
        <ul className="space-y-1" role="list">
          {sources.map((source) => {
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
                    WCAG 1.4.11: relevance dot. bg-gray-500 on white = 4.6:1 ✓
                    Paired with sr-only text.
                  */}
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${dotInfo.bg}`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">Relevanz: {dotInfo.label}</span>

                  {/* Type label — WCAG 1.4.3: gray-600 on white ≈ 5.7:1 ✓ */}
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 w-12 flex-shrink-0">
                    {TYPE_LABELS[source.type] ?? source.type}
                  </span>

                  {/* Title + official reference */}
                  <div className="flex-1 min-w-0">
                    {/* WCAG 1.4.3: gray-800 on white = 8.6:1 ✓ */}
                    <span className="text-[14px] font-medium text-gray-800 truncate block group-hover:text-black motion-safe:transition-colors">
                      {source.title_en}
                    </span>
                    {source.official_reference && (
                      // WCAG 1.4.3: gray-600 on white ≈ 5.7:1 ✓
                      <span className="text-[10px] text-gray-600">
                        {source.official_reference}
                      </span>
                    )}
                  </div>

                  {/* Jurisdiction badge — shown when source comes from INT/EU */}
                  {source.jurisdiction !== code && (
                    <span className="text-[11px] font-bold text-gray-600 flex-shrink-0">
                      {source.jurisdiction}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
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
