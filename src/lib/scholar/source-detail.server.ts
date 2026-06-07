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
