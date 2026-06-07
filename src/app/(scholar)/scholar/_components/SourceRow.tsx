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
import { DEFAULT_SCHOLAR_LOCALE, t, type ScholarLocale } from "../_i18n/core";
import { SOURCE } from "../_i18n/source";
import { SCHOLAR_TYPE } from "./scholar-type";
import { Eyebrow } from "./Eyebrow";
import { RelevanceGlyph } from "./RelevanceGlyph";

// ─── Type → SOURCE-namespace short-label key (all pages share this) ──
const TYPE_LABEL_KEYS: Record<string, keyof (typeof SOURCE)["en"]> = {
  international_treaty: "rowTypeInternationalTreaty",
  federal_law: "rowTypeFederalLaw",
  federal_regulation: "rowTypeFederalRegulation",
  technical_standard: "rowTypeTechnicalStandard",
  eu_regulation: "rowTypeEuRegulation",
  eu_directive: "rowTypeEuDirective",
  policy_document: "rowTypePolicyDocument",
  draft_legislation: "rowTypeDraftLegislation",
  certification_standard: "rowTypeCertificationStandard",
  industry_guideline: "rowTypeIndustryGuideline",
  insurance_clause: "rowTypeInsuranceClause",
  scientific_protocol: "rowTypeScientificProtocol",
  soft_law_resolution: "rowTypeSoftLawResolution",
  national_security_doctrine: "rowTypeNationalSecurityDoctrine",
  bilateral_agreement: "rowTypeBilateralAgreement",
  multilateral_agreement: "rowTypeMultilateralAgreement",
  case_law: "rowTypeCaseLaw",
  procurement_framework: "rowTypeProcurementFramework",
  safety_regulation: "rowTypeSafetyRegulation",
  tax_treaty: "rowTypeTaxTreaty",
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
  locale?: ScholarLocale;
}

export function SourceRow({
  source,
  locale = DEFAULT_SCHOLAR_LOCALE,
}: SourceRowProps) {
  const typeKey = TYPE_LABEL_KEYS[source.type];
  const typeLabel = typeKey ? t(locale, SOURCE, typeKey) : source.type;

  return (
    <Link
      href={"/scholar/sources/" + encodeURIComponent(source.id)}
      className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-white border border-transparent hover:border-gray-200/70 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
    >
      {/* Relevance — monochrome bars + sr-only label (WCAG 1.4.1 / 1.4.11) */}
      <RelevanceGlyph level={source.relevanceLevel ?? "low"} locale={locale} />

      {/* Type label — shared monochrome eyebrow token (text-micro, gray-500) */}
      <Eyebrow className="w-12 flex-shrink-0">{typeLabel}</Eyebrow>

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
