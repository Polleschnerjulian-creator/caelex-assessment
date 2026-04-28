/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Primary source registry — regulator/legislature URLs for every
 * source_id referenced in landing-rights content files.
 *
 * Only verified URLs included. Entries without a confirmable
 * official URL are intentionally omitted — do not add without verification.
 */

import type { PrimarySource } from "./types";

export const PRIMARY_SOURCES: Record<string, PrimarySource> = {
  // ─── Germany ──────────────────────────────────────────────────────
  "de-telekommunikationsgesetz": {
    id: "de-telekommunikationsgesetz",
    title: "Telekommunikationsgesetz (TKG)",
    title_en: "Telecommunications Act",
    jurisdiction: "DE",
    official_url: "https://www.gesetze-im-internet.de/tkg_2021/",
    publisher: "Bundesministerium der Justiz",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "de",
    citation_short: "TKG",
  },
  "de-awv": {
    id: "de-awv",
    title: "Außenwirtschaftsverordnung (AWV)",
    title_en: "Foreign Trade and Payments Regulation",
    jurisdiction: "DE",
    official_url: "https://www.gesetze-im-internet.de/awv_2013/",
    publisher: "Bundesministerium der Justiz",
    last_accessed: "2026-04-17",
    type: "regulation",
    language: "de",
    citation_short: "AWV",
  },

  // ─── United States ────────────────────────────────────────────────
  "us-communications-act-310b": {
    id: "us-communications-act-310b",
    title: "47 U.S. Code § 310 — License ownership restrictions",
    jurisdiction: "US",
    official_url: "https://www.law.cornell.edu/uscode/text/47/310",
    publisher: "Cornell Law School, Legal Information Institute",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "47 U.S.C. § 310(b)",
  },
  "us-cfr-25-137": {
    id: "us-cfr-25-137",
    title:
      "47 CFR § 25.137 — Requests for U.S. market access through non-U.S.-licensed space stations",
    jurisdiction: "US",
    official_url:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25/subpart-B/subject-group-ECFR34f9987bbfcd1a8/section-25.137",
    publisher: "U.S. Government Publishing Office (eCFR)",
    last_accessed: "2026-04-17",
    type: "regulation",
    language: "en",
    citation_short: "47 CFR § 25.137",
  },
  "us-eo-13913": {
    id: "us-eo-13913",
    title:
      "Executive Order 13913 — Establishing the Committee for the Assessment of Foreign Participation in the United States Telecommunications Services Sector",
    jurisdiction: "US",
    official_url:
      "https://www.federalregister.gov/documents/2020/04/08/2020-07530/establishing-the-committee-for-the-assessment-of-foreign-participation-in-the-united-states",
    publisher: "Office of the Federal Register",
    last_accessed: "2026-04-17",
    type: "policy",
    language: "en",
    citation_short: "E.O. 13913",
  },
  "us-cfr-14-450": {
    id: "us-cfr-14-450",
    title: "14 CFR Part 450 — Launch and Reentry License Requirements",
    jurisdiction: "US",
    official_url:
      "https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450",
    publisher: "U.S. Government Publishing Office (eCFR)",
    last_accessed: "2026-04-17",
    type: "regulation",
    language: "en",
    citation_short: "14 CFR Part 450",
  },

  // ─── India ────────────────────────────────────────────────────────
  "in-telecommunications-act-2023": {
    id: "in-telecommunications-act-2023",
    title: "The Telecommunications Act, 2023",
    jurisdiction: "IN",
    official_url: "https://www.indiacode.nic.in/handle/123456789/20101",
    publisher:
      "India Code, Legislative Department, Ministry of Law and Justice",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "Act 44 of 2023",
  },
  "in-space-policy-2023": {
    id: "in-space-policy-2023",
    title: "Indian Space Policy — 2023",
    jurisdiction: "IN",
    official_url:
      "https://www.isro.gov.in/media_isro/pdf/IndianSpacePolicy2023.pdf",
    publisher: "Indian Space Research Organisation (ISRO)",
    last_accessed: "2026-04-17",
    type: "policy",
    language: "en",
    citation_short: "ISP-2023",
  },
  "in-dot-gmpcs-2022": {
    id: "in-dot-gmpcs-2022",
    title:
      "Guidelines for Establishing Satellite-based Communication Network(s) — GMPCS",
    jurisdiction: "IN",
    official_url:
      "https://dot.gov.in/relatedlinks/global-mobile-personal-communication-satellite-gmpcs",
    publisher: "Department of Telecommunications, Government of India",
    last_accessed: "2026-04-17",
    type: "guidance",
    language: "en",
    citation_short: "DoT GMPCS Guidelines 2022",
  },

  // ─── United Kingdom ───────────────────────────────────────────────
  "uk-wireless-telegraphy-act-2006": {
    id: "uk-wireless-telegraphy-act-2006",
    title: "Wireless Telegraphy Act 2006",
    jurisdiction: "UK",
    official_url: "https://www.legislation.gov.uk/ukpga/2006/36/contents",
    publisher: "UK National Archives — legislation.gov.uk",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "WTA 2006",
  },
  "uk-outer-space-act-1986": {
    id: "uk-outer-space-act-1986",
    title: "Outer Space Act 1986",
    jurisdiction: "UK",
    official_url: "https://www.legislation.gov.uk/ukpga/1986/38/contents",
    publisher: "UK National Archives — legislation.gov.uk",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "OSA 1986",
  },
  "uk-space-industry-act-2018": {
    id: "uk-space-industry-act-2018",
    title: "Space Industry Act 2018",
    jurisdiction: "UK",
    official_url: "https://www.legislation.gov.uk/ukpga/2018/5/contents",
    publisher: "UK National Archives — legislation.gov.uk",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "SIA 2018",
  },
  "uk-nsi-act-2021": {
    id: "uk-nsi-act-2021",
    title: "National Security and Investment Act 2021",
    jurisdiction: "UK",
    official_url:
      "https://www.legislation.gov.uk/ukpga/2021/25/contents/enacted",
    publisher: "UK National Archives — legislation.gov.uk",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "NSI Act 2021",
  },

  // ─── France ───────────────────────────────────────────────────────
  "fr-los-2008-518": {
    id: "fr-los-2008-518",
    title: "Loi n° 2008-518 du 3 juin 2008 relative aux opérations spatiales",
    title_en: "Law No. 2008-518 of 3 June 2008 on Space Operations",
    jurisdiction: "FR",
    official_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380",
    publisher:
      "Légifrance / Direction de l'information légale et administrative",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "fr",
    citation_short: "Loi n° 2008-518",
  },
  "fr-arrete-31-march-2011": {
    id: "fr-arrete-31-march-2011",
    title:
      "Arrêté du 31 mars 2011 relatif à la réglementation technique en application du décret n° 2009-643",
    title_en:
      "Order of 31 March 2011 on technical regulations implementing Decree 2009-643 under the Space Operations Act",
    jurisdiction: "FR",
    official_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000024095828",
    publisher:
      "Légifrance / Direction de l'information légale et administrative",
    last_accessed: "2026-04-17",
    type: "regulation",
    language: "fr",
    citation_short: "Arrêté 31 mars 2011",
  },
  "fr-code-postes-communications-electroniques": {
    id: "fr-code-postes-communications-electroniques",
    title: "Code des postes et des communications électroniques",
    title_en: "Postal and Electronic Communications Code",
    jurisdiction: "FR",
    official_url:
      "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006070987",
    publisher:
      "Légifrance / Direction de l'information légale et administrative",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "fr",
    citation_short: "CPCE",
  },

  // ─── Italy ────────────────────────────────────────────────────────
  "it-law-89-2025": {
    id: "it-law-89-2025",
    title:
      "Legge 13 giugno 2025, n. 89 — Disposizioni in materia di economia dello spazio",
    title_en: "Law No. 89 of 13 June 2025 — Provisions on the Space Economy",
    jurisdiction: "IT",
    official_url:
      "https://www.gazzettaufficiale.it/eli/id/2025/06/24/25G00095/SG",
    publisher: "Gazzetta Ufficiale della Repubblica Italiana",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "it",
    citation_short: "L. 89/2025",
  },
  "it-codice-comunicazioni-elettroniche": {
    id: "it-codice-comunicazioni-elettroniche",
    title:
      "Decreto Legislativo 1 agosto 2003, n. 259 — Codice delle comunicazioni elettroniche",
    title_en:
      "Legislative Decree No. 259/2003 — Electronic Communications Code",
    jurisdiction: "IT",
    official_url:
      "https://www.gazzettaufficiale.it/atto/serie_generale/caricaDettaglioAtto/originario?atto.dataPubblicazioneGazzetta=2003-09-15&atto.codiceRedazionale=003G0280&elenco30giorni=false",
    publisher: "Gazzetta Ufficiale della Repubblica Italiana",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "it",
    citation_short: "D.Lgs. 259/2003",
  },

  // ─── Luxembourg ───────────────────────────────────────────────────
  "lu-law-15-december-2020": {
    id: "lu-law-15-december-2020",
    title: "Loi du 15 décembre 2020 portant sur les activités spatiales",
    title_en: "Law of 15 December 2020 on Space Activities",
    jurisdiction: "LU",
    official_url:
      "https://legilux.public.lu/eli/etat/leg/loi/2020/12/15/a1086/jo",
    publisher: "Legilux — Journal officiel du Grand-Duché de Luxembourg",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "fr",
    citation_short: "Loi 15.12.2020",
  },
  "lu-space-resources-act-2017": {
    id: "lu-space-resources-act-2017",
    title:
      "Loi du 20 juillet 2017 sur l'exploration et l'utilisation des ressources de l'espace",
    title_en:
      "Law of 20 July 2017 on the Exploration and Use of Space Resources",
    jurisdiction: "LU",
    official_url:
      "https://space-agency.public.lu/en/agency/legal-framework/law_space_resources_english_translation.html",
    publisher: "Luxembourg Space Agency",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "Loi 20.07.2017",
  },

  // ─── Netherlands ──────────────────────────────────────────────────
  "nl-space-activities-act-2007": {
    id: "nl-space-activities-act-2007",
    title: "Wet ruimtevaartactiviteiten",
    title_en: "Space Activities Act",
    jurisdiction: "NL",
    official_url: "https://wetten.overheid.nl/BWBR0021418/2014-01-25",
    publisher: "Ministerie van Justitie en Veiligheid — wetten.overheid.nl",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "nl",
    citation_short: "Wrv 2007",
  },

  // ─── Spain ────────────────────────────────────────────────────────
  "es-ley-11-2022": {
    id: "es-ley-11-2022",
    title: "Ley 11/2022, de 28 de junio, General de Telecomunicaciones",
    title_en: "Law 11/2022 of 28 June — General Telecommunications Act",
    jurisdiction: "ES",
    official_url: "https://www.boe.es/buscar/act.php?id=BOE-A-2022-10757",
    publisher: "Boletín Oficial del Estado (BOE)",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "es",
    citation_short: "Ley 11/2022",
  },

  // ─── Australia ────────────────────────────────────────────────────
  "au-radiocommunications-act-1992": {
    id: "au-radiocommunications-act-1992",
    title: "Radiocommunications Act 1992",
    jurisdiction: "AU",
    official_url: "https://www.legislation.gov.au/C2004A04465/2018-07-01",
    publisher: "Federal Register of Legislation, Australian Government",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "Radcom Act 1992",
  },
  "au-space-launches-returns-act-2018": {
    id: "au-space-launches-returns-act-2018",
    title: "Space (Launches and Returns) Act 2018",
    jurisdiction: "AU",
    official_url: "https://www.legislation.gov.au/C2004A00391/latest",
    publisher: "Federal Register of Legislation, Australian Government",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "SLR Act 2018",
  },
  "au-soci-act": {
    id: "au-soci-act",
    title: "Security of Critical Infrastructure Act 2018",
    jurisdiction: "AU",
    official_url: "https://www.legislation.gov.au/Series/C2018A00029",
    publisher: "Federal Register of Legislation, Australian Government",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "SOCI Act",
  },

  // ─── Canada ───────────────────────────────────────────────────────
  "ca-radiocommunication-act": {
    id: "ca-radiocommunication-act",
    title: "Radiocommunication Act (R.S.C., 1985, c. R-2)",
    jurisdiction: "CA",
    official_url: "https://laws-lois.justice.gc.ca/eng/acts/r-2/",
    publisher: "Department of Justice Canada",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "Radiocommunication Act",
  },
  "ca-rsssa-2005": {
    id: "ca-rsssa-2005",
    title: "Remote Sensing Space Systems Act (S.C. 2005, c. 45)",
    jurisdiction: "CA",
    official_url: "https://laws-lois.justice.gc.ca/eng/acts/r-5.4/page-1.html",
    publisher: "Department of Justice Canada",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "RSSSA",
  },

  // ─── Japan ────────────────────────────────────────────────────────
  "jp-radio-act-1950": {
    id: "jp-radio-act-1950",
    title: "Radio Act (Act No. 131 of 1950)",
    jurisdiction: "JP",
    official_url: "https://www.japaneselawtranslation.go.jp/en/laws/view/3205",
    publisher:
      "Ministry of Justice, Japan — Japanese Law Translation (official)",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "Radio Act (JP)",
  },
  "jp-telecom-business-act": {
    id: "jp-telecom-business-act",
    title: "Telecommunications Business Act (Act No. 86 of 1984)",
    jurisdiction: "JP",
    official_url: "https://www.japaneselawtranslation.go.jp/en/laws/view/3390",
    publisher:
      "Ministry of Justice, Japan — Japanese Law Translation (official)",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "Telecom Business Act (JP)",
  },
  "jp-space-activities-act-2016": {
    id: "jp-space-activities-act-2016",
    title:
      "Act on Launching of Spacecraft, etc. and Control of Spacecraft (Act No. 76 of 2016)",
    jurisdiction: "JP",
    official_url:
      "https://www.japaneselawtranslation.go.jp/en/laws/view/4329/en",
    publisher:
      "Ministry of Justice, Japan — Japanese Law Translation (official)",
    last_accessed: "2026-04-17",
    type: "statute",
    language: "en",
    citation_short: "Space Activities Act (JP)",
  },
};

export function getPrimarySource(id: string): PrimarySource | undefined {
  return PRIMARY_SOURCES[id];
}
