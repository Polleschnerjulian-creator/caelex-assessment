export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "num"; items: string[] }
  | { type: "callout"; variant: "warn" | "info"; text: string }
  | { type: "definition"; term: string; text: string };

export interface LegalSection {
  id: string;
  number: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  lang: "de" | "en";
  title: string;
  subtitle: string;
  version: string;
  effectiveDate: string;
  legalEntity: string;
  preamble?: string[];
  sections: LegalSection[];
  annexes: LegalSection[];
  contactLines: string[];
  links: { label: string; href: string }[];
}
