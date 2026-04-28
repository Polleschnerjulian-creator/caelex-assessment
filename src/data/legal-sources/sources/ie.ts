// src/data/legal-sources/sources/ie.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Ireland space law sources — complete legal framework for jurisdiction IE.
 *
 * Sources: irishstatutebook.ie, oireachtas.ie, enterprise.gov.ie
 * Last verified: 2026-04-14
 *
 * Notable: ESA founding member (1975) with NO national space act.
 * EIRSAT-1 crisis (2022): discovered OST/Liability Convention never received
 * constitutionally required Dáil approval. NOT party to Registration Convention.
 * No licensing, no registry, no insurance, no debris rules. EU Space Act
 * (2030) expected to provide first comprehensive framework by direct effect.
 * Only English-speaking common-law EU member since Brexit.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── IE Authorities (8) ───────────────────────────────────────────

export const AUTHORITIES_IE: Authority[] = [
  {
    id: "IE-DETE",
    jurisdiction: "IE",
    name_en: "Department of Enterprise, Trade and Employment",
    name_local: "An Roinn Fiontar, Trádála agus Fostaíochta",
    abbreviation: "DETE",
    website: "https://enterprise.gov.ie",
    space_mandate:
      "Lead government department for space policy. ESA delegate ministry. Chairs Space Enterprise Coordination Group. Published National Space Strategy for Enterprise 2019-2025. Authorised EIRSAT-1 through Cabinet decision. National Competent Authority for export controls under Control of Exports Act 2023.",
    applicable_areas: ["licensing", "export_control"],
  },
  {
    id: "IE-EI",
    jurisdiction: "IE",
    name_en: "Enterprise Ireland",
    name_local: "Fiontraíocht Éireann",
    abbreviation: "EI",
    website: "https://www.enterprise-ireland.com",
    space_mandate:
      "De facto space agency for enterprise purposes. Coordinates Ireland's ESA industrial/research participation. Manages ESA BIC Ireland. National Delegate to ESA: Dr. Padraig Doolan. 116 companies engaged with ESA by end-2024. NO regulatory, licensing, or supervisory authority — significant Art. VI gap.",
    applicable_areas: ["licensing"],
  },
  {
    id: "IE-COMREG",
    jurisdiction: "IE",
    name_en: "Commission for Communications Regulation",
    name_local: "An Coimisiún um Rialáil Cumarsáide",
    abbreviation: "ComReg",
    website: "https://www.comreg.ie",
    space_mandate:
      "Satellite spectrum allocation and earth station licensing under Wireless Telegraphy Act 1926. Updated Satellite Earth Station Licensing Guidelines (ComReg 24/48, June 2024). ITU satellite frequency coordination. Designated as sectoral competent authority for space under pending NIS2 transposition.",
    legal_basis:
      "Wireless Telegraphy Act 1926; Communications Regulation Act 2002",
    applicable_areas: ["frequency_spectrum", "cybersecurity"],
  },
  {
    id: "IE-DFA",
    jurisdiction: "IE",
    name_en: "Department of Foreign Affairs",
    name_local: "An Roinn Gnóthaí Eachtracha",
    abbreviation: "DFA",
    website: "https://www.dfa.ie",
    space_mandate:
      "International treaty obligations. Would lead diplomatic response to Liability Convention claims. Participates in multilateral export control regimes. Reviews export control applications for foreign policy compliance.",
    applicable_areas: ["licensing"],
  },
  {
    id: "IE-DPC",
    jurisdiction: "IE",
    name_en: "Data Protection Commission",
    name_local: "An Coimisiún um Chosaint Sonraí",
    abbreviation: "DPC",
    website: "https://www.dataprotection.ie",
    space_mandate:
      "GDPR enforcement. Lead Supervisory Authority for many multinational tech companies headquartered in Ireland (Google, Apple, Meta, Microsoft). Jurisdiction extends to space data processing. Ireland's data centre concentration = infrastructure for satellite EO data.",
    legal_basis: "Data Protection Act 2018",
    applicable_areas: ["data_security"],
  },
  {
    id: "IE-NCSC",
    jurisdiction: "IE",
    name_en: "National Cyber Security Centre",
    name_local: "An tIonad Náisiúnta Cibearshlándála",
    abbreviation: "NCSC",
    website: "https://www.ncsc.gov.ie",
    space_mandate:
      "Manages CSIRT-IE. Enhanced space sector oversight once NIS2 transposed. Ireland missed October 2024 NIS2 deadline — EC reasoned opinion May 2025. National Cyber Security Bill 2024 pending.",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "IE-IAA",
    jurisdiction: "IE",
    name_en: "Irish Aviation Authority",
    name_local: "Údarás Eitlíochta na hÉireann",
    abbreviation: "IAA",
    website: "https://www.iaa.ie",
    space_mandate:
      "Regulates Shannon FIR (455,000 km² airspace). No explicit space mandate but involved in any launch/reentry through Irish-managed airspace. Restructured 2023: AirNav Ireland separated for air navigation.",
    legal_basis:
      "Irish Aviation Authority Act 1993; Air Navigation and Transport Act 2022",
    applicable_areas: ["licensing"],
  },
  {
    id: "IE-MET-EIREANN",
    jurisdiction: "IE",
    name_en: "Met Éireann",
    name_local: "Met Éireann",
    abbreviation: "Met Éireann",
    website: "https://www.met.ie",
    space_mandate:
      "Ireland's meteorological service. Founding member of EUMETSAT (1983). Director Eoin Moran = Chair of EUMETSAT Council (re-elected 2024). Key user of satellite data.",
    applicable_areas: ["environmental"],
  },
];

// ─── International Treaties (IE-specific entries, 2) ──────────────
// NOTE: Ireland is party to only 2 of 5 UN space treaties

const TREATIES_IE: LegalSource[] = [
  {
    id: "IE-OST-1967",
    jurisdiction: "IE",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Outer Space Treaty — Ireland Ratification Record (Dáil approval 2022)",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations / Dáil Éireann",
    competent_authorities: ["IE-DFA", "IE-DETE"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Ireland signed 27 January 1967 and ratified. However, the treaty NEVER received constitutionally required Dáil approval under Art. 29.5.2° of Bunreacht na hÉireann until 12 July 2022 — an emergency motion prompted by the EIRSAT-1 mission. Ireland has NO domestic authorization regime implementing Art. VI.",
        complianceImplication:
          "Ireland CANNOT fulfil Art. VI's requirement to 'authorize and continuously supervise' national space activities — no licensing regime exists. EIRSAT-1 was authorized through ad hoc Cabinet decision.",
      },
    ],
    related_sources: ["IE-LIABILITY-1972"],
    notes: [
      "Signed 27 January 1967. Dáil approval: 12 July 2022 (55 years late).",
      "The EIRSAT-1 crisis exposed that constitutionally required Dáil approval had never occurred.",
      "Ireland follows DUALIST approach — treaties not directly enforceable without implementing legislation.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "IE-LIABILITY-1972",
    jurisdiction: "IE",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Liability Convention — Ireland Ratification Record (Dáil approval 2022)",
    date_enacted: "1972-06-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations / Dáil Éireann",
    competent_authorities: ["IE-DFA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Ireland signed 29 June 1972. Like the OST, received belated Dáil approval 12 July 2022. Ireland has NO domestic liability statute for space, NO mandatory insurance, and NO state indemnification mechanism. Under Ireland's dualist system, the Convention is NOT directly enforceable in Irish courts without implementing legislation (which does not exist).",
        complianceImplication:
          "Any space damage claim would fall under general Irish tort law (Civil Liability Act 1961, common-law negligence). No space-specific liability case law exists.",
      },
    ],
    related_sources: ["IE-OST-1967"],
    notes: [
      "Signed 29 June 1972. Dáil approval: 12 July 2022.",
      "Declarations upon ratification (UNTS Vol. 961, p. 260) — content unconfirmed.",
      "NOT party to Registration Convention or Moon Agreement.",
      "Dualist system: Convention NOT directly enforceable without implementing legislation.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── No Primary Space Legislation — key non-space statutes (3) ──

const APPLICABLE_LEGISLATION_IE: LegalSource[] = [
  {
    id: "IE-WIRELESS-TELEGRAPHY-1926",
    jurisdiction: "IE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Wireless Telegraphy Act 1926 — Satellite Earth Station Licensing",
    title_local: "Acht Telegrafaíochta gan Sreang, 1926",
    date_enacted: "1926-07-24",
    official_reference: "No. 45/1926",
    source_url: "https://www.irishstatutebook.ie/eli/1926/act/45/enacted/en",
    issuing_body: "Oireachtas",
    competent_authorities: ["IE-COMREG"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Full instrument + S.I. No. 96/2024",
        title: "Foundation for ALL satellite earth station licensing",
        summary:
          "The 1926 Act is the foundation for all satellite licensing in Ireland via ComReg. S.I. No. 96/2024 (Satellite Earth Station Licence Regulations 2024) provides the current regime. S.I. No. 226/2020 exempts certain satellite terminals. ComReg Guidelines 24/48 (June 2024) detail the process.",
        complianceImplication:
          "This 100-year-old Act is Ireland's ONLY statutory basis for regulating any aspect of satellite operations. All other space regulatory functions are unlegislated.",
      },
    ],
    related_sources: ["IE-EXPORT-CONTROL-2023"],
    notes: [
      "No. 45/1926. A 1926 wireless act = Ireland's only satellite regulatory tool.",
      "S.I. 96/2024: current satellite earth station licence regulations.",
      "S.I. 226/2020: exemptions for certain satellite terminals.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "IE-EXPORT-CONTROL-2023",
    jurisdiction: "IE",
    type: "federal_law",
    status: "in_force",
    title_en: "Control of Exports Act 2023",
    date_enacted: "2023-12-19",
    date_in_force: "2024-08-22",
    official_reference: "No. 35/2023",
    source_url: "https://www.irishstatutebook.ie/eli/2023/act/35/enacted/en",
    issuing_body: "Oireachtas",
    competent_authorities: ["IE-DETE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Ireland's strongest space regulatory tool",
        summary:
          "Replaced 2008 Act. Implements EU Dual-Use Regulation (2021/821). Discretionary ministerial powers for controls beyond EU list. Penalties: €10M or 3× value of goods and up to 5 years imprisonment. DETE as National Competent Authority. S.I. 416/2024: National Military Export Control List. Space tech: Categories 3/5/6/7/9.",
        complianceImplication:
          "Export control is Ireland's MOST DEVELOPED space regulatory tool. Ireland chaired Wassenaar Plenary 2022. Member of all major export control regimes (Wassenaar, MTCR, NSG, AG, HCoC).",
      },
    ],
    related_sources: ["IE-OST-1967"],
    notes: [
      "No. 35/2023. Commenced 22 August 2024.",
      "Screening of Third Country Transactions Act 2023 (commenced 6 January 2025): FDI screening for space tech.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "IE-ESA-PRIVILEGES-1976",
    jurisdiction: "IE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "European Space Agency (Privileges and Immunities) Order 1976",
    official_reference: "S.I. No. 324/1976",
    date_enacted: "1976-12-31",
    source_url: "https://www.irishstatutebook.ie/eli/1976/si/324/made/en",
    issuing_body: "Government",
    competent_authorities: ["IE-DFA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA privileges and immunities in Irish law",
        summary:
          "Implements ESA privileges and immunities. Ireland signed the ESA Convention on 31 December 1975 — the FINAL day before closure. ESA founding member since Convention entered force 30 October 1980.",
      },
    ],
    related_sources: ["IE-OST-1967"],
    notes: [
      "S.I. 324/1976. Ireland signed ESA Convention on last possible day (31 December 1975).",
    ],
    last_verified: "2026-04-14",
  },

  {
    id: "IE-NIS2-TRANSPOSITION",
    jurisdiction: "IE",
    type: "draft_legislation",
    status: "draft",
    title_en: "National Cyber Security Bill 2024 — Irish NIS2 Transposition",
    title_local: "National Cyber Security Bill 2024",
    date_published: "2024-08-30",
    parliamentary_reference: "Bill No. 89 of 2024",
    source_url: "https://www.oireachtas.ie/en/bills/bill/2024/89/",
    issuing_body: "Department of the Environment, Climate and Communications",
    competent_authorities: ["IE-NCSC"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["cybersecurity"],
    scope_description:
      "Irish primary legislation transposing NIS2 (Directive (EU) 2022/2555). Ireland missed the October 2024 NIS2 deadline; the EC issued a reasoned opinion in May 2025. The Bill creates the National Cyber Security Centre on a statutory footing and applies risk-management and incident-reporting duties to essential and important entities, including space-sector operators meeting Annex I criteria.",
    key_provisions: [
      {
        section: "Part 4 (essential and important entities)",
        title: "Risk management and incident reporting",
        summary:
          "Establishes risk-management measures aligned with NIS2 Art. 21 and the 24h/72h/one-month incident-reporting cascade to NCSC for designated entities.",
      },
      {
        section: "Part 6",
        title: "Enforcement and administrative fines",
        summary:
          "Provides administrative fines up to €10m or 2 % of global turnover for essential entities; €7m or 1.4 % for important entities, mirroring NIS2 Art. 34.",
      },
    ],
    implements: "EU-NIS2-2022",
    related_sources: ["EU-NIS2-2022"],
    notes: [
      "Bill published Aug 2024; Dáil Éireann second-stage debate ongoing. Operators with IE nexus should monitor enactment given EC infringement pressure.",
    ],
    last_verified: "2026-04-22",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_IE: LegalSource[] = [
  {
    id: "IE-SPACE-STRATEGY-2019",
    jurisdiction: "IE",
    type: "policy_document",
    status: "in_force",
    title_en: "National Space Strategy for Enterprise 2019-2025",
    date_published: "2019-06-19",
    source_url: "https://enterprise.gov.ie",
    issuing_body: "DETE",
    competent_authorities: ["IE-DETE", "IE-EI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "Enterprise-only strategy — no regulatory framework",
        summary:
          "Ireland's first and only national space strategy. Exclusively enterprise-focused — did NOT address licensing, liability, debris, or establishing a space agency/registry. Six goals including doubling revenue/employment, 100+ ESA-active companies (achieved: 116 by 2024). Strategy expired end 2025; successor in development. CM25: €170M committed (nearly doubled). ESA contracts: €24.56M in 2024 (record).",
        complianceImplication:
          "Critically: the strategy deliberately avoided regulatory/governance gaps. No plans for a national space act. Government relies on forthcoming EU Space Act (2030) as the solution.",
      },
    ],
    related_sources: ["IE-OST-1967"],
    notes: [
      "Published 19 June 2019 under Project Ireland 2040.",
      "15 of 19 priority actions completed.",
      "Expired end 2025. Successor in development.",
      "DETE public consultation on EU Space Act: 'Which body should Ireland designate as NCA?'",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_IE: LegalSource[] = [
  ...TREATIES_IE,
  ...APPLICABLE_LEGISLATION_IE,
  ...POLICY_IE,
];
