import type { LegalSource } from "@/data/legal-sources";

export type CitationFormat = "bluebook" | "oscola" | "bibtex" | "apa";

const CITATION_LABELS: Record<CitationFormat, string> = {
  bluebook: "Bluebook (US)",
  oscola: "OSCOLA (UK)",
  apa: "APA",
  bibtex: "BibTeX",
};

function yearOf(iso: string | undefined): string {
  if (!iso) return "n.d.";
  return iso.slice(0, 4);
}

/**
 * H2 (subfinding): title can contain {, }, \, " in BibTeX context which
 * corrupt the .bib file. Strip straight quotes and escape BibTeX-specific
 * characters so the Clipboard output always parses cleanly.
 */
function safeTitle(s: LegalSource): string {
  return s.title_en
    .replace(/[\\{}]/g, "") // drop BibTeX escape/brace chars
    .replace(/"/g, "'");
}

/** Strip characters that would break an OSCOLA bracketed URL. */
function safeUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/[<>\s]/g, "");
}

/**
 * Build a human-readable citation in one of four formats.
 * All formats are rendered client-side from the structured source record —
 * no external service, no API call.
 *
 * M6: `accessedOn` is an explicit argument (defaults to today's UTC date).
 * This way repeated renders of the same <CitationButton> produce the
 * identical string, and call sites can inject a frozen date for tests.
 */
export function formatCitation(
  source: LegalSource,
  format: CitationFormat,
  accessedOn: string = new Date().toISOString().slice(0, 10),
): string {
  const year = yearOf(source.date_enacted);
  const title = safeTitle(source);
  const ref = source.official_reference ?? source.un_reference ?? "";
  const url = safeUrl(source.source_url);
  const body = source.issuing_body;

  switch (format) {
    case "bluebook":
      // Simplified Bluebook Rule 21 style for treaties / legislation
      return `${title}, ${ref ? `${ref}, ` : ""}${year}${url ? `, ${url}` : ""}.`;

    case "oscola":
      // OSCOLA for international instruments & legislation
      return `${title} (${year})${ref ? ` ${ref}` : ""} <${url}> accessed ${accessedOn}.`;

    case "apa":
      return `${body ? `${body}. ` : ""}(${year}). ${title}${ref ? `. ${ref}` : ""}. ${url}`;

    case "bibtex": {
      const key = source.id.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const fields = [
        `  title  = {${title}}`,
        body ? `  author = {${body}}` : "",
        `  year   = {${year}}`,
        ref ? `  note   = {${ref}}` : "",
        url ? `  url    = {${url}}` : "",
        `  urldate = {${accessedOn}}`,
      ]
        .filter(Boolean)
        .join(",\n");
      return `@misc{${key},\n${fields}\n}`;
    }
  }
}

export function citationFormatLabel(f: CitationFormat): string {
  return CITATION_LABELS[f];
}

export const CITATION_FORMATS: CitationFormat[] = [
  "bluebook",
  "oscola",
  "apa",
  "bibtex",
];
