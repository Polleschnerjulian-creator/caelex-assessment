// src/data/legal-sources/sources/es.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Spain space law sources — complete legal framework for jurisdiction ES.
 *
 * Sources: boe.es, aee.gob.es, industria.gob.es
 * Last verified: 2026-04-14
 *
 * Notable: Spain is an ESA founding member (4th largest contributor, €1.85B
 * at CM25), hosts NASA's Madrid DSN and ESA's ESAC/Cebreros, and achieved
 * Europe's first private rocket launch (PLD Space MIURA 1, Oct 2023) — yet
 * has NO comprehensive national space activities law. Only a 1968 ministerial
 * order and a 1995 registry decree exist. The AEE (created 2023) is drafting
 * a Ley de Actividades Espaciales (public consultation Nov 2025).
 *
 * CRITICAL: "Ley 14/2023 de seguridad aeroespacial" does NOT exist.
 * BOE-A-2023-15549 is an unrelated foreign investment decree.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── ES Authorities (13) ──────────────────────────────────────────

export const AUTHORITIES_ES: Authority[] = [
  {
    id: "ES-AEE",
    jurisdiction: "ES",
    name_en: "Spanish Space Agency",
    name_local: "Agencia Espacial Española",
    abbreviation: "AEE",
    website: "https://www.aee.gob.es",
    space_mandate:
      "Created by RD 158/2023, operational since 20 April 2023. Headquartered in Seville. Agencia estatal under Art. 84.1.a).3 of Ley 40/2015 with legal personality, own assets, and treasury. Dually attached to Ministry of Science (primary) and Ministry of Defence. Director: Juan Carlos Cortés Pulido (also Vice-Chair ESA Council). Manages ESA contributions (~€296M+), coordinates national space policy, and is mandated to propose the Anteproyecto de Ley de Actividades Espaciales. NOT currently a licensing/regulatory authority — no authorization regime exists yet.",
    legal_basis: "Real Decreto 158/2023 (BOE-A-2023-6082)",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "ES-INTA",
    jurisdiction: "ES",
    name_en: "National Institute for Aerospace Technology",
    name_local: "Instituto Nacional de Técnica Aeroespacial 'Esteban Terradas'",
    abbreviation: "INTA",
    website: "https://www.inta.es",
    space_mandate:
      "Founded 7 May 1942. Organismo Público de Investigación (OPI) under Ministry of Defence. ~1,500 employees, ~€190M budget. Functions: aerospace testing/certification, small satellite development (Intasat, Minisat, NanoSat), sounding rockets, space science instruments (Mars missions). Operates ground stations: MDSCC (Madrid DSN), Maspalomas (Gran Canaria). Hosts El Arenosillo (CEDEA) — site of PLD Space MIURA 1 launch. Applies ESA ECSS standards.",
    legal_basis: "Real Decreto 925/2015",
    applicable_areas: ["licensing"],
  },
  {
    id: "ES-CDTI",
    jurisdiction: "ES",
    name_en: "Centre for Industrial Technology Development",
    name_local: "Centro para el Desarrollo Tecnológico y la Innovación, E.P.E.",
    abbreviation: "CDTI",
    website: "https://www.cdti.es",
    space_mandate:
      "Originally created 1977. Entidad Pública Empresarial under Ministry of Science. Historically served as Spain's delegation to ESA and primary civilian space funding body. AEE absorbed ESA-related functions, but CDTI retains space programme execution and PERTE Aeroespacial management. Current statute: RD 263/2026 (BOE-A-2026-7825).",
    legal_basis: "Real Decreto 263/2026 (BOE-A-2026-7825)",
    applicable_areas: ["licensing"],
  },
  {
    id: "ES-SETID",
    jurisdiction: "ES",
    name_en:
      "State Secretariat for Telecommunications and Digital Infrastructure",
    name_local:
      "Secretaría de Estado de Telecomunicaciones e Infraestructuras Digitales",
    abbreviation: "SETID",
    website: "https://avancedigital.mineco.gob.es",
    space_mandate:
      "Spain's primary spectrum management authority under Ministry for Digital Transformation. Manages planning, allocation, and control of the radioelectric spectrum including satellite orbit-spectrum resources. Maintains the CNAF (Cuadro Nacional de Atribución de Frecuencias). Issues spectrum use licenses. Files satellite network notations with the ITU.",
    legal_basis: "Ley 11/2022 (General Telecommunications Law)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "ES-CNMC",
    jurisdiction: "ES",
    name_en: "National Markets and Competition Commission",
    name_local: "Comisión Nacional de los Mercados y la Competencia",
    abbreviation: "CNMC",
    website: "https://www.cnmc.es",
    space_mandate:
      "Independent regulatory authority under Ley 3/2013. National Regulatory Authority for electronic communications including satellite services under Art. 100 of Ley 11/2022. Manages Telecoms Operators Registry. Issues preceptive opinions on spectrum plans. Does not directly allocate spectrum — that is SETID's role.",
    legal_basis: "Ley 3/2013; Ley 11/2022",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "ES-AEPD",
    jurisdiction: "ES",
    name_en: "Spanish Data Protection Agency",
    name_local: "Agencia Española de Protección de Datos",
    abbreviation: "AEPD",
    website: "https://www.aepd.es",
    space_mandate:
      "Independent supervisory authority under LO 3/2018 (LOPDGDD), implementing GDPR. Oversees personal data processing from satellite imagery, Earth observation data, and communications metadata.",
    legal_basis: "Ley Orgánica 3/2018 (BOE-A-2018-16673)",
    applicable_areas: ["data_security"],
  },
  {
    id: "ES-MOD",
    jurisdiction: "ES",
    name_en: "Ministry of Defence — Air and Space Force / MESPA",
    name_local:
      "Ministerio de Defensa — Ejército del Aire y del Espacio / Mando del Espacio",
    abbreviation: "MOD/MESPA",
    website: "https://www.defensa.gob.es",
    space_mandate:
      "The Ejército del Aire was renamed Ejército del Aire y del Espacio (Air and Space Force) by RD 524/2022. The Mando del Espacio (MESPA — Space Command) was created by Orden DEF/264/2023 to provide space capabilities (SSA, satellite protection) to the Armed Forces. AEE co-parent ministry. INTA parent ministry.",
    legal_basis: "RD 524/2022; Orden DEF/264/2023 (BOE-A-2023-7332)",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "ES-JIMDDU",
    jurisdiction: "ES",
    name_en: "Inter-Ministerial Board for Defence and Dual-Use Trade",
    name_local:
      "Junta Interministerial Reguladora del Comercio Exterior de Material de Defensa y de Doble Uso",
    abbreviation: "JIMDDU",
    website: "https://comercio.gob.es",
    space_mandate:
      "Inter-ministerial board conducting case-by-case analysis of ALL export authorization requests for defence materials and dual-use technologies under Ley 53/2007 and RD 679/2014. Composed of representatives from Ministries of Economy/Commerce, Defence, Foreign Affairs, and Interior. Issues mandatory binding reports. The Secretaría General de Comercio Exterior processes actual export licenses.",
    legal_basis: "Ley 53/2007; RD 679/2014 (BOE-A-2014-8926)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "ES-MINCIENCIA",
    jurisdiction: "ES",
    name_en: "Ministry of Science, Innovation and Universities",
    name_local: "Ministerio de Ciencia, Innovación y Universidades",
    abbreviation: "MCIU",
    website: "https://www.ciencia.gob.es",
    space_mandate:
      "Overall space policy ministry. AEE primary parent ministry. CDTI parent through Secretaría General de Innovación. At CM25 (November 2025), Minister Vanessa Matz represented Belgium — for Spain, the AEE Director leads ESA engagement.",
    applicable_areas: ["licensing"],
  },
  {
    id: "ES-MAEC",
    jurisdiction: "ES",
    name_en: "Ministry of Foreign Affairs, EU and Cooperation",
    name_local: "Ministerio de Asuntos Exteriores, Unión Europea y Cooperación",
    abbreviation: "MAEC",
    website: "https://www.exteriores.gob.es",
    space_mandate:
      "Treaty obligations and diplomatic representation at COPUOS. Manages the Registro Español de Objetos Espaciales through the Subdirección General de Relaciones Económicas Multilaterales (now coordinated via AEE). Signed the Artemis Accords (Minister Diana Morant, 30 May 2023).",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "ES-AEMET",
    jurisdiction: "ES",
    name_en: "Spanish Meteorological Agency",
    name_local: "Agencia Estatal de Meteorología",
    abbreviation: "AEMET",
    website: "https://www.aemet.es",
    space_mandate:
      "State agency under Ministry for Ecological Transition. Spain's EUMETSAT representative (founding member). Leads EUMETSAT's Nowcasting SAF (NWC SAF) — coordinating the European consortium for satellite-derived nowcasting products.",
    applicable_areas: ["environmental"],
  },
  {
    id: "ES-CCN",
    jurisdiction: "ES",
    name_en: "National Cryptologic Centre",
    name_local: "Centro Criptológico Nacional",
    abbreviation: "CCN",
    website: "https://www.ccn-cert.cni.es",
    space_mandate:
      "National cybersecurity authority under CNI (Centro Nacional de Inteligencia). Manages the Esquema Nacional de Seguridad (ENS, RD 311/2022). Current NIS1 implementation via RD-ley 12/2018. NIS2 transposition pending — Spain missed the October 2024 deadline and faces EC infringement proceedings.",
    legal_basis: "RD-ley 12/2018; RD 311/2022",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "ES-CNSA",
    jurisdiction: "ES",
    name_en: "National Aerospace Security Council",
    name_local: "Consejo Nacional de Seguridad Aeroespacial",
    abbreviation: "CNSA",
    website: "https://www.dsn.gob.es",
    space_mandate:
      "Support body of the Consejo de Seguridad Nacional. Established by Orden PCM/218/2020 (BOE-A-2020-3638), modified by Orden PCM/549/2023 (BOE-A-2023-13094) to add AEE representative. Coordinates aerospace security policy including the ESAN 2025 strategy.",
    legal_basis: "Orden PCM/218/2020 (BOE-A-2020-3638)",
    applicable_areas: ["military_dual_use", "cybersecurity"],
  },
];

// ─── International Treaties (ES-specific entries, 5) ──────────────

const TREATIES_ES: LegalSource[] = [
  {
    id: "ES-OST-1967",
    jurisdiction: "ES",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Spain Ratification Record",
    title_local:
      "Tratado sobre los principios que deben regir las actividades de los Estados en la exploración y utilización del espacio ultraterrestre",
    date_enacted: "1967-01-27",
    date_in_force: "1968-11-27",
    official_reference: "BOE-A-1969-151",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-1969-151",
    issuing_body: "Cortes Generales",
    competent_authorities: ["ES-MAEC", "ES-AEE"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Spain bears international responsibility for national space activities including by non-governmental entities. Activities require authorization and continuing supervision. However, Spain has NO domestic mechanism implementing this obligation — a fundamental gap.",
        complianceImplication:
          "Art. VI requires authorization of private activities, but Spain has no authorization regime. This is the single biggest regulatory gap in Spanish space law.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "Spain is a 'launching State' for objects launched from its territory (including El Arenosillo/CEDEA) or by Spanish entities.",
      },
    ],
    related_sources: [
      "ES-LIABILITY-1972",
      "ES-REGISTRATION-1975",
      "ES-RESCUE-2001",
      "ES-RD-278-1995",
      "ES-ORDEN-1968",
    ],
    notes: [
      "BOE-A-1969-151. Entry into force for Spain: 27 November 1968.",
      "Spain has NO domestic authorization regime implementing Art. VI — the most critical regulatory gap among major European spacefaring nations.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-RESCUE-2001",
    jurisdiction: "ES",
    type: "international_treaty",
    status: "in_force",
    title_en: "Rescue Agreement — Spain Accession Record",
    date_enacted: "1968-04-22",
    date_in_force: "2001-01-23",
    official_reference: "BOE-A-2001-10940",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2001-10940",
    issuing_body: "Cortes Generales",
    competent_authorities: ["ES-MAEC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "Rescue and return of astronauts",
        summary:
          "Contracting parties shall notify, rescue, and return astronauts. Spain acceded extremely late — 33 years after the treaty opened for signature (2001 vs 1968).",
      },
    ],
    related_sources: ["ES-OST-1967"],
    notes: [
      "BOE-A-2001-10940.",
      "Spain acceded 23 January 2001 — 33 years after the treaty opened for signature. One of the latest accessions among ESA founding members.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-LIABILITY-1972",
    jurisdiction: "ES",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Spain Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1979-12-06",
    official_reference: "BOE-A-1980-9057",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-1980-9057",
    issuing_body: "Cortes Generales",
    competent_authorities: ["ES-MAEC"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Spain as launching State is absolutely liable for damage on Earth's surface. However, NO domestic mechanism exists for requiring operators to carry insurance, establishing a right of recourse, or setting liability caps.",
        complianceImplication:
          "Spain has NO statutory insurance requirements, NO liability caps, NO financial guarantees, and NO government backstop — operators must rely on general Civil Code provisions and the 1980 Insurance Contracts Act (Ley 50/1980).",
      },
    ],
    related_sources: ["ES-OST-1967", "ES-RD-278-1995"],
    notes: [
      "BOE-A-1980-9057. Ratification entered into force 6 December 1979.",
      "No domestic liability/insurance regime for space activities — the biggest gap vs. peer jurisdictions (FR, UK, LU, BE all have comprehensive regimes).",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-REGISTRATION-1975",
    jurisdiction: "ES",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Spain Accession Record",
    date_enacted: "1975-01-14",
    date_in_force: "1979-01-29",
    official_reference: "BOE-A-1979-2626",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-1979-2626",
    issuing_body: "Cortes Generales",
    competent_authorities: ["ES-MAEC", "ES-AEE"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Spain must maintain a national registry of space objects. Implemented through Real Decreto 278/1995 — the Registro Español de Objetos Espaciales Lanzados al Espacio Ultraterrestre, managed by the Subdirección General de Relaciones Económicas Multilaterales (now coordinated via AEE).",
      },
    ],
    related_sources: ["ES-OST-1967", "ES-RD-278-1995"],
    notes: [
      "BOE-A-1979-2626. Acceded 4 December 1978, deposited 20 December 1978.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-ARTEMIS-ACCORDS",
    jurisdiction: "ES",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Spain Signatory (2023)",
    date_enacted: "2023-05-30",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["ES-MAEC", "ES-AEE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Signatories affirm that extraction of space resources does not inherently constitute national appropriation. Spain signed as 25th signatory — Minister Diana Morant signed at the Moncloa Palace with NASA Administrator Bill Nelson.",
      },
    ],
    related_sources: ["ES-OST-1967"],
    notes: [
      "Spain signed 30 May 2023 — 25th signatory state.",
      "Non-binding political document — no BOE instrument of ratification.",
      "Spain has NOT ratified and NOT signed the Moon Agreement.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Primary National Legislation (2 — minimal) ─────────────────

const PRIMARY_LEGISLATION_ES: LegalSource[] = [
  {
    id: "ES-ORDEN-1968",
    jurisdiction: "ES",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Ministerial Order of 19 April 1968 — Private Space Launches",
    title_local: "Orden de 19 de abril de 1968 del Ministerio del Aire",
    date_enacted: "1968-04-19",
    source_url: "https://www.defensa.gob.es",
    issuing_body: "Ministerio del Aire",
    competent_authorities: ["ES-MOD"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Regulation of private space launches",
        summary:
          "Regulates private space launches from national territory (ingenios espaciales de cualquier clase de carácter privado). Still technically in force but universally recognized as outdated and insufficient. Pre-dates digital BOE numbering.",
        complianceImplication:
          "The oldest space-specific regulation still in force among major European spacefaring nations. Provides no meaningful framework for modern commercial space activities.",
      },
    ],
    related_sources: ["ES-OST-1967", "ES-RD-278-1995"],
    notes: [
      "Pre-dates digital BOE numbering — from the Franco-era Ministerio del Aire.",
      "Still technically in force but completely obsolete for modern space activities.",
      "PLD Space's MIURA 1 launch (October 2023) operated under this order plus ad hoc INTA/MOD coordination.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-RD-278-1995",
    jurisdiction: "ES",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Royal Decree 278/1995 — Spanish Registry of Space Objects",
    title_local:
      "Real Decreto 278/1995, de 24 de febrero, por el que se crea el Registro Español de Objetos Espaciales",
    date_enacted: "1995-02-24",
    official_reference: "BOE-A-1995-6058",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-1995-6058",
    issuing_body: "Consejo de Ministros",
    competent_authorities: ["ES-MAEC", "ES-AEE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Registry creation",
        summary:
          "Creates the Registro Español de Objetos Espaciales Lanzados al Espacio Ultraterrestre, implementing the 1975 Registration Convention.",
      },
      {
        section: "Art. 2",
        title: "Registry management",
        summary:
          "Assigns management to the Subdirección General de Relaciones Económicas Multilaterales of the Ministry of Foreign Affairs (now coordinated through the AEE).",
      },
      {
        section: "Art. 5-6",
        title: "Registration obligations and data requirements",
        summary:
          "Defines registration obligations and required data: name of launching state, designation, orbital parameters (nodal period, inclination, apogee, perigee).",
      },
      {
        section: "Art. 7",
        title: "Data communication",
        summary:
          "Entities must communicate data to the Dirección General de Tecnología for transmission to the UN Secretary-General.",
      },
    ],
    scope_description:
      "Spain's ONLY substantive space-specific legal instrument besides the 1968 order. Creates the national registry of space objects. A draft modification is under public consultation to expand data requirements, introduce insurance obligations, and modernize for mega-constellations — but remains unpublished as of April 2026.",
    related_sources: ["ES-REGISTRATION-1975", "ES-OST-1967", "ES-ORDEN-1968"],
    notes: [
      "BOE-A-1995-6058.",
      "The only substantive space-specific decree in Spanish law.",
      "A draft modification is under public consultation (industria.gob.es) to introduce insurance obligations — not yet published.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── AEE Institutional Legislation (2) ──────────────────────────

const AEE_LEGISLATION_ES: LegalSource[] = [
  {
    id: "ES-LEY-17-2022",
    jurisdiction: "ES",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law 17/2022 — Science Act Modification (AEE Creation Authorization)",
    title_local:
      "Ley 17/2022, de 5 de septiembre, por la que se modifica la Ley 14/2011 de la Ciencia",
    date_enacted: "2022-09-05",
    official_reference: "BOE-A-2022-14581",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2022-14581",
    issuing_body: "Cortes Generales",
    competent_authorities: ["ES-AEE", "ES-MINCIENCIA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Disposición Adicional Tercera",
        title: "Authorization for AEE creation",
        summary:
          "Authorized creation of the Agencia Espacial Española as an agencia estatal attached to both the Ministry of Science and the Ministry of Defence. The legal basis for Spain's first dedicated space agency.",
        complianceImplication:
          "Establishes the institutional foundation for future space regulation. The AEE is mandated to propose a comprehensive Ley de Actividades Espaciales.",
      },
    ],
    related_sources: ["ES-RD-158-2023"],
    notes: [
      "BOE-A-2022-14581.",
      "Modified the 2011 Science, Technology and Innovation Act.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-RD-158-2023",
    jurisdiction: "ES",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Royal Decree 158/2023 — Statute of the Spanish Space Agency",
    title_local:
      "Real Decreto 158/2023, de 7 de marzo, por el que se aprueba el Estatuto de la Agencia Espacial Española",
    date_enacted: "2023-03-07",
    official_reference: "BOE-A-2023-6082",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2023-6082",
    issuing_body: "Consejo de Ministros",
    competent_authorities: ["ES-AEE", "ES-MINCIENCIA", "ES-MOD"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 5",
        title: "AEE competences",
        summary:
          "Enumerates comprehensive competences: space R&D&I coordination, ESA contribution management, space industry promotion. Crucially, Art. 5(x) mandates the AEE to propose an Anteproyecto de Ley de Actividades Espaciales (draft Space Activities Law).",
        complianceImplication:
          "The AEE is explicitly mandated to draft Spain's first comprehensive space law. Until enacted, no authorization, licensing, or insurance regime exists.",
      },
      {
        section: "Art. 84.1.a).3 Ley 40/2015",
        title: "Legal personality and dual attachment",
        summary:
          "The AEE is an agencia estatal with legal personality, own assets, and treasury. Dually attached to Ministry of Science (primary) and Ministry of Defence. Headquarters in Seville.",
      },
    ],
    scope_description:
      "Creates Spain's first dedicated space agency. The AEE absorbed CDTI's ESA-related functions. Consejo Rector includes representatives from the Presidency, twelve ministries, CNI, and INTA. Initial budget: €500-700M.",
    related_sources: ["ES-LEY-17-2022", "ES-SPACE-LAW-DRAFT"],
    notes: [
      "BOE-A-2023-6082.",
      "Constitutive meeting of Consejo Rector: 20 April 2023 in Seville.",
      "Director: Juan Carlos Cortés Pulido (appointed May 2024).",
      "Absorbed CDTI's ESA-related functions, derogating RD 1406/1986 Art. 3 para. 9.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Defence (3) ─────────────────────────────────────────────────

const DEFENCE_ES: LegalSource[] = [
  {
    id: "ES-RD-524-2022",
    jurisdiction: "ES",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Royal Decree 524/2022 — Air and Space Force Rename",
    title_local: "Real Decreto 524/2022, de 27 de junio",
    date_enacted: "2022-06-27",
    source_url: "https://www.boe.es",
    issuing_body: "Consejo de Ministros",
    competent_authorities: ["ES-MOD"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Ejército del Aire y del Espacio",
        summary:
          "Renamed the Ejército del Aire (Air Force) to Ejército del Aire y del Espacio (Air and Space Force), formally recognizing space as a military domain.",
      },
    ],
    related_sources: ["ES-DEF-264-2023"],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-DEF-264-2023",
    jurisdiction: "ES",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Order DEF/264/2023 — Air and Space Force Organization (MESPA)",
    title_local: "Orden DEF/264/2023, de 16 de marzo",
    date_enacted: "2023-03-16",
    official_reference: "BOE-A-2023-7332",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2023-7332",
    issuing_body: "Ministerio de Defensa",
    competent_authorities: ["ES-MOD"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Art. 9",
        title: "Mando del Espacio (MESPA) — Space Command",
        summary:
          "Creates the Fuerza Aeroespacial structure including MESPA (Space Command), providing space situational awareness and satellite protection capabilities to the operational structure of the Armed Forces.",
        complianceImplication:
          "Spain's Space Command is now operational, reflecting the growing military importance of space capabilities.",
      },
    ],
    related_sources: ["ES-RD-524-2022", "ES-ESAN-2025"],
    notes: [
      "BOE-A-2023-7332.",
      "MESPA provides SSA and satellite protection to the Armed Forces.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-ESAN-2025",
    jurisdiction: "ES",
    type: "policy_document",
    status: "in_force",
    title_en: "National Aerospace Security Strategy 2025 (ESAN)",
    title_local: "Estrategia de Seguridad Aeroespacial Nacional 2025",
    date_published: "2025-01-01",
    official_reference: "BOE-A-2025-16214",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2025-16214",
    issuing_body: "Presidencia del Gobierno / CNSA",
    competent_authorities: ["ES-CNSA", "ES-MOD"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "cybersecurity"],
    key_provisions: [
      {
        section: "Full document",
        title: "Aerospace security as unified domain",
        summary:
          "National security strategy treating aerospace security as a unified domain. Identifies threats to space infrastructure and calls for national space legislation. Published via Orden PJC/845/2025. Replaces ESAN 2019.",
        complianceImplication:
          "Signals policy intent for comprehensive space legislation. Not a regulatory instrument but a strategic framework.",
      },
    ],
    related_sources: ["ES-DEF-264-2023", "ES-RD-158-2023"],
    last_verified: "2026-04-14",
  },
];

// ─── Draft Legislation (1) ──────────────────────────────────────

const DRAFT_LEGISLATION_ES: LegalSource[] = [
  {
    id: "ES-SPACE-LAW-DRAFT",
    jurisdiction: "ES",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Draft Space Activities Law (Anteproyecto de Ley de Actividades Espaciales)",
    title_local: "Anteproyecto de Ley de Actividades Espaciales",
    date_published: "2025-11-05",
    source_url: "https://www.aee.gob.es",
    issuing_body: "Agencia Espacial Española",
    competent_authorities: ["ES-AEE"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
    ],
    key_provisions: [
      {
        section: "Public consultation",
        title: "Planned scope of comprehensive space law",
        summary:
          "Public consultation (Memoria de Consulta Pública Previa) ran 5 November to 5 December 2025. Planned scope: authorization regime, operational security, sustainability (debris mitigation, dark-sky protection), infrastructure resilience, insurance/financial guarantees, registry modernization, industry promotion, spaceport regulation. NO draft text published — still in earliest pre-legislative phase.",
        complianceImplication:
          "When enacted, this will be Spain's first comprehensive space activities law. Intended to align with the EU Space Act (COM(2025) 335). No projected adoption date announced.",
      },
    ],
    related_sources: ["ES-RD-158-2023", "ES-OST-1967", "ES-RD-278-1995"],
    notes: [
      "Public consultation: 5 November to 5 December 2025.",
      "Still in EARLIEST pre-legislative phase — no draft text, no projected adoption date.",
      "AEE acknowledges current framework is 'limited' for space commercialization.",
      "Intended to align with the EU Space Act (COM(2025) 335).",
      "Represents Spain's most significant regulatory gap vs. peer jurisdictions.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────

const TELECOM_ES: LegalSource[] = [
  {
    id: "ES-LEY-11-2022",
    jurisdiction: "ES",
    type: "federal_law",
    status: "in_force",
    title_en: "General Telecommunications Law (Ley 11/2022)",
    title_local: "Ley 11/2022, de 28 de junio, General de Telecomunicaciones",
    date_enacted: "2022-06-28",
    official_reference: "BOE-A-2022-10757",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2022-10757",
    issuing_body: "Cortes Generales",
    competent_authorities: ["ES-SETID", "ES-CNMC"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Art. 85.3",
        title: "Satellite orbit-spectrum resources",
        summary:
          "Utilization of radio spectrum through satellite networks is within state management. Exploitation of orbit-spectrum resources under Spanish sovereignty is reserved to the state via direct management or concession. Spectrum classified as bien de dominio público (public domain good).",
        complianceImplication:
          "Satellite operators using Spanish-filed frequencies require SETID spectrum authorization. All ITU coordination runs through SETID.",
      },
      {
        section: "Art. 88-94",
        title: "Enabling titles for spectrum use",
        summary:
          "Govern títulos habilitantes for spectrum use including satellite earth stations.",
      },
    ],
    related_sources: [],
    notes: [
      "BOE-A-2022-10757.",
      "Replaced Ley 9/2014. Transposes EU Electronic Communications Code (Directive 2018/1972).",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_ES: LegalSource[] = [
  {
    id: "ES-LEY-53-2007",
    jurisdiction: "ES",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law 53/2007 — External Trade Control of Defence and Dual-Use Goods",
    title_local:
      "Ley 53/2007, de 28 de diciembre, sobre el control del comercio exterior de material de defensa y de doble uso",
    date_enacted: "2007-12-28",
    official_reference: "BOE-A-2007-22437",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2007-22437",
    issuing_body: "Cortes Generales",
    competent_authorities: ["ES-JIMDDU"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Art. 4 / Art. 14",
        title: "Controlled items and authorization procedures",
        summary:
          "Defines controlled items and establishes the JIMDDU authorization procedure. Space technology exports require authorization whenever they fall under EU Regulation 2021/821 Annex I (MTCR-controlled launch vehicle technology, satellite components, propulsion systems) or the national military equipment list.",
        complianceImplication:
          "All space technology exports are reviewed case-by-case by JIMDDU. Catch-all clauses under Art. 4 of EU Regulation 2021/821 apply to unlisted items potentially destined for WMD programmes.",
      },
    ],
    related_sources: [],
    notes: [
      "BOE-A-2007-22437.",
      "Implementing regulation: RD 679/2014 (BOE-A-2014-8926), amended by RD 494/2020 and RD 414/2022.",
      "Space-relevant categories: Category 7 (navigation/avionics), Category 9 (aerospace/propulsion).",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Cybersecurity (2) ──────────────────────────────────────────

const CYBERSECURITY_ES: LegalSource[] = [
  {
    id: "ES-RD-LEY-12-2018",
    jurisdiction: "ES",
    type: "federal_law",
    status: "in_force",
    title_en: "Royal Decree-Law 12/2018 — NIS1 Transposition",
    title_local:
      "Real Decreto-ley 12/2018, de 7 de septiembre, de seguridad de las redes y sistemas de información",
    date_enacted: "2018-09-07",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2018-12257",
    issuing_body: "Consejo de Ministros",
    competent_authorities: ["ES-CCN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS1 Directive transposition",
        summary:
          "Transposes the NIS1 Directive (EU 2016/1148). Complemented by RD 311/2022 (Esquema Nacional de Seguridad — ENS). Currently the applicable cybersecurity law pending NIS2 transposition.",
        complianceImplication:
          "Space operators classified as essential services must comply. Spain MISSED the 17 October 2024 NIS2 transposition deadline — EC infringement proceedings opened November 2024, reasoned opinion May 2025.",
      },
    ],
    related_sources: ["ES-NIS2-DRAFT"],
    notes: [
      "Spain missed the NIS2 transposition deadline (17 October 2024).",
      "EC opened infringement proceedings November 2024; reasoned opinion (dictamen motivado) May 2025.",
      "RD-ley 12/2018 remains applicable until NIS2 transposition complete.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "ES-NIS2-DRAFT",
    jurisdiction: "ES",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Draft Cybersecurity Coordination and Governance Law — NIS2 Transposition",
    title_local:
      "Anteproyecto de Ley de Coordinación y Gobernanza de la Ciberseguridad",
    date_published: "2025-01-14",
    source_url: "https://www.boe.es",
    issuing_body: "Consejo de Ministros",
    competent_authorities: ["ES-CCN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full draft",
        title: "NIS2 Directive transposition",
        summary:
          "Council of Ministers approved Anteproyecto on 14 January 2025. Has NOT completed parliamentary processing and is NOT published in the BOE. Space included as critical sector under NIS2 Annex I.",
        complianceImplication:
          "Spain faces active EC infringement proceedings. Operators should prepare proactively for NIS2 obligations despite the transposition delay.",
      },
    ],
    related_sources: ["ES-RD-LEY-12-2018"],
    notes: [
      "Approved by Council of Ministers 14 January 2025.",
      "Has NOT completed parliamentary processing — NOT in BOE.",
      "Spain under active EC infringement proceedings for missed deadline.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Data Protection (1) ────────────────────────────────────────

const DATA_PROTECTION_ES: LegalSource[] = [
  {
    id: "ES-LOPDGDD-2018",
    jurisdiction: "ES",
    type: "federal_law",
    status: "in_force",
    title_en: "Organic Law 3/2018 — GDPR Implementation (LOPDGDD)",
    title_local:
      "Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales",
    date_enacted: "2018-12-05",
    official_reference: "BOE-A-2018-16673",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2018-16673",
    issuing_body: "Cortes Generales",
    competent_authorities: ["ES-AEPD"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator", "all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "GDPR implementation and digital rights",
        summary:
          "Implements GDPR into Spanish law. AEPD is the supervisory authority. Applies to satellite data processing, Earth observation imagery, and communications metadata.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-14",
  },
];

// ─── ESA/Bilateral Agreements (1) ───────────────────────────────

const BILATERAL_ES: LegalSource[] = [
  {
    id: "ES-ESA-HOST-2012",
    jurisdiction: "ES",
    type: "international_treaty",
    status: "in_force",
    title_en: "Spain–ESA Host Country Agreement (ESAC and Cebreros)",
    title_local:
      "Acuerdo entre el Reino de España y la ESA relativo al establecimiento permanente de la ESA en España",
    date_enacted: "2012-06-13",
    date_in_force: "2013-02-17",
    official_reference: "BOE-A-2012-9714",
    source_url: "https://www.boe.es/buscar/doc.php?id=BOE-A-2012-9714",
    issuing_body: "Kingdom of Spain / ESA",
    competent_authorities: ["ES-MAEC", "ES-AEE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA permanent establishments in Spain",
        summary:
          "Governs ESA sites in Spain: ESAC at Villafranca del Castillo (Science Operations Centres for nearly all ESA missions) and Cebreros deep space antenna (35m, DSA-2, Ka-band). Superseded earlier agreements for Villafranca (1974) and Cebreros (2003). Extended by Exchange of Notes of 10/17 July 2024 (BOE-A-2024-17241).",
        complianceImplication:
          "ESA operations at ESAC and Cebreros governed by this agreement. Maspalomas (Gran Canaria) operated by INTA under separate arrangement.",
      },
    ],
    related_sources: ["ES-RD-158-2023"],
    notes: [
      "BOE-A-2012-9714. In force 17 February 2013.",
      "Amended by Exchange of Notes 10/17 July 2024 (BOE-A-2024-17241).",
      "ESAC: ESA Science Operations Centres. Cebreros: 35m deep space antenna (Mars Express, Gaia, JUICE).",
      "NASA MDSCC at Robledo de Chavela operates under separate 2024 bilateral agreement.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_ES: LegalSource[] = [
  {
    id: "ES-CM25-ESA",
    jurisdiction: "ES",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Spain CM25 ESA Commitment — €1.85 Billion (November 2025, Bremen)",
    date_published: "2025-11-01",
    source_url: "https://www.aee.gob.es",
    issuing_body: "AEE / Government of Spain",
    competent_authorities: ["ES-AEE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Programme",
        title: "Record ESA commitment — 4th largest contributor",
        summary:
          "Spain pledged €1.85 billion at CM25 (November 2025, Bremen) — 100%+ increase over CM22 (€920M). Spain became the 4th largest ESA contributor for the first time, behind Germany (€5.07B), France (€3.6B), Italy (€3.46B), ahead of UK (€1.71B). Average annual investment: €455M through 2030. Spain invested above its GDP share for the first time.",
        complianceImplication:
          "Signals massive growth in Spanish space ambitions. The institutional framework (AEE, MESPA, CDTI) is ready — the regulatory framework (Ley de Actividades Espaciales) is what's missing.",
      },
    ],
    related_sources: ["ES-RD-158-2023", "ES-SPACE-LAW-DRAFT"],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_ES: LegalSource[] = [
  ...TREATIES_ES,
  ...PRIMARY_LEGISLATION_ES,
  ...AEE_LEGISLATION_ES,
  ...DEFENCE_ES,
  ...DRAFT_LEGISLATION_ES,
  ...TELECOM_ES,
  ...EXPORT_CONTROL_ES,
  ...CYBERSECURITY_ES,
  ...DATA_PROTECTION_ES,
  ...BILATERAL_ES,
  ...POLICY_ES,
];
