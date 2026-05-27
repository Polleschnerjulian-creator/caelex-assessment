/**
 * Pakistan — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - SUPARCO (Space and Upper Atmosphere Research Commission) — established
 *   1961 by Executive Order, one of world's oldest space agencies. Reports
 *   to Prime Minister directly.
 * - PAKSAT-1R (2011) + PAKSAT-MM1 (May 2024) — Chinese CGWIC-built satcom,
 *   material China-Belt-and-Road precedent (template similar to NigComSat).
 * - iCube-Q (May 2024) — Pakistan's first lunar CubeSat, deployed via
 *   China's Chang'e-6 mission. Material first-of-kind ride-share to lunar.
 * - National Space Policy 2023 + draft Space Activities Bill 2023.
 * - Material for South Asia + China-BRI + Kashmir EO restrictions + ISI
 *   military operational role.
 *
 * Naming convention: PK-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Pakistan Authorities ────────────────────────────────────────────

export const AUTHORITIES_PK: Authority[] = [
  {
    id: "PK-SUPARCO",
    name_en:
      "Space and Upper Atmosphere Research Commission (SUPARCO / خلائی و بالائی فضائے تحقیقاتی کمیشن)",
    jurisdiction: "PK",
    role_description:
      "Pakistan's national space agency, established 1961 by Executive Order, statutorily anchored by SUPARCO Act 2024. Reports directly to Prime Minister (dual civil-military reporting). Operates PAKSAT-1R + PAKSAT-MM1 + iCube-Q + Pakistan Remote Sensing Satellite (PRSS-1).",
    website: "https://www.suparco.gov.pk/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "military_dual_use",
    ],
  },
  {
    id: "PK-PTA",
    name_en: "Pakistan Telecommunication Authority (PTA)",
    jurisdiction: "PK",
    role_description:
      "Independent telecommunications regulator established under Pakistan Telecommunication Re-organization Act 1996. Authority for satellite-services licensing + frequency spectrum + ITU coordination.",
    website: "https://www.pta.gov.pk/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "PK-PSARA",
    name_en:
      "Pakistan Space Activities Regulatory Authority (PSARA) — Proposed",
    jurisdiction: "PK",
    role_description:
      "Proposed independent space-activities regulator under draft Pakistan Space Activities Act 2023. Currently functions exercised informally by SUPARCO + PTA + Ministry of IT. Material for any anticipated future Pakistan space-tech regulatory engagement.",
    website: "https://www.suparco.gov.pk/",
    applicable_areas: ["licensing", "registration"],
  },
];

// ─── Pakistan Legal Sources ──────────────────────────────────────────

export const LEGAL_SOURCES_PK: LegalSource[] = [
  {
    id: "PK-SUPARCO-ACT-2024",
    jurisdiction: "PK",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Space and Upper Atmosphere Research Commission Act 2024 (Act No. XII of 2024)",
    date_enacted: "2024-04-30",
    date_last_amended: "2024-04-30",
    source_url: "https://na.gov.pk/uploads/documents/1714498437_829.pdf",
    issuing_body: "National Assembly of Pakistan",
    competent_authorities: ["PK-SUPARCO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "scientific_research"],
    scope_description:
      "SUPARCO Act 2024 — statutorily anchors SUPARCO (operational since 1961 via Executive Order). Replaces 1981 SUPARCO Ordinance. Material provisions: (i) §3 SUPARCO mandates incl. national space policy implementation + satellite operations + technology transfer; (ii) §7 SUPARCO Council composition (PM-chaired); (iii) §13 commercialisation authority; (iv) §15 international cooperation authority; (v) §22 budget structure. Material for any commercial-space partnership: SUPARCO acts as both regulator + operator (no separation of regulatory + operational functions, distinct from India ISRO/IN-SPACe split).",
    key_provisions: [
      "§3 — SUPARCO mandates",
      "§7 — SUPARCO Council (PM-chaired)",
      "§13 — commercialisation authority",
      "§15 — international cooperation",
      "§22 — budget structure",
    ],
    related_sources: [
      "PK-NATIONAL-SPACE-POLICY-2023",
      "PK-DRAFT-SPACE-ACTIVITIES-BILL-2023",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "PK-NATIONAL-SPACE-POLICY-2023",
    jurisdiction: "PK",
    type: "policy_document",
    status: "in_force",
    title_en: "National Space Policy 2023 + Pakistan Space Programme 2047",
    date_enacted: "2023-03-23",
    date_last_amended: "2024-08-15",
    source_url: "https://www.suparco.gov.pk/national-space-policy-2023/",
    issuing_body: "Federal Cabinet of Pakistan + SUPARCO",
    competent_authorities: ["PK-SUPARCO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research", "procurement"],
    scope_description:
      "National Space Policy 2023 — establishes Pakistan's strategic space framework. 5-pillar structure: (1) sovereign satellite capability (PAKSAT GEO satcom + PRSS LEO EO); (2) Chinese commercial-space partnership (NSP explicit on CGWIC + Chang'e ride-share); (3) workforce development via NUST + NCSE academic programmes; (4) Karachi + Lahore + Islamabad space-tech industrial clusters; (5) international cooperation incl. APSCO observer + UN COPUOS active member. Pakistan Space Programme 2047 (centenary vision): target sovereign launch capability by 2047. Material for any commercial-space partnership: NSP explicitly prioritises Chinese cooperation over Western (post-2018 sanctions environment).",
    key_provisions: [
      "Pillar 1 — sovereign satellite capability",
      "Pillar 2 — Chinese commercial-space partnership priority",
      "Pillar 3 — NUST + NCSE academic pipeline",
      "Space Programme 2047 — sovereign launch capability target",
    ],
    related_sources: ["PK-PAKSAT-CHINA-CGWIC", "PK-SUPARCO-ACT-2024"],
    last_verified: "2026-05-27",
  },
  {
    id: "PK-PAKSAT-CHINA-CGWIC",
    jurisdiction: "PK",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "PAKSAT-1R (2011) + PAKSAT-MM1 (May 2024) — Pakistan-China CGWIC Satcom Bilateral",
    date_enacted: "2011-08-11",
    date_last_amended: "2024-05-30",
    source_url: "https://www.suparco.gov.pk/satellites/paksat-mm1/",
    issuing_body:
      "Government of Pakistan (SUPARCO + Paksat International) + China (CGWIC + CAST)",
    competent_authorities: ["PK-SUPARCO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "procurement",
      "military_dual_use",
      "frequency_spectrum",
    ],
    scope_description:
      "PAKSAT Programme — Pakistan's sovereign satcom infrastructure via Chinese CGWIC. PAKSAT-1R: launched 11 Aug 2011 from Xichang on Long March 3B, CAST-built DFH-4 platform, replaced PAKSAT-1 (Hughes-built, 1996, lost 2010). PAKSAT-MM1: launched 30 May 2024 from Xichang on Long March 3B, CAST-built DFH-4E platform, ~US$220M financed by Chinese commercial loan facilities. Material practitioner relevance: (i) Western sanctions environment (2018 US export-control tightening) drove Pakistan-China commercial-space deepening; (ii) PAKSAT ground-segment cyber-security questions raised by US-India intelligence sharing (2020+); (iii) MULTAN ground station Chinese operational support obligations; (iv) PAKSAT-MM2 + MM3 in 2025-2027 procurement planning via CGWIC. Material precedent for Asian-state China-BRI space-tech partnerships.",
    key_provisions: [
      "PAKSAT-1R (2011) — CAST DFH-4, Long March 3B launch",
      "PAKSAT-MM1 (May 2024) — CAST DFH-4E, ~$220M Chinese financing",
      "MULTAN ground station — Chinese operational support",
      "PAKSAT-MM2/MM3 — 2025-2027 procurement via CGWIC",
    ],
    related_sources: [
      "NG-NIGCOMSAT-CHINA-EXIM-FINANCING",
      "PK-NATIONAL-SPACE-POLICY-2023",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "PK-ICUBE-Q-CHANG-E-6-LUNAR",
    jurisdiction: "PK",
    type: "case_law",
    status: "in_force",
    title_en:
      "iCube-Q — Pakistan's First Lunar CubeSat via China Chang'e-6 (May 2024)",
    date_enacted: "2024-05-03",
    date_last_amended: "2024-08-14",
    source_url:
      "https://institute.spaceminda.com/our-stories/icube-qamar-pakistans-first-lunar-mission/",
    issuing_body:
      "Institute of Space Technology Pakistan (IST) + Shanghai Jiao Tong University (SJTU) + CNSA",
    competent_authorities: ["PK-SUPARCO"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "registration"],
    scope_description:
      "iCube-Q (iCube Qamar) — Pakistan's first lunar CubeSat, 7kg orbiter, joint development IST Pakistan + SJTU China + SUPARCO. Deployed from China's Chang'e-6 mission 3 May 2024, achieved lunar orbit insertion 8 May 2024. Material first-of-kind ride-share: established China's commercial lunar ride-share model for non-Artemis-aligned states. Material precedent for international space-tech cooperation under non-Western framework — practitioner relevance for any state seeking lunar mission entry outside Artemis Accords (which Pakistan has NOT signed, distinct from India which signed June 2023). Counterpart Sino-Pakistani academic-cooperation framework predates BRI by decades — material long-standing IP-sharing precedent.",
    key_provisions: [],
    related_sources: ["PK-PAKSAT-CHINA-CGWIC", "PK-NATIONAL-SPACE-POLICY-2023"],
    last_verified: "2026-05-27",
  },
  {
    id: "PK-DRAFT-SPACE-ACTIVITIES-BILL-2023",
    jurisdiction: "PK",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Draft Pakistan Space Activities Act 2023 — Pending Cabinet Approval + Parliamentary Enactment",
    date_published: "2023-09-15",
    source_url: "https://www.suparco.gov.pk/draft-space-activities-act-2023/",
    issuing_body: "SUPARCO + Ministry of IT and Telecommunication",
    competent_authorities: ["PK-SUPARCO", "PK-PSARA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "Draft Pakistan Space Activities Act 2023 — comprehensive national space law. Currently under Cabinet review (since 2023), expected enactment 2025-2026. Material provisions: (i) §10 establishes PSARA as independent regulator (separation from SUPARCO operator function); (ii) §15 third-party liability cap PKR 1B (~US$3.5M, low by international standards); (iii) §22 spacecraft registry; (iv) §35-40 supervisory powers + sanctions; (v) §45 sandbox provisions. Material gap: existing PSAA pre-draft has been criticised for not addressing Kashmir EO-imagery licensing (India-Pakistan disputed territory).",
    key_provisions: [
      "§10 — PSARA establishment (independent regulator)",
      "§15 — third-party liability cap PKR 1B",
      "§22 — national spacecraft registry",
      "§35-40 — supervisory powers + sanctions",
    ],
    related_sources: ["PK-SUPARCO-ACT-2024", "PK-NATIONAL-SPACE-POLICY-2023"],
    last_verified: "2026-05-27",
  },
  {
    id: "PK-PTA-TELECOM-REORG-ACT-1996",
    jurisdiction: "PK",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Pakistan Telecommunication (Re-organization) Act 1996 + PTA Regulations 2023",
    date_enacted: "1996-10-17",
    date_last_amended: "2024-02-19",
    source_url: "https://www.pta.gov.pk/en/laws-regulations/the-act",
    issuing_body: "National Assembly of Pakistan",
    competent_authorities: ["PK-PTA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Pakistan Telecommunication Re-organization Act 1996 — primary telecoms framework. PTA licensing authority for: (i) §4 individual + class licenses for satellite services; (ii) §29 frequency assignments + ITU coordination; (iii) §39 enforcement penalties. Material for satellite-operator Pakistan market entry: Starlink applied for licensing 2022, PTA approval still pending as of 2024 (cited national-security concerns + Pakistan-China relationship considerations). PTA 'Class License for VSAT and Earth Stations Regulations 2023' creates intermediate licensing tier. Foreign-ownership rules: no formal cap but de facto national-security review for foreign telecom operators.",
    key_provisions: [
      "§4 — individual + class licenses",
      "§29 — frequency + ITU coordination",
      "§39 — enforcement penalties",
      "VSAT + Earth Stations Regulations 2023",
    ],
    related_sources: [],
    last_verified: "2026-05-27",
  },
];
