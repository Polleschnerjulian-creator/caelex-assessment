// src/data/legal-sources/sources/za.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * South Africa — space-law sources and authorities.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_ZA: Authority[] = [
  {
    id: "ZA-SANSA",
    jurisdiction: "ZA",
    name_en: "South African National Space Agency",
    name_local: "South African National Space Agency",
    abbreviation: "SANSA",
    parent_ministry: "Department of Science, Technology and Innovation",
    website: "https://www.sansa.org.za/",
    space_mandate:
      "National space agency since 2010 (under Act 36 of 2008). Operates Earth observation, space science, space operations (Hartebeesthoek tracking station), and space engineering programmes. Technical advisor to DTIC on Space Affairs Council licensing.",
    legal_basis: "South African National Space Agency Act, No. 36 of 2008",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "ZA-SACOUNCIL",
    jurisdiction: "ZA",
    name_en: "South African Council for Space Affairs",
    name_local: "South African Council for Space Affairs",
    abbreviation: "SACSA",
    parent_ministry: "Department of Trade, Industry and Competition (DTIC)",
    website: "https://www.dtic.gov.za/",
    space_mandate:
      "Statutory licensing council under the Space Affairs Act 84 of 1993. Issues launch and space-object operation licences and maintains the South African space-objects registry.",
    legal_basis: "Space Affairs Act, No. 84 of 1993",
    applicable_areas: ["licensing", "registration", "liability"],
  },
];

export const LEGAL_SOURCES_ZA: LegalSource[] = [
  {
    id: "ZA-SPACE-AFFAIRS-ACT-1993",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Affairs Act",
    title_local: "Space Affairs Act, No. 84 of 1993",
    date_enacted: "1993-06-23",
    date_last_amended: "1995-06-30",
    official_reference: "Act No. 84 of 1993",
    source_url:
      "https://www.gov.za/sites/default/files/gcis_document/201409/act84of1993.pdf",
    issuing_body: "Parliament of the Republic of South Africa",
    competent_authorities: ["ZA-SACOUNCIL"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability", "insurance"],
    scope_description:
      "South Africa's primary space-activities statute. Establishes the SACSA Council, the licensing regime for launches and on-orbit operations, the national registry, and the indemnification framework. South Africa is one of the few African states with a comprehensive primary space statute.",
    key_provisions: [
      {
        section: "§ 5-9",
        title: "Licence required for space activities",
        summary:
          "Launches from South African territory and operation of South African-controlled space objects require a SACSA licence; the Council reviews technical, safety, and financial criteria.",
      },
      {
        section: "§ 13",
        title: "Liability and insurance",
        summary:
          "Operator strict liability for surface damage; mandatory third-party-liability insurance set by the Minister; State indemnification framework above the operator-insurance ceiling.",
      },
    ],
    related_sources: ["ZA-SANSA-ACT-2008", "INT-OST-1967"],
    last_verified: "2026-04-22",
  },
  {
    id: "ZA-SANSA-ACT-2008",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en: "South African National Space Agency Act",
    title_local: "South African National Space Agency Act, No. 36 of 2008",
    date_enacted: "2008-12-19",
    date_in_force: "2010-12-09",
    official_reference: "Act No. 36 of 2008",
    source_url:
      "https://www.gov.za/sites/default/files/gcis_document/201409/a36-08.pdf",
    issuing_body: "Parliament of the Republic of South Africa",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Establishes SANSA as a Schedule 3A public entity with a mandate over civil space programmes and as technical advisor to the SACSA Council. Coordinates South African civil space cooperation, including with ESA, NASA, JAXA, and the African Union.",
    key_provisions: [
      {
        section: "§ 5",
        title: "SANSA mandate",
        summary:
          "SANSA promotes the peaceful use of space, advises Government, and operates national civil-space infrastructure including the Hartebeesthoek deep-space tracking facility.",
      },
    ],
    related_sources: ["ZA-SPACE-AFFAIRS-ACT-1993"],
    last_verified: "2026-04-22",
  },
  {
    id: "ZA-OST-1968",
    jurisdiction: "ZA",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — South African Ratification",
    date_enacted: "1968-10-30",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of South Africa",
    competent_authorities: ["ZA-SACOUNCIL"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "South Africa's ratification of the OST. State-responsibility and registration obligations are discharged through the Space Affairs Act 1993 and SACSA procedures. South Africa is NOT a signatory to the Artemis Accords as of April 2026.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "South Africa is internationally responsible for national activities in outer space — discharged through the Space Affairs Act 1993 licensing framework.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-22",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Atlas P2 (2026-05-26): ZA sub-domain entries — Astronomy Geographic
  // Advantage Act (SKA Protection) + protection of Karoo radio-quiet zone.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ZA-SKA-PROTECTION-ACT",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en: "Astronomy Geographic Advantage Act 21 of 2007 (SKA Protection)",
    date_enacted: "2007-12-05",
    official_reference: "Act 21 of 2007",
    source_url:
      "https://www.gov.za/documents/astronomy-geographic-advantage-act",
    issuing_body: "Parliament of South Africa",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum", "scientific_research"],
    scope_description:
      "South Africa's foundational SKA-protection statute. Establishes Astronomy Advantage Areas in the Karoo region (Northern Cape) — protects the SKA-Mid + MeerKAT precursor + future SKA-Mid array from radio-frequency interference. Material for NGSO operators downlinking over southern Africa: regulated frequency assignments + power-flux-density limits.",
    key_provisions: [
      {
        section: "Sections 5-10",
        title: "Astronomy Advantage Areas + restrictions",
        summary:
          "Areas declared by Minister; activities producing radio-frequency interference within declared areas require authorisation from the Astronomy Management Authority + may trigger emission-limit conditions.",
      },
    ],
    related_sources: ["INT-ITU-RR-ART-29", "AU-MURCHISON-RADIO-QUIET"],
    last_verified: "2026-05-26",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Atlas P4+ (2026-05-26): South Africa deepening — POPIA, Cybercrimes
  // Act 2020, Hartebeesthoek deep-space station, African Union Space
  // Policy implementation, BRICS Space Cooperation, NSP 2009, ITAC export
  // control. Rounds out major African space jurisdiction coverage
  // alongside EG (✓).
  // ═══════════════════════════════════════════════════════════════════════

  // ─── National Space Policy + AU implementation ───────────────────────
  {
    id: "ZA-NATIONAL-SPACE-POLICY-2009",
    jurisdiction: "ZA",
    type: "policy_document",
    status: "in_force",
    title_en: "South African National Space Policy",
    date_published: "2009-08-14",
    date_last_amended: "2020-01-01",
    source_url:
      "https://www.dst.gov.za/index.php/resource-center/strategies-and-reports",
    issuing_body: "Department of Science and Innovation",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["state_aid", "procurement"],
    scope_description:
      "Foundational NSP establishing national space-policy goals + SANSA mandate framework. Priorities: human capital, Earth observation for development, satellite communications, space science (SKA), space engineering. 2020 update aligned with African Union Space Policy + Strategy. Material strategic context for foreign-ZA cooperation + procurement.",
    key_provisions: [],
    related_sources: ["ZA-SANSA-ACT-2008"],
    last_verified: "2026-05-26",
  },
  {
    id: "ZA-AFRICAN-UNION-SPACE-IMPL",
    jurisdiction: "ZA",
    type: "multilateral_agreement",
    status: "in_force",
    title_en:
      "African Union Space Policy + Strategy — South African Implementation",
    date_enacted: "2017-01-30",
    date_last_amended: "2024-01-01",
    source_url: "https://au.int/en/space",
    issuing_body: "African Union / Department of Science and Innovation",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "ZA leads African Union Space Policy implementation alongside Egypt (AfSA host). African Resource Management Constellation (ARMC) — joint SA + Algeria + Kenya + Nigeria EO constellation. Material for any African-regional space-cooperation deal + cross-border data-sharing arrangements.",
    key_provisions: [],
    related_sources: ["EG-AFRICAN-SPACE-POLICY", "EG-AFSA-HQ-AGREEMENT-2023"],
    last_verified: "2026-05-26",
  },

  // ─── Hartebeesthoek deep-space station ───────────────────────────────
  {
    id: "ZA-HARTEBEESTHOEK-FRAMEWORK",
    jurisdiction: "ZA",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Hartebeesthoek Radio Astronomy Observatory + Deep-Space Station Framework",
    date_enacted: "1961-01-01",
    date_last_amended: "2024-01-01",
    source_url: "https://www.sansa.org.za/space-operations/",
    issuing_body: "SANSA Space Operations",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "high",
    applicable_to: ["ground_segment", "data_provider"],
    compliance_areas: ["frequency_spectrum", "procurement"],
    scope_description:
      "SANSA operates Hartebeesthoek deep-space tracking + communications station — supports NASA Deep Space Network (DSN), ESA ESTRACK, KARI Danuri, JAXA missions, and Mars-bound craft. Strategic Southern Hemisphere coverage gap-filler. Material for any deep-space mission considering Southern Hemisphere ground-station coverage.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── Data Protection + Cybersecurity ─────────────────────────────────
  {
    id: "ZA-POPIA-2013",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en: "Protection of Personal Information Act (POPIA)",
    date_enacted: "2013-11-19",
    date_in_force: "2021-07-01",
    official_reference: "Act 4 of 2013",
    source_url:
      "https://www.gov.za/documents/protection-personal-information-act",
    issuing_body: "Parliament of South Africa",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "South Africa's GDPR-aligned data protection statute. Fully effective from July 2021. Information Regulator (SA) enforces. Cross-border transfers require adequacy assessment or appropriate safeguards. Material for satcom subscriber data + space-derived personal data + ground-segment operator data with ZA data-subject nexus.",
    key_provisions: [],
    related_sources: ["ZA-CYBERCRIMES-ACT-2020"],
    last_verified: "2026-05-26",
  },
  {
    id: "ZA-CYBERCRIMES-ACT-2020",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybercrimes Act",
    date_enacted: "2020-06-01",
    date_in_force: "2021-12-01",
    official_reference: "Act 19 of 2020",
    source_url: "https://www.gov.za/documents/cybercrimes-act",
    issuing_body: "Parliament of South Africa",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity"],
    scope_description:
      "Cybersecurity framework covering unauthorized access, data interference, malicious communications. South African Police Service Cybercrime Unit + State Security Agency operate enforcement. Material for satcom + ground-segment operators handling South African subscriber traffic.",
    key_provisions: [],
    related_sources: ["ZA-POPIA-2013"],
    last_verified: "2026-05-26",
  },

  // ─── Export control + Defence ────────────────────────────────────────
  {
    id: "ZA-NCACC-EXPORT-CONTROL",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en:
      "National Conventional Arms Control Act + Export Control Framework",
    date_enacted: "2002-12-20",
    date_last_amended: "2024-01-01",
    official_reference: "Act 41 of 2002",
    source_url: "https://www.dirco.gov.za/ncacc/",
    issuing_body: "Parliament of South Africa / NCACC",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: [
      "export_control",
      "military_dual_use",
      "sanctions_compliance",
    ],
    scope_description:
      "South Africa's primary export-control framework administered by NCACC (National Conventional Arms Control Committee). South Africa is member of MTCR (1995), NSG (1995), Wassenaar Arrangement (1996), Australia Group (1994). Material for cross-border dual-use space-tech transactions involving South African counterparties — including DENEL Dynamics + Honeywell South Africa.",
    key_provisions: [],
    related_sources: ["ZA-ITAC-FRAMEWORK"],
    last_verified: "2026-05-26",
  },
  {
    id: "ZA-ITAC-FRAMEWORK",
    jurisdiction: "ZA",
    type: "federal_regulation",
    status: "in_force",
    title_en: "International Trade Administration Commission — Dual-Use Items",
    date_enacted: "2002-12-20",
    date_last_amended: "2024-01-01",
    source_url: "http://www.itac.org.za/",
    issuing_body: "International Trade Administration Commission",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "ITAC administers South African import + export controls including dual-use items. Operates Strategic Goods List aligned with Wassenaar Annex. Material for any space-component supplier importing or exporting via South African ports + supply chains.",
    key_provisions: [],
    related_sources: ["ZA-NCACC-EXPORT-CONTROL"],
    last_verified: "2026-05-26",
  },
  {
    id: "ZA-DEFENCE-INTEL-SPACE",
    jurisdiction: "ZA",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Defence Review 2015 + Space-Related Provisions",
    date_published: "2015-03-19",
    source_url: "https://www.gov.za/documents/defence-review-2015",
    issuing_body: "Department of Defence",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "fdi_screening"],
    scope_description:
      "Defence Review 2015 includes space-tech provisions: South African military intelligence space requirements, dual-use technology partnerships (DENEL Dynamics + ARMSCOR procurement), and BRICS+ defence-space cooperation. Material context for FDI screening of South African space-tech firms.",
    key_provisions: [],
    related_sources: ["ZA-NCACC-EXPORT-CONTROL"],
    last_verified: "2026-05-26",
  },

  // ─── BRICS cooperation ───────────────────────────────────────────────
  {
    id: "ZA-BRICS-SPACE-COOP",
    jurisdiction: "ZA",
    type: "multilateral_agreement",
    status: "in_force",
    title_en:
      "BRICS Space Cooperation — Remote Sensing Satellite Constellation",
    date_enacted: "2015-11-18",
    date_last_amended: "2024-08-22",
    source_url: "https://infobrics.org/",
    issuing_body: "BRICS Space Cooperation Joint Committee",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["procurement", "fdi_screening"],
    scope_description:
      "BRICS (Brazil, Russia, India, China, South Africa, +new members) Space Cooperation Joint Committee + Remote Sensing Satellite Constellation MOU 2015. Joint Earth observation data-sharing. SANSA leads African data-sharing implementation. Significant given BRICS+ expansion 2024 (Egypt, UAE, Iran etc.) + Western alignment dynamics. Material precedent for non-aligned space-cooperation alongside Artemis Accords.",
    key_provisions: [],
    related_sources: ["BR-CBERS-COOPERATION", "EG-AFRICAN-SPACE-POLICY"],
    last_verified: "2026-05-26",
  },
  {
    id: "ZA-CHINA-LUNAR-MOU",
    jurisdiction: "ZA",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "China-South Africa Lunar Research Station MOU",
    date_enacted: "2024-09-04",
    source_url: "https://www.cnsa.gov.cn/english/",
    issuing_body: "CNSA + SANSA",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "South Africa signed bilateral lunar cooperation MOU with China September 2024 — joined International Lunar Research Station (ILRS) framework alongside Russia. Material political signal: ZA has NOT signed Artemis Accords (unlike Brazil). Reinforces South African positioning between competing space-cooperation frameworks.",
    key_provisions: [],
    related_sources: ["CN-LUNAR-COOP-MOUS"],
    last_verified: "2026-05-26",
  },

  // ─── Commercial space ────────────────────────────────────────────────
  {
    id: "ZA-EOS-SAT-1-FRAMEWORK",
    jurisdiction: "ZA",
    type: "policy_document",
    status: "in_force",
    title_en: "EOS SAT-1 + South African Commercial EO Cooperation Framework",
    date_published: "2023-01-03",
    source_url: "https://eos.com/",
    issuing_body: "SANSA + EOS Data Analytics partnerships",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "low",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["procurement"],
    scope_description:
      "South African commercial EO partnerships including ZA-flagged EOS SAT-1 (launched January 2023). Demonstrates commercial-space sector engagement alongside SANSA's institutional missions. Material for foreign commercial EO firms seeking South African market entry + government data-services contracts.",
    key_provisions: [],
    related_sources: ["ZA-AFRICAN-UNION-SPACE-IMPL"],
    last_verified: "2026-05-26",
  },

  // ─── FDI ──────────────────────────────────────────────────────────────
  {
    id: "ZA-COMPETITION-ACT-FDI",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Competition Act + 2020 Foreign Direct Investment Screening Amendment",
    date_enacted: "1998-09-30",
    date_last_amended: "2020-07-01",
    official_reference: "Act 89 of 1998 + Competition Amendment Act 18/2018",
    source_url: "https://www.gov.za/documents/competition-act",
    issuing_body: "Parliament of South Africa",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening", "competition_antitrust"],
    scope_description:
      "South African merger-control framework + 2018 amendment introduced national-security review for foreign mergers in identified sectors. Section 18A — Presidential national-security designation power applies to defence + telecommunications + critical-infrastructure space-tech firms. Material for cross-border M&A involving South African space-tech.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
];
