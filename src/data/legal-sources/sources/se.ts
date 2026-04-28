// src/data/legal-sources/sources/se.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Sweden space law sources — complete legal framework for jurisdiction SE.
 *
 * Sources: riksdagen.se, rymdstyrelsen.se, government.se
 * Last verified: 2026-04-14
 *
 * Notable: One of world's earliest space laws (1982, 6 sections on one page).
 * NO insurance mandate, NO licensing criteria, NO debris rules. Sounding rockets
 * explicitly excluded. SOU 2021:91 reform (455 pages) stalled. ESA founding
 * member. Esrange being transformed into orbital launch site (Firefly, Perigee).
 * First military satellite GNA-3 launched 2024. NATO member since March 2024.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── SE Authorities (14) ──────────────────────────────────────────

export const AUTHORITIES_SE: Authority[] = [
  {
    id: "SE-SNSA",
    jurisdiction: "SE",
    name_en: "Swedish National Space Agency",
    name_local: "Rymdstyrelsen",
    abbreviation: "SNSA",
    website: "https://www.rymdstyrelsen.se",
    space_mandate:
      "Central governmental agency under Ministry of Education and Research. ~30 employees, Solna. Director-General: Anna Rathsman. Prepares licence applications, supervises licensed activities, maintains space object registry, coordinates ESA and EU space participation. Does NOT decide on licences — forwards to the Government. ~70% of ~900 MSEK budget goes to ESA. English name changed from 'Swedish National Space Board' in 2018.",
    legal_basis: "Förordning (2007:1115) med instruktion för Rymdstyrelsen",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "SE-SSC",
    jurisdiction: "SE",
    name_en: "SSC Space AB (formerly Swedish Space Corporation)",
    name_local: "SSC Space AB",
    abbreviation: "SSC",
    website: "https://www.sscspace.com",
    space_mandate:
      "100% state-owned company, founded 1972. ~750 employees, ~MSEK 1,744 turnover (2024). CEO: Charlotta Sund. Operates Esrange Space Center and one of the world's largest commercial ground station networks (10 owned + 11 partner stations). Key divisions: Connect (ground stations), Orbital Launch & Rocket Test, Science Services. Subsidiaries: ECAPS (green propulsion), NanoSpace (MEMS). NOT a regulator — the key operational entity.",
    applicable_areas: ["licensing"],
  },
  {
    id: "SE-PTS",
    jurisdiction: "SE",
    name_en: "Swedish Post and Telecom Authority",
    name_local: "Post- och telestyrelsen",
    abbreviation: "PTS",
    website: "https://www.pts.se",
    space_mandate:
      "Satellite spectrum allocation, satellite earth station licensing, ITU representation. Consulted on all space activity licence applications. Under Ministry of Finance. Manages Swedish ITU coordination for satellite filings.",
    legal_basis: "Lag (2022:482) om elektronisk kommunikation",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "SE-ISP",
    jurisdiction: "SE",
    name_en: "Swedish Inspectorate of Strategic Products",
    name_local: "Inspektionen för strategiska produkter",
    abbreviation: "ISP",
    website: "https://www.isp.se",
    space_mandate:
      "Competent authority for both dual-use and military equipment export licensing. Controls space technology exports including satellite components, propulsion systems, and encryption. Also the FDI screening authority. Under Ministry for Foreign Affairs.",
    legal_basis: "Lag (2000:1064); Lag (1992:1300)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "SE-FORSVARSMAKTEN",
    jurisdiction: "SE",
    name_en: "Swedish Armed Forces — Space Division",
    name_local: "Försvarsmakten — Rymdavdelningen",
    abbreviation: "FM",
    website: "https://www.forsvarsmakten.se",
    space_mandate:
      "Established a Space Division (Rymdavdelningen) in 2023 under the Air Force. Launched Sweden's first military satellite GNA-3 on 16 August 2024 (SpaceX Falcon 9). Developing SSA capabilities and military satellite communications. SEK 5.3B allocated for unmanned systems and space, SEK 1.3B specifically for reconnaissance satellites.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "SE-FMV",
    jurisdiction: "SE",
    name_en: "Swedish Defence Materiel Administration",
    name_local: "Försvarets materielverk",
    abbreviation: "FMV",
    website: "https://www.fmv.se",
    space_mandate:
      "Aviation and Space Division manages space procurement. SEK 209M contract with SSC for satellite launch capability from Esrange (March 2026). Contracted ICEYE and Planet Labs for ~10 military ISR satellites (~USD 142M, January 2026). Military launch capability planned operational by 2028.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "SE-IMY",
    jurisdiction: "SE",
    name_en: "Swedish Authority for Privacy Protection",
    name_local: "Integritetsskyddsmyndigheten",
    abbreviation: "IMY",
    website: "https://www.imy.se",
    space_mandate:
      "National GDPR supervisory authority. Relevant to satellite Earth observation data, high-resolution imagery, and geolocation services. Operates an AI regulatory sandbox.",
    legal_basis: "Lag (2018:218) Dataskyddslagen",
    applicable_areas: ["data_security"],
  },
  {
    id: "SE-MCF",
    jurisdiction: "SE",
    name_en: "Agency for Civil Defence (formerly MSB)",
    name_local: "Myndigheten för civilt försvar",
    abbreviation: "MCF",
    website: "https://www.msb.se",
    space_mandate:
      "Formerly MSB, renamed 1 January 2026. National coordinator for NIS2/Cybersecurity Act (Cybersäkerhetslagen SFS 2025:1506). Space operators providing essential/important services must comply with cybersecurity risk management and incident reporting.",
    legal_basis: "Cybersäkerhetslagen (SFS 2025:1506)",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "SE-SMHI",
    jurisdiction: "SE",
    name_en: "Swedish Meteorological and Hydrological Institute",
    name_local: "Sveriges meteorologiska och hydrologiska institut",
    abbreviation: "SMHI",
    website: "https://www.smhi.se",
    space_mandate:
      "Sweden's EUMETSAT representative. ~650 employees, Norrköping. Operates direct readout satellite station, leads NWC-SAF and CM-SAF activities. Led the Arctic Weather Satellite programme. Develops open-source Pytroll software. Involved in EPS-Sterna constellation (20 weather satellites).",
    applicable_areas: ["environmental"],
  },
  {
    id: "SE-IRF",
    jurisdiction: "SE",
    name_en: "Swedish Institute of Space Physics",
    name_local: "Institutet för rymdfysik",
    abbreviation: "IRF",
    website: "https://www.irf.se",
    space_mandate:
      "State research institute, Kiruna. Builds instruments for Swedish and international satellite missions. Key contributor to Swedish space science capabilities.",
    applicable_areas: ["licensing"],
  },
  {
    id: "SE-FOI",
    jurisdiction: "SE",
    name_en: "Swedish Defence Research Agency",
    name_local: "Totalförsvarets forskningsinstitut",
    abbreviation: "FOI",
    website: "https://www.foi.se",
    space_mandate:
      "Defence-related space research. Co-developed GNA-3 satellite with SSC. Assessed dual-use risks of Chinese access to SSC ground stations (leading to 2020 access termination). Strategic space technology analysis.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "SE-MOD",
    jurisdiction: "SE",
    name_en: "Ministry of Defence",
    name_local: "Försvarsdepartementet",
    abbreviation: "FöD",
    website:
      "https://www.government.se/government-of-sweden/ministry-of-defence",
    space_mandate:
      "Military space policy. Published Sweden's first defence and security space strategy (4 July 2024). NATO accession (7 March 2024) elevated Esrange as responsive launch asset. Minister stated capability to launch replacement satellite 'within 24 hours' if ally satellite attacked.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "SE-UTRIKESDEP",
    jurisdiction: "SE",
    name_en: "Ministry for Foreign Affairs",
    name_local: "Utrikesdepartementet",
    abbreviation: "UD",
    website:
      "https://www.government.se/government-of-sweden/ministry-for-foreign-affairs",
    space_mandate:
      "Treaty obligations and COPUOS representation. Signed US-Sweden Technology Safeguards Agreement (20 June 2025). ISP operates under this ministry. Manages space object registration transmission to UN Secretary-General.",
    applicable_areas: ["licensing", "export_control"],
  },
  {
    id: "SE-NATURVARDSVERKET",
    jurisdiction: "SE",
    name_en: "Swedish Environmental Protection Agency",
    name_local: "Naturvårdsverket",
    abbreviation: "NVV",
    website: "https://www.naturvardsverket.se",
    space_mandate:
      "Environmental permitting for Esrange launch operations under the Miljöbalken (Environmental Code, 1998:808). Fuel handling and launch operations require environmental permits.",
    applicable_areas: ["environmental"],
  },
];

// ─── International Treaties (SE-specific entries, 4) ──────────────

const TREATIES_SE: LegalSource[] = [
  {
    id: "SE-OST-1967",
    jurisdiction: "SE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Sweden Ratification Record",
    title_local: "Rymdfördraget",
    date_enacted: "1967-01-27",
    date_in_force: "1967-10-11",
    official_reference: "SÖ 1967:7",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations / Riksdagen",
    competent_authorities: ["SE-UTRIKESDEP", "SE-SNSA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Sweden bears international responsibility for national space activities. Ratified 11 October 1967 — one day after entry into force, among the very first parties. The 1982 Space Activities Act was specifically designed to implement Art. VI.",
        complianceImplication:
          "Art. VI is the direct legal basis for the 1982 Act's licensing requirement (Section 2).",
      },
    ],
    related_sources: [
      "SE-SPACE-ACT-1982",
      "SE-LIABILITY-CONV",
      "SE-REGISTRATION-CONV",
    ],
    notes: [
      "SÖ 1967:7. Ratified 11 October 1967 — among the very first parties.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "SE-LIABILITY-CONV",
    jurisdiction: "SE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Sweden Ratification Record",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations / Riksdagen",
    competent_authorities: ["SE-UTRIKESDEP"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Sweden as launching State is absolutely liable for surface damage. Section 6 of the 1982 Act directly implements the recourse mechanism — operator reimburses the State, but with NO insurance mandate, NO liability cap, and NO government backstop.",
        complianceImplication:
          "Sweden's liability regime is uniquely minimalist in Europe: unlimited recourse with only a discretionary 'special reasons' exception. No insurance specified.",
      },
    ],
    related_sources: ["SE-OST-1967", "SE-SPACE-ACT-1982"],
    last_verified: "2026-04-14",
  },
  {
    id: "SE-REGISTRATION-CONV",
    jurisdiction: "SE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Sweden Ratification Record",
    date_enacted: "1975-01-14",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations / Riksdagen",
    competent_authorities: ["SE-SNSA", "SE-UTRIKESDEP"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Implemented through Section 4 of the Space Activities Ordinance (1982:1069). Rymdstyrelsen maintains the registry; data transmitted to UN Secretary-General via Ministry for Foreign Affairs.",
      },
    ],
    related_sources: [
      "SE-OST-1967",
      "SE-SPACE-ACT-1982",
      "SE-SPACE-ORDINANCE-1982",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "SE-ARTEMIS-ACCORDS",
    jurisdiction: "SE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Sweden Signatory (2024)",
    date_enacted: "2024-04-16",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["SE-UTRIKESDEP", "SE-SNSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Sweden signed 16 April 2024 — 38th signatory, ~14th ESA member. Minister Mats Persson signed at Rosenbad, Stockholm. Stated the Accords 'strengthen Sweden's strategic space partnership with the US' and support 'Sweden's total defense capability.' Sweden has NOT signed/ratified the Moon Agreement.",
      },
    ],
    related_sources: ["SE-OST-1967"],
    notes: ["38th signatory, signed 16 April 2024 at Rosenbad."],
    last_verified: "2026-04-14",
  },
];

// ─── Primary National Legislation (2) ───────────────────────────

const PRIMARY_LEGISLATION_SE: LegalSource[] = [
  {
    id: "SE-SPACE-ACT-1982",
    jurisdiction: "SE",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Activities Act (Lag om rymdverksamhet)",
    title_local: "Lag (1982:963) om rymdverksamhet",
    date_enacted: "1982-11-18",
    date_in_force: "1983-01-01",
    official_reference: "SFS 1982:963",
    parliamentary_reference: "Prop. 1981/82:226",
    source_url:
      "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1982963-om-rymdverksamhet_sfs-1982-963",
    issuing_body: "Riksdagen",
    competent_authorities: ["SE-SNSA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Scope — sounding rockets EXCLUDED",
        summary:
          "Space activities = activities in outer space, launching into outer space, and measures to manoeuvre/affect launched objects. Explicitly EXCLUDES reception of signals and launching of sounding rockets — significant given Esrange's heritage.",
        complianceImplication:
          "The sounding rocket exclusion means the vast majority of Esrange's 600+ launches fell outside the Act. Orbital launches require full licensing.",
      },
      {
        section: "§ 2",
        title: "Dual-basis licensing requirement",
        summary:
          "Space activities from Swedish territory by non-state parties require a licence. Swedish persons conducting space activities ANYWHERE require a licence. The Swedish State is exempt.",
        complianceImplication:
          "Both territorial and nationality-based jurisdiction — broader than Norway's 1969 Act.",
      },
      {
        section: "§ 3",
        title: "Government-level licence decision — no criteria",
        summary:
          "Licences granted by the Government (cabinet-level). May be restricted and subjected to conditions 'deemed appropriate.' NO criteria for granting or refusing specified — entirely discretionary.",
        complianceImplication:
          "One of the Act's most criticized features. No published licensing criteria exist — operators face complete uncertainty.",
      },
      {
        section: "§ 5",
        title: "Criminal sanctions",
        summary:
          "Operating without licence or violating conditions: fine or imprisonment up to 1 year. Extraterritorial jurisdiction applies. Government consent required to prosecute.",
        complianceImplication:
          "Politically controlled prosecution filter — Government must consent.",
      },
      {
        section: "§ 6",
        title: "State recourse — no cap, no insurance",
        summary:
          "Operator reimburses the State for Liability Convention payments unless 'special reasons tell against this' (särskilda skäl). NO insurance mandate, NO liability cap, NO government backstop. Unlimited recourse in principle.",
        complianceImplication:
          "Sweden's most criticized gap. No insurance requirement unlike virtually every other European space law. SOU 2021:91 proposed SEK 600M mandatory insurance — unenacted.",
      },
    ],
    scope_description:
      "Among the world's earliest national space laws. Only 6 sections on one A4 page — one of the most concise space regulatory frameworks globally. Last amended SFS 2021:1025 (criminal jurisdiction). Notable gaps: no licensing criteria, no insurance, no debris mitigation, no environmental provisions, no appeal mechanism, no licence transfer provisions, no outer space definition. SOU 2021:91 reform (455 pages) stalled since 2021.",
    related_sources: [
      "SE-OST-1967",
      "SE-LIABILITY-CONV",
      "SE-SPACE-ORDINANCE-1982",
      "SE-SOU-2021-91",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "SFS 1982:963. Prop. 1981/82:226.",
      "One of world's earliest space laws — 6 sections, fits on one A4 page.",
      "Sounding rockets explicitly EXCLUDED from scope.",
      "No insurance, no liability cap, no debris rules, no licensing criteria.",
      "SOU 2021:91 reform (455 pages) stalled — possibly superseded by EU Space Act.",
      "Last amended SFS 2021:1025.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "SE-SPACE-ORDINANCE-1982",
    jurisdiction: "SE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Activities Ordinance",
    title_local: "Förordning (1982:1069) om rymdverksamhet",
    date_enacted: "1982-11-25",
    official_reference: "SFS 1982:1069",
    source_url:
      "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/forordning-19821069-om-rymdverksamhet_sfs-1982-1069",
    issuing_body: "Regeringen",
    competent_authorities: ["SE-SNSA", "SE-PTS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Application procedure",
        summary:
          "Written licence applications to Rymdstyrelsen, which consults PTS and other agencies, then forwards with its opinion to the Government for decision.",
      },
      {
        section: "§ 4",
        title: "Space object registration",
        summary:
          "Rymdstyrelsen maintains register of space objects for which Sweden is launching State. Required data: designation, launch date/location, orbital parameters, general function. Information to UN Secretary-General via Ministry for Foreign Affairs.",
      },
    ],
    related_sources: ["SE-SPACE-ACT-1982"],
    notes: ["SFS 1982:1069. Last amended SFS 1994:114."],
    last_verified: "2026-04-14",
  },
];

// ─── Draft Legislation (1) ──────────────────────────────────────

const DRAFT_LEGISLATION_SE: LegalSource[] = [
  {
    id: "SE-SOU-2021-91",
    jurisdiction: "SE",
    type: "draft_legislation",
    status: "draft",
    title_en: "SOU 2021:91 — 'En ny rymdlag' (A New Space Act)",
    title_local: "SOU 2021:91 En ny rymdlag",
    date_published: "2021-11-01",
    source_url:
      "https://www.regeringen.se/rattsliga-dokument/statens-offentliga-utredningar/2021/11/sou-202191/",
    issuing_body: "Utredningen om en ny rymdlag",
    competent_authorities: ["SE-SNSA"],
    relevance_level: "high",
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
        section: "Full report",
        title: "Comprehensive space law reform (455 pages)",
        summary:
          "Proposes: SNSA (not Government) as licensing authority; detailed criteria; mandatory insurance (default SEK 600M ~€55M); strict operator liability for ground damage; 100 km altitude threshold; 25-year deorbit guideline; environmental provisions; mandatory security consultations (Försvarsmakten, Säkerhetspolisen, ISP); administrative court appeal mechanism.",
        complianceImplication:
          "Would transform Sweden from Europe's most minimalist framework to a comprehensive one. Remiss period ended 21 April 2022. As of April 2026, Government has NOT submitted a bill — reform appears stalled, possibly superseded by EU Space Act.",
      },
    ],
    related_sources: ["SE-SPACE-ACT-1982"],
    notes: [
      "455 pages replacing 6 sections — most dramatic proposed expansion.",
      "Led by Chief Judge Göran Lundahl.",
      "Remiss period ended 21 April 2022. No bill submitted.",
      "Stalled due to Ukraine, NATO accession, and EU Space Act emergence.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────

const TELECOM_SE: LegalSource[] = [
  {
    id: "SE-LEK-2022",
    jurisdiction: "SE",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act (LEK)",
    title_local: "Lag (2022:482) om elektronisk kommunikation",
    date_enacted: "2022-05-01",
    official_reference: "SFS 2022:482",
    source_url:
      "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2022482-om-elektronisk-kommunikation_sfs-2022-482",
    issuing_body: "Riksdagen",
    competent_authorities: ["SE-PTS"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Ch. 1 § 7 / Ch. 3 § 1",
        title: "Satellite spectrum management",
        summary:
          "Defines telecommunications networks to include satellite networks. Radio transmitters require PTS authorization. PTS manages ITU coordination for Swedish satellite filings. Satellite earth stations generally require individual licences.",
      },
    ],
    related_sources: ["SE-SPACE-ACT-1982"],
    notes: [
      "SFS 2022:482. Replaced the 2003 act.",
      "Transposed the EU Electronic Communications Code.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_SE: LegalSource[] = [
  {
    id: "SE-DUAL-USE-2000",
    jurisdiction: "SE",
    type: "federal_law",
    status: "in_force",
    title_en: "Dual-Use Control Act",
    title_local:
      "Lag (2000:1064) om kontroll av produkter med dubbla användningsområden",
    date_enacted: "2000-01-01",
    date_last_amended: "2022-01-01",
    official_reference: "SFS 2000:1064 (amended SFS 2022:1074)",
    source_url:
      "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-20001064-om-kontroll-av-produkter-med_sfs-2000-1064",
    issuing_body: "Riksdagen",
    competent_authorities: ["SE-ISP"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Space technology export control",
        summary:
          "Supplements the directly applicable EU Dual-Use Regulation (2021/821). ISP is the licensing authority. Space technology across Categories 5 (encryption), 6 (sensors), 7 (avionics), 9 (aerospace/propulsion). SFS 2022:1074 extended ISP mandate to brokering, transit, and technical assistance. September 2025 amendment: new controls on spacecraft mission equipment and cryogenics.",
        complianceImplication:
          "ISP controls all space technology exports. Unique Swedish provision: recipient country's democratic status is a 'central condition' in military equipment licensing.",
      },
    ],
    related_sources: ["SE-SPACE-ACT-1982"],
    notes: [
      "SFS 2000:1064, amended SFS 2022:1074.",
      "Sweden requires democratic status assessment for military export licences — unique provision.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────

const CYBERSECURITY_SE: LegalSource[] = [
  {
    id: "SE-CYBERSECURITY-2025",
    jurisdiction: "SE",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Act (NIS2 Transposition)",
    title_local: "Cybersäkerhetslagen",
    date_enacted: "2025-12-01",
    date_in_force: "2026-01-15",
    official_reference: "SFS 2025:1506",
    source_url:
      "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/cybersakerhetslag-20251506_sfs-2025-1506",
    issuing_body: "Riksdagen",
    competent_authorities: ["SE-MCF"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 Directive transposition",
        summary:
          "Transposes NIS2 into Swedish law. Space explicitly listed as sector of high criticality. MCF (formerly MSB) serves as national coordinator. Maximum fines: EUR 10M or 2% of global turnover for essential entities. Sweden missed the October 2024 deadline — EC reasoned opinion issued May 2025.",
        complianceImplication:
          "Space operators must comply with cybersecurity risk management and incident reporting. The EU Space Act would add space-specific requirements atop NIS2.",
      },
    ],
    related_sources: ["SE-SPACE-ACT-1982"],
    notes: [
      "SFS 2025:1506. In force 15 January 2026.",
      "Sweden missed the 17 October 2024 NIS2 deadline.",
      "EC reasoned opinion issued 7 May 2025.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Data Protection (1) ────────────────────────────────────────

const DATA_PROTECTION_SE: LegalSource[] = [
  {
    id: "SE-DATASKYDDSLAGEN-2018",
    jurisdiction: "SE",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Protection Act (GDPR Supplement)",
    title_local: "Dataskyddslagen",
    date_enacted: "2018-05-25",
    official_reference: "SFS 2018:218",
    source_url:
      "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2018218-med-kompletterande-bestammelser_sfs-2018-218",
    issuing_body: "Riksdagen",
    competent_authorities: ["SE-IMY"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator", "all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "GDPR national supplement",
        summary:
          "Supplements GDPR in Swedish law. IMY is the supervisory authority. Relevant to satellite Earth observation data, high-resolution imagery, and geolocation services.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-14",
  },
];

// ─── Bilateral Agreements (1) ───────────────────────────────────

const BILATERAL_SE: LegalSource[] = [
  {
    id: "SE-US-TSA-2025",
    jurisdiction: "SE",
    type: "international_treaty",
    status: "in_force",
    title_en: "US-Sweden Technology Safeguards Agreement (Esrange)",
    date_enacted: "2025-06-20",
    source_url:
      "https://www.government.se/press-releases/2025/06/technology-safeguards-agreement-signed-with-the-united-states/",
    issuing_body: "Kingdom of Sweden / United States",
    competent_authorities: ["SE-UTRIKESDEP", "SE-SSC"],
    relevance_level: "critical",
    applicable_to: ["launch_provider"],
    compliance_areas: ["export_control", "licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ITAR technology protection at Esrange",
        summary:
          "Only the 6th TSA the US has signed with any country (after NZ, Brazil, UK, Australia, Norway). Enables Firefly Aerospace Alpha rocket launches from Esrange. Five years of negotiations preceded signing. Signed 20 June 2025 at Swedish Embassy, Washington D.C. by Foreign Minister Maria Malmer Stenergard.",
        complianceImplication:
          "Essential enabler for US commercial launches from Esrange. Operators must implement robust physical and cybersecurity measures to protect US launch IP.",
      },
    ],
    related_sources: ["SE-SPACE-ACT-1982", "SE-DUAL-USE-2000"],
    notes: [
      "Signed 20 June 2025 — only the 6th US TSA globally.",
      "Enables Firefly Alpha launches from Esrange.",
      "Five years of negotiations.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Policy (2) ─────────────────────────────────────────────────

const POLICY_SE: LegalSource[] = [
  {
    id: "SE-SPACE-STRATEGY-2018",
    jurisdiction: "SE",
    type: "policy_document",
    status: "in_force",
    title_en: "A Strategy for Swedish Space Activities (2018)",
    title_local: "Skr. 2017/18:259 En strategi för svensk rymdverksamhet",
    date_published: "2018-01-01",
    source_url:
      "https://www.regeringen.se/rattsliga-dokument/skrivelse/2018/06/skr.-201718259/",
    issuing_body: "Regeringen",
    competent_authorities: ["SE-SNSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "National civilian space strategy",
        summary:
          "Emphasizes international cooperation through ESA, sustainable space use, national security, industrial competitiveness, and research excellence. Sweden allocates ~70% of SNSA's ~900 MSEK budget to ESA.",
      },
    ],
    related_sources: ["SE-SPACE-ACT-1982", "SE-DEFENCE-SPACE-STRATEGY-2024"],
    last_verified: "2026-04-14",
  },
  {
    id: "SE-DEFENCE-SPACE-STRATEGY-2024",
    jurisdiction: "SE",
    type: "policy_document",
    status: "in_force",
    title_en: "Defence and Security Space Strategy (2024)",
    title_local: "Rymdens roll i en ny säkerhetspolitisk miljö",
    date_published: "2024-07-04",
    source_url:
      "https://www.government.se/information-material/2024/07/the-role-of-space-in-a-new-security-environment/",
    issuing_body: "Regeringen",
    competent_authorities: ["SE-MOD", "SE-FORSVARSMAKTEN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Full document",
        title: "Sweden's first defence space strategy",
        summary:
          "Four pillars: freedom of action in space, total defence capabilities, coherent space policy, active international partnership. Published 4 July 2024 — Sweden's first-ever defence space strategy. First military satellite GNA-3 launched August 2024. SEK 5.3B for space capabilities.",
        complianceImplication:
          "Dramatic defence transformation — NATO membership, military satellites, responsive launch from Esrange. Defence spending may be shifting from ESA to national military capabilities.",
      },
    ],
    related_sources: ["SE-SPACE-STRATEGY-2018"],
    notes: [
      "Published 4 July 2024 — Sweden's first defence space strategy.",
      "Follows NATO accession (7 March 2024).",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_SE: LegalSource[] = [
  ...TREATIES_SE,
  ...PRIMARY_LEGISLATION_SE,
  ...DRAFT_LEGISLATION_SE,
  ...TELECOM_SE,
  ...EXPORT_CONTROL_SE,
  ...CYBERSECURITY_SE,
  ...DATA_PROTECTION_SE,
  ...BILATERAL_SE,
  ...POLICY_SE,
];
