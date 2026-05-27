/**
 * Vietnam — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - VNSC (Vietnam National Space Centre) — established 2011 under VAST
 *   (Vietnam Academy of Science and Technology) at Hoa Lac Hi-Tech Park.
 * - VINASAT-1 (2008) + VINASAT-2 (2012) — sovereign satcom by Lockheed
 *   Martin under VNPT (national telecom).
 * - VNREDSat-1 (2013) — first sovereign EO sat, Astrium-built, French
 *   ODA financing — bilateral precedent for non-CN Vietnam space-tech.
 * - MicroDragon (2018) + NanoDragon (2021) — Vietnamese-built CubeSats
 *   via JAXA Kibo training programme (UNOOSA KiboCUBE alumni).
 * - Material for ASEAN regional cooperation, China-tension EEZ
 *   monitoring, US-Vietnam Comprehensive Strategic Partnership (Sep 2023).
 *
 * Naming convention: VN-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Vietnam Authorities ─────────────────────────────────────────────

export const AUTHORITIES_VN: Authority[] = [
  {
    id: "VN-VNSC",
    name_en: "Vietnam National Space Centre (VNSC)",
    jurisdiction: "VN",
    role_description:
      "National space agency under VAST (Vietnam Academy of Science and Technology). Established 2011 under Decision 137/QD-TTg. Operates Hoa Lac Hi-Tech Park space complex + VNREDSat-1 + LOTUSat-1/2 programmes.",
    website: "https://vnsc.org.vn/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "procurement",
    ],
  },
  {
    id: "VN-VAST",
    name_en:
      "Vietnam Academy of Science and Technology (VAST / Viện Hàn lâm Khoa học và Công nghệ Việt Nam)",
    jurisdiction: "VN",
    role_description:
      "Vietnam's national science-research umbrella organisation, oversees VNSC + space-research institutes. Material authority for space-tech R&D + international cooperation.",
    website: "https://vast.gov.vn/",
    applicable_areas: ["scientific_research"],
  },
  {
    id: "VN-MIC",
    name_en:
      "Ministry of Information and Communications (MIC / Bộ Thông tin và Truyền thông)",
    jurisdiction: "VN",
    role_description:
      "Telecommunications + broadcasting + media regulatory ministry. Authority for satellite-services licensing (Department of Frequency Management) + ITU coordination.",
    website: "https://mic.gov.vn/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "VN-VNPT",
    name_en: "Vietnam Posts and Telecommunications Group (VNPT)",
    jurisdiction: "VN",
    role_description:
      "State-owned dominant telecommunications operator. Owns + operates VINASAT-1 (2008) + VINASAT-2 (2012) sovereign satcom assets. Material for any commercial satcom cooperation in Vietnam.",
    website: "https://www.vnpt.vn/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
];

// ─── Vietnam Legal Sources ───────────────────────────────────────────

export const LEGAL_SOURCES_VN: LegalSource[] = [
  {
    id: "VN-NATIONAL-SPACE-STRATEGY-2030",
    jurisdiction: "VN",
    type: "policy_document",
    status: "in_force",
    title_en:
      "National Space Strategy to 2030 with Vision to 2045 (Decision 169/QD-TTg)",
    date_enacted: "2021-02-04",
    date_last_amended: "2023-12-15",
    source_url:
      "https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Quyet-dinh-169-QD-TTg-2021-Chien-luoc-phat-trien-va-ung-dung-khoa-hoc-cong-nghe-vu-tru-468125.aspx",
    issuing_body: "Prime Minister of the Socialist Republic of Vietnam",
    competent_authorities: ["VN-VNSC", "VN-VAST"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research", "procurement"],
    scope_description:
      "National Space Strategy 2030/2045 (Decision 169/QD-TTg) — Vietnam's strategic space framework. Material objectives: (i) sovereign EO capability via LOTUSat-1 (Japanese ODA, 600kg X-band SAR, launch 2025 from Tanegashima) + LOTUSat-2 (Vietnamese-led design); (ii) workforce target 500 space-tech engineers by 2030; (iii) Hoa Lac Hi-Tech Park space-tech industrial cluster; (iv) ASEAN regional cooperation through ARC SSTD (ASEAN Regional Cooperation in Science, Technology and Innovation Action Plan). No comprehensive national space law yet — Vietnam Space Law in draft since 2023, expected enactment 2026-2027.",
    key_provisions: [
      "Pillar 1 — sovereign EO via LOTUSat programme",
      "Pillar 2 — workforce 500 engineers by 2030",
      "Pillar 3 — Hoa Lac Hi-Tech Park industrial cluster",
      "Pillar 4 — ASEAN regional cooperation",
    ],
    related_sources: ["VN-VNREDSAT-FRANCE-ODA", "VN-LOTUSAT-JAPAN-ODA"],
    last_verified: "2026-05-27",
  },
  {
    id: "VN-VNREDSAT-FRANCE-ODA",
    jurisdiction: "VN",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Vietnam-France VNREDSat-1 Programme + ODA Financing (Astrium / Airbus DS 2013) — Material Bilateral Precedent",
    date_enacted: "2010-12-15",
    date_last_amended: "2013-05-07",
    source_url:
      "https://vnsc.org.vn/vnredsat-1-the-first-vietnamese-earth-observation-satellite/",
    issuing_body:
      "Government of Vietnam + Government of France (AFD + Astrium/Airbus DS)",
    competent_authorities: ["VN-VNSC", "VN-VAST"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "frequency_spectrum"],
    scope_description:
      "VNREDSat-1 bilateral — Vietnam's first sovereign EO satellite. €72M financing structure: €55M French ODA (AFD subsidised loan, 30-year term, 0.5% interest) + €17M Vietnamese counterpart funding. Astrium-built 130kg microsatellite, 2.5m panchromatic + 10m multispectral imagery. Launched May 2013 from Kourou on Vega VV02. Operational through 2020 (~7-year design life met). Material precedent for non-CN Vietnam space-tech: established Vietnam-France cooperation model that VNSC has replicated for LOTUSat (Japan ODA) + planned MicroSat-NG cooperation (potential Korean ODA). Material for any space-tech firm pursuing Vietnam ODA-financed contracts: AFD/JICA/KOICA procurement frameworks require tied-aid compliance + bidder-eligibility restrictions.",
    key_provisions: [
      "AFD ODA — €55M, 30-year term, 0.5% interest",
      "Tied-aid compliance — French-prime requirement",
      "VNSC operational handover + technology-transfer obligations",
    ],
    related_sources: ["VN-LOTUSAT-JAPAN-ODA"],
    last_verified: "2026-05-27",
  },
  {
    id: "VN-LOTUSAT-JAPAN-ODA",
    jurisdiction: "VN",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Vietnam-Japan LOTUSat Programme + JICA ODA Financing (NEC 2018-2025)",
    date_enacted: "2018-09-25",
    date_last_amended: "2024-10-15",
    source_url: "https://www.jica.go.jp/english/news/press/2018/180925_01.html",
    issuing_body:
      "Government of Vietnam + Government of Japan (JICA + NEC Corporation)",
    competent_authorities: ["VN-VNSC", "VN-VAST"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "scientific_research"],
    scope_description:
      "LOTUSat-1 + LOTUSat-2 programme — Japanese ODA-financed Vietnamese EO programme. JPY 18.8B (~US$165M) JICA Phase 1 loan signed November 2018 (40-year term, 0.1% interest, 10-year grace). NEC Corporation prime contractor. LOTUSat-1 — 600kg X-band SAR satellite, 1m all-weather imagery, launched November 2025 from Tanegashima on H-IIA. LOTUSat-2 — Vietnamese-led design with Japanese technology transfer, target launch 2027 from JAXA. Material practitioner relevance: (i) JICA STEP (Special Terms for Economic Partnership) tied-aid rules require Japanese prime + Japanese components; (ii) NEC operational training + technology-transfer obligations to VNSC engineers; (iii) Bilateral Space Cooperation Framework Agreement (2022) extends to lunar + planetary science cooperation.",
    key_provisions: [
      "JICA STEP — JPY 18.8B, 40-year term, 0.1% interest",
      "Japanese-prime tied-aid requirement",
      "NEC technology-transfer obligations to VNSC",
      "2022 Bilateral Space Cooperation Framework",
    ],
    related_sources: [
      "VN-VNREDSAT-FRANCE-ODA",
      "VN-NATIONAL-SPACE-STRATEGY-2030",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "VN-LAW-TELECOMMUNICATIONS-2023",
    jurisdiction: "VN",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law on Telecommunications 2023 (Luật Viễn thông) — Satellite Services Framework",
    date_enacted: "2023-11-24",
    date_last_amended: "2024-07-01",
    source_url:
      "https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Vien-thong-2023-559515.aspx",
    issuing_body: "National Assembly of the Socialist Republic of Vietnam",
    competent_authorities: ["VN-MIC", "VN-VNPT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Law on Telecommunications 2023 — replaces 2009 framework, effective 1 July 2024. Material satellite-services provisions: (i) Art. 5 expanded definitions covering OTT services + cloud services + data centres + LEO satellite-internet (NEW provision); (ii) Art. 16 49% foreign-ownership cap maintained for facilities-based operators (telecom infrastructure); (iii) Art. 18 NEW LEO-specific licensing requirements (introduced for Starlink-class operators); (iv) Art. 67 cyber-security requirements + data-localisation obligations. Material for foreign satellite operators: Starlink applied for licensing September 2024, under MIC review. Vietnam classified as 'restrictive' market by SES, Eutelsat under prior framework — 2023 reform partially liberalises but maintains 49% FDI cap.",
    key_provisions: [
      "Art. 5 — definitions incl. LEO satellite-internet (new)",
      "Art. 16 — 49% foreign-ownership cap (facilities-based)",
      "Art. 18 — LEO-specific licensing requirements (new)",
      "Art. 67 — cyber-security + data-localisation",
    ],
    related_sources: ["VN-NATIONAL-SPACE-STRATEGY-2030"],
    last_verified: "2026-05-27",
  },
  {
    id: "VN-CYBER-SECURITY-LAW-2018",
    jurisdiction: "VN",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law on Cybersecurity 2018 (Luật An ninh mạng) + Decree 53/2022/ND-CP",
    date_enacted: "2018-06-12",
    date_last_amended: "2022-08-15",
    source_url:
      "https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-An-ninh-mang-2018-351416.aspx",
    issuing_body: "National Assembly of the Socialist Republic of Vietnam",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security", "cybersecurity"],
    scope_description:
      "Vietnam Cybersecurity Law 2018 — broad cyber-security framework with controversial extra-territorial data-localisation rules. Decree 53/2022/ND-CP implementing rules effective October 2022. Material for satellite-imagery + EO-as-a-service operators: (i) Art. 26(3) data-localisation requirement for foreign operators with 'large impact' on national security (interpretation broad — includes satellite-imagery platforms); (ii) Art. 41 cybersecurity assessment for critical-infrastructure systems incl. ground-stations; (iii) Decree 53 Art. 26 specific list of services requiring data-localisation (telecom + e-commerce + social media + cloud + cybersecurity). Practitioner impact: foreign satellite operators face data-localisation if Vietnamese-user numbers reach undefined 'large impact' threshold (Facebook/Google/Apple negotiated case-by-case).",
    key_provisions: [
      "Art. 26(3) — data-localisation for 'large impact' services",
      "Art. 41 — critical infrastructure cybersecurity assessment",
      "Decree 53/2022 Art. 26 — services requiring data-localisation",
    ],
    related_sources: ["VN-LAW-TELECOMMUNICATIONS-2023"],
    last_verified: "2026-05-27",
  },
  {
    id: "VN-US-COMPREHENSIVE-STRATEGIC-PARTNERSHIP-2023",
    jurisdiction: "VN",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "US-Vietnam Comprehensive Strategic Partnership (CSP) — Space + Semiconductor Cooperation (Sep 2023)",
    date_enacted: "2023-09-10",
    date_last_amended: "2024-09-25",
    source_url:
      "https://www.whitehouse.gov/briefing-room/statements-releases/2023/09/11/joint-leaders-statement-elevating-united-states-vietnam-relations-to-a-comprehensive-strategic-partnership/",
    issuing_body:
      "Office of the President (US) + Communist Party of Vietnam General Secretariat",
    competent_authorities: ["VN-VNSC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "procurement", "fdi_screening"],
    scope_description:
      "US-Vietnam Comprehensive Strategic Partnership (CSP) — joint statement issued by President Biden + General Secretary Nguyen Phu Trong on 10 September 2023. Material space + semiconductor cooperation: (i) Space Cooperation Initiative (lunar science + Earth observation + GNSS-related capacity building); (ii) Semiconductor Workforce Development Initiative ($2M USAID seed); (iii) Critical Minerals MoU (rare-earths for space-tech supply chain). Material for US-Vietnam space-tech engagement: signals US strategic priority for Vietnam space-tech relationship as China-tension hedging — but ITAR + EAR restrictions still apply to Vietnam (not yet Wassenaar member, AECA-Section-126 not changed).",
    key_provisions: [
      "Space Cooperation Initiative — lunar + EO + GNSS capacity building",
      "Semiconductor Workforce Development — $2M USAID",
      "Critical Minerals MoU — rare-earth supply-chain",
    ],
    related_sources: ["VN-NATIONAL-SPACE-STRATEGY-2030"],
    last_verified: "2026-05-27",
  },
  {
    id: "VN-VINASAT-PROGRAMME",
    jurisdiction: "VN",
    type: "case_law",
    status: "in_force",
    title_en:
      "VINASAT-1 (2008) + VINASAT-2 (2012) — Sovereign Satcom Programme (Lockheed Martin A2100)",
    date_enacted: "2008-04-19",
    date_last_amended: "2024-04-30",
    source_url: "https://en.vnpt.vn/about-us/vinasat-satellite",
    issuing_body: "VNPT + Lockheed Martin Commercial Space",
    competent_authorities: ["VN-VNPT"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting"],
    scope_description:
      "VINASAT-1 + VINASAT-2 — Vietnam's sovereign satcom infrastructure. VINASAT-1: launched 19 April 2008 from Kourou on Ariane 5, US$300M Lockheed Martin A2100AX platform, 20 C-band + 8 Ku-band transponders, orbital slot 132°E. VINASAT-2: launched 15 May 2012 on Ariane 5, US$280M, 24 Ku-band transponders, orbital slot 131.8°E. Both operational through 2024-2025, operated by VNPT (state-owned). Material practitioner relevance: (i) demonstrates US-Vietnam satellite-procurement bilateral capability (ITAR Cat XV State Dept license required); (ii) VINASAT-3 procurement underway 2024 — Vietnamese-built spacecraft target with US/EU partnership, material for any space-tech firm pursuing VINASAT-3 RFP.",
    key_provisions: [],
    related_sources: ["VN-LAW-TELECOMMUNICATIONS-2023"],
    last_verified: "2026-05-27",
  },
];
