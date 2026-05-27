/**
 * Algeria — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - ASAL (Agence Spatiale Algérienne) — established 2002 by Presidential
 *   Decree 02-48. Africa's most operationally active space agency by
 *   satellite count.
 * - ALSAT series — 6 operational satellites built by SSTL (UK):
 *   ALSAT-1 (2002, decommissioned), ALSAT-2A/2B (2010/2016), ALSAT-1B
 *   (2016), ALSAT-1N (2016 educational CubeSat).
 * - ALCOMSAT-1 (Dec 2017) — Chinese CGWIC-built satcom (DFH-4 platform),
 *   material China-BRI precedent in North Africa.
 * - CRASTE-LF (Centre Régional Africain des Sciences et Technologies
 *   de l'Espace en langue Française) — UN-affiliated centre at
 *   Université Saad Dahlab Blida, joint with Morocco's ARCSSTE-F.
 * - Material for AU/AfSA, French-speaking Africa cooperation, China-BRI
 *   space partnerships, military gas + oil sector EO monitoring.
 *
 * Naming convention: DZ-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Algeria Authorities ─────────────────────────────────────────────

export const AUTHORITIES_DZ: Authority[] = [
  {
    id: "DZ-ASAL",
    name_en: "Agence Spatiale Algérienne (ASAL / الوكالة الفضائية الجزائرية)",
    jurisdiction: "DZ",
    role_description:
      "Algeria's national space agency, established 2002 by Presidential Decree 02-48. Reports directly to the Ministry of Higher Education and Scientific Research. Operates 6 ALSAT EO satellites + ALCOMSAT-1 + ground-segment infrastructure.",
    website: "https://www.asal.dz/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "procurement",
    ],
  },
  {
    id: "DZ-ARPT",
    name_en:
      "Autorité de Régulation de la Poste et des Télécommunications (ARPT)",
    jurisdiction: "DZ",
    role_description:
      "Independent telecommunications regulator established 2000 under Law 2000-03. Authority for satellite-services licensing + frequency spectrum + ITU coordination.",
    website: "https://www.arpt.dz/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "DZ-MDN-ESPACE",
    name_en: "Ministère de la Défense Nationale — Composante Spatiale",
    jurisdiction: "DZ",
    role_description:
      "Algerian Ministry of National Defense space component. Material for ALCOMSAT-1 military-utility operations + Sahara theater monitoring + counter-terrorism EO support.",
    website: "https://www.mdn.dz/",
    applicable_areas: ["military_dual_use", "registration"],
  },
];

// ─── Algeria Legal Sources ───────────────────────────────────────────

export const LEGAL_SOURCES_DZ: LegalSource[] = [
  {
    id: "DZ-PRESIDENTIAL-DECREE-02-48",
    jurisdiction: "DZ",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Présidential Decree No. 02-48 (2002) — Establishment of Agence Spatiale Algérienne (ASAL)",
    date_enacted: "2002-01-16",
    date_last_amended: "2020-11-18",
    source_url: "https://www.asal.dz/historique/",
    issuing_body: "President of the Republic of Algeria",
    competent_authorities: ["DZ-ASAL"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "scientific_research"],
    scope_description:
      "Presidential Decree No. 02-48 — establishes ASAL as Algeria's national space agency. Material context: (i) reports to Ministry of Higher Education and Scientific Research; (ii) operates ALSAT-2A/2B (1m + 5m EO) + ALSAT-1B (24m EO) + ALSAT-1N + ALCOMSAT-1; (iii) operational structure overhauled 2020 to expand commercial-services mandate. ASAL operates Centre des Techniques Spatiales (CTS) at Arzew + Centre d'Exploitation des Systèmes de Télédétection (CESPRO) at Bir-Mourad-Raïs. Material for any commercial-space partnership in Algeria.",
    key_provisions: [],
    related_sources: [
      "DZ-NATIONAL-SPACE-PROGRAMME-2020",
      "DZ-ALSAT-SSTL-PROGRAMME",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "DZ-NATIONAL-SPACE-PROGRAMME-2020",
    jurisdiction: "DZ",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Algeria National Space Programme 2020-2040 (NSP-2040 / Programme Spatial National)",
    date_enacted: "2020-12-15",
    date_last_amended: "2024-03-22",
    source_url: "https://www.asal.dz/programme-spatial-national-2020-2040/",
    issuing_body: "Government of Algeria + ASAL",
    competent_authorities: ["DZ-ASAL"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research", "procurement"],
    scope_description:
      "Algeria National Space Programme 2020-2040 — 20-year strategic plan establishing 4 pillars: (1) sovereign satellite capability (ALSAT + ALCOMSAT continuation); (2) commercial-services expansion + EO downstream applications (oil/gas + agriculture + Sahara monitoring); (3) workforce development via NSP-2040 doubling target 500 → 1,000 ASAL-affiliated researchers; (4) AU + AfSA + APSCO + Arab Space Cooperation Group cooperation. Material for any commercial-space partnership: explicit prioritisation of African + Arab + Chinese cooperation over Western.",
    key_provisions: [
      "Pillar 1 — sovereign ALSAT + ALCOMSAT continuation",
      "Pillar 2 — commercial EO downstream (oil/gas + Sahara)",
      "Pillar 3 — workforce doubling to 1,000 researchers",
      "Pillar 4 — AU/AfSA/APSCO/ASCG cooperation priority",
    ],
    related_sources: ["DZ-PRESIDENTIAL-DECREE-02-48"],
    last_verified: "2026-05-27",
  },
  {
    id: "DZ-ALSAT-SSTL-PROGRAMME",
    jurisdiction: "DZ",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "ALSAT Programme — UK-Algeria Bilateral via SSTL (2002-2024)",
    date_enacted: "1998-06-04",
    date_last_amended: "2024-08-22",
    source_url: "https://www.asal.dz/programme-spatial-algerien/",
    issuing_body:
      "Government of Algeria (ASAL) + UK (SSTL / Surrey Satellite Technology Ltd)",
    competent_authorities: ["DZ-ASAL"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration", "scientific_research", "procurement"],
    scope_description:
      "ALSAT Programme — Algeria's flagship UK-Algerian space cooperation via SSTL. Material missions: ALSAT-1 (2002, SSTL DMC-platform, decommissioned 2010 — Algeria's first satellite, also Africa's first sovereign EO sat); ALSAT-2A (2010, SSTL-100 platform, 2.5m panchromatic + 10m multispectral, ~$78M); ALSAT-1B (2016, SSTL-built 22m EO); ALSAT-2B (2016, SSTL-100 1m HiRes); ALSAT-1N (2016, SSTL educational 3U CubeSat). Material for African DMC (Disaster Monitoring Constellation) cooperation + UK-Algeria technology-transfer precedents — established model for SSTL African + Asian export portfolio (Nigeria + Turkey + Kazakhstan all use similar SSTL frameworks).",
    key_provisions: [],
    related_sources: [
      "DZ-PRESIDENTIAL-DECREE-02-48",
      "NG-NIGERIASAT-PROGRAMME",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "DZ-ALCOMSAT-1-CHINA-CGWIC",
    jurisdiction: "DZ",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "ALCOMSAT-1 (Dec 2017) — Algeria-China CGWIC Satcom Bilateral",
    date_enacted: "2013-04-08",
    date_last_amended: "2017-12-11",
    source_url: "https://www.asal.dz/alcomsat-1/",
    issuing_body: "Government of Algeria (ASAL) + China (CGWIC + CAST)",
    competent_authorities: ["DZ-ASAL", "DZ-MDN-ESPACE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "procurement",
      "military_dual_use",
      "frequency_spectrum",
    ],
    scope_description:
      "ALCOMSAT-1 — Algeria's sovereign satcom satellite via Chinese CGWIC. Contract: ~US$350M, signed April 2013, launched 11 December 2017 from Xichang on Long March 3B, CAST-built DFH-4 platform, 19 C-band + 12 Ku-band + 1 Ka-band transponder, 24.8°W orbital slot. Material practitioner relevance: (i) ALCOMSAT serves both civil (broadcasting + telecommunications) + military (national defence + Sahel counter-terrorism) functions; (ii) Algeria-Russia-China strategic triangle context; (iii) Western suppliers (Airbus DS + Thales Alenia Space) actively excluded by Algerian preference for Chinese partnership; (iv) ALCOMSAT-2 procurement under exploration 2024-2025 via CGWIC. Material precedent for North-African + Arab-state China-BRI space partnerships.",
    key_provisions: [],
    related_sources: [
      "PK-PAKSAT-CHINA-CGWIC",
      "NG-NIGCOMSAT-CHINA-EXIM-FINANCING",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "DZ-LOI-2000-03-TELECOM",
    jurisdiction: "DZ",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Loi 2000-03 — Code des Postes et Télécommunications (Algeria) + Loi 18-04 (2018) reform",
    date_enacted: "2000-08-05",
    date_last_amended: "2024-03-15",
    source_url: "https://www.arpt.dz/legislation/",
    issuing_body:
      "Parlement de la République algérienne démocratique et populaire",
    competent_authorities: ["DZ-ARPT"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Loi 2000-03 + Loi 18-04 (2018 reform) — primary Algerian telecoms framework. Material satellite-services provisions: (i) Art. 17 ARPT licensing authority for satellite services; (ii) Loi 18-04 introduced NGN + 4G licensing frameworks; (iii) Décret 19-166 (2019) administered VSAT + satellite-internet licensing; (iv) no formal LEO mega-constellation framework yet — Starlink applied 2023 still pending. Foreign-ownership rules: 49% formal cap + de facto national-security review. Algérie Télécom Satellite (Algerian state subsidiary) holds preference for major government satcom contracts.",
    key_provisions: [
      "Art. 17 — ARPT licensing authority",
      "Décret 19-166 — VSAT + satcom licensing",
      "49% foreign-ownership cap",
    ],
    related_sources: [],
    last_verified: "2026-05-27",
  },
  {
    id: "DZ-CRASTE-LF-UN-AFFILIATION",
    jurisdiction: "DZ",
    type: "multilateral_agreement",
    status: "in_force",
    title_en:
      "CRASTE-LF (Centre Régional Africain des Sciences et Technologies de l'Espace en langue Française) — UN Affiliation 1998 (with Morocco)",
    date_enacted: "1998-11-24",
    date_last_amended: "2022-06-17",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/psa/regional-centres/arcsste-f.html",
    issuing_body:
      "United Nations (UNOOSA) + People's Democratic Republic of Algeria + Kingdom of Morocco + Université Saad Dahlab",
    competent_authorities: ["DZ-ASAL"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "procurement"],
    scope_description:
      "CRASTE-LF — UN-affiliated regional centre for space science + technology education (French-speaking Africa). Established 1998 as Algerian half of ARCSSTE-F dual-host arrangement with Morocco's Mohammed V University. Located at Université Saad Dahlab Blida. UNOOSA Programme on Space Applications affiliation. Material for francophone Africa space-tech talent pipeline + rare-instance of Morocco-Algeria scientific cooperation continuing despite 2021 diplomatic-relations severance. Practitioner relevance for AU-aligned procurement preference + AfSA workforce-development obligations.",
    key_provisions: [],
    related_sources: [
      "DZ-PRESIDENTIAL-DECREE-02-48",
      "MA-ARCSSTE-F-UN-AFFILIATION",
    ],
    last_verified: "2026-05-27",
  },
];
