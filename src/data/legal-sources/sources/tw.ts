/**
 * Taiwan (ROC) — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - TASA (Taiwan Space Agency, est. 2022) — institutional reform from
 *   NSPO to ministry-level agency under MOST/NSTC.
 * - FORMOSAT series — flagship EO + meteorological constellation.
 * - Semiconductor supply-chain dependency — TSMC, UMC, Vanguard are
 *   single-source suppliers for many space-grade chipsets. Material
 *   for FDI screening, US CHIPS Act, EU Chips Act compliance.
 * - Cross-Strait dual-use considerations — Chinese export controls,
 *   US BIS Entity List actions, Wassenaar Arrangement constraints.
 * - Strait of Taiwan range-safety + military overflight considerations.
 *
 * Naming convention: TW-* (ISO-3166-1 alpha-2 for Taiwan, Province of China).
 * Note: Atlas uses TW per ISO-3166 even though political status is contested.
 */

import type { LegalSource, Authority } from "../types";

// ─── Taiwan Authorities ──────────────────────────────────────────────

export const AUTHORITIES_TW: Authority[] = [
  {
    id: "TW-TASA",
    name_en: "Taiwan Space Agency (TASA / 國家太空中心)",
    jurisdiction: "TW",
    role_description:
      "National space agency, transformed from NSPO (National Space Organization) to TASA effective 1 January 2023 under Article 5 of the Space Development Act. Reports to NSTC (National Science and Technology Council).",
    website: "https://www.tasa.org.tw/",
    applicable_areas: [
      "licensing",
      "registration",
      "frequency_spectrum",
      "scientific_research",
    ],
  },
  {
    id: "TW-NSTC",
    name_en:
      "National Science and Technology Council (NSTC / 國家科學及技術委員會)",
    jurisdiction: "TW",
    role_description:
      "Cabinet-level ministry (since July 2022 reorganization from MOST) — supreme policy authority over Taiwan's space programme + TASA oversight + R&D budget allocation.",
    website: "https://www.nstc.gov.tw/",
    applicable_areas: ["scientific_research", "procurement"],
  },
  {
    id: "TW-NCC",
    name_en: "National Communications Commission (NCC / 國家通訊傳播委員會)",
    jurisdiction: "TW",
    role_description:
      "Independent regulatory authority for telecommunications + broadcasting + frequency spectrum allocation. Authority for satellite-services licensing + ITU coordination.",
    website: "https://www.ncc.gov.tw/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "TW-BOFT",
    name_en: "Bureau of Foreign Trade (BOFT / 國際貿易局)",
    jurisdiction: "TW",
    role_description:
      "MOEA agency administering Taiwan's strategic high-tech commodities export control + Sensitive Commodities List (SCL) + Wassenaar/MTCR implementation.",
    website: "https://www.trade.gov.tw/",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "TW-MND",
    name_en: "Ministry of National Defense (MND / 國防部)",
    jurisdiction: "TW",
    role_description:
      "Defense ministry. Operates ROC Air Force + ROC Navy with space-domain awareness mission. Material for defence-space procurement + Cross-Strait dual-use considerations.",
    website: "https://www.mnd.gov.tw/",
    applicable_areas: ["military_dual_use", "procurement"],
  },
];

// ─── Taiwan Legal Sources ────────────────────────────────────────────

export const LEGAL_SOURCES_TW: LegalSource[] = [
  {
    id: "TW-SPACE-DEVELOPMENT-ACT-2021",
    jurisdiction: "TW",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Development Act (太空發展法) — Republic of China (Taiwan)",
    date_enacted: "2021-06-16",
    date_last_amended: "2022-12-28",
    source_url:
      "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=H0160068",
    issuing_body: "Legislative Yuan (ROC)",
    competent_authorities: ["TW-NSTC", "TW-TASA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "Space Development Act 2021 — Taiwan's first comprehensive national space law. 22 articles establishing licensing, registration, liability, supervision framework. Art. 2 defines 'space activities' broadly (launch + operation + reentry + ground-segment). Art. 5 establishes National Space Agency (TASA) operational from Jan 2023. Art. 8 mandates launch licensing through NSTC. Art. 14 third-party liability cap NT$3B (~US$95M) per incident. Art. 19-22 sandbox provisions for experimental missions. Material framework for any commercial-space activity on Taiwan territory or by Taiwan nationals.",
    key_provisions: [
      "Art. 5 — TASA establishment + functions",
      "Art. 8 — launch licensing requirement",
      "Art. 9 — operator registration",
      "Art. 14 — third-party liability cap NT$3B",
      "Art. 19-22 — regulatory sandbox provisions",
    ],
    related_sources: ["TW-TASA-ESTABLISHMENT-ACT-2022"],
    last_verified: "2026-05-27",
  },
  {
    id: "TW-TASA-ESTABLISHMENT-ACT-2022",
    jurisdiction: "TW",
    type: "federal_law",
    status: "in_force",
    title_en: "Taiwan Space Agency Establishment Act (國家太空中心設置條例)",
    date_enacted: "2022-05-04",
    date_last_amended: "2022-12-28",
    source_url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=H0160071",
    issuing_body: "Legislative Yuan (ROC)",
    competent_authorities: ["TW-NSTC", "TW-TASA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research"],
    scope_description:
      "TASA Establishment Act — transformed NSPO (National Space Organization, est. 1991) into ministerial-level TASA effective 1 January 2023. Governs TASA institutional structure, mandates, budget authority (NT$25.1B / US$800M for Phase 3 2019-2029 space programme). Material for any TASA procurement engagement: defines TASA legal capacity to enter contracts, IP-ownership rules for TASA-funded R&D, technology-transfer restrictions to non-Taiwan persons.",
    key_provisions: [
      "Art. 2 — TASA legal capacity",
      "Art. 7 — TASA Board composition",
      "Art. 13 — TASA budget + funding mechanism",
      "Art. 16 — technology-transfer restrictions",
    ],
    related_sources: ["TW-SPACE-DEVELOPMENT-ACT-2021"],
    last_verified: "2026-05-27",
  },
  {
    id: "TW-FORMOSAT-PROGRAMME",
    jurisdiction: "TW",
    type: "policy_document",
    status: "in_force",
    title_en: "FORMOSAT Programme + Phase 3 Space Programme (2019-2029)",
    date_enacted: "2019-01-01",
    date_last_amended: "2023-06-15",
    source_url: "https://www.tasa.org.tw/en-US/program/intro/formosat-7",
    issuing_body: "TASA / NSTC",
    competent_authorities: ["TW-TASA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: [
      "registration",
      "frequency_spectrum",
      "scientific_research",
    ],
    scope_description:
      "Phase 3 Space Programme (NT$25.1B / US$800M, 2019-2029) — Taiwan's flagship national space initiative. Material missions: FORMOSAT-7 (6-sat GPS-radio-occultation constellation, joint with NOAA, deployed 2019), FORMOSAT-8 (6-sat EO follow-on FORMOSAT-5, 2024-2031), Triton (Wind-Sat 2023), Tianwen-1 collaboration declined per Cross-Strait restrictions, Phase 3 commercial-rideshare provisions. Material for any commercial-space firm seeking TASA partnership or piggyback launches.",
    key_provisions: [],
    related_sources: [
      "TW-SPACE-DEVELOPMENT-ACT-2021",
      "TW-TASA-ESTABLISHMENT-ACT-2022",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "TW-TELECOM-MANAGEMENT-ACT",
    jurisdiction: "TW",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Telecommunications Management Act (電信管理法) — Satellite Service Licensing",
    date_enacted: "2019-06-26",
    date_last_amended: "2023-06-16",
    source_url:
      "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=K0060106",
    issuing_body: "Legislative Yuan (ROC)",
    competent_authorities: ["TW-NCC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Telecommunications Management Act 2019 — replaced 1958 Telecommunications Act. Material satellite-services provisions: (i) Art. 4-10 NCC general licensing framework; (ii) Art. 47-49 specific satellite-services provisions incl. ground-station operations; (iii) Art. 80 foreign-ownership restrictions (49% cap for Type-I telecoms). Material for Starlink + OneWeb + Eutelsat licensing in Taiwan: SpaceX Taiwan subsidiary launched May 2024 to satisfy 49% foreign-ownership cap (Chunghwa Telecom partnership for majority Taiwanese-owned entity).",
    key_provisions: [
      "Art. 4-10 — NCC licensing framework",
      "Art. 47-49 — satellite-services specific rules",
      "Art. 80 — foreign-ownership 49% cap (Type-I telecoms)",
    ],
    related_sources: ["TW-SPACE-DEVELOPMENT-ACT-2021"],
    last_verified: "2026-05-27",
  },
  {
    id: "TW-STRATEGIC-HIGH-TECH-EXPORT-CONTROL",
    jurisdiction: "TW",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Foreign Trade Act + Strategic High-Tech Commodities Regulations (Wassenaar/MTCR Implementation)",
    date_enacted: "1993-02-05",
    date_last_amended: "2024-04-25",
    source_url:
      "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=J0090001",
    issuing_body: "Ministry of Economic Affairs / BOFT",
    competent_authorities: ["TW-BOFT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "Foreign Trade Act Art. 13-13-2 + Strategic High-Tech Commodities Regulations — Taiwan's export-control regime. Implements Wassenaar Arrangement (de facto, Taiwan not WA member due to UN status), MTCR (de facto), Chemical Weapons Convention. Material for space-tech: (i) Sensitive Commodities List (SCL) covers satellites + propulsion + AOCS + space-grade ICs + GNSS receivers; (ii) Annual update via MOEA Notification + BOFT review; (iii) Cross-Strait Act overlay restricts technology transfer to mainland China; (iv) US BIS pressure increasing for Taiwan to apply de facto US-EAR-equivalent controls on advanced semiconductors (relevant for TSMC space-grade chip exports).",
    key_provisions: [
      "Foreign Trade Act Art. 13 — export control authority",
      "Foreign Trade Act Art. 13-1 — strategic high-tech commodities permit",
      "Foreign Trade Act Art. 13-2 — export catch-all controls",
      "Cross-Strait Act Art. 35 — mainland China technology-transfer restrictions",
    ],
    related_sources: ["INT-WASSENAAR-ARRANGEMENT", "INT-MTCR-1987"],
    last_verified: "2026-05-27",
  },
  {
    id: "TW-SEMICONDUCTOR-SUPPLY-CHAIN-SECURITY",
    jurisdiction: "TW",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Taiwan Semiconductor Supply-Chain Security Framework (TSMC/UMC/Vanguard Space-Grade Exposure)",
    date_enacted: "2022-10-07",
    date_last_amended: "2024-12-02",
    source_url:
      "https://www.moea.gov.tw/Mns/english/news/News.aspx?kind=6&menu_id=176",
    issuing_body:
      "Ministry of Economic Affairs (MOEA) + Industrial Development Bureau",
    competent_authorities: ["TW-BOFT", "TW-MND"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "fdi_screening",
      "military_dual_use",
      "critical_infrastructure",
    ],
    scope_description:
      "Taiwan Semiconductor Supply-Chain Security Framework — informal policy framework articulated through (i) MOEA + BOFT alignment with US BIS October 7, 2022 + October 17, 2023 + December 2, 2024 advanced-chip export controls; (ii) Taiwan Industrial Development Bureau Three Programs for Strategic Semiconductor Industries; (iii) Cross-Strait Act Art. 35 restrictions on mainland chip-fab investments. Material for space-industry: TSMC + UMC + Vanguard are single-source/dual-source suppliers for many space-grade ICs (radiation-hardened, low-power, sub-7nm processes). FDI screening for foreign acquisition of Taiwan semiconductor firms is gating for space-tech supply chain — practitioners must assess COO + substantial-transformation tests for downstream EAR/ITAR compliance.",
    key_provisions: [
      "BIS 87 FR 62186 (Oct 2022) — US-origin chip export controls",
      "BIS 88 FR 73424 (Oct 2023) — extended controls",
      "BIS 89 FR 96106 (Dec 2024) — further extensions",
      "Cross-Strait Act Art. 35 — mainland chip-fab restrictions",
    ],
    related_sources: [
      "TW-STRATEGIC-HIGH-TECH-EXPORT-CONTROL",
      "US-CHIPS-ACT-2022",
      "EU-CHIPS-ACT-2023",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "TW-PERSONAL-DATA-PROTECTION-ACT",
    jurisdiction: "TW",
    type: "federal_law",
    status: "in_force",
    title_en: "Personal Data Protection Act (個人資料保護法) — PDPA Taiwan",
    date_enacted: "2010-05-26",
    date_last_amended: "2023-05-31",
    source_url:
      "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=I0050021",
    issuing_body: "Legislative Yuan (ROC)",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "PDPA Taiwan — GDPR-adjacent but not GDPR-equivalent (Taiwan adequacy decision under review by European Commission since 2018). Material for satellite-imagery + EO-as-a-service operators serving Taiwan customers: Art. 8 explicit consent requirements for sensitive data; Art. 27 data-breach notification; Art. 41-50 criminal penalties up to 5 years + fines NT$1M. May 2023 amendment established PDPA Compliance Commission (operational 2025) — first specialized DPA in Taiwan, prior to which MOJ + sectoral regulators (NCC for telecoms) had fragmented enforcement authority.",
    key_provisions: [
      "Art. 8 — explicit consent for sensitive data",
      "Art. 27 — data-breach notification",
      "Art. 41-50 — criminal penalties",
      "May 2023 — PDPA Compliance Commission establishment",
    ],
    related_sources: ["TW-TELECOM-MANAGEMENT-ACT"],
    last_verified: "2026-05-27",
  },
  {
    id: "TW-INDEC-RAYTHEON-MND-CONTRACT",
    jurisdiction: "TW",
    type: "case_law",
    status: "in_force",
    title_en:
      "INDEC-Raytheon-MND Satellite Communications Procurement (2023-2024) — Defense Procurement Precedent",
    date_enacted: "2023-09-15",
    date_last_amended: "2024-08-22",
    source_url:
      "https://www.dsca.mil/press-media/major-arms-sales/taiwan-link-22-tactical-data-link",
    issuing_body: "US DSCA + ROC MND",
    competent_authorities: ["TW-MND"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "military_dual_use"],
    scope_description:
      "INDEC + Raytheon US$2.2B satcom + Link-22 tactical-data-link procurement (DSCA Major Arms Sale, August 2024). Material precedent for Taiwan defence-space procurement: (i) US FMS (Foreign Military Sales) framework, not direct-commercial-sales; (ii) Taiwan Relations Act §3(b) authorisation; (iii) Taiwan-specific ITAR-exemption framework under DDTC AGREEMENT mechanism. Practitioner relevance for any US-Taiwan defence-space partnership: triggers extensive interagency review (DoD, State, Commerce, NSC) + Congressional notification + likely PRC retaliation.",
    key_provisions: [],
    related_sources: [
      "TW-STRATEGIC-HIGH-TECH-EXPORT-CONTROL",
      "US-ITAR-22-CFR",
    ],
    last_verified: "2026-05-27",
  },
];
