/**
 * Mongolia — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - MASLN (Mongolian Aerospace Science Lab) — established 2010 under
 *   Ministry of Education + later Mongolian Academy of Sciences (MAS).
 * - MNGSAT-1 (planned launch 2025-2026) — Chinese CGWIC-built satcom,
 *   first Mongolian sovereign satellite.
 * - National Space Law of Mongolia (2024) — first comprehensive national
 *   space law adopted by State Great Khural (Parliament).
 * - Material for landlocked Central Asia + China-Russia geopolitical
 *   triangulation + Belt-and-Road Initiative space cooperation.
 *
 * Naming convention: MN-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Mongolia Authorities ────────────────────────────────────────────

export const AUTHORITIES_MN: Authority[] = [
  {
    id: "MN-MASLN",
    name_en:
      "Mongolian Aerospace Science Lab (MASLN / Монголын Сансрын Шинжлэх Ухааны Лаборатори)",
    jurisdiction: "MN",
    role_description:
      "Mongolia's de facto national space agency, established 2010 under Ministry of Education + restructured under Mongolian Academy of Sciences 2019. Authority for MNGSAT programme + ground-segment infrastructure. Material for any commercial-space partnership in Mongolia.",
    website: "https://masln.mn/",
    applicable_areas: ["licensing", "registration", "scientific_research"],
  },
  {
    id: "MN-MOCDC",
    name_en: "Ministry of Communications and Digital Development (MOCDC)",
    jurisdiction: "MN",
    role_description:
      "Cabinet-level ministry overseeing telecoms + ICT + emerging space-tech regulatory activities. Material authority for satellite-services licensing + frequency spectrum + ITU coordination + MNGSAT-1 operational planning.",
    website: "https://mcds.gov.mn/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
];

// ─── Mongolia Legal Sources ──────────────────────────────────────────

export const LEGAL_SOURCES_MN: LegalSource[] = [
  {
    id: "MN-NATIONAL-SPACE-LAW-2024",
    jurisdiction: "MN",
    type: "federal_law",
    status: "in_force",
    title_en:
      "National Space Law of Mongolia (2024) — First Comprehensive National Space Activities Framework",
    date_enacted: "2024-04-19",
    date_last_amended: "2024-04-19",
    source_url: "https://www.legalinfo.mn/law/details/2024-space-law/",
    issuing_body: "State Great Khural (Parliament of Mongolia)",
    competent_authorities: ["MN-MASLN", "MN-MOCDC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "National Space Law of Mongolia (2024) — Mongolia's first comprehensive national space activities framework. Adopted by State Great Khural April 2024, effective July 2024. Material provisions: (i) Art. 5 establishes Space Activities Council under Prime Minister; (ii) Art. 8 MASLN licensing authority for launch + operation + ground-segment; (iii) Art. 12 third-party liability cap MNT 50B (~US$15M, low by international standards reflecting Mongolia's emerging-space-economy status); (iv) Art. 18 spacecraft registry compliant with UN Registration Convention; (v) Art. 22-25 supervisory powers + sanctions regime; (vi) Art. 30 international cooperation provisions explicitly accommodating both China (BRI) and Russia (EAEU) space-tech bilateral arrangements.",
    key_provisions: [
      "Art. 5 — Space Activities Council under PM",
      "Art. 8 — MASLN licensing authority",
      "Art. 12 — third-party liability cap MNT 50B",
      "Art. 18 — national spacecraft registry",
      "Art. 30 — China BRI + Russia EAEU cooperation",
    ],
    related_sources: ["MN-MNGSAT-1-CHINA-CGWIC"],
    last_verified: "2026-05-27",
  },
  {
    id: "MN-MNGSAT-1-CHINA-CGWIC",
    jurisdiction: "MN",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "MNGSAT-1 — Mongolia-China CGWIC Satcom Bilateral (2017 MoU, planned launch 2025-2026)",
    date_enacted: "2017-05-14",
    date_last_amended: "2024-11-19",
    source_url: "https://masln.mn/mngsat-1/",
    issuing_body:
      "Government of Mongolia (MASLN + MOCDC) + China (CGWIC + CAST)",
    competent_authorities: ["MN-MASLN"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: [
      "procurement",
      "frequency_spectrum",
      "media_broadcasting",
    ],
    scope_description:
      "MNGSAT-1 — Mongolia's first sovereign satellite, Chinese CGWIC-built satcom under 2017 MoU signed during Belt-and-Road Forum. Material details: (i) ~US$250M contract value funded through Chinese Export-Import Bank loan; (ii) CAST DFH-4S platform (small-bus DFH-4 variant); (iii) 14 Ku-band + 8 C-band transponders, planned 86.5°E or 95°E orbital slot; (iv) launch from Xichang on Long March 3B planned Q4 2025 or Q1 2026 (delayed from original 2023 target). Material practitioner precedent: continuation of Chinese BRI space-tech template (Pakistan PAKSAT + Nigeria NIGCOMSAT + Algeria ALCOMSAT + future Mongolia MNGSAT) for emerging-state sovereign satcom. Ground-segment at Ulaanbaatar will require Chinese operational support similar to NIGCOMSAT Multan + PAKSAT Multan models.",
    key_provisions: [],
    related_sources: [
      "PK-PAKSAT-CHINA-CGWIC",
      "NG-NIGCOMSAT-CHINA-EXIM-FINANCING",
      "DZ-ALCOMSAT-1-CHINA-CGWIC",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "MN-CHINA-MONGOLIA-RUSSIA-TRILATERAL",
    jurisdiction: "MN",
    type: "multilateral_agreement",
    status: "in_force",
    title_en:
      "China-Mongolia-Russia Trilateral Strategic Partnership — Belt-and-Road + EAEU Triangulation Framework",
    date_enacted: "2016-06-23",
    date_last_amended: "2024-07-04",
    source_url:
      "https://mongolia.un.org/economic-corridor-china-mongolia-russia/",
    issuing_body:
      "Government of Mongolia + Government of China + Russian Federation",
    competent_authorities: ["MN-MASLN", "MN-MOCDC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "scientific_research", "fdi_screening"],
    scope_description:
      "China-Mongolia-Russia Trilateral Economic Corridor — established Tashkent SCO Summit June 2016. Includes space-tech cooperation framework under Article 6 of Trilateral Programme. Material practitioner relevance: (i) Mongolia's unique geopolitical position between China + Russia drives 'Third Neighbor' diversification policy seeking Japan + Korea + US + EU + India space-tech partnerships as balance; (ii) MNGSAT-1 Chinese-built + future MNGSAT-2 procurement under exploration with Japanese (JAXA + NEC) + Korean (KARI) as alternative options; (iii) Sino-Mongolian Space Cooperation Working Group established 2018 + Russo-Mongolian 2020 — both operational. Material precedent for landlocked-state space-tech diversification strategy.",
    key_provisions: [],
    related_sources: ["MN-MNGSAT-1-CHINA-CGWIC", "MN-NATIONAL-SPACE-LAW-2024"],
    last_verified: "2026-05-27",
  },
  {
    id: "MN-COMMUNICATIONS-LAW-2001",
    jurisdiction: "MN",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Mongolia Law on Communications (2001) + Telecommunications Policy 2019",
    date_enacted: "2001-10-18",
    date_last_amended: "2024-02-28",
    source_url: "https://www.legalinfo.mn/law/details/communications-law-2001/",
    issuing_body: "State Great Khural (Parliament of Mongolia)",
    competent_authorities: ["MN-MOCDC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Law on Communications 2001 — primary Mongolian telecoms framework. Material satellite-services provisions: (i) Art. 11 MOCDC licensing authority for satellite services; (ii) Art. 25 frequency assignments + ITU coordination; (iii) Telecommunications Policy 2019 introduced VSAT + satellite-internet licensing framework; (iv) National Space Law 2024 Art. 35 cross-reference to Communications Law for ITU procedures. Material for satellite-operator Mongolia market entry: Starlink applied for licensing 2023 still pending MOCDC review citing national-security review + China-Russia bilateral coordination requirements.",
    key_provisions: [
      "Art. 11 — MOCDC satellite-services licensing",
      "Art. 25 — frequency + ITU coordination",
      "Telecommunications Policy 2019 — VSAT framework",
    ],
    related_sources: ["MN-NATIONAL-SPACE-LAW-2024"],
    last_verified: "2026-05-27",
  },
];
