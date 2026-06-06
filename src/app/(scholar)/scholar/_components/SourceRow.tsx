/**
 * SourceRow — shared row component for legal source results.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 *
 * WCAG 2.5.8: py-3.5 gives ≥44px height ✓
 * WCAG 2.4.7: focus-visible ring on the Link ✓
 * WCAG 1.4.3: gray-800 on white = 8.6:1 ✓; gray-600 on white ≈ 5.7:1 ✓
 * WCAG 1.4.11: relevance dot is paired with sr-only text ✓
 */

import Link from "next/link";

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

// ─── Relevance dot ───────────────────────────────────────────────────
// WCAG 1.4.11: bg-gray-500 on white = 4.6:1 ✓
const RELEVANCE_DOT: Record<string, { bg: string; label: string }> = {
  fundamental: { bg: "bg-gray-900", label: "Fundamental" },
  critical: { bg: "bg-red-600", label: "Kritisch" },
  high: { bg: "bg-amber-600", label: "Hoch" },
  medium: { bg: "bg-gray-500", label: "Mittel" },
  low: { bg: "bg-gray-400", label: "Niedrig" },
};

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
  const dotInfo = source.relevanceLevel
    ? (RELEVANCE_DOT[source.relevanceLevel] ?? RELEVANCE_DOT.low)
    : RELEVANCE_DOT.low;

  return (
    <Link
      href={"/scholar/sources/" + encodeURIComponent(source.id)}
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white border border-transparent hover:border-gray-200 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
    >
      {/* Relevance dot — WCAG 1.4.11: paired with sr-only text */}
      <span
        className={`h-2 w-2 rounded-full flex-shrink-0 ${dotInfo.bg}`}
        aria-hidden={true}
      />
      <span className="sr-only">Relevanz: {dotInfo.label}</span>

      {/* Type label — WCAG 1.4.3: gray-600 on white ≈ 5.7:1 ✓ */}
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 w-12 flex-shrink-0">
        {TYPE_LABELS[source.type] ?? source.type}
      </span>

      {/* Title + official reference / scope */}
      <div className="flex-1 min-w-0">
        <span className="text-[14px] font-medium text-gray-800 truncate block group-hover:text-black motion-safe:transition-colors">
          {source.title}
        </span>
        {source.officialReference && (
          <span className="text-[10px] text-gray-600 truncate block">
            {source.officialReference}
          </span>
        )}
        {!source.officialReference && source.scopeDescription && (
          <span className="text-[10px] text-gray-600 truncate block">
            {source.scopeDescription}
          </span>
        )}
      </div>

      {/* Jurisdiction */}
      <span className="text-[11px] font-bold text-gray-600 flex-shrink-0">
        {source.jurisdiction}
      </span>
    </Link>
  );
}
