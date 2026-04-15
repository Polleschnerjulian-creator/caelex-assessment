// src/data/legal-sources/sources/fi.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Finland space law sources — complete legal framework for jurisdiction FI.
 *
 * Sources: finlex.fi, tem.fi, spacefinland.fi
 * Last verified: 2026-04-14
 *
 * Notable: Europe's most modern space law (Act 63/2018, 22 sections).
 * €60M mandatory insurance with risk-based waivers, compliance-linked
 * liability cap (removed for non-compliant operators). Home to ICEYE
 * (world's largest commercial SAR constellation). NATO member since 2023.
 * FMI Arctic Space Centre at Sodankylä. Planned transfer of licensing
 * from TEM to Traficom in 2026.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── FI Authorities (13) ──────────────────────────────────────────

export const AUTHORITIES_FI: Authority[] = [
  {
    id: "FI-TEM",
    jurisdiction: "FI",
    name_en: "Ministry of Economic Affairs and Employment",
    name_local: "Työ- ja elinkeinoministeriö",
    abbreviation: "TEM",
    website: "https://tem.fi",
    space_mandate:
      "Primary space authority under Act 63/2018. Grants space activity authorizations, maintains national space object registry, reports to UN Secretary-General, supervises operator compliance, coordinates national space policy. Chairs the Finnish Space Committee. Authorization fee: EUR 7,000 (from 1 April 2025). Planned transfer of operational licensing to Traficom under 2025 reform.",
    legal_basis: "Laki avaruustoiminnasta (63/2018)",
    applicable_areas: ["licensing", "registration", "insurance", "liability"],
  },
  {
    id: "FI-TRAFICOM",
    jurisdiction: "FI",
    name_en: "Finnish Transport and Communications Agency",
    name_local: "Liikenne- ja viestintävirasto",
    abbreviation: "Traficom",
    website: "https://www.traficom.fi",
    space_mandate:
      "Satellite spectrum management under Act 917/2014. Issues radio licences for earth stations. Represents Finland at ITU. National Security Authority for Galileo PRS. Competent supervisory authority for NIS2 space sector (via NCSC-FI). Licences ground stations under Act 96/2023. Future recipient of space licensing authority under 2025 reform.",
    legal_basis:
      "Laki sähköisen viestinnän palveluista (917/2014); Laki maa-asemista (96/2023)",
    applicable_areas: ["frequency_spectrum", "cybersecurity"],
  },
  {
    id: "FI-UM",
    jurisdiction: "FI",
    name_en: "Ministry for Foreign Affairs — Export Control Unit",
    name_local: "Ulkoministeriö — Vientivalvontayksikkö",
    abbreviation: "UM",
    website: "https://um.fi",
    space_mandate:
      "National licensing authority for dual-use export controls under Act 500/2024 and EU Regulation 2021/821. Provides opinions on international obligations and foreign policy for space authorization decisions under Section 17 of Act 63/2018. Fees: EUR 900 (global auth), EUR 190 (other services).",
    legal_basis: "Laki kaksikäyttötuotteiden vientivalvonnasta (500/2024)",
    applicable_areas: ["export_control"],
  },
  {
    id: "FI-MOD",
    jurisdiction: "FI",
    name_en: "Ministry of Defence",
    name_local: "Puolustusministeriö",
    abbreviation: "PLM",
    website: "https://www.defmin.fi",
    space_mandate:
      "Overall guidance and supervision of Defence Forces' space activities. Defence materiel export licensing. Provides opinions on national security for space authorization decisions under Section 17. Defence Forces space activities partially exempt from Act 63/2018 (Sections 5, 8, 11, 14, 15).",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "FI-FMI",
    jurisdiction: "FI",
    name_en: "Finnish Meteorological Institute",
    name_local: "Ilmatieteen laitos",
    abbreviation: "FMI",
    website: "https://www.fmi.fi",
    space_mandate:
      "Constituting national entity for EU SST Partnership (joined November 2022). Operates Arctic Space Centre at Sodankylä and National Satellite Data Centre. Leads civilian command centre (C-FSSAC/AVATIKE) of National Space Situational Awareness Center (established December 2024). Satellite instruments since 1986 (Phobos, Rosetta, Mars rovers). EUMETSAT representative.",
    applicable_areas: ["environmental", "registration"],
  },
  {
    id: "FI-AIRFORCE",
    jurisdiction: "FI",
    name_en: "Finnish Defence Forces / Air Force — Space Command",
    name_local: "Puolustusvoimat / Ilmavoimat",
    abbreviation: "FDF/AF",
    website: "https://www.puolustusvoimat.fi",
    space_mandate:
      "Air Force Commander Major General Timo Herranen serves as Space Commander. Operates military command centre (M-FSSAC) of National SSA Center, expected fully operational by 2028. ICEYE €158M contract (September 2025) for sovereign space-based intelligence. Participating in NATO APSS, NORTHLINK, and STARLIFT programmes.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "FI-DPO",
    jurisdiction: "FI",
    name_en: "Office of the Data Protection Ombudsman",
    name_local: "Tietosuojavaltuutetun toimisto",
    abbreviation: "TSV",
    website: "https://tietosuoja.fi",
    space_mandate:
      "GDPR enforcement for satellite/EO data containing personal data under Data Protection Act (1050/2018). ICEYE's 16 cm SAR resolution raises contextual identification concerns.",
    legal_basis: "Tietosuojalaki (1050/2018)",
    applicable_areas: ["data_security"],
  },
  {
    id: "FI-TUKES",
    jurisdiction: "FI",
    name_en: "Finnish Safety and Chemicals Agency",
    name_local: "Turvallisuus- ja kemikaalivirasto",
    abbreviation: "Tukes",
    website: "https://tukes.fi",
    space_mandate:
      "Market surveillance for products with digital elements under CRA. REACH and RoHS compliance for satellite manufacturing chemicals. Likely CRA market surveillance authority in coordination with Traficom.",
    applicable_areas: ["environmental"],
  },
  {
    id: "FI-BUSINESSFINLAND",
    jurisdiction: "FI",
    name_en: "Business Finland",
    name_local: "Business Finland",
    abbreviation: "BF",
    website: "https://www.businessfinland.fi",
    space_mandate:
      "Coordinates and finances Finnish participation in ESA voluntary programmes (~€16.2M annually). Operates ESA BIC Finland at Aalto University. Head of Finnish Delegation to ESA Council: Kimmo Kanto.",
    applicable_areas: ["licensing"],
  },
  {
    id: "FI-SPACE-COMMITTEE",
    jurisdiction: "FI",
    name_en: "Finnish Space Committee",
    name_local: "Avaruustoiminnan neuvottelukunta",
    abbreviation: "ASN",
    website: "https://tem.fi",
    space_mandate:
      "Advisory board under TEM, established by Government Decree 739/2019. Cross-ministerial coordination body with representatives from TEM (chair), 6 ministries, Defence Forces, Business Finland, Traficom, Research Council, FMI, and industry associations.",
    legal_basis: "Valtioneuvoston asetus (739/2019)",
    applicable_areas: ["licensing"],
  },
  {
    id: "FI-MoTC",
    jurisdiction: "FI",
    name_en: "Ministry of Transport and Communications",
    name_local: "Liikenne- ja viestintäministeriö",
    abbreviation: "LVM",
    website: "https://www.lvm.fi",
    space_mandate:
      "Parent ministry of Traficom. Responsible for telecommunications and spectrum policy. National contact point for GOVSATCOM and IRIS² (via Ministry of the Interior).",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "FI-CUSTOMS",
    jurisdiction: "FI",
    name_en: "Finnish Customs",
    name_local: "Tulli",
    abbreviation: "Tulli",
    website: "https://tulli.fi",
    space_mandate:
      "Enhanced powers over intangible dual-use items under Act 500/2024. Physical controls of strategic goods exports at borders. Transit and brokering controls for space technology.",
    legal_basis: "Laki kaksikäyttötuotteiden vientivalvonnasta (500/2024)",
    applicable_areas: ["export_control"],
  },
  {
    id: "FI-MAANPUOLUSTUS",
    jurisdiction: "FI",
    name_en: "Ministry for Foreign Affairs (Treaty Division)",
    name_local: "Ulkoministeriö — Oikeudellinen osasto",
    abbreviation: "UM/OIK",
    website: "https://um.fi",
    space_mandate:
      "International treaty obligations including UN space treaties, Artemis Accords (signed 21 January 2025, 53rd signatory). COPUOS representation (member since 2018). Diplomatic coordination for space cooperation.",
    applicable_areas: ["licensing"],
  },
];

// ─── International Treaties (FI-specific entries, 4) ──────────────

const TREATIES_FI: LegalSource[] = [
  {
    id: "FI-OST-1967",
    jurisdiction: "FI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Finland Ratification Record",
    title_local: "Avaruussopimus — Suomen ratifiointi",
    date_enacted: "1967-01-27",
    date_in_force: "1967-10-10",
    official_reference: "SopS 56–57/1967",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations / Eduskunta",
    competent_authorities: ["FI-MAANPUOLUSTUS", "FI-TEM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Finland bears international responsibility for national space activities. The Space Activities Act (63/2018) directly implements Art. VI with a comprehensive authorization regime, 8 cumulative conditions, and cross-ministerial review.",
        complianceImplication:
          "Finland's implementation of Art. VI is one of Europe's most thorough — 8 conditions, mandatory insurance, cross-ministerial consultation.",
      },
    ],
    related_sources: [
      "FI-SPACE-ACT-2018",
      "FI-LIABILITY-1977",
      "FI-REGISTRATION-2018",
    ],
    notes: ["SopS 56–57/1967. Among the early ratifying parties."],
    last_verified: "2026-04-14",
  },
  {
    id: "FI-LIABILITY-1977",
    jurisdiction: "FI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Finland Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1977-01-01",
    official_reference: "SopS 8–9/1977",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations / Eduskunta",
    competent_authorities: ["FI-MAANPUOLUSTUS"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Finland is absolutely liable for surface damage. Act 63/2018 Section 7 faithfully implements both tiers: absolute liability for ground/aircraft damage and fault-based for space-to-space damage. State pays first, then exercises recourse against operator (max €60M for compliant operators).",
        complianceImplication:
          "Finland's channeled liability creates an implicit government backstop — for compliant operators, any liability exceeding €60M is absorbed by the Finnish State.",
      },
    ],
    related_sources: ["FI-OST-1967", "FI-SPACE-ACT-2018"],
    notes: ["SopS 8–9/1977."],
    last_verified: "2026-04-14",
  },
  {
    id: "FI-REGISTRATION-2018",
    jurisdiction: "FI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Finland Accession Record",
    date_enacted: "1975-01-14",
    date_in_force: "2018-01-23",
    official_reference: "SopS 9/2018",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations / Eduskunta",
    competent_authorities: ["FI-TEM"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Finland acceded in 2018 — deliberately timed to coincide with the Space Activities Act. TEM maintains the registry. As of March 2026: 26 Finnish satellites registered (4 Aalto, 22 commercial — ICEYE, Kuva Space, Aurora Propulsion).",
      },
    ],
    related_sources: ["FI-OST-1967", "FI-SPACE-ACT-2018"],
    notes: [
      "SopS 9/2018. Accession deliberately timed to coincide with Act 63/2018.",
      "26 Finnish satellites registered as of March 2026.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "FI-ARTEMIS-ACCORDS",
    jurisdiction: "FI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Finland Signatory (2025)",
    date_enacted: "2025-01-21",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["FI-MAANPUOLUSTUS", "FI-TEM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Finland signed 21 January 2025 as 53rd signatory. Minister Wille Rydman signed at Aalto University's Winter Satellite Workshop. Finland issued concurrent statement affirming the UN as 'primary forum for the development of international space law.' NOT party to Moon Agreement.",
      },
    ],
    related_sources: ["FI-OST-1967"],
    notes: [
      "53rd signatory, signed 21 January 2025.",
      "Finland affirmed UN as primary forum for space law development.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Primary National Legislation (2) ───────────────────────────

const PRIMARY_LEGISLATION_FI: LegalSource[] = [
  {
    id: "FI-SPACE-ACT-2018",
    jurisdiction: "FI",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Activities Act (Laki avaruustoiminnasta)",
    title_local: "Laki avaruustoiminnasta",
    date_enacted: "2018-01-23",
    date_in_force: "2018-01-23",
    official_reference: "63/2018",
    source_url: "https://www.finlex.fi/fi/laki/ajantasa/2018/20180063",
    issuing_body: "Eduskunta",
    competent_authorities: ["FI-TEM"],
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
        section: "§ 5",
        title: "Authorization regime — 8 cumulative conditions",
        summary:
          "Space activities require prior TEM authorization. Eight conditions: (1) operator reliability/expertise/financial capacity, (2) risk assessment, (3) debris prevention, (4) discontinuation plan, (5) national security/foreign policy compatibility, (6) insurance compliance, (7) ITU compliance, (8) export control compliance.",
        complianceImplication:
          "Europe's most detailed statutory licensing criteria. Application 6 months before launch, 3 months before in-orbit acquisition.",
      },
      {
        section: "§ 6",
        title: "Space object registration",
        summary:
          "TEM maintains public registry: launching states, operator, designation, function, launch data, orbital parameters. Reports to UN Secretary-General. 26 Finnish satellites registered as of March 2026.",
      },
      {
        section: "§ 7",
        title: "Channeled liability — €60M cap with compliance incentive",
        summary:
          "State pays damage from State funds. Right of recourse against operator: absolute liability for ground/aircraft damage, fault-based for space damage (via Tort Liability Act 412/1974). Maximum recourse: €60M. Cap REMOVED ENTIRELY if operator failed to comply with Act or authorization conditions.",
        complianceImplication:
          "The compliance-linked cap is Finland's most innovative feature. Compliant operators have a clear €60M ceiling. Non-compliant operators face UNLIMITED liability. Creates powerful compliance incentive.",
      },
      {
        section: "§ 8",
        title: "Mandatory insurance — €60M floor with risk-based waivers",
        summary:
          "Third-party liability insurance minimum €60M. TEM may waive if: (a) launch company's insurance covers ≥€60M during launch phase, OR (b) post-launch risk assessment meets Decree 74/2018 thresholds (collision probability with ≥10cm objects below threshold, re-entry casualty expectation below 1/10,000).",
        complianceImplication:
          "The risk-based waiver is particularly advantageous for small satellite operators. More sophisticated than France's fixed €60M or Sweden's complete absence of insurance mandate.",
      },
      {
        section: "§ 10",
        title: "Environmental protection and debris mitigation",
        summary:
          "Operators must follow 'generally accepted international guidelines' (IADC/UN COPUOS) for: restricting debris generation, reducing break-up and collision risks, post-mission disposal. Nuclear/radioactive materials must be specified. No explicit 25-year rule — principles-based, technology-neutral approach.",
      },
      {
        section: "§ 11",
        title: "Transfer of control requires TEM approval",
        summary:
          "Prior TEM approval needed for transferring control of space objects. TEM may require the receiving state to agree on liability arrangements.",
      },
      {
        section: "§ 17",
        title: "Cross-ministerial consultation",
        summary:
          "TEM must request opinions from Ministry of Defence (security), Ministry for Foreign Affairs (export control, treaties), and Traficom (ITU, radio) for every authorization decision.",
      },
      {
        section: "§ 21",
        title: "Criminal sanctions — fines only",
        summary:
          "Intentional or grossly negligent unauthorized activities, unauthorized transfers, or failure to insure: fines only — no imprisonment. Lighter than Sweden (1 year) or Norway (3 months).",
      },
    ],
    scope_description:
      "Europe's most modern and comprehensive space statute. 4 chapters, 22 sections. Entered into force 23 January 2018 — same day as ICEYE-X1 launch. Repealed Act 616/1970 (astronaut rescue). Key innovations: €60M compliance-linked liability cap, risk-based insurance waivers, 8 cumulative licensing conditions, cross-ministerial review. Defence Forces partially exempt. Planned transfer of licensing to Traficom (2026 reform).",
    related_sources: [
      "FI-OST-1967",
      "FI-LIABILITY-1977",
      "FI-REGISTRATION-2018",
      "FI-SPACE-DECREE-2018",
      "FI-GROUND-STATIONS-2023",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "63/2018. In force 23 January 2018 — same day ICEYE-X1 launched.",
      "Repealed Act 616/1970 (astronaut rescue — Finland's only prior space legislation).",
      "€60M liability cap removed for non-compliant operators — unique compliance incentive.",
      "Risk-based insurance waivers via Decree 74/2018 thresholds.",
      "8 cumulative licensing conditions — Europe's most detailed.",
      "No amendments enacted through April 2026.",
      "2025 reform: licensing transfer from TEM to Traficom (bill expected spring 2026).",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "FI-SPACE-DECREE-2018",
    jurisdiction: "FI",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Activities Decree (TEM Decree 74/2018)",
    title_local: "Työ- ja elinkeinoministeriön asetus avaruustoiminnasta",
    date_enacted: "2018-01-23",
    date_in_force: "2018-01-23",
    official_reference: "74/2018",
    source_url: "https://www.finlex.fi/fi/laki/ajantasa/2018/20180074",
    issuing_body: "Työ- ja elinkeinoministeriö",
    competent_authorities: ["FI-TEM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "insurance", "debris_mitigation"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Application timelines",
        summary:
          "At least 6 months before planned launch. At least 3 months before acquisition of in-orbit object or transfer of activities.",
      },
      {
        section: "§ 5",
        title: "Risk limits for insurance waiver",
        summary:
          "Collision risk thresholds with objects ≥10 cm. Re-entry casualty expectation below 1/10,000. These quantitative thresholds enable the risk-based insurance waiver under Act Section 8.",
        complianceImplication:
          "Small satellite operators can qualify for insurance waivers if they meet these objective risk thresholds — a major cost advantage.",
      },
    ],
    related_sources: ["FI-SPACE-ACT-2018"],
    notes: [
      "74/2018. Ministry-level decree (not Government Decree).",
      "No amendments through April 2026.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Ground Stations (1) ────────────────────────────────────────

const GROUND_STATIONS_FI: LegalSource[] = [
  {
    id: "FI-GROUND-STATIONS-2023",
    jurisdiction: "FI",
    type: "federal_law",
    status: "in_force",
    title_en: "Act on Ground Stations and Certain Radars",
    title_local: "Laki maa-asemista ja eräistä tutkista",
    date_enacted: "2023-01-01",
    official_reference: "96/2023",
    source_url: "https://www.finlex.fi/fi/laki/ajantasa/2023/20230096",
    issuing_body: "Eduskunta",
    competent_authorities: ["FI-TRAFICOM"],
    relevance_level: "high",
    applicable_to: ["ground_segment", "satellite_operator"],
    compliance_areas: ["frequency_spectrum", "licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Ground station licensing regime",
        summary:
          "Separate licensing regime for earth station establishment/operation and certain radars. Traficom (not TEM) is the competent authority — previewing the institutional approach planned for space activities. Applications involving national security face enhanced scrutiny. Separate radio transmitting licences may also be required.",
        complianceImplication:
          "Sodankylä Arctic Space Centre has received 10+ ground station applications as of 2025. Finland's high-latitude position provides geometric advantage for polar-orbiting reception.",
      },
    ],
    related_sources: ["FI-SPACE-ACT-2018"],
    notes: [
      "96/2023. Traficom as authority previews the planned licensing transfer.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────

const TELECOM_FI: LegalSource[] = [
  {
    id: "FI-ECOMM-2014",
    jurisdiction: "FI",
    type: "federal_law",
    status: "in_force",
    title_en: "Act on Electronic Communications Services",
    title_local: "Laki sähköisen viestinnän palveluista",
    date_enacted: "2014-11-07",
    date_last_amended: "2022-12-09",
    official_reference: "917/2014 (amended 1211/2022)",
    source_url: "https://www.finlex.fi/fi/laki/ajantasa/2014/20140917",
    issuing_body: "Eduskunta",
    competent_authorities: ["FI-TRAFICOM"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Satellite spectrum management and Galileo PRS",
        summary:
          "Transmitting earth stations require Traficom radio licences. Traficom follows ITU coordination procedures. Amendment 1211/2022 establishes personnel security, criminal background checks, and subcontractor limitations for Galileo PRS providers.",
        complianceImplication:
          "Satellite operators must coordinate with Traficom at least 2 years before planned use (ITU recommendation). Operators bear all costs (ITU fees, Traficom fees, frequency fees).",
      },
    ],
    related_sources: ["FI-GROUND-STATIONS-2023"],
    last_verified: "2026-04-14",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_FI: LegalSource[] = [
  {
    id: "FI-EXPORT-CONTROL-2024",
    jurisdiction: "FI",
    type: "federal_law",
    status: "in_force",
    title_en: "Act on Export Control of Dual-Use Items",
    title_local: "Laki kaksikäyttötuotteiden vientivalvonnasta",
    date_enacted: "2024-09-15",
    date_in_force: "2024-09-15",
    official_reference: "500/2024",
    source_url: "https://www.finlex.fi/fi/laki/ajantasa/2024/20240500",
    issuing_body: "Eduskunta",
    competent_authorities: ["FI-UM", "FI-CUSTOMS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Modern dual-use export control with national list",
        summary:
          "Replaced Act 562/1996. Introduces national control list (quantum computing, semiconductors, materials). National general export authorizations alongside EU UGEAs. Enhanced Customs powers over intangible dual-use items. Catch-all provisions. Transit and brokering controls. Criminal sanctions under Criminal Code Chapter 46.",
        complianceImplication:
          "SAR technology (ICEYE's core) falls under Wassenaar Category 6. ICEYE's ITAR-free architecture means exports governed by Finnish/EU controls, not US ITAR — a critical strategic advantage. US added Finland to IEC eligible destinations list (17 September 2024).",
      },
    ],
    related_sources: ["FI-SPACE-ACT-2018"],
    notes: [
      "500/2024. Replaced Act 562/1996.",
      "Finland added to US IEC eligible destinations list, recognizing matching controls.",
      "Advisory Board on Export Control established by companion Government Decree.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────

const CYBERSECURITY_FI: LegalSource[] = [
  {
    id: "FI-CYBERSECURITY-2025",
    jurisdiction: "FI",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Act (NIS2 Transposition)",
    title_local: "Kyberturvallisuuslaki",
    date_enacted: "2025-04-04",
    date_in_force: "2025-04-08",
    official_reference: "124/2025",
    source_url: "https://www.finlex.fi/fi/laki/ajantasa/2025/20250124",
    issuing_body: "Eduskunta",
    competent_authorities: ["FI-TRAFICOM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space as high-criticality sector",
        summary:
          "Space in NIS2 Annex I (high criticality). Traficom NCSC-FI as supervisory authority. 13 cybersecurity requirements aligned with NIS2 Art. 21. Incident reporting: 24h early alert, 72h detailed, 30d final. Space operators meeting size thresholds (ICEYE, ground station operators) in scope.",
        complianceImplication:
          "Finland slightly late (8 April 2025 vs 17 October 2024 deadline) — EC reasoned opinion 7 May 2025. Space operators must comply with cybersecurity risk management and reporting.",
      },
    ],
    related_sources: ["FI-SPACE-ACT-2018"],
    notes: [
      "124/2025. Slightly late transposition — EC reasoned opinion issued.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Data Protection (1) ────────────────────────────────────────

const DATA_PROTECTION_FI: LegalSource[] = [
  {
    id: "FI-DPA-2018",
    jurisdiction: "FI",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Protection Act (GDPR Supplement)",
    title_local: "Tietosuojalaki",
    date_enacted: "2018-12-05",
    date_in_force: "2019-01-01",
    official_reference: "1050/2018",
    source_url: "https://www.finlex.fi/fi/laki/ajantasa/2018/20181050",
    issuing_body: "Eduskunta",
    competent_authorities: ["FI-DPO"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator", "all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "GDPR national supplement",
        summary:
          "Data Protection Ombudsman enforces GDPR. ICEYE (headquartered Espoo) directly subject as Finnish data controller. 4th-gen SAR satellites at 16 cm resolution raise contextual identification concerns for personal data in imagery.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-14",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_FI: LegalSource[] = [
  {
    id: "FI-SPACE-STRATEGY-2030",
    jurisdiction: "FI",
    type: "policy_document",
    status: "in_force",
    title_en: "Space Strategy 2030 (December 2024)",
    title_local: "Avaruusstrategia 2030",
    date_published: "2024-12-30",
    source_url: "https://tem.fi/en/space-strategy",
    issuing_body: "Valtioneuvosto (Government)",
    competent_authorities: ["FI-TEM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "Third national space strategy — security pivot",
        summary:
          "Four objectives: space services utilization, operating environment improvement, functional capacity strengthening, international cooperation. Significant pivot toward security/defence vs previous civilian/commercial focus. NATO accession (April 2023) catalyzed military space development. ESA contribution ~€28M annually (€13.8M mandatory + €16.2M voluntary).",
        complianceImplication:
          "ESPI found ~50% of previous strategy's 21 objectives achieved. The security pivot signals increased defence-space integration and regulatory evolution.",
      },
    ],
    related_sources: ["FI-SPACE-ACT-2018"],
    notes: [
      "Published 30 December 2024. Finland's 3rd space strategy.",
      "NATO accession catalyzed security dimension.",
      "200+ companies, revenue tripled 2018-2022.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_FI: LegalSource[] = [
  ...TREATIES_FI,
  ...PRIMARY_LEGISLATION_FI,
  ...GROUND_STATIONS_FI,
  ...TELECOM_FI,
  ...EXPORT_CONTROL_FI,
  ...CYBERSECURITY_FI,
  ...DATA_PROTECTION_FI,
  ...POLICY_FI,
];
