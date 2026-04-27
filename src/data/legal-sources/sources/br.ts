// src/data/legal-sources/sources/br.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
];
