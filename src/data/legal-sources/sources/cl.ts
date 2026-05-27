/**
 * Chile — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - Atacama Desert — world's premier optical-astronomy site (~70% of
 *   global optical-astronomy capacity hosted: VLT Paranal, ALMA, La
 *   Silla, Gemini South, E-ELT under construction at Cerro Armazones).
 * - Operates under Chilean territorial sovereignty + ESO bilateral
 *   agreement (1963) + NSF + AURA agreements + JAXA OAO collaboration.
 * - Dark Skies + Light Pollution — Chile has world's strictest dark-
 *   skies regulation (DS 43/2012 + 2024 update) affecting LEO mega-
 *   constellation operations (Starlink visible from Atacama).
 * - Chilean Space Policy 2014 + ACE (Agencia Chilena del Espacio,
 *   proposed 2024) — institutional development still ongoing.
 * - SUBTEL satellite-services licensing (Subsecretaría de
 *   Telecomunicaciones).
 *
 * Naming convention: CL-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Chile Authorities ───────────────────────────────────────────────

export const AUTHORITIES_CL: Authority[] = [
  {
    id: "CL-SUBTEL",
    name_en: "Subsecretaría de Telecomunicaciones (SUBTEL)",
    jurisdiction: "CL",
    role_description:
      "Telecommunications regulator under Ministry of Transport and Telecommunications (MTT). Authority for satellite-services licensing + frequency spectrum + ITU coordination.",
    website: "https://www.subtel.gob.cl/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "CL-DGAC",
    name_en: "Dirección General de Aeronáutica Civil (DGAC)",
    jurisdiction: "CL",
    role_description:
      "Civil aviation authority. Material for airspace coordination on launch + reentry through Chilean territorial airspace. Operates under Aeronautics Code (DFL 305/1960).",
    website: "https://www.dgac.gob.cl/",
    applicable_areas: ["licensing", "space_traffic_management"],
  },
  {
    id: "CL-MMA",
    name_en: "Ministerio del Medio Ambiente (MMA)",
    jurisdiction: "CL",
    role_description:
      "Environmental ministry. Operates Servicio de Evaluación Ambiental (SEA) for EIA approval. Material for ground-station + observatory + future launch-facility environmental clearances under SEIA system.",
    website: "https://mma.gob.cl/",
    applicable_areas: ["environmental"],
  },
  {
    id: "CL-CONICYT-ANID",
    name_en:
      "Agencia Nacional de Investigación y Desarrollo (ANID, formerly CONICYT)",
    jurisdiction: "CL",
    role_description:
      "National R&D agency (CONICYT until 2020, then ANID). Authority for space-science R&D funding + ESO/NSF/AURA observatory coordination + scientific data-access agreements (Chilean 10% time guarantee).",
    website: "https://www.anid.cl/",
    applicable_areas: ["scientific_research"],
  },
  {
    id: "CL-FACH-SPACE",
    name_en:
      "Fuerza Aérea de Chile — Grupo de Operaciones Espaciales (FACH-GOE)",
    jurisdiction: "CL",
    role_description:
      "Chilean Air Force Space Operations Group. Material for FASat satellite operations (FASat-Charlie 2011, FASat-Delta under contract). National Space Surveillance + dual-use space coordination.",
    website: "https://www.fach.mil.cl/",
    applicable_areas: ["military_dual_use", "registration"],
  },
];

// ─── Chile Legal Sources ─────────────────────────────────────────────

export const LEGAL_SOURCES_CL: LegalSource[] = [
  {
    id: "CL-CHILE-ESO-AGREEMENT-1963",
    jurisdiction: "CL",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Chile-ESO Convention (1963) + Headquarters Agreement (1995) + ALMA Agreement (2002)",
    date_enacted: "1963-11-06",
    date_last_amended: "2002-12-09",
    source_url: "https://www.eso.org/public/about-eso/structure/agreements/",
    issuing_body: "Republic of Chile + European Southern Observatory (ESO)",
    competent_authorities: ["CL-CONICYT-ANID"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "licensing"],
    scope_description:
      "Chile-ESO Convention 1963 — founding bilateral establishing ESO Chilean operations (La Silla, Paranal/VLT, ALMA partnership, E-ELT at Cerro Armazones). Critical provisions: (i) Chilean 10% guaranteed observing-time rights at all ESO Chile facilities; (ii) diplomatic-immunity-equivalent status for ESO staff; (iii) duty-free import of astronomical equipment; (iv) joint-management for ALMA (Atacama Large Millimeter Array, 2002 trilateral US-Europe-Japan agreement). Material for any optical-astronomy commercial-services contract in Chile — defines IP rights, data-access, dark-skies protection obligations.",
    key_provisions: [
      "Art. 6 (1963) — Chilean 10% observing-time",
      "Art. 14 (1995 HQ Agreement) — immunity for ESO staff",
      "ALMA Trilateral (2002) — US/EU/JP joint management",
    ],
    related_sources: ["INT-EUMETSAT-CONVENTION", "CL-DARK-SKIES-DS-43-2012"],
    last_verified: "2026-05-27",
  },
  {
    id: "CL-DARK-SKIES-DS-43-2012",
    jurisdiction: "CL",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Decreto Supremo No. 43/2012 — Norma de Emisión para la Regulación de la Contaminación Lumínica (Dark Skies Regulation)",
    date_enacted: "2012-05-04",
    date_last_amended: "2023-10-26",
    source_url: "https://www.bcn.cl/leychile/navegar?idNorma=1052762",
    issuing_body: "Ministerio del Medio Ambiente (MMA)",
    competent_authorities: ["CL-MMA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["environmental", "media_broadcasting"],
    scope_description:
      "DS 43/2012 — Chile's world-leading dark-skies regulation, updated by DS 1/2023 (effective October 2023 with 4-year phase-in). Covers Atacama (Antofagasta, Coquimbo, Atacama regions). Material restrictions: (i) CCT (correlated colour temperature) ≤2200K for outdoor lighting; (ii) UF (upward fraction) ≤0%; (iii) blue-light cut-off at 500nm. Material for LEO mega-constellation operators: while DS 43 nominally regulates ground-based light, IAU + ESO interpretation extends to satellite-reflectance characteristics affecting Chilean optical-astronomy (Starlink V2 'BRDF dark coating' development specifically responds to Chilean observatory complaints).",
    key_provisions: [
      "Art. 4 — CCT ≤2200K outdoor lighting",
      "Art. 6 — UF ≤0% requirement",
      "Art. 9 — blue-light 500nm cut-off",
      "DS 1/2023 — 4-year phase-in extending to all Chilean territory",
    ],
    related_sources: [
      "CL-CHILE-ESO-AGREEMENT-1963",
      "INT-IAU-DARK-QUIET-SKIES-2022",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "CL-SUBTEL-SATELLITE-SERVICES",
    jurisdiction: "CL",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Ley General de Telecomunicaciones (Ley 18.168) + Decreto 127/2006 — Satellite Services Framework",
    date_enacted: "1982-10-02",
    date_last_amended: "2024-06-12",
    source_url: "https://www.bcn.cl/leychile/navegar?idNorma=29570",
    issuing_body: "Ministry of Transport and Telecommunications",
    competent_authorities: ["CL-SUBTEL"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Ley General de Telecomunicaciones — primary Chilean telecoms framework. Material satellite-services provisions: (i) Art. 11 SUBTEL concession authority for satellite-services; (ii) Decreto 127/2006 ITU coordination procedures; (iii) Decreto 18/2014 GMPCS framework (Starlink, OneWeb, Iridium operations); (iv) Resolución Exenta 1483/2023 NGSO authorization criteria. Material for satellite-operator Chile market entry: Starlink launched April 2023 under GMPCS framework, no foreign-ownership restriction but local-presence requirement (Chilean legal entity + tax residency).",
    key_provisions: [
      "Art. 11 — SUBTEL concession authority",
      "Decreto 127/2006 — ITU coordination procedures",
      "Decreto 18/2014 — GMPCS framework",
      "Resolución 1483/2023 — NGSO authorization criteria",
    ],
    related_sources: ["CL-DARK-SKIES-DS-43-2012"],
    last_verified: "2026-05-27",
  },
  {
    id: "CL-FASAT-PROGRAMME",
    jurisdiction: "CL",
    type: "policy_document",
    status: "in_force",
    title_en:
      "FASat Programme — Chilean Air Force EO Satellite Operations (FASat-Alfa 1995, FASat-Bravo 1998, FASat-Charlie 2011, FASat-Delta planned)",
    date_enacted: "1995-08-31",
    date_last_amended: "2024-09-30",
    source_url: "https://www.fach.mil.cl/fasat",
    issuing_body: "Fuerza Aérea de Chile (FACH)",
    competent_authorities: ["CL-FACH-SPACE"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "registration"],
    scope_description:
      "FASat Programme — Chile's sovereign EO capability operated by FACH. Material missions: FASat-Alfa (1995, failed deployment), FASat-Bravo (1998, decommissioned 2001), FASat-Charlie (2011, Airbus DS SSTL-built, 1.5m panchromatic EO, operational), FASat-Delta (under contract with ISIS Group + Airbus DS, expected launch 2025-2026, 0.7m EO + SAR). Material for Chile satellite registration practice + Andes-region SDA + dual-use coordination. FACH operates Tte. Hernán Marchant Air Base SSA optical station + cooperates with Space Surveillance Network (SSN) and EU SST.",
    key_provisions: [],
    related_sources: ["CL-CHILE-NATIONAL-SPACE-POLICY-2014"],
    last_verified: "2026-05-27",
  },
  {
    id: "CL-CHILE-NATIONAL-SPACE-POLICY-2014",
    jurisdiction: "CL",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Política Nacional Espacial 2014 + Programa Espacial Chile 2030 (proposed)",
    date_enacted: "2014-10-23",
    date_last_amended: "2024-03-15",
    source_url:
      "https://www.mtt.gob.cl/wp-content/uploads/2014/10/Politica-Nacional-Espacial.pdf",
    issuing_body: "Ministerio de Transportes y Telecomunicaciones",
    competent_authorities: ["CL-SUBTEL", "CL-FACH-SPACE"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research"],
    scope_description:
      "Política Nacional Espacial 2014 — Chile's national space strategy. Material provisions: (i) institutional framework with proposed Agencia Chilena del Espacio (ACE); (ii) sovereign EO capability commitments through FASat; (iii) commercial-space promotion via SUBTEL licensing reforms; (iv) ESO + ALMA + Vera Rubin coordination. Programa Espacial Chile 2030 (Boric administration 2022-2026) seeks ACE establishment + sovereign-satcom + maritime monitoring. ACE legislation drafted 2024, pending Congressional enactment.",
    key_provisions: [
      "§2 — proposed Agencia Chilena del Espacio (ACE)",
      "§5 — sovereign EO capability through FASat",
      "§7 — commercial-space promotion",
      "Chile 2030 — pending ACE legislation",
    ],
    related_sources: ["CL-FASAT-PROGRAMME", "CL-SUBTEL-SATELLITE-SERVICES"],
    last_verified: "2026-05-27",
  },
  {
    id: "CL-LEY-19628-PERSONAL-DATA",
    jurisdiction: "CL",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Ley 19.628 — Protección de la Vida Privada (1999) + Reform Ley 21.719 (2024)",
    date_enacted: "1999-08-28",
    date_last_amended: "2024-12-13",
    source_url: "https://www.bcn.cl/leychile/navegar?idNorma=141599",
    issuing_body: "Congreso Nacional de Chile",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "Ley 19.628 — Chile's foundational data-protection law. December 2024 reform (Ley 21.719) modernizes framework toward GDPR adequacy: (i) establishes Agencia de Protección de Datos Personales (APDP) as independent DPA, operational from June 2026; (ii) Art. 14-bis GDPR-equivalent extraterritorial scope; (iii) Art. 23 cross-border transfer adequacy decisions; (iv) Art. 46 fines up to 4% global turnover. Material for satellite-imagery + EO-as-a-service operators serving Chilean customers. Chile pursuing EU adequacy decision under revised framework.",
    key_provisions: [
      "Art. 14-bis (Ley 21.719) — extraterritorial scope",
      "Art. 23 — cross-border transfer rules",
      "Art. 46 — fines up to 4% global turnover",
      "Agencia de Protección de Datos Personales — operational June 2026",
    ],
    related_sources: ["CL-SUBTEL-SATELLITE-SERVICES"],
    last_verified: "2026-05-27",
  },
  {
    id: "CL-VERA-RUBIN-OBSERVATORY",
    jurisdiction: "CL",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Vera C. Rubin Observatory (LSST) — Chile-US-NSF-DOE Cooperation Agreement",
    date_enacted: "2014-05-06",
    date_last_amended: "2024-08-22",
    source_url: "https://rubinobservatory.org/",
    issuing_body: "Republic of Chile + NSF + DOE + AURA",
    competent_authorities: ["CL-CONICYT-ANID"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "data_security"],
    scope_description:
      "Vera Rubin Observatory (formerly LSST — Large Synoptic Survey Telescope) — 8.4m optical/wide-field survey telescope at Cerro Pachón, first-light 2025, decade-long survey 2026-2036. Will detect ~10,000x more transient events than any prior telescope. CRITICAL impact assessment for LEO mega-constellations: Rubin observatory will publicly track + characterize satellite-trails affecting astronomical data quality. Material for Starlink/Kuiper/OneWeb operators: Rubin streak-detection pipeline becomes de facto compliance-verification framework for IAU/UN COPUOS dark-quiet-skies guidelines. Practitioner relevance for constellation-operator IAU Centre for Protection of the Dark and Quiet Sky engagement.",
    key_provisions: [],
    related_sources: [
      "CL-DARK-SKIES-DS-43-2012",
      "INT-IAU-DARK-QUIET-SKIES-2022",
    ],
    last_verified: "2026-05-27",
  },
];
