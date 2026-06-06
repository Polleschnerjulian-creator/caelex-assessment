import "server-only";
import { getLegalSourceById } from "@/data/legal-sources";

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

export function getScholarSourceDetail(id: string): ScholarSourceDetail | null {
  const s = getLegalSourceById(id);
  if (!s) return null;
  return {
    id: s.id,
    jurisdiction: s.jurisdiction,
    type: s.type,
    status: s.status,
    title: s.title_en,
    titleLocal: s.title_local,
    sourceUrl: s.source_url,
    issuingBody: s.issuing_body,
    scopeDescription: s.scope_description,
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
