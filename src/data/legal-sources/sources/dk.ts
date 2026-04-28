// src/data/legal-sources/sources/dk.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Denmark space law sources — complete legal framework for jurisdiction DK.
 *
 * Sources: retsinformation.dk, ufm.dk, ft.dk
 * Last verified: 2026-04-14
 *
 * Notable: Modern 2016 Act (23 sections, 100km Kármán line definition).
 * Explicitly EXCLUDES Greenland and Faroe Islands (§23) — yet Denmark
 * bears international responsibility for the entire Kingdom. Pituffik
 * Space Base (UEWR radar) operates under 1951 Defence Agreement, not
 * Danish space law. EU defence opt-out abolished June 2022 (referendum).
 * BIFROST: first Danish military satellite, June 2025.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── DK Authorities (11) ──────────────────────────────────────────

export const AUTHORITIES_DK: Authority[] = [
  {
    id: "DK-UFM",
    jurisdiction: "DK",
    name_en: "Ministry of Higher Education and Science",
    name_local: "Uddannelses- og Forskningsministeriet",
    abbreviation: "UFM",
    website: "https://ufm.dk",
    space_mandate:
      "National coordinating authority for space. Holds formal responsibility for regulation, international cooperation (ESA, EU, COPUOS), and coordination through the Inter-Ministerial Space Committee. The minister grants space activity authorizations under Act 409/2016.",
    legal_basis: "LOV nr. 409 af 11/05/2016",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "DK-UFST",
    jurisdiction: "DK",
    name_en: "Danish Agency for Higher Education and Science",
    name_local: "Uddannelses- og Forskningsstyrelsen",
    abbreviation: "UFST",
    website: "https://ufm.dk/forskning-og-innovation/rummet",
    space_mandate:
      "Operational space authority — Denmark's space regulator. Responsible for approval, supervision, and registration of space activities (delegated from Minister by BEK nr. 1575/2017). Represents Denmark at ESA and COPUOS. Administers national space programme from 2026. Contact: sfu-jur@ufm.dk.",
    legal_basis: "BEK nr. 1575 af 15/12/2017",
    applicable_areas: ["licensing", "registration", "debris_mitigation"],
  },
  {
    id: "DK-DTU-SPACE",
    jurisdiction: "DK",
    name_en: "DTU Space — National Space Institute",
    name_local: "DTU Space — Nationalt Institut for Rummet",
    abbreviation: "DTU Space",
    website: "https://www.space.dtu.dk",
    space_mandate:
      "Denmark's largest space research institution and de facto technical advisory body. Participated in 100+ international space missions. ~169 staff. Develops instruments for NASA/ESA. Operates Greenland magnetometer array (19 stations). Hosts ESA BIC Denmark (opened March 2020). DTU investing ~DKK 2B over 5 years in space and defence research.",
    applicable_areas: ["licensing"],
  },
  {
    id: "DK-ENERGISTYRELSEN",
    jurisdiction: "DK",
    name_en: "Danish Energy Agency",
    name_local: "Energistyrelsen",
    abbreviation: "ENS",
    website: "https://ens.dk",
    space_mandate:
      "Spectrum allocation and frequency planning for space services, including ITU frequency and GEO-slot compliance — a prerequisite for authorization under the Outer Space Act.",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "DK-FORSVARET",
    jurisdiction: "DK",
    name_en: "Danish Defence / DALO",
    name_local: "Forsvaret / Forsvarets Materiel- og Indkøbsstyrelse",
    abbreviation: "DALO",
    website: "https://www.forsvaret.dk",
    space_mandate:
      "Military space activities. DALO finances military space projects including the BIFROST satellite (launched June 2025 — Denmark's first military surveillance satellite). Defence Minister coordinates with Education/Research Minister on space regulations. DKK 14.6B Arctic defence package (January 2025) includes expanded satellite capacity.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "DK-ERHVERVSSTYRELSEN",
    jurisdiction: "DK",
    name_en: "Danish Business Authority",
    name_local: "Erhvervsstyrelsen",
    abbreviation: "ERST",
    website: "https://erhvervsstyrelsen.dk",
    space_mandate:
      "Administers dual-use export controls for space technology under EU Regulation 2021/821 and Danish enabling legislation. Also administers FDI screening for critical technologies including space (since 1 July 2021).",
    applicable_areas: ["export_control"],
  },
  {
    id: "DK-MFA",
    jurisdiction: "DK",
    name_en: "Ministry of Foreign Affairs",
    name_local: "Udenrigsministeriet",
    abbreviation: "UM",
    website: "https://um.dk",
    space_mandate:
      "Manages access to Pituffik Space Base. Foreign/security policy assessments for export controls. Provides opinions on international obligations for space authorization decisions. Signed Artemis Accords (November 2024, 48th signatory).",
    applicable_areas: ["licensing", "export_control"],
  },
  {
    id: "DK-INTER-MINISTERIAL",
    jurisdiction: "DK",
    name_en: "Inter-Ministerial Space Committee",
    name_local: "Det Tværministerielle Rumudvalg",
    abbreviation: "TMRU",
    website: "https://ufm.dk",
    space_mandate:
      "Established 2016, chaired by UFM. Members from Ministries of Finance, Defence, Environment, Transport, and Foreign Affairs. Coordinates cross-government space policy.",
    applicable_areas: ["licensing"],
  },
  {
    id: "DK-DMI",
    jurisdiction: "DK",
    name_en: "Danish Meteorological Institute",
    name_local: "Danmarks Meteorologiske Institut",
    abbreviation: "DMI",
    website: "https://www.dmi.dk",
    space_mandate:
      "Partners in space projects, particularly maritime/weather satellite applications. Greenland ice monitoring and Arctic weather services using satellite data.",
    applicable_areas: ["environmental"],
  },
  {
    id: "DK-MOD",
    jurisdiction: "DK",
    name_en: "Ministry of Defence",
    name_local: "Forsvarsministeriet",
    abbreviation: "FMN",
    website: "https://fmn.dk",
    space_mandate:
      "Military space policy. Defence spending approaching 3% GDP. DKK 14.6B + DKK 27.4B Arctic defence packages (2025). EU defence opt-out abolished June 2022 — Denmark now fully participates in PESCO, EDA, GOVSATCOM, and ESA's European Resilience from Space initiative.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "DK-RESILIENCE-MINISTRY",
    jurisdiction: "DK",
    name_en: "Ministry for Societal Resilience and Contingency",
    name_local: "Ministeriet for Samfundssikkerhed og Beredskab",
    abbreviation: "MSB",
    website: "https://www.msb.dk",
    space_mandate:
      "Oversees NIS2/Cybersecurity implementation. Danish NIS2 Act enters force 1 July 2025, expanding coverage from ~1,000 to 6,000+ entities. Space as high-criticality sector. 'No gold-plating' approach.",
    applicable_areas: ["cybersecurity"],
  },
];

// ─── International Treaties (DK-specific entries, 4) ──────────────

const TREATIES_DK: LegalSource[] = [
  {
    id: "DK-OST-1967",
    jurisdiction: "DK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Denmark Ratification Record",
    title_local:
      "Traktat om principper for staters aktiviteter med hensyn til udforskning og udnyttelse af det ydre rum",
    date_enacted: "1967-01-27",
    date_in_force: "1967-10-10",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations / Folketinget",
    competent_authorities: ["DK-MFA", "DK-UFM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Denmark bears international responsibility for the ENTIRE Kingdom (including Greenland and Faroe Islands) — yet the 2016 Act explicitly excludes Greenland/Faroes (§23). This gap is the most consequential issue in Danish space law.",
        complianceImplication:
          "Denmark is internationally responsible for space activities across the entire Realm, but has no domestic licensing regime for Greenland. U.S. operations at Pituffik fall under the 1951 Defence Agreement.",
      },
    ],
    related_sources: ["DK-SPACE-ACT-2016", "DK-DEFENCE-GREENLAND-1951"],
    notes: [
      "Ratified on the day of entry into force (10 October 1967) — among the very first parties.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "DK-LIABILITY-CONV",
    jurisdiction: "DK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Denmark Ratification Record",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations / Folketinget",
    competent_authorities: ["DK-MFA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Denmark is absolutely liable for surface damage. The 2016 Act §11 implements both tiers: strict liability for ground/aircraft damage, fault-based for space damage. The Act does not specify fixed insurance amounts — the minister sets requirements per mission risk profile.",
        complianceImplication:
          "No statutory insurance cap. Operators may apply for exemption/reduction of insurance requirements (Executive Order §3). State operators exempt from insurance documentation.",
      },
    ],
    related_sources: ["DK-OST-1967", "DK-SPACE-ACT-2016"],
    last_verified: "2026-04-14",
  },
  {
    id: "DK-REGISTRATION-CONV",
    jurisdiction: "DK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Denmark Ratification Record",
    date_enacted: "1975-01-14",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations / Folketinget",
    competent_authorities: ["DK-UFST"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Implemented through the 2016 Act §10. The minister maintains a public registry; operators must provide relevant information. UFST administers the registry operationally.",
      },
    ],
    related_sources: ["DK-OST-1967", "DK-SPACE-ACT-2016"],
    last_verified: "2026-04-14",
  },
  {
    id: "DK-ARTEMIS-ACCORDS",
    jurisdiction: "DK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Denmark Signatory (2024)",
    date_enacted: "2024-11-13",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["DK-MFA", "DK-UFM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Denmark signed 13 November 2024 in Copenhagen — 48th signatory. Minister Christina Egelund signed, stating it was 'in line with the Danish government's upcoming strategy for space research and innovation.' Denmark NOT party to Moon Agreement.",
      },
    ],
    related_sources: ["DK-OST-1967"],
    notes: [
      "48th signatory, 13 November 2024 in Copenhagen.",
      "Denmark already contributed to Artemis via ESA's Orion European Service Module.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Primary National Legislation (2) ───────────────────────────

const PRIMARY_LEGISLATION_DK: LegalSource[] = [
  {
    id: "DK-SPACE-ACT-2016",
    jurisdiction: "DK",
    type: "federal_law",
    status: "in_force",
    title_en: "Outer Space Activities Act (Lov om aktiviteter i det ydre rum)",
    title_local: "Lov om aktiviteter i det ydre rum",
    date_enacted: "2016-05-11",
    date_in_force: "2016-07-01",
    official_reference: "LOV nr. 409 af 11/05/2016",
    source_url: "https://www.retsinformation.dk/eli/lta/2016/409",
    issuing_body: "Folketinget",
    competent_authorities: ["DK-UFM", "DK-UFST"],
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
        section: "§ 4",
        title: "100 km Kármán line definition",
        summary:
          "Outer space defined as the area located more than 100 km above sea level. One of the few national space laws to codify the Kármán line. The minister may extend provisions to civil activities below 100 km.",
        complianceImplication:
          "Clear boundary — activities above 100 km require authorization. Copenhagen Suborbitals' testing stays below this threshold.",
      },
      {
        section: "§§ 5-7",
        title: "Authorization regime",
        summary:
          "All non-governmental space activities require prior ministerial approval. State activities exempt. Five requirements: (1) technical/financial capacity, (2) international obligations compliance, (3) no national security jeopardy, (4) appropriate debris management, (5) other minister-determined conditions.",
      },
      {
        section: "§§ 11-14",
        title: "Liability and insurance — ministerial discretion",
        summary:
          "§11: strict liability for ground/aircraft damage, fault-based for space damage. §12: state right of recourse against operator. §13: minister MAY require insurance — no fixed statutory amount. §14: insurer procedural rules. Minister sets requirements per mission risk profile via executive order.",
        complianceImplication:
          "Insurance amounts NOT specified in statute — set through executive order with risk-based flexibility. Operators may apply for exemption (BEK 552 §3). No government backstop.",
      },
      {
        section: "§ 21",
        title: "Criminal penalties — up to 2 years",
        summary:
          "Fine or imprisonment up to 4 months for violations; up to 2 YEARS under aggravating circumstances. Legal persons criminally liable. Among the strongest criminal sanctions in European space law.",
        complianceImplication:
          "Significantly stronger than Finland (fines only), Sweden (1 year max), or Norway (3 months). The 2-year maximum for aggravating circumstances is notable.",
      },
      {
        section: "§ 23",
        title: "EXCLUDES Greenland and Faroe Islands",
        summary:
          "The Act does NOT apply to Greenland or the Faroe Islands. May be extended by Royal Decree with modifications — but NO such decree has been issued as of April 2026. This creates Denmark's most significant regulatory gap.",
        complianceImplication:
          "Space activities from Greenlandic/Faroese territory fall OUTSIDE the domestic regime — yet Denmark bears international treaty responsibility for the entire Kingdom. Pituffik operates under the 1951 Defence Agreement.",
      },
    ],
    scope_description:
      "10 chapters, 23 sections. Modern, concise framework covering authorization, registration, liability, debris, and transfers. Defines outer space at 100 km (Kármán line). Deliberately EXCLUDES Greenland and Faroe Islands (§23) — the most consequential gap. No amendments enacted through April 2026. Failed amendment attempts: L 125 (2019, permanent launch ban — not passed), L 77 (2023, temporary ban — withdrawn).",
    related_sources: [
      "DK-OST-1967",
      "DK-LIABILITY-CONV",
      "DK-SPACE-EXEC-ORDER-2016",
      "DK-DEFENCE-GREENLAND-1951",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "LOV nr. 409 af 11/05/2016. In force 1 July 2016. Unamended.",
      "100 km Kármán line codified — rare in national space laws.",
      "§23: EXCLUDES Greenland and Faroe Islands — no Royal Decree issued.",
      "Failed amendment L 125 (2019): permanent launch ban — not passed.",
      "Failed amendment L 77 (2023): temporary ban — withdrawn after Copenhagen Suborbitals opposition.",
      "25-year deorbit rule in implementing executive order (BEK 552 §6).",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "DK-SPACE-EXEC-ORDER-2016",
    jurisdiction: "DK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Executive Order on Space Activity Approval Requirements",
    title_local:
      "Bekendtgørelse om krav ved godkendelse af aktiviteter i det ydre rum m.v.",
    date_enacted: "2016-05-31",
    date_in_force: "2016-07-01",
    official_reference: "BEK nr. 552 af 31/05/2016",
    source_url: "https://www.retsinformation.dk/eli/lta/2016/552",
    issuing_body: "Uddannelses- og Forskningsministeriet",
    competent_authorities: ["DK-UFST"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "insurance", "debris_mitigation"],
    key_provisions: [
      {
        section: "§ 3",
        title: "Insurance exemption/reduction mechanism",
        summary:
          "Operators may apply for exemption from or reduction of insurance requirements with supporting documentation. Provides risk-based flexibility.",
      },
      {
        section: "§ 6",
        title: "25-year deorbit rule and debris standards",
        summary:
          "Agency may require activities in Earth orbit to meet ECSS and ISO debris management standards. 25-year deorbit rule applies as a general rule — space objects must safely leave orbit or re-enter within 25 years of end of operational life.",
        complianceImplication:
          "Explicit 25-year deorbit timeline — more specific than Finland's principles-based approach.",
      },
    ],
    related_sources: ["DK-SPACE-ACT-2016"],
    notes: ["BEK nr. 552 af 31/05/2016. No official English translation."],
    last_verified: "2026-04-14",
  },
];

// ─── Greenland/Pituffik (2) ─────────────────────────────────────

const GREENLAND_DK: LegalSource[] = [
  {
    id: "DK-DEFENCE-GREENLAND-1951",
    jurisdiction: "DK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Defence of Greenland Agreement (1951) — Pituffik Space Base",
    date_enacted: "1951-04-27",
    source_url: "https://www.state.gov",
    issuing_body: "Kingdom of Denmark / United States",
    competent_authorities: ["DK-MFA", "DK-MOD"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "U.S. military space operations at Pituffik",
        summary:
          "Foundational bilateral instrument governing Pituffik Space Base (76°31'N, renamed from Thule Air Base April 2023). Grants U.S. rights to construct/operate military installations with exclusive jurisdiction. Hosts: UEWR missile warning radar (240° coverage, 5,000+ km range), satellite tracking station (22,000+ contacts/year), space domain awareness. No fixed expiration. Denmark retains sovereignty.",
        complianceImplication:
          "Pituffik operates ENTIRELY outside Danish domestic space law — governed by this defence agreement. Any new U.S. bases in Greenland require consent from both Denmark and Greenland under the 2009 Self-Government Act.",
      },
    ],
    related_sources: ["DK-OST-1967", "DK-SPACE-ACT-2016", "DK-IGALIKU-2004"],
    notes: [
      "Signed 27 April 1951 in Washington, D.C.",
      "No fixed expiration — in force as long as both nations in NATO.",
      "Pituffik provides ~10% of U.S. observations of Earth-orbiting satellites.",
      "821st Space Base Group (Space Base Delta 1), ~150 U.S. service members.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "DK-IGALIKU-2004",
    jurisdiction: "DK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Igaliku Agreement (2004) — Amendment to 1951 Defence Agreement",
    date_enacted: "2004-08-06",
    source_url: "https://www.state.gov",
    issuing_body: "United States / Denmark / Greenland",
    competent_authorities: ["DK-MFA", "DK-MOD"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "UEWR authorization and Greenland recognition",
        summary:
          "Trilateral instrument (US-Denmark-Greenland). Authorized UEWR radar upgrade for missile defense. Required Greenlandic flag alongside Danish and U.S. flags. Granted Greenland the right to appoint a liaison officer. Created a Joint Committee meeting annually.",
        complianceImplication:
          "Critically, this was the first trilateral agreement recognizing Greenland's consultative role in defence/space matters at Pituffik.",
      },
    ],
    related_sources: ["DK-DEFENCE-GREENLAND-1951"],
    notes: [
      "Signed 6 August 2004 at Igaliku, Greenland.",
      "Signed by Colin Powell (US), Per Stig Møller (DK), Josef Motzfeldt (Greenland).",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_DK: LegalSource[] = [
  {
    id: "DK-EXPORT-CONTROL",
    jurisdiction: "DK",
    type: "federal_law",
    status: "in_force",
    title_en: "Dual-Use Export Control — Danish Enabling Legislation",
    title_local:
      "Bekendtgørelse om udførsel af produkter med dobbelt anvendelse og af visse non-listed dual-use items",
    date_enacted: "2011-06-09",
    date_last_amended: "2021-12-10",
    source_url: "https://www.retsinformation.dk/eli/lta/2011/635",
    issuing_body: "Folketinget",
    competent_authorities: ["DK-ERHVERVSSTYRELSEN", "DK-MFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Space technology export control",
        summary:
          "Consolidating Act No. 635/2011, amended by Act 2305/2021. Danish enabling legislation for EU Dual-Use Regulation (2021/821). Erhvervsstyrelsen administers licences. FDI screening for critical space technologies since 1 July 2021.",
      },
    ],
    related_sources: ["DK-SPACE-ACT-2016"],
    last_verified: "2026-04-14",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────

const CYBERSECURITY_DK: LegalSource[] = [
  {
    id: "DK-NIS2-2025",
    jurisdiction: "DK",
    type: "federal_law",
    status: "in_force",
    title_en: "Danish NIS2 Act (Cybersecurity)",
    title_local: "NIS2-implementeringsloven",
    date_enacted: "2025-02-06",
    date_in_force: "2025-07-01",
    source_url: "https://www.ft.dk/samling/20241/lovforslag/l141/index.htm",
    issuing_body: "Folketinget",
    competent_authorities: ["DK-RESILIENCE-MINISTRY"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space as high-criticality sector",
        summary:
          "Presented as L 141 on 6 February 2025. Expands coverage from ~1,000 entities (NIS1) to 6,000+ across 18 sectors. Space in NIS2 Annex I. 'No gold-plating' approach. Entities register by 1 October 2025 with sector-responsible authority.",
        complianceImplication:
          "Denmark missed the 17 October 2024 deadline. Act enters force 1 July 2025. Space operators (GomSpace, Terma, satellite ground stations) in scope.",
      },
    ],
    related_sources: ["DK-SPACE-ACT-2016"],
    notes: [
      "L 141 presented 6 February 2025. In force 1 July 2025.",
      "Denmark took 'no gold-plating' approach.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Policy (2) ─────────────────────────────────────────────────

const POLICY_DK: LegalSource[] = [
  {
    id: "DK-SPACE-STRATEGY-2025",
    jurisdiction: "DK",
    type: "policy_document",
    status: "in_force",
    title_en: "Strategy for Space Research and Innovation 2025-2035",
    title_local: "Strategi for rumforskning og -innovation 2025-2035",
    date_published: "2024-11-18",
    source_url: "https://ufm.dk",
    issuing_body: "Uddannelses- og Forskningsministeriet",
    competent_authorities: ["DK-UFM", "DK-UFST"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "Nine initiatives — doubling ESA contributions",
        summary:
          "Three pillars: stronger research, increased international influence, greater societal application. Nine initiatives including national space programme, doubling voluntary ESA contributions from DKK 280M to DKK 580M by 2035, up to 4 national missions over 10 years (including Danish-led ESA Moon mission 'Máni'), ~100 new startups.",
        complianceImplication:
          "Signals massive growth in Danish space ambitions. ~240 companies, DKK 6B turnover in the sector.",
      },
    ],
    related_sources: ["DK-SPACE-ACT-2016"],
    notes: [
      "Presented 18 November 2024 by Minister Egelund with astronaut Andreas Mogensen.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "DK-GREENLAND-SELF-GOVT-2009",
    jurisdiction: "DK",
    type: "federal_law",
    status: "in_force",
    title_en: "Greenland Self-Government Act",
    title_local: "Lov om Grønlands Selvstyre",
    date_enacted: "2009-06-12",
    date_in_force: "2009-06-21",
    official_reference: "Lov nr. 473 af 12/06/2009",
    source_url: "https://www.retsinformation.dk/eli/lta/2009/473",
    issuing_body: "Folketinget",
    competent_authorities: ["DK-MFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Greenland's autonomous status and space implications",
        summary:
          "Transferred extensive powers to Greenland but defence and foreign affairs remain under Danish state authority. Recognizes Greenlanders as 'a people with the right to self-determination.' New U.S. bases in Greenland require consent from BOTH Denmark and Greenland. Independence would require referendum + Danish parliamentary approval.",
        complianceImplication:
          "Denmark bears international space treaty responsibility for the entire Kingdom — but the Outer Space Act excludes Greenland. This creates the most consequential gap in Danish space law as Greenland's strategic importance intensifies.",
      },
    ],
    related_sources: ["DK-SPACE-ACT-2016", "DK-DEFENCE-GREENLAND-1951"],
    notes: [
      "Lov nr. 473 af 12/06/2009. Preceded by 2008 referendum (75.54% in favor).",
      "Defence, foreign affairs, constitution, Supreme Court, nationality, monetary policy remain under Danish state authority.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_DK: LegalSource[] = [
  ...TREATIES_DK,
  ...PRIMARY_LEGISLATION_DK,
  ...GREENLAND_DK,
  ...EXPORT_CONTROL_DK,
  ...CYBERSECURITY_DK,
  ...POLICY_DK,
];
