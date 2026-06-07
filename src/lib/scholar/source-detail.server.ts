import "server-only";
import { getLegalSourceById, getTranslatedSource } from "@/data/legal-sources";
import { getCasesApplyingSource } from "@/data/legal-cases";

// Mirrors PARAGRAPH_TEXT_CAP in the Atlas korpus engine (IP guardrail: closed-licence
// normative text must never be served verbatim in full). Keep the two in sync.
const PARAGRAPH_TEXT_CAP = 600;
const TRUNCATION_SUFFIX = " […] (truncated — see paragraph_url for full text)";

// Cross-reference fan-out caps (concept §2d). Keeps the "Verwandte Quellen" and
// "Fälle, die diese Quelle anwenden" blocks scannable rather than dumping a long
// tail of weakly-related refs. The richest sources cross-reference a handful of
// instruments; these caps comfortably cover the real data while bounding the UI.
const RELATED_SOURCES_CAP = 12;
const CITING_CASES_CAP = 12;

export interface ScholarProvision {
  section: string;
  title: string;
  summary: string;
  complianceImplication?: string;
  paragraphText?: string;
  paragraphTextTruncated: boolean;
  paragraphUrl?: string;
}

/** Resolved cross-reference to another legal source — enough to render a
 *  link to /scholar/sources/{id} with a title and a small type eyebrow. */
export interface ScholarRelatedSource {
  id: string;
  title: string;
  type: string;
}

/** Resolved reverse-link: a case that applies this source. Enough to render
 *  a link to /scholar/cases/{id} with its caption. */
export interface ScholarCitingCase {
  id: string;
  title: string;
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

  // ─── Phase-3 cross-reference graph (concept §2d) ────────────────────
  // Resolved (not raw-ID) so the reading UI links straight through without
  // a second lookup. Both turn dead-ends into a navigable graph.

  /**
   * Resolved related sources for the cross-reference block: the union of
   * `related_sources` and the legal-basis chain (`amends`, `implements`,
   * `superseded_by`), each resolved to {id,title,type}. De-duped, self
   * excluded, capped. Omitted (undefined) when nothing resolves, so the UI
   * renders the block only when there is something to show.
   */
  resolvedRelatedSources?: ScholarRelatedSource[];

  /**
   * Reverse lookup: cases whose `applied_sources` include this source id,
   * resolved to {id,title}. De-duped, capped. Omitted when none apply.
   */
  citingCases?: ScholarCitingCase[];
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

  // ─── Resolve the cross-reference graph (concept §2d) ────────────────
  // Title for a related source, resolved in the same language as the host
  // document so the cross-ref block reads consistently. "original" keeps the
  // pre-Wave-1 behaviour (title_local → title_en).
  const resolveTitle = (rel: ReturnType<typeof getLegalSourceById>): string => {
    if (!rel) return "";
    return language === "original" || !language
      ? (rel.title_local ?? rel.title_en)
      : getTranslatedSource(rel, lang).title;
  };

  // Related = related_sources ∪ legal-basis chain (amends/implements/
  // superseded_by). Resolve each id, drop self + unresolved + dupes, cap.
  // (amended_by is intentionally left to the dedicated dates/amendment surface;
  // the basis chain here is the "what this is built on / replaced by" trio.)
  const relatedIds: string[] = [
    ...(s.related_sources ?? []),
    ...(s.amends ? [s.amends] : []),
    ...(s.implements ? [s.implements] : []),
    ...(s.superseded_by ? [s.superseded_by] : []),
  ];
  const seenRelated = new Set<string>();
  const resolvedRelatedSources: ScholarRelatedSource[] = [];
  for (const relId of relatedIds) {
    if (relId === s.id || seenRelated.has(relId)) continue;
    seenRelated.add(relId);
    const rel = getLegalSourceById(relId);
    if (!rel) continue; // never invent a link to a non-existent source
    resolvedRelatedSources.push({
      id: rel.id,
      title: resolveTitle(rel),
      type: rel.type,
    });
    if (resolvedRelatedSources.length >= RELATED_SOURCES_CAP) break;
  }

  // Reverse lookup: cases that apply this source. De-dupe by id (corpus is
  // already unique, but be defensive) and cap.
  const seenCases = new Set<string>();
  const citingCases: ScholarCitingCase[] = [];
  for (const c of getCasesApplyingSource(s.id)) {
    if (seenCases.has(c.id)) continue;
    seenCases.add(c.id);
    citingCases.push({ id: c.id, title: c.title });
    if (citingCases.length >= CITING_CASES_CAP) break;
  }

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

    // Phase-3 cross-reference graph: attach only when non-empty so the UI can
    // gate the block on presence (concept §2d — turn dead-ends into a graph).
    resolvedRelatedSources: resolvedRelatedSources.length
      ? resolvedRelatedSources
      : undefined,
    citingCases: citingCases.length ? citingCases : undefined,

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
