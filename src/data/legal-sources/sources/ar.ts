// src/data/legal-sources/sources/ar.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Argentina — space-law sources and authorities.
 *
 * CONAE (National Commission for Space Activities) established 1991.
 * SAOCOM Argentine-Italian SAR programme. Falda del Carmen launch
 * site (suborbital, scientific). INVAP S.E. — state-owned space-tech
 * contractor (satellite manufacturer for ARSAT + research missions).
 *
 * Atlas P1 (2026-05-26): new jurisdiction, target 12 sources per
 * ATLAS-CORPUS-EXPANSION-PLAN.md § 5.H.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_AR: Authority[] = [
  {
    id: "AR-CONAE",
    jurisdiction: "AR",
    name_en: "National Commission for Space Activities",
    name_local: "Comisión Nacional de Actividades Espaciales",
    abbreviation: "CONAE",
    parent_ministry: "Ministry of Foreign Affairs and Worship",
    website: "https://www.argentina.gob.ar/ciencia/conae",
    space_mandate:
      "National space agency. Established by Decree 995/1991. Coordinates national space policy + space-development programmes. Operates the SAOCOM series (Argentine SAR satellites co-developed with Italy ASI) + the Falda del Carmen launch site. Lead Argentine counterparty for international space cooperation.",
    legal_basis: "Decree 995/1991",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "AR-ENACOM",
    jurisdiction: "AR",
    name_en: "National Communications Entity",
    name_local: "Ente Nacional de Comunicaciones",
    abbreviation: "ENACOM",
    parent_ministry: "Ministry of Public Innovation",
    website: "https://www.enacom.gob.ar/",
    space_mandate:
      "Telecommunications regulator. National notifying administration for ITU filings. Issues earth-station authorisations + frequency allocations. ARSAT satellite operations + foreign satcom-services into Argentina coordinated through ENACOM.",
    legal_basis: "Law 27.078 Digital Argentina; Decree 267/2015",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "AR-INVAP",
    jurisdiction: "AR",
    name_en: "INVAP Sociedad del Estado",
    name_local: "INVAP S.E.",
    abbreviation: "INVAP",
    parent_ministry: "Province of Río Negro",
    website: "https://www.invap.com.ar/",
    space_mandate:
      "State-owned high-technology company (province of Río Negro). De-facto Argentine satellite manufacturer (SAOCOM, ARSAT-1/2, SAC series). Counterparty for foreign payload owners + technology partners. Operates under Argentine + provincial state-enterprise law.",
    legal_basis: "Province of Río Negro Law 1.094 (1976)",
    applicable_areas: ["procurement"],
  },
];

export const LEGAL_SOURCES_AR: LegalSource[] = [
  {
    id: "AR-OST-1969",
    jurisdiction: "AR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Argentina Ratification",
    date_enacted: "1969-03-26",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of Argentina",
    competent_authorities: ["AR-CONAE"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Argentina is a party to the OST. State-responsibility obligations now operationally administered by CONAE + ENACOM. Argentina is a signatory to all five UN space treaties including the Moon Agreement (1979 signature, never ratified).",
    key_provisions: [],
    related_sources: ["INT-OST-1967", "AR-CONAE-DECREE-1991"],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-CONAE-DECREE-1991",
    jurisdiction: "AR",
    type: "federal_law",
    status: "in_force",
    title_en: "CONAE Establishment Decree (995/1991)",
    title_local: "Decreto 995/91 Creación de CONAE",
    date_enacted: "1991-05-28",
    official_reference: "Decree 995/1991",
    source_url:
      "https://www.argentina.gob.ar/normativa/nacional/decreto-995-1991",
    issuing_body: "Office of the President",
    competent_authorities: ["AR-CONAE"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    scope_description:
      "Founding instrument of CONAE. Civilian space agency under the Ministry of Foreign Affairs (vs. defence ministries in many jurisdictions — reflects Argentina's post-Cóndor missile programme civilian-pivot 1991).",
    key_provisions: [],
    related_sources: ["AR-NATIONAL-SPACE-PLAN"],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-NATIONAL-SPACE-PLAN",
    jurisdiction: "AR",
    type: "policy_document",
    status: "in_force",
    title_en: "Argentine National Space Plan 2016-2027",
    title_local: "Plan Espacial Nacional 2016-2027",
    date_published: "2016-11-01",
    source_url: "https://www.argentina.gob.ar/ciencia/conae/plan-espacial",
    issuing_body: "CONAE",
    competent_authorities: ["AR-CONAE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "state_aid"],
    scope_description:
      "Argentine 4-year-cycle space-policy roadmap (2016-2027 horizon, updated 2020). Priorities: SAOCOM-2 mission, geostationary satellites (ARSAT-SG/Sky), Tronador-2 indigenous launcher (cancelled effectively 2018; SAOCOM-Light reformulated as smaller LEO programme).",
    key_provisions: [],
    related_sources: ["AR-SAOCOM-AGREEMENT"],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-SAOCOM-AGREEMENT",
    jurisdiction: "AR",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "SAOCOM Argentine-Italian Cooperation Agreement",
    title_local: "Acuerdo de Cooperación SAOCOM Argentina-Italia",
    date_enacted: "1992-10-01",
    source_url: "https://www.argentina.gob.ar/ciencia/conae/saocom",
    issuing_body: "Governments of Argentina + Italy",
    competent_authorities: ["AR-CONAE"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["procurement"],
    scope_description:
      "Bilateral framework for the SIASGE (Italian-Argentine Satellite System for Emergency Management) — SAOCOM-1A (2018), SAOCOM-1B (2020) Argentine SAR satellites paired with Italian COSMO-SkyMed constellation. Material precedent for South-North space partnerships.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-FALDA-DEL-CARMEN",
    jurisdiction: "AR",
    type: "policy_document",
    status: "in_force",
    title_en: "Falda del Carmen Launch Site Regulatory Framework",
    title_local: "Centro Espacial Teófilo Tabanera — Marco regulatorio",
    date_published: "1997-01-01",
    source_url: "https://www.argentina.gob.ar/ciencia/conae",
    issuing_body: "CONAE / Province of Córdoba",
    competent_authorities: ["AR-CONAE"],
    relevance_level: "low",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing", "environmental"],
    scope_description:
      "Falda del Carmen (Córdoba Province) is CONAE's space-tech facility hosting satellite mission control + ground segment. Suborbital scientific launches conducted historically; orbital launches not active. Counsel for foreign sounding-rocket providers exploring South American partnerships should track CONAE consultation processes.",
    key_provisions: [],
    related_sources: ["AR-CONAE-DECREE-1991"],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-PERSONAL-DATA-LAW-25326",
    jurisdiction: "AR",
    type: "federal_law",
    status: "in_force",
    title_en: "Personal Data Protection Law (Law 25.326)",
    title_local: "Ley de Protección de Datos Personales",
    date_enacted: "2000-10-04",
    date_last_amended: "2024-01-01",
    official_reference: "Law No. 25.326",
    source_url:
      "https://www.argentina.gob.ar/aaip/datospersonales/normativa-de-referencia",
    issuing_body: "Argentine Congress",
    competent_authorities: ["AR-ENACOM"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "Argentine GDPR-adequacy-recognised data-protection statute. EU-Argentina adequacy decision since 2003 simplifies EU-Argentina data flows. Applies to satcom subscriber data + satellite-derived personal data. Argentine Agency for Access to Public Information (AAIP) enforces.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-CYBERSECURITY-STRATEGY-2019",
    jurisdiction: "AR",
    type: "policy_document",
    status: "in_force",
    title_en: "Argentine National Cybersecurity Strategy",
    title_local: "Estrategia Nacional de Ciberseguridad",
    date_published: "2019-05-28",
    source_url: "https://www.argentina.gob.ar/ciberseguridad",
    issuing_body: "Office of the Cabinet Chief",
    competent_authorities: ["AR-ENACOM"],
    relevance_level: "low",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity"],
    scope_description:
      "Argentina's cybersecurity strategy 2019-2023. Identifies critical-infrastructure protection priorities — satcom + ground-segment included via the telecoms cross-reference. Argentina has no dedicated CII Security Law equivalent to NIS2 / SG Cybersecurity Act.",
    key_provisions: [],
    related_sources: ["AR-PERSONAL-DATA-LAW-25326"],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-RGSC-EXPORT-CONTROL",
    jurisdiction: "AR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Strategic Goods Control Regime (RGSC)",
    title_local: "Régimen de Control de Bienes Sensibles y Estratégicos",
    date_enacted: "1992-06-15",
    date_last_amended: "2024-01-01",
    source_url:
      "https://www.cancilleria.gob.ar/es/politica-exterior/temas-globales/seguridad-internacional-y-asuntos-nucleares-quimicos-y-biologicos",
    issuing_body:
      "Ministry of Foreign Affairs / National Commission on Strategic Goods Control",
    competent_authorities: ["AR-CONAE"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "Argentina's export-control regime. Argentina is a member of MTCR (joined 1993), NSG, Wassenaar Arrangement, and Australia Group. Implements aligned control lists for dual-use space items. Post-Cóndor missile programme dismantling 1991-1993 underlies Argentina's MTCR-adherent posture.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-DEFENCE-INDUSTRY-FAB",
    jurisdiction: "AR",
    type: "policy_document",
    status: "in_force",
    title_en: "Argentine Defence Industry Framework (FAdeA + INVAP)",
    title_local: "Marco de la Industria de Defensa",
    date_published: "2010-01-01",
    source_url: "https://www.argentina.gob.ar/defensa",
    issuing_body: "Ministry of Defence",
    competent_authorities: ["AR-CONAE"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    scope_description:
      "Argentine defence-industry framework. FAdeA (aerospace) + INVAP (technology) operate dual-use space-tech development. CONAE's civilian status separates from defence-procurement but coordination is regular.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "AR-MERCOSUR-SPACE",
    jurisdiction: "AR",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "Mercosur Space Cooperation Framework",
    date_enacted: "2015-12-21",
    source_url: "https://www.mercosur.int/",
    issuing_body: "Mercosur Common Market Council",
    competent_authorities: ["AR-CONAE"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Mercosur (Argentina, Brazil, Paraguay, Uruguay) cooperation framework for satellite-data sharing + joint missions. Implementation through CONAE-AEB bilateral working groups.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
];
