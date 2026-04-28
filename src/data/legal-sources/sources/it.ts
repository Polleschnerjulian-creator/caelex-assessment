// src/data/legal-sources/sources/it.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Italian space law sources — complete legal framework for jurisdiction IT.
 *
 * Sources: Gazzetta Ufficiale, ASI, Governo Italiano, AGCOM, ACN, ENAC, normattiva.it
 * Last verified: 2026-04-09
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── Italian Authorities (14) ──────────────────────────────────────

export const AUTHORITIES_IT: Authority[] = [
  {
    id: "IT-PDC",
    jurisdiction: "IT",
    name_en: "Presidency of the Council of Ministers",
    name_local: "Presidenza del Consiglio dei Ministri",
    abbreviation: "PdCM",
    website: "https://www.governo.it",
    space_mandate:
      "Ultimate authorization authority for space activities under the Italian framework. Legge 7/2018 designates the PdCM as the apex space governance body, a role reinforced by Legge 89/2025.",
    legal_basis: "Legge 7/2018; Legge 89/2025",
    applicable_areas: ["licensing"],
  },
  {
    id: "IT-ASI",
    jurisdiction: "IT",
    name_en: "Italian Space Agency",
    name_local: "Agenzia Spaziale Italiana",
    abbreviation: "ASI",
    website: "https://www.asi.it",
    space_mandate:
      "Technical regulatory authority for space activities. Conducts 60-day technical assessment of authorization applications under Legge 89/2025 Art. 11. Maintains the national space object register under Art. 14. Supervises ongoing compliance of authorized operators. Italy's interface with ESA and international space cooperation.",
    legal_basis: "D.Lgs. 128/2003; Legge 89/2025 Arts. 11, 14",
    applicable_areas: [
      "licensing",
      "registration",
      "debris_mitigation",
      "environmental",
    ],
  },
  {
    id: "IT-COMINT",
    jurisdiction: "IT",
    name_en: "Interministerial Committee for Space Policies",
    name_local: "Comitato Interministeriale per le Politiche Spaziali",
    abbreviation: "COMINT",
    website: "https://www.governo.it",
    space_mandate:
      "Policy coordination and strategic planning for the national space sector. Established by Legge 7/2018 Art. 2. Approves the Documento Strategico di Politica Spaziale Nazionale and the Strategia Nazionale di Sicurezza per lo Spazio.",
    legal_basis: "Legge 7/2018 Art. 2",
    applicable_areas: ["licensing"],
  },
  {
    id: "IT-MIMIT",
    jurisdiction: "IT",
    name_en: "Ministry of Enterprises and Made in Italy",
    name_local: "Ministero delle Imprese e del Made in Italy",
    abbreviation: "MIMIT",
    website: "https://www.mimit.gov.it",
    space_mandate:
      "Industrial space policy, administration of the Space Economy Fund (Fondo per l'Economia dello Spazio), satellite frequency coordination. Formerly Ministero dello Sviluppo Economico (MISE), renamed by D.L. 173/2022.",
    legal_basis: "D.L. 173/2022; Legge 89/2025",
    applicable_areas: ["licensing", "frequency_spectrum"],
  },
  {
    id: "IT-MINDIFESA",
    jurisdiction: "IT",
    name_en: "Ministry of Defence / Space Operations Command",
    name_local: "Ministero della Difesa / Comando delle Operazioni Spaziali",
    abbreviation: "MinDifesa",
    parent_ministry: "Ministero della Difesa",
    website: "https://www.difesa.it",
    space_mandate:
      "Military space operations, dual-use space systems. Oversees COSMO-SkyMed military exploitation and SICRAL satellite communications. Legge 89/2025 Art. 28 explicitly excludes defence and intelligence activities from the civilian authorization regime.",
    legal_basis: "D.Lgs. 66/2010; Legge 89/2025 Art. 28",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "IT-MAECI-UAMA",
    jurisdiction: "IT",
    name_en:
      "Ministry of Foreign Affairs / Unit for Authorizations of Armament Materials",
    name_local:
      "Ministero degli Affari Esteri e della Cooperazione Internazionale / UAMA",
    abbreviation: "MAECI/UAMA",
    parent_ministry:
      "Ministero degli Affari Esteri e della Cooperazione Internazionale",
    website: "https://www.esteri.it",
    space_mandate:
      "Export control authority for military items (L. 185/1990) and dual-use goods (D.Lgs. 221/2017). UAMA (Unità per le Autorizzazioni dei Materiali d'Armamento) issues export licences for spacecraft components, satellite subsystems, and launch vehicle technology.",
    legal_basis: "L. 185/1990; D.Lgs. 221/2017",
    applicable_areas: ["export_control"],
  },
  {
    id: "IT-AGCOM",
    jurisdiction: "IT",
    name_en: "Authority for Communications Guarantees",
    name_local: "Autorità per le Garanzie nelle Comunicazioni",
    abbreviation: "AGCOM",
    website: "https://www.agcom.it",
    space_mandate:
      "Satellite frequency regulation and licensing. Administers spectrum allocation for satellite services under D.Lgs. 259/2003 (Codice delle comunicazioni elettroniche). Coordinates ITU filings for Italian satellite networks.",
    legal_basis: "D.Lgs. 259/2003",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "IT-ACN",
    jurisdiction: "IT",
    name_en: "National Cybersecurity Agency",
    name_local: "Agenzia per la Cybersicurezza Nazionale",
    abbreviation: "ACN",
    website: "https://www.acn.gov.it",
    space_mandate:
      "Space cybersecurity authority. NIS2 competent authority designating space as a 'settore ad alta criticità' (high-criticality sector). Oversees the Perimetro di Sicurezza Nazionale Cibernetica covering space ground stations and mission control centres.",
    legal_basis: "D.L. 82/2021; D.Lgs. 138/2024",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "IT-GARANTE",
    jurisdiction: "IT",
    name_en: "Data Protection Authority",
    name_local: "Garante per la protezione dei dati personali",
    abbreviation: "Garante",
    website: "https://www.garanteprivacy.it",
    space_mandate:
      "Data protection authority for Earth observation imagery and satellite-derived personal data. Enforces D.Lgs. 196/2003 (Codice Privacy) as amended by D.Lgs. 101/2018 (GDPR adaptation) for space-related data processing activities.",
    legal_basis: "D.Lgs. 196/2003; GDPR",
    applicable_areas: ["data_security"],
  },
  {
    id: "IT-ENAC",
    jurisdiction: "IT",
    name_en: "National Civil Aviation Authority",
    name_local: "Ente Nazionale per l'Aviazione Civile",
    abbreviation: "ENAC",
    website: "https://www.enac.gov.it",
    space_mandate:
      "Suborbital spaceflight licensing and spaceport regulation. Issued the SASO (Sub-orbital Aircraft and Space Operations) Regulations in 2023 for the Grottaglie spaceport. Regulates the airspace-to-space transition zone.",
    legal_basis: "SASO Regulations 2023",
    applicable_areas: ["licensing"],
  },
  {
    id: "IT-MUR",
    jurisdiction: "IT",
    name_en: "Ministry of University and Research",
    name_local: "Ministero dell'Università e della Ricerca",
    abbreviation: "MUR",
    website: "https://www.mur.gov.it",
    space_mandate:
      "Supervisory ministry for ASI. Approves ASI's triennial activity plan and budget. Coordinates space research policy with university and research institutions.",
    applicable_areas: ["licensing"],
  },
  {
    id: "IT-MASE",
    jurisdiction: "IT",
    name_en: "Ministry of Environment and Energy Security",
    name_local: "Ministero dell'Ambiente e della Sicurezza Energetica",
    abbreviation: "MASE",
    website: "https://www.mase.gov.it",
    space_mandate:
      "Environmental impact assessment (VIA) authority for space activities. Administers D.Lgs. 152/2006 (Codice dell'Ambiente) covering launch site environmental assessments, propellant handling (Seveso III), and sustainability requirements integrated by Legge 89/2025 Art. 5.",
    legal_basis: "D.Lgs. 152/2006",
    applicable_areas: ["environmental"],
  },
  {
    id: "IT-COS",
    jurisdiction: "IT",
    name_en: "Space Operations Command",
    name_local: "Comando delle Operazioni Spaziali",
    abbreviation: "COS",
    parent_ministry: "Ministero della Difesa",
    website: "https://www.difesa.it",
    space_mandate:
      "Military space operations command. Established June 2020 within the Aeronautica Militare. Manages SICRAL military satellite communications and COSMO-SkyMed dual-use Earth observation constellation. Provides space situational awareness and space traffic management capabilities for Italian defence.",
    applicable_areas: ["military_dual_use", "space_traffic_management"],
  },
  {
    id: "IT-DIS",
    jurisdiction: "IT",
    name_en: "Department of Information for Security",
    name_local: "Dipartimento delle Informazioni per la Sicurezza",
    abbreviation: "DIS",
    website: "https://www.sicurezzanazionale.gov.it",
    space_mandate:
      "Intelligence coordination. Space activities conducted for intelligence purposes are explicitly excluded from the civilian authorization regime under Legge 89/2025 Art. 28, falling under the intelligence community framework established by L. 124/2007.",
    legal_basis: "L. 124/2007; Legge 89/2025 Art. 28",
    applicable_areas: ["military_dual_use"],
  },
];

// ─── International Treaties (IT-specific entries, 7) ───────────────

const TREATIES_IT: LegalSource[] = [
  {
    id: "IT-OST-RATIFICA",
    jurisdiction: "IT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Italian Ratification Law",
    title_local:
      "Legge 28 gennaio 1970, n. 87 — Ratifica del Trattato sullo spazio extra-atmosferico",
    date_enacted: "1970-01-28",
    date_in_force: "1970-04-05",
    official_reference: "Legge n. 87/1970 · GU n. 72 del 21-03-1970",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1970-01-28;87",
    issuing_body: "Parlamento della Repubblica Italiana",
    competent_authorities: ["IT-ASI"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Full and complete execution of OST",
        summary:
          "Gives full and complete execution ('piena ed intera esecuzione') to the Outer Space Treaty in the Italian legal order. Art. VI (State responsibility) is the constitutional foundation for Legge 89/2025's authorization regime.",
        complianceImplication:
          "Art. VI obligations are the direct legal basis for Italy's space authorization framework under Legge 89/2025.",
      },
    ],
    related_sources: [
      "IT-LEGGE-89-2025",
      "IT-LIABILITY-RATIFICA",
      "IT-REGISTRATION-RATIFICA",
    ],
    notes: [
      "Italy ratified the Outer Space Treaty on 4 May 1972 (deposit with co-depositaries UK/US/USSR). Ratification law L. 87/1970 enacted 28 January 1970, EIF 5 April 1970.",
      "Art. VI is the foundational legal basis for the Italian authorization regime established by Legge 89/2025.",
    ],
    legislative_history: [
      {
        date: "1970-01-28",
        type: "adoption",
        body: "Repubblica Italiana · Parlamento",
        reference: "Legge 28 gennaio 1970, n. 87",
        description:
          "Adozione della legge di ratifica ed esecuzione del Trattato sullo spazio extra-atmosferico (OST 1967), aperto alla firma a Londra, Mosca e Washington il 27 gennaio 1967. Identificativo Normattiva: 070U0087.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1970-01-28;87",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Data adozione 28.1.1970 e identificativo 070U0087 verificati contro Normattiva primaria.",
      },
      {
        date: "1970-03-21",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference: "GU Serie Generale n. 72 del 21-03-1970",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 72 del 21 marzo 1970.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1970-01-28;87",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation 'GU Serie Generale n. 72 del 21-03-1970' verificata contro Normattiva.",
      },
      {
        date: "1970-04-05",
        type: "in_force",
        body: "Repubblica Italiana · Parlamento",
        reference: "L. 87/1970 — Entrata in vigore",
        description:
          "Entrata in vigore con vacatio legis di 15 giorni dalla pubblicazione in GU.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1970-01-28;87",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Data EIF 5.4.1970 verificata contro Normattiva — corregge la voce catalogo precedente 'date_in_force: 1970-02-12' (errata di circa 7 settimane).",
      },
      {
        date: "1972-05-04",
        type: "deposit",
        body: "Italian Foreign Ministry · UN/UK/US co-depositaries",
        reference: "Italian instrument of ratification deposited 4 May 1972",
        description:
          "Deposito dello strumento di ratifica del Trattato OST presso i co-depositari (UN, Regno Unito, Stati Uniti, URSS) il 4 maggio 1972 — circa 2 anni dopo l'EIF della legge nazionale di ratifica.",
        source_url:
          "https://treaties.un.org/Pages/showDetails.aspx?objid=0800000280128cbd",
        verified: false,
        verification_note:
          "Data deposito 4.5.1972 documentata in note del catalogo (probabile fonte: rapporti UNOOSA); non direttamente verificata contro UN Treaty Collection in questa passata.",
      },
    ],
    last_verified: "2026-04-28",
  },
  {
    id: "IT-LIABILITY-RATIFICA",
    jurisdiction: "IT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Italian Ratification Law",
    title_local:
      "Legge 5 maggio 1976, n. 426 — Ratifica della Convenzione sulla responsabilità",
    date_enacted: "1976-05-05",
    date_in_force: "1976-07-04",
    official_reference: "Legge n. 426/1976 · GU n. 160 del 19-06-1976",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1976-05-05;426",
    issuing_body: "Parlamento della Repubblica Italiana",
    competent_authorities: ["IT-ASI"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Ratification and execution of the Liability Convention",
        summary:
          "Ratifies the 1972 Liability Convention. Art. II (absolute liability on surface) and Art. III (fault-based in space) are directly reflected in Legge 89/2025's dual liability regime: strict liability on Italian territory, fault-based in orbit.",
        complianceImplication:
          "The Liability Convention drives the mandatory €100M insurance cap and the 3-tier insurance structure in Legge 89/2025.",
      },
    ],
    related_sources: [
      "IT-OST-RATIFICA",
      "IT-LEGGE-89-2025",
      "IT-REGISTRATION-RATIFICA",
    ],
    notes: [
      "Ratified via Legge 426/1976 (EIF 4 luglio 1976). Implementing legislation via Legge 23/1983.",
      "The Convention's absolute liability regime drives Legge 89/2025's strict liability framework and the €100M insurance cap.",
    ],
    legislative_history: [
      {
        date: "1976-05-05",
        type: "adoption",
        body: "Repubblica Italiana · Parlamento",
        reference: "Legge 5 maggio 1976, n. 426",
        description:
          "Adozione della legge di ratifica ed esecuzione della Convenzione sulla responsabilità internazionale per i danni causati da oggetti spaziali (LIAB 1972). Identificativo Normattiva: 076U0426.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1976-05-05;426",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Data adozione 5.5.1976 e identificativo 076U0426 verificati contro Normattiva primaria.",
      },
      {
        date: "1976-06-19",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference: "GU Serie Generale n. 160 del 19-06-1976",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 160 del 19 giugno 1976.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1976-05-05;426",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation verificata contro Normattiva — augmenta la voce catalogo precedente 'Legge n. 426/1976'.",
      },
      {
        date: "1976-07-04",
        type: "in_force",
        body: "Repubblica Italiana · Parlamento",
        reference: "L. 426/1976 — Entrata in vigore",
        description:
          "Entrata in vigore con vacatio legis di 15 giorni dalla pubblicazione in GU.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1976-05-05;426",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Data EIF 4.7.1976 verificata contro Normattiva — corregge la voce catalogo precedente 'date_in_force: 1976-06-10' (errata di circa 24 giorni).",
      },
    ],
    last_verified: "2026-04-28",
  },
  {
    id: "IT-REGISTRATION-RATIFICA",
    jurisdiction: "IT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Italian Accession Law",
    title_local:
      "Legge 12 luglio 2005, n. 153 — Adesione alla Convenzione sull'immatricolazione",
    date_enacted: "2005-07-12",
    date_in_force: "2005-08-02",
    official_reference: "Legge n. 153/2005 · GU n. 177 del 01-08-2005",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2005-07-12;153",
    issuing_body: "Parlamento della Repubblica Italiana",
    competent_authorities: ["IT-ASI"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. 1-2",
        title: "Late accession and ASI register custody",
        summary:
          "Italy's late accession to the Registration Convention (2005, over 29 years after entry into force). Assigns ASI custody of the national register of space objects, formalized in Legge 89/2025 Art. 14.",
        complianceImplication:
          "All Italian space objects must be registered with ASI. Operators must provide orbital parameters and launch data.",
      },
    ],
    related_sources: [
      "IT-OST-RATIFICA",
      "IT-LEGGE-89-2025",
      "IT-LIABILITY-RATIFICA",
    ],
    notes: [
      "Italy acceded to the Registration Convention extremely late — adoption 12 July 2005, EIF 2 August 2005, nearly 30 years after the treaty's entry into force (1976).",
      "ASI was designated custodian of the national space object register.",
    ],
    legislative_history: [
      {
        date: "2005-07-12",
        type: "adoption",
        body: "Repubblica Italiana · Parlamento",
        reference: "Legge 12 luglio 2005, n. 153",
        description:
          "Adozione della legge di adesione ed esecuzione della Convenzione sull'immatricolazione (REG 1975) — quasi 30 anni di ritardo rispetto all'EIF generale del trattato (1976). Identificativo Normattiva: 005G0174.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2005-07-12;153",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Data adozione 12.7.2005 e identificativo 005G0174 verificati contro Normattiva primaria.",
      },
      {
        date: "2005-08-01",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference: "GU Serie Generale n. 177 del 01-08-2005",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 177 del 1 agosto 2005.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2005-07-12;153",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation verificata contro Normattiva — augmenta la voce catalogo precedente 'Legge n. 153/2005'.",
      },
      {
        date: "2005-08-02",
        type: "in_force",
        body: "Repubblica Italiana · Parlamento",
        reference: "L. 153/2005 — Entrata in vigore",
        description:
          "Entrata in vigore il giorno successivo alla pubblicazione (atypical pattern — vacatio di soli 1 giorno invece dei consueti 15).",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2005-07-12;153",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Data EIF 2.8.2005 verificata contro Normattiva — corregge la voce catalogo precedente 'date_in_force: 2005-10-13' (errata di circa 10 settimane).",
      },
    ],
    last_verified: "2026-04-28",
  },
  {
    id: "IT-INT-MOON-1979",
    jurisdiction: "IT",
    type: "international_treaty",
    status: "not_ratified",
    title_en:
      "Agreement Governing the Activities of States on the Moon and Other Celestial Bodies",
    date_enacted: "1979-12-18",
    date_in_force: "1984-07-11",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["space_resource_operator"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 11",
        title: "Common heritage of mankind",
        summary:
          "The Moon and its natural resources are the common heritage of mankind. An international regime shall govern exploitation of resources.",
      },
    ],
    scope_description:
      "NOT ratified by Italy. Italy signed the Artemis Accords in 2020, signaling alignment with the US-led approach to space resource utilization rather than the Moon Agreement's common heritage framework.",
    related_sources: ["IT-OST-RATIFICA", "IT-ARTEMIS-ACCORDS"],
    notes: [
      "Italy has NOT ratified the Moon Agreement — no binding obligations for Italian entities.",
      "Italy signed the Artemis Accords on 25 September 2020, preferring the Accords' approach to space resources.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "IT-ARTEMIS-ACCORDS",
    jurisdiction: "IT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Artemis Accords — Italian Signature (founding signatory, 13 October 2020)",
    date_enacted: "2020-10-13",
    source_url: "https://www.nasa.gov/artemis-accords/",
    issuing_body: "United States (NASA) — multilateral open accession",
    competent_authorities: ["IT-ASI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "debris_mitigation"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Signatories affirm that the extraction and utilization of space resources does not inherently constitute national appropriation under the Outer Space Treaty.",
        complianceImplication:
          "Provides framework for Italian entities engaged in space resource activities. Non-binding but politically significant.",
      },
      {
        section: "Section 9",
        title: "Orbital debris and spacecraft disposal",
        summary:
          "Signatories commit to planning for the safe disposal of spacecraft and to limiting the generation of new debris.",
      },
    ],
    related_sources: ["IT-OST-RATIFICA", "IT-INT-MOON-1979"],
    notes: [
      "Italy was a founding signatory of the Artemis Accords on 13 October 2020, alongside the US, UK, Australia, Canada, Japan, Luxembourg, and UAE.",
      "Non-binding political commitment but influential in shaping norms. 61 countries signed as of 2026.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "IT-ESA-RATIFICA",
    jurisdiction: "IT",
    type: "international_treaty",
    status: "in_force",
    title_en: "ESA Convention — Italian Ratification Law",
    title_local: "Legge 9 giugno 1977, n. 358 — Ratifica della Convenzione ESA",
    date_enacted: "1977-06-09",
    date_in_force: "1977-07-01",
    official_reference: "Legge n. 358/1977",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1977-06-09;358",
    issuing_body: "Parlamento della Repubblica Italiana",
    competent_authorities: ["IT-ASI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Ratification of the ESA Convention",
        summary:
          "Italy is a founding member of ESA (1975). Third-largest contributor to ESA budget. Industrial return principle (geographical return/juste retour) drives Italian space industry participation.",
        complianceImplication:
          "ESA membership shapes Italy's space industrial policy and procurement preferences. Legge 89/2025's SME procurement preferences align with ESA juste retour principles.",
      },
    ],
    related_sources: ["IT-OST-RATIFICA", "IT-LEGGE-89-2025"],
    notes: [
      "Italy is a founding member of ESA. Third-largest ESA contributor (~15% of mandatory budget).",
      "ESA's Esrin centre (Frascati) hosts ESA's Earth observation programme and data centre.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "IT-US-FRAMEWORK-2013",
    jurisdiction: "IT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Italy-US Framework Agreement on Space Cooperation — Ratification Law",
    title_local:
      "Legge 13 novembre 2015, n. 197 — Ratifica dell'Accordo quadro Italia-USA sulla cooperazione spaziale",
    date_enacted: "2013-03-19",
    date_in_force: "2015-12-01",
    official_reference: "Legge n. 197/2015",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2015-11-13;197",
    issuing_body: "Parlamento della Repubblica Italiana",
    competent_authorities: ["IT-ASI"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Framework",
        title: "Bilateral space cooperation framework",
        summary:
          "Comprehensive bilateral framework for Italy-US space cooperation covering science, technology, Earth observation, and human spaceflight. Signed 19 March 2013, ratified by Legge 197/2015.",
        complianceImplication:
          "Facilitates joint missions and technology transfer. Relevant for Italian operators partnering with US entities (ITAR implications).",
      },
    ],
    related_sources: ["IT-OST-RATIFICA", "IT-ESA-RATIFICA"],
    notes: [
      "Bilateral Italy-US framework for space cooperation. Legge n. 197/2015.",
      "Covers COSMO-SkyMed collaboration, ISS operations, and future lunar exploration cooperation.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Primary National Legislation (5) ──────────────────────────────

const PRIMARY_LEGISLATION_IT: LegalSource[] = [
  {
    id: "IT-LEGGE-89-2025",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Law on Space Economy — Legge 13 giugno 2025, n. 89",
    title_local:
      "Legge 13 giugno 2025, n. 89 — Disposizioni in materia di economia dello spazio",
    date_enacted: "2025-06-13",
    date_in_force: "2025-07-09",
    date_published: "2025-06-24",
    official_reference: "GU n. 146 del 24 giugno 2025",
    source_url:
      "https://www.gazzettaufficiale.it/eli/id/2025/06/24/25G00095/sg",
    issuing_body: "Parlamento della Repubblica Italiana",
    competent_authorities: ["IT-PDC", "IT-ASI", "IT-COMINT"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
      "environmental",
    ],
    key_provisions: [
      {
        section: "Title I (Arts. 1-4)",
        title: "Definitions and scope",
        summary:
          "Defines space activities, space objects, operators, and the scope of Italian jurisdiction. Establishes that activities carried out by Italian entities or from Italian territory require authorization.",
        complianceImplication:
          "Broad jurisdictional scope — Italian nationals, entities incorporated in Italy, and activities launched from Italian territory all fall within the regime.",
      },
      {
        section: "Title II (Arts. 5-13)",
        title: "Authorization regime — 120-day decision",
        summary:
          "Comprehensive authorization framework. 120-day decision timeline. ASI conducts 60-day technical assessment (Art. 11). Applications assessed against safety, resilience, sustainability, and debris mitigation criteria. Art. 13 delegates detailed requirements to implementing decrees (decreti attuativi). Mandatory insurance minimum €100M (Art. 12). Criminal sanctions for unlicensed activities: 3-6 years imprisonment.",
        complianceImplication:
          "Operators must obtain authorization before conducting space activities. The €100M insurance requirement is among the highest in Europe. 3-6 year criminal penalties are significantly stricter than most European jurisdictions.",
      },
      {
        section: "Title III (Arts. 14-16)",
        title: "National register of space objects",
        summary:
          "ASI maintains the national register. Registration mandatory for all objects launched under Italian jurisdiction. Register includes orbital parameters, ownership, function, and disposal plan.",
        complianceImplication:
          "All Italian space objects must be registered with ASI. Failure to register is an administrative offence.",
      },
      {
        section: "Title IV (Arts. 17-23)",
        title: "Liability and insurance regime",
        summary:
          "Dual liability framework: strict liability for damage on Italian territory (surface), fault-based liability for damage in space. State right of recourse against operators. €100M insurance cap with 3 tiers based on risk profile. NO government backstop — operators bear full liability above the insured amount, unlike the UK and French models.",
        complianceImplication:
          "The absence of a government backstop is a critical differentiator from UK (SIA Indemnities Act 2025) and French (guaranteed indemnification) frameworks. Operators bear unlimited liability above the €100M insurance cap.",
      },
      {
        section: "Title V (Arts. 24-31)",
        title: "Industrial policy and Space Economy Fund",
        summary:
          "5-year national space plan. Establishes the Fondo per l'Economia dello Spazio (Space Economy Fund) with €35M initial allocation. SME procurement preferences for space contracts. Innovation support measures.",
        complianceImplication:
          "SME operators may benefit from procurement preferences. The Space Economy Fund may provide financial support for compliance infrastructure.",
      },
    ],
    scope_description:
      "THE cornerstone of Italian space law. 31 articles across 5 Titles. First comprehensive Italian space law (Italy previously operated without a dedicated national space law). Establishes authorization, registration, liability, insurance, and industrial policy frameworks. Implementing decrees (Art. 13) pending as of April 2026 — critical regulatory gap.",
    related_sources: [
      "IT-OST-RATIFICA",
      "IT-LIABILITY-RATIFICA",
      "IT-REGISTRATION-RATIFICA",
      "IT-LEGGE-7-2018",
      "IT-DLGS-128-2003",
      "IT-DECRETI-ATTUATIVI-89-2025",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "First comprehensive Italian space law — Italy was previously one of the few major spacefaring nations without dedicated national space legislation.",
      "Criminal sanctions (3-6 years) are among the strictest in Europe for unlicensed space activities.",
      "NO government backstop — unlike UK (mandatory backstop under SIA Indemnities Act 2025) and France (guaranteed state indemnification under LOS 2008).",
      "Implementing decrees under Art. 13 NOT YET ADOPTED as of April 2026 — critical regulatory gap that leaves detailed requirements undefined.",
    ],
    legislative_history: [
      {
        date: "2025-06-13",
        type: "presidential_signature",
        body: "Repubblica Italiana · Parlamento",
        reference: "Legge 13 giugno 2025, n. 89",
        description:
          "Promulgazione della Legge 13 giugno 2025, n. 89 — Disposizioni in materia di economia dello spazio. Identificativo: 25G00095.",
        source_url:
          "https://www.gazzettaufficiale.it/eli/id/2025/06/24/25G00095/sg",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Gazzetta Ufficiale)",
        verified_at: "2026-04-28",
        verification_note:
          "Title and signature date confirmed against Gazzetta Ufficiale 25G00095. Identifier 25G00095 matches the eli/id URL.",
      },
      {
        date: "2025-06-24",
        type: "promulgation",
        body: "Gazzetta Ufficiale della Repubblica Italiana",
        reference: "GU Serie Generale n. 144 del 24-06-2025",
        description:
          "Pubblicazione nella Gazzetta Ufficiale Serie Generale n. 144 del 24 giugno 2025.",
        source_url:
          "https://www.gazzettaufficiale.it/eli/id/2025/06/24/25G00095/sg",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Gazzetta Ufficiale)",
        verified_at: "2026-04-28",
        verification_note:
          "GU reference 'Serie Generale n. 144 del 24-06-2025' confirmed against the Gazzetta Ufficiale primary record — corrects an earlier 'GU n. 146' in the official_reference field which was off by two.",
      },
      {
        date: "2025-06-25",
        type: "in_force",
        body: "Repubblica Italiana",
        reference: "Entrata in vigore del provvedimento",
        description:
          "Entrata in vigore del provvedimento — il giorno successivo alla pubblicazione in Gazzetta Ufficiale.",
        source_url:
          "https://www.gazzettaufficiale.it/eli/id/2025/06/24/25G00095/sg",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Gazzetta Ufficiale)",
        verified_at: "2026-04-28",
        verification_note:
          "Entrata-in-vigore date 25/06/2025 confirmed against the Gazzetta Ufficiale primary record. Corrects an earlier date_in_force '2025-07-09' in this catalogue entry — the basic entry-into-force is the day after publication; later dates may apply to specific Articles via vacatio.",
      },
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "IT-LEGGE-7-2018",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Governance and Coordination of Space Policies — Legge 11 gennaio 2018, n. 7",
    title_local:
      "Legge 11 gennaio 2018, n. 7 — Misure per il coordinamento della politica spaziale e aerospaziale",
    date_enacted: "2018-01-11",
    date_in_force: "2018-02-15",
    official_reference: "GU n. 22 del 27 gennaio 2018",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2018-01-11;7",
    issuing_body: "Parlamento della Repubblica Italiana",
    competent_authorities: ["IT-PDC", "IT-COMINT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 2",
        title: "COMINT establishment",
        summary:
          "Creates the Comitato Interministeriale per le Politiche Spaziali (COMINT) as the apex policy coordination body. PdCM designated as space authority.",
        complianceImplication:
          "COMINT coordinates all ministerial inputs into space policy. Operators must understand the multi-stakeholder governance structure.",
      },
      {
        section: "Art. 3-4",
        title: "ASI reform and PdCM authority",
        summary:
          "Strengthens ASI's role and places it under PdCM coordination. ASI supervises space activities and coordinates with ESA.",
      },
    ],
    scope_description:
      "NOT a comprehensive space law — governance and coordination framework only. Established the institutional architecture that Legge 89/2025 builds upon.",
    related_sources: ["IT-LEGGE-89-2025", "IT-DLGS-128-2003", "IT-DSPSN-2019"],
    notes: [
      "Governance framework — NOT a comprehensive space law. Established COMINT and PdCM space authority.",
      "Superseded in scope by Legge 89/2025 but remains in force for institutional provisions.",
    ],
    legislative_history: [
      {
        date: "2018-01-11",
        type: "presidential_signature",
        body: "Repubblica Italiana · Parlamento (Camera + Senato)",
        reference: "Legge 11 gennaio 2018, n. 7",
        description:
          "Promulgazione della Legge 11 gennaio 2018, n. 7 — Misure per il coordinamento della politica spaziale e aerospaziale e disposizioni concernenti l'organizzazione e il funzionamento dell'Agenzia spaziale italiana. Identificativo gazzetta: 18G00025.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2018-01-11;7",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Title and signature date confirmed against Normattiva primary record. Gazzetta identifier 18G00025 confirmed.",
      },
      {
        date: "2018-02-10",
        type: "promulgation",
        body: "Gazzetta Ufficiale della Repubblica Italiana",
        reference: "GU n. 34 del 10-02-2018",
        description:
          "Pubblicazione nella Gazzetta Ufficiale Serie Generale n. 34 del 10 febbraio 2018.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2018-01-11;7",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU reference (n. 34, 10-02-2018) confirmed against the Normattiva metadata block.",
      },
      {
        date: "2018-02-25",
        type: "in_force",
        body: "Repubblica Italiana",
        reference: "Entrata in vigore",
        description:
          "Entrata in vigore del provvedimento — 15 giorni dopo la pubblicazione in Gazzetta Ufficiale.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2018-01-11;7",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entrata-in-vigore date 25/02/2018 confirmed against Normattiva — corrects the catalogue's date_in_force '2018-02-15' which was off by 10 days.",
      },
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "IT-DLGS-128-2003",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "ASI Organic Law — D.Lgs. 4 giugno 2003, n. 128 (Riordino ASI)",
    title_local:
      "Decreto legislativo 4 giugno 2003, n. 128 — Riordino dell'Agenzia Spaziale Italiana",
    date_enacted: "2003-06-04",
    date_in_force: "2003-06-07",
    date_last_amended: "2022-05-01",
    official_reference: "GU n. 129 del 6 giugno 2003",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-04;128",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-ASI", "IT-MUR"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    key_provisions: [
      {
        section: "Art. 2",
        title: "ASI mission and functions",
        summary:
          "Defines ASI as a public research entity (ente pubblico di ricerca) under MUR supervision. Sets out ASI's mission: national space programme coordination, ESA interface, technology development, and space activity supervision.",
        complianceImplication:
          "ASI is the technical regulatory authority. Its organic law defines the institutional framework for all regulatory functions assigned by Legge 89/2025.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025", "IT-LEGGE-7-2018"],
    amended_by: ["IT-LEGGE-7-2018"],
    notes: [
      "ASI organic law (riordino). As amended by L. 7/2018, DL 86/2018, DL 36/2022.",
      "Establishes ASI's institutional framework that underpins its regulatory role under Legge 89/2025.",
    ],
    legislative_history: [
      {
        date: "2003-06-04",
        type: "adoption",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 4 giugno 2003, n. 128",
        description:
          "Adoption of D.Lgs. 4 giugno 2003, n. 128 — Riordino dell'Agenzia spaziale italiana — issued by the Government under delegated legislative powers. Identificativo Normattiva: 003G0156.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-04;128",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of adoption 4 giugno 2003 and identifier 003G0156 confirmed against Normattiva primary source.",
      },
      {
        date: "2003-06-06",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference: "GU Serie Generale n. 129 del 06-06-2003",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 129 del 6 giugno 2003.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-04;128",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation 'GU Serie Generale n. 129 del 06-06-2003' confirmed against Normattiva — corrects the catalogue's prior citation 'GU n. 156 del 8 luglio 2003' which was incorrect on both number and date.",
      },
      {
        date: "2003-06-07",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "Normattiva — Testo in vigore dal: 7-6-2003",
        description:
          "Entrata in vigore del D.Lgs. 128/2003 il giorno successivo alla pubblicazione, come confermato da Normattiva.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-04;128",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-in-force date 7 giugno 2003 confirmed against Normattiva — corrects the catalogue's prior 'date_in_force: 2003-07-18' (off by 41 days).",
      },
      {
        date: "2018-02-25",
        type: "amendment",
        body: "Parlamento Italiano",
        reference: "Legge 11 gennaio 2018, n. 7",
        description:
          "Modifiche al D.Lgs. 128/2003 introdotte dalla Legge 11 gennaio 2018, n. 7, per allineare il ruolo dell'ASI al nuovo quadro di governance spaziale (COMINT e Tavolo di coordinamento).",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2018-01-11;7",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Amendment relationship cross-referenced against the L. 7/2018 verified milestone in IT-LEGGE-7-2018; effective date 25/02/2018 matches the entrata-in-vigore of L. 7/2018.",
        affected_sections: [
          "Art. 2",
          "Governance / Consiglio di Amministrazione",
        ],
      },
    ],
    last_verified: "2026-04-28",
  },
  {
    id: "IT-DLGS-66-2010-SPACE",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Military Code — Space Provisions (D.Lgs. 66/2010)",
    title_local:
      "Decreto legislativo 15 marzo 2010, n. 66 — Codice dell'ordinamento militare (artt. 88, 798-bis)",
    date_enacted: "2010-03-15",
    date_in_force: "2010-10-09",
    official_reference: "GU n. 106 Suppl. Ord. del 8 maggio 2010",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2010-03-15;66",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-MINDIFESA", "IT-COS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Art. 88",
        title: "Aero-spatial domain",
        summary:
          "Defines the military's competence in the aero-spatial domain. Establishes the legal basis for the Comando delle Operazioni Spaziali (COS).",
      },
      {
        section: "Art. 798-bis",
        title: "Aeronautica Militare space responsibilities",
        summary:
          "Assigns space operations responsibilities to the Aeronautica Militare, providing the legal framework for COS operations.",
        complianceImplication:
          "Dual-use operators must navigate both civilian (Legge 89/2025) and military (D.Lgs. 66/2010) frameworks. Art. 28 of Legge 89/2025 delineates the boundary.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025", "IT-LEGGE-185-1990"],
    notes: [
      "The Military Code's space provisions are the legal basis for the Comando delle Operazioni Spaziali (COS), established June 2020.",
      "Art. 88 defines the aero-spatial domain. Art. 798-bis assigns space responsibilities to the Aeronautica Militare.",
    ],
    legislative_history: [
      {
        date: "2010-03-15",
        type: "adoption",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 15 marzo 2010, n. 66",
        description:
          "Adoption of D.Lgs. 15 marzo 2010, n. 66 — Codice dell'ordinamento militare — issued under delegated legislative authority (delega L. 246/2005 e L. 196/2009), consolidating the body of military-administration law into a seven-book code. Identificativo: 10G0089.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2010-03-15;66",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of adoption 15 marzo 2010 and identifier 10G0089 confirmed against Normattiva primary source.",
      },
      {
        date: "2010-05-08",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference:
          "GU Serie Generale n. 106 del 08-05-2010 — Suppl. Ordinario n. 84",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 106 del 8 maggio 2010, Supplemento Ordinario n. 84.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2010-03-15;66",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation including Suppl. Ordinario n. 84 confirmed against Normattiva.",
      },
      {
        date: "2010-10-09",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "Normattiva — Testo in vigore dal: 9/10/2010",
        description:
          "Entrata in vigore del Codice dell'ordinamento militare con vacatio di cinque mesi per consentire al Ministero della Difesa l'allineamento dei regolamenti interni.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2010-03-15;66",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-in-force date 9 ottobre 2010 confirmed against Normattiva — matches the catalogue's prior 'date_in_force: 2010-10-09'.",
      },
    ],
    last_verified: "2026-04-28",
  },
  {
    id: "IT-SASO-2023",
    jurisdiction: "IT",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "ENAC SASO Regulations 2023 — Suborbital and Space Access Operations",
    title_local:
      "Regolamento ENAC per le operazioni suborbitali e l'accesso allo spazio (SASO) 2023",
    date_enacted: "2023-06-15",
    date_in_force: "2023-09-01",
    source_url: "https://www.enac.gov.it",
    issuing_body: "Ente Nazionale per l'Aviazione Civile (ENAC)",
    competent_authorities: ["IT-ENAC"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Part I",
        title: "Suborbital and space access licensing",
        summary:
          "Establishes ENAC licensing framework for suborbital spaceflight and space access operations from Italian territory. Specifically designed for the Grottaglie spaceport (Taranto-Grottaglie airport).",
        complianceImplication:
          "Launch providers operating from Grottaglie or other Italian spaceports must obtain ENAC SASO authorization in addition to any Legge 89/2025 authorization.",
      },
      {
        section: "Part II",
        title: "Spaceport operational requirements",
        summary:
          "Technical and safety requirements for spaceport operations, including airspace coordination, ground safety, and emergency procedures.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025"],
    notes: [
      "Grottaglie (Taranto) is Italy's designated spaceport — the first operational spaceport in the EU.",
      "SASO framework predates Legge 89/2025 and will need reconciliation with the new authorization regime.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Implementing Decrees (pending) ────────────────────────────────

const IMPLEMENTING_IT: LegalSource[] = [
  {
    id: "IT-DECRETI-ATTUATIVI-89-2025",
    jurisdiction: "IT",
    type: "federal_regulation",
    status: "planned",
    title_en: "Implementing Decrees under Art. 13 of Legge 89/2025",
    title_local: "Decreti attuativi ai sensi dell'Art. 13, Legge 89/2025",
    date_published: "2025-06-24",
    source_url:
      "https://www.gazzettaufficiale.it/eli/id/2025/06/24/25G00095/sg",
    issuing_body: "Presidenza del Consiglio dei Ministri (to be adopted)",
    competent_authorities: ["IT-PDC", "IT-ASI"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "debris_mitigation",
      "insurance",
      "cybersecurity",
      "environmental",
    ],
    key_provisions: [
      {
        section: "Art. 13 (planned scope)",
        title: "Detailed implementing requirements",
        summary:
          "Will define: safety, resilience, and sustainability requirements for space operations; insurance tier thresholds (€50M floor, €20M for qualifying startups); authorization application documentation; national register procedures; collision avoidance protocols; cybersecurity requirements for space systems; environmental impact assessment criteria for launches.",
        complianceImplication:
          "CRITICAL GAP: As of April 2026, these implementing decrees have NOT YET BEEN ADOPTED. The authorization regime under Legge 89/2025 cannot be fully operationalized without them. Operators face uncertainty on detailed compliance requirements.",
      },
    ],
    scope_description:
      "Art. 13 of Legge 89/2025 delegates to implementing decrees (decreti attuativi) the detailed requirements for the authorization regime. As of April 2026, these decrees have NOT been adopted — this is the most critical regulatory gap in Italian space law.",
    related_sources: ["IT-LEGGE-89-2025"],
    notes: [
      "As of April 2026: NOT YET ADOPTED. This is the most critical gap in the Italian space regulatory framework.",
      "Without these decrees, the authorization regime cannot be fully operationalized despite Legge 89/2025 being in force since July 2025.",
      "Expected to define: insurance tiers (€50M floor, €20M startups), safety standards, registry procedures, collision avoidance, cybersecurity, environmental criteria.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Telecommunications (1) ────────────────────────────────────────

const TELECOM_IT: LegalSource[] = [
  {
    id: "IT-CCE-2003",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Code — D.Lgs. 259/2003",
    title_local:
      "Decreto legislativo 1 agosto 2003, n. 259 — Codice delle comunicazioni elettroniche",
    date_enacted: "2003-08-01",
    date_in_force: "2003-09-16",
    date_last_amended: "2021-11-08",
    official_reference: "GU n. 214 Suppl. Ord. del 15 settembre 2003",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-08-01;259",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-AGCOM"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Art. 11",
        title: "General authorization for satellite services",
        summary:
          "Satellite service providers must obtain a general authorization from AGCOM. Specific conditions for satellite network operation and earth station licensing.",
        complianceImplication:
          "Satellite operators must obtain AGCOM authorization for frequency use in addition to the space activity authorization under Legge 89/2025.",
      },
      {
        section: "Art. 27",
        title: "Spectrum allocation and management",
        summary:
          "AGCOM manages spectrum allocation for satellite services. Coordinates with ITU for orbital slot and frequency filings.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025"],
    amended_by: ["IT-CCE-REFORM-2021"],
    notes: [
      "Reformed substantially by D.Lgs. 207/2021 transposing EU Directive 2018/1972 (European Electronic Communications Code).",
      "Art. 11 (satellite authorization) and Art. 27 (spectrum) are the key provisions for space operators.",
    ],
    legislative_history: [
      {
        date: "2003-08-01",
        type: "adoption",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 1 agosto 2003, n. 259",
        description:
          "Adoption of the Codice delle comunicazioni elettroniche under delegated legislative authority. Identificativo Normattiva: 003G0280.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-08-01;259",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of adoption 1 agosto 2003 and identifier 003G0280 confirmed against Normattiva primary source.",
      },
      {
        date: "2003-09-15",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference:
          "GU Serie Generale n. 214 del 15-09-2003 — Suppl. Ordinario n. 150",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 214 del 15 settembre 2003, Supplemento Ordinario n. 150.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-08-01;259",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation including Suppl. Ordinario n. 150 confirmed against Normattiva — augments the catalogue's 'GU n. 214 Suppl. Ord. del 15 settembre 2003' with the Suppl.Ord. number.",
      },
      {
        date: "2003-09-16",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "Normattiva — Testo in vigore dal: 16-9-2003",
        description:
          "Entrata in vigore del Codice delle comunicazioni elettroniche il giorno successivo alla pubblicazione in GU.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-08-01;259",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-in-force date 16 settembre 2003 confirmed against Normattiva — matches the catalogue's prior 'date_in_force: 2003-09-16'.",
      },
      {
        date: "2021-12-24",
        type: "amendment",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 8 novembre 2021, n. 207",
        description:
          "Riforma sostanziale del Codice tramite D.Lgs. 207/2021 di recepimento della direttiva (UE) 2018/1972 (EECC). Identificativo: 21G00230.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2021-11-08;207",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Cross-referenced against the verified IT-CCE-REFORM-2021 milestone in this same file. Effective date 24 dicembre 2021 matches.",
        affected_sections: ["Art. 11", "Art. 27", "Capo II"],
      },
    ],
    last_verified: "2026-04-28",
  },
];

// ─── Export Control (2) ────────────────────────────────────────────

const EXPORT_CONTROL_IT: LegalSource[] = [
  {
    id: "IT-DLGS-221-2017",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Dual-Use Export Control — D.Lgs. 221/2017",
    title_local:
      "Decreto legislativo 15 dicembre 2017, n. 221 — Disciplina sanzionatoria per la violazione del regolamento UE dual-use",
    date_enacted: "2017-12-15",
    date_in_force: "2018-02-01",
    date_last_amended: "2023-06-15",
    official_reference: "GU n. 14 del 18 gennaio 2018",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2017-12-15;221",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-MAECI-UAMA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "UAMA authority and licensing",
        summary:
          "UAMA (Unità per le Autorizzazioni dei Materiali d'Armamento) as the competent authority for dual-use export control. Licensing for exports of dual-use goods and technology, including spacecraft components and satellite subsystems.",
        complianceImplication:
          "All exports of dual-use space technology from Italy require UAMA authorization. Italy's catch-all clause (Art. 9) allows UAMA to control unlisted items.",
      },
      {
        section: "Art. 9",
        title: "Catch-all clause",
        summary:
          "Allows UAMA to require export authorization for dual-use items not listed in EU Annex I where there is reason to believe the items may be used for WMD, military end-use, or cyber-surveillance.",
        complianceImplication:
          "Operators must conduct due diligence on all technology transfers, even for items not on the EU dual-use list.",
      },
    ],
    related_sources: ["IT-LEGGE-185-1990", "IT-LEGGE-89-2025"],
    notes: [
      "Amended by DL 69/2023 increasing sanctions up to 6 years imprisonment.",
      "Italy adopted a national control list in 2024 that goes beyond EU Annex I, adding additional space-relevant items.",
    ],
    legislative_history: [
      {
        date: "2017-12-15",
        type: "presidential_signature",
        body: "Repubblica Italiana · Governo (delegated legislation)",
        reference: "Decreto Legislativo 15 dicembre 2017, n. 221",
        description:
          "Promulgazione del D.Lgs. 15 dicembre 2017, n. 221 — Attuazione della delega al Governo (Art. 7 Legge 12 agosto 2016, n. 170) per l'adeguamento della normativa nazionale al regolamento UE dual-use. Identificativo gazzetta: 18G00007.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2017-12-15;221",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Title and signature date confirmed against Normattiva. Gazzetta identifier 18G00007 confirmed. Delega base: Art. 7 Legge 170/2016.",
      },
      {
        date: "2018-02-01",
        type: "in_force",
        body: "Repubblica Italiana",
        reference: "Entrata in vigore",
        description:
          "Entrata in vigore del provvedimento — disciplina sanzionatoria per la violazione del regolamento UE dual-use.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2017-12-15;221",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entrata-in-vigore date 01/02/2018 confirmed against Normattiva primary record.",
      },
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "IT-LEGGE-185-1990",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Military Arms Export Control — Legge 185/1990",
    title_local:
      "Legge 9 luglio 1990, n. 185 — Nuove norme sul controllo dell'esportazione, importazione e transito dei materiali di armamento",
    date_enacted: "1990-07-09",
    date_in_force: "1990-07-14",
    official_reference: "GU n. 163 del 14 luglio 1990",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-07-09;185",
    issuing_body: "Parlamento della Repubblica Italiana",
    competent_authorities: ["IT-MAECI-UAMA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Scope — military materiel export controls",
        summary:
          "Comprehensive regime for the export, import, and transit of military materiel. Covers military satellites, satellite components with military applications, and COSMO-SkyMed system components.",
        complianceImplication:
          "Military satellite components and dual-use space technology with military applications require Legge 185/1990 authorization in addition to any EU dual-use regime requirements.",
      },
    ],
    related_sources: ["IT-DLGS-221-2017", "IT-DLGS-66-2010-SPACE"],
    notes: [
      "Key legislation for military satellite exports. COSMO-SkyMed components fall under this regime.",
      "Works alongside D.Lgs. 221/2017 (dual-use) — the two regimes are complementary but have separate authorization streams.",
    ],
    legislative_history: [
      {
        date: "1990-07-09",
        type: "presidential_signature",
        body: "Repubblica Italiana · Parlamento (Camera + Senato)",
        reference: "Legge 9 luglio 1990, n. 185",
        description:
          "Promulgazione della Legge 9 luglio 1990, n. 185 — Nuove norme sul controllo dell'esportazione, importazione e transito dei materiali di armamento.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-07-09;185",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Title and signature date confirmed against Normattiva primary record.",
      },
      {
        date: "1990-07-14",
        type: "promulgation",
        body: "Gazzetta Ufficiale della Repubblica Italiana",
        reference: "GU n. 163 del 14-07-1990",
        description:
          "Pubblicazione nella Gazzetta Ufficiale Serie Generale n. 163 del 14 luglio 1990.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-07-09;185",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU reference (n. 163, 14-07-1990) confirmed against the Normattiva metadata block.",
      },
      {
        date: "1990-07-29",
        type: "in_force",
        body: "Repubblica Italiana",
        reference: "Entrata in vigore",
        description:
          "Entrata in vigore della legge — 15 giorni dopo la pubblicazione in Gazzetta Ufficiale.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-07-09;185",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entrata-in-vigore date 29/07/1990 confirmed against Normattiva — corrects the catalogue's date_in_force '1990-07-14' which was the GU publication date, not the entry-into-force date.",
      },
      {
        date: "2013-10-10",
        type: "amendment",
        body: "Repubblica Italiana · Parlamento",
        description:
          "Last consolidated update of the text on Normattiva: 10/10/2013. Subsequent amendments through DL 69/2023 (sanctions increased to 6 years) tracked in Normattiva's multivigente view.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-07-09;185",
        verified: true,
        verified_by: "claude (claude-in-chrome MCP, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Last-update date 10/10/2013 confirmed against Normattiva metadata block (likely the last major consolidation; later amendments may not yet be reflected in the consolidated text).",
      },
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Cybersecurity (3) ─────────────────────────────────────────────

const CYBERSECURITY_IT: LegalSource[] = [
  {
    id: "IT-NIS2-DLGS-138-2024",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "NIS2 Transposition — D.Lgs. 138/2024",
    title_local:
      "Decreto legislativo 4 settembre 2024, n. 138 — Recepimento della direttiva (UE) 2022/2555 (NIS2)",
    date_enacted: "2024-09-04",
    date_in_force: "2024-10-16",
    official_reference: "GU n. 230 del 1 ottobre 2024",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-ACN"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Art. 3-4",
        title: "Space as high-criticality sector",
        summary:
          "Designates space as a 'settore ad alta criticità' (high-criticality sector). Space operators classified as essential or important entities depending on size and criticality. ACN designated as the NIS2 competent authority.",
        complianceImplication:
          "Space operators meeting size thresholds are subject to NIS2 cybersecurity obligations — risk management, incident reporting (24h initial, 72h full), supply chain security.",
      },
      {
        section: "Art. 23-25",
        title: "Registration and notification obligations",
        summary:
          "Entities in high-criticality sectors must register with ACN by February 2025. Incident notification within 24 hours (initial), 72 hours (full assessment). Administrative fines up to €10M or 2% of global turnover.",
        complianceImplication:
          "Space operators must register with ACN and implement incident notification procedures. The February 2025 registration deadline has passed.",
      },
    ],
    implements: "EU-NIS2-2022",
    related_sources: ["IT-PERIMETRO-2019", "IT-ACN-2021", "IT-LEGGE-89-2025"],
    notes: [
      "Space designated as 'settore ad alta criticità' — equivalent to essential service.",
      "ACN is the single national competent authority for NIS2 in Italy.",
      "Registration deadline: February 2025. First compliance assessments expected mid-2026.",
    ],
    legislative_history: [
      {
        date: "2024-09-04",
        type: "adoption",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 4 settembre 2024, n. 138",
        description:
          "Adoption of the NIS2 transposition decree under delegated legislative authority (delega Legge 21/2024). Identificativo Normattiva: 24G00155.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of adoption 4 settembre 2024 and identifier 24G00155 confirmed against Normattiva primary source.",
      },
      {
        date: "2024-10-01",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference: "GU Serie Generale n. 230 del 01-10-2024",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 230 del 1 ottobre 2024.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation confirmed against Normattiva — matches catalogue's 'GU n. 230 del 1 ottobre 2024'.",
      },
      {
        date: "2024-10-16",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "Normattiva — Testo in vigore dal: 16-10-2024",
        description:
          "Entrata in vigore con vacatio legis di 15 giorni dalla pubblicazione, recependo la NIS2 entro il termine UE del 17 ottobre 2024.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-in-force date 16 ottobre 2024 confirmed against Normattiva — matches catalogue's 'date_in_force: 2024-10-16'.",
      },
      {
        date: "2024-10-17",
        type: "implementation_act",
        body: "Repubblica Italiana · Governo (recepimento UE)",
        reference: "Direttiva (UE) 2022/2555 — termine di recepimento",
        description:
          "Italy's NIS2 transposition entered into force just before the EU directive's transposition deadline of 17 October 2024 — Italy is therefore not in default.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-09-04;138",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Cross-referenced against the verified EU-NIS2-2022 milestone (transposition deadline 17 October 2024).",
      },
    ],
    last_verified: "2026-04-28",
  },
  {
    id: "IT-PERIMETRO-2019",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "National Cybersecurity Perimeter — D.L. 105/2019",
    title_local:
      "Decreto-legge 21 settembre 2019, n. 105, convertito con modificazioni dalla L. 18 novembre 2019, n. 133 — Perimetro di Sicurezza Nazionale Cibernetica",
    date_enacted: "2019-09-21",
    date_in_force: "2019-09-22",
    official_reference: "GU n. 222 del 21 settembre 2019",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2019-09-21;105",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-ACN"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "National cybersecurity perimeter scope",
        summary:
          "Establishes the Perimetro di Sicurezza Nazionale Cibernetica covering ICT systems essential to national security. Space ground stations, mission control centres, and satellite communications infrastructure fall within the perimeter.",
        complianceImplication:
          "Operators with designated ground infrastructure must comply with enhanced cybersecurity requirements including technology vetting (golden power) for foreign-supplied components.",
      },
    ],
    related_sources: ["IT-NIS2-DLGS-138-2024", "IT-ACN-2021"],
    notes: [
      "D.L. 105/2019, converted into L. 133/2019. Space ground stations and mission control centres are within the perimeter.",
      "Predates NIS2 but remains in force as a national-security-specific layer above NIS2 baseline requirements.",
    ],
    legislative_history: [
      {
        date: "2019-09-21",
        type: "adoption",
        body: "Repubblica Italiana · Governo (decreto-legge urgenza)",
        reference: "Decreto-legge 21 settembre 2019, n. 105",
        description:
          "Adozione del decreto-legge urgenza 'Disposizioni urgenti in materia di perimetro di sicurezza nazionale cibernetica e di disciplina dei poteri speciali nei settori di rilevanza strategica' (Identificativo Normattiva: 19G00111).",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2019-09-21;105",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Data adozione 21.9.2019, identificativo 19G00111 e titolo verificati contro Normattiva primaria.",
      },
      {
        date: "2019-09-21",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference: "GU Serie Generale n. 222 del 21-09-2019",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 222 del 21 settembre 2019 (stesso giorno dell'adozione, prassi standard per i decreti-legge).",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2019-09-21;105",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note: "GU citation verificata contro Normattiva.",
      },
      {
        date: "2019-09-22",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "D.L. 105/2019 — Entrata in vigore",
        description:
          "Entrata in vigore il giorno successivo alla pubblicazione, prassi standard per i decreti-legge urgenza.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2019-09-21;105",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note: "Data EIF 22.9.2019 verificata contro Normattiva.",
      },
      {
        date: "2019-11-18",
        type: "adoption",
        body: "Repubblica Italiana · Parlamento",
        reference: "Legge 18 novembre 2019, n. 133 (legge di conversione)",
        description:
          "Conversione in legge del decreto-legge 105/2019 con modificazioni. Pubblicata in GU n. 272 del 20 novembre 2019.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2019-11-18;133",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Legge di conversione 133/2019, GU n. 272 del 20.11.2019 verificata contro Normattiva. La conversione consolida il decreto-legge come legge ordinaria con effetti retroattivi all'EIF originale (22.9.2019).",
      },
    ],
    last_verified: "2026-04-28",
  },
  {
    id: "IT-ACN-2021",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "ACN Establishment — D.L. 82/2021",
    title_local:
      "Decreto-legge 14 giugno 2021, n. 82, convertito con modificazioni dalla L. 4 agosto 2021, n. 109 — Istituzione dell'ACN",
    date_enacted: "2021-06-14",
    date_in_force: "2021-06-15",
    official_reference: "GU n. 140 del 14 giugno 2021",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2021-06-14;82",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-ACN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Art. 1-5",
        title: "ACN establishment and mandate",
        summary:
          "Establishes the Agenzia per la Cybersicurezza Nazionale (ACN) as Italy's national cybersecurity authority. ACN coordinates the Perimetro di Sicurezza Nazionale Cibernetica and serves as the NIS2 competent authority.",
        complianceImplication:
          "ACN is the single point of contact for all space cybersecurity matters — both NIS2 compliance and national perimeter security.",
      },
    ],
    related_sources: ["IT-NIS2-DLGS-138-2024", "IT-PERIMETRO-2019"],
    notes: [
      "D.L. 82/2021, converted into L. 109/2021. Strengthened by L. 90/2024.",
      "ACN is Italy's equivalent of ANSSI (France) or BSI (Germany) for cybersecurity.",
    ],
    legislative_history: [
      {
        date: "2021-06-14",
        type: "adoption",
        body: "Repubblica Italiana · Governo (decreto-legge urgenza)",
        reference: "Decreto-legge 14 giugno 2021, n. 82",
        description:
          "Adozione del decreto-legge urgenza 'Disposizioni urgenti in materia di cybersicurezza, definizione dell'architettura nazionale di cybersicurezza e istituzione dell'Agenzia per la cybersicurezza nazionale' (Identificativo Normattiva: 21G00098).",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2021-06-14;82",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Data adozione 14.6.2021, identificativo 21G00098 e titolo verificati contro Normattiva primaria.",
      },
      {
        date: "2021-06-14",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference: "GU Serie Generale n. 140 del 14-06-2021",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 140 del 14 giugno 2021 (stesso giorno dell'adozione, prassi standard per i decreti-legge).",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2021-06-14;82",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note: "GU citation verificata contro Normattiva.",
      },
      {
        date: "2021-06-15",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "D.L. 82/2021 — Entrata in vigore",
        description:
          "Entrata in vigore il giorno successivo alla pubblicazione, prassi standard per i decreti-legge urgenza.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2021-06-14;82",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note: "Data EIF 15.6.2021 verificata contro Normattiva.",
      },
      {
        date: "2021-08-04",
        type: "adoption",
        body: "Repubblica Italiana · Parlamento",
        reference: "Legge 4 agosto 2021, n. 109 (legge di conversione)",
        description:
          "Conversione in legge del decreto-legge 82/2021 con modificazioni. Pubblicata in GU n. 185 del 4 agosto 2021.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2021-08-04;109",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Legge di conversione 109/2021, GU n. 185 del 4.8.2021 verificata contro Normattiva. La conversione consolida il decreto-legge come legge ordinaria con effetti retroattivi all'EIF originale (15.6.2021).",
      },
    ],
    last_verified: "2026-04-28",
  },
];

// ─── Environmental (1) ─────────────────────────────────────────────

const ENVIRONMENTAL_IT: LegalSource[] = [
  {
    id: "IT-CODICE-AMBIENTE",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Environmental Code — D.Lgs. 152/2006",
    title_local:
      "Decreto legislativo 3 aprile 2006, n. 152 — Norme in materia ambientale (Codice dell'Ambiente)",
    date_enacted: "2006-04-03",
    date_in_force: "2006-04-29",
    official_reference: "GU n. 88 Suppl. Ord. del 14 aprile 2006",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2006-04-03;152",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-MASE"],
    relevance_level: "medium",
    applicable_to: ["launch_provider", "ground_segment"],
    compliance_areas: ["environmental"],
    key_provisions: [
      {
        section: "Part II (VIA, VAS, AIA)",
        title: "Environmental impact assessment frameworks",
        summary:
          "Establishes VIA (Valutazione di Impatto Ambientale), VAS (Valutazione Ambientale Strategica), and AIA (Autorizzazione Integrata Ambientale) frameworks. Launch site and propellant handling facilities are subject to VIA. Avio Colleferro facilities subject to Seveso III directive.",
        complianceImplication:
          "Launch providers must complete VIA before obtaining launch authorization. Propellant storage facilities may trigger Seveso III obligations. Legge 89/2025 Art. 5 integrates sustainability into the space authorization framework.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025", "IT-SASO-2023"],
    notes: [
      "Avio's Colleferro solid rocket motor facility is subject to Seveso III (D.Lgs. 105/2015) requirements.",
      "Legge 89/2025 Art. 5 integrates environmental sustainability into the space activity authorization criteria.",
    ],
    legislative_history: [
      {
        date: "2006-04-03",
        type: "adoption",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 3 aprile 2006, n. 152",
        description:
          "Adoption of the Codice dell'Ambiente — comprehensive environmental code consolidating VIA, VAS, AIA, water, waste, and air-quality regimes. Identificativo Normattiva: 006G0171.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2006-04-03;152",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of adoption 3 aprile 2006 and identifier 006G0171 confirmed against Normattiva primary source.",
      },
      {
        date: "2006-04-14",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference:
          "GU Serie Generale n. 88 del 14-04-2006 — Suppl. Ordinario n. 96",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 88 del 14 aprile 2006, Supplemento Ordinario n. 96.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2006-04-03;152",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation including Suppl. Ordinario n. 96 confirmed against Normattiva — augments the catalogue's 'GU n. 88 Suppl. Ord. del 14 aprile 2006' with the Suppl.Ord. number.",
      },
      {
        date: "2006-04-29",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "Normattiva — Testo in vigore dal: 29-4-2006",
        description:
          "Entrata in vigore generale con vacatio legis di 15 giorni; le disposizioni della Parte Seconda (VIA/VAS/AIA) sono entrate in vigore il 12 agosto 2006.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2006-04-03;152",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-in-force date 29 aprile 2006 confirmed against Normattiva (with delayed entry of Parte Seconda on 12 agosto 2006) — matches catalogue's 'date_in_force: 2006-04-29'.",
      },
    ],
    last_verified: "2026-04-28",
  },
];

// ─── Data Protection (1) ──────────────────────────────────────────

const DATA_PROTECTION_IT: LegalSource[] = [
  {
    id: "IT-PRIVACY-CODE",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Privacy Code — D.Lgs. 196/2003 (as amended by D.Lgs. 101/2018)",
    title_local:
      "Decreto legislativo 30 giugno 2003, n. 196 — Codice in materia di protezione dei dati personali",
    date_enacted: "2003-06-30",
    date_in_force: "2004-01-01",
    date_last_amended: "2018-09-19",
    official_reference: "GU n. 174 Suppl. Ord. del 29 luglio 2003",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-GARANTE"],
    relevance_level: "medium",
    applicable_to: ["data_provider", "satellite_operator"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Art. 2-bis ff. (as amended)",
        title: "GDPR adaptation and national provisions",
        summary:
          "Italian GDPR adaptation (via D.Lgs. 101/2018). Garante Decision 467/2018 establishes specific DPIA requirements for high-risk processing including systematic large-scale monitoring of public areas — directly applicable to satellite Earth observation.",
        complianceImplication:
          "EO operators processing imagery that can identify individuals must conduct DPIA and may need prior consultation with the Garante. Garante Decision 467/2018 specifically flags systematic monitoring.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025"],
    notes: [
      "D.Lgs. 196/2003 substantially amended by D.Lgs. 101/2018 to adapt to GDPR.",
      "Garante Decision 467/2018 on DPIA requirements — relevant for EO operators.",
    ],
    legislative_history: [
      {
        date: "2003-06-30",
        type: "adoption",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 30 giugno 2003, n. 196",
        description:
          "Adoption of the Codice in materia di protezione dei dati personali under delegated legislative authority. Identificativo Normattiva: 003G0218.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of adoption 30 giugno 2003 and identifier 003G0218 confirmed against Normattiva primary source.",
      },
      {
        date: "2003-07-29",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference:
          "GU Serie Generale n. 174 del 29-07-2003 — Suppl. Ordinario n. 123",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 174 del 29 luglio 2003, Supplemento Ordinario n. 123.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation including Suppl. Ordinario n. 123 confirmed against Normattiva — augments the catalogue's 'GU n. 174 Suppl. Ord. del 29 luglio 2003' with the Suppl.Ord. number.",
      },
      {
        date: "2004-01-01",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "Normattiva — Testo in vigore dal: 1-1-2004",
        description:
          "Entrata in vigore generale del Codice il 1° gennaio 2004 (con eccezioni: artt. 156, 176 commi 3-6, e 182 entrati in vigore il 30 luglio 2003).",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-in-force date 1 gennaio 2004 confirmed against Normattiva — matches catalogue's 'date_in_force: 2004-01-01'.",
      },
      {
        date: "2018-09-19",
        type: "amendment",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 10 agosto 2018, n. 101",
        description:
          "Adeguamento del Codice al GDPR (Regolamento (UE) 2016/679) tramite D.Lgs. 101/2018. Sostituisce gran parte degli articoli del Codice; mantiene le disposizioni nazionali specifiche (Garante, sanzioni penali).",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2018-08-10;101",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Cross-referenced against catalogue's 'date_last_amended: 2018-09-19' which matches D.Lgs. 101/2018 entrata-in-vigore.",
        affected_sections: ["Parte I (riformulata)", "Art. 2-bis ff."],
      },
    ],
    last_verified: "2026-04-28",
  },
];

// ─── Golden Power (1) ──────────────────────────────────────────────

const GOLDEN_POWER_IT: LegalSource[] = [
  {
    id: "IT-GOLDEN-POWER",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Golden Power — Foreign Investment Screening (D.L. 21/2012)",
    title_local:
      "Decreto-legge 15 marzo 2012, n. 21 — Norme in materia di poteri speciali sugli assetti societari nei settori della difesa e della sicurezza nazionale (Golden Power)",
    date_enacted: "2012-03-15",
    date_in_force: "2012-03-16",
    date_last_amended: "2024-01-01",
    official_reference: "GU n. 63 del 15 marzo 2012",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2012-03-15;21",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-PDC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Art. 1-2",
        title: "Special powers over strategic assets",
        summary:
          "Government may impose conditions on, block, or unwind acquisitions of companies in strategic sectors including aerospace, defence, and space. Expanded scope by D.L. 21/2019 and D.L. 23/2020 (COVID-19 emergency broadening). Space/aerospace sector explicitly covered.",
        complianceImplication:
          "Foreign investors acquiring stakes in Italian space companies must notify the PdCM. The government may exercise veto powers over transactions deemed threats to national security or strategic interests.",
      },
    ],
    related_sources: [
      "IT-LEGGE-89-2025",
      "IT-DLGS-66-2010-SPACE",
      "IT-PERIMETRO-2019",
    ],
    notes: [
      "Golden Power regime expanded significantly during COVID-19 (D.L. 23/2020).",
      "Space/aerospace is explicitly listed as a strategic sector subject to screening.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── EU Law (IT-specific references, 1) ───────────────────────────

const EU_IT: LegalSource[] = [
  {
    id: "IT-IRIS2",
    jurisdiction: "IT",
    type: "eu_regulation",
    status: "in_force",
    title_en: "IRIS\u00B2 Regulation — (EU) 2023/588",
    title_local:
      "Regolamento (UE) 2023/588 — Programma dell'Unione per la connettività sicura (IRIS\u00B2)",
    date_enacted: "2023-03-15",
    date_in_force: "2023-03-20",
    official_reference: "OJ L 79, 17.3.2023",
    source_url:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0588",
    issuing_body: "European Parliament and Council of the EU",
    competent_authorities: ["IT-ASI"],
    relevance_level: "medium",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["licensing", "cybersecurity"],
    key_provisions: [
      {
        section: "Art. 1-3",
        title: "EU secure connectivity constellation",
        summary:
          "Establishes the IRIS\u00B2 (Infrastructure for Resilience, Interconnectivity and Security by Satellite) programme for sovereign EU satellite connectivity. €6B budget. Telespazio (Leonardo) is a key member of the SpaceRISE consortium awarded the concession.",
        complianceImplication:
          "Italian companies in the SpaceRISE consortium (Telespazio, etc.) must comply with IRIS\u00B2 security and interoperability requirements. National ASI involvement in programme oversight.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025", "IT-NIS2-DLGS-138-2024"],
    notes: [
      "Telespazio (Leonardo Group) is a member of the SpaceRISE consortium alongside SES, Eutelsat, and Hispasat.",
      "IRIS\u00B2 is the EU's sovereign secure connectivity constellation — Italy's space industry is a major contributor.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Policy Documents (3) ──────────────────────────────────────────

const POLICY_IT: LegalSource[] = [
  {
    id: "IT-DSPSN-2019",
    jurisdiction: "IT",
    type: "policy_document",
    status: "in_force",
    title_en: "National Strategic Space Policy Document (DSPSN) 2019",
    title_local: "Documento Strategico di Politica Spaziale Nazionale (DSPSN)",
    date_published: "2019-12-01",
    source_url: "https://www.governo.it/it/politiche-spaziali",
    issuing_body:
      "Comitato Interministeriale per le Politiche Spaziali (COMINT)",
    competent_authorities: ["IT-COMINT"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Strategic Priorities",
        title: "National space policy framework",
        summary:
          "Defines Italy's space policy priorities: Earth observation, telecommunications, navigation, exploration, and space economy development. Sets the strategic foundation for Legge 89/2025.",
        complianceImplication:
          "Operators should align activities with national strategic priorities to maximize support and procurement opportunities.",
      },
    ],
    related_sources: [
      "IT-LEGGE-7-2018",
      "IT-LEGGE-89-2025",
      "IT-STRATEGIA-SICUREZZA-2019",
    ],
    notes: [
      "Approved December 2019 by COMINT. Sets Italy's space policy direction.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "IT-STRATEGIA-SICUREZZA-2019",
    jurisdiction: "IT",
    type: "policy_document",
    status: "in_force",
    title_en: "National Space Security Strategy 2019",
    title_local: "Strategia Nazionale di Sicurezza per lo Spazio",
    date_published: "2019-07-01",
    source_url: "https://www.governo.it/it/politiche-spaziali",
    issuing_body:
      "Comitato Interministeriale per le Politiche Spaziali (COMINT)",
    competent_authorities: ["IT-COMINT", "IT-MINDIFESA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "cybersecurity"],
    key_provisions: [
      {
        section: "Strategy Framework",
        title: "Space security national strategy",
        summary:
          "Defines Italy's approach to space security covering: space situational awareness, space defence, cybersecurity of space systems, and resilience of space infrastructure. Approved by COMINT July 2019.",
        complianceImplication:
          "Operators with dual-use or critical infrastructure designations should be aware of national security requirements and COS/ACN coordination.",
      },
    ],
    related_sources: [
      "IT-DSPSN-2019",
      "IT-DLGS-66-2010-SPACE",
      "IT-PERIMETRO-2019",
    ],
    notes: [
      "COMINT approved July 2019. First national strategy specifically addressing space security.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "IT-MANIFESTO-2024",
    jurisdiction: "IT",
    type: "policy_document",
    status: "in_force",
    title_en: "National Manifesto for Space Economy 2024",
    title_local: "Manifesto Nazionale per l'Economia dello Spazio",
    date_published: "2024-09-01",
    source_url: "https://www.governo.it/it/politiche-spaziali",
    issuing_body: "Presidenza del Consiglio dei Ministri",
    competent_authorities: ["IT-PDC", "IT-ASI"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "8 Pillars",
        title: "Space economy vision through 2034",
        summary:
          "Eight strategic pillars for the Italian space economy through 2034: (1) Earth observation, (2) telecommunications, (3) navigation, (4) exploration, (5) space transportation, (6) in-orbit services, (7) space economy applications, (8) workforce development. Published September 2024.",
        complianceImplication:
          "Operators aligned with the 8 pillars may benefit from enhanced access to Space Economy Fund resources and SME procurement preferences under Legge 89/2025.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025", "IT-DSPSN-2019", "IT-PNRR-SPACE"],
    notes: [
      "Published September 2024. 8 strategic pillars through 2034.",
      "Directly informs the 5-year national space plan under Legge 89/2025 Title V.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Programmes (1) ────────────────────────────────────────────────

const PROGRAMMES_IT: LegalSource[] = [
  {
    id: "IT-PNRR-SPACE",
    jurisdiction: "IT",
    type: "policy_document",
    status: "in_force",
    title_en: "PNRR Space Components — National Recovery and Resilience Plan",
    title_local:
      "Piano Nazionale di Ripresa e Resilienza (PNRR) — Componenti spaziali",
    date_published: "2021-04-30",
    date_last_amended: "2024-11-01",
    source_url: "https://www.italiadomani.gov.it",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-ASI", "IT-PDC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Space investments",
        title: "PNRR space programme components",
        summary:
          "Approximately €2.3B in space investments. Key programmes: IRIDE constellation (34+ satellites for Earth observation), SatCom infrastructure, Space Factory 4.0 (manufacturing modernization). IRIDE is the largest European EO constellation programme.",
        complianceImplication:
          "Operators participating in PNRR-funded programmes must comply with both EU recovery fund requirements and Italian space regulations including Legge 89/2025.",
      },
    ],
    related_sources: ["IT-LEGGE-89-2025", "IT-MANIFESTO-2024", "IT-DSPSN-2019"],
    notes: [
      "~€2.3B in space investments. IRIDE constellation (34+ satellites), SatCom, Space Factory 4.0.",
      "IRIDE is the largest European Earth observation constellation programme — managed by ASI with ESA technical support.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Bilateral Agreements (1) ──────────────────────────────────────

const BILATERAL_IT: LegalSource[] = [
  {
    id: "IT-KENYA-BROGLIO",
    jurisdiction: "IT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Italy-Kenya Agreement on Broglio Space Centre (San Marco)",
    title_local:
      "Accordo Italia-Kenya sul Centro Spaziale Luigi Broglio (San Marco)",
    date_enacted: "1995-03-01",
    source_url: "https://www.asi.it",
    issuing_body: "Government of Italy / Government of Kenya",
    competent_authorities: ["IT-ASI"],
    relevance_level: "low",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Framework",
        title: "Broglio Space Centre bilateral agreement",
        summary:
          "Bilateral Italy-Kenya agreement governing the Broglio Space Centre (formerly San Marco) in Malindi, Kenya. Italy was the third nation (after the US and USSR) to launch a satellite (San Marco 1, 1964). The Malindi ground station remains operational for tracking and telemetry.",
        complianceImplication:
          "Italian launch activities from Broglio/Malindi fall under this bilateral agreement alongside Legge 89/2025 authorization requirements.",
      },
    ],
    related_sources: ["IT-OST-RATIFICA", "IT-LEGGE-89-2025"],
    notes: [
      "Italy was the third nation to launch a satellite — San Marco 1, launched 15 December 1964 from Wallops Island (USA).",
      "The Broglio Space Centre in Malindi, Kenya remains operational as a ground tracking station. No active launch operations.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Launch Safety / Seveso (1) ────────────────────────────────────

const LAUNCH_SAFETY_IT: LegalSource[] = [
  {
    id: "IT-SEVESO-SPACE",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Seveso III Implementation — D.Lgs. 105/2015 (space-relevant provisions)",
    title_local:
      "Decreto legislativo 26 giugno 2015, n. 105 — Attuazione della direttiva 2012/18/UE (Seveso III)",
    date_enacted: "2015-06-26",
    date_in_force: "2015-07-29",
    official_reference: "GU n. 161 del 14 luglio 2015",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2015-06-26;105",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-MASE"],
    relevance_level: "medium",
    applicable_to: ["launch_provider", "ground_segment"],
    compliance_areas: ["environmental"],
    key_provisions: [
      {
        section: "Art. 3-6",
        title: "Major accident hazard controls for space facilities",
        summary:
          "Seveso III transposition covering establishments handling dangerous substances. Avio's Colleferro solid rocket motor manufacturing facility is a Seveso upper-tier establishment. Propellant handling, storage, and testing at launch sites triggers Seveso obligations including safety reports, emergency plans, and land-use planning restrictions.",
        complianceImplication:
          "Launch providers with propellant storage above Seveso thresholds must comply with major accident prevention requirements, submit safety reports, and coordinate with local authorities on emergency planning.",
      },
    ],
    related_sources: ["IT-CODICE-AMBIENTE", "IT-SASO-2023"],
    notes: [
      "Avio Colleferro is a Seveso III upper-tier establishment — directly relevant to Italy's launch capability.",
      "Grottaglie spaceport operations may trigger Seveso obligations depending on propellant types and quantities.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Telecommunications Reform Reference (1) ──────────────────────

const TELECOM_REFORM_IT: LegalSource[] = [
  {
    id: "IT-CCE-REFORM-2021",
    jurisdiction: "IT",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Code Reform — D.Lgs. 207/2021",
    title_local:
      "Decreto legislativo 8 novembre 2021, n. 207 — Attuazione della direttiva (UE) 2018/1972 (EECC)",
    date_enacted: "2021-11-08",
    date_in_force: "2021-12-24",
    official_reference: "GU n. 292 del 9 dicembre 2021",
    source_url:
      "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2021-11-08;207",
    issuing_body: "Governo della Repubblica Italiana",
    competent_authorities: ["IT-AGCOM"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Transposition",
        title: "EU Electronic Communications Code transposition",
        summary:
          "Transposes EU Directive 2018/1972 (European Electronic Communications Code) into Italian law. Modernizes D.Lgs. 259/2003 with updated spectrum management, network access, and authorization provisions for satellite services.",
        complianceImplication:
          "Updated satellite spectrum authorization regime. Operators should verify compliance with the reformed CCE provisions.",
      },
    ],
    amends: "IT-CCE-2003",
    related_sources: ["IT-CCE-2003"],
    notes: [
      "Transposes EU Directive 2018/1972 into Italian law, substantially reforming D.Lgs. 259/2003.",
    ],
    legislative_history: [
      {
        date: "2021-11-08",
        type: "adoption",
        body: "Repubblica Italiana · Governo (legislazione delegata)",
        reference: "Decreto legislativo 8 novembre 2021, n. 207",
        description:
          "Adoption of D.Lgs. 207/2021 — Attuazione della direttiva (UE) 2018/1972 (European Electronic Communications Code). Identificativo Normattiva: 21G00230.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2021-11-08;207",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of adoption 8 novembre 2021 and identifier 21G00230 confirmed against Normattiva primary source.",
      },
      {
        date: "2021-12-09",
        type: "promulgation",
        body: "Istituto Poligrafico e Zecca dello Stato (Gazzetta Ufficiale)",
        reference:
          "GU Serie Generale n. 292 del 09-12-2021 — Suppl. Ordinario n. 43",
        description:
          "Pubblicazione in Gazzetta Ufficiale Serie Generale n. 292 del 9 dicembre 2021, Supplemento Ordinario n. 43.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2021-11-08;207",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "GU citation including Suppl. Ordinario n. 43 confirmed against Normattiva — augments the catalogue's 'GU n. 292 del 9 dicembre 2021' with the Suppl.Ord. number.",
      },
      {
        date: "2021-12-24",
        type: "in_force",
        body: "Repubblica Italiana · Governo",
        reference: "Normattiva — Testo in vigore dal: 24-12-2021",
        description:
          "Entrata in vigore con vacatio legis di 15 giorni dalla pubblicazione in GU.",
        source_url:
          "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2021-11-08;207",
        verified: true,
        verified_by: "claude (WebFetch, Normattiva)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-in-force date 24 dicembre 2021 confirmed against Normattiva — matches catalogue's 'date_in_force: 2021-12-24'.",
      },
      {
        date: "2018-12-11",
        type: "implementation_act",
        body: "Parlamento europeo + Consiglio dell'UE",
        reference: "Direttiva (UE) 2018/1972 — EECC",
        description:
          "Direttiva UE oggetto del recepimento: European Electronic Communications Code (rifusione). Recepimento entro il 21 dicembre 2020 ai sensi della direttiva.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32018L1972",
        verified: true,
        verified_by: "claude (WebFetch, EUR-Lex)",
        verified_at: "2026-04-28",
        verification_note:
          "Identità della direttiva di recepimento confermata via EUR-Lex (CELEX 32018L1972). Italia ha recepito con ~12 mesi di ritardo rispetto al termine UE del 21 dicembre 2020.",
      },
    ],
    last_verified: "2026-04-28",
  },
];

// ─── Aggregated Export ─────────────────────────────────────────────

export const LEGAL_SOURCES_IT: LegalSource[] = [
  ...TREATIES_IT,
  ...PRIMARY_LEGISLATION_IT,
  ...IMPLEMENTING_IT,
  ...TELECOM_IT,
  ...TELECOM_REFORM_IT,
  ...EXPORT_CONTROL_IT,
  ...CYBERSECURITY_IT,
  ...ENVIRONMENTAL_IT,
  ...LAUNCH_SAFETY_IT,
  ...DATA_PROTECTION_IT,
  ...GOLDEN_POWER_IT,
  ...EU_IT,
  ...POLICY_IT,
  ...PROGRAMMES_IT,
  ...BILATERAL_IT,
];
