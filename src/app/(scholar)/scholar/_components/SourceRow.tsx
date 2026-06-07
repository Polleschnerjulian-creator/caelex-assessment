/**
 * SourceRow — shared row component for legal source results.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * Type sizes come from the shared semantic tokens (SCHOLAR_TYPE / Eyebrow),
 * never ad-hoc text-[Npx]. Relevance is the monochrome RelevanceGlyph.
 *
 * WCAG 2.5.8: py-3.5 gives ≥44px height ✓
 * WCAG 2.4.7: focus-visible ring on the Link ✓
 * WCAG 1.4.3: gray-900 on white ≈ 15:1 ✓; gray-600 on white ≈ 5.7:1 ✓
 * WCAG 1.4.11: relevance is RelevanceGlyph (gray bars + sr-only text) ✓
 */

import Link from "next/link";
import { SCHOLAR_TYPE } from "./scholar-type";
import { Eyebrow } from "./Eyebrow";
import { RelevanceGlyph } from "./RelevanceGlyph";

// ─── Type-label lookup (all pages share this) ────────────────────────
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

// Relevance is rendered by <RelevanceGlyph> (monochrome bars + sr-only text).

export interface SourceRowData {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  officialReference?: string | null;
  relevanceLevel?: string | null;
  scopeDescription?: string | null;
}

interface SourceRowProps {
  source: SourceRowData;
}

export function SourceRow({ source }: SourceRowProps) {
  return (
    <Link
      href={"/scholar/sources/" + encodeURIComponent(source.id)}
      className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-white border border-transparent hover:border-gray-200/70 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
    >
      {/* Relevance — monochrome bars + sr-only label (WCAG 1.4.1 / 1.4.11) */}
      <RelevanceGlyph level={source.relevanceLevel ?? "low"} />

      {/* Type label — shared monochrome eyebrow token (text-micro, gray-500) */}
      <Eyebrow className="w-12 flex-shrink-0">
        {TYPE_LABELS[source.type] ?? source.type}
      </Eyebrow>

      {/* Title + official reference / scope */}
      <div className="flex-1 min-w-0">
        <span className="text-body-lg font-medium text-gray-900 truncate block group-hover:text-black motion-safe:transition-colors">
          {source.title}
        </span>
        {source.officialReference && (
          <span className={`${SCHOLAR_TYPE.meta} truncate block`}>
            {source.officialReference}
          </span>
        )}
        {!source.officialReference && source.scopeDescription && (
          <span className={`${SCHOLAR_TYPE.meta} truncate block`}>
            {source.scopeDescription}
          </span>
        )}
      </div>

      {/* Jurisdiction — meta token, kept bold for the short code */}
      <span className={`${SCHOLAR_TYPE.meta} font-bold flex-shrink-0`}>
        {source.jurisdiction}
      </span>
    </Link>
  );
}
