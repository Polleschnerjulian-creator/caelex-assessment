/**
 * Atlas Drafting — Authority Template Adapter (Bundle 37, B2).
 *
 * The same authorization application reads very differently depending
 * on which authority receives it:
 *   - BNetzA (DE): formal German, footnotes with paragraph references,
 *     "Sehr geehrte Damen und Herren" salutation block.
 *   - ARCEP (FR): structured "décision" sections, numbered articles.
 *   - Ofcom (UK): conversational English, "Schedule" appendices.
 *   - FCC (US): very formal American legal style, Part references.
 *   - LSA (LU): English/French bilingual courtesy, ESA-aligned terms.
 *
 * Without an authority adapter, Marie has to manually rewrite every
 * generated draft to match the target authority's house style. With
 * one, she picks the authority from a dropdown and the prompt gets a
 * targeted formatting directive appended at dispatch time.
 *
 * Stage-2 (Bundle 41+): per-authority fact patterns (BNetzA wants the
 * applicant's HRB number AND VAT-ID, FCC wants the FRN, etc.) — for
 * now this module is just the styling layer.
 */

export interface AuthorityTemplate {
  id: string;
  /** Display name. */
  name: string;
  /** Country / jurisdiction (matches OPERATOR_LABELS jurisdictions where possible). */
  jurisdiction: string;
  /** What the authority regulates — surfaces in the picker subtitle. */
  scope: { de: string; en: string };
  /** Output-language directive. The model will use this language for the
   *  generated text. Some authorities accept English even when based in
   *  a non-English-speaking country (e.g. LSA). */
  preferredLanguage: "de" | "en" | "fr";
  /** Per-locale formatting directive appended to the prompt. */
  directive: { de: string; en: string };
}

export const AUTHORITY_TEMPLATES: AuthorityTemplate[] = [
  {
    id: "bnetza-de",
    name: "Bundesnetzagentur (BNetzA)",
    jurisdiction: "DE",
    scope: {
      de: "Frequenzzuteilung, Funkanlagen, Telekommunikation",
      en: "Frequency assignments, radio equipment, telecommunications",
    },
    preferredLanguage: "de",
    directive: {
      de: 'Formatiere für eine BNetzA-Einreichung: deutscher Text in formaler Behördensprache; jeder Abschnitt mit nummerierter Überschrift im Format "1.", "1.1", "1.1.1"; Verweise auf Rechtsgrundlagen als Fußnoten am Seitenende mit § / Art.-Bezug (z. B. ¹ § 6 Abs. 1 Satz 2 TKG); Anrede-Block "Bundesnetzagentur, Tulpenfeld 4, 53113 Bonn"; Aktenzeichen-Platzhalter [BNetzA-AKZ] oben rechts.',
      en: "Format for a BNetzA filing: formal German bureaucratic register; numbered headings 1., 1.1, 1.1.1; legal-basis citations as footer footnotes with § / Art. references (e.g. ¹ § 6 Abs. 1 Satz 2 TKG); addressee block 'Bundesnetzagentur, Tulpenfeld 4, 53113 Bonn'; reference-number placeholder [BNetzA-AKZ] in top-right.",
    },
  },
  {
    id: "arcep-fr",
    name: "ARCEP",
    jurisdiction: "FR",
    scope: {
      de: "Frequenzen, elektronische Kommunikation",
      en: "Frequencies, electronic communications",
    },
    preferredLanguage: "fr",
    directive: {
      de: 'Formatiere für eine ARCEP-Einreichung: französischer Text in administrativem Stil; Struktur als nummerierte Artikel ("Article 1", "Article 2"); Verweise auf das CPCE als "art. L.32 CPCE"; Anrede "Madame, Monsieur" und Schlussformel "Je vous prie d\'agréer..."; Adressblock "ARCEP, 14 rue Gerty Archimède, 75012 Paris".',
      en: 'Format for an ARCEP filing: French administrative register; structured as numbered articles ("Article 1", "Article 2"); CPCE references as "art. L.32 CPCE"; salutation "Madame, Monsieur" and closing "Je vous prie d\'agréer..."; addressee block "ARCEP, 14 rue Gerty Archimède, 75012 Paris".',
    },
  },
  {
    id: "ofcom-uk",
    name: "Ofcom",
    jurisdiction: "UK",
    scope: {
      de: "Spektrum, Telekommunikation, Rundfunk (UK)",
      en: "Spectrum, telecommunications, broadcasting (UK)",
    },
    preferredLanguage: "en",
    directive: {
      de: 'Formatiere für ein Ofcom-Filing: britisch-englischer Text in business-formal style; Hauptabschnitte als nummerierte Sektionen, Anhänge als "Schedule 1", "Schedule 2"; Verweise auf den Wireless Telegraphy Act 2006 als "WTA 2006, s. 8"; Anrede "Dear Sir/Madam"; Adressblock "Ofcom, Riverside House, 2A Southwark Bridge Road, London SE1 9HA".',
      en: 'Format for an Ofcom filing: British-English business-formal style; main sections as numbered sections, annexes as "Schedule 1", "Schedule 2"; Wireless Telegraphy Act 2006 cites as "WTA 2006, s. 8"; salutation "Dear Sir/Madam"; addressee block "Ofcom, Riverside House, 2A Southwark Bridge Road, London SE1 9HA".',
    },
  },
  {
    id: "lsa-lu",
    name: "Luxembourg Space Agency (LSA)",
    jurisdiction: "LU",
    scope: {
      de: "Weltraumaktivitäten Luxemburg, Weltraumressourcen-Gesetz",
      en: "Luxembourg space activities, Space Resources Act",
    },
    preferredLanguage: "en",
    directive: {
      de: 'Formatiere für ein LSA-Filing: englischer Text mit ESA-/UN-COPUOS-Terminologie; Querverweise auf das Loi du 20 juillet 2017 sur l\'exploration et l\'utilisation des ressources de l\'espace; Anhänge mit "Annex A, Annex B"; Adressblock "Luxembourg Space Agency, 19-21 Boulevard Royal, L-2449 Luxembourg".',
      en: "Format for an LSA filing: English with ESA / UN-COPUOS terminology; cross-references to the Loi du 20 juillet 2017 sur l'exploration et l'utilisation des ressources de l'espace; appendices as 'Annex A, Annex B'; addressee block 'Luxembourg Space Agency, 19-21 Boulevard Royal, L-2449 Luxembourg'.",
    },
  },
  {
    id: "asi-it",
    name: "ASI (Agenzia Spaziale Italiana)",
    jurisdiction: "IT",
    scope: {
      de: "Italienische Weltraumaktivitäten",
      en: "Italian space activities",
    },
    preferredLanguage: "en",
    directive: {
      de: 'Formatiere für ein ASI-Filing: englischer Text mit gelegentlichen italienischen Rechtsbegriffen in Klammern; Verweise auf das D.P.R. n. 23/2023 (Disciplina dello Spazio); Anhänge "Allegato A, Allegato B"; Adressblock "Agenzia Spaziale Italiana, Via del Politecnico snc, 00133 Roma".',
      en: "Format for an ASI filing: English with occasional Italian legal terms in parentheses; references to D.P.R. n. 23/2023 (Disciplina dello Spazio); appendices 'Allegato A, Allegato B'; addressee block 'Agenzia Spaziale Italiana, Via del Politecnico snc, 00133 Roma'.",
    },
  },
  {
    id: "fcc-us",
    name: "FCC",
    jurisdiction: "US",
    scope: {
      de: "US-Spektrum, Satellitenlizenzierung (Part 25)",
      en: "US spectrum, satellite licensing (Part 25)",
    },
    preferredLanguage: "en",
    directive: {
      de: 'Formatiere für ein FCC-Filing: US-amerikanisches Legal-Format; Abschnitte als "I.", "II.", "III." mit Großbuchstaben-Überschriften; Verweise auf den Communications Act und Part 25 der FCC-Rules ("47 C.F.R. § 25.114"); Header mit Docket-Nummer-Platzhalter [FCC IBFS File No.]; FRN-Platzhalter im Identifikations-Block; Adressblock "Federal Communications Commission, 45 L Street NE, Washington, DC 20554".',
      en: "Format for an FCC filing: US legal-style; sections as 'I.', 'II.', 'III.' with all-caps headings; cites to the Communications Act and Part 25 FCC Rules ('47 C.F.R. § 25.114'); header with docket-number placeholder [FCC IBFS File No.]; FRN placeholder in the identifying block; addressee block 'Federal Communications Commission, 45 L Street NE, Washington, DC 20554'.",
    },
  },
  {
    id: "faa-us",
    name: "FAA AST (Office of Commercial Space Transportation)",
    jurisdiction: "US",
    scope: {
      de: "US-Launch-Lizenzierung",
      en: "US launch licensing",
    },
    preferredLanguage: "en",
    directive: {
      de: 'Formatiere für ein FAA AST-Filing: US-amerikanisches Legal-Format mit Launch-Operator-Terminologie; Verweise auf 51 U.S.C. ch. 509 und 14 C.F.R. Part 415/417/450; Risikoabschnitte mit Maximum Probable Loss-Berechnung; Adressblock "FAA Office of Commercial Space Transportation, 800 Independence Avenue SW, Washington, DC 20591".',
      en: "Format for an FAA AST filing: US legal-style with launch-operator terminology; cites to 51 U.S.C. ch. 509 and 14 C.F.R. Part 415/417/450; risk sections with Maximum Probable Loss calculation; addressee block 'FAA Office of Commercial Space Transportation, 800 Independence Avenue SW, Washington, DC 20591'.",
    },
  },
  {
    id: "itu-int",
    name: "ITU Bureau of Radiocommunication (BR)",
    jurisdiction: "INT",
    scope: {
      de: "Internationale Frequenz- und Orbit-Koordination",
      en: "International frequency and orbit coordination",
    },
    preferredLanguage: "en",
    directive: {
      de: 'Formatiere für eine ITU-BR-Einreichung: englischer technischer Stil; ITU Radio Regulations Article 11 / Appendix 30B / RR Article 22 als zentrale Verweise; "Notification, Coordination, Recording" Phasen explizit benannt; SpaceCap-Datenformat-Hinweise; Adressblock "ITU Bureau of Radiocommunication, Place des Nations, CH-1211 Geneva 20".',
      en: 'Format for an ITU BR submission: English technical style; ITU Radio Regulations Article 11 / Appendix 30B / RR Article 22 as central references; "Notification, Coordination, Recording" phases explicitly named; SpaceCap data format hints; addressee block "ITU Bureau of Radiocommunication, Place des Nations, CH-1211 Geneva 20".',
    },
  },
];

export function getAuthorityTemplate(id: string): AuthorityTemplate | null {
  return AUTHORITY_TEMPLATES.find((a) => a.id === id) ?? null;
}

export function listAuthoritiesForJurisdiction(
  jurisdiction: string,
): AuthorityTemplate[] {
  return AUTHORITY_TEMPLATES.filter((a) => a.jurisdiction === jurisdiction);
}

/**
 * Build the per-authority directive block. Returns an empty string when
 * no template is selected so callers can append unconditionally.
 */
export function buildAuthorityDirective(
  templateId: string | null | undefined,
  lang: "de" | "en",
): string {
  if (!templateId) return "";
  const tpl = getAuthorityTemplate(templateId);
  if (!tpl) return "";
  const heading =
    lang === "de"
      ? `\n\nFormatierung für ${tpl.name}: `
      : `\n\nFormatting for ${tpl.name}: `;
  return heading + tpl.directive[lang];
}
