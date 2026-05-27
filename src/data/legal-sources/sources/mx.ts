// src/data/legal-sources/sources/mx.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Mexico — space-law sources and authorities.
 *
 * AEM (Mexican Space Agency) established 2010 by Law published in
 * the Diario Oficial. Satmex (now Eutelsat Americas) — former Mexican
 * national satellite operator privatised 1997 + acquired by Eutelsat
 * 2013. USMCA space-services chapter applies.
 *
 * Atlas P1 (2026-05-26): new jurisdiction, target 10 sources per
 * ATLAS-CORPUS-EXPANSION-PLAN.md § 5.I.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_MX: Authority[] = [
  {
    id: "MX-AEM",
    jurisdiction: "MX",
    name_en: "Mexican Space Agency",
    name_local: "Agencia Espacial Mexicana",
    abbreviation: "AEM",
    parent_ministry: "Ministry of Communications and Transport",
    website: "https://www.gob.mx/aem",
    space_mandate:
      "National space agency. Established by Law published in the Diario Oficial 30 July 2010. Coordinates national space policy + space-development programmes. Authority for satellite registry + international cooperation. Operational satellite-services regulation delegated to IFT.",
    legal_basis: "Mexican Space Agency Law (DOF 30 July 2010)",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "MX-IFT",
    jurisdiction: "MX",
    name_en: "Federal Telecommunications Institute",
    name_local: "Instituto Federal de Telecomunicaciones",
    abbreviation: "IFT",
    website: "https://www.ift.org.mx/",
    space_mandate:
      "Autonomous constitutional regulator (Article 28 amendments 2013). National notifying administration for ITU filings. Issues satcom-services concessions + earth-station authorisations. Reviewed the 2013 Satmex-Eutelsat acquisition.",
    legal_basis:
      "Mexican Constitution Article 28; Federal Telecommunications and Broadcasting Law 2014",
    applicable_areas: ["frequency_spectrum", "competition_antitrust"],
  },
  {
    id: "MX-INAI",
    jurisdiction: "MX",
    name_en:
      "National Institute of Transparency, Access to Information and Personal Data Protection",
    name_local:
      "Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales",
    abbreviation: "INAI",
    website: "https://home.inai.org.mx/",
    space_mandate:
      "Autonomous data-protection authority. Enforces Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP). Applies to satcom subscriber data + satellite-derived personal data handled by private operators.",
    legal_basis: "LFPDPPP 2010 + General Data Protection Law 2017",
    applicable_areas: ["data_security"],
  },
];

export const LEGAL_SOURCES_MX: LegalSource[] = [
  {
    id: "MX-OST-1968",
    jurisdiction: "MX",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Mexico Ratification",
    date_enacted: "1968-01-31",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of Mexico",
    competent_authorities: ["MX-AEM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Mexico is a party to the OST. State-responsibility obligations operationally administered by AEM + IFT. Mexico is a signatory to all five UN space treaties.",
    key_provisions: [],
    related_sources: ["INT-OST-1967", "MX-AEM-LAW-2010"],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-AEM-LAW-2010",
    jurisdiction: "MX",
    type: "federal_law",
    status: "in_force",
    title_en: "Mexican Space Agency Law",
    title_local: "Ley que crea la Agencia Espacial Mexicana",
    date_enacted: "2010-07-30",
    source_url: "https://www.diputados.gob.mx/LeyesBiblio/pdf/LAEM.pdf",
    issuing_body: "Mexican Congress",
    competent_authorities: ["MX-AEM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    scope_description:
      "Founding instrument of AEM. Decentralised public body coordinating national space policy + R&D + international cooperation. Operational satcom-services licensing delegated to IFT under the Federal Telecommunications + Broadcasting Law.",
    key_provisions: [],
    related_sources: ["MX-CONSTITUTIONAL-ART-27"],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-CONSTITUTIONAL-ART-27",
    jurisdiction: "MX",
    type: "federal_law",
    status: "in_force",
    title_en: "Mexican Constitution Article 27 (National-Security Telecoms)",
    title_local: "Constitución Política — Artículo 27",
    date_enacted: "1917-02-05",
    source_url: "https://www.diputados.gob.mx/LeyesBiblio/index.htm",
    issuing_body: "Mexican Constituent Assembly",
    competent_authorities: ["MX-IFT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening", "frequency_spectrum"],
    scope_description:
      "Constitutional foundation. Article 27 + Article 28 govern national-security telecoms + state-owned utilities. Foreign-investment in Mexican telecoms historically restricted; 2013 constitutional reform liberalised but maintained sectoral approval thresholds.",
    key_provisions: [],
    related_sources: ["MX-FOREIGN-INVESTMENT-LAW"],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-IFT-SAT-CONCESSIONS",
    jurisdiction: "MX",
    type: "federal_regulation",
    status: "in_force",
    title_en: "IFT Satellite Concessions Framework",
    title_local: "Concesiones para Servicios Satelitales — IFT",
    date_enacted: "2014-07-14",
    source_url: "https://www.ift.org.mx/industria/espectro-radioelectrico",
    issuing_body: "Federal Telecommunications Institute",
    competent_authorities: ["MX-IFT"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum", "licensing"],
    scope_description:
      "IFT's concession framework for satellite services into Mexico. Differentiates commercial vs. social concessions. Foreign satellite operators must obtain commercial concession or landing-right permission to provide direct-to-Mexico satcom services.",
    key_provisions: [],
    related_sources: ["MX-CONSTITUTIONAL-ART-27"],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-LFPDPPP-2010",
    jurisdiction: "MX",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Federal Law on Protection of Personal Data Held by Private Parties",
    title_local:
      "Ley Federal de Protección de Datos Personales en Posesión de los Particulares",
    date_enacted: "2010-07-05",
    source_url: "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf",
    issuing_body: "Mexican Congress",
    competent_authorities: ["MX-INAI"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "Federal data-protection statute (private sector). Enforced by INAI. Applies to satcom subscriber data + satellite-derived personal data handled by private operators. Cross-border transfers permitted under controller-processor BCC equivalents.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-CYBERSECURITY-STRATEGY-2017",
    jurisdiction: "MX",
    type: "policy_document",
    status: "in_force",
    title_en: "Mexican National Cybersecurity Strategy",
    title_local: "Estrategia Nacional de Ciberseguridad",
    date_published: "2017-11-13",
    source_url: "https://www.gob.mx/sct/",
    issuing_body: "Ministry of Communications and Transport",
    competent_authorities: ["MX-IFT"],
    relevance_level: "low",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity"],
    scope_description:
      "Mexico's cybersecurity strategy. Identifies critical-infrastructure protection priorities. Mexico has no dedicated CII Security Law equivalent to NIS2.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-EXPORT-CONTROL-FOREIGN-TRADE",
    jurisdiction: "MX",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Foreign Trade Law — Export Control Framework",
    title_local: "Ley de Comercio Exterior — Régimen de control",
    date_enacted: "1993-07-27",
    date_last_amended: "2024-01-01",
    source_url: "https://www.diputados.gob.mx/LeyesBiblio/index.htm",
    issuing_body: "Mexican Congress",
    competent_authorities: ["MX-AEM"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "sanctions_compliance"],
    scope_description:
      "Mexican export-control framework. Mexico is NOT a Wassenaar / MTCR member. Implements UN Security Council sanctions + USMCA-aligned controls. Counsel for US-origin space-tech transactions touching Mexico should expect EAR re-export attention.",
    key_provisions: [],
    related_sources: ["MX-NAFTA-USMCA-SPACE"],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-FOREIGN-INVESTMENT-LAW",
    jurisdiction: "MX",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Investment Law",
    title_local: "Ley de Inversión Extranjera",
    date_enacted: "1993-12-27",
    date_last_amended: "2014-01-01",
    source_url: "https://www.diputados.gob.mx/LeyesBiblio/pdf/44_150324.pdf",
    issuing_body: "Mexican Congress",
    competent_authorities: ["MX-IFT"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Foreign investment framework. 2013 constitutional reform + 2014 telecoms reform liberalised foreign ownership in satellite services (now up to 100%). Activities reserved for the Mexican state listed in Article 5; satcom not currently reserved.",
    key_provisions: [],
    related_sources: ["MX-CONSTITUTIONAL-ART-27"],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-NAFTA-USMCA-SPACE",
    jurisdiction: "MX",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "USMCA — Space Services Chapter (Chapter 18 Telecoms)",
    title_local: "T-MEC — Capítulo de Telecomunicaciones",
    date_enacted: "2020-07-01",
    source_url: "https://www.gob.mx/t-mec/",
    issuing_body: "Governments of Mexico, US, Canada",
    competent_authorities: ["MX-IFT"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["procurement", "competition_antitrust"],
    scope_description:
      "USMCA Chapter 18 covers telecommunications including satellite services. National-treatment + non-discrimination obligations for satcom-services providers from US + Canada into Mexico. Material for cross-border satellite-services contracts.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "MX-AEM-INTL-COOP",
    jurisdiction: "MX",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "AEM International Cooperation MOUs (US, EU, BR, JP)",
    date_published: "2012-01-01",
    source_url: "https://www.gob.mx/aem",
    issuing_body: "Mexican Space Agency",
    competent_authorities: ["MX-AEM"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "AEM bilateral cooperation MOUs with NASA, ESA, AEB, JAXA. Standard framework for capacity-building + scientific cooperation. Mexico has NOT signed the Artemis Accords (rare for Western-aligned space-faring nations).",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
];
