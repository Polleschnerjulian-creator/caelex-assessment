/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Shared helper: resolves a regulatory citation string (e.g.
 * "NIS2 Art. 21(2)(a)", "UK SIA s. 5(1)", "47 CFR § 25.137",
 * "COM(2025) 335 Art. 14") to a primary-source URL.
 *
 * Usage: <OfficialUrlLink url={resolveRegulatoryUrl(articleRef)} title={articleRef} />
 *
 * Pattern-based — deterministic URL construction from the citation string.
 * No database lookup, no network calls, pure function.
 */

/**
 * Extracts article/section/part number from a citation string.
 * Returns the first meaningful numeric token or null.
 */
function extractFirstNumber(s: string): string | null {
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1]! : null;
}

/**
 * Resolve a regulatory-reference string to the primary-source URL on
 * the official publisher. Returns undefined if no match.
 */
export function resolveRegulatoryUrl(citation: string): string | undefined {
  const c = citation.trim();

  // NIS2 Directive (EU) 2022/2555
  if (/^NIS2\s+Art\.?\s+(\d+)/i.test(c)) {
    const n = extractFirstNumber(c);
    return `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_${n}`;
  }

  // EU Space Act (proposal) — COM(2025) 335
  if (/COM\(2025\)\s*335/i.test(c) || /EU\s+Space\s+Act/i.test(c)) {
    return "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335";
  }

  // UK Space Industry Act 2018 — section references
  const ukSiaMatch = c.match(/UK\s+SIA\s+s\.?\s*(\d+)/i);
  if (ukSiaMatch) {
    return `https://www.legislation.gov.uk/ukpga/2018/5/section/${ukSiaMatch[1]}`;
  }
  // Outer Space Act 1986
  if (/OSA\s+1986|Outer\s+Space\s+Act\s+1986/i.test(c)) {
    return "https://www.legislation.gov.uk/ukpga/1986/38/contents";
  }

  // 47 CFR (FCC) § N.N
  const fccMatch = c.match(/47\s*CFR\s*(?:§|Part)\s*(\d+)(?:\.(\d+))?/i);
  if (fccMatch) {
    const part = fccMatch[1];
    const section = fccMatch[2];
    return section
      ? `https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-${part}/section-${part}.${section}`
      : `https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-${part}`;
  }

  // 14 CFR (FAA) Part N / § N.N
  const faaMatch = c.match(/14\s*CFR\s*(?:§|Part)\s*(\d+)/i);
  if (faaMatch) {
    return `https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-${faaMatch[1]}`;
  }

  // 47 USC / 51 USC (US Code)
  const uscMatch = c.match(/(\d+)\s*USC\s*§?\s*(\d+)/i);
  if (uscMatch) {
    return `https://www.law.cornell.edu/uscode/text/${uscMatch[1]}/${uscMatch[2]}`;
  }

  // ITAR (22 CFR 120-130)
  if (/ITAR|22\s*CFR\s*1[2-3]\d/i.test(c)) {
    return "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M";
  }

  // EAR (15 CFR 730-774)
  if (/EAR|15\s*CFR\s*7[3-7]\d/i.test(c)) {
    return "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C";
  }

  // CRA — Cyber Resilience Act
  if (/CRA\b|Cyber\s+Resilience\s+Act/i.test(c)) {
    return "https://eur-lex.europa.eu/eli/reg/2024/2847/oj";
  }

  // GDPR
  if (/GDPR|2016\/679/i.test(c)) {
    return "https://eur-lex.europa.eu/eli/reg/2016/679/oj";
  }

  // Outer Space Treaty 1967
  if (/OST\s+1967|Outer\s+Space\s+Treaty/i.test(c)) {
    return "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html";
  }

  // Liability Convention 1972
  if (/Liability\s+Convention\s+1972|LIAB\s+1972/i.test(c)) {
    return "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html";
  }

  // Registration Convention 1975
  if (/Registration\s+Convention\s+1975|REG\s+1975/i.test(c)) {
    return "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/registration-convention.html";
  }

  // Rescue Agreement 1968
  if (/Rescue\s+Agreement\s+1968/i.test(c)) {
    return "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/rescueagreement.html";
  }

  // IADC Guidelines
  if (/IADC\s+Guidelines/i.test(c)) {
    return "https://www.iadc-home.org/documents_public/view/id/172";
  }

  // ITU Radio Regulations
  if (/ITU\s+RR\b|Radio\s+Regulations/i.test(c)) {
    return "https://www.itu.int/hub/publication/R-REG-RR-2024/";
  }

  return undefined;
}

/**
 * Convenience: returns the citation string wrapped with a URL if available.
 * Useful in cases where callers want a plain {citation, url} pair.
 */
export function linkForCitation(citation: string): {
  citation: string;
  url: string | undefined;
} {
  return { citation, url: resolveRegulatoryUrl(citation) };
}
