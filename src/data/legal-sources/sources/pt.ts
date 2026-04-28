// src/data/legal-sources/sources/pt.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Portugal space law sources — complete legal framework for jurisdiction PT.
 *
 * Sources: dre.pt, anacom.pt, ptspace.pt
 * Last verified: 2026-04-14
 *
 * Notable: Comprehensive 2019 Space Act (DL 16/2019) with 2024 amendment
 * adding launch centre regime. Mass-scaled insurance (€2M-€60M). ANACOM
 * dual role as telecom regulator + interim Space Authority. Azores spaceport
 * licensed August 2025 (Santa Maria). ESA Space Rider landing site (Q1 2028).
 * CM25: €204.8M (record, 51% increase). Artemis Accords: 60th signatory (Jan 2026).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── PT Authorities (10) ──────────────────────────────────────────

export const AUTHORITIES_PT: Authority[] = [
  {
    id: "PT-ANACOM",
    jurisdiction: "PT",
    name_en: "National Communications Authority — Interim Space Authority",
    name_local: "Autoridade Nacional de Comunicações — Autoridade Espacial",
    abbreviation: "ANACOM",
    website: "https://www.anacom.pt",
    space_mandate:
      "DUAL ROLE: (1) National regulatory authority for electronic communications including satellite spectrum, and (2) interim Space Authority under DL 16/2019 Art. 30. Licenses space activities (launch/return, C2, launch centres), supervises/inspects, maintains National Registry of Space Objects, issues Space Regulation. Issued Portugal's first space licences in 2024 and first launch centre licence August 2025.",
    legal_basis: "DL n.º 16/2019; DL n.º 39/2015; Lei n.º 16/2022",
    applicable_areas: [
      "licensing",
      "registration",
      "frequency_spectrum",
      "debris_mitigation",
    ],
  },
  {
    id: "PT-PTSPACE",
    jurisdiction: "PT",
    name_en: "Portugal Space — Portuguese Space Agency",
    name_local: "Agência Espacial Portuguesa",
    abbreviation: "Portugal Space",
    website: "https://www.ptspace.pt",
    space_mandate:
      "Executes Portugal Space 2030 strategy, develops national space sector, issues prior opinions on licensing (since 2024 amendment), directs governmental approval for launch centre licences, coordinates Portuguese ESA participation. Private non-profit association created by RCM 55/2019. HQ: Santa Maria Island, Azores. President: Ricardo Conde. Executive Director: Hugo André Costa.",
    legal_basis: "RCM n.º 55/2019; RCM n.º 80/2023",
    applicable_areas: ["licensing"],
  },
  {
    id: "PT-MECI",
    jurisdiction: "PT",
    name_en: "Ministry of Education, Science and Innovation",
    name_local: "Ministério da Educação, Ciência e Inovação",
    abbreviation: "MECI",
    website: "https://www.portugal.gov.pt",
    space_mandate:
      "Responsible ministry overseeing space policy through Secretary of State for Science and Innovation. Inter-ministerial working group on space (Despacho 10547/2025) coordinated by this secretary of state.",
    applicable_areas: ["licensing"],
  },
  {
    id: "PT-MDN",
    jurisdiction: "PT",
    name_en: "Ministry of National Defence — DGRDN",
    name_local:
      "Ministério da Defesa Nacional — Direção-Geral de Recursos da Defesa Nacional",
    abbreviation: "MDN/DGRDN",
    website: "https://www.defesa.gov.pt",
    space_mandate:
      "National SST programme through DGRDN (Portugal's designated entity in EU SST consortium, joined December 2018). Prior approval for launch centre licences. Founding member of Portugal Space. Estratégia da Defesa Nacional para o Espaço 2020-2030 (EDNE20/30). Contributed 16.2% of CM25 subscription.",
    applicable_areas: ["military_dual_use", "licensing"],
  },
  {
    id: "PT-AT-CUSTOMS",
    jurisdiction: "PT",
    name_en: "Tax and Customs Authority — Export Control",
    name_local: "Autoridade Tributária e Aduaneira",
    abbreviation: "AT",
    website: "https://www.portaldasfinancas.gov.pt",
    space_mandate:
      "National competent authority for dual-use export controls under DL 130/2015. Handles licensing, inspection, and enforcement. Inter-ministerial commission assists with controlled product lists.",
    legal_basis: "DL n.º 130/2015",
    applicable_areas: ["export_control"],
  },
  {
    id: "PT-CNPD",
    jurisdiction: "PT",
    name_en: "National Data Protection Commission",
    name_local: "Comissão Nacional de Proteção de Dados",
    abbreviation: "CNPD",
    website: "https://www.cnpd.pt",
    space_mandate:
      "GDPR supervisory authority under Lei 58/2019. Relevant for satellite data and remote sensing involving personal data. No specific guidance on satellite/EO data issued.",
    legal_basis: "Lei n.º 58/2019",
    applicable_areas: ["data_security"],
  },
  {
    id: "PT-CNCS",
    jurisdiction: "PT",
    name_en: "National Cybersecurity Centre",
    name_local: "Centro Nacional de Cibersegurança",
    abbreviation: "CNCS",
    website: "https://www.cncs.gov.pt",
    space_mandate:
      "Competent authority for NIS2 implementation. Regime Jurídico da Cibersegurança in force 3 April 2026. Space as high-criticality sector. Fines up to €10M or 2% of global turnover.",
    legal_basis: "DL n.º 125/2025",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "PT-IPMA",
    jurisdiction: "PT",
    name_en: "Portuguese Sea and Atmosphere Institute",
    name_local: "Instituto Português do Mar e da Atmosfera",
    abbreviation: "IPMA",
    website: "https://www.ipma.pt",
    space_mandate:
      "Earth observation and meteorology. Operates within EUMETSAT framework. Competences preserved separately from Portugal Space's mandate.",
    applicable_areas: ["environmental"],
  },
  {
    id: "PT-AZORES-SPACE",
    jurisdiction: "PT",
    name_en: "Azores Mission Structure for Space (EMA-Espaço)",
    name_local: "Estrutura de Missão para o Espaço dos Açores",
    abbreviation: "EMA-Espaço",
    website: "https://portal.azores.gov.pt",
    space_mandate:
      "Created by RGR 106/2022. Coordinates Azores space activities. Issues binding opinions on launch centre installations. Plans to upgrade to Regional Directorate for Space (announced November 2025). Azores has own space legislation: DLR 9/2019/A (amended DLR 24/2021/A) and DRR 6/2020/A.",
    applicable_areas: ["licensing"],
  },
  {
    id: "PT-AIR-CENTRE",
    jurisdiction: "PT",
    name_en: "Atlantic International Research Centre",
    name_local: "Atlantic International Research Centre",
    abbreviation: "AIR Centre",
    website: "https://www.aircentre.org",
    space_mandate:
      "HQ: Terceira Island, Azores. Established November 2017. Coordinates Atlantic Constellation satellite project and Earth observation across 16 cooperating states/regions. Promotes affordable access to space and SSA across the Atlantic basin.",
    applicable_areas: ["environmental", "registration"],
  },
];

// ─── International Treaties (PT-specific entries, 4) ──────────────

const TREATIES_PT: LegalSource[] = [
  {
    id: "PT-OST-1967",
    jurisdiction: "PT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Portugal Ratification Record",
    title_local: "Tratado sobre o Espaço Exterior — Ratificação de Portugal",
    date_enacted: "1967-01-27",
    date_in_force: "1996-05-29",
    official_reference: "Decreto-Lei n.º 286/71 (DR I, n.º 152, 30 June 1971)",
    source_url: "https://dre.pt",
    issuing_body: "Assembleia da República",
    competent_authorities: ["PT-MECI", "PT-ANACOM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Portugal bears international responsibility for national space activities. Legislative approval in 1971, but deposit of ratification only on 29 May 1996 — a 25-year gap reflecting the 1974 revolution. The 2019 Space Act fully implements Art. VI.",
        complianceImplication:
          "Portugal's late deposit (1996) meant it had no treaty obligation for space activities during its early satellite era.",
      },
    ],
    related_sources: [
      "PT-SPACE-ACT-2019",
      "PT-LIABILITY-2019",
      "PT-REGISTRATION-2018",
    ],
    notes: [
      "DL 286/71. Approved 1971, deposited 1996 — 25-year gap due to Carnation Revolution.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "PT-LIABILITY-2019",
    jurisdiction: "PT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Portugal Accession Record",
    date_enacted: "1972-03-29",
    date_in_force: "2019-06-27",
    official_reference:
      "Decreto n.º 14/2019 (DR Série I, n.º 75, 16 April 2019)",
    source_url: "https://dre.pt",
    issuing_body: "Assembleia da República",
    competent_authorities: ["PT-ANACOM"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Portugal acceded remarkably late — 47 YEARS after adoption — strategically timed to coincide with the 2019 Space Act. DL 16/2019 Art. 18-19 implements dual liability: strict for surface/aircraft damage, fault-based for other damage. State recourse capped at €50M or insured capital.",
        complianceImplication:
          "Mass-scaled insurance: €2M (≤50kg), scaled (50-500kg), €60M (>500kg). Recourse cap removed for wilful misconduct or gross negligence.",
      },
    ],
    related_sources: ["PT-OST-1967", "PT-SPACE-ACT-2019", "PT-INSURANCE-2023"],
    notes: [
      "Decreto 14/2019. Deposited 27 June 2019 — 47 years after Convention adoption.",
      "Strategically timed with the 2019 Space Act.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "PT-REGISTRATION-2018",
    jurisdiction: "PT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Portugal Accession Record",
    date_enacted: "1975-01-14",
    date_in_force: "2018-10-04",
    official_reference: "Decreto-Lei n.º 24/2018 (Aviso n.º 143/2018)",
    source_url: "https://dre.pt",
    issuing_body: "Assembleia da República",
    competent_authorities: ["PT-ANACOM"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Acceded October 2018 — strategically preceding the 2019 Space Act. ANACOM maintains the National Registry. Portugal registered its first space objects (PoSat-2 and PROMETHEUS-1) with the UN in November 2025. Registration required within 2 days of launch.",
      },
    ],
    related_sources: ["PT-OST-1967", "PT-SPACE-ACT-2019"],
    notes: [
      "DL 24/2018. Aviso 143/2018.",
      "First Portuguese objects registered with UN: November 2025.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "PT-ARTEMIS-ACCORDS",
    jurisdiction: "PT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Portugal Signatory (2026)",
    date_enacted: "2026-01-11",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["PT-MECI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Portugal signed 11 January 2026 in Lisbon — 60th signatory. Secretary of State Helena Canhão signed during the 52nd US-Portugal Standing Bilateral Commission. Moon Agreement NOT ratified.",
      },
    ],
    related_sources: ["PT-OST-1967"],
    notes: ["60th signatory, 11 January 2026 in Lisbon."],
    last_verified: "2026-04-14",
  },
];

// ─── Primary National Legislation (3) ───────────────────────────

const PRIMARY_LEGISLATION_PT: LegalSource[] = [
  {
    id: "PT-SPACE-ACT-2019",
    jurisdiction: "PT",
    type: "federal_law",
    status: "in_force",
    title_en: "National Space Act (Regime for Space Activities)",
    title_local:
      "Decreto-Lei n.º 16/2019 — Regime de acesso e exercício de atividades espaciais",
    date_enacted: "2019-01-22",
    date_in_force: "2019-01-22",
    date_last_amended: "2024-02-02",
    official_reference: "DL n.º 16/2019 (amended by DL n.º 20/2024)",
    source_url: "https://dre.pt/dre/detalhe/decreto-lei/16-2019-117819869",
    issuing_body: "Governo (Council of Ministers)",
    competent_authorities: ["PT-ANACOM", "PT-PTSPACE"],
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
        section: "Licensing",
        title: "Three licence types (post-2024 amendment)",
        summary:
          "Individual licences (single operation), global licences (series by same operator), joint licences (multiple operators). Applications via 'Portal do Espaço.' Decision within 90 days. Licences must be exercised within 5 years. Launch centre licences: 240 days, valid up to 15 years (renewable).",
        complianceImplication:
          "First licences issued in 2024 (launch and C2). First launch centre licence: 13 August 2025 (Santa Maria, Azores).",
      },
      {
        section: "Art. 18-19",
        title: "Dual liability regime",
        summary:
          "Strict liability for surface/aircraft damage. Fault-based for other damage. State right of recourse capped at €50M or insured capital (whichever lower). Cap removed for wilful misconduct, gross negligence, or non-compliance.",
      },
      {
        section: "Registration",
        title: "Mandatory registration within 2 days",
        summary:
          "All objects where Portugal is launching state must be registered with ANACOM within 2 days of launch. First objects registered with UN: November 2025 (PoSat-2, PROMETHEUS-1).",
      },
      {
        section: "Art. 30",
        title: "ANACOM as interim Space Authority",
        summary:
          "Transitional designation — suggests eventual dedicated space authority. ANACOM's dual role (telecom regulator + space authority) is unique in European space law.",
      },
      {
        section: "Penalties",
        title: "Administrative fines €250 to €44,891.81",
        summary:
          "Administrative offence regime. Fines range from €250 to €44,891.81.",
      },
    ],
    scope_description:
      "Portugal's comprehensive national space act. Applies to Portuguese territory (including maritime/airspace), Portuguese-flagged vessels/aircraft, and Portuguese operators abroad. Defence activities excluded. Amended 2024 (DL 20/2024) adding launch centre regime, joint licences, expanded Portugal Space role. ANACOM issued first space licences in 2024.",
    related_sources: [
      "PT-OST-1967",
      "PT-LIABILITY-2019",
      "PT-REGISTRATION-2018",
      "PT-SPACE-REGULATION-2019",
      "PT-INSURANCE-2023",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "DL 16/2019. Amended by DL 20/2024 (launch centre regime, joint licences).",
      "Rectified by Declaração 19/2024/1.",
      "First licences issued 2024. First launch centre licence: August 2025 (Santa Maria).",
      "ANACOM dual role: unique in European space law.",
      "87 companies, 46 research centres in Portuguese space ecosystem.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "PT-SPACE-REGULATION-2019",
    jurisdiction: "PT",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Activities Regulation (ANACOM Regulation 697/2019)",
    title_local:
      "Regulamento relativo ao regime de acesso e exercício de atividades espaciais",
    date_enacted: "2019-09-05",
    date_last_amended: "2024-10-21",
    official_reference:
      "Regulamento n.º 697/2019 (amended by Regulamento n.º 1206-A/2024)",
    source_url: "https://www.anacom.pt/render.jsp?contentId=1485498",
    issuing_body: "ANACOM",
    competent_authorities: ["PT-ANACOM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "debris_mitigation"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Detailed licensing and registration procedures",
        summary:
          "Procedures for individual, global, and joint licences. Pre-qualification criteria. Registration procedures. Transfer of ownership rules. 2024 amendment added launch centre licensing procedures. Rectified by Declaração 1025/2024/2.",
      },
    ],
    related_sources: ["PT-SPACE-ACT-2019"],
    last_verified: "2026-04-14",
  },
  {
    id: "PT-INSURANCE-2023",
    jurisdiction: "PT",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Insurance Order (Portaria 279/2023)",
    title_local:
      "Portaria n.º 279/2023 — Seguro de responsabilidade civil para atividades espaciais",
    date_enacted: "2023-09-11",
    official_reference: "Portaria n.º 279/2023",
    source_url: "https://dre.pt",
    issuing_body:
      "Ministérios das Finanças, Economia e Mar, Ciência e Ensino Superior",
    competent_authorities: ["PT-ANACOM"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["insurance", "liability"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Mass-scaled mandatory insurance",
        summary:
          "Insurance scaled by space object mass: ≤50 kg = €2M minimum; 50-500 kg = scaled amount; >500 kg = €60M minimum. State recourse capped at €50M or insured capital (whichever lower). Cap removed for wilful misconduct, gross negligence, or licence non-compliance. Waiver/reduction possible for small satellites, scientific/educational, or reduced-risk operations.",
        complianceImplication:
          "The mass-scaling approach is unique in European space law — more granular than the fixed €60M of France/Austria/Finland. The €2M floor for small satellites is particularly NewSpace-friendly.",
      },
    ],
    related_sources: ["PT-SPACE-ACT-2019"],
    notes: [
      "Portaria 279/2023. Joint order from three ministries.",
      "Mass-scaling: unique approach in European space law.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────

const TELECOM_PT: LegalSource[] = [
  {
    id: "PT-ECOMM-2022",
    jurisdiction: "PT",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Law",
    title_local: "Lei das Comunicações Eletrónicas",
    date_enacted: "2022-08-16",
    official_reference: "Lei n.º 16/2022",
    source_url: "https://dre.pt",
    issuing_body: "Assembleia da República",
    competent_authorities: ["PT-ANACOM"],
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
        title: "Satellite spectrum and ANACOM's dual mandate",
        summary:
          "Transposes the European Electronic Communications Code. Explicitly includes satellite networks. ANACOM manages the QNAF (national frequency allocation plan), coordinates satellite spectrum with ITU, issues radio frequency rights of use. ANACOM's role as BOTH telecom regulator and Space Authority creates a unique institutional configuration.",
      },
    ],
    related_sources: ["PT-SPACE-ACT-2019"],
    last_verified: "2026-04-14",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────

const CYBERSECURITY_PT: LegalSource[] = [
  {
    id: "PT-NIS2-2025",
    jurisdiction: "PT",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Legal Regime (NIS2 Transposition)",
    title_local: "Regime Jurídico da Cibersegurança",
    date_enacted: "2025-12-04",
    date_in_force: "2026-04-03",
    official_reference: "DL n.º 125/2025 (authorized by Lei n.º 59/2025)",
    source_url: "https://dre.pt",
    issuing_body: "Governo",
    competent_authorities: ["PT-CNCS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space as high-criticality sector",
        summary:
          "CNCS as competent authority. Space in NIS2 Annex I. Fines up to €10M or 2% global turnover. Portugal missed October 2024 deadline — EC reasoned opinion May 2025. In force 3 April 2026.",
      },
    ],
    related_sources: ["PT-SPACE-ACT-2019"],
    last_verified: "2026-04-14",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_PT: LegalSource[] = [
  {
    id: "PT-SPACE-STRATEGY-2030",
    jurisdiction: "PT",
    type: "policy_document",
    status: "in_force",
    title_en: "Portugal Space 2030 Strategy",
    title_local: "Estratégia Portugal Espaço 2030",
    date_published: "2018-03-12",
    official_reference: "RCM n.º 30/2018 (DR 1.ª Série, n.º 50)",
    source_url: "https://dre.pt",
    issuing_body: "Conselho de Ministros",
    competent_authorities: ["PT-PTSPACE", "PT-MECI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "Atlantic space nation",
        summary:
          "Portugal as 'an Atlantic nation recognized as a worldwide authority in space-Earth-climate-ocean interactions.' Targets: €500M annual space revenue, ~1,000 skilled jobs by 2030. Three axes: exploit space data, develop systems/infrastructure, build national capacity. CM25: €204.8M (record, 51% increase). ESA return exceeds €2.17 per euro invested.",
        complianceImplication:
          "87 companies, 46 research centres. 43% company growth, 65% revenue growth 2019-2023. New Space Portugal Mobilising Agenda: €417M.",
      },
    ],
    related_sources: ["PT-SPACE-ACT-2019"],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_PT: LegalSource[] = [
  ...TREATIES_PT,
  ...PRIMARY_LEGISLATION_PT,
  ...TELECOM_PT,
  ...CYBERSECURITY_PT,
  ...POLICY_PT,
];
