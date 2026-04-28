/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Per-jurisdiction attribution for verbatim statutory text shown in
 * Atlas — source-detail page, side-by-side reader, citation-pill
 * preview. Wherever we display text we did not author (i.e. quoted
 * from EUR-Lex / Bundesgesetzblatt / UNOOSA / FCC eLibrary), this
 * module produces the publisher line + re-use-licence clause so the
 * lawyer/judge can see (a) where Caelex obtained the text and (b)
 * under which legal regime we re-publish it.
 *
 * Why per-jurisdiction: copyright treatment of statutes differs by
 * country and matters legally:
 *   - Germany — §5 UrhG, amtliche Werke are not copyrightable
 *   - European Union — Commission Decision 2011/833/EU re-use notice
 *   - United Nations — public-domain treaty texts via UNOOSA
 *   - United States federal — 17 USC §105, public domain
 *   - United Kingdom — Open Government Licence v3.0
 *   - France — Code de la propriété intellectuelle Art. L122-5 2°
 *   - Italy — Legge 22 aprile 1941 n. 633 Art. 5
 *   - Canada — Crown Copyright (Reproduction of Federal Law Order)
 *   - Other / unknown — generic attribution, lawyer must verify
 *
 * Maintenance: when we add a new jurisdiction's statutes to the
 * catalogue (LegalSource entries), add the corresponding row in
 * `JURISDICTION_ATTRIBUTION` below. Without an entry the helper
 * falls back to `GENERIC_ATTRIBUTION`, which is conservative (no
 * licence-claim) but safe.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface VerbatimAttribution {
  /** Authoritative publisher of the official statutory text — the
   *  organisation whose website Caelex copied the verbatim from.
   *  Shown verbatim (no localisation) because the publisher's
   *  proper name doesn't translate (EUR-Lex stays EUR-Lex). */
  publisher: string;
  /** Re-use / copyright clause that applies to this jurisdiction's
   *  statutory text. Localised because lawyers want to see the
   *  argument in their working language. */
  licenseClause: { de: string; en: string };
  /** URL of the publisher's general statutes portal (NOT the
   *  source-specific deep-link — that's `paragraph_url` /
   *  `source_url` on the parent record). Used as a "Quellenportal
   *  öffnen" link in the attribution footer. */
  publisherUrl: string;
}

const GENERIC_ATTRIBUTION: VerbatimAttribution = {
  publisher: "Official source (see deep-link)",
  licenseClause: {
    de: "Originaltext über den unten verlinkten offiziellen Veröffentlichungskanal verifizieren. Caelex gibt den Wortlaut unverändert wieder, übernimmt jedoch keine Gewähr für Aktualität gegenüber der Originalquelle.",
    en: "Verify against the official publication channel linked below. Caelex reproduces the wording unchanged but does not warrant currency against the original source.",
  },
  publisherUrl: "",
};

/**
 * Per-jurisdiction attribution table. Keyed by `LegalSource.jurisdiction`
 * which uses ISO-alpha-2 country codes plus the umbrella codes "EU"
 * (European Union) and "INT" (international / UN treaties).
 */
const JURISDICTION_ATTRIBUTION: Record<string, VerbatimAttribution> = {
  // ─── European Union ──────────────────────────────────────────────
  EU: {
    publisher: "EUR-Lex (Publications Office of the European Union)",
    licenseClause: {
      de: "Wiedergabe nach Beschluss 2011/833/EU der Kommission über die Weiterverwendung von Kommissionsdokumenten. Authentisch ist allein die im Amtsblatt der Europäischen Union veröffentlichte Fassung.",
      en: "Reproduced under Commission Decision 2011/833/EU on the reuse of Commission documents. Only the version published in the Official Journal of the European Union is authentic.",
    },
    publisherUrl: "https://eur-lex.europa.eu/",
  },

  // ─── International / UN treaties ─────────────────────────────────
  INT: {
    publisher: "UNOOSA (United Nations Office for Outer Space Affairs)",
    licenseClause: {
      de: "UN-Vertragstexte sind öffentlich zugänglich und werden im Rahmen des UN-Sekretariats über die UN-Treaty-Series veröffentlicht. Authentisch sind die im jeweiligen Vertragsdepositum hinterlegten Fassungen.",
      en: "UN treaty texts are publicly accessible and published by the UN Secretariat in the UN Treaty Series. Authentic versions are those deposited with the respective treaty depositary.",
    },
    publisherUrl: "https://www.unoosa.org/",
  },

  // ─── National jurisdictions ──────────────────────────────────────
  DE: {
    publisher:
      "gesetze-im-internet.de (Bundesministerium der Justiz · juris GmbH)",
    licenseClause: {
      de: "Amtliches Werk i.S.d. § 5 Abs. 1 UrhG — kein urheberrechtlicher Schutz. Massgeblich ist die im Bundesgesetzblatt verkündete Fassung.",
      en: "Official work pursuant to § 5(1) German Copyright Act (UrhG) — not subject to copyright. The version promulgated in the Federal Law Gazette (Bundesgesetzblatt) controls.",
    },
    publisherUrl: "https://www.gesetze-im-internet.de/",
  },
  US: {
    publisher: "Office of the Federal Register / GovInfo",
    licenseClause: {
      de: "Werke der US-Bundesregierung sind nach 17 U.S.C. § 105 nicht urheberrechtlich geschützt und befinden sich in der Public Domain.",
      en: "Works of the U.S. Federal Government are not subject to copyright protection under 17 U.S.C. § 105 and are in the public domain.",
    },
    publisherUrl: "https://www.govinfo.gov/",
  },
  UK: {
    publisher: "legislation.gov.uk (The National Archives)",
    licenseClause: {
      de: "Wiedergabe unter der Open Government Licence v3.0. © Crown copyright. Massgeblich ist die auf legislation.gov.uk veröffentlichte konsolidierte Fassung.",
      en: "Reproduced under the Open Government Licence v3.0. © Crown copyright. The consolidated version published on legislation.gov.uk controls.",
    },
    publisherUrl: "https://www.legislation.gov.uk/",
  },
  FR: {
    publisher:
      "Légifrance (Direction de l'information légale et administrative)",
    licenseClause: {
      de: "Wiedergabe nach Art. L122-5 2° Code de la propriété intellectuelle (offizielle Texte). Massgeblich ist die im Journal officiel de la République française (JORF) veröffentlichte Fassung.",
      en: "Reproduced under Art. L122-5 2° of the French Intellectual Property Code (official texts). The version published in the Journal officiel de la République française (JORF) controls.",
    },
    publisherUrl: "https://www.legifrance.gouv.fr/",
  },
  IT: {
    publisher: "Normattiva (Istituto Poligrafico e Zecca dello Stato)",
    licenseClause: {
      de: "Italienische Gesetzestexte sind nach Art. 5 des Gesetzes Nr. 633 vom 22. April 1941 nicht urheberrechtlich geschützt. Massgeblich ist die in der Gazzetta Ufficiale veröffentlichte Fassung.",
      en: "Italian legislative texts are not subject to copyright under Art. 5 of Law No. 633 of 22 April 1941. The version published in the Gazzetta Ufficiale controls.",
    },
    publisherUrl: "https://www.normattiva.it/",
  },
  ES: {
    publisher: "BOE — Boletín Oficial del Estado",
    licenseClause: {
      de: "Wiedergabe spanischer Rechtstexte nach Art. 13 Real Decreto Legislativo 1/1996 — amtliche Texte sind vom Urheberrechtsschutz ausgenommen. Massgeblich ist die im Boletín Oficial del Estado veröffentlichte Fassung.",
      en: "Reproduced under Art. 13 of Royal Legislative Decree 1/1996 — official texts are exempt from copyright protection. The version published in the Boletín Oficial del Estado controls.",
    },
    publisherUrl: "https://www.boe.es/",
  },
  NL: {
    publisher: "wetten.overheid.nl (Ministerie van Justitie en Veiligheid)",
    licenseClause: {
      de: "Niederländische Gesetzestexte sind nach Art. 11 Auteurswet vom Urheberrechtsschutz ausgenommen. Massgeblich ist die im Staatsblad veröffentlichte Fassung.",
      en: "Dutch statutory texts are exempt from copyright under Art. 11 Auteurswet. The version published in the Staatsblad controls.",
    },
    publisherUrl: "https://wetten.overheid.nl/",
  },
  SE: {
    publisher: "Sveriges riksdag — Svensk författningssamling",
    licenseClause: {
      de: "Schwedische Rechtsvorschriften sind nach 9 § Upphovsrättslagen vom Urheberrechtsschutz ausgenommen. Massgeblich ist die in der Svensk författningssamling (SFS) veröffentlichte Fassung.",
      en: "Swedish legislative texts are exempt from copyright under 9 § Upphovsrättslagen. The version published in the Svensk författningssamling (SFS) controls.",
    },
    publisherUrl: "https://www.riksdagen.se/",
  },
  NO: {
    publisher: "Lovdata (Stiftelsen Lovdata)",
    licenseClause: {
      de: "Norwegische Gesetzestexte sind nach § 14 Åndsverkloven vom Urheberrechtsschutz ausgenommen. Massgeblich ist die in Norsk Lovtidend veröffentlichte Fassung.",
      en: "Norwegian statutory texts are exempt from copyright under § 14 Åndsverkloven. The version published in Norsk Lovtidend controls.",
    },
    publisherUrl: "https://lovdata.no/",
  },
  CA: {
    publisher: "Justice Laws Website (Department of Justice Canada)",
    licenseClause: {
      de: "Wiedergabe unter dem Reproduction of Federal Law Order. © Crown copyright. Massgeblich ist die auf laws-lois.justice.gc.ca veröffentlichte konsolidierte Fassung.",
      en: "Reproduced under the Reproduction of Federal Law Order. © Crown copyright. The consolidated version published on laws-lois.justice.gc.ca controls.",
    },
    publisherUrl: "https://laws-lois.justice.gc.ca/",
  },
  AU: {
    publisher:
      "Federal Register of Legislation (Office of Parliamentary Counsel)",
    licenseClause: {
      de: "Wiedergabe unter der Creative Commons Attribution 4.0 International Licence (CC BY 4.0). © Commonwealth of Australia. Massgeblich ist die auf legislation.gov.au veröffentlichte Fassung.",
      en: "Reproduced under the Creative Commons Attribution 4.0 International Licence (CC BY 4.0). © Commonwealth of Australia. The version published on legislation.gov.au controls.",
    },
    publisherUrl: "https://www.legislation.gov.au/",
  },
  NZ: {
    publisher: "New Zealand Legislation (Parliamentary Counsel Office)",
    licenseClause: {
      de: "Wiedergabe unter der Creative Commons Attribution 4.0 International Licence (CC BY 4.0). © Crown copyright. Massgeblich ist die auf legislation.govt.nz veröffentlichte Fassung.",
      en: "Reproduced under the Creative Commons Attribution 4.0 International Licence (CC BY 4.0). © Crown copyright. The version published on legislation.govt.nz controls.",
    },
    publisherUrl: "https://www.legislation.govt.nz/",
  },
  CH: {
    publisher: "Fedlex (Bundeskanzlei der Schweizerischen Eidgenossenschaft)",
    licenseClause: {
      de: "Schweizerische Bundesrechtstexte sind nach Art. 5 URG vom Urheberrechtsschutz ausgenommen. Massgeblich ist die in der Amtlichen Sammlung (AS) bzw. Systematischen Sammlung (SR) veröffentlichte Fassung.",
      en: "Swiss federal legislative texts are exempt from copyright under Art. 5 of the Swiss Copyright Act. The version published in the Official Compilation (AS) or Systematic Compilation (SR) controls.",
    },
    publisherUrl: "https://www.fedlex.admin.ch/",
  },
  AT: {
    publisher:
      "Rechtsinformationssystem des Bundes (Bundeskanzleramt Österreich)",
    licenseClause: {
      de: "Österreichische Bundesgesetze sind nach § 7 UrhG (Freie Werke) vom Urheberrechtsschutz ausgenommen. Massgeblich ist die im Bundesgesetzblatt verkündete Fassung.",
      en: "Austrian federal laws are exempt from copyright under § 7 of the Austrian Copyright Act (Freie Werke). The version promulgated in the Federal Law Gazette controls.",
    },
    publisherUrl: "https://www.ris.bka.gv.at/",
  },
  EE: {
    publisher: "Riigi Teataja (Estonian State Gazette)",
    licenseClause: {
      de: "Estnische Rechtsvorschriften sind nach § 5 Urheberrechtsgesetz (Autoriõiguse seadus) vom Urheberrechtsschutz ausgenommen. Massgeblich ist die im Riigi Teataja veröffentlichte Fassung.",
      en: "Estonian legislative texts are exempt from copyright under § 5 of the Estonian Copyright Act (Autoriõiguse seadus). The version published in Riigi Teataja controls.",
    },
    publisherUrl: "https://www.riigiteataja.ee/",
  },
  AE: {
    publisher: "U.A.E. Cabinet — Official Gazette",
    licenseClause: {
      de: "Wiedergabe der VAE-Gesetzestexte zu Informationszwecken. Authentisch ist allein die im Amtsblatt der Vereinigten Arabischen Emirate (Arabisch) veröffentlichte Fassung; englische Übersetzungen sind unverbindlich.",
      en: "U.A.E. legislative texts reproduced for informational purposes. Only the Arabic version published in the U.A.E. Official Gazette is authentic; English translations are non-binding.",
    },
    publisherUrl: "https://uaelegislation.gov.ae/",
  },
};

/**
 * Resolve the verbatim attribution for a given source jurisdiction.
 * Always returns a non-null record — falls back to a conservative
 * generic clause when the jurisdiction isn't in the table.
 *
 * Pass the parent `LegalSource.jurisdiction` value directly; the
 * function handles the `EU` / `INT` umbrella codes plus all
 * ISO-alpha-2 codes covered by the table.
 */
export function getVerbatimAttribution(
  jurisdiction: string | undefined | null,
): VerbatimAttribution {
  if (!jurisdiction) return GENERIC_ATTRIBUTION;
  const code = jurisdiction.toUpperCase();
  return JURISDICTION_ATTRIBUTION[code] ?? GENERIC_ATTRIBUTION;
}

/** Lower-cased set of jurisdictions that have a tailored entry — useful
 *  for tests that want to assert "we have explicit attribution for X". */
export const JURISDICTIONS_WITH_TAILORED_ATTRIBUTION: ReadonlySet<string> =
  new Set(Object.keys(JURISDICTION_ATTRIBUTION).map((k) => k.toLowerCase()));
