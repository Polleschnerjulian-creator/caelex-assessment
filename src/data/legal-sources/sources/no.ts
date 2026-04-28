// src/data/legal-sources/sources/no.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Norway space law sources — complete legal framework for jurisdiction NO.
 *
 * Sources: lovdata.no, regjeringen.no, romsenter.no
 * Last verified: 2026-04-14
 *
 * Notable: Norway enacted the WORLD'S FIRST national space law (1969, 3 sections).
 * Hosts SvalSat (only station contacting every polar satellite on all 14 daily
 * orbits) and Andøya Spaceport (continental Europe's first orbital launch site).
 * EEA member — participates in Galileo/Copernicus but excluded from EU SST.
 * New comprehensive Space Act (Prop. 155 L, 29 provisions) expected 2026.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── NO Authorities (13) ──────────────────────────────────────────

export const AUTHORITIES_NO: Authority[] = [
  {
    id: "NO-NOSA",
    jurisdiction: "NO",
    name_en: "Norwegian Space Agency",
    name_local: "Direktoratet for romvirksomhet",
    abbreviation: "NOSA",
    website: "https://www.romsenter.no",
    space_mandate:
      "Originally established 1987 as Norsk Romsenter with ESA accession. Renamed to Direktoratet for romvirksomhet on 1 September 2025. ~40-54 staff, headquartered in Oslo. Director General: Christian Hauglie-Hanssen. Reports to Ministry of Trade, Industry and Fisheries. Manages state investment funds, represents Norway in ESA/EU programmes, coordinates national space policy. Holds civil responsibility for SST/STM since early 2024. NOT the regulatory authority — that is the CAA.",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "NO-CAA",
    jurisdiction: "NO",
    name_en: "Norwegian Civil Aviation Authority",
    name_local: "Luftfartstilsynet",
    abbreviation: "CAA",
    website: "https://www.luftfartstilsynet.no",
    space_mandate:
      "National supervisory authority for space activities since 1 January 2023. Issues licences and permits for space activities, maintains the national registry of space objects, oversees spaceports and launch vehicles, sets safety standards. Issued first-ever launch permit to Isar Aerospace in March 2025. Will administer the new Space Act when adopted. Launch-permit authority delegated by King in Council on 31 May 2024.",
    legal_basis: "LOV-1969-06-13-38; Royal Decree 31 May 2024",
    applicable_areas: ["licensing", "registration", "debris_mitigation"],
  },
  {
    id: "NO-NFD",
    jurisdiction: "NO",
    name_en: "Ministry of Trade, Industry and Fisheries",
    name_local: "Nærings- og fiskeridepartementet",
    abbreviation: "NFD",
    website: "https://www.regjeringen.no/en/dep/nfd",
    space_mandate:
      "Sectoral responsibility for space operations. Exercises corporate governance over Andøya Space AS and Space Norway AS (state ownership). Responsible for space cooperation in ESA, EU, and UN. Preparing the new Space Act bill. Minister Cecilie Myrseth led CM25 delegation and signed Artemis Accords.",
    applicable_areas: ["licensing"],
  },
  {
    id: "NO-NKOM",
    jurisdiction: "NO",
    name_en: "Norwegian Communications Authority",
    name_local: "Nasjonal kommunikasjonsmyndighet",
    abbreviation: "Nkom",
    website: "https://www.nkom.no",
    space_mandate:
      "Manages radio frequencies including satellite spectrum. Issues permissions for satellite earth stations on Svalbard and Antarctica under FOR-2017-04-21-493/494. Registers satellite networks in ITU international register. Resolves frequency conflicts. Adopted Regulations on coordination and use of satellite filings (12 December 2017). Rejected military satellite applications at SvalSat (US EWS, Turkey IMECE).",
    legal_basis: "LOV-2024-12-13-76 (Ekomloven); FOR-2017-04-21-493",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "NO-ETJENESTEN",
    jurisdiction: "NO",
    name_en: "Norwegian Intelligence Service",
    name_local: "Etterretningstjenesten",
    abbreviation: "E-tjenesten",
    website: "https://www.forsvaret.no/etterretningstjenesten",
    space_mandate:
      "Appointed 2020 as Norway's military space authority, responsible for military space activities on behalf of the Norwegian Armed Forces. Three focus areas: monitoring via satellites, surveillance of space, and satellite communications in the High North.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "NO-NSM",
    jurisdiction: "NO",
    name_en: "Norwegian National Security Authority",
    name_local: "Nasjonal sikkerhetsmyndighet",
    abbreviation: "NSM",
    website: "https://www.nsm.no",
    space_mandate:
      "Preventive national security including ICT security (NorCERT), critical infrastructure protection, and security clearances. Norwegian Space Agency and Space Norway subject to National Security Act. All SvalSat employees require NATO/Norwegian Armed Forces security clearance processed through NSM.",
    legal_basis: "LOV-2018-06-01-24 (Sikkerhetsloven)",
    applicable_areas: ["cybersecurity", "military_dual_use"],
  },
  {
    id: "NO-FFI",
    jurisdiction: "NO",
    name_en: "Norwegian Defence Research Establishment",
    name_local: "Forsvarets forskningsinstitutt",
    abbreviation: "FFI",
    website: "https://www.ffi.no",
    space_mandate:
      "Military space technology development. Designed NRD (Navigation Radar Detector) on NorSat-3, low-light cameras on NorSat-4, and MilSpace2 satellites (Birkeland and Huygens — radar surveillance). Drove the 2014-2015 military space strategic review establishing space as a military domain.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "NO-MOD",
    jurisdiction: "NO",
    name_en: "Ministry of Defence",
    name_local: "Forsvarsdepartementet",
    abbreviation: "FD",
    website: "https://www.regjeringen.no/en/dep/fd",
    space_mandate:
      "Military space policy. INTA equivalent: FFI. Long-Term Defence Plan 2025-2036 allocated ~NOK 600 billion, identifying space as priority investment area. NOK 200M in defence budget for Andøya military use. Committed politically to not conduct destructive direct-ascent ASAT missile testing.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "NO-DEKSA",
    jurisdiction: "NO",
    name_en: "Directorate for Export Control and Sanctions",
    name_local: "Direktoratet for eksportkontroll og sanksjoner",
    abbreviation: "DEKSA",
    website: "https://www.regjeringen.no",
    space_mandate:
      "Established end of 2024 to administer export control regime. Handles dual-use and defence export licensing under the Export Control Act (LOV-1987-12-18-93) and Regulations (FOR-2013-06-19-718). Manages three control lists: List I (defence), List II (dual-use aligned with EU 2021/821), List III (critical tech beyond EU scope, added November 2024).",
    legal_basis: "LOV-1987-12-18-93; FOR-2013-06-19-718",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "NO-MET",
    jurisdiction: "NO",
    name_en: "Norwegian Meteorological Institute",
    name_local: "Meteorologisk institutt",
    abbreviation: "MET Norway",
    website: "https://www.met.no",
    space_mandate:
      "Represents Norway in EUMETSAT. Major user of satellite data for weather forecasting and Arctic monitoring.",
    applicable_areas: ["environmental"],
  },
  {
    id: "NO-KARTVERKET",
    jurisdiction: "NO",
    name_en: "Norwegian Mapping Authority",
    name_local: "Kartverket",
    abbreviation: "Kartverket",
    website: "https://www.kartverket.no",
    space_mandate:
      "Operates nationwide GNSS positioning system (280+ geodetic stations) and geodetic observatory at Ny-Ålesund collaborating with NASA. Critical infrastructure for satellite-based positioning services.",
    applicable_areas: ["registration"],
  },
  {
    id: "NO-MAEC",
    jurisdiction: "NO",
    name_en: "Ministry of Foreign Affairs",
    name_local: "Utenriksdepartementet",
    abbreviation: "UD",
    website: "https://www.regjeringen.no/en/dep/ud",
    space_mandate:
      "Treaty obligations and diplomatic representation. Norway joined COPUOS in 2017. Manages Svalbard Treaty compliance issues. Administers the US-Norway Technology Safeguards Agreement (January 2025) for Andøya Spaceport.",
    applicable_areas: ["licensing"],
  },
  {
    id: "NO-JUSTISDEP",
    jurisdiction: "NO",
    name_en: "Ministry of Justice and Public Security",
    name_local: "Justis- og beredskapsdepartementet",
    abbreviation: "JD",
    website: "https://www.regjeringen.no/en/dep/jd",
    space_mandate:
      "Drafting NIS2 transposition legislation. Responsible for the Digital Security Act (Digitalsikkerhetsloven, signed 23 June 2025, in force 1 October 2025) implementing NIS1. Cybersecurity policy coordination.",
    legal_basis: "Digitalsikkerhetsloven (NIS1)",
    applicable_areas: ["cybersecurity"],
  },
];

// ─── International Treaties (NO-specific entries, 5) ──────────────

const TREATIES_NO: LegalSource[] = [
  {
    id: "NO-OST-1967",
    jurisdiction: "NO",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Norway Ratification Record",
    title_local: "Traktaten om det ytre rom",
    date_enacted: "1967-02-03",
    date_in_force: "1969-06-06",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations / Stortinget",
    competent_authorities: ["NO-MAEC", "NO-NOSA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Norway bears international responsibility for national space activities. Ratified June 1969 — the same month Norway enacted its national Space Act (LOV-1969-06-13-38), making it the world's first domestic implementation of Art. VI.",
        complianceImplication:
          "The 1969 Space Act was the world's first national space law, directly implementing Art. VI's authorization requirement.",
      },
    ],
    related_sources: [
      "NO-SPACE-ACT-1969",
      "NO-LIABILITY-1995",
      "NO-REGISTRATION-1995",
    ],
    notes: [
      "Signed 3 February 1967, ratified 6 June 1969.",
      "Norway enacted the world's first national space law in the same month as ratification.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "NO-LIABILITY-1995",
    jurisdiction: "NO",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Norway Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1995-01-01",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations / Stortinget",
    competent_authorities: ["NO-MAEC"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Norway as launching State is absolutely liable for surface damage. Ratified belatedly in 1995 — coinciding with growing commercial satellite ground station operations on Svalbard. NO domestic implementing legislation was enacted.",
        complianceImplication:
          "The 1969 Act contains NO liability provisions. Only Ekomloven § 6-7 provides a statutory basis for state recourse. The new Space Act will establish a comprehensive liability framework.",
      },
    ],
    related_sources: ["NO-OST-1967", "NO-SPACE-ACT-1969", "NO-EKOMLOVEN-2024"],
    notes: [
      "Ratified belatedly in 1995 — coinciding with SvalSat expansion.",
      "No domestic implementing legislation — general Norwegian tort law applies.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "NO-REGISTRATION-1995",
    jurisdiction: "NO",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Norway Ratification Record",
    date_enacted: "1975-01-14",
    date_in_force: "1995-07-28",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations / Stortinget",
    competent_authorities: ["NO-CAA", "NO-MAEC"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Norway must maintain a national registry. Ratified 28 June 1995. Registry administration delegated to the CAA by Royal Decree of 31 May 2024.",
      },
    ],
    related_sources: ["NO-OST-1967", "NO-SPACE-ACT-1969"],
    notes: [
      "Ratified 28 June 1995 — also belatedly, coinciding with Svalbard operations.",
      "Registry now maintained by the CAA.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "NO-ARTEMIS-ACCORDS",
    jurisdiction: "NO",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Norway Signatory (2025)",
    date_enacted: "2025-05-15",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["NO-MAEC", "NO-NOSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Norway signed 15 May 2025, becoming the 55th signatory. Minister Cecilie Myrseth signed at the Norwegian Space Agency in Oslo. No reservations attached. Norway has NOT signed/ratified the Moon Agreement.",
      },
    ],
    related_sources: ["NO-OST-1967"],
    notes: [
      "55th signatory, signed 15 May 2025.",
      "The proposed new Space Act contains NO provisions on space mining despite Artemis Accords signing.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "NO-SVALBARD-TREATY",
    jurisdiction: "NO",
    type: "international_treaty",
    status: "in_force",
    title_en: "Treaty concerning Spitsbergen (Svalbard Treaty, 1920)",
    title_local: "Svalbardtraktaten",
    date_enacted: "1920-02-09",
    date_in_force: "1925-08-14",
    source_url: "https://lovdata.no/dokument/NL/lov/1920-02-09",
    issuing_body: "Allied and Associated Powers",
    competent_authorities: ["NO-MAEC", "NO-NKOM"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["licensing", "military_dual_use"],
    key_provisions: [
      {
        section: "Art. 9",
        title: "Prohibition of naval bases, fortifications, warlike purposes",
        summary:
          "Norway 'undertakes not to create nor to allow the establishment of any naval base' and 'not to construct any fortification' which 'may never be used for warlike purposes.' Norway's position: Svalbard is NOT demilitarized — the treaty prohibits specific military infrastructure, not all military presence or data.",
        complianceImplication:
          "SvalSat operators must hold Nkom concessions explicitly excluding satellites with functions 'specifically for military purposes.' The boundary between civilian and military data use is legally contested. Russia formally accused Norway of treaty violations in March 2025.",
      },
    ],
    scope_description:
      "The Svalbard Treaty creates a UNIQUE dual regulatory layer for space operations — commercial ground station operators at SvalSat must navigate both Norwegian regulatory requirements AND treaty-based military-use prohibitions. All satellite passes must be logged; Nkom inspects with Governor of Svalbard assistance.",
    related_sources: ["NO-SVALBARD-EARTH-STATION-REG", "NO-SPACE-ACT-1969"],
    notes: [
      "Signed 9 February 1920, in force 14 August 1925.",
      "Grants Norway 'full and absolute sovereignty' but with military-use constraints.",
      "Russia and China raise concerns about dual-use data from SvalSat.",
      "Prof. Geir Ulfstein (UiO): even downloading military intelligence would be permitted — Art. 9 targets physical infrastructure, not information.",
      "January 2022: one of two undersea cables to SvalSat was cut after Russian trawler passed over it 20 times.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Primary National Legislation (1) ───────────────────────────

const PRIMARY_LEGISLATION_NO: LegalSource[] = [
  {
    id: "NO-SPACE-ACT-1969",
    jurisdiction: "NO",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Activities Act 1969 — World's First National Space Law",
    title_local:
      "Lov om oppskyting av gjenstander fra norsk territorium m.m. ut i verdensrommet",
    date_enacted: "1969-06-13",
    official_reference: "LOV-1969-06-13-38",
    source_url: "https://lovdata.no/dokument/NL/lov/1969-06-13-38",
    issuing_body: "Stortinget",
    competent_authorities: ["NO-CAA", "NO-NFD"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Authorization requirement",
        summary:
          "Prohibits launching objects into outer space without ministerial authorization from: (a) Norwegian territory including Svalbard and Jan Mayen, (b) Norwegian ships or aircraft, (c) areas not under any state's sovereignty when launched by a Norwegian citizen or habitual resident. Conditions may be attached.",
        complianceImplication:
          "Launch-permit authority delegated to the CAA on 31 May 2024. The CAA issued its first launch permit to Isar Aerospace in March 2025.",
      },
      {
        section: "§ 2",
        title: "Power to issue implementing regulations",
        summary:
          "The Ministry may issue implementing regulations on control of activities described in § 1.",
      },
      {
        section: "§ 3",
        title: "Entry into force",
        summary: "Immediate entry into force upon enactment.",
      },
    ],
    scope_description:
      "The WORLD'S FIRST national space law. Only 3 sections — widely recognized as the world's shortest space statute. Contains NO provisions on liability, insurance, registration, debris mitigation, transfer, penalties, or supervision. Violations covered by § 332 of the General Criminal Code (fines or max 3 months imprisonment). Never formally amended since 1969. Replacement by comprehensive new Space Act expected 2026.",
    related_sources: [
      "NO-OST-1967",
      "NO-NEW-SPACE-ACT-DRAFT",
      "NO-SVALBARD-EARTH-STATION-REG",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "LOV-1969-06-13-38. Enacted 13 June 1969.",
      "WORLD'S FIRST national space law — predates all other jurisdictions.",
      "Only 3 sections — the shortest space statute ever enacted.",
      "No liability, insurance, registration, debris, or supervision provisions.",
      "Launch authority delegated to CAA on 31 May 2024.",
      "CAA first launch permit: Isar Aerospace, March 2025.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Draft Legislation (1) ──────────────────────────────────────

const DRAFT_LEGISLATION_NO: LegalSource[] = [
  {
    id: "NO-NEW-SPACE-ACT-DRAFT",
    jurisdiction: "NO",
    type: "draft_legislation",
    status: "draft",
    title_en: "Proposed New Space Activities Act — Prop. 155 L (2024-2025)",
    title_local: "Prop. 155 L (2024–2025) Lov om romvirksomhet",
    date_published: "2025-07-01",
    source_url: "https://www.regjeringen.no",
    issuing_body: "Regjeringen / Stortinget",
    competent_authorities: ["NO-CAA", "NO-NFD", "NO-NOSA"],
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
        section: "Ch. 1 (§§ 1-5)",
        title: "Purpose, scope, and definitions",
        summary:
          "Objective: 'safe and sustainable use of outer space.' Geographic scope: Norway including Svalbard, Jan Mayen, Bouvetøya, and Norwegian Antarctic dependencies. Applies to Norwegian citizens, persons 'established' in Norway, and Norwegian vessels. No definition of outer space boundary (Committee suggested 80-110 km).",
      },
      {
        section: "Ch. 2 (§ 6)",
        title: "Authorization/licensing requirements",
        summary:
          "Operators must have 'necessary expertise and sufficient financial resources.' Mandatory environmental impact assessment. Authorization required for transfer of ownership or operations.",
      },
      {
        section: "Ch. 4 (§ 11)",
        title: "Operator obligations — debris and environment",
        summary:
          "Space activities shall not cause 'disproportionate damage to the environment' (§ 11(a)), shall 'as far as possible' not result in space debris (§ 11(b)), and shall not 'unnecessarily or unreasonably' hinder other lawful activities (§ 11(c)). References IADC, UN COPUOS, and LTS guidelines.",
        complianceImplication:
          "Debris threshold is NOT absolute — 'no more than strictly necessary.' A 'responsible conduct' duty serves as the overarching norm.",
      },
      {
        section: "Ch. 5 (§§ 15-18)",
        title: "Strict liability, state recourse, mandatory insurance",
        summary:
          "Strict (objective) liability for operators for surface/aircraft damage (§ 15). State right of recourse against operators (§ 16). Mandatory insurance (§ 18). Both liability and recourse capped at levels to be set by Parliament/regulations.",
        complianceImplication:
          "Transforms Norway from having zero liability provisions to a comprehensive framework. No explicit government indemnity (unlike FR/US models).",
      },
    ],
    scope_description:
      "8 chapters, 29 provisions — replacing the world's shortest space law (3 sections) with a comprehensive modern framework. Passed first reading, second reading late 2025/early 2026. Adoption expected 2026. Notable omissions: no space mining provisions (despite Artemis Accords), no space tourism, no Arctic-specific provisions beyond geographic scope.",
    related_sources: ["NO-SPACE-ACT-1969", "NO-OST-1967", "NO-LIABILITY-1995"],
    notes: [
      "Prop. 155 L (2024-2025). Introduced July 2025.",
      "Space Law Committee (Romlovutvalget) appointed 15 January 2019, report 'Rett i bane' submitted 6 February 2020.",
      "Storting Trade and Industry Committee comments: Innst. 32 L (2025-2026), November 2025.",
      "Adoption expected 2026.",
      "29 provisions replacing 3 — most dramatic expansion of any national space law.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Svalbard/Antarctic Regulations (2) ─────────────────────────

const SVALBARD_REGULATIONS_NO: LegalSource[] = [
  {
    id: "NO-SVALBARD-EARTH-STATION-REG",
    jurisdiction: "NO",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Svalbard Satellite Earth Station Regulation",
    title_local:
      "Forskrift om etablering, drift og bruk av jordstasjon for satellitt på Svalbard",
    date_enacted: "2017-04-21",
    official_reference: "FOR-2017-04-21-493",
    source_url: "https://lovdata.no/dokument/SF/forskrift/2017-04-21-493",
    issuing_body: "Kongen i Statsråd",
    competent_authorities: ["NO-NKOM"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum", "military_dual_use", "licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "SvalSat operating regime",
        summary:
          "Requires Nkom permission for establishment/operation of satellite earth stations on Svalbard. Separate communication permit required per satellite. PROHIBITS military use — stations cannot send data to or receive from satellites with functions 'specifically for military purposes' except emergency assistance. Mandatory logging of ALL satellite passes. Nkom inspections assisted by Governor of Svalbard.",
        complianceImplication:
          "Critical compliance requirement for SvalSat (150+ antennas, world's largest commercial ground station). Nkom rejected US and Turkish military satellite applications. The dual-use data boundary remains legally contested.",
      },
    ],
    related_sources: [
      "NO-SVALBARD-TREATY",
      "NO-SPACE-ACT-1969",
      "NO-ANTARCTIC-EARTH-STATION-REG",
    ],
    notes: [
      "FOR-2017-04-21-493. Replaced FOR-1999-06-11-664.",
      "SvalSat: 150+ antennas, 78°N, 24/7/365 operation, only station contacting every polar satellite on all 14 daily orbits.",
      "All employees require NATO and Norwegian Armed Forces security clearance.",
      "KSAT CEO: 'all satellite-based information is dual-use.'",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "NO-ANTARCTIC-EARTH-STATION-REG",
    jurisdiction: "NO",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Antarctic Satellite Earth Station Regulation",
    title_local:
      "Forskrift om etablering, drift og bruk av jordstasjon for satellitt i Antarktis",
    date_enacted: "2017-04-21",
    official_reference: "FOR-2017-04-21-494",
    source_url: "https://lovdata.no/dokument/SF/forskrift/2017-04-21-494",
    issuing_body: "Kongen i Statsråd",
    competent_authorities: ["NO-NKOM"],
    relevance_level: "high",
    applicable_to: ["ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "TrollSat operating regime",
        summary:
          "Parallel regulation for Antarctic earth stations. Peaceful-purposes requirements per the Antarctic Treaty. Governs KSAT's TrollSat (~23 antennas), operational since March 2007, providing pole-to-pole coverage with SvalSat (max 40-minute delay).",
      },
    ],
    related_sources: ["NO-SVALBARD-EARTH-STATION-REG"],
    last_verified: "2026-04-14",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────

const TELECOM_NO: LegalSource[] = [
  {
    id: "NO-EKOMLOVEN-2024",
    jurisdiction: "NO",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act (new Ekomloven)",
    title_local: "Lov om elektronisk kommunikasjon (ekomloven)",
    date_enacted: "2024-12-13",
    date_in_force: "2025-01-01",
    official_reference: "LOV-2024-12-13-76",
    source_url: "https://lovdata.no/dokument/NL/lov/2024-12-13-76",
    issuing_body: "Stortinget",
    competent_authorities: ["NO-NKOM"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum", "liability", "insurance"],
    key_provisions: [
      {
        section: "Ch. 6",
        title: "Spectrum management and orbital slots",
        summary:
          "§ 6-6 requires Nkom to register satellite networks in the ITU international register on non-discriminatory terms. § 6-7 is the ONLY existing domestic legal basis for insurance and state recourse — authorizes Nkom to claim recourse for space damage compensation and requires launch requestors to provide security through insurance or guarantee.",
        complianceImplication:
          "Until the new Space Act is adopted, Ekomloven § 6-7 is the sole statutory basis for insurance requirements and state recourse against operators.",
      },
    ],
    related_sources: ["NO-SPACE-ACT-1969", "NO-NEW-SPACE-ACT-DRAFT"],
    notes: [
      "LOV-2024-12-13-76. In force 1 January 2025.",
      "§ 6-7: sole existing basis for space insurance/recourse.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_NO: LegalSource[] = [
  {
    id: "NO-EXPORT-CONTROL-1987",
    jurisdiction: "NO",
    type: "federal_law",
    status: "in_force",
    title_en: "Export Control Act",
    title_local:
      "Lov om kontroll med eksport av strategiske varer, tjenester og teknologi m.v.",
    date_enacted: "1987-12-18",
    official_reference: "LOV-1987-12-18-93",
    source_url: "https://lovdata.no/dokument/NL/lov/1987-12-18-93",
    issuing_body: "Stortinget",
    competent_authorities: ["NO-DEKSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Strategic goods export control",
        summary:
          "Prohibits export of goods or technology significant for military products without special permission. Penalties: fines or up to 5 years imprisonment. Implementing regulations FOR-2013-06-19-718 contain three lists: List I (defence, ML4 for rockets/missiles), List II (dual-use aligned with EU 2021/821), List III (critical tech beyond EU scope, added November 2024). ESA exemption (§ 5(d)) for products exported to ESA for official activities.",
        complianceImplication:
          "List III (November 2024) adds controls beyond EU scope including advanced semiconductors and quantum computing — coordinated with DK, FI, NL, ES, UK. DEKSA administers the regime.",
      },
    ],
    related_sources: ["NO-SPACE-ACT-1969"],
    notes: [
      "LOV-1987-12-18-93.",
      "DEKSA (established end 2024) administers the regime.",
      "List III: Norway goes beyond EU dual-use scope — critical for space tech exports.",
      "ESA exemption: § 5(d) of implementing regulations.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────

const CYBERSECURITY_NO: LegalSource[] = [
  {
    id: "NO-DIGITAL-SECURITY-2025",
    jurisdiction: "NO",
    type: "federal_law",
    status: "in_force",
    title_en: "Digital Security Act (NIS1 Implementation)",
    title_local: "Digitalsikkerhetsloven",
    date_enacted: "2025-06-23",
    date_in_force: "2025-10-01",
    source_url: "https://lovdata.no",
    issuing_body: "Stortinget",
    competent_authorities: ["NO-NSM", "NO-JUSTISDEP"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS1 implementation — with Arctic extensions",
        summary:
          "Implements NIS1 in Norwegian law. Norway proactively designated 'arktisk infrastruktur' (Arctic infrastructure) including Svalbard cables and satellites as essential infrastructure, going BEYOND standard NIS2 scope. NIS2 not yet incorporated into EEA Agreement — Ministry of Justice drafting transposition.",
        complianceImplication:
          "Space operators in Norway already face cybersecurity obligations for Arctic infrastructure. NIS2 incorporation via EEA Agreement pending.",
      },
    ],
    related_sources: ["NO-SPACE-ACT-1969"],
    notes: [
      "Signed 23 June 2025, in force 1 October 2025.",
      "Norway goes beyond NIS2 scope for Arctic infrastructure.",
      "NIS2 Directive not yet formally incorporated into EEA Agreement as of April 2026.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── National Security (1) ──────────────────────────────────────

const SECURITY_NO: LegalSource[] = [
  {
    id: "NO-SECURITY-ACT-2018",
    jurisdiction: "NO",
    type: "federal_law",
    status: "in_force",
    title_en: "National Security Act (Sikkerhetsloven)",
    title_local: "Lov om nasjonal sikkerhet (sikkerhetsloven)",
    date_enacted: "2018-06-01",
    official_reference: "LOV-2018-06-01-24",
    source_url: "https://lovdata.no/dokument/NL/lov/2018-06-01-24",
    issuing_body: "Stortinget",
    competent_authorities: ["NO-NSM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "National security framework for space entities",
        summary:
          "The Norwegian Space Agency and Space Norway AS are subject to this act. All SvalSat employees require security clearance. Covers preventive national security, critical infrastructure protection, and acquisition screening for sensitive technology companies.",
      },
    ],
    related_sources: ["NO-SVALBARD-EARTH-STATION-REG"],
    last_verified: "2026-04-14",
  },
];

// ─── Bilateral Agreements (1) ───────────────────────────────────

const BILATERAL_NO: LegalSource[] = [
  {
    id: "NO-US-TSA-2025",
    jurisdiction: "NO",
    type: "international_treaty",
    status: "in_force",
    title_en: "US-Norway Technology Safeguards Agreement (Andøya Spaceport)",
    date_enacted: "2025-01-16",
    source_url: "https://www.regjeringen.no",
    issuing_body: "Kingdom of Norway / United States",
    competent_authorities: ["NO-MAEC", "NO-CAA"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["export_control", "licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ITAR technology protection at Andøya",
        summary:
          "Specifically addresses preventing unauthorized dissemination of US technology at Andøya Spaceport. Essential for Isar Aerospace and other launch operators using US-origin components. Signed 16 January 2025.",
        complianceImplication:
          "Launch operators at Andøya must comply with TSA requirements for handling US-origin technology, in addition to Norwegian export controls.",
      },
    ],
    related_sources: ["NO-SPACE-ACT-1969", "NO-EXPORT-CONTROL-1987"],
    notes: [
      "Signed 16 January 2025.",
      "Essential enabler for commercial launches from Andøya using US-origin technology.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Policy (2) ─────────────────────────────────────────────────

const POLICY_NO: LegalSource[] = [
  {
    id: "NO-CM25-ESA",
    jurisdiction: "NO",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Norway CM25 ESA Commitment — €292 Million (November 2025, Bremen)",
    date_published: "2025-11-01",
    source_url: "https://www.romsenter.no",
    issuing_body: "Norwegian Space Agency / Government of Norway",
    competent_authorities: ["NO-NOSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Programme",
        title: "ESA commitment with Arctic Space Centre LoI",
        summary:
          "€292M committed at CM25 (€161M optional, €131M mandatory). €55M for space transportation as largest allocation. Letter of Intent signed for ESA Arctic Space Centre in Tromsø.",
      },
    ],
    related_sources: ["NO-SPACE-ACT-1969"],
    last_verified: "2026-04-14",
  },
  {
    id: "NO-MELD-ST-32-2013",
    jurisdiction: "NO",
    type: "policy_document",
    status: "in_force",
    title_en: "White Paper: Between Heaven and Earth — Norwegian Space Policy",
    title_local: "Meld. St. 32 (2012-2013) Mellom himmel og jord",
    date_published: "2013-06-01",
    source_url: "https://www.regjeringen.no",
    issuing_body: "Ministry of Trade, Industry and Fisheries",
    competent_authorities: ["NO-NFD", "NO-NOSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "First comprehensive space strategy since 1986",
        summary:
          "Principal national space strategy — first comprehensive review in 26 years. Priorities: Arctic satellite comms/EO, climate monitoring, maritime surveillance, industrial development, international cooperation. 2024 state budget: ~NOK 2.1B (~€180-190M).",
      },
    ],
    related_sources: ["NO-SPACE-ACT-1969"],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_NO: LegalSource[] = [
  ...TREATIES_NO,
  ...PRIMARY_LEGISLATION_NO,
  ...DRAFT_LEGISLATION_NO,
  ...SVALBARD_REGULATIONS_NO,
  ...TELECOM_NO,
  ...EXPORT_CONTROL_NO,
  ...CYBERSECURITY_NO,
  ...SECURITY_NO,
  ...BILATERAL_NO,
  ...POLICY_NO,
];
