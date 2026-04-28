// src/data/legal-sources/sources/uk.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * UK space law sources — complete legal framework for jurisdiction UK.
 *
 * Sources: legislation.gov.uk, CAA Space, UK Space Agency, DSIT, Ofcom, MOD
 * Last verified: 2026-04-13
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── UK Authorities (14) ────────────────────────────────────────────

export const AUTHORITIES_UK: Authority[] = [
  {
    id: "UK-CAA",
    jurisdiction: "UK",
    name_en: "Civil Aviation Authority (Space Regulation)",
    name_local: "Civil Aviation Authority (Space Regulation)",
    abbreviation: "CAA",
    website: "https://www.caa.co.uk/space",
    space_mandate:
      "UK space regulator since July 2021. Issues all space licences under the Space Industry Act 2018 and overseas activity licences under the Outer Space Act 1986. Responsible for operator licensing, spaceport licensing, range control licensing, and orbital activity regulation.",
    legal_basis: "Space Industry Act 2018; Outer Space Act 1986",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "UK-UKSA",
    jurisdiction: "UK",
    name_en: "UK Space Agency",
    name_local: "UK Space Agency",
    abbreviation: "UKSA",
    website: "https://www.gov.uk/uksa",
    space_mandate:
      "Policy, programme delivery, and international representation. Executive agency of the Department for Science, Innovation and Technology (DSIT). Manages UK participation in ESA programmes. Maintains the UK Registry of Space Objects. Merging with DSIT April 2026.",
    applicable_areas: [
      "licensing",
      "registration",
      "debris_mitigation",
      "space_traffic_management",
    ],
  },
  {
    id: "UK-OFCOM",
    jurisdiction: "UK",
    name_en: "Office of Communications",
    name_local: "Office of Communications",
    abbreviation: "Ofcom",
    website: "https://www.ofcom.org.uk",
    space_mandate:
      "Satellite spectrum licensing and ITU filings on behalf of UK operators. Regulates satellite broadcasting and broadband services. Issues Wireless Telegraphy Act licences for satellite earth stations and space stations.",
    legal_basis: "Communications Act 2003; Wireless Telegraphy Act 2006",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "UK-ECJU",
    jurisdiction: "UK",
    name_en: "Export Control Joint Unit",
    name_local: "Export Control Joint Unit",
    abbreviation: "ECJU",
    parent_ministry: "Department for Business and Trade",
    website:
      "https://www.gov.uk/government/organisations/export-control-joint-unit",
    space_mandate:
      "Space technology export licensing. Administers UK export controls for military and dual-use items including spacecraft, launch vehicles, and satellite components under the Export Control Act 2002 and Export Control Order 2008.",
    legal_basis: "Export Control Act 2002",
    applicable_areas: ["export_control"],
  },
  {
    id: "UK-SPACECOMMAND",
    jurisdiction: "UK",
    name_en: "UK Space Command",
    name_local: "UK Space Command",
    abbreviation: "UK Space Command",
    parent_ministry: "Ministry of Defence",
    website: "https://www.gov.uk/government/groups/uk-space-command",
    space_mandate:
      "Military space operations, space domain awareness (SDA), and Skynet satellite communications. Established 1 April 2021, headquartered at RAF High Wycombe. Operates UK's military space capabilities and coordinates with allied space commands.",
    applicable_areas: ["military_dual_use", "space_traffic_management"],
  },
  {
    id: "UK-NCSC",
    jurisdiction: "UK",
    name_en: "National Cyber Security Centre",
    name_local: "National Cyber Security Centre (GCHQ)",
    abbreviation: "NCSC",
    website: "https://www.ncsc.gov.uk",
    space_mandate:
      "Cybersecurity guidance for space systems. Part of GCHQ. Advises the CAA on cybersecurity aspects of space licence applications. Published guidance on satellite security principles.",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "UK-HSE",
    jurisdiction: "UK",
    name_en: "Health and Safety Executive",
    name_local: "Health and Safety Executive",
    abbreviation: "HSE",
    website: "https://www.hse.gov.uk",
    space_mandate:
      "Launch site safety regulation. Enforces COMAH (Control of Major Accident Hazards) regulations for rocket propellant storage and handling. Oversees explosives regulations for solid rocket motors and pyrotechnics at spaceports.",
    applicable_areas: ["environmental"],
  },
  {
    id: "UK-ICO",
    jurisdiction: "UK",
    name_en: "Information Commissioner's Office",
    name_local: "Information Commissioner's Office",
    abbreviation: "ICO",
    website: "https://ico.org.uk",
    space_mandate:
      "Data protection authority for Earth observation imagery with personal data implications. Enforces UK GDPR and the Data Protection Act 2018 as they apply to satellite-derived geospatial data processing.",
    legal_basis: "Data Protection Act 2018; UK GDPR",
    applicable_areas: ["data_security"],
  },
  {
    id: "UK-AAIB",
    jurisdiction: "UK",
    name_en:
      "Air Accidents Investigation Branch / Space Accident Investigation Authority",
    name_local:
      "Air Accidents Investigation Branch / Space Accident Investigation Authority",
    abbreviation: "AAIB/SAIA",
    website:
      "https://www.gov.uk/government/organisations/air-accidents-investigation-branch",
    space_mandate:
      "Space accident investigation. The SIA 2018 s.20 and SI 2021/793 establish the Space Accident Investigation Authority (SAIA) within the existing AAIB framework. Investigates spaceflight accidents and serious incidents.",
    legal_basis: "SIA 2018 s.20; SI 2021/793",
    applicable_areas: ["licensing"],
  },
  {
    id: "UK-DSIT",
    jurisdiction: "UK",
    name_en: "Department for Science, Innovation and Technology",
    name_local: "Department for Science, Innovation and Technology",
    abbreviation: "DSIT",
    website:
      "https://www.gov.uk/government/organisations/department-for-science-innovation-and-technology",
    space_mandate:
      "Overall civil space policy. Parent department for the UK Space Agency. Responsible for the National Space Strategy and space regulatory reform. UKSA merging into DSIT from April 2026.",
    applicable_areas: ["licensing"],
  },
  {
    id: "UK-DFT",
    jurisdiction: "UK",
    name_en: "Department for Transport",
    name_local: "Department for Transport",
    abbreviation: "DfT",
    website:
      "https://www.gov.uk/government/organisations/department-for-transport",
    space_mandate:
      "SIA 2018 regulatory policy. Issues Secretary of State consents for sub-orbital and non-orbital spaceflight licences. Responsible for spaceport planning policy.",
    applicable_areas: ["licensing"],
  },
  {
    id: "UK-MOD",
    jurisdiction: "UK",
    name_en: "Ministry of Defence",
    name_local: "Ministry of Defence",
    abbreviation: "MOD",
    website: "https://www.gov.uk/government/organisations/ministry-of-defence",
    space_mandate:
      "Defence space policy and the Defence Space Portfolio. Oversees UK Space Command. Responsible for Skynet military satellite communications and defence space programmes.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "UK-NSPOC",
    jurisdiction: "UK",
    name_en: "National Space Operations Centre",
    name_local: "National Space Operations Centre",
    abbreviation: "NSpOC",
    website: "https://www.gov.uk/government/groups/uk-space-command",
    space_mandate:
      "Launched May 2024, headquartered at RAF High Wycombe. Approximately 70 personnel. Provides space situational awareness (SSA) and space surveillance and tracking (SST) services for the UK. Civil-military coordination for conjunction assessment and collision avoidance.",
    applicable_areas: ["space_traffic_management"],
  },
  {
    id: "UK-MCA",
    jurisdiction: "UK",
    name_en: "Maritime and Coastguard Agency",
    name_local: "Maritime and Coastguard Agency",
    abbreviation: "MCA",
    website:
      "https://www.gov.uk/government/organisations/maritime-and-coastguard-agency",
    space_mandate:
      "Sea range safety and maritime exclusion zones during launches. Coordinates vessel clearance and maritime safety for launch and re-entry operations from UK spaceports.",
    applicable_areas: ["licensing"],
  },
];

// ─── International Treaties (UK-specific entries) ─────────────────────
//
// TODO(H6 data consolidation): INT-ARTEMIS-ACCORDS-2020 and INT-HCOC-2002
// below carry `jurisdiction: "INT"` but live in this country file. They
// are reachable via getLegalSourceById() but are NOT part of
// JURISDICTION_DATA.get("INT") in src/data/legal-sources/index.ts, which
// breaks the single-source-of-truth contract. Before migrating them into
// sources/intl.ts the full signatory list (applies_to_jurisdictions +
// signed_by_jurisdictions) needs to be researched — do not guess.

const TREATIES_UK: LegalSource[] = [
  {
    id: "UK-INT-OST-RATIFICATION",
    jurisdiction: "UK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — UK Ratification Record",
    date_enacted: "1967-01-27",
    date_in_force: "1967-10-10",
    source_url:
      "https://treaties.un.org/Pages/showDetails.aspx?objid=0800000280128cbd",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["UK-UKSA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "United Kingdom's ratification record for the 1967 Outer Space Treaty. Anchors the State-responsibility regime under Art. VI OST that obliges the UK to authorise and supervise national activities in outer space — the constitutional basis for the Outer Space Act 1986 and the Space Industry Act 2018.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "The UK bears international responsibility for all national space activities including by non-governmental entities. This is the constitutional foundation of both the Outer Space Act 1986 and the Space Industry Act 2018.",
        complianceImplication:
          "Art. VI is the direct legal basis for the UK's dual-statute licensing regime. Every UK space operator must be authorized because the UK bears responsibility under this article.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "The UK is a 'launching State' for objects launched from UK territory or by UK nationals. This drives the insurance and indemnification requirements in both OSA 1986 and SIA 2018.",
      },
    ],
    related_sources: [
      "UK-OSA-1986",
      "UK-SIA-2018",
      "UK-INT-LIABILITY-1972",
      "UK-INT-REGISTRATION-1975",
    ],
    notes: [
      "The UK was one of the original signatories and depositary states of the Outer Space Treaty (along with the USA and USSR). Ratified 10 October 1967.",
      "Art. VI is the foundational legal basis for the UK's entire dual-statute space authorization framework (OSA 1986 + SIA 2018).",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-INT-LIABILITY-1972",
    jurisdiction: "UK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — UK Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1972-09-01",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["UK-UKSA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    scope_description:
      "UK ratification record for the Liability Convention. Establishes UK absolute liability for surface damage and fault liability for in-orbit damage caused by UK-registered space objects, driving the SIA 2018 indemnity regime under which the State indemnifies licensees and recovers from them in turn.",
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "The UK as launching State is absolutely liable for damage caused by space objects on the surface of the Earth or to aircraft in flight. This drives the mandatory insurance and government indemnity regime in SIA 2018 s.34-38.",
        complianceImplication:
          "The UK's 4-tier liability architecture (operator insurance, capped liability, discretionary indemnity, mandatory backstop) is designed to manage this international obligation.",
      },
      {
        section: "Art. III",
        title: "Fault-based liability in space",
        summary:
          "In-orbit damage requires proof of fault. Less burdensome than surface liability but still drives collision avoidance obligations.",
      },
    ],
    related_sources: [
      "UK-INT-OST-RATIFICATION",
      "UK-OSA-1986",
      "UK-SIA-2018",
      "UK-LIABILITY-ARCHITECTURE",
    ],
    notes: [
      "The UK ratified the Liability Convention in 1972. It is the direct legal basis for the insurance and indemnification requirements in both OSA 1986 (s.5, s.10) and SIA 2018 (s.34-38).",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-INT-REGISTRATION-1975",
    jurisdiction: "UK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — UK Ratification Record",
    date_enacted: "1975-01-14",
    date_in_force: "1976-09-15",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["UK-UKSA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    scope_description:
      "UK ratification record for the Registration Convention. Obliges the UK to maintain a national registry of space objects and furnish UNOOSA with launch information — implemented domestically through the SIA registration provisions and CAA's registry function.",
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "The UK must maintain a national registry of space objects. UKSA maintains the UK Registry of Space Objects under OSA 1986 s.7 and SIA 2018.",
        complianceImplication:
          "All space objects launched under UK jurisdiction must be registered. Operators must provide launch and orbital data to enable registration.",
      },
    ],
    related_sources: ["UK-INT-OST-RATIFICATION", "UK-OSA-1986", "UK-SIA-2018"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-INT-MOON-1979",
    jurisdiction: "UK",
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
      "NOT ratified by the UK. The UK signed the Artemis Accords in 2020 as a founding signatory, which take a different approach to space resource utilization than the Moon Agreement's common heritage principle.",
    related_sources: ["UK-INT-OST-RATIFICATION", "INT-ARTEMIS-ACCORDS-2020"],
    notes: [
      "The UK has NOT ratified the Moon Agreement — no binding obligations for UK entities.",
      "The UK's signing of the Artemis Accords (2020) as a founding member signals preference for the Accords' approach to space resource utilization.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-ARTEMIS-ACCORDS-2020",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "The Artemis Accords: Principles for Cooperation in the Civil Exploration and Use of the Moon, Mars, Comets, and Asteroids for Peaceful Purposes",
    date_enacted: "2020-10-13",
    source_url: "https://www.nasa.gov/artemis-accords/",
    issuing_body: "United States (NASA) — multilateral open accession",
    competent_authorities: ["UK-UKSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "debris_mitigation"],
    scope_description:
      "Non-binding multilateral declaration of operating principles for civil lunar/Martian exploration: peaceful purposes, transparency, interoperability, registration, scientific data sharing, heritage preservation, safety zones for crewed and robotic surface activities. Relevant for any operator participating in NASA-led lunar missions; UK is a signatory.",
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Signatories affirm that the extraction and utilization of space resources does not inherently constitute national appropriation under the Outer Space Treaty. Operators should conduct activities in a manner consistent with the Treaty.",
        complianceImplication:
          "Provides legal framework for UK entities engaged in space resource extraction. Non-binding but politically significant — 61 countries signed as of 2026.",
      },
      {
        section: "Section 7",
        title: "Transparency",
        summary:
          "Signatories commit to publicly sharing scientific data from their space activities and describing the location and general nature of operations on celestial bodies.",
      },
      {
        section: "Section 9",
        title: "Orbital debris and spacecraft disposal",
        summary:
          "Signatories commit to planning for the safe disposal of spacecraft and to limiting the generation of new debris.",
      },
    ],
    related_sources: ["UK-INT-OST-RATIFICATION", "UK-INT-MOON-1979"],
    notes: [
      "The UK was a founding signatory on 13 October 2020. Non-binding political commitment but influential in shaping norms.",
      "61 countries signed as of 2026. Contrasts with the Moon Agreement which has minimal adoption among spacefaring nations.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-HCOC-2002",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Hague Code of Conduct against Ballistic Missile Proliferation",
    date_enacted: "2002-11-25",
    source_url: "https://www.hcoc.at",
    issuing_body: "Multilateral (143 subscribing states)",
    competent_authorities: ["UK-MOD"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["military_dual_use"],
    scope_description:
      "Politically-binding code of conduct against ballistic missile proliferation, adjacent to space-launch-vehicle technology. UK is a subscribing state. Affects export-control posture for solid-rocket motors, large boosters, and re-entry vehicle technology that have dual-use proliferation concern.",
    key_provisions: [
      {
        section: "Principles",
        title: "Pre-launch notifications",
        summary:
          "Subscribing states commit to provide pre-launch notifications of ballistic missile and space launch vehicle launches, and annual declarations of policies on space launch vehicles and ballistic missiles.",
        complianceImplication:
          "The UK as an original subscriber must notify the HCOC of space launch vehicle launches. Relevant for launch providers operating from UK spaceports.",
      },
    ],
    related_sources: ["UK-INT-OST-RATIFICATION"],
    notes: [
      "The UK was an original subscriber. Non-binding but confidence-building measure. 143 subscribing states as of 2026.",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Primary Legislation (4) ────────────────────────────────────────

const PRIMARY_LEGISLATION_UK: LegalSource[] = [
  {
    id: "UK-OSA-1986",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en: "Outer Space Act 1986",
    date_enacted: "1986-07-18",
    date_last_amended: "2021-07-29",
    official_reference: "1986 c.38",
    source_url: "https://www.legislation.gov.uk/ukpga/1986/38",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-CAA", "UK-UKSA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability", "insurance"],
    key_provisions: [
      {
        section: "s.1",
        title: "Scope — activities in outer space",
        summary:
          "The Act applies to activities carried on in outer space by UK nationals, Scottish firms, and bodies incorporated under UK law. Since July 2021, limited to overseas activities only — UK-based activities are covered by SIA 2018.",
        complianceImplication:
          "UK-connected persons conducting space activities from non-UK territory still require an OSA 1986 licence from the CAA.",
      },
      {
        section: "s.3",
        title: "Prohibition of unlicensed activities",
        summary:
          "No person to whom the Act applies shall carry on any space activity except under the authority of a licence.",
      },
      {
        section: "s.5",
        title: "Terms of licence — insurance",
        summary:
          "Licences may contain conditions including requirements for the licensee to insure against liability for damage or loss.",
        complianceImplication:
          "Insurance is a standard licence condition. The CAA sets insurance requirements based on risk assessment.",
      },
      {
        section: "s.7",
        title: "Register of space objects",
        summary:
          "The Secretary of State shall maintain a register of space objects. Extended to cover objects launched under both OSA and SIA.",
      },
      {
        section: "s.10",
        title: "Government indemnity — capped by Deregulation Act 2015",
        summary:
          "The licensee is liable to indemnify the government against claims. The Deregulation Act 2015 s.12 introduced mandatory liability caps, limiting operator exposure.",
        complianceImplication:
          "Operator indemnity obligations are now capped. Published cap for OSA licences: EUR 60M.",
      },
      {
        section: "s.12",
        title: "Offences",
        summary:
          "Conducting unlicensed space activities is a criminal offence carrying up to 2 years imprisonment.",
      },
    ],
    scope_description:
      "Since July 2021, OSA 1986 applies ONLY to overseas activities by UK-connected persons. All UK-based spaceflight activities are governed by SIA 2018. The Act has been extended to the Isle of Man, Gibraltar, Cayman Islands, and Bermuda.",
    related_sources: [
      "UK-SIA-2018",
      "UK-DEREGULATION-2015-S12",
      "UK-INT-OST-RATIFICATION",
      "UK-LIABILITY-ARCHITECTURE",
    ],
    amended_by: ["UK-DEREGULATION-2015-S12", "UK-SIA-2018"],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "One of the earliest national space laws in the world. Now part of a dual-statute structure with SIA 2018.",
      "Since July 2021, scope reduced to overseas activities only. UK-based activities are covered by SIA 2018.",
      "Extended to Crown Dependencies and Overseas Territories: Isle of Man, Gibraltar, Cayman Islands, Bermuda.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SIA-2018",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Industry Act 2018",
    date_enacted: "2018-03-15",
    date_in_force: "2021-07-29",
    official_reference: "2018 c.5",
    source_url: "https://www.legislation.gov.uk/ukpga/2018/5",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-CAA", "UK-DSIT", "UK-DFT"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "environmental",
      "cybersecurity",
    ],
    key_provisions: [
      {
        section: "s.1-4",
        title: "Scope, regulator duties, and principal objectives",
        summary:
          "Establishes the regulatory framework for spaceflight activities carried out from the United Kingdom. 70 sections across 12 Schedules. Designates the CAA as the regulator.",
        complianceImplication:
          "Comprehensive framework — all UK-based spaceflight requires an SIA licence. Five licence types cover all aspects of spaceflight activities.",
      },
      {
        section: "s.3",
        title: "Prohibition of unlicensed spaceflight",
        summary:
          "It is an offence to carry out spaceflight activities, operate a spaceport, or provide range control services without a licence from the regulator.",
      },
      {
        section: "s.8-15",
        title: "Licences — five types",
        summary:
          "Five licence categories: (1) operator licence for launch/return, (2) spaceport licence, (3) range control licence, (4) orbital operator licence, and (5) mission management licence. Each with specific eligibility and safety requirements.",
        complianceImplication:
          "Operators must identify which licence type(s) apply to their activities and apply to the CAA accordingly.",
      },
      {
        section: "s.11",
        title: "Assessment of environmental effects (AEE)",
        summary:
          "The regulator must not grant a spaceport or launch licence unless satisfied that the applicant has carried out an assessment of environmental effects.",
        complianceImplication:
          "AEE is a mandatory prerequisite for spaceport and launch licences. Covers air quality, emissions, biodiversity, marine, noise, water, and soil impacts.",
      },
      {
        section: "s.30-33",
        title: "Offences",
        summary:
          "Comprehensive offence provisions including unlicensed activities, breach of licence conditions, and endangering safety. Schedule 4 includes hijacking offences carrying life imprisonment.",
      },
      {
        section: "s.34-38",
        title: "Liability and insurance",
        summary:
          "Establishes the liability framework for spaceflight activities. Operators must have insurance or financial security. The regulator may require indemnification of the government. Liability may be limited to a specified amount.",
        complianceImplication:
          "The SIA Indemnities Act 2025 amended s.12(2) so that all operator licences MUST specify a liability limit. This created the mandatory cap regime.",
      },
      {
        section: "s.49-56",
        title: "Accident investigation",
        summary:
          "Establishes the framework for space accident investigation. The Secretary of State may direct investigation of spaceflight accidents. Links to SI 2021/793 (SAIA regulations).",
      },
      {
        section: "Sch.4",
        title: "Hijacking of spacecraft — offences",
        summary:
          "Creates specific criminal offences for hijacking spacecraft, including endangering safety and acts of violence on board. Maximum penalty: life imprisonment.",
      },
    ],
    scope_description:
      "The SIA 2018 is the comprehensive framework for all UK-based spaceflight activities. 70 sections across 12 Schedules. In force since 29 July 2021. Covers launches, orbital operations, spaceports, range control, and return from space. Supplemented by SI 2021/792 (287 regulations, 6 Schedules).",
    related_sources: [
      "UK-OSA-1986",
      "UK-SI-2021-792",
      "UK-SI-2021-793",
      "UK-SI-2021-816",
      "UK-SIA-INDEMNITIES-2025",
      "UK-INT-OST-RATIFICATION",
      "UK-LIABILITY-ARCHITECTURE",
    ],
    amended_by: ["UK-SIA-INDEMNITIES-2025"],
    caelex_engine_mapping: [
      "space-law-engine.server",
      "uk-space-engine.server",
    ],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "The SIA 2018 and OSA 1986 together form the UK's dual-statute space law framework — unique among spacefaring nations.",
      "In force 29 July 2021. Enabled by SI 2021/792 (the principal implementing regulations, 287 regulations across 6 Schedules).",
      "Five licence types: operator, spaceport, range control, orbital operator, mission management.",
    ],
    legislative_history: [
      // ⚠️ Audit-honesty note (2026-04-28): pre-Royal-Assent steps
      // (consultation, Lords introduction, Lords/Commons readings,
      // Public Bill Committee) had specific bill numbers / sponsor
      // names / amendment counts that I drafted from plausibility,
      // not from the parliamentary record. Stripped pending
      // verification against bills.parliament.uk and Hansard. The
      // 2025 Indemnities Act amendment is captured separately as a
      // standalone LegalSource record (UK-SIA-INDEMNITIES-2025) and
      // will be cross-linked here via amended_by once a verified
      // amendment milestone is added.
      {
        date: "2018-03-15",
        type: "presidential_signature",
        body: "Royal Assent",
        reference: "Space Industry Act 2018 c.5",
        description:
          "Royal Assent received. Act enters the statute book; substantive commencement is staggered via secondary legislation.",
        source_url: "https://www.legislation.gov.uk/ukpga/2018/5",
      },
      {
        date: "2021-07-29",
        type: "in_force",
        body: "Department for Transport · Commencement Order",
        description:
          "Principal commencement of substantive provisions. Exact SI reference (Commencement No. 1) pending verification against the UK SI register at legislation.gov.uk.",
        source_url: "https://www.legislation.gov.uk/ukpga/2018/5/contents",
      },
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SIA-INDEMNITIES-2025",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Industry (Indemnities) Act 2025",
    date_enacted: "2025-12-18",
    date_in_force: "2026-02-18",
    official_reference: "2025 c.35",
    source_url: "https://www.legislation.gov.uk/ukpga/2025/35",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-CAA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    scope_description:
      "2025 amendment law setting the statutory third-party indemnity caps that operators owe the State under SIA 2018. Establishes the per-licence cap structure that determines mandatory insurance — the financial complement to SIA's authorisation requirements.",
    key_provisions: [
      {
        section: "s.1",
        title: "Amendment of SIA 2018 s.12(2) — mandatory liability cap",
        summary:
          "Changes 'may' to 'must' in SIA 2018 s.12(2) — all operator licences MUST now specify a maximum amount of the licensee's liability. Creates a mandatory liability cap for all licensed operators.",
        complianceImplication:
          "All SIA operator licences must include a specified liability limit. This provides regulatory certainty for operators and investors. Published caps include Virgin Orbit $250M, RFA GBP 10.5M, Skyrora GBP 10.5M.",
      },
    ],
    amends: "UK-SIA-2018",
    related_sources: [
      "UK-SIA-2018",
      "UK-OSA-1986",
      "UK-LIABILITY-ARCHITECTURE",
    ],
    notes: [
      "Royal Assent 18 December 2025, in force 18 February 2026.",
      "Key reform: ensures all operators have defined liability caps, addressing industry concerns about uncapped indemnification exposure.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-DEREGULATION-2015-S12",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Deregulation Act 2015, Section 12 — Outer Space Act Liability Caps",
    date_enacted: "2015-03-26",
    date_in_force: "2015-10-01",
    official_reference: "2015 c.20, s.12",
    amended_by: ["UK-SIA-INDEMNITIES-2025"],
    source_url: "https://www.legislation.gov.uk/ukpga/2015/20/section/12",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-CAA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    scope_description:
      "Section 12 of the Deregulation Act 2015 introduces a £60m statutory cap on the third-party liability that an Outer Space Act 1986 licensee can owe the Crown. Applies only to OSA licences (continuing in parallel with the SIA 2018 regime); modernised and expanded by SIA-INDEMNITIES-2025.",
    key_provisions: [
      {
        section: "s.12",
        title: "Mandatory liability caps in OSA 1986",
        summary:
          "Introduced mandatory liability caps into the Outer Space Act 1986. Enables the Secretary of State to set a maximum amount for which a licensee may be required to indemnify the government.",
        complianceImplication:
          "Landmark reform that capped operator liability under OSA licences. Published cap: EUR 60M for OSA licences. Paved the way for the SIA Indemnities Act 2025.",
      },
    ],
    amends: "UK-OSA-1986",
    related_sources: [
      "UK-OSA-1986",
      "UK-SIA-INDEMNITIES-2025",
      "UK-LIABILITY-ARCHITECTURE",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Secondary Legislation — Space-Specific (6) ────────────────────

const SECONDARY_LEGISLATION_UK: LegalSource[] = [
  {
    id: "UK-SI-2021-792",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Industry Regulations 2021",
    date_in_force: "2021-07-29",
    official_reference: "SI 2021/792",
    source_url: "https://www.legislation.gov.uk/uksi/2021/792",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-CAA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "cybersecurity",
      "environmental",
      "liability",
      "insurance",
    ],
    scope_description:
      "Principal implementing regulations for the SIA 2018 — define the five-licence taxonomy (operator, spaceport, range-control, orbital, mission-management), the licence-application content, fee structure, and the operator-conduct requirements that bind every UK launch and orbital activity.",
    key_provisions: [
      {
        section: "Parts 1-17",
        title:
          "Principal implementing regulations — 287 regulations, 6 Schedules",
        summary:
          "THE principal implementing regulations for SIA 2018. 287 regulations across 6 Schedules and 17 Parts covering: licensing procedures, safety case requirements, security, cybersecurity (Part 11), training, liabilities and insurance, enforcement, and occurrence reporting.",
        complianceImplication:
          "Every SIA-licensed operator must comply with these regulations. Part 11 (cybersecurity) is particularly significant — requires cyber risk assessments and security measures for all licensed spaceflight activities.",
      },
      {
        section: "Part 11",
        title: "Security — cybersecurity requirements",
        summary:
          "Imposes cybersecurity obligations on all SIA licence holders. Requires risk assessments, security plans, incident reporting, and personnel vetting for spaceflight activities.",
        complianceImplication:
          "All SIA-licensed operators must implement cybersecurity measures. CAA may require compliance with NCSC guidance as a licence condition.",
      },
      {
        section: "Schedule 1",
        title: "Licence application requirements",
        summary:
          "Detailed requirements for licence applications including technical, financial, insurance, and safety documentation.",
      },
    ],
    related_sources: [
      "UK-SIA-2018",
      "UK-SI-2021-793",
      "UK-SI-2021-816",
      "UK-SI-2021-815",
    ],
    caelex_engine_mapping: ["uk-space-engine.server"],
    notes: [
      "The most important secondary legislation for UK space activities. 287 regulations across 17 Parts — the operational detail behind the SIA 2018.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SI-2021-793",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Spaceflight Activities (Investigation of Spaceflight Accidents) Regulations 2021",
    date_in_force: "2021-07-29",
    official_reference: "SI 2021/793",
    source_url: "https://www.legislation.gov.uk/uksi/2021/793",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-AAIB"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Spaceflight accident investigation regulations creating an AAIB-led investigation regime for UK launches and orbital incidents. Defines reporting duties, investigator powers, and the post-incident procedures all SIA licensees must follow when an event reaches the regulatory threshold.",
    key_provisions: [
      {
        section: "Full instrument",
        title: "Space Accident Investigation Authority establishment",
        summary:
          "Establishes the Space Accident Investigation Authority (SAIA) framework. Defines procedures for investigating spaceflight accidents and serious incidents. Investigation reports must not apportion blame or liability.",
      },
    ],
    related_sources: ["UK-SIA-2018", "UK-SI-2021-792"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SI-2021-816",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Industry (Appeals) Regulations 2021",
    date_in_force: "2021-07-29",
    official_reference: "SI 2021/816",
    source_url: "https://www.legislation.gov.uk/uksi/2021/816",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-CAA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Appeals regulations for licensing decisions under SIA 2018 — provides the procedural route for operators to challenge CAA refusals, conditions, or revocations. Independent of the licensing rules themselves; sets the timeline and tribunal forum for licensing disputes.",
    key_provisions: [
      {
        section: "Full instrument",
        title: "Appeals framework for licensing decisions",
        summary:
          "Establishes the appeals process for CAA licensing decisions under SIA 2018. Operators may appeal refusals, conditions, or revocations of space licences.",
      },
    ],
    related_sources: ["UK-SIA-2018", "UK-SI-2021-792"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SI-2021-815",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Contracting Out (Functions in Relation to Space) Order 2021",
    date_in_force: "2021-07-29",
    official_reference: "SI 2021/815",
    source_url: "https://www.legislation.gov.uk/uksi/2021/815",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-CAA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Contracting-out order delegating ministerial space-licensing functions to the Civil Aviation Authority. Without this SI, the SIA 2018 powers would sit with the Secretary of State rather than the CAA — establishes the regulator-of-record for all UK space licensing today.",
    key_provisions: [
      {
        section: "Full instrument",
        title: "Delegation of regulatory functions to CAA",
        summary:
          "Delegates spaceflight regulatory functions from the Secretary of State to the Civil Aviation Authority. Establishes the CAA as the operational regulator for space activities under SIA 2018.",
      },
    ],
    related_sources: ["UK-SIA-2018"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SI-2021-879",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Air Navigation (Amendment) Order 2021",
    date_in_force: "2021-07-29",
    official_reference: "SI 2021/879",
    source_url: "https://www.legislation.gov.uk/uksi/2021/879",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-CAA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Air-navigation amendment integrating spaceflight activities into the standard airspace-management regime. Coordinates launch-vehicle airspace transit with conventional ATC, danger-area activations, and NOTAM procedures around UK spaceports.",
    key_provisions: [
      {
        section: "Full instrument",
        title: "Flight restriction zones around spaceports",
        summary:
          "Amends the Air Navigation Order to establish flight restriction zones around licensed spaceport sites during launch and re-entry operations. Protects airspace safety.",
      },
    ],
    related_sources: ["UK-SIA-2018", "UK-SI-2021-792"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SI-2025-222",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Space Industry (Licence Exemption for Military Activities of Allies) Regulations 2025",
    date_in_force: "2025-03-01",
    official_reference: "SI 2025/222",
    source_url: "https://www.legislation.gov.uk/uksi/2025/222",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-MOD", "UK-CAA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "military_dual_use"],
    scope_description:
      "2025 regulations exempting allied-military space activities from SIA 2018 licence requirements. Practical effect: NATO/Five Eyes partner-government missions can operate from UK territory under bilateral arrangements without separate CAA licensing — narrows the SIA's commercial-licensing scope.",
    key_provisions: [
      {
        section: "Full instrument",
        title: "Allied forces licence exemption",
        summary:
          "Exempts allied military forces from the requirement to hold a UK space licence for certain space activities conducted from UK territory. Facilitates NATO and bilateral space cooperation.",
      },
    ],
    related_sources: ["UK-SIA-2018"],
    last_verified: "2026-04-13",
  },
];

// ─── Telecommunications (2) ─────────────────────────────────────────

const TELECOM_UK: LegalSource[] = [
  {
    id: "UK-WTA-2006",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en: "Wireless Telegraphy Act 2006",
    date_enacted: "2006-11-08",
    official_reference: "2006 c.36",
    source_url: "https://www.legislation.gov.uk/ukpga/2006/36",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-OFCOM"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Statutory framework for radio-spectrum allocation administered by Ofcom. The licensing route for satellite ground-station spectrum, satellite operator licences, and the UK component of ITU coordination filings — companion to the satellite-specific provisions in the Communications Act 2003.",
    key_provisions: [
      {
        section: "s.8",
        title: "Ofcom licensing power",
        summary:
          "Ofcom may grant wireless telegraphy licences for the use of radio spectrum. All satellite operators using spectrum from UK-filed frequencies require Ofcom licensing.",
        complianceImplication:
          "No UK satellite system may operate without an Ofcom wireless telegraphy licence. Filing lead times via Ofcom to the ITU apply.",
      },
    ],
    related_sources: ["UK-CA-2003"],
    caelex_engine_mapping: ["spectrum-engine.server"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-CA-2003",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en: "Communications Act 2003",
    date_enacted: "2003-07-17",
    official_reference: "2003 c.21",
    source_url: "https://www.legislation.gov.uk/ukpga/2003/21",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-OFCOM"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Communications Act 2003 establishes Ofcom's statutory powers over telecommunications networks and services, including satellite networks providing UK-bound or UK-originating services. Captures spectrum, market access, and consumer-protection duties that overlay any orbital licence under SIA 2018.",
    key_provisions: [
      {
        section: "Parts 1-2",
        title: "Ofcom regulatory powers and duties",
        summary:
          "Establishes Ofcom as the UK communications regulator. Grants powers for satellite broadcasting regulation, spectrum management, and network regulation. Ofcom acts as the UK's ITU administration.",
        complianceImplication:
          "Satellite broadband and broadcasting services must comply with Ofcom's regulatory framework under this Act.",
      },
    ],
    related_sources: ["UK-WTA-2006"],
    last_verified: "2026-04-13",
  },
];

// ─── Export Control (2) ─────────────────────────────────────────────

const EXPORT_CONTROL_UK: LegalSource[] = [
  {
    id: "UK-ECA-2002",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en: "Export Control Act 2002",
    date_enacted: "2002-07-24",
    official_reference: "2002 c.28",
    source_url: "https://www.legislation.gov.uk/ukpga/2002/28",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-ECJU"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "Primary export-control statute giving the Secretary of State power to control exports of controlled goods, software, and technology — including space hardware and satellite technology. The legal anchor under which the Export Control Order 2008 and current EU-aligned controls operate.",
    key_provisions: [
      {
        section: "s.1-5",
        title: "Export control powers",
        summary:
          "Primary enabling legislation for UK export controls. Gives the Secretary of State power to impose controls on the export of goods, transfer of technology, and provision of technical assistance for military, dual-use, and strategic items including space technology.",
        complianceImplication:
          "All exports of controlled space technology require ECJU licensing. The Act enables the Export Control Order 2008 which contains the detailed control lists.",
      },
    ],
    related_sources: ["UK-ECO-2008"],
    caelex_engine_mapping: ["export-control-engine.server"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-ECO-2008",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Export Control Order 2008",
    date_enacted: "2008-12-05",
    date_last_amended: "2025-05-01",
    official_reference: "SI 2008/3231",
    source_url: "https://www.legislation.gov.uk/uksi/2008/3231",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-ECJU"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "Detailed export-control list and licensing procedures for military, dual-use, and emerging-technology items. Annex includes spacecraft components, GNSS receivers, INS, and propulsion systems — the operative document for any UK-based space-export licensing application via ECJU.",
    key_provisions: [
      {
        section: "Schedule 2",
        title: "Military List",
        summary:
          "UK Military List — controls on military items including certain launch vehicles, military satellite systems, and military-grade space components.",
      },
      {
        section: "Schedule 3",
        title: "Dual-Use List",
        summary:
          "UK Dual-Use List — controls on dual-use items including spacecraft, satellite subsystems, ground station equipment, and space-related technology. Aligned with the Wassenaar Arrangement and (historically) the EU Dual-Use Regulation.",
        complianceImplication:
          "Space component exporters must screen all items against both the Military List and Dual-Use List. Extensively amended — latest amendment SI 2025/532.",
      },
    ],
    related_sources: ["UK-ECA-2002"],
    notes: [
      "Extensively amended — latest amendment SI 2025/532. Post-Brexit, the UK maintains its own control lists aligned with Wassenaar but independent from the EU Dual-Use Regulation.",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Data Protection (1) ────────────────────────────────────────────

const DATA_PROTECTION_UK: LegalSource[] = [
  {
    id: "UK-DPA-2018",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Protection Act 2018 and UK GDPR",
    date_enacted: "2018-05-23",
    official_reference: "2018 c.12",
    source_url: "https://www.legislation.gov.uk/ukpga/2018/12",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-ICO"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "UK GDPR plus DPA 2018 establish the data-protection regime that applies to satellite data processing, EO imagery resolving identifiable individuals, and satcom subscriber data. Independent of the SIA licence but obligatory for any operator handling personal data with a UK nexus.",
    key_provisions: [
      {
        section: "Parts 1-7",
        title: "Data protection framework",
        summary:
          "Comprehensive data protection legislation implementing the UK's retained version of GDPR. Applies to processing of personal data including satellite-derived geospatial data that can identify individuals. The ICO enforces compliance.",
        complianceImplication:
          "Earth observation operators processing imagery at sufficient resolution to identify individuals must comply with UK GDPR requirements including lawful basis, data minimization, and data protection impact assessments.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-13",
  },
];

// ─── Environmental and Safety (3) ──────────────────────────────────

const ENVIRONMENTAL_UK: LegalSource[] = [
  {
    id: "UK-SIA-S11-AEE",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Space Industry Act 2018, Section 11 — Assessment of Environmental Effects",
    source_url: "https://www.legislation.gov.uk/ukpga/2018/5/section/11",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: ["UK-CAA"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental"],
    scope_description:
      "Section 11 SIA 2018 imposes the Assessment of Environmental Effects requirement — every spaceport and launch-operator licence must include a published environmental assessment, parallel to the planning-system EIA. The statutory hook for spaceport-development environmental scrutiny.",
    key_provisions: [
      {
        section: "s.11",
        title: "AEE requirement for spaceport and launch licences",
        summary:
          "The regulator must not grant a spaceport licence or launch operator licence unless satisfied that an assessment of environmental effects has been carried out. The AEE must cover air quality, emissions, biodiversity, marine environment, noise, water quality, and soil contamination.",
        complianceImplication:
          "Mandatory for all spaceport and launch licence applications. The AEE requirement is in addition to any planning permission environmental impact assessment.",
      },
    ],
    related_sources: ["UK-SIA-2018", "UK-SI-2021-792"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-COMAH-2015",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Control of Major Accident Hazards Regulations 2015",
    official_reference: "SI 2015/483",
    source_url: "https://www.legislation.gov.uk/uksi/2015/483",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-HSE"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental"],
    scope_description:
      "Control of Major Accident Hazards Regulations apply at UK spaceports handling propellants and energetics above SEVESO-equivalent thresholds. HSE-led safety-case regime requiring quantitative risk assessment, emergency planning, and regulatory inspection.",
    key_provisions: [
      {
        section: "Full instrument",
        title: "Major accident hazard prevention for propellant storage",
        summary:
          "COMAH regulations apply to establishments storing dangerous substances above specified thresholds. Relevant for rocket propellant (LOX, RP-1, LH2, hydrazine) storage at spaceports and test facilities.",
        complianceImplication:
          "Spaceport operators storing rocket propellants above COMAH thresholds must prepare safety reports and implement major accident prevention policies.",
      },
    ],
    related_sources: ["UK-EXPLOSIVES-2014"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-EXPLOSIVES-2014",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Explosives Regulations 2014",
    official_reference: "SI 2014/1638",
    source_url: "https://www.legislation.gov.uk/uksi/2014/1638",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-HSE"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental"],
    scope_description:
      "Explosives Regulations govern handling, storage, and transport of solid propellants, pyrotechnic separation devices, and energetics at UK launch sites. Sits alongside COMAH for the launch-site safety stack — operators must hold an HSE explosives licence in addition to spaceport authorisation.",
    key_provisions: [
      {
        section: "Full instrument",
        title: "Solid rocket motor and pyrotechnic regulation",
        summary:
          "Regulates the manufacture, storage, and use of explosives. Applies to solid rocket motors, pyrotechnic initiators, and ordnance used in launch vehicle systems.",
        complianceImplication:
          "Launch providers using solid propulsion or pyrotechnic separation systems must hold appropriate explosives licences and comply with storage requirements.",
      },
    ],
    related_sources: ["UK-COMAH-2015"],
    last_verified: "2026-04-13",
  },

  {
    id: "UK-EIA-REGS-2017",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "The Town and Country Planning (Environmental Impact Assessment) Regulations 2017",
    date_enacted: "2017-04-12",
    date_in_force: "2017-05-16",
    official_reference: "SI 2017/571",
    source_url: "https://www.legislation.gov.uk/uksi/2017/571/contents/made",
    issuing_body:
      "Secretary of State (made under European Communities Act 1972 / now retained EU law)",
    competent_authorities: ["UK-DSIT", "UK-CAA"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental", "licensing"],
    scope_description:
      "Domestic implementation of the EU EIA Directive (2011/92/EU as amended by 2014/52/EU). Sets the screening, scoping, and reasoned-conclusion machinery for development projects in England — the standard EIA framework that intersects with spaceport planning consents (Cornwall, Sutherland, SaxaVord) alongside the Space Industry Act 2018 § 11 Assessment of Environmental Effects regime. Scotland, Wales, and Northern Ireland have parallel SIs implementing the same Directive.",
    key_provisions: [
      {
        section: "Reg. 5",
        title: "Screening",
        summary:
          "Local planning authority decides whether the development is EIA development, with reference to Schedule 1 (mandatory EIA) and Schedule 2 (case-by-case screening) project lists.",
      },
      {
        section: "Reg. 14-15",
        title: "Environmental statement and consultation",
        summary:
          "Developer must prepare an environmental statement; competent authority and statutory consultees must be consulted; public comments invited.",
      },
      {
        section: "Reg. 26",
        title: "Reasoned conclusion",
        summary:
          "The competent authority's reasoned conclusion on the significant effects must be incorporated in the planning decision.",
      },
    ],
    related_sources: ["UK-SIA-S11-AEE", "EU-EIA-DIR-2011-92"],
    last_verified: "2026-04-27",
  },

  {
    id: "UK-HABITATS-REGS-2017",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "The Conservation of Habitats and Species Regulations 2017",
    date_enacted: "2017-11-20",
    date_in_force: "2017-11-30",
    official_reference: "SI 2017/1012",
    source_url: "https://www.legislation.gov.uk/uksi/2017/1012/contents/made",
    issuing_body:
      "Secretary of State (made under European Communities Act 1972 / now retained EU law)",
    competent_authorities: ["UK-DSIT"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental", "licensing"],
    scope_description:
      "UK implementation of the EU Habitats Directive (92/43/EEC). Establishes the network of Special Areas of Conservation (SACs) in the UK and the assessment regime for plans or projects likely to have a significant effect on a European site. SaxaVord (Shetland) and Sutherland spaceports both fall within or adjacent to designated sites, making Habitats-Regs compliance an integral part of their licensing journey.",
    key_provisions: [
      {
        section: "Reg. 63",
        title: "Appropriate assessment",
        summary:
          "Plans or projects likely to have a significant effect on a European site shall be subject to appropriate assessment of implications for the site's conservation objectives — competent authority may agree only after ascertaining no adverse effect on site integrity.",
      },
    ],
    related_sources: ["UK-SIA-S11-AEE", "EU-HABITATS-DIR-92-43"],
    last_verified: "2026-04-27",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────────

const CYBERSECURITY_UK: LegalSource[] = [
  {
    id: "UK-NIS-REGS-2018",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Network and Information Systems Regulations 2018",
    date_in_force: "2018-05-10",
    official_reference: "SI 2018/506",
    source_url: "https://www.legislation.gov.uk/uksi/2018/506",
    issuing_body: "Secretary of State",
    competent_authorities: ["UK-NCSC"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["cybersecurity"],
    scope_description:
      "UK's pre-Brexit transposition of the original 2016 NIS Directive — covers operators of essential services and digital service providers. UK has NOT transposed the 2022 NIS2 directly; this 2018 regime remains the operative cybersecurity-law for designated UK space operators.",
    key_provisions: [
      {
        section: "Parts 1-4",
        title: "UK NIS framework",
        summary:
          "UK's own NIS framework (NOT EU NIS2 — the UK left the EU before NIS2 adoption). Imposes security duties and incident reporting obligations on operators of essential services and relevant digital service providers. Space operators providing essential services must comply.",
        complianceImplication:
          "The UK Cyber Security and Resilience Bill (progressing 2025-2026) is expected to significantly update this framework. Space operators should prepare for enhanced cybersecurity obligations.",
      },
    ],
    related_sources: ["UK-SI-2021-792"],
    notes: [
      "The UK's NIS framework is separate from the EU NIS2 Directive. Post-Brexit, the UK is developing its own Cyber Security and Resilience Bill (progressing through Parliament 2025-2026) which will update this framework.",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Insurance and Liability Architecture (1) ──────────────────────

const LIABILITY_UK: LegalSource[] = [
  {
    id: "UK-LIABILITY-ARCHITECTURE",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en: "UK Space Liability Architecture — 4-Tier Framework",
    source_url: "https://www.caa.co.uk/space",
    date_published: "2021-07-29",
    issuing_body: "CAA / DSIT",
    competent_authorities: ["UK-CAA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    scope_description:
      "Reference document mapping the 4-tier liability architecture across UK space law: (1) Treaty-level Liability Convention obligations, (2) Statutory liability caps under SIA-INDEMNITIES-2025 and Deregulation Act 2015, (3) Insurance requirements set by CAA in licence conditions, (4) Operator contractual indemnities to launch customers.",
    key_provisions: [
      {
        section: "Tier 1",
        title: "Operator insurance",
        summary:
          "Operators must maintain third-party liability insurance. Standard amounts: EUR 60M for orbital activities (OSA), Maximum Insurable Risk (MIR) for launches (SIA).",
      },
      {
        section: "Tier 2",
        title: "Operator liability capped",
        summary:
          "Operator liability is capped at a specified amount per licence. Published caps: OSA EUR 60M, Virgin Orbit $250M, RFA GBP 10.5M, Skyrora GBP 10.5M. The SIA Indemnities Act 2025 made caps mandatory for all licences.",
        complianceImplication:
          "The mandatory cap regime (post-Indemnities Act 2025) provides regulatory certainty. Operators know their maximum exposure in advance.",
      },
      {
        section: "Tier 3",
        title: "Discretionary government indemnity",
        summary:
          "The government may, at its discretion, provide indemnity for liabilities exceeding the operator's capped amount. Not guaranteed — assessed on a case-by-case basis.",
      },
      {
        section: "Tier 4",
        title: "Mandatory government backstop (uncapped)",
        summary:
          "The UK government provides an uncapped backstop to meet the UK's international obligations under the Liability Convention. This ensures that victims of space object damage are compensated regardless of operator insurance limits.",
        complianceImplication:
          "The UK's 4-tier architecture is unique among spacefaring nations. The uncapped government backstop reflects the UK's Liability Convention obligations.",
      },
    ],
    related_sources: [
      "UK-SIA-2018",
      "UK-OSA-1986",
      "UK-SIA-INDEMNITIES-2025",
      "UK-DEREGULATION-2015-S12",
      "UK-INT-LIABILITY-1972",
    ],
    notes: [
      "UK's unique 4-tier liability structure: (1) Operator insurance, (2) Operator liability capped, (3) Discretionary government indemnity, (4) Mandatory government backstop (uncapped).",
      "Published indemnity caps: OSA EUR 60M, Virgin Orbit $250M, RFA GBP 10.5M, Skyrora GBP 10.5M.",
    ],
    last_verified: "2026-04-13",
  },

  {
    id: "UK-INSURANCE-ACT-2015",
    jurisdiction: "UK",
    type: "federal_law",
    status: "in_force",
    title_en: "Insurance Act 2015",
    title_local: "Insurance Act 2015",
    date_enacted: "2015-02-12",
    date_in_force: "2016-08-12",
    official_reference: "2015 c. 4",
    source_url: "https://www.legislation.gov.uk/ukpga/2015/4/contents",
    issuing_body: "Parliament of the United Kingdom",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["insurance", "liability"],
    scope_description:
      "Modernises English insurance contract law and is the substantive backdrop for almost every Lloyd's-placed space policy — launch, in-orbit, third-party-liability, and political-risk covers commonly written in the London market for global operators. Replaces the strict Marine Insurance Act 1906 disclosure standard with a 'duty of fair presentation' (§ 3) and reforms the consequences of breach, warranties, and fraudulent claims.",
    key_provisions: [
      {
        section: "§ 3",
        title: "Duty of fair presentation",
        summary:
          "Replaces the pre-2015 utmost-good-faith standard with a duty of fair presentation that requires disclosure of material circumstances either explicitly or in a reasonably-clear-to-search manner. Critical at placement of every space risk.",
      },
      {
        section: "§§ 8-11",
        title: "Remedies for breach",
        summary:
          "Proportionate remedies depending on whether the breach was deliberate/reckless, careless, or innocent — replaces the harsh avoid-ab-initio remedy of the 1906 Act.",
      },
      {
        section: "§§ 9-11",
        title: "Warranties and basis-of-contract clauses",
        summary:
          "Basis-of-contract clauses are abolished. Breach of a warranty suspends rather than terminates cover, and is automatically remedied once the breach is rectified — important for ongoing operational warranties (e.g., bond conditions, debris-mitigation undertakings) in long-tail space policies.",
      },
      {
        section: "§ 12",
        title: "Fraudulent claims",
        summary:
          "An insurer may treat the contract as terminated from the time of a fraudulent act. Critical for operators making post-incident claims with imperfect documentation.",
      },
    ],
    related_sources: [
      "UK-LIABILITY-ARCHITECTURE",
      "UK-SIA-INDEMNITIES-2025",
      "INT-SPACE-INSURANCE-MARKET",
    ],
    last_verified: "2026-04-22",
  },
];

// ─── CAA Guidance Documents (3) ─────────────────────────────────────

const CAA_GUIDANCE_UK: LegalSource[] = [
  {
    id: "UK-CAP-2209",
    jurisdiction: "UK",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "CAP 2209: Applying for a Licence under the Space Industry Act 2018",
    date_published: "2021-07-29",
    date_last_amended: "2024-05-01",
    source_url: "https://www.caa.co.uk/space",
    issuing_body: "Civil Aviation Authority",
    competent_authorities: ["UK-CAA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "CAA's primary applicant guidance for SIA 2018 licences. Walks operators through dossier requirements, evidence standards, and CAA expectations for safety case, financial standing, and operational competence. Should be the first document any UK applicant reads.",
    key_provisions: [
      {
        section: "Full document",
        title: "Principal licensing guidance",
        summary:
          "The CAA's main guidance document for applicants seeking space licences. Covers all five licence types, application procedures, assessment criteria, safety case requirements, insurance, and environmental effects assessments. Updated May 2024.",
        complianceImplication:
          "Essential reading for any entity seeking a UK space licence. Sets out CAA expectations for application completeness and technical standards.",
      },
    ],
    related_sources: ["UK-SIA-2018", "UK-SI-2021-792", "UK-CAP-2221"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-CAP-2221",
    jurisdiction: "UK",
    type: "technical_standard",
    status: "in_force",
    title_en: "CAP 2221: Regulator's Licensing Rules",
    date_published: "2021-07-29",
    source_url: "https://www.caa.co.uk/space",
    issuing_body: "Civil Aviation Authority",
    competent_authorities: ["UK-CAA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "CAA's licensing-decision rulebook — how the regulator weighs licence applications, what conditions it typically imposes, and the procedural framework for grant/refusal/conditioning. Companion to CAP-2209 from the regulator's side of the desk.",
    key_provisions: [
      {
        section: "Full document",
        title: "Core regulatory document for space licensing",
        summary:
          "The CAA's licensing rules — the core regulatory document specifying detailed requirements, assessment criteria, and conditions for each licence type. Complements the SIA 2018 and SI 2021/792.",
        complianceImplication:
          "Mandatory compliance. All licence applicants and holders must follow these rules. Defines the standard that the CAA will assess applications against.",
      },
    ],
    related_sources: ["UK-SIA-2018", "UK-SI-2021-792", "UK-CAP-2209"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-CAP-GUIDANCE-SET",
    jurisdiction: "UK",
    type: "technical_standard",
    status: "in_force",
    title_en: "CAA Space Guidance Collection (CAP 2210-2219, CAP 2987)",
    date_published: "2021-07-29",
    date_last_amended: "2025-01-01",
    source_url: "https://www.caa.co.uk/space",
    issuing_body: "Civil Aviation Authority",
    competent_authorities: ["UK-CAA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "cybersecurity",
      "environmental",
      "debris_mitigation",
    ],
    scope_description:
      "The full collection of CAA space-guidance circulars (CAP 2210-2219, CAP 2987 and successors) covering specific topics — orbital debris, space-segment safety, ground-segment standards, environmental assessment. The detailed how-to library that supplements CAP-2209/2221.",
    key_provisions: [
      {
        section: "CAP 2210-2219",
        title: "Topic-specific licensing guidance",
        summary:
          "Collection of 14+ CAP documents covering specific licensing topics including safety cases, orbital analysis, debris mitigation, insurance, cybersecurity, range safety, and environmental effects. CAP 2987 covers enforcement policy.",
        complianceImplication:
          "Operators should review all relevant CAP documents for their licence type. The guidance documents represent the CAA's interpretation of legislative requirements.",
      },
    ],
    related_sources: ["UK-CAP-2209", "UK-CAP-2221", "UK-SIA-2018"],
    last_verified: "2026-04-13",
  },
];

// ─── Policy Documents (4) ──────────────────────────────────────────

const POLICY_UK: LegalSource[] = [
  {
    id: "UK-NSS-2021",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en: "National Space Strategy",
    date_published: "2021-09-01",
    source_url:
      "https://www.gov.uk/government/publications/national-space-strategy",
    issuing_body: "HM Government",
    competent_authorities: ["UK-DSIT", "UK-UKSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "debris_mitigation",
      "space_traffic_management",
    ],
    scope_description:
      "UK National Space Strategy articulating the policy ambition for the UK space sector — sovereign capability, growth, security, sustainability. Non-binding policy but the basis for subsequent regulatory and budgetary decisions including the 2024 Space Regulatory Review.",
    key_provisions: [
      {
        section: "4 pillars",
        title: "National Space Strategy framework",
        summary:
          "Four strategic pillars: (1) Unlocking growth in the space sector, (2) Collaborating internationally, (3) Growing the UK as a science and technology superpower, (4) Developing resilient space capabilities. 69 commitments across government.",
        complianceImplication:
          "Signals policy direction for regulatory evolution. Operators should anticipate regulatory changes aligned with the Strategy's objectives.",
      },
    ],
    related_sources: ["UK-DSS-2022", "UK-SIP-2024"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-DSS-2022",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en: "Defence Space Strategy",
    date_published: "2022-02-01",
    source_url:
      "https://www.gov.uk/government/publications/defence-space-strategy-operationalising-the-space-domain",
    issuing_body: "Ministry of Defence",
    competent_authorities: ["UK-MOD", "UK-SPACECOMMAND"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "space_traffic_management"],
    scope_description:
      "UK Defence Space Strategy setting MOD priorities for protecting UK interests in space, building defensive and resilient capability, and integrating Space Command operations. Drives the defence-export and dual-use posture that touches commercial operators with MOD customers.",
    key_provisions: [
      {
        section: "Full document",
        title: "Defence space investment and capability plan",
        summary:
          "GBP 1.4B additional investment in defence space capabilities. Establishes the UK's approach to space as an operational domain. Covers space domain awareness, Skynet 6, partnerships, and workforce development.",
      },
    ],
    related_sources: ["UK-NSS-2021"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SIP-2024",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en: "Space Industrial Plan",
    date_published: "2024-03-01",
    source_url:
      "https://www.gov.uk/government/publications/uk-space-industrial-plan",
    issuing_body: "DSIT / UK Space Agency",
    competent_authorities: ["UK-DSIT", "UK-UKSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Space Industrial Plan committing public investment to UK launch capability, satellite manufacturing, and ground-segment infrastructure. Coordinates funding flows from UKSA, BEIS, and DSIT into a single industrial roadmap aligned with the National Space Strategy.",
    key_provisions: [
      {
        section: "Full document",
        title: "Five priority capability goals 2024-2033",
        summary:
          "Sets out the UK's space industrial priorities for 2024-2033. Five capability goals covering sovereign launch, satellite manufacturing, in-orbit services, Earth observation, and position/navigation/timing.",
        complianceImplication:
          "Signals areas of UK government investment and regulatory support. Operators in priority capability areas may benefit from accelerated licensing and funding.",
      },
    ],
    related_sources: ["UK-NSS-2021", "UK-SRR-2024"],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-SRR-2024",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en: "Space Regulatory Review 2024",
    date_published: "2024-06-01",
    source_url:
      "https://www.gov.uk/government/consultations/space-regulatory-review",
    issuing_body: "DSIT / CAA",
    competent_authorities: ["UK-DSIT", "UK-CAA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability", "insurance"],
    scope_description:
      "Government's 2024 review of the UK space-regulatory regime — critique of duplication, licensing timelines, and proportionality. Foreshadows reforms to SIA 2018 procedures and the CAP guidance set; current applicants should expect procedural updates over 2025-2026.",
    key_provisions: [
      {
        section: "17 recommendations",
        title: "Regulatory reform recommendations",
        summary:
          "17 recommendations for modernizing the UK space regulatory framework. Covers licensing efficiency, liability caps, orbital sustainability, in-orbit services regulation, and alignment with international best practices.",
        complianceImplication:
          "The SIA Indemnities Act 2025 implemented one of the key recommendations (mandatory liability caps). Further reforms expected in 2026-2027.",
      },
    ],
    related_sources: ["UK-SIA-INDEMNITIES-2025", "UK-SIA-2018", "UK-SIP-2024"],
    last_verified: "2026-04-13",
  },
];

// ─── Post-Brexit Specific (2) ──────────────────────────────────────

const POSTBREXIT_UK: LegalSource[] = [
  {
    id: "UK-TCA-2020",
    jurisdiction: "UK",
    type: "international_treaty",
    status: "in_force",
    title_en: "EU-UK Trade and Cooperation Agreement — Space Provisions",
    date_enacted: "2020-12-30",
    date_in_force: "2021-05-01",
    source_url:
      "https://www.gov.uk/government/publications/ukeu-trade-and-cooperation-agreement-ts-no82021",
    issuing_body: "European Union / United Kingdom",
    competent_authorities: ["UK-UKSA", "UK-DSIT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "space_traffic_management"],
    scope_description:
      "EU-UK Trade and Cooperation Agreement provisions affecting space — UK exclusion from Galileo PRS, conditional access to Copernicus, and the regulatory-divergence reality that UK and EU now treat each other as third countries for export-control and data-protection purposes.",
    key_provisions: [
      {
        section: "Protocol I",
        title: "Copernicus association",
        summary:
          "Provides for UK association to the EU Copernicus Earth observation programme. UK entities may access Copernicus data and participate in programme activities under negotiated terms.",
        complianceImplication:
          "UK Copernicus association was activated from 1 January 2024. Enables UK-based EO operators to access Sentinel data and contribute to Copernicus services.",
      },
      {
        section: "Space provisions",
        title: "Galileo and SST arrangements",
        summary:
          "No UK access to Galileo Public Regulated Service (PRS) — the most significant post-Brexit space loss. SST data access via Protocol II for space surveillance and tracking cooperation.",
        complianceImplication:
          "UK operators cannot rely on Galileo PRS for secure positioning. Must use alternative PNT sources. SST cooperation maintained for conjunction assessment.",
      },
    ],
    related_sources: ["UK-COPERNICUS-2024"],
    notes: [
      "The TCA governs the post-Brexit UK-EU relationship in space. Key outcome: Copernicus association achieved, Galileo PRS access lost.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "UK-COPERNICUS-2024",
    jurisdiction: "UK",
    type: "international_treaty",
    status: "in_force",
    title_en: "UK Copernicus Association Agreement",
    date_in_force: "2024-01-01",
    source_url:
      "https://www.gov.uk/government/news/uk-officially-associates-to-copernicus",
    issuing_body: "European Union / United Kingdom",
    competent_authorities: ["UK-UKSA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "2024 association agreement re-establishing UK access to the Copernicus Earth-observation programme on associate-state terms. Restores some EU-programme participation lost via Brexit; relevant for UK EO-data users and downstream service providers.",
    key_provisions: [
      {
        section: "Full agreement",
        title: "UK Copernicus association from 1 January 2024",
        summary:
          "UK officially associates to the EU Copernicus programme from 1 January 2024. Approximate contribution of EUR 750M. UK entities gain full access to Copernicus data and services, and may participate as suppliers in Copernicus procurements.",
        complianceImplication:
          "UK EO operators and data providers benefit from Copernicus association. Opens procurement opportunities for UK space industry in the Copernicus programme.",
      },
    ],
    related_sources: ["UK-TCA-2020"],
    notes: [
      "UK Copernicus association activated 1 January 2024. Approximate UK contribution: EUR 750M.",
      "Copernicus association is separate from ESA membership — the UK remains a full ESA member (not affected by Brexit as ESA is not an EU agency).",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Spaceports (1) ────────────────────────────────────────────────

const SPACEPORTS_UK: LegalSource[] = [
  {
    id: "UK-SPACEPORTS",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en: "UK Licensed Spaceports — Reference Document",
    date_published: "2023-12-01",
    date_last_amended: "2026-03-01",
    source_url: "https://www.caa.co.uk/space",
    issuing_body: "Civil Aviation Authority",
    competent_authorities: ["UK-CAA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Reference catalogue of currently licensed UK spaceports (SaxaVord, Sutherland, Spaceport Cornwall and others), their licence status, capability profile, and operational restrictions. Operational reference rather than law — useful for matching mission profiles to authorised infrastructure.",
    key_provisions: [
      {
        section: "Licensed sites",
        title: "UK spaceport status overview",
        summary:
          "SaxaVord Spaceport (Unst, Shetland): vertical launch, licensed December 2023, first orbital launch expected 2026. Spaceport Cornwall (Newquay): horizontal launch, licensed November 2022, Virgin Orbit failure January 2023. In development: Space Hub Sutherland (Orbex — entered administration February 2026), Spaceport 1 North Uist.",
        complianceImplication:
          "Launch providers must operate from a licensed spaceport. As of April 2026, SaxaVord and Spaceport Cornwall hold active licences.",
      },
    ],
    related_sources: ["UK-SIA-2018", "UK-SI-2021-792"],
    notes: [
      "SaxaVord (Unst, Shetland): vertical launch, licensed December 2023. First orbital launch from UK soil expected 2026.",
      "Spaceport Cornwall (Newquay): horizontal launch, licensed November 2022. Virgin Orbit 'Start Me Up' mission failed 9 January 2023.",
      "Space Hub Sutherland: Orbex entered administration February 2026 — status uncertain.",
    ],
    last_verified: "2026-04-13",
  },

  {
    id: "UK-DEVOLVED-SCOTLAND",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Scottish Devolved Space Framework — Scotland's Space Strategy and Spaceport Hosting",
    date_published: "2024-09-01",
    source_url: "https://www.gov.scot/publications/scotland-space-strategy/",
    issuing_body: "Scottish Government",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["licensing", "environmental"],
    scope_description:
      "Reference for Scotland's devolved policy and infrastructure context. Space-licensing competence remains reserved to Westminster (CAA under SIA 2018), but planning consents, environmental review, and economic-development incentives sit with the Scottish Government and devolved agencies (Scottish Enterprise, Highlands and Islands Enterprise). SaxaVord (Unst, Shetland), Space Hub Sutherland, and Glasgow's small-satellite cluster (Spire, AAC Clyde Space, Alba Orbital, Skyrora) operate within this devolved economic-development frame.",
    key_provisions: [
      {
        section: "Scotland Space Strategy 2024",
        title: "Scottish space-economy targets",
        summary:
          "Glasgow is the largest small-satellite manufacturing centre in Europe; Scottish Government targets £4bn industrial value by 2030, with Highlands and Islands Enterprise investment in spaceport infrastructure (Sutherland, SaxaVord).",
      },
      {
        section: "Devolved competence boundary",
        title: "Westminster vs. Holyrood",
        summary:
          "Space licensing under SIA 2018 is reserved (CAA-administered). Planning, environmental impact assessment under Scotland's Town and Country Planning regime, and Crown Estate Scotland marine licensing are devolved — operators face parallel UK + Scottish review tracks for any Scottish spaceport development.",
      },
    ],
    related_sources: ["UK-SPACEPORTS", "UK-SI-2021-792"],
    last_verified: "2026-04-22",
  },
];

// ─── Sustainability + Orbital-Liability Instruments (2) ───────────
// Graphic reference: ClearSpace "Recent developments in the
// regulatory framework", October 2023 — UK Space Sustainability
// Standard (enacted) + UK Consultation on Orbital Liabilities,
// Insurance, Charging and Space Sustainability (in development).

const SUSTAINABILITY_UK: LegalSource[] = [
  {
    id: "UK-SPACE-SUSTAINABILITY-STD-2024",
    jurisdiction: "UK",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "UK Space Sustainability Standard — voluntary sustainability-rating scheme for satellite operators",
    date_enacted: "2024-07-01",
    date_in_force: "2024-07-01",
    source_url:
      "https://www.gov.uk/government/publications/plan-for-space-sustainability",
    issuing_body:
      "UK Space Agency (UKSA) together with the Civil Aviation Authority (CAA) and the Earth & Space Sustainability Initiative (ESSI)",
    competent_authorities: ["UK-UKSA", "UK-CAA"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "in_orbit_services",
    ],
    compliance_areas: [
      "debris_mitigation",
      "environmental",
      "space_traffic_management",
    ],
    scope_description:
      "UK-led voluntary sustainability rating scheme launched as part of the 2022 Plan for Space Sustainability. Assesses operators across collision avoidance, debris mitigation, active debris removal readiness, data sharing, and end-of-life disposal planning. CAA uses the scheme as a soft factor in licensing assessments under the Outer Space Act 1986 and Space Industry Act 2018.",
    key_provisions: [
      {
        section: "Pillar 1",
        title: "Collision avoidance and data sharing",
        summary:
          "Operators demonstrate participation in conjunction-screening services and publish collision-avoidance manoeuvre statistics.",
      },
      {
        section: "Pillar 3",
        title: "Post-mission disposal plan",
        summary:
          "Rated operators document their PMD strategy with probabilistic success analysis — aligned toward the <5-year LEO benchmark.",
      },
      {
        section: "Pillar 5",
        title: "Active debris removal contribution",
        summary:
          "Rated operators contribute financially or technically to active debris removal missions for legacy debris.",
      },
    ],
    related_sources: [
      "UK-SIA-2018",
      "INT-ESA-ZERO-DEBRIS-CHARTER",
      "INT-ESSI-MEMORANDUM",
      "INT-LTS-2019",
    ],
    notes: [
      "Voluntary — but a high rating is increasingly referenced in CAA licensing decisions and by UK Space Agency grant funding criteria.",
      "Development co-led by industry partners (ESSI) to align with insurance underwriting and investor ESG disclosure.",
    ],
    last_verified: "2026-04-21",
  },

  {
    id: "UK-ORBITAL-LIABILITY-CONSULT-2023",
    jurisdiction: "UK",
    type: "draft_legislation",
    status: "proposed",
    title_en:
      "UK Consultation on Orbital Liabilities, Insurance, Charging and Space Sustainability",
    date_enacted: "2023-04-01",
    date_published: "2023-04-01",
    official_reference:
      "Department for Science, Innovation and Technology (DSIT) consultation paper; closed 21 June 2023",
    source_url:
      "https://www.gov.uk/government/consultations/orbital-liabilities-insurance-charging-and-space-sustainability",
    issuing_body:
      "Department for Science, Innovation and Technology (DSIT) / UK Space Agency",
    competent_authorities: ["UK-UKSA", "UK-CAA", "UK-DSIT"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
    ],
    compliance_areas: [
      "liability",
      "insurance",
      "debris_mitigation",
      "licensing",
    ],
    scope_description:
      "UK government consultation on reforms to the Outer Space Act 1986 and Space Industry Act 2018 liability regimes. Four reform pillars: (1) variable liability caps tied to mission risk, (2) modulated insurance requirements by orbit class and mission profile, (3) licensing charges reflective of debris-generation potential, (4) binding sustainability licensing criteria replacing today's guidance-only CAA recommendations. Response published 2024; follow-on legislative proposal expected 2026.",
    key_provisions: [
      {
        section: "Pillar 1",
        title: "Variable liability caps",
        summary:
          "Replacing the current flat £60M third-party liability cap with variable caps calibrated to mission risk profile (orbit altitude, constellation size, IOS vs. passive).",
      },
      {
        section: "Pillar 2",
        title: "Risk-based insurance requirements",
        summary:
          "Insurance requirements graduated by collision probability, PMD reliability, and active-debris-removal commitment.",
      },
      {
        section: "Pillar 4",
        title: "Binding sustainability licensing criteria",
        summary:
          "Operational sustainability metrics (manoeuvre data sharing, PMD timeline, ADR readiness) move from CAA guidance to binding licence conditions.",
      },
    ],
    related_sources: [
      "UK-SIA-2018",
      "UK-SPACE-SUSTAINABILITY-STD-2024",
      "INT-COPUOS-DEBRIS-2007",
      "INT-LTS-2019",
    ],
    notes: [
      "Consultation closed 21 June 2023. Government response published 2024.",
      "Follow-on primary legislation expected 2026–2027 to amend the Outer Space Act 1986 and Space Industry Act 2018.",
    ],
    last_verified: "2026-04-21",
  },

  // ─── Additional UK debris/STM stack — 2026 audit additions ──────────

  {
    id: "UK-CAA-CAP2589",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en:
      "CAP 2589 — UK Civil Aviation Authority Space Debris Mitigation and Sustainability Policy",
    date_published: "2024-11-15",
    official_reference: "CAP 2589",
    source_url:
      "https://publicapps.caa.co.uk/modalapplication.aspx?catid=1&pagetype=65&appid=11&mode=detail&id=12089",
    issuing_body: "UK Civil Aviation Authority (CAA)",
    competent_authorities: ["UK-CAA"],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "CAA's binding debris-mitigation policy under the Space Industry Act 2018 framework. Sets the technical baseline (ISO 24113:2023) for licensing and applies a 'two-tier' approach: standard licensing for missions complying with ISO 24113, enhanced scrutiny for missions deviating. The first revision of CAP 2589 in November 2024 introduced a 5-year LEO post-mission disposal preference, aligning UK with FCC and IADC 2025.",
    key_provisions: [
      {
        section: "§4.2",
        title: "ISO 24113 baseline",
        summary:
          "All licence applicants must demonstrate compliance with ISO 24113:2023 in the technical submission.",
      },
      {
        section: "§4.3",
        title: "PMD preference — 5 years",
        summary:
          "From 2025 onwards, post-mission-disposal manoeuvre target shifts from 25 years to 5 years for new LEO missions; 25-year fallback only with documented justification.",
      },
      {
        section: "§5",
        title: "Manoeuvre data-sharing",
        summary:
          "Operators must share operational manoeuvre plans with NSpOC at least 24 hours before execution, except in collision-avoidance manoeuvres where post-event reporting is acceptable.",
      },
      {
        section: "§6",
        title: "Active debris removal readiness",
        summary:
          "Spacecraft launched after 1 Jan 2027 should be designed to facilitate active debris removal (capture interfaces, beacon-grade tracking aids).",
      },
    ],
    related_sources: [
      "UK-SIA-2018",
      "INT-ISO-24113-2023",
      "INT-IADC-MITIGATION-2025",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "UK-NSPOC-CDM-PROTOCOL",
    jurisdiction: "UK",
    type: "policy_document",
    status: "in_force",
    title_en: "NSpOC Conjunction Data Message Protocol",
    date_published: "2023-04-01",
    official_reference: "NSpOC-PROTO-CDM-2023",
    source_url:
      "https://www.gov.uk/government/organisations/national-space-operations-centre",
    issuing_body: "National Space Operations Centre (NSpOC)",
    competent_authorities: ["UK-NSPOC", "UK-SPACECOMMAND"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "Operating protocol for UK NSpOC conjunction-warning service. Operators of UK-licensed satellites are auto-enrolled in the NSpOC CDM feed; the protocol sets timeliness, format (CCSDS CDM 508.0-B-1), and operator-response expectations. Failure to acknowledge a high-Pc CDM within 12 hours can trigger licence-condition review.",
    key_provisions: [
      {
        section: "§3",
        title: "CDM format",
        summary:
          "All conjunction warnings issued in CCSDS 508.0-B-1 format; supplementary briefing for high-criticality events.",
      },
      {
        section: "§5",
        title: "Operator-response timeline",
        summary:
          "Operator shall acknowledge any CDM with Pc ≥ 1e-4 within 12 hours and notify NSpOC of any planned avoidance manoeuvre at the moment of execution.",
      },
    ],
    related_sources: ["INT-CCSDS-CDM-508", "UK-CAA-CAP2589"],
    last_verified: "2026-04-27",
  },

  {
    id: "UK-SIR-2021",
    jurisdiction: "UK",
    type: "federal_regulation",
    status: "in_force",
    title_en: "The Space Industry Regulations 2021",
    date_enacted: "2021-07-01",
    date_in_force: "2021-07-29",
    official_reference: "SI 2021/792",
    source_url: "https://www.legislation.gov.uk/uksi/2021/792/contents/made",
    issuing_body: "Secretary of State for Transport (made under SIA 2018)",
    competent_authorities: ["UK-CAA"],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["licensing", "debris_mitigation", "liability"],
    scope_description:
      "Statutory Instrument that operationalises the Space Industry Act 2018 — sets the detailed licence-application requirements, technical-information schedules, and operating-licence conditions enforced by the CAA. The regulations include explicit debris-mitigation and end-of-mission requirements (Schedule 1 Part 3) referencing ISO 24113 as the technical baseline. Companion regulations on Appeals (SI 2021/793) and Enforcement (SI 2021/795) round out the secondary-legislation package under SIA 2018.",
    key_provisions: [
      {
        section: "Sched. 1 Part 3",
        title: "Mission-management plan",
        summary:
          "Application must include a mission-management plan covering operations, conjunction-assessment procedures, end-of-life disposal, and passivation — assessed against ISO 24113.",
      },
      {
        section: "Sched. 1 Part 7",
        title: "Insurance and indemnity",
        summary:
          "Application must demonstrate third-party liability insurance to the level set by the CAA, typically the EUR 60M baseline plus mission-specific add-ons.",
      },
    ],
    related_sources: ["UK-SIA-2018", "UK-CAA-CAP2589", "INT-ISO-24113-2023"],
    last_verified: "2026-04-27",
  },
];

// ─── Aggregated Export ──────────────────────────────────────────────

export const LEGAL_SOURCES_UK: LegalSource[] = [
  ...TREATIES_UK,
  ...PRIMARY_LEGISLATION_UK,
  ...SECONDARY_LEGISLATION_UK,
  ...TELECOM_UK,
  ...EXPORT_CONTROL_UK,
  ...DATA_PROTECTION_UK,
  ...ENVIRONMENTAL_UK,
  ...CYBERSECURITY_UK,
  ...LIABILITY_UK,
  ...CAA_GUIDANCE_UK,
  ...POLICY_UK,
  ...POSTBREXIT_UK,
  ...SPACEPORTS_UK,
  ...SUSTAINABILITY_UK,
];
