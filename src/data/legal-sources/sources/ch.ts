// src/data/legal-sources/sources/ch.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Switzerland space law sources — complete legal framework for jurisdiction CH.
 *
 * Sources: fedlex.data.admin.ch, swiss-space-law.admin.ch, sbfi.admin.ch
 * Last verified: 2026-04-14
 *
 * Notable: ESA founding member with NO national space act in force.
 * Raumfahrtgesetz before Parliament (dispatch 25 Feb 2026, EIF ~2028).
 * Monist system — ratified treaties directly applicable. Geneva hosts ITU,
 * WMO, CD/PAROS, UNIDIR. Beyond Gravity = Europe's largest independent
 * space supplier. ClearSpace = ESA debris removal pioneer. 4/5 UN treaties.
 * Draft act: direct operator liability (not state-then-recourse).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── CH Authorities (10) ──────────────────────────────────────────

export const AUTHORITIES_CH: Authority[] = [
  {
    id: "CH-SSO",
    jurisdiction: "CH",
    name_en: "Swiss Space Office (SSO) within SERI",
    name_local:
      "Staatssekretariat für Bildung, Forschung und Innovation — Abteilung Weltraum",
    abbreviation: "SSO/SBFI",
    website: "https://www.sbfi.admin.ch",
    space_mandate:
      "Confederation's centre of competence for space. Head: Dr. Renato Krpoun (also Chair of ESA Council at delegate level until June 2026). Develops/implements space policy, leads Swiss ESA delegation, coordinates federal space activities, chairs IKAR, manages NASO funding, prepares the Raumfahrtgesetz. Location: Einsteinstrasse 2, 3003 Bern.",
    legal_basis: "SR 420.1 (FIFG); SR 420.125 (NARV)",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "CH-OFCOM",
    jurisdiction: "CH",
    name_en: "Federal Office of Communications",
    name_local: "Bundesamt für Kommunikation",
    abbreviation: "OFCOM/BAKOM",
    website: "https://www.bakom.admin.ch",
    space_mandate:
      "Manages radio frequency spectrum up to 3,000 GHz including satellite bands. Issues satellite earth station licences. Manages National Frequency Allocation Plan (NFAP 2026). Represents Switzerland at ITU (all three sectors) and CEPT/ECC. Coordinates satellite frequencies with neighbouring countries. Location: Biel/Bienne.",
    legal_basis: "SR 784.10 (FMG)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "CH-SECO",
    jurisdiction: "CH",
    name_en: "State Secretariat for Economic Affairs — Export Controls",
    name_local: "Staatssekretariat für Wirtschaft — Exportkontrollen",
    abbreviation: "SECO",
    website: "https://www.seco.admin.ch",
    space_mandate:
      "Swiss export licensing authority for dual-use goods, specific military goods, and strategic goods (including space technology). Implements Wassenaar, MTCR, NSG, and Australia Group. ESIG division processes ~1,744 dual-use permits/year (~CHF 3B). Uses ELIC electronic licensing system.",
    legal_basis: "SR 946.202 (GKG); SR 946.202.1 (GKV)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "CH-DDPS",
    jurisdiction: "CH",
    name_en: "Federal Department of Defence — Space Competence Centre",
    name_local:
      "Eidgenössisches Departement für Verteidigung — Kompetenzzentrum Weltraum",
    abbreviation: "VBS/KZW",
    website: "https://www.vbs.admin.ch",
    space_mandate:
      "Space Competence Centre created 1 January 2026 within Air Force/Joint Operations Command. Covers SSA, Earth observation (IMINT/SIGINT), satellite comms, GNSS, countermeasures. Plans 10-15 military satellites; first test satellite launched January 2025 (SpaceX Falcon 9). Concrete EO/telecom acquisitions from 2027-2028.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "CH-FDFA",
    jurisdiction: "CH",
    name_en: "Federal Department of Foreign Affairs",
    name_local: "Eidgenössisches Departement für auswärtige Angelegenheiten",
    abbreviation: "EDA",
    website: "https://www.eda.admin.ch",
    space_mandate:
      "Leads Switzerland's COPUOS engagement through Dr. Natália Archinard (head of delegation since 2007, chaired STS 2020-2021). Active in UN space security negotiations and OEWG on space threats. Reviews export controls for international law compliance. Participates in ESA and HSPG delegations. Signed Artemis Accords (April 2024, 37th signatory).",
    applicable_areas: ["licensing"],
  },
  {
    id: "CH-CFAS",
    jurisdiction: "CH",
    name_en: "Federal Commission for Space Affairs",
    name_local: "Eidgenössische Kommission für Weltraumfragen",
    abbreviation: "CFAS/EKWF",
    website: "https://www.sbfi.admin.ch",
    space_mandate:
      "Extraparliamentary commission advising the Federal Council on space policy.",
    applicable_areas: ["licensing"],
  },
  {
    id: "CH-IKAR",
    jurisdiction: "CH",
    name_en: "Interdepartmental Coordination Committee for Space Affairs",
    name_local:
      "Interdepartementaler Koordinationsausschuss für Raumfahrtfragen",
    abbreviation: "IKAR",
    website: "https://www.sbfi.admin.ch",
    space_mandate:
      "Chaired by SSO. Coordinates between EAER/SERI, FDFA, DDPS, DETEC/OFCOM and other federal offices. Prepares official Swiss positions on space issues.",
    applicable_areas: ["licensing"],
  },
  {
    id: "CH-EDOEB",
    jurisdiction: "CH",
    name_en: "Federal Data Protection and Information Commissioner",
    name_local: "Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter",
    abbreviation: "EDÖB",
    website: "https://www.edoeb.admin.ch",
    space_mandate:
      "Data protection supervision under nDSG (SR 235.1, in force 1 September 2023). Applies to space companies processing personal data including satellite imagery and EO data.",
    legal_basis: "SR 235.1 (DSG)",
    applicable_areas: ["data_security"],
  },
  {
    id: "CH-ESPACE",
    jurisdiction: "CH",
    name_en: "EPFL Space Center (eSpace) and Space Innovation",
    name_local: "EPFL Space Center",
    abbreviation: "eSpace",
    website: "https://www.epfl.ch/research/domains/espace",
    space_mandate:
      "National academic hub for space technology at EPFL, Lausanne. Two pillars: eSpace (research, teaching) and Space Innovation (industry support, test facilities). Key spinoffs: ClearSpace, Astrocast, SWISSto12. Executive Director: Emmanuelle David.",
    applicable_areas: ["licensing"],
  },
  {
    id: "CH-SSIG",
    jurisdiction: "CH",
    name_en: "Swiss Space Industries Group",
    name_local: "Swiss Space Industries Group",
    abbreviation: "SSIG",
    website: "https://www.swissmem.ch",
    space_mandate:
      "Industry association under Swissmem representing Swiss space companies. ~100 companies, ~2,500 direct employees, CHF 250-300M+ annual revenue (excluding Beyond Gravity CHF 402M). 30%+ startups/spinoffs.",
    applicable_areas: ["licensing"],
  },
];

// ─── International Treaties (CH-specific entries, 4) ──────────────

const TREATIES_CH: LegalSource[] = [
  {
    id: "CH-OST-1967",
    jurisdiction: "CH",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Switzerland Ratification Record",
    title_local: "Weltraumvertrag — Schweizerische Ratifizierung",
    date_enacted: "1967-01-27",
    date_in_force: "1969-12-18",
    official_reference: "SR 0.790",
    source_url: "https://www.fedlex.admin.ch/eli/cc/1970/69_75_75/de",
    issuing_body: "United Nations / Bundesversammlung",
    competent_authorities: ["CH-FDFA", "CH-SSO"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Switzerland bears international responsibility for national space activities. Under Switzerland's MONIST system, this treaty obligation is directly applicable without transposition. However, no domestic authorization regime exists until the Raumfahrtgesetz enters force (~2028).",
        complianceImplication:
          "Art. VI is directly applicable in Switzerland but lacks domestic implementing legislation — the Raumfahrtgesetz will close this gap.",
      },
    ],
    related_sources: [
      "CH-RAUMFAHRTGESETZ-DRAFT",
      "CH-LIABILITY-CONV",
      "CH-REGISTRATION-CONV",
    ],
    notes: [
      "SR 0.790. EIF for Switzerland: 18 December 1969.",
      "Directly applicable under Swiss monist tradition — no transposition needed.",
      "No reservations or declarations.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "CH-LIABILITY-CONV",
    jurisdiction: "CH",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Switzerland Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1974-01-22",
    official_reference: "SR 0.790.2",
    source_url: "https://www.fedlex.admin.ch",
    issuing_body: "United Nations / Bundesversammlung",
    competent_authorities: ["CH-FDFA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Switzerland is absolutely liable for surface damage. Currently NO domestic implementing legislation — general tort law (Code of Obligations) applies by default. The Raumfahrtgesetz draft proposes DIRECT OPERATOR LIABILITY (not state-then-recourse like most EU countries).",
        complianceImplication:
          "The Federal Council recognized this gap as unacceptable. Until Raumfahrtgesetz: mechanism for passing state liability to private operators is unclear.",
      },
    ],
    related_sources: ["CH-OST-1967", "CH-RAUMFAHRTGESETZ-DRAFT"],
    notes: [
      "SR 0.790.2. Deposit ~22 January 1974.",
      "No domestic implementing legislation exists.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "CH-REGISTRATION-CONV",
    jurisdiction: "CH",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Switzerland Ratification Record",
    date_enacted: "1975-01-14",
    date_in_force: "1978-01-01",
    official_reference: "SR 0.790.3",
    source_url: "https://www.fedlex.admin.ch",
    issuing_body: "United Nations / Bundesversammlung",
    competent_authorities: ["CH-SSO"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Switzerland ratified ~1978 but has NO national register of space objects. The Raumfahrtgesetz will establish one for the first time. This is a longstanding gap in treaty implementation.",
      },
    ],
    related_sources: ["CH-OST-1967", "CH-RAUMFAHRTGESETZ-DRAFT"],
    notes: [
      "SR 0.790.3. Ratified ~1978.",
      "NO national register exists — Raumfahrtgesetz will create one.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "CH-ARTEMIS-ACCORDS",
    jurisdiction: "CH",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Switzerland Signatory (2024)",
    date_enacted: "2024-04-15",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["CH-FDFA", "CH-SSO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Switzerland signed 15 April 2024 at NASA HQ — 37th signatory. Federal Councillor Guy Parmelin signed. Non-binding political commitment. Switzerland NOT party to Moon Agreement.",
      },
    ],
    related_sources: ["CH-OST-1967"],
    notes: [
      "37th signatory, 15 April 2024.",
      "Parmelin: 'We renew our commitment to jointly explore the heavens above us.'",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── National Legislation (2) ───────────────────────────────────

const NATIONAL_LEGISLATION_CH: LegalSource[] = [
  {
    id: "CH-NARV",
    jurisdiction: "CH",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Ordinance on the Promotion of National Space Activities (NARV)",
    title_local:
      "Verordnung über die Förderung von nationalen Aktivitäten im Bereich der Raumfahrt",
    date_enacted: "2021-12-17",
    date_in_force: "2022-02-01",
    official_reference: "SR 420.125",
    source_url: "https://www.fedlex.admin.ch/eli/cc/2022/17/de",
    issuing_body: "Bundesrat",
    competent_authorities: ["CH-SSO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Research promotion — NOT a regulatory framework",
        summary:
          "Enables Swiss ESA programme participation, supports space research at universities and non-commercial institutions, funds MARVIS programme via SNSF. Does NOT cover: authorization, licensing, liability, insurance, registration, supervision, penalties, safety, or debris mitigation. Legal basis: FIFG (SR 420.1).",
        complianceImplication:
          "This is a RESEARCH-PROMOTION ordinance, not a space regulatory framework. 'Weltraumverordnung SR 700.1' does NOT exist — SR 700.1 is spatial planning (Raumplanungsverordnung).",
      },
    ],
    related_sources: ["CH-OST-1967", "CH-RAUMFAHRTGESETZ-DRAFT"],
    notes: [
      "SR 420.125. The ONLY space-specific Swiss ordinance.",
      "NOT a regulatory framework — purely research promotion.",
      "CRITICAL: 'Weltraumverordnung SR 700.1' does NOT exist. That SR belongs to spatial planning.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "CH-RAUMFAHRTGESETZ-DRAFT",
    jurisdiction: "CH",
    type: "draft_legislation",
    status: "draft",
    title_en: "Federal Act on Space Operations (Raumfahrtgesetz)",
    title_local: "Bundesgesetz über die Raumfahrt (Raumfahrtgesetz)",
    date_published: "2026-02-25",
    source_url: "https://www.swiss-space-law.admin.ch",
    issuing_body: "Bundesrat / Bundesversammlung",
    competent_authorities: ["CH-SSO"],
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
        section: "Authorization",
        title: "Licensing requirement for space operations",
        summary:
          "Authorization required for launch, positioning, operation, steering, and control of space objects from Swiss territory, Swiss ships, floating platforms, and aircraft. Manufacturing and specific uses excluded from scope.",
      },
      {
        section: "Art. 23-25",
        title: "Direct operator liability — NOT state-then-recourse",
        summary:
          "Art. 23: strict liability for surface/aircraft damage. Art. 24: fault-based for space-to-space damage. Art. 25: Code of Obligations residual. The Federal Council chose DIRECT operator liability — operator (not the state) is directly liable to injured parties under private law. Explicitly rejected state-first + recourse model.",
        complianceImplication:
          "Unique approach: transfers international state liability directly to private operators. Different from FR (state backstop), DE (proposed), AT (state recourse), BE (state recourse + 10% cap).",
      },
      {
        section: "Art. 9(1)(j) / Art. 26",
        title: "Risk-based insurance — no general obligation",
        summary:
          "NO general insurance obligation (deemed disproportionate for smaller projects). Supervisory authority MAY require insurance with specified insured sum if activity involves increased risks. Federal Council may set minimum amounts by ordinance.",
        complianceImplication:
          "More flexible than AT/FR/FI (€60M fixed minimums). Favours innovation but provides less predictability for operators.",
      },
      {
        section: "Sustainability",
        title: "Debris mitigation and de-orbiting",
        summary:
          "Mandatory debris mitigation and de-orbiting/controlled re-entry at end of operational life.",
      },
      {
        section: "Penalties",
        title: "Up to 10% of average annual turnover",
        summary:
          "Penalties may reach 10% of operator's average annual turnover over preceding 3 years for significant violations.",
      },
    ],
    scope_description:
      "Dispatch adopted by Federal Council 25 February 2026, now before Parliament. EIF not before 2028. Will establish: authorization/licensing, national space object register, direct operator liability (not state-then-recourse), risk-based insurance, debris mitigation, flag principle for Swiss-registered objects. Does NOT cover: space data/cybersecurity, airspace-outer space boundary, suborbital flight, remote sensing, space resources.",
    related_sources: [
      "CH-OST-1967",
      "CH-LIABILITY-CONV",
      "CH-REGISTRATION-CONV",
      "CH-NARV",
    ],
    notes: [
      "Dispatch adopted 25 February 2026. Before Parliament.",
      "Entry into force not before 2028.",
      "Direct operator liability model — unique in European space law.",
      "Risk-based insurance: no general obligation, authority may require if increased risks.",
      "Over 40 states enacted space legislation before Switzerland began this process.",
      "Consultation period: 29 January to 6 May 2025 — broad support confirmed.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────

const TELECOM_CH: LegalSource[] = [
  {
    id: "CH-FMG",
    jurisdiction: "CH",
    type: "federal_law",
    status: "in_force",
    title_en: "Telecommunications Act (Fernmeldegesetz)",
    title_local: "Fernmeldegesetz",
    date_enacted: "1997-04-30",
    official_reference: "SR 784.10",
    source_url: "https://www.fedlex.admin.ch/eli/cc/1997/2187_2187_2187/de",
    issuing_body: "Bundesversammlung",
    competent_authorities: ["CH-OFCOM"],
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
        title: "Satellite spectrum management via OFCOM",
        summary:
          "Anyone using the radio spectrum up to 3,000 GHz requires a licence. OFCOM manages satellite communication frequency allocation and represents Switzerland at ITU for frequency coordination including orbital slot negotiation. NFAP 2026 (January 2025) allocates satellite bands.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-14",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_CH: LegalSource[] = [
  {
    id: "CH-GKG",
    jurisdiction: "CH",
    type: "federal_law",
    status: "in_force",
    title_en: "Goods Control Act (Güterkontrollgesetz)",
    title_local: "Güterkontrollgesetz",
    date_enacted: "1996-12-13",
    official_reference: "SR 946.202",
    source_url: "https://www.fedlex.admin.ch/eli/cc/1997/1697_1697_1697/de",
    issuing_body: "Bundesversammlung",
    competent_authorities: ["CH-SECO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Art. 1 / Art. 6 / Art. 14",
        title: "Dual-use and strategic goods export control",
        summary:
          "Art. 1: controls dual-use, military, and strategic goods (incl. Galileo components under Annex 4 since 2016). Art. 6: refusal criteria (international agreements, non-binding measures). Art. 14: criminal penalties up to 10 years imprisonment. GKV (SR 946.202.1) contains control lists mirroring Wassenaar/EU. Space: Categories 7 (Navigation/Avionics) and 9 (Aerospace/Propulsion). Catch-all clause Art. 3(4) GKV.",
        complianceImplication:
          "Switzerland member of ALL 4 export control regimes. Hosted MTCR Plenary 2022 (Montreux). Chaired HCoC 2020. SECO uses ELIC system. ~1,744 dual-use permits/year.",
      },
    ],
    related_sources: ["CH-RAUMFAHRTGESETZ-DRAFT"],
    notes: [
      "SR 946.202. GKV annexes updated 1 May 2025 (quantum, semiconductors, additive manufacturing).",
      "Switzerland hosts and funds MTCR website (mtcr.info).",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Data Protection (1) ────────────────────────────────────────

const DATA_PROTECTION_CH: LegalSource[] = [
  {
    id: "CH-DSG",
    jurisdiction: "CH",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Protection Act (Datenschutzgesetz)",
    title_local: "Datenschutzgesetz",
    date_enacted: "2020-09-25",
    date_in_force: "2023-09-01",
    official_reference: "SR 235.1",
    source_url: "https://www.fedlex.admin.ch/eli/cc/2022/491/de",
    issuing_body: "Bundesversammlung",
    competent_authorities: ["CH-EDOEB"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator", "all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "New data protection framework (replacing 1992 act)",
        summary:
          "In force 1 September 2023. General data protection requirements apply to space companies processing personal data (satellite imagery, EO data). Neither the current act nor the draft Raumfahrtgesetz addresses space data governance specifically. EDÖB supervises compliance.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-14",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_CH: LegalSource[] = [
  {
    id: "CH-SPACE-POLICY-2023",
    jurisdiction: "CH",
    type: "policy_document",
    status: "in_force",
    title_en: "Space Policy 2023 (Weltraumpolitik 2023)",
    title_local: "Weltraumpolitik 2023",
    date_published: "2023-04-19",
    source_url: "https://www.sbfi.admin.ch",
    issuing_body: "Bundesrat",
    competent_authorities: ["CH-SSO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "Three strategic priorities",
        summary:
          "Replaces 2008 Space Policy. Three priorities: (1) access and resiliency through ESA, (2) competitiveness and relevance through science/industry, (3) partnership and reliability in international cooperation. Implementation coordinated by IKAR under SSO. CM25: EUR 781M committed. Federal Assembly approved CHF 1,666.3M for space cooperation 2025-2028.",
        complianceImplication:
          "EUR 781M at CM25. CHF 300M+ annual space investment. ESA georeturn ~1.2×. SSO Head chairs ESA Council at delegate level.",
      },
    ],
    related_sources: ["CH-NARV", "CH-RAUMFAHRTGESETZ-DRAFT"],
    notes: [
      "Adopted 19 April 2023 by Federal Council.",
      "Complemented by DDPS 'Design Concept for Space' (~2024).",
      "ASAT commitment: October 2022.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_CH: LegalSource[] = [
  ...TREATIES_CH,
  ...NATIONAL_LEGISLATION_CH,
  ...TELECOM_CH,
  ...EXPORT_CONTROL_CH,
  ...DATA_PROTECTION_CH,
  ...POLICY_CH,
];
