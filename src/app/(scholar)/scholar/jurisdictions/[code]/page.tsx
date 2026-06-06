/**
 * /scholar/jurisdictions/[code] — Legal sources for one jurisdiction.
 *
 * Server Component — corpus read server-side; nothing reaches the bundle.
 * Next.js 15: params is a Promise — await it.
 *
 * WCAG 2.2 AA:
 *   - <main> landmark provided by ScholarPage; <h1> via PageHeader
 *   - Source rows rendered via shared SourceRow (focus ring, gray-700+ on white)
 *   - lang="de" on root element (ScholarPage)
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
import { ScholarPage } from "../../_components/ScholarPage";
import { PageHeader } from "../../_components/PageHeader";
import { SourceRow } from "../../_components/SourceRow";
import type { SourceRowData } from "../../_components/SourceRow";

// Special jurisdiction display names not in ISO-3166
const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function getJurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

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
    <ScholarPage>
      {/*
        WCAG 2.5.8: py-1 → ≥24px height ✓
        WCAG 2.4.7: focus-visible ring ✓
        WCAG 1.4.3: gray-700 on #F7F8FA ≈ 7.0:1 ✓
      */}
      <Link
        href="/scholar/jurisdictions"
        className="inline-flex items-center gap-1.5 py-1 mb-6 text-[12px] text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded"
      >
        <ArrowLeft size={13} aria-hidden={true} />
        Zurück zu Jurisdiktionen
      </Link>

      <PageHeader
        eyebrow={code}
        title={label}
        subtitle={`${sources.length} ${sources.length === 1 ? "Rechtsquelle" : "Rechtsquellen"}`}
      />

      {/* Sources section */}
      <section aria-labelledby="sources-heading">
        <div className="flex items-center gap-2 mb-2">
          <Scale
            size={13}
            className="text-gray-500"
            strokeWidth={1.5}
            aria-hidden={true}
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
            const rowData: SourceRowData = {
              id: source.id,
              jurisdiction: source.jurisdiction,
              type: source.type,
              status: source.status,
              title: source.title_en,
              officialReference: source.official_reference ?? null,
              relevanceLevel: source.relevance_level ?? null,
              scopeDescription: source.scope_description ?? null,
            };
            return (
              <li key={source.id}>
                <SourceRow source={rowData} />
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
    </ScholarPage>
  );
}
