import "server-only";
import { getLegalSourceById, getTranslatedSource } from "@/data/legal-sources";

// Mirrors PARAGRAPH_TEXT_CAP in the Atlas korpus engine (IP guardrail: closed-licence
// normative text must never be served verbatim in full). Keep the two in sync.
const PARAGRAPH_TEXT_CAP = 600;
const TRUNCATION_SUFFIX = " […] (truncated — see paragraph_url for full text)";

export interface ScholarProvision {
  section: string;
  title: string;
  summary: string;
  complianceImplication?: string;
  paragraphText?: string;
  paragraphTextTruncated: boolean;
  paragraphUrl?: string;
}

export interface ScholarSourceDetail {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  titleLocal?: string;
  sourceUrl?: string;
  issuingBody?: string;
  scopeDescription?: string;
  keyProvisions: ScholarProvision[];

  // ─── Wave-2 corpus enrichment (projection-only, no DB) ──────────────
  // All optional: omitted when the underlying LegalSource doesn't carry
  // the field, so the reading UI can render-when-present without nulls.

  /** ISO date the instrument was enacted/adopted. */
  dateEnacted?: string;
  /** ISO date the instrument entered into force / commenced. */
  dateInForce?: string;
  /** ISO date of the most recent amendment. */
  dateLastAmended?: string;

  /** Competent authorities responsible for this instrument. */
  competentAuthorities?: string[];

  /** Official gazette / consolidated-text reference (BGBl., OJ, CFR…). */
  officialReference?: string;
  /** Parliamentary / procedure reference (BT-Drucksache, COM doc…). */
  parliamentaryReference?: string;
  /** UN-document reference (A/RES/…, treaty registration). */
  unReference?: string;

  /** ISO date the corpus record was last human-verified. */
  lastVerified?: string;

  /** ISO-alpha-2 codes of jurisdictions party to / bound by this source. */
  appliesToJurisdictions?: string[];
  /** ISO-alpha-2 codes of signatory-only jurisdictions. */
  signedByJurisdictions?: string[];

  /** Raw related-source IDs (thin refs; UI resolves on demand). */
  relatedSources?: string[];
  /** Raw ID of the instrument this source amends. */
  amends?: string;
  /** Raw IDs of instruments that amend this source. */
  amendedBy?: string[];
  /** Raw ID of the parent instrument this source implements/transposes. */
  implements?: string;
  /** Raw ID of the successor instrument that superseded this source. */
  supersededBy?: string;

  /**
   * Coarse "how does this bind?" hint derived from `type` — lets the UI
   * render a type band without re-deriving the mapping. Undefined when
   * the type has no obvious applicability band.
   */
  appliesToType?: string;
}

/**
 * Coarse applicability hint derived from a LegalSource.type. Projection-
 * only sugar for the reading UI; returns undefined for types without an
 * obvious "how does it bind" story (the UI then shows no band).
 */
function deriveAppliesToType(type: string): string | undefined {
  switch (type) {
    case "eu_regulation":
      return "directly-applicable";
    case "eu_directive":
      return "needs-transposition";
    case "international_treaty":
      return "treaty-binds-parties";
    case "federal_law":
    case "federal_regulation":
      return "national-binding";
    case "draft_legislation":
      return "not-yet-in-force";
    default:
      return undefined;
  }
}

/**
 * Fetch full source detail, optionally translated.
 *
 * @param id       - Legal source ID (e.g. "DE-SATDSIG-2007")
 * @param language - User's sourceLanguage preference: "original" | "de" | "fr" | "en".
 *                   "original" means no translation is applied (title_en / title_local
 *                   are surfaced as-is, matching the pre-Wave-1 behaviour).
 *                   Any other value is forwarded to getTranslatedSource which resolves
 *                   the translation registry and falls back gracefully.
 */
export function getScholarSourceDetail(
  id: string,
  language?: string,
): ScholarSourceDetail | null {
  const s = getLegalSourceById(id);
  if (!s) return null;

  // Resolve display language. "original" and undefined both mean "no translation".
  const lang = language && language !== "original" ? language : "en";
  const translated = getTranslatedSource(s, lang);

  return {
    id: s.id,
    jurisdiction: s.jurisdiction,
    type: s.type,
    status: s.status,
    // When language == "original" we fall back to title_local (if set) then title_en,
    // matching the original behaviour. Otherwise use the resolved translation title.
    title:
      language === "original" || !language
        ? (s.title_local ?? s.title_en)
        : translated.title,
    titleLocal: s.title_local,
    sourceUrl: s.source_url,
    issuingBody: s.issuing_body,
    scopeDescription: translated.scopeDescription ?? s.scope_description,

    // ─── Wave-2 enrichment: surface rich corpus fields when present.
    // Each is passed through verbatim (no translation) and stays
    // undefined when the source omits it, so the projection never
    // invents data. Arrays are only attached when non-empty.
    dateEnacted: s.date_enacted,
    dateInForce: s.date_in_force,
    dateLastAmended: s.date_last_amended,
    competentAuthorities: s.competent_authorities?.length
      ? s.competent_authorities
      : undefined,
    officialReference: s.official_reference,
    parliamentaryReference: s.parliamentary_reference,
    unReference: s.un_reference,
    lastVerified: s.last_verified,
    appliesToJurisdictions: s.applies_to_jurisdictions?.length
      ? s.applies_to_jurisdictions
      : undefined,
    signedByJurisdictions: s.signed_by_jurisdictions?.length
      ? s.signed_by_jurisdictions
      : undefined,
    relatedSources: s.related_sources?.length ? s.related_sources : undefined,
    amends: s.amends,
    amendedBy: s.amended_by?.length ? s.amended_by : undefined,
    implements: s.implements,
    supersededBy: s.superseded_by,
    appliesToType: deriveAppliesToType(s.type),

    keyProvisions: s.key_provisions.map((p) => {
      const full = p.paragraph_text;
      const truncated = !!full && full.length > PARAGRAPH_TEXT_CAP;
      return {
        section: p.section,
        title: p.title,
        summary: p.summary,
        complianceImplication: p.complianceImplication,
        paragraphText: truncated
          ? full!.slice(0, PARAGRAPH_TEXT_CAP).trimEnd() + TRUNCATION_SUFFIX
          : full,
        paragraphTextTruncated: truncated,
        paragraphUrl: p.paragraph_url,
      };
    }),
  };
}
