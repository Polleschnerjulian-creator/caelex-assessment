// src/data/legal-sources/sources/br.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Brazil — space-law sources and authorities.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_BR: Authority[] = [
  {
    id: "BR-AEB",
    jurisdiction: "BR",
    name_en: "Brazilian Space Agency",
    name_local: "Agência Espacial Brasileira",
    abbreviation: "AEB",
    parent_ministry: "Ministry of Science, Technology and Innovation",
    website: "https://www.gov.br/aeb/",
    space_mandate:
      "Civil-space agency since 1994. Co-authority with DECEA on launch authorisations from Alcântara and other Brazilian sites; principal contact for international space cooperation including the US-Brazil Technology Safeguards Agreement.",
    legal_basis: "Law No. 8854 of 10 February 1994",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "BR-DECEA",
    jurisdiction: "BR",
    name_en: "Department of Airspace Control",
    name_local: "Departamento de Controle do Espaço Aéreo",
    abbreviation: "DECEA",
    parent_ministry: "Brazilian Air Force",
    website: "https://www.decea.mil.br/",
    space_mandate:
      "Operational authority over Brazilian airspace including launch-vehicle transit, range coordination at Alcântara Launch Centre (CLA), and operational safety for orbital and suborbital launches.",
    legal_basis: "Brazilian Aeronautical Code (Law 7565/1986)",
    applicable_areas: ["licensing"],
  },
  {
    id: "BR-ANATEL",
    jurisdiction: "BR",
    name_en: "National Telecommunications Agency",
    name_local: "Agência Nacional de Telecomunicações",
    abbreviation: "ANATEL",
    website: "https://www.gov.br/anatel/",
    space_mandate:
      "Frequency-spectrum allocation and satellite-radio licensing. Issues right-of-exploitation grants for satellite spectrum serving Brazilian customers and ITU coordination filings for Brazilian satellite systems.",
    legal_basis: "General Telecommunications Law 9472/1997",
    applicable_areas: ["frequency_spectrum"],
  },
];

export const LEGAL_SOURCES_BR: LegalSource[] = [
  {
    id: "BR-DECREE-91040-1985",
    jurisdiction: "BR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Decree No. 91.040 of 1985 — Brazilian Complete Space Mission",
    title_local:
      "Decreto Nº 91.040, de 31 de Março de 1985 — Missão Espacial Completa Brasileira",
    date_enacted: "1985-03-31",
    official_reference: "Diário Oficial da União, 1985-04-01",
    source_url:
      "https://www.planalto.gov.br/ccivil_03/decreto/1980-1989/d91040.htm",
    issuing_body: "Presidency of the Federative Republic of Brazil",
    competent_authorities: ["BR-AEB"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Foundational executive instrument creating the Brazilian Complete Space Mission framework — the cross-departmental institutional structure that pre-dates and continues alongside the AEB. Operative basis for the Alcântara Launch Centre's role in the national programme.",
    key_provisions: [
      {
        section: "Art. 2",
        title: "MECB programme objectives",
        summary:
          "Set the original objective of an autonomous Brazilian launch capability and Earth-observation satellite series, executed jointly by AEB-predecessor entities, INPE, and the Air Force.",
      },
    ],
    related_sources: ["BR-AEB-LAW-1994"],
    last_verified: "2026-04-22",
  },
  {
    id: "BR-AEB-LAW-1994",
    jurisdiction: "BR",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law No. 8854 of 1994 — Establishment of the Brazilian Space Agency",
    title_local:
      "Lei nº 8.854, de 10 de fevereiro de 1994 — Criação da Agência Espacial Brasileira",
    date_enacted: "1994-02-10",
    official_reference: "Lei nº 8.854/1994",
    source_url: "https://www.planalto.gov.br/ccivil_03/leis/l8854.htm",
    issuing_body: "National Congress",
    competent_authorities: ["BR-AEB"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Establishes AEB as a civil federal autarchy, transferring civil-space coordination from the military to a civilian-led structure. AEB's mandate: coordinate the National Space Activities Programme (PNAE), represent Brazil internationally, and (jointly with DECEA) authorise space activities.",
    key_provisions: [
      {
        section: "Art. 2-4",
        title: "AEB structure and mandate",
        summary:
          "AEB receives competence over the planning and coordination of civil space activities, including authorisation responsibilities later detailed in AEB Resolutions and the Aeronautical Code.",
      },
    ],
    related_sources: ["BR-DECREE-91040-1985"],
    last_verified: "2026-04-22",
  },
  {
    id: "BR-OST-1969",
    jurisdiction: "BR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Brazilian Ratification",
    date_enacted: "1969-03-05",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of Brazil",
    competent_authorities: ["BR-AEB"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Brazil's ratification of the OST. State-responsibility obligations under Art. VI are discharged via inter-departmental authorisation procedures (AEB + DECEA) given the absence of a comprehensive primary statute. Brazil signed the Artemis Accords in June 2021.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "Brazil is internationally responsible for national activities in outer space. Domestic authorisation flows through AEB and DECEA, supplemented by US-Brazil Technology Safeguards Agreement obligations for Alcântara launches.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-04-22",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Atlas P4+ (2026-05-26): Brazil deepening — Alcântara operations, US-
  // Brazil TSA implementation, INPE remote sensing, CBERS Sino-Brazilian,
  // LGPD + Marco Civil, MTCR (1995), VLM-1 launch vehicle, ANATEL
  // landing-rights, Starlink Brazil authorisation, Artemis 2021, Quilombola
  // consultation. Rounds out Latin America coverage.
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Alcântara Launch Center ─────────────────────────────────────────
  {
    id: "BR-ALCANTARA-OPERATIONAL-FRAMEWORK",
    jurisdiction: "BR",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Alcântara Launch Center (CLA) Operational + Range-Safety Framework",
    title_local: "Centro de Lançamento de Alcântara (CLA)",
    date_enacted: "1989-09-01",
    date_last_amended: "2024-01-01",
    source_url: "https://www2.fab.mil.br/cla/",
    issuing_body: "Brazilian Air Force / AEB",
    competent_authorities: ["BR-AEB", "BR-DECEA"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing", "environmental"],
    scope_description:
      "Alcântara Launch Center (CLA) — Brazilian Air Force-operated launch site, equatorial location (~2.3°S) makes it strategically valuable for geostationary + escape-trajectory launches. Range-safety + airspace integration coordinated by COMAER + DECEA. Material framework for any foreign launch provider considering CLA operations under the 2019 US-Brazil Technology Safeguards Agreement.",
    key_provisions: [],
    related_sources: ["BR-US-TSA-2019", "BR-ALCANTARA-INDIGENOUS-CONSULTATION"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-US-TSA-2019",
    jurisdiction: "BR",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "US-Brazil Technology Safeguards Agreement Implementation (Decree 9.967/2019)",
    title_local: "Decreto 9.967/2019 — Acordo de Salvaguardas Tecnológicas",
    date_enacted: "2019-03-19",
    date_in_force: "2019-12-23",
    official_reference: "Decree 9.967/2019",
    source_url:
      "http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/decreto/D9967.htm",
    issuing_body: "Office of the President + Brazilian Congress",
    competent_authorities: ["BR-AEB"],
    relevance_level: "high",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "Domestic implementation of the 2019 US-Brazil TSA via Presidential Decree. Successor to the abandoned 2000 framework. Enables US-built payloads + launch components at Alcântara under ITAR-equivalent technology-control protocols. Material precedent for Latin American commercial-launch host states.",
    key_provisions: [],
    related_sources: ["INT-US-BRAZIL-TIA-2019"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-ALCANTARA-INDIGENOUS-CONSULTATION",
    jurisdiction: "BR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Alcântara Quilombola + Indigenous Consultation Framework",
    title_local: "Marco de Consulta Quilombola e Indígena — CLA Alcântara",
    date_enacted: "1988-10-05",
    date_last_amended: "2024-01-01",
    source_url: "https://www.gov.br/funai/pt-br",
    issuing_body: "Government of Brazil / FUNAI + Fundação Cultural Palmares",
    competent_authorities: ["BR-AEB"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental", "consumer_protection"],
    scope_description:
      "ILO Convention 169 implementation + Brazilian Constitution Article 68 protections for Quilombola communities on Alcântara peninsula + Indigenous consultation. CLA expansion repeatedly faced litigation 2008-2022 over inadequate Quilombola consultation. 2024 framework requires free + prior + informed consent (FPIC) before any major CLA expansion. Material for foreign launch providers' EIA + community-acceptance planning.",
    key_provisions: [],
    related_sources: ["BR-ALCANTARA-OPERATIONAL-FRAMEWORK"],
    last_verified: "2026-05-26",
  },

  // ─── INPE + Remote sensing ───────────────────────────────────────────
  {
    id: "BR-INPE-CHARTER",
    jurisdiction: "BR",
    type: "federal_law",
    status: "in_force",
    title_en: "National Institute for Space Research (INPE) Charter",
    title_local: "Instituto Nacional de Pesquisas Espaciais (INPE)",
    date_enacted: "1971-04-22",
    date_last_amended: "2024-01-01",
    source_url: "http://www.inpe.br/",
    issuing_body: "Ministry of Science, Technology and Innovation",
    competent_authorities: ["BR-AEB"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["procurement", "scientific_research"],
    scope_description:
      "INPE — Brazil's primary space research institute. Operates CBERS Sino-Brazilian satellites, Amazonia-1/2 remote sensing, AEB satellite control center, deforestation monitoring (PRODES + DETER systems globally significant). Material counterparty for foreign Earth-observation customers + data-services partnerships.",
    key_provisions: [],
    related_sources: ["BR-CBERS-COOPERATION", "BR-AMAZONIA-MISSION"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-CBERS-COOPERATION",
    jurisdiction: "BR",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "China-Brazil Earth Resources Satellite (CBERS) Programme Framework",
    title_local: "Satélite Sino-Brasileiro de Recursos Terrestres (CBERS)",
    date_enacted: "1988-07-06",
    date_last_amended: "2024-01-01",
    source_url: "http://www.cbers.inpe.br/",
    issuing_body: "INPE + China Aerospace Science and Technology Corporation",
    competent_authorities: ["BR-AEB"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["procurement", "fdi_screening"],
    scope_description:
      "Foundational Sino-Brazilian space cooperation — CBERS series since 1999 (CBERS-1 to CBERS-4A operational). Multi-decade joint Earth-observation programme — significant given Brazil's BRICS+ positioning + ongoing Western/Chinese space-bloc dynamics. Material precedent for non-aligned commercial-Earth-observation cooperation.",
    key_provisions: [],
    related_sources: ["CN-LUNAR-COOP-MOUS"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-AMAZONIA-MISSION",
    jurisdiction: "BR",
    type: "policy_document",
    status: "in_force",
    title_en: "Amazonia Mission — Indigenous Brazilian EO Programme",
    date_published: "2021-02-28",
    source_url: "http://www.inpe.br/amazonia1/",
    issuing_body: "INPE",
    competent_authorities: ["BR-AEB"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["scientific_research"],
    scope_description:
      "Amazonia-1 (launched February 2021 on ISRO PSLV) — first wholly-Brazilian-built satellite for Amazon-region deforestation monitoring. Amazonia-2 development underway. Demonstrates Brazil's growing indigenous-build capability (~80% national content). Material for foreign EO-data services with Brazil market focus.",
    key_provisions: [],
    related_sources: ["BR-INPE-CHARTER"],
    last_verified: "2026-05-26",
  },

  // ─── Data Protection (LGPD) + Marco Civil ────────────────────────────
  {
    id: "BR-LGPD-2018",
    jurisdiction: "BR",
    type: "federal_law",
    status: "in_force",
    title_en: "General Data Protection Law (LGPD)",
    title_local: "Lei Geral de Proteção de Dados (LGPD)",
    date_enacted: "2018-08-14",
    date_in_force: "2020-09-18",
    official_reference: "Law 13.709/2018",
    source_url:
      "http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm",
    issuing_body: "Brazilian Congress",
    competent_authorities: ["BR-ANATEL"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "Brazil's GDPR-equivalent statute. ANPD (National Data Protection Authority) enforces. Applies to satcom subscriber data + space-derived personal data + ground-segment operator data with Brazilian data-subject nexus. Cross-border transfers require adequacy assessment or appropriate safeguards (standard contracts, certifications, BCRs).",
    key_provisions: [],
    related_sources: ["BR-MARCO-CIVIL-INTERNET"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-MARCO-CIVIL-INTERNET",
    jurisdiction: "BR",
    type: "federal_law",
    status: "in_force",
    title_en: "Marco Civil da Internet (Internet Civil Rights Framework)",
    title_local: "Marco Civil da Internet",
    date_enacted: "2014-04-23",
    date_last_amended: "2024-01-01",
    official_reference: "Law 12.965/2014",
    source_url:
      "http://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm",
    issuing_body: "Brazilian Congress",
    competent_authorities: ["BR-ANATEL"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["data_security", "cybersecurity"],
    scope_description:
      "Foundational internet rights statute covering net neutrality, intermediary liability, data retention (12 months for connection logs, 6 months for application logs). Material for satcom + ground-segment operators with Brazilian subscriber traffic — particularly relevant for direct-to-cellphone satellite operators (Starlink, AST SpaceMobile partnerships with Brazilian MNOs).",
    key_provisions: [],
    related_sources: ["BR-LGPD-2018"],
    last_verified: "2026-05-26",
  },

  // ─── National Space Programme + VLM ──────────────────────────────────
  {
    id: "BR-PNAE-2022-2031",
    jurisdiction: "BR",
    type: "policy_document",
    status: "in_force",
    title_en: "Brazilian Space Program (PNAE) 2022-2031",
    title_local: "Programa Nacional de Atividades Espaciais 2022-2031",
    date_published: "2022-04-20",
    source_url: "https://www.gov.br/aeb/pt-br",
    issuing_body: "Brazilian Space Agency (AEB)",
    competent_authorities: ["BR-AEB"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["state_aid", "procurement"],
    scope_description:
      "10-year strategic plan governing all Brazilian space activities. Priorities: indigenous launch capability (VLM Microsatellite Launch Vehicle, follow-on VLS development), CBERS programme continuation, Amazonia-2/3 satellites, Alcântara commercialisation. Material strategic context for foreign-Brazilian space cooperation + procurement.",
    key_provisions: [],
    related_sources: ["BR-AEB-LAW-1994", "BR-ALCANTARA-OPERATIONAL-FRAMEWORK"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-VLM-PROGRAM",
    jurisdiction: "BR",
    type: "policy_document",
    status: "in_force",
    title_en: "Microsatellite Launch Vehicle (VLM-1) Development Programme",
    title_local: "Veículo Lançador de Microssatélites (VLM-1)",
    date_published: "2007-01-01",
    source_url: "https://www.gov.br/aeb/",
    issuing_body: "AEB / Brazilian Air Force / DLR cooperation",
    competent_authorities: ["BR-AEB"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["procurement"],
    scope_description:
      "Brazilian-German VLM-1 microsatellite launch vehicle programme. Replaced abandoned VLS programme after 2003 Alcântara accident. Targets ~150 kg payload to LEO from Alcântara. First orbital flight planned 2026-2027. Material for foreign launch-vehicle technology cooperation + Brazilian indigenous-launch ambitions.",
    key_provisions: [],
    related_sources: ["BR-ALCANTARA-OPERATIONAL-FRAMEWORK"],
    last_verified: "2026-05-26",
  },

  // ─── ANATEL satellite services ───────────────────────────────────────
  {
    id: "BR-ANATEL-SATELLITE-LANDING-RIGHTS",
    jurisdiction: "BR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "ANATEL Satellite Landing Rights Framework",
    title_local: "Regulamento de Direitos de Pouso de Sinais de Satélite",
    date_enacted: "2014-09-23",
    date_last_amended: "2024-01-01",
    official_reference: "ANATEL Resolution 638/2014",
    source_url: "https://www.anatel.gov.br/",
    issuing_body: "ANATEL — National Telecommunications Agency",
    competent_authorities: ["BR-ANATEL"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum", "licensing"],
    scope_description:
      "ANATEL framework for foreign satellite operators providing services into Brazil. Requires landing-rights authorisation, ITU coordination, technical-conformance, fiscal-equivalence (Brazilian operators receive reciprocity). Starlink, OneWeb, Hughes, Iridium operate under this framework. Material for any foreign satcom operator entering Brazilian market.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-ANATEL-STARLINK-AUTH-2022",
    jurisdiction: "BR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "ANATEL Starlink Operating Authorisation",
    date_enacted: "2022-01-25",
    source_url: "https://www.anatel.gov.br/",
    issuing_body: "ANATEL",
    competent_authorities: ["BR-ANATEL"],
    relevance_level: "medium",
    applicable_to: ["constellation_operator"],
    compliance_areas: ["frequency_spectrum", "competition_antitrust"],
    scope_description:
      "ANATEL authorisation for Starlink to operate in Brazil (Resolution 651/2022). Conditioned on local-presence requirements + frequency-coordination + interconnection obligations. Major political-economic significance — Starlink became significant Amazon-region connectivity provider, with political tensions including 2024 X-Brazil court rulings affecting Starlink operations. Material precedent for NGSO operator-government engagement.",
    key_provisions: [],
    related_sources: ["BR-ANATEL-SATELLITE-LANDING-RIGHTS"],
    last_verified: "2026-05-26",
  },

  // ─── Defence + Export Control ────────────────────────────────────────
  {
    id: "BR-MTCR-MEMBERSHIP-1995",
    jurisdiction: "BR",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "Brazil MTCR Membership",
    date_enacted: "1995-10-27",
    source_url: "https://mtcr.info/",
    issuing_body: "Missile Technology Control Regime",
    competent_authorities: ["BR-AEB"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["export_control"],
    scope_description:
      "Brazil became MTCR member October 1995. Material constraint on Brazilian launch-vehicle export — VLM-1 + future indigenous launch-vehicle programmes design within MTCR Category I + II compliance. Brazilian export-control framework aligned with MTCR Annex.",
    key_provisions: [],
    related_sources: ["BR-EXPORT-CONTROL-LAW"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-EXPORT-CONTROL-LAW",
    jurisdiction: "BR",
    type: "federal_law",
    status: "in_force",
    title_en: "Brazilian Sensitive Goods Export Control Framework",
    title_local:
      "Lei 9.112/95 e Decreto 9.735/2019 — Controle de Bens Sensíveis",
    date_enacted: "1995-10-12",
    date_last_amended: "2019-03-08",
    official_reference: "Law 9.112/1995 + Decree 9.735/2019",
    source_url: "http://www.planalto.gov.br/ccivil_03/leis/l9112.htm",
    issuing_body: "Brazilian Congress / Office of the President",
    competent_authorities: ["BR-AEB"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: [
      "export_control",
      "military_dual_use",
      "sanctions_compliance",
    ],
    scope_description:
      "Brazil's sensitive-goods export-control framework. CIBES (Inter-ministerial Sensitive Goods Commission) administers licensing. Brazil is member of MTCR (1995), NSG (1996), Wassenaar Arrangement (1996), Australia Group. Material for cross-border dual-use space-tech transactions involving Brazilian counterparties.",
    key_provisions: [],
    related_sources: ["BR-MTCR-MEMBERSHIP-1995"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-DEFENSE-WHITE-PAPER-SPACE",
    jurisdiction: "BR",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Brazilian Defense White Paper — Space Chapter",
    title_local: "Livro Branco de Defesa Nacional — Capítulo Espacial",
    date_published: "2020-07-29",
    date_last_amended: "2024-12-01",
    source_url: "https://www.gov.br/defesa/pt-br",
    issuing_body: "Ministry of Defense",
    competent_authorities: ["BR-AEB"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "fdi_screening"],
    scope_description:
      "Brazilian Defense White Paper space chapter. Brazilian Air Force Space Operations Command (COMAE) established 2019. Articulates strategic + dual-use priorities. Material for FDI screening of Brazilian space-tech firms with defence touchpoints + cross-border M&A involving CIDE-Espaço incentives.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── International cooperation ────────────────────────────────────────
  {
    id: "BR-ARTEMIS-ACCORDS-2021",
    jurisdiction: "BR",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "Brazil Artemis Accords Signing",
    date_enacted: "2021-06-15",
    source_url:
      "https://www.nasa.gov/news-release/brazil-signs-artemis-accords/",
    issuing_body: "Government of Brazil",
    competent_authorities: ["BR-AEB"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Brazil signed Artemis Accords 15 June 2021 (12th signatory, first South American). Material political signal under Bolsonaro government; subsequent Lula government 2023+ has maintained signature but pursued more balanced + BRICS+ space cooperation alongside Artemis. Material precedent for non-aligned Artemis participation.",
    key_provisions: [],
    related_sources: ["INT-ARTEMIS-ACCORDS-2020", "BR-CBERS-COOPERATION"],
    last_verified: "2026-05-26",
  },
  {
    id: "BR-MERCOSUR-SPACE-COOP",
    jurisdiction: "BR",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "Mercosur Space Cooperation Framework (Brazilian Implementation)",
    date_enacted: "2015-12-21",
    source_url: "https://www.mercosur.int/",
    issuing_body: "Mercosur Common Market Council",
    competent_authorities: ["BR-AEB"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Mercosur (Argentina, Brazil, Paraguay, Uruguay) space cooperation framework. Brazil-Argentina lead implementers via AEB-CONAE bilateral working groups. SABIA-Mar (Brazil-Argentina) ocean-monitoring satellite in development. Material for regional Latin-America space-cooperation context.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── Foreign investment ──────────────────────────────────────────────
  {
    id: "BR-FOREIGN-INVESTMENT-CMN",
    jurisdiction: "BR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Foreign Investment Framework — Space Sector Provisions",
    title_local: "Marco de Investimento Estrangeiro no Setor Espacial",
    date_enacted: "2010-05-04",
    date_last_amended: "2024-01-01",
    source_url: "https://www.bcb.gov.br/",
    issuing_body: "Central Bank of Brazil (BCB) / CMN",
    competent_authorities: ["BR-AEB"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Brazil's general foreign-investment framework. Space sector NOT on Restricted Sectors list — generally permissive for inbound FDI. National-security review possible for specific cross-border deals affecting Alcântara or defence-space programmes. Material for foreign space-tech firm investment + JV structuring.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
];
